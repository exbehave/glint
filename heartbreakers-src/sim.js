// Test runner for the girls: node sim.js [games] [seed]
// Duplicate games: each game's deals are fixed by the seed and replayed with the girls rotated through every seat,
// so nobody wins on luck of the deal. Reports wins, points per hand, queens eaten, moons, and how often each habit fired.
const fs = require('fs');
let seed = +(process.argv[3] || 1);
const rng = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = rng;
const vm = require('vm');
vm.runInThisContext(fs.readFileSync(__dirname + '/engine.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/girls.js', 'utf8') + '\nglobalThis.E={LEVELS,GIRLS,newTableMem,girlPass,girlPick,girlsAfterTrick,dealHands,newHandState,legalFor,doPlay,settle,QS,shuffle};');
const { LEVELS: LV, GIRLS: GL } = E;

// one seat: a girl's name, or {human: level} for a stand-in human
function playGame(seats, deals, target) {
  const T = { cards: seats.map(n => typeof n === 'string' ? GL[n] : null), levels: seats.map(n => typeof n === 'string' ? GL[n].level : n.human),
    humans: seats.map((n, i) => typeof n === 'string' ? -1 : i).filter(i => i >= 0), totals: [0, 0, 0, 0], mem: E.newTableMem(), last: [] };
  const stat = seats.map(() => ({ hands: 0, pts: 0, queens: 0, moons: 0, why: {} }));
  for (let h = 0; ; h++) {
    const hands = deals[h % deals.length].map(x => x.slice());
    T.dir = h % 4; T.hands = hands; T.known = [[], [], [], []];
    if (T.dir !== 3) {
      const off = [1, 3, 2][T.dir];
      const passes = [0, 1, 2, 3].map(p => E.girlPass(T, p, hands[p]));
      passes.forEach(ps => { if (new Set(ps).size !== 3) throw new Error('bad pass'); });
      passes.forEach((ps, p) => ps.forEach(c => hands[p].splice(hands[p].indexOf(c), 1)));
      passes.forEach((ps, p) => ps.forEach(c => { hands[(p + off) % 4].push(c); T.known[p].push({ c, q: (p + off) % 4 }); }));
    }
    const st = E.newHandState(hands);
    while (st.trickNo < 13) {
      const p = st.turn, L = E.legalFor(st, p);
      T.last[p] = null;
      const c = E.girlPick(T, p, st);
      if (!L.includes(c)) throw new Error('illegal play by ' + seats[p]);
      const w = T.last[p]; if (w) stat[p].why[w] = (stat[p].why[w] || 0) + 1;
      const res = E.doPlay(st, p, c);
      if (res) { if (res.trick.some(x => x.c === E.QS)) stat[res.w].queens++; E.girlsAfterTrick(T, res); }
    }
    if (st.pts.reduce((a, b) => a + b, 0) !== 26) throw new Error('points');
    const m = st.pts.indexOf(26);
    let fin = st.pts.slice();
    if (m >= 0) {
      stat[m].moons++;
      const up = [0, 1, 2, 3].map(i => T.totals[i] + (i === m ? 0 : 26)), low = Math.min(...up);
      fin = up[m] === low && up.filter(x => x === low).length === 1 ? fin.map((_, i) => (i === m ? 0 : 26)) : fin.map((_, i) => (i === m ? -26 : 0));
    }
    fin.forEach((v, i) => { T.totals[i] += v; stat[i].pts += v; stat[i].hands++; });
    if (Math.max(...T.totals) >= target) break;
  }
  const low = Math.min(...T.totals);
  const winners = [0, 1, 2, 3].filter(i => T.totals[i] === low);
  return { stat, winners, totals: T.totals };
}

function run(lineup, games, target) {
  const names = lineup.map(n => typeof n === 'string' ? n : 'You (' + n.human + ')');
  const agg = names.map(() => ({ games: 0, wins: 0, hands: 0, pts: 0, queens: 0, moons: 0, why: {} }));
  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const deals = Array.from({ length: 40 }, () => E.dealHands());
    for (let r = 0; r < 4; r++) { // rotate everyone through every seat on the same deals
      const seats = [0, 1, 2, 3].map(i => lineup[(i + r) % 4]);
      const idx = [0, 1, 2, 3].map(i => (i + r) % 4);
      const res = playGame(seats, deals, target);
      res.stat.forEach((s, seat) => {
        const a = agg[idx[seat]];
        a.games++; a.hands += s.hands; a.pts += s.pts; a.queens += s.queens; a.moons += s.moons;
        if (res.winners.includes(seat)) a.wins += 1 / res.winners.length;
        for (const k in s.why) a.why[k] = (a.why[k] || 0) + s.why[k];
      });
    }
  }
  console.log(`\n${names.join(' · ')} — ${games} deal sets × 4 seatings, to ${target} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  agg.forEach((a, i) => {
    const why = Object.entries(a.why).filter(([k]) => k !== 'base').map(([k, v]) => `${k} ${(v / a.hands).toFixed(2)}`).join(', ');
    console.log(`  ${names[i].padEnd(14)} win ${(100 * a.wins / a.games).toFixed(0).padStart(3)}%  pts/hand ${(a.pts / a.hands).toFixed(2).padStart(5)}  Q♠/hand ${(a.queens / a.hands).toFixed(2)}  moons ${a.moons}${why ? '  habits/hand: ' + why : ''}`);
  });
  return agg;
}

const games = +(process.argv[2] || 10);
run(['Natalie', 'Judi', 'Victor Twins', 'Amy'], games, 100);
run([{ human: 'hard' }, 'Natalie', 'Judi', 'Victor Twins'], games, 100);
run([{ human: 'hard' }, 'Judi', 'Victor Twins', 'Amy'], games, 100);
