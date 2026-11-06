/* Vaultball Coach — training protocol cards. Each links to a textbook concept. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const clamp = VB.clamp;
  const r1 = (v) => Math.round(v * 10) / 10;
  const MULT = { full: 1, partial: 0.5, skip: 0 };
  const OUT_TXT = { full: 'completed it', partial: 'half-completed it', skip: 'skipped it' };

  function run(state, p, card, fn) {
    const adh = VB.adherence(p, card, state);
    const m = MULT[adh.outcome];
    const extra = m > 0 ? fn(m, adh) || '' : '';
    return { outcome: adh.outcome, text: `${p.name} ${OUT_TXT[adh.outcome]} (adherence ${adh.score}/10).${extra ? ' ' + extra : ''}` };
  }
  const roleKey = (p) => (p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def');
  const perfectionist = (p) => p.b5.C >= 7 && p.b5.N >= 7;
  const teamTargets = (state) => state.roster.filter((p) => !VB.isOut(p));

  VB.CARDS = {
    prehab: {
      name: 'Prehab Circuit', kind: 'physical', cost: 1, target: 'player', concept: 'prehab',
      desc: 'Warm-up, flexibility and stability work. Likelihood −1 for 3 weeks.',
      good: (p) => VB.likelihood(p).level >= 3 || VB.unrehabbed(p).length > 0 || p.age >= 31,
      apply: (s, p, c) => run(s, p, c, (m) => { p.prehab = Math.max(p.prehab, Math.round(3 * m)); return `Prehab active ${p.prehab} wk.`; }),
    },
    team_prehab: {
      name: 'Team Warm-up Protocol', kind: 'physical', cost: 2, target: 'team', team: true, concept: 'prehab',
      desc: 'Whole squad prehab. Likelihood −1 for 2 weeks (if they do it).',
      good: () => true,
      applyTeam: (s, c) => {
        let done = 0;
        teamTargets(s).forEach((p) => { const a = VB.adherence(p, c, s); if (a.outcome !== 'skip') { p.prehab = Math.max(p.prehab, a.outcome === 'full' ? 2 : 1); done++; } });
        return `${done} players did the warm-up protocol.`;
      },
    },
    strength: {
      name: 'Strength Block', kind: 'physical', cost: 1, target: 'player', concept: 'training_volume',
      desc: 'Supervised resistance training. Fitness +3, main skill +1. Fatigue +15.',
      good: (p) => p.fatigue < 50 && p.strain < 70,
      apply: (s, p, c) => run(s, p, c, (m) => {
        p.sk.fit = clamp(r1(p.sk.fit + 3 * m), 1, 99); p.sk[roleKey(p)] = clamp(r1(p.sk[roleKey(p)] + 1 * m), 1, 99);
        p.fatigue = clamp(p.fatigue + 15, 0, 100); p.strain = clamp(p.strain + 8, 0, 150);
        return 'Fitness up.';
      }),
    },
    grind: {
      name: 'High-Volume Grind', kind: 'physical', cost: 1, target: 'player', concept: 'training_volume',
      desc: 'Hours of extra reps. Main skill +4. Fatigue +25, Strain +20, Likelihood +1 this week.',
      good: (p) => p.strain < 50 && p.fatigue < 40 && !perfectionist(p),
      apply: (s, p, c) => run(s, p, c, (m) => {
        const k = roleKey(p);
        p.sk[k] = clamp(r1(p.sk[k] + 4 * m), 1, 99);
        p.fatigue = clamp(p.fatigue + 25 * m, 0, 100); p.strain = clamp(p.strain + 20 * m, 0, 150); p.week.volume = true;
        let t = `${k.toUpperCase()} +${r1(4 * m)}. Big jump in training volume.`;
        if (perfectionist(p)) { p.stress = clamp(p.stress + 10, 0, 100); t += ' Perfectionist: stress rising.'; VB.unlock(s, 'perfectionism'); }
        return t;
      }),
    },
    recovery: {
      name: 'Recovery Day', kind: 'recovery', cost: 1, target: 'team', team: true, concept: 'training_volume',
      desc: 'Pool, mobility, nutrition. All: Fatigue −20, Strain −10, Health +4.',
      good: (p, s) => teamTargets(s).reduce((a, x) => a + x.fatigue, 0) / Math.max(1, teamTargets(s).length) >= 30,
      applyTeam: (s) => { teamTargets(s).forEach((p) => { p.fatigue = clamp(p.fatigue - 20, 0, 100); p.strain = clamp(p.strain - 10, 0, 150); p.health = clamp(p.health + 4, 0, 100); }); return 'Squad recovered. Load reduced.'; },
    },
    sleep: {
      name: 'Sleep & Stress Reset', kind: 'recovery', cost: 1, target: 'player', concept: 'psych_risk',
      desc: 'Sleep plan + time off. Stress −30, Fatigue −10, Health +5.',
      good: (p) => p.stress >= 50,
      apply: (s, p) => { p.stress = clamp(p.stress - 30, 0, 100); p.fatigue = clamp(p.fatigue - 10, 0, 100); p.health = clamp(p.health + 5, 0, 100); return { outcome: 'full', text: `${p.name} slept properly for the first time in weeks. Stress ${Math.round(p.stress)}.` }; },
    },
    ppe: {
      name: 'Protective Gear Fitting', kind: 'physical', cost: 1, target: 'player', concept: 'ppe',
      desc: 'Padding, guards, mouthguard. Severity −1 permanently.',
      canTarget: (p) => (p.ppe ? 'Already fitted' : true),
      good: (p, s) => VB.slotRole(s, p) !== 'LNK',
      apply: (s, p) => { p.ppe = true; return { outcome: 'full', text: `${p.name} fitted with protective gear. Severity of contact injuries reduced.` }; },
    },
    rehab: {
      name: 'Rehab Session', kind: 'rehab', cost: 1, target: 'player', rehab: true, concept: 'rehab',
      desc: 'Restore strength + proprioception. Injured: faster return. 2 full sessions clear re-injury risk.',
      canTarget: (p) => (VB.isOut(p) || VB.unrehabbed(p).length ? true : 'No injury to rehab'),
      good: () => true,
      apply: (s, p, c) => run(s, p, c, (m) => {
        if (VB.isOut(p)) {
          p.injury.rehab += m;
          if (m === 1) p.injury.weeks = Math.max(1, p.injury.weeks - 1);
          return `Rehab ${p.injury.rehab}/2.`;
        }
        const h = VB.unrehabbed(p)[0];
        h.rehab += m;
        if (h.rehab >= 2) { h.cleared = true; s.metrics.rehabFull++; return `Old ${VB.INJURIES[h.type].name} fully rehabbed — re-injury risk removed.`; }
        return `Old ${VB.INJURIES[h.type].name}: rehab ${h.rehab}/2.`;
      }),
    },
    imagery: {
      name: 'Imagery', kind: 'psych', cost: 1, target: 'player', psych: true, concept: 'pst',
      desc: 'PST: rehearse success in the mind. Confidence +2 (× Openness).',
      good: (p) => p.mt.confidence <= 5,
      apply: (s, p, c) => run(s, p, c, (m) => { const g = r1(2 * m * VB.psychMult(p, s)); p.mt.confidence = clamp(r1(p.mt.confidence + g), 1, 10); return `Confidence +${g}.`; }),
    },
    goals: {
      name: 'Goal Setting', kind: 'psych', cost: 1, target: 'player', psych: true, concept: 'commitment',
      desc: 'PST: achievable, enjoyable goals. Commitment +2. Perfectionists: stress −15.',
      good: (p) => p.mt.commitment <= 5 || perfectionist(p),
      apply: (s, p, c) => run(s, p, c, (m, adh) => {
        const g = r1(2 * m * VB.psychMult(p, s)); p.mt.commitment = clamp(r1(p.mt.commitment + g), 1, 10);
        let t = `Commitment +${g}.`;
        if (perfectionist(p)) {
          p.stress = clamp(p.stress - 15 * m, 0, 100); t += ' High standards kept, fear of mistakes eased (adaptive perfectionism).';
          VB.unlock(s, 'perfectionism');
          if (adh.outcome === 'full') VB.addTraitProgress(s, p, 'N', -1);
        }
        return t;
      }),
    },
    selftalk: {
      name: 'Self-Talk', kind: 'psych', cost: 1, target: 'player', psych: true, concept: 'pst',
      desc: 'PST: cue words under pressure. Control +2. Halves clutch nerves this match.',
      good: (p) => p.b5.N >= 6 || p.mt.control <= 4,
      apply: (s, p, c) => run(s, p, c, (m) => { const g = r1(2 * m * VB.psychMult(p, s)); p.mt.control = clamp(r1(p.mt.control + g), 1, 10); p.week.selfTalk = true; return `Control +${g}.`; }),
    },
    arousal: {
      name: 'Arousal Regulation', kind: 'psych', cost: 1, target: 'team', team: true, psych: true, concept: 'pst',
      desc: 'PST: breathing + routines. No clutch nerves for the team this match.',
      good: (p, s) => s.synergy.highN >= 2,
      applyTeam: (s) => { teamTargets(s).forEach((p) => { p.week.arousal = true; p.stress = clamp(p.stress - 5, 0, 100); }); return 'Pre-game breathing routine set. Nerves under control for this match.'; },
    },
    mindfulness: {
      name: 'Mindfulness Block', kind: 'psych', cost: 2, target: 'team', team: true, psych: true, concept: 'mindfulness',
      desc: 'Present-moment awareness. Control +1, Stress −15 (× Openness). Repeated: Neuroticism falls.',
      good: (p, s) => s.synergy.avg.N >= 5 || s.synergy.flags.powderKeg,
      applyTeam: (s, c) => {
        let done = 0;
        teamTargets(s).forEach((p) => {
          const a = VB.adherence(p, c, s); const m = MULT[a.outcome] * VB.psychMult(p, s);
          if (m > 0) { done++; p.mt.control = clamp(r1(p.mt.control + 1 * m), 1, 10); p.stress = clamp(p.stress - 15 * m, 0, 100); }
          if (a.outcome === 'full' && p.b5.N >= 6) VB.addTraitProgress(s, p, 'N', -1);
        });
        VB.unlock(s, 'malleable');
        return `${done} players engaged. Calm states practised — states can become traits.`;
      },
    },
    selfcomp: {
      name: 'Self-Compassion Talk', kind: 'psych', cost: 1, target: 'player', psych: true, concept: 'self_compassion',
      desc: 'Kindness, common humanity, mindfulness. Self-compassion +2. Hidden pain gets reported.',
      good: (p) => p.sc <= 4 || p.niggle,
      apply: (s, p, c) => run(s, p, c, (m) => {
        const g = r1(2 * m * VB.psychMult(p, s)); p.sc = clamp(r1(p.sc + g), 1, 10);
        let t = `Self-compassion +${g}.`;
        if (p.niggle) { p.niggle = false; p.rest = true; t += ' They admitted the pain and are resting this week.'; VB.unlock(s, 'mt_darkside'); }
        return t;
      }),
    },
    adversity: {
      name: 'Adversity Scrimmage', kind: 'psych', cost: 1, target: 'team', team: true, concept: 'challenge',
      desc: 'Play down 2 players, against the clock. Challenge +1. Fatigue +10.',
      good: (p, s) => teamTargets(s).reduce((a, x) => a + x.mt.challenge, 0) / Math.max(1, teamTargets(s).length) <= 6,
      applyTeam: (s, c) => {
        let done = 0;
        teamTargets(s).forEach((p) => { const a = VB.adherence(p, c, s); const m = MULT[a.outcome]; if (m > 0) { done++; p.mt.challenge = clamp(r1(p.mt.challenge + m), 1, 10); p.fatigue = clamp(p.fatigue + 10, 0, 100); } });
        return `${done} players embraced the adversity. Stress seen as a challenge, not a threat.`;
      },
    },
    bonding: {
      name: 'Team Bonding', kind: 'psych', cost: 1, target: 'team', team: true, concept: 'interactionism',
      desc: 'Change the environment. Chemistry +4. Low-A / low-E players practise new behaviour.',
      good: (p, s) => s.synergy.chem < 6,
      applyTeam: (s, c) => {
        s.chemBonus = (s.chemBonus || 0) + 4;
        teamTargets(s).forEach((p) => {
          const a = VB.adherence(p, c, s);
          if (a.outcome === 'full' && p.b5.A <= 4) VB.addTraitProgress(s, p, 'A', 1);
          else if (a.outcome === 'full' && p.b5.E <= 4) VB.addTraitProgress(s, p, 'E', 1);
        });
        return 'Chemistry +4. B = f(P, E): change the environment, change the behaviour.';
      },
    },
    comfort: {
      name: 'Comfort-Zone Challenge', kind: 'trait', cost: 1, target: 'player', concept: 'personality_change',
      desc: 'A trait-typical task outside their comfort zone. Complete 3 → trait shifts 1 point.',
      good: (p) => VB.challengeTrait(p).v >= 2,
      preview: (p) => { const t = VB.challengeTrait(p); return `Task: ${t.task} (${VB.TRAIT_NAMES[t.t]} ${t.dir > 0 ? '↑' : '↓'})`; },
      apply: (s, p, c) => {
        const t = VB.challengeTrait(p); const a = VB.adherence(p, c, s);
        if (a.outcome === 'full') {
          const shifted = VB.addTraitProgress(s, p, t.t, t.dir);
          return { outcome: 'full', text: `${p.name} completed: ${t.task}. ${shifted ? 'Trait shifted!' : `Progress ${p.traitProgress[t.t]}/3.`}` };
        }
        if (a.outcome === 'partial') return { outcome: 'partial', text: `${p.name} accepted the challenge but didn't finish it. Accepting alone doesn't change personality.` };
        return { outcome: 'skip', text: `${p.name} avoided the challenge (adherence ${a.score}/10).` };
      },
    },
  };

  VB.DECK_LIST = {
    prehab: 2, team_prehab: 1, strength: 2, grind: 3, recovery: 2, sleep: 2, ppe: 2, rehab: 3,
    imagery: 2, goals: 2, selftalk: 2, arousal: 1, mindfulness: 1, selfcomp: 2, adversity: 1, bonding: 1, comfort: 3,
  };
  VB.buildDeck = function () {
    const d = [];
    Object.entries(VB.DECK_LIST).forEach(([k, n]) => { for (let i = 0; i < n; i++) d.push(k); });
    return VB.shuffle(d);
  };
  VB.drawHand = function (state, n) {
    state.discard.push(...state.hand);
    state.hand = [];
    n = n || 5;
    for (let i = 0; i < n; i++) {
      if (!state.deck.length) { state.deck = VB.shuffle(state.discard); state.discard = []; }
      if (!state.deck.length) break;
      let c = state.deck.pop();
      // avoid hands full of duplicates
      if (state.hand.filter((h) => h === c).length >= 2 && state.deck.length) { state.deck.unshift(c); c = state.deck.pop(); }
      state.hand.push(c);
    }
    // guarantee a rehab card when someone is injured
    if (state.roster.some(VB.isOut) && !state.hand.includes('rehab')) {
      const i = state.deck.lastIndexOf('rehab');
      if (i >= 0) { state.deck.splice(i, 1); state.discard.push(state.hand.pop()); state.hand.push('rehab'); }
    }
  };

  // Play a card from the hand. Returns {ok, text, outcome, good}
  VB.playCard = function (state, handIndex, targetId) {
    const key = state.hand[handIndex];
    const card = VB.CARDS[key];
    if (!card) return { ok: false, text: 'No card.' };
    if (state.focus < card.cost) return { ok: false, text: 'Not enough Focus.' };
    let res, good;
    if (card.target === 'team') {
      good = card.good(null, state);
      res = { outcome: 'full', text: card.applyTeam(state, card) };
    } else {
      const p = VB.byId(state, targetId);
      if (!p) return { ok: false, text: 'Pick a player.' };
      if (VB.isOut(p) && !card.rehab && key !== 'sleep' && key !== 'selfcomp') return { ok: false, text: `${p.name} is injured.` };
      const ct = card.canTarget ? card.canTarget(p, state) : true;
      if (ct !== true) return { ok: false, text: ct };
      good = card.good(p, state);
      res = card.apply(state, p, card);
    }
    state.focus -= card.cost;
    state.hand.splice(handIndex, 1);
    state.discard.push(key);
    state.metrics.cards.total++;
    if (good) state.metrics.cards.good++;
    VB.unlock(state, card.concept);
    state.played.push({ key, good, week: state.week, season: state.season });
    state.synergy = VB.computeSynergy(state);
    return { ok: true, text: res.text, outcome: res.outcome, good, concept: card.concept };
  };
})();
