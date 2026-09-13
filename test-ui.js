/* ═══════════════════════════════════════════════════════════════════════════
   test-ui.js — TOAST & MATH-OUTPUT AUDIT  (v14)
   1. LOADER/TOAST AUDIT — every loader-step "toast" in the manifest must
      reference a real file, have a non-empty message, and rise 0→100%.
   2. GREAT-PARSER AUDIT — mathEncode()/mdRender() must encode 2^2 → 2²,
      1/3 → ⅓, stacked fractions, × etc., and never touch code spans/links.
   3. FULL MATH-OUTPUT AUDIT — every one of the 292 bank answers, rendered
      through the REAL mdRender, must not throw and must contain no NaN,
      undefined, [object, leftover ** or un-encoded ^digits.
   Usage:  node test-ui.js            → all audits
           node test-ui.js quick      → audits 1+2 only
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

/* ── load the AI exactly like the page does ────────────────────────────── */
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
    '\nwindow.__respond = respond; window.__mdRender = mdRender; window.__mathEncode = mathEncode; window.__autoTitle = autoTitle; window.__chatAdd = chatAdd;\n' +
    main.slice(lastClose);
(0, eval)(patched);
global.dispatchEvent(new Event('ai-deps-ready'));
const respond = global.__respond, mdRender = global.__mdRender,
      mathEncode = global.__mathEncode, autoTitle = global.__autoTitle,
      chatAdd = global.__chatAdd;

let pass = 0, fail = 0;
const fails = [];
function check(ok, label, extra) {
    if (ok) pass++;
    else { fail++; fails.push(label + (extra ? '  →  ' + extra : '')); }
}

