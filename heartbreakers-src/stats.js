// ===== Player stats + leaderboards (Kennedy, Nov 7, 2026) =====
// Shared by the game (concatenated by build.py) and the hb-leaders edge function (copied in by make_leaders.py).
// Every number is worked out from the saved game records (hb_games.data), so nothing extra is stored and old games count.
// Seat 0 is always the human who played the game. Only finished games count.
// Cards: 0..51, suit = floor(c / 13) (0 clubs, 1 diamonds, 2 spades, 3 hearts), rank = c % 13 + 2; the Q♠ is 36.
const HB_QS = 36;
const hbSuit = c => Math.floor(c / 13);
function hbWinner(trick) {            // trick: [[seat, card], …] in play order → seat that takes it
  const led = hbSuit(trick[0][1]);
  let w = trick[0];
  for (const x of trick) if (hbSuit(x[1]) === led && x[1] > w[1]) w = x;
  return w[0];
}
const hbPts = c => (hbSuit(c) === 3 ? 1 : c === HB_QS ? 13 : 0);

// One finished game → the human's numbers for it (all counts; rates are worked out when games are added up).
function hbGameStats(d) {
  const s = { games: 1, wins: 0, p1: 0, p2: 0, p3: 0, p4: 0, final: 0, best: null, rounds: 0, pts: 0, clean: 0, worst: 0,
    tricks: 0, hearts: 0, breaks: 0, qsGot: 0, qsGave: 0, qsLed: 0, gambit: 0, qsSelf: 0, qsPassed: 0, qsPassedIn: 0,
    moons: 0, mooned: 0, trams: 0, playedAs: d.me || null };
  const tot = d.totals || [];
  if (tot.length === 4) {
    s.final = tot[0]; s.best = tot[0];
    const place = 1 + tot.filter((t, i) => i && t < tot[0]).length;   // ties share the better place
    s['p' + place] = 1;
    if (place === 1) s.wins = 1;
  }
  for (const h of d.hands || []) {
    if (!h.fin) continue;                                    // a round that never finished
    s.rounds++;
    const raw = h.raw || h.fin;
    s.pts += raw[0];
    s.worst = Math.max(s.worst, h.fin[0]);
    if (h.moon === 0) s.moons++;
    else if (h.moon > 0) s.mooned++;
    else if (raw[0] === 0) s.clean++;                        // took no points at all (a moon by someone else doesn't count)
    if (h.passes && h.passes.length === 4) {
      if ((h.passes[0] || []).includes(HB_QS)) s.qsPassed++;
      const from = [3, 1, 2, null][h.dir];                   // who passed to seat 0 (dir 0: seat 3, 1: seat 1, 2: across, 3: no pass)
      if (from != null && (h.passes[from] || []).includes(HB_QS)) s.qsPassedIn++;
    }
    if (h.tram) s.trams++;
    // replay the tricks
    const plays = (h.plays || []).map(x => [x[0], x[1]]);
    const firstHeart = plays.find(x => hbSuit(x[1]) === 3);   // whoever played the round's first heart broke them
    if (firstHeart && firstHeart[0] === 0) s.breaks++;
    for (let i = 0; i + 4 <= plays.length; i += 4) {
      const t = plays.slice(i, i + 4), w = hbWinner(t);
      for (const [p, c] of t) {
        if (c === HB_QS) {
          if (p === 0 && w === 0) s.qsSelf++;
          if (p === 0 && w !== 0) s.qsGave++;
          if (p === 0 && t[0][0] === 0) { s.qsLed++; if (w !== 0) s.gambit++; }
        }
      }
      if (w === 0) {
        s.tricks++;
        s.hearts += t.filter(x => hbSuit(x[1]) === 3).length;
        if (t.some(x => x[1] === HB_QS)) s.qsGot++;
      }
    }
    // TRAM: every card still out went to the human
    if (h.tram) {
      const left = [...(h.tram.table || []).map(x => x[1]), ...(h.tram.hands || []).flat()];
      s.hearts += left.filter(c => hbSuit(c) === 3).length;
      if (left.includes(HB_QS)) s.qsGot++;
      s.tricks += 13 - (h.tram.trick || 0);
    }
  }
  return s;
}

// Add up a player's games (and count which girl they played as).
function hbAddUp(list) {
  const a = { picks: {} };
  for (const g of list) {
    for (const k in g) {
      if (k === 'playedAs') { if (g[k]) a.picks[g[k]] = (a.picks[g[k]] || 0) + 1; continue; }
      if (k === 'best') { if (g.best != null) a.best = a.best == null ? g.best : Math.min(a.best, g.best); continue; }
      if (k === 'worst') { a.worst = Math.max(a.worst || 0, g.worst); continue; }
      a[k] = (a[k] || 0) + g[k];
    }
  }
  const fav = Object.entries(a.picks).sort((x, y) => y[1] - x[1])[0];
  a.fav = fav ? fav[0] : null;
  return a;
}

