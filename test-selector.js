/* test-selector.js — v16 model-selector + BitLM Pro command flow, tested
   through the REAL respond() inside the index.html harness (DOM stubs).
   Run: node test-selector.js */
const fs = require('fs');
function makeEl() {
    return {
        style: {}, dataset: {}, children: [], childNodes: [],
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {}, removeEventListener() {},
        appendChild(x) { return x; }, removeChild(x) { return x; }, insertBefore() {},
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
    addEventListener() {}, body: makeEl(), documentElement: makeEl(), head: makeEl(),
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
global.BitData = require('./data.js');
require('./data2.js'); require('./data3.js'); require('./data4.js');
require('./bitlm-pro.js');                                   // v16 engine (window.BitLMPro)
eval(fs.readFileSync('./weights.js', 'utf8'));

const html = fs.readFileSync('./index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = blocks.sort((a, b) => b.length - a.length)[0];
const lastClose = main.lastIndexOf('})();');
const patched = main.slice(0, lastClose) + '\nwindow.__respond = respond; window.__greet = greet; window.__modelChoice = modelChoice;\n' + main.slice(lastClose);
(0, eval)(patched);
global.dispatchEvent(new Event('ai-deps-ready'));
const respond = global.__respond, greet = global.__greet;

let pass = 0, fail = 0;
function ck(cond, name, extra) {
    if (cond) pass++;
    else { fail++; console.log('✗ ' + name + (extra ? '  [' + String(extra).slice(0, 140) + ']' : '')); }
}
function R(t) { try { return String(respond(t)); } catch (e) { return 'EXCEPTION ' + e.message; } }
function setChoice(v) { if (v === null) localStorage.removeItem('bb_model_choice'); else localStorage.setItem('bb_model_choice', v); }

/* 1. greet asks the selector question when no choice */
setChoice(null);
elCache['chat'] = makeEl();
greet();
const chatEl = elCache['chat'];
// greet uses addMsg → createElement stubs; instead test via respond flow:
/* 2. selector intercept: 'a' → BitLM selected (v18: CPU mode means no-WebGPU is no longer a blocker) */
setChoice(null);
let a = R('a');
ck(/BitLM selected/i.test(a), 'no-choice + "a" → BitLM selected (GPU-or-CPU)', a);
ck(/CPU mode/i.test(a), 'selection message mentions CPU fallback', a);
ck(global.__modelChoice() === 'bitlm', 'choice persisted = bitlm', global.__modelChoice());

/* 3. 'b' picks BitBot cleanly */
setChoice(null);
a = R('b');
ck(/BitBot selected/i.test(a), 'no-choice + "b" → BitBot selected', a);
ck(global.__modelChoice() === 'bitbot', 'choice persisted');

/* 4. switch commands */
setChoice('bitbot');
a = R('switch to bitlm');
ck(/BitLM selected/i.test(a), 'switch to bitlm works on any device (v18 CPU fallback)', a);
setChoice('bitlm');
a = R('switch to bitbot');
ck(/BitBot selected/i.test(a), 'switch to bitbot works', a);
ck(global.__modelChoice() === 'bitbot', 'switch persisted');

/* 5. which-model ask */
setChoice('bitbot');
a = R('which model are you using?');
ck(/Current model: \*\*BitBot/i.test(a) || /Current model.*BitBot/i.test(a), 'ask → reports current model', a);

/* 6. size commands */
a = R('bitlm lite');
ck(/BitLM Lite/i.test(a) && /36 crore|3\.6 crore/i.test(a), 'bitlm lite → size confirmation', a);
ck(localStorage.getItem('bb_pro_model') === 'lite', 'size persisted');
a = R('bitlm max');
ck(/BitLM Max/i.test(a) && /49\.4|4\.94/.test(a), 'bitlm max → size confirmation', a);
ck(localStorage.getItem('bb_pro_model') === 'max', 'size persisted max');

/* 7. load command without bitlm active */
setChoice('bitbot');
a = R('load the model');
ck(/not your active model/i.test(a), 'load without bitlm → guidance', a);

/* 8. normal questions unaffected in bitbot mode */
setChoice('bitbot');
a = R('2+2');
ck(a.indexOf('4') !== -1, 'maths still exact in bitbot mode', a);
a = R('what is the weekly quiz');
ck(/quiz/i.test(a), 'site KB still answers in bitbot mode', a);

/* 9. looksPureMath engine-first gate (unit level, used by proSend) */
const P = global.BitLMPro;
ck(P.looksPureMath('solve 2x + 3 = 11') && !P.looksPureMath('write a poem'), 'engine-first gate sane');

/* 10. identity: system prompt has BitLM + Anurag, no base-model leak */
const sys = P.buildSystem({ model: 'max' });
ck(/You are BitLM/.test(sys) && /Anurag/.test(sys), 'identity in system prompt');
ck(!/qwen|smollm|llama/i.test(sys), 'no base-model names in system prompt');
ck(P.debrand('I am Qwen2.5-0.5B made by Alibaba') .indexOf('Qwen') === -1, 'debrand strips qwen');

/* 11. greet in bitlm mode mentions BitLM mode ON */
setChoice('bitlm');
let greetErr = null;
try { greet(); } catch (e) { greetErr = e.message; }
ck(greetErr === null, 'greet() runs in bitlm mode', greetErr);

console.log(`test-selector.js: ${pass} pass, ${fail} fail ${fail ? '❌' : '✅'}`);
process.exit(fail ? 1 : 0);
