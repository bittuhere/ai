# 🤖 BitBot v9 — Arcade Hub's AI assistant (79-LAKH PARAMETER EDITION)

**Full BODMAS math engine with step-by-step working • typo-tolerant "understands
anything" vocabulary • complete knowledge of bittuhere.github.io • visible
chain-of-thought (top-3 guesses!) • honest AI (never pretends) • quiz mode •
330 topics • ~300µs answers • 78,95,370 parameters • int8-quantized weights •
loading screen • offline service worker • PWA.**

A **real neural network + a real math engine** — built from scratch, no libraries,
no server, no API. It trains IN THE BROWSER (or boots instantly from pre-trained
weights), **remembers the conversation**, remembers **your name across reloads**,
answers in **markdown**, trains on **real premade datasets** (CLINC150 + Open
Trivia DB) — and now knows **330 topics**: deep site help, science, FULL maths,
SST (history incl. Bihar/Magadha/Maratha/Sikh empires, geography, civics,
economics), ICT/computers, GK, ISRO, careers… plus quiz mode and Hinglish.

## What it actually is
| Piece | File | What |
|---|---|---|
| Brain | `brain.js` | Neural net engine from scratch: tokenizer, stemmer, bag-of-words, **v9: + char-trigram hash features (512 buckets — typo/OOV tolerance)**, He-initialized fully-connected net, softmax + cross-entropy, SGD backprop, sparse forward/backward, **int8 per-row quantized serialization** — browser AND node |
| Math engine | `math.js` | **NEW in v9** — `BitMath`: normalizer (÷ × − ² ³ √ π, lakh/crore words, Indian commas, word-operators) → tokenizer → recursive-descent parser → guarded evaluator → precedence-aware renderer → **BODMAS step-by-step stepper**. 54/54 regression tests (`node test-math.js`) |
| Knowledge | `data.js` | **125 core intents** — site help, games, chat, skills, CLINC150 harvest, Hinglish, quiz bank (Open Trivia DB) |
| Knowledge v8 | `data2.js` | **128 intents** (science → civics → esports → smalltalk → bot-meta), +40 quiz questions |
| Knowledge v9 | `data3.js` | **77 NEW intents**: complete site knowledge (scraped from the live bittuhere.github.io — quiz rules, ban system, medals, admin panel, Fair Copies, invites…), science batch 2, SST deep-dive (**Bihar + Munger**, Maratha/Sikh empires, WW1/WW2, UN…), ICT (UPI, e-gov, cyber law, cloud, AI, game dev), maths concepts (BODMAS, LCM/HCF, identities…) + **question-template expansion (+1,068 patterns)** + robustness/repair passes (+180) — quiz bank now **162** |
| Weights | `weights.js` | Pre-trained by `node train.js` (seed 1337, 120 epochs, hidden 2048) — **79.0 lakh parameters**, QUANTIZED int8 per-row→base64 (**~10MB** instead of ~63MB JSON) — held-out benchmark: **294/299 = 98.3%** on unseen phrasings |
| Trainer | `train.js` | Trains (`H=… E=… node train.js`), prints live loss/accuracy, runs the **299-phrase held-out test**, writes quantized weights.js |
| Dataset tools | `harvest.js` | CLINC150 filter/merger · `quiz-data.json` records the Open Trivia DB source |
| Smoke tests | `test-boot.js` `test-math.js` | `node test-boot.js` — simulates the browser boot, verifies param badge + hash vocab, benchmarks µs/answer, predicts 50 old+new topics · `node test-math.js` — 54 math-engine regressions |
| UI | `index.html` | Neon chat, streaming answers → markdown render, conversation memory, name memory, live skills (math/converter/dice/quiz), 🧠 live-retrain button (12-epoch quick-train) |

## New in v9 — the 78-lakh-parameter upgrade 🧠
The v8 brain: vocab 2,357 → hidden 512 → 253 intents = 13.4 lakh params.
The v9 brain: vocab 3,012 **+ 512 hash buckets** → hidden **2048** → **330** intents
= **78,95,370 params (79.0 lakh)** — 5.8× bigger, still ~300µs per answer:

- **🧮 FULL maths — every reported bug fixed, with a real engine (`math.js`):**
  - `2+2÷2` = **3** (÷ × − ² ³ ¹⁰ √ π all understood — real Unicode support)
  - `9-08` = **1** (leading zeros fine), `5¹⁰` = 9765625, `5 lakh+2` = 500002
  - `50% of 200`, `3!`, `0!`, `√169`, `12 squared`, `cube of 9`, `7 mod 3`
  - Guards: ÷0, √negative, 171!+, overflow — friendly errors, never `Infinity`
  - **Tables of ANY number** (`table of 999`, `17 ka table`, `… up to 20`) — no more 99-limit
  - **"simplify and explain: (2+3)×4²−10÷5"** → full BODMAS walkthrough:
    deepest brackets first, ÷× and +− left-to-right, every step shown with the
    reason ("Exponent (power): 4^2 = 16 → expression becomes 5 × 16 − 10 ÷ 5")
  - Pure expressions are **pre-caught deterministically** before the neural net —
    `2+2÷2` can NEVER be misclassified again
- **🔤 "Understands anything" vocabulary:** every token also feeds 512 char-trigram
  hash buckets, so unseen words/typos (`fotosintesys`!) still light up neurons
  near their correctly-spelled twins. OOV coverage note shows in the 🧠 trace
