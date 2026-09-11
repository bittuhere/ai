/* BitBot offline trainer — trains the net, writes weights.js, reports accuracy.
   Run: node train.js   (this is how the shipped weights were produced) */
const BitBrain = require('./brain.js');
const BitData = require('./data.js');

const HIDDEN = 40, EPOCHS = 300, SEED = 1337;
const t = BitBrain.makeTrainer(BitData.INTENTS, { seed: SEED, hidden: HIDDEN });
const r = BitBrain.rng(4242);

let loss = 0;
for (let e = 0; e < EPOCHS; e++) {
    loss = t.epoch(r, e < 120 ? 0.12 : e < 200 ? 0.06 : 0.02);
    if (e % 40 === 0) console.log(`epoch ${String(e).padStart(3)}  loss ${loss.toFixed(4)}  acc ${(t.accuracy()*100).toFixed(1)}%`);
}

// held-out generalization test: phrasings NOT in the training data
const HELD_OUT = [
    ['which games can i play here', 'list_games'],
    ['how do i switch on message alerts on my phone', 'enable_push'],
    ['i cant remember my password what now', 'forgot_password'],
    ['where do i find old exam papers', 'fair_copies'],
    ['paper is not opening in the reader', 'pdf_problem'],
    ['who developed this website', 'who_made'],
    ['can i talk with mic while racing', 'voice_chat'],
    ['my friend is typing how do i see that', 'typing_status'],
    ['make me a new account please', 'signup'],
    ['is my chat private from others', 'privacy'],
    ['the site looks old and broken', 'cache_issue'],
    ['how to beat people at tic tac toe online', 'multiplayer'],
    ['play snake what are the buttons', 'how_to_play'],
    ['tell me about the flappy game', 'game_info'],
    ['do i need to pay anything', 'is_free'],
    ['good job robot', 'thanks'],
    ['see ya', 'bye'],
    ['how do scores get on the board', 'leaderboard'],
    ['help my login is failing', 'login_problem'],
    ['why do you want my email id', 'email_verify'],
    ['red circle on the friends button means what', 'unread_red_dot'],
    ['my net is gone does the site work', 'offline'],
    ['which phones are supported', 'devices'],
    ['what is that c++ car experiment', 'wasm_car'],
    ['namaskar', 'greeting'],
    ['how many inches is 20 cm', 'skill_convert'],
    ['throw a dice for me', 'skill_random'],
    ['what is a cell made of', 'sci_cells'],
    ['potential energy meaning', 'sci_energy'],
    ['will you get more accurate with time', 'bot_accuracy'],
    ['can i install this website', 'install_pwa'],
    ['what did you use to build this site', 'tech_stack'],
    ['how many players play here', 'site_stats'],
    ['i feel low today', 'smalltalk_sad'],
    ['what is 3 to the power of 4', 'skill_calc'],
    /* ── CLINC150 test-split utterances (never in training data) ── */
    ["how are you doing", "greeting"],
    ["are you okay", "greeting"],
    ["good speaking to you", "bye"],
    ["it was great to speak with you", "bye"],
    ["thank you ever so much for that!", "thanks"],
    ["thanks for helping", "thanks"],
    ["i would like to hear something funny", "skill_joke"],
    ["do you have any monkey jokes", "skill_joke"],
    ["is this a bot", "who_are_you"],
    ["i think your a bot", "who_are_you"],
    ["tell me what your name is", "who_are_you"],
    ["what did they name you", "who_are_you"],
    ["how old will you be", "smalltalk_age"],
    ["how old will you be this year", "smalltalk_age"],
    ["who is responsible for your employment", "who_made"],
    ["let me know who your boss is", "who_made"],
    ["what are your hobbies exactly", "smalltalk_fav"],
    ["what are your hobbies in life", "smalltalk_fav"],
    ["define the meaning of life for me", "off_topic"],
    ["would you explain the meaning of life", "off_topic"],
    ["where are you coming from", "smalltalk_origin"],
    ["from where do you come", "smalltalk_origin"],
    ["cats or dogs are your preference", "smalltalk_pets"],
    ["what kinds of pets do you own", "smalltalk_pets"],
    /* ── v5.2 knowledge intents + Hinglish ── */
    ["who was ashoka", "hist_india"],
    ["tell me about the world wars", "hist_world"],
    ["how many players are there in a cricket team", "sports_cricket"],
    ["what is kabaddi", "sports_general"],
    ["why do we need to respire", "sci_respiration"],
    ["explain pollination to me", "sci_reproduction"],
    ["give me two properties of metals", "sci_metals"],
    ["where does coal come from", "sci_fossil_fuel"],
    ["are all germs bad", "sci_micro"],
    ["why do we slip on wet floors", "sci_friction"],
    ["how does the eye work", "sci_light_eye"],
    ["explain what a variable is", "math_algebra"],
    ["sum of all angles of a triangle", "math_geometry"],
    ["what does a ratio mean", "math_ratios"],
    ["what is inside our planet", "geo_layers"],
    ["what does monsoon mean", "geo_weather"],
    ["which crops grow in winter", "geo_agriculture"],
    ["what does an operating system do", "comp_terms"],
    ["who invented the lightbulb", "inventions"],
    ["what is a noun in english", "english_grammar"],
    ["trivia please", "skill_quizme"],
    ["are you quick", "bot_speed"],
    ["hasao mujhe", "skill_joke"],
    ["dost kaise add karein", "friends_chat"],
];
let ok = 0;
const misses = [];
HELD_OUT.forEach(([q, tag]) => {
    const p = t.predict(q);
    if (p.tag === tag) ok++; else misses.push(`  ✗ "${q}" → ${p.tag} (${(p.prob*100).toFixed(0)}%), expected ${tag}`);
});
console.log('\n══════ HELD-OUT GENERALIZATION TEST ══════');
console.log(`unseen phrasings: ${ok}/${HELD_OUT.length} correct = ${(ok/HELD_OUT.length*100).toFixed(1)}%`);
misses.forEach(m => console.log(m));

// write weights.js (embedded — no fetch, works from file:// too)
const w = { net: t.net.serialize(), vocab: { words: t.vocab.words, tags: t.tags } };
const js = '/* BitBot pre-trained weights — generated by train.js (node). DO NOT EDIT.\n' +
    '   ' + w.net.W1.length + '+' + w.net.W2.length + ' weights · vocab ' + w.vocab.words.length + ' words · ' + w.vocab.tags.length + ' intents\n' +
    '   held-out accuracy: ' + (ok / HELD_OUT.length * 100).toFixed(1) + '% */\n' +
    'window.BITBOT_WEIGHTS = ' + JSON.stringify(w) + ';\n';
require('fs').writeFileSync('weights.js', js);
console.log('\nweights.js written (' + (js.length / 1024).toFixed(1) + ' KB)');
