from __future__ import annotations

import shutil
import unittest
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:  # pragma: no cover
    sync_playwright = None

ROOT = Path(__file__).resolve().parents[1]
BURR = ROOT / "the-burr"
MAC_CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
CHROMIUM = (
    shutil.which("chromium")
    or shutil.which("chromium-browser")
    or shutil.which("google-chrome")
    or (str(MAC_CHROME) if MAC_CHROME.is_file() else None)
)


def inline_page() -> str:
    html = (BURR / "index.html").read_text(encoding="utf-8")
    css = (BURR / "styles.css").read_text(encoding="utf-8")
    engine = (BURR / "engine.js").read_text(encoding="utf-8")
    app = (BURR / "app.js").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>")
    html = html.replace('<script src="engine.js"></script>', f"<script>{engine}</script>")
    html = html.replace('<script src="app.js"></script>', f"<script>{app}</script>")
    return html


def standalone_page() -> str:
    html = (BURR / "index.html").read_text(encoding="utf-8")
    css = (BURR / "styles.css").read_text(encoding="utf-8")
    engine = (BURR / "engine.js").read_text(encoding="utf-8")
    app = (BURR / "app.js").read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="engine.js"></script>', f"<script>\n{engine}\n</script>")
    html = html.replace('<script src="app.js"></script>', f"<script>\n{app}\n</script>")
    return html.replace('href="../index.html"', 'href="index.html"')


@unittest.skipUnless(sync_playwright, "Python Playwright required")
class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.html = inline_page()
        cls.playwright = sync_playwright().start()
        launch_kwargs = {
            "headless": True,
            "args": ["--no-sandbox", "--disable-dev-shm-usage"],
        }
        if CHROMIUM:
            launch_kwargs["executable_path"] = CHROMIUM
        cls.browser = cls.playwright.chromium.launch(**launch_kwargs)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.browser.close()
        cls.playwright.stop()

    def make_page(self, width: int = 1440, height: int = 1100):
        errors: list[str] = []
        page = self.browser.new_page(viewport={"width": width, "height": height})
        page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
        page.on(
            "console",
            lambda msg: errors.append(f"console {msg.type}: {msg.text}") if msg.type == "error" else None,
        )
        page.set_content(self.html, wait_until="domcontentloaded")
        page.wait_for_timeout(350)
        return page, errors

    def test_welcome_setup_and_guided_round(self) -> None:
        page, errors = self.make_page()
        try:
            self.assertEqual(page.title(), "Situation Room — The Burr")
            self.assertEqual(page.locator("#modalTitle").inner_text(), "WELCOME TO SITUATION ROOM")
            self.assertEqual(page.locator(".setup-role").count(), 5)
            page.click("#welcomeTour")
            self.assertFalse(page.locator("#tourLayer").evaluate("el => el.hidden"))
            self.assertEqual(page.locator("#tourCount").inner_text(), "1 / 6")
            self.assertEqual(page.locator("#rungValue").inner_text(), "4")
            for _ in range(5):
                page.click("#tourNext")
            self.assertEqual(page.locator("#tourCount").inner_text(), "6 / 6")
            page.click("#tourNext")
            self.assertTrue(page.locator("#tourLayer").evaluate("el => el.hidden"))
            self.assertFalse(page.locator("#setupScreen").evaluate("el => el.hidden"))
            self.assertEqual(errors, [])
        finally:
            page.close()

    def test_two_human_round_and_private_secrecy(self) -> None:
        page, errors = self.make_page()
        try:
            page.click("#welcomeSetup")
            page.click("#presetTwo")
            self.assertEqual(page.locator('.seat-toggle [data-seat="human"].active').count(), 2)
            page.click("#btnStart")
            page.click("#modalBegin")
            self.assertEqual(page.locator(".rung").count(), 11)
            self.assertEqual(page.locator(".public-role").count(), 5)

            page.click("#btnPlan")
            self.assertEqual(page.locator("#handoffTitle").inner_text(), "PASS THE DEVICE TO BELARUS")
            page.click("#btnEnterRoom")
            self.assertEqual(page.locator("#roomTitle").inner_text(), "BELARUS")
            self.assertEqual(page.locator("#factionChoices .choice-card").count(), 3)
            self.assertEqual(page.locator("#stakeTable .stake-row").count(), 4)
            page.locator("#factionChoices .choice-card").nth(0).click()
            page.locator("#publicChoices .choice-card:not(.disabled)").nth(0).click()
            page.locator("#privateChoices .choice-card:not(.disabled)").nth(0).click()
            page.click("#btnSealPlan")

            self.assertEqual(page.locator("#handoffTitle").inner_text(), "PASS THE DEVICE TO RUSSIA")
            page.click("#btnEnterRoom")
            page.locator("#factionChoices .choice-card").nth(1).click()
            page.locator("#publicChoices .choice-card:not(.disabled)").nth(2).click()
            page.locator("#privateChoices .choice-card:not(.disabled)").nth(0).click()
            page.click("#btnSealPlan")
            page.wait_for_timeout(200)

            self.assertEqual(page.locator("#modalTitle").inner_text(), "ROUND 1 RESOLVED")
            public_text = page.locator("#publicLog").inner_text()
            self.assertNotIn("Patrol withdrawal for regime assurance", public_text)
            self.assertGreater(page.evaluate("window.__SituationRoomApp.game.secretDeals.length"), 0)
            self.assertIn("SECRET DEAL", page.evaluate("window.__SituationRoomApp.game.roles.BELARUS.privateInbox.map(x => x.text).join(\" \")"))
            self.assertEqual(page.locator("#topStatus").inner_text().split("\n")[0], "ROUND 2 / 6 · ACTIVE · RUNG 2")
            self.assertEqual(errors, [])
        finally:
            page.close()

    def test_solo_preset_opens_one_spoiler_free_human_room(self) -> None:
        page, errors = self.make_page()
        try:
            page.click("#welcomeSolo")
            self.assertEqual(page.locator('.seat-toggle [data-seat="human"].active').count(), 1)
            self.assertEqual(page.locator('.seat-toggle [data-seat="npc"].active').count(), 4)
            self.assertFalse(page.locator("#soloRoleField").evaluate("el => el.hidden"))
            self.assertEqual(page.locator("#soloRoleSelect").input_value(), "UN")
            self.assertNotIn("real priority is regime survival", page.locator("#roleSetup").inner_text().lower())

            page.select_option("#soloRoleSelect", "BELARUS")
            self.assertTrue(page.locator('[data-role="BELARUS"] [data-seat="human"]').evaluate("el => el.classList.contains('active')"))
            page.click("#btnStart")
            opening_text = page.locator("#modalBody").inner_text().upper()
            self.assertIn("SOLO COMMAND", opening_text)
            self.assertIn("RULES-BASED NPCS", opening_text)
            page.click("#modalBegin")
            self.assertEqual(page.locator("#btnPlan").inner_text(), "PLAN BELARUS'S MOVE")
            page.click("#btnPlan")
            self.assertEqual(page.locator("#handoffTitle").inner_text(), "ENTER YOUR BELARUS SITUATION ROOM")
            self.assertEqual(page.evaluate("Object.keys(window.__SituationRoomApp.game.plans).length"), 4)
            self.assertFalse(page.evaluate("Object.hasOwn(window.__SituationRoomApp.game.plans, 'BELARUS')"))

            page.click("#btnEnterRoom")
            self.assertIn("real priority is regime survival", page.locator("#roomBrief").inner_text().lower())
            page.locator("#factionChoices .choice-card").nth(1).click()
            page.locator("#publicChoices .choice-card:not(.disabled)").nth(3).click()
            page.locator("#privateChoices .choice-card:not(.disabled)").nth(0).click()
            page.click("#btnSealPlan")
            page.wait_for_timeout(200)

            self.assertEqual(page.locator("#modalTitle").inner_text(), "ROUND 1 RESOLVED")
            self.assertEqual(page.evaluate("window.__SituationRoomApp.game.roundHistory.length"), 1)
            self.assertEqual(page.evaluate("Object.keys(window.__SituationRoomApp.game.roundHistory[0].plans).length"), 5)
            self.assertNotIn("Patrol withdrawal for regime assurance", page.locator("#publicLog").inner_text())
            self.assertEqual(errors, [])
        finally:
            page.close()

    def test_observer_can_complete_and_open_debrief(self) -> None:
        page, errors = self.make_page()
        try:
            page.click("#welcomeSetup")
            page.click("#presetObserver")
            page.click("#btnStart")
            page.click("#modalBegin")
            page.evaluate(
                """
                (() => {
                  const app = window.__SituationRoomApp;
                  const E = window.SituationRoomEngine;
                  let guard = 0;
                  while (!app.game.over && guard < 10) {
                    E.submitAIPlans(app.game);
                    E.resolveRound(app.game);
                    guard += 1;
                  }
                  app.showDebrief();
                })()
                """
            )
            self.assertEqual(page.locator("#modalTitle").inner_text(), "DEBRIEF — THE HIDDEN ROOMS REVEALED")
            self.assertEqual(page.locator(".score-table .role").count(), 5)
            self.assertEqual(page.locator(".world-score .num").count(), 1)
            self.assertEqual(errors, [])
        finally:
            page.close()

    def test_mobile_has_no_horizontal_overflow(self) -> None:
        page, errors = self.make_page(390, 844)
        try:
            page.click("#welcomeTour")
            widths = page.evaluate(
                "({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})"
            )
            self.assertEqual(widths, {"scroll": 390, "client": 390})
            self.assertEqual(errors, [])
        finally:
            page.close()


