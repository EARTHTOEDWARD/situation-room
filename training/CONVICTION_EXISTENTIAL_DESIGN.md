# CONVICTION: EXISTENTIAL
## A Machiavelli 2.0 design document — building on the Conviction codebase

*Working thesis: wars of choice and wars of survival obey different physics, and third parties
systematically misread which is which. The game trains players to read asymmetric stakes —
and punishes them for failing to.*

---

## 1. What Conviction already gives us

The existing repo (EARTHTOEDWARD/conviction-game) provides the chassis:

| Existing system | File | Reused as |
|---|---|---|
| Turn loop: Back Channel → Policy Draft → Resolution → Headlines | `conviction.py` | Unchanged skeleton; new sub-phases inserted |
| Targeted policy cards (`Move`, `Target`, cost scaling for multi-target) | `models.py` | Escalation actions inherit targeting |
| Signature domains + lever tracks | `models.py` | Becomes **Leverage Assets** (see §5) |
| Counter table (rock-paper-scissors) | `models.py` | Becomes the **counter-escalation matrix** |
| Events deck | `events.py` | Becomes **Fog & Shock deck** (misperception events) |
| Web bridge / HTML visualization | `web_bridge.py`, `*.html` | Perception-matrix dashboard |
| Bloc dataclass (gdp_tokens, budget dict, cohesion, tech) | `models.py` | Split into **Regime** and **Nation** layers (§3) |

What it lacks — by design, because it was a symmetric great-power game — is any notion that
the same event can be trivial for one player and existential for another. Everything below
adds that.

---

## 2. Core innovation: Hidden Stakes

### 2.1 Stake cards
At setup, each player secretly draws (or is dealt, in scenario mode) a **Stake Profile**:
a mapping from game assets/conditions to one of three temperatures:

- **NEGOTIABLE** — losing this costs points. You will trade it.
- **VITAL** — losing this cripples you. You will escalate to protect it.
- **EXISTENTIAL** — losing this ends your game. You will accept any risk, including
  mutual ruin, to protect it. *(Rule: an existential loss removes the regime player
  from the game, regardless of score.)*

Examples of stakeable items: a province/satellite, a trade chokepoint, nuclear latency,
regime legitimacy, an ethnic kin population in a neighbor, alliance credibility.

### 2.2 The asymmetry engine
Stake profiles are **asymmetric by construction**: the scenario generator guarantees that
at least one item is EXISTENTIAL for one player and NEGOTIABLE for another. (1914 mode:
South Slav nationalism is existential for Austria-Hungary, negotiable for Britain.)

### 2.3 Unprovability
You may *claim* any stake temperature at any time, in Back Channel or publicly. Nothing
verifies it. The only honest signals are **costly** ones: actions whose game cost only
makes sense if the claim is true (mobilizing at economic cost, refusing a profitable
trade, pre-delegating launch authority — see §7). This is Schelling in mechanic form.

```python
class StakeTemp(Enum):
    NEGOTIABLE = 1
    VITAL = 2
    EXISTENTIAL = 3

@dataclass
class StakeProfile:
    owner: str
    stakes: Dict[AssetId, StakeTemp]     # hidden
    claimed: Dict[AssetId, StakeTemp]    # public claims, freely changeable
```

---

## 3. The Regime/Nation split

Each power is TWO scoring entities controlled by one player:

- **REGIME score** — survival, internal control, elite cohesion. The player's *personal*
  win condition.
- **NATION score** — population welfare, economy, territory, long-run development.
  Tracked openly, but **does not determine who wins**.

### 3.1 Fusion coefficient (F)
Each regime has a **Fusion** stat, 0.0–1.0: the degree to which the regime has
successfully identified itself with the nation.

- High F: attacks on the regime rally the nation (bombing consolidates).
  Nation-score losses partially convert into regime-score losses too — the regime
  genuinely shares the nation's fate.
- Low F: the nation may survive regime death intact (the West Germany outcome).
  The regime can spend nation score to buy regime score — *sacrificing the
  population for power* — at an exchange rate that worsens as F drops and the
  divergence becomes visible.

### 3.2 The Nero mechanic
A regime facing existential loss may play **scorched-nation** actions: burn nation
score for a last-ditch regime survival roll. Other players see the nation score
collapse and must decide whether they are watching desperation (press harder) or a
trap (the regime is fusing with the nation via foreign threat — F rises when
attacked by outsiders, the invasion paradox).

### 3.3 End-game reveal
At game end, both scores are revealed side by side for every power. A player can
"win" as a regime while their nation's score has cratered — and the room sees it.
This is the pedagogical payload: the divergence is the lesson.

```python
@dataclass
class Power:
    name: str
    regime: RegimeState      # hidden score, fusion F, paranoia, succession risk
    nation: NationState      # open score: population, economy, infrastructure
    stake_profile: StakeProfile
```

