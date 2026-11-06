/* Vaultball Coach — UI building blocks (HTML strings + small DOM helpers). */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const UI = (VB.UI = {});
  const $ = (s, r) => (r || document).querySelector(s);
  UI.$ = $;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.esc = esc;
  const r1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

  UI.TRAIT_COLORS = { O: '#9b7bff', C: '#2de2e6', E: '#ffd23f', A: '#3ddc84', N: '#ff4d7e', MT: '#ff8c32' };
  UI.TRAIT_LONG = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism' };

  // ---------- Big Five pentagon ----------
  UI.pentagon = function (b5, size, opts) {
    opts = opts || {};
    const keys = ['O', 'C', 'E', 'A', 'N'];
    const cx = size / 2, cy = size / 2 + (opts.labels ? 4 : 0), R = size / 2 - (opts.labels ? 26 : 3);
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    let g = '';
    [0.33, 0.66, 1].forEach((k) => { g += `<polygon points="${keys.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" stroke="rgba(150,180,255,${k === 1 ? 0.35 : 0.15})" stroke-width="1"/>`; });
    keys.forEach((_, i) => { const [x, y] = pt(i, 1); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(150,180,255,0.15)"/>`; });
    const masked = opts.masked || {};
    const vals = keys.map((k) => (masked[k] ? 0.5 : (b5[k] || 0) / 10));
    const anyMask = keys.some((k) => masked[k]);
    g += `<polygon points="${vals.map((v, i) => pt(i, v).join(',')).join(' ')}" fill="${anyMask ? 'rgba(120,120,140,0.25)' : 'rgba(45,226,230,0.28)'}" stroke="${anyMask ? '#778' : '#2de2e6'}" stroke-width="1.5" ${anyMask ? 'stroke-dasharray="3 3"' : ''}/>`;
    keys.forEach((k, i) => { if (masked[k]) return; const [x, y] = pt(i, vals[i]); g += `<circle cx="${x}" cy="${y}" r="${size > 80 ? 3.5 : 2}" fill="${UI.TRAIT_COLORS[k]}"/>`; });
    if (opts.labels) keys.forEach((k, i) => {
      const [x, y] = pt(i, 1.28);
      g += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${UI.TRAIT_COLORS[k]}">${k} ${masked[k] ? '?' : b5[k]}</text>`;
    });
    return `<svg class="penta" width="${size}" height="${size + (opts.labels ? 6 : 0)}" viewBox="0 0 ${size} ${size + (opts.labels ? 6 : 0)}">${g}</svg>`;
  };

  UI.bar = function (label, val, max, cls, title) {
    const pct = Math.max(0, Math.min(100, (val / max) * 100));
    return `<div class="bar ${cls || ''}" ${title ? `data-tip="${esc(title)}"` : ''}><span class="bl">${label}</span><span class="bt"><i style="width:${pct}%"></i></span><span class="bv">${Math.round(val)}</span></div>`;
  };

  UI.riskChip = function (cat) { return `<span class="risk-chip" style="--rc:${VB.RISK_COLORS[cat]}">${cat.toUpperCase()}</span>`; };
  UI.pips = function (p, cat) {
    const e = p.exposure || 0, due = cat && VB.injuryDue(p, cat);
    let h = '';
    for (let i = 0; i < 3; i++) h += `<i class="${i < e ? 'on' : ''} ${due && i >= e ? 'next' : ''}"></i>`;
    return `<span class="pips ${due ? 'due' : ''}" data-tip="Injury exposure ${e}/3. Each match at HIGH risk adds 1 (VERY HIGH adds 2). LOW risk or rest removes 1. At 3 the player gets injured.${due ? ' ⚠ If they play at this risk level, they WILL get hurt.' : ''}">${h}</span>`;
  };

  // ---------- Mini card (board) ----------
  UI.miniCard = function (p, state, ctx) {
    ctx = ctx || {};
    const out = VB.isOut(p);
    const role = ctx.slotRole || p.role;
    const rk = VB.risk(p, { opp: ctx.opp }, role);
    const ovr = VB.ovr(p, role);
    const offRole = role !== p.role;
    const hist = p.history.map((h) => `<span class="hi ${h.cleared ? 'cleared' : ''}" data-tip="${esc(VB.INJURIES[h.type].name + (h.cleared ? ' (rehabbed)' : ' — not fully rehabbed'))}">${VB.INJURIES[h.type].icon}</span>`).join('');
    const cls = ['pcard', 'mini', `role-${p.role}`, out ? 'out' : '', ctx.selected ? 'selected' : '', ctx.target || '', p.rest ? 'resting' : ''].join(' ');
    return `<div class="${cls}" data-id="${p.id}" draggable="true">
      <div class="pc-top"><span class="num">${p.num}</span><span class="nm">${esc(p.name)}</span><span class="rl ${offRole ? 'off' : ''}" data-tip="${offRole ? `Natural ${VB.ROLES[p.role].name} playing ${VB.ROLES[role].name}: −10` : VB.ROLES[p.role].desc}">${p.role}</span></div>
      <div class="pc-mid">${UI.pentagon(p.b5, 52)}<div class="pc-stats"><div><b>${ovr}</b><small> OVR</small></div><div>${r1(VB.ppg(p))}<small> PPG</small></div><div>${r1(VB.apg(p))}<small> APG</small></div><div><small>AGE </small>${p.age}</div></div>
      <div class="pc-bars">${UI.bar('HP', p.health, 100, 'hp', 'Overall health')}${UI.bar('FT', p.fatigue, 100, 'ft', 'Fatigue')}${UI.bar('ST', p.strain, 100, p.strain >= 70 ? 'st warn' : 'st', 'Strain — cumulative load. 100 = overuse injury')}${UI.bar('SS', p.stress, 100, p.stress >= 60 ? 'ss warn' : 'ss', 'Stress. 60+ raises injury likelihood')}</div></div>
      <div class="pc-foot"><span class="hist">${hist || '<span class="hi none">no injuries</span>'}</span>${out ? '' : UI.pips(p, rk.cat) + UI.riskChip(rk.cat)}</div>
      ${out ? `<div class="ribbon">OUT ${p.injury.nonlinear ? '?' : p.injury.weeks} WK<small>${esc(VB.INJURIES[p.injury.type].name)}</small></div>` : ''}
      ${p.rest ? '<div class="badge rest">REST</div>' : ''}
      ${p.niggle ? '<div class="badge niggle" data-tip="Niggle: minor pain. Likelihood +1">!</div>' : ''}
      ${p.prehab ? `<div class="badge prehab" data-tip="Prehab active ${p.prehab} wk">P</div>` : ''}
      ${p.ppe ? '<div class="badge ppe" data-tip="Protective gear fitted">G</div>' : ''}
      ${ctx.preview ? `<div class="preview ${ctx.preview.cls}">${ctx.preview.text}</div>` : ''}
    </div>`;
  };

  // ---------- Risk matrix ----------
  UI.riskMatrix = function (L, S) {
    let h = '<div class="rmatrix"><div class="rm-y">LIKELIHOOD ↑</div><div class="rm-grid">';
    for (let l = 5; l >= 1; l--) for (let s = 1; s <= 5; s++) {
      const cat = VB.RISK_TABLE[l][s - 1];
      h += `<i style="background:${VB.RISK_COLORS[cat]}" class="${l === L && s === S ? 'on' : ''}"></i>`;
    }
    return h + '</div><div class="rm-x">SEVERITY →</div></div>';
  };
  UI.riskPanel = function (p, state, opp, role) {
    const rk = VB.risk(p, { opp }, role);
    const fl = (f) => `<li class="${f.d > 0 ? 'up' : 'down'}"><span class="tag ${f.kind}">${f.kind === 'internal' ? 'INT' : 'EXT'}</span>${esc(f.label)} <b>${f.base ? 'base ' + f.d : (f.d > 0 ? '+' : '') + f.d}</b></li>`;
    return `<div class="riskpanel">
      <div class="rp-head">INJURY RISK ${UI.riskChip(rk.cat)} ${UI.pips(p, rk.cat)}<span class="formula" data-tip="${esc(VB.CONCEPTS.risk.text)}">risk = likelihood × severity</span></div>
      <div class="rp-exp ${VB.injuryDue(p, rk.cat) ? 'due' : ''}">${VB.injuryDue(p, rk.cat) ? `⚠ Exposure ${p.exposure || 0}/3 — playing at ${rk.cat.toUpperCase()} risk means an injury. Lower likelihood or severity, or bench them.` : `Exposure ${p.exposure || 0}/3 · this match at ${rk.cat} risk: ${VB.EXPOSURE_INC[rk.cat] > 0 ? '+' + VB.EXPOSURE_INC[rk.cat] : VB.EXPOSURE_INC[rk.cat] < 0 ? '−1' : 'no change'}`}</div>
      <div class="rp-body">${UI.riskMatrix(rk.L.level, rk.S.level)}
        <div class="rp-lists"><div><b>Likelihood ${rk.L.level} · ${VB.LIKELIHOOD_NAMES[rk.L.level]}</b><ul>${rk.L.factors.map(fl).join('') || '<li class="none">base 1 — no risk factors</li>'}</ul></div>
        <div><b>Severity ${rk.S.level} · ${VB.SEVERITY_NAMES[rk.S.level]}</b>${opp ? '' : '<small> (next opponent unknown)</small>'}<ul>${rk.S.factors.map(fl).join('')}</ul></div></div></div></div>`;
  };

  // ---------- Big detail card ----------
  UI.bigCard = function (p, state, opts) {
    opts = opts || {};
    const opp = opts.opp;
    const role = opts.slotRole || p.role;
    const masked = opts.masked || {};
    const m = (k, v) => (masked[k] ? '<span class="mask">?</span>' : v);
    const ss = p.seasonStats[state.season] || { gp: 0, pts: 0, ast: 0 };
    const hist = p.history.length ? p.history.map((h) => {
      const d = VB.INJURIES[h.type];
      return `<li><span class="hi ${h.cleared ? 'cleared' : ''}">${d.icon}</span>${esc(d.name)} <small class="${d.kind}">${d.kind}</small> ${h.cleared ? '<em class="ok">rehabbed</em>' : `<em class="warn">re-injury risk${h.rehab ? ` · rehab ${h.rehab}/2` : ''}</em>`}</li>`;
    }).join('') : '<li class="none">No injury history</li>';
    const front = `<div class="bc-face front">
      <div class="bc-head"><div class="bc-num">${p.num}</div><div><div class="bc-name">${esc(p.name)}</div><div class="bc-sub">${VB.ROLES[p.role].name} · Age ${p.age}${role !== p.role ? ` · <span class="warn">playing ${VB.ROLES[role].name}</span>` : ''}</div></div><div class="bc-ovr">${m('T', VB.ovr(p, role))}<small>OVR</small></div></div>
      <div class="bc-row">${UI.pentagon(p.b5, 168, { labels: true, masked })}
        <div class="bc-stats">
          <div class="kv"><span>PPG</span><b>${r1(VB.ppg(p))}</b></div><div class="kv"><span>APG</span><b>${r1(VB.apg(p))}</b></div>
          <div class="kv"><span>Season</span><b>${ss.pts}p / ${ss.ast}a</b></div>
          <div class="sk">${['sht', 'pas', 'def', 'fit'].map((k) => `<div><small>${k.toUpperCase()}</small><b>${m('T', Math.round(p.sk[k]))}</b></div>`).join('')}</div>
        </div></div>
      <div class="bc-bars">${UI.bar('Health', masked.T ? 50 : p.health, 100, 'hp')}${UI.bar('Fatigue', p.fatigue, 100, 'ft')}${UI.bar('Strain', p.strain, 100, p.strain >= 70 ? 'st warn' : 'st', 'Cumulative load. Reaching 100 causes an overuse (chronic) injury.')}${UI.bar('Stress', p.stress, 100, p.stress >= 60 ? 'ss warn' : 'ss', 'Psychological risk factor. ≥60 raises injury likelihood.')}</div>
      <div class="bc-hist"><b>Injury history</b>${masked.L ? '<ul><li class="mask">? — scout Lifetime history</li></ul>' : `<ul>${hist}</ul>`}
        ${p.injury && p.injury.weeks > 0 ? `<div class="cur-inj">OUT: ${esc(VB.INJURIES[p.injury.type].name)} — ${p.injury.nonlinear ? 'recovery not linear (?)' : p.injury.weeks + ' wk'} · rehab ${p.injury.rehab}/2</div>` : ''}</div>
      ${opts.noRisk ? '' : UI.riskPanel(p, state, opp, role)}
    </div>`;
    const beh = VB.behaviours(p).map((b) => {
      const hide = (b.trait === 'MT' && masked.S) || (b.trait !== 'MT' && masked[b.trait]);
      return `<div class="beh ${b.bad ? 'bad' : ''}"><span class="bt-t" style="color:${UI.TRAIT_COLORS[b.trait]}">${b.trait}</span><span class="bt-l">${b.label}</span><span class="bt-bar"><i style="width:${hide ? 0 : b.pct}%;background:${UI.TRAIT_COLORS[b.trait]}"></i></span><b>${hide ? '?' : b.pct + '%'}</b></div>`;
    }).join('');
    const tp = Object.entries(p.traitProgress).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}/3`).join(' · ');
    const back = `<div class="bc-face back">
      <div class="bc-head"><div class="bc-num">${p.num}</div><div><div class="bc-name">${esc(p.name)}</div><div class="bc-sub">Mental profile</div></div></div>
      <div class="sect"><b>Mental toughness — the 4Cs</b>
        ${['control', 'commitment', 'challenge', 'confidence'].map((k) => UI.bar(k[0].toUpperCase() + k.slice(1), masked.S ? 0 : p.mt[k], 10, 'mt', VB.CONCEPTS.fourCs.text)).join('')}
        ${UI.bar('Self-compassion', masked.S ? 0 : p.sc, 10, 'sc', VB.CONCEPTS.self_compassion.text)}
      </div>
      <div class="sect"><b>Personality → behaviour likelihood</b><small class="muted"> traits make behaviour likely, not certain</small>${beh}</div>
      ${tp ? `<div class="sect"><b>Trait challenges in progress</b><div class="muted">${tp}</div></div>` : ''}
      ${p.note ? `<div class="note">“${esc(p.note)}”</div>` : ''}
    </div>`;
    return `<div class="bigcard ${opts.flipped ? 'flipped' : ''}"><div class="bc-inner">${front}${back}</div></div>`;
  };

  // ---------- Training card ----------
  UI.KIND_LABEL = { physical: 'PHYSICAL', psych: 'PSYCH · PST', recovery: 'RECOVERY', rehab: 'REHAB', trait: 'PERSONALITY' };
  UI.trainingCard = function (key, idx, state, selected) {
    const c = VB.CARDS[key];
    const con = VB.CONCEPTS[c.concept];
    const afford = state.focus >= c.cost;
    return `<div class="tcard kind-${c.kind} ${selected ? 'selected' : ''} ${afford ? '' : 'cant'}" data-idx="${idx}">
      <div class="tc-cost">${c.cost}</div><div class="tc-kind">${UI.KIND_LABEL[c.kind]}${c.target === 'team' ? ' · TEAM' : ''}</div>
      <div class="tc-name">${esc(c.name)}</div><div class="tc-desc">${esc(c.desc)}</div>
      <div class="tc-con">${con.ref} · ${esc(con.name)}</div></div>`;
  };

  // ---------- Synergy panel ----------
  UI.synergyPanel = function (state) {
    const syn = state.synergy;
    const bars = ['O', 'C', 'E', 'A', 'N'].map((k) => `<div class="tb"><span style="color:${UI.TRAIT_COLORS[k]}">${k}</span><span class="tb-t"><i style="height:${syn.avg[k] * 10}%;background:${UI.TRAIT_COLORS[k]}"></i></span><b>${r1(syn.avg[k])}</b></div>`).join('');
    const auras = syn.auras.length ? syn.auras.map((a) => `<div class="aura ${a.good ? 'good' : 'bad'}"><b>${a.good ? '▲' : '▼'} ${esc(a.name)}</b><span>${esc(a.desc)}</span><small>${VB.CONCEPTS[a.concept].ref}</small></div>`).join('') : '<div class="muted">No team auras. Your starting nine is a mixed bag — no trait is high or low enough across the team.</div>';
    const links = syn.links.map((l) => `<div class="link-row ${l.type}"><i></i>${esc(l.label)}</div>`).join('');
    return `<div class="synergy">
      <div class="syn-head"><h3>TEAM CHEMISTRY</h3><div class="chem ${syn.chem >= 0 ? 'pos' : 'neg'}">${syn.chem >= 0 ? '+' : ''}${syn.chem}</div></div>
      <div class="muted small">Averages of your starting nine. Team mixes create auras; neighbours on the board form links.</div>
      <div class="traitbars">${bars}</div>
      <h4>Auras</h4>${auras}
      ${links ? `<h4>Board links</h4>${links}` : ''}
      <div class="muted small" style="margin-top:8px">Tip: drag cards to rearrange. Neighbours matter.</div>
    </div>`;
  };

  // ---------- Top bar ----------
  UI.topbar = function (state, extra) {
    const opp = VB.currentOpponent(state);
    const rec = state.record[state.season];
    const out = VB.outCount(state);
    const sched = state.phase === 'camp' ? 'SUMMER CAMP' : state.week > VB.weeksInSeason(state) || state.phase === 'offseason' ? `OFFSEASON ${state.season}→${state.season + 1}` : `SEASON ${state.season} · WEEK ${state.week}/${VB.weeksInSeason(state)}`;
    const dots = Array.from({ length: state.focusMax }, (_, i) => `<i class="${i < state.focus ? 'on' : ''}"></i>`).join('');
    return `<div class="tb-left"><span class="logo">VAULTBALL</span><span class="sched">${sched}</span><span class="rec">${rec.w}–${rec.l}</span></div>
      <div class="tb-mid">${opp && state.phase !== 'camp' ? `<span class="vs">vs</span> <b style="color:#${opp.color.toString(16).padStart(6, '0')}">${esc(opp.name)}</b> <span class="chip ${VB.SURFACES[opp.surface].artificial ? 'warn' : ''}" data-tip="${esc(VB.SURFACES[opp.surface].desc)}">${VB.SURFACES[opp.surface].name}</span>${opp.aggressive ? '<span class="chip warn" data-tip="Aggressive opponent: severity +1">Aggressive</span>' : ''}<span class="chip">${opp.home ? 'Home' : 'Away'}</span><span class="chip">Rating ${opp.rating}</span>` : ''}</div>
      <div class="tb-right">${extra || ''}<span class="focus" data-tip="Focus: coach time to spend on training cards each week">FOCUS <span class="dots">${dots}</span></span>
      <span class="outc ${out >= 2 ? 'danger' : out ? 'warn' : ''}" data-tip="Players currently injured. 3 at once = the team collapses.">OUT ${out}/3</span>
      <button class="btn ghost small" id="btn-notebook" data-act="notebook">📓 Notebook <span class="nb-count">${state.notebook.length}</span></button></div>`;
  };

  // ---------- Notebook ----------
  UI.notebook = function (state) {
    const all = Object.keys(VB.CONCEPTS);
    const groups = { 'C.1.1 Personality': [], 'C.1.2 Mental toughness': [], 'B.3 Injury': [] };
    all.forEach((k) => { const c = VB.CONCEPTS[k]; const g = c.ref.startsWith('C.1.1') ? 'C.1.1 Personality' : c.ref.startsWith('C.1.2') ? 'C.1.2 Mental toughness' : 'B.3 Injury'; groups[g].push(k); });
    let h = `<div class="nb-wrap"><div class="nb-head"><h2>COACH'S NOTEBOOK</h2><span>${state.notebook.length}/${all.length} discovered</span><button class="btn ghost" id="nb-close" data-act="nb-close">Close ✕</button></div><div class="nb-cols">`;
    Object.entries(groups).forEach(([g, ks]) => {
      h += `<div class="nb-col"><h3>${g}</h3>`;
      ks.forEach((k) => { const c = VB.CONCEPTS[k]; const got = state.notebook.includes(k); h += `<div class="nb-item ${got ? '' : 'locked'}"><b>${got ? esc(c.name) : '???'}</b><span>${got ? esc(c.text) : 'Not discovered yet. Keep coaching.'}</span></div>`; });
      h += '</div>';
    });
    return h + '</div></div>';
  };

  // ---------- Toasts / tooltip / modal / dialog ----------
  UI.toast = function (html, cls, ms) {
    const t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.innerHTML = html;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, ms || 4200);
  };
  UI.modal = function (html, cls) {
    const m = $('#modal'); m.className = 'modal ' + (cls || ''); m.innerHTML = `<div class="modal-box">${html}</div>`;
    return m;
  };
  UI.closeModal = function () { const m = $('#modal'); m.className = 'hidden'; m.innerHTML = ''; };

  UI.say = function (lines) {
    lines = Array.isArray(lines) ? lines : [lines];
    const d = $('#dialog'), tx = $('.dlg-text', d);
    return new Promise((res) => {
      let i = 0, typing = null;
      const show = () => {
        const full = lines[i]; let n = 0; tx.textContent = '';
        VB.Arena.speak && VB.Arena.speak(true);
        clearInterval(typing);
        typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; VB.Arena.speak && VB.Arena.speak(false); } }, 18);
      };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; tx.textContent = lines[i]; VB.Arena.speak && VB.Arena.speak(false); return; }
        i++;
        if (i >= lines.length) { d.classList.add('hidden'); d.removeEventListener('click', next); VB.Arena.speak && VB.Arena.speak(false); res(); return; }
        show();
      };
      d.classList.remove('hidden');
      d.addEventListener('click', next);
      show();
    });
  };

  // Global hover tooltips for [data-tip]
  UI.initTooltips = function () {
    const tip = $('#tooltip');
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-tip]');
      if (!el) { tip.classList.add('hidden'); return; }
      tip.innerHTML = esc(el.getAttribute('data-tip'));
      tip.classList.remove('hidden');
    });
    document.addEventListener('mousemove', (e) => {
      if (tip.classList.contains('hidden')) return;
      const x = Math.min(window.innerWidth - tip.offsetWidth - 10, e.clientX + 14);
      const y = Math.min(window.innerHeight - tip.offsetHeight - 10, e.clientY + 16);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
  };
})();
