/* ═══════════════════════════════════════════════════════════════════════════
   test-bt-variants.js — "ONE QUESTION, MANY FORMS" EXAMINER
   Fires EVERY bt-bank question through the real respond() pipeline in up to
   16 surface forms (symbol swaps, punctuation, case, wrappers, Hinglish) plus
   the hand-written re-phrasings in bt-phrases.js.
   Usage:  node test-bt-variants.js            → everything
           node test-bt-variants.js ch 7       → one chapter
           node test-bt-variants.js quick      → canonical + 5 strongest forms
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');

/* ── DOM stubs (same rig as test-bt.js) ─────────────────────────────────── */
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
global.dispatchEvent = (e) => { (__evs[t = e.type] || []).forEach(f => f(e)); return true; };
global.localStorage = { _d: {}, getItem(k) { return k in this._d ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }, clear() { this._d = {}; } };
global.sessionStorage = global.localStorage;
global.navigator = { userAgent: 'node-harness', onLine: true, language: 'en-IN', serviceWorker: { register() { return Promise.resolve(); } }, vibrate() {} };
global.location = { href: 'http://localhost/', search: '', hash: '', protocol: 'http:', host: 'localhost', reload() {} };
global.history = { pushState() {}, replaceState() {} };
global.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {}, removeEventListener() {} });
global.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
global.cancelAnimationFrame = clearTimeout;
global.alert = () => {}; global.confirm = () => true;
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}), text: () => Promise.resolve('') });
global.Image = function () { return makeEl(); };
global.Audio = function () { return { play() { return Promise.resolve(); }, pause() {}, addEventListener() {} }; };
global.speechSynthesis = { speak() {}, cancel() {}, getVoices() { return []; } };
global.SpeechRecognition = undefined;
global.indexedDB = undefined;   // chat-store must degrade gracefully in node

/* ── load the AI exactly like the page does ─────────────────────────────── */
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
const patched = main.slice(0, lastClose) +
    '\nwindow.__respond = respond;\n' +
    main.slice(lastClose);
(0, eval)(patched);
const respond = global.__respond;
if (typeof respond !== 'function') throw new Error('respond() not exposed');
global.dispatchEvent({ type: 'ai-deps-ready' });

const BANK = require('./bt-bank.js');
const PHRASES = require('./bt-phrases.js');

/* ── normalization (identical to test-bt.js) ───────────────────────────── */
function norm(s) {
    return String(s).toLowerCase()
        .replace(/[,_]/g, m => (m === '_' ? '_' : ''))
        .replace(/₹|rs\.?|rupees?/g, ' rs ')
        .replace(/\s+/g, ' ');
}
function normNum(s) { return norm(s).replace(/ /g, ''); }
function answerOk(entry, rawAns) {
    const a = norm(rawAns), an = normNum(rawAns);
    const hit = n => a.indexOf(norm(n)) !== -1 || an.indexOf(normNum(n)) !== -1;
    if (entry.need && !entry.need.every(hit)) return false;
    if (entry.any && !entry.any.some(hit)) return false;
    return true;
}

/* ── the 15 mechanical surface forms ───────────────────────────────────── */
const trimDot = q => q.replace(/[.?!]+$/, '').trim();
const TX = [
    ['canon',        q => q],
    ['superscript',  q => q.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^4/g, '⁴')],
    ['word-powers',  q => q.replace(/\((\d+(?:\.\d+)?)\)\^2(?!\d)/g, '$1 squared')
                           .replace(/(\d+(?:\.\d+)?)\^2(?!\d)/g, '$1 squared')
                           .replace(/(\d*[a-z])\^2(?!\d)/g, '$1 square')
                           .replace(/(\d*[a-z])\^3(?!\d)/g, '$1 cube')],
    ['solve-prefix', q => 'solve: ' + trimDot(q)],
    ['pls-prefix',   q => 'pls solve this: ' + trimDot(q)],
    ['batao-prefix', q => 'batao, ' + trimDot(q)],
    ['hinglish-tail',q => trimDot(q) + ' kitna hoga?'],
    ['qmark',        q => trimDot(q) + '?'],
    ['nopunct',      q => trimDot(q)],
    ['lowercase',    q => q.toLowerCase()],
    ['hey-bitbot',   q => 'hey bitbot, ' + trimDot(q) + '?'],
    ['steps-prefix', q => 'with full steps: ' + trimDot(q)],
    ['double-space', q => q.replace(/ /g, '  ')],
    ['rupee-symbol', q => q.replace(/\bRs ?(\d)/g, '₹$1')],
    ['tellme',       q => 'can you tell me, ' + trimDot(q) + ' ?'],
];
const QUICK = new Set(['canon', 'superscript', 'word-powers', 'hinglish-tail', 'hey-bitbot', 'qmark']);

/* ── run ───────────────────────────────────────────────────────────────── */
const MODE = process.argv[2] || '';
const CH = MODE === 'ch' ? parseInt(process.argv[3], 10) : 0;
const quick = MODE === 'quick';

let pass = 0, tot = 0;
const perForm = {}, fails = [];
TX.forEach(t => perForm[t[0]] = [0, 0]);
perForm['hand-written'] = [0, 0];

BANK.forEach(e => {
    if (CH && e.ch !== CH) return;
    TX.forEach(([name, fn]) => {
        if (quick && !QUICK.has(name)) return;
        const q = fn(e.q);
        let ans; try { ans = respond(q); } catch (err) { ans = 'EXCEPTION: ' + (err && err.message || err); }
        const ok = !!(ans && answerOk(e, ans));
        tot++; perForm[name][1]++;
        if (ok) { pass++; perForm[name][0]++; }
        else fails.push({ id: e.id, form: name, q, ans });
    });
});
PHRASES.forEach(([id, alt]) => {
    const e = BANK.find(x => x.id === id);
    if (!e) return;
    if (CH && e.ch !== CH) return;
    let ans; try { ans = respond(alt); } catch (err) { ans = 'EXCEPTION: ' + (err && err.message || err); }
    const ok = !!(ans && answerOk(e, ans));
    tot++; perForm['hand-written'][1]++;
    if (ok) { pass++; perForm['hand-written'][0]++; }
    else fails.push({ id, form: 'hand-written', q: alt, ans });
});

console.log('════ BITBOT — ONE QUESTION, MANY FORMS ════');
Object.keys(perForm).forEach(k => {
    const [p, t] = perForm[k];
    if (!t) return;
    console.log('  ' + k.padEnd(14) + ': ' + String(p).padStart(4) + '/' + String(t).padStart(4) + '  ' + (p === t ? '✅' : (p / t > 0.9 ? '🟨' : '❌')));
});
console.log('─────────────────────────────────────────');
console.log('  TOTAL: ' + pass + '/' + tot + ' = ' + (100 * pass / tot).toFixed(1) + '%');
if (fails.length) {
    fs.writeFileSync('/tmp/bt_var_fail.txt', fails.map(f =>
        '[' + f.id + '|' + f.form + ']\n  Q: ' + f.q + '\n  A: ' + String(f.ans).slice(0, 300).replace(/\n/g, ' ⏎ ')).join('\n'));
    console.log('\nFirst 30 failures:');
    fails.slice(0, 30).forEach(f => console.log('  ✗ [' + f.id + '|' + f.form + '] ' + f.q.slice(0, 80) + '\n      → ' + String(f.ans).slice(0, 110).replace(/\n/g, ' ⏎ ')));
    console.log('\n(' + fails.length + ' failures → /tmp/bt_var_fail.txt)');
}
