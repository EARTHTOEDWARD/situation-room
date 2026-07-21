# existential/stakes.py
"""Hidden stake profiles: the asymmetry engine.

Design doc §2. Every power secretly assigns a temperature to each contested
asset. Claims are free and unverifiable; only costly signals move other
players' justified beliefs. Nothing in this module reveals a true temperature
except `StakeProfile.reveal()`, which the engine calls only at game end
(or when a Fog event leaks it).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

AssetId = str  # e.g. "STRAIT_OF_HORMUZ", "SERBIA", "NUCLEAR_LATENCY"


class StakeTemp(Enum):
    """How much an asset matters to a power. Higher = hotter."""

    NEGOTIABLE = 1  # losing this costs points; you will trade it
    VITAL = 2       # losing this cripples you; you will escalate to protect it
    EXISTENTIAL = 3 # losing this ends your game; you accept any risk

    def __str__(self) -> str:  # pragma: no cover - cosmetic
        return self.name


@dataclass
class SignalRecord:
    """A costly signal actually paid for — the only honest currency.

    weight is derived from the GDP (or other) cost sunk: signals that cost
    nothing carry no weight. The engine appends these; mediators see a
    (possibly fog-degraded) digest.
    """

    turn: int
    actor: str
    asset: AssetId
    implied_temp: StakeTemp
    cost_paid: int
    description: str = ""

    @property
    def weight(self) -> float:
        """Signal credibility grows sub-linearly with sunk cost."""
        return min(3.0, self.cost_paid ** 0.5)


@dataclass
class StakeProfile:
    """A power's private map from assets to temperatures, plus public claims.

    Invariants enforced by the scenario generator, not here:
      * at least one asset is EXISTENTIAL for one power and NEGOTIABLE for
        another (design doc §2.2 — asymmetry by construction).
    """

    owner: str
    _true: Dict[AssetId, StakeTemp] = field(default_factory=dict, repr=False)
    claimed: Dict[AssetId, StakeTemp] = field(default_factory=dict)
    signals: List[SignalRecord] = field(default_factory=list)

    # ---------------- private truth (engine-only access) ----------------
    def true_temp(self, asset: AssetId) -> StakeTemp:
        """Engine-only. Player-facing code must never call this directly;
        the engine uses it for ratchet pricing without echoing it to players
        (players see prices, not temperatures — prices *are* the tell)."""
        return self._true.get(asset, StakeTemp.NEGOTIABLE)

    def set_true(self, asset: AssetId, temp: StakeTemp) -> None:
        self._true[asset] = temp

    def existential_assets(self) -> List[AssetId]:
        return [a for a, t in self._true.items() if t is StakeTemp.EXISTENTIAL]

    def reveal(self) -> Dict[AssetId, StakeTemp]:
        """Called at game end for the calibration debrief (design doc §9)."""
        return dict(self._true)

    # ---------------- public interface ----------------
    def claim(self, asset: AssetId, temp: StakeTemp) -> None:
        """Talk is free. Claims may change every turn and may be lies."""
        self.claimed[asset] = temp

    def record_signal(self, sig: SignalRecord) -> None:
        self.signals.append(sig)

    def audience_cost_exposure(self, asset: AssetId) -> int:
        """Regime-score penalty if the owner de-escalates over an asset it
        has publicly claimed VITAL or EXISTENTIAL (design doc §4.2.4).
        Returns the pending penalty; the engine charges it on climb-down."""
        claimed = self.claimed.get(asset)
        if claimed is None:
            return 0
        return {StakeTemp.NEGOTIABLE: 0, StakeTemp.VITAL: 1,
                StakeTemp.EXISTENTIAL: 3}[claimed]


@dataclass
class PerceptionMatrix:
    """One player's beliefs about everyone else's temperatures, logged per
    turn. Phase 2 scores these (Brier) against revealed truth; Phase 1 only
    records them so the data exists from the first playtest."""

    observer: str
    # history[turn][other_power][asset] = believed temperature
    history: Dict[int, Dict[str, Dict[AssetId, StakeTemp]]] = field(
        default_factory=dict
    )

    def log(self, turn: int, beliefs: Dict[str, Dict[AssetId, StakeTemp]]) -> None:
        self.history[turn] = {p: dict(a) for p, a in beliefs.items()}

    def latest(self) -> Optional[Dict[str, Dict[AssetId, StakeTemp]]]:
        if not self.history:
            return None
        return self.history[max(self.history)]
