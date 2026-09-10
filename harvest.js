/* ═══ CLINC150 HARVESTER ═══════════════════════════════════════════════════
   BitBot's "premade dataset" pipeline.

   Source: CLINC150 — a public intent-classification dataset with 150 intents
   × 100 real human phrasings each (Larson et al. 2019,
   "An Evaluation Dataset for Intent Classification and Out-of-Scope
   Prediction" — github.com/clinc/oos-eval, MIT license).

   WHY WE ONLY TAKE A SLICE: ~130 of the 150 intents are banking /
   smart-home / shopping ("improve credit score", "order plastic bags") —
   the WRONG DOMAIN for an arcade assistant. Training on them would make
   BitBot worse at its actual job AND triple the vocab for nothing.
   We keep only the general-assistant intents that map onto BitBot tags.

   Run:  node harvest.js /path/to/data_full.json
   Download the data first:
   curl -L -o clinc-data.json https://raw.githubusercontent.com/clinc/oos-eval/master/data/data_full.json
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const CLINC_PATH = process.argv[2] || path.join(__dirname, 'clinc-data.json');
const DATA_JS = path.join(__dirname, 'data.js');
const TRAIN_JS = path.join(__dirname, 'train.js');

/* CLINC intent → BitBot tag (only domain-compatible intents!) */
const MAP = {
    greeting: 'greeting',
    goodbye: 'bye',
    thank_you: 'thanks',
    tell_joke: 'skill_joke',
    are_you_a_bot: 'who_are_you',
    what_is_your_name: 'who_are_you',
    how_old_are_you: 'smalltalk_age',
    who_do_you_work_for: 'who_made',
    what_are_your_hobbies: 'smalltalk_fav',
    meaning_of_life: 'off_topic'
};
/* NEW BitBot intents seeded from CLINC phrasings + our own */
const NEW_INTENTS = {
    smalltalk_origin: {
        clinc: ['where_are_you_from'],
        extra: ['where do you live', 'where do you stay'],
        responses: [
            'I live in your browser tab 🏠 — zero rent, infinite RAM, and the commute to the arcade is instant!',
            'Home is where the WiFi is… but mostly I live inside `weights.js` — a cozy 1MB of pure math! 📦'
        ]
    },
    smalltalk_pets: {
        clinc: ['do_you_have_pets'],
        extra: ['do you have a pet', 'got any pets'],
        responses: [
            'Yes! A pet Snake 🐍 — it lives in the games folder and keeps eating my highscores!',
            'I tried adopting a Pac-Man ghost 👻 but it kept eating my data packets. So… just the Snake!'
        ]
    }
};

const BAD_WORDS = /alexa|cortana|siri|google home|ai device|ai assistant|voice assistant|device|skill|speaker|smart home/;
const CAP_PER_TAG = 18;

