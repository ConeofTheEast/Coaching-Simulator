/* Vaultball Coach — match simulation. Skill and coaching choices decide most of it; dice add a little noise.
   Injuries are mostly deterministic: every match at HIGH risk fills an exposure pip; at 3 pips the player gets hurt. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const clamp = VB.clamp;
  const ACCIDENT_P = { low: 0, medium: 0, high: 0, 'very high': 0.025 }; // risk is never zero
  const KNOCK_P = { low: 0, medium: 0.025, high: 0.03, 'very high': 0.03 };
  const ORDER = ['low', 'medium', 'high', 'very high'];

  class MatchSim {
    constructor(state, opp) {
      this.s = state; this.opp = opp;
      this.q = 0; this.us = 0; this.them = 0;
      this.plays = []; this.injuries = []; this.subs = []; this.played = new Set();
      this.half = null; this.momentum = { us: 0, them: 0 };
      this.syn = VB.computeSynergy(state);
      this.f = { clutchLost: 0, clutchPlays: 0, assists: 0, glueAssists: 0, hogShots: 0, outOfRole: new Set(), fatigueCost: 0, fatigueN: 0, keg: !!this.syn.flags.powderKeg };
      this.live = {};
      this.bench = state.bench.map((id) => VB.byId(state, id)).filter((p) => p && !VB.isOut(p) && !p.week.sitOut);
      this.grid = [[], [], []];
      for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
        let p = VB.byId(state, state.lineup[r][l]);
        if (!p || VB.isOut(p) || p.week.sitOut) { const sub = this.takeBench(VB.ROW_ROLE[r]); if (p) this.subs.push(`${sub ? sub.name : 'Nobody'} starts for ${p.name}`); p = sub; }
        this.grid[r][l] = p || null;
        if (p) this.enter(p);
      }
      this.oppGrid = VB.makeOpponentTeam(opp);
      // risk exposure snapshot for the report
      this.startRisk = {}; this.maxCat = {};
      this.each((p, r) => { const rk = VB.risk(p, { opp }, VB.ROW_ROLE[r]); this.startRisk[p.id] = rk.cat; this.maxCat[p.id] = rk.cat; state.metrics.riskExposure[rk.cat]++; });
    }
    takeBench(role) {
      let i = this.bench.findIndex((b) => b.role === role);
      if (i < 0) i = 0;
      if (!this.bench.length) return null;
      return this.bench.splice(i, 1)[0];
    }
    enter(p) { this.played.add(p.id); if (!this.live[p.id]) this.live[p.id] = { fat: p.fatigue, pts: 0, ast: 0 }; }
    each(fn) { for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) if (this.grid[r][l]) fn(this.grid[r][l], r, l); }

    clutchPen(p) {
      if (p.week.arousal) return 0;
      let pen = Math.max(0, p.b5.N - 4) * 2.4 * (1 - p.mt.control / 14);
      if (p.week.clutchRole) pen *= 1.5;
      if (p.week.selfTalk) pen *= 0.5;
      if (this.half === 'talk') pen *= 0.6;
      if (this.syn.flags.powderKeg) pen *= 1.3;
      if (this.syn.flags.iceVeins) pen -= 2;
      if (this.syn.flags.ironCore) pen -= 1.5;
      return Math.max(0, pen);
    }
    eff(p, key, r, clutch) {
      let v = p.sk[key];
      const slot = VB.ROW_ROLE[r];
      if (slot !== p.role) { v -= 10; this.f.outOfRole.add(p.name); }
      const fat = this.live[p.id].fat;
      const fc = fat * 0.12; v -= fc; this.f.fatigueCost += fc; this.f.fatigueN++;
      v += (p.mt.confidence - 5) * 1.2;
      if (p.health < 50) v -= 4;
      if (clutch) { const c = this.clutchPen(p); v -= c; this.f.clutchLost += c; this.f.clutchPlays++; }
      return v;
    }
    oppEff(o, key) { return o.sk[key] - (20 + this.q * 6) * 0.12; }

    possession(side, lane, clutch) {
      if (side === 'us') {
        const st = this.grid[0][lane], lk = this.grid[1][lane];
        const shooterBase = st || lk;
        if (!shooterBase) return this.push({ side, lane, made: false, text: `${VB.LANES[lane]} lane is empty — turnover.` });
        const oa = this.oppGrid[2][lane], ol = this.oppGrid[1][lane];
        let atk = st ? this.eff(st, 'sht', 0, clutch) * 0.6 + (lk ? this.eff(lk, 'pas', 1, clutch) : 30) * 0.4 : this.eff(lk, 'sht', 1, clutch);
        atk += this.syn.chem * 0.4 + (this.half === 'tempo' ? 4 : 0) + this.momentum.us;
        if (this.syn.flags.silent) atk -= 3;
        const def = this.oppEff(oa, 'def') * 0.7 + this.oppEff(ol, 'def') * 0.3;
        const pr = clamp(0.47 + (atk - def) / 70, 0.12, 0.85);
        // who shoots? Links sometimes take the long "vault" for 3
        let shooter = st, assister = lk, pts = 2;
        if (!st || (lk && VB.rand() < clamp(0.16 + (lk.sk.sht - st.sk.sht) / 200, 0.05, 0.4))) { shooter = lk; assister = st; pts = 3; }
        const made = VB.rand() < pr;
        this.momentum.us = 0;
        let ast = null;
        if (made) {
          this.us += pts; this.live[shooter.id].pts += pts;
          let ap = assister ? 0.3 + assister.b5.A * 0.045 + (this.syn.flags.glue ? 0.1 : 0) : 0;
          if (assister && shooter.b5.A <= 3) { ap -= 0.18; this.f.hogShots++; }
          const glueLink = this.syn.links.some((k) => k.type === 'glue' && (k.a[1] === lane || k.b[1] === lane));
          if (glueLink) ap += 0.08;
          if (assister && VB.rand() < ap) { ast = assister; this.live[assister.id].ast++; this.f.assists++; if (this.syn.flags.glue || glueLink) this.f.glueAssists++; }
          if (this.syn.flags.loud) this.momentum.us = 3;
        }
        return this.push({ side, lane, made, pts, shooter, ast, shooterRow: shooter === st ? 0 : 1, clutch,
          text: made ? `${shooter.name} ${pts === 3 ? 'vaults one in from deep' : 'scores'}${ast ? ` — assist ${ast.name}` : ''}.` : `${shooter.name} misses${clutch && this.clutchPen(shooter) > 4 ? ' — nerves showing' : ''}.` });
      }
      // opponent possession
      const os = this.oppGrid[0][lane], ol = this.oppGrid[1][lane];
      const ua = this.grid[2][lane], ul = this.grid[1][lane];
      const atk = this.oppEff(os, 'sht') * 0.6 + this.oppEff(ol, 'pas') * 0.4 + this.momentum.them;
      const def = (ua ? this.eff(ua, 'def', 2, clutch) : 25) * 0.7 + (ul ? this.eff(ul, 'def', 1, clutch) : 25) * 0.3 + this.syn.chem * 0.3;
      const pr = clamp(0.47 + (atk - def) / 70, 0.12, 0.85);
      const made = VB.rand() < pr;
      const pts = VB.rand() < 0.2 ? 3 : 2;
      if (made) this.them += pts;
      return this.push({ side, lane, made, pts, oppName: os.name, shooterRow: 0, clutch, text: made ? `${this.opp.name} score in the ${VB.LANES[lane]} lane.` : `${ua ? ua.name : 'Your defence'} shuts down the ${VB.LANES[lane]} lane.` });
    }
    push(pl) { pl.q = this.q; pl.score = [this.us, this.them]; this.plays.push(pl); return pl; }

    quarter(n) {
      n = n || 3;
      this.q++;
      const plays0 = this.plays.length;
      // fatigue rises through the match
      this.each((p) => { this.live[p.id].fat = clamp(this.live[p.id].fat + 7 * (1 - p.sk.fit / 200) + (this.half === 'tempo' ? 4 : 0), 0, 100); });
      const order = [];
      for (let i = 0; i < n; i++) for (let l = 0; l < 3; l++) order.push(['us', l], ['them', l]);
      VB.shuffle(order).forEach(([side, lane]) => {
        const clutch = this.q === 4 && Math.abs(this.us - this.them) <= 8;
        this.possession(side, lane, clutch);
      });
      this.injuryCheck();
      return this.plays.slice(plays0);
    }

    injuryCheck() {
      const late = this.q === 4;
      this.each((p, r, l) => {
        const live = this.live[p.id];
        const saved = p.fatigue; p.fatigue = live.fat;
        const rk = VB.risk(p, { opp: this.opp, lateGame: late && live.fat >= 60 }, VB.ROW_ROLE[r]);
        p.fatigue = saved;
        if (ORDER.indexOf(rk.cat) > ORDER.indexOf(this.maxCat[p.id] || 'low')) this.maxCat[p.id] = rk.cat;
        const due = (p.exposure || 0) + Math.max(0, VB.EXPOSURE_INC[this.maxCat[p.id]]) >= 3;
        const roll = VB.rand();
        if (due || roll < ACCIDENT_P[rk.cat]) {
          const type = VB.chooseAcuteInjury(p, rk, { opp: this.opp, role: VB.ROW_ROLE[r] });
          const cause = rk.L.factors.concat(rk.S.factors.filter((f) => !f.base)).map((f) => ({ label: f.label, concept: f.concept }));
          const inj = VB.injure(this.s, p, type, cause);
          p.exposure = 0; this.hurt = this.hurt || new Set(); this.hurt.add(p.id);
          const def = VB.INJURIES[type];
          const rec = { p, type, name: def.name, kind: def.kind, weeks: inj.weeks, cat: rk.cat, L: rk.L, S: rk.S, q: this.q, due };
          this.injuries.push(rec);
          if (inj.weeks > 0) {
            const sub = this.takeBench(VB.ROW_ROLE[r]);
            this.grid[r][l] = sub || null;
            if (sub) { this.enter(sub); this.live[sub.id].fat = sub.fatigue; this.subs.push(`${sub.name} replaces injured ${p.name}`); }
          }
          this.push({ side: 'injury', lane: l, row: r, injured: p, injName: def.name, text: `INJURY — ${p.name}: ${def.name} (${rk.cat} risk).` });
        } else if (roll < KNOCK_P[rk.cat] && !p.niggle) {
          p.niggle = true;
          this.push({ side: 'knock', lane: l, row: r, text: `${p.name} takes a knock and feels something tighten.` });
        }
      });
    }

    halftime(choice) {
      this.half = choice;
      if (choice === 'rotate') {
        let worst = null;
        this.each((p, r, l) => { if (!worst || this.live[p.id].fat > this.live[worst.p.id].fat) worst = { p, r, l }; });
        const sub = worst && this.takeBench(VB.ROW_ROLE[worst.r]);
        if (sub) { this.grid[worst.r][worst.l] = sub; this.enter(sub); this.live[sub.id].fat = sub.fatigue; this.bench.push(worst.p); this.subs.push(`${sub.name} rotates in for tired ${worst.p.name}`); }
        this.each((p) => (this.live[p.id].fat = clamp(this.live[p.id].fat - 6, 0, 100)));
        return sub ? `${sub.name} in for ${worst.p.name}. Fresh legs.` : 'No one on the bench to rotate.';
      }
      if (choice === 'talk') return 'Self-talk huddle: cue words for the second half. Clutch nerves reduced.';
      if (choice === 'tempo') return 'Push the tempo: more attack, but fatigue climbs faster (late-game injury risk).';
      return '';
    }

    overtime() {
      // sudden death: alternate lanes until someone leads
      let guard = 0;
      while (this.us === this.them && guard++ < 12) {
        const lane = guard % 3;
        this.possession('us', lane, true); this.possession('them', lane, true);
      }
    }
    finish() {
      const s = this.s;
      const played = [...this.played];
      // exposure: high-risk matches fill pips, low-risk matches drain them, rest drains them
      s.roster.forEach((p) => {
        if (this.hurt && this.hurt.has(p.id)) return;
        if (!this.played.has(p.id)) { p.exposure = Math.max(0, (p.exposure || 0) - 1); return; }
        const cat = this.maxCat[p.id] || 'low';
        p.exposure = clamp((p.exposure || 0) + VB.EXPOSURE_INC[cat], 0, 3);
      });
      played.forEach((id) => {
        const p = VB.byId(s, id); const lv = this.live[id];
        p.stats.gp++; p.stats.pts += lv.pts; p.stats.ast += lv.ast;
        const ss = (p.seasonStats[s.season] = p.seasonStats[s.season] || { gp: 0, pts: 0, ast: 0 });
        ss.gp++; ss.pts += lv.pts; ss.ast += lv.ast;
        p.fatigue = lv.fat;
      });
      return { us: this.us, them: this.them, played, plays: this.plays, injuries: this.injuries, subs: this.subs, f: this.f, live: this.live, tempo: this.half === 'tempo', syn: this.syn, startRisk: this.startRisk };
    }
  }
  VB.MatchSim = MatchSim;

  // Build the three-line "film room" recap: result, biggest factor, injuries.
  VB.filmRoom = function (state, res, opp) {
    const lines = [];
    const won = res.us > res.them;
    lines.push({ text: `${won ? 'WIN' : 'LOSS'} ${res.us}–${res.them} vs ${opp.name}.`, tone: won ? 'good' : 'bad' });
    const f = res.f;
    const cands = [];
    if (f.clutchPlays > 0) cands.push({ v: f.clutchLost / Math.max(1, f.clutchPlays) * 3, text: `Clutch nerves: high-Neuroticism players lost about ${Math.round(f.clutchLost / Math.max(1, f.clutchPlays))} skill points per late, close play. Self-talk and arousal regulation help.`, concept: 'big5_N', tone: 'bad' });
    if (f.glueAssists >= 3) cands.push({ v: f.glueAssists * 2, text: `Teamwork: ${f.glueAssists} assists came from agreeable players and Glue links.`, concept: 'big5_A', tone: 'good' });
    if (f.hogShots >= 3) cands.push({ v: f.hogShots * 2, text: `Ball-hogging: low-Agreeableness shooters ignored open teammates ${f.hogShots} times.`, concept: 'big5_A', tone: 'bad' });
    const fat = f.fatigueCost / Math.max(1, f.fatigueN);
    if (fat >= 6) cands.push({ v: fat * 1.4, text: `Fatigue cost about ${Math.round(fat)} skill points per play. Tired bodies play worse and get hurt more.`, concept: 'training_volume', tone: 'bad' });
    if (f.outOfRole.size) cands.push({ v: 6 + f.outOfRole.size, text: `Out of position: ${[...f.outOfRole].slice(0, 3).join(', ')} played an unfamiliar role (−10).`, concept: 'position', tone: 'bad' });
    if (res.syn.chem >= 6) cands.push({ v: res.syn.chem, text: `Chemistry +${res.syn.chem}: your personality mix gave every play a boost.`, concept: 'interactionism', tone: 'good' });
    if (res.syn.chem <= -4) cands.push({ v: -res.syn.chem, text: `Chemistry ${res.syn.chem}: clashes and nerves dragged every play down.`, concept: 'interactionism', tone: 'bad' });
    cands.sort((a, b) => b.v - a.v);
    cands.slice(0, 2).forEach((c) => lines.push(c));
    res.injuries.forEach((i) => {
      const top = i.L.factors.filter((x) => x.d > 0).map((x) => x.label.toLowerCase()).slice(0, 3).join(', ') || 'contact';
      lines.push({ text: `${i.p.name}: ${i.name} (${i.kind}). ${i.due ? 'Repeated matches at high risk caught up with them' : 'An accident at ' + i.cat.toUpperCase() + ' risk'}: ${top}.${i.weeks ? ` Out ${i.weeks} wk.` : ' Minor.'}`, concept: 'risk', tone: 'bad' });
    });
    if (!res.injuries.length) {
      const hi = Object.values(res.startRisk).filter((c) => c === 'high' || c === 'very high').length;
      lines.push(hi ? { text: `No injuries — but ${hi} player${hi > 1 ? 's were' : ' was'} at high risk. That was luck, not planning.`, concept: 'risk', tone: 'neutral' } : { text: 'No injuries. Every player was at an acceptable risk level.', concept: 'risk', tone: 'good' });
    }
    return lines;
  };
})();
