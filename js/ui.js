/* Vaultball Coach — UI helpers (DOM only). */
(function () {
  const VB = globalThis.VB;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Big Five reference (textbook C.1.1 descriptors) ----------
  VB.B5INFO = {
    O: { name: 'Openness', color: '#b388ff',
      def: 'Openness (to experience) describes how much a person seeks out new experiences, ideas and ways of doing things.',
      desc: ['originality', 'need for variety', 'curiosity'],
      high: 'Imaginative, curious, likes variety, happy to try a new tactic or training method.',
      low: 'Prefers the familiar, practical and routine. Likes repetition and proven methods.',
      sport: 'A high-O player volunteers to try a new position. A low-O player wants the same warm-up every week.',
      effect: (v) => v >= 7 ? `Mental-skills training works better for this player (×${(0.6 + v * 0.08).toFixed(2)}).` : v <= 3 ? `Sceptical of new methods: mental-skills gains are smaller (×${(0.6 + v * 0.08).toFixed(2)}).` : `Average response to mental-skills training (×${(0.6 + v * 0.08).toFixed(2)}).`,
      look: 'Sprite cue: hairstyle and hair colour. Bold cuts and neon colours = high Openness.' },
    C: { name: 'Conscientiousness', color: '#3ddc84',
      def: 'Conscientiousness describes how organised, careful and self-disciplined a person is in working towards goals.',
      desc: ['constraint', 'achievement striving', 'self-discipline'],
      high: 'Organised, reliable, plans ahead, sticks to the training plan.',
      low: 'Spontaneous, disorganised, more likely to cut corners or skip sessions.',
      sport: 'A high-C player does every rep of their rehab. A low-C player "forgets" the cool-down. Very high C with high N can tip into maladaptive perfectionism.',
      effect: (v) => v >= 6 ? 'Usually completes weekly drills and rehab in full.' : v >= 4 ? 'Sometimes only half-completes drills, so gains are smaller.' : 'Often skips drills and rehab. Choose orders that matter most.',
      look: 'Sprite cue: kit. Tucked shirt and neat visor = high C. Untucked, jagged hem and odd socks = low C.' },
    E: { name: 'Extraversion', color: '#ffd23f',
      def: 'Extraversion describes how much a person is energised by other people and seeks social contact and stimulation. The opposite is introversion.',
      desc: ['enthusiasm', 'sociability', 'assertiveness'],
      high: 'Talkative, energetic, enjoys the spotlight, takes charge of the huddle.',
      low: 'Introverted: reserved, quieter, prefers working alone or in small groups. Not the same as shy.',
      sport: 'Extraverts often call the plays and lift team energy, and they enjoy group training. Introverts may prefer individual sessions.',
      effect: (v) => v >= 7 ? 'Enjoys team drills (better adherence). Lifts team energy (Loud Floor aura when many are high).' : v <= 3 ? 'Quiet on court. A team full of introverts can go silent (Silent Floor aura).' : 'Average energy on court.',
      look: 'Sprite cue: posture. Arms out and wide stance = high E. Arms crossed and head dipped = low E.' },
    A: { name: 'Agreeableness', color: '#5bb6ff',
      def: 'Agreeableness describes how cooperative, trusting and caring a person is towards others.',
      desc: ['amiability', 'altruism', 'modesty'],
      high: 'Friendly, helpful, cooperative, puts the team first.',
      low: 'Competitive, sceptical of others, can be argumentative or selfish with the ball.',
      sport: 'A high-A player makes the extra pass for an assist. A low-A player shoots when a teammate is open.',
      effect: (v) => v >= 7 ? 'More assists. Many high-A players create the Glue aura (chemistry up).' : v <= 3 ? 'Ball-hog risk: fewer assists, more arguments (Friction aura when many are low).' : 'Average teamwork.',
      look: 'Sprite cue: face. Rounder face and warm smile = high A. Hard jaw and flat smirk = low A. High-A players lean toward teammates.' },
    N: { name: 'Neuroticism', color: '#ff5e7a',
      def: 'Neuroticism describes how often a person experiences negative emotions. The opposite end is emotional stability.',
      desc: ['nervousness', 'anxiety', 'anger'],
      high: 'Worries a lot, gets anxious or angry under pressure, finds stress hard to shake off.',
      low: 'Emotionally stable: calm, even-tempered, recovers quickly from setbacks.',
      sport: 'A high-N player may freeze in the last minute of a close game. Stress and poor sleep also raise injury risk.',
      effect: (v) => v >= 7 ? `Less time on clutch questions in close finishes (−${((v - 6) * 1.5).toFixed(1)} s). Stress builds faster after losses.` : v <= 3 ? 'Composed in the clutch. No timer penalty.' : 'Mostly composed under pressure.',
      look: 'Sprite cue: brows and mouth. Raised inner brows, tight wobbly mouth, sweat and a slight jitter = high N.' },
  };

  const UI = {
    $, esc,
    sprite(p, opts) { return VB.spriteSVG(p, Object.assign({ num: p.num }, opts || {})); },
    riskChip(r) {
      const lab = r.cat === 'out' ? 'OUT' : r.cat.toUpperCase() + ' RISK';
      const col = r.cat === 'out' ? '#8a8fa8' : VB.RISK_COLORS[r.cat];
      return `<span class="rchip" style="--c:${col}">${lab}</span>`;
    },
    b5Bars(p, opts) {
      opts = opts || {};
      const keys = ['O', 'C', 'E', 'A', 'N'];
      const vals = opts.vals || p.b5;
      return `<div class="b5">${keys.map((k) => {
        const v = vals[k];
        const hidden = v == null;
        return `<button class="b5row" data-act="trait" data-t="${k}" data-pid="${p.id}" title="What is ${VB.B5INFO[k].name}?">
          <span class="b5k" style="color:${VB.B5INFO[k].color}">${k}</span><span class="b5n">${VB.B5INFO[k].name}</span>
          <span class="b5bar"><i style="width:${hidden ? 0 : v * 10}%;background:${VB.B5INFO[k].color}"></i></span><span class="b5v">${hidden ? '?' : v}</span><span class="b5i">ⓘ</span></button>`;
      }).join('')}</div>`;
    },
    traitDialog(p, k) {
      const I = VB.B5INFO[k], v = p.b5[k];
      const known = !p.known || p.known.all || p.known.O;
      return `<div class="tdlg">
        <div class="tdhead" style="--c:${I.color}"><span class="tdk">${k}</span><div><h3>${I.name}</h3><div class="tddesc">${I.desc.map((d) => `<span>${d}</span>`).join('')}</div></div><button class="x" data-act="close-modal">✕</button></div>
        <p class="tddef">${I.def}</p>
        <div class="tdgrid"><div class="hi"><b>High</b><p>${I.high}</p></div><div class="lo"><b>Low</b><p>${I.low}</p></div></div>
        <p class="tdsport"><b>In sport:</b> ${I.sport}</p>
        ${known ? `<div class="tdplayer"><div class="tdspr">${UI.sprite(p, { bust: true })}</div><div><b>${esc(p.name)}: ${v}/10</b><div class="tdscale"><i style="left:${(v - 1) * 11.1}%"></i></div><p>${I.effect(v)}</p></div></div>` : ''}
        <p class="tdlook">${I.look}</p>
        <p class="tdnote">Big Five traits are relatively stable patterns, so they make behaviour <i>likely</i>, not certain (traits vs states). They can shift slowly when a person repeatedly completes trait-typical challenges.</p>
      </div>`;
    },
    modal(html, cls) {
      const m = $('#modal');
      m.innerHTML = `<div class="mbox ${cls || ''}">${html}</div>`;
      m.classList.add('on');
    },
    closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; },
    toast(text, tone) {
      const t = document.createElement('div');
      t.className = 'toast ' + (tone || '');
      t.textContent = text;
      $('#toasts').appendChild(t);
      setTimeout(() => t.classList.add('out'), 3200);
      setTimeout(() => t.remove(), 3800);
    },
    say(lines) {
      // Commissioner dialog with typewriter; resolves when clicked through
      const d = $('#dialog');
      return new Promise((resolve) => {
        let i = 0, typing = null, full = '';
        const show = () => {
          full = lines[i]; let n = 0;
          d.innerHTML = `<div class="who">THE COMMISSIONER</div><div class="txt"></div><div class="more">click ▸</div>`;
          const tx = d.querySelector('.txt');
          clearInterval(typing);
          typing = setInterval(() => { n += 2; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 18);
          VB.Arena && VB.Arena.speak && VB.Arena.speak(true);
        };
        const next = () => {
          if (typing) { clearInterval(typing); typing = null; d.querySelector('.txt').textContent = full; return; }
          i++;
          if (i >= lines.length) { d.classList.remove('on'); d.removeEventListener('click', next); VB.Arena && VB.Arena.speak && VB.Arena.speak(false); resolve(); return; }
          show();
        };
        d.classList.add('on');
        d.addEventListener('click', next);
        show();
      });
    },
  };
  VB.UI = UI;
})();