function clean(t) {
    t = String(t).toLowerCase().replace(/\s+/g, ' ').trim();
    if (t.length < 4 || t.length > 44) return null;
    const words = t.split(' ');
    if (words.length > 7) return null;
    if (BAD_WORDS.test(t)) return null;
    if (!/^[a-z0-9' ?!.,-]+$/.test(t)) return null;
    return t;
}

(function main() {
    const clinc = JSON.parse(fs.readFileSync(CLINC_PATH, 'utf8'));
    const BitData = require(DATA_JS);

    /* existing patterns, for dedupe */
    const existing = {};
    BitData.INTENTS.forEach(it => { existing[it.tag] = new Set(it.patterns.map(p => p.toLowerCase())); });
    const seen = new Set();
    BitData.INTENTS.forEach(it => it.patterns.forEach(p => seen.add(p.toLowerCase())));

    const harvest = {};      // tag -> [phrasings]
    const heldOut = [];      // [utterance, tag] from the CLINC TEST split (never trained on)
    const stats = [];

    function take(clincIntent, tag) {
        const pool = clinc.train.filter(([, i]) => i === clincIntent).map(([t]) => t);
        const testPool = clinc.test.filter(([, i]) => i === clincIntent).map(([t]) => t);
        let got = 0;
        const out = (harvest[tag] = harvest[tag] || []);
        for (const raw of pool) {
            if (got >= CAP_PER_TAG) break;
            const t = clean(raw);
            if (!t || seen.has(t)) continue;
            seen.add(t); out.push(t); got++;
        }
        let ho = 0;
        for (const raw of testPool) {
            if (ho >= 2) break;
            const t = clean(raw);
            if (!t || seen.has(t)) continue;
            seen.add(t); heldOut.push([t, tag]); ho++;
        }
        stats.push(clincIntent + ' → ' + tag + ': +' + got + ' patterns, +2 held-out');
    }

    Object.keys(MAP).forEach(ci => take(ci, MAP[ci]));

    /* new intents: harvest + seed + responses */
    const newBlocks = [];
    Object.keys(NEW_INTENTS).forEach(tag => {
        const def = NEW_INTENTS[tag];
        const pats = [];
        def.clinc.forEach(ci => take(ci, tag));
        (harvest[tag] || []).forEach(p => pats.push(p));
        def.extra.forEach(p => { if (!pats.includes(p)) pats.push(p); });
        newBlocks.push(
            "    INTENTS.push({ tag: '" + tag + "', patterns: " + JSON.stringify(pats) + ",\n" +
            "        responses: " + JSON.stringify(def.responses, null, 8).replace(/\n/g, '\n    ') + " });"
        );
        stats.push('NEW intent ' + tag + ': ' + pats.length + ' patterns (CLINC + seed)');
    });

    /* ── patch data.js: insert harvest block before the BitData export ── */
    let src = fs.readFileSync(DATA_JS, 'utf8');
    const anchor = "    var BitData = { INTENTS: INTENTS, GAMES: GAMES };";
    if (src.split(anchor).length - 1 !== 1) { console.error('ABORT: data.js anchor not unique'); process.exit(1); }
    if (src.includes('CLINC_HARVEST')) { console.error('data.js already harvested — remove the old block first'); process.exit(1); }
    const block =
"    /* ═══ CLINC150 HARVEST (premade dataset!) ══════════════════════════\n" +
"       Real human phrasings from the public CLINC150 intent dataset\n" +
"       (Larson et al. 2019 — github.com/clinc/oos-eval, MIT license).\n" +
"       Only general-assistant intents that fit Arcade Hub were kept;\n" +
"       banking / smart-home / shopping intents were EXCLUDED (wrong domain).\n" +
"       Generated by harvest.js — do not edit by hand. */\n" +
"    var CLINC_HARVEST = " + JSON.stringify(harvest, null, 4).replace(/\n/g, '\n    ') + ";\n" +
"    Object.keys(CLINC_HARVEST).forEach(function (tag) {\n" +
"        for (var hi = 0; hi < INTENTS.length; hi++) if (INTENTS[hi].tag === tag) {\n" +
"            INTENTS[hi].patterns = INTENTS[hi].patterns.concat(CLINC_HARVEST[tag]);\n" +
"            break;\n" +
"        }\n" +
"    });\n" +
newBlocks.join('\n') + "\n\n";
    src = src.replace(anchor, block + anchor);
    fs.writeFileSync(DATA_JS, src);

    /* ── patch train.js: add CLINC test-split utterances to HELD_OUT ── */
    let tsrc = fs.readFileSync(TRAIN_JS, 'utf8');
    const tAnchor = "    ['what is 3 to the power of 4', 'skill_calc'],\n];";
    if (tsrc.split(tAnchor).length - 1 !== 1) { console.error('ABORT: train.js anchor not unique'); process.exit(1); }
    const hoLines = heldOut.map(([q, tag]) => '    ["' + q.replace(/"/g, '\\"') + '", "' + tag + '"],').join('\n');
    tsrc = tsrc.replace(tAnchor, "    ['what is 3 to the power of 4', 'skill_calc'],\n" +
        "    /* ── CLINC150 test-split utterances (never in training data) ── */\n" +
        hoLines + "\n];");
    fs.writeFileSync(TRAIN_JS, tsrc);

    /* ── report ── */
    console.log('════ CLINC150 HARVEST REPORT ════');
    stats.forEach(s => console.log('  ' + s));
    let total = 0; Object.keys(harvest).forEach(t => total += harvest[t].length);
    console.log('  TOTAL: +' + total + ' patterns, +' + (heldOut.length) + ' held-out test utterances');
    console.log('  samples: ' + JSON.stringify(Object.keys(harvest).slice(0, 3).map(t => harvest[t][0])));
})();
