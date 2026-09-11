/* ═══════════════════════════════════════════════════════════════════════════
   BitBot MATH ENGINE v9 — a REAL expression parser (no more regex hacks).
     • normalize: ÷ × − ² ³ √ π, lakh/crore/thousand words, Indian commas,
       word-operators ("plus", "divided by", "to the power of"…), prefixes
     • tokenize → parse (recursive descent, right-assoc ^, unary −, n!, √)
     • evaluate with guards (÷0, √negative, 170! overflow, Infinity)
     • STEP-BY-STEP simplification in true BODMAS order with reasons
   Runs in browser (window.BitMath) and Node (module.exports).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
    var BIG_WORDS = { hundred: 100, thousand: 1000, lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
        crore: 10000000, crores: 10000000, million: 1000000, millions: 1000000, billion: 1000000000 };

    function normalize(raw) {
        var s = ' ' + String(raw == null ? '' : raw) + ' ';
        // unicode operators & symbols
        s = s.replace(/[÷∕⁄]/g, '/').replace(/[×✕✖∗]/g, '*').replace(/[−–—‐‑]/g, '-').replace(/√/g, ' sqrt ');
        s = s.replace(/π/g, ' pi ');
        // superscript runs → ^(digits)   (handles ², ³, ¹⁰, ⁻² …)
        s = s.replace(/[\u2070\u00B9\u00B2\u00B3\u2074-\u2079]+/g, function (m) {
            var d = '';
            for (var i = 0; i < m.length; i++) d += SUP[m[i]] || '';
            return d ? '^(' + d + ')' : '';
        });
        s = s.replace(/\^\s*-\s*/g, '^-');
        s = s.toLowerCase();
        // question prefixes / suffixes (chat noise around the expression)
        s = s.replace(/\b(simplify and explain|simplify|evaluate|calculate|compute|solve|what is|what's|whats|how much is|tell me|answer of|answer|find|kitna hota hai|kitna hai|kitna|batao|please|pls)\b/g, ' ');
        s = s.replace(/(\d)\s*!/g, '$1§');              // protect factorials…
        s = s.replace(/[?:!।]+/g, ' ');                 // …from the punctuation wipe
        s = s.replace(/§/g, ' ! ');
        // word operators (longest first so "divided by" beats "by")
        s = s.replace(/\bdivided by\b|\bdivide by\b/g, ' / ');
        s = s.replace(/\bmultiplied by\b|\bmultiplied with\b|\btimes\b|\binto\b/g, ' * ');
        s = s.replace(/\bplus\b|\badded to\b|\badd\b/g, ' + ');
        s = s.replace(/\bminus\b|\bsubtract\b|\bleda\b/g, ' - ');
        s = s.replace(/\bto the power of\b|\braised to the power of\b|\braised to\b|\bpower of\b|\bto the power\b/g, ' ^ ');
        s = s.replace(/\bsquare root of\b|\bsquare root\b|\bsqrt\b|\broot of\b/g, ' sqrt ');
        s = s.replace(/\bsquare of\s*(\d+(?:\.\d+)?)/g, '($1)^2').replace(/\bcube of\s*(\d+(?:\.\d+)?)/g, '($1)^3');
        s = s.replace(/\bsquared\b/g, '^2').replace(/\bcubed\b/g, '^3');
        s = s.replace(/\bmodulo\b|\bmod\b/g, ' % ');
        s = s.replace(/(\d+(?:\.\d+)?)\s*(percent|%)\s*of/g, '$1 / 100 *');
        s = s.replace(/\bfactorial of\s*(\d+(?:\.\d+)?)/g, '$1 !');
        // big-number words: "5 lakh" → 5*100000
        s = s.replace(/(\d+(?:\.\d+)?)\s*(hundred|thousand|lakhs?|lacs?|crores?|millions?|billion)\b/g, function (m, n, w) {
            return n + '*' + BIG_WORDS[w];
        });
        // "6x7" → 6*7  (x between numbers only — keeps words intact)
        s = s.replace(/(\d)\s*x\s*(?=\d)/g, '$1 * ');
        // indian/international digit grouping: 1,00,000 → 100000
        s = s.replace(/(\d),(\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1$2');
        // drop leftover words that are clearly not math (anything alphabetic except sqrt/pi)
        var stripped = [];
        s = s.replace(/[a-z]+/g, function (w) { if (w !== 'sqrt' && w !== 'pi') { stripped.push(w); return ' '; } return w; });
        return { expr: s.replace(/\s+/g, ' ').trim(), strippedWords: stripped };
    }

    // ── tokenizer ──────────────────────────────────────────────────────────
    function tokenize(s) {
        var out = [], i = 0;
        while (i < s.length) {
            var c = s[i];
            if (c === ' ') { i++; continue; }
            if (c >= '0' && c <= '9' || c === '.') {
                var j = i;
                while (j < s.length && (s[j] >= '0' && s[j] <= '9' || s[j] === '.')) j++;
                var numStr = s.slice(i, j);
                if ((numStr.match(/\./g) || []).length > 1) throw { msg: '"' + numStr + '" has too many decimal points' };
                out.push({ t: 'num', v: parseFloat(numStr) });
                i = j; continue;
            }
            if (s.startsWith('sqrt', i)) { out.push({ t: 'sqrt' }); i += 4; continue; }
            if (s.startsWith('pi', i)) { out.push({ t: 'num', v: Math.PI }); i += 2; continue; }
            if ('+-*/^%()!'.indexOf(c) !== -1) { out.push({ t: c }); i++; continue; }
            throw { msg: 'I do not understand the "' + c + '" in that math' };
        }
        return out;
    }

    // ── parser (recursive descent) ────────────────────────────────────────
    function parse(tokens) {
        var pos = 0;
        function peek() { return tokens[pos]; }
        function eat(t) {
            var tk = tokens[pos];
            if (!tk || tk.t !== t) throw { msg: 'the expression looks incomplete (expected "' + t + '")' };
            pos++; return tk;
        }
        function parseExpr() {                        // + -
            var node = parseTerm();
            while (peek() && (peek().t === '+' || peek().t === '-')) {
                var op = tokens[pos++].t;
                node = { op: op, a: node, b: parseTerm() };
            }
            return node;
        }
        function parseTerm() {                        // * / %
            var node = parseUnary();
            while (peek() && (peek().t === '*' || peek().t === '/' || peek().t === '%')) {
                var op = tokens[pos++].t;
                node = { op: op, a: node, b: parseUnary() };
            }
            return node;
        }
        function parsePow() {                         // ^ (right-assoc, binds tighter than unary −)
            var node = parsePostfix();
            if (peek() && peek().t === '^') {
                pos++;
                node = { op: '^', a: node, b: parseUnary() };   // 2^−1 works
            }
            return node;
        }
        function parseUnary() {                       // leading −  (−3² = −(3²) = −9, standard maths)
            if (peek() && peek().t === '-') { pos++; return { op: 'neg', a: parseUnary() }; }
            if (peek() && peek().t === '+') { pos++; return parseUnary(); }
            return parsePow();
        }
        function parsePostfix() {                     // n!
            var node = parsePrimary();
            while (peek() && peek().t === '!') { pos++; node = { op: 'fact', a: node }; }
            return node;
        }
        function parsePrimary() {
            var tk = peek();
            if (!tk) throw { msg: 'the expression ends too early' };
            if (tk.t === 'num') { pos++; return { op: 'num', v: tk.v }; }
            if (tk.t === 'sqrt') {
                pos++;
                if (peek() && peek().t === '(') { return { op: 'sqrt', a: parseParenInner() }; }
                return { op: 'sqrt', a: parseUnary() };
            }
            if (tk.t === '(') return parseParenInner();
            throw { msg: 'unexpected "' + tk.t + '" in the expression' };
        }
        function parseParenInner() {
            eat('(');
            var inner = parseExpr();
            eat(')');
            return { op: 'paren', a: inner };
        }
        var ast = parseExpr();
        if (pos < tokens.length) throw { msg: 'extra symbols after the expression' };
        return ast;
    }

    // ── evaluation with honest guards ──────────────────────────────────────
    function factorial(n) {
        if (n !== Math.floor(n) || n < 0) throw { msg: 'factorials need a whole number ≥ 0' };
        if (n > 170) throw { msg: n + '! overflows even 64-bit floats (max 170!) — try a smaller number' };
        var r = 1; for (var k = 2; k <= n; k++) r *= k;
        return r;
    }
    function evaluate(node) {
        switch (node.op) {
            case 'num': return node.v;
            case 'paren': return evaluate(node.a);
            case 'neg': return -evaluate(node.a);
            case 'fact': return factorial(evaluate(node.a));
            case 'sqrt': {
                var sv = evaluate(node.a);
                if (sv < 0) throw { msg: 'cannot take the square root of a negative number (no real answer)' };
                return Math.sqrt(sv);
            }
            default: {
                var a = evaluate(node.a), b = evaluate(node.b);
                switch (node.op) {
                    case '+': return a + b;
                    case '-': return a - b;
                    case '*': return a * b;
                    case '/':
                        if (Math.abs(b) < 1e-12) throw { msg: 'division by zero is undefined — even for me!' };
                        return a / b;
                    case '%':
                        if (Math.abs(b) < 1e-12) throw { msg: 'modulo by zero is undefined' };
                        return a % b;
                    case '^': {
                        var pv = Math.pow(a, b);
                        if (!isFinite(pv)) throw { msg: 'that power explodes past Infinity 🤯 — try smaller numbers' };
                        return pv;
                    }
                }
            }
        }
        throw { msg: 'unknown operation' };
    }

    // ── pretty rendering (precedence-aware brackets) ───────────────────────
    var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3, neg: 4, fact: 5, sqrt: 5, num: 9, paren: 9 };
    var SYM = { '+': ' + ', '-': ' − ', '*': ' × ', '/': ' ÷ ', '%': ' mod ', '^': '^' };
    function fmtN(v) {
        if (Number.isInteger(v)) return Math.abs(v) >= 1e15 ? v.toExponential(6) : String(v);
        var r = Math.round(v * 1e10) / 1e10;
        return String(+r.toPrecision(12));
    }
    function render(node, parentPrec) {
        var s;
        switch (node.op) {
            case 'num': s = node.v === Math.PI ? 'π' : fmtN(node.v); break;
            case 'paren':
                s = render(node.a, 0);
                // keep brackets visible when the inside is an operation —
                // "(2+3)×4" must NOT print as "2 + 3 × 4" (different value!)
                if (node.a && ['+', '-', '*', '/', '%', '^', 'neg'].indexOf(node.a.op) !== -1) s = '(' + s + ')';
                break;
            case 'neg': s = '−' + render(node.a, PREC.neg); break;
            case 'fact': s = render(node.a, PREC.fact) + '!'; break;
            case 'sqrt': s = '√(' + render(node.a, 0) + ')'; break;
            default:
                s = render(node.a, PREC[node.op]) + SYM[node.op] +
                    (node.op === '^' ? render(node.b, 0) : render(node.b, PREC[node.op] + 0.5));
        }
        var my = PREC[node.op] || 0;
        if (node.op === 'paren') my = 9;
        if (parentPrec !== undefined && my < parentPrec) return '(' + s + ')';
        return s;
    }

    // ── BODMAS step generator ──────────────────────────────────────────────
    var RANK = { fact: 5.5, sqrt: 5.4, neg: 5.3, '^': 5, '*': 4, '/': 4, '%': 4, '+': 3, '-': 3 };
    var WHY = { '+': 'Addition', '-': 'Subtraction', '*': 'Multiplication', '/': 'Division', '%': 'Modulo (remainder)',
        '^': 'Exponent (power)', fact: 'Factorial', sqrt: 'Square root', neg: 'Negative sign' };
    function collectOps(node, depth, inParen, acc, path) {
        if (!node || node.op === 'num') return;
        if (RANK[node.op] !== undefined && node.op !== 'paren')
            acc.push({ node: node, path: path.slice(), depth: depth, inParen: inParen });
        if (node.op === 'paren') collectOps(node.a, depth + 1, true, acc, path.concat('a'));
        else if (node.op === 'neg' || node.op === 'fact' || node.op === 'sqrt') collectOps(node.a, depth, inParen, acc, path.concat('a'));
        else if (node.a && node.b) {
            collectOps(node.a, depth, inParen, acc, path.concat('a'));
            collectOps(node.b, depth, inParen, acc, path.concat('b'));
        }
    }
    function setPath(root, path, val) {
        var n = root;
        for (var i = 0; i < path.length; i++) n = n[path[i]];
        return n;
    }
    function cloneAst(node) {
        if (!node) return node;
        var c = { op: node.op };
        if (node.v !== undefined) c.v = node.v;
        if (node.a) c.a = cloneAst(node.a);
        if (node.b) c.b = cloneAst(node.b);
        return c;
    }
    function foldParens(node) {                        // (7) → 7
        if (!node) return node;
        if (node.a) node.a = foldParens(node.a);
        if (node.b) node.b = foldParens(node.b);
        if (node.op === 'paren' && node.a && node.a.op === 'num') return node.a;
        return node;
    }
    function isReadyNode(n) {                          // all direct operands are plain values
        if (n.op === 'num' || n.op === 'paren') return true;
        var a = !n.a || n.a.op === 'num' || n.a.op === 'paren';
        var b = !n.b || n.b.op === 'num' || n.b.op === 'paren';
        return a && b;
    }
    function steps(ast) {
        var out = [], guard = 0;
        ast = cloneAst(ast);
        while (ast.op !== 'num' && guard++ < 60) {
            var acc = [];
            collectOps(ast, 0, false, acc, []);
            if (!acc.length) break;
            // BODMAS: deepest (inside brackets) first, then by operation rank,
            // then reducible-now first, then leftmost
            var best = acc[0];
            for (var i = 1; i < acc.length; i++) {
                var s1 = acc[i].depth * 100 + RANK[acc[i].node.op] + (isReadyNode(acc[i].node) ? 0.6 : 0);
                var s0 = best.depth * 100 + RANK[best.node.op] + (isReadyNode(best.node) ? 0.6 : 0);
                if (s1 > s0) best = acc[i];
            }
            var target = best.node;
            var val, calc;
            if (target.op === 'neg') { val = -evaluate(target.a); calc = '−' + render(target.a, 9) + ' = ' + fmtN(val); }
            else if (target.op === 'fact') { val = evaluate(target); calc = render(target.a, 9) + '! = ' + fmtN(val); }
            else if (target.op === 'sqrt') { val = evaluate(target); calc = '√(' + render(target.a, 0) + ') = ' + fmtN(val); }
            else {
                var a = evaluate(target.a), b = evaluate(target.b);
                val = evaluate(target);
                calc = fmtN(a) + SYM[target.op] + fmtN(b) + ' = ' + fmtN(val);
            }
            // replace the target node with its value inside a fresh tree
            var rebuilt = cloneAst(ast);
            var parent = best.path.length ? setPath(rebuilt, best.path.slice(0, -1)) : null;
            var leaf = { op: 'num', v: val };
            if (parent) parent[best.path[best.path.length - 1]] = leaf; else rebuilt = leaf;
            rebuilt = foldParens(rebuilt);
            out.push({
                why: (best.inParen ? 'Brackets first → ' : '') + WHY[target.op],
                calc: calc,
                expr: rebuilt.op === 'num' ? fmtN(rebuilt.v) : render(rebuilt, 0)
            });
            ast = rebuilt;
        }
        return { steps: out, final: ast.op === 'num' ? ast.v : null };
    }

    // ── exact-fraction helper (same spirit as v6's toFrac) ─────────────────
    function toFrac(v) {
        if (!isFinite(v) || Number.isInteger(v)) return null;
        var sign = v < 0 ? -1 : 1; v = Math.abs(v);
        var bn = 0, bd = 1, be = 1;
        for (var d = 2; d <= 500; d++) {
            var n = Math.round(v * d);
            var err = Math.abs(v - n / d);
            if (err < be) { be = err; bn = n; bd = d; }
            if (be < 1e-9) break;
        }
        if (be > 1e-9 || bd === 1 || bn === 0) return null;
        return (sign < 0 ? '-' : '') + bn + '/' + bd;
    }

    // ── the one entry point the UI calls ───────────────────────────────────
    function solve(text) {
        var norm = normalize(text);
        if (!norm.expr) return { ok: false, error: 'no expression found', normalized: norm.expr };
        if (!/[\d]|pi/.test(norm.expr)) return { ok: false, error: 'no numbers found', normalized: norm.expr };
        var tokens, ast, value;
        try {
            tokens = tokenize(norm.expr);
            ast = parse(tokens);
            value = evaluate(ast);
        } catch (e) {
            return { ok: false, error: (e && e.msg) || 'that expression looks broken', normalized: norm.expr };
        }
        if (!isFinite(value)) return { ok: false, error: 'the answer explodes past Infinity', normalized: norm.expr };
        var valueRounded = Math.round(value * 1e10) / 1e10;
        var st = steps(ast);
        return {
            ok: true,
            value: valueRounded,
            expr: render(ast, 0),
            normalized: norm.expr,
            strippedWords: norm.strippedWords,
            steps: st.steps,
            opCount: st.steps.length,
            fraction: toFrac(valueRounded)
        };
    }

    // Is this text a pure math expression? (deterministic skill_calc pre-catch)
    function looksLikeMath(text) {
        var s = String(text || '').trim();
        if (s.length > 60 || !/\d/.test(s)) return false;
        // after stripping safe math chars, only chat-noise words may remain
        var core = s.toLowerCase()
            .replace(/[÷×−–—⁰¹²³⁴⁵⁶⁷⁸⁹√π^%*/+().!\-]/g, ' ')
            .replace(/\d+/g, ' ')
            .replace(/\b(what|what's|whats|is|are|calculate|compute|solve|simplify|evaluate|tell|me|the|answer|of|please|pls|and|then|equal|equals|to|ka|ki|kitna|hota|hai|batao|value|expression)\b/g, ' ')
            .replace(/[^a-z]/g, '');
        if (core.length !== 0) return false;
        var low = s.toLowerCase();
        if (/[+*/^%÷×!√π²³¹]|[⁰⁴⁵⁶⁷⁸⁹]|sup/.test(low)) return true;       // operators, !, √, π, superscripts
        return low.indexOf('-') > 0 && /\d/.test(low);                       // "9-08" yes; bare "-5" no
    }

    var BitMath = {
        normalize: normalize, tokenize: tokenize, parse: parse, evaluate: evaluate,
        render: render, steps: steps, solve: solve, toFrac: toFrac, looksLikeMath: looksLikeMath,
        fmtN: fmtN, factorial: factorial
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = BitMath;
    else root.BitMath = BitMath;
})(typeof window !== 'undefined' ? window : globalThis);
