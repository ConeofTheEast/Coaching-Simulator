// Integrity checks for the command-term question bank (run with: deno test -A)
import '../js/data.js';
import '../js/model.js';
import '../js/questions.js';

const VB = globalThis.VB;
const assert = (c, m) => { if (!c) throw new Error(m); };

Deno.test('every exemplar uses a known command term and has 3 distinct wrong answers', () => {
  for (const e of VB.EXEMPLARS) {
    assert(VB.TERMS[e.term], `unknown term ${e.term}`);
    assert(e.stem.toLowerCase().includes(e.term.toLowerCase()), `stem should contain its term: ${e.stem}`);
    assert(e.wrong.length >= 3, `needs 3 distractors: ${e.stem}`);
    assert(!e.wrong.includes(e.right), `right answer duplicated in distractors: ${e.stem}`);
    assert(new Set(e.wrong).size === e.wrong.length, `duplicate distractors: ${e.stem}`);
    assert(e.why && e.src, `needs explanation and source: ${e.stem}`);
  }
});

Deno.test('generated questions always have a valid answer at the requested level', () => {
  const state = { season: 1 };
  VB.seed(42);
  for (let i = 0; i < 600; i++) {
    const lvl = 1 + (i % 3);
    const q = VB.makeQuestion(state, lvl);
    assert(VB.TERMS[q.term].lvl === lvl, `term ${q.term} is not level ${lvl}`);
    assert(q.options.length === 4, 'four options');
    assert(q.answer >= 0 && q.answer < 4, 'answer index in range');
    assert(new Set(q.options).size === 4, `duplicate options for ${q.term}`);
    VB.recordAnswer(state, q, i % 2 === 0);
  }
  const s = VB.qSummary(state, 1);
  assert(s.a === 600 && s.c === 300, 'tracking counts every answer');
});

Deno.test('spaced repetition resets a missed term to box 0', () => {
  const state = { season: 2 };
  const q = { term: 'Explain' };
  VB.recordAnswer(state, q, true);
  VB.recordAnswer(state, q, true);
  assert(state.q.box.Explain === 2, 'box rises when correct');
  VB.recordAnswer(state, q, false);
  assert(state.q.box.Explain === 0, 'box resets when wrong');
});
