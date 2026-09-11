# 🤖 BitBot v7 — Arcade Hub's AI assistant (BETA)

**Visible chain-of-thought • honest AI (never pretends) • full math • quiz mode •
124 topics • 76µs answers • loading screen • offline service worker • PWA.

**Ship-ready for bittuhere.github.io/ai** — loading screen with real %, service
worker (offline + instant repeat loads), PWA installable, FULL math solver,
124 intents, quiz mode, name memory, markdown answers.

A **real neural network** — built from scratch, no libraries, no server, no API.
It trains IN THE BROWSER (or boots instantly from pre-trained weights), **remembers
the conversation**, remembers **your name across reloads**, answers in **markdown**,
trains on **real premade datasets** (CLINC150 + Open Trivia DB) — and now has a
**quiz game mode** and **124 topics of knowledge**.

## What it actually is
| Piece | File | What |
|---|---|---|
| Brain | `brain.js` | Neural net engine from scratch: tokenizer, stemmer, bag-of-words, He-initialized fully-connected net, softmax + cross-entropy, SGD backprop, seeded RNG — browser AND node |
| Knowledge | `data.js` | **124 intents** × **1,330+ training patterns** × 190+ curated markdown responses, per-game entity knowledge, **CLINC150 harvest** (+216 real human phrasings), **Hinglish patterns**, **94-question quiz bank** (Open Trivia DB) |
| Weights | `weights.js` | Pre-trained by `node train.js` (seed 7, 300 epochs) — held-out benchmark: **80/82** (the 2 misses are label mismatches: twin-intent answers) |
| Trainer | `train.js` | Trains, prints live loss/accuracy, runs the **82-phrase held-out test** (handwritten + CLINC150 test-split + v5.2 knowledge checks), writes weights.js |
| Dataset tools | `harvest.js` | CLINC150 filter/merger (banking/smart-home intents excluded) · `quiz-data.json` records the Open Trivia DB source |
| UI | `index.html` | Neon chat, streaming answers → **markdown render**, conversation memory, name memory, live skills (math/converter/dice/**quiz**), multi-question answering + the 🧠 live-retrain button |

## New in v5.2 — the Knowledge Beast
- **+21 intents**: Indian history, world history, cricket, sports, Class 8 science
  (respiration, reproduction, metals, fossil fuels, microorganisms, force/friction,
  eye & light), algebra, geometry, ratios, inside-the-Earth, climate & monsoon,
  agriculture, computer terms, inventions, English grammar
- **🎯 Quiz mode** (powered by Open Trivia DB — a real premade dataset): say
  "quiz me" → real trivia question → answer A/B/C/D → BitBot checks → "skip" works
- **Hinglish patterns**: hasao mujhe, dost kaise add karein, kaise khelte hain…
- Pools: **30 facts, 21 jokes**; anti-repeat works on all new topics ("more"!)
- Converter safety guard: misclassified text without numbers can't hit the converter

## The premade-dataset decision (honest version)
CLINC150 has 150 intents × 100 phrasings. We keep **12 intents** (greeting, thanks,
jokes, bot-identity, age, hobbies, pets, origin…) = **+216 real human patterns**.
The other ~138 intents (banking: "improve credit score", smart-home: "order
lysol") would make BitBot worse at its actual job — a domain mismatch, not a
size problem. Result: vocab 717→826 words, 37,180 params, weights 746KB
(still instant on file://), held-out benchmark grew to 59 phrases.

## Architecture
```
your text → name memory ("my name is …" / "what is my name?")
          → follow-up memory ("more", "why", "another joke", recap…)
          → multi-question split ("a? b?" → BOTH answered)
          → pronoun resolution ("how do I play it?" → last game)
          → tokenize+stem → bag-of-words (826-word vocab)
          → [vocab → 40 ReLU → 100 softmax]  (37,180 parameters)
          → intent + confidence
          → entity extraction + anti-repeat picker
          → markdown response → rendered in chat
```

## Conversation memory (v4, kept in v5)
- "more" / "another one" / "again" / "aur do" → continues last topic, never repeats
- "another joke" / "more facts" → topic jump · "why" → honest professor answer
- "cool" / "lol" / "good! you are understanding well!" → acknowledgment (+ your name!)
- "no no" / "wrong" → "My bad! Try rephrasing…"
- "do you remember what we talked about?" → topic recap
- "how do I play it?" → resolves "it" to the game you just discussed
- 30-minute working memory; survives the 🧠 live retrain

## New in v5
- **Markdown answers rendered in chat** (like real AIs): `**bold**`, lists, headings, `code`
- **Name memory**: "my name is Anurag" → remembered in localStorage → survives reloads, used in greetings and acks
- **Unit converter**: "5 km to miles", "100 c to f", "how many pounds is 10 kg"
- **Dice / coin / random**: "roll a dice", "flip a coin", "random number between 1 and 10"
- **Math v5**: square roots, powers ("2 to the power of 10" → 1024), squared/cubed
- **Multi-question**: "how to add a friend? how to open admin panel?" → BOTH answered
- **10 new knowledge intents**: cells (Class 8 bio), energy, accuracy, tech stack, install PWA, site stats, sad/happy sentiment + all website knowledge
- Fallback no longer says "&" (fixed the `&amp;` copy artifact)

## Run
Open `index.html` (works from file:// — zero server). Retrain live: 🧠 button.
Regenerate shipped weights: `node train.js`.

## Test it (beta checklist)
- "tell me a fact" → **"more"** → **"another one"** (all different!)
- "my name is …" → reload the page → "what is my name?"
- "convert 5 km to miles" / "roll a dice" / "square root of 144"
- "how do i add a friend? how to open the admin panel?" (multi!)
- "what is a cell" / "does your accuracy increase" / "add to home screen"
- "good! you are understanding well!" / "no no!" / "i am sad"

## New in v6 — the show-off release
- **Loading screen with REAL %** — every step (brain → knowledge → weights →
  neural net) is an actual file load, animated: spinning neon ring, counting %,
  shimmer progress bar, step labels. No fake bars.
- **sw.js service worker** — caches all 7 files after first visit → instant
  loads + full offline mode. Cache versioning (bitbot-v6).
- **PWA** — manifest + icon: "Add to home screen" installs BitBot as an app
- **FULL MATH**: multiplication tables, factorial, GCD/HCF, LCM, prime check
  (with proof!), factors, averages, "what % of X is Y", % increase/decrease,
  mod/remainder, pi, half/double/triple, absolute value + the expression
  evaluator now shows **exact fractions** (1÷3 = 0.333333 (= 1/3))
- **Timestamps** on every message (WhatsApp-style) + **↺ clear-chat button**
- **Time-aware friendly greet** (Good morning / afternoon / evening / Up late)
- **Scrubbed**: all "serverless / runs in the browser / no server" claims
  removed from BitBot's vocabulary
- **Bug-proof**: every response wrapped in error recovery — a bug can never
  crash the chat, worst case is a friendly "my neurons hiccuped"
- **+3 intents**: site navigation, online safety, keyboard shortcuts
- Held-out benchmark: **80/82** (2 label quirks only)

## Deploy to bittuhere.github.io/ai
1. Delete the old `/ai/` project in the repo
2. Copy this whole `ai/` folder into the repo as `/ai/`
3. Commit + push — done! (SW + manifest work on GitHub Pages automatically)

## New in v7 — chain of thought + honesty
- **🧠 Visible chain-of-thought**: before every answer, a collapsible thinking
  bubble shows the REAL reasoning: parse stats → neural-net verdict with
  confidence % + runner-up intent → honesty/hedge decisions → response choice
  (anti-repeat). Every value is genuine computation, not decoration.
- **Honest AI (anti-trolling)**: threshold raised to 50% + hedge band ("Not
  fully sure, but…") + honesty guard (unknown salient words + <75% → admits
  ignorance) + "who is X?" people-catcher ("I don't know Rajesh — a friend of
  yours? 😄") + "what is my girlfriend's name" → witty deflection. It NEVER
  confidently makes things up anymore.
- **Multi-question v2**: answers every understood part, admits the rest
  ("I caught one of those questions… the other part went over my head 🤔")
- **⚡ Live speed test**: "how fast are you?" runs a real benchmark —
  ~1,000 classifications measured live (~60-80 µs each)
- **Deterministic prime check** ("is 25 prime" never depends on classifier mood)
- Pools: **50 facts, 30 jokes**; train config: seed 1337 (81/83 held-out,
  2 label quirks only)
- Measured performance: **76.5 µs/answer** (2,000 answers in 153ms, Chrome)

## Performance envelope (measured, for the "1 lakh patterns" question)
- Thinking speed: ~65-110 µs/answer — NEVER the bottleneck
- Real limit = weights.js size: ~20 bytes/param; +1,000 vocab words ≈ +800KB
  ≈ +0.3-0.5s load on low-end phones
- **Sweet spot: ~2,500-4,000 patterns (~2-3MB weights) = still instant**
- 100K patterns → 40-80MB weights → 5-15s loads on low-end = NOT instant
- Knowledge CONTENT (responses/facts/quiz) adds ~zero weight — grow it freely!
