/* ═══════════════════════════════════════════════════════════════════════════
   bt-phrases.js — HAND-WRITTEN re-phrasings of bt-bank questions.
   Each entry: [bankId, alternateWayOfAsking].  The expected answer is the
   bank entry's own need/any — the maths must not change with the phrasing.
   Used by test-bt-variants.js ("one question in many different forms").
   ═══════════════════════════════════════════════════════════════════════════ */
module.exports = [
    /* ── Ch 1 Squares & Square Roots ─────────────────────────────────── */
    ['c1.m4',  'What is the smallest number that divides 72 to give a perfect square?'],
    ['c1.b1',  'How many non-square numbers lie between 13 squared and 14 squared?'],
    ['c1.b5',  'A square handkerchief has area 324 cm². Find the length of its side.'],
    ['c1.q4i', 'What is sqrt(0.0441) divided by sqrt(0.000441)?'],
    ['c1.e1',  'Two numbers multiply to 1296 and one is 16 times the other. Find the numbers.'],
    ['c1.h1',  'Levelling a square lawn costs Rs 20535 at Rs 15 per square metre. What will fencing it cost at Rs 22 per metre?'],
    ['c1.b3',  'Are 5, 7 and 9 a Pythagorean triplet? Justify.'],

    /* ── Ch 2 Cubes & Cube Roots ─────────────────────────────────────── */
    ['c2.m1',  'What is the cube of 0.1?'],
    ['c2.b1',  'Which number gives 1728 when cubed?'],
    ['c2.b3',  'What is the cube root of 0.000001?'],
    ['c2.e2',  'A cube has surface area 150 m². What is its volume?'],
    ['c2.h2',  'The ratio of three numbers is 2:3:4 and the sum of their cubes is 33957. Find the numbers.'],
    ['c2.b4',  'By what smallest number should 1715 be divided to get a perfect cube?'],

    /* ── Ch 3 Exponents & Powers ─────────────────────────────────────── */
    ['c3.m2',  'If 5 to the power x equals 1, what is x?'],
    ['c3.b2',  'What is 81 to the power of -3/4?'],
    ['c3.b5',  'Find x if 3 raised to (x - 1) equals 1/27'],
    ['c3.q5',  'What is the square root of (5 squared plus 12 squared)?'],
    ['c3.q6i', 'If 2^x + 2^x + 2^x = 192, what is x?'],
    ['c3.q7',  '4^x minus 4^(x-1) equals 24 — find x.'],

    /* ── Ch 4 Direct & Inverse Proportion ────────────────────────────── */
    ['c4.b3',  'Sweets were distributed among 50 children and each got 4 sweets. How many sweets would each child get if there were 40 children?'],
    ['c4.q3',  'x and y are in inverse variation. x = 25 when y = 3. Find y when x = 15.'],
    ['c4.q5',  'Three dozen oranges cost Rs 54. What is the cost of 8 oranges?'],
    ['c4.q6',  'A car covers 60 km in 1 hour 30 minutes. At the same speed, how long will it take to cover 100 km?'],
    ['c4.b4',  'y is directly proportional to 1/x. When x = 2, y = 20. Find x when y = 1.25.'],

    /* ── Ch 5 Comparing Quantities ───────────────────────────────────── */
    ['c5.m1',  'If SP is double the CP, what is the profit percent?'],
    ['c5.b5',  'A cooler marked Rs 3500 was sold for Rs 2800. What discount percent was given?'],
    ['c5.b3',  'Pencils bought at 10 for Rs 10 are sold at 8 for Rs 10. Find profit percent.'],
    ['c5.b1',  'An article sold for Rs 414 after an 8% discount on its marked price. Find the marked price.'],

    /* ── Ch 6 Compound Interest ──────────────────────────────────────── */
    ['c6.b1',  'Find the CI on Rs 1000 at 10% per annum for 2 years.'],
    ['c6.b4',  'What is the difference between CI and SI on Rs 5000 for 2 years at 5% per annum?'],
    ['c6.q10', 'The population of a city grows 8% every year. If it is 196830 now, what was it three years ago?'],
    ['c6.b3',  'A machine worth Rs 500000 loses 10% of its value every year. After how many years will it be worth Rs 364500?'],

    /* ── Ch 7 Identities & Factorisation ─────────────────────────────── */
    ['c7.q7i', 'What are the factors of z square minus 4z minus 77?'],
    ['c7.q2i', 'Multiply (7x - 9y) by (7x - 9y)'],
    ['c7.q5i', 'What is the value of 399 squared?'],
    ['c7.q5v', 'Evaluate 85 squared minus 75 squared.'],
    ['c7.q8',  'x + 1/x = 8. What is x² + 1/x²?'],
    ['c7.q4i', 'Simplify (a+b)² plus (a-b)²'],
    ['c7.b5',  'If a + b + c = 12 and a² + b² + c² = 64, find ab + bc + ac.'],
    ['c7.q13', 'If 3x + 4y = 10 and xy = -1, what is 9x² + 16y²?'],

    /* ── Ch 8 Polynomial Division ────────────────────────────────────── */
    ['c8.q3iii', 'What is the quotient and remainder when y^3 + 5y^2 + 12y + 9 is divided by y + 2?'],
    ['c8.b5',  'Divide (8y + 8y^2 + 7) by (1 - y) and give the remainder.'],
    ['c8.m1',  'For which value of p is (x^2 + 3x + p) divisible by (x - 2)?'],
    ['c8.b2',  '(x - 3) is a factor of 2x^2 + x + k. Find the value of k.'],
    ['c8.q2ii','What do you get when you divide sqrt(125) y^2 by 5y^2?'],
    ['c8.m2',  '(x^2 + 7x - 4) divided by (x + 7) gives what quotient?'],

    /* ── Ch 9 Linear Equations ───────────────────────────────────────── */
    ['c9.q2i', 'Find z if (2z + 7)/(3z + 8) = 1/4'],
    ['c9.b4',  'Solve (x^2 - 9)/(x + 3) = 4/7 for x'],
    ['c9.q7',  'The sum of two consecutive multiples of 6 is 66. Find them.'],
    ['c9.q4',  'A mother was 7 times as old as her daughter 5 years ago, and will be 3 times as old 5 years from now. Find their present ages.'],
    ['c9.b1',  'Find a number whose one-fifth increased by 30 equals its one-fourth decreased by 30.'],
    ['c9.q12', 'A purse has only Rs 2 and Rs 5 coins, 36 coins in all, totalling Rs 84. How many 5-rupee coins are there?'],
    ['c9.q6',  'A two-digit number has digits summing to 10. Swapping the digits increases the number by 36. Find it.'],

    /* ── Ch 11 Polygons ──────────────────────────────────────────────── */
    ['c11.m1', 'How many diagonals does a pentagon have?'],
    ['c11.b2', 'In parallelogram ABCD, angle B is 75°. What is angle C?'],
    ['c11.c1', 'What does each exterior angle of a regular octagon measure?'],
    ['c11.e1', 'What is each interior angle of a regular pentagon?'],
    ['c11.n1', 'A regular polygon has each interior angle of 156°. How many sides does it have?'],
    ['c11.n2', 'Each angle of a regular polygon is 108 degrees. Find its number of sides.'],

    /* ── Ch 13 Coordinate Geometry ───────────────────────────────────── */
    ['c13.m3', 'Point P is (2, 3). How far is it from the x-axis?'],
    ['c13.b4', 'How far apart are the points (0, 2) and (0, 6)?'],
    ['c13.b5', 'Three vertices of square OABC are O(0,0), A(2,0) and B(2,2). Where is vertex C?'],
    ['c13.b3', 'Point C is (4, 2). What is its distance from the y-axis?'],

    /* ── Ch 14 Mensuration ───────────────────────────────────────────── */
    ['c14.b2', 'A cube has volume 729 cubic metres. Find its surface area.'],
    ['c14.b3', 'A cylinder has volume 2376 cm³ and base diameter 12 cm. What is its height?'],
    ['c14.b1', 'A polyhedron has 20 faces and 12 vertices. How many edges does it have?'],
    ['c14.v2', 'Find the area of a trapezium whose parallel sides are 60 cm and 90 cm and the distance between them is 50 cm.'],
    ['c14.q8', 'A roller of diameter 84 cm and length 120 cm levels a playground of 1584 m². How many revolutions are needed?'],
    ['c14.q9', 'A 108 m³ reservoir fills at 60 litres per minute. How many hours to fill it?'],
    ['c14.q11','A 7 m diameter, 20 m deep well is dug and the earth is spread on a 22 m by 14 m plot. Find the height of the platform.'],
    ['c14.m5', 'If every side of a cube is doubled, what is the ratio of the new volume to the old volume?'],
    ['c14.m3', 'What is the area of a trapezium with parallel sides 10 cm and 12 cm and height 4 cm?'],

    /* ── Ch 15 Data Handling & Probability ───────────────────────────── */
    ['c15.m1', 'In a survey, 20 out of 100 people played badminton. What is the pie-chart sector angle for this group?'],
    ['c15.b1', 'A letter is picked from the letters of the word PROBABILITY. What is the probability that it is a vowel?'],
    ['c15.b3', 'A number is picked from the first 10 natural numbers. What is the probability that it is prime?'],
    ['c15.b4', 'In a survey, 180 children read story books and 20% read adventure books. How many children read adventure books?'],
    ['c15.q7i','List the outcomes of getting a prime number when a die is thrown.'],
    ['c15.q8ii','A bag has slips numbered 1, 15, 9, 7, 18, 48, 73, 6, 36, 4. What is the probability that a slip drawn is a multiple of 3?'],

    /* ── Ch 16 Rotational Symmetry ───────────────────────────────────── */
    ['c16.m4', 'What is the order of rotational symmetry of a regular pentagon?'],
    ['c16.m3', 'If the angle of rotation of a figure is 36°, what is its order of rotational symmetry?'],
    ['c16.q5iii', 'What is the angle of rotation of a regular five-pointed star?'],
    ['c16.q3', 'Which letters of the word MATHS have rotational symmetry of order 2?'],
    /* ── free-form stress patterns (comma-grouped numbers, Hinglish full
          sentences, em-dash shorthand, trailing "kitna hoga?") ─────────── */
    ['c6.q10', 'The population of a town increases 8% annually. If it is 1,96,830 now, what was it 3 years ago?'],
    ['c6.q10', 'hey bitbot, population of a city increases 8% annually, it is 196830 now — population 3 years ago?'],
    ['c6.q10', 'batao, ek city ki population 8% saalana badhti hai, abhi 196830 hai, 3 saal pehle kitni thi?'],
    ['c6.q10', 'can you tell me, The annual rate of growth in population of a certain city is 8%. If its present population is 1,96,830, what was the population three years ago? kitna hoga?'],
    ['c6.q10', 'WITH FULL STEPS: population increases 8% annually it is 196830 now what was it 3 years ago'],
];
