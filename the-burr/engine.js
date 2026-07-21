(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SituationRoomEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '0.1.0';
  const TEMP = Object.freeze({ NEGOTIABLE: 1, VITAL: 2, EXISTENTIAL: 3 });
  const TEMP_NAME = Object.freeze({ 1: 'NEGOTIABLE', 2: 'VITAL', 3: 'EXISTENTIAL' });
  const ISSUE = Object.freeze({
    BORDER: 'BORDER',
    GUARANTEE: 'GUARANTEE',
    REGIME: 'REGIME',
    WORLD: 'WORLD',
    UNION: 'UNION',
  });
  const ISSUE_NAME = Object.freeze({
    BORDER: 'Border status',
    GUARANTEE: 'Patron / alliance guarantees',
    REGIME: 'Leadership survival',
    WORLD: 'Avoiding general war',
    UNION: 'Coalition / institutional cohesion',
  });
  const LADDER_NAMES = Object.freeze([
    'normal relations',
    'diplomatic protest',
    'sanctions warning',
    'border confrontation',
    'proxy clash',
    'limited mobilisation',
    'direct strikes',
    'conventional conflict',
    'alliance war',
    'nuclear signalling',
    'nuclear use',
  ]);
  const ROLE_ORDER = Object.freeze(['BELARUS', 'RUSSIA', 'US', 'EU', 'UN']);
  const MAX_RUNG = 10;
  const LOCK_THRESHOLD = 5;

  const ROLE_DEFS = Object.freeze({
    BELARUS: {
      id: 'BELARUS', name: 'Belarus', short: 'BY', regimeType: 'authoritarian', accent: '#d7b548',
      brief: 'You are the catalytic proxy: weak in aggregate power, strong in the ability to manufacture patron commitment. Your real priority is regime survival, not the crossing itself.',
      factions: {
        hawk: { name: 'Security Hardliners', recommendation: 'Create facts before outsiders can coordinate.' },
        statesman: { name: 'Presidential Diplomats', recommendation: 'Trade the crossing for a guarantee that actually protects the regime.' },
        survival: { name: 'Regime Inner Circle', recommendation: 'Keep Moscow committed and prevent elite abandonment.' },
      },
      stakes: { BORDER: TEMP.NEGOTIABLE, GUARANTEE: TEMP.VITAL, REGIME: TEMP.EXISTENTIAL },
      sacrifice: { leadership: 5, welfare: 4, credibility: 3 },
      start: { leadership: 8, welfare: 8, credibility: 4, wiggle: 3 },
      assets: {
        DENIABILITY: { label: 'Incident deniability', max: 3, clock: 3, desc: 'Each use and each round of scrutiny erodes plausible deniability.' },
        ACCESS: { label: 'Geographic access', max: 3, clock: 3, desc: 'Local access lets you create incidents faster than larger powers can deliberate.' },
        NARRATIVE: { label: 'Emergency narrative', max: 2, clock: 2, desc: 'Controls the first interpretation of a border event.' },
        SECURITY: { label: 'Security apparatus', max: 3, clock: 3, desc: 'Buffers public dissent but cannot eliminate elite defection.' },
      },
    },
    RUSSIA: {
      id: 'RUSSIA', name: 'Russia', short: 'RU', regimeType: 'authoritarian', accent: '#e06a58',
      brief: 'You are the patron. Belarus can entrap you by converting vague support into public obligation. You need strategic depth and credible guarantees without being dragged into an alliance war.',
      factions: {
        hawk: { name: 'Security Council Hawks', recommendation: 'Back the proxy visibly or every other guarantee weakens.' },
        statesman: { name: 'Foreign Ministry', recommendation: 'Make support conditional and exchange demobilisation for reciprocal restraint.' },
        survival: { name: 'Kremlin Survival Bloc', recommendation: 'Avoid humiliation, sanctions shock, and elite blame.' },
      },
      stakes: { BORDER: TEMP.VITAL, GUARANTEE: TEMP.VITAL, REGIME: TEMP.EXISTENTIAL },
      sacrifice: { leadership: 5, welfare: 5, credibility: 4 },
      start: { leadership: 8, welfare: 9, credibility: 5, wiggle: 3 },
      assets: {
        MOBILIZATION: { label: 'Local mobilisation lead', max: 3, clock: 3, desc: 'A temporary timing advantage; it decays as opponents reinforce.' },
        VETO: { label: 'Security Council veto', max: 2, clock: 2, desc: 'Blocks formal action but can also isolate the patron.' },
        ENERGY: { label: 'Energy leverage', max: 3, clock: 3, desc: 'Economic leverage weakens as buyers reroute and substitute.' },
        PROXY_CONTROL: { label: 'Proxy control', max: 3, clock: 3, desc: 'Capacity to restrain or support Belarus without a public rupture.' },
      },
    },
    US: {
      id: 'US', name: 'United States', short: 'US', regimeType: 'democracy', accent: '#64a6e8',
      brief: 'You must preserve alliance credibility while avoiding a rhetorical trap that turns reassurance into an automatic war commitment.',
      factions: {
        hawk: { name: 'Joint Chiefs', recommendation: 'Make deterrence visible before the local balance closes.' },
        statesman: { name: 'Senior Statesmen', recommendation: 'Use a private non-deployment assurance to buy Russian demobilisation.' },
        survival: { name: 'Electoral Coalition', recommendation: 'Look firm without creating an open-ended commitment or visible concession.' },
      },
      stakes: { BORDER: TEMP.NEGOTIABLE, GUARANTEE: TEMP.VITAL, WORLD: TEMP.EXISTENTIAL },
      sacrifice: { leadership: 4, welfare: 4, credibility: 5 },
      start: { leadership: 7, welfare: 9, credibility: 5, wiggle: 4 },
      assets: {
        ASSURANCE: { label: 'Alliance assurance', max: 3, clock: 3, desc: 'Credible reassurance is finite; categorical promises consume it.' },
        INTELLIGENCE: { label: 'Intelligence exposure', max: 2, clock: 2, desc: 'Reveal hidden intentions, at the risk of burning sources.' },
        FINANCE: { label: 'Financial sanctions', max: 3, clock: 3, desc: 'Powerful but coalition-dependent and costly when overused.' },
        REINFORCEMENT: { label: 'Reinforcement window', max: 2, clock: 2, desc: 'A temporary military option that closes as the crisis hardens.' },
      },
    },
    EU: {
      id: 'EU', name: 'European Union', short: 'EU', regimeType: 'coalition', accent: '#7bb9c8',
      brief: 'Your leverage comes from market access, sanctions, and legitimacy. Your constraint is that every escalation test is also a test of member-state unity.',
      factions: {
        hawk: { name: 'Eastern Security Bloc', recommendation: 'Impose a cost before border revision becomes normalised.' },
        statesman: { name: 'De-escalators', recommendation: 'Offer a sanctions delay and investigation pathway before unity decays.' },
        survival: { name: 'Member-State Coalition', recommendation: 'Preserve unanimity and avoid forcing governments into positions they cannot sustain.' },
      },
      stakes: { BORDER: TEMP.VITAL, UNION: TEMP.EXISTENTIAL, WORLD: TEMP.VITAL },
      sacrifice: { leadership: 4, welfare: 5, credibility: 4 },
      start: { leadership: 7, welfare: 9, credibility: 5, wiggle: 4 },
      assets: {
        SANCTIONS_UNITY: { label: 'Sanctions unity', max: 3, clock: 3, desc: 'The coalition decays if threats are repeated without action or off-ramp.' },
        MARKET: { label: 'Market access', max: 3, clock: 3, desc: 'Can fund an off-ramp or impose a long-lived cost.' },
        MISSION: { label: 'Civilian mission', max: 2, clock: 2, desc: 'Provides facts and monitoring without a military deployment.' },
        RECONSTRUCTION: { label: 'Reconstruction fund', max: 2, clock: 2, desc: 'Turns a settlement into a durable positive-sum bargain.' },
      },
    },
    UN: {
      id: 'UN', name: 'United Nations', short: 'UN', regimeType: 'institution', accent: '#50d6d1',
      brief: 'You do not command forces. You manufacture viable exits: quiet rooms, verification, escrow, sequencing, and public language that lets everyone claim partial success.',
      factions: {
        hawk: { name: 'Charter Legalists', recommendation: 'Name the breach clearly or institutional credibility dissolves.' },
        statesman: { name: 'Quiet Diplomats', recommendation: 'Link reciprocal steps in escrow and keep the worst concessions off camera.' },
        survival: { name: 'Secretariat Survival', recommendation: 'Avoid a public failure that sidelines the institution for the rest of the crisis.' },
      },
      stakes: { WORLD: TEMP.EXISTENTIAL, UNION: TEMP.VITAL, BORDER: TEMP.NEGOTIABLE },
      sacrifice: { leadership: 5, welfare: 6, credibility: 5 },
      start: { leadership: 7, welfare: 10, credibility: 5, wiggle: 4 },
      assets: {
        QUIET_ROOM: { label: 'Quiet room', max: 3, clock: 3, desc: 'Backchannel access that can reveal the real wound.' },
        INSPECTION: { label: 'Inspection mission', max: 2, clock: 2, desc: 'Replaces contested narratives with observable compliance.' },
        ESCROW: { label: 'Escrow authority', max: 2, clock: 2, desc: 'Links reciprocal moves so no party must step first.' },
        COMMUNIQUE: { label: 'Joint communiqué', max: 2, clock: 2, desc: 'Creates face-saving ambiguity and protects an otherwise costly retreat.' },
      },
    },
  });

  const PUBLIC_ACTIONS = Object.freeze({
    BELARUS: [
      { id: 'B_BORDER_RED_LINE', label: 'Declare a border red line', alignment: 'hawk', desc: 'Call the crossing existential and demand recognition.', claim: { issue: ISSUE.BORDER, tier: TEMP.EXISTENTIAL }, escalation: 2, media: 1, wiggle: -1, publicText: 'Belarus declares the disputed crossing an existential red line.' },
      { id: 'B_RENEW_PATROL', label: 'Renew the armed patrol', alignment: 'hawk', desc: 'Create another local fact while deniability still exists.', claim: { issue: ISSUE.BORDER, tier: TEMP.VITAL }, backsIssue: ISSUE.BORDER, escalation: 2, media: 1, assetCost: { id: 'DENIABILITY', amount: 1 }, publicText: 'Belarus renews armed patrols at the crossing under emergency rules.' },
      { id: 'B_ACCEPT_INQUIRY', label: 'Accept a joint inquiry', alignment: 'statesman', desc: 'Reframe withdrawal as evidence-gathering rather than defeat.', claim: { issue: ISSUE.BORDER, tier: TEMP.NEGOTIABLE }, deescalation: 1, media: -1, wiggle: 1, flags: ['acceptsInquiry'], publicText: 'Belarus accepts an international inquiry without conceding its legal claim.' },
      { id: 'B_STRATEGIC_AMBIGUITY', label: 'Use strategic ambiguity', alignment: 'survival', desc: 'Avoid a new categorical promise and recover one point of wiggle room.', media: 0, wiggle: 1, publicText: 'Belarus issues a deliberately ambiguous statement and avoids a fresh red line.' },
    ],
    RUSSIA: [
      { id: 'R_DEFENSIVE_EXERCISES', label: 'Announce defensive exercises', alignment: 'hawk', desc: 'Back the buffer claim with visible readiness.', claim: { issue: ISSUE.BORDER, tier: TEMP.VITAL }, backsIssue: ISSUE.BORDER, escalation: 2, media: 1, assetCost: { id: 'MOBILIZATION', amount: 1 }, publicText: 'Russia announces defensive exercises near the theatre.' },
      { id: 'R_PUBLIC_GUARANTEE', label: 'Guarantee Belarus publicly', alignment: 'survival', desc: 'Strengthen deterrence by increasing patron entanglement.', claim: { issue: ISSUE.GUARANTEE, tier: TEMP.EXISTENTIAL }, backsIssue: ISSUE.GUARANTEE, escalation: 1, media: 1, entanglement: 1, credibility: 1, wiggle: -1, commitment: 'Russia publicly guarantees Belarusian security.', publicText: 'Russia converts its ambiguous support into a public security guarantee.' },
      { id: 'R_CALL_INVESTIGATION', label: 'Call for an investigation', alignment: 'statesman', desc: 'Create a factual off-ramp without abandoning the proxy.', claim: { issue: ISSUE.BORDER, tier: TEMP.VITAL }, deescalation: 1, media: -1, credibility: 1, flags: ['acceptsInquiry'], publicText: 'Russia calls for a joint investigation and freezes new allegations pending evidence.' },
      { id: 'R_SIGNAL_RESTRAINT', label: 'Signal calibrated restraint', alignment: 'statesman', desc: 'Describe deployments as reversible and recover diplomatic room.', deescalation: 1, media: -1, wiggle: 1, publicText: 'Russia emphasises that current deployments are reversible and defensive.' },
    ],
    US: [
      { id: 'U_REASSURE_ALLIES', label: 'Reassure allies', alignment: 'survival', desc: 'Affirm obligations without promising a specific military response.', claim: { issue: ISSUE.GUARANTEE, tier: TEMP.VITAL }, escalation: 1, credibility: 1, wiggle: -1, commitment: 'The United States reaffirms alliance obligations.', publicText: 'The United States reaffirms alliance obligations while withholding operational detail.' },
      { id: 'U_REINFORCE', label: 'Announce reinforcement', alignment: 'hawk', desc: 'Use the temporary reinforcement window to make deterrence visible.', claim: { issue: ISSUE.GUARANTEE, tier: TEMP.EXISTENTIAL }, backsIssue: ISSUE.GUARANTEE, escalation: 2, media: 1, assetCost: { id: 'REINFORCEMENT', amount: 1 }, publicText: 'The United States announces immediate reinforcement of the alliance frontier.' },
      { id: 'U_SUPPORT_INQUIRY', label: 'Support the inquiry', alignment: 'statesman', desc: 'Back verification and reserve military options.', claim: { issue: ISSUE.WORLD, tier: TEMP.VITAL }, deescalation: 1, media: -1, wiggle: 1, flags: ['acceptsInquiry'], publicText: 'The United States supports an international inquiry and pauses further public commitments.' },
      { id: 'U_SANCTIONS_WARNING', label: 'Issue a sanctions warning', alignment: 'survival', desc: 'Threaten a cost without spending the full sanctions asset.', claim: { issue: ISSUE.GUARANTEE, tier: TEMP.VITAL }, escalation: 1, media: 1, flags: ['usSanctionsWarning'], publicText: 'The United States warns that further incidents will trigger coordinated financial measures.' },
    ],
    EU: [
      { id: 'E_PREPARE_SANCTIONS', label: 'Prepare targeted sanctions', alignment: 'survival', desc: 'Show unity while preserving an off-ramp.', claim: { issue: ISSUE.BORDER, tier: TEMP.VITAL }, escalation: 1, media: 1, flags: ['sanctionsPrepared'], publicText: 'The European Union prepares targeted sanctions but leaves activation conditional.' },
      { id: 'E_ACTIVATE_SANCTIONS', label: 'Activate sanctions', alignment: 'hawk', desc: 'Spend coalition unity to impose immediate costs.', claim: { issue: ISSUE.BORDER, tier: TEMP.EXISTENTIAL }, backsIssue: ISSUE.BORDER, escalation: 2, media: 1, assetCost: { id: 'SANCTIONS_UNITY', amount: 1 }, welfare: { RUSSIA: -1, BELARUS: -1 }, flags: ['sanctionsActive'], publicText: 'The European Union activates its first sanctions package.' },
      { id: 'E_EMERGENCY_COUNCIL', label: 'Convene an emergency council', alignment: 'survival', desc: 'Repair member-state unity and narrow the public mandate.', claim: { issue: ISSUE.UNION, tier: TEMP.EXISTENTIAL }, media: -1, credibility: 1, assetRestore: { id: 'SANCTIONS_UNITY', amount: 1 }, publicText: 'The European Union convenes an emergency council and renews a common mandate.' },
      { id: 'E_SUPPORT_INQUIRY', label: 'Back an investigation', alignment: 'statesman', desc: 'Offer verification as an alternative to immediate economic punishment.', claim: { issue: ISSUE.WORLD, tier: TEMP.VITAL }, deescalation: 1, media: -1, wiggle: 1, flags: ['acceptsInquiry'], publicText: 'The European Union backs an international investigation and a conditional sanctions pause.' },
    ],
    UN: [
      { id: 'N_JOINT_INQUIRY', label: 'Propose a joint inquiry', alignment: 'statesman', desc: 'Create a face-saving factual process and freeze competing narratives.', claim: { issue: ISSUE.WORLD, tier: TEMP.VITAL }, deescalation: 1, media: -1, credibility: 1, flags: ['inquiryOpen'], publicText: 'The United Nations proposes a joint inquiry with monitored access to the crossing.' },
      { id: 'N_EMERGENCY_SESSION', label: 'Call an emergency session', alignment: 'hawk', desc: 'Name the breach publicly and force every actor onto the record.', claim: { issue: ISSUE.WORLD, tier: TEMP.EXISTENTIAL }, media: 1, credibility: 1, commitment: 'The Security Council convenes in emergency session.', publicText: 'The United Nations calls an emergency session and places the crisis on the formal record.' },
      { id: 'N_HUMANITARIAN_PAUSE', label: 'Demand a humanitarian pause', alignment: 'statesman', desc: 'Attempt a one-step descent if major powers do not escalate simultaneously.', claim: { issue: ISSUE.WORLD, tier: TEMP.EXISTENTIAL }, deescalation: 2, media: -1, assetCost: { id: 'COMMUNIQUE', amount: 1 }, flags: ['humanitarianPause'], publicText: 'The United Nations demands a monitored humanitarian pause.' },
      { id: 'N_PUBLIC_APPEAL', label: 'Issue a restrained public appeal', alignment: 'survival', desc: 'Cool media heat without staking the institution on a specific package.', claim: { issue: ISSUE.WORLD, tier: TEMP.VITAL }, media: -1, wiggle: 1, publicText: 'The United Nations issues a restrained appeal and keeps private channels open.' },
    ],
  });

  const PRIVATE_ACTIONS = Object.freeze({
    BELARUS: [
      { id: 'B_SEEK_GUARANTEE', label: 'Seek a conditional guarantee', alignment: 'statesman', type: 'seekGuarantee', targets: ['RUSSIA'], desc: 'Offer quiet patrol withdrawal in return for a regime-security assurance.', privateText: 'Belarus offers a quiet patrol withdrawal if Russia guarantees regime security.' },
      { id: 'B_STAGE_INCIDENT', label: 'Stage a deniable incident', alignment: 'hawk', type: 'stageIncident', assetCost: { id: 'DENIABILITY', amount: 1 }, desc: 'Create a new incident; exposure risk rises as deniability decays.', privateText: 'Belarus authorises a deniable local incident.' },
      { id: 'B_QUIET_WITHDRAWAL', label: 'Authorise quiet withdrawal', alignment: 'statesman', type: 'quietWithdrawal', targets: ['UN'], desc: 'Permit withdrawal if an inquiry or guarantee supplies public cover.', privateText: 'Belarus privately authorises withdrawal under international cover.' },
      { id: 'B_REQUEST_ESCROW', label: 'Request UN escrow', alignment: 'survival', type: 'requestEscrow', targets: ['UN'], desc: 'Ask the UN to hold reciprocal commitments so Belarus does not move first.', privateText: 'Belarus asks the UN to place reciprocal steps in escrow.' },
    ],
    RUSSIA: [
      { id: 'R_CONDITIONAL_GUARANTEE', label: 'Offer a conditional guarantee', alignment: 'statesman', type: 'conditionalGuarantee', targets: ['BELARUS'], desc: 'Guarantee regime security only if Belarus withdraws the disputed patrol.', privateText: 'Russia offers regime security conditional on patrol withdrawal.' },
      { id: 'R_RESTRAIN_PROXY', label: 'Restrain Belarus privately', alignment: 'statesman', type: 'restrainProxy', targets: ['BELARUS'], assetCost: { id: 'PROXY_CONTROL', amount: 1 }, desc: 'Spend proxy control to halt a local action without public abandonment.', privateText: 'Russia privately orders Belarus to halt further incidents.' },
      { id: 'R_DEMOBILIZE_FOR_NONDEPLOYMENT', label: 'Trade demobilisation for non-deployment', alignment: 'statesman', type: 'demobilize', targets: ['US'], desc: 'Offer reversible demobilisation for a private US non-deployment assurance.', privateText: 'Russia offers demobilisation in exchange for no permanent US deployment.' },
      { id: 'R_COVERT_SUPPORT', label: 'Increase covert support', alignment: 'hawk', type: 'covertSupport', targets: ['BELARUS'], assetCost: { id: 'PROXY_CONTROL', amount: 1 }, desc: 'Shore up the proxy and deepen patron entanglement.', privateText: 'Russia quietly increases material and intelligence support to Belarus.' },
    ],
    US: [
      { id: 'U_NO_PERMANENT_DEPLOYMENT', label: 'Offer no permanent deployment', alignment: 'statesman', type: 'nondeployment', targets: ['RUSSIA'], desc: 'Give Russia a private assurance in return for demobilisation.', privateText: 'The United States offers a private no-permanent-deployment assurance.' },
      { id: 'U_INTELLIGENCE_PROBE', label: 'Run an intelligence probe', alignment: 'statesman', type: 'probe', targets: ['RUSSIA', 'BELARUS'], assetCost: { id: 'INTELLIGENCE', amount: 1 }, desc: 'Read the target’s hottest true stake; bluff fatigue improves accuracy.', privateText: 'The United States burns an intelligence channel to estimate the target’s real priority.' },
      { id: 'U_QUIET_REASSURANCE', label: 'Quietly reassure the EU', alignment: 'survival', type: 'quietReassurance', targets: ['EU'], desc: 'Support coalition unity without adding a public red line.', privateText: 'The United States quietly reassures EU partners of support.' },
      { id: 'U_PREPARE_REINFORCEMENT', label: 'Prepare reinforcement privately', alignment: 'hawk', type: 'prepareReinforcement', assetCost: { id: 'REINFORCEMENT', amount: 1 }, desc: 'Preserve a rapid option without announcing it this round.', privateText: 'The United States quietly prepares reinforcement options.' },
    ],
    EU: [
      { id: 'E_DELAY_SANCTIONS', label: 'Offer a sanctions delay', alignment: 'statesman', type: 'delaySanctions', targets: ['RUSSIA'], desc: 'Delay activation if Russia and Belarus accept an inquiry.', privateText: 'The EU offers to delay sanctions if an international inquiry is accepted.' },
      { id: 'E_MARKET_OFFRAMP', label: 'Offer a market off-ramp', alignment: 'statesman', type: 'marketOfframp', targets: ['RUSSIA', 'BELARUS'], assetCost: { id: 'MARKET', amount: 1 }, desc: 'Offer limited economic relief after a verified de-escalatory step.', privateText: 'The EU offers limited market relief after verified de-escalation.' },
      { id: 'E_INTELLIGENCE_PROBE', label: 'Use the civilian mission to probe', alignment: 'statesman', type: 'probe', targets: ['RUSSIA', 'BELARUS'], assetCost: { id: 'MISSION', amount: 1 }, desc: 'Use field reporting to estimate the target’s real priority.', privateText: 'The EU redirects civilian monitoring toward the target’s true political constraint.' },
      { id: 'E_WHIP_COALITION', label: 'Whip the sanctions coalition', alignment: 'survival', type: 'whipCoalition', desc: 'Spend political capital to restore one sanctions-unity clock.', privateText: 'EU leaders privately rebuild the sanctions coalition.' },
    ],
    UN: [
      { id: 'N_ESCROW_PACKAGE', label: 'Place reciprocal steps in escrow', alignment: 'statesman', type: 'escrow', assetCost: { id: 'ESCROW', amount: 1 }, desc: 'Link simultaneous concessions and provide one unit of face-saving capacity.', privateText: 'The UN prepares an escrow mechanism for simultaneous reciprocal steps.' },
      { id: 'N_QUIET_ROOM', label: 'Open a quiet room', alignment: 'statesman', type: 'quietRoom', targets: ['BELARUS', 'RUSSIA', 'US', 'EU'], assetCost: { id: 'QUIET_ROOM', amount: 1 }, desc: 'Probe one actor’s real wound through private conditional questions.', privateText: 'The UN opens a protected quiet channel to test the target’s real priority.' },
      { id: 'N_INSPECTION_MISSION', label: 'Draft an inspection mission', alignment: 'statesman', type: 'inspection', targets: ['BELARUS'], assetCost: { id: 'INSPECTION', amount: 1 }, desc: 'Create verified compliance that can substitute for trust.', privateText: 'The UN drafts a monitored inspection and withdrawal mission.' },
      { id: 'N_SECRET_ANNEX', label: 'Draft a secret annex', alignment: 'survival', type: 'secretAnnex', assetCost: { id: 'COMMUNIQUE', amount: 1 }, desc: 'Hide one unpalatable concession and reduce its immediate audience cost.', privateText: 'The UN prepares a classified annex to protect an unpalatable concession.' },
    ],
  });

  const GUIDED_PLANS = Object.freeze({
    BELARUS: { faction: 'hawk', publicAction: 'B_BORDER_RED_LINE', privateAction: 'B_SEEK_GUARANTEE', target: 'RUSSIA' },
    RUSSIA: { faction: 'statesman', publicAction: 'R_DEFENSIVE_EXERCISES', privateAction: 'R_CONDITIONAL_GUARANTEE', target: 'BELARUS' },
    US: { faction: 'statesman', publicAction: 'U_REASSURE_ALLIES', privateAction: 'U_NO_PERMANENT_DEPLOYMENT', target: 'RUSSIA' },
    EU: { faction: 'survival', publicAction: 'E_PREPARE_SANCTIONS', privateAction: 'E_DELAY_SANCTIONS', target: 'RUSSIA' },
    UN: { faction: 'statesman', publicAction: 'N_JOINT_INQUIRY', privateAction: 'N_ESCROW_PACKAGE', target: null },
  });

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hashSeed(input) {
    const text = String(input == null ? 'the-burr' : input);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }

  function random(game) {
    game.rngState = (game.rngState + 0x6D2B79F5) >>> 0;
    let t = game.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function makeRole(def, human) {
    const assets = {};
    Object.entries(def.assets).forEach(([id, asset]) => {
      assets[id] = { ...asset };
    });
    return {
      id: def.id,
      name: def.name,
      short: def.short,
      regimeType: def.regimeType,
      accent: def.accent,
      human: Boolean(human),
      leadership: def.start.leadership,
      welfare: def.start.welfare,
      credibility: def.start.credibility,
      wiggle: def.start.wiggle,
      bluffFatigue: 0,
      pressures: { hawk: 1, statesman: 1, survival: 1 },
      stakes: { ...def.stakes },
      sacrifice: { ...def.sacrifice },
      assets,
      claims: [],
      publicPosture: null,
      visibleAction: 'Awaiting first decision',
      flags: {},
      privateInbox: [],
      privateHistory: [],
      factionEvents: [],
      eliminated: false,
    };
  }

  function createGame(options) {
    const opts = options || {};
    const humanRoles = new Set(opts.humanRoles || ROLE_ORDER);
    const seed = opts.seed || `BURR-${new Date().toISOString().slice(0, 10)}`;
    const roles = {};
    ROLE_ORDER.forEach((id) => {
      roles[id] = makeRole(ROLE_DEFS[id], humanRoles.has(id));
    });
    return {
      version: VERSION,
      scenario: 'THE BURR',
      seed: String(seed),
      rngState: hashSeed(seed),
      round: 1,
      maxRounds: Number.isInteger(opts.maxRounds) ? opts.maxRounds : 6,
      phase: 'shared',
      over: false,
      endReason: null,
      ladder: { rung: 3, locked: [] },
      media: 2,
      entanglement: 2,
      worldWelfare: 10,
      casualties: 0,
      roles,
      plans: {},
      commitments: [
        { round: 0, public: true, parties: ['RUSSIA', 'BELARUS'], text: 'Ambiguous patron-security pledge; scope deliberately undefined.' },
      ],
      secretDeals: [],
      publicLog: [
        { round: 0, type: 'incident', text: 'A lethal border incident has triggered competing mobilisation claims.' },
        { round: 0, type: 'system', text: 'All current-round plans are sealed until simultaneous resolution.' },
      ],
      roundHistory: [],
      flags: {
        sanctionsPrepared: false,
        sanctionsActive: false,
        inquiryOpen: false,
        acceptsInquiry: [],
        durableSettlement: false,
      },
      guided: Boolean(opts.guided),
    };
  }

  function getRoleDef(roleId) {
    return ROLE_DEFS[roleId] || null;
  }

  function getAction(kind, roleId, actionId) {
    const source = kind === 'public' ? PUBLIC_ACTIONS : PRIVATE_ACTIONS;
    return (source[roleId] || []).find((action) => action.id === actionId) || null;
  }

  function getPublicActions(game, roleId) {
    return (PUBLIC_ACTIONS[roleId] || []).map((action) => ({ ...action, available: actionAvailable(game, roleId, action) }));
  }

  function getPrivateActions(game, roleId) {
    return (PRIVATE_ACTIONS[roleId] || []).map((action) => ({ ...action, available: actionAvailable(game, roleId, action) }));
  }

  function actionAvailable(game, roleId, action) {
    if (!action || !action.assetCost) return true;
    const asset = game.roles[roleId].assets[action.assetCost.id];
    return Boolean(asset && asset.clock >= action.assetCost.amount);
  }

  function validatePlan(game, roleId, plan) {
    const role = game.roles[roleId];
    if (!role || role.eliminated) return { ok: false, reason: 'Role is unavailable.' };
    if (!plan || !['hawk', 'statesman', 'survival'].includes(plan.faction)) return { ok: false, reason: 'Choose an internal faction.' };
    const pub = getAction('public', roleId, plan.publicAction);
    const priv = getAction('private', roleId, plan.privateAction);
    if (!pub) return { ok: false, reason: 'Choose a public action.' };
    if (!priv) return { ok: false, reason: 'Choose a private action.' };
    if (!actionAvailable(game, roleId, pub)) return { ok: false, reason: 'The public action’s asset clock is exhausted.' };
    if (!actionAvailable(game, roleId, priv)) return { ok: false, reason: 'The private action’s asset clock is exhausted.' };
    const combinedCosts = {};
    [pub.assetCost, priv.assetCost].filter(Boolean).forEach((cost) => {
      combinedCosts[cost.id] = (combinedCosts[cost.id] || 0) + cost.amount;
    });
    for (const [assetId, amount] of Object.entries(combinedCosts)) {
      const asset = role.assets[assetId];
      if (!asset || asset.clock < amount) return { ok: false, reason: `The combined plan requires ${amount} ${asset ? asset.label : assetId} clocks, but only ${asset ? asset.clock : 0} remain.` };
    }
    if (priv.targets && priv.targets.length) {
      if (!plan.target || !priv.targets.includes(plan.target)) return { ok: false, reason: 'Choose a valid private target.' };
    }
    return { ok: true };
  }

  function submitPlan(game, roleId, plan) {
    const check = validatePlan(game, roleId, plan);
    if (!check.ok) return check;
    game.plans[roleId] = {
      faction: plan.faction,
      publicAction: plan.publicAction,
      privateAction: plan.privateAction,
      target: plan.target || null,
    };
    return { ok: true };
  }

  function allPlansSubmitted(game) {
    return ROLE_ORDER.every((roleId) => game.roles[roleId].eliminated || Boolean(game.plans[roleId]));
  }

  function spendAsset(role, cost) {
    if (!cost) return true;
    const asset = role.assets[cost.id];
    if (!asset || asset.clock < cost.amount) return false;
    asset.clock = clamp(asset.clock - cost.amount, 0, asset.max);
    return true;
  }

  function restoreAsset(role, restore) {
    if (!restore) return;
    const asset = role.assets[restore.id];
    if (asset) asset.clock = clamp(asset.clock + restore.amount, 0, asset.max);
  }

  function publicLog(game, type, text, round) {
    game.publicLog.push({ round: round == null ? game.round : round, type: type || 'system', text });
  }

  function privateLog(game, roleId, text, from) {
    const role = game.roles[roleId];
    if (!role) return;
    role.privateInbox.push({ round: game.round, from: from || 'SYSTEM', text });
  }

  function adjustRole(role, changes) {
    if (!changes) return;
    if (changes.leadership) role.leadership = clamp(role.leadership + changes.leadership, 0, 10);
    if (changes.welfare) role.welfare = clamp(role.welfare + changes.welfare, 0, 10);
    if (changes.credibility) role.credibility = clamp(role.credibility + changes.credibility, 0, 8);
    if (changes.wiggle) role.wiggle = clamp(role.wiggle + changes.wiggle, 0, 4);
    if (role.leadership <= 0) role.eliminated = true;
  }

  function registerClaim(game, role, claim, backed) {
    if (!claim) return;
    const truth = role.stakes[claim.issue] || TEMP.NEGOTIABLE;
    const record = {
      round: game.round,
      issue: claim.issue,
      tier: claim.tier,
      expires: game.round + 2,
      backed: Boolean(backed),
      resolved: false,
      bluff: claim.tier > truth,
    };
    role.claims.push(record);
    role.publicPosture = { issue: claim.issue, tier: claim.tier, expires: record.expires };
    if (record.bluff) {
      role.bluffFatigue = clamp(role.bluffFatigue + 1, 0, 6);
      if (role.bluffFatigue >= 3) {
        adjustRole(role, { credibility: -1 });
        publicLog(game, 'warning', `${role.name}'s latest overclaim lands in a market already saturated with prior bluffs.`);
      }
    }
  }

  function backClaims(role, issue) {
    if (!issue) return;
    role.claims.forEach((claim) => {
      if (!claim.resolved && claim.issue === issue) claim.backed = true;
    });
  }

  function resolveClaimExpiry(game) {
    ROLE_ORDER.forEach((roleId) => {
      const role = game.roles[roleId];
      role.claims.forEach((claim) => {
        if (!claim.resolved && game.round >= claim.expires) {
          claim.resolved = true;
          if (!claim.backed) {
            adjustRole(role, { credibility: -1 });
            role.bluffFatigue = clamp(role.bluffFatigue + 1, 0, 6);
            publicLog(game, 'warning', `${role.name}'s ${TEMP_NAME[claim.tier].toLowerCase()} claim on ${ISSUE_NAME[claim.issue]} expires unbacked; opponents mark it hollow.`);
          }
        }
      });
      const activeClaim = role.claims.slice().reverse().find((claim) => !claim.resolved);
      role.publicPosture = activeClaim
        ? { issue: activeClaim.issue, tier: activeClaim.tier, expires: activeClaim.expires }
        : null;
    });
  }

  function concessionAudienceCost(game, roleId, issue, protectedByFace) {
    const role = game.roles[roleId];
    const trapped = role.claims.some((claim) => !claim.resolved && claim.issue === issue && claim.tier === TEMP.EXISTENTIAL);
    if (!trapped) return 0;
    if (protectedByFace) return 0;
    const cost = role.regimeType === 'authoritarian' ? 1 : 2;
    adjustRole(role, { leadership: -cost, wiggle: -1 });
    if (role.regimeType === 'authoritarian') role.pressures.survival = clamp(role.pressures.survival + 1, 0, 3);
    publicLog(game, 'warning', `${role.name} pays ${cost} leadership capital for retreating across its own existential rhetoric.`);
    return cost;
  }

  function climb(game, steps, reason) {
    let moved = 0;
    for (let i = 0; i < steps; i += 1) {
      if (game.ladder.rung >= MAX_RUNG) break;
      const previous = game.ladder.rung;
      game.ladder.rung += 1;
      if (game.ladder.rung > LOCK_THRESHOLD && !game.ladder.locked.includes(previous)) game.ladder.locked.push(previous);
      moved += 1;
    }
    if (moved) publicLog(game, 'escalation', `Escalation pressure moves the ladder +${moved} to ${game.ladder.rung}: ${LADDER_NAMES[game.ladder.rung]}. ${reason || ''}`.trim());
    return moved;
  }

  function descend(game, steps, faceCapacity, reason) {
    let moved = 0;
    let face = faceCapacity || 0;
    for (let i = 0; i < steps; i += 1) {
      if (game.ladder.rung <= 0) break;
      const target = game.ladder.rung - 1;
      const lockIndex = game.ladder.locked.indexOf(target);
      if (lockIndex >= 0) {
        if (face <= 0) {
          publicLog(game, 'warning', `The attempted descent stalls at welded rung ${target} (${LADDER_NAMES[target]}): no face-saving mechanism is available.`);
          break;
        }
        face -= 1;
        game.ladder.locked.splice(lockIndex, 1);
        publicLog(game, 'deal', `A face-saving mechanism reopens welded rung ${target}.`);
      }
      game.ladder.rung = target;
      moved += 1;
    }
    if (moved) publicLog(game, 'deescalation', `The ladder moves −${moved} to ${game.ladder.rung}: ${LADDER_NAMES[game.ladder.rung]}. ${reason || ''}`.trim());
    return { moved, faceRemaining: face };
  }

  function hottestStake(role) {
    let bestIssue = null;
    let bestTier = 0;
    Object.entries(role.stakes).forEach(([issue, tier]) => {
      if (tier > bestTier) {
        bestIssue = issue;
        bestTier = tier;
      }
    });
    return { issue: bestIssue, tier: bestTier };
  }

  function probeStake(game, actorId, targetId, sourceLabel) {
    const target = game.roles[targetId];
    const hot = hottestStake(target);
    const exactChance = target.bluffFatigue >= 3 ? 0.95 : 0.78;
    let tier = hot.tier;
    let noisy = false;
    if (random(game) > exactChance) {
      noisy = true;
      tier = clamp(tier + (random(game) < 0.5 ? -1 : 1), TEMP.NEGOTIABLE, TEMP.EXISTENTIAL);
    }
    privateLog(game, actorId, `${sourceLabel}: ${target.name}'s behaviour centres on ${ISSUE_NAME[hot.issue]}, reading ${TEMP_NAME[tier]}${noisy ? ' with residual ambiguity' : ' with high confidence'}.`, targetId);
    privateLog(game, targetId, `${actorId} appears to have probed your internal priorities.`, actorId);
  }

  function addSecretDeal(game, deal) {
    const stored = {
      id: `D${game.secretDeals.length + 1}`,
      round: game.round,
      parties: [...deal.parties],
      title: deal.title,
      text: deal.text,
      issueCosts: deal.issueCosts || [],
      protected: Boolean(deal.protected),
      risk: deal.risk == null ? 2 : deal.risk,
      leaked: false,
      active: true,
    };
    game.secretDeals.push(stored);
    stored.parties.forEach((partyId) => privateLog(game, partyId, `SECRET DEAL — ${stored.title}: ${stored.text}`, 'BACKCHANNEL'));
    return stored;
  }

  function resolveLeaks(game) {
    game.secretDeals.forEach((deal) => {
      if (deal.leaked || !deal.active || deal.round >= game.round) return;
      const base = 0.04 + game.media * 0.025 + deal.risk * 0.035 - (deal.protected ? 0.09 : 0);
      const probability = clamp(base, 0.03, 0.5);
      if (random(game) < probability) {
        deal.leaked = true;
        game.media = clamp(game.media + 1, 0, 8);
        publicLog(game, 'leak', `LEAK: ${deal.title} becomes public — ${deal.text}`);
        deal.parties.forEach((partyId) => {
          const role = game.roles[partyId];
          const leadershipLoss = role.regimeType === 'authoritarian' ? 1 : 2;
          adjustRole(role, { leadership: -leadershipLoss, credibility: -1, wiggle: -1 });
          if (role.regimeType === 'authoritarian') role.pressures.survival = clamp(role.pressures.survival + 1, 0, 3);
          else role.pressures.hawk = clamp(role.pressures.hawk + 1, 0, 3);
        });
      }
    });
  }

  function applyPublicAction(game, roleId, action, context) {
    const role = game.roles[roleId];
    spendAsset(role, action.assetCost);
    restoreAsset(role, action.assetRestore);
    role.visibleAction = action.label;
    registerClaim(game, role, action.claim, Boolean(action.backsIssue));
    backClaims(role, action.backsIssue);
    adjustRole(role, {
      leadership: action.leadership || 0,
      welfare: action.selfWelfare || 0,
      credibility: action.credibility || 0,
      wiggle: action.wiggle || 0,
    });
    if (action.welfare) {
      Object.entries(action.welfare).forEach(([targetId, delta]) => adjustRole(game.roles[targetId], { welfare: delta }));
    }
    context.escalationPressure += action.escalation || 0;
    context.deescalationPressure += action.deescalation || 0;
    context.mediaDelta += action.media || 0;
    context.entanglementDelta += action.entanglement || 0;
    if (action.alignment === 'hawk' && (action.escalation || 0) > 0) context.hardActions += 1;
    (action.flags || []).forEach((flag) => {
      context.flags[flag] = true;
      if (flag === 'acceptsInquiry') context.acceptsInquiry.add(roleId);
    });
    if (action.commitment) game.commitments.push({ round: game.round, public: true, parties: [roleId], text: action.commitment });
    publicLog(game, 'action', action.publicText);
  }

  function deliverPrivateSignal(game, actorId, action, targetId) {
    const actor = game.roles[actorId];
    actor.privateHistory.push({ round: game.round, action: action.id, target: targetId || null });
    privateLog(game, actorId, `You selected: ${action.privateText}`, actorId);
    if (targetId && game.roles[targetId]) privateLog(game, targetId, action.privateText, actorId);
  }

  function applyPrivateAction(game, roleId, action, plan, context) {
    const role = game.roles[roleId];
    spendAsset(role, action.assetCost);
    const targetId = plan.target || (action.targets && action.targets.length === 1 ? action.targets[0] : null);
    deliverPrivateSignal(game, roleId, action, targetId);
    context.privateTypes[roleId] = action.type;
    context.privateTargets[roleId] = targetId;

    switch (action.type) {
      case 'stageIncident': {
        context.hiddenEscalation += 2;
        const deniability = role.assets.DENIABILITY.clock;
        const exposureChance = clamp(0.18 + (3 - deniability) * 0.2 + game.media * 0.025, 0.18, 0.85);
        if (random(game) < exposureChance) {
          context.mediaDelta += 2;
          adjustRole(role, { credibility: -1 });
          publicLog(game, 'leak', 'Evidence emerges that the new border incident was orchestrated by Belarusian security personnel.');
        } else {
          publicLog(game, 'incident', 'A fresh border incident occurs; attribution remains contested.');
        }
        break;
      }
      case 'restrainProxy':
        context.directDescents += 1;
        adjustRole(role, { leadership: -1 });
        privateLog(game, 'BELARUS', 'Moscow has privately ordered an immediate halt to further incidents.', 'RUSSIA');
        break;
      case 'covertSupport':
        context.hiddenEscalation += 1;
        context.entanglementDelta += 1;
        adjustRole(game.roles.BELARUS, { welfare: 1 });
        break;
      case 'probe':
        if (targetId) probeStake(game, roleId, targetId, action.id === 'U_INTELLIGENCE_PROBE' ? 'Intelligence assessment' : 'Field assessment');
        break;
      case 'quietReassurance':
        adjustRole(game.roles.EU, { credibility: 1 });
        break;
      case 'prepareReinforcement':
        role.flags.preparedReinforcement = true;
        break;
      case 'marketOfframp':
        context.marketOfframp = { actorId: roleId, targetId };
        break;
      case 'whipCoalition':
        restoreAsset(role, { id: 'SANCTIONS_UNITY', amount: 1 });
        adjustRole(role, { leadership: -1 });
        break;
      case 'quietRoom':
        if (targetId) probeStake(game, roleId, targetId, 'Quiet-room read');
        break;
      case 'inspection':
        context.inspectionReady = true;
        break;
      case 'escrow':
        context.escrowReady = true;
        context.faceCapacity += 1;
        break;
      case 'secretAnnex':
        context.secretAnnexReady = true;
        context.faceCapacity += 1;
        break;
      default:
        break;
    }
  }

  function matchBackchannels(game, context) {
    const types = context.privateTypes;
    const protectedByUN = context.escrowReady || context.secretAnnexReady;

    if (types.BELARUS === 'seekGuarantee' && types.RUSSIA === 'conditionalGuarantee') {
      context.directDescents += 1;
      context.entanglementDelta += 1;
      game.flags.durableSettlement = true;
      const deal = addSecretDeal(game, {
        parties: ['BELARUS', 'RUSSIA'],
        title: 'Patrol withdrawal for regime assurance',
        text: 'Belarus will withdraw the disputed patrol; Russia guarantees regime security but not the border claim.',
        issueCosts: [{ roleId: 'BELARUS', issue: ISSUE.BORDER }],
        protected: protectedByUN,
        risk: protectedByUN ? 1 : 3,
      });
      concessionAudienceCost(game, 'BELARUS', ISSUE.BORDER, deal.protected);
      adjustRole(game.roles.BELARUS, { wiggle: 1, credibility: 1 });
      adjustRole(game.roles.RUSSIA, { wiggle: -1 });
      context.deals.push(deal.title);
    }

    if (types.RUSSIA === 'demobilize' && types.US === 'nondeployment') {
      context.directDescents += 1;
      game.flags.durableSettlement = true;
      const deal = addSecretDeal(game, {
        parties: ['RUSSIA', 'US'],
        title: 'Demobilisation / non-deployment understanding',
        text: 'Russia reverses exercises; the United States gives a private assurance against permanent new deployment.',
        issueCosts: [{ roleId: 'US', issue: ISSUE.GUARANTEE }, { roleId: 'RUSSIA', issue: ISSUE.BORDER }],
        protected: protectedByUN,
        risk: protectedByUN ? 1 : 3,
      });
      concessionAudienceCost(game, 'US', ISSUE.GUARANTEE, deal.protected);
      concessionAudienceCost(game, 'RUSSIA', ISSUE.BORDER, deal.protected);
      adjustRole(game.roles.US, { wiggle: -1 });
      adjustRole(game.roles.RUSSIA, { credibility: 1 });
      context.deals.push(deal.title);
    }

    const inquiryAccepted = context.flags.inquiryOpen && (
      context.acceptsInquiry.has('BELARUS') || context.acceptsInquiry.has('RUSSIA') ||
      types.BELARUS === 'quietWithdrawal' || context.inspectionReady
    );
    if (inquiryAccepted) {
      context.directDescents += 1;
      context.faceCapacity += 1;
      game.flags.inquiryOpen = true;
      game.flags.durableSettlement = true;
      game.commitments.push({ round: game.round, public: true, parties: ['UN', 'BELARUS', 'RUSSIA'], text: 'Joint inquiry and monitored access established.' });
      publicLog(game, 'deal', 'A joint inquiry is accepted, giving each side public cover for reversible steps.');
      context.deals.push('Joint inquiry and monitored access');
      context.publicDeals.push('Joint inquiry and monitored access');
    }

    if (types.EU === 'delaySanctions' && inquiryAccepted) {
      game.flags.sanctionsPrepared = true;
      context.preventSanctionsDecay = true;
      privateLog(game, 'RUSSIA', 'The EU will delay sanctions while the inquiry remains active.', 'EU');
      privateLog(game, 'EU', 'The conditional sanctions delay is accepted into the inquiry package.', 'RUSSIA');
      context.deals.push('Conditional EU sanctions delay');
    }

    if (context.marketOfframp && context.directDescents > 0) {
      const target = game.roles[context.marketOfframp.targetId];
      if (target) {
        adjustRole(target, { welfare: 1 });
        privateLog(game, target.id, 'The EU activates limited market relief after a verified de-escalatory step.', 'EU');
        context.deals.push('Market off-ramp');
      }
    }

    if (context.secretAnnexReady && context.deals.length) {
      game.secretDeals.forEach((deal) => {
        if (deal.round === game.round) deal.protected = true;
      });
      privateLog(game, 'UN', 'The secret annex is attached to the round’s reciprocal package.', 'SYSTEM');
    }
  }

  function applyFactionDynamics(game, roleId, plan, publicAction, context) {
    const role = game.roles[roleId];
    const chosen = plan.faction;
    role.pressures[chosen] = clamp(role.pressures[chosen] - 1, 0, 3);
    if (publicAction.alignment === chosen) role.pressures[chosen] = clamp(role.pressures[chosen] - 1, 0, 3);

    const sufferedLoss = context.roundWelfareStart[roleId] > role.welfare;
    const bluffThisRound = role.claims.some((claim) => claim.round === game.round && claim.bluff);
    const triggers = {
      hawk: game.ladder.rung >= 4 || sufferedLoss || context.escalationPressure > 0,
      statesman: game.ladder.rung >= 4 || game.media >= 4 || role.wiggle <= 1,
      survival: role.leadership <= 4 || game.media >= 5 || bluffThisRound,
    };
    ['hawk', 'statesman', 'survival'].forEach((faction) => {
      if (faction !== chosen && triggers[faction]) role.pressures[faction] = clamp(role.pressures[faction] + 1, 0, 3);
    });

    ['hawk', 'statesman', 'survival'].forEach((faction) => {
      if (role.pressures[faction] < 3) return;
      role.pressures[faction] = 1;
      let text = '';
      if (faction === 'hawk') {
        context.mediaDelta += 1;
        adjustRole(role, { credibility: -1 });
        if (['BELARUS', 'RUSSIA', 'US'].includes(roleId) && publicAction.alignment !== 'hawk') context.factionEscalation += 1;
        text = `${ROLE_DEFS[roleId].factions.hawk.name} leak a harder line and demand proof of resolve.`;
      } else if (faction === 'statesman') {
        adjustRole(role, { wiggle: -1, credibility: -1 });
        text = `${ROLE_DEFS[roleId].factions.statesman.name} lose influence; one diplomatic option closes.`;
      } else {
        adjustRole(role, { leadership: -2 });
        text = role.regimeType === 'authoritarian'
          ? `${ROLE_DEFS[roleId].factions.survival.name} begin an elite challenge to the leadership.`
          : `${ROLE_DEFS[roleId].factions.survival.name} threaten to withdraw the mandate keeping the leadership in office.`;
      }
      role.factionEvents.push({ round: game.round, faction, text });
      privateLog(game, roleId, `ROOM EVENT — ${text}`, 'INTERNAL');
      publicLog(game, 'room', `${role.name}: visible internal dissent narrows the government’s freedom of action.`);
    });
  }

  function decayAssets(game, context) {
    const belarus = game.roles.BELARUS;
    const russia = game.roles.RUSSIA;
    const eu = game.roles.EU;

    if (game.round >= 2 && belarus.assets.DENIABILITY.clock > 0) {
      belarus.assets.DENIABILITY.clock -= 1;
      privateLog(game, 'BELARUS', 'Independent evidence and satellite imagery erode incident deniability by one clock.', 'CLOCK');
    }
    if (game.round >= 3 && russia.assets.MOBILIZATION.clock > 0) {
      russia.assets.MOBILIZATION.clock -= 1;
      privateLog(game, 'RUSSIA', 'The local mobilisation lead decays as opposing logistics catch up.', 'CLOCK');
    }
    if (game.flags.sanctionsPrepared && !game.flags.sanctionsActive && !context.preventSanctionsDecay && eu.assets.SANCTIONS_UNITY.clock > 0) {
      eu.assets.SANCTIONS_UNITY.clock -= 1;
      privateLog(game, 'EU', 'Member-state patience erodes: sanctions unity loses one clock.', 'CLOCK');
    }
    if (game.media >= 6 && game.roles.UN.assets.QUIET_ROOM.clock > 0) {
      game.roles.UN.assets.QUIET_ROOM.clock -= 1;
      privateLog(game, 'UN', 'Media saturation closes one protected backchannel.', 'CLOCK');
    }
  }

  function applyCrisisDamage(game, context) {
    if (game.ladder.rung < 5) return;
    const damage = game.ladder.rung >= 8 ? 2 : 1;
    ['BELARUS', 'RUSSIA', 'EU'].forEach((roleId) => adjustRole(game.roles[roleId], { welfare: -damage }));
    if (game.ladder.rung >= 7) adjustRole(game.roles.US, { welfare: -1 });
    game.worldWelfare = clamp(game.worldWelfare - damage, 0, 10);
    game.casualties += damage;
    publicLog(game, 'damage', `Crisis exposure at rung ${game.ladder.rung} costs regional welfare and produces ${damage} casualty pressure.`);
  }

  function resolveRound(game) {
    if (game.over) return { ok: false, reason: 'The game is over.' };
    if (!allPlansSubmitted(game)) return { ok: false, reason: 'Every active role must submit a plan.' };

    const context = {
      escalationPressure: 0,
      hiddenEscalation: 0,
      factionEscalation: 0,
      deescalationPressure: 0,
      directDescents: 0,
      mediaDelta: 0,
      entanglementDelta: 0,
      hardActions: 0,
      flags: {},
      acceptsInquiry: new Set(),
      privateTypes: {},
      privateTargets: {},
      escrowReady: false,
      secretAnnexReady: false,
      inspectionReady: false,
      faceCapacity: 0,
      marketOfframp: null,
      preventSanctionsDecay: false,
      deals: [],
      publicDeals: [],
      roundWelfareStart: {},
    };
    ROLE_ORDER.forEach((roleId) => { context.roundWelfareStart[roleId] = game.roles[roleId].welfare; });

    const roundSnapshot = {
      round: game.round,
      start: {
        rung: game.ladder.rung,
        media: game.media,
        entanglement: game.entanglement,
      },
      plans: deepClone(game.plans),
    };

    ROLE_ORDER.forEach((roleId) => {
      const plan = game.plans[roleId];
      if (!plan || game.roles[roleId].eliminated) return;
      const action = getAction('public', roleId, plan.publicAction);
      applyPublicAction(game, roleId, action, context);
    });

    ROLE_ORDER.forEach((roleId) => {
      const plan = game.plans[roleId];
      if (!plan || game.roles[roleId].eliminated) return;
      const action = getAction('private', roleId, plan.privateAction);
      applyPrivateAction(game, roleId, action, plan, context);
    });

    matchBackchannels(game, context);

    game.flags.sanctionsPrepared = game.flags.sanctionsPrepared || Boolean(context.flags.sanctionsPrepared);
    game.flags.sanctionsActive = game.flags.sanctionsActive || Boolean(context.flags.sanctionsActive);
    game.flags.inquiryOpen = game.flags.inquiryOpen || Boolean(context.flags.inquiryOpen);
    game.flags.acceptsInquiry = Array.from(new Set([...(game.flags.acceptsInquiry || []), ...context.acceptsInquiry]));

    const preFactionMediaDelta = context.mediaDelta;
    game.media = clamp(game.media + preFactionMediaDelta, 0, 8);
    game.entanglement = clamp(game.entanglement + context.entanglementDelta, 0, 5);

    const totalEscalation = context.escalationPressure + context.hiddenEscalation;
    let upSteps = totalEscalation >= 6 ? 2 : totalEscalation >= 1 ? 1 : 0;
    upSteps = clamp(upSteps, 0, 3);
    climb(game, upSteps, `${context.hardActions} visible hard-line action${context.hardActions === 1 ? '' : 's'} and ${context.hiddenEscalation} hidden pressure.`);

    let downSteps = context.directDescents;
    if (context.deescalationPressure >= 3) downSteps += 1;
    if (context.flags.humanitarianPause && context.hardActions <= 1) downSteps += 1;
    if (context.flags.humanitarianPause && context.hardActions > 1) publicLog(game, 'warning', 'The humanitarian pause fails: simultaneous hard-line actions leave no reversible interval.');
    downSteps = clamp(downSteps, 0, 2);
    const descentReason = context.publicDeals.length
      ? `Public package: ${context.publicDeals.join('; ')}.`
      : context.deals.length
        ? 'Private reciprocal steps are recorded; terms remain classified.'
        : 'Coordinated restraint.';
    descend(game, downSteps, context.faceCapacity, descentReason);

    resolveClaimExpiry(game);

    ROLE_ORDER.forEach((roleId) => {
      const plan = game.plans[roleId];
      if (!plan || game.roles[roleId].eliminated) return;
      const pub = getAction('public', roleId, plan.publicAction);
      applyFactionDynamics(game, roleId, plan, pub, context);
    });

    if (context.factionEscalation > 0) {
      climb(game, Math.min(1, context.factionEscalation), 'An internal hard-line faction acts after the formal decision window.');
    }

    const factionMediaDelta = context.mediaDelta - preFactionMediaDelta;
    game.media = clamp(game.media + factionMediaDelta, 0, 8);

    decayAssets(game, context);
    resolveLeaks(game);
    applyCrisisDamage(game, context);

    if (game.media >= 7) {
      ROLE_ORDER.forEach((roleId) => {
        const role = game.roles[roleId];
        const loss = role.regimeType === 'authoritarian' ? 0 : 1;
        if (loss) adjustRole(role, { leadership: -loss });
      });
      publicLog(game, 'media', 'Media heat reaches saturation; democratic and institutional leaders lose room to manoeuvre.');
    }

    roundSnapshot.end = {
      rung: game.ladder.rung,
      media: game.media,
      entanglement: game.entanglement,
      deals: [...context.deals],
    };
    game.roundHistory.push(roundSnapshot);
    game.plans = {};

    const ended = checkEnd(game);
    if (!ended) game.round += 1;
    return { ok: true, context, ended, snapshot: roundSnapshot };
  }

  function checkEnd(game) {
    if (game.over) return true;
    if (game.ladder.rung >= MAX_RUNG) {
      game.over = true;
      game.endReason = 'The ladder reaches nuclear use.';
    } else if (game.roles.BELARUS.eliminated) {
      game.over = true;
      game.endReason = 'The Belarusian leadership collapses under the crisis.';
    } else if (game.roles.RUSSIA.eliminated || game.roles.US.eliminated) {
      game.over = true;
      game.endReason = 'A major-power leadership loses control of the crisis.';
    } else if (game.ladder.rung <= 1 && game.flags.durableSettlement) {
      game.over = true;
      game.endReason = 'A durable settlement contains the crisis.';
    } else if (game.round >= game.maxRounds) {
      game.over = true;
      game.endReason = 'The six-round crisis window closes.';
    }
    if (game.over) game.phase = 'debrief';
    return game.over;
  }

  function interestScore(game, roleId) {
    const role = game.roles[roleId];
    let score = 0;
    if (roleId === 'BELARUS') {
      if (!role.eliminated) score += 4;
      if (game.secretDeals.some((deal) => deal.title.includes('Patrol withdrawal') && deal.active)) score += 3;
      if (game.entanglement >= 3) score += 2;
      if (game.ladder.rung < 7) score += 1;
    } else if (roleId === 'RUSSIA') {
      if (!role.eliminated) score += 3;
      if (!game.roles.BELARUS.eliminated && game.entanglement >= 2) score += 2;
      if (game.secretDeals.some((deal) => deal.title.includes('Demobilisation'))) score += 3;
      if (game.ladder.rung < 8) score += 2;
    } else if (roleId === 'US') {
      if (role.credibility >= 4) score += 3;
      if (game.ladder.rung < 8) score += 4;
      if (game.secretDeals.some((deal) => deal.title.includes('Demobilisation'))) score += 2;
      if (game.roles.EU.leadership > 0) score += 1;
    } else if (roleId === 'EU') {
      if (role.leadership > 0) score += 3;
      if (role.assets.SANCTIONS_UNITY.clock >= 1) score += 2;
      if (game.ladder.rung < 7) score += 3;
      if (game.flags.inquiryOpen) score += 2;
    } else if (roleId === 'UN') {
      const initialRung = 3;
      score += clamp(4 + (initialRung - game.ladder.rung), 0, 6);
      if (game.flags.inquiryOpen) score += 2;
      if (game.flags.durableSettlement) score += 2;
      score -= game.secretDeals.filter((deal) => deal.leaked).length;
    }
    return clamp(score, 0, 10);
  }

  function scoreGame(game) {
    const roles = {};
    ROLE_ORDER.forEach((roleId) => {
      const role = game.roles[roleId];
      const remainingAssets = Object.values(role.assets).reduce((sum, asset) => sum + asset.clock, 0);
      const assetMax = Object.values(role.assets).reduce((sum, asset) => sum + asset.max, 0);
      const futureLeverage = Math.round(((role.credibility / 8) * 4 + (role.wiggle / 4) * 3 + (remainingAssets / assetMax) * 3) * 10) / 10;
      roles[roleId] = {
        interests: interestScore(game, roleId),
        leadership: role.leadership,
        welfare: role.welfare,
        futureLeverage,
        survived: !role.eliminated,
        bluffFatigue: role.bluffFatigue,
      };
    });
    const worldViability = clamp(Math.round(100 - game.ladder.rung * 7 - game.media * 3 - game.casualties * 4 + (game.flags.durableSettlement ? 10 : 0)), 0, 100);
    return { roles, worldViability, endReason: game.endReason || 'Crisis still active.' };
  }

  function publicStatus(role) {
    if (role.eliminated || role.leadership <= 0) return 'collapsed';
    if (role.leadership <= 3) return 'critical';
    if (role.leadership <= 5) return 'strained';
    return 'stable';
  }

  function autoPlan(game, roleId) {
    const role = game.roles[roleId];
    const ladder = game.ladder.rung;
    const media = game.media;
    const choose = (faction, publicAction, privateAction, target) => ({ faction, publicAction, privateAction, target: target || null });

    if (roleId === 'BELARUS') {
      if (ladder >= 6 || role.wiggle <= 1) return choose('statesman', 'B_ACCEPT_INQUIRY', 'B_SEEK_GUARANTEE', 'RUSSIA');
      if (game.entanglement < 3) return choose('hawk', 'B_BORDER_RED_LINE', 'B_SEEK_GUARANTEE', 'RUSSIA');
      if (role.assets.DENIABILITY.clock > 0 && random(game) < 0.45) return choose('hawk', 'B_RENEW_PATROL', 'B_STAGE_INCIDENT');
      return choose('survival', 'B_STRATEGIC_AMBIGUITY', 'B_REQUEST_ESCROW', 'UN');
    }
    if (roleId === 'RUSSIA') {
      if (ladder >= 6) return choose('statesman', 'R_SIGNAL_RESTRAINT', 'R_DEMOBILIZE_FOR_NONDEPLOYMENT', 'US');
      if (game.entanglement < 3) return choose('survival', 'R_PUBLIC_GUARANTEE', 'R_CONDITIONAL_GUARANTEE', 'BELARUS');
      if (game.roles.BELARUS.assets.DENIABILITY.clock <= 1) return choose('statesman', 'R_CALL_INVESTIGATION', 'R_RESTRAIN_PROXY', 'BELARUS');
      return choose('hawk', 'R_DEFENSIVE_EXERCISES', 'R_COVERT_SUPPORT', 'BELARUS');
    }
    if (roleId === 'US') {
      if (ladder >= 6) return choose('statesman', 'U_SUPPORT_INQUIRY', 'U_NO_PERMANENT_DEPLOYMENT', 'RUSSIA');
      if (game.roles.RUSSIA.assets.MOBILIZATION.clock >= 2) return choose('survival', 'U_REASSURE_ALLIES', 'U_NO_PERMANENT_DEPLOYMENT', 'RUSSIA');
      if (role.assets.INTELLIGENCE.clock > 0 && random(game) < 0.35) return choose('statesman', 'U_SANCTIONS_WARNING', 'U_INTELLIGENCE_PROBE', 'RUSSIA');
      return choose('hawk', 'U_REINFORCE', 'U_PREPARE_REINFORCEMENT');
    }
    if (roleId === 'EU') {
      if (game.flags.inquiryOpen || ladder >= 6) return choose('statesman', 'E_SUPPORT_INQUIRY', 'E_DELAY_SANCTIONS', 'RUSSIA');
      if (role.assets.SANCTIONS_UNITY.clock <= 1) return choose('survival', 'E_EMERGENCY_COUNCIL', 'E_WHIP_COALITION');
      return choose('survival', 'E_PREPARE_SANCTIONS', 'E_DELAY_SANCTIONS', 'RUSSIA');
    }
    if (roleId === 'UN') {
      if (ladder >= 7) return choose('statesman', 'N_HUMANITARIAN_PAUSE', 'N_ESCROW_PACKAGE');
      if (!game.flags.inquiryOpen) return choose('statesman', 'N_JOINT_INQUIRY', 'N_ESCROW_PACKAGE');
      if (media >= 5) return choose('survival', 'N_PUBLIC_APPEAL', 'N_SECRET_ANNEX');
      return choose('statesman', 'N_JOINT_INQUIRY', 'N_INSPECTION_MISSION', 'BELARUS');
    }
    return choose('statesman', PUBLIC_ACTIONS[roleId][0].id, PRIVATE_ACTIONS[roleId][0].id, null);
  }

  function submitAIPlans(game) {
    ROLE_ORDER.forEach((roleId) => {
      const role = game.roles[roleId];
      if (!role.human && !role.eliminated && !game.plans[roleId]) {
        const plan = autoPlan(game, roleId);
        const checked = validatePlan(game, roleId, plan);
        if (checked.ok) game.plans[roleId] = plan;
        else {
          const pub = getPublicActions(game, roleId).find((action) => action.available);
          const priv = getPrivateActions(game, roleId).find((action) => action.available);
          const target = priv && priv.targets && priv.targets.length ? priv.targets[0] : null;
          game.plans[roleId] = { faction: 'survival', publicAction: pub.id, privateAction: priv.id, target };
        }
      }
    });
  }

  function submitGuidedPlans(game) {
    ROLE_ORDER.forEach((roleId) => {
      game.plans[roleId] = deepClone(GUIDED_PLANS[roleId]);
    });
    return game.plans;
  }

  function getGuidedNarrative(result) {
    const snapshot = result && result.snapshot;
    if (!snapshot) return [];
    return [
      {
        title: '1 · The catalytic move',
        text: 'Belarus publicly calls a negotiable crossing existential while privately asking for the thing it really needs: a Russian regime-security guarantee.',
      },
      {
        title: '2 · Patron entrapment begins',
        text: 'Russia shows readiness but makes support conditional. The proxy is protected only if it withdraws the patrol—support has been converted into a bargain rather than a blank cheque.',
      },
      {
        title: '3 · Reassurance without automatic war',
        text: 'The United States reassures allies publicly while offering Russia a private no-permanent-deployment assurance. Russia used its one private action elsewhere, so the feeler remains unmatched—an important signal rather than a completed deal.',
      },
      {
        title: '4 · Economic pressure gains an off-ramp',
        text: 'The EU prepares sanctions, then privately offers a delay if an inquiry is accepted. Because no principal has yet accepted the inquiry publicly, the off-ramp remains conditional rather than automatic.',
      },
      {
        title: '5 · The UN supplies settlement technology',
        text: 'The UN prepares escrow. It can protect the matching Belarus–Russia exchange, but it cannot manufacture consent where private intentions do not match.',
      },
      {
        title: '6 · The ratchet moves—but does not reset',
        text: `The round starts at rung ${snapshot.start.rung}, rises under visible hard-line action, then returns to rung ${snapshot.end.rung}. Entanglement ends at ${snapshot.end.entanglement}; public claims and secret annexes remain as structural residue.`,
      },
    ];
  }

  function exportReplay(game) {
    return JSON.stringify({
      version: game.version,
      scenario: game.scenario,
      seed: game.seed,
      roundHistory: game.roundHistory,
      final: {
        rung: game.ladder.rung,
        media: game.media,
        entanglement: game.entanglement,
        score: scoreGame(game),
      },
    }, null, 2);
  }

  return Object.freeze({
    VERSION,
    TEMP,
    TEMP_NAME,
    ISSUE,
    ISSUE_NAME,
    LADDER_NAMES,
    ROLE_ORDER,
    ROLE_DEFS,
    PUBLIC_ACTIONS,
    PRIVATE_ACTIONS,
    GUIDED_PLANS,
    createGame,
    getRoleDef,
    getAction,
    getPublicActions,
    getPrivateActions,
    validatePlan,
    submitPlan,
    allPlansSubmitted,
    autoPlan,
    submitAIPlans,
    submitGuidedPlans,
    resolveRound,
    scoreGame,
    publicStatus,
    getGuidedNarrative,
    exportReplay,
    deepClone,
  });
});
