/* test-wordmath.js — BitWords word-problem engine regression suite */
const W = require('./wordmath.js');

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('FAIL: ' + name); } }
function solve(t) { return W.solve(t); }
function ansOf(t) { const r = solve(t); return r ? r.answer.replace(/\*/g, '') : 'NULL'; }
function has(t, ...needles) {
    const r = solve(t);
    if (!r) { console.log('FAIL(no match): ' + t); fail++; return; }
    const hay = (r.title + ' ' + r.answer + ' ' + r.steps.map(s => s.why + ' ' + s.calc).join(' ') + ' ' + (r.check || '')).replace(/\*/g, '');
    if (needles.every(n => hay.indexOf(n) !== -1)) pass++;
    else { fail++; console.log('FAIL: ' + t + '\n  got: ' + hay.slice(0, 260) + '\n  want: ' + needles.join(' + ')); }
}
function none(t) { const r = solve(t); if (r === null) pass++; else { fail++; console.log('FAIL(should not match): ' + t + ' → ' + r.title + ' | ' + r.answer.slice(0, 80)); } }

/* ── numbers & linear setups ── */
has('The sum of two numbers is 25 and their difference is 5. Find the numbers.', '15', '10', 'Sum & Difference');
has('The sum of two numbers is 45 and one number is 17. Find the other number.', '28');
has('One number is 4 times the other. Their sum is 60. Find the numbers.', '12', '48');
has('Twice a number increased by 5 is 17. Find the number.', '6');
has('Three times a number decreased by 7 gives 20. Find the number.', '9');
has('5 added to twice a number gives 17. Find the number.', '6');
has('2/3 of a number is 18. Find the number.', '27');
has('The sum of three consecutive numbers is 33. Find them.', '10, 11, 12');
has('The sum of 4 consecutive even numbers is 44. Find them.', '8, 10, 12, 14');
has('Sum of three consecutive odd numbers is 21 find the numbers', '5, 7, 9');

/* ── ages ── */
has('The sum of the ages of a father and his son is 40 years. The father is 3 times as old as the son. Find their ages.', '30', '10');
has('A father is 4 times as old as his son. After 6 years, the sum of their ages will be 52. Find their present ages.', 'Younger = 8', 'Elder = 32');
has('Present age of Ravi is 25. What was his age 7 years ago?', '18');
has('The sum of two ages is 50 and difference of their ages is 10. Find the ages.', '30', '20');

/* ── speed / distance / time ── */
has('A car travels 150 km in 3 hours. Find its speed.', '50');
has('A train runs at 60 km/h. How long will it take to cover 180 km?', '3');
has('How far will a car go in 2.5 hours at a speed of 40 km/h?', '100');
has('A boy cycles 9000 metres in 30 minutes. What is his speed in km/hour?', '18');

/* ── work & time / pipes ── */
has('A can do a piece of work in 10 days and B in 15 days. How long will they take working together?', '6');
has('A and B together can finish a work in 6 days. A alone can do it in 10 days. How long will B alone take?', '15');
has('Pipe A fills a tank in 6 hours and pipe B empties it in 12 hours. If both are opened together, how long to fill the tank?', '12');

/* ── variation / unitary / ratio ── */
has('If 5 pens cost 25 rupees, what is the cost of 8 pens?', '40');
has('The cost of 15 chairs is 3000. Find the cost of 5 chairs.', '1000');
has('5 men can finish a work in 10 days. How many days will 25 men take?', '2');
has('Divide 500 in the ratio 2:3.', '200', '300');
has('Divide 1200 among three in the ratio 1:2:3.', '200', '400', '600');

/* ── percentages ── */
has('500 is increased by 20%. Find the new value.', '600');
has('In a class 60% are boys and the number of girls is 240. Find the total strength.', '600');
has('Rahul scored 450 marks out of 500. What is his percentage?', '90');

/* ── profit, loss, discount, GST ── */
has('An article is bought for 500 rupees and sold for 600 rupees. Find profit and profit percent.', '100', '20');
has('An article costing 800 is sold at a profit of 15%. Find the selling price.', '920');
has('An article is sold for 720 at a loss of 10%. Find the cost price.', '800');
has('The marked price is 1200 and a discount of 25% is given. Find the selling price.', '900', '300');
has('A bill of 2500 has GST of 18%. Find the total bill.', '450', '2950');
has('The total bill including 18% GST is 2950. Find the base amount and the tax.', '2500', '450');

