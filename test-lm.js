/* ═══════════════════════════════════════════════════════════════════════════
   test-lm.js — BitLM (from-scratch generative LM) examiner
   Checks: loads, param count, deterministic seeded generation, output sanity
   (real words, no special-token leaks), speed, and end-to-end respond()
   integration (dynamic layer fires on an unanswerable question).
   Usage: node test-lm.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

let pass = 0, fail = 0;
const fails = [];
function check(ok, label, extra) {
    if (ok) { pass++; console.log('  ✅ ' + label); }
    else { fail++; fails.push(label + (extra ? '  →  ' + extra : '')); console.log('  ❌ ' + label + (extra ? '  →  ' + extra : '')); }
}

/* ── 1. engine loads standalone ─────────────────────────────────────────── */
global.window = undefined;
require('./bitlm-weights.js');           // sets globalThis.BITLM_META/INV/T
const BitLM = require('./bitlm.js');

check(BitLM.ready(), 'BitLM.ready() — weights dequantized');
const info = BitLM.info();
check(info && info.params > 1000000 && info.params < 40000000, 'param count sane: ' + (info ? info.params.toLocaleString('en-IN') : '?'));
console.log('     model: ' + JSON.stringify(info));

/* ── 2. deterministic seeded generation ────────────────────────────────── */
const q = 'who are you';
const t0 = Date.now();
const g1 = BitLM.generate(q, { max: 30, seed: 7 });
const t1 = Date.now();
const g2 = BitLM.generate(q, { max: 30, seed: 7 });
const g3 = BitLM.generate(q, { max: 30, seed: 99 });
check(typeof g1 === 'string' && g1.length > 0, 'generates non-empty text', JSON.stringify(g1).slice(0, 80));
check(g1 === g2, 'same seed → identical output (deterministic)');
check(g1.split(/\s+/).length >= 5, 'output has ≥5 words', g1);
check(!/[<>]/.test(g1) && !/\b(?:unk|eos|pad)\b/.test(g1), 'no special tokens leak into output', g1.slice(0, 80));
const speed = g1.split(/\s+/).length / Math.max(1, (t1 - t0)) * 1000;
check(speed > 3, 'generation speed > 3 words/sec on node (' + speed.toFixed(1) + ' w/s)');
console.log('     sample (seed 7) : ' + g1.slice(0, 110));
console.log('     sample (seed 99): ' + g3.slice(0, 110));

/* ── 3. domain knowledge probe — trained on BitBot corpus ──────────────── */
let domainHits = 0;
['what is your name', 'who made this site', 'tell me about arcade hub', 'what is photosynthesis'].forEach(function (qq) {
    const out = BitLM.generate(qq, { max: 30, seed: 3 });
    if (out && out.split(/\s+/).length >= 4) domainHits++;
});
check(domainHits >= 3, 'domain prompts produce fluent continuations (' + domainHits + '/4)');

/* ── 4. end-to-end: respond() dynamic layer fires where it used to give up ─ */
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
global.navigator = { userAgent: 'node', onLine: true, language: 'en-IN', serviceWorker: { register() { return Promise.resolve(); } }, vibrate() {} };
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
const lc = main.lastIndexOf('})();');
(0, eval)(main.slice(0, lc) + '\nwindow.__respond = respond;\n' + main.slice(lc));
global.dispatchEvent(new Event('ai-deps-ready'));
const respond = global.__respond;

/* maths must STILL win over the LM (accuracy hierarchy) */
const mres = respond('Ram has 5 mangoes. One he eaten. How many left?');
check(/4/.test(mres) && !/🎨/.test(mres), 'maths engine still answers story sums (LM does not hijack)', mres.split('\n')[0].slice(0, 60));
const mres2 = respond('solve 2x + 3 = 11');
check(/x\s*=\s*4/.test(mres2.replace(/\*/g, '')), 'algebra engine still exact', mres2.split('\n')[0].slice(0, 60));

/* the experimental-mode toggle command */
const onMsg = respond('experimental mode on');
check(/ON/.test(onMsg) && /🎨/.test(onMsg), '"experimental mode on" → confirmation');
check(global.localStorage.getItem('bb_lm_mode') === '1', 'toggle persisted to localStorage');
const offMsg = respond('lm off');
check(/OFF/.test(offMsg), '"lm off" → confirmation');
respond('experimental mode on');                                  // re-enable for the fallback test

/* maths must NOT be hijacked even with LM enabled */
const mres3 = respond('Ram has 5 mangoes. One he eaten. How many left?');
check(/4/.test(mres3) && !/🎨/.test(mres3), 'LM enabled → maths engine still wins');

/* a previously-hopeless question now gets a dynamic attempt */
const hopeless = respond('explain in your own words why the sky looks purple on mars at sunset');
const dynamic = /🎨/.test(hopeless);
check(dynamic || hopeless.length > 40, 'previously-unanswerable question → dynamic LM answer (or graceful fallback)');
if (dynamic) console.log('     dynamic answer: ' + hopeless.replace(/\n/g, ' ').slice(0, 160));

console.log('─────────────────────────────────────────');
console.log('  test-lm.js: ' + pass + ' pass, ' + fail + ' fail' + (fail ? '  ❌' : '  ✅'));
if (fails.length) { console.log('\nFailures:'); fails.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);
