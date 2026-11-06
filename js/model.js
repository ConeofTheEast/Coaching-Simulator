/* Vaultball Coach — core model: players, risk, synergy, weekly processing. No DOM here. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});

  // ---------------- RNG (seeded so a run is reproducible) ----------------
  let _seed = 1;
  VB.seed = function (s) { _seed = (s >>> 0) || 1; };
  VB.rand = function () {
    _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  VB.randInt = (a, b) => a + Math.floor(VB.rand() * (b - a + 1));
  VB.pick = (arr) => arr[Math.floor(VB.rand() * arr.length)];
  VB.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(VB.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  VB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp = VB.clamp;
  const r1 = (v) => Math.round(v * 10) / 10;

  // ---------------- Players ----------------
  let _id = 1;
  VB.makePlayer = function (t, season) {
    const p = {
      id: 'p' + _id++,
      name: t.name, age: t.age, role: t.role, num: t.num || VB.randInt(1, 99),
      b5: { O: t.b5[0], C: t.b5[1], E: t.b5[2], A: t.b5[3], N: t.b5[4] },
      mt: { control: t.mt[0], commitment: t.mt[1], challenge: t.mt[2], confidence: t.mt[3] },
      sc: t.sc,
      sk: { sht: t.sk[0], pas: t.sk[1], def: t.sk[2], fit: t.sk[3] },
      health: t.health, fatigue: VB.randInt(10, 25), strain: VB.randInt(10, 30), stress: 20 + t.b5[4] * 3,
      history: (t.history || []).map((h) => ({ type: h.type, season: h.season ?? season ?? 0, cleared: !!h.cleared, rehab: 0 })),
      injury: null, exposure: 0, prehab: 0, ppe: false, rest: false, earlyReturn: 0, niggle: false,
      week: {}, traitProgress: { O: 0, C: 0, E: 0, A: 0, N: 0 },
      stats: { gp: 0, pts: 0, ast: 0 }, seasonStats: {},
      note: t.note || '', known: { all: true }, selfReport: null,
    };
    if (p.name === 'Orrin Vale') p.stress = 62;
    return p;
  };

  VB.ovr = function (p, role) {
    role = role || p.role;
    const s = p.sk;
    let v;
    if (role === 'STR') v = s.sht * 0.55 + s.pas * 0.15 + s.def * 0.1 + s.fit * 0.2;
    else if (role === 'LNK') v = s.sht * 0.15 + s.pas * 0.55 + s.def * 0.1 + s.fit * 0.2;
    else v = s.sht * 0.05 + s.pas * 0.15 + s.def * 0.6 + s.fit * 0.2;
    return Math.round(v);
  };
  VB.mtAvg = (p) => (p.mt.control + p.mt.commitment + p.mt.challenge + p.mt.confidence) / 4;
  VB.ppg = (p) => (p.stats.gp ? p.stats.pts / p.stats.gp : 0);
  VB.apg = (p) => (p.stats.gp ? p.stats.ast / p.stats.gp : 0);
  VB.isOut = (p) => !!(p.injury && p.injury.weeks > 0);
  VB.unrehabbed = (p) => p.history.filter((h) => !h.cleared);
  VB.hidesPain = (p) => VB.mtAvg(p) >= 6.5 && p.sc <= 4;

  // Behaviour likelihoods driven by Big Five (shown on the card back as multipliers)
  VB.behaviours = function (p) {
    const b = p.b5;
    return [
      { key: 'adhere', label: 'Sticks to training plan', trait: 'C', pct: clamp(Math.round(15 + b.C * 7 + p.mt.commitment * 2), 5, 98) },
      { key: 'composed', label: 'Stays composed in clutch', trait: 'N', pct: clamp(Math.round(100 - b.N * 8 + p.mt.control * 2 - 10), 5, 98) },
      { key: 'share', label: 'Passes / creates assists', trait: 'A', pct: clamp(Math.round(10 + b.A * 8), 5, 98) },
      { key: 'energy', label: 'Lifts team energy', trait: 'E', pct: clamp(Math.round(5 + b.E * 9), 5, 98) },
      { key: 'newmethods', label: 'Embraces new methods', trait: 'O', pct: clamp(Math.round(5 + b.O * 9), 5, 98) },
      { key: 'hidepain', label: 'Hides pain / skips rehab', trait: 'MT', pct: clamp(Math.round((VB.mtAvg(p) - 5) * 14 + (6 - p.sc) * 11 + 20), 3, 95), bad: true },
    ];
  };

  // ---------------- Adherence (deterministic) ----------------
  // Score on a 0-10 scale. ≥6 completes, ≥4 partial, else skips.
  VB.adherence = function (p, card, state) {
    let s = 0.55 * p.b5.C + 0.45 * p.mt.commitment;
    const why = [`C ${p.b5.C}`, `Commitment ${p.mt.commitment}`];
    if (card && card.team && p.b5.E >= 7) { s += 1; why.push('enjoys group work (E)'); }
    if (card && card.psych && p.b5.O <= 3) { s -= 1; why.push('sceptical of new methods (low O)'); }
    if (card && card.rehab) {
      s = 0.5 * p.b5.C + 0.5 * p.sc + 0.5;
      why.length = 0; why.push(`C ${p.b5.C}`, `Self-compassion ${p.sc}`);
      if (VB.hidesPain(p)) { s -= 2; why.push('"tough" — wants to rush back'); }
    }
    if (p.stress >= 70) { s -= 1; why.push('high stress'); }
    if (state && state.synergy && state.synergy.flags.looseHabits) { s -= 0.7; why.push('Loose Habits aura'); }
    if (state && state.synergy && state.synergy.flags.engine) { s += 0.5; why.push('Engine Room aura'); }
    s = r1(s);
    const outcome = s >= 6 ? 'full' : s >= 4 ? 'partial' : 'skip';
    return { score: s, outcome, why };
  };
  VB.psychMult = function (p, state) {
    let m = 0.6 + p.b5.O * 0.08;
    if (state && state.synergy) {
      if (state.synergy.flags.lab) m *= 1.25;
      if (state.synergy.flags.setInWays) m *= 0.8;
    }
    return m;
  };

  // ---------------- Risk (B.3.1) ----------------
  VB.slotRole = function (state, p) {
    const pos = VB.findSlot(state, p.id);
    if (pos && pos.row >= 0) return VB.ROW_ROLE[pos.row];
    return p.role;
  };
  VB.likelihood = function (p, ctx) {
    ctx = ctx || {};
    const f = [];
    let L = 1;
    const add = (d, label, kind, concept) => { L += d; f.push({ d, label, kind, concept }); };
    if (p.fatigue >= 75) add(2, 'Very fatigued', 'internal', 'training_volume');
    else if (p.fatigue >= 45) add(1, 'Fatigued', 'internal', 'training_volume');
    if (p.week.volume) add(1, 'High training volume this week', 'internal', 'training_volume');
    if (VB.unrehabbed(p).length) add(1, 'Previous injury not fully rehabbed', 'internal', 'prev_injury');
    if (p.earlyReturn > 0) add(2, 'Returned before rehab finished', 'internal', 'early_return');
    if (p.age >= 31) add(1, `Age ${p.age}`, 'internal', 'age');
    if (p.stress >= 60) add(1, 'High stress / poor sleep', 'internal', 'psych_risk');
    if (p.health < 50) add(1, 'Poor overall health', 'internal', 'internal_risk');
    if (p.niggle || p.week.playingHurt) add(1, 'Playing through pain', 'internal', 'mt_darkside');
    if (ctx.lateGame) add(1, 'Last quarter fatigue', 'external', 'late_game');
    if (p.prehab > 0) add(-1, 'Prehab programme', 'internal', 'prehab');
    L = clamp(L, 1, 5);
    return { level: L, factors: f };
  };
  VB.severity = function (p, ctx, role) {
    ctx = ctx || {};
    role = role || p.role;
    const f = [];
    let S = role === 'LNK' ? 2 : 3;
    f.push({ d: S, label: `${VB.ROLES[role].name} position (${role === 'LNK' ? 'less' : 'more'} contact)`, kind: 'external', concept: 'position', base: true });
    const add = (d, label, kind, concept) => { S += d; f.push({ d, label, kind, concept }); };
    const opp = ctx.opp;
    if (opp && opp.aggressive) add(1, 'Aggressive opponent', 'external', 'external_risk');
    if (opp && VB.SURFACES[opp.surface].artificial && !p.week.eventPPE) add(1, 'Artificial surface', 'external', 'surface');
    if (p.ppe || p.week.eventPPE) add(-1, 'Protective equipment', 'external', 'ppe');
    S = clamp(S, 1, 5);
    return { level: S, factors: f };
  };
  VB.risk = function (p, ctx, role) {
    const L = VB.likelihood(p, ctx);
    const S = VB.severity(p, ctx, role);
    const cat = VB.RISK_TABLE[L.level][S.level - 1];
    return { L, S, cat };
  };
  // Exposure pips: each match played at this risk level changes the meter. 3 pips = injury.
  VB.EXPOSURE_INC = { low: -1, medium: 0, high: 1, 'very high': 2 };
  VB.injuryDue = (p, cat) => (p.exposure || 0) + Math.max(0, VB.EXPOSURE_INC[cat]) >= 3;
  VB.RISK_COLORS = { low: '#3ddc84', medium: '#ffd23f', high: '#ff8c32', 'very high': '#ff3b4e' };

  // ---------------- Team / lineup ----------------
  // state.lineup = [[id,id,id],[...],[...]]  rows: 0 STR, 1 LNK, 2 ANC ; lanes 0..2
  // state.bench  = [id,id,id]
  VB.findSlot = function (state, id) {
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) if (state.lineup[r][l] === id) return { row: r, lane: l };
    const b = state.bench.indexOf(id);
    if (b >= 0) return { row: -1, lane: b };
    return null;
  };
  VB.byId = (state, id) => state.roster.find((p) => p.id === id);
  VB.activePlayers = function (state) {
    const out = [];
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) { const id = state.lineup[r][l]; if (id) { const p = VB.byId(state, id); if (p) out.push({ p, row: r, lane: l }); } }
    return out;
  };
  VB.outCount = (state) => state.roster.filter(VB.isOut).length;

  // Keep injured players out of the starting nine by swapping in healthy bench players.
  VB.autoFixLineup = function (state) {
    const moves = [];
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      const p = VB.byId(state, state.lineup[r][l]);
      if (!p) {
        const bi = state.bench.findIndex((id) => { const b = VB.byId(state, id); return b && !VB.isOut(b); });
        if (bi >= 0) { state.lineup[r][l] = state.bench[bi]; state.bench[bi] = null; moves.push(`${VB.byId(state, state.lineup[r][l]).name} fills an empty slot`); }
        continue;
      }
      if (p && VB.isOut(p)) {
        // prefer a healthy bench player with the matching role
        let bi = -1;
        const role = VB.ROW_ROLE[r];
        state.bench.forEach((id, i) => { const b = VB.byId(state, id); if (b && !VB.isOut(b) && (bi < 0 || b.role === role)) { if (bi < 0 || b.role === role) bi = i; } });
        if (bi >= 0) {
          const sub = state.bench[bi];
          state.bench[bi] = p.id; state.lineup[r][l] = sub;
          moves.push(`${VB.byId(state, sub).name} in for ${p.name}`);
        }
      }
    }
    return moves;
  };

  // ---------------- Synergy ----------------
  VB.computeSynergy = function (state) {
    const act = VB.activePlayers(state).filter((x) => !VB.isOut(x.p));
    const n = Math.max(1, act.length);
    const avg = { O: 0, C: 0, E: 0, A: 0, N: 0, MT: 0 };
    act.forEach(({ p }) => { for (const k of ['O', 'C', 'E', 'A', 'N']) avg[k] += p.b5[k] / n; avg.MT += VB.mtAvg(p) / n; });
    const highN = act.filter(({ p }) => p.b5.N >= 7).length;
    const auras = [];
    const flags = {};
    const A = (id, name, good, desc, concept) => { auras.push({ id, name, good, desc, concept }); flags[id] = true; };
    if (avg.C >= 6.3) A('engine', 'Engine Room', true, 'High team Conscientiousness: better training adherence and gains.', 'big5_C');
    if (avg.C <= 4.6) A('looseHabits', 'Loose Habits', false, 'Low team Conscientiousness: players skip parts of training.', 'big5_C');
    if (avg.A >= 6.3) A('glue', 'Glue', true, 'High team Agreeableness: more assists, better chemistry.', 'big5_A');
    if (avg.A <= 4.6) A('friction', 'Friction', false, 'Low team Agreeableness: ball-hogging and arguments.', 'big5_A');
    if (avg.E >= 6.4) A('loud', 'Loud Floor', true, 'High team Extraversion: scoring runs build momentum.', 'big5_E');
    if (avg.E <= 4.4) A('silent', 'Silent Floor', false, 'Low team Extraversion: nobody calls plays. Coordination suffers.', 'big5_E');
    if (avg.O >= 6.3) A('lab', 'The Lab', true, 'High team Openness: psychological training works better.', 'big5_O');
    if (avg.O <= 4.4) A('setInWays', 'Set in Their Ways', false, 'Low team Openness: new methods take hold slowly.', 'big5_O');
    if (highN >= 3) A('powderKeg', 'Powder Keg', false, `${highN} high-Neuroticism players: anxiety spreads, stress builds faster.`, 'big5_N');
    if (avg.N <= 4.3) A('iceVeins', 'Ice Veins', true, 'Emotionally stable team: composed in clutch moments.', 'big5_N');
    if (avg.MT >= 6.4) A('ironCore', 'Iron Core', true, 'Mentally tough core: handles pressure. Watch for hidden injuries.', 'mt');

    // Adjacency links between neighbouring cards
    const links = [];
    const grid = {};
    act.forEach((x) => (grid[x.row + ',' + x.lane] = x.p));
    const pairs = [];
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      const a = grid[r + ',' + l]; if (!a) continue;
      const b1 = grid[r + ',' + (l + 1)]; if (b1) pairs.push([a, b1, r, l, r, l + 1]);
      const b2 = grid[(r + 1) + ',' + l]; if (b2) pairs.push([a, b2, r, l, r + 1, l]);
    }
    let chem = 0;
    pairs.forEach(([a, b, r1_, l1, r2, l2]) => {
      const at = [r1_, l1], bt = [r2, l2];
      if (a.b5.A >= 7 && b.b5.A >= 7) { links.push({ a: at, b: bt, type: 'glue', label: 'Glue link: +assists' }); chem += 2; }
      if (a.b5.E >= 7 && b.b5.E >= 7 && (a.b5.A <= 3 || b.b5.A <= 3)) { links.push({ a: at, b: bt, type: 'clash', label: 'Clash: two loud egos' }); chem -= 3; }
      const nerv = (x, y) => x.b5.N >= 8 && y.b5.N >= 6;
      const calm = (x, y) => x.b5.N >= 8 && VB.mtAvg(y) >= 7 && y.b5.N <= 4;
      if (calm(a, b) || calm(b, a)) { links.push({ a: at, b: bt, type: 'calm', label: 'Steady hand: calms a nervous teammate' }); chem += 1; }
      else if (nerv(a, b) || nerv(b, a)) { links.push({ a: at, b: bt, type: 'nerves', label: 'Nerves spread between them' }); chem -= 2; }
    });
    if (flags.glue) chem += 4; if (flags.friction) chem -= 4;
    if (flags.loud) chem += 2; if (flags.silent) chem -= 3;
    if (flags.powderKeg) chem -= 3; if (flags.iceVeins) chem += 2;
    chem += state.chemBonus || 0;
    return { avg, auras, flags, links, chem: clamp(Math.round(chem), -20, 20), highN };
  };

  // ---------------- Trait change (Hudson et al.) ----------------
  // Which trait would a "comfort-zone challenge" push for this player?
  VB.challengeTrait = function (p) {
    const opts = [
      { t: 'N', v: p.b5.N - 5, task: 'pressure reps in front of the team', dir: -1 },
      { t: 'E', v: 5 - p.b5.E, task: 'lead the pre-game huddle', dir: 1 },
      { t: 'A', v: 5 - p.b5.A, task: 'partner drills: assist before you shoot', dir: 1 },
      { t: 'C', v: 5 - p.b5.C, task: 'keep a daily training log', dir: 1 },
      { t: 'O', v: 5 - p.b5.O, task: 'learn a new position for a week', dir: 1 },
    ].sort((a, b) => b.v - a.v);
    return opts[0];
  };
  VB.addTraitProgress = function (state, p, trait, dir) {
    p.traitProgress[trait] = (p.traitProgress[trait] || 0) + 1;
    if (p.traitProgress[trait] >= 3) {
      p.traitProgress[trait] = 0;
      const before = p.b5[trait];
      p.b5[trait] = clamp(p.b5[trait] + (dir || (trait === 'N' ? -1 : 1)), 1, 10);
      if (p.b5[trait] !== before) {
        VB.log(state, `${p.name}'s ${VB.TRAIT_NAMES[trait]} shifted ${before} → ${p.b5[trait]} after completing repeated challenges.`, 'personality_change', 'good');
        state.toasts.push({ text: `Personality shift: ${p.name} ${VB.TRAIT_NAMES[trait]} ${before}→${p.b5[trait]}`, concept: 'personality_change' });
        state.metrics.traitShifts++;
        return true;
      }
    }
    return false;
  };
  VB.TRAIT_NAMES = { O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism' };

  // ---------------- Injuries ----------------
  VB.injure = function (state, p, typeId, cause) {
    const def = VB.INJURIES[typeId];
    let weeks = VB.randInt(def.weeks[0], def.weeks[1]);
    if (p.age >= 31 && weeks > 0) weeks += 1; // older athletes recover more slowly
    p.injury = { type: typeId, weeks, total: weeks, kind: def.kind, nonlinear: !!def.nonlinear, rehab: 0, cause: cause || [] };
    p.niggle = false; p.earlyReturn = 0;
    p.health = clamp(p.health - (weeks + 1) * 4, 10, 100);
    p.stress = clamp(p.stress + 10, 0, 100);
    if (weeks > 0) p.history.push({ type: typeId, season: state.season, cleared: false, rehab: 0 });
    state.metrics.injuries.push({ name: p.name, type: def.name, kind: def.kind, weeks, season: state.season, week: state.week });
    VB.unlock(state, def.kind === 'chronic' ? 'chronic' : 'acute');
    VB.unlock(state, 'injury_types');
    if (def.group === 'concussion') VB.unlock(state, 'concussion');
    return p.injury;
  };

  // Choose an injury type that fits the mechanism (contact vs non-contact vs surface vs recurrence).
  VB.chooseAcuteInjury = function (p, risk, ctx) {
    const sev = risk.S.level;
    const old = VB.unrehabbed(p);
    if (old.length && VB.rand() < 0.5) {
      const o = VB.INJURIES[old[old.length - 1].type];
      if (o.kind === 'acute' && o.group !== 'concussion') return old[old.length - 1].type; // re-injury of the same area
    }
    const surface = ctx.opp && VB.SURFACES[ctx.opp.surface].artificial && !p.week.eventPPE;
    const roll = VB.rand();
    if (surface && roll < 0.3) return sev >= 4 ? 'laceration' : 'abrasion';
    const contact = (ctx.role || p.role) !== 'LNK' ? 0.6 : 0.35;
    if (VB.rand() < contact) {
      if (sev >= 5) return VB.rand() < 0.5 ? 'wrist_fracture' : 'concussion';
      if (sev >= 4) return VB.pick(['concussion', 'rib_contusion', 'thigh_contusion']);
      return VB.pick(['thigh_contusion', 'rib_contusion', 'abrasion']);
    }
    if (sev >= 5 && p.fatigue >= 60) return 'acl';
    if (sev >= 4) return VB.pick(['hamstring', 'ankle_sprain', 'groin', 'calf']);
    return VB.pick(['calf', 'hamstring', 'thigh_contusion']);
  };

  // ---------------- Logging, concepts ----------------
  VB.log = function (state, text, concept, tone) {
    state.log.push({ text, concept, tone, season: state.season, week: state.week });
    if (concept) VB.unlock(state, concept);
  };
  VB.unlock = function (state, concept) {
    if (!concept || !VB.CONCEPTS[concept]) return;
    if (!state.notebook.includes(concept)) { state.notebook.push(concept); state.newConcepts.push(concept); }
  };

  // ---------------- New run ----------------
  VB.newState = function (seed) {
    VB.seed(seed || Date.now());
    _id = 1;
    const roster = VB.START_ROSTER.map((t) => VB.makePlayer(t, 0));
    const ids = roster.map((p) => p.id);
    // lineup rows: STR, LNK, ANC
    const lineup = [
      [ids[0], ids[2], ids[5]],
      [ids[1], ids[4], ids[7]],
      [ids[3], ids[6], ids[8]],
    ];
    const bench = [ids[9], ids[10], ids[11]];
    const state = {
      seed, season: 1, week: 1, phase: 'training',
      roster, lineup, bench, focus: 4, focusMax: 4,
      hand: [], deck: [], discard: [], played: [],
      record: { 1: { w: 0, l: 0 }, 2: { w: 0, l: 0 } },
      results: [], log: [], notebook: [], newConcepts: [], toasts: [],
      usedEvents: [], chemBonus: 0, lastResults: [],
      schedule: { 1: VB.OPPONENTS_S1.map((o, i) => ({ ...o, home: i % 2 === 0 })), 2: VB.OPPONENTS_S2.map((o, i) => ({ ...o, home: i % 2 === 1 })).concat([{ ...VB.FINAL_OPPONENT, home: false }]) },
      swapsLeft: 0, market: [], scoutPoints: 0,
      metrics: { riskExposure: { low: 0, medium: 0, high: 0, 'very high': 0 }, injuries: [], events: [], cards: { good: 0, total: 0 }, rehabFull: 0, earlyReturns: 0, traitShifts: 0, scouting: { L: 0, O: 0, T: 0, S: 0 }, swaps: 0, collapse: false },
      over: false,
    };
    ['personality', 'traits_states', 'risk', 'fourCs'].forEach((c) => VB.unlock(state, c));
    state.newConcepts = [];
    state.synergy = VB.computeSynergy(state);
    return state;
  };

  VB.currentOpponent = function (state) {
    const sched = state.schedule[state.season];
    return sched[state.week - 1] || null;
  };
  VB.weeksInSeason = (state) => state.schedule[state.season].length;

  // ---------------- Opponent team ----------------
  VB.makeOpponentTeam = function (opp) {
    const grid = [];
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let l = 0; l < 3; l++) {
        const base = opp.rating;
        const v = () => clamp(base + VB.randInt(-6, 6), 25, 90);
        const role = VB.ROW_ROLE[r];
        const sk = { sht: v() - (role === 'STR' ? -6 : 10), pas: v() - (role === 'LNK' ? -6 : 8), def: v() - (role === 'ANC' ? -6 : 10), fit: v() };
        row.push({ name: `${opp.name.split(' ')[0]} #${VB.randInt(2, 99)}`, role, sk, N: VB.randInt(3, 7), fatigue: 20 });
      }
      grid.push(row);
    }
    return grid;
  };

  // ---------------- Market (free agents) ----------------
  VB.makeMarketPlayer = function (state, tier) {
    const role = VB.pick(['STR', 'LNK', 'ANC']);
    const age = VB.pick([19, 20, 21, 23, 24, 26, 27, 29, 31, 32, 34]);
    const base = tier + VB.randInt(-6, 8) + (age >= 31 ? 4 : 0) - (age <= 20 ? 3 : 0);
    const main = clamp(base + 8, 30, 92), sec = clamp(base - 4, 25, 85), low = clamp(base - 14, 20, 80);
    const sk = role === 'STR' ? [main, sec, low, base] : role === 'LNK' ? [sec, main, low, base] : [low, sec, main, base];
    const b5 = [VB.randInt(2, 9), VB.randInt(2, 9), VB.randInt(2, 9), VB.randInt(2, 9), VB.randInt(2, 9)];
    const mt = [VB.randInt(3, 9), VB.randInt(3, 9), VB.randInt(3, 9), VB.randInt(3, 9)];
    const hist = [];
    const nh = age >= 29 ? VB.randInt(1, 3) : VB.randInt(0, 1);
    for (let i = 0; i < nh; i++) hist.push({ type: VB.pick(['hamstring', 'ankle_sprain', 'concussion', 'shin_splints', 'groin', 'calf', 'tendonitis', 'acl']), season: 0 });
    const t = {
      name: `${VB.pick(VB.FIRST_NAMES)} ${VB.pick(VB.LAST_NAMES)}`, age, role, b5, mt, sc: VB.randInt(2, 8), sk,
      health: clamp(95 - nh * 12 - (age >= 31 ? 10 : 0) + VB.randInt(-5, 5), 40, 98), history: hist,
    };
    const p = VB.makePlayer(t, state.season);
    p.stress = 15 + p.b5.N * 3;
    p.fatigue = 10; p.strain = VB.randInt(5, 25);
    p.known = { all: false, L: false, O: false, T: false, S: false };
    // A self-report is flattering: people present themselves well (C.1.2)
    p.selfReport = {
      C: clamp(p.b5.C + VB.randInt(1, 2), 1, 10), N: clamp(p.b5.N - VB.randInt(1, 3), 1, 10), O: clamp(p.b5.O + VB.randInt(0, 1), 1, 10),
      mt: clamp(Math.round(VB.mtAvg(p)) + VB.randInt(1, 3), 1, 10),
    };
    return p;
  };
  VB.makeMarket = function (state, tier, n) {
    const m = [];
    for (let i = 0; i < n; i++) m.push(VB.makeMarketPlayer(state, tier));
    return m;
  };

  // ---------------- Weekly processing ----------------
  VB.endTraining = function (state) {
    const engine = state.synergy.flags.engine ? 1.25 : 1;
    state.roster.forEach((p) => {
      if (VB.isOut(p)) return;
      if (p.rest) {
        p.niggle = false; // a week off lets a minor niggle settle
        p.fatigue = clamp(p.fatigue - 30, 0, 100);
        p.strain = clamp(p.strain - 12, 0, 150);
        p.health = clamp(p.health + 2, 0, 100);
      } else {
        p.fatigue = clamp(p.fatigue + 10, 0, 100);
        p.strain = clamp(p.strain + 6, 0, 150);
        const g = 0.6 * engine * (0.5 + p.b5.C / 10);
        const key = p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def';
        p.sk[key] = clamp(r1(p.sk[key] + g), 1, 99);
      }
    });
  };

  // After a match: recovery, stress, injuries heal, overuse check, flags reset.
  VB.postMatch = function (state, result) {
    const won = result.us > result.them;
    const keg = state.synergy.flags.powderKeg;
    const events = [];
    state.roster.forEach((p) => {
      const played = result.played.includes(p.id);
      if (VB.isOut(p)) {
        const inj = p.injury;
        if (inj.nonlinear) {
          // concussion: recovery is not linear — symptoms can linger or return
          const r = VB.rand();
          if (r < 0.2 && inj.weeks < inj.total + 1) { events.push(`${p.name}'s concussion symptoms returned. Recovery is not always linear.`); VB.unlock(state, 'concussion'); }
          else inj.weeks -= r > 0.8 ? 2 : 1;
        } else inj.weeks -= 1;
        if (inj.weeks <= 0) {
          const h = p.history.filter((x) => x.type === inj.type && !x.cleared).pop();
          if (inj.rehab >= 2 && h) { h.cleared = true; state.metrics.rehabFull++; events.push(`${p.name} is back — rehab complete. No extra re-injury risk.`); VB.unlock(state, 'rehab'); }
          else events.push(`${p.name} has healed, but without full rehab: re-injury risk stays higher.`);
          p.injury = null;
        }
        p.health = clamp(p.health + 2, 0, 100);
        return;
      }
      if (played) {
        p.fatigue = clamp(p.fatigue + 25 * (1 - p.sk.fit / 250) + (result.tempo ? 8 : 0), 0, 100);
        p.strain = clamp(p.strain + 8 + (p.fatigue > 60 ? 4 : 0), 0, 150);
      }
      // natural recovery between matches
      p.fatigue = clamp(p.fatigue - (20 + p.sk.fit / 10 + p.health / 25), 0, 100);
      p.strain = clamp(p.strain - 4, 0, 150);
      // stress responds to results: N amplifies, control buffers (C.1.1 / C.1.2)
      const nMul = p.b5.N / 5, buf = 1 - p.mt.control / 15;
      if (won) p.stress = clamp(p.stress - 8, 0, 100);
      else p.stress = clamp(p.stress + 7 * nMul * buf + (keg ? 3 : 0), 0, 100);
      p.stress = clamp(p.stress - 3, 0, 100);
      if (won) p.mt.confidence = clamp(r1(p.mt.confidence + 0.3), 1, 10);
      else p.mt.confidence = clamp(r1(p.mt.confidence - 0.2 * nMul), 1, 10);
      if (p.stress < 60 && p.health < 95) p.health = clamp(p.health + 3, 0, 100);
      if (p.stress >= 75) p.health = clamp(p.health - 2, 0, 100);
      if (p.prehab > 0) p.prehab--;
      if (p.earlyReturn > 0) p.earlyReturn--;
      // overuse — cumulative trauma (B.3.1)
      if (p.strain >= 100) {
        const type = p.strain >= 120 ? 'stress_fracture' : VB.pick(['shin_splints', 'tendonitis']);
        VB.injure(state, p, type, [{ label: 'Cumulative load (strain ≥ 100)', concept: 'chronic' }]);
        p.strain = 55;
        events.push(`${p.name} developed ${VB.INJURIES[type].name} — an overuse injury from repeated load.`);
        VB.log(state, `${p.name}: ${VB.INJURIES[type].name} (chronic / overuse). Strain built up week after week.`, 'chronic', 'bad');
      }
    });
    state.roster.forEach((p) => { p.week = {}; p.rest = false; });
    state.chemBonus = Math.round((state.chemBonus || 0) * 0.5);
    return events;
  };
})();
