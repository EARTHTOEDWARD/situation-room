# test_existential.py — Phase 1 tests
import unittest

from existential import (
    StakeTemp, Power, LadderBook, gulf_2026, LOCK_THRESHOLD,
)
from existential.stakes import SignalRecord


def bare_power(name: str) -> Power:
    p = Power(name)
    p.bloc = None  # headless: no legacy economy needed for these tests
    return p


class TestStakes(unittest.TestCase):
    def test_claims_are_free_and_unverified(self):
        p = bare_power("A")
        p.profile.set_true("X", StakeTemp.NEGOTIABLE)
        p.profile.claim("X", StakeTemp.EXISTENTIAL)  # lying is legal
        self.assertEqual(p.profile.true_temp("X"), StakeTemp.NEGOTIABLE)
        self.assertEqual(p.profile.claimed["X"], StakeTemp.EXISTENTIAL)

    def test_signal_weight_grows_sublinearly_with_cost(self):
        cheap = SignalRecord(1, "A", "X", StakeTemp.VITAL, cost_paid=1)
        dear = SignalRecord(1, "A", "X", StakeTemp.VITAL, cost_paid=9)
        self.assertLess(cheap.weight, dear.weight)
        self.assertLessEqual(dear.weight, 3.0)

    def test_audience_cost_scales_with_claim(self):
        p = bare_power("A")
        p.profile.claim("X", StakeTemp.EXISTENTIAL)
        self.assertEqual(p.profile.audience_cost_exposure("X"), 3)
        p.profile.claim("X", StakeTemp.NEGOTIABLE)
        self.assertEqual(p.profile.audience_cost_exposure("X"), 0)


class TestRegimeNation(unittest.TestCase):
    def test_fusion_propagates_nation_damage_to_regime(self):
        hi = bare_power("HI"); hi.regime.fusion = 1.0
        lo = bare_power("LO"); lo.regime.fusion = 0.0
        hi.apply_nation_damage(4, foreign=False)
        lo.apply_nation_damage(4, foreign=False)
        self.assertEqual(hi.regime.score, 6)    # full propagation
        self.assertEqual(lo.regime.score, 10)   # none
        self.assertEqual(hi.nation.score, lo.nation.score)

    def test_foreign_attack_raises_fusion(self):
        p = bare_power("P"); f0 = p.regime.fusion
        p.apply_nation_damage(1, foreign=True, severity=8)
        self.assertGreater(p.regime.fusion, f0)

    def test_nero_burns_nation_and_worsens_rate(self):
        p = bare_power("P")
        p.regime.fusion = 0.8
        p.nation.score = 20
        gained = p.scorched_nation(4)
        self.assertEqual(gained, 4)
        self.assertLess(p.nation.score, 20)
        self.assertLess(p.regime.fusion, 0.8)     # sacrifice was visible
        self.assertGreaterEqual(p.nero_exchange_rate(), 3)  # rate worsened

    def test_regime_falls_at_zero(self):
        p = bare_power("P"); p.regime.fusion = 1.0
        p.apply_nation_damage(10, foreign=False)
        self.assertFalse(p.regime.alive)


class TestRatchet(unittest.TestCase):
    def setUp(self):
        self.book = LadderBook()
        self.hot = bare_power("HOT")
        self.hot.profile.set_true("ASSET", StakeTemp.EXISTENTIAL)
        self.cold = bare_power("COLD")
        self.cold.profile.set_true("ASSET", StakeTemp.NEGOTIABLE)
        self.lad = self.book.open("HOT", "COLD", "ASSET")

    def test_R1_hot_stakes_climb_cheap(self):
        self.assertLess(self.lad.climb_cost(self.hot),
                        self.lad.climb_cost(self.cold))

    def test_R2_wrong_temperature_offer_is_rejected(self):
        self.lad.rung = 3
        self.cold.profile.set_true("BAUBLE", StakeTemp.VITAL)  # cold cares; hot doesn't
        self.hot.profile.set_true("BAUBLE", StakeTemp.NEGOTIABLE)
        r = self.lad.descend(self.cold, self.hot, concession_asset="BAUBLE")
        self.assertFalse(r.ok)
        self.assertIn("does not touch the wound", r.reason)

    def test_R2_right_temperature_offer_succeeds(self):
        self.lad.rung = 3
        self.hot.profile.set_true("SECURITY_GUARANTEE", StakeTemp.EXISTENTIAL)
        r = self.lad.descend(self.cold, self.hot,
                             concession_asset="SECURITY_GUARANTEE")
        self.assertTrue(r.ok)
        self.assertEqual(self.lad.rung, 2)

    def test_R2_descend_priced_by_hotter_party(self):
        self.assertEqual(self.lad.descend_cost(self.cold, self.hot),
                         4 * StakeTemp.EXISTENTIAL.value)

    def test_R3_rungs_lock_above_threshold_and_need_token(self):
        for _ in range(LOCK_THRESHOLD + 1):
            self.lad.climb(self.hot, self.cold)
        self.assertIn(LOCK_THRESHOLD, self.lad.locked_below)
        r = self.lad.descend(self.hot, self.cold, concession_asset=None,
                             face_tokens=0)
        self.assertFalse(r.ok)
        self.assertIn("LOCKED", r.reason)
        r2 = self.lad.descend(self.hot, self.cold, concession_asset=None,
                              face_tokens=1)
        self.assertTrue(r2.ok)

    def test_R4_audience_cost_charged_on_climbdown(self):
        self.lad.rung = 2
        self.hot.profile.claim("ASSET", StakeTemp.EXISTENTIAL)
        before = self.hot.regime.score
        r = self.lad.descend(self.hot, self.cold, concession_asset=None)
        self.assertTrue(r.ok)
        self.assertEqual(self.hot.regime.score, before - 3)

    def test_climb_damages_defender_and_raises_fusion(self):
        f0 = self.cold.regime.fusion
        n0 = self.cold.nation.score
        self.lad.climb(self.hot, self.cold)
        self.assertLess(self.cold.nation.score, n0)
        self.assertGreater(self.cold.regime.fusion, f0)


class TestScenario(unittest.TestCase):
    def test_gulf_2026_builds_and_is_asymmetric(self):
        s = gulf_2026(with_blocs=False)
        self.assertTrue(s.verify_asymmetry())
        self.assertEqual(len(s.powers), 3)
        self.assertEqual(len(s.ladders.ladders), 2)
        self.assertEqual(s.ladders.face_tokens["UN_MEDIATOR"], 2)

    def test_iran_claims_hotter_than_truth(self):
        s = gulf_2026(with_blocs=False)
        iran = s.powers["IRAN"]
        self.assertEqual(iran.profile.claimed["STRAIT_OF_HORMUZ"],
                         StakeTemp.EXISTENTIAL)
        self.assertEqual(iran.profile.true_temp("STRAIT_OF_HORMUZ"),
                         StakeTemp.VITAL)

    def test_legacy_bloc_attachment_if_available(self):
        s = gulf_2026(with_blocs=True)
        iran = s.powers["IRAN"]
        if iran.bloc is not None:  # legacy engine present in repo
            self.assertEqual(iran.bloc.gdp_tokens, 12)


if __name__ == "__main__":
    unittest.main(verbosity=2)
