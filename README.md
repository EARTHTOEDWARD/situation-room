# Situation Room

A browser-playable family of crisis-bargaining games about hidden stakes, public commitments, internal factions, proxies, expiring leverage, backchannels, and escalation ratchets.

## Public alpha links

- Play: <https://earthtoedward.github.io/situation-room/>
- Source: <https://github.com/EARTHTOEDWARD/situation-room>
- Playtest feedback: <https://github.com/EARTHTOEDWARD/situation-room/issues/new?template=playtest.yml>

This is a public alpha. Please attach the exported replay JSON when reporting a session if possible.

## Playable modes

### The Burr — multiplayer vertical slice

`the-burr/index.html`  
Standalone copy: `situation-room-the-burr.html`

- 2–5 human players; AI fills unused seats
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

1. **Open negotiation.** Players may talk publicly or step aside for real-world private discussion.
2. **Sealed planning.** Pass the device through each human situation room. Choose one internal faction, one public action, and one private action.
3. **Simultaneous resolution.** The engine resolves public pressure, matching backchannel intentions, accidents, faction events, expiring claims, asset decay, and leaks.
4. **Structural carry-over.** The next round inherits commitments, welded rungs, depleted clocks, audience costs, entanglement, and secret bargains.

The first multiplayer complexity boundary is deliberately strict:

> **1 ladder · 2 actions · 3 factions · 4 assets · 6 rounds**

## Repository structure

```text
index.html                  Landing page
training/                   Solo Conviction: Existential training game
the-burr/index.html         Multiplayer interface
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

This is a **web-assisted pass-and-play prototype**, not yet a networked hidden-information service. Privacy is enforced by the handoff screen and table conduct, not by separate authenticated clients. The current milestone asks one question before adding more states or networking:

> Can a proxy player entrap its patron through incentives and public commitments, while other players create a politically survivable exit?

China, Iran, and North Korea are intentionally deferred until this five-role coupling is playtested.

## Publishing

The repository is a static GitHub Pages site. The included workflow deploys the repository root. After pushing to a public repository, enable **Settings → Pages → GitHub Actions**.

No software license has been selected in this prototype package.
