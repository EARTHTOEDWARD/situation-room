# existential/power.py
"""The Regime/Nation split (design doc §3).

A Power wraps the existing Conviction `Bloc` by composition: the Bloc keeps
handling economy/cards/budget exactly as today, while RegimeState and
NationState carry the new dual scoring. Nothing in the legacy engine breaks.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, TYPE_CHECKING

from .stakes import StakeProfile, StakeTemp

if TYPE_CHECKING:  # avoid import cycle with the legacy engine
    from models import Bloc


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


@dataclass
class RegimeState:
    """The player's *personal* win condition. Score is hidden in play."""

    score: int = 10                 # regime survival capital; 0 => regime falls
    fusion: float = 0.5             # F in [0,1]: regime==nation identification
    paranoia: int = 0               # 0-5; raised by threats, feeds §7 later
    loyalty: int = 2                # 0-5 loyalty/judgment dial (Arkhipov layer,
    judgment: int = 3               #  Phase 3 consumes these; Phase 1 stores)
    alive: bool = True

    def check_survival(self) -> bool:
        if self.score <= 0:
            self.alive = False
        return self.alive


@dataclass
class NationState:
    """Open scoreboard. Does NOT determine who wins — that's the point."""

    score: int = 20                 # population welfare / economy / territory
    baseline: int = 20              # turn-1 value, for the end-game red delta

    @property
    def delta(self) -> int:
        return self.score - self.baseline


@dataclass
class Power:
    """One seat at the table: legacy Bloc + the new dual-score machinery."""

    name: str
    bloc: Optional["Bloc"] = None   # legacy economy/card engine, optional in tests
    regime: RegimeState = field(default_factory=RegimeState)
    nation: NationState = field(default_factory=NationState)
    profile: StakeProfile = field(default=None)  # type: ignore[assignment]
    log: List[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.profile is None:
            self.profile = StakeProfile(owner=self.name)

    # ---------------- fusion dynamics (emergent, §3.1) ----------------
    def on_attacked_by_foreigner(self, severity: int) -> None:
        """The invasion paradox: external attack fuses regime and nation.
        Severity ~ escalation rung of the attack (1..10)."""
        gain = 0.04 * severity
        self.regime.fusion = _clamp(self.regime.fusion + gain, 0.0, 1.0)
        self.regime.paranoia = min(5, self.regime.paranoia + (1 if severity >= 5 else 0))
        self.log.append(
            f"{self.name}: attacked (severity {severity}) — fusion rises to "
            f"{self.regime.fusion:.2f}"
        )

    def on_visible_sacrifice_of_nation(self, amount: int) -> None:
        """Visibly spending the nation for the regime erodes fusion."""
        self.regime.fusion = _clamp(self.regime.fusion - 0.05 * amount, 0.0, 1.0)

    # ---------------- shared fate ----------------
    def apply_nation_damage(self, dmg: int, foreign: bool = True,
                            severity: int = 0) -> None:
        """Damage to the nation partially propagates to the regime, scaled by
        fusion: a high-F regime genuinely shares the nation's fate."""
        self.nation.score = max(0, self.nation.score - dmg)
        regime_share = int(round(dmg * self.regime.fusion))
        if regime_share:
            self.regime.score -= regime_share
        if foreign and severity:
            self.on_attacked_by_foreigner(severity)
        self.regime.check_survival()

    # ---------------- the Nero mechanic (§3.2) ----------------
    def nero_exchange_rate(self) -> int:
        """Nation points needed to buy ONE regime point. Worsens as fusion
        drops and the divergence becomes visible: a regime the nation no
        longer identifies with must burn more of it to stay standing."""
        f = self.regime.fusion
        if f >= 0.75:
            return 2
        if f >= 0.5:
            return 3
        if f >= 0.25:
            return 4
        return 5

    def scorched_nation(self, regime_points_wanted: int) -> int:
        """Burn nation score for regime survival. Returns regime points
        actually gained. Erodes fusion (the sacrifice is visible), which
        worsens the *next* exchange — desperation compounds."""
        if not self.regime.alive:
            return 0  # a fallen regime cannot burn what it no longer commands
        gained = 0
        for _ in range(regime_points_wanted):
            rate = self.nero_exchange_rate()
            if self.nation.score < rate:
                break
            self.nation.score -= rate
            self.regime.score += 1
            gained += 1
            self.on_visible_sacrifice_of_nation(rate)
        if gained:
            self.log.append(
                f"{self.name}: NERO — burned nation for +{gained} regime "
                f"(fusion now {self.regime.fusion:.2f})"
            )
        return gained

    # ---------------- end-game ----------------
    def final_report(self) -> str:
        alive = "SURVIVED" if self.regime.alive else "FELL"
        return (
            f"{self.name}: regime {alive} (score {self.regime.score}) | "
            f"nation {self.nation.score} ({self.nation.delta:+d} vs baseline) | "
            f"fusion {self.regime.fusion:.2f}"
        )
