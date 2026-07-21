(function () {
  'use strict';

  const E = window.SituationRoomEngine;
  if (!E) throw new Error('SituationRoomEngine failed to load.');

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const SAVE_KEY = 'situation-room-the-burr-v1';
  const FEEDBACK_URL = 'https://github.com/EARTHTOEDWARD/situation-room/issues/new?template=playtest.yml&title=Playtest%20feedback%3A%20The%20Burr';

  let game = null;
  let setupHumans = new Set(E.ROLE_ORDER);
  let planningQueue = [];
  let queueIndex = 0;
  let currentRoleId = null;
  let draft = { faction: null, publicAction: null, privateAction: null, target: null };
  let modalReturnFocus = null;
  let timerHandle = null;
  let timerSeconds = 120;
  let tourSteps = [];
  let tourIndex = 0;
  let tourFocus = null;
  let tourPreviousGame = null;
  let tourPreviousHadGame = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setScreen(which) {
    $('#setupScreen').hidden = which !== 'setup';
    $('#gameScreen').hidden = which !== 'game';
  }

  function saveGame() {
    if (!game || game.guided) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch (error) {
      console.warn('Could not save local game state.', error);
    }
  }

  function loadSavedGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== E.VERSION || parsed.scenario !== 'THE BURR') return null;
      return parsed;
    } catch (error) {
      console.warn('Could not load local game state.', error);
      return null;
    }
  }

  function clearSavedGame() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* no-op */ }
  }

  function roleStyle(roleId) {
    return `--role-accent:${E.ROLE_DEFS[roleId].accent}`;
  }

  function renderSetup() {
    const root = $('#roleSetup');
    root.innerHTML = '';
    E.ROLE_ORDER.forEach((roleId) => {
      const def = E.ROLE_DEFS[roleId];
      const isHuman = setupHumans.has(roleId);
      const card = document.createElement('article');
      card.className = 'setup-role';
      card.dataset.role = roleId;
      card.setAttribute('style', roleStyle(roleId));
      card.innerHTML = `
        <div class="setup-role-top">
          <div class="role-badge">${escapeHtml(def.short)}</div>
          <h3>${escapeHtml(def.name)}</h3>
        </div>
        <p>${escapeHtml(def.brief)}</p>
        <div class="seat-toggle" role="group" aria-label="${escapeHtml(def.name)} seat type">
          <button type="button" data-seat="human" class="${isHuman ? 'active' : ''}">Human</button>
          <button type="button" data-seat="ai" class="${!isHuman ? 'active' : ''}">AI</button>
        </div>`;
      card.querySelectorAll('[data-seat]').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.dataset.seat === 'human') setupHumans.add(roleId);
          else setupHumans.delete(roleId);
          renderSetup();
        });
      });
      root.appendChild(card);
    });
    $('#btnStart').textContent = setupHumans.size
      ? `Open the table · ${setupHumans.size} human${setupHumans.size === 1 ? '' : 's'}`
      : 'Open observer table · all AI';
  }

  function applyPreset(name) {
    if (name === 'five') setupHumans = new Set(E.ROLE_ORDER);
    else if (name === 'two') setupHumans = new Set(['BELARUS', 'RUSSIA']);
    else setupHumans = new Set();
    renderSetup();
  }

  function startGame() {
    clearTimer();
    const seed = ($('#seedInput').value || 'BURR-001').trim();
    game = E.createGame({ humanRoles: Array.from(setupHumans), seed });
    setScreen('game');
    renderShared();
    saveGame();
    openModal('Table opened', `
      <p><b>${setupHumans.size || 'No'} human seat${setupHumans.size === 1 ? '' : 's'}.</b> The remaining roles are controlled by deterministic scenario AI using replay seed <span class="mono">${escapeHtml(game.seed)}</span>.</p>
      <div class="worked"><b>Round loop:</b> negotiate openly → pass the device through private rooms → seal one public and one private action per role → resolve simultaneously.</div>
      <p>Do not show another player your private stakes, faction pressure, inbox, or selected actions. Off-device promises are political speech; only actions encoded in the app are mechanically binding.</p>
      <div class="modal-actions"><button class="primary" id="modalBegin" type="button">Begin at the public board</button></div>`);
    $('#modalBegin').addEventListener('click', closeModal);
  }

  function resumeGame(saved) {
    game = saved;
    setScreen('game');
    renderShared();
    closeModal();
  }

  function tempClass(tier) {
    return `t${Number(tier) || 1}`;
  }

  function pips(clock, max) {
    let html = '';
    for (let i = 0; i < max; i += 1) html += `<i class="${i < clock ? 'on' : ''}"></i>`;
    return html;
  }

  function renderLadder() {
    const root = $('#ladder');
    root.innerHTML = '';
    E.LADDER_NAMES.forEach((name, index) => {
      const rung = document.createElement('div');
      const reached = index <= game.ladder.rung;
      const current = index === game.ladder.rung;
      const locked = game.ladder.locked.includes(index);
      rung.className = `rung ${reached ? 'reached' : ''} ${current ? 'current' : ''} ${index >= 6 ? 'hot' : ''} ${locked ? 'locked' : ''}`;
      rung.innerHTML = `<span class="num">${index}</span><span class="name">${escapeHtml(name)}</span>${locked ? '<span class="lock">WELDED</span>' : ''}`;
      root.appendChild(rung);
    });
    $('#rungValue').textContent = game.ladder.rung;
    $('#rungName').textContent = E.LADDER_NAMES[game.ladder.rung];
  }

  function renderPublicRoles() {
    const root = $('#publicRoles');
    root.innerHTML = '';
    E.ROLE_ORDER.forEach((roleId) => {
      const role = game.roles[roleId];
      const def = E.ROLE_DEFS[roleId];
      const status = E.publicStatus(role);
      const posture = role.publicPosture;
      const card = document.createElement('article');
      card.className = 'public-role';
      card.dataset.role = roleId;
      card.setAttribute('style', roleStyle(roleId));
      card.innerHTML = `
        <div class="public-role-top">
          <div class="role-badge">${escapeHtml(def.short)}</div>
          <h3>${escapeHtml(def.name)}</h3>
          <span class="seat">${role.human ? 'human' : 'AI'}</span>
        </div>
        <div class="stability ${status}"><i></i>${escapeHtml(status)}</div>
        <div class="posture">
          <div class="label">Current public posture</div>
          ${posture ? `
            <div class="issue">${escapeHtml(E.ISSUE_NAME[posture.issue])}</div>
            <span class="tier ${tempClass(posture.tier)}">${escapeHtml(E.TEMP_NAME[posture.tier])} · expires R${posture.expires}</span>` : `
            <div class="issue">No categorical claim</div>
            <span class="tier">UNCOMMITTED</span>`}
        </div>
        <div class="public-stat"><span>Public credibility</span><b>${role.credibility} / 8</b></div>
        <div class="visible-action"><b>Last visible action</b>${escapeHtml(role.visibleAction)}</div>`;
      root.appendChild(card);
    });
  }

  function renderStructure() {
    $('#mediaValue').textContent = `${game.media} / 8`;
    $('#mediaBar').style.width = `${(game.media / 8) * 100}%`;
    $('#entanglementValue').textContent = `${game.entanglement} / 5`;
    $('#entanglementBar').style.width = `${(game.entanglement / 5) * 100}%`;

    const clocks = [
      ['BELARUS', 'DENIABILITY'],
      ['RUSSIA', 'MOBILIZATION'],
      ['US', 'REINFORCEMENT'],
      ['EU', 'SANCTIONS_UNITY'],
      ['UN', 'QUIET_ROOM'],
    ];
    $('#publicClocks').innerHTML = clocks.map(([roleId, assetId]) => {
      const asset = game.roles[roleId].assets[assetId];
      const stateClass = asset.clock === 0 ? 'dead' : asset.clock === 1 ? 'expiring' : '';
      return `<div class="clock-card ${stateClass}"><div class="name">${escapeHtml(game.roles[roleId].name)} · ${escapeHtml(asset.label)}</div><div class="clock-pips">${pips(asset.clock, asset.max)}</div></div>`;
    }).join('');

    const ledger = game.commitments.filter((item) => item.public);
    $('#commitmentLedger').innerHTML = ledger.length
      ? ledger.slice().reverse().map((item) => `<div class="ledger-item"><b>R${item.round}</b> · ${escapeHtml(item.text)}</div>`).join('')
      : '<div class="ledger-item">No public commitments yet.</div>';
  }

  function renderLog() {
    const root = $('#publicLog');
    root.innerHTML = game.publicLog.map((item) => `
      <div class="log-line ${escapeHtml(item.type)}">
        <span class="round">${item.round ? `R${item.round}` : '···'}</span>
        <span class="type">${escapeHtml(item.type)}</span>
        <span>${escapeHtml(item.text)}</span>
      </div>`).join('');
    root.scrollTop = root.scrollHeight;
  }

  function renderRoundConsole() {
    if (game.over) {
      $('#roundHeadline').textContent = 'Crisis concluded';
      $('#roundInstruction').textContent = game.endReason || 'Open the debrief to reveal hidden stakes and private commitments.';
      $('#btnPlan').textContent = 'Open debrief';
      $('#btnPlan').disabled = false;
    } else {
      $('#roundHeadline').textContent = `Round ${game.round} — negotiation window`;
      const humanCount = E.ROLE_ORDER.filter((id) => game.roles[id].human && !game.roles[id].eliminated).length;
      $('#roundInstruction').textContent = humanCount
        ? `Discuss openly. Then pass the device through ${humanCount} private situation room${humanCount === 1 ? '' : 's'}; AI plans are generated before any human plan is entered.`
        : 'All five roles are AI-controlled. Resolve the next round, then inspect the public consequences and final reveal.';
      $('#btnPlan').textContent = humanCount ? 'Begin sealed planning' : 'Resolve AI round';
      $('#btnPlan').disabled = false;
    }
    $('#topStatus').innerHTML = `ROUND <b>${game.round}</b> / ${game.maxRounds} · ${game.over ? 'CONCLUDED' : 'ACTIVE'} · RUNG <b>${game.ladder.rung}</b>`;
  }

  function renderShared() {
    if (!game) return;
    renderLadder();
    renderPublicRoles();
    renderStructure();
    renderLog();
    renderRoundConsole();
  }

  function beginPlanning() {
    if (!game) return;
    if (game.over) {
      showDebrief();
      return;
    }
    clearTimer();
    E.submitAIPlans(game);
    planningQueue = E.ROLE_ORDER.filter((roleId) => game.roles[roleId].human && !game.roles[roleId].eliminated && !game.plans[roleId]);
    queueIndex = 0;
    if (!planningQueue.length) {
      resolveCurrentRound();
      return;
    }
    showHandoff();
  }

  function showHandoff() {
    currentRoleId = planningQueue[queueIndex];
    const role = game.roles[currentRoleId];
    const def = E.ROLE_DEFS[currentRoleId];
    $('#privacyLayer').hidden = false;
    $('#handoffCard').hidden = false;
    $('#roomCard').hidden = true;
    $('#handoffCard').style.setProperty('--role-accent', def.accent);
    $('#handoffSeal').style.setProperty('--role-accent', def.accent);
    $('#handoffSeal').textContent = def.short;
    $('#handoffTitle').textContent = `Pass the device to ${def.name}`;
    $('#handoffText').textContent = `${queueIndex + 1} of ${planningQueue.length} human rooms this round. Other players should look away; no current-round action has been revealed.`;
    $('#btnEnterRoom').focus();
  }

  function enterRoom() {
    draft = { faction: null, publicAction: null, privateAction: null, target: null };
    $('#handoffCard').hidden = true;
    $('#roomCard').hidden = false;
    renderPrivateRoom();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderPrivateTracks(role) {
    const tracks = [
      ['Leadership', role.leadership, '/ 10'],
      ['Welfare', role.welfare, '/ 10'],
      ['Credibility', role.credibility, '/ 8'],
      ['Wiggle room', role.wiggle, '/ 4'],
    ];
    $('#privateTracks').innerHTML = tracks.map(([key, value, max]) => `<div class="private-track"><div class="key">${key}</div><div class="value">${value}</div><small>${max}</small></div>`).join('');
  }

  function renderStakeTable(roleId) {
    const role = game.roles[roleId];
    const def = E.ROLE_DEFS[roleId];
    const rows = Object.entries(role.stakes).map(([issue, tier]) => `
      <div class="stake-row">
        <div class="stake-name">${escapeHtml(E.ISSUE_NAME[issue])}</div>
        <div><span class="temp-chip ${tempClass(tier)}">${escapeHtml(E.TEMP_NAME[tier])}</span></div>
        <div>L${def.sacrifice.leadership} · W${def.sacrifice.welfare} · C${def.sacrifice.credibility}</div>
      </div>`).join('');
    $('#stakeTable').innerHTML = `<div class="stake-row head"><div>Issue</div><div>True temperature</div><div>Maximum sacrifice</div></div>${rows}`;
  }

  function renderAssetTable(roleId) {
    const role = game.roles[roleId];
    const rows = Object.values(role.assets).map((asset) => `
      <div class="asset-row">
        <div class="asset-name">${escapeHtml(asset.label)}</div>
        <div><div class="clock-pips">${pips(asset.clock, asset.max)}</div></div>
        <div class="desc">${escapeHtml(asset.desc)}</div>
      </div>`).join('');
    $('#assetTable').innerHTML = `<div class="asset-row head"><div>Asset</div><div>Clock</div><div>What expires</div></div>${rows}`;
  }

  function renderFactionChoices(roleId) {
    const root = $('#factionChoices');
    const role = game.roles[roleId];
    const factions = E.ROLE_DEFS[roleId].factions;
    root.innerHTML = '';
    Object.entries(factions).forEach(([id, faction]) => {
      const pressure = role.pressures[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `choice-card ${draft.faction === id ? 'selected' : ''}`;
      card.dataset.value = id;
      card.innerHTML = `
        <span class="choice-title">${escapeHtml(faction.name)}</span>
        <span class="choice-desc">${escapeHtml(faction.recommendation)}</span>
        <span class="choice-meta"><span class="meta-chip ${id}">${id}</span></span>
        <span class="faction-pressure" aria-label="Pressure ${pressure} of 3">${[1, 2, 3].map((n) => `<i class="${n <= pressure ? 'on' : ''} ${pressure === 3 && n <= pressure ? 'max' : ''}"></i>`).join('')}</span>`;
      card.addEventListener('click', () => { draft.faction = id; renderFactionChoices(roleId); });
      root.appendChild(card);
    });
  }

  function actionMeta(action, roleId) {
    const chips = [`<span class="meta-chip ${action.alignment}">${escapeHtml(action.alignment)}</span>`];
    if (action.claim) chips.push(`<span class="meta-chip">claims ${escapeHtml(E.TEMP_NAME[action.claim.tier])}</span>`);
    if (action.assetCost) {
      const asset = game.roles[roleId].assets[action.assetCost.id];
      chips.push(`<span class="meta-chip cost">−${action.assetCost.amount} ${escapeHtml(asset.label)}</span>`);
    }
    if (action.targets && action.targets.length) chips.push('<span class="meta-chip">private target</span>');
    return chips.join('');
  }

  function renderActionChoices(kind, roleId) {
    const root = kind === 'public' ? $('#publicChoices') : $('#privateChoices');
    const actions = kind === 'public' ? E.getPublicActions(game, roleId) : E.getPrivateActions(game, roleId);
    const selected = kind === 'public' ? draft.publicAction : draft.privateAction;
    root.innerHTML = '';
    actions.forEach((action) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `choice-card ${selected === action.id ? 'selected' : ''} ${action.available ? '' : 'disabled'}`;
      card.disabled = !action.available;
      card.dataset.value = action.id;
      card.innerHTML = `<span class="choice-title">${escapeHtml(action.label)}</span><span class="choice-desc">${escapeHtml(action.desc)}</span><span class="choice-meta">${actionMeta(action, roleId)}</span>`;
      card.addEventListener('click', () => {
        if (kind === 'public') draft.publicAction = action.id;
        else {
          draft.privateAction = action.id;
          draft.target = action.targets && action.targets.length === 1 ? action.targets[0] : null;
          renderTargetSelect(roleId);
        }
        renderActionChoices(kind, roleId);
      });
      root.appendChild(card);
    });
  }

  function renderTargetSelect(roleId) {
    const action = draft.privateAction ? E.getAction('private', roleId, draft.privateAction) : null;
    const wrap = $('#targetWrap');
    const select = $('#targetSelect');
    if (!action || !action.targets || !action.targets.length) {
      wrap.hidden = true;
      draft.target = null;
      return;
    }
    wrap.hidden = false;
    select.innerHTML = action.targets.map((targetId) => `<option value="${escapeHtml(targetId)}">${escapeHtml(E.ROLE_DEFS[targetId].name)}</option>`).join('');
    if (!draft.target || !action.targets.includes(draft.target)) draft.target = action.targets[0];
    select.value = draft.target;
  }

  function renderInbox(roleId) {
    const inbox = game.roles[roleId].privateInbox || [];
    $('#privateInbox').innerHTML = inbox.length
      ? inbox.slice().reverse().map((item) => `<div class="inbox-item ${item.from === 'INTERNAL' ? 'internal' : ''}"><b>R${item.round} · ${escapeHtml(item.from)}</b><br>${escapeHtml(item.text)}</div>`).join('')
      : '<div class="inbox-empty">No private messages yet. Matching intentions can form a deal during resolution even when the public board shows confrontation.</div>';
  }

  function renderPrivateRoom() {
    const role = game.roles[currentRoleId];
    const def = E.ROLE_DEFS[currentRoleId];
    $('#roomCard').style.setProperty('--role-accent', def.accent);
    $('#roomTitle').textContent = def.name;
    $('#roomBrief').textContent = def.brief;
    $('#roomRound').textContent = `ROUND ${game.round} / ${game.maxRounds}`;
    $('#roomError').textContent = '';
    renderPrivateTracks(role);
    renderStakeTable(currentRoleId);
    renderAssetTable(currentRoleId);
    renderFactionChoices(currentRoleId);
    renderActionChoices('public', currentRoleId);
    renderActionChoices('private', currentRoleId);
    renderTargetSelect(currentRoleId);
    renderInbox(currentRoleId);
  }

  function leaveRoom() {
    $('#roomCard').hidden = true;
    $('#handoffCard').hidden = false;
    $('#btnEnterRoom').focus();
  }

  function sealPlan() {
    const candidate = { ...draft };
    const check = E.validatePlan(game, currentRoleId, candidate);
    if (!check.ok) {
      $('#roomError').textContent = check.reason;
      return;
    }
    E.submitPlan(game, currentRoleId, candidate);
    saveGame();
    queueIndex += 1;
    if (queueIndex < planningQueue.length) showHandoff();
    else {
      $('#privacyLayer').hidden = true;
      $('#roomCard').hidden = true;
      $('#handoffCard').hidden = false;
      resolveCurrentRound();
    }
  }

  function publicEventsForRound(round) {
    return game.publicLog.filter((item) => item.round === round);
  }

  function resolveCurrentRound() {
    E.submitAIPlans(game);
    const result = E.resolveRound(game);
    if (!result.ok) {
      openModal('Resolution blocked', `<p>${escapeHtml(result.reason)}</p>`);
      return;
    }
    renderShared();
    saveGame();
    const events = publicEventsForRound(result.snapshot.round).slice(-8);
    const eventHtml = events.map((event) => `<li><b>${escapeHtml(event.type.toUpperCase())}:</b> ${escapeHtml(event.text)}</li>`).join('');
    const ended = game.over;
    openModal(`Round ${result.snapshot.round} resolved`, `
      <p>All five plans were resolved simultaneously. Private exchanges remain in participant inboxes unless the public log records a leak or agreement.</p>
      <div class="resolution-grid">
        <div class="resolution-stat"><span class="num">${result.snapshot.start.rung}→${result.snapshot.end.rung}</span><span class="lbl">Escalation rung</span></div>
        <div class="resolution-stat"><span class="num">${result.snapshot.end.media}</span><span class="lbl">Media heat / 8</span></div>
        <div class="resolution-stat"><span class="num">${result.snapshot.end.entanglement}</span><span class="lbl">Patron entanglement / 5</span></div>
      </div>
      <h3>Publicly observable consequences</h3>
      <ul>${eventHtml || '<li>No new public event.</li>'}</ul>
      <div class="worked"><b>Remember:</b> a ladder returning to its old rung does not reset the crisis. Claims, guarantees, faction pressure, depleted clocks, and secret concessions persist.</div>
      <div class="modal-actions"><button class="primary" id="resolutionContinue" type="button">${ended ? 'Open debrief' : `Continue to round ${game.round}`}</button></div>`);
    $('#resolutionContinue').addEventListener('click', () => {
      closeModal();
      if (ended) showDebrief();
    });
  }

  function showHowToPlay() {
    openModal('How to play The Burr', `
      <p><b>Goal:</b> secure your real interests and keep your leadership, society, and future leverage intact. The table also receives a shared world-viability score; a narrow national win can coexist with collective catastrophe.</p>
      <div class="how-grid">
        <div class="how-card"><b>1 · Negotiate</b><span>Talk openly between rounds. Private side conversations are allowed, but only encoded actions become mechanically binding.</span></div>
        <div class="how-card"><b>2 · Enter privately</b><span>Pass the device. Each human sees their true stakes, sacrifice ceiling, faction pressure, assets, and backchannel inbox.</span></div>
        <div class="how-card"><b>3 · Choose two actions</b><span>Select one public action and one private action. All current-round plans remain sealed until everyone has submitted.</span></div>
        <div class="how-card"><b>4 · Resolve</b><span>Public moves, matching private intentions, accidents, faction events, leaks, and expiring assets transform the crisis.</span></div>
        <div class="how-card"><b>Public rhetoric</b><span>Hotter claims can deter, but consume wiggle room. A threat that expires unbacked becomes hollow and damages future credibility.</span></div>
        <div class="how-card"><b>Internal factions</b><span>Privilege one faction each round. Ignored factions accumulate pressure and may leak, resign, or challenge the leadership.</span></div>
        <div class="how-card"><b>Authoritarian trade-off</b><span>Russia and Belarus pay lower immediate public audience costs, but elite challenges are hidden and can become abrupt regime threats.</span></div>
        <div class="how-card"><b>Face and secrecy</b><span>UN escrow, inspection, joint language, and secret annexes can make retreat survivable. Secret concessions may later leak.</span></div>
      </div>
      <div class="worked"><b>Worked example:</b> Belarus publicly calls the crossing existential, although its real existential stake is regime survival. It privately offers withdrawal for a Russian guarantee. If Russia independently selects the matching conditional guarantee, the package forms. The crossing de-escalates, but Russian entanglement rises and the hidden concession acquires leak risk.</div>
      <div class="modal-actions"><button class="secondary" id="howClose" type="button">Return</button><button class="primary" id="howTour" type="button">Show me the first round</button></div>`);
    $('#howClose').addEventListener('click', closeModal);
    $('#howTour').addEventListener('click', () => { closeModal(); startGuidedRound(); });
  }

  function showWelcome() {
    const saved = loadSavedGame();
    openModal('Welcome to Situation Room', `
      <p><b>The Burr</b> is the first multiplayer vertical slice: Belarus, Russia, the United States, the European Union, and the United Nations share one crisis while managing five different internal rooms.</p>
      <div class="worked"><b>The central experience:</b> “I knew which compromise could work, but I could not say it publicly.”</div>
      <p>Use five humans for the full table, two humans for the proxy–patron core, or let the AI demonstrate the system.</p>
      <div class="modal-actions">
        ${saved ? '<button class="secondary" id="welcomeResume" type="button">Resume saved table</button>' : ''}
        <button class="secondary" id="welcomeHow" type="button">How to play</button>
        <button class="primary" id="welcomeTour" type="button">Show me a round</button>
        <button class="secondary" id="welcomeSetup" type="button">Set up table</button>
      </div>`);
    if (saved) $('#welcomeResume').addEventListener('click', () => resumeGame(saved));
    $('#welcomeHow').addEventListener('click', showHowToPlay);
    $('#welcomeTour').addEventListener('click', () => { closeModal(); startGuidedRound(); });
    $('#welcomeSetup').addEventListener('click', closeModal);
  }

  function openModal(title, html) {
    modalReturnFocus = document.activeElement;
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modalLayer').hidden = false;
    requestAnimationFrame(() => $('#modalClose').focus());
  }

  function closeModal() {
    $('#modalLayer').hidden = true;
    $('#modalBody').innerHTML = '';
    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') modalReturnFocus.focus();
  }

  function startGuidedRound() {
    clearTimer();
    tourPreviousHadGame = Boolean(game);
    tourPreviousGame = game ? E.deepClone(game) : null;
    game = E.createGame({ humanRoles: [], seed: 'GUIDED-BURR-001', guided: true });
    E.submitGuidedPlans(game);
    const result = E.resolveRound(game);
    setScreen('game');
    renderShared();
    const narrative = E.getGuidedNarrative(result);
    const targets = [
      '[data-role="BELARUS"]',
      '[data-role="RUSSIA"]',
      '[data-role="US"]',
      '[data-role="EU"]',
      '#structurePanel',
      '#ladderPanel',
    ];
    tourSteps = narrative.map((step, index) => ({ ...step, target: targets[index] }));
    tourIndex = 0;
    $('#tourLayer').hidden = false;
    renderTourStep();
  }

  function clearTourFocus() {
    if (tourFocus) tourFocus.classList.remove('tour-focus');
    tourFocus = null;
  }

  function renderTourStep() {
    clearTourFocus();
    const step = tourSteps[tourIndex];
    $('#tourTitle').textContent = step.title;
    $('#tourText').textContent = step.text;
    $('#tourCount').textContent = `${tourIndex + 1} / ${tourSteps.length}`;
    $('#tourBack').disabled = tourIndex === 0;
    $('#tourNext').textContent = tourIndex === tourSteps.length - 1 ? 'Return to table setup' : 'Next';
    tourFocus = step.target ? $(step.target) : null;
    if (tourFocus) {
      tourFocus.classList.add('tour-focus');
      tourFocus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    requestAnimationFrame(() => $('#tourNext').focus());
  }

  function nextTour() {
    if (tourIndex >= tourSteps.length - 1) {
      endTour();
      return;
    }
    tourIndex += 1;
    renderTourStep();
  }

  function prevTour() {
    if (tourIndex <= 0) return;
    tourIndex -= 1;
    renderTourStep();
  }

  function endTour() {
    clearTourFocus();
    $('#tourLayer').hidden = true;
    if (tourPreviousHadGame && tourPreviousGame) {
      game = tourPreviousGame;
      setScreen('game');
      renderShared();
    } else {
      game = null;
      setScreen('setup');
      renderSetup();
      $('#topStatus').textContent = 'SETUP · 5 ROLES · 6 ROUNDS';
    }
    tourPreviousGame = null;
    tourPreviousHadGame = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showDebrief() {
    if (!game) return;
    const score = E.scoreGame(game);
    const roleRows = E.ROLE_ORDER.map((roleId) => {
      const row = score.roles[roleId];
      return `<div class="role">${escapeHtml(E.ROLE_DEFS[roleId].name)}</div><div>${row.interests}/10</div><div>${row.leadership}/10</div><div>${row.welfare}/10</div><div>${row.futureLeverage}/10</div>`;
    }).join('');
    const reveals = E.ROLE_ORDER.map((roleId) => {
      const role = game.roles[roleId];
      const stakes = Object.entries(role.stakes).map(([issue, tier]) => `${E.ISSUE_NAME[issue]} = ${E.TEMP_NAME[tier]}`).join(' · ');
      const overclaims = role.claims.filter((claim) => claim.bluff).map((claim) => `${E.ISSUE_NAME[claim.issue]}→${E.TEMP_NAME[claim.tier]}`);
      const hollow = role.claims.filter((claim) => claim.resolved && !claim.backed).length;
      return `<div class="reveal-role"><h4>${escapeHtml(role.name)}</h4><div class="stake-summary">${escapeHtml(stakes)}<br>Overclaims: ${overclaims.length ? escapeHtml(overclaims.join(' · ')) : 'none'} · Hollow expiries: ${hollow} · Bluff fatigue: ${role.bluffFatigue} · Faction events: ${role.factionEvents.length}</div></div>`;
    }).join('');
    const dealList = game.secretDeals.length
      ? game.secretDeals.map((deal) => `<li><b>${escapeHtml(deal.title)}</b> — ${escapeHtml(deal.text)} ${deal.leaked ? '<span style="color:var(--red)">[LEAKED]</span>' : deal.protected ? '<span style="color:var(--cyan)">[PROTECTED]</span>' : '[SECRET]'}</li>`).join('')
      : '<li>No secret deal formed.</li>';
    openModal('Debrief — the hidden rooms revealed', `
      <p><b>${escapeHtml(score.endReason)}</b></p>
      <div class="world-score"><div class="num">${score.worldViability}</div><div class="lbl">Shared world viability / 100</div></div>
      <div class="score-table">
        <div class="head">Role</div><div class="head">Interests</div><div class="head">Leadership</div><div class="head">Welfare</div><div class="head">Future leverage</div>
        ${roleRows}
      </div>
      <h3>True stakes and internal residue</h3>
      <div class="reveal-list">${reveals}</div>
      <h3>Secret commitment ledger</h3>
      <ul>${dealList}</ul>
      <div class="worked"><b>Interpretation:</b> compare the strategic score with leadership survival, national welfare, and world viability. A government can “win” its narrow objective while damaging the constituency it claims to protect.</div>
      <div class="modal-actions"><button class="secondary" id="debriefExport" type="button">Export replay JSON</button><button class="secondary" id="debriefFeedback" type="button">Give playtest feedback</button><button class="primary" id="debriefNew" type="button">New table</button></div>`);
    $('#debriefExport').addEventListener('click', exportReplay);
    $('#debriefFeedback').addEventListener('click', () => window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer'));
    $('#debriefNew').addEventListener('click', () => { closeModal(); newTable(); });
  }

  function newTable() {
    clearTimer();
    clearSavedGame();
    game = null;
    setScreen('setup');
    renderSetup();
    $('#topStatus').textContent = 'SETUP · 5 ROLES · 6 ROUNDS';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportReplay() {
    if (!game) return;
    const data = E.exportReplay(game);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `situation-room-the-burr-${game.seed}.json`.replace(/[^a-z0-9._-]+/gi, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const seconds = (timerSeconds % 60).toString().padStart(2, '0');
    $('#timerDisplay').textContent = `${minutes}:${seconds}`;
  }

  function startTimer() {
    if (timerHandle) {
      clearTimer();
      return;
    }
    timerSeconds = 120;
    $('#timerDisplay').hidden = false;
    $('#btnTimer').textContent = 'Stop table timer';
    updateTimerDisplay();
    timerHandle = window.setInterval(() => {
      timerSeconds -= 1;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearTimer(false);
        $('#timerDisplay').hidden = false;
        $('#timerDisplay').textContent = 'TIME';
      }
    }, 1000);
  }

  function clearTimer(hide) {
    if (timerHandle) window.clearInterval(timerHandle);
    timerHandle = null;
    $('#btnTimer').textContent = 'Start 2:00 table timer';
    if (hide !== false) $('#timerDisplay').hidden = true;
  }

  function wireEvents() {
    $('#presetFive').addEventListener('click', () => applyPreset('five'));
    $('#presetTwo').addEventListener('click', () => applyPreset('two'));
    $('#presetObserver').addEventListener('click', () => applyPreset('observer'));
    $('#btnStart').addEventListener('click', startGame);
    $('#btnHow').addEventListener('click', showHowToPlay);
    $('#btnShowMe').addEventListener('click', startGuidedRound);
    $('#btnPlan').addEventListener('click', beginPlanning);
    $('#btnTimer').addEventListener('click', startTimer);
    $('#btnExport').addEventListener('click', exportReplay);
    $('#btnEnterRoom').addEventListener('click', enterRoom);
    $('#btnLeaveRoom').addEventListener('click', leaveRoom);
    $('#btnSealPlan').addEventListener('click', sealPlan);
    $('#targetSelect').addEventListener('change', (event) => { draft.target = event.target.value; });
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalLayer').addEventListener('click', (event) => { if (event.target === $('#modalLayer')) closeModal(); });
    $('#tourClose').addEventListener('click', endTour);
    $('#tourNext').addEventListener('click', nextTour);
    $('#tourBack').addEventListener('click', prevTour);
    document.addEventListener('keydown', (event) => {
      if (!$('#tourLayer').hidden) {
        if (event.key === 'Escape') endTour();
        else if (event.key === 'ArrowRight') nextTour();
        else if (event.key === 'ArrowLeft') prevTour();
        return;
      }
      if (!$('#modalLayer').hidden && event.key === 'Escape') closeModal();
    });
  }

  function boot() {
    renderSetup();
    wireEvents();
    setScreen('setup');
    window.setTimeout(showWelcome, 250);
  }

  boot();

  window.__SituationRoomApp = {
    get game() { return game; },
    startGame,
    beginPlanning,
    startGuidedRound,
    showDebrief,
    newTable,
  };
})();
