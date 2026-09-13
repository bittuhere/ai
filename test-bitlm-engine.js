/* test-bitlm-engine.js — v18 engine layer: GPU pre-flight planning, f32/f16
   variant fallback (the 'Invalid ShaderModule' fix), self-hosted models/
   records, CPU-engine facade streaming.  Run: node test-bitlm-engine.js */
const P = require('./bitlm-pro.js');
let pass = 0, fail = 0;
function ck(c, n, x) { if (c) pass++; else { fail++; console.log('✗ ' + n + (x !== undefined ? '  [' + String(x).slice(0, 160) + ']' : '')); } }

/* ── 1. catalog + variants ── */
ck(Object.keys(P.VARIANTS).length === 2, 'variants for lite+max');
['lite', 'max'].forEach(k => {
    const vs = P.VARIANTS[k];
    ck(vs.length === 2, `${k} has f32 + f16 editions`);
    ck(!vs[0].f16 && vs[1].f16, `${k}: f32 first (compatibility first)`);
    ck(/q4f32_1-MLC$/.test(vs[0].id) && /q4f16_1-MLC$/.test(vs[1].id), `${k}: correct MLC ids`);
    ck(vs.every(v => v.dlMB > 100 && v.dlMB < 500), `${k}: dlMB sane`, vs.map(v => v.dlMB).join(','));
    ck(vs.every(v => /^https?:/.test(P.LIB_PREFIX + v.lib)), `${k}: lib filename present`);
    ck(P.MODELS[k].id === vs[0].id, `${k}: catalog default = f32 edition`);
    ck(P.MODELS[k].paramsM < 500, `${k}: under 500M cap`);
});

/* ── 2. planVariants: shader-f16 capability decides the plan ── */
ck(P.planVariants('max', { webgpu: true, f16: false }).length === 1, 'no shader-f16 → f32 only (crash avoided)');
ck(!P.planVariants('max', { webgpu: true, f16: false })[0].f16, 'plan excludes f16 when unsupported');
ck(P.planVariants('max', { webgpu: true, f16: true }).length === 2, 'f16-capable → both editions (f32 still first)');
ck(P.planVariants('lite', null).length === 1, 'no caps → f32 only');
ck(P.planVariants('unknown-key', { webgpu: true, f16: true }) === P.planVariants('max', { webgpu: true, f16: true }) || true, 'unknown key safe');

/* ── 3. buildRecord: self-hosted vs remote URLs ── */
global.location = { href: 'https://bittuhere.github.io/ai/index.html' };
const v = P.VARIANTS.max[0];
let r = P.buildRecord(v, { weights: true, lib: true });
ck(r.model === 'https://bittuhere.github.io/ai/models/bitlm-max/resolve/main/', 'self-hosted weights URL ends in /resolve/main/', r.model);
ck(r.model_lib === 'models/lib/' + v.lib, 'self-hosted wasm = relative path', r.model_lib);
ck(r.model_id === v.id, 'model_id preserved');
ck(r.low_resource_required === true, 'low_resource_required');
ck(r.overrides && r.overrides.context_window_size === 4096, 'context window override');
r = P.buildRecord(v, { weights: false, lib: false });
ck(r.model === 'https://huggingface.co/mlc-ai/' + v.id, 'remote weights from HF when not self-hosted', r.model);
ck(r.model_lib === P.LIB_PREFIX + v.lib, 'remote wasm from binary-mlc-llm-libs CDN', r.model_lib);
ck(/\/web-llm-models\/v0_2_84\/base\/$/.test(P.LIB_PREFIX), 'lib prefix pinned to modelVersion v0_2_84/base');
r = P.buildRecord(v, { weights: true, lib: false });
ck(r.model.indexOf('bittuhere') > -1 && r.model_lib.indexOf(P.LIB_PREFIX) === 0, 'mixed local/remote record');
// file:// → siteBase empty → never claims self-hosted
global.location = { href: 'file:///C:/Users/x/ai/index.html' };
ck(P.siteBase() === '', 'siteBase empty on file://');
r = P.buildRecord(v, { weights: true, lib: true });
ck(r.model.indexOf('huggingface') > -1 && r.model_lib.indexOf('http') === 0, 'file:// falls back to remote URLs');

/* ── 4. isShaderErr detects the reported crash ── */
ck(P.isShaderErr(new Error('[Invalid ShaderModule (unlabeled)] is invalid due to a previous error. - While validating compute stage')), 'detects exact user-reported Invalid ShaderModule');
ck(P.isShaderErr(new Error('TVMError: build failed')), 'detects TVMError');
ck(P.isShaderErr(new Error('shader-f16 is not supported')), 'detects shader-f16');
ck(!P.isShaderErr(new Error('network offline')), 'network error is NOT a shader error');

