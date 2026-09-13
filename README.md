# 🤖 BitBot v10 — Arcade Hub's AI assistant (CLASS 1–8 MATHS MASTER EDITION)

**Symbolic algebra engine (equations + identities, exact answers, full steps +
verification) • word-problem solver (33 solvers — ages, speed–distance–time,
work–time, profit/loss/discount/GST, SI/CI, mensuration, Pythagoras, polygons,
probability, 2×2 systems, Class 1–5 story sums) • all 16 DAV Class-8 chapters as
knowledge intents • full BODMAS engine • 82.4-lakh-parameter neural brain •
347 topics • redesigned neon UI with markdown tables + copy buttons • visible
chain-of-thought • typo tolerance • offline PWA.**

A **real neural network + real symbolic maths engines** — built from scratch, no
libraries, no server, no API. Boots instantly from pre-trained int8 weights,
remembers the conversation and your name, answers in markdown, supports Hinglish.
Class 1–8 maths is answered **deterministically** (parser/solver code, never a
guess): expressions → BitMath, equations/identities → BitMath v10 symbolic layer,
word problems → BitWords. Concept questions → the neural net (347 topics).

## What it actually is
| Piece | File | What |
|---|---|---|
| Brain | `brain.js` | Neural net engine from scratch: tokenizer, stemmer, bag-of-words, char-trigram hash features (512 buckets — typo/OOV tolerance), He-initialized FC net, softmax + cross-entropy, SGD, sparse forward/backward, int8 per-row quantized serialization — browser AND node |
| Math engine | `math.js` | `BitMath` — normalizer → tokenizer → recursive-descent parser → guarded evaluator → BODMAS stepper. **v10: variables, implicit multiplication (2x, 3(x+1)), equations (`eq` AST), multivariate polynomial engine (add/sub/mul/pow, exact rational coeffs), `solveEquation` (linear + quadratic, discriminant, exact fractions, step-by-step, substitution checks), `expand` (all Class-8 identities → textbook standard form a² + 2ab + b²)**. 97/97 tests (`node test-math.js`) |
| Word problems | `wordmath.js` | **NEW in v10** — `BitWords`: number-words ("twenty five"→25), 33 deterministic solvers covering the DAV Class-8 syllabus + Class 1–5 story sums, school-style steps + verification checks, Hinglish-friendly. 88/88 tests (`node test-wordmath.js`) |
| Knowledge | `data.js` `data2.js` `data3.js` | 330 intents — site help (full bittuhere.github.io knowledge), science, SST (incl. Bihar/Munger), ICT, GK, esports, deep maths concepts, quiz bank (162), template expansion |
| Knowledge v10 | `data4.js` | **17 chapter intents** completing the DAV Class-8 *Secondary Mathematics* syllabus: perfect-square properties + Pythagorean triplets, √ methods (repeated subtraction/prime-factorisation/long-division/estimation), cubes + Hardy–Ramanujan 1729, exponent laws + radicals/surds, direct & inverse variation, commercial maths (overheads/discount/sales tax/VAT/GST-CGST-SGST-IGST), compound interest (half-yearly/quarterly, population, depreciation, CI−SI shortcut), identities + numerical evaluation, polynomials (degree/like terms/division), linear equations (transpose/cross-multiplication), parallel lines & transversal angle pairs, quadrilaterals & polygon angle properties, construction cases, distance–time graphs, mensuration formula bank, statistics (class intervals/histogram/pie angles), + math_symmetry enhanced to full Ch-16 depth. Self-description sync (347 topics) |
| Weights | `weights.js` | Pre-trained by `node train.js` (seed 1337, 120 epochs, hidden 2048) — **82,37,403 params (82.4 lakh)**, int8 quantized (10.5MB), vocab 3,674 → 347 intents, held-out generalization **321/327 = 98.2%** |
| Trainer | `train.js` | `H=2048 E=120 node --max-old-space-size=4096 train.js` — live loss/accuracy, 327-phrase held-out test (28 new v10 chapter phrasings), writes quantized weights.js |
| Smoke tests | `test-boot.js` `test-math.js` `test-wordmath.js` `test-respond.js` | boot simulation + param badge + µs benchmark · 97 math-engine regressions · 88 word-problem regressions · **42 end-to-end `respond()` tests via DOM stubs** (algebra, word problems, v9 numeric, hijack guards) |
| UI | `index.html` | **v10 redesign**: glassmorphic header w/ gradient title, arcade-grid backdrop, polished bubbles, **markdown tables**, copy-answer buttons, adaptive streaming (long answers ~2.5s), centered 900px column, custom scrollbars, mobile tweaks. Chat memory, name memory, live skills (math/word-problems/converter/dice/quiz), 🧠 live-retrain button |

## The v10 maths pipeline (deterministic, in order)
1. **Quiz answer?** → handled first (never hijacked)
2. `BitMath.looksLikeMath` → pure expression → BODMAS solver + steps
3. `BitMath.looksLikeEquation` → `solveEquation` (steps + substitution check) or `expand` (identity → standard form)
4. `BitWords.looksLikeWordProblem` → 33-solver word-problem engine
5. otherwise → neural net (347 topics) → `skill_calc` routes back into `doMath`
   (algebra → word problems → tables/GCD/LCM/percent specials → numeric BODMAS)

Every maths answer shows the working. Every equation is verified by substitution.
Nothing numeric is ever "guessed" by the net.

## Rebuild / retrain
```bash
node test-math.js && node test-wordmath.js && node test-respond.js   # all green?
H=2048 E=120 node --max-old-space-size=4096 train.js                # ~46 min → weights.js
node test-boot.js                                                    # boot + benchmark
python3 -m http.server 8000 --bind 0.0.0.0                          # preview
```
`data3.js` is assembled from `parts9/` via `./build-data3.sh`; `data4.js` is a
standalone source file. Bump `CACHE` in `sw.js` + `?v=` in the loader on release.
