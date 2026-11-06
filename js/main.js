/* Vaultball Coach — game flow controller. */
(function () {
  const VB = globalThis.VB, UI = VB.UI, $ = UI.$, esc = UI.esc;
  let S = null;
  const U = { view: 'title', sel: null, card: null, flip: false, tab: 'player', speed: 1, swapFrom: null, mkSel: null, relSel: null, busy: false };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const CARD_HINTS = {
    prehab: 'Best on players with likelihood ≥3, old injuries, or age 31+.',
    team_prehab: 'Prehab lowers likelihood for the whole squad.',
    strength: 'Best on fresh players (fatigue < 50, strain < 70).',
    grind: 'Only safe on fresh players. Never on perfectionists — they already do too much.',
    recovery: 'Most useful when the squad is tired.',
    sleep: 'Best on players with stress ≥ 50.',
    ppe: 'Most useful on high-contact positions (Strikers, Anchors).',
    rehab: 'Always worthwhile on an injury.',
    imagery: 'Best on players with low confidence (≤5).',
    goals: 'Best on low-commitment players or perfectionists.',
    selftalk: 'Best on high-Neuroticism or low-control players.',
    arousal: 'Best when 2+ high-Neuroticism players start.',
    mindfulness: 'Best for anxious teams (high average N, Powder Keg).',
    selfcomp: 'Best on players with low self-compassion or hidden pain.',
    adversity: 'Best when the team\'s Challenge score is low.',
    bonding: 'Best when chemistry is low.',
    comfort: 'Best on a player with a clearly limiting trait.',
  };

  // ======================================================================
  function boot() {
    UI.initTooltips();
    try { VB.Arena.init(document.getElementById('arena')); VB.Arena.setMode && VB.Arena.setMode('title'); } catch (e) { console.warn(e); }
    document.getElementById('screen').addEventListener('click', onClick);
    document.getElementById('topbar').addEventListener('click', onClick);
    document.getElementById('modal').addEventListener('click', onClick);
    document.getElementById('notebook').addEventListener('click', onClick);
    setupDrag();
    titleScreen();
  }

  function setView(v) { U.view = v; document.body.dataset.view = v; }
  function screen(html) { $('#screen').innerHTML = html; }

  function flush() {
    if (!S) return;
    S.newConcepts.forEach((c) => UI.toast(`📓 New in Notebook: <b>${esc(VB.CONCEPTS[c].name)}</b><small>${VB.CONCEPTS[c].ref}</small>`, 'concept', 3600));
    S.newConcepts = [];
    S.toasts.forEach((t) => UI.toast(`✦ ${esc(t.text)}`, 'trait', 5200));
    S.toasts = [];
  }

  // ======================================================================
  function titleScreen() {
    setView('title');
    $('#topbar').classList.add('hidden');
    VB.Arena.setMode && VB.Arena.setMode('title');
    screen(`<div class="title-wrap">
      <div class="title-logo">VAULT<span>BALL</span></div>
      <div class="title-sub">THE COACH'S TABLE</div>
      <div class="title-tag">A roguelike coaching game · SEHS C.1 Personality &amp; Mental toughness · B.3 Injury</div>
      <div class="title-btns"><button class="btn primary big" data-act="new">Begin a new run</button>
      <button class="btn ghost" data-act="how">How to play</button></div>
      <div class="title-foot">About 20–30 minutes · two seasons · 12 players · one rival</div>
    </div>`);
  }
  function howModal() {
    UI.modal(`<h2>HOW TO PLAY</h2><ol class="how">
      <li><b>Your 12 cards are people.</b> 9 start: <em>Strikers</em> score, <em>Links</em> assist, <em>Anchors</em> defend. 3 sit on the bench.</li>
      <li><b>Each week:</b> spend <em>Focus</em> on training cards, then play a match. Drag cards to change the lineup.</li>
      <li><b>Big Five traits are multipliers.</b> They make behaviour more or less likely: sticking to training, choking late, passing. Click a player, then <em>Flip</em> to see their mental profile.</li>
      <li><b>Every player has an injury risk</b> = likelihood × severity. Keep it <span style="color:#3ddc84">low</span> or <span style="color:#ffd23f">medium</span>. Rest tired players.</li>
      <li><b>3 players injured at once and the team collapses.</b> Run over.</li>
      <li><b>Two seasons.</b> In between: rehab plans, swap up to 3 players, summer camp, then swap up to 2 more.</li></ol>
      <div class="modal-btns"><button class="btn primary" data-act="close-modal">Got it</button></div>`);
  }

  async function startRun() {
    S = VB.newState((Date.now() % 1e9) | 0);
    S.deck = VB.buildDeck();
    VB.Arena.setMode && VB.Arena.setMode('table');
    screen('');
    await UI.say(VB.COMMISSIONER.intro);
    startWeek();
  }

  // ======================================================================
  // TRAINING HUB
  function startWeek() {
    S.focus = S.focusMax;
    S.roster.forEach((p) => { if (!VB.isOut(p) && VB.hidesPain(p) && p.strain >= 65) p.niggle = true; });
    VB.autoFixLineup(S).forEach((m) => UI.toast(`↺ ${esc(m)} (injury)`, 'info'));
    VB.drawHand(S, S.phase === 'camp' ? 6 : 5);
    S.synergy = VB.computeSynergy(S);
    U.sel = null; U.card = null; U.flip = false; U.swapFrom = null;
    setView('hub');
    VB.Arena.setMode && VB.Arena.setMode('table');
    syncArenaLineup();
    renderHub();
    flush();
  }

  function syncArenaLineup() {
    if (!VB.Arena.ok) return;
    const grid = S.lineup.map((row) => row.map((id) => { const p = VB.byId(S, id); return p && !VB.isOut(p) ? p : null; }));
    const opp = VB.currentOpponent(S);
    VB.Arena.setTeams(opp ? opp.color : 0xff3b6b, grid);
  }

  function previewFor(p) {
    if (U.card === null) return null;
    const key = S.hand[U.card]; const c = VB.CARDS[key];
    if (!c || c.target !== 'player') return null;
    if (VB.isOut(p) && !c.rehab && key !== 'sleep' && key !== 'selfcomp') return { cls: 'no', text: 'injured' };
    const ct = c.canTarget ? c.canTarget(p, S) : true;
    if (ct !== true) return { cls: 'no', text: ct };
    if (key === 'sleep' || key === 'ppe') return { cls: 'yes', text: '✓ automatic' };
    const a = VB.adherence(p, c, S);
    let t = a.outcome === 'full' ? `✓ completes (${a.score})` : a.outcome === 'partial' ? `◐ half (${a.score})` : `✗ skips (${a.score})`;
    if (key === 'comfort') t += `<br><small>${esc(VB.challengeTrait(p).task)}</small>`;
    return { cls: a.outcome === 'full' ? 'yes' : a.outcome === 'partial' ? 'half' : 'no', text: t };
  }

  function renderHub() {
    const camp = S.phase === 'camp';
    $('#topbar').classList.remove('hidden');
    $('#topbar').innerHTML = UI.topbar(S);
    const opp = camp ? null : VB.currentOpponent(S);
    const labels = ['STRIKERS', 'LINKS', 'ANCHORS'];
    let board = '';
    for (let r = 0; r < 3; r++) {
      board += `<div class="row-label" data-tip="${esc(VB.ROLES[VB.ROW_ROLE[r]].desc)}">${labels[r]}</div>`;
      for (let l = 0; l < 3; l++) {
        const p = VB.byId(S, S.lineup[r][l]);
        const pv = p ? previewFor(p) : null;
        board += `<div class="slot" data-r="${r}" data-l="${l}">${p ? UI.miniCard(p, S, { opp, slotRole: VB.ROW_ROLE[r], selected: U.sel === p.id || U.swapFrom === p.id, preview: pv, target: pv ? (pv.cls === 'no' ? 'invalid' : 'valid') : '' }) : '<div class="empty">empty</div>'}</div>`;
      }
    }
    let bench = '';
    S.bench.forEach((id, i) => {
      const p = VB.byId(S, id); const pv = p ? previewFor(p) : null;
      bench += `<div class="bslot" data-b="${i}">${p ? UI.miniCard(p, S, { opp, selected: U.sel === p.id || U.swapFrom === p.id, preview: pv, target: pv ? (pv.cls === 'no' ? 'invalid' : 'valid') : '' }) : '<div class="empty">empty</div>'}</div>`;
    });
    const hand = S.hand.map((k, i) => UI.trainingCard(k, i, S, U.card === i)).join('');
    let handInfo = '<div class="muted">Pick a training card, then a player. Unused Focus is lost at the end of the week.</div>';
    if (U.card !== null) {
      const c = VB.CARDS[S.hand[U.card]];
      handInfo = `<div><b>${esc(c.name)}</b> — ${c.target === 'team' ? 'applies to the whole squad.' : 'now click a player.'}</div><div class="hint">💡 ${esc(CARD_HINTS[S.hand[U.card]] || '')}</div>
        ${c.target === 'team' ? `<button class="btn primary" data-act="play-team">Play on squad (${c.cost} Focus)</button>` : ''}<button class="btn ghost small" data-act="cancel-card">Cancel</button>`;
    }
    const side = U.tab === 'team' || !U.sel ? UI.synergyPanel(S) : detailPanel(VB.byId(S, U.sel), opp);
    screen(`<div class="hub">
      <section class="board-wrap">
        <div class="board-3d"><div class="board" id="board">${board}<svg id="links"></svg></div>
        <div class="bench-row"><div class="row-label">BENCH</div>${bench}</div></div>
      </section>
      <aside class="side"><div class="tabs"><button class="tab ${U.tab === 'player' && U.sel ? 'on' : ''}" data-act="tab-player">Player</button><button class="tab ${U.tab === 'team' || !U.sel ? 'on' : ''}" data-act="tab-team">Team synergy</button></div>
        <div class="side-body">${side}</div></aside>
      <footer class="hand-wrap"><div class="hand">${hand || '<div class="muted">No cards left this week.</div>'}</div>
        <div class="hand-info">${handInfo}</div>
        <button class="btn primary go" data-act="go">${camp ? 'End summer camp ▶' : 'To the match ▶'}</button></footer>
    </div>`);
    requestAnimationFrame(drawLinks);
  }

  function detailPanel(p, opp) {
    if (!p) return UI.synergyPanel(S);
    const pos = VB.findSlot(S, p.id);
    const role = pos && pos.row >= 0 ? VB.ROW_ROLE[pos.row] : p.role;
    return `${UI.bigCard(p, S, { opp, slotRole: role, flipped: U.flip })}
      <div class="detail-actions">
        <button class="btn ghost small" data-act="flip">↻ Flip card</button>
        ${VB.isOut(p) ? '' : `<button class="btn ${p.rest ? 'primary' : 'ghost'} small" data-act="rest" data-tip="Rest: skip standard practice this week. Fatigue −30, Strain −12. Still plays the match.">${p.rest ? '✓ Resting' : 'Rest this week'}</button>`}
        <button class="btn ghost small" data-act="swap" data-tip="Or drag a card onto another slot">${U.swapFrom === p.id ? 'Click a slot…' : '⇄ Move'}</button>
      </div>`;
  }

  // Draw synergy links between neighbouring cards on the board
  function drawLinks() {
    const svg = $('#links'), board = $('#board');
    if (!svg || !board) return;
    const br = board.getBoundingClientRect();
    const sx = board.offsetWidth / br.width || 1, sy = board.offsetHeight / br.height || 1;
    svg.setAttribute('width', board.offsetWidth); svg.setAttribute('height', board.offsetHeight);
    const col = { glue: '#3ddc84', clash: '#ff3b4e', nerves: '#ffb020', calm: '#7cc8ff' };
    let h = '';
    S.synergy.links.forEach((k) => {
      const a = board.querySelector(`.slot[data-r="${k.a[0]}"][data-l="${k.a[1]}"]`), b = board.querySelector(`.slot[data-r="${k.b[0]}"][data-l="${k.b[1]}"]`);
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const horiz = k.a[0] === k.b[0];
      const ext = 10;
      let x1, y1, x2, y2;
      if (horiz) { x1 = (ra.right - br.left) * sx - ext; x2 = (rb.left - br.left) * sx + ext; y1 = y2 = (ra.top + ra.height * 0.32 - br.top) * sy; }
      else { y1 = (ra.bottom - br.top) * sy - ext; y2 = (rb.top - br.top) * sy + ext; x1 = x2 = (ra.left + ra.width * 0.5 - br.left) * sx; }
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const icon = { glue: '+', clash: '×', nerves: '!', calm: '~' }[k.type];
      h += `<g><title>${esc(k.label)}</title><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col[k.type]}" stroke-width="6" stroke-linecap="round" opacity="0.95"/>
        <circle cx="${mx}" cy="${my}" r="9" fill="#05060f" stroke="${col[k.type]}" stroke-width="2"/><text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="12" font-weight="800" fill="${col[k.type]}">${icon}</text></g>`;
    });
    svg.innerHTML = h;
  }
  window.addEventListener('resize', () => { if (U.view === 'hub') drawLinks(); });

  // ---------- Lineup moves ----------
  function placeAt(dest, id) {
    if (dest.b !== undefined) S.bench[dest.b] = id; else S.lineup[dest.r][dest.l] = id;
  }
  function idAt(dest) { return dest.b !== undefined ? S.bench[dest.b] : S.lineup[dest.r][dest.l]; }
  function movePlayer(id, dest) {
    const p = VB.byId(S, id);
    const src = VB.findSlot(S, id);
    if (!p || !src) return;
    const srcD = src.row >= 0 ? { r: src.row, l: src.lane } : { b: src.lane };
    const other = idAt(dest);
    if (other === id) return;
    const op = other && VB.byId(S, other);
    if (dest.b === undefined && VB.isOut(p)) { UI.toast(`${esc(p.name)} is injured and can't start.`, 'bad'); return; }
    if (srcD.b === undefined && op && VB.isOut(op)) { UI.toast(`${esc(op.name)} is injured and can't start.`, 'bad'); return; }
    placeAt(dest, id); placeAt(srcD, other || null);
    if (srcD.b !== undefined && !other) S.bench[srcD.b] = null;
    S.bench = S.bench.filter((x) => x !== undefined);
    S.synergy = VB.computeSynergy(S);
    U.swapFrom = null;
    syncArenaLineup();
    renderHub();
  }
  function setupDrag() {
    let dragId = null;
    document.addEventListener('dragstart', (e) => {
      const c = e.target.closest && e.target.closest('.pcard.mini');
      if (!c || U.view !== 'hub') return;
      dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move';
      c.classList.add('dragging');
    });
    document.addEventListener('dragend', () => { document.querySelectorAll('.dragging,.drop-over').forEach((el) => el.classList.remove('dragging', 'drop-over')); });
    document.addEventListener('dragover', (e) => {
      const s = e.target.closest && e.target.closest('.slot,.bslot');
      if (!s || !dragId) return; e.preventDefault();
      document.querySelectorAll('.drop-over').forEach((el) => el.classList.remove('drop-over')); s.classList.add('drop-over');
    });
    document.addEventListener('drop', (e) => {
      const s = e.target.closest && e.target.closest('.slot,.bslot');
      if (!s || !dragId) return; e.preventDefault();
      const dest = s.classList.contains('bslot') ? { b: +s.dataset.b } : { r: +s.dataset.r, l: +s.dataset.l };
      const id = dragId; dragId = null;
      movePlayer(id, dest);
    });
  }

  // ---------- Card play ----------
  function playOn(id) {
    const key = S.hand[U.card];
    const res = VB.playCard(S, U.card, id);
    if (!res.ok) { UI.toast(esc(res.text), 'bad'); return; }
    U.card = null;
    UI.toast(`${esc(res.text)}<div class="fit ${res.good ? 'good' : 'meh'}">${res.good ? '✓ Well-targeted' : '△ Low value here — ' + esc(CARD_HINTS[key])}</div>`, res.outcome === 'skip' ? 'bad' : 'info', 5200);
    renderHub(); flush();
  }

  // ======================================================================
  async function goToMatch() {
    if (S.phase === 'camp') return endCamp();
    const opp = VB.currentOpponent(S);
    const act = VB.activePlayers(S).filter((x) => !VB.isOut(x.p));
    const danger = act.filter((x) => { const c = VB.risk(x.p, { opp }, VB.ROW_ROLE[x.row]).cat; return c === 'very high' || VB.injuryDue(x.p, c); });
    if (act.length < 9) { if (!(await confirmModal(`Only ${act.length} healthy starters. Empty slots weaken their lane. Continue?`))) return; }
    if (danger.length && !(await confirmModal(`<b>${danger.map((x) => esc(x.p.name)).join(', ')}</b> ${danger.length > 1 ? 'are' : 'is'} at <span style="color:#ff3b4e">dangerous</span> injury risk — very high, or their exposure meter will fill this match (= injury). A coach's duty of care is to bring risk down to an acceptable level. Play anyway?`))) return;
    const ev = VB.pickEvent(S);
    if (ev) await showEvent(ev);
    VB.endTraining(S);
    if (opp.final) await UI.say(VB.COMMISSIONER.final);
    await runMatch(opp);
  }

  function confirmModal(html) {
    return new Promise((res) => {
      UI.modal(`<p>${html}</p><div class="modal-btns"><button class="btn ghost" id="cf-no">Go back</button><button class="btn danger" id="cf-yes">Play anyway</button></div>`);
      $('#cf-no').onclick = () => { UI.closeModal(); res(false); };
      $('#cf-yes').onclick = () => { UI.closeModal(); res(true); };
    });
  }

  function showEvent(ev) {
    return new Promise((res) => {
      const e = ev.e;
      UI.modal(`<div class="event"><div class="ev-tag">LOCKER ROOM</div><h2>${esc(e.title)}</h2><p class="ev-text">${esc(e.text(ev.ctx))}</p>
        <div class="ev-choices">${e.choices.map((c, i) => `<button class="btn choice" data-ch="${i}">${esc(c.label)}</button>`).join('')}</div></div>`, 'event-modal');
      VB.Arena.speak && VB.Arena.speak(true); setTimeout(() => VB.Arena.speak && VB.Arena.speak(false), 1200);
      document.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => {
        const r = VB.resolveEvent(S, ev, +b.dataset.ch);
        const con = VB.CONCEPTS[r.concept];
        const verdict = { good: ['✓ Strong coaching', 'good'], ok: ['◐ Partly right', 'ok'], poor: ['✗ Risky call', 'poor'] }[r.quality];
        UI.modal(`<div class="event"><div class="ev-tag">LOCKER ROOM</div><h2>${esc(e.title)}</h2><p class="ev-text">${esc(r.text)}</p>
          <div class="verdict ${verdict[1]}">${verdict[0]}</div>
          ${con ? `<div class="concept-chip"><b>${con.ref} · ${esc(con.name)}</b> ${esc(con.text)}</div>` : ''}
          <div class="modal-btns"><button class="btn primary" id="ev-ok">Continue</button></div></div>`, 'event-modal');
        $('#ev-ok').onclick = () => { UI.closeModal(); flush(); res(); };
      }));
    });
  }

  // ======================================================================
  // MATCH
  async function runMatch(opp) {
    setView('match'); U.busy = true;
    S.phase = 'match';
    $('#topbar').innerHTML = UI.topbar(S);
    const sim = new VB.MatchSim(S, opp);
    const hexOpp = '#' + opp.color.toString(16).padStart(6, '0');
    screen(`<div class="match-hud">
      <div class="scoreboard"><div class="sb-team us"><span>YOUR SQUAD</span><b id="sc-us">0</b></div><div class="sb-q" id="sb-q">Q1</div><div class="sb-team them" style="--oc:${hexOpp}"><b id="sc-them">0</b><span>${esc(opp.name)}</span></div></div>
      <div class="feed" id="feed"></div>
      <div class="speed"><span>SPEED</span><button class="btn small ${U.speed === 1 ? 'primary' : 'ghost'}" data-sp="1">1×</button><button class="btn small ${U.speed === 3 ? 'primary' : 'ghost'}" data-sp="3">3×</button><button class="btn small ${U.speed === 0 ? 'primary' : 'ghost'}" data-sp="0">Skip ⏭</button></div>
      <div class="strip" id="strip"></div>
    </div>`);
    if (VB.Arena.ok) { VB.Arena.setMode('match'); VB.Arena.setTeams(opp.color, sim.grid); }
    sim.subs.forEach((t) => addFeed(t, 'sub'));
    renderStrip(sim, opp);
    for (let q = 1; q <= 4; q++) {
      $('#sb-q').textContent = 'Q' + q;
      const plays = sim.quarter();
      await showPlays(plays, sim, opp);
      if (q === 2) {
        const ch = await halftime(sim);
        const msg = sim.halftime(ch);
        if (msg) addFeed('HALFTIME — ' + msg, 'sub');
        syncSim(sim); renderStrip(sim, opp);
      }
    }
    if (sim.us === sim.them) {
      $('#sb-q').textContent = 'OT'; addFeed('OVERTIME — sudden death.', 'sub');
      const n = sim.plays.length; sim.overtime(); await showPlays(sim.plays.slice(n), sim, opp);
    }
    const res = sim.finish();
    await sleep(U.speed ? 700 : 100);
    finishMatch(res, opp);
  }

  function addFeed(text, cls) {
    const f = $('#feed'); if (!f) return;
    const d = document.createElement('div'); d.className = 'fi ' + (cls || ''); d.innerHTML = text;
    f.prepend(d);
    while (f.children.length > 9) f.lastChild.remove();
  }
  function renderStrip(sim, opp) {
    const el = $('#strip'); if (!el) return;
    let h = '';
    sim.each((p, r) => {
      const fat = sim.live[p.id].fat;
      const saved = p.fatigue; p.fatigue = fat;
      const rk = VB.risk(p, { opp, lateGame: sim.q >= 4 && fat >= 60 }, VB.ROW_ROLE[r]);
      p.fatigue = saved;
      h += `<div class="st-p"><span class="n">${p.num}</span><span class="nm">${esc(p.name.split(' ')[1] || p.name)}</span><span class="fb" data-tip="Fatigue"><i style="width:${fat}%"></i></span>${UI.pips(p, rk.cat)}${UI.riskChip(rk.cat)}</div>`;
    });
    el.innerHTML = h;
  }
  function syncSim(sim) {
    if (!VB.Arena.ok) return;
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) VB.Arena.setOurSlot(r, l, sim.grid[r][l]);
  }
  async function showPlays(plays, sim, opp) {
    for (const pl of plays) {
      if (U.speed > 0 && VB.Arena.ok) await VB.Arena.play(pl, U.speed);
      else if (U.speed > 0) await sleep(250 / U.speed);
      $('#sc-us').textContent = pl.score[0]; $('#sc-them').textContent = pl.score[1];
      if (pl.side === 'injury') {
        addFeed('⚠ ' + esc(pl.text), 'inj');
        UI.toast(`⚠ <b>${esc(pl.injured.name)}</b> — ${esc(pl.injName)}`, 'bad');
        if (U.speed > 0) await UI.say(VB.pick(VB.COMMISSIONER.injury));
        syncSim(sim);
      } else if (pl.side === 'knock') addFeed('• ' + esc(pl.text), 'knock');
      else addFeed(esc(pl.text), pl.side === 'us' ? (pl.made ? 'us' : 'miss') : pl.made ? 'them' : 'stop');
      if (U.speed === 0) await sleep(8);
    }
    renderStrip(sim, opp);
  }
  function halftime(sim) {
    return new Promise((res) => {
      const diff = sim.us - sim.them;
      UI.modal(`<div class="event"><div class="ev-tag">HALFTIME · ${sim.us}–${sim.them}</div><h2>${diff > 0 ? 'You lead.' : diff < 0 ? 'You trail.' : 'All square.'}</h2>
        <p class="ev-text">One call for the second half.</p>
        <div class="ev-choices">
          <button class="btn choice" data-ht="talk"><b>Self-talk huddle</b><small>PST cue words. Less clutch nerves in Q4.</small></button>
          <button class="btn choice" data-ht="tempo"><b>Push the tempo</b><small>More attack. Fatigue rises faster: late-game injury risk.</small></button>
          <button class="btn choice" data-ht="rotate"><b>Rotate the bench</b><small>Most tired starter comes off. Everyone recovers a little.</small></button>
        </div></div>`, 'event-modal');
      document.querySelectorAll('[data-ht]').forEach((b) => (b.onclick = () => { const v = b.dataset.ht; UI.closeModal(); VB.unlock(S, v === 'talk' ? 'pst' : 'late_game'); flush(); res(v); }));
    });
  }

  function finishMatch(res, opp) {
    const won = res.us > res.them;
    S.record[S.season][won ? 'w' : 'l']++;
    S.lastResults.push(won ? 'W' : 'L');
    S.results.push({ season: S.season, week: S.week, opp: opp.name, us: res.us, them: res.them, final: !!opp.final });
    const lines = VB.filmRoom(S, res, opp);
    const post = VB.postMatch(S, res);
    S.synergy = VB.computeSynergy(S);
    const leaders = res.played.map((id) => ({ p: VB.byId(S, id), lv: res.live[id] })).sort((a, b) => b.lv.pts + b.lv.ast * 1.5 - (a.lv.pts + a.lv.ast * 1.5)).slice(0, 3);
    const tone = { good: '▲', bad: '▼', neutral: '•' };
    UI.modal(`<div class="film"><div class="ev-tag">FILM ROOM</div><h2 class="${won ? 'win' : 'loss'}">${won ? 'VICTORY' : 'DEFEAT'} <span>${res.us}–${res.them}</span></h2>
      <ul class="film-lines">${lines.map((l) => `<li class="${l.tone}"><i>${tone[l.tone] || '•'}</i><span>${esc(l.text)}${l.concept ? ` <em class="cref" data-tip="${esc(VB.CONCEPTS[l.concept].text)}">${VB.CONCEPTS[l.concept].ref} ${esc(VB.CONCEPTS[l.concept].name)}</em>` : ''}</span></li>`).join('')}</ul>
      <div class="leaders">${leaders.map((x) => `<div><b>${esc(x.p.name)}</b><span>${x.lv.pts} pts · ${x.lv.ast} ast</span></div>`).join('')}</div>
      ${post.length ? `<div class="post"><b>Medical room</b>${post.map((t) => `<div>${esc(t)}</div>`).join('')}</div>` : ''}
      <div class="modal-btns"><button class="btn primary" id="film-ok">Continue</button></div></div>`, 'film-modal');
    VB.unlock(S, 'risk');
    $('#film-ok').onclick = async () => {
      UI.closeModal(); flush(); U.busy = false;
      const moreToPlay = S.week < VB.weeksInSeason(S);
      if (moreToPlay && VB.outCount(S) >= 3) { S.metrics.collapse = true; await UI.say(['Three in the infirmary. You cannot field nine.', 'The table is mine.']); return endReport(); }
      await UI.say(VB.pick(won ? VB.COMMISSIONER.win : VB.COMMISSIONER.loss));
      nextWeek();
    };
  }

  function nextWeek() {
    S.week++;
    if (S.week > VB.weeksInSeason(S)) return seasonEnd();
    S.phase = 'training';
    startWeek();
  }

  // ======================================================================
  // OFFSEASON
  async function seasonEnd() {
    if (S.season === 2) return endReport();
    setView('offseason');
    VB.Arena.setMode && VB.Arena.setMode('table');
    await UI.say(VB.COMMISSIONER.offseason);
    const inj = S.metrics.injuries.filter((i) => i.season === 1);
    const top = (k) => S.roster.slice().sort((a, b) => ((b.seasonStats[1] || {})[k] || 0) - ((a.seasonStats[1] || {})[k] || 0))[0];
    const tp = top('pts'), ta = top('ast');
    UI.modal(`<div class="film"><div class="ev-tag">SEASON 1 REVIEW</div><h2>${S.record[1].w}–${S.record[1].l}</h2>
      <div class="leaders"><div><b>Top scorer</b><span>${esc(tp.name)} · ${(tp.seasonStats[1] || {}).pts || 0} pts</span></div><div><b>Top playmaker</b><span>${esc(ta.name)} · ${(ta.seasonStats[1] || {}).ast || 0} ast</span></div>
      <div><b>Injuries</b><span>${inj.filter((i) => i.kind === 'acute').length} acute · ${inj.filter((i) => i.kind === 'chronic').length} chronic</span></div></div>
      <p class="muted">Next: set offseason rehab plans, then you may swap up to 3 players.</p>
      <div class="modal-btns"><button class="btn primary" data-act="to-plan">Plan the offseason ▶</button></div></div>`, 'film-modal');
  }

  const PLAN = { points: 6, rehab: {}, focus: null };
  function offseasonPlan() {
    UI.closeModal();
    setView('plan');
    PLAN.points = 6; PLAN.rehab = {}; PLAN.focus = PLAN.focus || null;
    renderPlan();
  }
  function renderPlan() {
    $('#topbar').innerHTML = UI.topbar(S);
    const used = Object.values(PLAN.rehab).filter(Boolean).length * 2;
    const left = PLAN.points - used;
    const rows = S.roster.map((p) => {
      const need = VB.unrehabbed(p).length || VB.isOut(p) || p.health < 70;
      const full = !!PLAN.rehab[p.id];
      const hist = VB.unrehabbed(p).map((h) => VB.INJURIES[h.type].name).join(', ');
      return `<div class="plan-row ${need ? '' : 'fine'}"><div class="pr-name"><b>${esc(p.name)}</b><small>${VB.ROLES[p.role].name} · age ${p.age} → ${p.age + 1}</small></div>
        <div class="pr-status">${VB.isOut(p) ? `<span class="warn">OUT: ${esc(VB.INJURIES[p.injury.type].name)}</span>` : ''} ${hist ? `<span class="muted">Not rehabbed: ${esc(hist)}</span>` : ''} ${UI.bar('HP', p.health, 100, 'hp')}</div>
        <div class="pr-opts">${need ? `<button class="btn small ${full ? 'primary' : 'ghost'}" data-act="plan-rehab" data-id="${p.id}" ${!full && left < 2 ? 'disabled' : ''}>Full rehab (2)</button><button class="btn small ${!full ? 'primary' : 'ghost'}" data-act="plan-maint" data-id="${p.id}">Maintenance (0)</button>` : '<span class="ok">Healthy — maintenance</span>'}</div></div>`;
    }).join('');
    const F = [
      { id: 'prehab', name: 'Strength & Prehab', desc: 'Fitness +3 for all. Everyone starts Season 2 with 2 weeks of prehab.', concept: 'prehab' },
      { id: 'volume', name: 'Skill Volume', desc: 'Main skill +5 for all. But everyone starts Season 2 with heavy strain (+30).', concept: 'training_volume' },
      { id: 'mental', name: 'Mental Skills Camp', desc: 'All 4Cs +1, Self-compassion +1. Anxious, conscientious players: Neuroticism −1.', concept: 'pst' },
    ];
    screen(`<div class="plan">
      <div class="plan-head"><h2>OFFSEASON PLAN</h2><div class="pp">Rehab points <b>${left}</b> / ${PLAN.points}</div></div>
      <p class="muted">Full rehab restores strength and proprioception: it clears re-injury risk and adds health. Maintenance lets injuries heal, but leaves re-injury risk. Everyone ages a year. Players 30+ lose fitness.</p>
      <div class="plan-rows">${rows}</div>
      <h3>Summer team focus</h3>
      <div class="focus-opts">${F.map((f) => `<button class="focus-card ${PLAN.focus === f.id ? 'on' : ''}" data-act="plan-focus" data-f="${f.id}"><b>${f.name}</b><span>${f.desc}</span><small>${VB.CONCEPTS[f.concept].ref} · ${esc(VB.CONCEPTS[f.concept].name)}</small></button>`).join('')}</div>
      <button class="btn primary big go" data-act="plan-go" ${PLAN.focus ? '' : 'disabled'}>${PLAN.focus ? 'Confirm plan ▶' : 'Pick a summer focus ↓'}</button>
    </div>`);
  }
  function applyPlan() {
    const clamp = VB.clamp;
    S.roster.forEach((p) => {
      if (PLAN.rehab[p.id]) {
        const n = VB.unrehabbed(p).length;
        p.history.forEach((h) => (h.cleared = true));
        S.metrics.rehabFull += n;
        p.injury = null; p.health = clamp(p.health + 20, 0, 100);
      } else {
        if (p.injury) { p.injury.weeks -= 4; if (p.injury.weeks <= 0) p.injury = null; }
        p.health = clamp(p.health + 8, 0, 100);
      }
      p.age++;
      if (p.age >= 30) p.sk.fit = clamp(p.sk.fit - 2, 1, 99);
      if (p.age <= 23) { const k = p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def'; p.sk[k] = clamp(p.sk[k] + 2, 1, 99); }
      p.fatigue = 10; p.strain = 20; p.stress = clamp(p.stress - 20, 0, 100); p.niggle = false; p.earlyReturn = 0;
      if (PLAN.focus === 'prehab') { p.sk.fit = clamp(p.sk.fit + 3, 1, 99); p.prehab = 2; }
      if (PLAN.focus === 'volume') { ['sht', 'pas', 'def'].forEach((k) => {}); const k = p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def'; p.sk[k] = clamp(p.sk[k] + 5, 1, 99); p.strain = 50; }
      if (PLAN.focus === 'mental') { ['control', 'commitment', 'challenge', 'confidence'].forEach((k) => (p.mt[k] = clamp(p.mt[k] + 1, 1, 10))); p.sc = clamp(p.sc + 1, 1, 10); if (p.b5.N >= 7 && p.b5.C >= 5) { p.b5.N--; S.metrics.traitShifts++; } }
    });
    VB.unlock(S, 'rehab'); VB.unlock(S, 'age');
    VB.unlock(S, { prehab: 'prehab', volume: 'training_volume', mental: 'malleable' }[PLAN.focus]);
    S.metrics.offseasonFocus = PLAN.focus;
    flush();
    openMarket(3, 'END OF SEASON', 52, 4, () => summerCamp());
  }

  // ---------- Market ----------
  let MK = null;
  function openMarket(n, label, tier, scout, then) {
    setView('market');
    S.swapsLeft = n; S.scoutPoints = scout;
    S.market = VB.makeMarket(S, tier, 6);
    MK = { label, then, n };
    U.mkSel = S.market[0].id; U.relSel = null; U.flip = false;
    VB.unlock(S, 'lots'); flush();
    renderMarket();
  }
  function displayOf(p) {
    if (p.known.all) return { dp: p, masked: {} };
    const k = p.known;
    const dp = JSON.parse(JSON.stringify(p));
    const masked = {};
    if (!k.O) { masked.A = masked.E = true; }
    if (!k.S) { masked.C = masked.N = masked.O = true; masked.S = true; }
    else { dp.b5.C = p.selfReport.C; dp.b5.N = p.selfReport.N; dp.b5.O = p.selfReport.O; Object.keys(dp.mt).forEach((m) => (dp.mt[m] = p.selfReport.mt)); }
    if (!k.T) masked.T = true;
    if (!k.L) masked.L = true;
    dp.stats = p.stats; dp.seasonStats = p.seasonStats;
    return { dp, masked };
  }
  function renderMarket() {
    $('#topbar').innerHTML = UI.topbar(S, `<span class="chip">Swaps left <b>${S.swapsLeft}</b></span><span class="chip">Scouting <b>${S.scoutPoints}</b></span>`);
    const mp = S.market.find((p) => p.id === U.mkSel);
    const roster = S.roster.map((p) => `<div class="rrow ${U.relSel === p.id ? 'on' : ''} ${VB.isOut(p) ? 'out' : ''}" data-act="rel" data-id="${p.id}"><span class="n">${p.num}</span><b>${esc(p.name)}</b><small>${p.role} · ${p.age} · OVR ${VB.ovr(p)}</small>${VB.isOut(p) ? '<em class="warn">OUT</em>' : ''}${VB.unrehabbed(p).length ? `<em class="muted">${VB.unrehabbed(p).length} old inj.</em>` : ''}</div>`).join('');
    const list = S.market.map((p) => {
      const { dp, masked } = displayOf(p);
      return `<div class="mrow ${U.mkSel === p.id ? 'on' : ''}" data-act="mk" data-id="${p.id}">${UI.pentagon(dp.b5, 40, { masked })}<div><b>${esc(p.name)}</b><small>${VB.ROLES[p.role].name} · age ${p.age}</small><small>${masked.T ? 'OVR ' + (VB.ovr(p) - 6) + '–' + (VB.ovr(p) + 6) + ' (est.)' : 'OVR ' + VB.ovr(p)}</small></div></div>`;
    }).join('');
    let detail = '';
    if (mp) {
      const { dp, masked } = displayOf(mp);
      const sbtn = (k, name, what) => `<button class="btn small ${mp.known[k] ? 'primary' : 'ghost'}" data-act="scout" data-k="${k}" ${mp.known[k] || S.scoutPoints <= 0 ? 'disabled' : ''} data-tip="${esc(what)}"><b>${k}</b> ${name}</button>`;
      detail = `<div class="scout"><div class="scout-h">SCOUT (1 point each) — <span class="muted">LOTS</span></div>
        ${sbtn('L', 'Lifetime history', 'Past seasons + injury record + health')}${sbtn('O', 'Observation', "Watch them with others: reveals Agreeableness and Extraversion")}${sbtn('T', 'Tests', 'Fitness and skill tests: reveals skills, health and OVR')}${sbtn('S', 'Self-report', 'Their own questionnaire: Conscientiousness, Neuroticism, Openness, mental toughness. May be flattering!')}
        ${mp.known.S ? '<div class="sr-warn">⚠ C, N, O and the 4Cs shown are <b>self-reported</b>. People often present themselves well.</div>' : ''}</div>
        ${UI.bigCard(dp, S, { masked, flipped: U.flip, noRisk: true })}
        <div class="detail-actions"><button class="btn ghost small" data-act="flip">↻ Flip</button>
        <button class="btn primary" data-act="sign" ${S.swapsLeft > 0 && U.relSel ? '' : 'disabled'}>${U.relSel ? `Sign — release ${esc(VB.byId(S, U.relSel).name)}` : 'Select a player to release'}</button></div>`;
    }
    screen(`<div class="market">
      <div class="mk-col"><h3>YOUR SQUAD <small>click to release</small></h3><div class="rlist">${roster}</div></div>
      <div class="mk-col"><h3>${MK.label} — FREE AGENTS <small>swap up to ${MK.n}</small></h3><div class="mlist">${list}</div></div>
      <div class="mk-detail">${detail}</div>
      <button class="btn primary go" data-act="mk-done">Done signing ▶</button>
    </div>`);
  }
  function signPlayer() {
    const mp = S.market.find((p) => p.id === U.mkSel);
    const out = VB.byId(S, U.relSel);
    if (!mp || !out || S.swapsLeft <= 0) return;
    const slot = VB.findSlot(S, out.id);
    S.roster = S.roster.filter((p) => p.id !== out.id);
    const wasSR = mp.known.S;
    mp.known = { all: true };
    S.roster.push(mp);
    if (slot.row >= 0) S.lineup[slot.row][slot.lane] = mp.id; else S.bench[slot.lane] = mp.id;
    S.market = S.market.filter((p) => p.id !== mp.id);
    S.swapsLeft--; S.metrics.swaps++;
    VB.log(S, `Signed ${mp.name}, released ${out.name}.`, null, 'neutral');
    if (wasSR) {
      const diffs = [];
      if (mp.selfReport.C !== mp.b5.C) diffs.push(`C said ${mp.selfReport.C}, really ${mp.b5.C}`);
      if (mp.selfReport.N !== mp.b5.N) diffs.push(`N said ${mp.selfReport.N}, really ${mp.b5.N}`);
      if (diffs.length) { UI.toast(`Reality check — ${esc(mp.name)}: ${esc(diffs.join('; '))}. Self-report bias.`, 'trait', 7000); VB.unlock(S, 'self_report'); }
    }
    UI.toast(`✍ ${esc(mp.name)} joins. ${esc(out.name)} leaves.`, 'info');
    U.relSel = null; U.mkSel = S.market[0] ? S.market[0].id : null;
    S.synergy = VB.computeSynergy(S);
    flush();
    renderMarket();
  }

  // ---------- Summer camp ----------
  async function summerCamp() {
    S.phase = 'camp'; S.focusMax = 5;
    await UI.say(['Summer camp. No matches, no crowd.', 'Five Focus. One week. Build what the season broke.']);
    startWeek();
  }
  async function endCamp() {
    const ev = VB.pickEvent(S);
    if (ev) await showEvent(ev);
    VB.endTraining(S);
    S.roster.forEach((p) => { p.fatigue = VB.clamp(p.fatigue - 20, 0, 100); p.week = {}; p.rest = false; });
    openMarket(2, 'END OF SUMMER', 54, 3, () => startSeason2());
  }
  async function startSeason2() {
    S.season = 2; S.week = 1; S.phase = 'training'; S.focusMax = 4; S.lastResults = [];
    S.deck = VB.buildDeck(); S.discard = []; S.hand = [];
    await UI.say(['Season two. Better teams. Harder bodies.', 'And at the end of it — my team.']);
    startWeek();
  }

  // ======================================================================
  // END REPORT
  function computeReport() {
    const m = S.metrics;
    const games = S.results.length;
    const wins = S.results.filter((r) => r.us > r.them).length;
    const ex = m.riskExposure; const exT = Object.values(ex).reduce((a, b) => a + b, 0) || 1;
    const safe = (ex.low + ex.medium) / exT;
    const evG = m.events.filter((e) => e.quality === 'good').length, evN = m.events.length || 1;
    const cardPct = m.cards.total ? m.cards.good / m.cards.total : 0;
    const winPct = games ? wins / games : 0;
    let score = 25 * winPct + 30 * safe + 25 * (evG / evN) + 20 * cardPct - 4 * m.earlyReturns - (m.collapse ? 15 : 0) + Math.min(5, m.traitShifts);
    score = Math.max(0, Math.min(100, Math.round(score)));
    const grade = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : score >= 45 ? 'D' : 'F';
    const final = S.results.find((r) => r.final);
    return { games, wins, safe, evG, evN, cardPct, score, grade, final, ex, exT };
  }
  function endReport() {
    setView('report');
    VB.Arena.setMode && VB.Arena.setMode('title');
    $('#topbar').classList.add('hidden');
    const R = computeReport(), m = S.metrics;
    const pct = (x) => Math.round(x * 100) + '%';
    const exBar = ['low', 'medium', 'high', 'very high'].map((k) => `<i style="width:${(R.ex[k] / R.exT) * 100}%;background:${VB.RISK_COLORS[k]}" data-tip="${k}: ${R.ex[k]} player-matches"></i>`).join('');
    const evs = m.events.map((e) => `<li class="${e.quality}"><b>${esc(e.title)}</b> — ${esc(e.choice)} <em>${VB.CONCEPTS[e.concept] ? VB.CONCEPTS[e.concept].ref + ' ' + esc(VB.CONCEPTS[e.concept].name) : ''}</em></li>`).join('');
    const injs = m.injuries.map((i) => `<li>S${i.season} W${i.week}: <b>${esc(i.name)}</b> — ${esc(i.type)} <small class="${i.kind}">${i.kind}</small>${i.weeks ? ` (${i.weeks} wk)` : ''}</li>`).join('') || '<li>None. Remarkable.</li>';
    const outcome = m.collapse ? 'TEAM COLLAPSE' : R.final ? (R.final.us > R.final.them ? 'CHAMPIONS' : 'FINALISTS') : 'SEASON COMPLETE';
    screen(`<div class="report" id="report">
      <div class="rep-head"><div><div class="ev-tag">COACH'S REPORT</div><h1>${outcome}</h1>
        <label class="sname">Student name <input id="sname" placeholder="Your name" /></label></div>
        <div class="grade g-${R.grade}">${R.grade}<small>${R.score}/100</small></div></div>
      <div class="rep-grid">
        <div class="rep-box"><h3>Results</h3><div class="big">${R.wins}–${R.games - R.wins}</div>
          <div>Season 1: ${S.record[1].w}–${S.record[1].l} · Season 2: ${S.record[2].w}–${S.record[2].l}</div>
          ${R.final ? `<div>Final vs The Commissioner's Chosen: ${R.final.us}–${R.final.them}</div>` : ''}</div>
        <div class="rep-box"><h3>Injury risk management <small>B.3</small></h3><div class="big">${pct(R.safe)}</div><div>of player-matches at an acceptable risk (low/medium)</div>
          <div class="exbar">${exBar}</div><div class="small muted">Full rehabs: ${m.rehabFull} · Early returns: ${m.earlyReturns}</div></div>
        <div class="rep-box"><h3>Locker-room decisions <small>C.1</small></h3><div class="big">${R.evG}/${m.events.length}</div><div>strong coaching calls</div></div>
        <div class="rep-box"><h3>Training targeting</h3><div class="big">${pct(R.cardPct)}</div><div>of ${m.cards.total} training cards were well-targeted</div><div class="small muted">Personality shifts achieved: ${m.traitShifts} · Swaps: ${m.swaps}</div></div>
      </div>
      <div class="rep-grid two">
        <div class="rep-box"><h3>Decisions</h3><ul class="evlist">${evs || '<li>No events.</li>'}</ul></div>
        <div class="rep-box"><h3>Injuries (${m.injuries.length})</h3><ul class="evlist">${injs}</ul></div>
      </div>
      <div class="rep-box"><h3>Concepts discovered: ${S.notebook.length}/${Object.keys(VB.CONCEPTS).length}</h3><div class="concept-tags">${S.notebook.map((c) => `<span data-tip="${esc(VB.CONCEPTS[c].text)}">${VB.CONCEPTS[c].ref} ${esc(VB.CONCEPTS[c].name)}</span>`).join('')}</div></div>
      <div class="rep-box"><h3>Reflect</h3><ol class="reflect">
        <li>Pick one injury from your run. Name its internal and external risk factors. What would have lowered the likelihood or the severity?</li>
        <li>Which player's Big Five profile most changed how you coached them? Give one behaviour it made more likely.</li>
        <li>When did mental toughness help your team, and when did it become a problem? Where did self-compassion fit in?</li></ol></div>
      <div class="modal-btns no-print"><button class="btn ghost" data-act="copy">Copy report text</button><button class="btn ghost" data-act="print">Print / PDF</button><button class="btn primary" data-act="new">New run</button></div>
    </div>`);
  }
  function reportText() {
    const R = computeReport(), m = S.metrics;
    const name = ($('#sname') && $('#sname').value) || '(no name)';
    return [
      `VAULTBALL COACH — REPORT`, `Student: ${name}`, `Grade: ${R.grade} (${R.score}/100)${m.collapse ? ' — TEAM COLLAPSE' : ''}`,
      `Record: ${R.wins}-${R.games - R.wins} (S1 ${S.record[1].w}-${S.record[1].l}, S2 ${S.record[2].w}-${S.record[2].l})`,
      `Acceptable-risk player-matches: ${Math.round(R.safe * 100)}% | Injuries: ${m.injuries.length} (${m.injuries.filter((i) => i.kind === 'chronic').length} chronic) | Full rehabs: ${m.rehabFull} | Early returns: ${m.earlyReturns}`,
      `Strong locker-room calls: ${R.evG}/${m.events.length} | Well-targeted training: ${Math.round(R.cardPct * 100)}% | Trait shifts: ${m.traitShifts}`,
      `Decisions:`, ...m.events.map((e) => ` - [${e.quality}] ${e.title}: ${e.choice}`),
      `Injuries:`, ...m.injuries.map((i) => ` - S${i.season}W${i.week} ${i.name}: ${i.type} (${i.kind})`),
      `Concepts: ${S.notebook.map((c) => VB.CONCEPTS[c].name).join(', ')}`,
    ].join('\n');
  }

  // ======================================================================
  async function onClick(e) {
    const t = e.target.closest('[data-act],[data-sp],.tcard,.pcard.mini,.slot,.bslot');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'notebook') return openNotebook();
    if (act === 'new') { UI.closeModal(); return startRun(); }
    if (act === 'how') return howModal();
    if (act === 'close-modal') return UI.closeModal();
    if (act === 'nb-close' || e.target.id === 'nb-close') return closeNotebook();
    if (t.dataset.sp !== undefined) { U.speed = +t.dataset.sp; document.querySelectorAll('[data-sp]').forEach((b) => b.className = 'btn small ' + (+b.dataset.sp === U.speed ? 'primary' : 'ghost')); return; }
    if (act === 'to-plan') return offseasonPlan();
    if (act === 'plan-rehab') { PLAN.rehab[t.dataset.id] = true; return renderPlan(); }
    if (act === 'plan-maint') { PLAN.rehab[t.dataset.id] = false; return renderPlan(); }
    if (act === 'plan-focus') { PLAN.focus = t.dataset.f; return renderPlan(); }
    if (act === 'plan-go') return applyPlan();
    if (act === 'copy') { const txt = reportText(); try { await navigator.clipboard.writeText(txt); UI.toast('Report copied to clipboard.', 'info'); } catch (_) { UI.modal(`<textarea class="copybox">${esc(txt)}</textarea><div class="modal-btns"><button class="btn primary" data-act="close-modal">Close</button></div>`); } return; }
    if (act === 'print') return window.print();

    if (U.view === 'market') {
      if (act === 'rel') { U.relSel = U.relSel === t.dataset.id ? null : t.dataset.id; return renderMarket(); }
      if (act === 'mk') { U.mkSel = t.dataset.id; U.flip = false; return renderMarket(); }
      if (act === 'scout') {
        const mp = S.market.find((p) => p.id === U.mkSel);
        if (mp && S.scoutPoints > 0 && !mp.known[t.dataset.k]) { mp.known[t.dataset.k] = true; S.scoutPoints--; S.metrics.scouting[t.dataset.k]++; if (t.dataset.k === 'S') VB.unlock(S, 'self_report'); flush(); }
        return renderMarket();
      }
      if (act === 'flip') { U.flip = !U.flip; return renderMarket(); }
      if (act === 'sign') return signPlayer();
      if (act === 'mk-done') { const then = MK.then; MK = null; return then(); }
      return;
    }

    if (U.view !== 'hub') return;
    if (act === 'go') return goToMatch();
    if (act === 'tab-player') { U.tab = 'player'; return renderHub(); }
    if (act === 'tab-team') { U.tab = 'team'; return renderHub(); }
    if (act === 'flip') { U.flip = !U.flip; return renderHub(); }
    if (act === 'rest') { const p = VB.byId(S, U.sel); if (p) { p.rest = !p.rest; } return renderHub(); }
    if (act === 'swap') { U.swapFrom = U.swapFrom === U.sel ? null : U.sel; if (U.swapFrom) UI.toast('Now click the slot to move to.', 'info', 2000); return renderHub(); }
    if (act === 'cancel-card') { U.card = null; return renderHub(); }
    if (act === 'play-team') {
      const res = VB.playCard(S, U.card, null);
      if (!res.ok) { UI.toast(esc(res.text), 'bad'); return; }
      const key = res && S.played[S.played.length - 1].key;
      UI.toast(`${esc(res.text)}<div class="fit ${res.good ? 'good' : 'meh'}">${res.good ? '✓ Well-targeted' : '△ Low value right now — ' + esc(CARD_HINTS[key])}</div>`, 'info', 5200);
      U.card = null; renderHub(); flush(); return;
    }
    if (t.classList.contains('tcard')) {
      const i = +t.dataset.idx; const c = VB.CARDS[S.hand[i]];
      if (S.focus < c.cost) { UI.toast('Not enough Focus this week.', 'bad'); return; }
      U.card = U.card === i ? null : i;
      return renderHub();
    }
    if (t.classList.contains('pcard')) {
      const id = t.dataset.id;
      if (U.card !== null && VB.CARDS[S.hand[U.card]].target === 'player') return playOn(id);
      if (U.swapFrom && U.swapFrom !== id) { const s = t.closest('.slot,.bslot'); const dest = s.classList.contains('bslot') ? { b: +s.dataset.b } : { r: +s.dataset.r, l: +s.dataset.l }; return movePlayer(U.swapFrom, dest); }
      U.sel = U.sel === id ? null : id; U.tab = 'player'; U.flip = false;
      return renderHub();
    }
    if ((t.classList.contains('slot') || t.classList.contains('bslot')) && U.swapFrom) {
      const dest = t.classList.contains('bslot') ? { b: +t.dataset.b } : { r: +t.dataset.r, l: +t.dataset.l };
      return movePlayer(U.swapFrom, dest);
    }
  }

  function openNotebook() { if (!S) return; const n = $('#notebook'); n.innerHTML = UI.notebook(S); n.classList.remove('hidden'); }
  function closeNotebook() { $('#notebook').classList.add('hidden'); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotebook(); });

  // debug / testing hook
  window.VBDebug = { get state() { return S; }, U };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