/* ── SI & CI & population ── */
has('Find the simple interest on 5000 at 8% per annum for 3 years.', '1200', '6200');
has('Find the compound interest on 10000 at 10% per annum for 2 years compounded annually.', '2100', '12100');
has('Find the CI on 8000 at 10% per annum for 1 year compounded half-yearly.', '820');
has('The population of a town is 20000. It grows at 5% per year. What will it be after 2 years?', '22050');
has('A machine worth 40000 depreciates at 10% per annum. Find its value after 2 years.', '32400');

/* ── 2-D mensuration ── */
has('Find the area and perimeter of a rectangle whose length is 12 cm and breadth is 5 cm.', '60', '34');
has('The length of a rectangle is 8 m and its width is 3 m. What is its area?', '24');
has('The perimeter of a rectangle is 40 cm and its length is 12 cm. Find the breadth.', '8');
has('The perimeter of a rectangle is 50 and the length is 5 more than the breadth. Find the dimensions.', '15', '10');
has('Find the area of a square whose side is 9 cm.', '81');
has('The area of a square is 144. Find its side and perimeter.', '12', '48');
has('Find the area of a triangle with base 10 cm and height 6 cm.', '30');
has('Find the area of a trapezium whose parallel sides are 8 cm and 12 cm and height is 5 cm.', '50');
has('The diagonals of a rhombus are 10 cm and 16 cm. Find its area.', '80');
has('Find the area of a circle with radius 7 cm.', '154');
has('Find the circumference of a circle whose diameter is 14 cm.', '44');

/* ── Pythagoras & polygons ── */
has('The two legs of a right triangle are 6 and 8. Find the hypotenuse.', '10');
has('The hypotenuse of a right triangle is 13 and one side is 5. Find the other side.', '12');
has('A ladder 13 m long reaches a window 12 m above the ground. How far is the foot of the ladder from the wall?', '5');
has('Find the sum of interior angles of a hexagon.', '720');
has('Each exterior angle of a regular polygon is 40. How many sides does it have?', '9');
has('Find the number of diagonals in a decagon.', '35');

/* ── 3-D mensuration ── */
has('Find the volume and total surface area of a cube of side 5 cm.', '125', '150');
has('A cuboid has length 10 cm, breadth 8 cm and height 5 cm. Find its volume.', '400');
has('Find the volume of a cylinder with radius 7 cm and height 10 cm.', '1540');

/* ── perfect squares/cubes, roots ── */
has('What is the smallest number by which 392 must be multiplied to make it a perfect cube?', '7');
has('Find the smallest number by which 180 should be multiplied to get a perfect square.', '5');
has('Is 144 a perfect square?', 'YES');
has('Is 100 a perfect cube?', 'NO');
has('Find the square root of 576 by prime factorisation method.', '24');
has('Find the cube root of 1728 by prime factorisation.', '12');

/* ── averages & probability ── */
has('Find the average of first 20 natural numbers.', '10.5');
has('Find the average of first 10 even numbers.', '11');
has('A man travels at 40 km/h and returns at 60 km/h. Find the average speed.', '48');
has('A coin is tossed once. What is the probability of getting a head?', '1/2');
has('A die is rolled. What is the probability of getting a prime number?', '1/2');
has('A die is thrown once. Find the probability of getting a number greater than 4.', '1/3');
has('A bag has 5 red and 3 blue balls. What is the probability of drawing a red ball?', '5/8');

/* ── simultaneous equations ── */
has('2 pencils and 3 erasers cost 16 rupees. 4 pencils and 5 erasers cost 30 rupees. Find the price of each.', '5', '2');

/* ── Class 1–5 story sums ── */
has('Ram has 10 apples and he gave 3 apples to Shyam. How many apples are left?', '7');
has('Sita has 12 marbles. She got 8 more marbles. How many total marbles does she have now?', '20');
has('There are 5 boxes and each box has 12 pencils. How many pencils in total?', '60');
has('20 sweets are distributed equally among 4 children. How many does each get?', '5');

/* ── number words (Class 1–3 style) ── */
has('Rahul has twenty five mangoes and he gave five mangoes to his friend. How many mangoes are left?', '20');
has('The sum of two numbers is one hundred and their difference is twenty. Find the numbers.', '60', '40');

/* ── must NOT match (safety) ── */
none('hello how are you');
none('what is the capital of India');
none('tell me a joke');
none('what is profit in business studies');
none('define area of a rectangle');
none('who invented the computer');
none('2 + 2');
none('table of 7');

console.log('test-wordmath.js: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
