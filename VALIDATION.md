# Validation Report — Situation Room: The Burr

**Build:** solo/multiplayer public alpha v0.2.0
**Date:** 2026-07-21

## Automated checks

### Multiplayer engine

```bash
node tests/test_engine.js
```

**Result: 14/14 passed**

Covered:

1. initial scenario state and hidden Belarus stake asymmetry;
2. scripted guided round and protected Belarus–Russia bargain;
3. matching Russia–US demobilisation/non-deployment backchannel;
4. UN face capacity reopening a welded rung;
5. validation of combined public/private asset costs;
6. complete six-round all-NPC run with bounded tracks;
7. hollow public claims expiring on schedule;
8. internal hawk pressure creating post-decision escalation;
9. deterministic replay export.
10. exactly four legal NPC plans sealed before each possible solo human role;
11. idempotent NPC planning that does not overwrite a human plan or consume extra randomness;
12. zero-asset and combined-cost fallback paths, including the UN no-cost liaison action;
13. 200 complete solo trajectories across all five possible human roles and 40 seeds per role;
14. a same-seed counterfactual in which the human Belarus choice makes or breaks the matching Russia deal, plus fail-closed public-replay redaction before and after the final round until debrief is explicitly opened.

### Static and browser interaction

```bash
python -m unittest tests/test_browser.py -v
```

**Result: 8/8 passed**

Covered:

- welcome, setup, and five role cards;
- six-step observer walkthrough driven by the real engine;
- two-human pass-and-play handoff;
- private stakes, factions, public actions, and private actions;
- simultaneous round resolution;
- secret deal absent from the public log but present in participant inboxes;
- all-NPC completion and debrief;
- one-human Solo command preset with four NPC seats and any-role selection;
- solo-specific planning language, one private room, and simultaneous five-plan resolution;
- public setup briefs that do not reveal Belarus’s private survival priority;
- 390-pixel mobile layout with no horizontal overflow;
- required static routes and solo/multiplayer contracts;
- generated standalone HTML byte-for-byte equal to the current source build.

No application JavaScript console errors were observed in the tested paths.

### Retained solo engine

```bash
cd training/engine
python test_existential.py
```

**Result: 17/17 passed**

The prior Conviction: Existential stake, regime/nation, ratchet, and Gulf 2026 tests remain intact.

### Total

**39/39 checks passed.**

## Publication handoff

The public-alpha release additionally validates:

- Bash syntax for `publish_github.sh` and `publish_github.command`;
- a stubbed end-to-end publication rehearsal covering account verification, repository creation, initial push, homepage configuration, Pages activation, workflow dispatch, and deployment monitoring;
- a structured GitHub Issue Form at `.github/ISSUE_TEMPLATE/playtest.yml`;
- a debrief action that opens the playtest form without exposing private replay data automatically;
- rebuilt standalone solo/multiplayer HTML after the v0.2 changes.

The GitHub CLI path uses `gh repo create --public --source=. --push`, and the included Pages workflow deploys the repository root.

## Balance probe

Two hundred deterministic all-NPC games were run across seeds `bal-0` through `bal-199`.

- crashes or state-bound violations: **0**
- average final world viability: **42.30 / 100**
- average secret deals formed: **1.95 per game**
- average secret deals leaked: **0.65 per game**
- final ladder distribution:
  - rung 4: 19 games
  - rung 5: 123 games
  - rung 6: 58 games
- end condition:
  - six-round crisis window closed: 196 games
  - major-power leadership lost control: 4 games

This is a stability probe, not evidence of human balance. The NPC policy is intentionally heuristic, deterministic, and scenario-specific.

## Visual and responsive checks

Validated at:

- 1440 × 1100 desktop;
- 390 × 844 mobile.

Screenshots:

- `docs/landing.png`
- `docs/the-burr-shared.png`
- `docs/private-room.png`
- `docs/the-burr-mobile.png`
- `docs/the-burr-desktop.png`

## Important test boundary

Automated checks establish state consistency, interaction contracts, privacy of the public log, and responsive rendering. They do **not** establish that:

- five humans can learn the game without facilitation;
- faction pressure is cognitively light enough;
- free table talk and structured actions interact well;
- Belarus can entrap Russia through genuinely strategic play rather than action-card familiarity;
- the scoring weights feel legitimate;
- leak rates and asset clocks are well balanced.

Solo-path automation additionally establishes that a one-human-seat game can complete the state/action loop against four rules-based NPCs and produce reproducible diagnostic replays. It does **not** establish that a person can learn or finish the mode unassisted, persuasive conversational AI, strategic intelligence, human negotiation quality, or real-world geopolitical validity.

The next decisive validation is three uncoached five-player sessions with exported replay JSON and a short post-game interview.