class StaticReleaseTests(unittest.TestCase):
    def test_site_routes_and_files_exist(self) -> None:
        self.assertTrue((ROOT / "index.html").is_file())
        self.assertTrue((ROOT / "training" / "index.html").is_file())
        self.assertTrue((BURR / "index.html").is_file())
        self.assertTrue((BURR / "engine.js").is_file())
        self.assertTrue((BURR / "app.js").is_file())
        self.assertTrue((ROOT / "situation-room-the-burr.html").is_file())
        self.assertTrue((ROOT / "conviction-existential-training.html").is_file())
        landing = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="the-burr/index.html"', landing)
        self.assertIn('href="training/index.html"', landing)

    def test_multiplayer_contract_is_present(self) -> None:
        html = (BURR / "index.html").read_text(encoding="utf-8")
        engine = (BURR / "engine.js").read_text(encoding="utf-8")
        self.assertIn('id="privacyLayer"', html)
        self.assertIn('id="factionChoices"', html)
        self.assertIn('id="tourLayer"', html)
        self.assertIn('id="presetSolo"', html)
        self.assertIn("Patrol withdrawal for regime assurance", engine)
        self.assertIn("N_MAINTAIN_CHANNELS", engine)
        self.assertIn("Incident deniability", engine)
        self.assertIn("resolveLeaks", engine)
        self.assertIn("bluffFatigue", engine)

    def test_standalone_burr_matches_sources(self) -> None:
        self.assertEqual(
            (ROOT / "situation-room-the-burr.html").read_text(encoding="utf-8"),
            standalone_page(),
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
