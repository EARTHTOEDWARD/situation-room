'use strict';
const assert = require('assert');
const E = require('../the-burr/engine.js');

function planAll(game, plans) {
  E.ROLE_ORDER.forEach((roleId) => {
    const result = E.submitPlan(game, roleId, plans[roleId]);
    assert.equal(result.ok, true, `${roleId}: ${result.reason || 'invalid plan'}`);
  });
}

function firstLegalPlan(game, roleId) {
  const factions = ['survival', 'statesman', 'hawk'];
  const publicActions = E.getPublicActions(game, roleId);
  const privateActions = E.getPrivateActions(game, roleId);
  for (const faction of factions) {
    for (const pub of publicActions) {
      for (const priv of privateActions) {
        const targets = priv.targets && priv.targets.length ? priv.targets : [null];
        for (const target of targets) {
          const plan = { faction, publicAction: pub.id, privateAction: priv.id, target };
          if (E.validatePlan(game, roleId, plan).ok) return plan;
        }
      }
    }
  }
  return null;
}

(function testInitialState() {
  const game = E.createGame({ humanRoles: E.ROLE_ORDER, seed: 'unit-initial' });
  assert.equal(game.ladder.rung, 3);
  assert.equal(game.media, 2);
  assert.equal(game.entanglement, 2);
  assert.deepEqual(Object.keys(game.roles), E.ROLE_ORDER);
  assert.equal(game.roles.BELARUS.stakes.BORDER, E.TEMP.NEGOTIABLE);
  assert.equal(game.roles.BELARUS.stakes.REGIME, E.TEMP.EXISTENTIAL);
})();

(function testGuidedRound() {
  const game = E.createGame({ humanRoles: [], seed: 'GUIDED-BURR-001', guided: true });
  E.submitGuidedPlans(game);
  const result = E.resolveRound(game);
  assert.equal(result.ok, true);
  assert.equal(game.round, 2);
  assert.equal(game.ladder.rung, 4);
  assert.equal(game.entanglement, 3);
  assert.equal(game.secretDeals.length, 1);
  assert.match(game.secretDeals[0].title, /Patrol withdrawal/);
  assert.equal(game.secretDeals[0].protected, true);
  assert.equal(E.getGuidedNarrative(result).length, 6);
})();

(function testMatchedMajorPowerBackchannel() {
  const game = E.createGame({ humanRoles: E.ROLE_ORDER, seed: 'match-major' });
  planAll(game, {
    BELARUS: { faction: 'survival', publicAction: 'B_STRATEGIC_AMBIGUITY', privateAction: 'B_REQUEST_ESCROW', target: 'UN' },
    RUSSIA: { faction: 'statesman', publicAction: 'R_SIGNAL_RESTRAINT', privateAction: 'R_DEMOBILIZE_FOR_NONDEPLOYMENT', target: 'US' },
    US: { faction: 'statesman', publicAction: 'U_SUPPORT_INQUIRY', privateAction: 'U_NO_PERMANENT_DEPLOYMENT', target: 'RUSSIA' },
    EU: { faction: 'survival', publicAction: 'E_EMERGENCY_COUNCIL', privateAction: 'E_WHIP_COALITION', target: null },
    UN: { faction: 'survival', publicAction: 'N_PUBLIC_APPEAL', privateAction: 'N_SECRET_ANNEX', target: null },
  });
  const result = E.resolveRound(game);
  assert.equal(result.ok, true);
  assert.ok(game.secretDeals.some((deal) => /Demobilisation/.test(deal.title)));
  assert.equal(game.ladder.rung, 2);
})();

(function testFaceMechanismReopensWeldedRung() {
  const game = E.createGame({ humanRoles: E.ROLE_ORDER, seed: 'face-weld' });
  game.ladder.rung = 6;
  game.ladder.locked = [5];
  planAll(game, {
    BELARUS: { faction: 'statesman', publicAction: 'B_ACCEPT_INQUIRY', privateAction: 'B_SEEK_GUARANTEE', target: 'RUSSIA' },
    RUSSIA: { faction: 'statesman', publicAction: 'R_CALL_INVESTIGATION', privateAction: 'R_CONDITIONAL_GUARANTEE', target: 'BELARUS' },
    US: { faction: 'statesman', publicAction: 'U_SUPPORT_INQUIRY', privateAction: 'U_QUIET_REASSURANCE', target: 'EU' },
    EU: { faction: 'statesman', publicAction: 'E_SUPPORT_INQUIRY', privateAction: 'E_DELAY_SANCTIONS', target: 'RUSSIA' },
    UN: { faction: 'statesman', publicAction: 'N_JOINT_INQUIRY', privateAction: 'N_ESCROW_PACKAGE', target: null },
  });
  const result = E.resolveRound(game);
  assert.equal(result.ok, true);
  assert.ok(game.ladder.rung <= 5);
  assert.equal(game.ladder.locked.includes(5), false);
})();

