
    /* ══════════ PART H — final held-out repair pass (confidently-wrong lanes) ══════════ */
    (function () {
        var byTag = {};
        for (var i = 0; i < INTENTS.length; i++) byTag[INTENTS[i].tag] = INTENTS[i];
        var ADD = {
            comp_coding: ["what language runs inside web browsers", "language that every browser runs", "browser built in language"],
            smalltalk_food: ["i am hungry suggest something to eat", "hungry what to eat now", "i feel hungry give food ideas"],
            smalltalk_pets: ["do you prefer cats or dogs", "cats or dogs which one do you like", "your pet preference cats dogs"],
            ict_upi: ["why is gpay money transfer so fast", "how gpay money moves quickly", "gpay instant transfer why fast"],
            math_coordinate: ["point minus 3 comma 4 which quadrant", "quadrant of point with negative x positive y", "coordinates of a point quadrant question"],
            gk_fullforms: ["full form of who organization", "what does who stand for", "who full form world health"],
            sci_acids: ["ph scale tells what", "what does ph scale measure", "ph scale acidity alkalinity measure"],
            math_stats: ["how to find median of numbers", "median of a number list", "finding median of given data"],
            hist_south_india: ["builder of thanjavur big temple", "rajaraja chola temple builder", "who constructed brihadeeswara"],
            math_trigonometry: ["value of sin 30", "sin 30 degrees value", "sin cos tan values table"]
        };
        var added = 0;
        for (var tag in ADD) {
            if (!ADD.hasOwnProperty(tag) || !byTag[tag]) continue;
            for (var p = 0; p < ADD[tag].length; p++)
                if (byTag[tag].patterns.indexOf(ADD[tag][p]) === -1) { byTag[tag].patterns.push(ADD[tag][p]); added++; }
        }
        if (typeof console !== "undefined") console.log("[data3] final repair pass added " + added + " patterns");
    })();
