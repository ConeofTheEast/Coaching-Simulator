# Vaultball Coach

A coaching game for IB Sports, Exercise and Health Science (SL). You coach a weak 12-player team in **Vaultball**, a futuristic cross between football and basketball played 9 v 9 with raised hoops. Every player has a Big Five personality, an injury history, points and assists per game, an age and a health score, and all of these change over the season.

A run takes about 20–30 minutes and covers two seasons. In between come an offseason focus, up to 3 player swaps, a summer camp, then up to 2 more swaps.

## Play

Open `index.html` in Chrome or Edge, either by double-clicking it or from GitHub Pages. You don't need to install or build anything. It works on Chromebooks, laptops and phones, and on a touch device it switches to an on-screen stick and buttons automatically.

**Save codes:** press 💾 *Save code* at any time and copy the code. Paste it on the title screen under *Continue with a save code* to carry on, on any device. The game also autosaves in the browser.

## The loop

1. **Weekly orders.** Each player gets one order: Shooting drills, Team drills, Defence drills, Rest & prehab, Rehab or Mental skills. A player's Conscientiousness decides whether they actually do it.
2. **Locker-room event.** A short dilemma with a Big Five, mental-toughness or injury angle.
3. **Match.** The simulation runs between **5 key drives that you play yourself**, on both attack and defence (Madden-style: call a play, then play it on a 2.5D field).
4. **Film room.** You see why you won or lost, who got hurt and why, and your command-term score for the match.

## Command terms (the playable part)

- Every **shot** and every **long or risky pass** asks a question. On defence, contesting a shot asks one too.
- The harder the play, the harder the term: Level 1 (State, Identify, Calculate…), then Level 2 (Outline, Describe, Distinguish, Interpret…), then Level 3 (Explain, Discuss, Evaluate, Suggest, To what extent…).
- There are two question types:
  - **Definitions:** IB command-term glossary, in both directions.
  - **"Which response best answers this question?"** The wrong options fit a *different* term on the same content (too brief, no reason, one-sided).
- Content items come from the IB SEHS **specimen papers for first assessment 2026** (Paper 1A, 1B and 2 markschemes), plus the textbook B.3 and C.1 content the game teaches. Each item names its source.
- Get it right and the pass completes, or the shot gets a big accuracy boost. Get it wrong and you turn the ball over, with the correct answer shown. **Explain ▸** pauses play so you can read why. Otherwise play resumes after 3.5 s.
- **Spaced repetition** uses Leitner-style boxes per term, weighted toward commonly confused groups (Describe/Explain/Outline, Discuss/Evaluate/To what extent, Compare/Compare and contrast/Distinguish, Suggest/Predict/Deduce).
- Accuracy per term is tracked each season. The season review and the end report show the **% change** from Season 1 to Season 2.

## What it teaches (SL content only)

| Game mechanic | Textbook idea |
|---|---|
| Click any Big Five trait for a definition, high and low descriptions, textbook descriptors, a sport example and what it does to *this* player | C.1.1 Big Five |
| Sprites show traits subtly: posture (E), brow and mouth tension plus a jitter (N), soft face and leaning in (A), neat or scruffy kit (C), hairstyle and colour (O). Skin tone and body type are random | C.1.1 traits shape behaviour |
| Conscientiousness drives adherence. Openness scales mental-skills gains. High-N players get less time on clutch questions. Team auras (Glue, Friction, Powder Keg…) | C.1.1 traits as behaviour multipliers, team dynamics |
| High C + high N players over-train | C.1.1 maladaptive perfectionism |
| Market players show **self-reported** C, N and O. Observing them in training shows the real values | C.1.1 LOTS, C.1.2 self-report bias |
| Mental skills order and camp, plus events on toughness and self-compassion | C.1.2 mental toughness, PST |
| One-colour risk chip with its reasons; the likelihood × severity model (fatigue, load, unrehabbed injury, age, stress, position, surface, aggressive opponents) stays hidden | B.3.1 risk factors |
| Rest & prehab, Rehab (2 sessions clears an old injury), offseason rehab block, concussion that doesn't recover in a straight line, acute vs overuse injuries | B.3.1–B.3.2 |

**Lose condition:** 3 players injured at the same time. Injuries are mostly predictable: repeated high-risk matches lead to injury.

## Files

- `js/questions.js`: command terms, the exemplar bank from the specimen markschemes, and spaced repetition
- `js/live.js`: playable key drives (2.5D field, controls, touch stick, question overlay)
- `js/sprites.js`: deterministic vector-neon SVG sprites
- `js/data.js`, `js/model.js`: content, players, risk, weekly orders
- `js/events.js`, `js/match.js`: locker-room events and the simulated parts of each match
- `js/arena.js`: 3D background (Three.js)
- `js/ui.js`, `js/main.js`: interface, game flow, save codes and reports
