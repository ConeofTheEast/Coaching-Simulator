# B.3 Injury: examiner review log (b3.json → b3.reviewed.json)

Sources checked: B.3 PDF pp. 367–386 (AHL content skipped: B.3.1.3 and "Biomechanical maladaptation", pp. 382–383, including the p. 383 practice question). bank_source.md was read in full. Specimen Paper 2 PDF pp. 9, 12–13 (question paper) and pp. 24, 26 (markscheme) were read to verify the transcriptions. C.1.2 PDF pp. 428–432 were read to check one alternative point for early_return.

Test answers: `exam/b3.answers.json` (77 answers). The final run gives **differences: 0**.

## Author's flagged doubts

1. **Official items.**
   - concussion = P2 4(c). The stem and the three marking points match the original exactly (MS p. 26, "Total 2", no notes). The item fits B.3.2.1 (helmets absorbing force) and concussion as a brain injury (p. 379). Changes: the context was rewritten close to the paper's Q4 lead-in. The invented "before jumping in" was removed. The notes now say the official markscheme gives no notes.
   - prehab = P2 2(b). The stem matches p. 9 exactly, and the points match MS p. 24 exactly. It fits the textbook definition of prehabilitation (warm-up programmes, p. 386). Changes: the context became a close paraphrase of the Q2 lead-in, and the same notes fix was made. Keywords: "warm" and "stretch" were removed from point 1, because "warm-up" in every answer was auto-matching it.
2. **Training volume, internal or external.** The p. 372 heading is "Internal risk factors: Effects of training". The p. 384 summary lists "volume of competing and training" under external, and so does "Check your understanding" (external: "…training…"). Changes:
   - The internal_risk, external_risk and training_volume notes all say not to penalize either classification, with page references.
   - external_risk has a new point: "high volume of competing/training".
   - training_volume `more` now explains the dual treatment.
   - Side note: the game card for internal_risk ("training load" as internal) is defensible.
3. **Position calculation.** Both specimen Calculate items carry 1 mark (P2 4(b), P1B 1(a)(i)). In P2 4(b) the whole working is in chevrons, so a bare correct answer earns the mark. A 2-mark Calculate for a single division would be inflated compared with the specimens. Decision:
   - The calculation becomes sub-part (a) [1] in `context`. Its markscheme, «18 ÷ 2400 × 1000 =» 7.5, is in the notes, and a bare "7.5" is awarded [1] (by analogy with 4(b)).
   - The asked sub-part is now (b) "Using the data, explain why forwards have a higher rate of shoulder injury than backs" [2]. This tests the concept itself (p. 377), not arithmetic.
   - The table gains a hypothetical "mean tackles and collisions per match" column (22 vs 9), so (b) can be answered from the data. The arithmetic was checked: 18/2400×1000 = 7.5 and 6/2000×1000 = 3.0.
   - The old context put sub-part (b) before (a). That is fixed.
   - If the game must keep a Calculate item, the rule would be [2] for a correct final answer with or without working (common IB practice), and [1] for the correct method with a slip or for 0.0075.
4. **early_return.** All five points are on p. 372, verbatim from the climbing survey (minor; skill/technique; competition near; spot on the team; peers/coaches). Two textbook-supported alternatives were added:
   - ranking/sponsorship deals (p. 367);
   - high mental toughness / pushing through pain (C.1.2 pp. 429–431: "stubborn persistence through injury", "difficulty withdrawing from training and competition when injured").

   `more` and `related` were updated to match.
5. **chronic, last point.** The p. 380 linking question (A.3.1) sits on an SL page with no AHL banner. Its bullets cover training error, overloading and recovery, and p. 372 (large increases in training) also supports them, so the point is acceptable SL content. HL is kept out: B.3.1.3 (technique → chronic) and the maladaptation pages are AHL, and a note now says not to credit technique/maladaptation. "distance" was removed from the keywords, because the stem's "distance runner" was auto-matching it.
6. **Keyword overlap.** Each answer is marked only against its own item, so the risk is overlap inside an item. Changes:
   - external_risk: "pitch"/"ground" removed from the surface point. The PPE, surface and weather points now also need a consequence word. The position point needs "forwards"/"position" and "tackle/collision/contact". "force" and "forward" were removed (they caught "forward force").
   - surface: "rate", "other" and "level" were removed or narrowed.
   - training_volume: the bare "match" and "rate" groups were tightened.
   - ppe: the "still + risk" point was tightened to "still/remain + high/considerably".

