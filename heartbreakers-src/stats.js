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

// One finished game → one seat's numbers for it (all counts; rates are worked out when games are added up).
// Seat 0 is the human; seats 1–3 are the girls (d.names[seat]).
function hbGameStats(d, seat) {
  const me = seat || 0;
  const s = { games: 1, wins: 0, p1: 0, p2: 0, p3: 0, p4: 0, final: 0, best: null, rounds: 0, pts: 0, clean: 0, worst: 0,
    tricks: 0, hearts: 0, breaks: 0, qsGot: 0, qsGave: 0, qsLed: 0, gambit: 0, qsSelf: 0, qsPassed: 0, qsPassedIn: 0,
    moons: 0, mooned: 0, moonPassable: 0, moonFed: 0, trams: 0, playedAs: me ? ((d.names || [])[me] || null) : (d.me || null) };
  const tot = d.totals || [];
  if (tot.length === 4) {
    s.final = tot[me]; s.best = tot[me];
    const place = 1 + tot.filter((t, i) => i !== me && t < tot[me]).length;   // ties share the better place
    s['p' + place] = 1;
    if (place === 1) s.wins = 1;
  }
  for (const h of d.hands || []) {
    if (!h.fin) continue;                                    // a round that never finished
    s.rounds++;
    const raw = h.raw || h.fin;
    s.pts += raw[me];
    s.worst = Math.max(s.worst, h.fin[me]);
    if (h.moon === me) s.moons++;
    else if (typeof h.moon === 'number' && h.moon >= 0) s.mooned++;
    else if (raw[me] === 0) s.clean++;                       // took no points at all (a moon by someone else doesn't count)
    if (h.passes && h.passes.length === 4 && h.dir !== 3) {
      if ((h.passes[me] || []).includes(HB_QS)) s.qsPassed++;
      const off = [1, 3, 2][h.dir], from = (me - off + 4) % 4;   // who passed to this seat
      if ((h.passes[from] || []).includes(HB_QS)) s.qsPassedIn++;
    }
    // Moon pass rate (Kennedy, Nov 8): of the moons shot by someone else in a passing round, how often the shooter
    // was the player you passed your three cards to.
    if (typeof h.moon === 'number' && h.moon >= 0 && h.moon !== me && h.dir !== 3 && h.dir != null) {
      s.moonPassable++;
      if ((me + [1, 3, 2][h.dir]) % 4 === h.moon) s.moonFed++;
    }
    if (h.tram && me === 0) s.trams++;
    // replay the tricks
    const plays = (h.plays || []).map(x => [x[0], x[1]]);
    const firstHeart = plays.find(x => hbSuit(x[1]) === 3);   // whoever played the round's first heart broke them
    if (firstHeart && firstHeart[0] === me) s.breaks++;
    for (let i = 0; i + 4 <= plays.length; i += 4) {
      const t = plays.slice(i, i + 4), w = hbWinner(t);
      for (const [p, c] of t) {
        if (c === HB_QS && p === me) {
          if (w === me) s.qsSelf++; else s.qsGave++;
          if (t[0][0] === me) { s.qsLed++; if (w !== me) s.gambit++; }
        }
      }
      if (w === me) {
        s.tricks++;
        s.hearts += t.filter(x => hbSuit(x[1]) === 3).length;
        if (t.some(x => x[1] === HB_QS)) s.qsGot++;
      }
    }
    // TRAM: every card still out went to the human
    if (h.tram && me === 0) {
      const left = [...(h.tram.table || []).map(x => x[1]), ...(h.tram.hands || []).flat()];
      s.hearts += left.filter(c => hbSuit(c) === 3).length;
      if (left.includes(HB_QS)) s.qsGot++;
      s.tricks += 13 - (h.tram.trick || 0);
    }
  }
  return s;
}

