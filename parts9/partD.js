
    /* ══════════ PART D1 — math-engine triggers for skill_calc ══════════ */
    (function () {
        var calc = null;
        for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].tag === "skill_calc") { calc = INTENTS[i]; break; }
        if (calc) {
            var extra = [
                "simplify and explain", "solve step by step", "step by step solution", "show your steps",
                "show the working", "explain the calculation", "how did you calculate", "solve with steps",
                "bodmas simplify", "simplify this expression", "simplify using bodmas", "what is the answer with steps",
                "what is 2+2/2", "solve 2^2", "what is 9-08", "calculate 5 factorial", "what is 2 plus 2 divided by 2",
                "evaluate this expression", "simplify 12 x 4 - 8 / 2", "what is 3 squared", "cube of 9", "square root of 225",
                "hcf of 24 and 36", "lcm of 15 and 20", "is 97 prime", "factors of 100", "average of 10 20 30",
                "table of 13", "17 ka table", "table of 999", "what is 25 percent of 480", "half of 1234",
                "convert 5 km to meters", "5 kg in grams", "100 celsius in fahrenheit", "3 hours in minutes",
                "solve (2+3)*4^2-10/5", "simplify 50% of 200 + 15", "what is 1000000 times 1000000"
            ];
            for (var e = 0; e < extra.length; e++) if (calc.patterns.indexOf(extra[e]) === -1) calc.patterns.push(extra[e]);
        }
    })();

    /* ══════════ PART D2 — question-form template expansion ══════════ */
    (function () {
        var byTag = {}, seen = {};
        for (var i = 0; i < INTENTS.length; i++) {
            byTag[INTENTS[i].tag] = INTENTS[i];
            for (var j = 0; j < INTENTS[i].patterns.length; j++) seen[INTENTS[i].patterns[j].toLowerCase()] = 1;
        }
        var TOPICS = {
            hist_india: ["indian history"], hist_world: ["world history"], sports_cricket: ["cricket"],
            sci_respiration: ["respiration"], sci_reproduction: ["reproduction"], sci_metals: ["metals and non metals"],
            sci_fossil_fuel: ["fossil fuels"], sci_micro: ["microorganisms"], sci_friction: ["friction"],
            sci_light_eye: ["human eye"], math_algebra: ["algebra"], math_geometry: ["geometry"],
            math_ratios: ["ratio and proportion"], geo_layers: ["layers of the earth"], geo_weather: ["weather and climate"],
            geo_agriculture: ["agriculture"], comp_terms: ["computer terminologies"], inventions: ["great inventions"],
            english_grammar: ["english grammar"], internet_safety: ["internet safety"], computer_shortcuts: ["computer shortcuts"],
            sci_photosynthesis: ["photosynthesis"], sci_digestion: ["digestion"], sci_heart: ["human heart"],
            sci_nerves: ["nervous system"], sci_sound: ["sound"], sci_heat: ["heat"], sci_matter: ["states of matter"],
            sci_magnets: ["magnets"], sci_atom: ["atom"], sci_elements: ["chemical elements"], sci_acids: ["acids and bases"],
            sci_reactions: ["chemical reactions"], sci_motion: ["motion"], sci_newton: ["newtons laws of motion"],
            sci_machines: ["simple machines"], sci_plants: ["plants"], sci_animals: ["animals"], sci_ecosystem: ["ecosystem"],
            sci_pollution: ["pollution"], sci_evolution: ["evolution"], sci_skeleton: ["human skeleton"],
            sci_nutrition: ["nutrition"], math_fractions: ["fractions"], math_decimals: ["decimals"],
            math_percentage: ["percentage"], math_profit_loss: ["profit and loss"], math_probability: ["probability"],
            math_stats: ["statistics"], math_mensuration: ["mensuration"], math_trigonometry: ["trigonometry"],
            math_exponents: ["exponents"], math_numbers: ["number system"], math_distance: ["distance time and speed"],
            geo_continents: ["continents"], geo_rivers: ["rivers of india"], geo_mountains: ["mountains"],
            geo_deserts: ["deserts"], geo_states: ["states of india"], geo_countries: ["countries of the world"],
            geo_moon: ["moon"], geo_climate: ["climate"], geo_resources: ["natural resources"], geo_soil: ["soil"],
            geo_disasters: ["natural disasters"], geo_population: ["population"], geo_maps: ["maps"],
            geo_timezones: ["time zones"], hist_freedom: ["indian freedom struggle"], hist_gandhi: ["mahatma gandhi"],
            hist_ancient: ["ancient india"], hist_mughal: ["mughal empire"], hist_modern: ["modern india"],
            hist_civilizations: ["ancient civilizations"], hist_revolutions: ["revolutions in history"],
            hist_industrial: ["industrial revolution"], hist_explorers: ["great explorers"], hist_monuments: ["famous monuments"],
            civics_constitution: ["constitution of india"], civics_rights: ["fundamental rights"],
            civics_parliament: ["parliament of india"], civics_judiciary: ["judiciary"], civics_democracy: ["democracy"],
            civics_elections: ["elections in india"], civics_panchayat: ["panchayati raj"], civics_law: ["law and order"],
            econ_money: ["money"], econ_banking: ["banking"], econ_inflation: ["inflation"], econ_gdp: ["gdp"],
            econ_tax: ["tax"], econ_business: ["business and commerce"], comp_networking: ["computer networks"],
            comp_coding: ["coding and programming"], comp_security: ["cyber security"], comp_mobile: ["smartphones"],
            comp_future: ["future technology"], comp_database: ["databases"], sports_football: ["football"],
            sports_hockey: ["hockey"], sports_olympics: ["olympics"], sports_badminton: ["badminton"],
            sports_chess: ["chess"], sports_athletics: ["athletics"], sports_esports: ["esports"],
            health_diet: ["healthy diet"], health_fitness: ["fitness"], health_hygiene: ["hygiene"],
            health_diseases: ["common diseases"], health_firstaid: ["first aid"], health_mind: ["mental health"],
            health_yoga: ["yoga"], eng_vocabulary: ["english vocabulary"], eng_idioms: ["idioms"],
            eng_proverbs: ["proverbs"], eng_writing: ["essay writing"], gk_awards: ["awards and honours"],
            gk_books: ["famous books and authors"], gk_firsts: ["firsts in india"], gk_festivals: ["festivals of india"],
            gk_dance: ["dance forms of india"], gk_scientists: ["famous scientists"], gk_fullforms: ["full forms"],
            gk_isro: ["isro and space missions"],
            sci_genetics: ["genetics and heredity"], sci_cell_division: ["cell division"], sci_adolescence: ["adolescence"],
            sci_stars: ["stars and life cycle of stars"], sci_universe: ["universe"], sci_mirrors: ["mirrors"],
            sci_lenses: ["lenses"], sci_pressure: ["pressure"], sci_static: ["static electricity"],
            sci_work_power: ["work energy and power"], sci_carbon: ["carbon and its compounds"], sci_plastics: ["plastics and polymers"],
            sci_combustion: ["combustion and flame"], sci_biodiversity: ["biodiversity"], sci_instruments: ["scientific instruments"],
            hist_south_india: ["south indian dynasties"], hist_maratha: ["maratha empire"], hist_sikh: ["sikh empire"],
            hist_british: ["british rule in india"], hist_bihar: ["history of bihar"], hist_renaissance: ["renaissance"],
            hist_ww1: ["world war 1"], hist_ww2: ["world war 2"], hist_un: ["united nations"], hist_wonders: ["wonders of the world"],
            geo_bihar: ["bihar"], geo_parks: ["national parks"], geo_dams: ["dams"], geo_industries: ["industries of india"],
            geo_transport: ["transport in india"], civics_duties: ["fundamental duties"], civics_amendments: ["constitutional amendments"],
            civics_rti: ["right to information"], civics_consumer: ["consumer rights"], econ_planning: ["five year plans"],
            econ_globalization: ["globalization"], econ_budget: ["union budget"],
            ict_history: ["history of computers"], ict_units: ["computer memory units"], ict_input_output: ["input and output devices"],
            ict_office: ["ms office"], ict_email: ["email"], ict_egovernance: ["e governance"], ict_upi: ["upi"],
            ict_social: ["social media"], ict_cyberlaw: ["cyber law"], ict_opensource: ["open source software"],
            ict_cloud: ["cloud computing"], ict_ai: ["artificial intelligence"], ict_gamedev: ["game development"],
            math_bodmas: ["bodmas"], math_squares: ["squares and square roots"], math_cubes: ["cubes and cube roots"],
            math_lcmhcf: ["lcm and hcf"], math_rational: ["rational numbers"], math_linear: ["linear equations"],
            math_identities: ["algebraic identities"], math_coordinate: ["coordinate geometry"], math_symmetry: ["symmetry"],
            math_sets: ["sets"]
        };
        var FORMS = [
            function (k) { return "what is " + k; },
            function (k) { return "explain " + k; },
            function (k) { return "tell me about " + k; },
            function (k) { return "define " + k; },
            function (k) { return k + " kya hai"; },
            function (k) { return k + " ke bare me batao"; }
        ];
        var added = 0;
        for (var tag in TOPICS) {
            if (!TOPICS.hasOwnProperty(tag)) continue;
            var it = byTag[tag];
            if (!it) continue;
            var kws = TOPICS[tag];
            for (var k = 0; k < kws.length; k++) {
                for (var f = 0; f < FORMS.length; f++) {
                    var p = FORMS[f](kws[k]).toLowerCase();
                    if (seen[p]) continue;
                    seen[p] = 1;
                    it.patterns.push(p);
                    added++;
                }
            }
        }
        if (typeof console !== "undefined") console.log("[data3] template expansion added " + added + " patterns");
    })();

    /* ══════════ PART D3 — new quiz bank (Class-8 friendly, all subjects) ══════════ */
    QUIZ.push(
        { q: "As per BODMAS, which operation is performed FIRST in '2 + 2 ÷ 2'?", options: ["Addition", "Division", "Left to right", "Any order"], correct: 1 },
        { q: "What is the value of 2 + 2 ÷ 2?", options: ["2", "3", "4", "1"], correct: 1 },
        { q: "What is √144?", options: ["10", "11", "12", "14"], correct: 2 },
        { q: "HCF of 12 and 18 is:", options: ["2", "3", "6", "12"], correct: 2 },
        { q: "LCM of 4 and 6 is:", options: ["10", "12", "24", "2"], correct: 1 },
        { q: "(a+b)² equals:", options: ["a²+b²", "a²−2ab+b²", "a²+2ab+b²", "2a²+2b²"], correct: 2 },
        { q: "UPI stands for:", options: ["Universal Payment Interface", "Unified Payments Interface", "United Pay India", "User Payment Index"], correct: 1 },
        { q: "Who is regarded as the world's first computer programmer?", options: ["Charles Babbage", "Alan Turing", "Ada Lovelace", "Tim Berners-Lee"], correct: 2 },
        { q: "1 Kilobyte (KB) equals how many bytes?", options: ["100", "1000", "1024", "2048"], correct: 2 },
        { q: "World War II ended in which year?", options: ["1943", "1944", "1945", "1947"], correct: 2 },
        { q: "How many Fundamental Duties does the Indian Constitution list?", options: ["9", "10", "11", "12"], correct: 2 },
        { q: "The Right to Information Act was passed in:", options: ["2002", "2005", "2010", "2015"], correct: 1 },
        { q: "The Brihadeeswara Temple at Thanjavur was built by which dynasty?", options: ["Pandyas", "Cheras", "Cholas", "Pallavas"], correct: 2 },
        { q: "Who was known as 'Sher-e-Punjab'?", options: ["Shivaji Maharaj", "Maharaja Ranjit Singh", "Tipu Sultan", "Bajirao I"], correct: 1 },
        { q: "India's first national park (est. 1936) is:", options: ["Kaziranga", "Ranthambore", "Jim Corbett", "Kanha"], correct: 2 },
        { q: "Which river is called the 'Sorrow of Bihar'?", options: ["Gandak", "Kosi", "Son", "Bagmati"], correct: 1 },
        { q: "Munger is situated on the bank of which river?", options: ["Kosi", "Gandak", "Ganga", "Sone"], correct: 2 },
        { q: "The ruins of the ancient Nalanda University are in which state?", options: ["Uttar Pradesh", "Bihar", "West Bengal", "Odisha"], correct: 1 },
        { q: "Which gas do plants absorb for photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 2 },
        { q: "Which cell organelle is called the 'powerhouse of the cell'?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correct: 2 },
        { q: "How many bones are in an adult human body?", options: ["196", "206", "216", "300"], correct: 1 },
        { q: "The Chandrayaan missions are operated by:", options: ["DRDO", "NASA", "ISRO", "ESA"], correct: 2 },
        { q: "In the Arcade Hub Weekly Quiz, how many questions are asked?", options: ["10", "15", "20", "25"], correct: 2 },
        { q: "How much time do you get per question in the Weekly Quiz?", options: ["30 seconds", "45 seconds", "60 seconds", "90 seconds"], correct: 2 },
        { q: "What medal appears on the profile of a Weekly Quiz winner (rank 1)?", options: ["Bronze", "Silver", "Gold", "Diamond"], correct: 2 },
        { q: "The Weekly Quiz leaderboard ranks players by:", options: ["Highest score only", "Fastest total time with correct answers", "Number of logins", "Alphabetical order"], correct: 1 },
        { q: "What is the maximum attachment size in the site's Contact form?", options: ["1 MB", "2 MB", "5 MB", "10 MB"], correct: 2 },
        { q: "Which is the largest gland in the human body?", options: ["Pancreas", "Liver", "Thyroid", "Salivary gland"], correct: 1 }
    );
