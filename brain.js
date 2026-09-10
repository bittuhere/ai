/* ═══════════════════════════════════════════════════════════════════════════
   BitBot BRAIN — a real neural network, from scratch, zero dependencies.
   Runs identically in the browser and Node.js.
     • Tokenizer + stemmer → bag-of-words features
     • Fully-connected net:  vocab → hidden(ReLU) → intents(softmax)
     • Trained with SGD + backpropagation (cross-entropy loss)
     • Seeded RNG → deterministic, reproducible training
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    // ── seeded RNG (mulberry32) ────────────────────────────────────────────
    function rng(seed) {
        var s = seed >>> 0;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            var t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ── text pipeline ──────────────────────────────────────────────────────
    function tokenize(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(function (w) { return w.length > 0; });
    }
    function stem(w) {
        if (w === 'times') return 'times';   // keep distinct from 'time' (math vs clock!)
        if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
        if (w.length > 4 && /(sses|shes|ches|xes)$/.test(w)) return w.slice(0, -2);
        if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
        if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
        if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
        return w;
    }
    function docs(intents) {                       // [tokens[], tag][]
        var out = [];
        intents.forEach(function (it) {
            it.patterns.forEach(function (p) { out.push([tokenize(p).map(stem), it.tag]); });
        });
        return out;
    }
    function buildVocab(allDocs) {
        var set = {}, vocab = [];
        allDocs.forEach(function (d) { d[0].forEach(function (w) { if (!set[w]) { set[w] = 1; vocab.push(w); } }); });
        var index = {}; vocab.forEach(function (w, i) { index[w] = i; });
        return { words: vocab, index: index };
    }
    function bag(text, vocab) {
        var x = new Float32Array(vocab.words.length);
        tokenize(text).map(stem).forEach(function (w) {
            var i = vocab.index[w];
            if (i !== undefined) x[i] = 1;
        });
        return x;
    }

    // ── the network ────────────────────────────────────────────────────────
    function Net(vocabSize, hidden, outSize, seed) {
        var r = rng(seed || 1337);
        function mat(rows, cols) {
            var m = new Float32Array(rows * cols);
            var scale = Math.sqrt(2 / cols);            // He init
            for (var i = 0; i < m.length; i++) m[i] = (r() * 2 - 1) * scale;
            return m;
        }
        this.V = vocabSize; this.H = hidden; this.N = outSize;
        this.W1 = mat(hidden, vocabSize); this.b1 = new Float32Array(hidden);
        this.W2 = mat(outSize, hidden);   this.b2 = new Float32Array(outSize);
    }
    Net.prototype.forward = function (x) {
        var z1 = new Float32Array(this.H), a1 = new Float32Array(this.H);
        for (var h = 0; h < this.H; h++) {
            var s = this.b1[h], row = h * this.V;
            for (var i = 0; i < this.V; i++) if (x[i]) s += this.W1[row + i] * x[i];
            z1[h] = s; a1[h] = s > 0 ? s : 0;
        }
        var z2 = new Float32Array(this.N), max = -1e9;
        for (var n = 0; n < this.N; n++) {
            var s2 = this.b2[n], row2 = n * this.H;
            for (var h2 = 0; h2 < this.H; h2++) s2 += this.W2[row2 + h2] * a1[h2];
            z2[n] = s2; if (s2 > max) max = s2;
        }
        var p = new Float32Array(this.N), sum = 0;
        for (var n2 = 0; n2 < this.N; n2++) { p[n2] = Math.exp(z2[n2] - max); sum += p[n2]; }
        for (var n3 = 0; n3 < this.N; n3++) p[n3] /= sum;
        return { z1: z1, a1: a1, p: p };
    };
    Net.prototype.trainStep = function (x, y, lr) {
        var f = this.forward(x), p = f.p;
        var loss = -Math.log(Math.max(p[y], 1e-9));
        // backprop
        var dz2 = new Float32Array(this.N);
        for (var n = 0; n < this.N; n++) dz2[n] = p[n] - (n === y ? 1 : 0);
        var da1 = new Float32Array(this.H);
        for (var n2 = 0; n2 < this.N; n2++) {
            var row2 = n2 * this.H, d = dz2[n2];
            this.b2[n2] -= lr * d;
            for (var h = 0; h < this.H; h++) {
                da1[h] += this.W2[row2 + h] * d;
                this.W2[row2 + h] -= lr * d * f.a1[h];
            }
        }
        for (var h2 = 0; h2 < this.H; h2++) {
            if (f.z1[h2] <= 0) continue;                 // ReLU gate
            var d1 = da1[h2], row = h2 * this.V;
            this.b1[h2] -= lr * d1;
            for (var i = 0; i < this.V; i++) if (x[i]) this.W1[row + i] -= lr * d1 * x[i];
        }
        return loss;
    };
    Net.prototype.serialize = function () {
        return { V: this.V, H: this.H, N: this.N, W1: Array.from(this.W1), b1: Array.from(this.b1), W2: Array.from(this.W2), b2: Array.from(this.b2) };
    };
    Net.load = function (w) {
        var n = Object.create(Net.prototype);
        n.V = w.V; n.H = w.H; n.N = w.N;
        n.W1 = Float32Array.from(w.W1); n.b1 = Float32Array.from(w.b1);
        n.W2 = Float32Array.from(w.W2); n.b2 = Float32Array.from(w.b2);
        return n;
    };

    // ── trainer (works in Node and chunked in the browser) ────────────────
    function makeTrainer(intents, opts) {
        opts = opts || {};
        var seed = opts.seed || 1337;
        var hidden = opts.hidden || 0 || 40;
        var tags = intents.map(function (i) { return i.tag; });
        var tagIndex = {}; tags.forEach(function (t, i) { tagIndex[t] = i; });
        var D = docs(intents);
        var vocab = buildVocab(D);
        // precompute bags
        var X = D.map(function (d) { return bag(d.join ? d[0].join(' ') : d[0].join(' '), vocab); });
        var X2 = D.map(function (d) { return bag(d[0].join(' '), vocab); });
        var Y = D.map(function (d) { return tagIndex[d[1]]; });
        var net = new Net(vocab.words.length, hidden, tags.length, seed);
        var order = D.map(function (_, i) { return i; });
        function shuffle(r) {
            for (var i = order.length - 1; i > 0; i--) {
                var j = Math.floor(r() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t;
            }
        }
        return {
            net: net, vocab: vocab, tags: tags, tagIndex: tagIndex,
            epoch: function (r, lr) {                     // one pass, returns avg loss
                var rr = r || rng(seed + 999);
                shuffle(rr);
                var loss = 0;
                for (var k = 0; k < order.length; k++) {
                    var i = order[k];
                    loss += net.trainStep(X2[i], Y[i], lr || 0.10);
                }
                return loss / order.length;
            },
            accuracy: function () {
                var ok = 0;
                for (var i = 0; i < X2.length; i++) {
                    var p = net.forward(X2[i]).p, best = 0;
                    for (var n = 1; n < p.length; n++) if (p[n] > p[best]) best = n;
                    if (best === Y[i]) ok++;
                }
                return ok / X2.length;
            },
            predict: function (text) {
                var f = net.forward(bag(text, vocab)).p, best = 0;
                for (var n = 1; n < f.length; n++) if (f[n] > f[best]) best = n;
                return { tag: tags[best], prob: f[best] };
            }
        };
    }

    var BitBrain = {
        tokenize: tokenize, stem: stem, bag: bag, Net: Net,
        makeTrainer: makeTrainer, rng: rng
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = BitBrain;
    else root.BitBrain = BitBrain;
})(typeof window !== 'undefined' ? window : globalThis);