// Rating (Kennedy, Nov 8, 2026): Elo-style, only the winner gains. Everyone starts at 1000.
// Each loser loses K × (her expected score against the winner), so a favorite who loses gives up more and an
// underdog less; 2nd, 3rd and 4th place don't matter. The winner gains exactly what the losers lose (a tie for
// first splits it). games: [{ keys: [k0..k3], totals, quit? }] in the order they were played.
const HB_K = 32, HB_START = 1000;
// Provisional (Kennedy, Nov 8): fewer than 5 rated games (quits count) = no rating shown yet; they sit at the bottom.
// Their hidden rating still feeds everyone else's changes.
const HB_MIN_GAMES = 5;
function hbRate(games) {
  const R = {};
  const get = k => R[k] || (R[k] = { rating: HB_START, peak: HB_START, last: 0, rated: 0 });
  for (const g of games) {
    const tot = g.totals || [];
    if (tot.length !== 4 || !g.keys) continue;
    let lo = Math.min(...tot), win = [0, 1, 2, 3].filter(i => tot[i] === lo), lose = [0, 1, 2, 3].filter(i => tot[i] !== lo);
    // Kennedy, Nov 8: quitting is a loss. Only the human (seat 0) loses; the girl(s) lowest at the moment of quitting
    // win (all three share it if no round had finished). The other girls are unchanged.
    if (g.quit) { lo = Math.min(tot[1], tot[2], tot[3]); win = [1, 2, 3].filter(i => tot[i] === lo); lose = [0]; }
    if (!lose.length) continue;
    const before = g.keys.map(k => get(k).rating), delta = [0, 0, 0, 0];
    for (const l of lose) {
      let loss = 0;
      for (const w of win) loss += HB_K * (1 / (1 + Math.pow(10, (before[w] - before[l]) / 400))) / win.length;
      delta[l] -= loss;
      for (const w of win) delta[w] += loss / win.length;
    }
    g.keys.forEach((k, i) => { const r = get(k); r.rating += delta[i]; r.last = delta[i]; r.rated++; r.peak = Math.max(r.peak, r.rating); if (g.at) r.lastAt = Math.max(r.lastAt || 0, g.at); });
  }
  for (const k in R) { R[k].rating = Math.round(R[k].rating); R[k].peak = Math.round(R[k].peak); R[k].last = Math.round(R[k].last * 10) / 10; }
  return R;
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
  { key: 'rating', group: 'Rating', label: 'Rating', dir: 'high', fmt: 'n', v: a => a.rating },
  { key: 'peak', group: 'Rating', label: 'Peak rating', dir: 'high', fmt: 'n', v: a => a.peak },
  { key: 'last', group: 'Rating', label: 'Rating change, last game', dir: 'high', fmt: 'n', v: a => a.last },
  { key: 'winRate', group: 'Results', label: 'Win rate', dir: 'high', fmt: 'pct', v: a => hbPct(a.wins, a.games) },
  { key: 'wins', group: 'Results', label: 'Wins', dir: 'high', fmt: 'n', v: a => a.wins },
  { key: 'games', group: 'Results', label: 'Games played', dir: 'high', fmt: 'n', v: a => a.games },
  { key: 'unfinished', group: 'Results', label: 'Games left unfinished', dir: 'high', fmt: 'n', v: a => a.unfinished || 0 },
  { key: 'quitRate', group: 'Results', label: 'Quit rate (games left unfinished)', dir: 'high', fmt: 'pct', v: a => hbPct(a.unfinished || 0, a.games || 0) },
  { key: 'p2', group: 'Results', label: 'Came in 2nd', dir: 'high', fmt: 'pct', v: a => hbPct(a.p2, a.finished ?? a.games) },
  { key: 'p3', group: 'Results', label: 'Came in 3rd', dir: 'high', fmt: 'pct', v: a => hbPct(a.p3, a.finished ?? a.games) },
  { key: 'p4', group: 'Results', label: 'Came in last', dir: 'high', fmt: 'pct', v: a => hbPct(a.p4, a.finished ?? a.games) },
  { key: 'avgFinal', group: 'Points', label: 'Points per game', dir: 'low', fmt: 'avg', v: a => hbPer(a.final, a.finished ?? a.games) },
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
  { key: 'moonPass', group: 'Big moments', label: 'Moon pass rate (moons shot by the player you passed to)', dir: 'high', fmt: 'pct', v: a => hbPct(a.moonFed || 0, a.moonPassable || 0) },
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
if (typeof module !== 'undefined') module.exports = { hbGameStats, hbAddUp, hbRate, HB_MIN_GAMES, HB_BOARDS, hbRank, hbFmt };
// ===== end stats =====