## Other corrections by item
- **risk**: The arithmetic and every Table 3 cell were verified. The classification is consistent with Table 3 (low ≤3, medium 4–9, high 10–16, very high ≥20). The (a) answer, medium, was added to the notes. The "acceptable level" point now needs a "cannot/never/reduce/move" word, because a keyword list was scoring 1.
- **internal_risk**: The note now says an example alone, or a definition alone, does not score.
- **external_risk**: The equipment example changed from "boots" (not in the textbook) to bike geometry/saddle height (p. 377). A bare list of factors now earns [1 max].
- **prev_injury**: Explain [2] previously gave both marks for a list of deficits. Strength, proprioception and range of movement are now grouped [1 max], so the second mark needs the link to incomplete restoration (p. 372).
- **psych_risk**: The factors (life events/stress, sleep) are grouped [1 max], so Explain needs the link (fatigue → performance/biomechanics/recovery, p. 375). The recovery point now needs a "slows/reduces" word.
- **training_volume**: The data were checked: (11 − 7)/7 × 100 = 57.1 %. The supporting/not-supporting caps are fine (they are modelled on P1B 1(b)(i)).
- **age**: The data were checked. Values of 2.0 and 4.0 per 1000 h match the textbook (p. 372); the 0.8 is labelled hypothetical. Keywords were tightened ("bone" and "muscle" alone no longer hit point 1). **Flag for data.js:** the age card says "Older athletes recover more slowly". The B.3 text does not support this; the textbook covers age only in youth sport (higher risk with increasing age, the growth spurt and growth plates). Suggested card: "Age is an internal risk factor: in youth sport, injury risk rises with age and the growth spurt."
- **ppe**: The stem is the textbook's own Thinking skills question (p. 375), and every point was verified on pp. 375–377. Keywords were tightened.
- **surface**: The totals were checked: 6.0 and 8.2 per 1000 h are the sums of the rows. `more` no longer has the unsupported advice on long sleeves and leg protection; it explains rates per 1000 h instead.
- **late_game**: Before, "fatigue" and "its effect on biomechanics" scored separately, so one reason could earn both marks of "Suggest two reasons". They are now grouped: fatigue [1 max] and pressure to win/riskier movements [1 max] (p. 377).
- **acute**: "unexpected" (syllabus B.3.1.2) and "acute/cumulative trauma" were added to keywords and notes.
- **injury_types**: Each point now needs both the injury name and a mechanism word, so a list of three names scores 0 (Outline).
- **rehab**: `more`, the model and the points no longer call physiotherapists "para-professionals". The textbook calls a physiotherapist a professional practitioner (p. 367), while B.3.2.2 only says "some managed by para-professionals". "safe" was removed from the re-injury keywords (it echoes the stem). A note was added: do not credit detailed return-to-play protocols, which are beyond the SL text. No return-to-play protocol appears anywhere in the set. The concussion `more` keeps only B.3.2.3 ("varies with specifics; recovery not always linear"), p. 373 (sex differences) and p. 381 (symptoms).

## Auto-marking results (final)
All 18 concepts had a strong answer worded unlike the model answer, plus partial, keyword-stuffed and off-topic answers. Extra cases were added for external_risk, position, prehab and concussion. Results:
- Strong answers: full marks in 18/18.
- Off-topic answers: 0 in 18/18, including a position answer that only calculates 7.5.
- Partial answers: mostly 1/2 or 1/3. psych_risk and chronic partials score 2/3, and an examiner would award the same marks.
- Keyword-stuffed answers: 0 in 14/18. Four score 1:
  - prev_injury, psych_risk and late_game: the bare keywords name a creditable factor, which the markscheme caps at [1].
  - external_risk: a bare list naming "equipment set-up" scores 1, which is the [1 max] for a list.

## Still weaker items
- **external_risk** includes bike set-up and environmental conditions. The stem is set in rugby and these are not rugby-specific, but the textbook gives only general support, so OWTTE applies.
- **position (b) and late_game** depend on hypothetical data columns (tackles per match; injuries per quarter). Both are labelled hypothetical.
- **internal_risk**: a keyword-stuffed answer that swaps the examples (eg "internal… surface, external… age") may still auto-suggest. The student's self-check is the safeguard.
