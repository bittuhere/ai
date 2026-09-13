/* ═══════════════════════════════════════════════════════════════════════════
   test-story.js — CLASS 1–5 STORY-SUM EXAMINER (v14)
   Born from a real miss: "Ram has 5 mangoes. One he eaten. How many left?"
   Every case runs through the FULL respond() pipeline (index.html under DOM
   stubs) — routing included — and must contain the exact numeric answer.
   Usage: node test-story.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

/* ── DOM stubs (same rig as test-bt.js) ────────────────────────────────── */
function makeEl() {
    return {
        style: {}, dataset: {}, children: [], childNodes: [],
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {}, removeEventListener() {},
        appendChild(x) { return x; }, removeChild(x) { return x; }, insertBefore(x) { return x; },
        querySelector() { return makeEl(); }, querySelectorAll() { return []; },
        setAttribute() {}, getAttribute() { return null; }, focus() {}, blur() {}, click() {},
        scrollIntoView() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 }; },
        innerHTML: '', textContent: '', value: '', id: '', className: '', disabled: false,
        parentNode: null, offsetHeight: 100, scrollTop: 0, scrollHeight: 100
    };
}
const elCache = {};
global.document = {
    getElementById(id) { return elCache[id] || (elCache[id] = makeEl()); },
    createElement() { return makeEl(); }, createTextNode(t) { return { text: t }; },
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl(), documentElement: makeEl(), head: makeEl(),
    title: 'BitBot', hidden: false, visibilityState: 'visible'
};
global.window = global; global.self = global;
const __evs = {};
global.addEventListener = (t, f) => { (__evs[t] = __evs[t] || []).push(f); };
global.removeEventListener = () => {};
global.dispatchEvent = (e) => { (__evs[e.type] || []).forEach(f => f(e)); return true; };
global.localStorage = { _d: {}, getItem(k) { return k in this._d ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }, clear() { this._d = {}; } };
global.sessionStorage = global.localStorage;
global.navigator = { userAgent: 'node-harness', onLine: true, language: 'en-IN', serviceWorker: { register() { return Promise.resolve(); } }, vibrate() {} };
global.location = { href: 'http://localhost/', search: '', hash: '', protocol: 'http:', host: 'localhost', reload() {} };
global.history = { pushState() {}, replaceState() {} };
global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
global.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.alert = () => {}; global.confirm = () => true;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
global.Image = function () { return makeEl(); };
global.Audio = function () { return { play() { return Promise.resolve(); }, pause() {}, addEventListener() {} }; };
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.SpeechRecognition = undefined;

global.BitBrain = require('./brain.js');
global.BitMath = require('./math.js');
global.BitWords = require('./wordmath.js');
global.BitX = require('./solvex.js');
global.BitData = require('./data.js');
require('./data2.js'); require('./data3.js'); require('./data4.js');
eval(fs.readFileSync('./weights.js', 'utf8'));

const html = fs.readFileSync('./index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = blocks.sort((a, b) => b.length - a.length)[0];
const lastClose = main.lastIndexOf('})();');
(0, eval)(main.slice(0, lastClose) + '\nwindow.__respond = respond;\n' + main.slice(lastClose));
global.dispatchEvent(new Event('ai-deps-ready'));
const respond = global.__respond;

/* ── the exam: [question, expected number in the answer] ───────────────── */
const CASES = [
    /* the original miss — object-first broken order */
    ['Ram has 5 mangoes. One he eaten. How many left?', 4],
    /* clean orders */
    ['Ram has 5 mangoes. He ate 1. How many mangoes are left?', 4],
    ['Ravi has 8 toys. He lost three. How many toys are left?', 5],
    ['Tom has 15 marbles. He gave away 6. How many are left?', 9],
    ['Mina has 30 stickers. She sold 12. How many stickers remain?', 18],
    ['Ali had 20 sweets. 5 sweets eaten by him. How many left now?', 15],
    /* object-first / passive-ish orders */
    ['Sita has 12 apples. Two she gave to Ram. How many remaining?', 10],
    ['A jar has 24 chocolates. Children used 9. How many remain?', 15],
    ['Gita has 50 beads. Nine she lost yesterday. How many left?', 41],
    /* word numbers both sides */
    ['Raju has seven pencils. He used two. How many pencils are left?', 5],
    ['Meera has eleven bananas. She ate three. How many are left?', 8],
    /* bigger numbers */
    ['A shop had 240 eggs. 65 were sold. How many eggs are left?', 175],
    ['Papa has 120 coins. He spent 45. How many coins are left?', 75],
    /* Hinglish */
    ['Ram ke paas 5 aam hain. Ek usne kha liya. Kitne bache?', 4],
    ['Sita ke paas 9 golgappe the. Teen usne kha liye. Kitne bache?', 6],
    ['Mohan ke paas 15 toys the. Ek wo de diya. Kitne bache ab?', 14],
    /* addition family */
    ['Ram has 6 sweets and got 3 more. How many total now?', 9],
    ['She had 4 pens. Her mom bought 5 more. How many in all?', 9],
    ['A tree has 12 birds. 7 more birds came. How many birds in all?', 19],
    /* multiplication family (equal groups) */
    ['Meena has 10 boxes of pencils, each box has 4. How many in all?', 40],
    ['5 bags each contain 8 apples. How many apples in all?', 40],
    /* division family (equal sharing) */
    ['20 marbles shared equally among 4 children. How many each?', 5],
    ['36 laddoos are divided equally into 6 plates. How many on each?', 6],
    /* phrasing noise around the question */
    ['pls solve this: Ram has 5 mangoes. One he eaten. How many left?', 4],
    ['batao, Ram has 5 mangoes, one he eaten, how many left?', 4],
    ['hey bitbot, Ram has 5 mangoes. One he eaten. How many left?', 4]
];

let pass = 0, fail = 0;
const fails = [];
CASES.forEach(function (c, i) {
    const ans = respond(c[0]);
    const want = String(c[1]);
    const ok = new RegExp('(^|[^\\d.])' + want.replace('.', '\\.') + '([^\\d]|$)').test(String(ans).replace(/\*\*/g, ''));
    if (ok) { pass++; console.log('  ✅ [' + (i + 1) + '] → ' + want); }
    else {
        fail++;
        const first = String(ans).split('\n').filter(l => l.trim()).slice(0, 2).join(' ⏎ ').slice(0, 160);
        fails.push(c[0] + '\n      want ' + want + ' · got: ' + first);
        console.log('  ❌ [' + (i + 1) + '] ' + c[0].slice(0, 60) + '… want ' + want);
    }
});
console.log('─────────────────────────────────────────');
console.log('  test-story.js: ' + pass + ' pass, ' + fail + ' fail' + (fail ? '  ❌' : '  ✅'));
if (fails.length) {
    console.log('\nFailures:');
    fails.forEach(f => console.log('  ✗ ' + f));
    try { fs.writeFileSync('/tmp/story_fail.txt', fails.join('\n')); } catch (e) {}
}
process.exit(fail ? 1 : 0);
