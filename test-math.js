/* BitMath regression suite — node test-math.js */
var M = require('./math.js');
var pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + name); } }
function val(text) { var r = M.solve(text); return r.ok ? r.value : ('ERR:' + r.error); }
function expr(text) { var r = M.solve(text); return r.ok ? r.expr : null; }

/* ── the user-reported bugs ── */
ok('2+2÷2 = 3', val('2+2÷2') === 3);
ok('2+2/2 = 3', val('2+2/2') === 3);
ok('2² = 4', val('2²') === 4);
ok('2^2 = 4', val('2^2') === 4);
ok('9-08 = 1', val('9-08') === 1);
ok('5¹⁰ = 9765625', val('5¹⁰') === 9765625);
ok('5 lakh+2 = 500002', val('5 lakh+2') === 500002);
ok('2 crore = 2e7', val('2 crore × 3') === 6e7);
ok('50% of 200 = 100', val('50% of 200') === 100);
ok('table-unlimited 999×7', val('999 × 7') === 6993);

/* ── arithmetic & precedence ── */
ok('12+34*2 = 80', val('12+34*2') === 80);
ok('(12+34)*2 = 92', val('(12+34)*2') === 92);
ok('2^3^2 = 512 (right-assoc)', val('2^3^2') === 512);
ok('-3^2 = -9', val('-3^2') === -9);
ok('(-3)^2 = 9', val('(-3)^2') === 9);
ok('100/0 guarded', String(val('100/0')).indexOf('ERR:') === 0);
ok('√169 = 13', val('√169') === 13);
ok('sqrt of 144 = 12', val('square root of 144') === 12);
ok('√-4 guarded', String(val('√-4')).indexOf('ERR:') === 0);
ok('3! = 6', val('3!') === 6);
ok('0! = 1', val('0!') === 1);
ok('5!+1 = 121', val('5! + 1') === 121);
ok('170! finite-ish guard ok', val('171!').toString().indexOf('ERR:') === 0);
ok('7 mod 3 = 1', val('7 mod 3') === 1);
ok('1/3 fraction', M.solve('1/3').fraction === '1/3');
ok('0.1+0.2 rounds', val('0.1+0.2') === 0.3);
ok('π recognized', Math.abs(val('π') - Math.PI) < 1e-9);
ok('1,000+2,500 indian commas', val('1,00,000 + 50,000') === 150000);
ok('word ops: 5 plus 3 times 2', val('5 plus 3 times 2') === 11);
ok('what is 45 times 3', val('what is 45 times 3') === 135);
ok('calculate 144 divided by 12', val('calculate 144 divided by 12') === 12);
ok('square of 12', val('square of 12') === 144);
ok('cube of 9', val('cube of 9') === 729);
ok('10 to the power of 5', val('10 to the power of 5') === 1e5);
ok('unary minus 5--3 = 8', val('5--3') === 8);
ok('nested brackets', val('((2+3)*(4-1))^2') === 225);
ok('huge multiply', val('1000000 × 1000000') === 1e12);

/* ── rendering keeps needed parens ── */
ok('paren render keeps (2+3)', expr('(2+3)×4^2-10÷5').indexOf('(2 + 3)') === 0);
ok('paren render no useless parens', expr('(5)+3') === '5 + 3');

/* ── BODMAS stepper ── */
var s1 = M.solve('simplify and explain: (2+3)×4^2-10÷5');
ok('steps count 5', s1.steps.length === 5);
ok('step1 brackets', s1.steps[0].calc === '2 + 3 = 5');
ok('step2 exponent', s1.steps[1].calc === '4^2 = 16');
ok('step3 multiply', s1.steps[2].calc === '5 × 16 = 80');
ok('step4 divide', s1.steps[3].calc === '10 ÷ 5 = 2');
ok('step5 subtract → 78', s1.steps[4].calc === '80 − 2 = 78' && s1.value === 78);
var s2 = M.solve('8 + 2 × (6 − 3)² ÷ 9');
ok('bodmas mixed = 10', s2.value === 10 && s2.steps.length === 5 &&
    s2.steps[0].calc === '6 − 3 = 3' && s2.steps[2].calc === '2 × 9 = 18' && s2.steps[4].calc === '8 + 2 = 10');

/* ── looksLikeMath pre-catch guard ── */
ok('lkm 2+2÷2', M.looksLikeMath('2+2÷2') === true);
ok('lkm 9-08', M.looksLikeMath('9-08') === true);
ok('lkm 5²', M.looksLikeMath('5²') === true);
ok('lkm 12! ', M.looksLikeMath('12!') === true);
ok('lkm 12 (bare number = quiz answer, must be FALSE)', M.looksLikeMath('12') === false);
ok('lkm table of 7 → false', M.looksLikeMath('table of 7') === false);
ok('lkm tell me a joke → false', M.looksLikeMath('tell me a joke 5') === false);
ok('lkm what is 45 times 3 → false (net handles)', M.looksLikeMath('what is 45 times 3') === false);