- **🌐 Complete site knowledge (17 intents):** categories, Google login, weekly
  quiz rules (20 Qs, 60s each, Monday reset, one attempt), ban & cheat system,
  medals, username 7-day rule, bio, contact form (5MB attachments), admin panel,
  rotate prompt, rank card, friend invites, Fair Copies drive, leaderboard tabs,
  offline banner, change-password flow, profile stats
- **+77 intents / +1,941 patterns / +28 quiz questions** — SST goes deep: South
  Indian dynasties, Maratha & Sikh empires, British rule, **Bihar & Munger**
  (Magadha, Nalanda, Bodh Gaya, Champaran, Kosi, makhana!), Renaissance, WW1,
  WW2, UN, wonders, national parks, dams, industries, transport, duties,
  amendments, RTI, consumer rights, five-year plans, globalization, budget +
  ICT: computer history, memory units, I/O, MS Office, email, e-governance,
  UPI, social media, cyber law, open source, cloud, AI, game dev + maths
  concepts: BODMAS, squares/roots, cubes/roots, LCM/HCF, rational numbers,
  linear equations, identities, coordinate geometry, symmetry, sets
- **🧠 Chain-of-thought upgrade:** top-3 intent guesses with probabilities,
  vocabulary-coverage + unknown-word analysis, BODMAS step trace for math
- **📦 int8 quantization:** per-row scales keep precision (~1e-4 drift) at half
  the v8 int16 size — 79 lakh params in ~10MB

## How 79 lakh params stay INSTANT (the engineering)
1. **Sparse everything** — a message touches ~10-30 of 3,524 inputs; forward and
   backward passes iterate only over active features (bag-of-words + hash hits).
2. **int8 weights, per-row scales** — decode once at boot (~200ms), then pure
   Float32Array math. No dequantization in the hot loop.
3. **Deterministic fast paths** — prime checks and pure math expressions never
   touch the net; the BitMath parser answers in microseconds.
4. **Service worker cache** — the ~10MB weights download once; every later
   visit (and full offline use) boots from disk.
5. First-load honesty: ~10MB weights is a one-time download (gzipped ≈ 30-40%
   over HTTP). After that — instant forever, even offline.

## Architecture
```
"2+2÷2"  ──────────────────────────► BitMath pre-catch ──► parser ──► 3 ✅ (steps on request)
"simplify and explain: ..."          BitMath stepper ──► 5-step BODMAS walkthrough
"how do i add a friend?"
   │ tokenize → stem → bag-of-words (3,012 dense + 512 hash buckets = 3,524)
   ▼
 W1 3,524×2,048 ── ReLU ── W2 2,048×330 ── softmax ──► 330 intents
   │  (sparse matvec: only active features touch weights)
   ▼
 confidence gate (50%) + vocabulary-coverage OOD guard + honesty guard
   ▼
 answerFor(): skills (math/converter/dice/quiz/time — computed LIVE)
              games (entity extraction) → intents (anti-repeat cycling)
              → fallback (honest "I don't know")
   All of it narrated in the 🧠 chain-of-thought panel before every answer.
```

## The premade-dataset decision (kept from v5.2)
`data.js` carries a filtered CLINC150 harvest + Open Trivia DB quiz bank — real
datasets, credited in `harvest.js` / `quiz-data.json`. Everything else is
hand-written for Arcade Hub.

## Conversation memory
30-minute window: last topic, last game, given answers (anti-repeat), turn log.
"more" continues any REPEATABLE topic; "why" gets an honest meta-answer;
recap lists what you discussed. Name persists in localStorage forever.

## Run
No build step. Just open `index.html` (double-click works — file:// compatible)
or `python3 -m http.server` for the full PWA/offline experience.

**Retrain the shipped weights:** `node train.js` (defaults H=2048, E=120 —
≈45 min) · quick iteration: `H=512 E=60 node train.js`.

## Test it (v9 checklist)
- [ ] `2+2÷2` → 3 · `2²` → 4 · `9-08` → 1 · `5¹⁰` → 9765625 · `5 lakh+2` → 500002
- [ ] `simplify and explain: (2+3)×4^2-10÷5` → 5 BODMAS steps → 78
- [ ] `table of 999` · `17 ka table` · `table of 13 up to 20`
- [ ] `100/0` → friendly guard message (not Infinity)
- [ ] "how many questions in the weekly quiz" → 20 · "i switched tabs during quiz" → ban rules
- [ ] "which river flows through munger" → Ganga (geo_bihar/geo_rivers)
- [ ] "what does upi stand for" → Unified Payments Interface
- [ ] typo test: "fotosintesys kya hai" → still lands near photosynthesis (hash rescue)
- [ ] 🧠 panel shows top-3 guesses + coverage + hash/OOV notes
- [ ] `node test-math.js` → 54/54 · `node test-boot.js` → boot + 50 predictions

## Deploy to bittuhere.github.io/ai
`git add -A && git commit -m "v9" && git push` — GitHub Pages serves it as-is.

## Performance envelope (measured, v9)
- ~1.6ms per classification in node (sparse forward pass, H=2048; the dense 2048×330 output layer dominates) — still far below human perception, and browser JIT typically beats node
- Boot: weights decode ~35ms (int8, one-time)
- Browser 🧠 retrain: 12 epochs @ H=256 ≈ 35-60s, chunked at 60fps
- Full node retrain: 120 epochs @ H=2048 ≈ 45-60 min
