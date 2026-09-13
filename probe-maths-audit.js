/* probe-maths-audit.js — free-form adversarial maths audit (Bittu's standard:
   improvised phrasings must work, not just canonical forms).
   Every expected value below was computed INDEPENDENTLY by hand.
   Run: node probe-maths-audit.js */
const fs = require('fs');

function makeEl() {
    return {
        style: {}, dataset: {}, children: [], childNodes: [],
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        addEventListener() {}, removeEventListener() {},
        appendChild(x) { return x; }, removeChild(x) { return x; }, insertBefore(x) {},
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
if (fs.existsSync('./solvex.js')) global.BitSolveX = require('./solvex.js');
eval(fs.readFileSync('./weights.js', 'utf8'));

const html = fs.readFileSync('./index.html', 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = blocks.sort((a, b) => b.length - a.length)[0];
const lastClose = main.lastIndexOf('})();');
const patched = main.slice(0, lastClose) + '\nwindow.__respond = respond;\n' + main.slice(lastClose);
(0, eval)(patched);
const respond = global.__respond;
global.dispatchEvent(new Event('ai-deps-ready'));

/* ── probes: [question, ...expected-substrings] (hand-computed) ─────────── */
const P = [
  /* numeric + operators + leading zeros */
  ['2² + 3 × 4 − 10 ÷ 2', '11'],
  ['what is 0007 + 5', '12'],
  ['999 × 999', '998001'],
  ['2 to the power 10', '1024'],
  ['1/2 + 1/3', '5/6'],
  ['15% of 240', '36'],
  ['square root of 144', '12'],
  ['144 ka square root kya hai', '12'],
  ['table of 17', '17 × 10 = 170'],
  ['1000 ÷ 8', '125'],
  ['3.5 × 2.4', '8.4'],
  ['-5 + 8', '3'],
  ['12 aur 15 ka sum kitna hota hai', '27'],
  ['what is 7!', '5040'],
  /* lcm/hcf */
  ['LCM of 12 and 18', '36'],
  ['HCF of 24 36', '12'],
  ['lcm of 4, 6 and 10', '60'],
  /* algebra */
  ['solve 3x + 5 = 20', 'x = 5'],
  ['if 2(x+3) = 14 find x', 'x = 4'],
  ['simplify and explain 4(2x − 3) + 5x', '13x − 12'],
  ['expand (2x+3)(x−4)', '2x² − 5x − 12'],
  ['factorise x² + 7x + 12', '(x + 3)(x + 4)'],
  ['x² = 49 solve', '7'],
  /* multi-step word problems (free-form) */
  ['Ram had 12 apples. He gave 5 to Shyam and then bought 3 more. How many apples does he have now?', '10'],
  ['A pen costs ₹7.50. How much do 8 pens cost?', '60'],
  ['The sum of two numbers is 25 and one number is 9. What is the other?', '16'],
  ['Sita has 3 times as many marbles as Ravi. Ravi has 7. How many marbles do they have together?', '28'],
  ['A car travels 240 km in 4 hours. What is its speed?', '60'],
  ['5 chocolates and 3 chocolates more then I ate 2. how many left?', '6'],
  ['Half of a number is 15. What is the number?', '30'],
  ['There are 45 students. 3/5 of them are girls. How many boys?', '18'],
  ['The perimeter of a square is 36 cm. What is its area?', '81'],
  ['Cost of 12 notebooks is 180. What is the cost of 5 notebooks?', '75'],
  ['A shopkeeper bought an item for 400 and sold it for 500. What is his profit percent?', '25'],
  ['Find the simple interest on 5000 at 8% per year for 3 years', '1200'],
  ['Find the average of 12, 18 and 24', '18'],
  ['If 20 men can finish a work in 15 days, how many days will 10 men take?', '30'],
  ['What is 25 increased by 20%?', '30'],
  ['Convert 3.5 kg to grams', '3500'],
];

let pass = 0, fail = 0;
for (const [q, ...needles] of P) {
  let a;
  try { a = respond(q); } catch (e) { a = 'EXCEPTION: ' + (e && e.message || e); }
  const s = String(a || '');
  if (needles.every(n => s.indexOf(n) !== -1)) { pass++; }
  else {
    fail++;
    console.log('✗ ' + q + '\n   wanted: ' + needles.join('+') + '\n   got: ' + s.slice(0, 220).replace(/\n/g, ' ⏎ '));
  }
}
console.log(`\nmaths audit: ${pass}/${P.length} pass, ${fail} fail`);
