
    /* ══════════ PART F — held-out miss repair (collision-token reinforcement) ══════════ */
    (function () {
        var byTag = {};
        for (var i = 0; i < INTENTS.length; i++) byTag[INTENTS[i].tag] = INTENTS[i];
        var ADD = {
            sci_sound: ["sound needs a medium to travel", "why sound cannot pass through vacuum", "sound waves need material medium"],
            sci_newton: ["newton third law examples", "action and reaction examples", "give an example of action reaction pair"],
            math_mensuration: ["volume of cylinder formula", "cylinder volume maths", "volume formulas for solids"],
            civics_law: ["what is an fir", "first information report", "fir in police matters"],
            comp_coding: ["which language runs in web browsers", "javascript runs in browser", "browser scripting language"],
            smalltalk_god: ["does god exist according to you", "your opinion on god", "is there a god"],
            site_categories: ["study section of the site", "what is under the study category", "sections on the home page"],
            site_medals: ["what do top three get", "prizes for top players", "winner rewards in quiz"],
            site_fair_copies_drive: ["where are exam copies kept", "location of school exam copies", "exam copies google drive folder"],
            sci_mirrors: ["why do mirrors flip images", "mirror image left right reversal", "lateral inversion in mirrors"],
            sci_combustion: ["candle flame colour", "why is a candle flame yellow", "blue flame vs yellow flame"],
            hist_maratha: ["shivaji battle tactics", "how shivaji defeated large armies", "guerrilla warfare shivaji"],
            hist_explorers: ["vasco da gama sea route", "who reached india by sea route", "european sea route to india"],
            geo_parks: ["where to find rhinos in india", "see one horned rhino where", "rhino habitat in india"],
            civics_duties: ["duties of citizens", "citizen responsibility towards country", "what duties do we have as citizens"],
            civics_consumer: ["shopkeeper charged more than mrp", "overcharged by shop what to do", "mrp overcharging complaint"],
            ict_email: ["cc and bcc meaning", "what is cc in email", "carbon copy in mail"],
            ict_egovernance: ["digilocker kya hai", "digilocker ka upyog", "what is digilocker"],
            ict_upi: ["how gpay transfers money instantly", "gpay payment how it works", "instant money transfer apps"],
            ict_cyberlaw: ["online threatening and blackmail law", "legal action for online harassment", "cyber crime against blackmail"],
            math_linear: ["solve equation by transposing terms", "transposing method steps", "transposition in equations"],
            math_symmetry: ["mirror lines of a square", "how many mirror lines", "symmetry lines count"],
            civics_amendments: ["samvidhan sanshodhan", "kitne sanshodhan hue", "sanshodhan kya hota hai"],
            math_sets: ["venn diagram overlap meaning", "venn diagram me overlap", "golon ka overlap venn"],
            geo_mountains: ["height of mount everest", "everest peak height", "tallest mountain height"]
        };
        var added = 0;
        for (var tag in ADD) {
            if (!ADD.hasOwnProperty(tag) || !byTag[tag]) continue;
            for (var p = 0; p < ADD[tag].length; p++)
                if (byTag[tag].patterns.indexOf(ADD[tag][p]) === -1) { byTag[tag].patterns.push(ADD[tag][p]); added++; }
        }
        if (typeof console !== "undefined") console.log("[data3] miss-repair pass added " + added + " patterns");
    })();
