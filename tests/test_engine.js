'use strict';
const assert = require('assert');
const E = require('../the-burr/engine.js');

function planAll(game, plans) {
  E.ROLE_ORDER.forEach((roleId) => {
    const result = E.submitPlan(game, roleId, plans[roleId]);
    assert.equal(result.ok, true, `${roleId}: ${result.reason || 'invalid plan'}`);
  });
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

(function testFullAISixRoundRun() {
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
  assert.equal(replay.roundHistory.length, game.roundHistory.length);
})();

console.log('9 engine tests passed.');
