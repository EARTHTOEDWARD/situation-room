# Situation Room

A browser-playable family of crisis-bargaining games about hidden stakes, public commitments, internal factions, proxies, expiring leverage, backchannels, and escalation ratchets.

## Public alpha links

- Play: <https://earthtoedward.github.io/situation-room/>
- Source: <https://github.com/EARTHTOEDWARD/situation-room>
- Playtest feedback: <https://github.com/EARTHTOEDWARD/situation-room/issues/new?template=playtest.yml>

This is a public alpha. Please attach the exported replay JSON when reporting a session if possible.

## Playable modes

### The Burr — solo and multiplayer vertical slice

`the-burr/index.html`  
Standalone copy: `situation-room-the-burr.html`

- 1–5 human players; deterministic, rules-based NPCs fill unused seats
- one-click **Solo command**, defaulting to the United Nations; any role can be selected
- five roles: Belarus, Russia, United States, European Union, United Nations
- pass-and-play privacy screen
- one public and one private action per role per round
- simultaneous sealed resolution
- three internal factions per role
- hidden true stakes and sacrifice ceilings
- bluff fatigue and expiring public claims
- proxy–patron entanglement
- asset clocks with sell-by dates
- secret agreements, escrow, inspections, face-saving language, and leaks
- six-round crisis window
- deterministic replay seed and replay JSON export
- an observer-mode guided first round

The NPC engine is local, offline-capable, and seeded for reproducible replays. It uses authored role policies that respond to the evolving ladder, public pressure, commitments, asset clocks, and role state; it is not an external language model or strategic-search system.

### Gulf 2026 — solo training

`training/index.html`  
Standalone copy: `conviction-existential-training.html`

The original **Conviction: Existential** UN-mediator scenario remains available as the calibration tutorial. It teaches hidden stake temperatures, asymmetric escalation/descent, welded rungs, face-saving, and the regime/nation split.

## Run locally

No build step or package installation is required.

```bash
python3 serve_local.py
```

Then open:

```text
http://127.0.0.1:8000/
```

You can also open `index.html` directly. A local server is recommended because it reproduces GitHub Pages routing.

Convenience launchers:

- macOS/Linux: `sh start_local.sh`
- Windows: double-click `start_local.bat`

## The Burr round loop

1. **Open negotiation or solo review.** A table may talk publicly or step aside for real-world private discussion. A solo player instead reads the public board and their role’s private inbox.
2. **Sealed planning.** Pass the device through each human situation room. Choose one internal faction, one public action, and one private action.
3. **Simultaneous resolution.** The engine resolves the human and NPC plans together: public pressure, matching backchannel intentions, accidents, faction events, expiring claims, asset decay, and leaks.
4. **Structural carry-over.** The next round inherits commitments, welded rungs, depleted clocks, audience costs, entanglement, and secret bargains.

The first multiplayer complexity boundary is deliberately strict:

> **1 ladder · 2 actions · 3 factions · 4 assets · 6 rounds**

## Repository structure

```text
index.html                  Landing page
training/                   Solo Conviction: Existential training game
the-burr/index.html         Solo and multiplayer interface
the-burr/engine.js          Deterministic game engine
the-burr/app.js             Pass-and-play application controller
the-burr/styles.css         Responsive situation-room design
tests/test_engine.js        Engine and full-run checks
tests/test_browser.py       Static and Chromium interaction checks
docs/                       Screenshots and milestone notes
.github/workflows/          Tests and GitHub Pages deployment
```

## Validation

Run the low-dependency engine checks:

```bash
node tests/test_engine.js
```

Run browser/static checks when Python Playwright and Chromium are available:

```bash
python -m unittest tests/test_browser.py -v
```

Run the retained solo engine tests:

```bash
cd training/engine
python test_existential.py
```

See [`VALIDATION.md`](VALIDATION.md) for the current results and balance probe.

## Current milestone boundary

This is a **web-assisted solo/pass-and-play prototype**, not yet a networked hidden-information service. Privacy is enforced by the interface and table conduct, not by separate authenticated clients. The current milestone asks one question before adding more states or networking:

> Can a proxy player entrap its patron through incentives and public commitments, while other players create a politically survivable exit?

China, Iran, and North Korea are intentionally deferred until this five-role coupling is playtested.

Solo and observer runs are synthetic diagnostics for learning the rules, checking pacing, exercising mechanics, and producing reproducible trajectories. They do not establish human negotiation quality, uncoached learnability, or balance and do not replace the planned five-human playtests.

## Publishing

The repository is a static GitHub Pages site. The included workflow deploys the repository root. After pushing to a public repository, enable **Settings → Pages → GitHub Actions**.

## Licensing

Situation Room uses a split licence:

- software and executable code: [Mozilla Public License 2.0](LICENSE) (`MPL-2.0`);
- scenario writing, rules, documentation prose, screenshots, artwork, and other creative material: [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](LICENSES/CC-BY-NC-SA-4.0.txt) (`CC-BY-NC-SA-4.0`);
- project names, logos, and other source-identifying marks: no trademark rights granted.

Mixed HTML and generated standalone artifacts retain that code/content split. See [LICENSING.md](LICENSING.md) for the precise scope and [TRADEMARKS.md](TRADEMARKS.md) for the project-name notice.