/* ── v10 algebra: solveEquation (linear) ── */
function sol(t) { return M.solveEquation(t); }
function rootStr(e) {
    if (e.infinite) return 'infinite'; if (e.none) return 'none';
    if (e.identity !== undefined) return e.identity ? 'identity' : 'no-solution';
    if (e.complex) return 'complex';
    return e.roots.map(function (r) { return Math.round(r * 1e9) / 1e9; }).join(',');
}
var e1 = sol('2x + 3 = 11');
ok('lin 2x+3=11 → 4', e1.ok && rootStr(e1) === '4' && e1.variable === 'x');
ok('lin steps exist', e1.steps && e1.steps.length >= 1);
ok('lin check passes', e1.checks && e1.checks[0].ok === true);
ok('lin 5x-2=3x+8 → 5', rootStr(sol('5x - 2 = 3x + 8')) === '5');
ok('lin solve-for-x prefix', rootStr(sol('solve for x: 5x - 2 = 3x + 8')) === '5');
ok('lin find value of y', (function (e) { return e.ok && e.variable === 'y' && rootStr(e) === '4'; })(sol('find the value of y: 2y + 7 = 15')));
ok('lin brackets 3(x-2)+4=2x+5 → 7', rootStr(sol('3(x - 2) + 4 = 2x + 5')) === '7');
ok('lin RHS-variable 10=4+3x → 2', rootStr(sol('10 = 4 + 3x')) === '2');
var ef = sol('x/2 + 5 = 3x - 4');
ok('lin fraction root exact 18/5', ef.ok && ef.exact[0] === '18/5' && Math.abs(ef.roots[0] - 3.6) < 1e-9);
ok('lin x/3+2=5 → 9', rootStr(sol('x/3 + 2 = 5')) === '9');
ok('identity 2x+3=2x+3', sol('2x + 3 = 2x + 3').identity === true);
ok('no-solution 2x+3=2x+9', sol('2x + 3 = 2x + 9').identity === false);
var em = sol('2x + 3y = 10');
ok('multivar rejected', em.ok === false && /2 variables/.test(em.error || ''));
ok('no-eq rejected', sol('2x + 3').ok === false);

/* ── v10 algebra: solveEquation (quadratic) ── */
ok('quad x²=49 → -7,7', rootStr(sol('x² = 49')) === '-7,7');
ok('quad x^2-5x+6=0 → 2,3', rootStr(sol('x^2 - 5x + 6 = 0')) === '2,3');
var eq2 = sol('2x² + 3x - 5 = 0');
ok('quad frac root -5/2,1', eq2.ok && eq2.exact.indexOf('-5/2') !== -1 && eq2.exact.indexOf('1') !== -1);
ok('quad D<0 complex', sol('x^2 + 4 = 0').complex === true);
ok('quad D=0 equal roots', rootStr(sol('x^2 - 4x + 4 = 0')) === '2');
var eqf = sol('x^2 - 5x + 6 = 0');
ok('quad factorised step present', eqf.steps.some(function (s) { return s.calc === 'x² − 5x + 6 = (x − 2)(x − 3)'; }));
ok('quad both checks pass', eqf.checks.length === 2 && eqf.checks.every(function (c) { return c.ok; }));

/* ── v10 algebra: expand ── */
function ex(t) { var r = M.expand(t); return r.ok ? r.result : 'FAIL:' + (r.error || '?'); }
ok('exp (a+b)² identity', ex('(a+b)^2') === 'a² + 2ab + b²');
ok('exp (a-b)² identity', ex('(a-b)^2') === 'a² − 2ab + b²');
ok('exp (a+b)(a-b)', ex('(a+b)(a-b)') === 'a² − b²');
ok('exp (a+b+c)²', ex('(a+b+c)^2') === 'a² + 2ab + 2ac + b² + 2bc + c²');
ok('exp (a+b)³', ex('(a+b)^3') === 'a³ + 3a²b + 3ab² + b³');
ok('exp (2a+3b)²', ex('expand (2a+3b)^2') === '4a² + 12ab + 9b²');
ok('exp collect 2x+3x → 5x', ex('2x + 3x') === '5x');
ok('exp 3(x+2)-2(x-1) → x+8', ex('3(x + 2) - 2(x - 1)') === 'x + 8');
ok('exp (x+3)(x-2)+5', ex('simplify (x+3)(x-2) + 5') === 'x² + x − 1');
ok('exp superscript (x+1)²', ex('(x+1)²') === 'x² + 2x + 1');
ok('exp no-var rejected', M.expand('2+2').ok === false);
ok('exp huge power guarded', M.expand('(a+b)^20').ok === false);

/* ── v10: looksLikeEquation gate ── */
ok('lke 2x+3=11', M.looksLikeEquation('2x + 3 = 11') === true);
ok('lke solve for x', M.looksLikeEquation('solve for x: 5x - 2 = 3x + 8') === true);
ok('lke expand (a+b)^2', M.looksLikeEquation('expand (a+b)^2') === true);
ok('lke plain sentence → false', M.looksLikeEquation('tell me a joke') === false);
ok('lke what is 2+2 → false', M.looksLikeEquation('what is 2+2') === false);
ok('lke my name is bob → false', M.looksLikeEquation('my name is bob') === false);

/* ── v10: implicit multiplication + evaluate guards ── */
ok('implicit 2(3)(4) = 24', M.solve('2(3)(4)').value === 24);
ok('implicit 3(4+1) = 15', M.solve('3(4+1)').value === 15);
ok('var in numeric solve → clean error', (function () { var r = M.solve('2x + 3'); return r.ok === false && /equation|expand/i.test(r.error || ''); })());
ok('eq in numeric solve → clean error', (function () { var r = M.solve('2x + 3 = 11'); return r.ok === false; })());

console.log('math.js: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
