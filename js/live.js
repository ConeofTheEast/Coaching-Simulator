/* Vaultball Coach — playable key drives (Madden-style). 2.5D perspective field, 2D neon sprites.
   Attack: move the ball carrier, pass, shoot. Defence: switch, steal, contest.
   Every shot and every long/risky pass asks a command-term question (harder play = harder term). */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = () => Math.random(); // live play uses real randomness; the season model stays seeded
  const HOOP_Z = 92, HALF_W = 26, ARC = 24, FIELD_END = 100;
  const OUR = '#3dfcff', OUR_ACC = '#ff3df0';

  VB.isTouch = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

  VB.PLAYS = {
    attack: [
      { id: 'flood', name: 'Lane Flood', icon: '⇈', desc: 'Strikers sprint deep in all three lanes. Big passing lanes, so expect long, risky passes and harder questions.' },
      { id: 'vault', name: 'Pick & Vault', icon: '◠', desc: 'Strikers set screens and a Link curls to the arc for a 3-point vault.' },
      { id: 'push', name: 'Anchor Push', icon: '▲', desc: 'Anchors lead-block. You carry the ball yourself and take short, safer shots.' },
    ],
    defense: [
      { id: 'zone', name: 'Zone Wall', icon: '▬', desc: 'Pack the paint. Close shots get hard, but long shots stay open.' },
      { id: 'press', name: 'Man Press', icon: '⇄', desc: 'Tight marking everywhere. Steals are easier, but one beaten defender leaves a gap.' },
      { id: 'blitz', name: 'Blitz', icon: '✶', desc: 'Three defenders rush the ball. More tackles, but open receivers downfield.' },
    ],
  };

  // Tiny chalkboard diagrams for the play-call cards (top = hoop)
  VB.playDiagram = function (id) {
    const O = (x, y, c) => `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${c || '#3dfcff'}" stroke-width="1.6"/>`;
    const X = (x, y) => `<path d="M${x - 3.5} ${y - 3.5}l7 7m0 -7l-7 7" stroke="#ff3df0" stroke-width="1.6"/>`;
    const A = (d, c) => `<path d="${d}" fill="none" stroke="${c || '#ffd23f'}" stroke-width="1.6" marker-end="url(#ah)" stroke-linecap="round"/>`;
    const base = '<defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6z" fill="#ffd23f"/></marker></defs>'
      + '<rect x="1" y="1" width="118" height="78" rx="6" fill="rgba(0,0,0,.25)" stroke="rgba(120,140,255,.35)"/><path d="M30 1 A30 30 0 0 0 90 1" fill="none" stroke="rgba(255,61,240,.5)"/><circle cx="60" cy="7" r="3" fill="none" stroke="#ff8c32" stroke-width="1.5"/>';
    const off = (y) => [25, 60, 95].map((x) => O(x, y)).join('');
    const P = {
      flood: off(52) + off(66) + A('M25 52 L22 16') + A('M60 52 L60 14') + A('M95 52 L98 16') + O(60, 66, '#ffd23f'),
      vault: off(52) + off(66) + A('M25 66 Q14 48 30 34') + A('M95 66 Q106 48 90 34') + '<path d="M54 44h12" stroke="#3dfcff" stroke-width="2"/>' + A('M60 52 L60 46'),
      push: off(52) + off(66) + [44, 60, 76].map((x) => A(`M${x} 74 L${x} 58`, '#3dfcff')).join('') + A('M60 66 L60 30'),
      zone: [30, 60, 90].map((x) => X(x, 20)).join('') + [30, 60, 90].map((x) => X(x, 34)).join('') + '<rect x="18" y="12" width="84" height="30" rx="8" fill="rgba(255,61,240,.08)" stroke="rgba(255,61,240,.4)" stroke-dasharray="3 3"/>' + off(62),
      press: off(62) + [25, 60, 95].map((x) => X(x + 6, 54)).join('') + [25, 60, 95].map((x) => A(`M${x + 6} 50 L${x + 2} 58`, '#ff3df0')).join(''),
      blitz: off(62) + [42, 60, 78].map((x) => X(x, 30)).join('') + [42, 60, 78].map((x) => A(`M${x} 34 L${60 + (x - 60) * 0.2} 56`, '#ff3df0')).join('') + X(20, 20) + X(100, 20),
    };
    return `<svg class="pdiag" viewBox="0 0 120 80">${base}${P[id] || ''}</svg>`;
  };

  function oppPlayer(opp, i, r) {
    const seed = (opp.name.length * 31 + i * 7) % 97;
    const b = (k) => 2 + ((seed * (k + 3) + i * 5) % 8);
    return { id: 'o' + i + opp.name.replace(/\W/g, ''), name: opp.name.split(' ')[0] + ' #' + (10 + i * 7), num: 10 + i * 7, b5: { O: b(1), C: b(2), E: b(3), A: b(4), N: b(5) }, role: VB.ROW_ROLE[r] };
  }

  class Drive {
    constructor(cfg) {
      Object.assign(this, cfg); // {state, sim, mode, play, opp, clutch, onDone}
      this.wrap = document.getElementById('live');
      this.cv = document.getElementById('livecv');
      this.ctx = this.cv.getContext('2d');
      this.keys = {};
      this.t = 0; this.clock = this.mode === 'attack' ? 20 : 15; this.clock0 = this.clock; this.down = 1; this.downs = 3;
      this.ents = []; this.particles = []; this.shake = 0; this.slow = 1; this.paused = false; this.over = false;
      this.msg = ''; this.msgT = 0; this.result = { us: 0, them: 0, qs: [], text: '' };
      this.oppColor = '#' + (this.opp.color || 0xff5555).toString(16).padStart(6, '0');
      this.lastDir = { x: 0, z: 1 };
      this.setup();
    }

    // ---------------- setup ----------------
    setup() {
      const grid = this.sim.grid;
      const z0 = 38;
      const att = this.mode === 'attack';
      const lanesX = [-15, 0, 15];
      let k = 0;
      for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
        const p = grid[r][l];
        if (!p) continue;
        const f = p.form || {};
        const e = { team: 'us', p, r, l, x: lanesX[l] + (r === 1 ? (l - 1) * -3 : 0), z: 0, vx: 0, vz: 0,
          speed: 8.6 + (p.sk.fit - 45) / 22 + ((f.sht || 0) + (f.pas || 0) + (f.def || 0)) * 0.12,
          img: VB.spriteImage(p, OUR, OUR_ACC, false), stun: 0, idx: k++ };
        if (att) e.z = z0 + [7, 0, -6][r]; else e.z = z0 + [26, 34, 44][r];
        this.ents.push(e);
      }
      const og = this.sim.oppGrid;
      for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
        const o = og[r][l];
        const pp = oppPlayer(this.opp, r * 3 + l, r);
        const rating = (o.sk.sht + o.sk.pas + o.sk.def) / 3;
        const e = { team: 'them', p: pp, o, r, l, rating, x: lanesX[l] + (r === 1 ? (l - 1) * 3 : 0), z: 0, vx: 0, vz: 0,
          speed: 7.4 + (rating - 40) / 18, img: VB.spriteImage(pp, this.oppColor, '#ffffff', false), stun: 0 };
        if (att) e.z = z0 + [12, 30, 48][r]; else e.z = z0 + [7, 0, -6][r];
        this.ents.push(e);
      }
      const us = this.ents.filter((e) => e.team === 'us'), them = this.ents.filter((e) => e.team === 'them');
      this.us = us; this.them = them;
      // man assignments
      const pairAll = (A, B) => A.forEach((a, i) => (a.mark = B[i % B.length]));
      pairAll(them, us); pairAll(us, them);
      const carrier = att ? (us.find((e) => e.r === 1 && e.l === 1) || us[0]) : (them.find((e) => e.r === 1 && e.l === 1) || them[0]);
      this.ball = { holder: carrier, x: carrier.x, z: carrier.z, h: 2, state: 'held' };
      this.ctrl = att ? carrier : this.nearestTo(us, carrier);
      this.losZ = carrier.z;
      this.routes();
      this.camX = 0; this.camZ = this.ball.z - 30;
    }
    routes() {
      const att = this.mode === 'attack';
      const A = att ? this.us : this.them;
      const z = this.ball.z;
      const play = att ? this.play : (['flood', 'vault', 'push'][Math.floor(R() * 3)]);
      this.oppPlay = att ? null : play;
      A.forEach((e) => {
        e.blocker = false; e.screen = false;
        const laneX = [-15, 0, 15][e.l];
        if (e === this.ball.holder) { e.route = null; return; }
        if (play === 'flood') e.route = e.r === 0 ? { x: laneX * 1.1, z: Math.min(HOOP_Z - 8, z + 42) } : e.r === 1 ? { x: laneX * 1.3 + (e.l === 1 ? 8 : 0), z: z + 18 } : { x: laneX * 0.6, z: z + 4 };
        else if (play === 'vault') {
          if (e.r === 0) { e.route = { x: laneX * 0.7, z: z + 16 }; e.screen = true; }
          else if (e.r === 1) e.route = { x: [-17, 0, 17][e.l], z: HOOP_Z - ARC - 2 + Math.abs([-17, 0, 17][e.l]) * 0.35 };
          else e.route = { x: laneX * 0.5, z: z + 2 };
        } else { // push
          if (e.r === 2) { e.route = { x: (e.l - 1) * 4, z: z + 8 }; e.blocker = true; }
          else if (e.r === 1) e.route = { x: laneX * 0.8, z: z + 10 };
          else e.route = { x: laneX * 0.9, z: z + 22 };
        }
        e.route.x = clamp(e.route.x, -HALF_W + 2, HALF_W - 2); e.route.z = clamp(e.route.z, 4, HOOP_Z - 3);
      });
    }

    nearestTo(list, t, exclude) {
      let best = null, bd = 1e9;
      list.forEach((e) => { if (e === exclude) return; const d = Math.hypot(e.x - t.x, e.z - t.z); if (d < bd) { bd = d; best = e; } });
      return best;
    }
    distToHoop(e) { return Math.hypot(e.x, HOOP_Z - e.z); }

    // ---------------- loop ----------------
    start() {
      this.wrap.classList.add('on');
      this.resize();
      this.bindInput();
      VB.sfx('whistle');
      this.say(this.mode === 'attack' ? `${this.playName()}. Attack!` : `Defend: ${this.playName()}`, 1.6);
      this.last = performance.now();
      this.tutorial();
      const loop = (now) => {
        if (this.dead) return;
        const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
        if (!this.paused) this.update(dt * this.slow);
        this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      return new Promise((res) => (this.resolve = res));
    }
    tutorial() {
      const key = 'vb_tut_' + this.mode;
      let seen = false; try { seen = localStorage.getItem(key) === '1'; } catch (e) { /* storage blocked */ }
      if (seen) return;
      const touch = VB.isTouch();
      const lines = this.mode === 'attack'
        ? [touch ? 'Drag the <b>stick</b> to run with the ball.' : '<b>WASD / arrows</b> to run with the ball.',
           touch ? '<b>PASS</b> throws to the teammate marked ▼ (aim with the stick).' : '<b>Space</b> passes to the teammate marked ▼, or <b>click</b> any teammate.',
           touch ? '<b>SHOOT</b> when you are close to the hoop. Inside the pink arc = 2, outside = 3.' : '<b>E</b> shoots. Inside the pink arc = 2, outside = 3.',
           'Every shot and long, risky pass asks a <b>command-term question</b>. Right = big boost. Wrong = turnover.',
           'Defenders tackle on contact: 3 tackles and you lose the ball.']
        : [touch ? 'Drag the <b>stick</b> to move your defender (yellow ring).' : '<b>WASD / arrows</b> move your defender (yellow ring).',
           touch ? '<b>STEAL</b> when you are right next to the ball carrier. It asks a question.' : '<b>Space</b> steals when you are next to the ball carrier. It asks a question.',
           touch ? '<b>SWITCH</b> jumps to the defender nearest the ball.' : '<b>E</b> or <b>Q</b> switches to the defender nearest the ball.',
           'Be close when they shoot to <b>contest</b>: answer right and the shot is much harder.'];
      this.paused = true;
      const el = document.createElement('div');
      el.className = 'tut';
      el.innerHTML = `<div class="tutc"><div class="ev-tag">${this.mode === 'attack' ? 'ATTACK' : 'DEFENCE'} · HOW TO PLAY</div><ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul><button class="btn primary">Let's go ▸</button></div>`;
      this.wrap.appendChild(el);
      const go = () => { el.remove(); this.paused = false; this.last = performance.now(); try { localStorage.setItem(key, '1'); } catch (e) { /* */ } window.removeEventListener('keydown', kgo); };
      const kgo = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); go(); } };
      el.querySelector('button').onclick = go;
      window.addEventListener('keydown', kgo, true);
    }
    playName() { const list = VB.PLAYS[this.mode === 'attack' ? 'attack' : 'defense']; return (list.find((p) => p.id === this.play) || {}).name || ''; }

    finish(text) {
      if (this.over) return;
      this.over = true;
      this.result.text = text;
      this.say(text, 2);
      setTimeout(() => {
        this.dead = true;
        this.unbind();
        this.wrap.classList.remove('on');
        this.resolve(this.result);
      }, 1500);
    }

    update(dt) {
      ['netT', 'rimT', 'boardT'].forEach((k) => { if (this[k] > 0) this[k] -= dt; });
      if (this.over) { this.t += dt; this.stepBall(dt); this.stepParticles(dt); return; }
      this.t += dt;
      this.clock -= dt;
      if (this.msgT > 0) this.msgT -= dt;
      if (this.shake > 0) this.shake -= dt * 8;
      if (this.clock <= 0) {
        if (this.mode === 'attack') return this.finish('Shot clock! Turnover.');
        return this.finish('Shot clock! Defence holds. Stop!');
      }
      // controlled player input
      const c = this.ctrl;
      let ix = 0, iz = 0;
      if (this.keys.left) ix -= 1; if (this.keys.right) ix += 1; if (this.keys.up) iz += 1; if (this.keys.down) iz -= 1;
      if (this.stick) { ix += this.stick.x; iz += this.stick.y; }
      const m = Math.hypot(ix, iz);
      if (m > 1) { ix /= m; iz /= m; }
      if (m > 0.15) this.lastDir = { x: ix / (m || 1), z: iz / (m || 1) };
      if (c && c.stun <= 0) { c.vx = ix * c.speed; c.vz = iz * c.speed; }
      // AI
      this.ents.forEach((e) => { if (e.stun > 0) { e.stun -= dt; e.vx *= 0.8; e.vz *= 0.8; } else if (e !== c) this.ai(e, dt); });
      // move + bounds
      this.ents.forEach((e) => {
        let sp = 1;
        if (e.team !== this.attTeam()) { // screens & blocks slow defenders
          const A = this.attackers();
          for (const a of A) if ((a.screen || a.blocker) && Math.hypot(a.x - e.x, a.z - e.z) < 2.2) { sp = 0.35; break; }
        }
        e.x = clamp(e.x + e.vx * dt * sp, -HALF_W + 0.5, HALF_W - 0.5);
        e.z = clamp(e.z + e.vz * dt * sp, 1, FIELD_END - 1);
      });
      // separation
      for (let i = 0; i < this.ents.length; i++) for (let j = i + 1; j < this.ents.length; j++) {
        const a = this.ents[i], b = this.ents[j];
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d > 0 && d < 1.3) { const push = (1.3 - d) / 2; a.x -= (dx / d) * push; a.z -= (dz / d) * push; b.x += (dx / d) * push; b.z += (dz / d) * push; }
      }
      this.stepBall(dt);
      this.checkTackle();
      this.stepParticles(dt);
      // defence: opponent AI decisions
      if (this.mode === 'defense' && this.ball.state === 'held') this.oppBrain(dt);
      // camera
      const tz = this.ball.z - (this.portrait ? 22 : 26), tx = this.ball.x * (this.portrait ? 0.9 : 0.6);
      this.camZ += (clamp(tz, -16, 60) - this.camZ) * Math.min(1, dt * 3);
      this.camX += (tx - this.camX) * Math.min(1, dt * 3);
    }
    attTeam() { return this.mode === 'attack' ? 'us' : 'them'; }
    attackers() { return this.mode === 'attack' ? this.us : this.them; }
    defenders() { return this.mode === 'attack' ? this.them : this.us; }

    ai(e, dt) {
      const att = e.team === this.attTeam();
      const b = this.ball;
      let tx = e.x, tz = e.z, sp = e.speed;
      if (att) {
        if (e === b.holder) { // opponent carrier logic handled in oppBrain; drift towards hoop
          tx = e.x * 0.9; tz = e.z + 6;
        } else if (e.route) {
          tx = e.route.x; tz = e.route.z;
          if (Math.hypot(tx - e.x, tz - e.z) < 1.2) { // get open: step away from nearest defender
            const d = this.nearestTo(this.defenders(), e);
            if (d) { const dx = e.x - d.x, dz = e.z - d.z, dd = Math.hypot(dx, dz) || 1; if (dd < 5) { tx = e.x + (dx / dd) * 3; tz = e.z + (dz / dd) * 2; } }
            sp *= 0.5;
          }
          if (e.blocker && b.holder) { // lead block in front of carrier
            const lead = this.nearestTo(this.defenders(), b.holder);
            if (lead) { tx = (lead.x + b.holder.x) / 2; tz = (lead.z + b.holder.z) / 2 + 1; }
          }
        }
      } else {
        // defender
        const carrier = b.holder && b.holder.team !== e.team ? b.holder : null;
        const scheme = this.mode === 'attack' ? 'man' : this.play;
        const chasers = carrier ? this.defenders().slice().sort((a1, a2) => Math.hypot(a1.x - carrier.x, a1.z - carrier.z) - Math.hypot(a2.x - carrier.x, a2.z - carrier.z)) : [];
        const nChase = scheme === 'blitz' ? 3 : 1;
        const chasing = carrier && chasers.indexOf(e) < nChase && chasers.indexOf(e) >= 0 && !(this.mode === 'defense' && e === this.ctrl);
        if (b.state === 'pass' && b.to && Math.hypot(b.tx - e.x, b.tz - e.z) < 8) { tx = b.tx; tz = b.tz; } // jump the route
        else if (chasing) {
          tx = carrier.x + carrier.vx * 0.3; tz = carrier.z + carrier.vz * 0.3;
          if (this.mode === 'attack') sp *= 0.9 + Math.min(0.25, this.t / 40); // pressure grows with the clock
          else sp *= 0.85; // your controlled defender has to make the big plays
        } else if (scheme === 'zone') {
          const zx = [-12, 0, 12][e.l], zz = HOOP_Z - [30, 18, 8][e.r];
          const target = carrier || b;
          tx = zx + (target.x - zx) * 0.3; tz = zz;
        } else if (e.mark) {
          const m = e.mark, tight = scheme === 'press' ? 1.6 : 2.6;
          // stay between mark and hoop
          const dx = 0 - m.x, dz = HOOP_Z - m.z, dd = Math.hypot(dx, dz) || 1;
          tx = m.x + (dx / dd) * tight; tz = m.z + (dz / dd) * tight;
        }
      }
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { e.vx = (dx / d) * Math.min(sp, d * 3); e.vz = (dz / d) * Math.min(sp, d * 3); } else { e.vx *= 0.7; e.vz *= 0.7; }
    }

    // Opponent decision making on defence drives
    oppBrain(dt) {
      const h = this.ball.holder;
      if (!h || h.team !== 'them') return;
      this.oppThink = (this.oppThink || 0) - dt;
      // carrier movement: run toward hoop, slide away from the nearest defender
      const d = this.nearestTo(this.us, h);
      const dd = d ? Math.hypot(d.x - h.x, d.z - h.z) : 99;
      let tx = h.x * 0.8, tz = h.z + 8;
      if (d && dd < 6) { tx = h.x + (h.x - d.x) * 1.4; tz = h.z + 4; }
      const dx = tx - h.x, dz = tz - h.z, m = Math.hypot(dx, dz) || 1;
      if (h.stun <= 0) { h.vx = (dx / m) * h.speed * 0.92; h.vz = (dz / m) * h.speed * 0.92; }
      if (this.oppThink > 0) return;
      this.oppThink = 0.45;
      const dist = this.distToHoop(h);
      if ((dist < 15 && dd > 1.6) || (dist < 26 && dd > 3.5) || (this.clock < 4 && dist < 34)) return this.oppShoot(h, dd);
      if (dd < 3.2 && R() < 0.55) {
        // pass to most open teammate ahead
        let best = null, bs = -1e9;
        this.them.forEach((t) => {
          if (t === h) return;
          const nd = this.nearestTo(this.us, t); const open = nd ? Math.hypot(nd.x - t.x, nd.z - t.z) : 9;
          const s = open * 2 + (t.z - h.z) * 0.3 - Math.hypot(t.x - h.x, t.z - h.z) * 0.15;
          if (s > bs) { bs = s; best = t; }
        });
        if (best) this.throwPass(h, best, false);
      }
    }

    // ---------------- ball ----------------
    throwPass(from, to, risky, forceComplete) {
      const p = from.p, f = p.form || {};
      const dist = Math.hypot(to.x - from.x, to.z - from.z);
      const spd = from.team === 'us' ? 20 + (p.sk ? p.sk.pas : 50) * 0.12 + (f.pas || 0) * 3.5 : 19 + (from.rating || 45) * 0.1;
      const lead = Math.min(1.2, dist / spd);
      const tx = to.x + to.vx * lead * 0.8, tz = to.z + to.vz * lead * 0.8;
      Object.assign(this.ball, { state: 'pass', holder: null, from, to, sx: from.x, sz: from.z, tx, tz, t: 0, dur: Math.hypot(tx - from.x, tz - from.z) / spd, forceComplete, risky });
      this.passer = from;
      VB.sfx('pass');
    }
    stepBall(dt) {
      const b = this.ball;
      if (b.state === 'held' && b.holder) { b.x = b.holder.x + 0.5; b.z = b.holder.z - 0.2; b.h = 2.0 + Math.abs(Math.sin(this.t * 9)) * 0.6; return; }
      if (b.state === 'pass') {
        b.t += dt; const k = clamp(b.t / b.dur, 0, 1);
        b.x = b.sx + (b.tx - b.sx) * k; b.z = b.sz + (b.tz - b.sz) * k; b.h = 2 + Math.sin(k * Math.PI) * Math.min(8, b.dur * 6);
        // interception (only when not guaranteed by a correct answer)
        if (b.forceInt && k > 0.45) { const d0 = this.nearestTo(this.them, b); if (d0) { d0.x = b.x; d0.z = b.z; return this.intercept(d0); } }
        if (!b.forceComplete && k > 0.25 && k < 0.95) {
          const D = b.from.team === 'us' ? this.them : this.us;
          for (const d of D) {
            const reach = d === this.ctrl ? 1.6 : 1.1;
            if (Math.hypot(d.x - b.x, d.z - b.z) < reach && b.h < 5) {
              const pIn = b.from.team === 'us' ? (b.risky ? 0.9 : 0.12) : (d === this.ctrl ? 0.55 : 0.12);
              if (R() < pIn) return this.intercept(d);
            }
          }
        }
        if (k >= 1) {
          b.state = 'held'; b.holder = b.to;
          VB.sfx('catch');
          if (b.to.team === 'us' && this.mode === 'attack') { this.ctrl = b.to; this.addFx(b.x, b.z, OUR, 10); this.result.passes = (this.result.passes || 0) + 1; this.passAssist = b.from; }
          if (b.to.team === 'them') this.passAssist = b.from;
        }
        return;
      }
      if (b.state === 'shot') {
        b.t += dt; const k = clamp(b.t / b.dur, 0, 1);
        b.x = b.sx + (b.ax - b.sx) * k; b.z = b.sz + (b.az - b.sz) * k; b.h = 2 + (b.ah - 2) * k + Math.sin(k * Math.PI) * (4 + b.dur * 4);
        if (k >= 1 && !b.done) {
          b.done = true;
          if (b.made) { b.state = 'drop'; b.vx = b.vz = 0; b.vh = -3; this.netT = 0.6; }
          else {
            // bounce away from the hoop, back towards the court
            b.state = 'bounce';
            const dx = b.ax, dz = b.az - HOOP_Z, m = Math.hypot(dx, dz) || 1;
            if (b.miss === 'rim') { b.vx = (dx / m) * 4 + (R() - 0.5) * 2; b.vz = (dz / m) * 3 - 5; b.vh = 7; this.rimT = 0.35; }
            else if (b.miss === 'board') { b.vx = b.ax * 1.5; b.vz = -7; b.vh = 2; this.boardT = 0.35; }
            else { b.vx = (R() - 0.5) * 3; b.vz = -5; b.vh = 5; this.rimT = 0.35; }
            VB.sfx(b.miss === 'board' ? 'board' : 'rim');
            this.addFx(b.x, b.z, b.miss === 'board' ? '#3dfcff' : '#ff8c32', 10);
          }
          this.resolveShot();
        }
        return;
      }
      if (b.state === 'drop') { // falls through the net
        b.vh -= 20 * dt; b.h = Math.max(0.4, b.h + b.vh * dt);
        if (b.h <= 0.4) b.state = 'loose';
        return;
      }
      if (b.state === 'bounce') { // off the rim / board, bouncing on the floor
        b.x = clamp(b.x + b.vx * dt, -HALF_W, HALF_W); b.z = clamp(b.z + b.vz * dt, 1, FIELD_END - 1);
        b.vh -= 25 * dt; b.h += b.vh * dt;
        if (b.h < 0.4 && b.vh < 0) { b.h = 0.4; b.vh = -b.vh * 0.5; b.vx *= 0.7; b.vz *= 0.7; if (b.vh > 2.5) VB.sfx('catch'); if (b.vh < 1) { b.vh = 0; b.state = 'loose'; } }
      }
    }
    intercept(d) {
      const b = this.ball;
      b.state = 'held'; b.holder = d;
      this.addFx(d.x, d.z, '#ff3b4e', 18); this.shake = 1;
      VB.sfx(d.team === 'them' ? 'miss' : 'steal');
      if (d.team === 'them') { this.finish('Intercepted! Turnover.'); }
      else { this.result.steals = (this.result.steals || 0) + 1; this.finish('INTERCEPTED! Stop!'); }
    }
    checkTackle() {
      const b = this.ball;
      if (b.state !== 'held' || !b.holder || this.over) return;
      const h = b.holder;
      if (this.tackleCD > this.t) return;
      const D = h.team === 'us' ? this.them : this.us;
      for (const d of D) {
        if (d.stun > 0) continue;
        if (Math.hypot(d.x - h.x, d.z - h.z) < 1.25) {
          // contact: tackle
          this.tackleCD = this.t + 1.2;
          this.addFx(h.x, h.z, '#ffd23f', 14); this.shake = 0.8; VB.sfx('tackle');
          if (h.team === 'us') this.result.tackled = (this.result.tackled || 0) + 1; else this.result.tackles = (this.result.tackles || 0) + 1;
          this.down++;
          if (this.down > this.downs) return this.finish(h.team === 'us' ? 'Tackled on 3rd down. Turnover.' : 'Third tackle. Stop!');
          this.say(`Tackled! Down ${this.down}/${this.downs}`, 1.2);
          this.resetFormation(h);
          return;
        }
      }
    }
    resetFormation(holder) {
      // everybody resets around the new spot, carrier keeps the ball
      this.paused = true;
      setTimeout(() => {
        const z = holder.z;
        const att = this.attackers(), def = this.defenders();
        const lanesX = [-15, 0, 15];
        att.forEach((e) => { e.x = lanesX[e.l] * 0.9; e.z = clamp(z + [6, 0, -5][e.r], 2, HOOP_Z - 4); e.vx = e.vz = 0; e.stun = 0; });
        def.forEach((e) => { e.x = lanesX[e.l] * 0.9; e.z = clamp(z + [10, 18, 28][e.r], 4, HOOP_Z - 1); e.vx = e.vz = 0; e.stun = 0; });
        holder.x = 0; holder.z = clamp(z, 2, HOOP_Z - 8);
        if (this.mode === 'attack') this.ctrl = holder; else this.ctrl = this.nearestTo(this.us, holder);
        this.routes();
        this.clock = Math.max(this.clock, 8);
        this.paused = false;
      }, 650);
    }

    // ---------------- player actions ----------------
    passAction(target) {
      if (this.over || this.paused || this.mode !== 'attack') return;
      const b = this.ball, h = b.holder;
      if (b.state !== 'held' || !h || h.team !== 'us') return;
      if (!target) target = this.bestTarget();
      if (!target || target === h) return;
      const dist = Math.hypot(target.x - h.x, target.z - h.z);
      const lane = this.laneDanger(h, target);
      const risky = dist > 20 || lane < 2.6;
      if (!risky) { this.throwPass(h, target, false); return; }
      const diff = dist / 12 + (2.6 - Math.min(2.6, lane)) * 0.9 + (this.play === 'flood' ? 0.3 : 0);
      const lvl = diff >= 2.6 ? 3 : diff >= 1.8 ? 2 : 1;
      this.ask(lvl, h, `Risky pass (${Math.round(dist)} m)`, (ok) => {
        if (ok) { this.throwPass(h, target, true, true); this.say('Perfect pass!', 1); }
        else { this.throwPass(h, target, true, false); this.ball.forceInt = true; }
      });
    }
    laneDanger(a, b) { // min distance of any defender from the pass segment
      let min = 99;
      this.defenders().forEach((d) => {
        const vx = b.x - a.x, vz = b.z - a.z, L = vx * vx + vz * vz || 1;
        const t = clamp(((d.x - a.x) * vx + (d.z - a.z) * vz) / L, 0, 1);
        const px = a.x + vx * t, pz = a.z + vz * t;
        min = Math.min(min, Math.hypot(d.x - px, d.z - pz));
      });
      return min;
    }
    bestTarget() {
      const h = this.ball.holder; let best = null, bs = -1e9;
      const dir = this.lastDir;
      this.us.forEach((t) => {
        if (t === h) return;
        const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz) || 1;
        const align = (dx * dir.x + dz * dir.z) / d;
        const open = this.laneDanger(h, t);
        const s = align * 6 + Math.min(open, 5) * 1.5 + (t.z - h.z) * 0.08 - d * 0.05;
        if (s > bs) { bs = s; best = t; }
      });
      return best;
    }
    shootAction() {
      if (this.over || this.paused || this.mode !== 'attack') return;
      const b = this.ball, h = b.holder;
      if (b.state !== 'held' || !h || h.team !== 'us') return;
      const dist = this.distToHoop(h);
      const nd = this.nearestTo(this.them, h); const contest = nd ? Math.hypot(nd.x - h.x, nd.z - h.z) : 9;
      const pts = dist > ARC ? 3 : 2;
      const f = h.p.form || {};
      let base = 0.62 - Math.max(0, dist - 6) * 0.017 + (h.p.sk.sht - 50) / 160 + (f.sht || 0) * 0.05 - (contest < 2.5 ? 0.16 : contest < 4.5 ? 0.07 : 0);
      if (h.r !== 0 && pts === 2) base -= 0.03;
      base = clamp(base, 0.06, 0.75);
      const diff = (dist > ARC ? 2 : dist > 14 ? 1 : 0) + (contest < 2.5 ? 1 : 0);
      const lvl = clamp(1 + diff, 1, 3);
      this.ask(lvl, h, pts === 3 ? `Vault shot from ${Math.round(dist)} m` : `Shot from ${Math.round(dist)} m`, (ok) => {
        if (!ok) { this.addFx(h.x, h.z, '#ff3b4e', 16); this.shake = 1; return this.finish('Stripped! Turnover.'); }
        const prob = clamp(base + 0.32, 0.25, 0.95);
        this.launchShot(h, prob, pts);
      });
    }
    launchShot(h, prob, pts) {
      const b = this.ball;
      const dist = this.distToHoop(h);
      const made = R() < prob;
      // aim point: the centre of the ring for a make; the rim, the backboard or short for a miss
      let ax = 0, az = HOOP_Z, ah = 9, miss = null;
      if (!made) {
        const r = R();
        miss = dist > ARC && r < 0.35 ? 'short' : r < 0.3 ? 'board' : 'rim';
        if (miss === 'rim') { const a = R() * Math.PI * 2; ax = Math.cos(a) * 1.35; az = HOOP_Z + Math.sin(a) * 0.9; }
        else if (miss === 'board') { ax = (R() < 0.5 ? -1 : 1) * (0.6 + R() * 1.2); az = HOOP_Z + 1.9; ah = 10.6; }
        else { ax = (R() - 0.5) * 1.2; az = HOOP_Z - 1.4; ah = 8.9; }
      }
      Object.assign(b, { state: 'shot', holder: null, sx: h.x, sz: h.z, t: 0, dur: 0.55 + dist / 45, prob, pts, shooter: h, done: false, made, miss, ax, az, ah });
      this.slow = 0.55; VB.sfx('shot');
      setTimeout(() => (this.slow = 1), 600);
    }
    resolveShot() {
      const b = this.ball;
      const made = b.made;
      const ourShot = b.shooter.team === 'us';
      if (made) {
        this.addFx(0, HOOP_Z, ourShot ? OUR : this.oppColor, 40); this.shake = 1.4; VB.sfx(ourShot ? 'score' : 'miss');
        if (ourShot) {
          this.result.us += b.pts;
          this.result.scorer = b.shooter.p; this.result.assist = this.passAssist && this.passAssist !== b.shooter ? this.passAssist.p : null;
          this.finish(b.pts === 3 ? 'VAULT! +3' : 'SCORE! +2');
        } else { this.result.them += b.pts; this.finish(`${this.opp.name.split(' ')[0]} score +${b.pts}`); }
      } else {
        const how = { rim: 'Off the rim!', board: 'Off the backboard!', short: 'Short! Front rim.' }[b.miss];
        setTimeout(() => VB.sfx(ourShot ? 'miss' : 'steal'), 250);
        this.finish(ourShot ? `${how} Turnover.` : `${how} Stop!`);
      }
    }
    oppShoot(h, contestDist) {
      const dist = this.distToHoop(h);
      const pts = dist > ARC ? 3 : 2;
      let prob = clamp(0.74 - Math.max(0, dist - 6) * 0.013 + (h.rating - 45) / 150 - (contestDist < 2.5 ? 0.15 : contestDist < 4.5 ? 0.06 : 0), 0.1, 0.8);
      if (this.play === 'zone' && dist < 14) prob -= 0.12;
      if (this.play === 'zone' && dist > ARC) prob += 0.05;
      const c = this.ctrl;
      const near = c && Math.hypot(c.x - h.x, c.z - h.z) < 5.5;
      h.vx = h.vz = 0;
      if (near) {
        const lvl = dist > ARC ? 3 : dist > 14 ? 2 : 2 + (R() < 0.4 ? 1 : 0);
        this.ask(lvl, c, 'Contest the shot!', (ok) => {
          if (ok) { prob *= 0.4; this.say('Big contest!', 1); this.result.contests = (this.result.contests || 0) + 1; }
          this.launchShot(h, prob, pts);
        });
      } else this.launchShot(h, prob, pts);
    }
    stealAction() {
      if (this.over || this.paused || this.mode !== 'defense') return;
      const c = this.ctrl, h = this.ball.holder;
      if (!c || c.stun > 0 || (this.stealCD || 0) > this.t) return;
      if (!h || this.ball.state !== 'held' || h.team !== 'them') return;
      const d = Math.hypot(c.x - h.x, c.z - h.z);
      if (d > 2.8) { this.say('Get closer to steal', 0.7); return; }
      this.stealCD = this.t + 1.5;
      const f = c.p.form || {};
      const edge = (c.p.sk.def + (f.def || 0) * 6 - h.rating) / 90 + (this.play === 'press' ? 0.08 : 0);
      const lvl = h.rating >= 50 ? 2 : 1 + (R() < 0.4 ? 1 : 0);
      this.ask(lvl, c, 'Read the play: steal!', (ok) => {
        const pr = ok ? clamp(0.62 + edge, 0.35, 0.92) : 0;
        if (R() < pr) { VB.sfx('steal'); this.addFx(h.x, h.z, OUR, 24); this.shake = 1; this.result.steals = (this.result.steals || 0) + 1; this.ball.holder = c; this.finish('STEAL! Stop!'); }
        else { c.stun = ok ? 0.6 : 1.3; this.say(ok ? 'So close! They hold on.' : 'Beaten! They drive past.', 0.9); this.addFx(c.x, c.z, '#ff8c32', 8); }
      });
    }
    switchAction() {
      if (this.mode !== 'defense' || this.over) return;
      const target = this.ball.holder || this.ball;
      const cands = this.us.filter((e) => e !== this.ctrl).sort((a, b) => Math.hypot(a.x - target.x, a.z - target.z) - Math.hypot(b.x - target.x, b.z - target.z));
      if (cands[0]) this.ctrl = cands[0];
    }

    // ---------------- questions ----------------
    ask(lvl, who, label, cb) {
      this.paused = true;
      const q = VB.makeQuestion(this.state, lvl);
      const p = who.p;
      let time = [0, 11, 15, 20][lvl];
      let nerves = '';
      if (this.clutch && p.b5 && p.b5.N >= 7) { const cut = (p.b5.N - 6) * 1.5; time -= cut; nerves = `${p.name.split(' ')[0]} is anxious under pressure (N ${p.b5.N}): −${cut.toFixed(1)} s`; }
      if (p.week && p.week.mental) { time += 2; nerves += (nerves ? ' · ' : '') + 'Mental skills: +2 s'; }
      VB.QuestionUI.show(q, { time, label, who: p.name, nerves, lvl }).then((ok) => {
        VB.recordAnswer(this.state, q, ok);
        this.result.qs.push({ term: q.term, ok });
        this.paused = false;
        cb(ok);
      });
    }

    // ---------------- fx ----------------
    addFx(x, z, color, n) { for (let i = 0; i < n; i++) this.particles.push({ x, z, h: 2 + R() * 3, vx: (R() - 0.5) * 10, vz: (R() - 0.5) * 10, vh: 4 + R() * 8, life: 0.7 + R() * 0.5, color }); }
    stepParticles(dt) { this.particles = this.particles.filter((q) => { q.life -= dt; q.x += q.vx * dt; q.z += q.vz * dt; q.h += q.vh * dt; q.vh -= 18 * dt; return q.life > 0; }); }
    say(text, dur) { this.msg = text; this.msgT = dur || 1.5; const el = document.getElementById('livemsg'); if (el) { el.textContent = text; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }

    // ---------------- render ----------------
    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = this.wrap.clientWidth, h = this.wrap.clientHeight;
      this.cv.width = w * dpr; this.cv.height = h * dpr; this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
      this.W = w; this.H = h; this.dpr = dpr;
      this.portrait = h > w * 1.1;
      this.F = this.portrait ? h * 0.55 : Math.max(w * 0.62, h * 0.55);
      this.horizon = h * (this.portrait ? 0.24 : 0.2);
      this.camH = 16;
    }
    proj(x, z, h) {
      const d = z - this.camZ;
      if (d < 2) return null;
      const s = this.F / d;
      return { x: this.W / 2 + (x - this.camX) * s, y: this.horizon + (this.camH - (h || 0)) * s, s };
    }
    draw() {
      const c = this.ctx, W = this.W, H = this.H;
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.shake > 0) c.translate((R() - 0.5) * this.shake * 6, (R() - 0.5) * this.shake * 6);
      // sky + skyline
      const g = c.createLinearGradient(0, 0, 0, this.horizon + 40);
      g.addColorStop(0, '#05030f'); g.addColorStop(1, '#1a0b33');
      c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
      for (let i = 0; i < 26; i++) {
        const bw = 30 + ((i * 53) % 50), bh = 20 + ((i * 97) % 70), bx = ((i * 71) % 26) / 26 * (W + 100) - 50 - this.camX * 2;
        c.fillStyle = i % 3 ? '#120a26' : '#170d30'; c.fillRect(bx, this.horizon - bh + 8, bw, bh);
        c.fillStyle = i % 2 ? 'rgba(255,61,240,.55)' : 'rgba(61,252,255,.5)';
        for (let k = 0; k < 4; k++) c.fillRect(bx + 4 + ((k * 13 + i) % (bw - 8)), this.horizon - bh + 14 + k * 9, 3, 2);
      }
      // field
      const zN = this.camZ + 2.2, zF = FIELD_END;
      const quad = (x1, z1, x2, z2, fill) => { const a = this.proj(x1, z1), b = this.proj(x2, z1), cc = this.proj(x2, z2), d = this.proj(x1, z2); if (!a || !b || !cc || !d) return; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cc.x, cc.y); c.lineTo(d.x, d.y); c.closePath(); c.fillStyle = fill; c.fill(); };
      quad(-HALF_W - 6, zN, HALF_W + 6, zF + 6, '#0b0820');
      const surface = this.opp && VB.SURFACES[this.opp.surface];
      quad(-HALF_W, Math.max(zN, 0), HALF_W, zF, surface && surface.artificial ? '#0c2018' : '#101634');
      for (let z = Math.ceil(zN / 4) * 4; z < zF; z += 4) if ((z / 4) % 2 === 0) quad(-HALF_W, z, HALF_W, z + 4, 'rgba(255,255,255,0.025)');
      const line = (x1, z1, x2, z2, col, w) => { const a = this.proj(x1, Math.max(z1, zN)), b = this.proj(x2, Math.max(z2, zN)); if (!a || !b) return; c.strokeStyle = col; c.lineWidth = w || 1.5; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
      c.shadowBlur = 8; c.shadowColor = '#3dfcff';
      line(-HALF_W, 0, -HALF_W, zF, '#3dfcff', 2); line(HALF_W, 0, HALF_W, zF, '#3dfcff', 2);
      c.shadowBlur = 0;
      for (let z = 10; z < zF; z += 10) { line(-HALF_W, z, HALF_W, z, 'rgba(61,252,255,0.18)', 1); const p = this.proj(-HALF_W + 2, z); if (p && z > zN) { c.fillStyle = 'rgba(61,252,255,.35)'; c.font = `${Math.max(8, p.s * 1.6)}px Orbitron, monospace`; c.fillText(String(z), p.x, p.y - 2); } }
      line(-HALF_W / 3, 0, -HALF_W / 3, zF, 'rgba(255,255,255,0.05)'); line(HALF_W / 3, 0, HALF_W / 3, zF, 'rgba(255,255,255,0.05)');
      // line of scrimmage
      line(-HALF_W, this.losZ, HALF_W, this.losZ, 'rgba(255,210,63,0.35)', 2);
      // 3pt arc + key
      c.shadowBlur = 10; c.shadowColor = '#ff3df0'; c.strokeStyle = '#ff3df0'; c.lineWidth = 2; c.beginPath();
      let first = true;
      for (let a = -Math.PI; a <= 0.001; a += Math.PI / 40) { const x = Math.cos(a) * ARC, z = HOOP_Z + Math.sin(a) * ARC; if (Math.abs(x) > HALF_W || z < zN) { first = true; continue; } const p = this.proj(x, z); if (!p) continue; if (first) { c.moveTo(p.x, p.y); first = false; } else c.lineTo(p.x, p.y); }
      c.stroke(); c.shadowBlur = 0;
      quad(-6, HOOP_Z - 14, 6, FIELD_END, 'rgba(255,61,240,0.08)');
      // drawables sorted by depth
      const items = [];
      this.ents.forEach((e) => items.push({ z: e.z, fn: () => this.drawEnt(e) }));
      items.push({ z: HOOP_Z + 0.1, fn: () => this.drawHoop() });
      items.push({ z: this.ball.z - 0.05, fn: () => this.drawBall() });
      this.particles.forEach((q) => items.push({ z: q.z, fn: () => { const p = this.proj(q.x, q.z, q.h); if (!p) return; c.globalAlpha = clamp(q.life, 0, 1); c.fillStyle = q.color; c.fillRect(p.x - p.s * 0.2, p.y - p.s * 0.2, p.s * 0.4, p.s * 0.4); c.globalAlpha = 1; } }));
      items.sort((a, b) => b.z - a.z).forEach((i) => i.fn());
      // pass target hint
      if (this.mode === 'attack' && this.ball.state === 'held' && this.ball.holder && this.ball.holder.team === 'us' && !this.paused && !this.over) {
        const t = this.bestTarget();
        if (t) { const p = this.proj(t.x, t.z, 4.6); if (p) { c.fillStyle = '#ffd23f'; c.font = `bold ${Math.max(10, p.s * 1.1)}px Inter, sans-serif`; c.textAlign = 'center'; c.fillText('▼', p.x, p.y); c.textAlign = 'left'; } }
      }
      // off-screen teammates: edge arrows
      this.us.forEach((e) => {
        const p = this.proj(e.x, e.z, 2.5); if (!p || (p.x > 6 && p.x < W - 6)) return;
        const left = p.x <= 6, y = clamp(p.y, 60, H - 160), x = left ? 4 : W - 4;
        c.fillStyle = e === this.ctrl ? '#ffd23f' : 'rgba(61,252,255,.85)';
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (left ? 16 : -16), y - 11); c.lineTo(x + (left ? 16 : -16), y + 11); c.closePath(); c.fill();
        c.font = 'bold 11px Orbitron, monospace'; c.textAlign = left ? 'left' : 'right'; c.fillText(String(e.p.num), x + (left ? 19 : -19), y + 4); c.textAlign = 'left';
      });
      // HUD numbers on canvas edge: clock bar
      const frac = clamp(this.clock / this.clock0, 0, 1);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, 0, W, 4);
      c.fillStyle = frac < 0.25 ? '#ff3b4e' : '#3dfcff'; c.fillRect(0, 0, W * frac, 4);
      const hud = document.getElementById('livehud');
      if (hud) {
        const s = `${this.mode === 'attack' ? 'ATTACK' : 'DEFENCE'} · Down ${Math.min(this.down, this.downs)}/${this.downs} · ${Math.max(0, this.clock).toFixed(1)}s`;
        if (hud.textContent !== s) hud.textContent = s;
      }
    }
    drawEnt(e) {
      const c = this.ctx;
      const p = this.proj(e.x, e.z, 0);
      if (!p) return;
      const hpx = p.s * 4.4, wpx = hpx * 0.625;
      // shadow / selection ring
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(p.x, p.y, wpx * 0.42, wpx * 0.12, 0, 0, Math.PI * 2); c.fill();
      if (e === this.ctrl) {
        c.strokeStyle = '#ffd23f'; c.lineWidth = 2.5; c.shadowBlur = 12; c.shadowColor = '#ffd23f';
        c.beginPath(); c.ellipse(p.x, p.y, wpx * 0.55, wpx * 0.17, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0;
      } else if (e.team === 'us') { c.strokeStyle = 'rgba(61,252,255,.5)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(p.x, p.y, wpx * 0.45, wpx * 0.13, 0, 0, Math.PI * 2); c.stroke(); }
      // run bob + N jitter
      const moving = Math.hypot(e.vx, e.vz) > 1;
      let jx = 0, by = moving ? Math.abs(Math.sin(this.t * 12 + (e.idx || 0))) * p.s * 0.25 : 0;
      if (e.p.b5 && e.p.b5.N >= 7 && (this.clutch || this.paused)) jx = Math.sin(this.t * 40) * p.s * 0.06;
      const flip = e.vx < -0.5;
      if (e.img && e.img.complete && e.img.naturalWidth) {
        c.save();
        c.translate(p.x + jx, p.y - by);
        if (flip) c.scale(-1, 1);
        if (e.stun > 0) c.globalAlpha = 0.5;
        c.drawImage(e.img, -wpx / 2, -hpx, wpx, hpx);
        c.restore();
      } else { c.fillStyle = e.team === 'us' ? OUR : this.oppColor; c.fillRect(p.x - wpx / 4, p.y - hpx, wpx / 2, hpx); }
      if (e === this.ctrl && e.p.name) { c.fillStyle = '#ffd23f'; c.font = `600 ${Math.max(10, p.s * 0.9)}px Inter, sans-serif`; c.textAlign = 'center'; c.fillText(e.p.name.split(' ')[0], p.x, p.y - hpx - 4); c.textAlign = 'left'; }
    }
    drawHoop() {
      const c = this.ctx;
      const base = this.proj(0, HOOP_Z + 4, 0), top = this.proj(0, HOOP_Z + 4, 11);
      if (!base || !top) return;
      c.strokeStyle = '#5a6a8a'; c.lineWidth = Math.max(2, base.s * 0.4); c.beginPath(); c.moveTo(base.x, base.y); c.lineTo(top.x, top.y); c.stroke();
      const bb = this.proj(-3.2, HOOP_Z + 2, 12.5), bb2 = this.proj(3.2, HOOP_Z + 2, 8);
      c.shadowBlur = 14; c.shadowColor = '#3dfcff'; c.strokeStyle = '#3dfcff'; c.lineWidth = 2;
      c.fillStyle = 'rgba(61,252,255,.12)'; c.fillRect(bb.x, bb.y, bb2.x - bb.x, bb2.y - bb.y); c.strokeRect(bb.x, bb.y, bb2.x - bb.x, bb2.y - bb.y);
      const ring = this.proj(0, HOOP_Z, 9);
      c.strokeStyle = '#ff8c32'; c.shadowColor = '#ff8c32'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(ring.x, ring.y, ring.s * 1.4, ring.s * 0.45, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1;
      const sw = this.netT > 0 ? Math.sin(this.t * 40) * ring.s * 0.25 * this.netT : 0;
      if (this.netT > 0) { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.6; }
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(ring.x + i * ring.s * 0.55, ring.y + ring.s * 0.3); c.lineTo(ring.x + i * ring.s * 0.3 + sw, ring.y + ring.s * (1.6 + (this.netT > 0 ? 0.4 : 0))); c.stroke(); }
      if (this.rimT > 0) { c.strokeStyle = `rgba(255,220,120,${this.rimT * 2.5})`; c.lineWidth = 6; c.shadowBlur = 20; c.shadowColor = '#ffb040'; c.beginPath(); c.ellipse(ring.x, ring.y, ring.s * 1.4, ring.s * 0.45, 0, 0, Math.PI * 2); c.stroke(); c.shadowBlur = 0; }
      if (this.boardT > 0) { c.fillStyle = `rgba(61,252,255,${this.boardT * 1.6})`; c.fillRect(bb.x, bb.y, bb2.x - bb.x, bb2.y - bb.y); }
    }
    drawBall() {
      const c = this.ctx, b = this.ball;
      const g = this.proj(b.x, b.z, 0), p = this.proj(b.x, b.z, b.h);
      if (!p || !g) return;
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(g.x, g.y, p.s * 0.35, p.s * 0.1, 0, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 16; c.shadowColor = '#ffd23f'; c.fillStyle = '#ffe680';
      c.beginPath(); c.arc(p.x, p.y, Math.max(3, p.s * 0.38), 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }

    // ---------------- input ----------------
    bindInput() {
      const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
      this.kd = (ev) => {
        if (VB.QuestionUI.open) return;
        if (map[ev.key]) { this.keys[map[ev.key]] = true; ev.preventDefault(); }
        else if (ev.key === ' ') { ev.preventDefault(); this.mode === 'attack' ? this.passAction() : this.stealAction(); }
        else if (ev.key === 'e' || ev.key === 'E') this.mode === 'attack' ? this.shootAction() : this.switchAction();
        else if (ev.key === 'q' || ev.key === 'Q' || ev.key === 'Shift') this.switchAction();
      };
      this.ku = (ev) => { if (map[ev.key]) this.keys[map[ev.key]] = false; };
      this.click = (ev) => {
        if (VB.QuestionUI.open || this.mode !== 'attack') return;
        const r = this.cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
        let best = null, bd = 1e9;
        this.us.forEach((e) => { const p = this.proj(e.x, e.z, 2); if (!p) return; const d = Math.hypot(p.x - mx, p.y - my); if (d < Math.max(30, p.s * 3) && d < bd) { bd = d; best = e; } });
        if (best && best !== this.ball.holder) this.passAction(best);
      };
      window.addEventListener('keydown', this.kd); window.addEventListener('keyup', this.ku);
      this.cv.addEventListener('pointerdown', this.click);
      this.rs = () => this.resize(); window.addEventListener('resize', this.rs);
      // touch controls
      const tc = document.getElementById('touchctl');
      const show = VB.isTouch();
      tc.classList.toggle('on', show);
      tc.classList.toggle('def', this.mode !== 'attack');
      const stick = document.getElementById('stick'), knob = document.getElementById('knob');
      let sid = null, sc = null;
      this.sd = (ev) => { sid = ev.pointerId; const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; this.sm(ev); stick.setPointerCapture(ev.pointerId); ev.preventDefault(); };
      this.sm = (ev) => { if (ev.pointerId !== sid || !sc) return; let dx = ev.clientX - sc.x, dy = ev.clientY - sc.y; const m = Math.hypot(dx, dy); if (m > sc.R) { dx *= sc.R / m; dy *= sc.R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; this.stick = { x: dx / sc.R, y: -dy / sc.R }; };
      this.se = (ev) => { if (ev.pointerId !== sid) return; sid = null; this.stick = null; knob.style.transform = ''; };
      stick.addEventListener('pointerdown', this.sd); stick.addEventListener('pointermove', this.sm); stick.addEventListener('pointerup', this.se); stick.addEventListener('pointercancel', this.se);
      this.b1 = (ev) => { ev.preventDefault(); this.mode === 'attack' ? this.passAction() : this.stealAction(); };
      this.b2 = (ev) => { ev.preventDefault(); this.mode === 'attack' ? this.shootAction() : this.switchAction(); };
      document.getElementById('tbtn1').addEventListener('pointerdown', this.b1);
      document.getElementById('tbtn2').addEventListener('pointerdown', this.b2);
      document.getElementById('tbtn1').textContent = this.mode === 'attack' ? 'PASS' : 'STEAL';
      document.getElementById('tbtn2').textContent = this.mode === 'attack' ? 'SHOOT' : 'SWITCH';
      document.getElementById('livekeys').innerHTML = this.mode === 'attack'
        ? '<b>WASD/↑↓←→</b> move · <b>Space</b> pass (▼ = target) · <b>click</b> a teammate to pass · <b>E</b> shoot'
        : '<b>WASD/↑↓←→</b> move · <b>Space</b> steal (asks a question) · <b>E/Q</b> switch player · be close when they shoot to <b>contest</b>';
      // first touch on a laptop with a touchscreen reveals the controls
      this.ft = () => tc.classList.add('on');
      window.addEventListener('touchstart', this.ft, { once: true });
    }
    unbind() {
      window.removeEventListener('keydown', this.kd); window.removeEventListener('keyup', this.ku);
      window.removeEventListener('resize', this.rs); this.cv.removeEventListener('pointerdown', this.click);
      window.removeEventListener('touchstart', this.ft);
      const stick = document.getElementById('stick');
      stick.removeEventListener('pointerdown', this.sd); stick.removeEventListener('pointermove', this.sm); stick.removeEventListener('pointerup', this.se); stick.removeEventListener('pointercancel', this.se);
      document.getElementById('tbtn1').removeEventListener('pointerdown', this.b1);
      document.getElementById('tbtn2').removeEventListener('pointerdown', this.b2);
    }
  }
  VB.Drive = Drive;

  // Quick simulation of a drive (used by "Sim drive")
  VB.simDrive = function (sim, mode) {
    const us = [], g = sim.grid;
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) if (g[r][l]) us.push(g[r][l]);
    const avg = (k) => us.reduce((s, p) => s + p.sk[k] + ((p.form || {})[k === 'sht' ? 'sht' : k === 'pas' ? 'pas' : 'def'] || 0) * 3, 0) / Math.max(1, us.length);
    const opp = sim.opp.rating;
    if (mode === 'attack') { const pr = clamp(0.38 + (avg('sht') * 0.6 + avg('pas') * 0.4 - opp) / 80, 0.15, 0.7); return R() < pr ? { us: R() < 0.25 ? 3 : 2, them: 0, text: 'Simulated: score.' } : { us: 0, them: 0, text: 'Simulated: no score.' }; }
    const pr = clamp(0.45 - (avg('def') - opp) / 80, 0.15, 0.7);
    return R() < pr ? { us: 0, them: 2, text: 'Simulated: they scored.' } : { us: 0, them: 0, text: 'Simulated: stop.' };
  };

  // ---------------- Question overlay ----------------
  VB.QuestionUI = {
    open: false,
    show(q, o) {
      const el = document.getElementById('qbox');
      this.open = true; this.current = q;
      return new Promise((resolve) => {
        const lvlName = ['', 'Level 1 · recall', 'Level 2 · account', 'Level 3 · reasoning'][q.lvl];
        el.innerHTML = `<div class="qcard lvl${q.lvl}">
          <div class="qtop"><span class="qlabel">${o.label}</span><span class="qlvl">${lvlName}</span></div>
          <div class="qtimer"><i></i></div>
          ${o.nerves ? `<div class="qnerves">${o.nerves}</div>` : ''}
          <div class="qprompt">${q.prompt}</div>
          <div class="qstem ${q.kind === 'ex' ? 'ex' : ''}">${q.kind === 'ex' ? q.stem.replace(new RegExp(q.term, 'i'), (m) => `<b class="cterm">${m}</b>`) : q.stem}</div>
          <div class="qopts">${q.options.map((t, i) => `<button class="qopt" data-i="${i}"><span class="k">${i + 1}</span><span>${t}</span></button>`).join('')}</div>
          <div class="qfoot"></div></div>`;
        el.classList.add('on');
        const bar = el.querySelector('.qtimer i');
        const T = Math.max(4, o.time);
        let left = T, done = false, timer;
        const tick = () => {
          left -= 0.1; bar.style.width = (100 * left) / T + '%';
          if (left < 3) bar.classList.add('low');
          if (left <= 0) answer(-1);
        };
        timer = setInterval(tick, 100);
        const answer = (i) => {
          if (done) return; done = true; clearInterval(timer);
          const ok = i === q.answer;
          VB.sfx(ok ? 'right' : 'wrong');
          const btns = el.querySelectorAll('.qopt');
          btns.forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('right'); else if (k === i) b.classList.add('wrong'); });
          const foot = el.querySelector('.qfoot');
          if (ok) {
            foot.innerHTML = `<div class="qres good">✔ ${q.term}: correct!</div>`;
            el.querySelector('.qcard').classList.add('flash-good');
            setTimeout(close, 650);
          } else {
            el.querySelector('.qcard').classList.add('flash-bad');
            foot.innerHTML = `<div class="qres bad">${i < 0 ? '⏱ Time!' : '✘ Not quite.'} Turnover.</div>
              <button class="btn small" data-x="explain">Explain ▸</button><div class="qauto"><i></i></div>`;
            const auto = setTimeout(close, 3500);
            foot.querySelector('.qauto i').style.animation = 'qauto 3.5s linear forwards';
            foot.querySelector('[data-x=explain]').onclick = () => {
              clearTimeout(auto);
              foot.innerHTML = `<div class="qexplain"><div><b>${q.term}</b>: ${q.def}</div>${q.why ? `<div>${q.why}</div>` : ''}${q.tip && q.tip !== q.why ? `<div class="tip">${q.tip}</div>` : ''}<div class="src">Source: ${q.src}</div></div><button class="btn" data-x="go">Continue ▸</button>`;
              foot.querySelector('[data-x=go]').onclick = close;
            };
          }
          function close() { el.classList.remove('on'); el.innerHTML = ''; VB.QuestionUI.open = false; window.removeEventListener('keydown', key); resolve(ok); }
        };
        el.querySelectorAll('.qopt').forEach((b) => (b.onclick = () => answer(+b.dataset.i)));
        const key = (ev) => { const n = +ev.key; if (n >= 1 && n <= 4 && !done) { ev.preventDefault(); ev.stopPropagation(); answer(n - 1); } };
        window.addEventListener('keydown', key);
      });
    },
  };
})();
