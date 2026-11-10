/* Vaultball Coach — static game data: concepts, injuries, training cards, rosters, opponents.
   Content is drawn from SEHS C.1.1 Personality, C.1.2 Mental toughness and B.3 Injury (SL only). */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});

  // ---------------------------------------------------------------------------
  // Coach's Notebook — one-line concept cards. Unlocked as students meet them.
  // ---------------------------------------------------------------------------
  VB.CONCEPTS = {
    personality: { name: 'Personality', ref: 'C.1.1', text: 'The relatively stable patterns of thinking, feeling and behaving that make someone unique.' },
    traits_states: { name: 'Traits vs states', ref: 'C.1.1', text: 'A trait is a default pattern across situations. A state is how you are right now. Traits make behaviour likely, not certain.' },
    big5_O: { name: 'Openness', ref: 'C.1.1', text: 'High: curious, likes new methods. Low: prefers the familiar and repetition.' },
    big5_C: { name: 'Conscientiousness', ref: 'C.1.1', text: 'High: organised, self-disciplined. Linked to sticking with training programmes.' },
    big5_E: { name: 'Extraversion', ref: 'C.1.1', text: 'High: outgoing, energised by others. Linked to exercise adherence. Low = introversion.' },
    big5_A: { name: 'Agreeableness', ref: 'C.1.1', text: 'High: friendly, cooperative, helps others.' },
    big5_N: { name: 'Neuroticism', ref: 'C.1.1', text: 'High: worries, anxious, stressed. The opposite is emotional stability.' },
    perfectionism: { name: 'Perfectionism', ref: 'C.1.1', text: 'Adaptive: high standards, mistakes are OK. Maladaptive: high standards + fear of mistakes → poor performance, doing too much.' },
    personality_change: { name: 'Personality can change', ref: 'C.1.1', text: 'Accepting a challenge does not change a trait. Actually completing trait-typical challenges does, slowly.' },
    interactionism: { name: 'Interactionism  B = f(P, E)', ref: 'C.1.1', text: 'Behaviour is a function of the Person and their Environment. Change the setting, change the behaviour.' },
    lots: { name: 'LOTS data', ref: 'C.1.1', text: 'L = lifetime history, O = observations by others, T = tests, S = self-report.' },
    self_report: { name: 'Self-report limits', ref: 'C.1.2', text: 'People may present themselves well or give the answer they think is wanted. Self-report can be biased.' },
    mt: { name: 'Mental toughness', ref: 'C.1.2', text: 'How someone manages challenging, pressurised situations: self-belief, resilience, persistence, focus, coping.' },
    fourCs: { name: 'The 4Cs', ref: 'C.1.2', text: 'Control, Commitment, Challenge, Confidence (Clough et al.).' },
    commitment: { name: 'Commitment', ref: 'C.1.2', text: '"Stickability". Coaches raise it with enjoyment of the sport and achievable goals.' },
    challenge: { name: 'Challenge', ref: 'C.1.2', text: 'Seeing a stressful event as an opportunity, not a threat. Exposure to adversity can build it.' },
    pst: { name: 'Psychological skills training', ref: 'C.1.2', text: 'Imagery, goal setting, self-talk and arousal regulation: change-based tools to control your state.' },
    mindfulness: { name: 'Mindfulness', ref: 'C.1.2', text: 'Present-moment, non-judgemental awareness. Accept thoughts and stay on task, rather than fight them.' },
    self_compassion: { name: 'Self-compassion', ref: 'C.1.2', text: 'Kindness, common humanity, mindfulness. Helps athletes cope after setbacks and injury.' },
    mt_darkside: { name: 'The dark side of toughness', ref: 'C.1.2', text: 'Very tough athletes may play through injury and skip rehab. Self-compassion balances this.' },
    malleable: { name: 'States can become traits', ref: 'C.1.2', text: 'Mental toughness is malleable. Practised states (like calm focus) can become trait-like over time.' },
    risk: { name: 'Risk = likelihood × severity', ref: 'B.3.1', text: 'Risk can never be zero. Coaches aim to bring it down to an acceptable level (low or medium).' },
    internal_risk: { name: 'Internal risk factors', ref: 'B.3.1', text: 'Relate to the athlete: age, training load, previous injury, sleep and stress.' },
    external_risk: { name: 'External risk factors', ref: 'B.3.1', text: 'Outside the athlete: protective equipment, position, playing surface, equipment.' },
    prev_injury: { name: 'Previous injury', ref: 'B.3.1', text: 'A past injury raises the risk of re-injury if strength and proprioception are not fully restored.' },
    early_return: { name: 'Returning too early', ref: 'B.3.1', text: 'Athletes rush back because the injury "seems minor", fear losing skill, or fear losing their spot.' },
    psych_risk: { name: 'Psychological risk factors', ref: 'B.3.1', text: 'Stress, life events and poor sleep raise injury risk through fatigue and poor recovery.' },
    training_volume: { name: 'Training volume', ref: 'B.3.1', text: 'Large increases in training volume increase injury risk. More is not always better.' },
    age: { name: 'Age', ref: 'B.3.1', text: 'Age is an internal risk factor. In youth sport, injury risk rises with age and the growth spurt. (In this game, veterans aged 31+ also carry extra risk.)' },
    ppe: { name: 'Protective equipment', ref: 'B.3.1', text: 'Padding, guards and mouthguards lower the severity of contact injuries.' },
    surface: { name: 'Playing surface', ref: 'B.3.1', text: 'Artificial surfaces raise injury risk, especially abrasions.' },
    position: { name: 'Position', ref: 'B.3.1', text: 'Players in high-contact positions face more collisions and greater forces.' },
    late_game: { name: 'Match duration', ref: 'B.3.1', text: 'Injury risk rises in the last quarter as fatigue changes movement.' },
    acute: { name: 'Acute injury', ref: 'B.3.1', text: 'Sudden onset from an excessive force: fractures, ligament tears, concussion.' },
    chronic: { name: 'Chronic / overuse injury', ref: 'B.3.1', text: 'Gradual onset from repeated force (cumulative trauma): shin splints, tendonitis.' },
    injury_types: { name: 'Injury types', ref: 'B.3.1', text: 'Lacerations/abrasions (shearing), contusions (compression) and strains (overstretched fibres).' },
    concussion: { name: 'Concussion', ref: 'B.3.2', text: 'A brain injury from a blow to the head or body. Recovery is not always linear.' },
    prehab: { name: 'Prehabilitation', ref: 'B.3.2', text: 'Warm-ups, flexibility and exercises that prepare the body and lower the likelihood of injury.' },
    rehab: { name: 'Rehabilitation', ref: 'B.3.2', text: 'Restores range of movement, strength and proprioception for a safe return to activity.' },
  };

  // ---------------------------------------------------------------------------
  // Injury catalogue (B.3.1 SL types).
  // ---------------------------------------------------------------------------
  VB.INJURIES = {
    abrasion: { name: 'Turf abrasion', group: 'laceration', kind: 'acute', region: 'skin', weeks: [0, 1], icon: '≋' },
    laceration: { name: 'Laceration', group: 'laceration', kind: 'acute', region: 'skin', weeks: [1, 1], icon: '≋' },
    thigh_contusion: { name: 'Thigh contusion', group: 'contusion', kind: 'acute', region: 'thigh', weeks: [1, 2], icon: '●' },
    rib_contusion: { name: 'Rib contusion', group: 'contusion', kind: 'acute', region: 'trunk', weeks: [1, 2], icon: '●' },
    hamstring: { name: 'Hamstring strain', group: 'strain', kind: 'acute', region: 'hamstring', weeks: [2, 3], icon: '⟋' },
    calf: { name: 'Calf strain', group: 'strain', kind: 'acute', region: 'calf', weeks: [1, 3], icon: '⟋' },
    groin: { name: 'Groin strain', group: 'strain', kind: 'acute', region: 'hip', weeks: [2, 3], icon: '⟋' },
    ankle_sprain: { name: 'Ankle ligament sprain', group: 'sprain', kind: 'acute', region: 'ankle', weeks: [2, 3], icon: '✕' },
    concussion: { name: 'Concussion', group: 'concussion', kind: 'acute', region: 'head', weeks: [1, 4], nonlinear: true, icon: '✦' },
    wrist_fracture: { name: 'Wrist fracture', group: 'contusion', kind: 'acute', region: 'wrist', weeks: [3, 4], icon: '⚡' },
    acl: { name: 'ACL tear', group: 'sprain', kind: 'acute', region: 'knee', weeks: [5, 6], icon: '⚡' },
    shin_splints: { name: 'Shin splints', group: 'overuse', kind: 'chronic', region: 'shin', weeks: [2, 3], icon: '∿' },
    tendonitis: { name: 'Patellar tendonitis', group: 'overuse', kind: 'chronic', region: 'knee', weeks: [2, 3], icon: '∿' },
    stress_fracture: { name: 'Stress fracture', group: 'overuse', kind: 'chronic', region: 'shin', weeks: [4, 5], icon: '∿' },
  };

  // Textbook Table 3 — classification of risk [likelihood 1..5][severity 1..5]
  VB.RISK_TABLE = {
    5: ['medium', 'high', 'high', 'very high', 'very high'],
    4: ['medium', 'medium', 'high', 'high', 'very high'],
    3: ['low', 'medium', 'medium', 'high', 'high'],
    2: ['low', 'medium', 'medium', 'medium', 'high'],
    1: ['low', 'low', 'low', 'medium', 'medium'],
  };
  VB.LIKELIHOOD_NAMES = ['', 'rare', 'unlikely', 'possible', 'likely', 'almost certain'];
  VB.SEVERITY_NAMES = ['', 'negligible', 'minor', 'moderate', 'major', 'extreme'];

  VB.ROLES = {
    STR: { name: 'Striker', short: 'STR', row: 0, desc: 'Front row. Scores. High contact.' },
    LNK: { name: 'Link', short: 'LNK', row: 1, desc: 'Middle row. Creates assists.' },
    ANC: { name: 'Anchor', short: 'ANC', row: 2, desc: 'Back row. Defends. High contact.' },
  };
  VB.ROW_ROLE = ['STR', 'LNK', 'ANC'];
  VB.LANES = ['Left', 'Core', 'Right'];

  VB.SURFACES = {
    poly: { name: 'Poly-Court', artificial: false, desc: 'Standard sprung court.' },
    magturf: { name: 'Mag-Turf', artificial: true, desc: 'Artificial turf. Abrasions, more injuries.' },
    gravwood: { name: 'Grav-Wood', artificial: false, desc: 'Classic sprung wood.' },
  };

  // ---------------------------------------------------------------------------
  // Starting roster — hand-built so every student meets the same personalities.
  // b5: O C E A N (1-10). mt: control commitment challenge confidence. sc = self-compassion.
  // ---------------------------------------------------------------------------
  VB.START_ROSTER = [
    { name: 'Kade Voss', age: 26, role: 'STR', num: 7, b5: [4, 6, 7, 3, 3], mt: [7, 8, 8, 8], sc: 2, sk: [56, 38, 34, 58], health: 74,
      history: [{ type: 'hamstring', season: 0 }], note: 'Plays through anything.' },
    { name: 'Mira Solano', age: 22, role: 'LNK', num: 11, b5: [7, 9, 4, 6, 8], mt: [4, 8, 4, 4], sc: 3, sk: [40, 55, 40, 52], health: 82,
      history: [], note: 'Never satisfied. Stays late every night.' },
    { name: 'Theo Quill', age: 19, role: 'STR', num: 23, b5: [6, 4, 5, 6, 9], mt: [3, 5, 3, 3], sc: 5, sk: [54, 42, 30, 55], health: 90,
      history: [], note: 'Talented rookie. Freezes under pressure.' },
    { name: 'Ren Asaka', age: 33, role: 'ANC', num: 4, b5: [3, 7, 4, 7, 3], mt: [7, 7, 6, 6], sc: 6, sk: [34, 46, 60, 44], health: 62,
      history: [{ type: 'ankle_sprain', season: 0 }, { type: 'calf', season: 0 }], note: 'Veteran. Slower to recover.' },
    { name: 'Lux Adeyemi', age: 25, role: 'LNK', num: 9, b5: [6, 6, 6, 9, 4], mt: [6, 6, 5, 5], sc: 7, sk: [38, 58, 42, 50], health: 85,
      history: [], note: 'The glue. Everyone likes Lux.' },
    { name: 'Sable Kwon', age: 24, role: 'STR', num: 1, b5: [5, 3, 9, 2, 6], mt: [4, 3, 6, 7], sc: 4, sk: [60, 30, 28, 50], health: 78,
      history: [{ type: 'thigh_contusion', season: 0 }], note: 'Scores a lot. Never passes.' },
    { name: 'Dex Moreau', age: 28, role: 'ANC', num: 5, b5: [3, 8, 3, 6, 4], mt: [7, 8, 6, 6], sc: 5, sk: [30, 40, 54, 56], health: 88,
      history: [], note: 'Quiet, reliable, never misses a session.' },
    { name: 'Nia Thorne', age: 21, role: 'LNK', num: 14, b5: [9, 4, 7, 6, 5], mt: [5, 4, 7, 5], sc: 6, sk: [42, 52, 36, 54], health: 92,
      history: [], note: 'Loves trying new things. Gets bored easily.' },
    { name: 'Orrin Vale', age: 30, role: 'ANC', num: 33, b5: [4, 5, 5, 4, 7], mt: [4, 5, 4, 5], sc: 3, sk: [32, 36, 52, 46], health: 58,
      history: [{ type: 'shin_splints', season: 0 }], note: 'Barely sleeps. Worries constantly.' },
    { name: 'Pax Delgado', age: 20, role: 'STR', num: 17, b5: [6, 5, 6, 7, 5], mt: [5, 5, 5, 4], sc: 6, sk: [48, 40, 32, 52], health: 86,
      history: [], note: 'Bench. Steady and coachable.' },
    { name: 'Wren Halloway', age: 27, role: 'LNK', num: 8, b5: [5, 7, 3, 7, 6], mt: [5, 7, 4, 4], sc: 5, sk: [34, 48, 44, 48], health: 80,
      history: [{ type: 'concussion', season: 0 }], note: 'Bench. Introvert. Works hard.' },
    { name: 'Ivo Marsh', age: 31, role: 'ANC', num: 2, b5: [4, 6, 6, 5, 4], mt: [6, 6, 6, 5], sc: 5, sk: [30, 38, 50, 44], health: 66,
      history: [{ type: 'groin', season: 0 }], note: 'Bench. Old-school enforcer.' },
  ];

  VB.FIRST_NAMES = ['Ari', 'Bex', 'Cato', 'Dara', 'Eko', 'Fen', 'Gale', 'Hiro', 'Indi', 'Jax', 'Kiri', 'Lio', 'Mako', 'Nox', 'Oda', 'Pim', 'Quin', 'Rhea', 'Sol', 'Tavi', 'Uma', 'Vex', 'Wyl', 'Xan', 'Yara', 'Zed', 'Remy', 'Juno', 'Cass', 'Teo', 'Sasha', 'Noor', 'Kai', 'Bryn', 'Elio', 'Mae'];
  VB.LAST_NAMES = ['Arden', 'Brisk', 'Calder', 'Drummond', 'Ekwueme', 'Faro', 'Gaunt', 'Hale', 'Iwata', 'Jorund', 'Kestrel', 'Lund', 'Mbeki', 'Novak', 'Oyelaran', 'Petrov', 'Quarry', 'Rook', 'Strand', 'Takeda', 'Ulric', 'Varga', 'Wilde', 'Xiong', 'Yusuf', 'Zane', 'Okonkwo', 'Silva', 'Brandt', 'Castell', 'Ferro', 'Ngata'];

  VB.OPPONENTS_S1 = [
    { name: 'Dustline Drifters', rating: 38, surface: 'poly', aggressive: false, color: 0xd9a441 },
    { name: 'Sector 9 Static', rating: 41, surface: 'magturf', aggressive: false, color: 0x8a7dff },
    { name: 'Low Orbit Lynx', rating: 43, surface: 'gravwood', aggressive: true, color: 0x46d4a8 },
    { name: 'Coldwater Cyphers', rating: 44, surface: 'magturf', aggressive: false, color: 0x5bb6ff },
    { name: 'Neon Basin Rift', rating: 46, surface: 'poly', aggressive: true, color: 0xff5ea8 },
  ];
  VB.OPPONENTS_S2 = [
    { name: 'Helix Vanguard', rating: 48, surface: 'poly', aggressive: false, color: 0x7cf0ff },
    { name: 'Titan Forge', rating: 49, surface: 'magturf', aggressive: true, color: 0xff8a3d },
    { name: 'Aurora Prime', rating: 51, surface: 'gravwood', aggressive: false, color: 0xb6ff6a },
    { name: 'Obsidian Reach', rating: 53, surface: 'magturf', aggressive: true, color: 0xc77dff },
    { name: 'Zenith Kinetics', rating: 54, surface: 'poly', aggressive: false, color: 0xffe45e },
  ];
  VB.FINAL_OPPONENT = { name: "The Commissioner's Chosen", rating: 56, surface: 'magturf', aggressive: true, color: 0xff3b3b, final: true };

  // The rival who sits across the table.
  VB.COMMISSIONER = {
    intro: [
      'So. You are the new coach.',
      'Nine on the floor. Three on the bench. Twelve cards — and every one of them is a person.',
      'They are not good. Neither are the teams you will face. Not yet.',
      'Lose three to the infirmary at once and you cannot field a team. Then the table is mine.',
      'Learn who they are. Train them for who they are. Begin.',
    ],
    win: ['Hm. They listened to you.', 'A win. Do not mistake it for skill.', 'The table shifts in your favour.'],
    loss: ['A loss. Ask yourself why.', 'Everything has a reason. Find it.', 'Another card falls. Study it.'],
    injury: ['The infirmary door opens.', 'Bodies are not cards. They break.', 'Was that chance? Or did you see it coming?'],
    offseason: ['The season ends. The bodies remember.', 'Summer. Rest them, rebuild them, or replace them.'],
    final: ['My team. My table. Show me what you have learned.'],
  };
})();
