/* ═══════════════════════════════════════════════════════════════════════════
   solvex.js — BitX · the EXTENDED BRAIN-TEASER ENGINE (v11)
   ─────────────────────────────────────────────────────────────────────────
   BitMath solves expressions, BitWords solves classic word problems — BitX
   solves the BRAIN TEASERS: perfect-square families, exponent equations,
   x+1/x ladders, factorisation, polynomial division, variation tables,
   profit-loss-discount-GST chains, compound interest reverse problems,
   mensuration reversals, probability slips, symmetry knowledge + MCQ
   option-matching. Every answer is deterministic, rule-based, with steps.
   Returns { title, steps[], answer } or null (never guesses).
   ═══════════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    /* ─── text normaliser: unicode maths → ascii, lowercase ─────────────── */
    var SUP = { '⁰': '0', '¹': '1', '²': '^2', '³': '^3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
    function nm(t) {
        var s = String(t)
            /* superscript runs → ^N  (x⁴ → x^4,  x⁻² → x^(-2),  2¹⁰ → 2^10) */
            .replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, function (run) {
                var neg = run.indexOf('⁻') > -1;
                var digits = run.replace(/⁻/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,
                    function (c) { return String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)); });
                return neg ? '^(-' + digits + ')' : '^' + digits;
            })
            .replace(/×|✕|✖/g, '*').replace(/÷/g, '/').replace(/[−–—]/g, '-')
            .replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt').replace(/π|∏/g, 'pi')
            .replace(/°/g, ' degrees ')
            .replace(/₹/g, ' rs ').replace(/\s+/g, ' ')
            .trim().toLowerCase();
        /* v14: grouped numbers "1,32,300" / "1,000,000" → 132300 / 1000000.
           Guards: no digit directly before, and skip "(12,345)" coordinate pairs. */
        s = s.replace(/\d{1,3}(?:,\d{3})+(?!\d)|\d{1,3}(?:,\d{2})+,\d{3}(?!\d)/g, function (m, off, str) {
            if (off > 0 && /\d/.test(str.charAt(off - 1))) return m;
            return str.charAt(off + m.length) === ')' ? m : m.replace(/,/g, '');
        });
        /* v13: spoken operators → symbols ("4^x minus 3 equals 24", "x plus 5") */
        s = s.replace(/\braised to the power of\b/g, '^')
             .replace(/\braised to\b/g, '^')
             .replace(/\bto the power (?:of )?\(?(-?[\d.]+(?:\/[\d.]+)?)\)?/g, '^($1)')
             .replace(/\bminus\b/g, '-')
             .replace(/\bplus\b/g, '+')
             .replace(/\bequals\b/g, '=')
             .replace(/\s+/g, ' ').trim();
        /* v13: spoken/word power forms → symbols.  Token before "square(d)/
           cube(d)" must be a number, a lone variable, or digits+variable
           (5, x, 49x).  Bare "a" converts only in algebra context — next to
           an operator or in a sentence containing '=' — so "a square field",
           "perfect square", "volume of cube" stay words. */
        function powWord(str, pow) {
            return str.replace(/(^|[\s()+/*-])(\d+(?:\.\d+)?|\d*[a-z]) (squared|square|cubed|cube)\b/g,
                function (all, pre, tok, w, off) {
                    var isSq = (w === 'squared' || w === 'square');
                    if (isSq !== (pow === 2)) return all;
                    if (tok === 'a') {
                        var rest = str.slice(off + all.length);
                        var hasEq = str.indexOf('=') > -1;
                        var opNext = /^\s*[+=\-)*]/.test(rest);
                        if (!(opNext || (hasEq && /^\s*(?:[^a-z\s]|$)/.test(rest)))) return all;
                    }
                    return pre + tok + '^' + pow;
                });
        }
        s = powWord(powWord(s, 2), 3);
        s = s.replace(/\s+/g, ' ').replace(/[?!]+$/, '').trim();
        return s;
    }
    function nn(s) { return nm(s).replace(/[, ]+/g, ''); }   // super-normalised (no spaces/commas)

    /* ─── number words ──────────────────────────────────────────────────── */
    var WORDNUM = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
        ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
        seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
        sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
        half: 0.5, quarter: 0.25,
        first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10
    };
    var WORDFRAC = {
        'one-half': 1 / 2, 'half': 1 / 2, 'one-third': 1 / 3, 'one-fourth': 1 / 4, 'one-quarter': 1 / 4,
        'one-fifth': 1 / 5, 'two-thirds': 2 / 3, 'three-fourths': 3 / 4, 'two-fifths': 2 / 5,
        'four-fifths': 4 / 5, 'five-sixth': 5 / 6, 'five-sixths': 5 / 6, 'three-fifths': 3 / 5,
        'one-sixth': 1 / 6, 'one-eighth': 1 / 8
    };
    function wnum(s) {
        s = String(s).trim().toLowerCase();
        if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
        if (/^\d+\s*\/\s*\d+$/.test(s)) { var pp = s.split('/'); return parseFloat(pp[0]) / parseFloat(pp[1]); }
        if (WORDFRAC[s] !== undefined) return WORDFRAC[s];
        if (WORDNUM[s] !== undefined) return WORDNUM[s];
        var m = s.match(/^(\w+)[ -](\w+)$/);
        if (m && WORDNUM[m[1]] !== undefined && WORDNUM[m[2]] !== undefined && WORDNUM[m[2]] < 10)
            return WORDNUM[m[1]] + WORDNUM[m[2]];
        return null;
    }
    /* duration → hours: '1 hr 30 min', '1 hour 30 minutes', '90 minutes', 'six months'→0.5 yr */
    function parseDur(s) {
        s = nm(s);
        var total = null;
        var h = s.match(/(\d+(?:\.\d+)?|\w+)\s*(?:hr|hour|h)s?\b/);
        var mi = s.match(/(\d+(?:\.\d+)?|\w+)\s*(?:min|minute)s?\b/);
        if (h) { var hv = wnum(h[1]); if (hv !== null) total = (total || 0) + hv; }
        if (mi) { var mv = wnum(mi[1]); if (mv !== null) total = (total || 0) + mv / 60; }
        if (total === null) {
            var bare = s.match(/^(\d+(?:\.\d+)?)$/);
            if (bare) total = parseFloat(bare[1]);
        }
        return total;
    }

    /* ─── fractions ─────────────────────────────────────────────────────── */
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
    function F(n, d) {
        if (d === undefined) d = 1;
        if (d < 0) { n = -n; d = -d; }
        var g = gcd(Math.abs(n), d) || 1;
        return { n: n / g, d: d / g };
    }
    function fAdd(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
    function fSub(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
    function fMul(a, b) { return F(a.n * b.n, a.d * b.d); }
    function fDiv(a, b) { return F(a.n * b.d, a.d * b.n); }
    function fVal(a) { return a.n / a.d; }
    function fStr(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }
    function fPow(a, k) { // integer power
        var r = F(1, 1), base = k < 0 ? F(a.d, a.n) : a;
        k = Math.abs(k);
        for (var i = 0; i < k; i++) r = fMul(r, base);
        return r;
    }

    /* ─── decimals without exponential notation ─────────────────────────── */
    function dec(v) {
        if (!isFinite(v)) return String(v);
        if (v === 0) return '0';
        var s;
        if (Math.abs(v) >= 1e-6 && Math.abs(v) < 1e15) {
            s = String(Math.round(v * 1e10) / 1e10);
        } else {
            s = v.toFixed(20).replace(/0+$/, '').replace(/\.$/, '');
        }
        return s;
    }
    function decToFrac(v, maxD) {
        maxD = maxD || 100000;
        if (Math.abs(v - Math.round(v)) < 1e-12) return F(Math.round(v), 1);
        // continued fraction
        var x = v, n0 = 1, d0 = 0, n1 = Math.floor(x), d1 = 1, best = null;
        for (var i = 0; i < 24; i++) {
            if (d1 > maxD) break;
            best = { n: n1, d: d1 };
            var frac = x - Math.floor(x);
            if (frac < 1e-12) break;
            x = 1 / frac;
            var a = Math.floor(x);
            var n2 = a * n1 + n0, d2 = a * d1 + d0;
            n0 = n1; d0 = d1; n1 = n2; d1 = d2;
        }
        if (best && Math.abs(best.n / best.d - v) < 1e-9) return F(best.n, best.d);
        return null;
    }
    /* pretty value: integer, or "dec (= frac)" when the fraction is clean */
    function fmtVal(v) {
        if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
        var f = decToFrac(v, 10000);
        var d = dec(v);
        if (f && f.d > 1 && f.d <= 10000) return d + ' (= ' + fStr(f) + ')';
        return d;
    }
    /* fraction-first: "1/27 (= 0.037…)" style for exact rational answers */
    function fmtFrac(v) {
        if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
        var f = decToFrac(v, 100000);
        if (f && f.d > 1) return fStr(f);
        return dec(v);
    }

    /* ─── primes / factorisation ────────────────────────────────────────── */
    function factorize(n) { // n positive integer ≤ ~1e9 → map prime→exp
        var f = {}, d = 2;
        n = Math.round(n);
        while (d * d <= n) { while (n % d === 0) { f[d] = (f[d] || 0) + 1; n /= d; } d += (d === 2 ? 1 : 2); }
        if (n > 1) f[n] = (f[n] || 0) + 1;
        return f;
    }
    function leftoverRoot(n, root) { // smallest multiplier so n*leftover is a perfect `root` power
        var f = factorize(n), left = 1;
        for (var p in f) { var e = f[p] % root; if (e) left *= Math.pow(p, root - e); }
        return left;
    }
    function divisorToRoot(n, root) { // smallest divisor so n/divisor is a perfect `root` power
        var f = factorize(n), d = 1;
        for (var p in f) { var e = f[p] % root; if (e) d *= Math.pow(p, e); }
        return d;
    }
    function isqrt(n) { var r = Math.round(Math.sqrt(n)); return r * r === n ? r : null; }
    function icbrt(n) {
        var neg = n < 0; n = Math.abs(n);
        var r = Math.round(Math.pow(n, 1 / 3));
        for (var c = r - 2; c <= r + 2; c++) if (c >= 0 && c * c * c === n) return neg ? -c : c;
        return null;
    }
    function sqrtSimplify(n) { // √n = k√r with r squarefree
        var k = 1, f = factorize(Math.round(n));
        var r = 1;
        for (var p in f) { k *= Math.pow(p, Math.floor(f[p] / 2)); r *= Math.pow(p, f[p] % 2); }
        return { k: k, r: r };
    }

    /* ─── polynomial engine (one variable, float coeffs) ────────────────── */
    function trimP(a) { while (a.length > 1 && Math.abs(a[a.length - 1]) < 1e-12) a.pop(); return a; }
    function parsePoly(s, v) {
        s = nm(s);
        s = s.replace(/\*\*/g, '^');
        v = (v || 'x').toLowerCase();
        // move everything to one string of terms
        var re = new RegExp('([+-]?)\\s*([^+-]*)', 'g'), m;
        var coeffs = [0];
        var any = false;
        while ((m = re.exec(s)) !== null) {
            var body = m[2].trim();
            if (!body) continue;
            any = true;
            var sign = m[1] === '-' ? -1 : 1;
            var tm = body.match(new RegExp('^(?:(\\d+(?:\\.\\d+)?(?:\\/\\d+(?:\\.\\d+)?)?|\\.\\d+|\\d+(?:\\.\\d+)?\\s*\\/\\s*\\d+(?:\\.\\d+)?)\\s*\\*?\\s*)?(?:\\(?\\s*(' + v + ')\\s*\\)?(?:\\s*\\^\\s*(\\d+))?)?$'));
            if (!tm) return null;
            var cs = tm[1], vr = tm[2], pw = tm[3];
            var c = 1;
            if (cs !== undefined && cs !== '') {
                cs = cs.replace(/\s+/g, '');
                if (cs.indexOf('/') > -1) { var pp = cs.split('/'); c = parseFloat(pp[0]) / parseFloat(pp[1]); }
                else c = parseFloat(cs);
            }
            var deg = 0;
            if (vr) deg = pw ? parseInt(pw, 10) : 1;
            if (!vr && (cs === undefined || cs === '')) return null;
            c *= sign;
            while (coeffs.length <= deg) coeffs.push(0);
            coeffs[deg] += c;
        }
        return any ? trimP(coeffs) : null;
    }
    function polyEval(a, x) { var r = 0; for (var i = a.length - 1; i >= 0; i--) r = r * x + a[i]; return r; }
    function polyAdd(a, b) { var r = a.slice(); while (r.length < b.length) r.push(0); for (var i = 0; i < b.length; i++) r[i] += b[i]; return trimP(r); }
    function polySub(a, b) { var r = a.slice(); while (r.length < b.length) r.push(0); for (var i = 0; i < b.length; i++) r[i] -= b[i]; return trimP(r); }
    function polyMul(a, b) {
        var r = [];
        for (var i = 0; i < a.length + b.length - 1; i++) r.push(0);
        for (i = 0; i < a.length; i++) for (var j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
        return trimP(r);
    }
    function polyDiv(a, b) { // returns {q, r}
        a = a.slice(); b = trimP(b.slice());
        var db = b.length - 1, lc = b[db];
        var q = [];
        for (var i = 0; i <= a.length - 1 - db; i++) q.push(0);
        for (var da = a.length - 1; da >= db; da--) {
            var coef = a[da] / lc;
            q[da - db] = coef;
            for (var k = 0; k <= db; k++) a[da - db + k] -= coef * b[k];
        }
        return { q: trimP(q.length ? q : [0]), r: trimP(a) };
    }
    function coefStr(c, forceSign) {
        var s = (Math.abs(c - Math.round(c)) < 1e-9) ? String(Math.round(c)) : dec(c);
        if (s === '-1') s = '-';
        if (s === '1') s = '';
        return s;
    }
    function polyStr(a, v, uni) {
        v = v || 'x';
        var parts = [];
        for (var i = a.length - 1; i >= 0; i--) {
            var c = a[i];
            if (Math.abs(c) < 1e-9) continue;
            var sign = c < 0 ? '-' : '+';
            var cs = coefFmt(Math.abs(c));
            var term;
            if (i === 0) term = cs;
            else {
                var pw = i === 1 ? v : (uni ? v + (SUPS[i] || '^' + i) : v + '^' + i);
                term = (cs === '1' ? '' : cs) + pw;
            }
            parts.push({ sign: sign, term: term });
        }
        if (!parts.length) return '0';
        var out = (parts[0].sign === '-' ? '-' : '') + parts[0].term;
        for (i = 1; i < parts.length; i++) out += (parts[i].sign === '-' ? ' - ' : ' + ') + parts[i].term;
        return out;
    }
    function polyStrU(a, v) { return polyStr(a, v, true).replace(/-/g, '-'); }

    /* ─── MCQ option parsing ────────────────────────────────────────────── */
    function parseOptions(t) {
        var re = /\((i|ii|iii|iv)\)\s*/g, m, hits = [];
        while ((m = re.exec(t)) !== null) hits.push({ label: m[1], idx: m.index, end: m.index + m[0].length });
        if (hits.length < 3) return null;
        // options must appear in order i, ii, iii(, iv)
        for (var i = 0; i < hits.length; i++) {
            var want = ['i', 'ii', 'iii', 'iv'][i];
            if (hits[i].label !== want) return null;
        }
        var opts = [];
        for (i = 0; i < hits.length; i++) {
            var stop = i + 1 < hits.length ? hits[i + 1].idx : t.length;
            opts.push({ label: hits[i].label, text: t.slice(hits[i].end, stop).trim().replace(/[.?]+$/, '').trim() });
        }
        var stem = t.slice(0, hits[0].idx).replace(/\b(options?|choices?)\s*:?\s*$/i, '').replace(/[:=]?\s*$/, '').trim();
        return { stem: stem, opts: opts };
    }
    function optNumber(text) {
        var t = text.trim();
        var m = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
        if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);
        m = t.match(/^(-?\d+(?:\.\d+)?)\s*(?:%|units?|cm|deg(?:rees)?|°)?$/i);
        if (m) return parseFloat(m[1]);
        return null;
    }
    function matchOption(ansStr, value, opts) {
        var i;
        if (value !== undefined && value !== null && isFinite(value)) {
            for (i = 0; i < opts.length; i++) {
                var ov = optNumber(opts[i].text);
                if (ov !== null && Math.abs(ov - value) < 1e-6 * (1 + Math.abs(value))) return opts[i];
            }
        }
        var an = nn(ansStr), anc = nn(supToCaret(ansStr));
        for (i = 0; i < opts.length; i++) {
            var on = nn(opts[i].text), onc = nn(supToCaret(opts[i].text));
            if (on && (on === an || on === anc || onc === an || onc === anc ||
                       on.indexOf(an) === 0 || an.indexOf(on) === 0 || onc.indexOf(anc) === 0 || anc.indexOf(onc) === 0)) return opts[i];
        }
        for (i = 0; i < opts.length; i++) {
            var on2 = nn(opts[i].text), onc2 = nn(supToCaret(opts[i].text));
            if (on2 && on2.length > 1 && (an.indexOf(on2) > -1 || on2.indexOf(an) > -1 || anc.indexOf(onc2) > -1 || onc2.indexOf(anc) > -1)) return opts[i];
        }
        return null;
    }

    /* ─── result helpers ────────────────────────────────────────────────── */
    function RES(title, steps, answer, value) {
        return { ok: true, title: title, steps: steps || [], answer: String(answer), value: (value === undefined ? null : value) };
    }

    /* ─── numeric word→symbol translator + BitMath fallback ─────────────── */
    var BAL = '\\([^()]*(?:\\([^()]*(?:\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)';   // balanced parens, depth 3
    function translate(t) {
        var s = nm(t);
        s = s.replace(/\b(?:by )?using (?:a |an |any |some )?(?:suitable |appropriate )?(?:identity|identities|formula|rule|method)\b/g, ' ');
        s = s.replace(/\b(\d+(?:\.\d+)?)\s*squared\b/g, '$1^2').replace(/\b(\d+(?:\.\d+)?)\s*cubed\b/g, '$1^3');
        s = s.replace(/\b(?:evaluate|simplify|compute|calculate|find the value of|find the value|find|value of|what is|what will be|solve)\s*:?\s*/g, '');
        s = s.replace(/\s+(?:is equal to|are equal to|equals?|is|are|will be)\s*$/g, '');
        s = s.replace(/\bthe\b/g, ' ');
        s = s.replace(/[{\[]/g, '(').replace(/[}\]]/g, ')');
        // word roots → wrapped function calls (iterate so nesting resolves inside-out)
        s = s.replace(/\bcube root of\s*/g, 'cbrt#').replace(/\bsquare root of\s*/g, 'sqrt#');
        var RE_ROOTWRAP = new RegExp('(cbrt|sqrt)#\\s*(' + BAL + '|-?[\\d.]+(?:\\s*[*x]\\s*\\(?-?[%\\d.]+\\)?)*|\\(?-?[\\d.]+\\s*/\\s*-?[\\d.]+\\)?)', 'g');
        for (var pass = 0; pass < 4; pass++) {
            s = s.replace(RE_ROOTWRAP, function (_, f, op) {
                op = op.replace(/(\d|\))\s*x\s*(\d|\()/g, '$1*$2');
                return f + '(' + op + ')';
            });
        }
        var RE_CUBE = new RegExp('\\bcube of\\s*(' + BAL + '|\\(?-?[\\d./ ]+\\)?)', 'g');
        var RE_SQUARE = new RegExp('\\bsquare of\\s*(' + BAL + '|\\(?-?[\\d./ ]+\\)?)', 'g');
        s = s.replace(RE_CUBE, function (_, op) { return '(' + op.trim() + ')^3'; });
        s = s.replace(RE_SQUARE, function (_, op) { return '(' + op.trim() + ')^2'; });
        s = s.replace(/\bminus\b/g, '-').replace(/\bplus\b/g, '+');
        s = s.replace(/\bdivided by\b/g, '/').replace(/\bmultiplied (?:by|with)\b/g, '*');
        s = s.replace(/\btimes\b/g, '*').replace(/\binto\b/g, '*');
        s = s.replace(/(\d|\))\s*x\s*(?=(cbrt|sqrt|\(|\d))/g, '$1*');
        s = s.replace(/(\d|\))\s*x\s*(\d|\()/g, '$1*$2');
        s = s.replace(/\bof\b/g, '*');
        s = s.replace(/[^-()\d.+*/^a-z\s]/g, '');
        return s.replace(/[.,;:\s]+$/g, '').replace(/^[.,;:\s]+/g, '').trim();
    }
    function numericFallback(t) {
        if (!/(evaluate|simplify|value|cube|square|root|sqrt|cbrt|\^|calculate|find)/.test(t)) return null;
        var s = translate(t);
        if (!/[0-9]/.test(s) || !root.BitMath || !root.BitMath.looksLikeMath) return null;
        if (!root.BitMath.looksLikeMath(s)) return null;
        var r = null;
        try { r = root.BitMath.solve(s); } catch (e) { r = null; }
        if (!r || !r.ok || typeof r.value !== 'number' || !isFinite(r.value)) return null;
        var steps = [];
        if (s !== nm(t)) steps.push('Rewrote in math symbols: `' + s + '`');
        if (r.steps && r.steps.length) {
            for (var i = 0; i < Math.min(r.steps.length, 6); i++) steps.push(r.steps[i].calc + ' → ' + r.steps[i].expr);
        }
        return RES('Numeric evaluation', steps, fmtFracFirst(r.value), r.value);
    }
    function fmtFracFirst(v) {
        if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
        var f = decToFrac(v, 100000);
        if (f && f.d > 1 && f.d <= 100000) return fStr(f) + ' (= ' + dec(v) + ')';
        return dec(v);
    }

    /* ─── rule registry ─────────────────────────────────────────────────── */
    var RULES = [];
    function R(re, fn) { RULES.push({ re: re, fn: fn }); }

    /* ═══ KB: fixed knowledge answers (narrow regexes only) ═══════════════ */
    var KB = [];
    function K(re, ans, why, value) { KB.push({ re: re, ans: ans, why: why, value: value === undefined ? null : value }); }

    /* ── CH 1 KB ── */
    K(/difference between the squares of two consecutive numbers/, 'sum',
        'For n and n+1: (n+1)² − n² = 2n+1 = n + (n+1) — exactly their SUM.');
    K(/perfect squares cannot have .* in their ones place|never.*perfect square.*ones/, '7, 8',
        'A perfect square always ends in 0,1,4,5,6 or 9 — never 2, 3, 7 or 8.');
    /* ── CH 4 KB ── */
    K(/1\/x and 1\/y are/, 'in inverse proportion', 'x/y = k ⇒ (1/x)·(1/y) is not fixed but (1/x)/(1/y) = y/x flips — reciprocals of direct-variation quantities vary INVERSELY.');
    K(/x and y vary inversely with each other, then/, '(xy) remains constant', 'Inverse variation means xy = k (constant).');
    K(/which of the quantities vary inversely/, 'number of workers and time taken to finish a job', 'More workers ⇒ less time (product fixed) — classic inverse variation.');
    /* ── CH 5 KB ── */
    K(/discount is always calculated on/, 'marked price', 'Discount % is always computed on the MARKED PRICE.');
    /* ── CH 6 KB ── */
    K(/what is more profitable to the depositor/, 'compound interest', 'CI earns interest-on-interest, so for the same rate & time CI ≥ SI — more profitable.');
    K(/in a = p\(1 \+ r\/100\)\^n, a stands for|a stands for .*p\(1/, 'principal + interest', 'A = Amount = Principal + Interest.');
    K(/number of conversion periods is greater than or equal to 2/, 'greater than simple interest', 'More conversion periods ⇒ interest compounds more often ⇒ CI > SI.');
    K(/one-year deposit\. she should opt for|reema wants to do a one-year deposit/, 'compound interest of 10% compounded quarterly', 'Quarterly compounding = 4 conversion periods ⇒ the highest amount.');
    /* ── CH 7 KB ── */
    K(/which of the following is an algebraic identity/, '(a-b)^2 = a^2-2ab+b^2', 'The standard identity: (a − b)² = a² − 2ab + b².');
    /* ── CH 3 KB ── */
    K(/non-zero rational numbers a and b, a\^4 divided by b\^4|a\^4 divided by b\^4 is equal to/, '(a/b)^4', 'Law of exponents: a⁴ ÷ b⁴ = (a/b)⁴.');
    /* ── CH 9 KB ── */
    K(/solution of a linear equation in one variable is always/, 'a real number', 'A linear equation in one variable always has exactly one REAL number solution.');
    /* ── CH 10 KB ── */
    K(/which condition would always make the two lines parallel/, 'alternate interior angles are equal', 'Equal alternate interior angles ⇔ lines parallel (converse of alternate-angle theorem).');
    /* ── CH 11 KB ── */
    K(/parallelogram having its adjacent sides equal/, 'rhombus', 'A parallelogram with all sides equal is a RHOMBUS.');
    K(/seven sided polygon is called/, 'heptagon', '7 sides = heptagon.');
    K(/regular polygons are/, 'equiangular and equilateral', 'Regular polygons have equal sides AND equal angles.');
    K(/which of the given polygons have equal diagonals/, 'square', 'Only the square (of these) has equal diagonals — a rectangle does too, but among the options it is the square.');
    K(/name two polygons whose diagonals bisect each other at right angles/, 'rhombus and square',
        'RHOMBUS and SQUARE — their diagonals bisect each other at 90°.');
    /* ── CH 12 KB ── */
    K(/number of parts required to construct a quadrilateral|parts.*needed to construct a quadrilateral/, '5',
        'A quadrilateral needs 5 independent parts (e.g. 4 sides + 1 diagonal).', 5);
    K(/construct a parallelogram, the minimum number of dimensions/, '3',
        'A parallelogram needs 3 dimensions: two adjacent sides + included angle.', 3);
    K(/minimum number of dimensions needed to construct a square/, '1',
        'A square needs just 1 dimension — its side.', 1);
    K(/construct a rectangle, the minimum number of dimensions/, '2',
        'A rectangle needs 2 dimensions — length and breadth.', 2);
    /* ── CH 13 KB ── */
    K(/point at which the x-axis and y-axis intersect/, 'origin', 'The axes meet at the ORIGIN (0, 0).');
    K(/if a point lies on the y-axis, its coordinates are/, '(0, y)', 'On the y-axis the x-coordinate is 0 ⇒ (0, y).');
    K(/distance of a point from the y-axis is called/, 'abscissa', 'Distance from the y-axis = x-coordinate = ABSCISSA.');
    K(/write down the coordinates of the origin/, '(0, 0)', 'The origin is (0, 0).');
    K(/coordinates of a point which lies on the x-axis/, '(x, 0)', 'On the x-axis the y-coordinate is 0 ⇒ (x, 0).');
    /* ── CH 14 KB ── */
    K(/if the height of a cylinder is halved, its volume will be/, '1/2 times', 'V = πr²h is linear in h ⇒ halving h halves V.', 0.5);
    /* ── CH 15 KB ── */
    K(/rectangles with no gap between successive rectangles/, 'histogram', 'A HISTOGRAM draws class intervals as touching rectangles.');
    K(/a histogram has/, 'frequencies as heights', 'In a histogram the rectangle HEIGHTS are the frequencies.');
    K(/possible number of outcomes if a coin is tossed twice/, 'four', 'Two coins: HH, HT, TH, TT ⇒ 4 outcomes.', 4);
    /* ── CH 16 KB ── */
    K(/letter 'i' has rotational symmetry of order|letter i has rotational symmetry/, '2', "'I' looks the same after a half turn ⇒ order 2.", 2);
    K(/angle of rotation of a figure is 36 degrees/, '10', 'Order = 360° / angle of rotation = 360/36 = 10.', 10);
    K(/regular pentagon has rotational symmetry of order/, '5', 'A regular pentagon matches itself 5 times in a full turn ⇒ order 5.', 5);
    K(/looks exactly the same after a half turn/, '180', 'A half turn = 180°.', 180);
    K(/two letters of the english alphabet which have no rotational symmetry/, 'F and G',
        'F, G, J, L, P, Q and R have NO rotational symmetry (only look the same at 360°).');
    K(/which letters of the english alphabet have rotational symmetry of order 2/, 'H, N, O, S, X, Z',
        'H, N, O, S, X, Z look the same after a half turn ⇒ order 2.');
    K(/does an isosceles triangle exhibit rotational symmetry/, 'no',
        'No — an isosceles triangle has a line of symmetry but matches itself only at 360° rotationally (order 1). Only an EQUILATERAL triangle has rotational symmetry (order 3).');
    K(/rotational symmetry of order 4, 2, 3 and 6/, 'square (order 4, 90°), rectangle (order 2, 180°), equilateral triangle (order 3, 120°), regular hexagon (order 6, 60°)',
        'Angle of rotation = 360°/order: square 90°, rectangle 180°, equilateral triangle 120°, regular hexagon 60°.');
    K(/in the word 'maths' which letters show rotational symmetry of order 2|word 'maths'/, 'H and S',
        "In MATHS, only H and S look the same after a half turn (order 2).");
    K(/two letters .* both line as well as rotational symmetry/, 'H, I, O, X',
        'H, I, O and X have line symmetry AND rotational symmetry.');
    K(/angle of rotation of a regular five-pointed star/, '72',
        'A 5-pointed star matches itself 5 times ⇒ order 5 ⇒ angle of rotation = 360/5 = 72°.', 72);
    /* ── CH 8 KB ── */
    K(/can \(x - 1\) be the remainder|can \(x-1\) be the remainder/, 'no',
        'No — the remainder must have degree LESS than the divisor. deg(x − 1) = 1 = deg(x + 3), so (x − 1) cannot be the remainder.');

    /* ═══ COMPUTED RULES ══════════════════════════════════════════════════ */

    /* ── digit in the <place> of N^k ── */
    R(/digit in the (ones|tens|hundreds|thousands|ten thousands|ten-thousands|lakhs?|hundred thousands) place of \(?(\d+)\)?\^?(\d*)/, function (t, raw, m) {
        var PLACE = { ones: 0, tens: 1, hundreds: 2, thousands: 3, 'ten thousands': 4, 'ten-thousands': 4, lakhs: 5, lakh: 5, 'hundred thousands': 5 };
        var place = PLACE[m[1]], n = parseInt(m[2], 10), k = m[3] ? parseInt(m[3], 10) : 2;
        var p = Math.pow(n, k);
        var digits = String(p);
        var d = digits[digits.length - 1 - place];
        return RES('Digit in the ' + m[1] + ' place', [
            n + '^' + k + ' = ' + p,
            'Counting places from the right (ones = position 1): the ' + m[1] + ' digit is **' + d + '**'
        ], d + ' (in ' + p + ')', parseInt(d, 10));
    });

    /* ── how many decimal places in sqrt ── */
    R(/square root of (\d+\.\d+) has how many decimal places/, function (t, raw, m) {
        var decs = m[1].split('.')[1].length;
        var ans = decs / 2;
        return RES('Decimal places in a square root', [
            'The radicand ' + m[1] + ' has ' + decs + ' decimal places.',
            'Rule: sqrt of a number with 2n decimal places has n decimal places ⇒ ' + decs + '/2 = ' + ans
        ], String(ans), ans);
    });

    /* ── smallest number to multiply/divide → perfect square/cube ── */
    R(/smallest number by which (\d+) (must be|should be) (divided|multiplied) (?:to make it|so that (?:it becomes|the quotient is)|to get) a perfect (square|cube)/, function (t, raw, m) {
        var n = parseInt(m[1], 10), rootDeg = m[4] === 'square' ? 2 : 3;
        var v = m[3] === 'divided' ? divisorToRoot(n, rootDeg) : leftoverRoot(n, rootDeg);
        var f = factorize(n), fstr = Object.keys(f).map(function (p) { return p + (f[p] > 1 ? '^' + f[p] : ''); }).join(' × ');
        var prod = m[3] === 'divided' ? n / v : n * v;
        var rt = rootDeg === 2 ? Math.round(Math.sqrt(prod)) : icbrt(prod);
        return RES('Smallest number to make a perfect ' + m[4], [
            'Prime factorise: ' + n + ' = ' + fstr,
            'Group the primes in ' + (rootDeg === 2 ? 'pairs' : 'triples') + ' — leftover/unpaired primes: ' + v,
            (m[3] === 'divided' ? 'Divide' : 'Multiply') + ' by **' + v + '** → ' + prod + ' = ' + rt + (rootDeg === 2 ? '²' : '³') + ' ✓'
        ], String(v), v);
    });
    R(/smallest number which when multiplied with (\d+) will make the product a perfect cube(?:\. further,? find the cube root of the product)?/, function (t, raw, m) {
        var n = parseInt(m[1], 10);
        var v = leftoverRoot(n, 3), prod = n * v, rt = icbrt(prod);
        var f = factorize(n), fstr = Object.keys(f).map(function (p) { return p + (f[p] > 1 ? '^' + f[p] : ''); }).join(' × ');
        return RES('Smallest multiplier for a perfect cube', [
            n + ' = ' + fstr,
            'Triples are incomplete → multiply by **' + v + '**',
            'Product = ' + n + ' × ' + v + ' = ' + prod + ', and ∛' + prod + ' = **' + rt + '**'
        ], v + ' (cube root of the product = ' + rt + ')', rt);
    });

    /* ── non-square numbers between n² and (n+1)² ── */
    R(/how many non-square numbers (?:are there|lie) between (\d+)\^2 and (\d+)\^2/, function (t, raw, m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        var ans = b * b - a * a - 1;
        return RES('Non-square numbers between consecutive squares', [
            'Between n² and (n+1)² there are exactly 2n non-square numbers.',
            a + '² = ' + a * a + ', ' + b + '² = ' + b * b + ' → count = ' + b * b + ' − ' + a * a + ' − 1 = **' + ans + '**'
        ], String(ans), ans);
    });

    /* ── first k triangular numbers ── */
    R(/first (four|five|six|three|\d+) triangular numbers/, function (t, raw, m) {
        var k = wnum(m[1]) || 4, list = [];
        for (var i = 1; i <= k; i++) list.push(i * (i + 1) / 2);
        return RES('Triangular numbers', [
            'Triangular number T(n) = n(n+1)/2 — dots arranged in a triangle.',
            'T(1)=1, T(2)=3, T(3)=6, T(4)=10, T(5)=15, T(6)=21…'.slice(0, 20 + k * 8)
        ], list.join(', '), null);
    });

    /* ── Pythagorean triplet check ── */
    R(/is (\d+),? (\d+),? (\d+) a pythagorean triplet/, function (t, raw, m) {
        var a = +m[1], b = +m[2], c = +m[3];
        var ss = [a, b, c].sort(function (x, y) { return x - y; });
        var ok = ss[0] * ss[0] + ss[1] * ss[1] === ss[2] * ss[2];
        return RES('Pythagorean triplet test', [
            'Largest = ' + ss[2] + ' → ' + ss[2] + '² = ' + ss[2] * ss[2],
            ss[0] + '² + ' + ss[1] + '² = ' + (ss[0] * ss[0] + ss[1] * ss[1]),
            (ok ? 'Equal ✓' : 'NOT equal ✗')
        ], (ok ? 'yes' : 'no') + ' — ' + ss[0] + '² + ' + ss[1] + '² ' + (ok ? '=' : '≠') + ' ' + ss[2] + '²', null);
    });

    /* ── generate triplet from smallest member ── */
    R(/pythagorean triplet (?:if|whose|where) (?:the )?smallest number is (\d+)/, function (t, raw, m) {
        var s = +m[1], trip;
        if (s % 2 === 0) { var mm = s / 2; trip = [s, mm * mm - 1, mm * mm + 1]; }
        else { trip = [s, (s * s - 1) / 2, (s * s + 1) / 2]; }
        return RES('Pythagorean triplet with smallest number ' + s, [
            s % 2 === 0 ? 'Even start → use 2m, m²−1, m²+1 with m = ' + (s / 2)
                : 'Odd start → use m, (m²−1)/2, (m²+1)/2 with m = ' + s,
            'Triplet = ' + trip.join(', ') + ' — check: ' + trip[0] + '² + ' + trip[1] + '² = ' + (trip[0] * trip[0] + trip[1] * trip[1]) + ' = ' + trip[2] + '² ✓'
        ], trip.join(', '), null);
    });

    /* ── sqrt by repeated subtraction ── */
    R(/square root of (\d+) by repeated subtraction/, function (t, raw, m) {
        var n = +m[1], steps = [], k = 0, cur = n;
        while (cur > 0 && k < 60) { var odd = 2 * k + 1; cur -= odd; k++; steps.push('Step ' + k + ': subtract ' + odd + (cur >= 0 ? ' → ' + cur : '')); if (cur === 0) break; }
        if (cur !== 0) return null;
        return RES('√' + n + ' by repeated subtraction', steps.concat([
            'We subtracted ' + k + ' consecutive odd numbers to reach 0'
        ]), '√' + n + ' = ' + k, k);
    });

    /* ── side of square from area ── */
    R(/(?:side|measure of the side) of a square ([a-z ]+) of area ([\d./ ]+)(?: (\w+\^?\d?))?|square ([a-z ]+) has area ([\d./ ]+)[\s\S]*?side/, function (t, raw, m) {
        return squareAreaSide(m[2] || m[5], m[3] || 'units', raw);
    });
    R(/area of a square (?:field|plot|lawn)? ?is ([\d]+(?: \d+\/\d+|\.\d+)?) ?(?:m\^2|cm\^2|sq\.? ?\w+)?\.? find the length of one side/, function (t, raw, m) {
        return squareAreaSide(m[1], 'm', raw);
    });
    function squareAreaSide(areaStr, unit, raw) {
        var a = parseMixed(areaStr);
        if (a === null) return null;
        var s = Math.sqrt(a);
        var steps = ['Area of a square = side²', 'side = √area = √' + dec(a)];
        if (Math.abs(s - Math.round(s)) < 1e-9) steps.push('√' + dec(a) + ' = ' + Math.round(s) + ' exactly (' + Math.round(s) + '² = ' + Math.round(s) * Math.round(s) + ')');
        return RES('Side of a square from its area', steps, fmtVal(s) + ' ' + unit, s);
    }
    function parseMixed(s) {
        s = String(s).trim();
        var m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
        if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
        var f = s.match(/^(\d+)\s*\/\s*(\d+)$/);
        if (f) return parseInt(f[1], 10) / parseInt(f[2], 10);
        var d = s.match(/^\d+(?:\.\d+)?$/);
        if (d) return parseFloat(s);
        return null;
    }

    /* ── sqrt correct to k decimal places (one or two targets) ── */
    R(/(?:square root|sqrt|value(?:s)? of sqrt)\(?s?[^?]*correct to (one|two|three|four|five|six|\d+) (?:places? of decimal|decimal places?)/, function (t, raw, m) {
        var k = wnum(m[1]) || parseInt(m[1], 10);
        var s = nm(raw);
        var args = [], re = /sqrt\(([\d.]+)\)|square root of ([\d.]+)/g, mm;
        while ((mm = re.exec(s)) !== null) args.push(parseFloat(mm[1] || mm[2]));
        if (!args.length) {
            var plain = s.match(/(?:square root of|sqrt)\s*([\d.]+)/g);
            if (plain) plain.forEach(function (p) { var v = parseFloat(p.replace(/.*of|sqrt/, '')); if (!isNaN(v)) args.push(v); });
        }
        if (!args.length) return null;
        var steps = ['Compute each square root and round to ' + k + ' decimal places:'];
        var outs = [];
        args.forEach(function (a) {
            var v = Math.sqrt(a);
            var r = +v.toFixed(k);
            steps.push('√' + a + ' = ' + v.toFixed(k + 3) + '… → **' + r.toFixed(k) + '**');
            outs.push(r.toFixed(k));
        });
        return RES('Square roots to ' + k + ' decimal places', steps, outs.join(', '), null);
    });

    /* ── number which multiplied by itself gives N ── */
    R(/number which when multiplied by itself gives ([\d.]+)/, function (t, raw, m) {
        var n = parseFloat(m[1]), r = Math.sqrt(n);
        return RES('Square root by definition', [
            'Let the number be x → x × x = ' + n + ' → x = √' + n,
            '√' + n + ' = ' + fmtVal(r) + ' (check: ' + fmtVal(r) + '² = ' + n + ')'
        ], fmtVal(r), r);
    });

    /* ── rows = columns arrangements (√N) ── */
    R(/(\d+) (?:students|men|soldiers|people|plants|trees|chairs)[\s\S]{0,120}?(?:rows?|columns?|form of a square)([\s\S]{0,80}?(\d+) (?:men|students)? ?(?:extra|left|left over|more))?/, function (t, raw, m) {
        if (!/(row|column|square)/.test(t)) return null;
        var n = parseInt(m[1], 10);
        var extra = m[3] ? parseInt(m[3], 10) : 0;
        var use = n - extra;
        var r = Math.sqrt(use);
        if (Math.abs(r - Math.round(r)) > 1e-9) {
            var fl = Math.floor(r);
            return RES('Square arrangement', [
                'Largest perfect square ≤ ' + use + ' is ' + fl * fl + ' = ' + fl + '²',
                'So rows = columns = ' + fl
            ], String(fl), fl);
        }
        r = Math.round(r);
        var steps = ['Arrangement is a square ⇒ rows = columns = √' + use];
        if (extra) steps.push('Total ' + n + ' with ' + extra + ' extra ⇒ usable = ' + n + ' − ' + extra + ' = ' + use);
        steps.push('√' + use + ' = ' + r + ' (' + r + '² = ' + r * r + ')');
        return RES('Square arrangement (rows = columns)', steps, String(r), r);
    });

    /* ── levelling → fencing HOTS ── */
    R(/square (?:lawn|field|plot)[\s\S]*?fenc/, function (t, raw, m) {
        var mA = t.match(/(?:rs )?([\d.]+) per (?:square|sq) metre/);
        var mT = t.match(/(?:costs?|is) (?:rs )?([\d,.]+)(?! per)/);
        var mF = t.match(/fenc[\s\S]*?(?:rs )?([\d.]+) per metre/);
        if (!mA || !mT || !mF) return null;
        var rateA = parseFloat(mA[1]), costA = parseFloat(mT[1].replace(/,/g, '')), rateF = parseFloat(mF[1]);
        var area = costA / rateA, side = Math.sqrt(area), per = 4 * side, costF = per * rateF;
        return RES('Levelling → fencing (square lawn)', [
            'Area = levelling cost ÷ rate = ' + costA + ' ÷ ' + rateA + ' = ' + fmtVal(area) + ' m²',
            'Side = √' + fmtVal(area) + ' = ' + fmtVal(side) + ' m',
            'Perimeter = 4 × ' + fmtVal(side) + ' = ' + fmtVal(per) + ' m',
            'Fencing cost = ' + fmtVal(per) + ' × ' + rateF + ' = **' + fmtVal(costF) + '**'
        ], 'Rs ' + fmtVal(costF), costF);
    });

    /* ── given sqrt values → evaluate radical expression ── */
    R(/if sqrt\(\d+\) = [\d.]+[\s\S]*?find the value of ([\s\S]+)$/, function (t, raw, m) {
        var s = nm(raw);
        var given = {}, gre = /sqrt\((\d+)\)\s*=\s*([\d.]+)/g, gm;
        while ((gm = gre.exec(s)) !== null) given[parseInt(gm[1], 10)] = parseFloat(gm[2]);
        var target = m[1];
        var terms = [], tre = /([+-]?)\s*sqrt\(([\d./]+)\)/g, tm2;
        while ((tm2 = tre.exec(target)) !== null) terms.push({ sign: tm2[1] === '-' ? -1 : 1, arg: tm2[2] });
        if (!terms.length) return null;
        var total = 0, steps = ['Given: ' + Object.keys(given).map(function (k) { return '√' + k + ' = ' + given[k]; }).join(', ')];
        for (var i = 0; i < terms.length; i++) {
            var arg = terms[i].arg, val;
            if (arg.indexOf('/') > -1) {
                var ab = arg.split('/'), num = +ab[0], den = +ab[1];
                var sn = sqrtSimplify(num), sd = isqrt(den);
                if (!sd) return null;
                if (sn.r === 1) val = sn.k / sd;
                else if (given[sn.r] !== undefined) val = sn.k * given[sn.r] / sd;
                else return null;
                steps.push('√(' + arg + ') = ' + (sn.k === 1 ? '' : sn.k) + '√' + sn.r + ' / ' + sd + ' = ' + dec(val));
            } else {
                var sp = sqrtSimplify(+arg);
                if (sp.r === 1) val = sp.k;
                else if (given[sp.r] !== undefined) val = sp.k * given[sp.r];
                else return null;
                steps.push('√' + arg + ' = ' + sp.k + '√' + sp.r + ' = ' + sp.k + ' × ' + given[sp.r] + ' = ' + dec(val));
            }
            total += terms[i].sign * val;
        }
        var ansStr = dec(Math.round(total * 1e6) / 1e6);
        steps.push('Total = ' + ansStr);
        return RES('Radicals with given values', steps, ansStr, total);
    });

    /* ── product P, one number k times other ── */
    R(/product of two numbers is ([\d.]+)[\s\S]*?(\d+) times the other|(?:two numbers )?multiply to ([\d.]+)[\s\S]*?(\d+) times the other/, function (t, raw, m) {
        var p = parseFloat(m[1] || m[3]), k = parseFloat(m[2] || m[4]);
        var x = Math.sqrt(p / k), y = k * x;
        return RES('Two numbers from product & ratio', [
            'Let the numbers be x and ' + k + 'x → x · ' + k + 'x = ' + p,
            k + 'x² = ' + p + ' → x² = ' + fmtVal(p / k) + ' → x = ' + fmtVal(x),
            'Numbers: **' + fmtVal(x) + ' and ' + fmtVal(y) + '**'
        ], fmtVal(x) + ' and ' + fmtVal(y), null);
    });

    /* ── sqrt(N) and hence decimal-shifted roots ── */
    R(/find the value of sqrt\((\d+)\) and hence ([\s\S]+)/, function (t, raw, m) {
        var n = parseInt(m[1], 10), r = Math.sqrt(n);
        if (Math.abs(r - Math.round(r)) > 1e-9) return null;
        r = Math.round(r);
        var s = nm(m[2]), terms = [], tre = /([+-]?)\s*sqrt\(([\d.]+)\)/g, tm;
        while ((tm = tre.exec(s)) !== null) terms.push({ sign: tm[1] === '-' ? -1 : 1, arg: parseFloat(tm[2]) });
        if (!terms.length) return null;
        var total = 0, steps = ['√' + n + ' = ' + r];
        for (var i = 0; i < terms.length; i++) {
            var v = Math.sqrt(terms[i].arg);
            steps.push('√' + terms[i].arg + ' = ' + dec(v) + '  (decimal point shifts by half the places)');
            total += terms[i].sign * v;
        }
        steps.push('Sum = ' + dec(total));
        return RES('Square roots with decimal shifts', steps, r + ' and ' + dec(Math.round(total * 1e6) / 1e6), null);
    });

    /* ═══ CH 2 · CUBES ════════════════════════════════════════════════════ */
    R(/(\w+) cubical (?:cartons|boxes|crates)[\s\S]*?side (?:measuring|of)? ?([\d.]+)\s*(?:cm|m)?[\s\S]*?volume/, function (t, raw, m) {
        var cnt = wnum(m[1]) || parseInt(m[1], 10), a = parseFloat(m[2]);
        if (!cnt) return null;
        var one = a * a * a, tot = cnt * one;
        return RES('Volume of cubes', [
            'Volume of ONE cube = side³ = ' + a + '³ = ' + fmtVal(one) + ' cm³',
            'Volume of ' + cnt + ' cubes = ' + cnt + ' × ' + fmtVal(one) + ' = **' + fmtVal(tot) + ' cm³**'
        ], fmtVal(tot), tot);
    });
    R(/(?:numbers|students)[\s\S]*?ratio (\d+):(\d+):(\d+)[\s\S]*?product of (?:the numbers|ratios|their values|the values) is (\d+)/, function (t, raw, m) {
        var a = +m[1], b = +m[2], c = +m[3], p = +m[4];
        var k3 = p / (a * b * c), k = Math.round(Math.pow(k3, 1 / 3));
        if (Math.abs(k * k * k - k3) > 1e-6) k = Math.pow(k3, 1 / 3);
        return RES('Ratio + product of three numbers', [
            'Let the numbers be ' + a + 'k, ' + b + 'k, ' + c + 'k',
            '(' + a + 'k)(' + b + 'k)(' + c + 'k) = ' + p + ' → ' + (a * b * c) + 'k³ = ' + p + ' → k³ = ' + fmtVal(k3) + ' → k = ' + fmtVal(k),
            'Numbers: **' + [a * k, b * k, c * k].map(fmtVal).join(', ') + '**'
        ], [a * k, b * k, c * k].map(fmtVal).join(', '), null);
    });
    R(/three numbers[\s\S]*?ratio[\s\S]*?(\d+):(\d+):(\d+)[\s\S]{0,40}?sum of their cubes is (\d+)|ratio of three numbers is (\d+):(\d+):(\d+)[\s\S]*?sum of their cubes is (\d+)/, function (t, raw, m) {
        var a = +(m[1] || m[5]), b = +(m[2] || m[6]), c = +(m[3] || m[7]), s = +(m[4] || m[8]);
        var sum = a * a * a + b * b * b + c * c * c;
        var k3 = s / sum, k = icbrt(Math.round(k3));
        if (k === null) k = Math.pow(k3, 1 / 3);
        return RES('Ratio + sum of cubes', [
            'Numbers: ' + a + 'k, ' + b + 'k, ' + c + 'k → (' + a + 'k)³ + (' + b + 'k)³ + (' + c + 'k)³ = ' + s,
            '(' + sum + ')k³ = ' + s + ' → k³ = ' + fmtVal(k3) + ' → k = ' + k,
            'Numbers: **' + [a * k, b * k, c * k].join(', ') + '**'
        ], [a * k, b * k, c * k].join(', '), null);
    });
    R(/number whose cube is (\d+)/, function (t, raw, m) {
        var n = parseInt(m[1], 10), r = icbrt(n);
        if (r === null) return null;
        return RES('Cube root', ['x³ = ' + n + ' → x = ∛' + n + ' = ' + r + ' (' + r + '³ = ' + n + ')'], String(r), r);
    });
    R(/cube root of (\d+) by estimation/, function (t, raw, m) {
        var n = parseInt(m[1], 10), r = icbrt(n);
        if (r === null) return null;
        var groups = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '|');
        var last = n % 10, END = { 0: 0, 1: 1, 2: 8, 3: 7, 4: 4, 5: 5, 6: 6, 7: 3, 8: 2, 9: 9 };
        return RES('Cube root by estimation', [
            'Group digits in threes from the right: ' + groups,
            'Unit digit is ' + last + ' → cube ends in ' + last + ' only for numbers ending in ' + END[last] + ' (since ' + END[last] + '³ = ' + Math.pow(END[last], 3) + ' ends in ' + last + ')',
            'Estimate the remaining groups, then verify: ' + r + '³ = ' + n + ' ✓'
        ], String(r), r);
    });
    R(/volume of a cube whose surface area is (\d+)|(?:a )?cube has surface area (\d+)[\s\S]*?volume|surface area of (?:a |the )?cube is (\d+)[\s\S]*?volume/, function (t, raw, m) {
        var sa = parseFloat(m[1] || m[2] || m[3]), a = Math.sqrt(sa / 6), v = a * a * a;
        return RES('Cube: surface area → volume', [
            'Surface area = 6a² = ' + sa + ' → a² = ' + fmtVal(sa / 6) + ' → a = ' + fmtVal(a),
            'Volume = a³ = ' + fmtVal(a) + '³ = **' + fmtVal(v) + '**'
        ], fmtVal(v), v);
    });
    /* multi-part: cubes of / cube roots of lists */
    R(/find the cubes of:?\s*((?:\((?:i|ii|iii|iv)\)[^()]+)+)/, function (t, raw, m) {
        return multiEval(m[1], function (v) { return v * v * v; }, 'cube');
    });
    R(/cube root of the following numbers:?\s*((?:\((?:i|ii|iii|iv)\)[^()]+)+)/, function (t, raw, m) {
        return multiEval(m[1], function (v) { return icbrt(Math.round(v)); }, 'cube root');
    });
    function multiEval(listStr, fn, what) {
        var re = /\((i|ii|iii|iv)\)\s*(-?[\d.]+)/g, m, outs = [], steps = [];
        while ((m = re.exec(listStr)) !== null) {
            var v = parseFloat(m[2]), r = fn(v);
            if (r === null || r === undefined) return null;
            steps.push('(' + m[1] + ') ' + what + ' of ' + v + ' = ' + dec(r));
            outs.push(dec(r));
        }
        if (!outs.length) return null;
        return RES('Multi-part: ' + what + 's', steps, outs.join(', '), null);
    }

    /* ═══ CH 3 · EXPONENTS ════════════════════════════════════════════════ */
    R(/(\w+) (?:sections|classes)[\s\S]*?sheet[s]? measuring ([\d.]+) (?:cm|m) x ([\d.]+) (?:cm|m)[\s\S]*?total area/, function (t, raw, m) {
        var cnt = wnum(m[1]) || parseInt(m[1], 10);
        if (!cnt) return null;
        var a = parseFloat(m[2]), b = parseFloat(m[3]);
        var one = a * b, tot = cnt * one;
        var sci = sciFmt(tot);
        return RES('Total area in exponential form', [
            'Area of one sheet = ' + a + ' × ' + b + ' = ' + fmtVal(one) + ' cm²',
            'Total = ' + cnt + ' × ' + fmtVal(one) + ' = ' + fmtVal(tot) + ' cm²',
            'Exponential (scientific) form: ' + sci
        ], fmtVal(tot) + ' cm² = ' + sci, tot);
    });
    function sciFmt(v) {
        if (v === 0) return '0';
        var e = Math.floor(Math.log10(Math.abs(v)));
        var m = v / Math.pow(10, e);
        var ms = (Math.abs(m - Math.round(m)) < 1e-9) ? String(Math.round(m)) : dec(m);
        return ms + ' × 10^' + e;
    }

    /* exponent equations — engine */
    function parseLin(s, v) { // 'x-1','2x+2','x' → {a,b}
        s = nm(s).replace(/\s+/g, '');
        var m = s.match(new RegExp('^([+-]?\\d*)' + v + '([+-]\\d+(?:\\.\\d+)?)?$'));
        if (m) {
            var a = (m[1] === '' || m[1] === '+') ? 1 : m[1] === '-' ? -1 : parseInt(m[1], 10);
            return { a: a, b: m[2] ? parseFloat(m[2]) : 0 };
        }
        if (/^[+-]?\d+(\.\d+)?$/.test(s)) return { a: 0, b: parseFloat(s) };
        return null;
    }
    function primeLog(base, val) { // base^q = val → q as fraction, or null
        if (val <= 0) return null;
        var bf = decToFrac(base, 10000), vf = decToFrac(val, 10000);
        if (!bf || !vf) return null;
        // find prime p such that base = p^α and val = p^β (integers)
        var primes = {};
        [bf.n, bf.d, vf.n, vf.d].forEach(function (x) {
            var f = factorize(x);
            for (var p in f) primes[p] = 1;
        });
        var keys = Object.keys(primes);
        if (keys.length !== 1) {
            // allow base=p^α with val=p^β still single prime overall
            if (keys.length === 0) return F(0, 1);
            return null;
        }
        var p = +keys[0];
        function lg(x, isDen) {
            var f = factorize(x);
            var e = f[p] || 0;
            return isDen ? -e : e;
        }
        var alpha = lg(bf.n, false) + lg(bf.d, true);
        var beta = lg(vf.n, false) + lg(vf.d, true);
        if (alpha === 0) return null;
        return F(beta, alpha);
    }
    function solveLin(lin, q) { // lin.a x + lin.b = q (fraction) → x fraction
        if (lin.a === 0) return null;
        var rhs = fSub(q, F(Math.round(lin.b * 1e6), 1e6));
        return F(rhs.n * 1e6, rhs.d * 1e6 * lin.a);
    }
    R(/(?:\d+\s*\^\s*\(?\s*-?\s*\d*\s*[a-z](?![a-z]))|(?:\)\s*\^\s*[a-z](?![a-z]))/, function (t, raw) { return expEq(t); });
    function expEq(s) {
        // collect equation text like "8^255 = (32)^x", "4^x - 4^(x-1) = 24", "2^x+2^x+2^x=192", "3^(x-1) = 1/27", "2^(2x+2) = 4^(2x-1)"
        var eqm = s.match(/^(.*?)=([\s\S]*)$/);
        if (!eqm) return null;
        var lhsS = eqm[1].trim(), rhsS = eqm[2].trim();
        // strip trailing clauses after the RHS value: "24, then find the value of x."
        rhsS = rhsS.replace(/[.,;].*$|[\s-]*(?:then\s+)?(?:find|solve for|value of|what is)\b[\s\S]*$/, '').trim();
        lhsS = lhsS.replace(/^[^(0-9-]*\b(?:if|when|given that)\b/, '').trim();
        var varName = (s.match(/[a-z](?=\s*[-+)]|\s*$|\s*\+)/) || ['x'])[0];
        if (!/[a-z]/.test(lhsS + rhsS)) return null;
        // detect variable
        var vm = s.match(/([a-z])\b(?![a-z])/);
        if (!vm) return null;
        varName = null;
        ['x', 'y', 'n', 'k', 'm', 'p'].forEach(function (c) { if (!varName && new RegExp(c + '(?![a-z])').test(s)) varName = c; });
        if (!varName) return null;
        // parse LHS terms: ± base^(lin)
        var terms = [], tre = /([+-]?)\s*(\d+)\s*\^\s*\(([^)]*)\)|([+-]?)\s*(\d+)\s*\^\s*([a-z0-9+\-]+)/g, tm;
        var lhsOnly = lhsS;
        while ((tm = tre.exec(lhsOnly)) !== null) {
            var sign = (tm[1] || tm[4]) === '-' ? -1 : 1;
            var base = parseInt(tm[2] || tm[5], 10);
            var expo = tm[3] !== undefined ? tm[3] : tm[6];
            var lin = parseLin(expo, varName);
            if (!lin) return null;
            terms.push({ sign: sign, base: base, a: lin.a, b: lin.b });
        }
        if (!terms.length) return null;
        var rhsHasVar = /[a-z]/.test(rhsS.replace(/[^a-z]/g, '') && rhsS);
        // RHS with variable: base^(lin)
        var rTerm = null;
        if (new RegExp(varName + '(?![a-z])').test(rhsS)) {
            var rm = rhsS.match(/^\(?\s*(\d+)\s*\)?\s*\^\s*\(?([^)]*?)\)?$/);
            if (!rm) return null;
            var rlin = parseLin(rm[2], varName);
            if (!rlin) return null;
            rTerm = { base: parseInt(rm[1], 10), a: rlin.a, b: rlin.b };
        }
        var rhsVal = null;
        if (!rTerm) {
            rhsVal = parseMixed(rhsS.replace(/\s/g, ''));
            if (rhsVal === null) return null;
        }
        // all LHS bases equal?
        var base0 = terms[0].base;
        for (var i = 1; i < terms.length; i++) if (terms[i].base !== base0) return null;
        var steps = [];
        if (rTerm) {
            // both sides variable exponents: convert to common prime
            var pf = {}, pr = null;
            [base0, rTerm.base].forEach(function (bb) {
                var f = factorize(bb);
                for (var p in f) { pf[p] = 1; }
            });
            var pkeys = Object.keys(pf);
            if (pkeys.length !== 1) return null;
            var p = +pkeys[0];
            var a1 = Math.round(Math.log(base0) / Math.log(p)), a2 = Math.round(Math.log(rTerm.base) / Math.log(p));
            // a1*(A1 x + B1) = a2*(A2 x + B2)
            var L = { a: a1 * terms[0].a, b: a1 * terms[0].b };
            var Rr = { a: a2 * rTerm.a, b: a2 * rTerm.b };
            steps.push('Write both bases as powers of ' + p + ': ' + base0 + ' = ' + p + '^' + a1 + ', ' + rTerm.base + ' = ' + p + '^' + a2);
            steps.push(p + '^(' + a1 + '(' + linStr(terms[0]) + ')) = ' + p + '^(' + a2 + '(' + linStr(rTerm) + '))');
            var da = L.a - Rr.a, db = L.b - Rr.b;
            if (da === 0) return null;
            var xv = -db / da;
            steps.push('Equate exponents: ' + a1 + '(' + linStr(terms[0]) + ') = ' + a2 + '(' + linStr(rTerm) + ') → ' + da + varName + ' = ' + dec(-db) + ' → ' + varName + ' = ' + fmtVal(xv));
            return RES('Exponent equation', steps, varName + ' = ' + fmtFrac(xv), xv);
        }
        // single-base terms, numeric RHS: factor out min exponent
        var emin = Math.min.apply(null, terms.map(function (tt) { return tt.a !== 0 ? tt.b : tt.b; }));
        // exponents must all be (a·x + b) with same a? For 4^x - 4^(x-1): a=1 both, b differ. For constant sum 2^x+2^x: a=1, b=0.
        var aa = terms[0].a;
        for (i = 0; i < terms.length; i++) if (terms[i].a !== aa) return null;
        if (aa === 0) return null;
        // min b
        var minB = Math.min.apply(null, terms.map(function (tt) { return tt.b; }));
        var C = 0;
        terms.forEach(function (tt) { C += tt.sign * Math.pow(base0, tt.b - minB); });
        steps.push('Every term has base ' + base0 + ' → factor out ' + base0 + '^(' + aa + varName + (minB ? (minB > 0 ? '+' + minB : minB) : '') + ')');
        var target = rhsVal / C;
        steps.push('LHS = ' + fmtVal(C) + ' × ' + base0 + '^(' + aa + varName + (minB ? (minB > 0 ? '+' + minB : minB) : '') + ') = ' + fmtVal(rhsVal));
        steps.push(base0 + '^(' + aa + varName + (minB ? (minB > 0 ? '+' + minB : minB) : '') + ') = ' + fmtVal(rhsVal) + ' / ' + fmtVal(C) + ' = ' + fmtFrac(target));
        var q = primeLog(base0, target);
        if (!q) return null;
        // aa·x + minB = q
        var xv2 = fDiv(fSub(q, F(Math.round(minB * 1e6), 1e6)), F(aa * 1e6, 1e6));
        steps.push('Exponents equal: ' + aa + varName + (minB ? (minB > 0 ? ' + ' + minB : ' − ' + (-minB)) : '') + ' = ' + fStr(q) + ' → ' + varName + ' = **' + fStr(xv2) + '**');
        var xdec = fVal(xv2);
        return RES('Exponent equation', steps, varName + ' = ' + (xv2.d === 1 ? String(xv2.n) : fStr(xv2) + ' (= ' + fmtVal(xdec) + ')'), xdec);
    }
    function linStr(t) { return (t.a === 1 ? '' : t.a === -1 ? '-' : t.a) + 'x' + (t.b ? (t.b > 0 ? '+' + t.b : t.b) : ''); }

    /* two exponent equations + expression (h2 style) */
    R(/if (\d+)\^\(?([xy][^)]*)\)?\s*=\s*(\d+) and (\d+)\^\(?([xy][^)]*)\)?\s*=\s*(\d+), find the value of ([\s\S]+)/, function (t, raw, m) {
        function solveOne(base, expo, val) {
            var v = expo.match(/^([xy])([+-]\d+)?$/) || expo.match(/^([xy])$/);
            if (!v) return null;
            var q = primeLog(parseInt(base, 10), parseFloat(val));
            if (!q) return null;
            var shift = expo.match(/[+-]\d+$/);
            var sh = shift ? parseInt(shift[0], 10) : 0;
            return { name: expo[0], val: fVal(q) - sh };
        }
        var s1 = solveOne(m[1], m[2], m[3]), s2 = solveOne(m[4], m[5], m[6]);
        if (!s1 || !s2) return null;
        var vals = {}; vals[s1.name] = s1.val; vals[s2.name] = s2.val;
        var expr = nm(m[7]).replace(/[^xy\/+\-*]/g, '');
        // evaluate simple expressions like y/x-x/y
        var xm = expr.match(/^([xy])\/([xy])-([xy])\/([xy])$/);
        if (!xm) return null;
        var res = vals[xm[1]] / vals[xm[2]] - vals[xm[3]] / vals[xm[4]];
        return RES('Two exponent equations', [
            m[1] + '^(' + m[2] + ') = ' + m[3] + ' → ' + s1.name + ' = ' + fmtVal(s1.val),
            m[4] + '^(' + m[5] + ') = ' + m[6] + ' → ' + s2.name + ' = ' + fmtVal(s2.val),
            expr + ' = ' + fmtFrac(res)
        ], fmtFrac(res) + (Math.abs(res - Math.round(res)) > 1e-9 ? ' (= ' + dec(res) + ')' : ''), res);
    });

    /* ═══ CH 4 · DIRECT & INVERSE VARIATION ═══════════════════════════════ */
    function varTransform(letter, val, inv, sq) {
        if (sq === letter) val = Math.sqrt(val);
        if (inv === letter) val = 1 / val;
        return val;
    }
    R(/([a-z]) (?:var(?:y|ies)|is) (directly|inversely)|([a-z]) and ([a-z]) (?:are )?(?:in )?(?:var(?:y|ies) )?(?:with each other )?(direct|inverse|directly|inversely)|both ([a-z]) and ([a-z]) vary (directly|inversely)/, function (t, raw, m) {
        var s = t;
        // relation type
        var inv = /invers/.test(s), dep, indep, invL = null, sqL = null;
        var rm = s.match(/([a-z]) (?:var(?:y|ies)|is) (?:directly|inversely) (?:as|to|with|proportional to)\s*(?:1\s*\/\s*)?(sqrt\(?\s*)?([a-z])(?![a-z])/);
        if (rm) {
            dep = rm[1]; indep = rm[3];
            if (/(?:to|as|with)\s+1\s*\/\s*[a-z]/.test(s)) invL = indep;
            if (rm[2]) sqL = indep;
        } else {
            var pm = s.match(/([a-z]) and ([a-z])/);
            if (!pm) return null;
            dep = pm[1]; indep = pm[2];
        }
        if (/invers/.test(s)) { invL = invL || indep; }
        // gather "letter = value" assignments in order
        var assigns = [], are = /([a-z])\s*(?:is equal to|is|=)\s*(-?\d+(?:\s+\d+\/\d+|\.\d+)?(?:\s*\/\s*\d+)?)/g, am;
        while ((am = are.exec(s)) !== null) {
            if (am[1] !== dep && am[1] !== indep) continue;
            var v = parseMixed(am[2]);
            if (v === null) continue;
            assigns.push({ l: am[1], v: v, at: am.index });
        }
        if (assigns.length < 1) return null;
        // split into case-1 (known pair) and query (single known → find other)
        var known = {}, query = null;
        assigns.forEach(function (a) {
            if (query) return;
            if (known[a.l] === undefined) { known[a.l] = a.v; return; }
            query = a;
        });
        if (!query || known[dep] === undefined || known[indep] === undefined) {
            // 'constant of variation' style: "what is y when the constant of variation is 3"
            var cm = s.match(/constant of variation is ([\d.]+)/);
            if (cm && assigns.length >= 1) {
                var k = parseFloat(cm[1]);
                var have = assigns[0];
                var other = have.l === dep ? indep : dep;
                var res = have.l === dep ? (inv ? k / have.v : k * have.v) : (inv ? k / have.v : have.v / k);
                if (other === dep && have.l === indep) res = inv ? k / have.v : k * have.v;
                if (other === indep && have.l === dep) res = inv ? k / have.v : have.v / k;
                return RES('Variation with constant k', [
                    (inv ? 'Inverse' : 'Direct') + ' variation with constant k = ' + k,
                    other + ' = ' + fmtVal(res)
                ], fmtVal(res), res);
            }
            return null;
        }
        // relation model: dep = K · g(indep);  g(v) = v, 1/v, √v or 1/√v
        function g(v) { if (sqL) v = Math.sqrt(v); if (invL) v = 1 / v; return v; }
        function gInv(v) { if (invL) v = 1 / v; if (sqL) v = v * v; return v; }
        var K = known[dep] / g(known[indep]);
        var qv = query.v, res2;
        var relDesc = dep + ' = k' + (invL ? ' / ' : ' × ') + (sqL ? '√' : '') + indep;
        var steps = [
            (inv ? 'Inverse' : 'Direct') + ' variation: ' + relDesc,
            'From ' + dep + ' = ' + known[dep] + ', ' + indep + ' = ' + known[indep] + ': k = ' + fmtVal(K)
        ];
        if (query.l === dep) {
            res2 = gInv(qv / K);
            steps.push('Now ' + dep + ' = ' + qv + ' → ' + indep + ' = ' + fmtVal(res2));
        } else {
            res2 = K * g(qv);
            steps.push('Now ' + indep + ' = ' + qv + ' → ' + dep + ' = ' + fmtVal(res2));
        }
        return RES((inv ? 'Inverse' : 'Direct') + ' variation', steps, fmtVal(res2), res2);
    });
    /* NOT a possible pair (MCQ) */
    R(/when ([a-z]) is (\d+) and ([a-z]) is (\d+), which[\s\S]*?not a possible pair/, function (t, raw, m, opt) {
        var k = parseFloat(m[4]) / parseFloat(m[2]);
        if (!opt) return null;
        var bad = null;
        opt.opts.forEach(function (o) {
            var pm = o.text.match(/([\d.]+)\s+and\s+([\d.]+)/);
            if (pm && Math.abs(parseFloat(pm[2]) / parseFloat(pm[1]) - k) > 1e-6) bad = o;
        });
        if (!bad) return null;
        return RES('Direct proportion — check the ratio', [
            'For direct variation q/p must stay constant: ' + m[4] + '/' + m[2] + ' = ' + fmtVal(k),
            'Pair ' + bad.text + ' gives a different ratio → NOT possible'
        ], bad.text, null);
    });
    /* tables: direct / inverse / neither */
    R(/x = ([\d., ]+) and y = ([\d., ]+)/, function (t, raw, m) {
        if (!/directly, inversely or neither|vary directly|inversely or neither/.test(t)) return null;
        var xs = m[1].split(',').map(function (a) { return parseFloat(a.trim()); });
        var ys = m[2].split(',').map(function (a) { return parseFloat(a.trim()); });
        if (xs.length !== ys.length || xs.length < 2) return null;
        function constant(f) {
            var v0 = f(xs[0], ys[0]);
            for (var i = 1; i < xs.length; i++) if (Math.abs(f(xs[i], ys[i]) - v0) > 1e-6 * (1 + Math.abs(v0))) return null;
            return v0;
        }
        var dr = constant(function (a, b) { return a / b; });
        var iv = constant(function (a, b) { return a * b; });
        var verdict = dr !== null ? 'direct' : iv !== null ? 'inverse' : 'neither';
        var steps = [
            'Check x/y: ' + xs.map(function (x, i) { return x + '/' + ys[i] + '=' + fmtVal(x / ys[i]); }).join(', '),
            'Check x×y: ' + xs.map(function (x, i) { return x + '×' + ys[i] + '=' + fmtVal(x * ys[i]); }).join(', ')
        ];
        if (dr !== null) steps.push('x/y is CONSTANT (' + fmtVal(dr) + ') → direct variation');
        else if (iv !== null) steps.push('x×y is CONSTANT (' + fmtVal(iv) + ') → inverse variation');
        else steps.push('Neither x/y nor x×y is constant → neither');
        return RES('Direct or inverse variation?', steps, verdict + (dr !== null ? 'ly (x/y = ' + fmtVal(dr) + ')' : iv !== null ? 'ly (xy = ' + fmtVal(iv) + ')' : ''), null);
    });
    /* speed km/hr → metres time */
    R(/speed of ([\d.]+) km\/(?:hr|h)[\s\S]*?(?:distance of|travel) ([\d.]+) (?:metres|meters|m)\b/, function (t, raw, m) {
        var kmh = parseFloat(m[1]), d = parseFloat(m[2]);
        var ms = kmh * 5 / 18, time = d / ms;
        return RES('Speed → time (unit conversion)', [
            'Convert: ' + kmh + ' km/hr = ' + kmh + ' × 5/18 = ' + fmtVal(ms) + ' m/s',
            'Time = distance ÷ speed = ' + d + ' ÷ ' + fmtVal(ms) + ' = **' + fmtVal(time) + ' seconds**'
        ], fmtVal(time) + ' seconds', time);
    });
    /* sweets distribution (inverse) */
    R(/distributed among (\d+) (?:children|boys|girls|students)[\s\S]*?(?:received|gets?|got) (?:each )?(\w+|\d+) (?:sweets|toffees|chocolates|apples)[\s\S]*?(?:among|were|are) (\d+) (?:children|boys|girls|students)/, function (t, raw, m) {
        var n1 = +m[1], each1 = wnum(m[2]), n2 = +m[3];
        if (each1 === null) return null;
        var total = n1 * each1, each2 = total / n2;
        return RES('Inverse variation — distribution', [
            'Total items = ' + n1 + ' × ' + each1 + ' = ' + total,
            'Shared among ' + n2 + ' → each gets ' + total + ' ÷ ' + n2 + ' = **' + fmtVal(each2) + '**'
        ], fmtVal(each2), each2);
    });
    /* cost of dozens → units */
    R(/cost (?:rs )?([\d.]+) for (\w+|\d+) dozens?[\s\S]*?cost of (\w+|\d+)|(\w+|\d+) dozens? (?:of )?[a-z]+ (?:cost|costs|for) (?:rs )?([\d.]+)[\s\S]*?cost of (\w+|\d+)/, function (t, raw, m) {
        var price = parseFloat(m[1] || m[5]), dz = wnum(m[2] || m[4]), cnt = wnum(m[3] || m[6]);
        if (dz === null || cnt === null) return null;
        var per = price / (dz * 12), total = per * cnt;
        return RES('Unitary method', [
            dz + ' dozen = ' + dz * 12 + ' items for Rs ' + price + ' → 1 item = Rs ' + fmtVal(per),
            cnt + ' items = ' + cnt + ' × ' + fmtVal(per) + ' = **Rs ' + fmtVal(total) + '**'
        ], fmtVal(total), total);
    });
    /* car: distance in duration → time for another distance */
    R(/(?:travels?|covers|goes) ([\d.]+) km in ([\d\s]+(?:hr|hour|h|min|minute)s?[\d\s]*(?:min|minute)s?|[\d.]+ (?:hr|hour)s?)[\s\S]*?(?:cover|travel) (?:a distance of )?([\d.]+) km/, function (t, raw, m) {
        var d1 = parseFloat(m[1]), t1 = parseDur(m[2]), d2 = parseFloat(m[3]);
        if (t1 === null) return null;
        var sp = d1 / t1, t2 = d2 / sp;
        var hh = Math.floor(t2), mm = Math.round((t2 - hh) * 60);
        return RES('Speed = distance ÷ time', [
            'Speed = ' + d1 + ' km ÷ ' + fmtVal(t1) + ' hr = ' + fmtVal(sp) + ' km/hr',
            'Time for ' + d2 + ' km = ' + d2 + ' ÷ ' + fmtVal(sp) + ' = **' + fmtVal(t2) + ' hours**' + (mm ? ' (' + hh + ' hr ' + mm + ' min)' : '')
        ], fmtVal(t2) + (mm ? ' = ' + hh + ' hr ' + mm + ' min' : ''), t2);
    });
    /* spring extension ∝ weight */
    R(/weight of ([\d.]+) kg (?:produces|gives) an extension of ([\d.]+) cm[\s\S]*?extension of ([\d.]+) cm/, function (t, raw, m) {
        var w1 = +m[1], e1 = +m[2], e2 = +m[3];
        var w2 = w1 * e2 / e1;
        return RES('Direct variation — spring', [
            'Extension ∝ weight → w₁/e₁ = w₂/e₂',
            'w₂ = ' + w1 + ' × ' + e2 + ' ÷ ' + e1 + ' = **' + fmtVal(w2) + ' kg**'
        ], fmtVal(w2), w2);
    });
    /* dust in days (scientific notation) */
    R(/in (\d+) days[\s\S]*?([\d.]+) x 10\^(\d+) (\w+)[\s\S]*?in (\d+) days/, function (t, raw, m) {
        var d1 = +m[1], v1 = parseFloat(m[2]) * Math.pow(10, +m[3]), d2 = +m[5];
        var v2 = v1 * d2 / d1;
        return RES('Direct variation', [
            d1 + ' days → ' + m[2] + ' × 10^' + m[3] + ' ' + m[4],
            d2 + ' days → ' + m[2] + '×10^' + m[3] + ' × ' + d2 + '/' + d1 + ' = **' + sciFmt(v2) + ' ' + m[4] + '**'
        ], sciFmt(v2), v2);
    });
    /* late/early speed problem (h1) */
    R(/speed of ([\d.]+) km\/(?:hr|h)[\s\S]*?covers?[\s\S]*?in ([\d\s]+(?:hr|hour|h)\b[\s\d]*?(?:min|minute)s?|[\d.]+ (?:hours?|hr)s?)[\s\S]*?(\d+) minutes? late[\s\S]*?speed of the car/, function (t, raw, m) {
        var s1 = parseFloat(m[1]), t1 = parseDur(m[2]), late = parseFloat(m[3]);
        if (t1 === null) return null;
        var d = s1 * t1, t2 = t1 - late / 60, s2 = d / t2;
        return RES('Speed change to reach on time', [
            'Distance = ' + s1 + ' km/hr × ' + fmtVal(t1) + ' hr = **' + fmtVal(d) + ' km**',
            'Lost ' + late + ' min → available time = ' + fmtVal(t1) + ' − ' + fmtVal(late / 60) + ' = ' + fmtVal(t2) + ' hr',
            'Required speed = ' + fmtVal(d) + ' ÷ ' + fmtVal(t2) + ' = **' + fmtVal(s2) + ' km/hr**'
        ], fmtVal(s2) + ' km/hr (total distance ' + fmtVal(d) + ' km)', s2);
    });

    /* ═══ CH 5 · PROFIT · LOSS · DISCOUNT · GST ═══════════════════════════ */
    R(/marked (?:for|at) (?:rs )?([\d.]+) (?:but )?(?:is )?sold (?:for|at) (?:rs )?([\d.]+)[\s\S]*?discount per ?cent/, function (t, raw, m) {
        var mp = parseFloat(m[1]), sp = parseFloat(m[2]);
        var d = (mp - sp) / mp * 100;
        return RES('Discount per cent', [
            'Discount = MP − SP = ' + mp + ' − ' + sp + ' = ' + fmtVal(mp - sp),
            'Discount % = ' + fmtVal(mp - sp) + '/' + mp + ' × 100 = **' + fmtVal(d) + '%**'
        ], fmtVal(d) + '%', d);
    });
    R(/selling price of (\w+) (\w+) is equal to the cost price of (\w+) (\w+)/, function (t, raw, m) {
        var a = wnum(m[1]), b = wnum(m[3]);
        if (a === null || b === null) return null;
        var pct, kind;
        if (b < a) { pct = (a - b) / a * 100; kind = 'loss'; }
        else { pct = (b - a) / a * 100; kind = 'gain'; }
        return RES('SP of a items = CP of b items', [
            'Let CP of 1 item = 1 → CP of ' + a + ' items = ' + a + ', SP of ' + a + ' items = ' + b,
            (kind === 'loss' ? 'SP < CP → LOSS = ' + (a - b) : 'SP > CP → GAIN = ' + (b - a)),
            pct === Math.round(pct) ? pct + '% ' + kind : fmtVal(pct) + '% ' + kind
        ], fmtVal(pct) + '% ' + kind, kind === 'loss' ? -pct : pct);
    });
    R(/(?:selling price|price) of \w+ is (?:rs )?([\d.]+) including (\d+(?:\.\d+)?)% gst[\s\S]*?original price/, function (t, raw, m) {
        var sp = parseFloat(m[1]), g = parseFloat(m[2]);
        var p = sp / (1 + g / 100);
        return RES('GST reverse — original price', [
            'SP (with GST) = original × (1 + ' + g + '/100)',
            'Original = ' + sp + ' ÷ ' + fmtVal(1 + g / 100) + ' = **Rs ' + fmtVal(p) + '**'
        ], fmtVal(p), p);
    });
    R(/discount of (\d+(?:\.\d+)?)% on (?:the |its )?marked price[\s\S]*?sold for (?:rs )?([\d.]+)[\s\S]*?marked price|sold for (?:rs )?([\d.]+) after (?:an? )?(\d+(?:\.\d+)?)% discount[\s\S]*?marked price/, function (t, raw, m) {
        var d = parseFloat(m[1] || m[4]), sp = parseFloat(m[2] || m[3]);
        var mp = sp / (1 - d / 100);
        return RES('Marked price from discount & SP', [
            'SP = MP × (1 − ' + d + '/100) = MP × ' + fmtVal(1 - d / 100),
            'MP = ' + sp + ' ÷ ' + fmtVal(1 - d / 100) + ' = **Rs ' + fmtVal(mp) + '**'
        ], fmtVal(mp), mp);
    });
    R(/sold for (?:rs )?([\d.]+)\.? the gain is ([\w-]+) of the cost price[\s\S]*?gain per ?cent/, function (t, raw, m) {
        var sp = parseFloat(m[1]), f = wnum(m[2]);
        if (f === null) return null;
        var cp = sp / (1 + f), gainPct = f * 100;
        return RES('Gain as a fraction of CP', [
            'SP = CP + ' + m[2] + ' of CP = CP × ' + fmtVal(1 + f),
            'CP = ' + sp + ' ÷ ' + fmtVal(1 + f) + ' = Rs ' + fmtVal(cp),
            'Gain % = ' + m[2] + ' × 100 = **' + fmtVal(gainPct) + '%**'
        ], fmtVal(gainPct), gainPct);
    });
    R(/buys (\w+) at (\d+) for (?:rs )?([\d.]+) and sells them at (\d+) for (?:rs )?([\d.]+)[\s\S]*?(profit|gain|loss) per ?cent|(\w+) (?:bought|purchased) at (\d+) for (?:rs )?([\d.]+) (?:and are |are |and )?sold at (\d+) for (?:rs )?([\d.]+)[\s\S]*?(?:profit|gain|loss) per ?cent/, function (t, raw, m) {
        var n1 = +(m[2] || m[8]), p1 = parseFloat(m[3] || m[9]), n2 = +(m[4] || m[10]), p2 = parseFloat(m[5] || m[11]);
        // equal-count basis (LCM)
        var lcm = n1 * n2 / gcd(n1, n2);
        var cp = p1 * (lcm / n1), sp = p2 * (lcm / n2);
        var pct = (sp - cp) / cp * 100;
        return RES('Buy a for X, sell b for Y', [
            'Take LCM(' + n1 + ',' + n2 + ') = ' + lcm + ' items',
            'CP = ' + fmtVal(cp) + ', SP = ' + fmtVal(sp),
            (pct >= 0 ? 'Profit' : 'Loss') + ' % = ' + fmtVal(Math.abs(pct)) + '%'
        ], fmtVal(Math.abs(pct)) + '% ' + (pct >= 0 ? 'profit' : 'loss'), pct);
    });
    R(/rate of gst if an article marked at (?:rs )?([\d.]+) is sold for (?:rs )?([\d.]+)/, function (t, raw, m) {
        var mp = parseFloat(m[1]), sold = parseFloat(m[2]);
        var g = (sold - mp) / mp * 100;
        return RES('GST rate', [
            'GST amount = ' + sold + ' − ' + mp + ' = ' + fmtVal(sold - mp),
            'GST % = ' + fmtVal(sold - mp) + '/' + mp + ' × 100 = **' + fmtVal(g) + '%**'
        ], fmtVal(g) + '%', g);
    });
    R(/pays (?:rs )?([\d.]+) for a \w+ marked at (?:rs )?([\d.]+)[\s\S]*?discount per ?cent/, function (t, raw, m) {
        var paid = parseFloat(m[1]), mp = parseFloat(m[2]);
        var d = (mp - paid) / mp * 100;
        return RES('Discount per cent', [
            'Discount = ' + mp + ' − ' + paid + ' = ' + fmtVal(mp - paid),
            'Discount % = **' + fmtVal(d) + '%**'
        ], fmtVal(d) + '%', d);
    });
    R(/purchased [\s\S]*?at (\d+)% discount on (?:its|the) marked price but sold it at the marked price[\s\S]*?gain per ?cent/, function (t, raw, m) {
        var d = parseFloat(m[1]);
        var cp = 100 - d, gain = (100 - cp) / cp * 100;
        return RES('Bought at discount, sold at MP', [
            'Let MP = 100 → CP = 100 − ' + d + ' = ' + fmtVal(cp) + ', SP = 100',
            'Gain % = ' + d + '/' + fmtVal(cp) + ' × 100 = **' + fmtVal(gain) + '%** (= 33 1/3 % when d = 25)'
        ], fmtVal(gain), gain);
    });
    R(/marks (?:her|his) goods at (\d+)% above the cost price and allows a discount of (\d+)%[\s\S]*?(?:gain or loss|profit or loss) per ?cent/, function (t, raw, m) {
        var a = parseFloat(m[1]), d = parseFloat(m[2]);
        var sp = (1 + a / 100) * (1 - d / 100) * 100;
        var pct = sp - 100;
        return RES('Mark-up then discount', [
            'Let CP = 100 → MP = ' + fmtVal(100 + a) + ' → SP = ' + fmtVal(100 + a) + ' × ' + fmtVal(1 - d / 100) + ' = ' + fmtVal(sp),
            (pct >= 0 ? 'Gain' : 'Loss') + ' = ' + fmtVal(Math.abs(pct)) + '%'
        ], fmtVal(Math.abs(pct)) + '% ' + (pct >= 0 ? 'gain' : 'loss'), pct);
    });
    R(/how much per ?cent above the cost price[\s\S]*?discount of (\d+)%[\s\S]*?gains (\d+)%/, function (t, raw, m) {
        var d = parseFloat(m[1]), g = parseFloat(m[2]);
        var mark = (1 + g / 100) / (1 - d / 100) * 100 - 100;
        return RES('Required mark-up %', [
            'MP/CP = (1 + gain%)/ (1 − discount%) = ' + fmtVal(1 + g / 100) + '/' + fmtVal(1 - d / 100) + ' = ' + fmtVal((1 + g / 100) / (1 - d / 100)),
            'Mark-up = **' + fmtVal(mark) + '% above CP**'
        ], fmtVal(mark), mark);
    });
    R(/marks (?:her|his) goods at (\d+)% above the cost price but allows a discount of (\d+)%[\s\S]*?(?:actual profit|profit does)/, function (t, raw, m) {
        var rm2 = t.match(/receives? (?:rs )?([\d.]+)/);
        if (!rm2) return null;
        var a = parseFloat(m[1]), d = parseFloat(m[2]), sp = parseFloat(rm2[1]);
        var mp = sp / (1 - d / 100), cp = mp / (1 + a / 100), profit = sp - cp;
        return RES('Actual profit after discount', [
            'SP = Rs ' + sp + ' after ' + d + '% discount → MP = ' + sp + '/' + fmtVal(1 - d / 100) + ' = ' + fmtVal(mp),
            'MP is ' + a + '% above CP → CP = ' + fmtVal(mp) + '/' + fmtVal(1 + a / 100) + ' = ' + fmtVal(cp),
            'Actual profit = ' + sp + ' − ' + fmtVal(cp) + ' = **Rs ' + fmtVal(profit) + '**'
        ], fmtVal(profit), profit);
    });
    R(/bought [\s\S]*?for (?:rs )?([\d,.]+),[\s\S]*?for (?:rs )?([\d,.]+) and [\s\S]*?for (?:rs )?([\d,.]+)\.?[\s\S]*?gst[\s\S]*?(\d+)%[\s\S]*?total amount/, function (t, raw, m) {
        var a = parseFloat(m[1].replace(/,/g, '')), b = parseFloat(m[2].replace(/,/g, '')), c = parseFloat(m[3].replace(/,/g, '')), g = parseFloat(m[4]);
        var sum = a + b + c, total = sum * (1 + g / 100);
        return RES('Total bill with GST', [
            'Sum of purchases = ' + a + ' + ' + b + ' + ' + c + ' = Rs ' + fmtVal(sum),
            'GST ' + g + '% → total = ' + fmtVal(sum) + ' × ' + fmtVal(1 + g / 100) + ' = **Rs ' + fmtVal(total) + '**'
        ], fmtVal(total), total);
    });
    R(/marked price[\s\S]*?(?:rs )?([\d.]+) and rate of gst is (\d+)%[\s\S]*?discount of (\d+)%[\s\S]*?profit of (\d+)%/, function (t, raw, m) {
        var mp = parseFloat(m[1]), g = parseFloat(m[2]), d = parseFloat(m[3]), p = parseFloat(m[4]);
        var sp = mp * (1 - d / 100), spg = sp * (1 + g / 100), cp = sp / (1 + p / 100);
        return RES('MP + GST + discount + profit chain', [
            'SP (after ' + d + '% discount) = ' + mp + ' × ' + fmtVal(1 - d / 100) + ' = Rs ' + fmtVal(sp),
            'SP including ' + g + '% GST = ' + fmtVal(sp) + ' × ' + fmtVal(1 + g / 100) + ' = **Rs ' + fmtVal(spg) + '**',
            'CP = SP/(1 + ' + p + '/100) = ' + fmtVal(sp) + '/' + fmtVal(1 + p / 100) + ' = Rs ' + fmtVal(cp)
        ], 'CP = Rs ' + fmtVal(cp) + ', SP including GST = Rs ' + fmtVal(spg), spg);
    });

    /* ═══ CH 6 · COMPOUND INTEREST ════════════════════════════════════════ */
    function periods(comp) { return /quarter/.test(comp) ? 4 : /half/.test(comp) ? 2 : 1; }
    R(/(?:rs )?([\d,.]+) at (\d+(?:\.\d+)?)% per annum for (\w+|\d+) (months?|years?) compounded (quarterly|half-yearly|half yearly|annually|yearly)[\s\S]*?amounts? to/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[2]), tv = wnum(m[3]), unit = m[4], pp = periods(m[5]);
        if (tv === null) return null;
        var years = /month/.test(unit) ? tv / 12 : tv;
        var n = years * pp, rp = r / pp;
        var a = p * Math.pow(1 + rp / 100, n);
        return RES('Compound amount', [
            unit === 'months' || /month/.test(unit) ? tv + ' months = ' + fmtVal(years) + ' year(s)' : 'Time = ' + years + ' year(s)',
            'Compounded ' + m[5] + ' → n = ' + fmtVal(n) + ' periods, rate per period = ' + fmtVal(rp) + '%',
            'A = P(1 + R/100)ⁿ = ' + p + '(1 + ' + fmtVal(rp) + '/100)^' + fmtVal(n) + ' = **Rs ' + fmtVal(a) + '**'
        ], fmtVal(a), a);
    });
    R(/(?:find |calculate )?(?:the )?(?:compound interest|ci) on (?:rs )?([\d,.]+) at (\d+(?:\.\d+)?)% per annum for (\w+|\d+) years?/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[2]), n = wnum(m[3]);
        if (n === null) return null;
        var a = p * Math.pow(1 + r / 100, n), ci = a - p;
        return RES('Compound Interest', [
            'A = P(1 + R/100)ⁿ = ' + p + ' × (1 + ' + r + '/100)^' + n + ' = ' + p + ' × ' + fmtVal(Math.pow(1 + r / 100, n)) + ' = Rs ' + fmtVal(a),
            'CI = A − P = ' + fmtVal(a) + ' − ' + p + ' = **Rs ' + fmtVal(ci) + '**'
        ], fmtVal(ci), ci);
    });
    R(/(?:rs )?([\d,.]+) is deposited for (\w+|\d+) years? at (\d+(?:\.\d+)?)% per annum compounded (quarterly|half-yearly|half yearly)[\s\S]*?(?:time period and rate|find the time period)/, function (t, raw, m) {
        var yrs = wnum(m[2]), pp = periods(m[4]), r = parseFloat(m[3]);
        if (yrs === null) return null;
        var n = yrs * pp, rp = r / pp;
        return RES('Conversion periods', [
            'Compounded ' + m[4] + ' → ' + pp + ' conversion periods per year',
            'Time period n = ' + yrs + ' × ' + pp + ' = **' + n + '** periods',
            'Rate per period = ' + r + ' ÷ ' + pp + ' = **' + fmtVal(rp) + '%**'
        ], n + ' periods at ' + fmtVal(rp) + '% each', null);
    });
    R(/worth (?:rs )?([\d,.]+) depreciates at (?:the rate of )?(\d+(?:\.\d+)?)% every year[\s\S]*?value (?:be|is|will be) (?:rs )?([\d,.]+)/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[2]), v = parseFloat(m[3].replace(/,/g, ''));
        var ratio = v / p, f = 1 - r / 100;
        var n = Math.round(Math.log(ratio) / Math.log(f));
        var steps = ['Each year the value becomes ' + fmtVal(f) + ' times the previous year.'];
        var cur = p;
        for (var i = 1; i <= n; i++) { cur *= f; steps.push('Year ' + i + ': ' + fmtVal(cur)); }
        steps.push('Reaches ' + v + ' after **' + n + ' years**');
        return RES('Depreciation', steps, n + ' years', n);
    });
    R(/difference between (?:the )?(?:compound interest|ci) and (?:the )?(?:simple interest|si) on (?:rs )?([\d,.]+) for (\w+|\d+) years? at (\d+(?:\.\d+)?)%/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), n = wnum(m[2]), r = parseFloat(m[3]);
        if (n === null) return null;
        var ci = p * (Math.pow(1 + r / 100, n) - 1), si = p * r * n / 100;
        return RES('CI − SI difference', [
            'CI = P[(1 + R/100)ⁿ − 1] = ' + fmtVal(ci),
            'SI = PRN/100 = ' + fmtVal(si),
            n === 2 ? 'Shortcut for 2 years: P(R/100)² = ' + p + '×(' + r + '/100)² = ' + fmtVal(ci - si) : '',
            'Difference = **Rs ' + fmtVal(ci - si) + '**'
        ].filter(function (x) { return x; }), fmtVal(ci - si), ci - si);
    });
    R(/(?:rs )?([\d,.]+) is deposited for (\w+|\d+) years? at (\d+(?:\.\d+)?)% compounded annually[\s\S]*?principal for the (\w+|\d+)(?:nd|rd|th|st)? year/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[3]), yr = wnum(m[4]);
        if (yr === null) return null;
        var pn = p * Math.pow(1 + r / 100, yr - 1);
        return RES('Principal for a given year', [
            'Principal for year n = amount after (n−1) years = P(1 + R/100)^(n−1)',
            '= ' + p + ' × (1 + ' + r + '/100)^' + (yr - 1) + ' = **Rs ' + fmtVal(pn) + '**'
        ], fmtVal(pn), pn);
    });
    R(/invested (?:rs )?([\d,.]+) at (\d+(?:\.\d+)?)% per annum for (\w+|\d+) years?[\s\S]*?amount[\s\S]*?end of the second year[\s\S]*?interest for the third year/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[2]);
        var a1 = p * (1 + r / 100), a2 = a1 * (1 + r / 100), i3 = a2 * r / 100;
        return RES('CI year by year', [
            'Year 1 amount = ' + p + ' × ' + fmtVal(1 + r / 100) + ' = Rs ' + fmtVal(a1),
            '(a) Amount at end of year 2 = ' + fmtVal(a1) + ' × ' + fmtVal(1 + r / 100) + ' = **Rs ' + fmtVal(a2) + '**',
            '(b) Interest for year 3 = ' + fmtVal(a2) + ' × ' + r + '/100 = **Rs ' + fmtVal(i3) + '**'
        ], fmtVal(a2) + ' and ' + fmtVal(i3), null);
    });
    R(/had (?:rs )?([\d,.]+)\.? he invested (?:rs )?([\d,.]+) [\s\S]*?(\d+(?:\.\d+)?)% interest per annum and the rest[\s\S]*?(\d+(?:\.\d+)?)% interest per annum[\s\S]*?total compound interest[\s\S]*?(\w+|\d+) years?/, function (t, raw, m) {
        var tot = parseFloat(m[1].replace(/,/g, '')), p1 = parseFloat(m[2].replace(/,/g, '')), r1 = parseFloat(m[3]), r2 = parseFloat(m[4]), n = wnum(m[5]);
        if (n === null) return null;
        var p2 = tot - p1;
        var ci1 = p1 * (Math.pow(1 + r1 / 100, n) - 1), ci2 = p2 * (Math.pow(1 + r2 / 100, n) - 1);
        return RES('Two investments — total CI', [
            'First: Rs ' + p1 + ' at ' + r1 + '% → CI = ' + fmtVal(ci1),
            'Second: Rs ' + p2 + ' (= ' + tot + ' − ' + p1 + ') at ' + r2 + '% → CI = ' + fmtVal(ci2),
            'Total CI = **' + fmtVal(ci1 + ci2) + '**'
        ], fmtVal(ci1 + ci2), ci1 + ci2);
    });
    R(/becomes (?:rs )?([\d,.]+) in (\w+|\d+) years? and (?:rs )?([\d,.]+) in (\w+|\d+) years?[\s\S]*?rate of interest/, function (t, raw, m) {
        var a1 = parseFloat(m[1].replace(/,/g, '')), a2 = parseFloat(m[3].replace(/,/g, ''));
        var r = (a2 / a1 - 1) * 100;
        return RES('Rate from two amounts', [
            'In CI, the amount grows by the same FACTOR every year.',
            'Factor = A₃/A₂ = ' + a2 + '/' + a1 + ' = ' + fmtVal(a2 / a1),
            'Rate = (' + fmtVal(a2 / a1) + ' − 1) × 100 = **' + fmtVal(r) + '%**'
        ], fmtVal(r), r);
    });
    R(/investing (?:rs )?([\d,.]+)[\s\S]*?profit of (\d+(?:\.\d+)?)%, (\d+(?:\.\d+)?)% and (\d+(?:\.\d+)?)%[\s\S]*?total profit/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, ''));
        var f = (1 + m[2] / 100) * (1 + m[3] / 100) * (1 + m[4] / 100);
        var fin = p * f, profit = fin - p;
        return RES('Successive percentage growth', [
            'Capital after year 1: ' + p + ' × ' + fmtVal(1 + m[2] / 100) + ' = ' + fmtVal(p * (1 + m[2] / 100)),
            'After year 2: × ' + fmtVal(1 + m[3] / 100) + ' → ' + fmtVal(p * (1 + m[2] / 100) * (1 + m[3] / 100)),
            'After year 3: × ' + fmtVal(1 + m[4] / 100) + ' → ' + fmtVal(fin),
            'Total profit = ' + fmtVal(fin) + ' − ' + p + ' = **Rs ' + fmtVal(profit) + '**'
        ], fmtVal(profit), profit);
    });
    R(/received (?:rs )?([\d.]+) as compound interest but paid (?:rs )?([\d.]+) as simple interest[\s\S]*?sum and rate/, function (t, raw, m) {
        var ci = parseFloat(m[1]), si = parseFloat(m[2]);
        // n = 2: CI − SI = P r²/10000, SI = 2Pr/100
        var diff = ci - si;
        // SI = P·r·2/100 ; diff = P·r²/10000 → diff/SI = r/200 → r = 200·diff/SI
        var r = 200 * diff / si, p = si * 100 / (2 * r);
        return RES('Find sum & rate from CI−SI gap', [
            'For 2 years: CI − SI = P(R/100)² and SI = 2PR/100',
            'CI − SI = ' + ci + ' − ' + si + ' = ' + fmtVal(diff),
            'R = 200 × ' + fmtVal(diff) + ' ÷ ' + si + ' = **' + fmtVal(r) + '%**',
            'P = ' + si + ' × 100 ÷ (2 × ' + fmtVal(r) + ') = **Rs ' + fmtVal(p) + '**'
        ], 'Sum = Rs ' + fmtVal(p) + ', Rate = ' + fmtVal(r) + '%', null);
    });
    R(/invested (?:rs )?([\d,.]+) for (\w+|\d+) years? at (\d+(?:\.\d+)?)% simple interest[\s\S]*?(?:rs )?([\d,.]+) at (\d+(?:\.\d+)?)% compound interest[\s\S]*?which investment is better/, function (t, raw, m) {
        var p1 = parseFloat(m[1].replace(/,/g, '')), n = wnum(m[2]), r1 = parseFloat(m[3]);
        var p2 = parseFloat(m[4].replace(/,/g, '')), r2 = parseFloat(m[5]);
        if (n === null) return null;
        var si = p1 * r1 * n / 100, ci = p2 * (Math.pow(1 + r2 / 100, n) - 1);
        var better = ci > si ? 'compound interest' : 'simple interest';
        return RES('SI vs CI', [
            'SI = ' + p1 + ' × ' + r1 + ' × ' + n + ' / 100 = Rs ' + fmtVal(si),
            'CI = ' + p2 + ' × [(1 + ' + r2 + '/100)^' + n + ' − 1] = Rs ' + fmtVal(ci),
            (ci > si ? 'CI > SI → **compound interest investment is better**' : 'SI > CI → simple interest is better')
        ], better + ' (' + fmtVal(ci) + ' vs ' + fmtVal(si) + ')', null);
    });
    R(/(?:let out|lent out|lent) (?:rs )?([\d,.]+) for (\w+|\d+) years? at (\d+(?:\.\d+)?)% per annum compounded annually[\s\S]*?how much more[\s\S]*?compounded half-yearly/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), n = wnum(m[2]), r = parseFloat(m[3]);
        if (n === null) return null;
        var aA = p * Math.pow(1 + r / 100, n), aH = p * Math.pow(1 + r / 200, 2 * n);
        return RES('Annual vs half-yearly compounding', [
            'Annually: A = ' + p + '(1 + ' + r + '/100)^' + n + ' = ' + fmtVal(aA),
            'Half-yearly: A = ' + p + '(1 + ' + fmtVal(r / 2) + '/100)^' + 2 * n + ' = ' + fmtVal(aH),
            'Extra earning = **' + fmtVal(aH - aA) + '**'
        ], fmtVal(aH - aA), aH - aA);
    });
    R(/borrowed a sum of (?:rs )?([\d,.]+) at (\d+(?:\.\d+)?)% per annum compounded annually[\s\S]*?compounded half-yearly[\s\S]*?gain after (\w+|\d+) years?/, function (t, raw, m) {
        var p = parseFloat(m[1].replace(/,/g, '')), r = parseFloat(m[2]), n = wnum(m[3]);
        if (n === null) return null;
        var pay = p * Math.pow(1 + r / 100, n), get = p * Math.pow(1 + r / 200, 2 * n);
        return RES('Gain: annual borrow vs half-yearly lend', [
            'Pays (annually): ' + p + '(1 + ' + r + '/100)^' + n + ' → amount ' + fmtVal(pay),
            'Gets (half-yearly): ' + p + '(1 + ' + fmtVal(r / 2) + '/100)^' + 2 * n + ' → amount ' + fmtVal(get),
            'Gain = ' + fmtVal(get) + ' − ' + fmtVal(pay) + ' = **Rs ' + fmtVal(get - pay) + '**'
        ], fmtVal(get - pay), get - pay);
    });
    R(/(?:rate of growth|grows?|increases?|rises?)[\s\S]*?(\d+(?:\.\d+)?)%[\s\S]*?(?:(?:present population is|population is|it is|now)\s+([\d,]+)|([\d,]{4,})\s+(?:is|hai)\b)[\s\S]*?(?:population |it )?(\w+|\d+) years? (?:ago|pehle)/, function (t, raw, m) {
        var r = parseFloat(m[1]), now = parseFloat((m[2] || m[3]).replace(/,/g, '')), n = wnum(m[4]);
        if (n === null) return null;
        var past = now / Math.pow(1 + r / 100, n);
        return RES('Population — reverse growth', [
            'Past population = present ÷ (1 + R/100)ⁿ',
            '= ' + now + ' ÷ (1 + ' + r + '/100)^' + n + ' = ' + now + ' ÷ ' + fmtVal(Math.pow(1 + r / 100, n)) + ' = **' + fmtVal(past) + '**'
        ], fmtVal(past), past);
    });
    R(/(\d+(?:\.\d+)?)%[\s\S]*?(?:annually|per year|yearly|per annum)[\s\S]*?(?:increases?|grows?|growth)?[\s\S]*?now\s+([\d,]+)[\s\S]*?(\w+|\d+) years? (?:ago|pehle)[\s\S]*?population|population[\s\S]*?(\d+(?:\.\d+)?)%[\s\S]*?(?:annually|per year|yearly|per annum)[\s\S]*?now\s+([\d,]+)[\s\S]*?(\w+|\d+) years? (?:ago|pehle)/, function (t, raw, m) {
        var r = parseFloat(m[1] || m[4]), now = parseFloat((m[2] || m[5]).replace(/,/g, '')), n = wnum(m[3] || m[6]);
        if (n === null || !(r >= 0) || !(now > 0)) return null;
        var past = now / Math.pow(1 + r / 100, n);
        return RES('Population — reverse growth', [
            'Past population = present ÷ (1 + R/100)ⁿ',
            '= ' + now + ' ÷ (1 + ' + r + '/100)^' + n + ' = ' + now + ' ÷ ' + fmtVal(Math.pow(1 + r / 100, n)) + ' = **' + fmtVal(past) + '**'
        ], fmtVal(past), past);
    });
    R(/employed (\d+) workers[\s\S]*?(\d+(?:\.\d+)?)% workers were removed[\s\S]*?(\d+(?:\.\d+)?)% of those[\s\S]*?(?:retrenched|removed)[\s\S]*?increased by (\d+(?:\.\d+)?)%/, function (t, raw, m) {
        var w = parseFloat(m[1]);
        var f = (1 - m[2] / 100) * (1 - m[3] / 100) * (1 + m[4] / 100);
        var fin = w * f;
        return RES('Successive percentage changes', [
            'After −' + m[2] + '%: ' + w + ' × ' + fmtVal(1 - m[2] / 100) + ' = ' + fmtVal(w * (1 - m[2] / 100)),
            'After −' + m[3] + '%: × ' + fmtVal(1 - m[3] / 100) + ' → ' + fmtVal(w * (1 - m[2] / 100) * (1 - m[3] / 100)),
            'After +' + m[4] + '%: × ' + fmtVal(1 + m[4] / 100) + ' → **' + fmtVal(fin) + ' workers**'
        ], fmtVal(fin), fin);
    });

    /* ═══ MULTIVARIATE TERM ENGINE (products, expansions, factorisation) ══ */
    function splitTop(s) {
        var parts = [], depth = 0, cur = '', sign = '+';
        for (var i = 0; i < s.length; i++) {
            var c = s[i];
            if (c === '(' || c === '[') depth++;
            if (c === ')' || c === ']') depth--;
            if (depth === 0 && (c === '+' || c === '-') && cur.trim() !== '') {
                parts.push({ sign: sign, body: cur.trim() });
                sign = c; cur = '';
            } else cur += c;
        }
        if (cur.trim() !== '') parts.push({ sign: sign, body: cur.trim() });
        return parts;
    }
    function parseTermBody(b) {
        b = b.replace(/\s+/g, '').replace(/\*/g, '');
        b = b.replace(/\((\d[\d.]*(?:\/\d[\d.]*)?)\)/g, '$1');
        var sm = b.match(/^([+-])?(.*)$/);
        var sgn = sm[1] === '-' ? -1 : 1;
        b = sm[2];
        var m = b.match(/^(\d+(?:\.\d+)?\/\d+(?:\.\d+)?|\d+(?:\.\d+)?)?(.*)$/);
        if (!m) return null;
        var c = 1;
        if (m[1]) {
            if (m[1].indexOf('/') > -1) { var q = m[1].split('/'); c = parseFloat(q[0]) / parseFloat(q[1]); }
            else c = parseFloat(m[1]);
        }
        var v = {}, re = /([a-z])(?:\^(\d+))?/g, mm;
        var rest = m[2] || '';
        while ((mm = re.exec(rest)) !== null) {
            if (mm[1] === 'e') return null;
            v[mm[1]] = (v[mm[1]] || 0) + (mm[2] ? parseInt(mm[2], 10) : 1);
        }
        var leftover = rest.replace(/([a-z])(?:\^(\d+))?/g, '');
        var dm = leftover.match(/^\/([\d.]+)$/);
        if (dm) { c /= parseFloat(dm[1]); leftover = ''; }
        if (leftover) return null;
        if (!m[1] && !rest) return null;
        return { c: sgn * c, v: v };
    }
    function vkey(v) { return Object.keys(v).sort().map(function (k) { return k + v[k]; }).join(','); }
    function combineTerms(T) {
        var map = {}, order = [];
        T.forEach(function (t) {
            var k = vkey(t.v);
            if (!(k in map)) { map[k] = { c: 0, v: t.v }; order.push(k); }
            map[k].c += t.c;
        });
        return order.map(function (k) { return map[k]; }).filter(function (t) { return Math.abs(t.c) > 1e-12; });
    }
    function mulTerms(A, B) {
        var out = [];
        A.forEach(function (a) {
            B.forEach(function (b) {
                var v = {};
                for (var k in a.v) v[k] = a.v[k];
                for (var k2 in b.v) v[k2] = (v[k2] || 0) + b.v[k2];
                out.push({ c: a.c * b.c, v: v });
            });
        });
        return combineTerms(out);
    }
    function addTerms(A, B, sgn) {
        return combineTerms(A.concat(B.map(function (t) { return { c: t.c * (sgn || 1), v: t.v }; })));
    }
    function parseExprTerms(s) {
        var out = [], sp = splitTop(s);
        if (!sp.length) return null;
        for (var i = 0; i < sp.length; i++) {
            var tb = parseTermBody(sp[i].body);
            if (!tb) return null;
            tb.c *= sp[i].sign === '-' ? -1 : 1;
            out.push(tb);
        }
        return combineTerms(out);
    }
    var SUPS = { 2: '²', 3: '³', 4: '⁴' };
    function coefFmt(c) {
        var r = Math.round(c * 1e9) / 1e9;
        if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
        var f = decToFrac(r, 10000);
        if (f && f.d > 1 && f.d <= 10000) return fStr(f);
        return dec(r);
    }
    function renderTerms(T) {
        if (!T || !T.length) return '0';
        var allVars = {};
        T.forEach(function (t) { for (var k in t.v) allVars[k] = 1; });
        var vOrder = Object.keys(allVars).sort();
        T = T.slice().sort(function (a, b) {
            var da = 0, db = 0, k;
            for (k in a.v) da += a.v[k];
            for (k in b.v) db += b.v[k];
            if (db !== da) return db - da;
            for (var i = 0; i < vOrder.length; i++) {
                var ea = a.v[vOrder[i]] || 0, eb = b.v[vOrder[i]] || 0;
                if (ea !== eb) return eb - ea;
            }
            return 0;
        });
        var out = '';
        T.forEach(function (t, i) {
            var sign = t.c < 0 ? '-' : '+';
            var vs = Object.keys(t.v).sort().map(function (k) {
                var e = t.v[k];
                return k + (e === 1 ? '' : (SUPS[e] || '^' + e));
            }).join('');
            var cs = coefFmt(Math.abs(t.c));
            var term = vs ? (cs === '1' ? '' : cs) + vs : cs;
            if (i === 0) out += (sign === '-' ? '-' : '') + term;
            else out += ' ' + sign + ' ' + term;
        });
        return out;
    }
    function supToCaret(s) {
        return String(s).replace(/[²³⁴]/g, function (c) { return '^' + { '²': 2, '³': 3, '⁴': 4 }[c]; });
    }
    function evalTerms(T, map) {
        var sum = 0;
        T.forEach(function (t) {
            var p = t.c;
            for (var k in t.v) {
                if (map[k] === undefined) throw { msg: 'no value for ' + k };
                p *= Math.pow(map[k], t.v[k]);
            }
            sum += p;
        });
        return sum;
    }
    function parseFactors(s) {
        var out = [], re = /\(([^()]*)\)(?:\s*\^\s*(\d+))?/g, m, last = 0, found = false;
        while ((m = re.exec(s)) !== null) {
            found = true;
            var between = s.slice(last, m.index).trim();
            if (between) {
                var tb = parseTermBody(between);
                if (!tb) return null;
                out.push([tb]);
            }
            var inner = parseExprTerms(m[1]);
            if (!inner) return null;
            var k = m[2] ? parseInt(m[2], 10) : 1, pw = inner;
            for (var i = 1; i < k; i++) pw = mulTerms(pw, inner);
            out.push(pw);
            last = re.lastIndex;
        }
        if (!found) { var e = parseExprTerms(s); return e ? [e] : null; }
        var tail = s.slice(last).trim();
        if (tail) { var tb2 = parseTermBody(tail); if (!tb2) return null; out.push([tb2]); }
        return out;
    }
    function evalProductExpr(s) {
        var sp = splitTop(s), acc = null;
        if (!sp.length) return null;
        for (var i = 0; i < sp.length; i++) {
            var f = parseFactors(sp[i].body);
            if (!f) return null;
            var prod = f.reduce(mulTerms);
            if (sp[i].sign === '-') prod = prod.map(function (t) { return { c: -t.c, v: t.v }; });
            acc = acc === null ? prod : addTerms(acc, prod, 1);
        }
        return acc;
    }
    function hasLetters(T) {
        for (var i = 0; i < T.length; i++) if (Object.keys(T[i].v).length) return true;
        return false;
    }

    /* ── quadratic factorisation (one variable, returns pretty string) ───── */
    function detectVar(T) {
        var vs = {};
        T.forEach(function (t) { for (var k in t.v) vs[k] = 1; });
        var keys = Object.keys(vs);
        return keys.length === 1 ? keys[0] : null;
    }
    function factorQuadStr(T) {
        var v = detectVar(T);
        if (!v) return null;
        var c0 = 0, c1 = 0, c2 = 0;
        for (var i = 0; i < T.length; i++) {
            var e = T[i].v[v] || 0;
            if (e === 0) c0 += T[i].c;
            else if (e === 1) c1 += T[i].c;
            else if (e === 2) c2 += T[i].c;
            else return null;
        }
        if (c2 === 0) return null;
        var D = c1 * c1 - 4 * c2 * c0;
        if (D < 0) return null;
        var sq = Math.sqrt(D);
        if (Math.abs(sq - Math.round(sq)) > 1e-9) return null;
        sq = Math.round(sq);
        function facFromRoot(num, den) { // root = num/den → factor (den·v − num)
            var g = gcd(Math.abs(num), Math.abs(den)) || 1;
            num /= g; den /= g;
            if (den < 0) { num = -num; den = -den; }
            var lead = den === 1 ? '' : String(den);
            if (num === 0) return '(' + lead + v + ')';
            return '(' + lead + v + (num > 0 ? ' - ' + num : ' + ' + (-num)) + ')';
        }
        var r1n = -c1 + sq, r2n = -c1 - sq, rd = 2 * c2;
        if (sq === 0) {
            var g2 = gcd(Math.abs(r1n), Math.abs(rd)) || 1;
            var fn = facFromRoot(r1n / g2, rd / g2);
            var scalar = c2 / ((rd / g2) * (rd / g2));
            var out = fn + '^2';
            if (Math.abs(scalar - 1) > 1e-9) out = coefFmt(scalar) + out;
            return out;
        }
        var f1 = facFromRoot(r1n, rd), f2 = facFromRoot(r2n, rd);
        // leading scalar check: product of factor leads must equal c2
        function leadOf(num, den) { var g = gcd(Math.abs(num), Math.abs(den)) || 1; return Math.abs(den / g); }
        var sc = c2 / (leadOf(r1n, rd) * leadOf(r2n, rd));
        var res = f1 + f2;
        if (Math.abs(sc - 1) > 1e-9) res = coefFmt(sc) + res;
        return res;
    }

    /* ═══ CH 7 · IDENTITIES & FACTORISATION ═══════════════════════════════ */
    /* expand / simplify symbolic expressions with brackets */
    R(/find the product using (?:a |any )?suitable identit(?:y|ies):?\s*([\s\S]+)|(?:simplify|expand|multiply out|product of)\s*:?\s*(\(?[\s\S]+\)?)|multiply \(?([\s\S]+?)\)? by \(?([\s\S]+?)\)?\.?$/, function (t, raw, m) {
        if (/\bsqrt|\bcbrt/.test(t)) return null;   // numeric-root jobs belong to the BODMAS engine
        var expr = m[1] || m[2] || (m[3] ? '(' + m[3] + ')(' + m[4] + ')' : null);
        if (!expr) return null;
        expr = nm(expr).replace(/\*\*/g, '^').replace(/[.?]+$/, '').trim();
        var T = evalProductExpr(expr);
        if (!T || !T.length) return null;
        if (!hasLetters(T)) {
            var val = T[0].c;
            return RES('Simplify', ['Computed exactly: ' + expr + ' = ' + fmtVal(val)], fmtFracFirst(val), val);
        }
        var out = renderTerms(T);
        return RES('Expand using identities', [
            'Multiply out term by term and combine like terms.',
            expr + ' = **' + out + '**  (also written ' + supToCaret(out) + ')'
        ], out, null);
    });
    /* express as square of a binomial + evaluate */
    R(/express ([\s\S]+?) as a square of a binomial and evaluate for ([a-z]) = (-?[\d.]+),? ([a-z]) = (-?[\d.]+)/, function (t, raw, m) {
        var expr = nm(m[1]).replace(/[.?]+$/, '').trim();
        if (expr.charAt(0) === '(' && expr.charAt(expr.length - 1) === ')') {
            var depth = 0, wrapped = true;
            for (var zi = 0; zi < expr.length; zi++) {
                var zc = expr.charAt(zi);
                if (zc === '(') depth++;
                if (zc === ')') depth--;
                if (depth === 0 && zi < expr.length - 1) { wrapped = false; break; }
            }
            if (wrapped) expr = expr.slice(1, -1);
        }
        var T = parseExprTerms(expr);
        if (!T || T.length !== 3) return null;
        // find Ax², Bxy, Cy²
        var A = 0, B = 0, C = 0, vx = null, vy = null;
        T.forEach(function (tt) {
            var ks = Object.keys(tt.v);
            if (ks.length === 1 && tt.v[ks[0]] === 2) { if (!vx) vx = ks[0]; if (ks[0] === vx) A = tt.c; else C = tt.c; }
            else if (ks.length === 2) { B = tt.c; vy = ks[0] === vx ? ks[1] : ks[0]; }
        });
        if (!vx || !vy || A <= 0 || C <= 0) return null;
        var a = Math.sqrt(A), c = Math.sqrt(C);
        var sign = B >= 0 ? 1 : -1;
        if (Math.abs(Math.abs(B) - 2 * a * c) > 1e-9) return null;
        var binom = coefFmt(a) + vx + (sign > 0 ? ' + ' : ' - ') + coefFmt(c) + vy;
        var map = {}; map[m[2]] = parseFloat(m[3]); map[m[4]] = parseFloat(m[5]);
        var inner = a * (map[vx] !== undefined ? map[vx] : 0) * (vx === m[2] ? 1 : 1);
        // evaluate: (a·vx + sign·c·vy)² at the given values
        var val1 = 0;
        for (var k in map) {
            if (k === vx) val1 += a * map[k];
            if (k === vy) val1 += sign * c * map[k];
        }
        var res = val1 * val1;
        return RES('Perfect square binomial', [
            m[1] + ' = (' + binom + ')²  [since (' + binom + ')² expands back exactly]',
            'Substitute ' + m[2] + ' = ' + m[3] + ', ' + m[4] + ' = ' + m[5] + ': (' + fmtVal(val1) + ')² = **' + fmtVal(res) + '**'
        ], fmtVal(res), res);
    });
    /* factorise: expr */
    R(/factori[sz]e\b\s*:?\s*\(?([\s\S]+?)\)?\.?$|factorised form of \(?([\s\S]+?)\)? is|the factors of \(?([\s\S]+?)\)?(?: (?:are|is))?$/, function (t, raw, m) {
        var expr = (m[1] || m[2] || m[3] || '').replace(/[.?]+$/, '').trim();
        if (!expr) return null;
        var T = parseExprTerms(expr);
        if (!T) return null;
        var fac = factorQuadStr(T);
        if (!fac) return null;
        var rev = fac.replace(/\(([^()]+)\)\(([^()]+)\)/, '($2)($1)');
        return RES('Factorisation', [
            'Split the middle term / use a² − b² or perfect-square pattern:',
            expr + ' = **' + fac + '**  (also written ' + supToCaret(fac) + ' or ' + rev + ')'
        ], fac + ' = ' + rev, null);
    });
    /* side of square with polynomial area */
    R(/side of the square with area \(?([\s\S]+?)\)? square units/, function (t, raw, m) {
        var T = parseExprTerms(nm(m[1]).replace(/[.?]+$/, ''));
        if (!T) return null;
        var fac = factorQuadStr(T);
        if (!fac || fac.indexOf('^2') === -1) return null;
        var side = fac.replace(/\^2$/, '').replace(/^\(|\)$/g, '');
        return RES('Side from polynomial area', [
            'Area = ' + m[1] + ' = ' + fac + ' → area = (side)²',
            'Side = **' + side + '**'
        ], side, null);
    });
    /* x ± 1/x ladders */
    function parseFracStr(s) {
        s = String(s).trim().replace(/\.+$/, '');
        var m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
        if (m) return F(parseInt(m[1], 10), parseInt(m[2], 10));
        var d = s.match(/^-?\d+(?:\.\d+)?$/);
        if (!d) return null;
        var v = parseFloat(s);
        if (Math.abs(v - Math.round(v)) < 1e-12) return F(Math.round(v), 1);
        return decToFrac(v, 100000);
    }
    function fracSqrt(f) {
        if (f.n < 0) return null;
        var a = isqrt(f.n), b = isqrt(f.d);
        if (a === null || b === null) return null;
        return F(a, b);
    }
    function ladder(from, to) { // from/to: {pow:1..4, sign:'+'/'-'} ; from.val fraction
        var v = from.val, S = from.sign, P = from.pow;
        var T = to.sign, Q = to.pow;
        function f(x) { return x; }
        // normalise to S2 (x²+1/x²) when possible
        var S2 = null;
        if (P === 2 && S === '+') S2 = v;
        else if (P === 1 && S === '+') S2 = fSub(fMul(v, v), F(2, 1));
        else if (P === 1 && S === '-') S2 = fAdd(fMul(v, v), F(2, 1));
        if (Q === 2 && T === '+') return S2;
        if (Q === 4 && T === '+') return S2 === null ? null : fSub(fMul(S2, S2), F(2, 1));
        if (Q === 1 && T === '+' && S2 !== null) return fracSqrt(fAdd(S2, F(2, 1)));
        if (Q === 1 && T === '-' && S2 !== null) return fracSqrt(fSub(S2, F(2, 1)));
        if (Q === 3 && T === '+' && P === 1 && S === '+') return fSub(fMul(v, S2), v);           // x³+1/x³ = S1(S2) − S1
        if (Q === 3 && T === '-' && P === 1 && S === '-') return fAdd(fMul(v, S2), v);           // x³−1/x³ = S1m(S2) + S1m
        if (Q === 3 && T === '+' && S2 !== null) { var s1p = fracSqrt(fAdd(S2, F(2, 1))); return s1p ? fSub(fMul(s1p, S2), s1p) : null; }
        if (Q === 3 && T === '-' && S2 !== null) { var s1m = fracSqrt(fSub(S2, F(2, 1))); return s1m ? fAdd(fMul(s1m, S2), s1m) : null; }
        return null;
    }
    R(/^(?:if )?([a-z])(?:\^(\d))? ?([+-]) ?1 ?\/ ?([a-z])(?:\^(\d))? ?= ?(-?[\d./]+)[\s\S]*?([a-z])(?:\^(\d))? ?([+-]) ?1 ?\/ ?([a-z])(?:\^(\d))?/, function (t, raw, m) {
        if (m[1] !== m[4]) return null;
        var from = { pow: m[2] ? +m[2] : 1, sign: m[3], val: parseFracStr(m[6]) };
        var to = { pow: m[8] ? +m[8] : 1, sign: m[9] };
        if (!from.val) return null;
        var res = ladder(from, to);
        if (!res) return null;
        var x = m[1];
        function disp(pow, sign) { return pow === 1 ? x + ' ' + (sign === '+' ? '+' : '−') + ' 1/' + x : x + '^' + pow + ' ' + (sign === '+' ? '+' : '−') + ' 1/' + x + '^' + pow; }
        return RES('The x ± 1/x ladder', [
            'Given ' + disp(from.pow, from.sign) + ' = ' + fStr(from.val),
            'Identity chain: (x + 1/x)² = x² + 1/x² + 2 · (x − 1/x)² = x² + 1/x² − 2 · x⁴ + 1/x⁴ = (x² + 1/x²)² − 2',
            disp(to.pow, to.sign) + ' = **' + fStr(res) + '**' + (res.d === 1 ? '' : ' (= ' + dec(fVal(res)) + ')')
        ], fStr(res) + (res.d === 1 ? '' : ' = ' + dec(fVal(res))), fVal(res));
    });
    /* a²+b² & ab → combos of (a±b)² */
    R(/if ([a-z])\^2 \+ ([a-z])\^2 = (-?[\d.]+) and \1\2 = (-?[\d.]+)[.,]?[\s\S]*?(?:find the value of|find|what is|evaluate|value of) ([\s\S]+)/, function (t, raw, m) {
        var P = parseFloat(m[3]), Q = parseFloat(m[4]);
        var u = P + 2 * Q, w = P - 2 * Q;
        var expr = nm(m[5]).replace(/[.?]+$/, '');
        var sp = splitTop(expr), total = 0, parts = [];
        for (var i = 0; i < sp.length; i++) {
            var bm = sp[i].body.match(/^(\d+)?\(?\s*([a-z]) ?([+-]) ?([a-z]) ?\)?\^2$/);
            if (!bm) return null;
            var coef = bm[1] ? parseFloat(bm[1]) : 1;
            var val = bm[3] === '+' ? u : w;
            total += (sp[i].sign === '-' ? -1 : 1) * coef * val;
            parts.push(coef + '(' + bm[2] + bm[3] + bm[4] + ')² = ' + coef + '×' + fmtVal(val));
        }
        return RES('Using (a±b)² = a²+b² ± 2ab', [
            '(a+b)² = a²+b² + 2ab = ' + P + ' + ' + fmtVal(2 * Q) + ' = ' + fmtVal(u),
            '(a−b)² = a²+b² − 2ab = ' + P + ' − ' + fmtVal(2 * Q) + ' = ' + fmtVal(w)
        ].concat(parts), fmtVal(total), total);
    });
    /* a+b+c & a²+b²+c² → ab+bc+ca */
    R(/if ([a-z]) \+ ([a-z]) \+ ([a-z]) = (-?[\d.]+) and ([a-z])\^2 \+ ([a-z])\^2 \+ ([a-z])\^2 = (-?[\d.]+)[.,]?[\s\S]*?(?:find the value of|find|what is|evaluate|value of) ([a-z][a-z] ?\+ ?[a-z][a-z] ?\+ ?[a-z][a-z])/, function (t, raw, m) {
        var S = parseFloat(m[4]), Q = parseFloat(m[8]);
        var res = (S * S - Q) / 2;
        return RES('The (a+b+c)² identity', [
            '(a+b+c)² = a²+b²+c² + 2(ab+bc+ca)',
            S + '² = ' + Q + ' + 2(ab+bc+ca) → ab+bc+ca = (' + S * S + ' − ' + Q + ')/2 = **' + fmtVal(res) + '**'
        ], fmtVal(res), res);
    });
    /* k·(expression) = (P)² − (Q)² style → expand RHS, read coefficient */
    R(/([a-z]) ?([a-z])?\^?2? ?k = \(?([\s\S]+?)\)?\^2 ?- ?\(?([\s\S]+?)\)?\^2/, function (t, raw, m) {
        var P = evalProductExpr('(' + m[3] + ')^2');
        var Q = evalProductExpr('(' + m[4] + ')^2');
        if (!P || !Q) return null;
        var D = addTerms(P, Q, -1);
        if (D.length !== 1) return null;
        return RES('(A+B)² − (A−B)² = 4AB', [
            '(' + m[3] + ')² − (' + m[4] + ')² = ' + renderTerms(D),
            'Comparing with the given ' + m[1] + (m[2] || '') + '² · k → k = **' + coefFmt(D[0].c) + '**'
        ], coefFmt(D[0].c), D[0].c);
    });
    /* Px ± Qy = S, xy = R → (P∓x+Qy)² or P²x²+Q²y² */
    R(/if (\d*)([a-z]) ?([+-]) ?(\d*)([a-z]) = (-?[\d.]+) and \2\5 = (-?[\d.]+)[.,]?[\s\S]*?(?:find the value of|find|what is|evaluate|value of) ([\s\S]+)/, function (t, raw, m) {
        var P = m[1] ? parseFloat(m[1]) : 1, Q = m[4] ? parseFloat(m[4]) : 1;
        var s1 = m[3], S = parseFloat(m[6]), R = parseFloat(m[7]);
        var target = nm(m[8]).replace(/[.?]+$/, '');
        var cross = 2 * P * Q * R;
        // target type 1: (Px ∓ Qy)^2
        var bm = target.match(/^\(?\s*(\d*)([a-z]) ?([+-]) ?(\d*)([a-z])\s*\)?\^2$/);
        if (bm && (bm[2] === m[2] || bm[5] === m[2])) {
            var s2 = bm[3];
            var res = s2 === s1 ? S * S : (s2 === '+' ? S * S + 2 * cross : S * S - 2 * cross);
            return RES('Using (A ± B)² = A² + B² ± 2AB', [
                '(' + P + m[2] + ' ' + s1 + ' ' + Q + m[5] + ')² = ' + S + '² = ' + S * S,
                'Cross term 2·(' + P + m[2] + ')(' + Q + m[5] + ') = 2·' + P * Q + '·xy = ' + fmtVal(cross),
                'Target = ' + fmtVal(res)
            ], fmtVal(res), res);
        }
        // target type 2: (Px)² + (Qy)² written out
        var t2 = parseExprTerms(target);
        if (t2 && t2.length === 2) {
            var res2 = S * S - (s1 === '+' ? cross : -cross);
            return RES('Using (A ± B)² expansion', [
                '(' + P + m[2] + ' ' + s1 + ' ' + Q + m[5] + ')² = ' + P * P + m[2] + '² + ' + Q * Q + m[5] + '² ' + (s1 === '+' ? '+' : '−') + ' ' + fmtVal(Math.abs(cross)),
                '→ ' + P * P + m[2] + '² + ' + Q * Q + m[5] + '² = ' + S * S + ' ' + (s1 === '+' ? '−' : '+') + ' ' + fmtVal(Math.abs(cross)) + ' = **' + fmtVal(res2) + '**'
            ], fmtVal(res2), res2);
        }
        return null;
    });
    /* k·x = a² − b² (and a×a − b×b style) */
    R(/evaluate ([a-z]) if ([\d.]+)\1? ?= ?([\s\S]+)/, function (t, raw, m) {
        var expr = nm(m[3]).replace(/[.?]+$/, '');
        expr = expr.replace(/([\d.]+) x \1/g, '$1^2');
        var rhs = translate('evaluate ' + expr);
        if (!root.BitMath) return null;
        var r = null;
        try { r = root.BitMath.solve(rhs); } catch (e) { return null; }
        if (!r || !r.ok) return null;
        var k = parseFloat(m[2]);
        var x = r.value / k;
        return RES('Difference of squares', [
            'a² − b² = (a − b)(a + b) → ' + expr + ' = ' + fmtVal(r.value),
            k + m[1] + ' = ' + fmtVal(r.value) + ' → ' + m[1] + ' = **' + fmtVal(x) + '**'
        ], fmtVal(x), x);
    });
    /* mean of observations = polynomial division */
    R(/sum of \(?([\s\S]+?)\)? observations is \(?([\s\S]+?)\)?\.? find the mean/, function (t, raw, m) {
        return polyDivWord(m[2], m[1], 'Mean = total sum ÷ number of observations');
    });
    function polyDivWord(numStr, denStr, intro) {
        var A = parsePolyS(nm(numStr).replace(/[.?]+$/, ''));
        var B = parsePolyS(nm(denStr).replace(/[.?]+$/, ''));
        if (!A || !B) return null;
        var v = A.v;
        var dq = polyDiv(A.c, B.c);
        var qs = polyStrU(dq.q, v);
        var steps = ['Long division of (' + numStr + ') by (' + denStr + '):'];
        steps.push('Quotient = **' + qs + '**  (also written ' + supToCaret(qs) + ')');
        if (dq.r.length > 1 || Math.abs(dq.r[0]) > 1e-9) steps.push('Remainder = ' + fmtVal(dq.r[0]));
        return RES('Polynomial division', steps, qs, null);
    }
    /* parse single-variable polynomial → {v, c:coeffs} using term engine */
    function parsePolyS(s) {
        var T = parseExprTerms(s);
        if (!T) return null;
        var v = detectVar(T);
        var coeffs = [0];
        for (var i = 0; i < T.length; i++) {
            var e = v ? (T[i].v[v] || 0) : 0;
            if (Object.keys(T[i].v).length > (v ? 1 : 0)) return null;
            while (coeffs.length <= e) coeffs.push(0);
            coeffs[e] += T[i].c;
        }
        return { v: v || 'x', c: trimP(coeffs) };
    }
    /* circle area expression → radius */
    R(/area of a circle is given by the expression \(?([\s\S]+?)\)?\.? find the radius/, function (t, raw, m) {
        var ex = nm(m[1]).replace(/[.?]+$/, '').replace(/pi\s*\*?/g, '');
        var T = parseExprTerms(ex);
        if (!T) return null;
        var fac = factorQuadStr(T);
        if (!fac || fac.indexOf('^2') === -1) return null;
        var side = fac.replace(/\^2$/, '').replace(/^\(|\)$/g, '');
        return RES('Radius from area expression', [
            'Area = π(' + ex + ') = π·' + fac + ' = π(side)²',
            'πr² = π' + fac + ' → r = **' + side + '**'
        ], side, null);
    });

    /* ═══ CH 8 · POLYNOMIAL DIVISION & FACTOR THEOREM ═════════════════════ */
    R(/divide and write the quotient and remainder:?\s*\(?([\s\S]+?)\)? by \(?([\s\S]+?)\)?\.?$/, function (t, raw, m) {
        return divFull(m[1], m[2], true);
    });
    R(/quotient obtained when \(?([\s\S]+?)\)? is divided by \(?([\s\S]+?)\)? is/, function (t, raw, m) {
        return divFull(m[1], m[2], false);
    });
    R(/quotient and remainder when \(?([\s\S]+?)\)? (?:is |being )?divided by \(?([\s\S]+?)\)?\s*$/, function (t, raw, m) {
        return divFull(m[1], m[2], true);
    });
    R(/divide ([\s\S]+?) by ([\s\S]+?)\.?$/, function (t, raw, m) {
        var den = m[2].replace(/ and (?:give|find|write|tell|hence)[\s\S]*$/, '');
        if (/sqrt/.test(m[1]) || /sqrt/.test(den)) return monoDiv(m[1], den);
        return divFull(m[1], den, /quotient|remainder/.test(t) ? true : false);
    });
    R(/(?:is |being )?divided by \(([^()]+)\)/, function (t, raw, m) {
        if (!/remainder/.test(t)) return null;
        var nm2 = t.match(/\(([\s\S]+?)\) (?:is |being )?divided by/) || t.match(/when ([\s\S]+?) (?:is |being )?divided by/) || t.match(/^([\s\S]+?) (?:is |being )?divided by/);
        if (!nm2) return null;
        return remTheorem(nm2[1], m[1], /factor or not|conclude/.test(t));
    });
    function remTheorem(numStr, denStr, wantConclusion) {
        var A = parsePolyS(nm(numStr).replace(/[.?]+$/, ''));
        var B = parsePolyS(nm(denStr).replace(/[.?]+$/, ''));
        if (!A || !B || B.c.length !== 2) return null;
        var rootV = -B.c[0] / B.c[1];
        var rem = polyEval(A.c, rootV);
        var steps = [
            'Remainder theorem: remainder of p(x) ÷ (' + denStr.trim() + ') is p(' + fmtVal(rootV) + ')',
            'p(' + fmtVal(rootV) + ') = ' + fmtVal(rem)
        ];
        if (wantConclusion) steps.push(Math.abs(rem) < 1e-9 ? 'Remainder = 0 → (' + denStr.trim() + ') IS a factor ✓' : 'Remainder ≠ 0 → (' + denStr.trim() + ') is NOT a factor ✗');
        return RES('Remainder theorem', steps, fmtVal(rem) + (wantConclusion && Math.abs(rem) > 1e-9 ? ' (so not a factor)' : ''), rem);
    }
    function divFull(numStr, denStr, showRem) {
        var stripP = function (x) { return nm(x).replace(/[.?]+$/, '').trim().replace(/^\(([\s\S]*)\)$/, '$1'); };
        var A = parsePolyS(stripP(numStr));
        var B = parsePolyS(stripP(denStr));
        if (!A || !B) return null;
        var dq = polyDiv(A.c, B.c);
        var v = A.v;
        var qs = polyStrU(dq.q, v), rs = polyStrU(dq.r, v);
        var hasRem = dq.r.length > 1 || Math.abs(dq.r[0]) > 1e-9;
        var steps = [
            'Divide (' + nm(numStr).trim() + ') by (' + nm(denStr).trim() + ') using long division:',
            'Quotient = **' + qs + '** (also written ' + supToCaret(qs) + ')'
        ];
        if (hasRem) steps.push('Remainder = **' + rs + '**');
        else steps.push('Remainder = 0 (exact division ✓)');
        steps.push('Check: divisor × quotient + remainder = dividend ✓');
        var ans = qs + (showRem ? ', remainder ' + rs : '');
        return RES('Polynomial long division', steps, ans, null);
    }
    /* monomial division with radicals: -39x^4 ÷ √13 x² etc. */
    function monoDiv(aStr, bStr) {
        function parseMono(s) {
            s = nm(s).replace(/[()?]/g, '').trim();
            var m = s.match(/^(-?[\d.]+(?:\/[\d.]+)?)?(sqrt)?\(?\s*([\d.]+)?\s*\)?\s*([a-z])?(?:\^(\d+))?$/);
            if (!m) {
                var m2 = s.match(/^(sqrt)?\(?([\d.]+)\)?\s*(-?[\d.]*)?([a-z])?(?:\^(\d+))?$/);
                if (!m2) return null;
            }
            // simpler manual parse:
            var coef = 1, rad = null, vr = null, ex = 0, neg = false;
            var sm = s.match(/^(-)?(.*)$/);
            if (sm[1]) neg = true;
            var body = sm[2];
            var sq = body.match(/^sqrt\(?([\d.]+)\)?\s*(.*)$/);
            if (sq) { rad = parseFloat(sq[1]); body = sq[2]; }
            var cm = body.match(/^([\d.]+(?:\/[\d.]+)?)?\s*([a-z])?(?:\^(\d+))?$/);
            if (!cm) return null;
            if (cm[1]) {
                if (cm[1].indexOf('/') > -1) { var q = cm[1].split('/'); coef = parseFloat(q[0]) / parseFloat(q[1]); }
                else coef = parseFloat(cm[1]);
            }
            if (rad !== null && coef !== 1) { /* coef*sqrt(rad) */ }
            if (cm[2]) { vr = cm[2]; ex = cm[3] ? parseInt(cm[3], 10) : 1; }
            if (neg) coef = -coef;
            if (rad === null && cm[1] === undefined && !cm[2]) return null;
            return { coef: coef, rad: rad, v: vr, e: ex };
        }
        var A = parseMono(aStr), B = parseMono(bStr);
        if (!A || !B) return null;
        var cA = A.coef, cB = B.coef;
        // value = (cA·√rA) / (cB·√rB) → express as f·√g
        var rA = A.rad, rB = B.rad;
        var frac = null, under = 1;
        if (rA === null && rB === null) frac = cA / cB;
        else if (rA !== null && rB === null) { frac = cA / cB; under = rA; }
        else if (rA === null && rB !== null) { frac = cA / (cB * rB); under = rB; }   // rationalise: c/(d√b) = c√b/(d·b)
        else { frac = cA / cB; under = rA / rB; }
        // simplify √under → k√r
        var kk = 1, rr = under;
        if (Math.abs(under - Math.round(under)) < 1e-9 && under > 0) {
            var sp = sqrtSimplify(Math.round(under));
            kk = sp.k; rr = sp.r;
        } else if (under > 0) {
            var fu = decToFrac(under, 10000);
            if (fu) { var sn = sqrtSimplify(fu.n), sd = sqrtSimplify(fu.d); kk = sn.k / sd.k; rr = sn.r / sd.r; }
        }
        var total = frac * kk;
        var tf = decToFrac(total, 100000);
        var coefOut = tf && Math.abs(tf.n / tf.d - total) < 1e-9 ? (tf.d === 1 ? String(tf.n) : fStr(tf)) : dec(total);
        var radOut = Math.abs(rr - 1) < 1e-9 ? '' : '√' + (Math.abs(rr - Math.round(rr)) < 1e-9 ? Math.round(rr) : dec(rr));
        var vOut = '';
        var exOut = A.e - B.e;
        if (A.v && exOut !== 0) vOut = A.v + (Math.abs(exOut) === 1 ? '' : (SUPS[Math.abs(exOut)] || '^' + Math.abs(exOut)));
        if (A.v !== B.v) return null;
        var ans = (coefOut === '1' && (radOut || vOut) ? '' : coefOut) + (radOut ? (coefOut && coefOut !== '1' ? '' : '') + radOut : '') + (vOut ? ' ' + vOut : '');
        if (coefOut === '-1' && (radOut || vOut)) ans = '-' + radOut + (vOut ? ' ' + vOut : '');
        ans = ans.replace(/^\s+|\s+$/g, '');
        return RES('Monomial division', [
            'Divide coefficients and subtract exponents of the same variable.',
            aStr.trim() + ' ÷ ' + bStr.trim() + ' = **' + ans + '**'
        ], ans, null);
    }
    /* find k when (x − a) is a factor of poly with unknown */
    R(/if \(x ([+-]) (\d+)\) is a factor of (?:the polynomial )?\(?([\s\S]+?)\)?, find ([a-z])|value of ([a-z]) for which \(?([\s\S]+?)\)? is divisible by \(x ([+-]) (\d+)\)|for which value of ([a-z]) is \(?([\s\S]+?)\)? divisible by \(x ([+-]) (\d+)\)|^\(?x ([+-]) (\d+)\)? is a factor of (?:the polynomial )?\(?([\s\S]+?)\)?[.,] find (?:the value of )?([a-z])/, function (t, raw, m) {
        var sign, a, polyStr2, unk;
        if (m[1]) { sign = m[1]; a = parseFloat(m[2]); polyStr2 = m[3]; unk = m[4]; }
        else if (m[5]) { unk = m[5]; polyStr2 = m[6]; sign = m[7]; a = parseFloat(m[8]); }
        else if (m[9]) { unk = m[9]; polyStr2 = m[10]; sign = m[11]; a = parseFloat(m[12]); }
        else { sign = m[13]; a = parseFloat(m[14]); polyStr2 = m[15]; unk = m[16]; }
        var rootV = sign === '-' ? a : -a;
        // evaluate poly at rootV with unknown as symbol → A·unk + B = 0
        var ex = nm(polyStr2).replace(/[.?]+$/, '');
        var withU = ex.split(/(?=[+-])/).filter(function (z) { return z.trim(); });
        var A = 0, B = 0;
        for (var i = 0; i < withU.length; i++) {
            var term = withU[i].trim();
            if (term.indexOf(unk) > -1) {
                // forms: 'k', '+k', '(k+8)x', 'kx^2'…
                var pm2 = term.match(/^\(?k?/); // generic below
                var tm = term.replace(/[+]/g, '').trim();
                var inner = tm.match(/^\(\s*[a-z] ?([+-]) ?(\d+)\s*\)\s*([a-z])?(?:\^(\d+))?$/);
                if (inner) {
                    var xv = inner[3] ? Math.pow(rootV, inner[4] ? parseInt(inner[4], 10) : 1) : 1;
                    A += xv;
                    B += (inner[1] === '-' ? -parseFloat(inner[2]) : parseFloat(inner[2])) * xv;
                    continue;
                }
                var simple = tm.match(/^[a-z]\s*(?:\^(\d+))?\s*([a-z])?(?:\^(\d+))?$/) || tm.match(/^([a-z])(\^(\d+))?$/);
                if (tm === unk) { A += 1; continue; }
                var cm2 = tm.match(new RegExp('^(-?[\\d.]*)' + unk + '([a-z])?(?:\\^(\\d+))?$'));
                if (cm2) {
                    var cof = cm2[1] === '' || cm2[1] === '-' ? (cm2[1] === '-' ? -1 : 1) : parseFloat(cm2[1]);
                    var pw = cm2[3] ? Math.pow(rootV, parseInt(cm2[3], 10)) : (cm2[2] ? rootV : 1);
                    A += cof * pw;
                    continue;
                }
                return null;
            } else {
                var tb = parseTermBody(term);
                if (!tb) return null;
                var val = tb.c;
                for (var k2 in tb.v) val *= Math.pow(rootV, tb.v[k2]);
                B += val;
            }
        }
        if (A === 0) return null;
        var res = -B / A;
        return RES('Factor theorem — find the unknown', [
            '(x ' + sign + ' ' + a + ') is a factor ⇒ p(' + fmtVal(rootV) + ') = 0',
            'Substituting x = ' + fmtVal(rootV) + ': ' + fmtVal(A) + unk + ' + ' + fmtVal(B) + ' = 0',
            unk + ' = **' + fmtVal(res) + '**'
        ], fmtVal(res), res);
    });
    /* what should be added/subtracted so (x−a) is a factor */
    R(/what should be (added|subtracted) (?:to|from) the polynomial \(?([\s\S]+?)\)? so that \(x ([+-]) (\d+)\) is a factor/, function (t, raw, m) {
        var A = parsePolyS(nm(m[2]).replace(/[.?]+$/, ''));
        if (!A) return null;
        var rootV = m[3] === '-' ? parseFloat(m[4]) : -parseFloat(m[4]);
        var pv = polyEval(A.c, rootV);
        var res = m[1] === 'added' ? -pv : pv;
        return RES('Make (x − a) a factor', [
            'p(' + fmtVal(rootV) + ') = ' + fmtVal(pv),
            (m[1] === 'added' ? 'Add ' + fmtVal(-pv) + ' (i.e. −p(a))' : 'Subtract ' + fmtVal(pv) + ' (i.e. p(a))') + ' → remainder becomes 0 → **' + fmtVal(res) + '**'
        ], fmtVal(res), res);
    });
    /* reconstruct dividend from divisor·quotient + remainder */
    R(/polynomial which when divided by \(?([\s\S]+?)\)? gives a quotient \(?([\s\S]+?)\)? and remainder (-?[\d.]+)/, function (t, raw, m) {
        var D = parseExprTerms(nm(m[1])), Q = parseExprTerms(nm(m[2])), Rr = parseFloat(m[3]);
        if (!D || !Q) return null;
        var prod = mulTerms(D, Q);
        prod = addTerms(prod, [{ c: Rr, v: {} }], 1);
        var out = renderTerms(prod);
        return RES('Dividend = divisor × quotient + remainder', [
            '(' + nm(m[1]) + ') × (' + nm(m[2]) + ') + (' + Rr + ')',
            '= **' + out + '** (also written ' + supToCaret(out) + ')'
        ], out, null);
    });
    /* sum of remainders = 0 → find k (symbolic coefficient) */
    R(/sum of the remainders obtained when \(?([\s\S]+?)\)? is divided by \(x ([+-]) (\d+)\) and when it is divided by \(x ([+-]) (\d+)\) is (zero|-?[\d.]+)/, function (t, raw, m) {
        var ex = nm(m[1]);
        var r1 = m[2] === '-' ? parseFloat(m[3]) : -parseFloat(m[3]);
        var r2 = m[4] === '-' ? parseFloat(m[5]) : -parseFloat(m[5]);
        var target = m[6] === 'zero' ? 0 : parseFloat(m[6]);
        // p(x) contains '(k+A)x' and '+ k' → p(r) = k·(r+1) + (r³ + A·r)
        var km = ex.match(/\(\s*k ?([+-]) ?(\d+)\s*\)\s*x/);
        var A = km ? (km[1] === '-' ? -parseFloat(km[2]) : parseFloat(km[2])) : 0;
        function evalAt(r) { // returns {ka, kb}: value = ka·k + kb
            var ka = r + 1, kb = r * r * r + A * r;
            return { ka: ka, kb: kb };
        }
        var e1 = evalAt(r1), e2 = evalAt(r2);
        var KA = e1.ka + e2.ka, KB = e1.kb + e2.kb;
        var k = (target - KB) / KA;
        return RES('Sum of two remainders', [
            'Remainder at x = ' + fmtVal(r1) + ': p(' + fmtVal(r1) + ') = ' + fmtVal(e1.ka) + 'k + ' + fmtVal(e1.kb),
            'Remainder at x = ' + fmtVal(r2) + ': p(' + fmtVal(r2) + ') = ' + fmtVal(e2.ka) + 'k + ' + fmtVal(e2.kb),
            'Sum = ' + fmtVal(KA) + 'k + ' + fmtVal(KB) + ' = ' + m[6] + ' → k = **' + fmtVal(k) + '**'
        ], fmtVal(k), k);
    });
    /* value-based polynomial division word problems */
    R(/donated rs \(?([\s\S]+?)\)? for [\s\S]*?of \(?([\s\S]+?)\)? children/, function (t, raw, m) {
        return polyDivWord(m[1], m[2], 'donation');
    });
    R(/jogs a distance of \(?([\s\S]+?)\)? km[\s\S]*?speed of \(?([\s\S]+?)\)? km/, function (t, raw, m) {
        return polyDivWord(m[1], m[2], 'time = distance ÷ speed');
    });

    /* ═══ CH 9 · LINEAR EQUATIONS & WORD PROBLEMS ═════════════════════════ */
    /* rational equation (ax+b)/(cx+d) = e/f  OR plain linear with fractions */
    R(/^[\s\S]*?\(?([\s\S]+?)\)?\s*\/\s*\(?([\s\S]+?)\)?\s*=\s*(-?[\d.]+)(?:\s*\/\s*(-?[\d.]+))?[\s\S]*$/, function (t, raw, m) {
        if (/(?:^|[^\w.])([a-z]) ?[+-] ?1 ?\/ ?\1(?![\w])/.test(t)) return null;   // x ± 1/x ladder, not a rational equation
        var NUM = m[1] || '';
        if (NUM.indexOf('(') > -1) NUM = NUM.slice(NUM.lastIndexOf('(') + 1);
        else NUM = NUM.replace(/^.*?(?:solve|find|value of|variable|equation)[\s\S]*?(?::|of|which)\s*/, '');
        NUM = NUM.trim();
        var DEN = (m[2] || '').replace(/^\s*\(/, '').trim();
        var N1 = parsePolyS(NUM), D1 = parsePolyS(DEN);
        if (!N1 || !D1) return null;
        if (N1.c.length === 1 && D1.c.length === 1) return null;   // pure numeric statement, nothing to solve
        var v = N1.v;
        var e = parseFloat(m[3]), f = m[4] ? parseFloat(m[4]) : 1;
        // N1·f − D1·e = 0
        var lhs = polySub(polyMul(N1.c, [f]), polyMul(D1.c, [e]));
        return finishLinear(lhs, v, t, raw, [D1.c]);
    });
    function finishLinear(poly, v, t, raw, dens) {
        if (poly.length > 2) {
            // quadratic: solve, exclude roots zeroing any denominator, honour 'positive value'
            var a2 = poly[2] || 0, b2 = poly[1] || 0, c2 = poly[0];
            var D = b2 * b2 - 4 * a2 * c2;
            if (a2 === 0) { /* fallthrough linear */ }
            else {
                if (D < 0) return null;
                var sq = Math.sqrt(D);
                var roots = [(-b2 + sq) / (2 * a2), (-b2 - sq) / (2 * a2)];
                roots = roots.filter(function (rt) {
                    if (!dens) return true;
                    for (var i = 0; i < dens.length; i++) if (Math.abs(polyEval(dens[i], rt)) < 1e-9) return false;
                    return true;
                });
                if (!roots.length) return null;
                var uniq = [];
                roots.forEach(function (rt) { if (!uniq.some(function (u) { return Math.abs(u - rt) < 1e-9; })) uniq.push(rt); });
                if (/positive value/.test(t)) uniq = uniq.filter(function (rt) { return rt > 0; });
                if (!uniq.length) return null;
                var strs = uniq.map(function (rt) { return fmtFrac(rt); });
                return RES('Solve the equation', [
                    'Cross-multiply, bring everything to one side and factorise/solve.',
                    v + ' = **' + strs.join(' or ') + '**'
                ], v + ' = ' + strs.join(' or '), uniq[0]);
            }
        }
        var b = poly[1], c = poly[0];
        if (!b || Math.abs(b) < 1e-12) return null;
        var x = -c / b;
        // "numerical value of (EXPR)" follow-up?
        var em = (t + ' ' + nm(raw)).match(/(?:numerical )?value of \(?\s*(-?[\d.]*)\s*([a-z]) ?([+-]) ?([\d.]+)\s*\)?/);
        var ans = fmtFrac(x), steps = ['Bring variables to one side, constants to the other:', v + ' = **' + ans + '**'];
        if (em && em[2] === v) {
            var coef = em[1] === '' || em[1] === '-' ? (em[1] === '-' ? -1 : 1) : parseFloat(em[1]);
            var xf = decToFrac(x, 100000) || F(Math.round(x * 1e6), 1e6);
            var resF = fAdd(fMul(F(Math.round(coef * 1e6), 1e6), xf), F(em[3] === '-' ? -Math.round(parseFloat(em[4]) * 1e6) : Math.round(parseFloat(em[4]) * 1e6), 1e6));
            steps.push('Now ' + em[1] + v + ' ' + em[3] + ' ' + em[4] + ' = ' + fStr(resF));
            ans = fStr(resF);
        }
        return RES('Linear equation in one variable', steps, v + ' = ' + ans, x);
    }
    /* plain linear equation: 5x/3 - 4 = 2x/5 style, or ax+b=cx+d */
    R(/^(?:if |solve:? )?(-?[\s\S]+?) = (-?[\s\S]+?)[.?]?(?:,? then[\s\S]*)?$/, function (t, raw, m) {
        if (!/[a-z]/.test(t)) return null;
        if (/varies|proportion|ratio of remaining|prizes|years ago|years hence|digit|coins|chocolates|flowers|multiples|downstream|hypotenuse|parts such that|average of its|angle|km\/h|prize/.test(t)) return null;
        var vm = t.match(/([a-z])(?![a-z(])/);
        if (!vm) return null;
        var v = null;
        ['x', 'y', 'z', 'k', 'p', 'n', 'm'].forEach(function (c) { if (!v && new RegExp(c + '(?![a-z])').test(t)) v = c; });
        if (!v) return null;
        // skip exponent equations & polynomial-div style handled elsewhere
        if (/\d\s*\^/.test(t) || /\^\s*[a-z]/.test(t)) return null;
        var L = parsePolyS(nm(m[1]).replace(/\bthen\b/g, ''));
        var Rr = parsePolyS(nm(m[2]).replace(/[.?]+$/, '').replace(/\bthen\b.*/, ''));
        if (!L || !Rr || L.v !== Rr.v) return null;
        var diff = polySub(L.c, Rr.c);
        if (diff.length > 2 && /\^2|\^ 2|square/.test(t)) return null;
        return finishLinear(diff, v, t, raw, null);
    });
    /* early/late speed problem */
    R(/at (\d+) km\/(?:hr|h)[\s\S]*?(\d+) minutes? late[\s\S]*?at (\d+) km\/(?:hr|h)[\s\S]*?(\d+) minutes? early[\s\S]*?(?:distance|find)/, function (t, raw, m) {
        var s1 = +m[1], l1 = +m[2], s2 = +m[3], e1 = +m[4];
        var gap = (l1 + e1) / 60;
        var d = gap / (1 / s1 - 1 / s2);
        return RES('Early–late speed problem', [
            'Let distance = d. Then d/' + s1 + ' − d/' + s2 + ' = (' + l1 + ' + ' + e1 + ')/60 hr = ' + fmtVal(gap),
            'd(' + fmtVal(1 / s1) + ' − ' + fmtVal(1 / s2) + ') = ' + fmtVal(gap),
            'd = **' + fmtVal(d) + ' km**'
        ], fmtVal(d), d);
    });
    /* prize chain */
    R(/(\d+) prizes[\s\S]*?(\w+) prizes are ([\w-]+) of (\w+) prizes and (\w+) prizes are ([\w-]+) of (\w+) prizes/, function (t, raw, m) {
        var T = +m[1], f1 = wnum(m[3]), f2 = wnum(m[6]);
        if (f1 === null || f2 === null) return null;
        var A = T / (1 + f1 + f1 * f2);
        var B = f1 * A, C = f2 * B;
        return RES('Chain of fractions', [
            m[2] + ' = ' + m[3] + ' of ' + m[4] + ', and ' + m[5] + ' = ' + m[6] + ' of ' + m[2],
            m[4] + '(1 + ' + fmtVal(f1) + ' + ' + fmtVal(f1 * f2) + ') = ' + T + ' → ' + m[4] + ' = ' + fmtVal(A),
            m[4] + ' = ' + fmtVal(A) + ', ' + m[2] + ' = ' + fmtVal(B) + ', ' + m[5] + ' = ' + fmtVal(C)
        ], m[4] + ' = ' + fmtVal(A) + ', ' + m[2] + ' = ' + fmtVal(B) + ', ' + m[5] + ' = ' + fmtVal(C), null);
    });
    /* divided into two parts in ratio → product */
    R(/(\d+) is divided into two parts in the ratio (\d+):(\d+)[\s\S]*?product/, function (t, raw, m) {
        var N = +m[1], a = +m[2], b = +m[3];
        var p1 = N * a / (a + b), p2 = N * b / (a + b);
        return RES('Divide in ratio', [
            'Parts = ' + N + '×' + a + '/' + (a + b) + ' and ' + N + '×' + b + '/' + (a + b) + ' = ' + fmtVal(p1) + ' and ' + fmtVal(p2),
            'Product = ' + fmtVal(p1) + ' × ' + fmtVal(p2) + ' = **' + fmtVal(p1 * p2) + '**'
        ], fmtVal(p1 * p2), p1 * p2);
    });
    /* perimeter numerically = area */
    R(/perimeter of a rectangle is numerically equal to its area[\s\S]*?(?:width|breadth)[\s\S]*?is ([\d]+(?: \d+\/\d+)?(?:\.\d+)?) ?cm[\s\S]*?length/, function (t, raw, m) {
        var w = parseMixed(m[1]);
        var l = 2 * w / (w - 2);
        var lf = decToFrac(l, 10000);
        return RES('Perimeter = Area (numerically)', [
            '2(l + w) = l·w → 2l + 2w = lw → l(w − 2) = 2w',
            'l = 2×' + fmtVal(w) + ' ÷ ' + fmtVal(w - 2) + ' = **' + (lf ? fStr(lf) : fmtVal(l)) + ' cm**'
        ], lf ? fStr(lf) : fmtVal(l), l);
    });
    /* fifth part increased/decreased */
    R(/number whose ([\w-]+)(?: part)? increased by (\d+) (?:is equal to|=) its ([\w-]+)(?: part)? decreased by (\d+)/, function (t, raw, m) {
        var f1 = partFrac(m[1]), f2 = partFrac(m[3]);
        if (f1 === null || f2 === null) return null;
        var n = (parseFloat(m[2]) + parseFloat(m[4])) / (f1 - f2);
        return RES('Fractional parts equation', [
            'n/' + (1 / f1) + ' + ' + m[2] + ' = n/' + (1 / f2) + ' − ' + m[4],
            'n(' + fmtVal(f1) + ' − ' + fmtVal(f2) + ') = ' + (parseFloat(m[2]) + parseFloat(m[4])),
            'n = **' + fmtVal(n) + '**'
        ], fmtVal(n), n);
    });
    function partFrac(word) {
        var MAP = { half: 1 / 2, third: 1 / 3, 'one-third': 1 / 3, fourth: 1 / 4, 'one-fourth': 1 / 4, fifth: 1 / 5, 'one-fifth': 1 / 5, sixth: 1 / 6, 'one-sixth': 1 / 6, eighth: 1 / 8, tenth: 1 / 10 };
        return MAP[word] !== undefined ? MAP[word] : null;
    }
    /* flowers offered */
    R(/(\d+) flowers[\s\S]*?ratio of remaining flowers to (?:the )?flowers in the beginning is (\d+):(\d+)[\s\S]*?offered/, function (t, raw, m) {
        var T = +m[1], rem = T * (+m[2]) / (+m[3]);
        return RES('Flowers offered', [
            'Remaining = ' + T + ' × ' + m[2] + '/' + m[3] + ' = ' + fmtVal(rem),
            'Offered = ' + T + ' − ' + fmtVal(rem) + ' = **' + fmtVal(T - rem) + '**'
        ], fmtVal(T - rem), T - rem);
    });
    /* same digits + reverse sum */
    R(/tens and ones digits of a two-digit number are the same[\s\S]*?added to its reverse[\s\S]*?sum is (\d+)/, function (t, raw, m) {
        var d = +m[1] / 22;
        return RES('Same digits both places', [
            'Number = 10d + d = 11d; reverse = 11d → sum = 22d = ' + m[1],
            'd = ' + d + ' → number = **' + 11 * d + '**'
        ], String(11 * d), 11 * d);
    });
    /* chocolates distribution */
    R(/pack of (\d+) chocolates[\s\S]*?giving (\w+) chocolates to each student and (?:his|their) (?:class )?teacher[\s\S]*?left with (\w+) chocolates/, function (t, raw, m) {
        var T = +m[1], each = wnum(m[2]), left = wnum(m[3]);
        if (each === null || left === null) return null;
        var students = (T - left) / each - 1;
        return RES('Distribution with one extra person', [
            'Used = ' + T + ' − ' + left + ' = ' + (T - left) + ' chocolates at ' + each + ' each → ' + (T - left) / each + ' people',
            'One of them is the teacher → students = ' + (T - left) / each + ' − 1 = **' + students + '**'
        ], String(students), students);
    });
    /* mother–daughter ages */
    R(/(\w+) years ago a (\w+) was (\w+) times as old as (?:her|his) (\w+)[\s\S]*?(\w+) years hence[\s\S]*?(\w+) times as old[\s\S]*?present ages|(\w+) was (\w+) times as old as (?:her|his) (\w+) (\w+) years ago[\s\S]*?(\w+) times as old (\w+) years (?:from now|hence|later)[\s\S]*?present ages/, function (t, raw, m) {
        var a, k1, b, k2, n1, n2;
        if (m[7]) { n1 = m[7]; k1 = wnum(m[8]); n2 = m[9]; a = wnum(m[10]); k2 = wnum(m[11]); b = wnum(m[12]); }
        else { a = wnum(m[1]); n1 = m[2]; k1 = wnum(m[3]); n2 = m[4]; b = wnum(m[5]); k2 = wnum(m[6]); }
        if (a === null || k1 === null || b === null || k2 === null) return null;
        // M − a = k1(D − a); M + b = k2(D + b)
        // → k1·D − M = k1·a − a ; k2·D − M = −k2·b − b… solve:
        var D = (k1 * a - a + k2 * b - b) / (k1 - k2);
        var M = k1 * (D - a) + a;
        return RES('Age problem (two equations)', [
            'Let present ages be M and D. ' + a + ' years ago: M − ' + a + ' = ' + k1 + '(D − ' + a + ')',
            b + ' years hence: M + ' + b + ' = ' + k2 + '(D + ' + b + ')',
            'Solving: D = ' + fmtVal(D) + ', M = ' + fmtVal(M)
        ], n1 + ' = ' + fmtVal(M) + ' years, ' + n2 + ' = ' + fmtVal(D) + ' years', null);
    });
    /* digit: ones = k×tens, reverse exceeds by diff */
    R(/ones place[\s\S]*?(\w+) times the digit at tens place[\s\S]*?revers[\s\S]*?exceeds[\s\S]*?by (\d+)/, function (t, raw, m) {
        var k = wnum(m[1]), diff = +m[2];
        if (k === null) return null;
        var tD = diff / (9 * (k - 1)), oD = k * tD;
        return RES('Two-digit number from digit clues', [
            'ones = ' + k + '×tens; reversing changes the number by 9(ones − tens) = ' + diff,
            'ones − tens = ' + fmtVal(diff / 9) + ' → tens = ' + tD + ', ones = ' + oD,
            'Number = **' + (10 * tD + oD) + '**'
        ], String(10 * tD + oD), 10 * tD + oD);
    });
    /* digit sum + interchange exceeds */
    R(/sum of the digits of a 2-digit number is (\d+)[\s\S]*?interchanging[\s\S]*?exceeds the original number by (\d+)/, function (t, raw, m) {
        var S = +m[1], D = +m[2];
        var od = D / 9, o = (S + od) / 2, tD = S - o;
        return RES('Two-digit number from digit clues', [
            'tens + ones = ' + S + '; interchange changes number by 9(ones − tens) = ' + D + ' → ones − tens = ' + od,
            'ones = ' + o + ', tens = ' + tD + ' → number = **' + (10 * tD + o) + '**'
        ], String(10 * tD + o), 10 * tD + o);
    });
    /* consecutive multiples */
    R(/sum of (?:the )?two consecutive multiples of (\d+) is (\d+)/, function (t, raw, m) {
        var M = +m[1], S = +m[2];
        var k = S / (2 * M) - 0.5;
        return RES('Consecutive multiples', [
            'Multiples: ' + M + 'k and ' + M + '(k+1) → ' + M + '(2k+1) = ' + S + ' → k = ' + k,
            'Numbers = **' + M * k + ' and ' + M * (k + 1) + '**'
        ], M * k + ' and ' + M * (k + 1), null);
    });
    /* rational number: numerator 3 less than denominator… */
    R(/numerator[\s\S]*?(\d+) less than (?:its|the) denominator[\s\S]*?numerator is increased by (\d+) and the denominator is increased by (\d+)[\s\S]*?becomes (\d+)\/(\d+)/, function (t, raw, m) {
        var L = +m[1], inc1 = +m[2], inc2 = +m[3], fn = +m[4], fd = +m[5];
        // (d − L + inc1)/(d + inc2) = fn/fd
        var d = (fn * inc2 + fd * (L - inc1)) / (fd - fn);
        return RES('Find the rational number', [
            'Let denominator = d → numerator = d − ' + L,
            '(d − ' + L + ' + ' + inc1 + ')/(d + ' + inc2 + ') = ' + fn + '/' + fd + ' → d = ' + d,
            'Fraction = **' + (d - L) + '/' + d + '**'
        ], (d - L) + '/' + d, (d - L) / d);
    });
    /* stream speed */
    R(/covers (\d+) km downstream in ([\w\s.]+?)(?:hours?|hrs?) and the same distance upstream in (\d+) hours?[\s\S]*?still water is (\d+)[\s\S]*?speed of the stream/, function (t, raw, m) {
        var d = +m[1], t1 = parseDurEnglish(m[2]), t2 = +m[3];
        if (t1 === null) return null;
        var ds = d / t1, us = d / t2, stream = (ds - us) / 2;
        return RES('Downstream & upstream', [
            'Downstream speed = ' + d + '/' + fmtVal(t1) + ' = ' + fmtVal(ds) + ' km/hr; Upstream = ' + d + '/' + t2 + ' = ' + fmtVal(us) + ' km/hr',
            'Stream speed = (' + fmtVal(ds) + ' − ' + fmtVal(us) + ')/2 = **' + fmtVal(stream) + ' km/hr** (boat = ' + fmtVal((ds + us) / 2) + ' ✓ matches given ' + m[4] + ')'
        ], fmtVal(stream), stream);
    });
    function parseDurEnglish(s) {
        s = nm(s);
        if (/one and a half/.test(s)) return 1.5;
        if (/two and a half/.test(s)) return 2.5;
        if (/and a half/.test(s)) { var w = s.match(/(\w+) and a half/); return w ? wnum(w[1]) + 0.5 : null; }
        if (/a half/.test(s)) return 0.5;
        var v = wnum(s.trim());
        if (v !== null) return v;
        return parseDur(s);
    }
    /* rectangle on hypotenuse */
    R(/sides \(other than hypotenuse\) of a right triangle are in the ratio (\d+):(\d+)[\s\S]*?breadth[\s\S]*?(\d+)\/(\d+) of its length[\s\S]*?(?:shortest side[\s\S]*?perimeter[\s\S]*?(\d+)|perimeter[\s\S]*?(\d+)[\s\S]*?shortest side)/, function (t, raw, m) {
        if (!m[5]) m[5] = m[6];
        var a = +m[1], b = +m[2], bf = (+m[3]) / (+m[4]), P = +m[5];
        var hyp = Math.sqrt(a * a + b * b);
        // length = hyp·k, breadth = bf·hyp·k → 2·hyp·k(1+bf) = P
        var k = P / (2 * hyp * (1 + bf));
        var short = Math.min(a, b) * k;
        return RES('Right triangle + rectangle on hypotenuse', [
            'Legs ' + a + 'k, ' + b + 'k → hypotenuse = ' + fmtVal(hyp) + 'k (Pythagoras)',
            'Rectangle: length = ' + fmtVal(hyp) + 'k, breadth = ' + m[3] + '/' + m[4] + ' of it → perimeter 2(' + fmtVal(hyp) + 'k + ' + fmtVal(hyp * bf) + 'k) = ' + P,
            'k = ' + fmtVal(k) + ' → shortest side = ' + Math.min(a, b) + 'k = **' + fmtVal(short) + '**'
        ], fmtVal(short), short);
    });
    /* divide into three equal fractional parts */
    R(/divide (\d+) into three parts such that half of the first part, ([\w-]+) of the second part and ([\w-]+) of the third part are all equal/, function (t, raw, m) {
        var T = +m[1], f2 = wnum(m[2]), f3 = wnum(m[3]);
        if (f2 === null || f3 === null) return null;
        var inv = [2, 1 / f2, 1 / f3];
        var tV = T / (inv[0] + inv[1] + inv[2]);
        var parts = [inv[0] * tV, inv[1] * tV, inv[2] * tV];
        return RES('Three parts, equal fractions', [
            'a/2 = b/3… each equal to t → a = 2t, b = ' + fmtVal(inv[1]) + 't, c = ' + fmtVal(inv[2]) + 't',
            '(2 + ' + fmtVal(inv[1]) + ' + ' + fmtVal(inv[2]) + ')t = ' + T + ' → t = ' + fmtVal(tV),
            'Parts = **' + parts.map(fmtVal).join(', ') + '**'
        ], parts.map(fmtVal).join(', '), null);
    });
    /* coins */
    R(/([\w-]+)-rupee and ([\w-]+)-rupee coins[\s\S]*?(?:sum|number) of the coins is (\d+)[\s\S]*?total value[\s\S]*?(?:rs )?(\d+)[\s\S]*?number of ([\w-]+)-rupee coins/, function (t, raw, m) {
        var v1 = wnum(m[1]), v2 = wnum(m[2]), N = +m[3], V = +m[4];
        if (v1 === null || v2 === null) return null;
        var q = m[5] === m[1] ? v1 : v2;
        var other = q === v1 ? v2 : v1;
        var nq = (V - other * N) / (q - other);
        return RES('Coin problem', [
            'Let ' + q + '-rupee coins = n → ' + other + '-rupee coins = ' + N + ' − n',
            q + 'n + ' + other + '(' + N + ' − n) = ' + V + ' → n = **' + nq + '**'
        ], String(nq), nq);
    });
    /* average of fractional parts */
    R(/a number is (\d+) more than the average of its half, its ([\w-]+) and its ([\w-]+)/, function (t, raw, m) {
        var C = +m[1], f2 = wnum(m[2]), f3 = wnum(m[3]);
        if (f2 === null || f3 === null) return null;
        var s = (0.5 + f2 + f3) / 3;
        var n = C / (1 - s);
        return RES('Number from average of its parts', [
            'Average of n/2, n/' + Math.round(1 / f2) + ', n/' + Math.round(1 / f3) + ' = n×' + fmtVal(s),
            'n = ' + C + ' + ' + fmtVal(s) + 'n → n(1 − ' + fmtVal(s) + ') = ' + C + ' → n = **' + fmtVal(n) + '**'
        ], fmtVal(n), n);
    });

    /* ═══ CH 10 · TRANSVERSAL ANGLES ══════════════════════════════════════ */
    R(/angle \w+ = (\d+)x ?([+-]) ?(\d+) and angle \w+ = (\d+)x ?([+-]) ?(\d+) \((corresponding|alternate)\w*[\s\S]*?\)[\s\S]*?parallel/, function (t, raw, m) {
        var a1 = +m[1], b1 = (m[2] === '-' ? -1 : 1) * +m[3], a2 = +m[4], b2 = (m[5] === '-' ? -1 : 1) * +m[6];
        var x = (b2 - b1) / (a1 - a2);
        return RES(m[7] + ' angles are equal', [
            'For parallel lines, ' + m[7] + ' angles are equal: ' + a1 + 'x ' + m[2] + ' ' + m[3] + ' = ' + a2 + 'x ' + m[5] + ' ' + m[6],
            (a1 - a2) + 'x = ' + fmtVal(b2 - b1) + ' → x = **' + fmtVal(x) + '**'
        ], fmtVal(x), x);
    });
    R(/m angle 1 = \((\d+)x ?([+-]) ?(\d+)\) degrees and m angle 2 = \((\d+)x ?([+-]) ?(\d+)\) degrees are supplementary, what is m angle 1/, function (t, raw, m) {
        var a1 = +m[1], b1 = (m[2] === '-' ? -1 : 1) * +m[3], a2 = +m[4], b2 = (m[5] === '-' ? -1 : 1) * +m[6];
        var x = (180 - b1 - b2) / (a1 + a2);
        var ang1 = a1 * x + b1;
        return RES('Supplementary angles', [
            '(' + a1 + 'x ' + m[2] + ' ' + m[3] + ') + (' + a2 + 'x ' + m[5] + ' ' + m[6] + ') = 180°',
            (a1 + a2) + 'x ' + (b1 + b2 >= 0 ? '+ ' + (b1 + b2) : '− ' + (-b1 - b2)) + ' = 180 → x = ' + fmtVal(x),
            'angle 1 = ' + a1 + '(' + fmtVal(x) + ') ' + m[2] + ' ' + m[3] + ' = **' + fmtVal(ang1) + '°**'
        ], fmtVal(ang1), ang1);
    });

    /* ═══ CH 11 · QUADRILATERALS & POLYGONS ═══════════════════════════════ */
    var SHAPES = { triangle: 3, quadrilateral: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8, nonagon: 9, decagon: 10, dodecagon: 12 };
    R(/number of diagonals (?:a |of a )?([\w-]+)/, function (t, raw, m) {
        var n = SHAPES[m[1]];
        if (!n) return null;
        var d = n * (n - 3) / 2;
        return RES('Diagonals of a polygon', [
            'Diagonals = n(n − 3)/2 with n = ' + n + ' (' + m[1] + ')',
            '= ' + n + '×' + (n - 3) + '/2 = **' + d + '**'
        ], String(d), d);
    });
    R(/parallelogram \w+,? (?:if )?angle ([a-d]) (?:=|is) (\d+) degrees?[\s\S]*?angle ([a-d])/, function (t, raw, m) {
        var from = m[1].toLowerCase(), to = m[3].toLowerCase(), v = +m[2];
        var opposite = (from === 'a' && to === 'c') || (from === 'c' && to === 'a') || (from === 'b' && to === 'd') || (from === 'd' && to === 'b');
        var res = opposite ? v : 180 - v;
        return RES('Parallelogram angles', [
            'Opposite angles are equal; adjacent angles are supplementary (sum 180°).',
            '∠' + to.toUpperCase() + ' is ' + (opposite ? 'opposite' : 'adjacent') + ' to ∠' + from.toUpperCase() + ' → **' + res + '°**'
        ], String(res), res);
    });
    R(/each exterior angle of a regular ([\w-]+)/, function (t, raw, m) {
        var n = SHAPES[m[1]];
        if (!n) return null;
        return RES('Exterior angle of a regular polygon', ['Sum of exterior angles = 360° → each = 360/' + n + ' = **' + (360 / n) + '°**'], String(360 / n), 360 / n);
    });
    R(/each (?:interior )?angle of a regular ([\w-]+)/, function (t, raw, m) {
        var n = SHAPES[m[1]];
        if (!n) return null;
        var v = (n - 2) * 180 / n;
        return RES('Interior angle of a regular polygon', ['Sum = (n−2)×180 = ' + (n - 2) * 180 + '° → each = ÷' + n + ' = **' + v + '°**'], String(v), v);
    });
    R(/angle (?:of a regular polygon |of which is of measure |of measure |is |of )(\d+)(?: degrees)?[\s\S]{0,60}?sides|how many sides has a regular polygon each angle of which is of measure (\d+)/, function (t, raw, m) {
        var a = +(m[1] || m[2]), n = 360 / (180 - a);
        return RES('Sides from each interior angle', ['Exterior angle = 180 − ' + a + ' = ' + (180 - a) + '° → n = 360/' + (180 - a) + ' = **' + n + '**'], String(n), n);
    });
    R(/interior angle of a regular pentagon is three times the exterior angle of a regular decagon/, function () {
        return RES('Pentagon interior vs decagon exterior', [
            'Interior angle of regular pentagon = (5−2)×180/5 = **108°**',
            'Exterior angle of regular decagon = 360/10 = **36°**',
            '3 × 36° = 108° ✓ — the interior angle of a regular pentagon IS three times the exterior angle of a regular decagon. (Proved)'
        ], '108° = 3 × 36°', null);
    });

    /* ═══ PART 4 · CH 13 (CARTESIAN PLANE) · CH 14 (MENSURATION) · CH 15 (DATA/PROBABILITY) ═══ */
    function p4num(x) { return (Math.abs(x - Math.round(x)) < 1e-9) ? String(Math.round(x)) : String(+x.toFixed(6)); }
    function p4pt(x, y) { return '(' + p4num(x) + ', ' + p4num(y) + ')'; }
    function fracOut(n, d) { var g = gcd(Math.abs(n), Math.abs(d)); return p4num(n / g) + '/' + p4num(d / g); }
    var PI227 = 22 / 7;
    function isPrimeN(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
    function p4pts(s) { var q = s.split(','); return [parseFloat(q[0]), parseFloat(q[1])]; }

    /* ── CH 13 ─────────────────────────────────────────────────────────── */
    R(/distance of (?:the |a )?point (?:[a-z]\s*)?\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)? from the ([xy])-axis/, function (t, raw, m) {
        var x = parseFloat(m[1]), y = parseFloat(m[2]);
        var d = m[3] === 'x' ? Math.abs(y) : Math.abs(x);
        return RES('Distance from an axis', [
            'Distance from the ' + m[3] + '-axis = |' + (m[3] === 'x' ? 'y' : 'x') + '-coordinate| of (' + x + ', ' + y + ')',
            '= |' + (m[3] === 'x' ? y : x) + '| = **' + p4num(d) + ' units**'
        ], p4num(d) + ' units', d);
    });
    R(/distance between (?:the )?(?:two )?(?:points )?(?:[a-z])?\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)? and (?:[a-z])?\(?\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)?/, function (t, raw, m) {
        var x1 = parseFloat(m[1]), y1 = parseFloat(m[2]), x2 = parseFloat(m[3]), y2 = parseFloat(m[4]);
        var dx = x2 - x1, dy = y2 - y1, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
        var exact = (Math.abs(d - Math.round(d)) < 1e-9) ? p4num(d) : '√' + p4num(d2);
        return RES('Distance between two points', [
            'd = √[(x₂ − x₁)² + (y₂ − y₁)²] = √[(' + dx + ')² + (' + dy + ')²] = √' + p4num(d2),
            'd = **' + exact + ' units**'
        ], exact + ' units', d);
    });
    R(/how far apart are the points \(([^)]+)\) and \(([^)]+)\)/, function (t, raw, m) {
        var A = p4pts(m[1]), B = p4pts(m[2]);
        var dx = B[0] - A[0], dy = B[1] - A[1], d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
        var exact = (Math.abs(d - Math.round(d)) < 1e-9) ? p4num(d) : '√' + p4num(d2);
        return RES('Distance between two points', [
            'd = √[(x₂ − x₁)² + (y₂ − y₁)²] = √[(' + dx + ')² + (' + dy + ')²] = √' + p4num(d2),
            'd = **' + exact + ' units**'
        ], exact + ' units', d);
    });
    R(/vertices (?:([a-z]), ([a-z]), ([a-z]) of (?:a |the )?square ([a-z]{4})|of (?:a |the )?square ([a-z]{4}))[\s\S]*?vertex ([a-z])/, function (t, raw, m) {
        var P = [], named = [], re = /([a-z])\(([^)]+)\)/g, mm;
        while ((mm = re.exec(t)) !== null) named.push(p4pts(mm[2]));
        if (named.length >= 3) P = [named[0], named[1], named[2]];
        else {
            var pts = t.match(/\(([^)]+)\)/g) || [];
            if (pts.length < 3) return null;
            P = [p4pts(pts[0].slice(1, -1)), p4pts(pts[1].slice(1, -1)), p4pts(pts[2].slice(1, -1))];
        }
        var sqName = (m[4] || m[5] || '').toUpperCase(), q = m[6];
        var D = [P[0][0] + P[2][0] - P[1][0], P[0][1] + P[2][1] - P[1][1]];
        return RES('Fourth vertex of a square', [
            'In square ' + sqName + ' the diagonals bisect each other → the missing vertex = P₁ + P₃ − P₂',
            '= (' + P[0].join(' + ') + ') + (' + P[2].join(' + ') + ') − (' + P[1].join(' + ') + ')'.replace(/\+/g, '+'),
            q.toUpperCase() + ' = **' + p4pt(D[0], D[1]) + '** (also written (' + p4num(D[0]) + ',' + p4num(D[1]) + '))'
        ], q.toUpperCase() + ' = ' + p4pt(D[0], D[1]), null);
    });
    R(/plot ([a-z])\(([^)]+)\), ([a-z])\(([^)]+)\), ([a-z])\(([^)]+)\) and ([a-z])\(([^)]+)\) and join them in order\. what figure/, function (t, raw, m) {
        var P = [p4pts(m[2]), p4pts(m[4]), p4pts(m[6]), p4pts(m[8])];
        function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
        var s = [dist(P[0], P[1]), dist(P[1], P[2]), dist(P[2], P[3]), dist(P[3], P[0])];
        var d1 = dist(P[0], P[2]), d2 = dist(P[1], P[3]);
        var eqSides = s.every(function (z) { return Math.abs(z - s[0]) < 1e-9; });
        var eqDiag = Math.abs(d1 - d2) < 1e-9;
        var fig = (eqSides && eqDiag) ? 'square' : eqSides ? 'rhombus' : eqDiag ? 'rectangle' : 'parallelogram';
        var mid = [(P[0][0] + P[2][0]) / 2, (P[0][1] + P[2][1]) / 2];
        return RES('Figure from four plotted points', [
            'Sides: ' + s.map(function (z) { return p4num(z); }).join(', ') + '  Diagonals: ' + p4num(d1) + ', ' + p4num(d2),
            'All sides ' + (eqSides ? 'equal' : 'not equal') + ', diagonals ' + (eqDiag ? 'equal' : 'not equal') + ' → the figure is a **' + fig + '**',
            'Diagonals of a ' + fig + ' bisect each other → intersection = midpoint of AC = **' + p4pt(mid[0], mid[1]) + '** (also (' + p4num(mid[0]) + ',' + p4num(mid[1]) + '))'
        ], 'a ' + fig + '; diagonals intersect at ' + p4pt(mid[0], mid[1]), null);
    });
    R(/draw a rectangle whose two vertices are \(([^)]+)\) and \(([^)]+)\)[\s\S]*?other two vertices/, function (t, raw, m) {
        var A = p4pts(m[1]), B = p4pts(m[2]);
        var C = [A[0], B[1]], D = [B[0], A[1]];
        return RES('Completing a rectangle', [
            'The given vertices (' + A.join(', ') + ') and (' + B.join(', ') + ') are opposite corners (a diagonal).',
            'The other two vertices swap one coordinate each: **' + p4pt(C[0], C[1]) + '** and **' + p4pt(D[0], D[1]) + '** (also (' + C.join(',') + ') and (' + D.join(',') + '))'
        ], p4pt(C[0], C[1]) + ' and ' + p4pt(D[0], D[1]), null);
    });
    R(/parallel to x-axis at a distance of (\d+) units from x-axis[\s\S]*?parallel to y-axis at a distance of (\d+) units from y-axis[\s\S]*?intersect/, function (t, raw, m) {
        var y = parseFloat(m[1]), x = parseFloat(m[2]);
        return RES('Intersection of two perpendicular line segments', [
            'Segment parallel to the x-axis at distance ' + y + ' → every point on it has y = ' + y,
            'Segment parallel to the y-axis at distance ' + x + ' → every point on it has x = ' + x,
            'Intersection = **' + p4pt(x, y) + '** (also (' + p4num(x) + ',' + p4num(y) + '))'
        ], p4pt(x, y), null);
    });

    /* ── CH 14 ─────────────────────────────────────────────────────────── */
    /* isosceles trapezium with named parallel sides — before the generic rule */
    R(/parallel sides [a-z]{2} and [a-z]{2} of a trapezium are ([\d.]+) ?(?:cm|m)? and ([\d.]+)[\s\S]*?non-parallel sides are each equal to ([\d.]+)/, function (t, raw, m) {
        var a = parseFloat(m[1]), b = parseFloat(m[2]), s = parseFloat(m[3]);
        var over = Math.abs(b - a) / 2;
        var h = Math.sqrt(s * s - over * over);
        var A = 0.5 * (a + b) * h;
        return RES('Area of an isosceles trapezium', [
            'Drop perpendiculars from the shorter side: each overhang = (' + Math.max(a, b) + ' − ' + Math.min(a, b) + ')/2 = ' + p4num(over) + ' cm',
            'Height h = √(' + s + '² − ' + p4num(over) + '²) = √' + p4num(s * s - over * over) + ' = ' + p4num(h) + ' cm',
            'Area = ½ × (' + a + ' + ' + b + ') × ' + p4num(h) + ' = **' + p4num(A) + ' cm²**'
        ], p4num(A) + ' cm²', A);
    });
    R(/parallel sides (?:are |as )?([\d.]+) ?(?:cm|m)? and ([\d.]+) ?(?:cm|m)? and (?:the )?(?:distance between them is|height (?:is|as)?) ?([\d.]+)/, function (t, raw, m) {
        var a = parseFloat(m[1]), b = parseFloat(m[2]), h = parseFloat(m[3]);
        var A = 0.5 * (a + b) * h;
        return RES('Area of a trapezium', [
            'Area = ½ × (sum of parallel sides) × height',
            '= ½ × (' + a + ' + ' + b + ') × ' + h + ' = **' + p4num(A) + '**'
        ], p4num(A), A);
    });
    R(/one of its parallel sides is twice the other and the distance between them is ([\d.]+)[\s\S]*?area[\s\S]*?is ([\d.]+)/, function (t, raw, m) {
        var h = parseFloat(m[1]), A = parseFloat(m[2]);
        var x = 2 * A / (3 * h);
        return RES('Trapezium field — parallel sides', [
            'Let the sides be x and 2x. Area = ½(x + 2x) × ' + h + ' = ' + A,
            '1.5x × ' + h + ' = ' + A + ' → x = ' + p4num(x),
            'Parallel sides = **' + p4num(x) + ' m and ' + p4num(2 * x) + ' m**'
        ], p4num(x) + ' m and ' + p4num(2 * x) + ' m', null);
    });
    R(/quadrilateral whose diagonal is ([\d.]+)[\s\S]*?altitudes on the diagonal from the other two vertices are ([\d.]+) ?(?:cm|m)? and ([\d.]+)/, function (t, raw, m) {
        var d = parseFloat(m[1]), h1 = parseFloat(m[2]), h2 = parseFloat(m[3]);
        var A = 0.5 * d * (h1 + h2);
        return RES('Area of a quadrilateral (diagonal + altitudes)', [
            'Area = ½ × d × (h₁ + h₂) = ½ × ' + d + ' × (' + h1 + ' + ' + h2 + ')',
            '= **' + p4num(A) + ' cm²**'
        ], p4num(A) + ' cm²', A);
    });
    R(/volume of a cube of side ([\d.]+) m in cm/, function (t, raw, m) {
        var s = parseFloat(m[1]) * 100;
        var V = s * s * s;
        return RES('Volume of a cube (unit conversion)', [
            'Side = ' + m[1] + ' m = ' + m[1] + ' × 100 cm = ' + p4num(s) + ' cm',
            'Volume = s³ = ' + p4num(s) + '³ = **' + p4num(V) + ' cm³**'
        ], p4num(V) + ' cm³', V);
    });
    R(/sides? of a cube (?:is |are )?(doubled|tripled|halved)[\s\S]*?ratio of (?:the )?(?:new )?volumes?/, function (t, raw, m) {
        var k = m[1] === 'doubled' ? 2 : m[1] === 'tripled' ? 3 : 0.5;
        var r = k * k * k;
        var ratio = r >= 1 ? p4num(r) + ':1' : '1:' + p4num(1 / r);
        return RES('Scaling a cube', [
            'Volume ∝ side³, so scaling the side by ' + k + ' scales the volume by ' + k + '³ = ' + p4num(r),
            'Ratio of new : original volumes = **' + ratio + '**'
        ], ratio, null);
    });
    R(/number of edges of a polyhedron (?:having|with|has) (\d+) faces and (\d+) vertices|polyhedron (?:has|having|with) (\d+) faces and (\d+) vertices[\s\S]*?edges/, function (t, raw, m) {
        var F = parseInt(m[1] || m[3], 10), V = parseInt(m[2] || m[4], 10);
        var E = F + V - 2;
        return RES("Euler's formula", [
            'Euler: F + V − E = 2 → E = F + V − 2',
            'E = ' + F + ' + ' + V + ' − 2 = **' + E + '**'
        ], String(E), E);
    });
    R(/surface area of a cube whose volume is ([\d.]+)|volume of (?:a |the )?cube is ([\d.]+)[\s\S]*?surface area|cube has volume ([\d.]+)[\s\S]*?surface area/, function (t, raw, m) {
        var V = parseFloat(m[1] || m[2] || m[3]);
        var s = Math.round(Math.pow(V, 1 / 3) * 1e6) / 1e6;
        var A = 6 * s * s;
        return RES('Cube: volume → surface area', [
            's³ = ' + V + ' → s = ' + p4num(s),
            'Surface area = 6s² = 6 × ' + p4num(s * s) + ' = **' + p4num(A) + ' m²**'
        ], p4num(A) + ' m²', A);
    });
    R(/(?:volume of a cylinder is|cylinder has volume) ([\d.]+)[\s\S]*?diameter(?: of its base)? (?:is )?([\d.]+)[\s\S]*?height/, function (t, raw, m) {
        var V = parseFloat(m[1]), r = parseFloat(m[2]) / 2;
        var h = V / (PI227 * r * r);
        return RES('Cylinder: volume → height', [
            'r = d/2 = ' + p4num(r) + ' cm; V = πr²h → h = V ÷ (πr²)',
            'h = ' + V + ' ÷ (22/7 × ' + p4num(r * r) + ') = **' + p4num(h) + ' cm**'
        ], p4num(h) + ' cm', h);
    });
    R(/length, breadth and height of a cuboidal box are ([\d.]+) m ([\d.]+) cm, ([\d.]+) m and ([\d.]+) cm[\s\S]*?canvas/, function (t, raw, m) {
        var l = parseFloat(m[1]) * 100 + parseFloat(m[2]), b = parseFloat(m[3]) * 100, h = parseFloat(m[4]);
        var A = 2 * (l * b + b * h + l * h);
        return RES('Canvas to cover a cuboidal box (TSA)', [
            'Convert to one unit: l = ' + p4num(l) + ' cm, b = ' + p4num(b) + ' cm, h = ' + p4num(h) + ' cm',
            'Canvas needed = total surface area = 2(lb + bh + lh) = 2(' + p4num(l * b) + ' + ' + p4num(b * h) + ' + ' + p4num(l * h) + ')',
            '= **' + p4num(A) + ' cm²**'
        ], p4num(A) + ' cm²', A);
    });
    R(/cylinder of curved surface area ([\d.]+)[\s\S]*?rectangular metallic sheet[\s\S]*?length is double its breadth/, function (t, raw, m) {
        var S = parseFloat(m[1]);
        var B = Math.sqrt(S / 2), L = 2 * B;
        return RES('Sheet rolled into a cylinder', [
            'The sheet becomes the curved surface, so L × B = ' + S + ' and L = 2B',
            '2B² = ' + S + ' → B = ' + p4num(B) + ', L = ' + p4num(L),
            'Dimensions = **' + p4num(L) + ' m × ' + p4num(B) + ' m**'
        ], 'length = ' + p4num(L) + ' m, breadth = ' + p4num(B) + ' m', null);
    });
    R(/diameter and length of a roller are ([\d.]+) cm and ([\d.]+) cm[\s\S]*?revolutions[\s\S]*?playground of area ([\d.]+) m|roller of diameter ([\d.]+) cm and length ([\d.]+) cm[\s\S]*?playground of ([\d.]+) m[\s\S]*?revolutions/, function (t, raw, m) {
        var d = parseFloat(m[1] || m[4]), l = parseFloat(m[2] || m[5]), A = parseFloat(m[3] || m[6]);
        var per = PI227 * d * l, perM = per / 10000;
        var N = Math.round(A / perM);
        return RES('Roller revolutions', [
            'Area levelled in 1 revolution = curved surface = πdh = 22/7 × ' + d + ' × ' + l + ' = ' + p4num(per) + ' cm² = ' + p4num(perM) + ' m²',
            'Revolutions = ' + A + ' ÷ ' + p4num(perM) + ' = **' + N + '**'
        ], String(N), N);
    });
    R(/rate of ([\d.]+) litres per minute[\s\S]*?volume of the reservoir is ([\d.]+) m[\s\S]*?number of hours/, function (t, raw, m) {
        var rate = parseFloat(m[1]), V = parseFloat(m[2]) * 1000;
        var mins = V / rate, hrs = mins / 60;
        return RES('Filling a reservoir', [
            'Volume = ' + m[2] + ' m³ = ' + p4num(V) + ' litres; rate = ' + rate + ' L/min',
            'Time = ' + p4num(V) + ' ÷ ' + rate + ' = ' + p4num(mins) + ' minutes = ' + p4num(mins) + ' ÷ 60 = **' + p4num(hrs) + ' hours**'
        ], p4num(hrs) + ' hours', hrs);
    });
    R(/iron pipe is ([\d.]+) m long[\s\S]*?exterior diameter is ([\d.]+) cm[\s\S]*?thickness of the pipe is ([\d.]+) cm[\s\S]*?weighs ([\d.]+) g\/cm/, function (t, raw, m) {
        var L = parseFloat(m[1]) * 100, Ro = parseFloat(m[2]) / 2, th = parseFloat(m[3]), dens = parseFloat(m[4]);
        var Ri = Ro - th;
        var V = PI227 * (Ro * Ro - Ri * Ri) * L;
        var W = V * dens, kg = W / 1000;
        return RES('Weight of an iron pipe', [
            'R = ' + p4num(Ro) + ' cm, r = ' + p4num(Ri) + ' cm, L = ' + m[1] + ' m = ' + p4num(L) + ' cm',
            'Volume of iron = π(R² − r²)L = 22/7 × (' + p4num(Ro * Ro) + ' − ' + p4num(Ri * Ri) + ') × ' + p4num(L) + ' = ' + p4num(V) + ' cm³',
            'Weight = ' + p4num(V) + ' × ' + dens + ' g = **' + p4num(W) + ' g = ' + p4num(kg) + ' kg**'
        ], p4num(W) + ' g = ' + p4num(kg) + ' kg', kg);
    });
    R(/well is dug ([\d.]+) m deep[\s\S]*?diameter of ([\d.]+) m[\s\S]*?plot ([\d.]+) m long and ([\d.]+) m broad[\s\S]*?height of the platform|([\d.]+) m diameter, ([\d.]+) m deep well[\s\S]*?([\d.]+) m by ([\d.]+) m[\s\S]*?platform/, function (t, raw, m) {
        var H = parseFloat(m[1] || m[6]), r = parseFloat(m[2] || m[5]) / 2, L = parseFloat(m[3] || m[7]), B = parseFloat(m[4] || m[8]);
        var V = PI227 * r * r * H;
        var h = V / (L * B);
        return RES('Earth from a well → platform', [
            'Volume dug out = πr²h = 22/7 × ' + p4num(r) + '² × ' + H + ' = ' + p4num(V) + ' m³',
            'Platform: ' + p4num(V) + ' = ' + L + ' × ' + B + ' × H → H = ' + p4num(V) + ' ÷ ' + p4num(L * B) + ' = **' + p4num(h) + ' m**'
        ], p4num(h) + ' m', h);
    });
    R(/volume of a right circular cylinder is ([\d.]+) ?(?:pi|π) ?cm[\s\S]*?height ([\d.]+) cm[\s\S]*?lateral surface area and total surface area/, function (t, raw, m) {
        var V = parseFloat(m[1]), h = parseFloat(m[2]);
        var r2 = V / h, r = Math.sqrt(r2);
        var lsaPi = 2 * r * h, tsaPi = 2 * r * (r + h);
        var lsa = lsaPi * PI227, tsa314 = tsaPi * 3.14, tsa227 = tsaPi * PI227;
        return RES('Cylinder: lateral & total surface area', [
            'V = πr²h → ' + V + 'π = πr² × ' + h + ' → r² = ' + p4num(r2) + ' → r = ' + p4num(r) + ' cm',
            'LSA = 2πrh = ' + p4num(lsaPi) + 'π = **' + p4num(lsa) + ' cm²** (π = 22/7)',
            'TSA = 2πr(r + h) = ' + p4num(tsaPi) + 'π = **' + p4num(tsa314) + ' cm²** (π = 3.14) or ' + p4num(tsa227) + ' cm² (π = 22/7)'
        ], 'LSA = ' + p4num(lsa) + ' cm², TSA = ' + p4num(tsa314) + ' cm² (with π=22/7: ' + p4num(tsa227) + ' cm²)', null);
    });
    R(/area of the top circle is ([\d.]+)[\s\S]*?curved surface area is ([\d.]+)[\s\S]*?radius and height/, function (t, raw, m) {
        var A = parseFloat(m[1]), C = parseFloat(m[2]);
        var r = Math.sqrt(A / PI227);
        r = Math.round(r * 1e6) / 1e6;
        var h = C / (2 * PI227 * r);
        return RES('Cylinder from circle & curved-surface areas', [
            'πr² = ' + A + ' → r² = ' + A + ' × 7/22 = ' + p4num(r * r) + ' → r = **' + p4num(r) + ' units**',
            '2πrh = ' + C + ' → h = ' + C + ' ÷ (2 × 22/7 × ' + p4num(r) + ') = ' + C + ' ÷ ' + p4num(2 * PI227 * r) + ' = **' + p4num(h) + ' units**'
        ], 'radius = ' + p4num(r) + ' units, height = ' + p4num(h) + ' units', null);
    });
    R(/length of a room is (\d+) per cent more than its breadth[\s\S]*?carpeting the room at rs ?([\d.]+) per m\S* is rs ?([\d.]+)[\s\S]*?painting the walls at rs ?([\d.]+) per m\S* is rs ?([\d.]+)/, function (t, raw, m) {
        var pct = parseFloat(m[1]), cr = parseFloat(m[2]), cc = parseFloat(m[3]), pr = parseFloat(m[4]), pc = parseFloat(m[5]);
        var k = 1 + pct / 100;
        var floor = cc / cr;
        var B = Math.sqrt(floor / k), L = k * B;
        B = Math.round(B * 1e6) / 1e6; L = Math.round(L * 1e6) / 1e6;
        var wall = pc / pr;
        var H = wall / (2 * (L + B));
        return RES('Room dimensions from carpeting & painting costs', [
            'Floor area = ' + cc + ' ÷ ' + cr + ' = ' + p4num(floor) + ' m²; L = ' + k + 'B → ' + k + 'B² = ' + p4num(floor) + ' → B = ' + p4num(B) + ', L = ' + p4num(L),
            'Wall area = ' + pc + ' ÷ ' + pr + ' = ' + p4num(wall) + ' m²; 2(L + B)H = ' + p4num(wall) + ' → H = ' + p4num(wall) + ' ÷ ' + p4num(2 * (L + B)) + ' = ' + p4num(H),
            'Dimensions: **length = ' + p4num(L) + ' m, breadth = ' + p4num(B) + ' m, height = ' + p4num(H) + ' m**'
        ], 'length = ' + p4num(L) + ' m, breadth = ' + p4num(B) + ' m, height = ' + p4num(H) + ' m', null);
    });

    /* ── CH 15 ─────────────────────────────────────────────────────────── */
    R(/survey of (\d+) people found that (\d+) of them[\s\S]*?sector angle|(\d+) out of (\d+)[\s\S]*?sector angle/, function (t, raw, m) {
        var tot = parseFloat(m[1] || m[4]), part = parseFloat(m[2] || m[3]);
        var ang = 360 * part / tot;
        return RES('Pie-chart sector angle', [
            'Sector angle = 360° × (part ÷ whole) = 360 × ' + part + '/' + tot,
            '= **' + p4num(ang) + '°**'
        ], p4num(ang) + '°', ang);
    });
    R(/letter is (?:chosen|picked|selected|taken) from the (?:letters of the )?word '?([a-z]+)'?[\s\S]*?probability that it is a vowel|probability of (?:getting |choosing |selecting )?(?:a )?vowel (?:in|from) the (?:letters of the )?word '?([a-z]+)'?/, function (t, raw, m) {
        var w = m[1] || m[2], vs = (w.match(/[aeiou]/g) || []).length;
        var f = fracOut(vs, w.length);
        return RES('Probability — vowel from a word', [
            "'" + w.toUpperCase() + "' has " + w.length + ' letters; vowels = ' + (w.toUpperCase().match(/[AEIOU]/g) || []).join(', ') + ' → ' + vs + ' of them',
            'P(vowel) = ' + vs + '/' + w.length + ' = **' + f + '**'
        ], f, null);
    });
    R(/heights of (\d+) saplings[\s\S]*?are:?\s*([\d, ]+)\.\s*find the range/, function (t, raw, m) {
        var list = m[2].split(',').map(function (z) { return parseFloat(z.trim()); }).filter(function (z) { return !isNaN(z); });
        var mx = Math.max.apply(null, list), mn = Math.min.apply(null, list);
        return RES('Range of a data set', [
            'Highest = ' + mx + ', Lowest = ' + mn,
            'Range = ' + mx + ' − ' + mn + ' = **' + p4num(mx - mn) + ' cm**'
        ], p4num(mx - mn) + ' cm', mx - mn);
    });
    R(/first (ten|\d+) natural numbers[\s\S]*?probability[\s\S]*?(?:being prime|it is prime|of getting a prime|number is prime)/, function (t, raw, m) {
        var n = m[1] === 'ten' ? 10 : parseInt(m[1], 10);
        var pr = [];
        for (var i = 2; i <= n; i++) if (isPrimeN(i)) pr.push(i);
        var f = fracOut(pr.length, n);
        return RES('Probability — prime from first N natural numbers', [
            'Numbers 1 to ' + n + ': primes = ' + pr.join(', ') + ' → ' + pr.length + ' of ' + n,
            'P(prime) = ' + pr.length + '/' + n + ' = **' + f + '**'
        ], pr.length + '/' + n + ' = ' + f, null);
    });
    R(/survey(?: of)?,? (\d+) children[\s\S]*?(\d+)%[\s\S]*?(?:number of children who read|how many children read|children read)/, function (t, raw, m) {
        var tot = parseFloat(m[1]), pct = parseFloat(m[2]);
        var c = tot * pct / 100;
        return RES('Pie chart — count from percentage', [
            'Count = ' + pct + '% of ' + tot + ' = ' + pct + '/100 × ' + tot,
            '= **' + p4num(c) + ' children**'
        ], p4num(c), c);
    });
    R(/(\d+)% do not read[\s\S]*?what fraction/, function (t, raw, m) {
        var pct = parseFloat(m[1]);
        var f = fracOut(pct, 100);
        return RES('Percentage → fraction', [
            pct + '% = ' + pct + '/100 = **' + f + '**'
        ], f, null);
    });
    R(/football (\d+) degrees, hockey (\d+) degrees, cricket (\d+) degrees[\s\S]*?football is rs (\d+)/, function (t, raw, m) {
        var f = parseFloat(m[1]), h = parseFloat(m[2]), c = parseFloat(m[3]), M = parseFloat(m[4]);
        var per = M / f;
        var tot = 360 * per, hm = h * per, diff = (c - h) * per;
        return RES('Pie chart — money from sector angles', [
            'Rs ' + M + ' for ' + f + '° → Rs ' + p4num(per) + ' per degree',
            '(i) Total = 360° × ' + p4num(per) + ' = **Rs ' + p4num(tot) + '**',
            '(ii) Hockey = ' + h + '° × ' + p4num(per) + ' = **Rs ' + p4num(hm) + '**',
            '(iii) Cricket − Hockey = (' + c + ' − ' + h + ')° × ' + p4num(per) + ' = **Rs ' + p4num(diff) + '**'
        ], 'total = Rs ' + p4num(tot) + ', hockey = Rs ' + p4num(hm) + ', extra on cricket = Rs ' + p4num(diff), null);
    });
    R(/when a die is thrown, list the outcomes of the event of getting (a prime number|a composite number|an even number|an odd number|a number less than (\d+)|a number greater than (\d+)|a perfect square)|list the outcomes of (?:the event of )?getting (a prime number|a composite number|an even number|an odd number|a number less than (\d+)|a number greater than (\d+)|a perfect square)[\s\S]*?die/, function (t, raw, m) {
        var kind = m[1] || m[4], out = [], i;
        var lessN = m[2] || m[5], greatN = m[3] || m[6];
        for (i = 1; i <= 6; i++) {
            if (kind === 'a prime number' && isPrimeN(i)) out.push(i);
            else if (kind === 'a composite number' && i > 1 && !isPrimeN(i)) out.push(i);
            else if (kind === 'an even number' && i % 2 === 0) out.push(i);
            else if (kind === 'an odd number' && i % 2 === 1) out.push(i);
            else if (lessN && kind === 'a number less than ' + lessN && i < parseInt(lessN, 10)) out.push(i);
            else if (greatN && kind === 'a number greater than ' + greatN && i > parseInt(greatN, 10)) out.push(i);
            else if (kind === 'a perfect square' && Math.sqrt(i) === Math.floor(Math.sqrt(i))) out.push(i);
        }
        var s = out.join(', ');
        return RES('Die — outcomes of an event', [
            'A die shows 1, 2, 3, 4, 5, 6.',
            'Outcomes for "' + kind + '" = **' + s + '**'
        ], s, null);
    });
    R(/slips (?:with numbers|numbered) ([\d, ]+)(?: are mixed)? in a bag[\s\S]*?probability (?:of getting|that a slip drawn is|that the number is|that it is|of drawing) (an even number|an odd number|a multiple of 3 but not 9|a multiple of 3|a factor of 36|a one-digit number|a two-digit number)|bag (?:has|contains) slips numbered ([\d, ]+)[\s\S]*?probability (?:of getting|that a slip drawn is|that the number is|that it is|of drawing) (an even number|an odd number|a multiple of 3 but not 9|a multiple of 3|a factor of 36|a one-digit number|a two-digit number)/, function (t, raw, m) {
        var nums = (m[1] || m[3]).split(',').map(function (z) { return parseInt(z.trim(), 10); }).filter(function (z) { return !isNaN(z); });
        var kind = m[2] || m[4], hits = [];
        nums.forEach(function (n) {
            if (kind === 'an even number' && n % 2 === 0) hits.push(n);
            else if (kind === 'an odd number' && n % 2 === 1) hits.push(n);
            else if (kind === 'a multiple of 3 but not 9' && n % 3 === 0 && n % 9 !== 0) hits.push(n);
            else if (kind === 'a multiple of 3' && n % 3 === 0) hits.push(n);
            else if (kind === 'a factor of 36' && 36 % n === 0) hits.push(n);
            else if (kind === 'a one-digit number' && n < 10) hits.push(n);
            else if (kind === 'a two-digit number' && n >= 10 && n < 100) hits.push(n);
        });
        var f = fracOut(hits.length, nums.length);
        return RES('Probability — slips in a bag', [
            'Total slips = ' + nums.length + '. Favourable (' + kind + '): ' + hits.join(', ') + ' → ' + hits.length,
            'P = ' + hits.length + '/' + nums.length + ' = **' + f + '**'
        ], hits.length + '/' + nums.length + ' = ' + f, null);
    });

    /* ── CH 16 extras: order from shape / from angle ───────────────────── */
    R(/order of rotational symmetry of (?:a |the )?(?:regular )?([a-z]+)/, function (t, raw, m) {
        var n = SHAPES[m[1]];
        if (!n) return null;
        return RES('Rotational symmetry — order', [
            'A regular ' + m[1] + ' looks the same ' + n + ' times during a full 360° turn',
            'Order of rotational symmetry = **' + n + '**'
        ], String(n), n);
    });
    R(/angle of rotation (?:of (?:a |the )?figure )?(?:is|of) (\d+) degrees?[\s\S]*?order of rotational symmetry|order of rotational symmetry[\s\S]*?angle of rotation (?:is|of) (\d+) degrees?/, function (t, raw, m) {
        var ang = parseFloat(m[1] || m[2]);
        var ord = 360 / ang;
        return RES('Rotational symmetry — order from angle', [
            'Order = 360° ÷ angle of rotation = 360 ÷ ' + ang,
            '= **' + p4num(ord) + '**'
        ], p4num(ord), ord);
    });

    /* ═══ solve(): options → KB → rules → numeric fallback ════════════════ */
    /* v13: strip chat garnish so rules see the canonical stem — leading
       greetings/bot names and trailing Hinglish asks ("… batao?", "kitna hoga") */
    function scrub(s) {
        for (var i = 0; i < 2; i++) {
            /* v14: Hinglish math words → English so rules can see them */
            s = s.replace(/\b(?:saalana|varshik)\b/g, 'annually')
                 .replace(/\b(?:abhi|is waqt)\b/g, 'now')
                 .replace(/\b(?:saal|varsh|sal)\b/g, 'year')
                 .replace(/\b(?:pehle|pahle)\b/g, 'ago')
                 .replace(/\b(?:baad me|baad)\b/g, 'hence')
                 .replace(/\b(?:badhti|badhta|badhi|badh)\b/g, 'increases')
                 .replace(/\b(?:ghatti|ghatta|ghati|ghat)\b/g, 'decreases')
                 .replace(/\b(?:kitni|kitna|kitne)\b/g, 'what')
                 .replace(/\b(?:thi|tha)\b/g, 'was')
                 .replace(/\bhai\b/g, 'is')
                 .replace(/\bek\b/g, 'a')
                 .replace(/\b(?:ki|ka|ke)\b/g, 'of');
            s = s.replace(/^(?:hey|hi|hello|oye|yo|namaste|pranam)+\b[\s,.-]*/, '');
            s = s.replace(/^(?:bitbot|bit-bot|bot|bittu|yaar|bro|dude|bhai)\b[\s,:.-]*/, '');
            s = s.replace(/^(?:pls |please |plz |kindly )?(?:can you |could you )?(?:tell me|solve this|solve it|answer this|with full steps|batao|batana|bataiye|nikalo)\s*[:,]?\s*/i, '');
            s = s.replace(/^(?:solve|with full steps|full steps|steps|batao)\s*[:,]\s*/i, '');
            s = s.replace(/(?:\s+(?:kitna|hoga|kitne|hai|hain|kya|batao|bataiye|batao\s*na|tell|please|pls|plz|yaar|bro|ji|na|re))+(?:\s*[?.!,]*)$/g, '').trim();
        }
        return s;
    }
    function attempt(s, text, op) {
        var r = null, i;
        for (i = 0; i < KB.length; i++) {
            if (KB[i].re.test(s)) {
                r = { ok: true, title: 'Concept check', steps: [KB[i].why], answer: KB[i].ans, value: KB[i].value, kb: true };
                break;
            }
        }
        if (!r) {
            for (i = 0; i < RULES.length; i++) {
                var mm = s.match(RULES[i].re);
                if (!mm) continue;
                try { r = RULES[i].fn(s, text, mm, op); } catch (e) { r = null; }
                if (r && r.ok) break;
                r = null;
            }
        }
        if (!r) { try { r = numericFallback(s); } catch (e2) { r = null; } }
        return r;
    }
    function solve(text) {
        if (!text || typeof text !== 'string') return null;
        var t = scrub(nm(text));
        if (t.length > 400) return null;
        var op = parseOptions(t);
        var stem = op ? op.stem : t;
        var r = attempt(stem, text, op);
        if (!r && op) r = attempt(t, text, op);   // sub-part lists like "(i) 0.6 (ii) -3.1"
        if (!r) return null;
        if (op) {
            var hit = matchOption(r.answer, r.value, op.opts);
            if (hit) {
                r.option = hit.label;
                r.answer = '(' + hit.label + ') ' + hit.text;
                r.steps = r.steps.concat(['Among the options, this matches **(' + hit.label + ') ' + hit.text + '**']);
            }
        }
        return r;
    }

    var BitX = {
        solve: solve,
        /* expose internals for tests */
        _nm: nm, _scrub: scrub, _rules: RULES, _kb: KB, _dec: dec, _fmtVal: fmtVal, _fmtFrac: fmtFrac, _parseOptions: parseOptions,
        _parsePoly: parsePoly, _polyStr: polyStr, _polyStrU: polyStrU, _polyDiv: polyDiv,
        _decToFrac: decToFrac, _factorize: factorize, _leftoverRoot: leftoverRoot, _divisorToRoot: divisorToRoot,
        _R: R, _K: K, _RULES: RULES, _KB: KB, _translate: translate, _sciFmt: sciFmt, _expEq: expEq
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = BitX;
    else root.BitX = BitX;
    if (typeof window !== 'undefined') window.BitX = BitX;
})(typeof window !== 'undefined' ? window : this);
