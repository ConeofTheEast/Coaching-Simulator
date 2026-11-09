/* Vaultball Coach — game flow controller. */
(function () {
  const VB = globalThis.VB, UI = VB.UI, $ = UI.$, esc = UI.esc;
  let S = null;
  const U = { sel: null, swapFrom: null, busy: false, mkSel: null, relSel: null };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ORDER_KEYS = ['sht', 'pas', 'def', 'rest', 'rehab', 'mental'];

  // ======================================================================
  // SAVE CODES
  const b64u = (bytes) => { let s = ''; bytes.forEach((b) => (s += String.fromCharCode(b))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = (str) => { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  async function pipe(bytes, stream) { const r = new Response(new Blob([bytes]).stream().pipeThrough(stream)); return new Uint8Array(await r.arrayBuffer()); }
  VB.Save = {
    snapshot(state) {
      const o = Object.assign({}, state);
      delete o.synergy; delete o.toasts; delete o.newConcepts;
      o.log = (o.log || []).slice(-25);
      if (!o.market || !o.market.length) delete o.market;
      return JSON.stringify(o, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10) / 10 : v));
    },
    async encode(state) {
      const json = this.snapshot(state);
      const bytes = new TextEncoder().encode(json);
      if (typeof CompressionStream !== 'undefined') { try { return 'VB2.' + b64u(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch (e) { /* fall through */ } }
      return 'VB2J.' + b64u(bytes);
    },
    async decode(code) {
      code = (code || '').trim().replace(/\s+/g, '');
      let json;
      if (code.startsWith('VB2.')) json = new TextDecoder().decode(await pipe(unb64u(code.slice(4)), new DecompressionStream('deflate-raw')));
      else if (code.startsWith('VB2J.')) json = new TextDecoder().decode(unb64u(code.slice(5)));
      else throw new Error('Not a Vaultball save code');
      const st = JSON.parse(json);
      st.toasts = []; st.newConcepts = []; st.market = st.market || [];
      let max = 0; st.roster.concat(st.market).forEach((p) => { const n = parseInt(String(p.id).slice(1), 10); if (n > max) max = n; });
      VB.setIdCounter(max + 1);
      VB.seed(Date.now());
      st.synergy = VB.computeSynergy(st);
      VB.qInit(st);
      return st;
    },
  };
  async function autosave() { if (!S || S.over) return; try { localStorage.setItem('vb_autosave', await VB.Save.encode(S)); } catch (e) { /* storage blocked */ } }

  // ======================================================================
  function boot() {
    try { VB.Arena.init(document.getElementById('arena')); VB.Arena.setMode('title'); } catch (e) { console.warn(e); }
    ['#screen', '#topbar', '#modal'].forEach((s) => $(s).addEventListener('click', onClick));
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && $('#modal').dataset.dismiss === '1') UI.closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal').dataset.dismiss === '1') UI.closeModal(); });
    titleScreen();
  }
  function setView(v) { document.body.dataset.view = v; }
  function screen(html) { $('#screen').innerHTML = html; }
  function modal(html, cls, dismiss) { UI.modal(html, cls); $('#modal').dataset.dismiss = dismiss ? '1' : '0'; }
  function flushConcepts() {
    (S.newConcepts || []).forEach((c) => { const k = VB.CONCEPTS[c]; if (k) UI.toast(`📓 New concept: ${k.ref} ${k.name}`, 'concept'); });
    S.newConcepts = [];
    (S.toasts || []).forEach((t) => UI.toast(t.text, 'trait')); S.toasts = [];
  }

  function titleScreen() {
    setView('title'); $('#topbar').classList.add('hidden');
    VB.Arena.setMode && VB.Arena.setMode('title');
    let has = false; try { has = !!localStorage.getItem('vb_autosave'); } catch (e) { /* */ }
    screen(`<div class="title">
      <div class="logo"><span>VAULTBALL</span><b>COACH</b></div>
      <p class="tag">Nine on the floor. Three on the bench. Every card is a person.</p>
      <div class="title-btns">
        <button class="btn primary big" data-act="new">New run</button>
        ${has ? '<button class="btn big" data-act="continue">Continue last run</button>' : ''}
        <button class="btn ghost" data-act="code">Continue with a save code</button>
        <button class="btn ghost" data-act="how">How to play</button>
      </div>
      <p class="foot">IB SEHS · C.1 Personality & mental toughness · B.3 Injury · IB command terms</p>
    </div>`);
  }
  function howModal() {
    modal(`<div class="how"><button class="x" data-act="close-modal">✕</button><h2>How to play</h2>
      <ol>
        <li><b>Each week</b> give every player one order: <i>Shooting, Team, Defence drills, Rest, Rehab</i> or <i>Mental skills</i>. Conscientious players actually do them.</li>
        <li><b>Watch the risk chip.</b> Tired, stressed, older or never-rehabbed players get hurt. Three injured at once and your run ends.</li>
        <li><b>Click a Big Five trait</b> on any player card to learn what it means and what it does to that player.</li>
        <li><b>Key drives:</b> each match has 5 drives you play yourself, on attack and defence. Every shot and every long, risky pass asks an <b>IB command-term</b> question. Get it right and the pass completes or the shot gets a big boost. Get it wrong and you turn the ball over.</li>
        <li>Players who did <b>shooting drills</b> shoot better, and players who did <b>team drills</b> pass faster.</li>
        <li>Use <b>Save code</b> any time to continue on another device.</li>
      </ol>
      <div class="how-keys"><div><b>Laptop</b> WASD/arrows move · Space pass/steal · click a teammate to pass to them · E shoot/switch · 1–4 answer</div><div><b>Touch</b> on-screen stick + buttons (switches on automatically)</div></div>
      <div class="modal-btns"><button class="btn primary" data-act="close-modal">Got it</button></div></div>`, 'how-modal', true);
  }
  function codeModal() {
    modal(`<div class="savebox"><button class="x" data-act="close-modal">✕</button><h2>Continue with a save code</h2>
      <p class="muted">Paste the code you saved earlier.</p><textarea id="codein" rows="5" placeholder="VB2.…"></textarea>
      <div class="err" id="codeerr"></div><div class="modal-btns"><button class="btn primary" data-act="load-code">Load run ▸</button></div></div>`, 'save-modal', true);
  }
  async function showSave() {
    const code = await VB.Save.encode(S);
    modal(`<div class="savebox"><button class="x" data-act="close-modal">✕</button><h2>Save code</h2>
      <p class="muted">Copy this code somewhere safe (notes, email, Google Classroom). Paste it on the title screen to continue on any device. It restores the whole run, including your command-term progress.</p>
      <textarea id="codeout" rows="6" readonly>${code}</textarea>
      <div class="modal-btns"><button class="btn primary" data-act="copy-code">Copy code</button><button class="btn ghost" data-act="close-modal">Close</button></div></div>`, 'save-modal', true);
  }

  async function startRun(state) {
    S = state || VB.newState(Date.now() % 1e9);
    VB.qInit(S);
    S.metrics.orders = S.metrics.orders || { good: 0, total: 0 };
    $('#topbar').classList.remove('hidden');
    if (!state) { await UI.say(VB.COMMISSIONER.intro); }
    if (S.phase === 'camp') return renderCamp();
    if (S.phase === 'market') return openMarket(S.mk.n, S.mk.label, S.mk.tier, S.mk.then, true);
    startWeek();
  }

  // ======================================================================
  // HUB
  function startWeek() {
    setView('hub');
    VB.Arena.setMode && VB.Arena.setMode('title');
    S.phase = 'training';
    // injured players default to rehab; fix the lineup
    S.roster.forEach((p) => { if (VB.isOut(p) && p.order !== 'rest') p.order = 'rehab'; });
    const moves = VB.autoFixLineup(S);
    moves.forEach((m) => UI.toast('↺ ' + m, 'info'));
    S.synergy = VB.computeSynergy(S);
    if (!U.sel || !VB.byId(S, U.sel)) U.sel = S.lineup[0][0];
    renderHub();
    flushConcepts();
    autosave();
  }
  function topbar(extra) {
    const opp = S.phase === 'training' ? VB.currentOpponent(S) : null;
    const rec = S.record[S.season];
    $('#topbar').innerHTML = `<div class="brand">VAULTBALL<b>COACH</b></div>
      <div class="tb-mid"><span class="chip">${S.phase === 'camp' ? 'SUMMER CAMP' : S.phase === 'market' ? 'OFFSEASON' : `S${S.season} · WEEK ${S.week}/${VB.weeksInSeason(S)}`}</span>
      <span class="chip">${rec.w}–${rec.l}</span>
      ${opp ? `<span class="chip opp" style="--c:#${opp.color.toString(16).padStart(6, '0')}">NEXT: <b>${esc(opp.name)}</b> <small>${opp.rating} · ${VB.SURFACES[opp.surface].name}${opp.aggressive ? ' · aggressive' : ''}</small></span>` : ''}${extra || ''}</div>
      <div class="tb-btns"><button class="btn ghost small" data-act="notebook">📓 <span class="hide-sm">Notebook</span></button><button class="btn ghost small" data-act="save">💾 <span class="hide-sm">Save code</span></button><button class="btn ghost small" data-act="mute" title="Sound on/off">${VB.isMuted() ? '🔇' : '🔊'}</button><button class="btn ghost small" data-act="how">?</button></div>`;
  }

  function tile(id, where) {
    const p = VB.byId(S, id);
    if (!p) return `<div class="tile empty" data-act="sel-empty" data-where="${where}">empty</div>`;
    const r = VB.simpleRisk(S, p);
    const o = VB.ORDERS[p.order] || VB.ORDERS.pas;
    const col = r.cat === 'out' ? '#8a8fa8' : VB.RISK_COLORS[r.cat];
    return `<div class="tile ${U.sel === id ? 'sel' : ''} ${U.swapFrom === id ? 'swapping' : ''} ${VB.isOut(p) ? 'out' : ''}" data-act="sel" data-id="${id}" data-where="${where}">
      <div class="tspr">${UI.sprite(p, { bust: true, hurt: VB.isOut(p) })}</div>
      <div class="tinfo"><b><span class="num">${p.num}</span>${esc(p.name.split(' ')[0])} <span class="sur">${esc(p.name.split(' ').slice(1).join(' '))}</span></b>
        <small>${p.role} · OVR ${VB.ovr(p)} · ${p.age}y</small>
        <div class="tmeta"><span class="rdot" style="--c:${col}" title="${r.cat} risk"></span><span class="ord" title="${o.name}">${o.icon} ${o.short}</span>${formPips(p)}</div></div></div>`;
  }
  function formPips(p) {
    const f = p.form || {}; const k = ['sht', 'pas', 'def'].find((x) => f[x] > 0);
    return k ? `<span class="form" title="Drill form: ${VB.ORDERS[k].name}">${VB.ORDERS[k].icon.repeat(f[k])}</span>` : '';
  }

  function renderHub() {
    topbar();
    const rows = ['Strikers', 'Links', 'Anchors'].map((lab, r) => `<div class="row"><div class="row-lab">${lab}<small>${['Score. High contact.', 'Pass & create.', 'Defend. High contact.'][r]}</small></div><div class="slots">${[0, 1, 2].map((l) => tile(S.lineup[r][l], r + ',' + l)).join('')}</div></div>`).join('');
    const bench = `<div class="row bench"><div class="row-lab">Bench<small>Subs in if a starter is hurt.</small></div><div class="slots">${[0, 1, 2].map((b) => tile(S.bench[b], 'b' + b)).join('')}</div></div>`;
    const syn = S.synergy;
    const auras = syn.auras.map((a) => `<span class="aura ${a.good ? 'good' : 'bad'}" data-act="aura" data-a="${a.id}" title="${esc(a.desc)}">${a.good ? '▲' : '▼'} ${esc(a.name)}</span>`).join('') || '<span class="muted small">No team auras: the personality mix is balanced.</span>';
    const p = VB.byId(S, U.sel);
    const outN = VB.outCount(S);
    screen(`<div class="hub">
      <section class="squad">
        <div class="squad-head"><h2>Your squad</h2><span class="muted small">${U.swapFrom ? 'Click another player to swap positions · <a data-act="swap-cancel">cancel</a>' : 'Click a player to see their card and set their weekly order.'}</span></div>
        ${rows}${bench}
        <div class="auras"><b>Team auras</b> ${auras}<span class="chem">Chemistry ${syn.chem >= 0 ? '+' : ''}${syn.chem}</span></div>
      </section>
      <section class="detail" id="detail">${p ? card(p) : ''}</section>
    </div>
    <div class="hubbar">
      <div class="quick"><span class="small muted">Set all healthy players:</span>${ORDER_KEYS.filter((k) => k !== 'rehab').map((k) => `<button class="btn tiny ghost" data-act="all-order" data-o="${k}" title="${VB.ORDERS[k].name}">${VB.ORDERS[k].icon} ${VB.ORDERS[k].short}</button>`).join('')}</div>
      ${outN ? `<span class="warnchip">${outN} injured${outN >= 2 ? ': one more and you are at the limit!' : ''}</span>` : ''}
      <button class="btn primary big" data-act="to-match">Train & play ▸</button>
    </div>`);
  }

  function card(p) {
    const r = VB.simpleRisk(S, p);
    const pos = VB.findSlot(S, p.id);
    const where = pos ? (pos.row >= 0 ? `${['Striker', 'Link', 'Anchor'][pos.row]} · ${VB.LANES[pos.lane]} lane` : 'Bench') : '';
    const hist = p.history.length ? p.history.map((h) => `<li class="${h.cleared ? 'ok' : 'warn'}">${esc(VB.INJURIES[h.type].name)} <small>${h.cleared ? '✓ rehabbed' : `not fully rehabbed${h.rehab ? ` (${h.rehab}/2)` : ''}`}</small></li>`).join('') : '<li class="muted">No previous injuries</li>';
    const inj = VB.isOut(p) ? `<div class="injbox">✚ <b>${esc(VB.INJURIES[p.injury.type].name)}</b> (${VB.INJURIES[p.injury.type].kind}). Out ${p.injury.weeks} more week${p.injury.weeks > 1 ? 's' : ''} · rehab ${p.injury.rehab || 0}/2</div>` : '';
    const o = p.order || 'pas';
    const ordBtns = ORDER_KEYS.map((k) => {
      const dis = VB.isOut(p) && k !== 'rehab' && k !== 'rest';
      return `<button class="obtn ${o === k ? 'on' : ''}" data-act="order" data-id="${p.id}" data-o="${k}" ${dis ? 'disabled' : ''}><i>${VB.ORDERS[k].icon}</i>${VB.ORDERS[k].short}</button>`;
    }).join('');
    const f = p.form || {};
    return `<div class="pcard ${p.b5.N >= 7 ? 'nervy' : ''}">
      <div class="pc-top">
        <div class="pc-spr">${UI.sprite(p, { hurt: VB.isOut(p) })}</div>
        <div class="pc-id">
          <div class="pc-num">#${p.num}</div><h2>${esc(p.name)}</h2>
          <div class="pc-sub">${VB.ROLES[p.role].name} · age ${p.age} · ${where}</div>
          <div class="pc-stats"><div><b>${VB.ppg(p).toFixed(1)}</b><small>PTS/G</small></div><div><b>${VB.apg(p).toFixed(1)}</b><small>AST/G</small></div><div><b>${VB.ovr(p)}</b><small>OVR</small></div></div>
          <div class="hp"><small>Health</small><span class="hpbar"><i style="width:${p.health}%;background:${p.health >= 70 ? '#3ddc84' : p.health >= 50 ? '#ffd23f' : '#ff3b4e'}"></i></span><b>${Math.round(p.health)}</b></div>
          <div class="pc-risk">${UI.riskChip(r)}${r.reasons.length ? `<ul>${r.reasons.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : r.cat === 'out' ? '' : '<span class="muted small">No major risk factors</span>'}</div>
        </div>
      </div>
      ${inj}
      <div class="pc-sec"><h4>Big Five <small>tap a trait to learn more</small></h4>${UI.b5Bars(p)}</div>
      <div class="pc-sec"><h4>Skills</h4><div class="skills">${[['sht', 'Shooting'], ['pas', 'Passing'], ['def', 'Defence'], ['fit', 'Fitness']].map(([k, n]) => `<div><small>${n}</small><span class="sbar"><i style="width:${p.sk[k]}%"></i></span><b>${Math.round(p.sk[k])}</b>${f[k] ? `<em class="formtag">${'▲'.repeat(f[k])}</em>` : ''}</div>`).join('')}</div></div>
      <div class="pc-sec"><h4>Injury history</h4><ul class="hist">${hist}</ul></div>
      <div class="pc-sec orders"><h4>This week's order</h4><div class="obtns">${ordBtns}</div><p class="odesc">${VB.ORDERS[o].desc}</p></div>
      <div class="pc-actions"><button class="btn small ghost" data-act="swap" data-id="${p.id}">⇄ Move / swap position</button>${p.note ? `<span class="note">“${esc(p.note)}”</span>` : ''}</div>
    </div>`;
  }

  function swapPlayers(a, b) {
    const pa = VB.findSlot(S, a), pb = VB.findSlot(S, b);
    const put = (pos, id) => { if (pos.row >= 0) S.lineup[pos.row][pos.lane] = id; else S.bench[pos.lane] = id; };
    put(pa, b); put(pb, a);
    S.synergy = VB.computeSynergy(S);
  }

  // ======================================================================
  // TRAINING → EVENT → MATCH
  async function goToMatch() {
    if (U.busy) return;
    const opp = VB.currentOpponent(S);
    const hot = VB.activePlayers(S).filter((x) => !VB.isOut(x.p) && ['very high'].includes(VB.simpleRisk(S, x.p).cat) && !['rest', 'rehab'].includes(x.p.order));
    if (hot.length && !(await confirm(`<b>${hot.map((x) => esc(x.p.name)).join(', ')}</b> ${hot.length > 1 ? 'are' : 'is'} at <span style="color:${VB.RISK_COLORS['very high']}">VERY HIGH</span> injury risk and still starting. Risk can never be zero, but it should be brought down to an acceptable level.`, 'Play anyway', 'Go back'))) return;
    U.busy = true;
    // targeting metric: high-risk players given recovery
    S.roster.forEach((p) => {
      const r = VB.simpleRisk(S, p);
      if (r.cat === 'high' || r.cat === 'very high' || VB.isOut(p) || VB.unrehabbed(p).length) {
        S.metrics.orders.total++;
        if (['rest', 'rehab', 'mental'].includes(p.order) || (VB.unrehabbed(p).length && p.order === 'rehab')) S.metrics.orders.good++;
      }
    });
    S.synergy = VB.computeSynergy(S);
    const lines = VB.applyOrders(S);
    if (lines.length) await trainingSummary(lines);
    const ev = VB.pickEvent(S);
    if (ev) await showEvent(ev);
    S.synergy = VB.computeSynergy(S);
    await runMatch(opp);
  }
  function confirm(html, yes, no) {
    return new Promise((res) => {
      modal(`<div class="confirm"><p>${html}</p><div class="modal-btns"><button class="btn ghost" id="c-no">${no}</button><button class="btn primary" id="c-yes">${yes}</button></div></div>`, 'confirm-modal');
      $('#c-yes').onclick = () => { UI.closeModal(); res(true); };
      $('#c-no').onclick = () => { UI.closeModal(); res(false); };
    });
  }
  function conceptTag(c) { const k = VB.CONCEPTS[c]; return k ? ` <em class="cref" title="${esc(k.text)}">${k.ref} ${esc(k.name)}</em>` : ''; }
  function trainingSummary(lines) {
    return new Promise((res) => {
      lines.forEach((l) => l.concept && VB.unlock(S, l.concept));
      modal(`<div class="film"><div class="ev-tag">TRAINING REPORT</div><h2>The week</h2>
        <ul class="film-lines">${lines.slice(0, 7).map((l) => `<li class="${l.tone}"><i>${l.tone === 'good' ? '▲' : l.tone === 'bad' ? '▼' : '•'}</i><span>${esc(l.text)}${conceptTag(l.concept)}</span></li>`).join('')}</ul>
        <div class="modal-btns"><button class="btn primary" id="tr-ok">To the locker room ▸</button></div></div>`, 'film-modal');
      $('#tr-ok').onclick = () => { UI.closeModal(); flushConcepts(); res(); };
    });
  }
  function showEvent(ev) {
    return new Promise((res) => {
      const e = ev.e;
      modal(`<div class="event"><div class="ev-tag">LOCKER ROOM</div><h2>${esc(e.title)}</h2><p class="ev-text">${esc(e.text(ev.ctx))}</p>
        <div class="ev-choices">${e.choices.map((c, i) => `<button class="btn choice" data-ch="${i}">${esc(c.label)}</button>`).join('')}</div></div>`, 'event-modal');
      document.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => {
        const r = VB.resolveEvent(S, ev, +b.dataset.ch);
        const con = VB.CONCEPTS[r.concept];
        const verdict = { good: ['✓ Strong coaching', 'good'], ok: ['◐ Partly right', 'ok'], poor: ['✗ Risky call', 'poor'] }[r.quality];
        modal(`<div class="event"><div class="ev-tag">LOCKER ROOM</div><h2>${esc(e.title)}</h2><p class="ev-text">${esc(r.text)}</p>
          <div class="verdict ${verdict[1]}">${verdict[0]}</div>
          ${con ? `<div class="concept-chip"><b>${con.ref} · ${esc(con.name)}</b> ${esc(con.text)}</div>` : ''}
          <div class="modal-btns"><button class="btn primary" id="ev-ok">To the match ▸</button></div></div>`, 'event-modal');
        $('#ev-ok').onclick = () => { UI.closeModal(); flushConcepts(); res(); };
      }));
    });
  }

  // ---------------- Match ----------------
  const DRIVES = [ // [quarter, mode]
    [1, 'attack'], [2, 'defense'], [3, 'attack'], [4, 'defense'], [4, 'attack'],
  ];
  async function runMatch(opp) {
    setView('match');
    const sim = new VB.MatchSim(S, opp);
    const oc = '#' + opp.color.toString(16).padStart(6, '0');
    screen(`<div class="match">
      <div class="scoreboard"><div class="sb us"><span>YOUR TEAM</span><b id="sc-us">0</b></div><div class="sb mid"><b id="sc-q">Q1</b><small>${esc(VB.SURFACES[opp.surface].name)}</small></div><div class="sb them" style="--c:${oc}"><span>${esc(opp.name)}</span><b id="sc-them">0</b></div></div>
      <div class="feed" id="feed"></div>
      <div class="mstage" id="mstage"></div>
    </div>`);
    sim.subs.forEach((t) => feed(t, 'sub'));
    const liveLog = [];
    for (let q = 1; q <= 4; q++) {
      $('#sc-q').textContent = 'Q' + q;
      const plays = sim.quarter(1);
      for (const pl of plays) { feed(pl.text, pl.side === 'injury' ? 'inj' : pl.made ? (pl.side === 'us' ? 'good' : 'bad') : ''); setScore(sim); await sleep(220); }
      const drives = DRIVES.filter((d) => d[0] === q);
      for (const [, mode] of drives) {
        const close = Math.abs(sim.us - sim.them) <= 6;
        const clutch = q === 4 && close;
        const call = await playCall(mode, q, clutch, sim);
        let res;
        if (call === 'sim') res = Object.assign({ qs: [] }, VB.simDrive(sim, mode));
        else {
          const d = new VB.Drive({ state: S, sim, mode, play: call, opp, clutch });
          $('#livescore').textContent = `YOU ${sim.us} – ${sim.them} ${opp.name.split(' ')[0].toUpperCase()} · Q${q}${clutch ? ' · CLUTCH' : ''}`;
          res = await d.start();
        }
        sim.us += res.us; sim.them += res.them;
        if (res.scorer && sim.live[res.scorer.id]) sim.live[res.scorer.id].pts += res.us;
        if (res.assist && sim.live[res.assist.id]) sim.live[res.assist.id].ast++;
        liveLog.push({ mode, res });
        const qs = res.qs.length ? ` · ${res.qs.filter((x) => x.ok).length}/${res.qs.length} command terms` : '';
        feed(`KEY DRIVE (${mode === 'attack' ? 'attack' : 'defence'}): ${res.text}${qs}`, 'key');
        setScore(sim);
      }
    }
    if (sim.us === sim.them) { feed('Tied! Sudden-death overtime…', 'key'); sim.overtime(); setScore(sim); }
    const res = sim.finish();
    res.liveLog = liveLog;
    await sleep(500);
    finishMatch(res, opp);
  }
  function feed(text, cls) { const f = $('#feed'); if (!f) return; const d = document.createElement('div'); d.className = 'fl ' + (cls || ''); d.textContent = text; f.prepend(d); }
  function setScore(sim) { $('#sc-us').textContent = sim.us; $('#sc-them').textContent = sim.them; }

  function playCall(mode, q, clutch, sim) {
    return new Promise((res) => {
      const plays = VB.PLAYS[mode === 'attack' ? 'attack' : 'defense'];
      const st = $('#mstage');
      st.innerHTML = `<div class="playcall ${mode}">
        <div class="pc-h"><span class="ev-tag">${clutch ? 'CLUTCH · ' : ''}KEY DRIVE · Q${q}</span><h2>${mode === 'attack' ? 'You have the ball. Call a play.' : 'They have the ball. Call a defence.'}</h2>
        <small>${mode === 'attack' ? 'Every shot and every long or risky pass asks a command-term question.' : 'Get close when they shoot to contest. Answer right for a big contest.'}${clutch ? ' <b class="warn">Close game: anxious (high-N) players get less time.</b>' : ''}</small></div>
        <div class="plays">${plays.map((p, i) => `<button class="play" data-play="${p.id}"><span class="pk">${i + 1}</span>${VB.playDiagram(p.id)}<b>${p.name}</b><small>${p.desc}</small></button>`).join('')}</div>
        <button class="btn ghost small" data-play="sim">Sim this drive (no questions)</button></div>`;
      const pick = (id) => { window.removeEventListener('keydown', key); st.innerHTML = ''; res(id); };
      st.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => pick(b.dataset.play)));
      const key = (e) => { const n = +e.key; if (n >= 1 && n <= 3) pick(plays[n - 1].id); };
      window.addEventListener('keydown', key);
      st.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    const qsAll = res.liveLog.flatMap((x) => x.res.qs);
    const leaders = res.played.map((id) => ({ p: VB.byId(S, id), lv: res.live[id] })).sort((a, b) => b.lv.pts + b.lv.ast * 1.5 - (a.lv.pts + a.lv.ast * 1.5)).slice(0, 3);
    const tone = { good: '▲', bad: '▼', neutral: '•' };
    modal(`<div class="film"><div class="ev-tag">FILM ROOM</div><h2 class="${won ? 'win' : 'loss'}">${won ? 'VICTORY' : 'DEFEAT'} <span>${res.us}–${res.them}</span></h2>
      ${qsAll.length ? `<div class="qsum">Command terms this match: <b>${qsAll.filter((x) => x.ok).length}/${qsAll.length}</b> ${qsAll.map((x) => `<span class="qt ${x.ok ? 'ok' : 'no'}">${esc(x.term)}</span>`).join('')}</div>` : ''}
      <ul class="film-lines">${lines.map((l) => `<li class="${l.tone}"><i>${tone[l.tone] || '•'}</i><span>${esc(l.text)}${l.concept ? conceptTag(l.concept) : ''}</span></li>`).join('')}</ul>
      <div class="leaders">${leaders.map((x) => `<div><b>${esc(x.p.name)}</b><span>${x.lv.pts} pts · ${x.lv.ast} ast</span></div>`).join('')}</div>
      ${post.length ? `<div class="post"><b>Medical room</b>${post.map((t) => `<div>${esc(t)}</div>`).join('')}</div>` : ''}
      <div class="modal-btns"><button class="btn primary" id="film-ok">Continue ▸</button></div></div>`, 'film-modal');
    $('#film-ok').onclick = async () => {
      UI.closeModal(); flushConcepts(); U.busy = false;
      const moreToPlay = S.week < VB.weeksInSeason(S);
      if (moreToPlay && VB.outCount(S) >= 3) { S.metrics.collapse = true; await UI.say(['Three in the infirmary. You cannot field nine.', 'The table is mine.']); return endReport(); }
      if (res.injuries.length) await UI.say([VB.pick(VB.COMMISSIONER.injury)]);
      else await UI.say([VB.pick(won ? VB.COMMISSIONER.win : VB.COMMISSIONER.loss)]);
      nextWeek();
    };
  }
  function nextWeek() {
    S.week++;
    if (S.week > VB.weeksInSeason(S)) return seasonEnd();
    startWeek();
  }

  // ======================================================================
  // OFFSEASON
  function termTable(cmp) {
    const s1 = VB.qSummary(S, 1), s2 = VB.qSummary(S, 2);
    const terms = Object.keys(VB.TERMS).filter((t) => s1.terms[t] || s2.terms[t]);
    if (!terms.length) return '<p class="muted">No command-term questions answered yet. Play the key drives!</p>';
    const pct = (r) => (r && r.a ? Math.round((100 * r.c) / r.a) : null);
    const rows = terms.sort((a, b) => VB.TERMS[a].lvl - VB.TERMS[b].lvl || a.localeCompare(b)).map((t) => {
      const a = pct(s1.terms[t]), b = pct(s2.terms[t]);
      const ch = cmp && a != null && b != null ? b - a : null;
      const bar = (v) => (v == null ? '<span class="muted">–</span>' : `<span class="tbar"><i style="width:${v}%;background:${v >= 75 ? '#3ddc84' : v >= 50 ? '#ffd23f' : '#ff5e7a'}"></i></span>${v}%`);
      return `<tr><td><b>${t}</b><small> L${VB.TERMS[t].lvl}</small></td><td>${bar(a)} <small class="muted">${s1.terms[t] ? `${s1.terms[t].c}/${s1.terms[t].a}` : ''}</small></td>${cmp ? `<td>${bar(b)} <small class="muted">${s2.terms[t] ? `${s2.terms[t].c}/${s2.terms[t].a}` : ''}</small></td><td class="${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}">${ch == null ? '' : (ch > 0 ? '+' : '') + ch + '%'}</td>` : ''}</tr>`;
    }).join('');
    const tot = (s) => (s.a ? `${s.pct}% (${s.c}/${s.a})` : '–');
    const chg = cmp && s1.a && s2.a ? s2.pct - s1.pct : null;
    return `<table class="terms"><thead><tr><th>Command term</th><th>Season 1</th>${cmp ? '<th>Season 2</th><th>Change</th>' : ''}</tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>All terms</td><td>${tot(s1)}</td>${cmp ? `<td>${tot(s2)}</td><td class="${chg > 0 ? 'up' : chg < 0 ? 'down' : ''}">${chg == null ? '' : (chg > 0 ? '+' : '') + chg + '%'}</td>` : ''}</tr></tfoot></table>`;
  }
  async function seasonEnd() {
    if (S.season === 2) return endReport();
    setView('offseason');
    await UI.say(VB.COMMISSIONER.offseason);
    const inj = S.metrics.injuries.filter((i) => i.season === 1);
    const top = (k) => S.roster.slice().sort((a, b) => ((b.seasonStats[1] || {})[k] || 0) - ((a.seasonStats[1] || {})[k] || 0))[0];
    const tp = top('pts'), ta = top('ast');
    screen(`<div class="review"><div class="ev-tag">SEASON 1 REVIEW</div><h1>${S.record[1].w}–${S.record[1].l}</h1>
      <div class="leaders"><div><b>Top scorer</b><span>${esc(tp.name)} · ${(tp.seasonStats[1] || {}).pts || 0} pts</span></div><div><b>Top playmaker</b><span>${esc(ta.name)} · ${(ta.seasonStats[1] || {}).ast || 0} ast</span></div>
      <div><b>Injuries</b><span>${inj.filter((i) => i.kind === 'acute').length} acute · ${inj.filter((i) => i.kind === 'chronic').length} chronic</span></div></div>
      <h3>Command-term accuracy</h3>${termTable(false)}
      <p class="muted">Next: choose an offseason focus. Then you may swap up to 3 players.</p>
      <button class="btn primary big" data-act="to-plan">Plan the offseason ▸</button></div>`);
  }
  const FOCUS = [
    { id: 'rehab', name: 'Rehab block', desc: 'Every old injury is fully rehabilitated (strength, range of movement, proprioception). Health +15. No skill gain.', concept: 'rehab' },
    { id: 'prehab', name: 'Strength & prehab', desc: 'Fitness +3 and 2 weeks of prehab for all. Old injuries heal but stay "not rehabbed". Health +8.', concept: 'prehab' },
    { id: 'volume', name: 'Skill volume', desc: 'Main skill +5 for all. But everyone starts Season 2 with heavy load (high overuse risk). Health +5.', concept: 'training_volume' },
  ];
  function renderPlan() {
    setView('plan'); topbar();
    screen(`<div class="plan"><div class="ev-tag">OFFSEASON</div><h1>Choose the summer focus</h1>
      <p class="muted">Everyone ages a year. Players aged 30+ lose a little fitness. Injured players heal over the break.</p>
      <div class="focus-opts">${FOCUS.map((f) => `<button class="focus-card" data-act="plan-go" data-f="${f.id}"><b>${f.name}</b><span>${f.desc}</span><small>${VB.CONCEPTS[f.concept].ref} · ${esc(VB.CONCEPTS[f.concept].name)}</small></button>`).join('')}</div></div>`);
  }
  function applyPlan(focus) {
    const clamp = VB.clamp;
    S.roster.forEach((p) => {
      if (focus === 'rehab') { const n = VB.unrehabbed(p).length; p.history.forEach((h) => (h.cleared = true)); S.metrics.rehabFull += n; p.injury = null; p.health = clamp(p.health + 15, 0, 100); }
      else { if (p.injury) { p.injury.weeks -= 4; if (p.injury.weeks <= 0) p.injury = null; } p.health = clamp(p.health + (focus === 'prehab' ? 8 : 5), 0, 100); }
      p.age++;
      if (p.age >= 30) p.sk.fit = clamp(p.sk.fit - 2, 1, 99);
      p.fatigue = 10; p.strain = 20; p.stress = clamp(p.stress - 20, 0, 100); p.niggle = false; p.earlyReturn = 0; p.exposure = 0;
      if (focus === 'prehab') { p.sk.fit = clamp(p.sk.fit + 3, 1, 99); p.prehab = 2; }
      if (focus === 'volume') { const k = p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def'; p.sk[k] = clamp(p.sk[k] + 5, 1, 99); p.strain = 60; p.fatigue = 40; }
    });
    VB.unlock(S, FOCUS.find((f) => f.id === focus).concept); VB.unlock(S, 'age');
    S.metrics.offseasonFocus = focus;
    flushConcepts();
    openMarket(3, 'END OF SEASON', 52, 'camp');
  }

  // ---------- Market ----------
  function openMarket(n, label, tier, then, resume) {
    setView('market');
    S.phase = 'market';
    if (!resume) { S.swapsLeft = n; S.scoutPoints = 3; S.market = VB.makeMarket(S, tier, 5); }
    S.mk = { n, label, tier, then };
    U.mkSel = S.market[0] && S.market[0].id; U.relSel = null;
    VB.unlock(S, 'lots'); VB.unlock(S, 'self_report'); flushConcepts();
    renderMarket();
    autosave();
  }
  function shownB5(p) {
    if (p.known.all || p.known.O) return { vals: p.b5, sr: false };
    return { vals: { O: p.selfReport.O, C: p.selfReport.C, E: p.b5.E, A: p.b5.A, N: p.selfReport.N }, sr: true };
  }
  function renderMarket() {
    topbar(`<span class="chip">Swaps left <b>${S.swapsLeft}</b></span><span class="chip">Scouting <b>${S.scoutPoints}</b></span>`);
    const mp = S.market.find((p) => p.id === U.mkSel);
    const roster = S.roster.map((p) => `<div class="rrow ${U.relSel === p.id ? 'on' : ''} ${VB.isOut(p) ? 'out' : ''}" data-act="rel" data-id="${p.id}"><div class="rspr">${UI.sprite(p, { bust: true })}</div><div><b>${esc(p.name)}</b><small>${p.role} · ${p.age}y · OVR ${VB.ovr(p)}${VB.isOut(p) ? ' · <em class="warn">OUT</em>' : ''}${VB.unrehabbed(p).length ? ` · ${VB.unrehabbed(p).length} old inj.` : ''}</small></div></div>`).join('');
    const list = S.market.map((p) => `<div class="rrow ${U.mkSel === p.id ? 'on' : ''}" data-act="mk" data-id="${p.id}"><div class="rspr">${UI.sprite(p, { bust: true })}</div><div><b>${esc(p.name)}</b><small>${VB.ROLES[p.role].name} · ${p.age}y · OVR ${VB.ovr(p)} · HP ${p.health}</small></div></div>`).join('') || '<p class="muted">No free agents left.</p>';
    let detail = '';
    if (mp) {
      const sh = shownB5(mp);
      const hist = mp.history.length ? mp.history.map((h) => esc(VB.INJURIES[h.type].name)).join(', ') : 'none';
      detail = `<div class="pcard small"><div class="pc-top"><div class="pc-spr">${UI.sprite(mp)}</div><div class="pc-id"><h2>${esc(mp.name)}</h2><div class="pc-sub">${VB.ROLES[mp.role].name} · age ${mp.age} · OVR ${VB.ovr(mp)}</div>
        <div class="hp"><small>Health</small><span class="hpbar"><i style="width:${mp.health}%"></i></span><b>${mp.health}</b></div><div class="small">Injury history: ${hist}</div></div></div>
        <div class="pc-sec"><h4>Big Five ${sh.sr ? '<span class="srtag">O, C, N are SELF-REPORTED</span>' : '<span class="oktag">observed</span>'}</h4>${UI.b5Bars(mp, { vals: sh.vals })}</div>
        ${sh.sr ? `<p class="small muted">Self-report can be biased: people present themselves well. Watching them train (observation) shows the real values.</p><button class="btn small" data-act="scout" ${S.scoutPoints > 0 ? '' : 'disabled'}>👁 Observe in training (1 scout)</button>` : ''}
        <div class="modal-btns"><button class="btn primary" data-act="sign" ${S.swapsLeft > 0 && U.relSel ? '' : 'disabled'}>${U.relSel ? `Sign, release ${esc(VB.byId(S, U.relSel).name)}` : 'Pick a player to release (left)'}</button></div></div>`;
    }
    screen(`<div class="market">
      <div class="mk-col"><h3>Your squad <small>click to release</small></h3><div class="rlist">${roster}</div></div>
      <div class="mk-col"><h3>${S.mk.label}: free agents <small>swap up to ${S.mk.n}</small></h3><div class="rlist">${list}</div></div>
      <div class="mk-detail">${detail}</div>
      <div class="hubbar"><span class="muted small">Market = LOTS data: Lifetime history (injuries), Observation, Tests (OVR), Self-report.</span><button class="btn primary big" data-act="mk-done">Done ▸</button></div>
    </div>`);
  }
  function signPlayer() {
    const mp = S.market.find((p) => p.id === U.mkSel);
    const out = VB.byId(S, U.relSel);
    if (!mp || !out || S.swapsLeft <= 0) return;
    const slot = VB.findSlot(S, out.id);
    S.roster = S.roster.filter((p) => p.id !== out.id);
    const wasSR = !(mp.known.all || mp.known.O);
    mp.known = { all: true };
    mp.order = 'pas';
    S.roster.push(mp);
    if (slot.row >= 0) S.lineup[slot.row][slot.lane] = mp.id; else S.bench[slot.lane] = mp.id;
    S.market = S.market.filter((p) => p.id !== mp.id);
    S.swapsLeft--; S.metrics.swaps++;
    VB.log(S, `Signed ${mp.name}, released ${out.name}.`, null, 'neutral');
    if (wasSR) {
      const d = [];
      ['C', 'N', 'O'].forEach((k) => { if (mp.selfReport[k] !== mp.b5[k]) d.push(`${k} said ${mp.selfReport[k]}, really ${mp.b5[k]}`); });
      if (d.length) UI.toast(`Reality check, ${mp.name}: ${d.join('; ')}. Self-report bias.`, 'trait');
    }
    UI.toast(`✍ ${mp.name} joins. ${out.name} leaves.`, 'info');
    U.relSel = null; U.mkSel = S.market[0] ? S.market[0].id : null;
    S.synergy = VB.computeSynergy(S);
    renderMarket(); autosave();
  }
  function marketDone() {
    const then = S.mk.then;
    S.market = []; S.mk = null;
    if (then === 'camp') return summerCamp();
    return startSeason2();
  }

  // ---------- Summer camp ----------
  const CAMP = [
    { id: 'sht', name: 'Shooting camp', desc: 'Shooting +3 for all. Everyone starts Season 2 with full shooting form (◎◎).' },
    { id: 'pas', name: 'Team camp', desc: 'Passing +3 for all, chemistry +4. Full passing form (⇄⇄).' },
    { id: 'def', name: 'Defence camp', desc: 'Defence +3 for all. Full defence form (▣▣).' },
    { id: 'mental', name: 'Mental skills camp', desc: 'Stress down and composure up for all. Anxious players with good habits (N≥7, C≥5): Neuroticism −1.' },
  ];
  async function summerCamp() {
    S.phase = 'camp';
    await UI.say(['Summer camp. No matches, no crowd.', 'One week. Build what the season broke.']);
    renderCamp();
  }
  function renderCamp() {
    setView('plan'); topbar();
    screen(`<div class="plan"><div class="ev-tag">SUMMER CAMP</div><h1>Pick the camp</h1>
      <div class="focus-opts">${CAMP.map((f) => `<button class="focus-card" data-act="camp" data-f="${f.id}"><b>${f.name}</b><span>${f.desc}</span></button>`).join('')}</div></div>`);
    autosave();
  }
  function endCamp(id) {
    const clamp = VB.clamp;
    S.roster.forEach((p) => {
      if (['sht', 'pas', 'def'].includes(id)) { p.sk[id] = clamp(p.sk[id] + 3, 1, 99); p.form = { sht: 0, pas: 0, def: 0 }; p.form[id] = 2; }
      if (id === 'mental') { p.stress = clamp(p.stress - 20, 0, 100); p.mt.control = clamp(p.mt.control + 1, 1, 10); p.mt.confidence = clamp(p.mt.confidence + 1, 1, 10); if (p.b5.N >= 7 && p.b5.C >= 5) { p.b5.N--; S.metrics.traitShifts++; } }
    });
    if (id === 'pas') S.chemBonus = (S.chemBonus || 0) + 4;
    if (id === 'mental') VB.unlock(S, 'malleable');
    flushConcepts();
    openMarket(2, 'END OF SUMMER', 54, 's2');
  }
  async function startSeason2() {
    S.season = 2; S.week = 1; S.lastResults = [];
    await UI.say(['Season two. Better teams. Harder bodies.', 'And at the end of it, my team.']);
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
    const ordPct = m.orders && m.orders.total ? m.orders.good / m.orders.total : 0;
    const qa = VB.qSummary(S);
    const qPct = qa.a ? qa.c / qa.a : 0;
    const winPct = games ? wins / games : 0;
    let score = 20 * winPct + 25 * safe + 20 * (evG / evN) + 10 * ordPct + 25 * qPct - 4 * m.earlyReturns - (m.collapse ? 15 : 0) + Math.min(5, m.traitShifts);
    score = Math.max(0, Math.min(100, Math.round(score)));
    const grade = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : score >= 45 ? 'D' : 'F';
    const final = S.results.find((r) => r.final);
    return { games, wins, safe, evG, evN, ordPct, qa, score, grade, final, ex, exT };
  }
  function endReport() {
    setView('report'); S.over = true;
    try { localStorage.removeItem('vb_autosave'); } catch (e) { /* */ }
    VB.Arena.setMode && VB.Arena.setMode('title');
    $('#topbar').classList.add('hidden');
    const R = computeReport(), m = S.metrics;
    const pct = (x) => Math.round(x * 100) + '%';
    const exBar = ['low', 'medium', 'high', 'very high'].map((k) => `<i style="width:${(R.ex[k] / R.exT) * 100}%;background:${VB.RISK_COLORS[k]}" title="${k}: ${R.ex[k]} player-matches"></i>`).join('');
    const evs = m.events.map((e) => `<li class="${e.quality}"><b>${esc(e.title)}</b>: ${esc(e.choice)} <em>${VB.CONCEPTS[e.concept] ? VB.CONCEPTS[e.concept].ref + ' ' + esc(VB.CONCEPTS[e.concept].name) : ''}</em></li>`).join('');
    const injs = m.injuries.map((i) => `<li>S${i.season} W${i.week}: <b>${esc(i.name)}</b>, ${esc(i.type)} <small class="${i.kind}">${i.kind}</small>${i.weeks ? ` (${i.weeks} wk)` : ''}</li>`).join('') || '<li>None. Remarkable.</li>';
    const outcome = m.collapse ? 'TEAM COLLAPSE' : R.final ? (R.final.us > R.final.them ? 'CHAMPIONS' : 'FINALISTS') : 'SEASON COMPLETE';
    const weakest = Object.entries(R.qa.terms).filter(([, r]) => r.a >= 2).sort((a, b) => a[1].c / a[1].a - b[1].c / b[1].a).slice(0, 3).map(([t]) => t);
    screen(`<div class="report" id="report">
      <div class="rep-head"><div><div class="ev-tag">COACH'S REPORT</div><h1>${outcome}</h1>
        <label class="sname">Student name <input id="sname" placeholder="Your name" /></label></div>
        <div class="grade g-${R.grade}">${R.grade}<small>${R.score}/100</small></div></div>
      <div class="rep-grid">
        <div class="rep-box"><h3>Results</h3><div class="big">${R.wins}–${R.games - R.wins}</div>
          <div>Season 1: ${S.record[1].w}–${S.record[1].l} · Season 2: ${S.record[2].w}–${S.record[2].l}</div>
          ${R.final ? `<div>Final vs The Commissioner's Chosen: ${R.final.us}–${R.final.them}</div>` : ''}</div>
        <div class="rep-box"><h3>Command terms</h3><div class="big">${R.qa.a ? Math.round((100 * R.qa.c) / R.qa.a) + '%' : '–'}</div><div>${R.qa.c}/${R.qa.a} correct</div>${weakest.length ? `<div class="small muted">Practise next: ${weakest.join(', ')}</div>` : ''}</div>
        <div class="rep-box"><h3>Injury risk <small>B.3</small></h3><div class="big">${pct(R.safe)}</div><div>of player-matches at an acceptable risk (low/medium)</div>
          <div class="exbar">${exBar}</div><div class="small muted">Full rehabs: ${m.rehabFull} · Early returns: ${m.earlyReturns}</div></div>
        <div class="rep-box"><h3>Coaching calls <small>C.1</small></h3><div class="big">${R.evG}/${m.events.length}</div><div>strong locker-room calls</div><div class="small muted">At-risk players given recovery/rehab: ${pct(R.ordPct)} · Trait shifts: ${m.traitShifts} · Swaps: ${m.swaps}</div></div>
      </div>
      <div class="rep-box"><h3>Command-term accuracy by season</h3>${termTable(true)}</div>
      <div class="rep-grid two">
        <div class="rep-box"><h3>Decisions</h3><ul class="evlist">${evs || '<li>No events.</li>'}</ul></div>
        <div class="rep-box"><h3>Injuries (${m.injuries.length})</h3><ul class="evlist">${injs}</ul></div>
      </div>
      <div class="rep-box"><h3>Concepts discovered: ${S.notebook.length}/${Object.keys(VB.CONCEPTS).length}</h3><div class="concept-tags">${S.notebook.map((c) => `<span title="${esc(VB.CONCEPTS[c].text)}">${VB.CONCEPTS[c].ref} ${esc(VB.CONCEPTS[c].name)}</span>`).join('')}</div></div>
      <div class="rep-box"><h3>Reflect</h3><ol class="reflect">
        <li>Pick one injury from your run. Name its internal and external risk factors. What would have lowered the likelihood or the severity?</li>
        <li>Which player's Big Five profile most changed how you coached them? Describe one behaviour it made more likely, then explain why.</li>
        <li>Choose the command term you missed most. Write its definition, then answer one question from the game using it.</li></ol></div>
      <div class="modal-btns no-print"><button class="btn ghost" data-act="copy">Copy report text</button><button class="btn ghost" data-act="print">Print / PDF</button><button class="btn primary" data-act="new">New run</button></div>
    </div>`);
  }
  function reportText() {
    const R = computeReport(), m = S.metrics;
    const name = ($('#sname') && $('#sname').value) || '(no name)';
    const s1 = VB.qSummary(S, 1), s2 = VB.qSummary(S, 2);
    const terms = Object.keys(VB.TERMS).filter((t) => s1.terms[t] || s2.terms[t]).map((t) => {
      const f = (r) => (r && r.a ? `${Math.round((100 * r.c) / r.a)}% (${r.c}/${r.a})` : '-');
      return ` - ${t}: S1 ${f(s1.terms[t])} | S2 ${f(s2.terms[t])}`;
    });
    return [
      'VAULTBALL COACH REPORT', `Student: ${name}`, `Grade: ${R.grade} (${R.score}/100)${m.collapse ? ' (TEAM COLLAPSE)' : ''}`,
      `Record: ${R.wins}-${R.games - R.wins} (S1 ${S.record[1].w}-${S.record[1].l}, S2 ${S.record[2].w}-${S.record[2].l})`,
      `Command terms: ${R.qa.c}/${R.qa.a} correct overall. S1 ${s1.pct ?? '-'}%, S2 ${s2.pct ?? '-'}%${s1.a && s2.a ? ` (change ${s2.pct - s1.pct > 0 ? '+' : ''}${s2.pct - s1.pct}%)` : ''}`, ...terms,
      `Acceptable-risk player-matches: ${Math.round(R.safe * 100)}% | Injuries: ${m.injuries.length} (${m.injuries.filter((i) => i.kind === 'chronic').length} chronic) | Full rehabs: ${m.rehabFull} | Early returns: ${m.earlyReturns}`,
      `Strong locker-room calls: ${R.evG}/${m.events.length} | At-risk players given recovery: ${Math.round(R.ordPct * 100)}% | Trait shifts: ${m.traitShifts}`,
      'Decisions:', ...m.events.map((e) => ` - [${e.quality}] ${e.title}: ${e.choice}`),
      'Injuries:', ...m.injuries.map((i) => ` - S${i.season}W${i.week} ${i.name}: ${i.type} (${i.kind})`),
      `Concepts: ${S.notebook.map((c) => VB.CONCEPTS[c].name).join(', ')}`,
    ].join('\n');
  }

  // ======================================================================
  function notebook() {
    const all = Object.keys(VB.CONCEPTS);
    modal(`<div class="nb"><button class="x" data-act="close-modal">✕</button><h2>Coach's Notebook <small>${S.notebook.length}/${all.length}</small></h2>
      <div class="nb-grid">${all.map((c) => { const k = VB.CONCEPTS[c]; const has = S.notebook.includes(c); return `<div class="nbc ${has ? '' : 'locked'}"><small>${k.ref}</small><b>${has ? esc(k.name) : '???'}</b>${has ? `<p>${esc(k.text)}</p>` : ''}</div>`; }).join('')}</div>
      <h3>Command terms</h3><div class="nb-terms">${Object.keys(VB.TERMS).map((t) => `<div><b>${t}</b><small>L${VB.TERMS[t].lvl}</small><p>${VB.TERMS[t].def}</p></div>`).join('')}</div></div>`, 'nb-modal', true);
  }

  async function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    switch (act) {
      case 'new': S = null; U.sel = null; return startRun();
      case 'continue': { try { const st = await VB.Save.decode(localStorage.getItem('vb_autosave')); return startRun(st); } catch (err) { UI.toast('Could not load the autosave.', 'bad'); } return; }
      case 'code': return codeModal();
      case 'load-code': { try { const st = await VB.Save.decode($('#codein').value); UI.closeModal(); return startRun(st); } catch (err) { $('#codeerr').textContent = 'That code did not work. Check you copied all of it.'; } return; }
      case 'save': return showSave();
      case 'copy-code': { const t = $('#codeout'); t.select(); try { await navigator.clipboard.writeText(t.value); } catch (err) { document.execCommand('copy'); } UI.toast('Save code copied', 'info'); return; }
      case 'how': return howModal();
      case 'mute': VB.toggleMute(); el.textContent = VB.isMuted() ? '🔇' : '🔊'; return;
      case 'close-modal': return UI.closeModal();
      case 'notebook': return notebook();
      case 'trait': {
        const p = VB.byId(S, el.dataset.pid) || (S.market || []).find((x) => x.id === el.dataset.pid);
        if (!p) return;
        modal(UI.traitDialog(p, el.dataset.t), 'trait-modal', true);
        VB.unlock(S, 'big5_' + el.dataset.t); flushConcepts();
        return;
      }
      case 'sel': {
        if (U.swapFrom && U.swapFrom !== id) { swapPlayers(U.swapFrom, id); U.swapFrom = null; U.sel = id; renderHub(); return; }
        U.sel = id; renderHub();
        if (window.innerWidth < 900) $('#detail').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      case 'sel-empty': {
        if (!U.swapFrom) return;
        const w = el.dataset.where, from = VB.findSlot(S, U.swapFrom);
        const put = (pos, v) => { if (pos.row >= 0) S.lineup[pos.row][pos.lane] = v; else S.bench[pos.lane] = v; };
        put(from, null);
        if (w[0] === 'b') S.bench[+w[1]] = U.swapFrom; else { const [r, l] = w.split(',').map(Number); S.lineup[r][l] = U.swapFrom; }
        U.swapFrom = null; S.synergy = VB.computeSynergy(S); renderHub(); return;
      }
      case 'swap': U.swapFrom = id; renderHub(); return;
      case 'swap-cancel': U.swapFrom = null; renderHub(); return;
      case 'order': { const p = VB.byId(S, id); p.order = el.dataset.o; renderHub(); return; }
      case 'all-order': S.roster.forEach((p) => { if (!VB.isOut(p)) p.order = el.dataset.o; }); renderHub(); UI.toast(`All healthy players: ${VB.ORDERS[el.dataset.o].name}`, 'info'); return;
      case 'aura': { const a = S.synergy.auras.find((x) => x.id === el.dataset.a); if (a) UI.toast(`${a.name}: ${a.desc}`, a.good ? 'good' : 'bad'); return; }
      case 'to-match': return goToMatch();
      case 'to-plan': return renderPlan();
      case 'plan-go': return applyPlan(el.dataset.f);
      case 'camp': return endCamp(el.dataset.f);
      case 'mk': U.mkSel = id; return renderMarket();
      case 'rel': U.relSel = U.relSel === id ? null : id; return renderMarket();
      case 'scout': { const mp = S.market.find((p) => p.id === U.mkSel); if (mp && S.scoutPoints > 0) { S.scoutPoints--; mp.known.O = true; S.metrics.scouting.O++; VB.unlock(S, 'lots'); flushConcepts(); } return renderMarket(); }
      case 'sign': return signPlayer();
      case 'mk-done': return marketDone();
      case 'copy': { const t = reportText(); try { await navigator.clipboard.writeText(t); UI.toast('Report copied', 'info'); } catch (err) { modal(`<textarea rows="16" style="width:100%">${esc(t)}</textarea><div class="modal-btns"><button class="btn" data-act="close-modal">Close</button></div>`, '', true); } return; }
      case 'print': return window.print();
    }
  }

  window.VBDebug = { get state() { return S; }, U, startRun, endReport };
  window.addEventListener('DOMContentLoaded', boot);
})();
