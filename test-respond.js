/* End-to-end harness: runs index.html's main IIFE inside Node with DOM stubs
   and exercises respond() exactly like the browser would.
   Run: node test-respond.js   (after any index.html / math.js / data change) */
const fs = require('fs');

/* ── DOM stubs ─────────────────────────────────────────────────────────── */
function makeEl() {
    const el = {
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
    return el;
}
const elCache = {};
global.document = {
    getElementById(id) { return elCache[id] || (elCache[id] = makeEl()); },
    createElement() { return makeEl(); },
    createTextNode(t) { return { text: t }; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    body: makeEl(), documentElement: makeEl(), head: makeEl(),
    title: 'BitBot', hidden: false, visibilityState: 'visible'
};
global.window = global;
global.self = global;
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

/* ── load modules exactly like the page loader does ───────────────────── */
const BitBrain = require('./brain.js');
global.BitBrain = BitBrain;
global.BitMath = require('./math.js');
global.BitWords = require('./wordmath.js');
global.BitData = require('./data.js');
require('./data2.js');
require('./data3.js');
eval(fs.readFileSync('./weights.js', 'utf8'));   // sets window.BITBOT_WEIGHTS

/* ── extract index.html's main IIFE and expose respond()/doMath() ─────── */
const html = fs.readFileSync('./index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = blocks.sort((a, b) => b.length - a.length)[0];       // the big one
const lastClose = main.lastIndexOf('})();');
if (lastClose < 0) throw new Error('IIFE close not found');
const patched = main.slice(0, lastClose) +
    '\nwindow.__respond = respond; window.__doMath = doMath;\n' +
    main.slice(lastClose);
(0, eval)(patched);

const respond = global.__respond;
if (typeof respond !== 'function') throw new Error('respond() not exposed');
// fire the same event the page loader fires once brain/math/data/weights are in
global.dispatchEvent(new Event('ai-deps-ready'));

/* ── test runner ───────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
function has(ans, ...needles) { return needles.every(n => String(ans).indexOf(n) !== -1); }
function T(name, text, ...needles) {
    let ans;
    try { ans = respond(text); } catch (e) { ans = 'EXCEPTION: ' + (e && e.message || e); }
    if (ans && has(ans, ...needles)) { pass++; }
    else { fail++; console.log('FAIL: ' + name + '\n  Q: ' + text + '\n  A: ' + String(ans).slice(0, 300).replace(/\n/g, ' ⏎ ') + '\n  wanted: ' + needles.join(' + ')); }
}

/* v10 algebra — equations */
T('eq simple', '2x + 3 = 11', 'x = 4', 'Check');
T('eq var both sides', 'solve for x: 5x - 2 = 3x + 8', 'x = 5');
T('eq brackets', '3(x - 2) + 4 = 2x + 5', 'x = 7');
T('eq fraction root', 'x/2 + 5 = 3x - 4', '18/5');
T('eq quadratic', 'x^2 - 5x + 6 = 0', 'x = 2', 'x = 3', '(x − 2)(x − 3)');
T('eq x²=49', 'x² = 49', '-7', '7');
T('eq no real roots', 'x^2 + 4 = 0', 'No real roots');
T('eq identity', '2x + 3 = 2x + 3', 'Identity');
T('eq no solution', '2x + 3 = 2x + 9', 'No solution');
T('eq hinglish', 'solve karo 4x + 6 = 18', 'x = 3');

/* v10 algebra — expand / simplify */
T('exp (a+b)²', 'expand (a+b)^2', 'a² + 2ab + b²');
T('exp (a-b)²', 'expand (a - b)²', 'a² − 2ab + b²');
T('exp diff of squares', '(a+b)(a-b)', 'a² − b²');
T('exp (a+b+c)²', 'expand (a+b+c)^2', 'a² + 2ab + 2ac + b² + 2bc + c²');
T('exp (a+b)³', 'expand (a+b)^3', 'a³ + 3a²b + 3ab² + b³');
T('exp x+a x+b', 'expand (x+a)(x+b)', 'x²');

/* v9 numeric math must still work */
T('numeric bodmas', '2+2÷2', '3');
T('numeric steps', 'simplify and explain: (2+3)×4^2-10÷5', '78', 'Step 1');
T('table of 7', 'table of 7', '7 × 1', '7 × 10');
T('gcd', 'gcd of 12 and 18', '6');
T('lcm', 'lcm of 15 and 20', '60');
T('prime', 'is 17 a prime', 'IS prime');
T('not prime', 'is 21 prime', 'NOT prime', '3 × 7');
T('factorial', 'factorial of 5', '120');
T('factors of 12', 'factors of 12', '1, 2, 3, 4, 6, 12');
T('percent', '50% of 200', '100');
T('sqrt', '√169', '13');
T('square', '12 squared', '144');

/* v10 word problems through respond() */
T('wp sum-diff', 'The sum of two numbers is 25 and their difference is 5. Find the numbers.', '15', '10');
T('wp speed', 'A car travels 150 km in 3 hours. Find its speed.', '50');
T('wp work', 'A can do a piece of work in 10 days and B in 15 days. How long will they take working together?', '6');
T('wp profit', 'An article is bought for 500 rupees and sold for 600 rupees. Find profit and profit percent.', '100', '20');
T('wp ci', 'Find the compound interest on 10000 at 10% per annum for 2 years compounded annually.', '2100');
T('wp area', 'Find the area of a rectangle whose length is 12 cm and breadth is 5 cm.', '60');
T('wp age', 'A father is 3 times as old as his son. The sum of their ages is 40 years. Find their ages.', '30', '10');
T('wp probability', 'A die is rolled. What is the probability of getting a prime number?', '1/2');
T('wp story', 'Ram has 10 apples and he gave 3 apples to Shyam. How many apples are left?', '7');
T('wp hinglish', 'Ek rectangle ka perimeter 40 cm hai aur length 12 cm hai. Find the breadth.', 'Breadth = **8**');

/* routing sanity — non-math must not be hijacked by the algebra pre-catch */
T('joke still works', 'tell me a joke', '');
(function () {
    const j = respond('tell me a joke');
    if (/17a|Expanding|Simplifying/.test(j)) { fail++; console.log('FAIL: joke hijacked by algebra → ' + j.slice(0, 120)); } else pass++;
})();
(function () {
    const w = respond('what is the capital of India in 1947');
    if (/Word Problem|🧮/.test(w)) { fail++; console.log('FAIL: capital question hijacked → ' + w.slice(0, 120)); } else pass++;
})();
(function () {
    const g = respond('hello');
    if (/17a|Expanding|Simplifying|🧮/.test(g)) { fail++; console.log('FAIL: hello hijacked → ' + g.slice(0, 120)); } else pass++;
})();

console.log('test-respond.js: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
