# existential/escalation.py
"""The asymmetric ratchet (design doc §4).

One EscalationLadder per unordered pair of powers. The four ratchet rules:

  R1. Escalation cost = base ÷ (escalator's TRUE temperature on the contested
      asset). Hot stakes climb cheap. Players never see temperatures — they
      see prices, and prices are the honest tell.
  R2. De-escalation is priced by the HOTTER party's temperature, and a
      climb-down offer that doesn't touch the hot party's hot stake is
      rejected by the mechanic itself.
  R3. Above LOCK_THRESHOLD, each climb locks the rung below. Unlocking needs
      a Face-Saving token (mediator-minted, scarce).
  R4. Audience costs: de-escalating over an asset you publicly claimed hot
      charges your regime score (delegated to StakeProfile).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

from .stakes import AssetId, StakeTemp
from .power import Power

LADDER_NAMES = {
    0: "normal relations",
    1: "diplomatic protest",
    2: "sanctions",
    3: "covert action",
    4: "proxy conflict",
    5: "mid-temperature war",   # the comfortable trap (§4.3)
    6: "open strikes",
    7: "conventional war",
    8: "land invasion",
    9: "nuclear signaling",
    10: "nuclear use",
}
MAX_RUNG = 10
LOCK_THRESHOLD = 5           # rungs above this lock the one below (R3)
BASE_CLIMB_COST = 6          # GDP; divided by true stake temperature (R1)
BASE_DESCEND_COST = 4        # GDP; multiplied by hot party's temperature (R2)


def dyad_key(a: str, b: str) -> Tuple[str, str]:
    return tuple(sorted((a, b)))  # type: ignore[return-value]


@dataclass
class ClimbResult:
    ok: bool
    reason: str
    cost_paid: int = 0
    new_rung: Optional[int] = None


@dataclass
class EscalationLadder:
    """Shared escalation state for one pair of powers."""

    a: str
    b: str
    contested_asset: AssetId
    rung: int = 0
    locked_below: Set[int] = field(default_factory=set)  # rungs that can't be re-descended past
    history: List[str] = field(default_factory=list)

    def other(self, name: str) -> str:
        return self.b if name == self.a else self.a

    # ---------------- R1: asymmetric climb pricing ----------------
    def climb_cost(self, escalator: Power) -> int:
        temp = escalator.profile.true_temp(self.contested_asset)
        return max(1, BASE_CLIMB_COST // temp.value)

    def climb(self, escalator: Power, defender: Power) -> ClimbResult:
        if self.rung >= MAX_RUNG:
            return ClimbResult(False, "already at maximum rung")
        cost = self.climb_cost(escalator)
        if escalator.bloc is not None:
            if escalator.bloc.gdp_tokens < cost:
                return ClimbResult(False, f"cannot afford climb (cost {cost})")
            escalator.bloc.gdp_tokens -= cost
        prev = self.rung
        self.rung += 1
        # R3: the ratchet locks behind you once things get serious
        if self.rung > LOCK_THRESHOLD:
            self.locked_below.add(prev)
        # Escalation damages the defender's nation and (via fusion) regime.
        defender.apply_nation_damage(
            dmg=max(1, self.rung // 3), foreign=True, severity=self.rung
        )
        self.history.append(
            f"{escalator.name} climbs to {self.rung} ({LADDER_NAMES[self.rung]}) "
            f"for {cost} GDP"
        )
        return ClimbResult(True, "climbed", cost, self.rung)

    # ---------------- R2: de-escalation priced by the hotter party ----------------
    def hotter_party(self, pa: Power, pb: Power) -> Power:
        ta = pa.profile.true_temp(self.contested_asset)
        tb = pb.profile.true_temp(self.contested_asset)
        return pa if ta.value >= tb.value else pb

    def hotter_to_move(self, initiator: Power, counterpart: Power) -> Power:
        """Which party must be MOVED to bring the ladder down. On a tie this
        resolves to the counterpart, so a cold initiator buying peace always
        faces the wound-touching requirement rather than escaping it on equal
        temperatures."""
        ti = initiator.profile.true_temp(self.contested_asset)
        tc = counterpart.profile.true_temp(self.contested_asset)
        return counterpart if tc.value >= ti.value else initiator

    def descend_cost(self, pa: Power, pb: Power) -> int:
        hot = self.hotter_party(pa, pb)
        return BASE_DESCEND_COST * hot.profile.true_temp(self.contested_asset).value

    def descend(
        self,
        initiator: Power,
        counterpart: Power,
        concession_asset: Optional[AssetId],
        face_tokens: int = 0,
    ) -> ClimbResult:
        """Attempt to buy the ladder down one rung.

        concession_asset: what the initiator puts on the table. The mechanic
        REJECTS the deal unless it touches an asset the hotter party rates
        VITAL or EXISTENTIAL (§4.2.2 — why ceasefires aimed at the wrong
        temperature collapse). face_tokens unlock locked rungs (R3).
        """
        if self.rung <= 0:
            return ClimbResult(False, "already at normal relations")

        target_rung = self.rung - 1
        if target_rung in self.locked_below:
            if face_tokens < 1:
                return ClimbResult(
                    False,
                    f"rung {target_rung} is LOCKED — a Face-Saving token is "
                    f"required (the ratchet does not undo itself)",
                )

        hot = self.hotter_to_move(initiator, counterpart)
        if hot.name != initiator.name:
            # The colder party is buying peace: the offer must touch the hot
            # party's hot stakes or the mechanic refuses it outright.
            if concession_asset is None:
                return ClimbResult(
                    False,
                    f"{hot.name}'s stake is hotter — a concession is required",
                )
            offered_temp = hot.profile.true_temp(concession_asset)
            if offered_temp is StakeTemp.NEGOTIABLE:
                return ClimbResult(
                    False,
                    f"offer rejected: {concession_asset} is negotiable-tier to "
                    f"{hot.name}; it does not touch the wound",
                )

        cost = self.descend_cost(initiator, counterpart)
        if initiator.bloc is not None:
            if initiator.bloc.gdp_tokens < cost:
                return ClimbResult(False, f"cannot afford descent (cost {cost})")
            initiator.bloc.gdp_tokens -= cost

        # R4: audience costs for climbing down over your own claimed-hot asset
        penalty = initiator.profile.audience_cost_exposure(self.contested_asset)
        if penalty:
            initiator.regime.score -= penalty
            initiator.regime.check_survival()
            initiator.log.append(
                f"{initiator.name}: audience cost -{penalty} regime for "
                f"climbing down over {self.contested_asset}"
            )

        if target_rung in self.locked_below:
            self.locked_below.discard(target_rung)  # token spent by caller
        self.rung = target_rung
        self.history.append(
            f"{initiator.name} buys down to {self.rung} "
            f"({LADDER_NAMES[self.rung]}) for {cost} GDP"
        )
        return ClimbResult(True, "descended", cost, self.rung)


@dataclass
class LadderBook:
    """All dyadic ladders in a scenario, plus the face-token economy stub."""

    ladders: Dict[Tuple[str, str], EscalationLadder] = field(default_factory=dict)
    face_tokens: Dict[str, int] = field(default_factory=dict)  # mediator -> supply

    def open(self, a: str, b: str, asset: AssetId) -> EscalationLadder:
        key = dyad_key(a, b)
        if key not in self.ladders:
            self.ladders[key] = EscalationLadder(a=key[0], b=key[1],
                                                 contested_asset=asset)
        return self.ladders[key]

    def get(self, a: str, b: str) -> Optional[EscalationLadder]:
        return self.ladders.get(dyad_key(a, b))

    def mint_face_token(self, mediator: str, n: int = 1) -> None:
        self.face_tokens[mediator] = self.face_tokens.get(mediator, 0) + n

    def spend_face_token(self, mediator: str) -> bool:
        if self.face_tokens.get(mediator, 0) > 0:
            self.face_tokens[mediator] -= 1
            return True
        return False
