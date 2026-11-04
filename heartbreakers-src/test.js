const fs = require('fs');
require('vm').runInThisContext(fs.readFileSync(__dirname + '/engine.js', 'utf8'));

// play one full hand with given seat levels, with passing (dir) and rule checks
function playHand(levels, dir) {
  const hands = dealHands();
  const known = [[], [], [], []];
  if (dir !== 3) {
    const off = [1, 3, 2][dir];
    const passes = levels.map((lv, p) => LEVELS[lv].pass(hands[p]));
    passes.forEach((ps, p) => { if (new Set(ps).size !== 3) throw new Error('bad pass ' + lv); });
    passes.forEach((ps, p) => ps.forEach(c => hands[p].splice(hands[p].indexOf(c), 1)));
    passes.forEach((ps, p) => { const q = (p + off) % 4; ps.forEach(c => { hands[q].push(c); known[p].push({ c, q }); }); });
  }
  hands.forEach(h => { if (h.length !== 13) throw new Error('hand size'); });
  const st = newHandState(hands);
  while (st.trickNo < 13) {
    const p = st.turn;
    const L = legalFor(st, p);
    const c = LEVELS[levels[p]].pick(st, p, known[p]);
    if (!L.includes(c)) throw new Error('illegal play by ' + levels[p]);
    doPlay(st, p, c);
  }
  const tot = st.pts.reduce((a, b) => a + b, 0);
  if (tot !== 26) throw new Error('points ' + tot);
  return settle(st.pts);
}

function match(levels, hands) {
  const sum = [0, 0, 0, 0];
  for (let i = 0; i < hands; i++) {
    // rotate seats so position doesn't bias
    const r = playHand(levels, i % 4);
    r.forEach((v, j) => (sum[j] += v));
  }
  return sum.map(s => (s / hands).toFixed(2));
}

const t0 = Date.now();
console.log('easy x4', match(['easy', 'easy', 'easy', 'easy'], 400));
console.log('medium vs 3 easy', match(['medium', 'easy', 'easy', 'easy'], 1000));
console.log('hard vs 3 medium', match(['hard', 'medium', 'medium', 'medium'], 1000));
console.log('hard vs 3 easy', match(['hard', 'easy', 'easy', 'easy'], 1000));
const t1 = Date.now();
console.log('genius vs 3 hard', match(['genius', 'hard', 'hard', 'hard'], 120));
const t2 = Date.now();
console.log('ms per genius hand', ((t2 - t1) / 120).toFixed(0), 'other', t1 - t0);
