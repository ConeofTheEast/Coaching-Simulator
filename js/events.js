/* Vaultball Coach — locker-room encounters. Each choice links to a concept and is logged for the report. */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});
  const clamp = VB.clamp;
  const healthy = (s) => s.roster.filter((p) => !VB.isOut(p));
  const active = (s) => VB.activePlayers(s).map((x) => x.p).filter((p) => !VB.isOut(p));
  const bump = (p, k, d) => (p.mt[k] = clamp(Math.round((p.mt[k] + d) * 10) / 10, 1, 10));

  VB.EVENTS = [
    {
      id: 'self_report', title: 'The Questionnaire', priority: (s) => (s.season === 1 && s.week === 1 ? 20 : 0), once: true,
      find: (s) => { const a = active(s).sort((x, y) => y.b5.N - x.b5.N)[0]; return a ? { p: a } : null; },
      text: (c) => `Every player filled in a mental toughness questionnaire. ${c.p.name} gave themselves 9/10 for "I handle pressure well". The Commissioner smiles.`,
      choices: [
        { label: 'Trust the form. Give them the clutch shots.', quality: 'poor', concept: 'self_report',
          apply: (s, c) => { c.p.week.clutchRole = true; return `${c.p.name} takes the late shots this week. Self-report can be biased: people give the answer they think is wanted.`; } },
        { label: 'Watch them in pressure drills first (Observation data).', quality: 'good', concept: 'lots',
          apply: (s, c) => { bump(c.p, 'control', 1); return `Observed: their hands shake on the last shot. Real Neuroticism: ${c.p.b5.N}/10. You add cue-word practice (Control +1).`; } },
        { label: 'Ask teammates and check last season (O + L data).', quality: 'good', concept: 'lots',
          apply: (s, c) => { VB.unlock(s, 'self_report'); return `Teammates say ${c.p.name} goes quiet in close games. Lifetime history agrees. Multiple data sources beat one self-report.`; } },
      ],
    },
    {
      id: 'through_pain', title: 'Through the Pain', priority: () => 9, repeat: 2,
      find: (s) => {
        const p = active(s).filter((p) => p.niggle || (VB.hidesPain(p) && (p.strain >= 60 || p.fatigue >= 55))).sort((a, b) => b.strain - a.strain)[0];
        if (!p) return null;
        const h = VB.unrehabbed(p)[0];
        return { p, region: h ? VB.INJURIES[h.type].region : 'hamstring' };
      },
      text: (c) => `${c.p.name}'s ${c.region} tightened in practice. "I'm fine, Coach. Tough players play."`,
      choices: [
        { label: 'Play them. Toughness wins games.', quality: 'poor', concept: 'mt_darkside',
          apply: (s, c) => { c.p.niggle = true; c.p.week.playingHurt = true; return `${c.p.name} plays hurt. Injury likelihood rises. Very tough athletes often push through pain when they shouldn't.`; } },
        { label: 'Sit them out this match. Get it assessed.', quality: 'good', concept: 'prev_injury',
          apply: (s, c) => { c.p.niggle = false; c.p.week.sitOut = true; c.p.rest = true; c.p.strain = clamp(c.p.strain - 15, 0, 150); return `${c.p.name} sits. A small problem stays small.`; } },
        { label: 'Talk first: being hurt is not weakness.', quality: 'good', concept: 'self_compassion',
          apply: (s, c) => { c.p.sc = clamp(c.p.sc + 2, 1, 10); c.p.niggle = false; c.p.week.sitOut = true; c.p.rest = true; return `${c.p.name} admits it hurts and chooses to rest. Self-compassion +2. Toughness and self-compassion can work together.`; } },
      ],
    },
    {
      id: 'perfectionist', title: 'One More Hour', priority: (s) => (s.lastResults.slice(-1)[0] === 'L' ? 8 : 6), repeat: 2,
      find: (s) => { const p = healthy(s).find((p) => p.b5.C >= 7 && p.b5.N >= 7); return p ? { p } : null; },
      text: (c) => `${c.p.name} wants to stay three extra hours after every session. "If I make one more mistake, I'm finished."`,
      choices: [
        { label: 'Let them. Hard work always pays.', quality: 'poor', concept: 'perfectionism',
          apply: (s, c) => { const p = c.p; const k = p.role === 'STR' ? 'sht' : p.role === 'LNK' ? 'pas' : 'def'; p.sk[k] = clamp(p.sk[k] + 2, 1, 99); p.strain = clamp(p.strain + 25, 0, 150); p.stress = clamp(p.stress + 15, 0, 100); p.week.volume = true; return `Skill +2, but strain and stress climb. Maladaptive perfectionism leads to doing too much.`; } },
        { label: 'Keep high standards — mistakes are part of learning.', quality: 'good', concept: 'perfectionism',
          apply: (s, c) => { c.p.stress = clamp(c.p.stress - 15, 0, 100); bump(c.p, 'commitment', 1); VB.addTraitProgress(s, c.p, 'N', -1); return `Same high standards, less fear. That's adaptive perfectionism. Stress −15.`; } },
        { label: 'Ban all extra training.', quality: 'ok', concept: 'perfectionism',
          apply: (s, c) => { c.p.stress = clamp(c.p.stress + 8, 0, 100); c.p.strain = clamp(c.p.strain - 10, 0, 150); return `Their body rests, but the worry stays. Stress +8.`; } },
      ],
    },
    {
      id: 'friction', title: 'Last Shot', priority: () => 6, once: true,
      find: (s) => {
        const a = active(s);
        for (const x of a) for (const y of a) if (x !== y && x.b5.A <= 3 && y.b5.E >= 7 && y.b5.A <= 5) return { a: x, b: y };
        for (const x of a) for (const y of a) if (x !== y && x.b5.A <= 4 && y.b5.A <= 4) return { a: x, b: y };
        return null;
      },
      text: (c) => `${c.a.name} and ${c.b.name} are shouting about who takes the last shot. The locker room goes quiet.`,
      choices: [
        { label: `Back ${'the top scorer'} publicly.`, quality: 'poor', concept: 'big5_A',
          apply: (s, c) => { const [w, l] = c.a.sk.sht >= c.b.sk.sht ? [c.a, c.b] : [c.b, c.a]; bump(w, 'confidence', 1); bump(l, 'confidence', -1); s.chemBonus -= 3; return `${w.name} wins the argument. ${l.name} sulks. Chemistry −3.`; } },
        { label: 'Partner drills: each must assist the other to score.', quality: 'good', concept: 'big5_A',
          apply: (s, c) => { s.chemBonus += 3; [c.a, c.b].forEach((p) => { if (p.b5.A <= 5) VB.addTraitProgress(s, p, 'A', 1); }); return `Forced cooperation. Chemistry +3. Practising agreeable behaviour moves the trait.`; } },
        { label: 'Ignore it. They will sort it out.', quality: 'poor', concept: 'big5_A',
          apply: (s) => { s.chemBonus -= 2; return 'They do not sort it out. Chemistry −2.'; } },
      ],
    },
    {
      id: 'new_method', title: 'The Lab Calls', priority: () => 4, once: true,
      find: (s) => { const p = active(s).filter((p) => p.b5.O <= 4).sort((a, b) => a.b5.O - b.b5.O)[0]; return p ? { p } : null; },
      text: (c) => `The sports science lab offers a mindfulness programme. ${c.p.name} rolls their eyes: "We're athletes, not monks."`,
      choices: [
        { label: 'Make it mandatory for everyone.', quality: 'ok', concept: 'big5_O',
          apply: (s) => { healthy(s).forEach((p) => { bump(p, 'control', 0.5 * VB.psychMult(p, s)); if (p.b5.O <= 4) p.stress = clamp(p.stress + 5, 0, 100); }); return 'Everyone attends. Open players gain more; sceptics resent it.'; } },
        { label: 'Start with curious players, explain the "why" to sceptics.', quality: 'good', concept: 'mindfulness',
          apply: (s) => { healthy(s).forEach((p) => { if (p.b5.O >= 6) { bump(p, 'control', 1); p.stress = clamp(p.stress - 10, 0, 100); } else VB.addTraitProgress(s, p, 'O', 1); }); return 'Open players buy in (Control +1, Stress −10). Sceptics watch and start to soften.'; } },
        { label: 'Skip it.', quality: 'poor', concept: 'mindfulness', apply: () => 'Nothing changes. Nothing improves.' },
      ],
    },
    {
      id: 'sleepless', title: 'Sleepless', priority: () => 7, repeat: 2,
      find: (s) => { const p = healthy(s).filter((p) => p.stress >= 55).sort((a, b) => b.stress - a.stress)[0]; return p ? { p } : null; },
      text: (c) => `${c.p.name} has had a hard week at home and has barely slept. Stress: ${Math.round(c.p.stress)}.`,
      choices: [
        { label: 'Train as normal. Routine helps.', quality: 'poor', concept: 'psych_risk',
          apply: (s, c) => { c.p.stress = clamp(c.p.stress + 10, 0, 100); return 'Stress keeps rising. Poor sleep and stress are internal risk factors for injury.'; } },
        { label: 'Sleep plan and a lighter week.', quality: 'good', concept: 'psych_risk',
          apply: (s, c) => { c.p.stress = clamp(c.p.stress - 30, 0, 100); c.p.fatigue = clamp(c.p.fatigue - 15, 0, 100); c.p.rest = true; return `Stress −30. ${c.p.name} recovers.`; } },
        { label: 'Extra conditioning to burn off the stress.', quality: 'poor', concept: 'training_volume',
          apply: (s, c) => { c.p.fatigue = clamp(c.p.fatigue + 20, 0, 100); c.p.strain = clamp(c.p.strain + 10, 0, 150); c.p.stress = clamp(c.p.stress + 5, 0, 100); return 'More load on a tired, stressed body. Risk rises.'; } },
      ],
    },
    {
      id: 'turf', title: 'Mag-Turf', priority: (s) => { const o = VB.currentOpponent(s); return o && VB.SURFACES[o.surface].artificial ? 8 : 0; }, repeat: 2,
      find: (s) => { const o = VB.currentOpponent(s); return o && VB.SURFACES[o.surface].artificial ? { o } : null; },
      text: (c) => `This week's match is on synthetic Mag-Turf at ${c.o.name}. Players remember the burns from last time.`,
      choices: [
        { label: 'Fit sleeves and padding for the whole squad.', quality: 'good', concept: 'ppe',
          apply: (s) => { s.roster.forEach((p) => (p.week.eventPPE = true)); VB.unlock(s, 'surface'); return 'Protective equipment cancels the surface severity bonus this match.'; } },
        { label: 'Tell them to stop sliding.', quality: 'ok', concept: 'surface',
          apply: (s) => { let n = 0; s.roster.forEach((p) => { if (p.b5.C >= 6 || p.b5.A >= 6) { p.week.eventPPE = true; n++; } }); return `${n} conscientious / agreeable players listen. The rest keep sliding.`; } },
        { label: "It's just a surface.", quality: 'poor', concept: 'surface', apply: () => 'Artificial surfaces raise injury risk, especially abrasions.' },
      ],
    },
    {
      id: 'too_soon', title: 'Back Too Soon?', priority: () => 9, repeat: 3,
      find: (s) => { const p = s.roster.find((p) => VB.isOut(p) && p.injury.weeks <= 2 && !p.injury.nonlinear && !p.injury.asked); return p ? { p } : null; },
      text: (c) => `${c.p.name} (${VB.INJURIES[c.p.injury.type].name}, ${c.p.injury.weeks} wk left) wants back in. "It's minor. And someone's taking my spot."`,
      choices: [
        { label: 'Clear them to play now.', quality: 'poor', concept: 'early_return',
          apply: (s, c) => { c.p.injury = null; c.p.earlyReturn = 3; s.metrics.earlyReturns++; return `${c.p.name} returns early. Likelihood +2 for 3 weeks. Re-injury risk stays.`; } },
        { label: 'Finish the rehab first.', quality: 'good', concept: 'rehab',
          apply: (s, c) => { c.p.injury.rehab += 1; c.p.injury.asked = true; return `Rehab ${c.p.injury.rehab}/2. Strength and proprioception come back before competition does.`; } },
        { label: '"Your spot is safe. Being injured isn\'t weakness."', quality: 'good', concept: 'self_compassion',
          apply: (s, c) => { c.p.sc = clamp(c.p.sc + 1, 1, 10); c.p.injury.rehab += 1; c.p.injury.asked = true; return `${c.p.name} relaxes and commits to rehab. Self-compassion +1, rehab ${c.p.injury.rehab}/2.`; } },
      ],
    },
    {
      id: 'veteran', title: 'Old Legs', priority: () => 5, once: true,
      find: (s) => { const p = active(s).filter((p) => p.age >= 31).sort((a, b) => b.age - a.age)[0]; return p ? { p } : null; },
      text: (c) => `${c.p.name} (age ${c.p.age}) says recovery takes longer than it used to.`,
      choices: [
        { label: 'Load management: rest this week + prehab.', quality: 'good', concept: 'age',
          apply: (s, c) => { c.p.rest = true; c.p.prehab = Math.max(c.p.prehab, 2); return 'Age is an internal risk factor. Plan around it.'; } },
        { label: 'Same load as everyone. No favourites.', quality: 'poor', concept: 'age',
          apply: (s, c) => { c.p.fatigue = clamp(c.p.fatigue + 10, 0, 100); return 'Fatigue builds faster than they recover.'; } },
      ],
    },
    {
      id: 'losing_streak', title: 'The Slide', priority: (s) => (s.lastResults.slice(-2).join('') === 'LL' ? 8 : 0), repeat: 2,
      find: (s) => (s.lastResults.slice(-2).join('') === 'LL' ? {} : null),
      text: () => 'Two losses in a row. Even your calmest players are snapping at each other.',
      choices: [
        { label: 'Change the environment: new routines, roles, music.', quality: 'good', concept: 'interactionism',
          apply: (s) => { healthy(s).forEach((p) => (p.stress = clamp(p.stress - 12, 0, 100))); s.chemBonus += 3; return 'B = f(P, E). Same people, new environment, different behaviour. Stress −12.'; } },
        { label: 'Call out bad attitudes in front of everyone.', quality: 'poor', concept: 'big5_N',
          apply: (s) => { healthy(s).forEach((p) => { p.stress = clamp(p.stress + 8, 0, 100); if (p.b5.N >= 7) bump(p, 'confidence', -1); }); return 'High-Neuroticism players take it hardest. Stress +8.'; } },
        { label: 'Punishment conditioning.', quality: 'poor', concept: 'training_volume',
          apply: (s) => { healthy(s).forEach((p) => { p.fatigue = clamp(p.fatigue + 15, 0, 100); p.strain = clamp(p.strain + 8, 0, 150); }); return 'Tired, sore and still losing. Load-related risk rises.'; } },
      ],
    },
    {
      id: 'commitment', title: 'Late Again', priority: () => 5, once: true,
      find: (s) => { const p = healthy(s).filter((p) => p.mt.commitment <= 4).sort((a, b) => a.mt.commitment - b.mt.commitment)[0]; return p ? { p } : null; },
      text: (c) => `${c.p.name} turned up late to training again. Commitment: ${c.p.mt.commitment}/10.`,
      choices: [
        { label: 'Achievable goals linked to what they enjoy.', quality: 'good', concept: 'commitment',
          apply: (s, c) => { bump(c.p, 'commitment', 2); return 'Commitment +2. Enjoyment and achievable goals build "stickability".'; } },
        { label: 'Bench them as punishment.', quality: 'poor', concept: 'commitment',
          apply: (s, c) => { bump(c.p, 'commitment', -1); bump(c.p, 'confidence', -1); c.p.stress = clamp(c.p.stress + 10, 0, 100); return 'Commitment −1, Confidence −1.'; } },
      ],
    },
    {
      id: 'big_stage', title: 'The Big Stage', priority: (s) => (VB.currentOpponent(s)?.final ? 15 : s.season === 2 && s.week >= 3 ? 5 : 0), repeat: 2,
      find: (s) => { const p = active(s).sort((a, b) => b.b5.N - a.b5.N)[0]; return p && p.b5.N >= 6 ? { p } : null; },
      text: (c) => `Scouts are in the stands. ${c.p.name}'s hands are shaking before warm-up.`,
      choices: [
        { label: 'Breathing + pre-game routine (arousal regulation).', quality: 'good', concept: 'pst',
          apply: (s, c) => { c.p.week.arousal = true; return 'No clutch nerves for them this match.'; } },
        { label: 'Imagery: rehearse the winning play.', quality: 'good', concept: 'pst',
          apply: (s, c) => { bump(c.p, 'confidence', 2 * VB.psychMult(c.p, s) / 1.0); return 'Confidence up. They have already "seen" themselves succeed.'; } },
        { label: '"Just don\'t mess this up."', quality: 'poor', concept: 'big5_N',
          apply: (s, c) => { c.p.week.clutchRole = true; c.p.stress = clamp(c.p.stress + 10, 0, 100); return 'Pressure on an anxious player. Clutch nerves get worse.'; } },
      ],
    },
    {
      id: 'threat', title: 'Giant Killers', priority: () => 4, once: true,
      find: (s) => { const o = VB.currentOpponent(s); if (!o) return null; const avg = active(s).reduce((a, p) => a + VB.ovr(p), 0) / Math.max(1, active(s).length); return o.rating >= avg + 3 ? { o } : null; },
      text: (c) => `${c.o.name} are clearly better than you on paper. The squad knows it.`,
      choices: [
        { label: '"A chance to test ourselves. Focus on what we control."', quality: 'good', concept: 'challenge',
          apply: (s) => { healthy(s).forEach((p) => { bump(p, 'challenge', 0.5); bump(p, 'confidence', 0.5); }); return 'Challenge and Confidence rise. A stressor seen as an opportunity.'; } },
        { label: 'Warn them how good the opponent is.', quality: 'poor', concept: 'challenge',
          apply: (s) => { healthy(s).forEach((p) => { if (p.b5.N >= 6) p.stress = clamp(p.stress + 10, 0, 100); }); return 'Seen as a threat, not a challenge. Anxious players tense up.'; } },
      ],
    },
  ];

  VB.pickEvent = function (state) {
    const cands = [];
    VB.EVENTS.forEach((e) => {
      const used = state.usedEvents.filter((u) => u === e.id).length;
      if (e.once && used) return;
      if (e.repeat && used >= e.repeat) return;
      const pr = e.priority(state);
      if (pr <= 0) return;
      const ctx = e.find(state);
      if (!ctx) return;
      cands.push({ e, ctx, pr: pr - used * 2 + VB.rand() });
    });
    cands.sort((a, b) => b.pr - a.pr);
    return cands[0] || null;
  };

  VB.resolveEvent = function (state, ev, choiceIdx) {
    const ch = ev.e.choices[choiceIdx];
    const text = ch.apply(state, ev.ctx);
    state.usedEvents.push(ev.e.id);
    state.metrics.events.push({ id: ev.e.id, title: ev.e.title, quality: ch.quality, concept: ch.concept, choice: ch.label });
    VB.unlock(state, ch.concept);
    VB.log(state, `${ev.e.title}: ${text}`, ch.concept, ch.quality === 'good' ? 'good' : ch.quality === 'poor' ? 'bad' : 'neutral');
    state.synergy = VB.computeSynergy(state);
    return { text, quality: ch.quality, concept: ch.concept };
  };
})();
