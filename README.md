# Vaultball Coach

A roguelike coaching card game for IB Sports, Exercise and Health Science (SL). You coach a weak 12-player team in **Vaultball**, a futuristic mix of football and basketball played 9 v 9. Every player is a card with a Big Five personality profile, injury history, stats, age and health.

A run takes about 20–30 minutes and covers two seasons. In between come an offseason with rehab plans and up to 3 player swaps, a summer camp, then up to 2 more swaps.

## Play

Open `index.html` in Chrome or Edge, either by double-clicking it or from any static web host such as GitHub Pages. You don't need to install or build anything. Three.js is bundled in `js/three.min.js`.

## What it teaches (SL content only, AHL skipped)

| Game mechanic | Textbook idea |
|---|---|
| Big Five pentagon on every card; traits act as **multipliers** on behaviour likelihood (adherence, clutch composure, passing, energy, new methods) | C.1.1 personality, traits vs states |
| Team auras when a trait is high or low across the starting nine (Engine Room, Glue, Powder Keg, Silent Floor…) and links between neighbouring cards | C.1.1 Big Five and team dynamics |
| Perfectionist player (high C + high N) who over-trains; Goal Setting card and event reframe it | C.1.1 adaptive vs maladaptive perfectionism |
| Comfort-Zone Challenge card: a trait shifts only after the player *completes* 3 challenges; accepting isn't enough | C.1.1 personality can change (Hudson et al.) |
| Team Bonding, "change the environment" event choices | C.1.1 interactionism, B = f(P, E) |
| Market scouting with **L / O / T / S** data; self-report shows flattering values that get a reality check after signing | C.1.1 LOTS, C.1.2 limits of self-report |
| 4Cs bars on the back of each card; Imagery, Goal Setting, Self-Talk and Arousal Regulation cards; Mindfulness block; Adversity Scrimmage | C.1.2 mental toughness, 4Cs, PST, mindfulness, challenge |
| A very tough player with low self-compassion hides pain and skips rehab; the Self-Compassion card fixes it | C.1.2 the dark side of toughness, self-compassion |
| Risk panel shows a 5×5 **likelihood × severity** matrix with the internal and external factors behind each | B.3.1 risk, internal and external risk factors |
| Fatigue, training volume, previous unrehabbed injury, early return, age, stress/sleep, position, artificial surface, aggressive opponent, protective equipment, last-quarter fatigue | B.3.1 risk factors |
| Acute injuries (contusion, strain, sprain, laceration, concussion, fracture) vs chronic overuse injuries (strain meter reaches 100) | B.3.1 injury types, acute vs chronic |
| Prehab, Protective Gear, Rehab Session cards; offseason full rehab vs maintenance; concussion recovery that isn't linear | B.3.2 interventions |

## Not all chance

Injuries are mostly predictable. Each match a player plays at **high** risk fills one exposure pip, and **very high** fills two. A match at low risk, or a week sitting out, drains one. When the third pip fills, the player gets injured. The game warns the coach before that match. Overuse injuries happen when the strain bar reaches 100. Only very-high-risk play carries a small extra chance of an accident, because risk is never zero.

**Lose condition:** 3 players injured at the same time.

## End-of-run report

A grade, plus risk-management %, decision quality, training targeting, every injury and decision, the concepts discovered and three reflection prompts. Students can type their name, then **Copy report text** or **Print / PDF** to submit.

## Files

- `js/data.js`: concepts, injuries, starting roster, opponents
- `js/model.js`: players, risk, synergy, weekly processing
- `js/cards.js`: training cards
- `js/events.js`: locker-room encounters
- `js/match.js`: match simulation and film-room recap
- `js/arena.js`: 3D arena (Three.js)
- `js/ui.js`, `js/main.js`: interface and game flow
