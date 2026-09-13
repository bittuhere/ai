/* Smoke test: simulates the browser boot path (index.html) in Node.
   Loads brain.js → math.js → data.js → data2.js → data3.js → weights.js
   exactly like the page loader does, rebuilds the vocab index, checks the
   param badge math, the hash-feature vocab (HB) and predicts a spread of
   old + v9 topics. Run: node test-boot.js  (after train.js!) */
const fs = require('fs');
const BitBrain = require('./brain.js');
const BitMath = require('./math.js');
const BitData = require('./data.js');
require('./data2.js');                          // pushes into BitData
require('./data3.js');                          // v9 expansion — pushes into BitData
require('./data4.js');                          // v10 class-8 chapter mastery
global.window = {};                             // browser-ish global for weights.js
eval(fs.readFileSync('./weights.js', 'utf8'));  // sets window.BITBOT_WEIGHTS

const net = BitBrain.Net.load(window.BITBOT_WEIGHTS.net);
const vocabInfo = window.BITBOT_WEIGHTS.vocab;
vocabInfo.index = {};
vocabInfo.words.forEach((w, i) => { vocabInfo.index[w] = i; });
if (!vocabInfo.HB) throw new Error('vocab.HB missing — weights.js was written by the OLD trainer; rerun node train.js');
console.log('hash buckets: ' + vocabInfo.HB + ' (char-trigram typo tolerance ON)');

// math engine spot-checks (the deterministic pre-catch in respond())
const MATH_CASES = [['2+2÷2', 3], ['2²', 4], ['9-08', 1], ['5¹⁰', 9765625], ['3!', 6], ['50% of 200', 100]];
let mbad = 0;
MATH_CASES.forEach(([q, v]) => {
    const r = BitMath.solve(q);
    if (!r.ok || r.value !== v) { mbad++; console.log('  ✗ BitMath "' + q + '" → ' + (r.ok ? r.value : r.error) + ' want ' + v); }
});
if (!BitMath.looksLikeMath('2+2÷2') || BitMath.looksLikeMath('12')) { mbad++; console.log('  ✗ looksLikeMath pre-catch broken'); }
console.log(mbad ? mbad + ' BitMath failures' : 'BitMath pre-catch + solver: all spot checks ✔');

const PARAMS = net.W1.length + net.b1.length + net.W2.length + net.b2.length;   // same math as index.html badge
console.log('boot OK — spec: ' + vocabInfo.words.length + '→' + net.H + '→' + net.N +
    ' · ' + PARAMS.toLocaleString('en-IN') + ' params (' + (PARAMS / 100000).toFixed(1) + ' lakh)');

function predict(text) {
    const p = net.forward(BitBrain.bag(text, vocabInfo)).p;
    let best = 0, second = -1;
    for (let i = 1; i < p.length; i++) {
        if (p[i] > p[best]) { second = best; best = i; }
        else if (second === -1 || p[i] > p[second]) second = i;
    }
    return { tag: vocabInfo.tags[best], prob: p[best], tag2: vocabInfo.tags[second] };
}

// speed benchmark (same idea as the in-page "how fast are you?" skill)
const t0 = process.hrtime.bigint();
const RUNS = 2000;
for (let i = 0; i < RUNS; i++) predict('what is photosynthesis and how do plants make their food');
const us = Number(process.hrtime.bigint() - t0) / 1000 / RUNS;
console.log('speed: ' + us.toFixed(1) + ' µs/answer (' + RUNS + ' classifications)');

// quantized-weight decode time (the only new boot cost vs v7)
const t1 = process.hrtime.bigint();
BitBrain.Net.load(window.BITBOT_WEIGHTS.net);
console.log('weight decode: ' + (Number(process.hrtime.bigint() - t1) / 1e6).toFixed(1) + ' ms');

const CASES = [
    'hi', 'who are you', 'how do i add a friend?', 'what is 45 times 3', 'convert 5 km to miles',
    'roll a dice', 'quiz me', 'tell me a fact', 'what is photosynthesis', 'newtons third law',
    'what is the constitution of india', 'how do banks make money', 'what is an ip address',
    'who won the 2022 fifa world cup', 'exam stress kaise door karein', 'what is a synonym',
    'tell me about chandrayaan 3', 'what is the repo rate', 'i am bored', 'how many parameters do you have',
    'will you be my friend', 'do aliens exist', 'what is gst', 'pythagoras theorem',
    'national bird of india', 'who was gandhi', 'what is a food chain', 'dost kaise add karein',
    'how fast are you', 'tell me a joke',
    /* ── v9 topics ── */
    'how many questions in the weekly quiz', 'i got banned from quiz why',
    'how do i sign in with google', 'where are the exam fair copies',
    'what medals do quiz winners get', 'how do i change my username',
    'what is bihar famous for', 'which river flows through munger',
    'who built the tanjavur big temple', 'who was sher e punjab',
    'how did the east india company rule india', 'which cities got atomic bombs',
    'what does upi stand for', 'how many bits in a byte',
    'what is bodmas rule', 'how to find lcm and hcf',
    'what is cloud computing', 'is linux open source',
    'explain photosynthesis in detail', 'what is the united nations'
];
let bad = 0;
CASES.forEach(q => {
    const r = predict(q);
    const flag = r.prob < 0.4 ? '  ⚠ low confidence' : '';
    if (r.prob < 0.4) bad++;
    console.log('  "' + q + '" → ' + r.tag + ' (' + (r.prob * 100).toFixed(0) + '%, runner-up ' + r.tag2 + ')' + flag);
});
console.log(bad ? bad + ' low-confidence cases' : 'all cases confident ✔');
