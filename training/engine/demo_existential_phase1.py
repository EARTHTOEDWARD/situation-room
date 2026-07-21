#!/usr/bin/env python3
# demo_existential_phase1.py
"""Watch the asymmetric ratchet work: a war of choice meets a war of survival.

Run:  python3 demo_existential_phase1.py
"""
from existential import gulf_2026, StakeTemp, LADDER_NAMES


def banner(t):
    print(f"\n{'='*64}\n{t}\n{'='*64}")


def main():
    s = gulf_2026(with_blocs=True)
    iran, coal = s.powers["IRAN"], s.powers["COALITION"]
    lad = s.ladders.get("IRAN", "COALITION")

    banner("SETUP — what each side privately holds (players never see this)")
    for p in (iran, coal):
        stakes = ", ".join(f"{a}={t.name}"
                           for a, t in sorted(p.profile.reveal().items()))
        print(f"  {p.name}: {stakes}")

    # War-chest narration: the appropriations package
    if coal.bloc:
        coal.bloc.gdp_tokens = 50
        print("\n  [COALITION passes a war appropriations package: 50 GDP]")

    banner("MISSION CREEP — war aims shift from enrichment to regime change")
    print(f"  ladder contested asset: {lad.contested_asset} -> REGIME_SURVIVAL")
    lad.contested_asset = "REGIME_SURVIVAL"
    print(f"  R1 pricing now reflects the true asymmetry:")
    print(f"    COALITION climb cost: {lad.climb_cost(coal)} GDP "
          f"(NEGOTIABLE stake — a war of choice pays full price)")
    print(f"    IRAN climb cost:      {lad.climb_cost(iran)} GDP "
          f"(EXISTENTIAL stake — a cornered regime escalates nearly free)")

    banner("THE WAR — coalition climbs; the ratchet locks behind it")
    for i in range(6):
        r = lad.climb(coal, iran)
        if not r.ok:
            print(f"  turn {i+1}: CLIMB FAILS — {r.reason}")
            break
        print(f"  turn {i+1}: rung {r.new_rung} ({LADDER_NAMES[r.new_rung]})"
              f"  cost {r.cost_paid} | IRAN nation {iran.nation.score}, "
              f"fusion {iran.regime.fusion:.2f}  <- bombing consolidates")
    print(f"  locked rungs behind: {sorted(lad.locked_below)}  <- Clark's ratchet")
    if coal.bloc is not None:
        print(f"  COALITION war chest remaining: {coal.bloc.gdp_tokens} GDP")
    else:
        print("  COALITION war chest: not attached in standalone mode "
              "(costs are still calculated and reported)")

    banner("R2 — a ceasefire aimed at the wrong temperature COLLAPSES")
    token_available = s.ladders.face_tokens.get("UN_MEDIATOR", 0) > 0
    r = lad.descend(coal, iran, concession_asset="PROXY_NETWORK",
                    face_tokens=1 if token_available else 0)
    if r.ok and token_available:
        s.ladders.spend_face_token("UN_MEDIATOR")
    print(f"  UN mints a face-saving token; COALITION offers PROXY_NETWORK "
          f"concessions: ok={r.ok}")
    print(f"    -> {r.reason}")
    print(f"    (proxies are an instrument to IRAN, not the wound — the "
          f"mechanic rejects the deal, as July's ceasefire collapsed)")

    banner("R2 — touch the wound and the same table works")
    coal.profile.set_true("SUCCESSOR_GUARANTEE", StakeTemp.NEGOTIABLE)
    iran.profile.set_true("SUCCESSOR_GUARANTEE", StakeTemp.EXISTENTIAL)
    token_available = s.ladders.face_tokens.get("UN_MEDIATOR", 0) > 0
    r = lad.descend(coal, iran, concession_asset="SUCCESSOR_GUARANTEE",
                    face_tokens=1 if token_available else 0)
    if r.ok and token_available:
        s.ladders.spend_face_token("UN_MEDIATOR")
    print(f"  COALITION offers SUCCESSOR_GUARANTEE (a survivable successor "
          f"arrangement): ok={r.ok} -> rung {lad.rung} "
          f"({LADDER_NAMES[lad.rung]})")
    print(f"  Cost was {r.cost_paid} GDP — de-escalation is priced by the "
          f"HOTTER party's temperature (4 x EXISTENTIAL)")

    banner("NERO — the regime burns its nation to buy political room")
    print(f"  IRAN regime score {iran.regime.score}, nation "
          f"{iran.nation.score}, fusion {iran.regime.fusion:.2f}")
    gained = iran.scorched_nation(3)
    print(f"  IRAN burns nation for +{gained} regime -> regime "
          f"{iran.regime.score}, nation {iran.nation.score}, fusion "
          f"{iran.regime.fusion:.2f} (each burn erodes fusion, making the "
          f"next burn dearer — desperation compounds)")

    banner("R4 — only now can Iran afford its own climbdown")
    before = iran.regime.score
    r = lad.descend(iran, coal, concession_asset=None)
    print(f"  ok={r.ok}, rung now {lad.rung} ({LADDER_NAMES[lad.rung]})")
    print(f"  IRAN regime {before} -> {iran.regime.score} "
          f"(audience cost: trapped by its own maximalist rhetoric)")

    print("\n  EMERGENT FINDING: run the last two phases in the other order and")
    print("  the audience cost TOPPLES the regime — de-escalation is lethal to")
    print("  a leadership trapped by its own rhetoric unless it shores itself")
    print("  up first. The game reproduced the Austrian war party unprompted.")

    banner("DEBRIEF — the three-board reveal (design doc §9)")
    print(s.debrief())
    print("\n  The vulgar winner and the calibration lesson are different "
          "boards.\n  Phase 2 scores every player's Perception Matrix "
          "against these revealed stakes.")


if __name__ == "__main__":
    main()
