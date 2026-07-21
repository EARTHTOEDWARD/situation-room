# existential/__init__.py
"""Conviction: Existential — Phase 1 engine fork.

Adds to the legacy Conviction engine (by composition, not modification):
  * hidden StakeProfiles with three temperatures        (stakes.py, §2)
  * Regime/Nation split with fusion + Nero mechanic     (power.py,  §3)
  * per-dyad escalation ladders with ratchet pricing    (escalation.py, §4)

Phase 2 will add perception scoring; Phase 3 the Arkhipov layer; Phase 4
scenario JSON + AI regimes.
"""
from .stakes import AssetId, StakeTemp, StakeProfile, SignalRecord, PerceptionMatrix
from .power import Power, RegimeState, NationState
from .escalation import (
    EscalationLadder,
    LadderBook,
    ClimbResult,
    LADDER_NAMES,
    LOCK_THRESHOLD,
    dyad_key,
)
from .scenario import gulf_2026, ScenarioState

__all__ = [
    "AssetId", "StakeTemp", "StakeProfile", "SignalRecord", "PerceptionMatrix",
    "Power", "RegimeState", "NationState",
    "EscalationLadder", "LadderBook", "ClimbResult", "LADDER_NAMES",
    "LOCK_THRESHOLD", "dyad_key",
    "gulf_2026", "ScenarioState",
]
