/* test-bitlm-pro.js — tests every pure-logic piece of bitlm-pro.js in Node.
   Run: node test-bitlm-pro.js */
const P = require('./bitlm-pro.js');
let pass = 0, fail = 0;
function ck(cond, name, extra) {
    if (cond) { pass++; }
    else { fail++; console.log('✗ ' + name + (extra ? '  [' + extra + ']' : '')); }
}
function eq(a, b, name) { ck(a === b, name, 'got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); }

/* ── 1. model catalog: developer's HARD LIMIT — all models < 500M params ── */
Object.keys(P.MODELS).forEach(k => {
    const m = P.MODELS[k];
    ck(m.paramsM < 500, `catalog ${k} under 500M cap`, m.paramsM + 'M');
    ck(/q4f(16|32)_1-MLC$/.test(m.id), `catalog ${k} valid webllm id`);
    ck(/BitLM/.test(m.name) && !/qwen|smol|llama/i.test(m.name), `catalog ${k} rebranded name`);
});

/* ── 2. safeCalc — the javascript console ─────────────────────────────── */
function calcOK(expr, want) {
    const r = P.safeCalc(expr);
    ck(r.ok && Math.abs(r.value - want) < 1e-6, `calc ${expr} = ${want}`, r.ok ? r.shown : r.error);
}
function calcBad(expr) {
    const r = P.safeCalc(expr);
    ck(!r.ok, `calc rejects: ${expr.slice(0, 40)}`, r.ok ? '→ ' + r.shown : '');
}
calcOK('2+2', 4);
calcOK('(15*240)/100', 36);
calcOK('sqrt(144)', 12);
calcOK('2^10', 1024);
calcOK('√144', 12);
calcOK('3.5*2.4', 8.4);
calcOK('min(3,7)', 3);
calcOK('100-25', 75);
calcOK('7*8-12/4', 53);
calcOK('2² + 3 × 4 − 10 ÷ 2', 11);
calcOK('20%', 0.2);
calcOK('25*(1+20/100)', 30);
calcOK('pow(3,3)', 27);
calcBad('fetch("http://x")');
calcBad('window.alert(1)');
calcBad('a+b');
calcBad('this');
calcBad('constructor');
calcBad('process.exit(1)');
calcBad('(()=>1)()');
calcBad('[1,2][0]');
calcBad('{"a":1}');
calcBad('"str"');
calcBad('Math.random');
calcBad('log(0)');                       // -Infinity → not finite
calcBad('1/0');
calcBad('x'.repeat(400));
ck(P.safeCalc('2+2').shown === '4', 'calc shown format');

/* ── 3. debrand — identity protection ─────────────────────────────────── */
function clean(s) { return P.debrand(s); }
ck(!/qwen/i.test(clean('I am Qwen2.5, an AI by Alibaba Cloud')), 'debrand qwen');
ck(!/alibaba/i.test(clean('I am Qwen2.5, an AI by Alibaba Cloud')), 'debrand alibaba');
ck(!/llama/i.test(clean('I am based on Llama-3.2 from Meta AI')), 'debrand llama+meta');
ck(!/phi/i.test(clean('Phi-3.5-mini powers me')), 'debrand phi');
ck(!/webllm|mlc/i.test(clean('running via WebLLM / MLC-AI runtime')), 'debrand webllm/mlc');
ck(!/smolm/i.test(clean('SmolLM2 small model')), 'debrand smollm');
ck(!/hugging/i.test(clean('weights from Hugging Face')), 'debrand hf');
ck(clean('I am BitLM, my developer is Anurag') === 'I am BitLM, my developer is Anurag', 'debrand keeps clean text');
ck(/BitLM/.test(clean('I am Qwen')), 'debrand substitutes BitLM');
ck(!/BitLM[\s,.]*BitLM/.test(clean('Qwen Qwen Qwen')), 'debrand collapses repeats');

/* ── 4. parseAll — think/answer/calc stream parser ────────────────────── */
let p = P.parseAll('<think>need 12*8<calc>12*8</calc> ok</think>Final **answer** here.');
eq(p.think, 'need 12*8  ok', 'parse think extracted');
eq(p.answer, 'Final **answer** here.', 'parse answer extracted');
eq(p.calcs.length, 1, 'parse closed calc logged');

p = P.parseAll('<think>still thinking');
eq(p.answer, '', 'parse open think → no answer yet');
ck(p.think.indexOf('still thinking') !== -1, 'parse open think content');
ck(p.thinkOpen, 'parse thinkOpen flag');

p = P.parseAll('answer so far<thi');
eq(p.answer, 'answer so far', 'parse holds back partial <thi tag');

p = P.parseAll('<think>x</think>A<calc>2+2');
eq(p.tailCalc, '2+2', 'parse tail open calc');
eq(p.answer, 'A', 'parse answer before open calc');

p = P.parseAll('plain text, no tags at all');
eq(p.answer, 'plain text, no tags at all', 'parse plain → all answer');
eq(p.think, '', 'parse plain → empty think');

p = P.parseAll('ok<cal');
eq(p.answer, 'ok', 'parse holds back partial <cal');

/* ── 5. buildSystem — the mindset ─────────────────────────────────────── */
const sys = P.buildSystem({ facts: '- BitBot answers Arcade Hub questions.', userName: 'Bittu', model: 'max' });
ck(sys.indexOf('You are BitLM') !== -1, 'system: identity BitLM');
ck(sys.indexOf('Anurag') !== -1, 'system: developer Anurag');
ck(/never (reveal|say|mention)/i.test(sys), 'system: no-base-model rule');
ck(sys.indexOf('<calc>') !== -1, 'system: calc protocol');
ck(/<think>/.test(sys), 'system: think protocol');
ck(sys.indexOf('Arcade Hub') !== -1, 'system: site knowledge');
ck(sys.indexOf('Weekly Quiz') !== -1, 'system: weekly quiz fact');
ck(sys.indexOf('Bittu') !== -1, 'system: userName injected');
ck(sys.indexOf('BitBot answers Arcade Hub') !== -1, 'system: retrieved facts injected');
ck(/[Mm]arkdown/.test(sys), 'system: markdown rule');
ck(!/qwen|smollm/i.test(sys), 'system: no base-model names leak');
const longSys = P.buildSystem({ facts: 'x'.repeat(5000) });
ck(longSys.indexOf('x'.repeat(1601)) === -1, 'system: facts capped at 1600 chars');

/* ── 6. retrieveFacts — mini-RAG over the intent KB ───────────────────── */
const INTENTS = [
    { tag: 'greet', patterns: ['hello', 'hey there', 'hi bitbot'], responses: ['Hey! I am BitBot, the Arcade Hub assistant.'] },
    { tag: 'quiz', patterns: ['weekly quiz rules', 'how does the quiz work', 'quiz time'], responses: ['The Weekly Quiz runs every week — log in to join, top scorers hit the leaderboard.'] },
    { tag: 'login', patterns: ['how to login', 'sign up process', 'create account'], responses: ['Use Sign Up with your name and password; then Log In from the profile page.'] },
    { tag: 'noise', patterns: ['aaaaaaaa bbbbbbbb cccccccc'], responses: ['noise'] }
];
let f = P.retrieveFacts(INTENTS, 'what are the weekly quiz rules?', 4);
ck(f.indexOf('Weekly Quiz runs') !== -1, 'retrieve: quiz matched');
ck(f.indexOf('noise') === -1, 'retrieve: noise not matched');
f = P.retrieveFacts(INTENTS, 'how do i login to my account', 4);
ck(f.indexOf('Sign Up') !== -1, 'retrieve: login matched');
f = P.retrieveFacts(INTENTS, 'hello', 1);
ck(f.indexOf('BitBot, the Arcade Hub') !== -1, 'retrieve: greet matched');
eq(P.retrieveFacts(INTENTS, '', 4), '', 'retrieve: empty query → ""');
eq(P.retrieveFacts(null, 'hello', 4), '', 'retrieve: null intents → ""');
f = P.retrieveFacts(INTENTS, 'xyzzy qq zz nothing matches this at all', 4);
eq(f, '', 'retrieve: irrelevant → ""');

/* ── 7. looksPureMath — engine-first gate ─────────────────────────────── */
['2+2', 'what is 15% of 240', 'solve 2x+3=11', 'table of 17', 'expand (a+b)^2', 'LCM of 12 and 18',
 'square root of 144', 'simplify 2² + 3 × 4 − 10 ÷ 2', '7!', '12 ka table'].forEach(q =>
    ck(P.looksPureMath(q), 'mathy: ' + q));
['who are you', 'write a poem about rain', 'photosynthesis kya hai', 'capital of india',
 'tell me a story about a robot', 'how to login in arcade hub', 'what is the weekly quiz',
 'meaning of democracy'].forEach(q =>
    ck(!P.looksPureMath(q), 'not mathy: ' + q));

/* ── 8. parseChoice + isProCommand — the model selector ───────────────── */
eq(P.parseChoice('a'), 'bitlm');
eq(P.parseChoice('A) BitLM please'), 'bitlm');
eq(P.parseChoice('1'), 'bitlm');
eq(P.parseChoice('bitlm'), 'bitlm');
eq(P.parseChoice('b'), 'bitbot');
eq(P.parseChoice('2'), 'bitbot');
eq(P.parseChoice('bitbot'), 'bitbot');
eq(P.parseChoice('mini one'), 'bitbot');
eq(P.parseChoice('hello'), null);
let c = P.isProCommand('switch to bitbot');
ck(c && c.type === 'switch' && c.to === 'bitbot', 'cmd: switch to bitbot', JSON.stringify(c));
c = P.isProCommand('use bitlm');
ck(c && c.type === 'switch' && c.to === 'bitlm', 'cmd: use bitlm', JSON.stringify(c));
c = P.isProCommand('which model are you using?');
ck(c && c.type === 'ask', 'cmd: which model', JSON.stringify(c));
c = P.isProCommand('bitlm lite');
ck(c && c.type === 'size' && c.size === 'lite', 'cmd: bitlm lite', JSON.stringify(c));
c = P.isProCommand('load the model');
ck(c && c.type === 'load', 'cmd: load model', JSON.stringify(c));
eq(P.isProCommand('hello'), null, 'cmd: hello → null');
eq(P.isProCommand('what is photosynthesis'), null, 'cmd: question → null');

/* ── 9. chat tool loop with a MOCK engine (no CDN, no GPU) ────────────── */
function mockEngine(script) {
    let i = 0;
    const seen = [];
    const eng = {
        chat: {
            completions: {
                create(p) {
                    seen.push(JSON.parse(JSON.stringify(p.messages)));
                    const t = script[Math.min(i, script.length - 1)]; i++;
                    const chunks = t.match(/[\s\S]{1,6}/g) || [];
                    let j = 0;
                    const it = {
                        next() {
                            if (j < chunks.length) return Promise.resolve({ done: false, value: { choices: [{ delta: { content: chunks[j++] } }] } });
                            return Promise.resolve({ done: true });
                        }
                    };
                    return Promise.resolve({ [Symbol.asyncIterator]: () => it });
                }
            }
        }
    };
    return { eng, seen };
}
(async () => {
    // model asks the console for 12*8, then finishes
    const { eng, seen } = mockEngine([
        '<think>need math<calc>12*8',
        ' = 96, done</think>Twelve times eight is **96**.'
    ]);
    let chunks = 0;
    const res = await P.chat(eng, [{ role: 'system', content: 'sys' }, { role: 'user', content: 'what is 12×8?' }],
        { onChunk: () => { chunks++; }, maxTokens: 100 });
    ck(chunks > 3, 'chat: streamed chunks to UI', chunks);
    eq(res.calcLog.length, 1, 'chat: one calc logged');
    eq(res.calcLog[0].value, 96, 'chat: calc value 96');
    ck(res.answer.indexOf('**96**') !== -1, 'chat: final answer uses result', res.answer);
    ck(res.answer.indexOf('<calc>') === -1, 'chat: no calc tags leak into answer');
    const inj = seen[1].find(m => m.content.indexOf('[javascript console] 12*8 = 96') !== -1);
    ck(!!inj, 'chat: console result injected as message');
    eq(res.loops, 1, 'chat: one tool loop');

    // bad expression → error fed back, model recovers
    const m2 = mockEngine([
        '<think>hmm<calc>window.x',
        '<think>ok<calc>2+3',
        ' = 5</think>The answer is **5**.'
    ]);
    const r2 = await P.chat(m2.eng, [{ role: 'user', content: 'q' }], {});
    eq(r2.calcLog.length, 2, 'chat: rejected calc logged too');
    eq(r2.calcLog[0].ok, false, 'chat: malicious calc rejected');
    eq(r2.calcLog[1].value, 5, 'chat: recovery calc works');
    ck(r2.answer.indexOf('**5**') !== -1, 'chat: recovery answer');

    // maxCalcLoops respected (model loops forever)
    let calls = 0;
    const m3 = mockEngine(['<calc>1+1']);
    const origCreate = m3.eng.chat.completions.create;
    m3.eng.chat.completions.create = function (p) { calls++; return origCreate.call(this, p); };
    const r3 = await P.chat(m3.eng, [{ role: 'user', content: 'q' }], { maxCalcLoops: 2 });
    eq(calls, 3, 'chat: maxCalcLoops caps engine calls (2 loops + 1)');
    ck(r3.loops === 2, 'chat: loops counted');

    // debrand applied to final answer
    const m4 = mockEngine(['I am Qwen2.5 by Alibaba.']);
    const r4 = await P.chat(m4.eng, [{ role: 'user', content: 'who are you' }], {});
    ck(!/qwen|alibaba/i.test(r4.answer) && /BitLM/.test(r4.answer), 'chat: answer debranded', r4.answer);

    console.log(`\ntest-bitlm-pro.js: ${pass} pass, ${fail} fail ${fail ? '❌' : ' ✅'}`);
    process.exit(fail ? 1 : 0);
})();