/* ═══ 1. LOADER / TOAST AUDIT ═══════════════════════════════════════════ */
console.log('── 1. loader/toast audit ──');
{
    const man = [...html.matchAll(/\['([\w.\-?=&v0-9]+)',\s*(\d+),\s*'([^']+)'\]/g)];
    check(man.length >= 8, 'manifest has ≥8 steps', 'found ' + man.length);
    let prev = 0;
    man.forEach(m => {
        const file = m[1].split('?')[0], pct = +m[2], msg = m[3];
        check(fs.existsSync(file), 'manifest file exists: ' + file);
        check(msg.length > 8, 'toast message non-trivial: ' + file, msg);
        check(pct > prev && pct <= 100, 'loader % rises: ' + file + ' @' + pct, 'prev=' + prev);
        prev = pct;
    });
    check(prev <= 99, 'manifest % below final', 'ends at ' + prev);
    check(html.indexOf("setP(100, 'ready')") > -1, 'loader completes to 100% at boot-end');   // v17: Watch-learn removed
    // status-pill toasts must all be non-empty strings
    const st = [...html.matchAll(/statusTxt\.textContent\s*=\s*'([^']*)'/g)];
    st.forEach(m => check(m[1].length > 0, 'status toast non-empty', JSON.stringify(m[1])));
    console.log('   manifest steps: ' + man.length + ', status toasts: ' + st.length);
}

/* ═══ 2. GREAT-PARSER AUDIT ═════════════════════════════════════════════ */
console.log('── 2. great-parser (mathEncode) audit ──');
{
    const cases = [
        ['2^2', '2²'], ['x^3', 'x³'], ['2^10', '2¹⁰'], ['3^(-1)', '3⁻¹'],
        ['(a+b)^2', '(a+b)²'], ['x^n', 'xⁿ'], ['x^(2k)', 'x<sup>2k</sup>'],
        ['1/3', '⅓'], ['2/5', '⅖'], ['3/4', '¾'],
        ['2*3', '2×3'], ['n*(n+1)', 'n×(n+1)']
    ];
    cases.forEach(c => {
        const out = mathEncode(c[0]);
        check(out === c[1], 'mathEncode ' + JSON.stringify(c[0]), 'got ' + JSON.stringify(out) + ' want ' + JSON.stringify(c[1]));
    });
    // stacked fraction for non-unicode denominators
    const f52 = mathEncode('1/52');
    check(/class="frac"/.test(f52) && /1/.test(f52) && /52/.test(f52), 'mathEncode 1/52 → stacked frac', f52);
    // things that must NOT change
    const noTouch = ['12/9/2026 was a date', 'read chapter 5/6 pages', 'https://x.com/a/b', 'score 100/200 marks? no—big nums ok to stack'];
    check(!/frac|½|⅓/.test(mathEncode(noTouch[0])), 'date 12/9/2026 untouched', mathEncode(noTouch[0]));
    check(mathEncode('a/b').indexOf('frac') === -1, 'letters a/b untouched', mathEncode('a/b'));
    // code spans & links protected through mdInline→mdRender
    const r1 = mdRender('try `2^2` inline and 2^2 outside');
    check(r1.indexOf('<code>2^2</code>') > -1, 'code span keeps raw 2^2', r1);
    check(r1.indexOf('2²</code>') === -1, 'code span NOT encoded', r1);
    check(/2²/.test(r1.replace(/<code>[^<]*<\/code>/g, '')), 'outside-code 2^2 encoded', r1);
    const r2 = mdRender('[Arcade](https://bittuhere.github.io/x^2/y) and 1/2');
    check(r2.indexOf('href="https://bittuhere.github.io/x^2/y"') > -1, 'link URL untouched', r2);
    check(r2.indexOf('½') > -1, 'fraction next to link encoded', r2);
    // bold/italic still work after rebuild
    const r3 = mdRender('**bold** and *italic*');
    check(r3.indexOf('<b>bold</b>') > -1 && r3.indexOf('<i>italic</i>') > -1, 'bold+italic survive', r3);
}

/* ═══ 3. FULL MATH-OUTPUT AUDIT — all 292 bank answers rendered ═════════ */
if (process.argv[2] !== 'quick') {
    console.log('── 3. full math-output audit (292 answers through mdRender) ──');
    const BANK = require('./bt-bank.js');
    let rendered = 0;
    BANK.forEach(item => {
        const ans = respond(item.q);
        check(typeof ans === 'string' && ans.length > 0, item.id + ' answered');
        let out = null, threw = null;
        try { out = mdRender(ans); } catch (e) { threw = e.message; }
        check(!threw, item.id + ' mdRender no-throw', threw);
        if (out === null) return;
        rendered++;
        check(!/NaN/.test(out), item.id + ' no NaN in output', out.slice(0, 120));
        check(!/undefined/.test(out), item.id + ' no undefined in output', out.slice(0, 120));
        check(!/\[object/.test(out), item.id + ' no [object in output', out.slice(0, 120));
        check(!/\*\*/.test(out), item.id + ' no leftover ** after render', out.slice(0, 120));
        check(!/\^\d/.test(out.replace(/<code>[\s\S]*?<\/code>/g, '')), item.id + ' no leftover ^digit after render',
              (out.match(/\^\d[^ <]*/) || [''])[0]);
    });
    console.log('   rendered ' + rendered + '/' + BANK.length + ' answers');

    /* ── bonus: auto-heading generator sanity ── */
    console.log('── 4. chat auto-heading sanity ──');
    check(autoTitle('pls solve this: find the value of x in 2x+3=11') === 'Find the value of x in 2x+3=11',
          'autoTitle strips request prefixes', autoTitle('pls solve this: find the value of x in 2x+3=11'));
    check(autoTitle('hi').length > 0 && autoTitle('') === 'New chat', 'autoTitle handles empties');
    const long = autoTitle('what is the compound interest on rs 10000 at 10 percent per annum for 2 years when compounded annually please tell');
    check(long.length <= 46 && long.endsWith('…'), 'autoTitle truncates long text', long);
    check(chatAdd && typeof chatAdd === 'function', 'chatAdd wired for auto-save');
}

/* ═══ verdict ═══════════════════════════════════════════════════════════ */
console.log('─────────────────────────────────────────');
console.log('  test-ui.js: ' + pass + ' pass, ' + fail + ' fail' + (fail ? '  ❌' : '  ✅'));
if (fails.length) {
    console.log('\nFailures (first 25):');
    fails.slice(0, 25).forEach(f => console.log('  ✗ ' + f));
    try { fs.writeFileSync('/tmp/ui_fail.txt', fails.join('\n')); } catch (e) {}
}
process.exit(fail ? 1 : 0);
