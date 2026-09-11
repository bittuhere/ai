#!/bin/bash
# assemble data3.js from parts9/*
cd "$(dirname "$0")"
sed "s|require('./data.js')|require('./data2.js')|" parts9/partA.js > data3.js
cat parts9/partB.js parts9/partC.js parts9/partD.js parts9/partE.js parts9/partF.js parts9/partG.js parts9/partH.js >> data3.js
printf '\n    if (typeof module !== "undefined" && module.exports) module.exports = BitData;\n    else root.BitData = BitData;\n})(typeof window !== "undefined" ? window : globalThis);\n' >> data3.js
node -e "const d=require('./data3.js'); let P=0; d.INTENTS.forEach(i=>P+=i.patterns.length); console.log('data3 OK — intents:', d.INTENTS.length, 'patterns:', P, 'quiz:', d.QUIZ.length);"