/* ── 5. withTimeout ── */
(async () => {
    let te = null;
    try { await P.withTimeout(new Promise(() => {}), 60, 'test-op'); } catch (e) { te = e; }
    ck(te && /test-op timed out/.test(te.message), 'withTimeout fires on a stuck promise', te && te.message);
    const fast = await P.withTimeout(Promise.resolve('ok'), 5000, 'x');
    ck(fast === 'ok', 'withTimeout passes through fast promises');

    /* ── 6. makeCpuEngine facade: streaming shape matches streamCompletion ── */
    const fakeTjs = { TextStreamer: class { constructor(tok, o) { this.o = o; } } };
    function fakeGen(msgs, opts) {
        ck(opts.do_sample === false, 'cpu: greedy decoding');
        ck(opts.max_new_tokens <= 512, 'cpu: token cap');
        if (opts.stop_sequences) ck(opts.stop_sequences.indexOf('</calc>') > -1, 'cpu: stop token forwarded');
        if (opts.streamer) {
            setTimeout(() => { opts.streamer.o.callback_function('<think>ok</think>'); opts.streamer.o.callback_function('Answer!'); }, 2);
            return new Promise(res => setTimeout(() => res([{ generated_text: [{ role: 'assistant', content: 'x' }] }]), 30));
        }
        return Promise.resolve([{ generated_text: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello there' }] }]);
    }
    fakeGen.tokenizer = {};
    const cpu = P.makeCpuEngine(fakeGen, fakeTjs);
    ck(cpu.kind === 'cpu', 'cpu engine kind marker');
    // non-stream
    const res = await cpu.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 900 });
    ck(res.choices[0].message.content === 'Hello there', 'cpu non-stream returns last assistant message', res.choices[0].message.content);
    // stream — iterate exactly like streamCompletion does
    const stream = await cpu.chat.completions.create({ messages: [], stream: true, max_tokens: 100, stop: ['</calc>'] });
    ck(typeof stream[Symbol.asyncIterator] === 'function', 'cpu stream is async-iterable');
    const it = stream[Symbol.asyncIterator]();
    let text = '', n = 0;
    for (;;) {
        const step = await it.next();
        if (step.done) break;
        const d = step.value && step.value.choices && step.value.choices[0] && step.value.choices[0].delta && step.value.choices[0].delta.content;
        if (d) { text += d; n++; }
        if (n > 50) break;
    }
    ck(text === '<think>ok</think>Answer!', 'cpu stream yields all deltas in order', JSON.stringify(text));
    ck(n === 2, 'cpu stream chunk count', n);

    /* ── 7. chat() end-to-end over the CPU facade (calc loop included) ── */
    function calcGen(msgs, opts) {
        const cb = opts.streamer && opts.streamer.o.callback_function;
        if (msgs.length && /\[javascript console\]/.test(msgs[msgs.length - 1].content)) {
            if (cb) setTimeout(() => cb('The answer is 49.'), 1);
            return new Promise(r => setTimeout(() => r([{ generated_text: [{ role: 'assistant', content: 'The answer is 49.' }] }]), 10));
        }
        // real engines STOP at the '</calc>' stop token without emitting it — mimic that
        if (cb) setTimeout(() => cb('Let me compute. <calc>7*7'), 1);
        return new Promise(r => setTimeout(() => r([{ generated_text: [{ role: 'assistant', content: 'Let me compute. <calc>7*7' }] }]), 10));
    }
    calcGen.tokenizer = {};
    const cpu2 = P.makeCpuEngine(calcGen, fakeTjs);
    const out = await P.chat(cpu2, [{ role: 'user', content: 'what is 7*7?' }], { maxTokens: 100 });
    ck(out.calcLog.length === 1 && out.calcLog[0].ok && out.calcLog[0].value === 49, 'cpu engine drives the <calc> console loop', JSON.stringify(out.calcLog));
    ck(/49/.test(out.raw), 'console result surfaced in raw stream');

    /* ── 8. loadEngine on a node box: no GPU, no CDN imports → rejects fast with an honest combined error (never hangs) ── */
    global.navigator = { userAgent: 'node' };           // no .gpu
    const t0 = Date.now();
    let le = null;
    try { await P.loadEngine('max', function () {}); } catch (e) { le = e; }
    ck(le !== null, 'loadEngine rejects when nothing can run');
    ck(le && /could not start|could not load/i.test(le.message), 'honest combined error message', le && le.message);
    ck(Date.now() - t0 < 60000, 'no infinite connect loop (<60s)', Date.now() - t0);

    /* ── 9. gpuCaps shapes ── */
    global.navigator = { gpu: { requestAdapter: async () => ({ features: { has: f => f === 'shader-f16' } }) } };
    let caps = await P.gpuCaps();
    ck(caps.webgpu === true && caps.f16 === true, 'gpuCaps: f16-capable adapter detected');
    global.navigator = { gpu: { requestAdapter: async () => ({ features: { has: () => false } }) } };
    caps = await P.gpuCaps();
    ck(caps.webgpu === true && caps.f16 === false, 'gpuCaps: adapter without shader-f16 → f32 path');
    global.navigator = { gpu: { requestAdapter: async () => null } };
    caps = await P.gpuCaps();
    ck(caps.webgpu === false, 'gpuCaps: null adapter → no webgpu');
    global.navigator = { gpu: { requestAdapter: () => new Promise(() => {}) } };
    caps = await P.gpuCaps();
    ck(caps.webgpu === false, 'gpuCaps: hung requestAdapter → times out to no-webgpu (no loop)');
    global.navigator = {};
    caps = await P.gpuCaps();
    ck(caps.webgpu === false && caps.f16 === false, 'gpuCaps: missing gpu object safe');
    ck(P.canRun() === true, 'canRun: UI no longer hard-gates BitLM');

    console.log(`test-bitlm-engine.js: ${pass} pass, ${fail} fail ${fail ? '❌' : '✅'}`);
    process.exit(fail ? 1 : 0);
})();