---

## 4. The Asymmetric Ratchet (escalation mechanics)

### 4.1 The ladder
A shared escalation track per dyad (pair of powers), 0–10:
0 normal relations · 2 sanctions · 4 proxy conflict · 5 **mid-temperature war**
(drone/missile exchange — sustainable indefinitely) · 7 conventional war ·
8 land invasion · 9 nuclear signaling · 10 nuclear use.

### 4.2 Ratchet asymmetry rules — the heart of the game
1. **Escalation is cheap when your stake is hot.** Moving the ladder up costs
   (base cost) ÷ (your stake temperature on the contested asset). An existential
   defender escalates at ⅓ price. A war-of-choice attacker pays full price.
2. **De-escalation is priced by the *other* side's stake.** You cannot buy the
   ladder down unless the hotter party gets something that touches their hot stake.
   Offering a negotiable-tier concession to an existentially threatened power
   *does nothing* — the mechanic literally rejects the trade. (This is why
   ceasefires collapse: the text addressed the wrong temperature.)
3. **Rungs lock.** Above rung 5, each step up locks the rung below (Clark's
   ratchet: events become undoable). Unlocking requires a Face-Saving token —
   scarce, and only third parties can mint them (§6).
4. **Audience costs.** Public claims of stake temperature, if later contradicted
   by your own de-escalation, cost regime score. Regimes get trapped by their
   own rhetoric — the Austrian war party mechanic.

