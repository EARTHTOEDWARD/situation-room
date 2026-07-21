# existential/scenario.py
"""Scenario factory (precursor to the Phase-4 JSON loader).

Builds ScenarioState objects: powers with asymmetric hidden stakes, dyadic
ladders over contested assets, and (optionally) legacy Blocs attached for the
full economy. The generator enforces the §2.2 invariant: every scenario
contains at least one asset that is EXISTENTIAL for one power and NEGOTIABLE
for another.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .stakes import StakeTemp, PerceptionMatrix
from .power import Power
from .escalation import LadderBook


@dataclass
class ScenarioState:
    name: str
    powers: Dict[str, Power] = field(default_factory=dict)
    ladders: LadderBook = field(default_factory=LadderBook)
    mediators: List[str] = field(default_factory=list)
    perceptions: Dict[str, PerceptionMatrix] = field(default_factory=dict)
    turn: int = 1

    def add_power(self, p: Power) -> None:
        self.powers[p.name] = p
        self.perceptions[p.name] = PerceptionMatrix(observer=p.name)

    def verify_asymmetry(self) -> bool:
        """§2.2: some asset must be EXISTENTIAL for one power and
        NEGOTIABLE for another."""
        for a_name, pa in self.powers.items():
            for asset in pa.profile.existential_assets():
                for b_name, pb in self.powers.items():
                    if b_name == a_name:
                        continue
                    if pb.profile.true_temp(asset) is StakeTemp.NEGOTIABLE:
                        return True
        return False

    def debrief(self) -> str:
        lines = [f"=== DEBRIEF: {self.name} (turn {self.turn}) ==="]
        for p in self.powers.values():
            lines.append(p.final_report())
            lines.append(f"    true stakes: "
                         + ", ".join(f"{a}={t.name}"
                                     for a, t in sorted(p.profile.reveal().items())))
        for key, lad in self.ladders.ladders.items():
            lines.append(
                f"ladder {key[0]}–{key[1]} over {lad.contested_asset}: "
                f"rung {lad.rung} | locked: {sorted(lad.locked_below) or '—'}"
            )
        return "\n".join(lines)


def _attach_legacy_bloc(power: Power, gdp: int) -> None:
    """Attach a legacy Bloc if the old engine is importable; else run
    bloc-less (tests and headless sims don't need the economy)."""
    try:
        from models import Bloc  # legacy Conviction

        power.bloc = Bloc(name=power.name)
        power.bloc.gdp_tokens = gdp
    except Exception:
        power.bloc = None


def gulf_2026(with_blocs: bool = True) -> ScenarioState:
    """The mid-temperature war scenario (design doc §10).

    IRAN: regime-survival is existential; the Strait is VITAL leverage,
          not existential — it is an instrument, and instruments are
          negotiable at the right table.
    COALITION: a war of choice — everything on this board is negotiable
          or vital; nothing is existential. Cheap to start, expensive to
          climb, and structurally impatient.
    GULF: desalination is existential (you cannot stockpile water for a
          population), the Strait vital, and the coalition's war aims
          merely negotiable — the classic squeezed third party.
    """
    s = ScenarioState(name="Gulf 2026")

    iran = Power("IRAN")
    iran.regime.fusion = 0.55       # Persian nationalism > regime ideology
    iran.regime.paranoia = 3
    iran.profile.set_true("REGIME_SURVIVAL", StakeTemp.EXISTENTIAL)
    iran.profile.set_true("STRAIT_OF_HORMUZ", StakeTemp.VITAL)
    iran.profile.set_true("NUCLEAR_LATENCY", StakeTemp.VITAL)
    iran.profile.set_true("PROXY_NETWORK", StakeTemp.NEGOTIABLE)
    # public claims exaggerate: everything is claimed existential
    for a in ("REGIME_SURVIVAL", "STRAIT_OF_HORMUZ", "NUCLEAR_LATENCY"):
        iran.profile.claim(a, StakeTemp.EXISTENTIAL)

    coalition = Power("COALITION")
    coalition.regime.fusion = 0.25  # democracies: low regime/nation fusion
    coalition.profile.set_true("REGIME_SURVIVAL", StakeTemp.NEGOTIABLE)
    coalition.profile.set_true("NUCLEAR_LATENCY", StakeTemp.VITAL)
    coalition.profile.set_true("STRAIT_OF_HORMUZ", StakeTemp.VITAL)
    coalition.profile.set_true("PROXY_NETWORK", StakeTemp.NEGOTIABLE)
    coalition.profile.claim("NUCLEAR_LATENCY", StakeTemp.EXISTENTIAL)  # bluff

    gulf = Power("GULF_STATES")
    gulf.regime.fusion = 0.6
    gulf.profile.set_true("DESALINATION", StakeTemp.EXISTENTIAL)
    gulf.profile.set_true("STRAIT_OF_HORMUZ", StakeTemp.VITAL)
    gulf.profile.set_true("REGIME_SURVIVAL", StakeTemp.VITAL)
    gulf.profile.set_true("NUCLEAR_LATENCY", StakeTemp.NEGOTIABLE)

    for p, gdp in ((iran, 12), (coalition, 20), (gulf, 15)):
        if with_blocs:
            _attach_legacy_bloc(p, gdp)
        s.add_power(p)

    s.ladders.open("IRAN", "COALITION", "NUCLEAR_LATENCY")
    s.ladders.open("IRAN", "GULF_STATES", "STRAIT_OF_HORMUZ")
    s.mediators.append("UN_MEDIATOR")
    s.ladders.mint_face_token("UN_MEDIATOR", 2)   # scarce by design (§13)

    assert s.verify_asymmetry(), "scenario violates §2.2 asymmetry invariant"
    return s
