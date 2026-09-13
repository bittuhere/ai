
    /* ══════════ PART G — self-description sync (v9 numbers everywhere) ══════════ */
    (function () {
        var PATCHES = [
            ["253 topics", "330 topics"],
            ["320 ReLU neurons", "2,048 ReLU neurons"],
            ["12–15 LAKH parameters** (1.2–1.5 million weights!)", "nearly 79 LAKH parameters** (7.9 million weights!)"],
            ["`data.js` + `data2.js`", "`data.js` + `data2.js` + `data3.js`"],
            ["thousands of example sentences", "nearly five thousand example sentences"],
            ["13 lakh", "79 lakh"],
            ["13-lakh", "79-lakh"],
            ["13.4 lakh", "79 lakh"]
        ];
        var hits = 0;
        for (var i = 0; i < INTENTS.length; i++) {
            var rs = INTENTS[i].responses;
            for (var j = 0; j < rs.length; j++) {
                var out = rs[j];
                for (var p = 0; p < PATCHES.length; p++) {
                    if (out.indexOf(PATCHES[p][0]) !== -1) {
                        out = out.split(PATCHES[p][0]).join(PATCHES[p][1]);
                        hits++;
                    }
                }
                rs[j] = out;
            }
        }
        if (typeof console !== "undefined") console.log("[data3] self-description sync: " + hits + " response patches");
    })();
