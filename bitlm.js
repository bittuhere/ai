/* ═══════════════════════════════════════════════════════════════════════════
   bitlm.js — BitBot's FROM-SCRATCH generative language model, inference side.
   A real word-by-word transformer (causal self-attention, LayerNorm, GELU,
   tied embeddings) implemented in pure vanilla JS with a KV cache — no
   libraries, no server, works on file://.  Weights: bitlm-weights.js (int8).
   Trained from zero on BitBot's own corpus (lm/train-lm.py).
   API:  BitLM.ready()                → bool
         BitLM.generate(text, opts)   → dynamic answer string ('Q:…A:' format)
         BitLM.complete(tokens, opts) → raw continuation
         BitLM.info()                 → {params, step, val, V, d, layers}
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    var META = null, INV = null, T = null;   // bound lazily — load order doesn't matter
    var W = null;                       // dequantized Float32Arrays, lazy
    var w2i = null;                     // word → id map, lazy

    function b64ToInt8(b64) {
        if (typeof Buffer !== 'undefined') {
            var buf = Buffer.from(b64, 'base64');
            return new Int8Array(buf.buffer, buf.byteOffset, buf.length);
        }
        var bin = atob(b64), n = bin.length, arr = new Int8Array(n);
        for (var i = 0; i < n; i++) arr[i] = bin.charCodeAt(i) < 128 ? bin.charCodeAt(i) : bin.charCodeAt(i) - 256;
        return arr;
    }
    function deq(rec) {
        var q = b64ToInt8(rec.b), out = new Float32Array(q.length), s = rec.s;
        for (var i = 0; i < q.length; i++) out[i] = q[i] * s;
        return out;
    }
    function ensure() {
        if (W) return true;
        META = root.BITLM_META || null; INV = root.BITLM_INV || null; T = root.BITLM_T || null;
        if (!META || !INV || !T) return false;
        W = {};
        for (var k in T) if (Object.prototype.hasOwnProperty.call(T, k)) W[k] = deq(T[k]);
        w2i = {};
        for (var i = 0; i < INV.length; i++) w2i[INV[i]] = i;
        return true;
    }

    /* ── tiny vector ops ─────────────────────────────────────────────── */
    function layernorm(x, w, b, d) {
        var mean = 0, i;
        for (i = 0; i < d; i++) mean += x[i];
        mean /= d;
        var v = 0;
        for (i = 0; i < d; i++) { var t = x[i] - mean; v += t * t; }
        v = 1 / Math.sqrt(v / d + 1e-5);
        var out = new Float32Array(d);
        for (i = 0; i < d; i++) out[i] = (x[i] - mean) * v * w[i] + b[i];
        return out;
    }
    function gelu(z) {                                       // exact-erf approximation (A&S 7.1.26)
        if (z < -6) return 0;
        var x = z / Math.SQRT2, s = x < 0 ? -1 : 1, t = Math.abs(x);
        var p = 0.3275911, a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        var u = 1 / (1 + p * t);
        var erf = s * (1 - (((((a5 * u + a4) * u) + a3) * u + a2) * u + a1) * u * Math.exp(-t * t));
        return 0.5 * z * (1 + erf);
    }

    /* ── KV-cached forward for ONE token at position pos ─────────────── */
    function forward(id, pos, cache) {
        var d = META.d, H = META.heads, dh = d / H, L = META.layers;
        var x = new Float32Array(d), i, l, h, j;
        var tok = W['tok.weight'], pw = W['pos.weight'];
        for (i = 0; i < d; i++) x[i] = tok[id * d + i] + (pos < META.seq ? pw[pos * d + i] : 0);
        var scale = 1 / Math.sqrt(dh);
        for (l = 0; l < L; l++) {
            var p = 'blocks.' + l + '.';
            var h1 = layernorm(x, W[p + 'ln1.weight'], W[p + 'ln1.bias'], d);
            var ip = W[p + 'attn.in_proj_weight'], ib = W[p + 'attn.in_proj_bias'];
            /* q,k,v = ip · h1  (ip is [3d, d], row-major: q rows first) */
            var q = new Float32Array(d), kk = new Float32Array(d), vv = new Float32Array(d);
            for (i = 0; i < d; i++) {
                var row = i * d, acc0 = 0, acc1 = 0, acc2 = 0;
                for (j = 0; j < d; j++) acc0 += ip[row + j] * h1[j];
                var rowk = (d + i) * d, rowv = (2 * d + i) * d;
                for (j = 0; j < d; j++) { acc1 += ip[rowk + j] * h1[j]; acc2 += ip[rowv + j] * h1[j]; }
                q[i] = acc0 + ib[i]; kk[i] = acc1 + ib[d + i]; vv[i] = acc2 + ib[2 * d + i];
            }
            var ck = cache.k[l], cv = cache.v[l];
            ck.push(kk); cv.push(vv);
            var T = ck.length;
            var attnOut = new Float32Array(d);
            for (h = 0; h < H; h++) {
                var off = h * dh;
                var scores = new Float32Array(T), mx = -1e30, sum = 0;
                for (var t = 0; t < T; t++) {
                    var kt = ck[t], s = 0;
                    for (j = 0; j < dh; j++) s += q[off + j] * kt[off + j];
                    s *= scale; scores[t] = s; if (s > mx) mx = s;
                }
                for (t = 0; t < T; t++) { scores[t] = Math.exp(scores[t] - mx); sum += scores[t]; }
                var inv2 = 1 / sum;
                for (t = 0; t < T; t++) {
                    var pr = scores[t] * inv2, vt = cv[t];
                    if (pr < 1e-6) continue;
                    for (j = 0; j < dh; j++) attnOut[off + j] += pr * vt[off + j];
                }
            }
            var ow = W[p + 'attn.out_proj.weight'], ob = W[p + 'attn.out_proj.bias'];
            for (i = 0; i < d; i++) {
                var acc = ob[i], row2 = i * d;
                for (j = 0; j < d; j++) acc += ow[row2 + j] * attnOut[j];
                x[i] += acc;
            }
            var h2 = layernorm(x, W[p + 'ln2.weight'], W[p + 'ln2.bias'], d);
            var f1w = W[p + 'ff.0.weight'], f1b = W[p + 'ff.0.bias'], d4 = 4 * d;
            var f = new Float32Array(d4);
            for (i = 0; i < d4; i++) {
                var a2 = f1b[i], r3 = i * d;
                for (j = 0; j < d; j++) a2 += f1w[r3 + j] * h2[j];
                f[i] = gelu(a2);
            }
            var f2w = W[p + 'ff.2.weight'], f2b = W[p + 'ff.2.bias'];
            for (i = 0; i < d; i++) {
                var a3 = f2b[i], r4 = i * d4;
                for (j = 0; j < d4; j++) a3 += f2w[r4 + j] * f[j];
                x[i] += a3;
            }
        }
        return layernorm(x, W['lnf.weight'], W['lnf.bias'], d);
    }

    function logitsFrom(h) {                                 // tied head: logits = tokEmb · h
        var V = META.V, d = META.d, tok = W['tok.weight'], out = new Float32Array(V);
        for (var i = 0; i < V; i++) {
            var s = 0, row = i * d;
            for (var j = 0; j < d; j++) s += tok[row + j] * h[j];
            out[i] = s;
        }
        return out;
    }

    /* ── sampling ────────────────────────────────────────────────────── */
    function makeRng(seed) {
        if (seed === undefined || seed === null) return Math.random;
        var st = seed >>> 0 || 1;
        return function () { st ^= st << 13; st >>>= 0; st ^= st >> 17; st ^= st << 5; st >>>= 0; return st / 4294967296; };
    }
    function sample(logits, opt, rng, seen) {
        var V = logits.length, k = opt.topK || 8, temp = opt.temp || 0.85;
        logits[0] = -1e30; logits[1] = -1e30;                 // never emit <pad>/<unk>
        var idx = new Int32Array(V), i;
        for (i = 0; i < V; i++) idx[i] = i;
        /* partial selection of top-k */
        for (var a = 0; a < k; a++) {
            var best = a;
            for (var b = a + 1; b < V; b++) if (logits[idx[b]] > logits[idx[best]]) best = b;
            var tmp = idx[a]; idx[a] = idx[best]; idx[best] = tmp;
        }
        var mx = -1e30, sum = 0, pr = new Float32Array(k);
        for (i = 0; i < k; i++) {
            var lg = logits[idx[i]] / temp;
            if (seen && seen[idx[i]]) lg -= opt.repPen || 1.2;   // repetition penalty (additive in log space)
            pr[i] = lg; if (lg > mx) mx = lg;
        }
        for (i = 0; i < k; i++) { pr[i] = Math.exp(pr[i] - mx); sum += pr[i]; }
        var r = rng() * sum, acc = 0;
        for (i = 0; i < k; i++) { acc += pr[i]; if (r <= acc) return idx[i]; }
        return idx[k - 1];
    }

    function tokenize(text) {
        if (!ensure()) return [];
        var ws = String(text).toLowerCase().split(/\s+/), out = [];
        for (var i = 0; i < ws.length; i++) {
            if (!ws[i]) continue;
            var id = w2i[ws[i]];
            out.push(id === undefined ? 1 : id);               // 1 = <unk>
        }
        return out;
    }

    function complete(tokens, opt) {
        if (!ensure()) return '';
        opt = opt || {};
        var max = opt.max || 48, rng = makeRng(opt.seed);
        var cache = { k: [], v: [] };
        for (var l = 0; l < META.layers; l++) { cache.k.push([]); cache.v.push([]); }
        var ctx = tokens.slice(-(META.seq - max - 2));
        var h = null, i;
        for (i = 0; i < ctx.length; i++) h = forward(ctx[i], i, cache);
        var out = [], seen = {};
        for (i = 0; i < max; i++) {
            var lg = logitsFrom(h);
            var nxt = sample(lg, opt, rng, seen);
            if (nxt === 2) break;                              // <eos>
            if (nxt === 0) break;
            seen[nxt] = (seen[nxt] || 0) + 1;
            out.push(nxt);
            if (cache.k[0].length >= META.seq - 1) break;      // context full
            h = forward(nxt, cache.k[0].length, cache);
        }
        var words = [];
        for (i = 0; i < out.length; i++) if (out[i] > 2) words.push(INV[out[i]]);
        return words.join(' ');
    }

    function generate(text, opt) {
        if (!ensure()) return '';
        opt = opt || {};
        var toks = tokenize('q: ' + String(text).trim() + ' a:');
        return complete(toks, opt);
    }

    root.BitLM = {
        ready: function () { return ensure(); },
        generate: generate,
        complete: complete,
        tokenize: tokenize,
        info: function () { return ensure() ? { params: META.params, step: META.step, val: META.val, V: META.V, d: META.d, layers: META.layers, heads: META.heads } : null; }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.BitLM;
})(typeof window !== 'undefined' ? window : globalThis);