// The boards. dir: 'high' = most is first by default, 'low' = least is first. fmt: 'pct' | 'avg' | 'n'.
const hbPct = (n, d) => (d ? (100 * n) / d : null);
const hbPer = (n, d) => (d ? n / d : null);
const HB_BOARDS = [
  { key: 'winRate', group: 'Results', label: 'Win rate', dir: 'high', fmt: 'pct', v: a => hbPct(a.wins, a.games) },
  { key: 'wins', group: 'Results', label: 'Wins', dir: 'high', fmt: 'n', v: a => a.wins },
  { key: 'games', group: 'Results', label: 'Games played', dir: 'high', fmt: 'n', v: a => a.games },
  { key: 'unfinished', group: 'Results', label: 'Games left unfinished', dir: 'high', fmt: 'n', v: a => a.unfinished || 0 },
  { key: 'quitRate', group: 'Results', label: 'Quit rate (games left unfinished)', dir: 'high', fmt: 'pct', v: a => hbPct(a.unfinished || 0, (a.games || 0) + (a.unfinished || 0)) },
  { key: 'p2', group: 'Results', label: 'Came in 2nd', dir: 'high', fmt: 'pct', v: a => hbPct(a.p2, a.games) },
  { key: 'p3', group: 'Results', label: 'Came in 3rd', dir: 'high', fmt: 'pct', v: a => hbPct(a.p3, a.games) },
  { key: 'p4', group: 'Results', label: 'Came in last', dir: 'high', fmt: 'pct', v: a => hbPct(a.p4, a.games) },
  { key: 'avgFinal', group: 'Points', label: 'Points per game', dir: 'low', fmt: 'avg', v: a => hbPer(a.final, a.games) },
  { key: 'avgRound', group: 'Points', label: 'Points per round', dir: 'low', fmt: 'avg', v: a => hbPer(a.pts, a.rounds) },
  { key: 'best', group: 'Points', label: 'Best game (lowest final score)', dir: 'low', fmt: 'n', v: a => a.best },
  { key: 'worst', group: 'Points', label: 'Worst round', dir: 'high', fmt: 'n', v: a => a.worst },
  { key: 'clean', group: 'Points', label: 'Zero-point rounds', dir: 'high', fmt: 'n', v: a => a.clean },
  { key: 'cleanRate', group: 'Points', label: 'Zero-point rounds (share of rounds)', dir: 'high', fmt: 'pct', v: a => hbPct(a.clean, a.rounds) },
  { key: 'qsGave', group: 'Queen of Spades', label: 'Gave someone the queen', dir: 'high', fmt: 'n', v: a => a.qsGave },
  { key: 'qsGot', group: 'Queen of Spades', label: 'Got stuck with the queen', dir: 'high', fmt: 'n', v: a => a.qsGot },
  { key: 'qsGotRate', group: 'Queen of Spades', label: 'Got stuck with the queen (share of rounds)', dir: 'high', fmt: 'pct', v: a => hbPct(a.qsGot, a.rounds) },
  { key: 'gambit', group: 'Queen of Spades', label: 'Queen’s Gambits (led her, someone else took her)', dir: 'high', fmt: 'n', v: a => a.gambit },
  { key: 'qsSelf', group: 'Queen of Spades', label: 'Ate their own queen', dir: 'high', fmt: 'n', v: a => a.qsSelf },
  { key: 'qsPassed', group: 'Queen of Spades', label: 'Passed the queen away', dir: 'high', fmt: 'n', v: a => a.qsPassed },
  { key: 'qsPassedIn', group: 'Queen of Spades', label: 'Got passed the queen', dir: 'high', fmt: 'n', v: a => a.qsPassedIn },
  { key: 'breaks', group: 'Hearts', label: 'Broke hearts', dir: 'high', fmt: 'n', v: a => a.breaks },
  { key: 'breakRate', group: 'Hearts', label: 'Broke hearts (share of rounds)', dir: 'high', fmt: 'pct', v: a => hbPct(a.breaks, a.rounds) },
  { key: 'hearts', group: 'Hearts', label: 'Hearts taken per round', dir: 'low', fmt: 'avg', v: a => hbPer(a.hearts, a.rounds) },
  { key: 'moons', group: 'Big moments', label: 'Shot the moon', dir: 'high', fmt: 'n', v: a => a.moons },
  { key: 'mooned', group: 'Big moments', label: 'Got mooned', dir: 'high', fmt: 'n', v: a => a.mooned },
  { key: 'trams', group: 'Big moments', label: 'TRAMs', dir: 'high', fmt: 'n', v: a => a.trams },
  { key: 'rounds', group: 'Big moments', label: 'Rounds played', dir: 'high', fmt: 'n', v: a => a.rounds },
];
function hbFmt(b, v) {
  if (v == null) return '–';
  if (b.fmt === 'pct') return Math.round(v) + '%';
  if (b.fmt === 'avg') return (Math.round(v * 10) / 10).toFixed(1);
  return String(v);
}
// rows: [{ id, name, sum }] → [{ row, v, rank }] sorted; ties share a rank; players with no value go last
function hbRank(rows, b, dir) {
  const hi = (dir || b.dir) === 'high';
  const out = rows.map(r => ({ row: r, v: b.v(r.sum) })).filter(x => x.v != null);
  out.sort((x, y) => (hi ? y.v - x.v : x.v - y.v));
  out.forEach((x, i) => { x.rank = i && Math.abs(out[i - 1].v - x.v) < 1e-9 ? out[i - 1].rank : i + 1; });
  return out;
}
if (typeof module !== 'undefined') module.exports = { hbGameStats, hbAddUp, HB_BOARDS, hbRank, hbFmt };
// ===== end stats =====
