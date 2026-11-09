/* Vaultball Coach — IB command-term question bank + spaced-repetition engine.
   Definitions: IB Diploma sciences command-term glossary.
   Content items: drawn from the IB SEHS SL specimen papers (first assessment 2026) Paper 1A / 1B / 2 markschemes,
   plus the SEHS textbook chapters used in the game (B.3 injury, C.1 personality & mental toughness).
   Level 1 = recall terms, Level 2 = account terms, Level 3 = reasoning/judgement terms (harder shots ask harder terms). */
(function () {
  const VB = (globalThis.VB = globalThis.VB || {});

  VB.TERMS = {
    'State': { lvl: 1, def: 'Give a specific name, value or other brief answer without explanation or calculation.' },
    'Define': { lvl: 1, def: 'Give the precise meaning of a word, phrase, concept or physical quantity.' },
    'List': { lvl: 1, def: 'Give a sequence of brief answers with no explanation.' },
    'Identify': { lvl: 1, def: 'Provide an answer from a number of possibilities.' },
    'Calculate': { lvl: 1, def: 'Obtain a numerical answer showing the relevant stages in the working.' },
    'Draw': { lvl: 1, def: 'Represent by means of a labelled, accurate diagram or graph, using a pencil.' },
    'Label': { lvl: 1, def: 'Add labels to a diagram.' },
    'Outline': { lvl: 2, def: 'Give a brief account or summary.' },
    'Describe': { lvl: 2, def: 'Give a detailed account.' },
    'Distinguish': { lvl: 2, def: 'Make clear the differences between two or more concepts or items.' },
    'Annotate': { lvl: 2, def: 'Add brief notes to a diagram or graph.' },
    'Apply': { lvl: 2, def: 'Use an idea, equation, principle, theory or law in relation to a given problem or issue.' },
    'Estimate': { lvl: 2, def: 'Obtain an approximate value.' },
    'Interpret': { lvl: 2, def: 'Use knowledge and understanding to recognize trends and draw conclusions from given information.' },
    'Explain': { lvl: 3, def: 'Give a detailed account including reasons or causes.' },
    'Analyse': { lvl: 3, def: 'Break down in order to bring out the essential elements or structure.' },
    'Discuss': { lvl: 3, def: 'Offer a considered and balanced review that includes a range of arguments, factors or hypotheses. Opinions or conclusions should be presented clearly and supported by appropriate evidence.' },
    'Evaluate': { lvl: 3, def: 'Make an appraisal by weighing up the strengths and limitations.' },
    'Suggest': { lvl: 3, def: 'Propose a solution, hypothesis or other possible answer.' },
    'Predict': { lvl: 3, def: 'Give an expected result.' },
    'Deduce': { lvl: 3, def: 'Reach a conclusion from the information given.' },
    'Compare': { lvl: 3, def: 'Give an account of the similarities between two (or more) items or situations, referring to both (all) of them throughout.' },
    'Compare and contrast': { lvl: 3, def: 'Give an account of similarities and differences between two (or more) items or situations, referring to both (all) of them throughout.' },
    'Justify': { lvl: 3, def: 'Give valid reasons or evidence to support an answer or conclusion.' },
    'To what extent': { lvl: 3, def: 'Consider the merits or otherwise of an argument or concept. Opinions and conclusions should be presented clearly and supported with appropriate evidence and sound argument.' },
  };

  // Terms students commonly mix up. Spaced repetition weights these more heavily.
  VB.CONFUSABLE = [
    ['Describe', 'Explain', 'Outline'],
    ['Discuss', 'Evaluate', 'To what extent'],
    ['Compare', 'Compare and contrast', 'Distinguish'],
    ['Suggest', 'Predict', 'Deduce'],
    ['State', 'Define', 'Identify', 'List'],
    ['Analyse', 'Interpret', 'Evaluate'],
    ['Justify', 'Explain'],
  ];
  VB.TIPS = {
    'Explain': 'Explain = Describe + WHY. Look for the reason or cause ("because…", "this leads to…").',
    'Describe': 'Describe = a detailed account of what happens. No reasons needed.',
    'Outline': 'Outline = brief. One clear point per mark, no long detail.',
    'Discuss': 'Discuss = both sides (a range of arguments) + a supported conclusion.',
    'Evaluate': 'Evaluate = strengths AND limitations, then an appraisal. In the specimen markschemes it was marked as strength [1 max] + limitation [1 max].',
    'To what extent': 'To what extent = merits AND weaknesses of an argument, ending in a clear, supported judgement of "how far".',
    'Compare': 'Compare = similarities only, referring to both items throughout.',
    'Compare and contrast': 'Compare and contrast = similarities AND differences, referring to both items throughout.',
    'Distinguish': 'Distinguish = make the differences clear. In the bobsled markscheme each goal type got its own defining point.',
    'Suggest': 'Suggest = propose a possible answer. There may be more than one acceptable answer.',
    'Predict': 'Predict = give the expected result. No working-out needed.',
    'Deduce': 'Deduce = reach a conclusion FROM the information given. Use the data.',
    'State': 'State = a name, value or short answer. No explanation.',
    'Define': 'Define = the precise meaning of a term.',
    'Identify': 'Identify = pick an answer from a number of possibilities.',
    'List': 'List = a sequence of brief answers, no explanation.',
    'Analyse': 'Analyse = break the data or idea down to bring out its essential elements.',
    'Interpret': 'Interpret = recognise trends and draw conclusions from the given information.',
    'Justify': 'Justify = give valid reasons or evidence that SUPPORT an answer or conclusion.',
    'Calculate': 'Calculate = a numerical answer WITH the working shown.',
  };

  // ---------------------------------------------------------------------------
  // Exemplar items: "Which response best answers this question?"
  // src: where the marking points come from. Distractors are written to fit a DIFFERENT command term
  // (too brief, no reason, one-sided…) or are factually wrong.
  // ---------------------------------------------------------------------------
  VB.EXEMPLARS = [
    // ---- Specimen Paper 2 ----
    { term: 'Explain', src: 'Specimen P2 4(a)', stem: 'Explain why bobsled athletes wear spiked shoes.',
      right: 'Spikes increase grip/friction with the ice, so the athletes can apply a greater forward (reaction) force without sliding backwards.',
      wrong: ['Spiked shoes are a type of specialist footwear worn during the push-off phase.', 'Spikes increase grip.', 'Spikes reduce friction so the athletes can run faster on ice.'],
      why: 'Explain needs the cause AND the effect: more friction → bigger forward force. "Spikes increase grip" alone is only a statement.' },
    { term: 'Explain', src: 'Specimen P2 1(d)(ii)', stem: 'Explain how endurance training influences VO₂max.',
      right: 'Training stimulates adaptations such as increased stroke volume/cardiac output and capillarisation of muscle, which improve the rate of oxygen transport, so VO₂max rises.',
      wrong: ['VO₂max is the maximum rate of oxygen uptake during exercise.', 'Endurance training increases VO₂max.', 'Endurance training lowers stroke volume, so the heart must beat faster and VO₂max rises.'],
      why: 'The markscheme rewards the chain: adaptation → better O₂ transport → higher VO₂max. A definition or a bare claim has no reasons.' },
    { term: 'Explain', src: 'Specimen P2 3(c)', stem: 'Explain why a ski jumper has an elevated heart rate during the descent from the start point.',
      right: 'Anxiety/stress and the working muscles\' demand for oxygen trigger the sympathetic nervous system, which increases heart rate.',
      wrong: ['Their heart rate goes up during the descent.', 'Heart rate rises from about 70 to over 150 beats per minute.', 'The parasympathetic nervous system speeds the heart up to deliver oxygen.'],
      why: 'Explain needs the cause: sympathetic stimulation in response to anxiety and O₂ demand. Describing the rise is not enough.' },
    { term: 'Explain', src: 'Specimen P2 2(a)', stem: 'Explain why data from an ergometer screen during training can influence an athlete\'s intrinsic motivation.',
      right: 'The data lets athletes compare against their own standards and set or adjust goals, which gives them more autonomy and self-determination, the basis of intrinsic motivation.',
      wrong: ['The screen shows split time, stroke rate, heart rate and force.', 'Intrinsic motivation means doing an activity for its own enjoyment.', 'The screen gives prizes for fast times, which increases intrinsic motivation.'],
      why: 'The marks come from linking feedback → goals/self-regulation → autonomy. Rewards are extrinsic, not intrinsic.' },
    { term: 'Explain', src: 'Specimen P2 5(a)(i)', stem: 'Explain how body temperature changes during the menstrual cycle affect hydration requirements.',
      right: 'Body temperature is higher in the luteal phase, so sweating starts earlier and the athlete needs to hydrate more in that phase.',
      wrong: ['Body temperature is about 36.4 °C before ovulation and about 36.9 °C after.', 'Hydration is always the same across the cycle.', 'The luteal phase is the second half of the cycle.'],
      why: 'Temperature ↑ → earlier sweating → more fluid needed. Reading the graph values only describes.' },
    { term: 'Outline', src: 'Specimen P2 2(b)', stem: 'Outline the importance of an appropriate warm-up to reduce injury risk.',
      right: 'It raises body temperature and blood flow to the muscles, increasing elasticity, and it increases range of motion.',
      wrong: ['Warm-up.', 'A warm-up is good.', 'A warm-up should always last exactly 45 minutes, so it removes all injury risk.'],
      why: 'Outline = a brief account: one clear point per mark. Single words earn nothing, and risk can never be removed completely.' },
    { term: 'Outline', src: 'Specimen P2 1(d)(i)', stem: 'Outline the change in ATP source in the muscles during a 2000 m rowing race (about 7 minutes).',
      right: 'ATP-CP stores in the muscle are used at the start, anaerobic glycolysis contributes during hard efforts, and aerobic respiration supplies ATP throughout.',
      wrong: ['ATP.', 'Only the phosphagen system is used because every stroke is maximal.', 'Rowing is a sport that uses lots of energy.'],
      why: 'A 2000 m race is mostly aerobic, with the limited ATP-CP supply used at the start. One system alone is wrong.' },
    { term: 'Outline', src: 'Specimen P2 4(c)', stem: 'Outline, with reference to Newton\'s laws, why a bobsled helmet has a foam liner.',
      right: 'The foam slows the head more gradually (second law), which reduces the force on the head and lowers the risk of concussion.',
      wrong: ['To protect the head.', 'Foam is soft.', 'The foam increases the force on the head so the athlete feels the impact.'],
      why: 'Outline still needs the key points linked to the law. "To protect the head" is too vague.' },
    { term: 'Outline', src: 'Specimen P2 5(d)', stem: 'Outline two benefits of a constraints-led approach when coaching the volleyball jump serve.',
      right: 'Players get better at adapting to the variability of a game, and the variety increases motivation.',
      wrong: ['Constraints-led approach.', 'The coach repeats the same serve drill 100 times in identical conditions.', 'It is an approach to coaching.'],
      why: 'Two benefits, one brief point each. Identical repetition is the opposite of a constraints-led approach.' },
    { term: 'Describe', src: 'Specimen P2 1(c)', stem: 'Using examples, describe two types of distractor a rower must manage during a race.',
      right: 'External distractors, such as the crowd, the cox\'s calls or sun glare off the water. Internal distractors, such as self-doubt or worries about preparation.',
      wrong: ['External and internal.', 'Distractors reduce focus because attention is limited.', 'The cox steers the boat.'],
      why: 'Describe = a detailed account: name each type AND give an example. Just naming them is State.' },
    { term: 'Describe', src: 'Specimen P2 1(a)(iii)', stem: 'Describe how the oar creates a mechanical advantage that accelerates the boat.',
      right: 'The distance from the oarlock (fulcrum) to the blade is longer than from the handle to the oarlock, so force is applied to the water over a longer distance from catch to finish.',
      wrong: ['First class lever.', 'The oar is long.', 'The handle is further from the oarlock than the blade is, so the oar acts as a force multiplier.'],
      why: 'Describe needs the details of the lever arrangement. "First class lever" only identifies it.' },
    { term: 'Discuss', src: 'Specimen P2 5(c)', stem: 'Discuss the use of self-talk after a contested referee decision.',
      right: 'Deliberate self-talk, such as recalling past successes or using a helpful cue phrase, can change the emotional response. But negative, unintentional self-talk can reduce attentional focus, so the athlete should practise positive phrases in advance.',
      wrong: ['Self-talk is when athletes talk to themselves.', 'Self-talk always improves performance.', 'Self-talk can change the emotional response to the decision.'],
      why: 'Discuss = a balanced review (it can help AND harm) with a supported conclusion. A one-sided answer can\'t reach full marks.' },
    { term: 'Discuss', src: 'Specimen P2 2(c)', stem: 'Discuss the use of ergometer data to help a coach select rowers.',
      right: 'It gives a standardised comparison and data not visible by observation, and it can track improvement over time. However, it may not capture everything about crew performance on the water, so it should support, not replace, the coach\'s judgement.',
      wrong: ['Ergometers measure power, stroke rate and split times.', 'The coach should select whoever has the fastest erg time.', 'Ergometer data is useless for selection.'],
      why: 'Discuss weighs a range of points and ends with a supported conclusion. One-sided claims or lists of features miss that.' },
    { term: 'Evaluate', src: 'Specimen P2 1(b)', stem: 'Evaluate the use of indoor water tanks in sports science labs to test new rowing-blade designs.',
      right: 'Strength: variables around the blade can be controlled and manipulated and more data collected. Limitation: it is difficult to replicate natural conditions such as wind, waves and current.',
      wrong: ['Indoor tanks are used to test blades.', 'Indoor tanks control variables, so they are better than testing on the water.', 'Tanks are expensive to build and maintain.'],
      why: 'Evaluate = weigh up strengths AND limitations (the markscheme gave 1 max for each). One side only = half marks at best.' },
    { term: 'Distinguish', src: 'Specimen P2 4(d)', stem: 'Distinguish between outcome and performance goals for an elite bobsled team.',
      right: 'Outcome goals are norm-referenced: the target is a result compared with others (e.g. winning a medal). Performance goals are self-referenced and specify a measurable target (e.g. a push time under 5 s).',
      wrong: ['Both are types of goal that motivate athletes.', 'Outcome goals and performance goals.', 'Performance goals are about beating the other teams.'],
      why: 'Distinguish = make the DIFFERENCE clear, with each goal type defined. A similarity is a Compare answer.' },
    { term: 'State', src: 'Specimen P2 2(d)', stem: 'State two benefits of mental toughness when preparing for elite competition.',
      right: 'A more consistent approach to training, and greater confidence.',
      wrong: ['Mental toughness, described by the 4Cs model of control, commitment, challenge and confidence, has many effects…', 'It makes athletes ignore injuries.', 'Mental toughness.'],
      why: 'State = short answers, no explanation needed. Playing through injury is the dark side of toughness, not a benefit.' },
    { term: 'Identify', src: 'Specimen P2 1(a)', stem: 'Identify the fulcrum and the load on a rowing oar during the drive phase.',
      right: 'Fulcrum: the oarlock (gate). Load: the blade.',
      wrong: ['Fulcrum: the blade. Load: the handle.', 'Fulcrum: the rower\'s hands. Load: the boat.', 'Fulcrum: the seat. Load: the oarlock.'],
      why: 'Identify = pick from the possibilities. The oar pivots at the oarlock and the blade moves the water.' },
    { term: 'Calculate', src: 'Specimen P2 4(b)', stem: 'A bobsled goes from 0 to 12 m s⁻¹ in 6 s. Calculate the average acceleration.',
      right: 'a = (v − u) ÷ t = (12 − 0) ÷ 6 = 2 m s⁻²',
      wrong: ['72 m s⁻²', 'a = 12 ÷ 6', '0.5 m s⁻²'],
      why: 'Calculate = a numerical answer WITH the working shown. "12 ÷ 6" has no answer, and the other values use the wrong operation.' },
    // ---- Specimen Paper 1B ----
    { term: 'Suggest', src: 'Specimen P1B 1(c)(iv)', stem: 'Athletes chose which shoe to race in. Suggest two ways to reduce athlete bias.',
      right: 'Make the shoes look the same so athletes do not know which type they wear, and run it as a double-blind experiment.',
      wrong: ['Bias is when results are influenced by expectations.', 'Let athletes pick their favourite shoe every race.', 'There is bias.'],
      why: 'Suggest = propose possible solutions. Blinding removes the expectation effect.' },
    { term: 'Evaluate', src: 'Specimen P1B 2(c)', stem: 'Evaluate the use of a t-test to judge whether the shoe results (two sets of VO₂ data) are significant.',
      right: 'Strength: it suits comparing two sets of ratio/parametric data of adequate size. Limitation: the samples were not randomised and are not representative of the general population.',
      wrong: ['A t-test compares two means.', 'A t-test proves the shoes work.', 'The sample was not randomised.'],
      why: 'Evaluate needs a strength AND a limitation. A test never "proves". It indicates significance.' },
    { term: 'Explain', src: 'Specimen P1B 1(a)(ii)', stem: 'Explain why the shoe study selected only races at sea level.',
      right: 'Altitude affects performance, so race altitude was kept constant as a controlled variable.',
      wrong: ['The races were at sea level.', 'Sea level races are more popular.', 'Altitude.'],
      why: 'The reason (altitude affects performance) plus its role (controlled variable) earns both marks.' },
    { term: 'Outline', src: 'Specimen P1B 1(c)(iii)', stem: 'Athletes chose their shoes. Outline how the placebo effect could explain faster times in carbon-plate shoes.',
      right: 'Athletes believe the claims and publicity about the shoes, and that belief could lead them to perform better.',
      wrong: ['Placebo.', 'The carbon plate returns energy.', 'The placebo effect is when a pill has no active ingredient.'],
      why: 'The mark needs the belief AND the improved performance. Energy return is a mechanical reason, not a placebo.' },
    { term: 'Interpret', src: 'Specimen P1B 2(a)', stem: 'Mean VO₂ at 14 km/h: traditional 44.72 ± 2.24, carbon plate 43.38 ± 2.21 ml kg⁻¹ min⁻¹. Interpret the data.',
      right: 'Lower VO₂ at the same speed suggests better running economy in carbon-plate shoes, but the overlapping standard deviations indicate the difference may not be significant.',
      wrong: ['The carbon-plate value is 43.38.', 'Carbon-plate shoes definitely make runners faster.', 'VO₂ was measured on a treadmill.'],
      why: 'Interpret = find the trend AND draw a conclusion, including what the standard deviation tells you.' },
    // ---- Paper 1A content as Identify items (key answers) ----
    { term: 'Identify', src: 'Specimen P1A Q6', stem: 'Identify the energy system mainly used in a 60 m sprint lasting under 8 s.',
      right: 'Phosphagen (ATP-CP) system', wrong: ['Aerobic oxidative phosphorylation', 'Aerobic glycolysis', 'Fat oxidation'],
      why: 'Very short maximal efforts rely on stored ATP-CP.' },
    { term: 'Identify', src: 'Specimen P1A Q21', stem: 'Identify the methods that help lower the risk of injury: I protective equipment, II flexibility training, III cardiovascular training.',
      right: 'I and II only', wrong: ['I and III only', 'II and III only', 'I, II and III'],
      why: 'Per the specimen key: protective equipment and flexibility training.' },
    { term: 'Identify', src: 'Specimen P1A Q22', stem: 'An athlete scores high in conscientiousness and openness. Identify the behaviour they are most likely to show in practice.',
      right: 'Consistent effort and listening to coach instruction', wrong: ['Staying calm and helping teammates', 'Being quiet and listening to the coach', 'Helping teammates and consistent effort'],
      why: 'Conscientiousness = effort and discipline. Openness = receptive to new instruction.' },
    { term: 'Identify', src: 'Specimen P1A Q28', stem: 'Identify the limitations of self-report tests of pre-competition anxiety: I time of the test can affect results, II must be repeated many times, III athlete may not answer honestly.',
      right: 'I and III only', wrong: ['I and II only', 'II and III only', 'I, II and III'],
      why: 'Self-report is sensitive to timing and to honesty (social desirability).' },
    { term: 'Identify', src: 'Specimen P1A Q29', stem: 'Identify the problem-focused coping strategy.',
      right: 'A golfer studying the course before a tournament', wrong: ['A sprinter meditating', 'A hockey player spending time with friends', 'A gymnast using a crash mat'],
      why: 'Problem-focused coping tackles the cause of the stress directly.' },
    { term: 'Identify', src: 'Specimen P1A Q7', stem: 'Identify what increases the risk of hyponatremia for a marathon runner in hot, humid conditions.',
      right: 'Excessive intake of water', wrong: ['Limited intake of water', 'Electrolyte drinks containing sodium', 'Limited water and salted pretzels'],
      why: 'Too much plain water dilutes blood sodium.' },
    { term: 'Identify', src: 'Specimen P1A Q5', stem: 'Identify what indicates insufficient hydration during exercise.',
      right: 'A decrease in body mass', wrong: ['Clear to light-yellow urine', 'An elevated sweat rate', 'Low blood osmolarity'],
      why: 'Body-mass loss during exercise is mostly fluid loss.' },
    // ---- Textbook B.3 / C.1 (the game's own content) ----
    { term: 'Distinguish', src: 'SEHS B.3.1', stem: 'Distinguish between acute and chronic injuries.',
      right: 'Acute injuries have a sudden onset from a single excessive force (e.g. a fracture). Chronic injuries develop gradually from repeated force over time (e.g. shin splints).',
      wrong: ['Both are injuries that stop athletes training.', 'Acute and chronic.', 'Acute injuries are minor and chronic injuries are serious.'],
      why: 'Distinguish = the difference must be clear for both types. Severity is not the difference.' },
    { term: 'Outline', src: 'SEHS B.3.1', stem: 'Outline one internal risk factor for sports injury.',
      right: 'A previous injury: if strength and proprioception are not fully restored, the risk of re-injury is higher.',
      wrong: ['Playing surface: artificial turf raises abrasion risk.', 'Age.', 'Protective equipment: it lowers the severity of contact injuries.'],
      why: 'Internal = relates to the athlete. Surface and equipment are EXTERNAL factors, and "Age." is a statement with no account.' },
    { term: 'Explain', src: 'SEHS B.3.1', stem: 'Explain why a large increase in training volume increases injury risk.',
      right: 'Repeated load without enough recovery causes cumulative tissue damage and fatigue, which can lead to overuse injuries such as shin splints.',
      wrong: ['Training volume is how much training an athlete does.', 'More training means more injuries.', 'More training always makes tissue stronger, so risk falls.'],
      why: 'The cause (load beyond recovery → tissue breakdown) is what makes it Explain.' },
    { term: 'Suggest', src: 'SEHS B.3.2', stem: 'A striker has had two hamstring strains. Suggest one intervention to reduce the risk of another.',
      right: 'Complete a full rehabilitation programme that restores strength and range of movement before return, then add prehab exercises.',
      wrong: ['Hamstring strains are common in sprinters.', 'Let them return as soon as the pain stops.', 'Hamstring.'],
      why: 'Suggest = propose a workable solution. Returning when pain stops is a classic early-return mistake.' },
    { term: 'Evaluate', src: 'SEHS C.1.1', stem: 'Evaluate the use of self-report questionnaires to measure athlete personality.',
      right: 'Strength: quick, cheap and easy to give to a whole squad. Limitation: athletes may present themselves well or give the answer they think is wanted, so results can be biased.',
      wrong: ['Questionnaires ask athletes about themselves.', 'They are the most accurate method available.', 'They can be biased.'],
      why: 'Evaluate needs both a strength and a limitation, weighed up.' },
    { term: 'Discuss', src: 'SEHS C.1.2', stem: 'Discuss whether high mental toughness is always good for an athlete.',
      right: 'Toughness helps athletes manage pressure and persist through adversity. However, very tough athletes may play through injury or skip rehab. Overall it is beneficial when balanced by self-compassion.',
      wrong: ['Mental toughness includes control, commitment, challenge and confidence.', 'Yes, tougher is always better.', 'Mental toughness can lead to playing through pain.'],
      why: 'Discuss = arguments on both sides + a supported conclusion.' },
    { term: 'Describe', src: 'SEHS C.1.1', stem: 'Describe the personality trait of neuroticism.',
      right: 'Neuroticism is the tendency to experience negative emotions such as nervousness, anxiety and anger. People high in it worry more and feel stressed easily. The opposite is emotional stability.',
      wrong: ['Neuroticism.', 'High neuroticism causes athletes to choke because anxiety disrupts attention.', 'Neuroticism means being outgoing and sociable.'],
      why: 'Describe gives a detailed account of WHAT it is. Adding "because" turns it towards Explain. Outgoing describes extraversion.' },
    { term: 'Compare and contrast', src: 'SEHS C.1.1', stem: 'Compare and contrast adaptive and maladaptive perfectionism.',
      right: 'Both involve setting very high standards. Adaptive perfectionists accept mistakes as part of learning, while maladaptive perfectionists fear mistakes, which can lead to anxiety, over-training and poorer performance.',
      wrong: ['Both involve setting very high standards.', 'Adaptive perfectionists accept mistakes, while maladaptive ones fear them.', 'Perfectionism is wanting to be perfect.'],
      why: 'Compare AND contrast = a similarity AND differences, referring to both throughout. Each half alone is Compare or Distinguish.' },
    { term: 'Compare', src: 'SEHS C.1.1', stem: 'Compare traits and states.',
      right: 'Both describe how a person thinks, feels and behaves, and both can affect sport performance.',
      wrong: ['Traits are stable, but states are temporary.', 'Traits and states.', 'Traits are learned, and states are genetic.'],
      why: 'Compare = similarities. The stable-vs-temporary point is a DIFFERENCE (Distinguish or Contrast).' },
    { term: 'Predict', src: 'SEHS C.1.1', stem: 'A team has five players with very high neuroticism. Predict how the team may perform in a close final quarter.',
      right: 'Players are likely to feel more anxious under pressure, so performance in clutch moments is expected to drop.',
      wrong: ['Neuroticism is one of the Big Five traits.', 'They will definitely lose by exactly 10 points.', 'Neuroticism is measured with a questionnaire.'],
      why: 'Predict = give the expected result. Personality makes behaviour likely, not certain, so "definitely, by exactly 10" goes too far.' },
    { term: 'Deduce', src: 'Specimen P1A Q18', stem: 'A sprinter is at 11.5 m/s at 50 m and is still at 11.5 m/s at the 100 m finish. Deduce what happened over the last 50 m.',
      right: 'Their speed was constant over the last 50 m.',
      wrong: ['They decelerated over the last 50 m.', 'They reached peak acceleration in the last 50 m.', 'They ran at constant speed for the whole race.'],
      why: 'Deduce = a conclusion from the given information. Equal speeds at 50 m and 100 m indicate constant speed in that section. Nothing tells you about the start.' },
    { term: 'Justify', src: 'SEHS B.3.2', stem: 'A coach keeps a player with concussion out for longer than planned. Justify this decision.',
      right: 'Concussion is a brain injury, and recovery is not always linear: symptoms can return. Returning early risks further injury, so a cautious, staged return is justified.',
      wrong: ['The coach kept the player out.', 'Concussion is a head injury.', 'It is the coach\'s decision.'],
      why: 'Justify = valid reasons or evidence that support the decision.' },
    { term: 'To what extent', src: 'SEHS C.1.1', stem: 'To what extent can an athlete\'s personality change?',
      right: 'Traits are relatively stable, but research suggests that repeatedly completing trait-typical challenges can shift a trait slowly. So personality can change to a limited extent, given effort and time.',
      wrong: ['Personality is the pattern of thinking, feeling and behaving that makes someone unique.', 'Not at all: traits never change.', 'Completely: it changes as soon as an athlete accepts a challenge.'],
      why: 'To what extent = weigh the merits of the claim and give a supported judgement of "how far".' },
    { term: 'Analyse', src: 'Specimen P1B 1(c)(ii)', stem: 'A scatter graph shows each runner\'s marathon time in traditional shoes (x) vs carbon-plate shoes (y), with a y = x line. Most points lie below the line. Analyse the data.',
      right: 'Points below the line show runners who were faster in carbon-plate shoes. As more athletes are below the line than above it, carbon-plate shoes are generally associated with faster times. Males are faster overall, and female times vary more.',
      wrong: ['The graph is a scatter graph.', 'All runners were faster in carbon-plate shoes.', 'The line is y = x.'],
      why: 'Analyse = break the data into its essential elements (what each region means, overall trend, sub-groups).' },
  ];

  // ---------------------------------------------------------------------------
  // Spaced repetition (Leitner-style boxes per term) + per-season tracking.
  // state.q = { box:{term:n}, due:{term:counter}, n: counter, s1:{term:{a,c}}, s2:{...} }
  // ---------------------------------------------------------------------------
  const termsAt = (lvl) => Object.keys(VB.TERMS).filter((t) => VB.TERMS[t].lvl === lvl);
  const confusable = (t) => VB.CONFUSABLE.some((g) => g.includes(t));
  const siblings = (t) => { const out = new Set(); VB.CONFUSABLE.forEach((g) => { if (g.includes(t)) g.forEach((x) => x !== t && out.add(x)); }); return [...out]; };
  const R = () => (VB.rand ? VB.rand() : Math.random());
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  VB.qInit = function (state) {
    if (!state.q) state.q = { box: {}, due: {}, n: 0, s1: {}, s2: {}, recent: [] };
    return state.q;
  };

  // Pick a term at a level, weighting: confusable ×2, due now ×3, low box ×(4-box), avoid the last few
  VB.pickTerm = function (state, lvl) {
    const q = VB.qInit(state);
    let pool = termsAt(lvl).filter((t) => VB.EXEMPLARS.some((e) => e.term === t) || lvl === 1 || VB.TIPS[t]);
    let best = null, total = 0;
    const weights = pool.map((t) => {
      const box = q.box[t] || 0;
      let w = (confusable(t) ? 2 : 1) * Math.max(1, 4 - box);
      if ((q.due[t] || 0) <= q.n) w *= 3;
      if (q.recent.includes(t)) w *= 0.15;
      // the specimen papers lean heavily on these
      if (['Explain', 'Outline', 'Discuss', 'Evaluate', 'Describe'].includes(t)) w *= 1.5;
      total += w; return w;
    });
    let r = R() * total;
    pool.forEach((t, i) => { if (best == null) { r -= weights[i]; if (r <= 0) best = t; } });
    return best || pool[0];
  };

  // Build a question. lvl 1..3. kind: 'def' | 'ex' | undefined (auto)
  VB.makeQuestion = function (state, lvl, kind) {
    const term = VB.pickTerm(state, lvl);
    const exs = VB.EXEMPLARS.filter((e) => e.term === term);
    if (!kind) kind = exs.length && R() < 0.55 ? 'ex' : 'def';
    if (kind === 'ex' && exs.length) {
      const q = VB.qInit(state);
      // rotate through exemplars for this term
      const e = exs[(q.box[term + '#'] = ((q.box[term + '#'] || 0) + 1)) % exs.length];
      const opts = shuffle([{ t: e.right, ok: true }].concat(e.wrong.slice(0, 3).map((w) => ({ t: w, ok: false }))));
      return { kind: 'ex', term, lvl, prompt: 'Which response best answers this question?', stem: e.stem, src: e.src,
        options: opts.map((o) => o.t), answer: opts.findIndex((o) => o.ok), why: e.why, tip: VB.TIPS[term] || '', def: VB.TERMS[term].def };
    }
    // Definition question: distractors favour confusable siblings
    const sib = shuffle(siblings(term));
    const others = shuffle(Object.keys(VB.TERMS).filter((t) => t !== term && !sib.includes(t)));
    const distract = sib.concat(others).slice(0, 3);
    const reverse = R() < 0.4; // "which term matches this definition?"
    if (reverse) {
      const opts = shuffle([term].concat(distract));
      return { kind: 'def', term, lvl, prompt: 'Which command term matches this definition?', stem: '“' + VB.TERMS[term].def + '”',
        options: opts, answer: opts.indexOf(term), why: VB.TIPS[term] || '', tip: VB.TIPS[term] || '', def: VB.TERMS[term].def, src: 'IB command terms' };
    }
    const opts = shuffle([term].concat(distract));
    return { kind: 'def', term, lvl, prompt: 'What does this command term ask you to do?', stem: term.toUpperCase(),
      options: opts.map((t) => VB.TERMS[t].def), answer: opts.indexOf(term), optTerms: opts,
      why: VB.TIPS[term] || '', tip: VB.TIPS[term] || '', def: VB.TERMS[term].def, src: 'IB command terms' };
  };

  VB.recordAnswer = function (state, question, correct) {
    const q = VB.qInit(state);
    const t = question.term;
    q.n++;
    const box = q.box[t] || 0;
    q.box[t] = correct ? Math.min(4, box + 1) : 0;
    // due after 1, 3, 6, 10, 15 questions
    q.due[t] = q.n + [1, 3, 6, 10, 15][q.box[t]];
    q.recent = (q.recent || []).concat([t]).slice(-3);
    const bucket = state.season === 2 ? q.s2 : q.s1;
    const rec = (bucket[t] = bucket[t] || { a: 0, c: 0 });
    rec.a++; if (correct) rec.c++;
  };

  // Summary helpers for reports
  VB.qSummary = function (state, season) {
    const q = VB.qInit(state);
    const b = season === 2 ? q.s2 : season === 1 ? q.s1 : null;
    const merge = {};
    const add = (src) => Object.keys(src).forEach((t) => { merge[t] = merge[t] || { a: 0, c: 0 }; merge[t].a += src[t].a; merge[t].c += src[t].c; });
    if (b) add(b); else { add(q.s1); add(q.s2); }
    let a = 0, c = 0;
    Object.values(merge).forEach((r) => { a += r.a; c += r.c; });
    return { terms: merge, a, c, pct: a ? Math.round((100 * c) / a) : null };
  };
})();
