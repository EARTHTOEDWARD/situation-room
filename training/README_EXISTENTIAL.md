# Conviction: Existential

> Wars of choice and wars of survival obey different physics — and outsiders
> systematically misread which is which. That misreading, not malice, is what
> ratchets crises past the point of return.

An expansion of [Conviction](./README.md) that adds hidden, asymmetric stakes
to great-power diplomacy. Where the base game gave every bloc the same victory
condition, **Existential** gives each power a *private* map of what it can and
cannot afford to lose — and makes reading those hidden stakes the core skill.

There are two things in this folder:

| | What | Run it |
|---|---|---|
| 🎮 **Play now** | `conviction-existential.html` — a complete browser game. You are the UN Mediator; read the principals' true stakes and broker a climb-down before the escalation ladder welds shut. | Double-click the file, or `open conviction-existential.html` |
| 🧩 **The engine** | `existential/` — the Python package the game is built on. Headless, tested, designed for multiplayer / think-tank use and AI-driven regimes. | `python3 demo_existential_phase1.py` |

---

## Play the browser game

Open `conviction-existential.html` in any modern browser. No install, no build,
no server. Works on desktop and mobile.

**You play the mediator.** You don't command armies — your instrument is
judgement. Each turn you can:

- **Log Assessments** — record your private read of every stake (negotiable /
  vital / existential). This is what you're scored on.
- **Probe / Shuttle** — spend credibility for a costly-signal hint about one
  hidden stake. Bluffing regimes sometimes project the bluff.
- **Broker Climb-Down** — attempt to bring the ladder down. It only works if
  your concession touches whichever party's stake is *genuinely* hottest.
- **Mint Face Token** — convert credibility into a token that can unlock a
  welded rung.
- **Advance Turn** — let the crisis breathe; the AI principals act.

At the end, the hidden truth is revealed and your reads are scored. Catching a
**bluff** (a stake claimed hotter than it truly is) is worth the most. Missing
a real **existential** stake is the most dangerous error — that's how third
parties sleepwalk into other people's wars.

---

## The engine (Phase 1)

Built by composition on top of the existing Conviction `Bloc` — nothing in the
legacy engine is modified.

```
existential/
  stakes.py       # StakeTemp, hidden StakeProfile, costly signals, PerceptionMatrix
  power.py        # Regime/Nation split, emergent fusion, the Nero mechanic
  escalation.py   # per-dyad ladders + the four ratchet rules
  scenario.py     # Gulf 2026 factory (asserts the asymmetry invariant)
  __init__.py
```

Run the tests and the annotated demo:

```bash
python3 -m unittest test_existential test_browser_static -v
python3 demo_existential_phase1.py          # watch the ratchet work
```

### The four ratchet rules (`escalation.py`)

1. **Escalation is priced by the escalator's own true stake.** A cornered
   regime for whom the fight is existential climbs the ladder at ⅓ cost; a
   power fighting a war of choice pays full freight.
2. **De-escalation is priced by the *hotter* party — and an offer that misses
   their real wound is rejected outright.** This is why ceasefires collapse:
   the text addressed the wrong temperature.
3. **Rungs above mid-temperature war weld shut behind the climb.** Undoing
   them needs a scarce, mediator-minted face-saving token. (Clark's ratchet.)
4. **Climbing down over an asset you publicly claimed existential costs you.**
   Regimes get trapped by their own rhetoric.

### The Regime/Nation split (`power.py`)

Each power is two scoring entities: a hidden **regime** score (the player's
actual win condition) and an open **nation** score (welfare, economy) that does
*not* decide who wins. A **fusion** coefficient governs how much the two share
a fate — and it rises when foreigners attack (the invasion paradox: bombing
consolidates) and falls when the regime visibly sacrifices its own people (the
Nero mechanic). At game end both boards are revealed side by side, so a regime
can "win" while its nation's welfare has collapsed.

Full design rationale, scenario library, and the Phase 2–5 roadmap are in
[`CONVICTION_EXISTENTIAL_DESIGN.md`](./CONVICTION_EXISTENTIAL_DESIGN.md).

---

## Scenario: Gulf 2026

The shipped scenario models a mid-temperature war: a clerical regime for whom
**survival is existential** but whose chokepoint leverage is merely an
instrument, versus an expeditionary coalition fighting a **war of choice** in
which nothing on the board is existential. The mediator's job is to see the
asymmetry the principals are living and the bystanders are missing.

Other scenarios (1914, Baltic, Taiwan Strait) are specified in the design doc;
the engine is generic — a scenario is just a set of stake profiles and an asset
map.

---

## Roadmap

- **Phase 1 (this release)** — stakes, regime/nation split, asymmetric ratchet, browser game.
- **Phase 2** — Brier scoring of the Perception Matrix; rung-dependent effective stakes (the invasion paradox in pricing form); Fog & Shock event deck.
- **Phase 3** — the Arkhipov compliance layer (orders above rung 7 pass through a compliance roll; regimes purge for loyalty and degrade their own circuit breakers).
- **Phase 4** — scenario JSON loader + AI-driven regimes with genuinely hidden stake cards.
- **Phase 5** — playtest protocol measuring whether calibration improves across repeated plays.