(function testCombinedAssetValidation() {
  const game = E.createGame({ humanRoles: ['US'], seed: 'asset-combined' });
  game.roles.US.assets.REINFORCEMENT.clock = 1;
  const result = E.validatePlan(game, 'US', {
    faction: 'hawk',
    publicAction: 'U_REINFORCE',
    privateAction: 'U_PREPARE_REINFORCEMENT',
    target: null,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /combined plan/i);
})();


(function testUnbackedClaimExpiresHollow() {
  const game = E.createGame({ humanRoles: E.ROLE_ORDER, seed: 'hollow-claim' });
  const roundOne = {
    BELARUS: { faction: 'hawk', publicAction: 'B_BORDER_RED_LINE', privateAction: 'B_REQUEST_ESCROW', target: 'UN' },
    RUSSIA: { faction: 'hawk', publicAction: 'R_DEFENSIVE_EXERCISES', privateAction: 'R_COVERT_SUPPORT', target: 'BELARUS' },
    US: { faction: 'survival', publicAction: 'U_REASSURE_ALLIES', privateAction: 'U_QUIET_REASSURANCE', target: 'EU' },
    EU: { faction: 'survival', publicAction: 'E_PREPARE_SANCTIONS', privateAction: 'E_WHIP_COALITION', target: null },
    UN: { faction: 'hawk', publicAction: 'N_EMERGENCY_SESSION', privateAction: 'N_QUIET_ROOM', target: 'EU' },
  };
  planAll(game, roundOne);
  assert.equal(E.resolveRound(game).ok, true);

  const quietRound = {
    BELARUS: { faction: 'survival', publicAction: 'B_STRATEGIC_AMBIGUITY', privateAction: 'B_REQUEST_ESCROW', target: 'UN' },
    RUSSIA: { faction: 'statesman', publicAction: 'R_SIGNAL_RESTRAINT', privateAction: 'R_COVERT_SUPPORT', target: 'BELARUS' },
    US: { faction: 'statesman', publicAction: 'U_SUPPORT_INQUIRY', privateAction: 'U_INTELLIGENCE_PROBE', target: 'RUSSIA' },
    EU: { faction: 'survival', publicAction: 'E_EMERGENCY_COUNCIL', privateAction: 'E_WHIP_COALITION', target: null },
    UN: { faction: 'survival', publicAction: 'N_PUBLIC_APPEAL', privateAction: 'N_QUIET_ROOM', target: 'BELARUS' },
  };
  quietRound.UN = { faction: 'survival', publicAction: 'N_PUBLIC_APPEAL', privateAction: 'N_ESCROW_PACKAGE', target: null };
  planAll(game, quietRound);
  assert.equal(E.resolveRound(game).ok, true);
  const quietRoundThree = JSON.parse(JSON.stringify(quietRound));
  quietRoundThree.UN = { faction: 'survival', publicAction: 'N_PUBLIC_APPEAL', privateAction: 'N_INSPECTION_MISSION', target: 'BELARUS' };
  planAll(game, quietRoundThree);
  assert.equal(E.resolveRound(game).ok, true);

  const redLine = game.roles.BELARUS.claims.find((claim) => claim.round === 1 && claim.issue === E.ISSUE.BORDER);
  assert.ok(redLine);
  assert.equal(redLine.resolved, true);
  assert.equal(redLine.backed, false);
  assert.ok(game.roles.BELARUS.bluffFatigue >= 2);
  assert.ok(game.publicLog.some((entry) => /expires unbacked/.test(entry.text)));
})();


(function testInternalHawkEventCanEscalateAfterDecisionWindow() {
  const game = E.createGame({ humanRoles: E.ROLE_ORDER, seed: 'faction-late-escalation' });
  game.roles.BELARUS.pressures.hawk = 3;
  planAll(game, {
    BELARUS: { faction: 'statesman', publicAction: 'B_STRATEGIC_AMBIGUITY', privateAction: 'B_REQUEST_ESCROW', target: 'UN' },
    RUSSIA: { faction: 'statesman', publicAction: 'R_CALL_INVESTIGATION', privateAction: 'R_COVERT_SUPPORT', target: 'BELARUS' },
    US: { faction: 'statesman', publicAction: 'U_SUPPORT_INQUIRY', privateAction: 'U_QUIET_REASSURANCE', target: 'EU' },
    EU: { faction: 'statesman', publicAction: 'E_SUPPORT_INQUIRY', privateAction: 'E_WHIP_COALITION', target: null },
    UN: { faction: 'survival', publicAction: 'N_PUBLIC_APPEAL', privateAction: 'N_QUIET_ROOM', target: 'BELARUS' },
  });
  const result = E.resolveRound(game);
  assert.equal(result.ok, true);
  assert.ok(game.roles.BELARUS.factionEvents.some((event) => event.faction === 'hawk'));
  assert.ok(game.publicLog.some((entry) => /internal hard-line faction/.test(entry.text)));
})();

(function testFullNPCSixRoundRun() {
  const game = E.createGame({ humanRoles: [], seed: 'ai-six-rounds' });
  let safety = 0;
  while (!game.over && safety < 10) {
    E.submitAIPlans(game);
    const result = E.resolveRound(game);
    assert.equal(result.ok, true);
    safety += 1;
  }
  assert.equal(game.over, true);
  assert.ok(game.roundHistory.length >= 1 && game.roundHistory.length <= 6);
  const score = E.scoreGame(game);
  assert.ok(score.worldViability >= 0 && score.worldViability <= 100);
  const replay = JSON.parse(E.exportReplay(game));
  assert.equal(replay.scenario, 'THE BURR');
  assert.equal(replay.npcPolicyVersion, E.NPC_POLICY_VERSION);
  assert.equal(replay.roundHistory.length, game.roundHistory.length);
})();

(function testSoloPlanningLeavesExactlyOneHumanPlanOpenAndIsIdempotent() {
  E.ROLE_ORDER.forEach((humanRole) => {
    const game = E.createGame({ humanRoles: [humanRole], seed: `solo-open-${humanRole}` });
    assert.equal(game.mode, 'solo');
    const result = E.submitNPCPlans(game);
    assert.equal(result.ok, true);
    assert.equal(Object.keys(game.plans).length, 4);
    assert.equal(game.plans[humanRole], undefined);
    Object.entries(game.plans).forEach(([roleId, plan]) => assert.equal(E.validatePlan(game, roleId, plan).ok, true));
    const before = JSON.stringify({ plans: game.plans, rngState: game.rngState });
    assert.equal(E.submitNPCPlans(game).ok, true);
    assert.equal(JSON.stringify({ plans: game.plans, rngState: game.rngState }), before);
    const humanPlan = firstLegalPlan(game, humanRole);
    assert.ok(humanPlan, `${humanRole} should have a legal human plan`);
    assert.equal(E.submitPlan(game, humanRole, humanPlan).ok, true);
    assert.equal(E.allPlansSubmitted(game), true);
  });
})();

(function testNpcFallbackAlwaysFindsACompleteLegalPlan() {
  const exhausted = E.createGame({ humanRoles: [], seed: 'npc-zero-assets' });
  E.ROLE_ORDER.forEach((roleId) => {
    Object.values(exhausted.roles[roleId].assets).forEach((asset) => { asset.clock = 0; });
  });
  assert.equal(E.submitNPCPlans(exhausted).ok, true);
  E.ROLE_ORDER.forEach((roleId) => assert.equal(E.validatePlan(exhausted, roleId, exhausted.plans[roleId]).ok, true));
  assert.equal(exhausted.plans.UN.privateAction, 'N_MAINTAIN_CHANNELS');

  const combined = E.createGame({ humanRoles: ['BELARUS'], seed: 'npc-combined-fallback' });
  combined.roles.RUSSIA.assets.MOBILIZATION.clock = 0;
  combined.roles.US.assets.REINFORCEMENT.clock = 1;
  combined.roles.US.assets.INTELLIGENCE.clock = 0;
  assert.equal(E.submitNPCPlans(combined).ok, true);
  assert.equal(E.validatePlan(combined, 'US', combined.plans.US).ok, true);
  assert.notDeepEqual(
    [combined.plans.US.publicAction, combined.plans.US.privateAction],
    ['U_REINFORCE', 'U_PREPARE_REINFORCEMENT']
  );
})();

(function testSoloCorpusCompletesForEveryHumanRole() {
  E.ROLE_ORDER.forEach((humanRole) => {
    for (let index = 0; index < 40; index += 1) {
      const game = E.createGame({ humanRoles: [humanRole], seed: `solo-${humanRole}-${index}` });
      let guard = 0;
      while (!game.over && guard < 8) {
        const npcResult = E.submitNPCPlans(game);
        assert.equal(npcResult.ok, true, `${humanRole} seed ${index}: ${npcResult.reason || 'NPC planning failed'}`);
        Object.entries(game.plans).forEach(([roleId, plan]) => {
          assert.equal(E.validatePlan(game, roleId, plan).ok, true, `${humanRole} seed ${index}: invalid ${roleId} plan`);
        });
        if (!game.roles[humanRole].eliminated) {
          const humanPlan = firstLegalPlan(game, humanRole);
          assert.ok(humanPlan, `${humanRole} seed ${index}: no legal human plan`);
          assert.equal(E.submitPlan(game, humanRole, humanPlan).ok, true);
        }
        assert.equal(E.resolveRound(game).ok, true);
        guard += 1;
      }
      assert.equal(game.over, true, `${humanRole} seed ${index}: did not terminate`);
      assert.ok(game.roundHistory.length >= 1 && game.roundHistory.length <= 6);
      E.ROLE_ORDER.forEach((roleId) => {
        const role = game.roles[roleId];
        assert.ok(role.leadership >= 0 && role.leadership <= 10);
        assert.ok(role.welfare >= 0 && role.welfare <= 10);
        assert.ok(role.credibility >= 0 && role.credibility <= 8);
        assert.ok(role.wiggle >= 0 && role.wiggle <= 4);
        Object.values(role.assets).forEach((asset) => assert.ok(asset.clock >= 0 && asset.clock <= asset.max));
      });
    }
  });
})();

(function testHumanChoiceCausesRatherThanScriptsSoloDeal() {
  const makeGame = () => E.createGame({ humanRoles: ['BELARUS'], seed: 'solo-causal-choice' });
  const matching = makeGame();
  const counterfactual = makeGame();
  assert.equal(E.submitNPCPlans(matching).ok, true);
  assert.equal(E.submitNPCPlans(counterfactual).ok, true);
  assert.deepEqual(matching.plans, counterfactual.plans);
  assert.equal(matching.plans.RUSSIA.privateAction, 'R_CONDITIONAL_GUARANTEE');
  assert.equal(E.submitPlan(matching, 'BELARUS', {
    faction: 'statesman', publicAction: 'B_STRATEGIC_AMBIGUITY', privateAction: 'B_SEEK_GUARANTEE', target: 'RUSSIA',
  }).ok, true);
  assert.equal(E.submitPlan(counterfactual, 'BELARUS', {
    faction: 'survival', publicAction: 'B_STRATEGIC_AMBIGUITY', privateAction: 'B_REQUEST_ESCROW', target: 'UN',
  }).ok, true);
  assert.equal(E.resolveRound(matching).ok, true);
  assert.equal(E.resolveRound(counterfactual).ok, true);
  assert.ok(matching.secretDeals.some((deal) => /Patrol withdrawal/.test(deal.title)));
  assert.equal(counterfactual.secretDeals.some((deal) => /Patrol withdrawal/.test(deal.title)), false);
})();

(function testActiveReplayRedactsHiddenPlansUntilDebrief() {
  const game = E.createGame({ humanRoles: [], seed: 'public-replay-redaction', guided: true });
  E.submitGuidedPlans(game);
  assert.equal(E.resolveRound(game).ok, true);
  const publicReplay = JSON.parse(E.exportReplay(game));
  assert.equal(publicReplay.visibility, 'public');
  Object.values(publicReplay.roundHistory[0].plans).forEach((plan) => {
    assert.deepEqual(Object.keys(plan), ['publicAction']);
  });
  assert.equal(publicReplay.roundHistory[0].end.deals, undefined);
  assert.equal(publicReplay.final.score, undefined);
  assert.equal(JSON.stringify(publicReplay).includes('Patrol withdrawal for regime assurance'), false);
  assert.equal(JSON.stringify(publicReplay).includes('B_SEEK_GUARANTEE'), false);
  const debriefReplay = JSON.parse(E.exportReplay(game, { revealHidden: true }));
  assert.equal(debriefReplay.visibility, 'debrief');
  assert.equal(debriefReplay.roundHistory[0].plans.BELARUS.privateAction, 'B_SEEK_GUARANTEE');
  assert.equal(debriefReplay.roundHistory[0].plans.BELARUS.faction, 'hawk');
  assert.ok(debriefReplay.roundHistory[0].end.deals.includes('Patrol withdrawal for regime assurance'));
  assert.ok(debriefReplay.final.score.roles.BELARUS);
})();

(function testToolbarReplayStaysPublicAfterGameOver() {
  const game = E.createGame({ humanRoles: [], seed: 'post-game-public-replay', guided: true, maxRounds: 1 });
  E.submitGuidedPlans(game);
  assert.equal(E.resolveRound(game).ok, true);
  assert.equal(game.over, true);

  const toolbarReplay = JSON.parse(E.exportReplay(game));
  assert.equal(toolbarReplay.visibility, 'public');
  assert.equal(toolbarReplay.final.score, undefined);
  assert.equal(toolbarReplay.roundHistory[0].end.deals, undefined);
  assert.equal(JSON.stringify(toolbarReplay).includes('B_SEEK_GUARANTEE'), false);

  const debriefReplay = JSON.parse(E.exportReplay(game, { revealHidden: true }));
  assert.equal(debriefReplay.visibility, 'debrief');
  assert.equal(debriefReplay.roundHistory[0].plans.BELARUS.privateAction, 'B_SEEK_GUARANTEE');
  assert.ok(debriefReplay.final.score.roles.BELARUS);
})();

console.log('14 engine tests passed.');
