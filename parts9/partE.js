
    /* ══════════ PART E — robustness patterns (weak-spot reinforcement) ══════════ */
    (function () {
        var byTag = {};
        for (var i = 0; i < INTENTS.length; i++) byTag[INTENTS[i].tag] = INTENTS[i];
        var ADD = {
            site_categories: ["sections of the arcade hub website", "study and multiplayer sections", "what sections does the site have"],
            site_medals: ["gold silver bronze for quiz", "prize for quiz winners", "medal for first rank"],
            site_username_change: ["how often can i change display name", "username change rules", "display name change policy"],
            site_contact_form: ["message the developer", "send feedback to owner", "write to the site team"],
            site_rotate: ["rotate phone landscape for games", "turn phone sideways message", "landscape mode prompt"],
            site_invite: ["accept or decline invite", "friend request join button", "invite notification handling"],
            site_fair_copies_drive: ["exam copies folder", "school copies in google drive", "official exam answer sheets"],
            site_change_password_flow: ["set new password steps", "two step password change", "create a fresh password"],
            sci_genetics: ["traits from parents to children", "inheritance of features", "genes decide characteristics"],
            sci_adolescence: ["why do teens get pimples", "acne during puberty", "teenage body changes"],
            sci_static: ["rubbed comb attracts paper", "static charge examples", "balloon sticks to wall after rubbing"],
            sci_biodiversity: ["protecting forests and animals importance", "why conserve wildlife", "save species from extinction"],
            sci_digestion: ["food broken down in the body", "how the body breaks down food"],
            hist_sikh: ["ranjit singh sher e punjab", "lion of punjab ruler"],
            hist_renaissance: ["rebirth period in europe", "europe rebirth of art and learning"],
            hist_ww2: ["cities hit by atomic bomb", "nuclear bombs dropped in war", "hiroshima nagasaki bombing"],
            geo_bihar: ["munger district details", "bihar state overview"],
            geo_parks: ["where to see one horned rhino", "wildlife viewing national park", "kaziranga rhino habitat"],
            geo_dams: ["why are dams built across rivers", "purpose of building big dams", "dam irrigation and power"],
            geo_transport: ["how many passengers travel by train daily", "indian railways passenger numbers", "railway network size"],
            civics_amendments: ["which amendment added the duties", "42nd amendment changes", "constitution amendment examples"],
            civics_rti: ["demand records from government office", "ask government for files", "file rti application steps"],
            civics_consumer: ["shopkeeper overcharged above mrp", "complain against overcharging", "mrp violation complaint"],
            econ_budget: ["budget presented on which date", "february 1 budget day", "finance minister budget speech day"],
            ict_office: ["software for making slides", "presentation making software", "which app for slides and charts"],
            ict_egovernance: ["digilocker stores documents", "government services apps", "umang app services"],
            ict_upi: ["gpay phonepe money transfer", "instant payment through apps", "qr code payment system"],
            ict_opensource: ["can i modify linux freely", "software free to change and share", "is linux cost free"],
            ict_cloud: ["where are google drive files stored", "physical location of cloud data", "data centres store my files"],
            ict_social: ["why do reels autoplay", "short videos keep playing endlessly", "endless scrolling feed"],
            ict_ai: ["how do ai models predict the next word", "how does a language model work", "ai word prediction"],
            math_bodmas: ["which operation first in simplification", "order of solving maths expressions", "first brackets then what"],
            math_linear: ["solving equations by transposing", "transpose terms to solve", "one variable equation solving"],
            math_identities: ["a plus b whole square expansion", "expand a minus b squared", "formula of a b whole square"],
            math_coordinate: ["point lies in which quadrant", "negative x positive y quadrant", "quadrant signs of coordinates"],
            math_symmetry: ["how many symmetry lines does a square have", "mirror lines in shapes", "fold figure both halves match"],
            math_sets: ["venn diagram overlapping region meaning", "venn diagram intersection shows", "shaded region in venn diagram"]
        };
        var added = 0;
        for (var tag in ADD) {
            if (!ADD.hasOwnProperty(tag) || !byTag[tag]) continue;
            for (var p = 0; p < ADD[tag].length; p++)
                if (byTag[tag].patterns.indexOf(ADD[tag][p]) === -1) { byTag[tag].patterns.push(ADD[tag][p]); added++; }
        }
        if (typeof console !== "undefined") console.log("[data3] robustness pass added " + added + " patterns");
    })();
