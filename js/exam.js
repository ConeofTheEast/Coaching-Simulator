/* Vaultball Coach — exam-style questions: typed answers, markscheme, auto-suggested marking points, self-assessment.
   Data lives in js/examdata.js (VB.EXAMDATA). The auto-suggest is a keyword hint only; the student confirms each point
   against the markscheme, the way IB examiners award marks point by point. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const norm = (s) => ' ' + String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9%.'×/ -]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  // a keyword matches at a word start (so "fatigu" matches "fatigued" but "age" doesn't match "damage")
  const has = (text, kw) => { kw = String(kw).toLowerCase().trim(); if (!kw) return false; return text.includes(' ' + kw) || (/^[^a-z]/.test(kw) && text.includes(kw)); };

  VB.Exam = {
    get(id) { return (VB.EXAMDATA || {})[id] || null; },
    // indices of marking points whose every keyword group is matched
    suggest(q, answer) {
      const t = norm(answer);
      if (t.trim().length < 3) return [];
      return q.points.map((p, i) => ((p.k || []).length && p.k.every((g) => g.some((kw) => has(t, kw))) ? i : -1)).filter((i) => i >= 0);
    },
    // apply group caps, then the overall max
    score(q, ticked) {
      const set = new Set(ticked);
      let total = 0;
      const inGroup = new Set();
      (q.groups || []).forEach((g) => { const n = g.points.filter((i) => set.has(i)).length; total += Math.min(n, g.max); g.points.forEach((i) => inGroup.add(i)); });
      q.points.forEach((p, i) => { if (!inGroup.has(i) && set.has(i)) total++; });
      return Math.min(total, q.max || q.marks);
    },
  };

  // ---------- concept tooltip (hover on desktop, tap on touch) ----------
  function tipHTML(id) {
    const k = VB.CONCEPTS[id]; if (!k) return '';
    const x = VB.Exam.get(id);
    return `<div class="ct-h"><small>${esc(k.ref)}</small><b>${esc(k.name)}</b></div><p>${esc(k.text)}</p>${x && x.more ? `<p class="ct-more">${esc(x.more)}</p>` : ''}<div class="ct-f">📓 More + an exam question in the Coach's Notebook</div>`;
  }
  function place(tip, el) {
    const r = el.getBoundingClientRect();
    tip.style.left = '0px'; tip.style.top = '0px';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    let y = r.top - h - 8; if (y < 8) y = Math.min(window.innerHeight - h - 8, r.bottom + 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  VB.initConceptTips = function () {
    const tip = document.createElement('div'); tip.id = 'ctip'; document.body.appendChild(tip);
    let cur = null;
    const show = (el) => { cur = el; tip.innerHTML = tipHTML(el.dataset.concept); tip.classList.add('on'); place(tip, el); };
    const hide = () => { cur = null; tip.classList.remove('on'); };
    document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-concept]'); if (el && el !== cur) show(el); else if (!el && cur) hide(); });
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-concept]');
      if (e.pointerType !== 'mouse' && el) { if (cur === el) hide(); else show(el); return; }
      if (!el) hide();
    }, true);
    window.addEventListener('scroll', hide, true);
  };
  VB.conceptAttr = (id) => (VB.CONCEPTS[id] ? `data-concept="${id}" tabindex="0"` : '');

  // ---------- question rendering + answering ----------
  function tableHTML(d) {
    if (!d) return '';
    return `<div class="xtable"><div class="xcap">${esc(d.caption || '')}</div><table><thead><tr>${d.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${d.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  VB.Exam.questionHTML = function (q) {
    const stem = esc(q.stem).replace(new RegExp(esc(q.term), 'i'), (m) => `<b class="cterm">${m}</b>`);
    return `<div class="xq">
      <div class="xsrc ${q.official ? 'off' : 'gen'}">${q.official ? '★ Official IB specimen item · ' + esc(q.src) : '✎ Generated in IB style · not an official IB question'}${q.paper ? ' · ' + esc(q.paper) : ''}</div>
      ${q.context ? `<p class="xctx">${esc(q.context)}</p>` : ''}${tableHTML(q.data)}
      <div class="xstem">${stem} <span class="xmarks">[${q.marks}]</span></div>
      ${VB.TERMS[q.term] ? `<div class="xterm"><b>${esc(q.term)}</b>: ${esc(VB.TERMS[q.term].def)}</div>` : ''}
    </div>`;
  };

  // Mount an answer widget into `root`. onDone({got, max, answer}) fires when the student saves the mark.
  VB.Exam.mount = function (root, id, opts) {
    opts = opts || {};
    const x = VB.Exam.get(id); if (!x) { root.innerHTML = '<p class="muted">No exam item for this concept yet.</p>'; return; }
    const q = x.q;
    root.innerHTML = `${VB.Exam.questionHTML(q)}
      <textarea class="xans" rows="${Math.max(4, q.marks * 2)}" placeholder="Type your answer. Aim for one clear point per mark (${q.marks} mark${q.marks > 1 ? 's' : ''})."></textarea>
      <div class="xlive small muted"></div>
      <div class="modal-btns"><button class="btn primary" data-x="mark">Check against the markscheme ▸</button></div>
      <div class="xms"></div>`;
    const ta = root.querySelector('.xans'), live = root.querySelector('.xlive'), ms = root.querySelector('.xms');
    const words = () => (ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0);
    ta.addEventListener('input', () => { const n = VB.Exam.suggest(q, ta.value).length; live.textContent = `${words()} words · looks like ${n} marking point${n === 1 ? '' : 's'} so far`; });
    root.querySelector('[data-x=mark]').onclick = () => {
      const hits = new Set(VB.Exam.suggest(q, ta.value));
      const grp = {}; (q.groups || []).forEach((g) => g.points.forEach((i) => (grp[i] = g)));
      let lastG = null;
      const rows = q.points.map((p, i) => {
        const g = grp[i]; let head = '';
        if (g && g !== lastG) { head = `<div class="xgrp">${esc(g.label)} <small>[${g.max} max]</small></div>`; lastG = g; } else if (!g && lastG) { head = '<div class="xgrp"></div>'; lastG = null; }
        return `${head}<label class="xpt ${hits.has(i) ? 'sug' : ''}"><input type="checkbox" data-i="${i}" ${hits.has(i) ? 'checked' : ''}/><span>${esc(p.t)}</span>${hits.has(i) ? '<em>suggested</em>' : ''}</label>`;
      }).join('');
      ms.innerHTML = `<div class="xmsbox"><h4>Markscheme <small>[${q.max || q.marks} max]</small></h4>
        <p class="small muted">Tick each point your answer really makes. Highlighted points are keyword <b>suggestions</b>, so check them: a mark needs the idea, not just the word.</p>
        ${rows}${q.notes ? `<div class="xnotes"><b>Notes:</b> ${esc(q.notes)}</div>` : ''}
        <div class="xscore">Your mark: <b class="xgot">0</b> / ${q.max || q.marks}</div>
        <details class="xmodel"><summary>Show a model answer</summary><p>${esc(q.model || '')}</p></details>
        <div class="modal-btns"><button class="btn primary" data-x="save">${opts.saveLabel || 'Save my mark'}</button></div></div>`;
      const upd = () => { const t = [...ms.querySelectorAll('input:checked')].map((c) => +c.dataset.i); ms.querySelector('.xgot').textContent = VB.Exam.score(q, t); };
      ms.querySelectorAll('input').forEach((c) => (c.onchange = upd)); upd();
      ms.querySelector('[data-x=save]').onclick = () => {
        const t = [...ms.querySelectorAll('input:checked')].map((c) => +c.dataset.i);
        const got = VB.Exam.score(q, t);
        opts.onDone && opts.onDone({ got, max: q.max || q.marks, answer: ta.value, auto: hits.size });
      };
      ms.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  };
})();
