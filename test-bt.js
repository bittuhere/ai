/* ═══════════════════════════════════════════════════════════════════════════
   test-bt.js — BRAIN-TEASER EXAMINER
   Fires every question of bt-bank.js through the REAL respond() pipeline
   (index.html IIFE under DOM stubs) and checks the answer against the
   verified solution.  Usage:
       node test-bt.js            → canonical form, per-chapter score
       node test-bt.js forms      → + 3 phrasing variants per question
       node test-bt.js ch 6       → only chapter 6
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

/* ── DOM stubs (same rig as test-respond.js) ───────────────────────────── */
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

/* ── load the AI exactly like the page does ────────────────────────────── */
const BitBrain = require('./brain.js');
global.BitBrain = BitBrain;
global.BitMath = require('./math.js');
global.BitWords = require('./wordmath.js');
global.BitX = require('./solvex.js');
global.BitData = require('./data.js');
require('./data2.js');
require('./data3.js');
require('./data4.js');
eval(fs.readFileSync('./weights.js', 'utf8'));

const html = fs.readFileSync('./index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = blocks.sort((a, b) => b.length - a.length)[0];
const lastClose = main.lastIndexOf('})();');
const patched = main.slice(0, lastClose) +
    '\nwindow.__respond = respond; window.__doMath = doMath;\n' +
    main.slice(lastClose);
(0, eval)(patched);
const respond = global.__respond;
if (typeof respond !== 'function') throw new Error('respond() not exposed');
global.dispatchEvent(new Event('ai-deps-ready'));

const BANK = require('./bt-bank.js');

/* ── normalization: what "correct" means ───────────────────────────────── */
function norm(s) {
    return String(s).toLowerCase()
        .replace(/[,_]/g, m => (m === '_' ? '_' : ''))   // drop thousands commas
        .replace(/₹|rs\.?|rupees?/g, ' rs ')
        .replace(/\s+/g, ' ')
        .replace(/ /g, ' ');
}
// numeric-aware: also accept a bare number inside words
function normNum(s) { return norm(s).replace(/ /g, ''); }

function answerOk(entry, rawAns) {
    const a = norm(rawAns), an = normNum(rawAns);
    const hit = n => {
        const nn = normNum(n);
        return a.indexOf(norm(n)) !== -1 || an.indexOf(nn) !== -1;
    };
    if (entry.need && !entry.need.every(hit)) return false;
    if (entry.any && !entry.any.some(hit)) return false;
    return true;
}

/* ── run ───────────────────────────────────────────────────────────────── */
const MODE = process.argv[2] || '';
const CH = MODE === 'ch' ? parseInt(process.argv[3], 10) : 0;
const FORMS = MODE === 'forms';
const wrap = q => FORMS ? [q, 'solve: ' + q, 'ye solve karo: ' + q, 'please answer this maths question: ' + q] : [q];

let pass = 0, fail = 0, formsPass = 0, formsTot = 0;
const perCh = {}, fails = [];
BANK.forEach(e => {
    if (CH && e.ch !== CH) return;
    const q = e.q;
    let ans;
    try { ans = respond(q); } catch (err) { ans = 'EXCEPTION: ' + (err && err.message || err); }
    const ok = ans && answerOk(e, ans);
    if (ok) pass++; else { fail++; fails.push({ e, ans }); }
    perCh[e.ch] = perCh[e.ch] || [0, 0];
    perCh[e.ch][0] += ok ? 1 : 0; perCh[e.ch][1]++;
    if (FORMS) {
        wrap(q).slice(1).forEach(fq => {
            let a2; try { a2 = respond(fq); } catch (err2) { a2 = ''; }
            formsTot++; if (a2 && answerOk(e, a2)) formsPass++;
        });
    }
});

console.log('════════ BITBOT vs BRAIN TEASERS ════════');
Object.keys(perCh).sort((a, b) => a - b).forEach(c => {
    const [p, t] = perCh[c];
    console.log('  ch ' + String(c).padStart(2) + ': ' + String(p).padStart(3) + '/' + String(t).padStart(3) + '  ' + (p === t ? '✅' : (p / t > 0.8 ? '🟨' : '❌')));
});
console.log('─────────────────────────────────────────');
console.log('  TOTAL: ' + pass + '/' + (pass + fail) + ' = ' + (100 * pass / (pass + fail)).toFixed(1) + '%');
if (FORMS) console.log('  phrasing-variant robustness: ' + formsPass + '/' + formsTot + ' = ' + (100 * formsPass / formsTot).toFixed(1) + '%');
if (fails.length) {
    fs.writeFileSync('/tmp/bt_fail.txt', fails.map(f =>
        '[' + f.e.id + '] ch' + f.e.ch + '\n  Q: ' + f.e.q + '\n  A: ' + String(f.ans).slice(0, 400).replace(/\n/g, ' ⏎ ') +
        '\n  want: ' + (f.e.need || []).join(' + ') + (f.e.any ? ' |any| ' + f.e.any.join(' / ') : '')).join('\n'));
    console.log('\nFirst 25 failures:');
    fails.slice(0, 25).forEach(f => console.log('  ✗ [' + f.e.id + '] ' + f.e.q.slice(0, 90) + '\n      → ' + String(f.ans).slice(0, 150).replace(/\n/g, ' ⏎ ')));
    console.log('\n(full failure dump: /tmp/bt_fail.txt)');
}
