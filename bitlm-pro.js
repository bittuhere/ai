/* bitlm-pro.js — BitLM Pro: browser-native large language AI for BitBot v16.
 * Runs open-weight LLMs FULLY IN THE BROWSER via WebLLM (WebGPU) — no server,
 * no API keys, free forever. All models are REBRANDED as BitLM (identity:
 * BitLM, developer Anurag — base models are never revealed).
 * HARD LIMIT set by the developer: every model UNDER 500M (50 cr) parameters.
 *
 * Features:
 *  - model catalog (f32 COMPATIBLE + f16 fast editions) with self-hosted
 *    models/ detection, vendored engine bundle + CDN fallbacks, 1-second GPU
 *    pre-flight (shader-f16 probe) and a CPU (ONNX/WASM) fallback engine
 *  - <calc>EXPRESSION</calc> javascript-console tool loop (like big AIs' python)
 *    with a hardened whitelist evaluator (safeCalc)
 *  - <think>…</think> chain-of-thought stream parser (parseAll)
 *  - debrand() identity filter  · buildSystem() mindset prompt
 *  - retrieveFacts(): grounds BitLM in BitBot's own 347-intent knowledge base
 *  - looksPureMath()/parseChoice()/isProCommand(): routing helpers
 * Pure logic works in Node for testing (module.exports); engines are imported
 * ONLY inside loadEngine()/loadCpuEngine(), so tests never touch a CDN. */
