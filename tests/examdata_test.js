// Integrity checks for the Notebook exam items (run with: deno test -A)
import '../js/data.js';
import '../js/examdata.js';
import '../js/exam.js';

const VB = globalThis.VB;
const assert = (c, m) => { if (!c) throw new Error(m); };
const TERMS = ['State', 'Identify', 'List', 'Define', 'Outline', 'Describe', 'Distinguish', 'Explain', 'Discuss', 'Evaluate', 'Suggest', 'Analyse', 'Interpret', 'Calculate', 'Compare', 'Compare and contrast', 'Justify', 'Predict', 'Deduce', 'To what extent', 'Annotate', 'Apply'];

Deno.test('every exam item is well-formed', () => {
  for (const [id, x] of Object.entries(VB.EXAMDATA)) {
    assert(VB.CONCEPTS[id], `unknown concept ${id}`);
    const q = x.q;
    assert(x.more && x.more.length > 40, `${id}: needs an expanded explanation`);
    assert(q && q.stem && q.src && q.model, `${id}: stem, src and model answer required`);
    assert(TERMS.includes(q.term), `${id}: unknown command term ${q.term}`);
    assert(q.stem.toLowerCase().includes(q.term.toLowerCase()), `${id}: stem must use its command term`);
    assert(Number.isInteger(q.marks) && q.marks >= 1 && q.marks <= 6, `${id}: marks`);
    assert((q.max || q.marks) === q.marks, `${id}: max must equal marks`);
    assert(q.points.length >= q.marks, `${id}: needs at least one marking point per mark`);
    q.points.forEach((p, i) => { assert(p.t, `${id}: point ${i} text`); assert(Array.isArray(p.k) && p.k.length && p.k.every((g) => Array.isArray(g) && g.length), `${id}: point ${i} keywords`); });
    (q.groups || []).forEach((g) => g.points.forEach((i) => assert(q.points[i], `${id}: group index ${i}`)));
    if (q.data) assert(q.data.cols && q.data.rows.every((r) => r.length === q.data.cols.length), `${id}: table rows match columns`);
    if (!q.official) assert(/not an official/i.test(q.src), `${id}: generated items must say they are not official`);
  }
});

Deno.test('model answers earn full marks from the auto-suggest, off-topic text earns none', () => {
  for (const [id, x] of Object.entries(VB.EXAMDATA)) {
    const q = x.q;
    const off = VB.Exam.score(q, VB.Exam.suggest(q, 'I like pizza and watching films with my friends at the weekend.'));
    assert(off === 0, `${id}: off-topic answer scored ${off}`);
    const m = VB.Exam.score(q, VB.Exam.suggest(q, q.model));
    assert(m >= Math.ceil(q.marks / 2), `${id}: model answer only auto-scores ${m}/${q.marks}`);
  }
});
