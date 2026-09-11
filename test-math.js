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

console.log('math.js: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
