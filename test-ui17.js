/* test-ui17.js — verifies the v17 frontend rebuild:
   solid-color theme, SVG icons (well-formedness checked!), model modal,
   download overlay, error banner, Watch-learn removal, emoji-free chrome,
   version coherence, context compactor.  Run: node test-ui17.js */
const fs = require('fs');
const P = require('./bitlm-pro.js');
const html = fs.readFileSync('./index.html', 'utf8');
const sw = fs.readFileSync('./sw.js', 'utf8');
const man = fs.readFileSync('./manifest.webmanifest', 'utf8');

let pass = 0, fail = 0;
function ck(cond, name, extra) {
    if (cond) pass++;
    else { fail++; console.log('✗ ' + name + (extra ? '  [' + String(extra).slice(0, 160) + ']' : '')); }
}

/* ── 1. SVG well-formedness: every <svg> block must have balanced tags + viewBox ── */
function svgBalanced(svg) {
    const tokens = [...svg.matchAll(/<(\/)?([a-zA-Z][\w-]*)([^>]*?)(\/)?>/g)];
    const stack = [];
    for (const t of tokens) {
        const [, close, tag, attrs, selfClose] = t;
        if (selfClose) continue;
        if (close) {
            if (!stack.length || stack.pop() !== tag) return false;
        } else stack.push(tag);
    }
    return stack.length === 0;
}
const svgs = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => m[0]);
ck(svgs.length >= 8, 'SVG icons present (found ' + svgs.length + ')');
svgs.forEach((s, i) => {
    ck(svgBalanced(s), 'SVG #' + (i + 1) + ' well-formed/balanced', s.slice(0, 80));
    ck(/viewBox="0 0 24 24"/.test(s), 'SVG #' + (i + 1) + ' has 24x24 viewBox');
});
// COPY_ICON inside the JS must also be balanced
const ci = html.match(/var COPY_ICON = '([\s\S]*?)';/);
ck(!!ci && svgBalanced(ci[1]), 'COPY_ICON svg balanced');

/* ── 2. required v17 elements exist ── */
['modelOv', 'cardBitlm', 'cardBitbot', 'moGo', 'moReq', 'dlOv', 'dlTitle', 'dlpct', 'dlfill', 'dlmb', 'dlstep', 'dlCancel',
 'errBanner', 'errText', 'errClose', 'modelBtn', 'loader', 'lpct', 'lfill', 'lstep', 'chat', 'inp', 'send', 'status', 'statusTxt',
 'brainspec', 'histBtn', 'histOv', 'histClose', 'histCount', 'histList', 'clearBtn', 'typing', 'chips', 'ver'].forEach(id => {
    ck(html.indexOf('id="' + id + '"') > -1, 'element #' + id + ' exists');
});

/* ── 3. Watch-learn fully removed ── */
['trainBtn', 'trainOv', 'trainFill', 'trainStats', 'Watch BitBot learn', 'watch it learn'].forEach(s => {
    ck(html.indexOf(s) === -1, 'removed: ' + s);
});

/* ── 4. modal content matches spec ── */
ck(html.indexOf('Which AI do you want to use?') > -1, 'modal question exact');
ck(html.indexOf('Once you would download, you would not need to download next time.') > -1, 'download-once note exact');
ck(/A large language model/.test(html), 'BitLM card: "A large language model"');
ck(/completely made from scratch/.test(html), 'BitBot card: "completely made from scratch"');
ck(/494M params · ~295 MB one-time download/.test(html), 'BitLM size in MB shown');
ck(/1\.27 cr params · ~17 MB/.test(html), 'BitBot size in MB shown');

/* ── 5. emoji-free chrome: no emoji outside <script> blocks ── */
const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F0FF}]/u;
const em = noScript.match(emojiRe);
ck(!em, 'no emoji in HTML/CSS chrome', em && em[0] + ' @' + noScript.slice(Math.max(0, em.index - 40), em.index + 10));

/* ── 6. solid colors: no gradients in CSS ── */
const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
ck(style.indexOf('linear-gradient') === -1 && style.indexOf('radial-gradient') === -1, 'CSS has zero gradients (solid colors)');
ck(style.indexOf('#1a73e8') > -1, 'solid accent color present');
ck(/font-family:\s*system-ui/.test(style), 'system font stack (no external fonts)');

/* ── 7. version coherence ── */
ck(/<title>BitBot v18/.test(html), 'title v18');
ck(html.indexOf('<div id="ver">BitBot v18</div>') > -1, 'ver badge v18');
ck(html.indexOf("BitBot v18") > -1 && /I'm \*\*BitBot v18\*\* by \*\*Anurag\*\*/.test(html), 'greet v18 by Anurag');
const vq = [...html.matchAll(/\?v=(\d+)'/g)].map(m => m[1]);
ck(vq.length === 12 && vq.every(v => v === '18'), 'all 12 loader files at ?v=18', vq.join(','));
ck(/CACHE = 'bitbot-v19'/.test(sw), 'sw cache v19');
ck(sw.indexOf("'./bitlm-pro.js'") > -1, 'sw caches bitlm-pro.js');
ck(/"theme_color": "#1a73e8"/.test(man) && /"background_color": "#ffffff"/.test(man), 'PWA manifest solid light colors');

/* ── 8. context compactor ── */
const hist = [];
for (let i = 0; i < 30; i++) hist.push({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(1000) });
const tr = P.trimHistory(hist, 12000);
ck(tr.hist.length < hist.length && tr.dropped > 0, 'trimHistory drops oldest');
let size = 0; tr.hist.forEach(m => size += m.content.length + 8);
ck(size <= 12000, 'trimmed history within budget', size);
ck(tr.hist.length % 2 === 0, 'history stays pair-balanced');
ck(P.trimHistory([], 100).dropped === 0, 'trimHistory empty safe');
const huge = P.trimHistory([{ role: 'user', content: 'y'.repeat(50000) }], 1000);
ck(huge.hist.length === 0, 'oversized single message → cleared');

/* ── 9. model sizes honest + under cap ── */
ck(P.MODELS.max.dlMB === 295 && P.MODELS.lite.dlMB === 215, 'dlMB sizes for loader (f32 editions)');
ck(P.MODELS.max.paramsM < 500 && P.MODELS.lite.paramsM < 500, 'both models under 500M cap');

/* ── 10. boot modal wiring exists ── */
ck(/showModelModal\(true\)/.test(html), 'boot opens modal on first run');
ck(/modelChoice\(\) === ''/.test(html), 'first-run detection');
ck(/dlStart\(\)/.test(html), 'BitLM download flow wired');
ck(/window\.addEventListener\('error'/.test(html) && /unhandledrejection/.test(html), 'top-level error handling');

console.log(`test-ui17.js: ${pass} pass, ${fail} fail ${fail ? '❌' : '✅'}`);
process.exit(fail ? 1 : 0);