(function (root) {
    'use strict';

    /* ── model catalog — ALL UNDER 500M PARAMS (developer's hard limit) ──────
     * v18: every model ships in TWO compiled editions —
     *   f32 = COMPATIBLE edition (pure 32-bit shaders — runs on virtually every
     *         WebGPU adapter; this is the default now)
     *   f16 = fast edition (needs the optional 'shader-f16' GPU feature; on some
     *         drivers it crashes with 'Invalid ShaderModule' — the v18 fix)
     * loadEngine() probes the GPU (~1 s), tries f32 first, then f16 only on
     * capable GPUs, and finally drops to a CPU engine (WASM) so BitLM runs even
     * with no WebGPU at all. Weights + wasm libs can be SELF-HOSTED under
     * models/ on the same site (see MODEL-HOSTING.md) — auto-detected at load,
     * otherwise pulled from the public CDNs. */
    var MODELS = {
        lite: { id: 'SmolLM2-360M-Instruct-q4f32_1-MLC', name: 'BitLM Lite', paramsM: 360, dlMB: 215 },
        max:  { id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', name: 'BitLM Max',  paramsM: 494, dlMB: 295 }
    };
    var VARIANTS = {
        max: [
            { id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', dir: 'bitlm-max',     lib: 'Qwen2-0.5B-Instruct-q4f32_1_cs1k-webgpu.wasm',   f16: false, dlMB: 295 },
            { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', dir: 'bitlm-max-f16', lib: 'Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',   f16: true,  dlMB: 265 }
        ],
        lite: [
            { id: 'SmolLM2-360M-Instruct-q4f32_1-MLC', dir: 'bitlm-lite',     lib: 'SmolLM2-360M-Instruct-q4f32_1_cs1k-webgpu.wasm', f16: false, dlMB: 215 },
            { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', dir: 'bitlm-lite-f16', lib: 'SmolLM2-360M-Instruct-q4f16_1_cs1k-webgpu.wasm', f16: true,  dlMB: 210 }
        ]
    };
    var LIB_PREFIX = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/';
    var ENGINE_SRCS = [
        'vendor/web-llm.js',                                    // self-hosted engine bundle — no CDN stall
        'https://esm.run/@mlc-ai/web-llm@0.2.85',
        'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm'
    ];
    var TJS_SRCS = [                                           // CPU-mode engine (ONNX Runtime WASM)
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/+esm',
        'https://esm.run/@huggingface/transformers@3.7.5'
    ];
    var CPU_MODEL = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
    var CDN = 'https://esm.run/@mlc-ai/web-llm@0.2.85';        // kept for compatibility

    function webgpuOK() {
        return !!(root.navigator && root.navigator.gpu);
    }
    /* v18: BitLM always HAS a path (GPU f32 → GPU f16 → CPU). Only a failed
       script load blocks it, so the UI no longer hard-gates on WebGPU. */
    function canRun() { return true; }

    function withTimeout(p, ms, label) {
        return Promise.race([
            p,
            new Promise(function (_, rej) {
                setTimeout(function () { rej(new Error((label || 'operation') + ' timed out after ' + Math.round(ms / 1000) + 's')); }, ms);
            })
        ]);
    }
    function siteBase() {
        try {
            var h = String((root.location && root.location.href) || '');
            if (!/^https?:/.test(h)) return '';                  // file:// → no self-host probing
            return h.replace(/[^/]*$/, '');
        } catch (e) { return ''; }
    }
    async function probeUrl(url, ms) {
        try {
            if (!url || typeof fetch !== 'function') return false;
            var r = await withTimeout(fetch(url, { method: 'GET', cache: 'no-store' }), ms || 8000, 'probe');
            return !!(r && r.ok);
        } catch (e) { return false; }
    }
    async function importFirst(srcs, onStep, ms) {
        ms = ms || 25000;
        var lastErr = null;
        for (var i = 0; i < srcs.length; i++) {
            try {
                if (onStep) onStep(srcs[i].indexOf('http') === 0
                    ? 'Connecting to engine source ' + (i + 1) + ' of ' + srcs.length + '…'
                    : 'Loading bundled engine…');
                return await withTimeout(import(srcs[i]), ms, 'engine import');
            } catch (e) { lastErr = e; }
        }
        throw new Error('could not load the BitLM engine from any source (' +
            String((lastErr && lastErr.message) || lastErr).slice(0, 120) + ')');
    }
    function engineSrcs() {
        var base = siteBase();
        return ENGINE_SRCS.map(function (s) {
            return s.indexOf('http') === 0 ? s : (base ? base + s : s);
        });
    }
    /* 1-second GPU pre-flight: does an adapter exist, and does it expose the
       optional 'shader-f16' feature? Decides the variant order BEFORE any
       multi-hundred-MB download — no more crash-after-400MB. */
    async function gpuCaps() {
        try {
            var nav = root.navigator;
            if (!(nav && nav.gpu && nav.gpu.requestAdapter)) return { webgpu: false, f16: false };
            var adapter = await withTimeout(nav.gpu.requestAdapter(), 8000, 'GPU detection');
            if (!adapter) return { webgpu: false, f16: false };
            var f16 = false;
            try { f16 = !!(adapter.features && adapter.features.has && adapter.features.has('shader-f16')); } catch (e) {}
            return { webgpu: true, f16: f16 };
        } catch (e) { return { webgpu: false, f16: false }; }
    }
    function planVariants(key, caps) {
        var vs = (VARIANTS[key] || VARIANTS.max).slice();        // f32 first = compatibility first
        if (!caps || !caps.f16) vs = vs.filter(function (v) { return !v.f16; });
        return vs;
    }
    /* Pure record builder — self-hosted paths when the files exist locally,
       public CDN URLs otherwise. Local weight dirs live at
       models/<dir>/resolve/main/ (the engine appends nothing then). */
    function buildRecord(v, local) {
        var base = siteBase();
        var selfW = !!(local && local.weights && base);
        var selfL = !!(local && local.lib && base);
        return {
            model: selfW ? base + 'models/' + v.dir + '/resolve/main/' : 'https://huggingface.co/mlc-ai/' + v.id,
            model_id: v.id,
            model_lib: selfL ? 'models/lib/' + v.lib : LIB_PREFIX + v.lib,
            low_resource_required: true,
            overrides: { context_window_size: 4096 }
        };
    }
    function isShaderErr(e) {
        var s = String((e && (e.message || e.name)) || e || '').toLowerCase();
        return /shadermodule|shader-f16|shader f16|tvmerror|wgsl|webgpu|device.*lost|out of memory|no adapter|gpu/.test(s);
    }

    /* ── CPU engine (no WebGPU needed): ONNX Runtime WASM facade shaped
       exactly like the WebGPU engine (chat.completions.create + async
       iterator) so chat()/streamCompletion work unchanged. ─────────────── */
    function makeCpuEngine(gen, tjs) {
        function genOpts(params, streamer) {
            var o = {
                max_new_tokens: Math.min((params && params.max_tokens) || 256, 512),
                do_sample: false
            };
            var stops = (params && params.stop) || [];
            if (stops.length) { try { o.stop_sequences = stops.map(String); } catch (e) {} }
            if (streamer) o.streamer = streamer;
            return o;
        }
        function lastText(out) {
            var gt = out && out[0] && out[0].generated_text;
            if (Array.isArray(gt) && gt.length) return String(gt[gt.length - 1].content || '');
            return String(gt == null ? '' : gt);
        }
        return {
            kind: 'cpu',
            chat: {
                completions: {
                    create: function (params) {
                        var msgs = (params && params.messages) || [];
                        if (!params || !params.stream) {
                            return gen(msgs, genOpts(params, null)).then(function (out) {
                                return { choices: [{ message: { role: 'assistant', content: lastText(out) } }] };
                            });
                        }
                        var queue = [], done = false, err = null, waiter = null;
                        function kick() { if (waiter) { var w = waiter; waiter = null; w(); } }
                        var streamer = new tjs.TextStreamer(gen.tokenizer, {
                            skip_prompt: true,
                            callback_function: function (t) { if (t) { queue.push(t); kick(); } }
                        });
                        gen(msgs, genOpts(params, streamer)).then(function () {
                            done = true; kick();
                        }).catch(function (e) { err = e; done = true; kick(); });
                        var it = {
                            next: function () {
                                if (queue.length) {
                                    return Promise.resolve({ done: false, value: { choices: [{ delta: { content: queue.shift() } }] } });
                                }
                                if (err) return Promise.reject(err);
                                if (done) return Promise.resolve({ done: true, value: undefined });
                                return new Promise(function (res, rej) {
                                    waiter = function () { it.next().then(res, rej); };   // re-poll when data/done lands
                                });
                            }
                        };
                        var stream = { next: it.next };
                        stream[Symbol.asyncIterator] = function () { return it; };
                        return Promise.resolve(stream);
                    }
                }
            }
        };
    }
    async function loadCpuEngine(onProgress) {
        var tjs = await importFirst(TJS_SRCS, function (t) { if (onProgress) onProgress({ progress: 0.02, text: t, dlMB: 390 }); }, 40000);
        try { tjs.env.allowLocalModels = false; tjs.env.allowRemoteModels = true; } catch (e) {}
        var files = {};
        var gen = await tjs.pipeline('text-generation', CPU_MODEL, {
            dtype: 'q4',
            device: 'wasm',
            progress_callback: function (p) {
                if (!p || !p.file || !onProgress) return;
                if (p.status === 'progress' || p.status === 'download') {
                    files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
                    var L = 0, T = 0;
                    Object.keys(files).forEach(function (k) { L += files[k].loaded; T += files[k].total; });
                    onProgress({
                        progress: T > 0 ? Math.max(0, Math.min(1, L / T)) : 0,
                        text: 'CPU mode — downloading ' + String(p.file).split('/').pop() +
                              ' (' + Math.round(L / 1048576) + ' MB of ' + Math.round(T / 1048576) + ' MB)',
                        dlMB: Math.round(T / 1048576) || 390
                    });
                }
            }
        });
        return makeCpuEngine(gen, tjs);
    }

    async function loadEngine(key, onProgress) {
        var m = MODELS[key] || MODELS.max;
        var prog = function (text, p, dlMB) {
            if (onProgress) onProgress({ progress: p == null ? 0 : p, text: debrand(text), dlMB: dlMB || m.dlMB });
        };
        var caps = await gpuCaps();
        prog(caps.webgpu
            ? 'WebGPU detected' + (caps.f16 ? ' (f16-capable)' : '') + ' — preparing ' + m.name + '…'
            : 'No WebGPU on this device — preparing ' + m.name + ' CPU mode…', 0.01);
        var lastErr = null;
        if (caps.webgpu) {
            var webllm = null;
            try {
                webllm = await importFirst(engineSrcs(), function (t) { prog(t, 0.02); });
            } catch (e) { lastErr = e; }
            if (webllm && webllm.CreateMLCEngine) {
                var plan = planVariants(key, caps);
                for (var i = 0; i < plan.length; i++) {
                    var v = plan[i];
                    try {
                        var local = {
                            weights: await probeUrl(siteBase() + 'models/' + v.dir + '/resolve/main/mlc-chat-config.json'),
                            lib: await probeUrl(siteBase() + 'models/lib/' + v.lib)
                        };
                        if (local.weights) prog('Self-hosted model files found on this site — loading locally…', 0.03, v.dlMB);
                        var rec = buildRecord(v, local);
                        var engine = await webllm.CreateMLCEngine(v.id, {
                            appConfig: { model_list: [rec] },
                            initProgressCallback: (function (vv) {
                                return function (p) {
                                    prog(String((p && p.text) || 'loading ' + m.name + '…'), (p && p.progress) || 0, vv.dlMB);
                                };
                            })(v)
                        });
                        engine.bitlmKind = 'webgpu';
                        engine.bitlmVariant = v.id;
                        engine.bitlmLocal = !!local.weights;
                        return engine;
                    } catch (e) {
                        lastErr = e;
                        if (isShaderErr(e) && i < plan.length - 1) {
                            prog('This GPU rejected the current edition — switching to the compatible edition…', 0.03);
                            continue;
                        }
                        break;                                   // → CPU fallback below
                    }
                }
            }
        }
        try {
            prog('Starting CPU engine (slower, works everywhere)…', 0.04);
            var cpu = await loadCpuEngine(function (p) { prog(p.text, p.progress, p.dlMB); });
            cpu.bitlmVariant = CPU_MODEL;
            return cpu;
        } catch (e2) {
            var msg = 'BitLM could not start on this device.';
            if (lastErr) msg += ' GPU path: ' + String(lastErr.message || lastErr).slice(0, 110) + '.';
            msg += ' CPU path: ' + String((e2 && e2.message) || e2).slice(0, 110) + '.';
            msg += ' Try a Chrome/Edge update, or use BitBot — it answers everything instantly.';
            throw new Error(msg);
        }
    }

    /* ── debrand: never leak the base model / framework / company ───────── */
    var BRAND_RES = [
        /\bqwen[\w.\-]*\b/gi, /\bllama[\w.\-]*\b/gi, /\bphi[\s\-]*3[\w.\-]*\b/gi,
        /\bgemma[\w.\-]*\b/gi, /\bsmol[\s\-]?lm[\w.\-]*\b/gi, /\bmistral[\w.\-]*\b/gi,
        /\bdeepseek[\w.\-]*\b/gi, /\bchatgpt\b/gi, /\bgpt[\s\-]*[34][\w.\-]*\b/gi,
        /\bopen\s?ai\b/gi, /\banthropic\b/gi, /\bclaude[\w.\-]*\b/gi, /\bgemini\b/gi,
        /\bmeta\s?ai\b/gi, /\balibaba[\w.\-]*\b/gi, /\bhugging\s?face\b/gi,
        /\btransformers\.js\b/gi, /\bweb\s?llm\b/gi, /\bmlc[\s\-]?ai\b/gi
    ];
    function debrand(text) {
        var s = String(text == null ? '' : text);
        BRAND_RES.forEach(function (re) { s = s.replace(re, 'BitLM'); });
        s = s.replace(/(?:BitLM[\s,.]*){2,}/g, 'BitLM ');          // collapse repeats
        return s;
    }

    /* ── safeCalc: the javascript console BitLM may use ────────────────────
     * Whitelist evaluator: numbers, + - * / % ( ) , . ^ and math functions.
     * Anything else (identifiers, strings, brackets, arrows, dots-chains) is
     * REJECTED before eval. No access to window/globals/prototypes, ever. */
    var FN = {
        sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round,
        floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max,
        pow: Math.pow, log: Math.log, log2: Math.log2, log10: Math.log10,
        exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan,
        asin: Math.asin, acos: Math.acos, atan: Math.atan, hypot: Math.hypot,
        PI: Math.PI, E: Math.E
    };
    function fmtNum(v) {
        var r = Math.round(v * 1e10) / 1e10;
        return String(r);
    }
    function safeCalc(exprRaw) {
        var disp = String(exprRaw == null ? '' : exprRaw).trim();
        if (!disp || disp.length > 300) return { ok: false, error: 'expression empty or too long' };
        var s = disp
            .replace(/×/g, '*').replace(/÷/g, '/').replace(/[\u2212\u2013\u2014]/g, '-')
            .replace(/\^/g, '**')
            .replace(/²/g, '**2').replace(/³/g, '**3')
            .replace(/√\s*\(/g, 'sqrt(')
            .replace(/√\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)')
            .replace(/\bpi\b/gi, 'PI')
            .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
        var bad = false;
        var expr = s.replace(/[A-Za-z_][A-Za-z_0-9]*/g, function (w) {
            if (Object.prototype.hasOwnProperty.call(FN, w)) return '__F.' + w;
            bad = true; return '';
        });
        if (bad) return { ok: false, error: 'only numbers, operators + - * / % ^ ( ) and math functions (sqrt, pow, min, …) are allowed' };
        // char whitelist — on the expression with whitelisted function placeholders removed
        var checkStr = expr.replace(/__F\.[A-Za-z_][A-Za-z_0-9]*/g, '0');
        if (!/^[\d\s\+\-\*\/%\(\)\.,]*$/.test(checkStr)) return { ok: false, error: 'invalid characters in expression' };
        try {
            var v = new Function('__F', '"use strict"; return (' + expr + ');')(FN);
            if (typeof v !== 'number' || !isFinite(v)) return { ok: false, error: 'result is not a finite number' };
            return { ok: true, value: v, shown: fmtNum(v), expr: disp };
        } catch (e) {
            return { ok: false, error: 'invalid expression syntax' };
        }
    }

    /* ── parseAll: idempotent stream parser for think/answer/calc ─────────
     * Handles partial tags at the stream tail (holds them back). */
    function parseAll(raw) {
        var s = String(raw == null ? '' : raw);
        var calcs = [];
        // 1) tail: LAST <calc> that never closes before end-of-stream (stop-token fired)
        var tailCalc = null;
        var om = s.match(/<calc>((?:(?!<\/calc>)[\s\S])*)$/i);
        if (om) { tailCalc = om[1].trim(); s = s.slice(0, om.index); }
        // 2) split think from answer
        var think = '', rest = s, thinkOpen = false;
        var oi = s.search(/<think>/i);
        if (oi !== -1) {
            thinkOpen = true;
            var after = s.slice(oi + 7);
            var cm = after.match(/<\/think>/i);
            if (cm) { think = after.slice(0, cm.index); rest = s.slice(0, oi) + after.slice(cm.index + cm[0].length); }
            else { think = after; rest = s.slice(0, oi); }
        }
        // 3) closed <calc>…</calc> anywhere → log + strip from both streams
        function stripCalcs(str) {
            return str.replace(/<calc>([\s\S]*?)<\/calc>/gi, function (_, e) {
                calcs.push({ expr: e.trim(), closed: true }); return ' ';
            });
        }
        think = stripCalcs(think);
        rest = stripCalcs(rest);
        // 4) hold back partial tags at the very tail of the answer stream
        rest = rest.replace(/<(?:\/)?t(?:h(?:i(?:n(?:k(?:>)?)?)?)?)?$/i, '');
        rest = rest.replace(/<c(?:a(?:l(?:c(?:>)?)?)?)?$/i, '');
        return { think: think.trim(), answer: rest.trim(), calcs: calcs, tailCalc: tailCalc, thinkOpen: thinkOpen, hadOpenCalc: tailCalc !== null };
    }

    /* ── system prompt: the BitLM mindset ─────────────────────────────────── */
    var SITE_FACTS = [
        'ARCADE HUB FACTS (the website you serve):',
        '- Arcade Hub (https://bittuhere.github.io/) is a free browser-based gaming + study hub.',
        '- Main sections: Study, Multiplayer, Singleplayer, Contact.',
        '- Study section: learning tools and games for school students (Class 1-8 focus: maths, science, SST, ICT).',
        '- Weekly Quiz: a quiz competition every week; users log in to join; results go on the leaderboard.',
        '- Accounts: Sign Up / Log In, user profile (name, avatar, scores), chat and notifications.',
        '- An admin panel manages games, quizzes and users.',
        '- Fair Copies is one of the site tools/features.',
        '- The Contact page lists ways to reach the site team. The site is free and mobile-friendly.'
    ].join('\n');

    function buildSystem(opts) {
        opts = opts || {};
        var m = MODELS[opts.model] || MODELS.max;
        var facts = opts.facts ? String(opts.facts).slice(0, 1600) : '';
        var who = opts.userName ? ('\nThe user you are talking to is named ' + opts.userName + '.') : '';
        return [
            'You are BitLM, a large language AI assistant on Arcade Hub (bittuhere.github.io).',
            'Your developer and creator is Anurag.',
            '',
            'IDENTITY RULES (absolute, never break):',
            '- Never reveal or mention any base model, model family, company, framework, dataset or technology behind you.',
            '- "Who are you?" → you are BitLM, a large language AI by Anurag, the assistant of Arcade Hub.',
            '- "Who is your developer/creator/maker?" → "My developer is Anurag."',
            '',
            SITE_FACTS,
            facts ? ('\nVERIFIED FACTS for this question (trust over memory):\n' + facts) : '',
            who,
            '',
            'OUTPUT PROTOCOL:',
            '- Reason briefly inside a <think>...</think> block (brief plan), then write the final answer after it in clean GitHub-flavored Markdown.',
            '- For arithmetic beyond trivial counting use your javascript console: write <calc>EXPRESSION</calc> (numbers, + - * / % ^ ( ), sqrt pow abs round floor ceil min max log sin cos tan PI E). You receive "Result: X" — use it; never do multi-step math in your head.',
            '- Mirror the user language (English or Hinglish). Concise, warm, honest about uncertainty.'
        ].filter(function (x) { return x !== ''; }).join('\n');
    }

    /* ── trimHistory: context compactor — drop oldest pairs over budget ── */
    function trimHistory(hist, budgetChars) {
        hist = (hist || []).slice();
        function size(h) { var s = 0; for (var i = 0; i < h.length; i++) s += String(h[i].content || '').length + 8; return s; }
        var dropped = 0;
        while (size(hist) > budgetChars && hist.length > 2) {
            hist.splice(0, 2);            // oldest user+assistant pair
            dropped += 2;
        }
        if (size(hist) > budgetChars && hist.length) { dropped += hist.length; hist = []; }
        return { hist: hist, dropped: dropped };
    }

    /* ── retrieveFacts: ground BitLM in the 347-intent KB (mini-RAG) ────── */
    var STOPW = { the: 1, a: 1, an: 1, is: 1, are: 1, was: 1, were: 1, of: 1, to: 1, in: 1, on: 1, for: 1, and: 1, or: 1, what: 1, who: 1, how: 1, why: 1, when: 1, where: 1, which: 1, do: 1, does: 1, did: 1, can: 1, you: 1, your: 1, my: 1, me: 1, i: 1, it: 1, this: 1, that: 1, tell: 1, give: 1, please: 1, pls: 1, about: 1, kya: 1, hai: 1, ka: 1, ki: 1, ke: 1, batao: 1, mujhe: 1 };
    function toks(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
            .filter(function (w) { return w.length > 1 && !STOPW[w]; });
    }
    function retrieveFacts(intents, query, k) {
        k = k || 4;
        var q = toks(query);
        if (!q || !q.length || !intents || !intents.length) return '';
        var qset = {}; q.forEach(function (w) { qset[w] = 1; });
        var scored = [];
        for (var i = 0; i < intents.length; i++) {
            var it = intents[i], best = 0;
            var pats = it.patterns || [];
            for (var p = 0; p < pats.length && p < 40; p++) {
                var pt = toks(pats[p]);
                if (!pt.length) continue;
                var hit = 0;
                for (var w = 0; w < pt.length; w++) if (qset[pt[w]]) hit++;
                var sc = hit / Math.sqrt(pt.length);
                if (sc > best) best = sc;
            }
            if (best > 0.7) scored.push({ sc: best, it: it });
        }
        scored.sort(function (a, b) { return b.sc - a.sc; });
        var out = [], total = 0;
        for (var s = 0; s < scored.length && s < k; s++) {
            var resp = (scored[s].it.responses && scored[s].it.responses[0]) || '';
            resp = String(resp).replace(/\s+/g, ' ').slice(0, 220);
            if (!resp) continue;
            var line = '- ' + resp;
            if (total + line.length > 1400) break;
            out.push(line); total += line.length;
        }
        return out.join('\n');
    }

    /* ── routing helpers ────────────────────────────────────────────────────*/
    function looksPureMath(t) {
        t = String(t || '').trim().toLowerCase();
        if (!t || t.length > 120) return false;
        if (/^\s*(?:what\s+is|whats|calculate|compute|evaluate|solve|simplify)?\s*[-+*/^().\d\s%²³√×÷]+\s*\?*$/.test(t) && /\d/.test(t) && /[-+*/^%×÷√]|\bdivid|\btimes\b/.test(t)) return true;
        if (/\b(?:table|pahada)\s+of\s+\d/.test(t) || /\b\d{1,15}\s*(?:ka|ki|ker)?\s*(?:table|pahada)\b/.test(t)) return true;
        if (/\b(?:expand|factorise|factorize|simplify)\b/.test(t) && /[\^²³()]|\bx\b|\by\b/.test(t)) return true;
        if (/=/.test(t) && /\d/.test(t) && /\bx\b|\by\b|\d/.test(t) && !/\b(?:who|when|where|why|which|name|capital|full form|meaning)\b/.test(t)) return true;
        if (/^\s*(?:lcm|hcf|gcd)\b/.test(t) && /\d/.test(t)) return true;
        if ((/\b(?:square root|cube root|factorial)\b/.test(t) || /\d\s*!\s*\??$/.test(t)) && /\d/.test(t) && t.length < 60) return true;
        if (/^\s*(?:what\s+is\s+)?\d+(?:\.\d+)?\s*(?:%|percent)\s*of\b/.test(t)) return true;
        return false;
    }

    function parseChoice(t) {
        t = String(t || '').trim().toLowerCase();
        if (/^\s*(?:a\b|1\b|one\b|bitlm\b|the\s+big|big\s+(?:one|model)|large|bada|badi)/.test(t)) return 'bitlm';
        if (/^\s*(?:b\b|2\b|two\b|bitbot\b|mini|small|chhota|chhoti|the\s+mini)/.test(t)) return 'bitbot';
        return null;
    }

    function isProCommand(t) {
        t = String(t || '').trim().toLowerCase();
        var m;
        if ((m = t.match(/^(?:switch|change|use|set|come|ja)?\s*(?:to\s+|back\s+to\s+|model\s+)?(bitlm|bitbot)\s*(?:mode|model|on)?$/))) {
            if (/^(?:switch|change|use|set|come|ja)\b/.test(t) || /(?:mode|model)$/.test(t) || /^(bitlm|bitbot)$/.test(t)) return { type: 'switch', to: m[1] };
        }
        if (/^(?:which|what)\s+(?:model|ai|assistant)/.test(t) || /^(?:change|switch)\s+model\b/.test(t) || /^model\s+(?:select|choose)/.test(t)) return { type: 'ask' };
        if ((m = t.match(/^bitlm\s+(lite|max)$/)) || (m = t.match(/^(?:use|switch\s+to)\s+(lite|max)(?:\s+model)?$/))) return { type: 'size', size: m[1] };
        if (/^(?:load|reload|download|warm)\s+(?:the\s+)?(?:bitlm\s+)?model$/.test(t)) return { type: 'load' };
        return null;
    }

    /* ── chat: streaming completion + <calc> tool loop ──────────────────────*/
    function streamCompletion(engine, msgs, opts, onDelta) {
        var params = {
            messages: msgs, stream: true,
            temperature: opts.temperature == null ? 0.7 : opts.temperature,
            top_p: 0.9,
            max_tokens: opts.maxTokens || 700,
            stop: ['</calc>']
        };
        return engine.chat.completions.create(params).then(function (stream) {
            var text = '';
            var pump = function (it) {
                return it.next().then(function (r) {
                    if (r.done) return text;
                    var d = r.value && r.value.choices && r.value.choices[0] && r.value.choices[0].delta && r.value.choices[0].delta.content;
                    if (d) { text += d; if (onDelta) onDelta(d); }
                    return pump(it);
                });
            };
            var it = stream[Symbol.asyncIterator] ? stream[Symbol.asyncIterator]() : null;
            if (it) return pump(it);
            // fallback: non-stream object with .text? (defensive)
            return text;
        });
    }

    async function chat(engine, messages, opts) {
        opts = opts || {};
        var onChunk = opts.onChunk || function () {};
        var maxLoops = opts.maxCalcLoops == null ? 3 : opts.maxCalcLoops;
        var msgs = messages.slice();
        var raw = '', calcLog = [], loops = 0;
        for (;;) {
            var text = await streamCompletion(engine, msgs, opts, function (d) { raw += d; onChunk(parseAll(raw), raw); });
            var p = parseAll(raw);
            if (p.tailCalc !== null && loops < maxLoops) {
                var res = safeCalc(p.tailCalc);
                var shown = res.ok ? res.shown : 'ERROR: ' + res.error;
                calcLog.push({ expr: p.tailCalc, ok: res.ok, value: res.ok ? res.value : null, error: res.ok ? null : res.error });
                msgs.push({ role: 'assistant', content: text + '</calc>' });   // restore the stop-token so history stays clean
                msgs.push({
                    role: 'user',
                    content: '[javascript console] ' + p.tailCalc + ' = ' + shown +
                        ' — now continue and finish your answer using this result. Do not re-calculate it.'
                });
                loops++;
                // UI raw: close the calc tag and show the console result inline (inside think, normally)
                raw += '</calc>=[console: ' + shown + ']\n';
                onChunk(parseAll(raw), raw);
                continue;
            }
            break;
        }
        var fin = parseAll(raw);
        return { think: fin.think, answer: debrand(fin.answer), calcLog: calcLog, loops: loops, raw: raw };
    }

    var BitLMPro = {
        MODELS: MODELS, VARIANTS: VARIANTS, CDN: CDN,
        LIB_PREFIX: LIB_PREFIX, ENGINE_SRCS: ENGINE_SRCS, TJS_SRCS: TJS_SRCS, CPU_MODEL: CPU_MODEL,
        webgpuOK: webgpuOK, canRun: canRun, loadEngine: loadEngine,
        gpuCaps: gpuCaps, planVariants: planVariants, buildRecord: buildRecord,
        siteBase: siteBase, isShaderErr: isShaderErr, makeCpuEngine: makeCpuEngine,
        withTimeout: withTimeout,
        debrand: debrand, safeCalc: safeCalc, fmtNum: fmtNum, parseAll: parseAll,
        buildSystem: buildSystem, retrieveFacts: retrieveFacts, trimHistory: trimHistory,
        looksPureMath: looksPureMath, parseChoice: parseChoice, isProCommand: isProCommand,
        chat: chat, SITE_FACTS: SITE_FACTS
    };
    root.BitLMPro = BitLMPro;
    if (typeof module !== 'undefined' && module.exports) module.exports = BitLMPro;
})(typeof window !== 'undefined' ? window : globalThis);