### 4.3 Mid-temperature war (rung 5) — the new stable state
Rung 5 is deliberately *comfortable*: both sides earn attrition income (the
defender tolls a chokepoint; the attacker degrades the defender's assets), and
neither side's public demands termination. But two clocks run (§5): the leverage
depreciation clock and the invasion-temptation clock. Rung 5 is a trap that
feels like a plateau. Players must learn to cash out of it.

---

## 5. Depreciating Leverage Assets

Conviction's lever tracks become **Leverage Assets**: a strait, an energy
chokepoint, a hostage export market, a proxy network. Each has:

- **Toll value**: income/coercion while activated.
- **Depreciation clock**: every turn an asset is *actively used* for coercion,
  opponents may fund **Workarounds** (pipelines, interceptor mass-production,
  rerouting, stockpiles). Each workaround level permanently reduces toll value.
- **Cash-in window**: leverage can be converted at the table into concessions —
  but only at its *current* value. Hoarded leverage depreciates to zero.

Design intent: teach that attrition assets are wasting assets, and that a
rational regime brings them to the table before expiry — while opponents learn
that accelerating workarounds without offering a table drives the regime toward
the existential corner (§7).

---

## 6. Third parties and the Bystander Blindness problem

3–6 players are **principals**; 1–2 players are **Mediators/Bystanders**
(great-power patrons, international institutions, or neutral traders).

- Mediators receive only **degraded stake information**: they see public claims
  plus a noisy digest of costly signals (the Fog deck occasionally deletes or
  distorts signals in transit — the "tiresome Balkan squabble" filter).
- Mediators mint **Face-Saving tokens** (§4.2.3) and can subsidize de-escalation
  — but only if their proposal matches the hot party's *true* stake temperature.
  A mediation aimed at a negotiable stake when the real wound is existential
  fails publicly and costs the mediator credibility.
- Mediators are scored **only on calibration** (§9): how accurately, by game end,
  they identified every principal's true stake profile — and whether their
  interventions matched.

---

## 7. The Arkhipov Layer (compliance and circuit breakers)

Orders above rung 7 do not execute automatically. They pass through a
**Compliance Roll**:

- Base compliance is high, but modified by: order madness (distance between the
  order and the regime's *visible* interest), regime **Paranoia** stat, and the
  regime's **loyalty/judgment dial**.
- **Loyalty/judgment dial**: each turn a regime may purge (raise loyalty, lower
  judgment) or professionalize (the reverse). High loyalty raises compliance for
  mad orders *and* raises the chance of catastrophic execution errors. High
  judgment lowers compliance for mad orders — your officers Arkhipov you —
  but improves everything else the military does.
- The dark equilibrium the game should reveal: regimes under existential threat
  rationally purge, degrading their own circuit breakers exactly when the orders
  get maddest. Players should *feel* this trade.
- Historical calibration cases for the rulebook: Arkhipov (B-59, 1962),
  Schlesinger's routing order (1974), the 1969 EC-121 episode.

```python
def compliance_roll(order: Order, regime: RegimeState) -> Outcome:
    madness = order.rung - regime.visible_interest_rung
    p_comply = clamp(BASE - JUDGMENT_W * regime.judgment * madness
                          + LOYALTY_W * regime.loyalty)
    ...
```

---

## 8. Turn structure (Conviction skeleton, extended)

1. **Back Channel** *(existing)* — private negotiation; stake claims; costly
   signal declarations; mediator shuttle diplomacy.
2. **Signal Reading** *(new)* — each player secretly logs their current belief
   about every other player's stake temperatures (the **Perception Matrix**,
   rendered in the web dashboard). This is the calibration record.
3. **Policy Draft** *(existing)* — budget allocation; card + target selection;
   escalation/de-escalation bids; workaround funding; loyalty dial.
4. **Resolution** *(existing)* — counters apply; ratchet rules (§4.2) price all
   escalation moves; compliance rolls for rung-7+ orders; leverage tolls paid;
   depreciation clocks tick.
5. **Headlines** *(existing events.py, reskinned as Fog & Shock)* — random events
   *including misperception events*: a signal is lost in transit, a domestic
   faction leaks a hidden stake (true or false), an accident occurs at the
   current rung and reads as deliberate (Sarajevo card).

---

## 9. Scoring — calibration over conquest

Three scoreboards, revealed together at game end:

1. **Regime scores** (who survived, who fell) — the *winner* in the vulgar sense.
2. **Nation scores** — displayed against turn-1 baselines; divergence from regime
   score is highlighted in red.
3. **Calibration scores** (all players + mediators): Brier-style scoring of each
   turn's Perception Matrix against the now-revealed true stake profiles.
   *The debrief centers this board.* For think-tank use, this is the deliverable:
   a quantified record of who misread whose existential stakes, when, and what it
   cost.

Optional tournament rule: overall victory = regime survival × calibration score.
You must win *and* have understood why.

---

## 10. Scenario library (initial)

| Scenario | Powers | Pedagogical target |
|---|---|---|
| **1914** | Austria-Hungary, Serbia, Russia, Germany, France, Britain (mediator: USA) | The original ratchet; bystander blindness |
| **Gulf 2026** | Iran (high-F regime, chokepoint leverage), US/Israel coalition (war of choice), Gulf states (targets & mediators), plus an off-map tech clock (interceptor mass production as a purchasable workaround) | Mid-temperature war; depreciating leverage; invasion paradox |
| **Baltic gambit** | Russia (regime facing succession risk), NATO cluster, a frontline state for whom everything is existential | Extended deterrence credibility; Arkhipov layer under nuclear signaling |
| **Strait crisis** | China (fusion via nationalism), Taiwan (total existential), US (vital-not-existential), Japan, ASEAN mediators | The hardest read: is reunification existential or performed? |

Scenario files are just JSON stake-profiles + asset maps: the engine is generic.

---

## 11. AI opponents (the feature a board game can't have)

Regimes can be played by an LLM given a *private* stake profile and instructed to
pursue regime survival in character. Human players then practice reading an
opponent whose fear is real (it shapes the AI's actual decisions) but unverifiable.
The Anthropic API integration pattern already used elsewhere in the repo's tooling
applies directly; each AI turn receives: public state, its private profile, its
back-channel transcript — and returns a Move plus claims. Log everything: AI
games generate calibration training data for human players.

---

## 12. Implementation roadmap

**Phase 1 — engine fork (small):** add `StakeProfile`, `RegimeState`/`NationState`
split of `Bloc`, escalation ladders per dyad, ratchet pricing. Reuse the existing
turn loop and card resolution untouched. (~500 new lines against current models.)

**Phase 2 — perception layer:** Perception Matrix logging, calibration scoring,
Fog & Shock reskin of `events.py`, web dashboard panel showing each player their
own belief history.

**Phase 3 — Arkhipov layer + leverage depreciation.**

**Phase 4 — scenario JSON loader + AI regime players.**

**Phase 5 — playtest protocol:** run 1914 with players who don't know the history
of the design; measure whether calibration scores improve across repeated plays.
If they do, you have a training instrument, not just a game.

---

## 13. Design risks / open questions

- **Gaming the reveal**: players who know profiles are revealed at end may
  under-commit to bluffs. Mitigation: calibration scoring rewards *others*
  reading you correctly only for the mediators; principals gain from being
  misread. Tension is intended — tune in playtest.
- **Rung-5 stagnation**: mid-temperature war must be comfortable but not
  optimal, or games never end. The two clocks (§5) need aggressive tuning.
- **Fusion F measurement**: is F a dial the regime sets (spend to propagandize)
  or an emergent stat (rises when attacked, falls with visible sacrifice of the
  nation)? Recommend emergent with limited regime spend — matches the history.
- **Kingmaking by mediators**: cap Face-Saving token supply per game.
- **Is EXISTENTIAL deterministic or probabilistic?** Current design: losing an
  existential stake eliminates the regime with certainty. A probabilistic
  version (regime *survival roll* modified by F) may be more realistic —
  regimes sometimes survive existential defeats — but weakens the core lesson.
