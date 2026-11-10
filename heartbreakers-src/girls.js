// ===== The girls: each one's stats card drives her play (see BAD_GIRLS.md) =====
// A card: her level (the base brain her habits sit on), Judgment (how many extra points she'll pay to follow a habit),
// her dials (0–1 = 0–100%, rolled fresh on every decision), and Natalie's special powers.
// Girls without a card yet play their table level, as before.
const GIRLS = {
  'Natalie': { level: 'genius', judgment: 1, goal: 'ruin-you', rate: 3, psychic: 'all', intuit: true, dials: {} },
  // Dalila (S12, Genius just below Natalie): "you first, then me" — the cards that hurt the human most, and only among
  // those does she protect herself. For now she uses Natalie's look-ahead, which sees every hand (BAD_GIRLS.md plans
  // the humans' hands only).
  'Dalila': { level: 'genius', judgment: 1, goal: 'you-first', psychic: 'all', dials: {} },
  // Shan-Rock (S10, Genius on your side, Kennedy Nov 9): sees every hand and knows how everyone plays, like Natalie,
  // but turns it on the other computer players. Each card is weighed as: points the other girls eat, minus
  // `rate` × her own points, minus `spare` × the humans' points. When she shoots the moon she takes −26, never +26 to you.
  'Shan-Rock': { level: 'genius', judgment: 1, goal: 'help-you', rate: 1, spare: 1.5, psychic: 'all', intuit: true, dials: {} },
  // Kristen (S5, Medium, Kennedy's pick Nov 8): plain Medium play until her habits are written up in BAD_GIRLS.md
  'Kristen': { level: 'medium', judgment: 0.4, dials: {} },
  // Clermont Twins (S14, Hard, Kennedy Nov 8): a tendency to break hearts early
  'Clermont Twins': { level: 'hard', judgment: 0.7, signature: 'breakEarly', dials: { breakEarly: 0.7 } },
  'Judi': { level: 'hard', judgment: 0.7, signature: 'keepQueen', dials: { breakEarly: 0.05, ducking: 0.7, keepQueen: 0.6, covers: 0.7, memory: 0.7 } },
  'Victor Twins': { level: 'medium', judgment: 0.4, signature: 'grudge', dials: { grudge: 0.8, leader: 0.4, hotPotato: 0.4 } },
  'Amy': { level: 'easy', judgment: 0.1, signature: 'hotPotato', dials: { hotPotato: 0.85, spadePanic: 0.7, breakEarly: 0.6, hothead: 0.7 } }
};

// The table a girl sits at: T = { cards: [card or null ×4] (null = a human or a plain level), levels: [...], humans: [seats],
//   totals: game totals, known: passed cards each seat knows about, mem: per-seat memory for the game }
function newTableMem() { return [0, 1, 2, 3].map(() => ({ grudge: -1, hot: 0 })); }

// How many extra points a habit may cost before Judgment overrules it: 100% → none, 0% → any.
const tolerance = J => (J >= 1 ? 0 : J <= 0 ? Infinity : 3 * (1 - J) / J);
const roll = v => Math.random() < (v || 0);

// ---------- passing ----------
// PASS_WHY (Theater's thinking panel): after girlPass returns, the reason for that pass —
// { cards: [[card, code]…], level } plus keptQ (the queen she held on to) / panic (spade panic), or { psychic… }.
// Read it straight after the call: a psychic girl's pass imagines everyone else's, which overwrites it on the way.
let PASS_WHY = null;
const passCodes = (pick, why) => new Map(pick.map(c => [c, Array.isArray(why) ? (why.find(x => x[0] === c) || [0, 'high'])[1] : why]));
function girlPass(T, p, hand) {
  const card = T.cards[p];
  if (!card) { const pk = LEVELS[T.levels[p]].pass(hand); PASS_WHY = { level: T.levels[p], cards: [...passCodes(pk, BRAIN_WHY)] }; return pk; }
  if (card.psychic === 'all') return passPsychic(T, p, hand);
  const d = card.dials;
  let pick = LEVELS[card.level].pass(hand).slice();
  const codes = passCodes(pick, BRAIN_WHY), extra = {};
  const swapIn = c => { // put c in the pass, pushing out the least dangerous card already there
    if (pick.includes(c) || !hand.includes(c)) return;
    const danger = x => (x === QS ? 60 : suit(x) === 2 && rank(x) > 12 ? 45 : suit(x) === 3 ? rank(x) + 4 : rank(x));
    pick.sort((a, b) => danger(a) - danger(b));
    pick[0] = c;
    codes.set(c, 'panic');
  };
  // Keeps the queen: she holds on to it (Judgment: only when she has at least two other spades to hide it behind)
  if (pick.includes(QS) && roll(d.keepQueen)) {
    const cover = hand.filter(c => suit(c) === 2 && c !== QS).length;
    if (card.judgment < 0.5 || cover >= 2) {
      const rest = desc(hand.filter(c => c !== QS && !pick.includes(c)));
      pick[pick.indexOf(QS)] = rest[0];
      codes.set(rest[0], 'keptQueen'); extra.keptQ = QS;
    }
  }
  // Spade panic: the big spades (and the queen) go, however safe she is
  if (roll(d.spadePanic)) { extra.panic = 1; [QS, cardId(2, 14), cardId(2, 13)].forEach(swapIn); }
  PASS_WHY = { level: card.level, cards: pick.map(c => [c, codes.get(c) || 'high']), ...extra };
  return pick;
}

// ---------- playing ----------
function girlPick(T, p, st) {
  const card = T.cards[p];
  if (!card) { const c = LEVELS[T.levels[p]].pick(st, p, T.known[p]); if (T.base) T.base[p] = BRAIN_WHY; return c; }
  if (card.psychic === 'all') return pickPsychic(T, p, st);
  return habitPick(T, p, st, true);
}

// what her base brain plays (with her memory dials applied when she's Hard)
function basePick(T, p, st, card) {
  const d = card.dials;
  if (card.level === 'hard') {
    let seen = null;
    if (d.memory != null && !roll(d.memory)) { // she forgets some of the cards already played
      seen = st.played.slice();
      for (let c = 0; c < 52; c++) if (seen[c] && Math.random() < 0.3) seen[c] = 0;
      for (const x of st.trick) seen[x.c] = 1;
    }
    return pickHard(st, p, T.known[p], { seen, live: roll(d.covers) });
  }
  return LEVELS[card.level].pick(st, p, T.known[p]);
}

// The priority list (BAD_GIRLS.md): mood → the queen → who gets the points → how she plays the trick → Judgment's veto.
// veto = false skips the cost check (used when Natalie imagines how the others will play).
function habitPick(T, p, st, veto) {
  const card = T.cards[p], d = card.dials, mem = T.mem[p];
  const L = legalFor(st, p);
  if (L.length === 1) { if (veto && T.base) T.base[p] = 'only'; return L[0]; }
  const base = basePick(T, p, st, card);
  if (veto && T.base) T.base[p] = BRAIN_WHY;   // what her base brain wanted, and why (read before the veto's playouts overwrite it)
  const t = st.trick, void_ = t.length && !L.some(c => suit(c) === suit(t[0].c));
  const winner = t.length ? winnerOf(t) : null;
  const losesTo = c => winner && (suit(c) !== suit(t[0].c) || rank(c) < rank(winner.c));
  const hearts = desc(L.filter(c => suit(c) === 3));
  let habit = null, why = '';

  // 6. The queen. Hot potato: dump it the first time it can't win the trick.
  if (L.includes(QS) && losesTo(QS) && roll(d.hotPotato)) { habit = QS; why = 'hotPotato'; }

  // 7. Who gets the points: a target she wants the queen and hearts to land on.
  if (habit == null && void_) {
    let target = -1;
    if (mem.grudge >= 0 && roll(d.grudge)) { target = mem.grudge; why = 'grudge'; }
    else if (roll(d.leader)) {
      const others = [0, 1, 2, 3].filter(q => q !== p);
      const low = Math.min(...others.map(q => T.totals[q]));
      if (others.some(q => T.totals[q] !== low)) { target = others.find(q => T.totals[q] === low); why = 'leader'; }
    }
    if (veto && T.base) T.base['t' + p] = target;   // the thinking panel names who the points were aimed at
    if (target >= 0) {
      if (winner.p === target) habit = L.includes(QS) ? QS : hearts[0] ?? null; // she's winning it: load it up
      else if (L.includes(QS)) { // save the queen for her target
        const other = desc(L.filter(c => c !== QS && !pts(c)));
        habit = other[0] ?? null;
      }
      if (habit == null) why = '';
    }
  }

  // 8. How she plays the trick. Breaks hearts early: the first heart, at the first chance (low ones from a lead).
  if (habit == null && !st.broken && d.breakEarly != null && hearts.length) {
    const nonHearts = L.filter(c => suit(c) !== 3);
    if (roll(d.breakEarly)) { habit = t.length ? hearts[0] : hearts[hearts.length - 1]; why = 'breakEarly'; }
    else if (suit(base) === 3 && nonHearts.length) { habit = (t.length ? desc : asc)(nonHearts)[0]; why = 'holdsHearts'; }
  }
  // Ducking: when she can slip under the winning card, she does
  if (habit == null && t.length && !void_ && roll(d.ducking)) {
    const under = desc(L.filter(c => rank(c) < rank(winner.c) && c !== QS));
    if (under.length) { habit = under[0]; why = 'ducking'; }
  }
  // 2. Mood. Hothead: after a trick of 5+ points, three tricks of slamming her highest card
  if (habit == null && mem.hot > 0) { habit = desc(L)[0]; why = 'hothead'; }

  if (habit == null || habit === base) { T.last && (T.last[p] = why || 'base'); return base; }
  // 9. Judgment's veto: if the habit costs her more than her Judgment allows, she plays her best card instead
  const tol = tolerance(card.judgment);
  if (veto && tol < 26) {
    const cost = evalCards(st, p, T.known[p], [habit, base], 24);
    if (cost && cost.get(habit) - cost.get(base) > tol) { T.last && (T.last[p] = 'veto:' + why); return base; }
  }
  T.last && (T.last[p] = why);
  return habit;
}

// After each trick: grudges and tempers.
function girlsAfterTrick(T, res) {
  const pts_ = res.trick.reduce((a, x) => a + pts(x.c), 0);
  for (let s = 0; s < 4; s++) {
    const card = T.cards[s], mem = T.mem[s];
    if (!card) continue;
    if (mem.hot > 0) mem.hot--;
    if (res.w !== s) continue;
    if (pts_ >= 5 && roll(card.dials.hothead)) mem.hot = 3;
    // Holds a grudge: whoever gave her the queen, or the most hearts she's eaten in one trick
    if (card.dials.grudge) {
      const q = res.trick.find(x => x.c === QS && x.p !== s);
      const hs = res.trick.filter(x => suit(x.c) === 3).length;
      if (q) mem.grudge = q.p;
      else if (hs >= 2 && hs > (mem.pile || 0)) {
        const dumpers = res.trick.filter(x => x.p !== s && suit(x.c) === 3);
        const off = dumpers.filter(x => suit(x.c) !== suit(res.trick[0].c));
        const g = (off.length ? off : dumpers).pop();
        if (g) { mem.grudge = g.p; mem.pile = hs; }
      }
    }
  }
}

// ---------- Natalie: Psychic (sees every hand) + Intuit (knows how everyone plays) ----------
// She doesn't guess: she plays each card out against the real hands, with every other girl playing by her own card
// (humans are imagined as Hard), and picks by her goal: her own points first; among cards within half a point of her
// best, the one that gives the humans the most.
const natalieModel = (T, q) => (s, x) => {
  if (T.cards[x] && T.cards[x].psychic !== 'all') return habitPick(T, x, s, false);
  return pickHard(s, x, T.known[x]);
};
// Her own future turns know the Queen's Gambit (Kennedy, Nov 7): when she's on lead with the Q♠ and someone holds
// nothing but the A♠/K♠ in spades, she leads it. Without this her replays never saw that winning a spade trick
// and then leading the queen forces it onto you, so she ate it herself instead (J♠ + Q♠ vs your 6♠ A♠ K♠).
function selfPick(T, s, p) {
  if (!s.trick.length && s.hands[p].includes(QS) && qsLeadSafe(s, p)) return QS;
  return pickHard(s, p, T.known[p]);
}
function playOut(T, s, p) {
  while (s.trickNo < 13) { const q = s.turn; doPlay(s, q, q === p ? selfPick(T, s, p) : natalieModel(T, q)(s, q)); }
  return s.pts.slice();   // raw points; valueOf() works out what a moon really costs
}
// What a moon actually does: the shooter takes "everyone else +26" only when that leaves her strictly lowest
// (same rule the game's computer players use, and a sensible human); otherwise she takes 26 off her own score.
function moonFinal(T, P) {
  const m = P.indexOf(26);
  if (m < 0) return P.slice();
  if ((T.cards[m] || {}).goal === 'help-you') return P.map((_, i) => (i === m ? -26 : 0));   // Shan-Rock never moons the humans
  const tot = T.totals || [0, 0, 0, 0];
  const after = tot.map((t, i) => t + (i === m ? 0 : 26)), low = Math.min(...after);
  const up = after[m] === low && after.filter(t => t === low).length === 1;
  return P.map((_, i) => (up ? (i === m ? 0 : 26) : (i === m ? -26 : 0)));
}
// Natalie's goal (Kennedy, Nov 5): ruin the human, within a budget. One of her own points is worth `rate` of yours,
// so at 3 she'll eat a heart or two to stick you with the queen, but never take the queen to do it.
// Another girl's moon only half-registers (Kennedy: no "Captain Save-A-Ho"): she stops it when it's cheap or when
// stopping it lands points on you, and lets it ride when someone else will stop it (her playouts already show that).
const OTHER_MOON = 0.4;
function valueOf(T, p, raw) {
  const hum = T.humans.filter(h => h !== p), f = moonFinal(T, raw), m = raw.indexOf(26);
  let own = f[p];
  if (m >= 0 && m !== p && !T.humans.includes(m)) own *= OTHER_MOON;
  const cpu = [0, 1, 2, 3].filter(q => q !== p && !T.humans.includes(q));
  return { own, hum: hum.reduce((a, h) => a + f[h], 0), cpu: cpu.reduce((a, q) => a + f[q], 0) };
}
// How much of herself she'll spend: her card's rate, but when she's close to losing the game she plays it safe
// (needs 10 of your points for each of hers) — near the end and less than a queen's worth ahead of the next-lowest.
function rateFor(T, p) {
  const card = T.cards[p] || {}, base = card.rate || 3;
  const tot = T.totals || [0, 0, 0, 0], target = T.target || 100;
  const others = Math.min(...tot.filter((_, i) => i !== p));
  const nearEnd = Math.max(...tot) >= target - 26;
  return nearEnd && others - tot[p] < 13 ? Math.max(base, 10) : base;
}
const randomish = (T, p) => [0, 1, 2, 3].some(q => q !== p && T.cards[q] && T.cards[q].psychic !== 'all');
function chooseByGoal(T, p, scores) { // scores: [{x, own, hum}] averaged
  if ((T.cards[p] || {}).goal === 'ruin-you') {
    const k = rateFor(T, p);
    return scores.slice().sort((a, b) => (b.hum - k * b.own) - (a.hum - k * a.own) || a.own - b.own)[0].x;
  }
  if ((T.cards[p] || {}).goal === 'help-you') {
    const c = T.cards[p], k = c.rate;   // no end-of-game boost: that's for girls playing to win (Kennedy, Nov 9: she was winning 58–73%)
    const sp = T.helpSpare != null ? T.helpSpare : c.spare;   // Kennedy, Nov 9: more help for lower-rated players (set by the game from your rating)
    return scores.slice().sort((a, b) => (b.cpu - k * b.own - sp * b.hum) - (a.cpu - k * a.own - sp * a.hum) || a.hum - b.hum)[0].x;
  }
  if ((T.cards[p] || {}).goal === 'you-first') {
    const most = Math.max(...scores.map(o => o.hum));
    const top = scores.filter(o => o.hum >= most - 0.5);
    return top.sort((a, b) => a.own - b.own || b.hum - a.hum)[0].x;
  }
  const best = Math.min(...scores.map(o => o.own));
  const near = scores.filter(o => o.own <= best + 0.5);
  near.sort((a, b) => b.hum - a.hum || a.own - b.own);
  return near[0].x;
}
// Leading the Q♠ is only allowed when it can't come back to her: someone after her in the trick holds nothing but
// the A♠/K♠ in spades, so they're forced to win it. Otherwise it's a gamble on someone else's choice (Kennedy, Nov 5:
// Natalie led it at trick 2, nobody covered, and she ate it).
function qsLeadSafe(st, p) {
  return [1, 2, 3].some(i => {
    const sp = st.hands[(p + i) % 4].filter(c => suit(c) === 2);
    return sp.length && sp.every(c => rank(c) > 12);
  });
}
function pickPsychic(T, p, st) {
  let L = legalFor(st, p);
  if (!st.trick.length && L.includes(QS) && L.length > 1 && !qsLeadSafe(st, p)) L = L.filter(c => c !== QS);
  if (L.length === 1) return L[0];
  const R = randomish(T, p) ? Math.max(8, Math.floor(160 / L.length)) : 1;
  const hum = T.humans.filter(h => h !== p);
  const scores = L.map(c => {
    let own = 0, hu = 0, cp = 0;
    for (let r = 0; r < R; r++) {
      const s = cloneSt(st);
      doPlay(s, p, c);
      const v = valueOf(T, p, playOut(T, s, p));
      own += v.own; hu += v.hum; cp += v.cpu;
    }
    // Never eat the queen early when holding on costs the same (Kennedy, Nov 5): playing it now onto a spade trick
    // she'd win counts as a point worse, so she keeps her other spades and leaves the others time to slip up.
    const winsNow = c === QS && st.trick.length && suit(st.trick[0].c) === 2 && !st.trick.some(x => suit(x.c) === 2 && rank(x.c) > 12);
    return { x: c, own: own / R + (winsNow && L.some(x => suit(x) === 2 && x !== QS) ? 1.5 : 0), hum: hu / R, cpu: cp / R };
  });
  // Game review (Kennedy, Nov 7): keep every option she weighed — card, her expected points, the humans' expected points.
  // Theater (no humans, Nov 9): a 4th number, the other girls' expected points (valueOf's cpu).
  if (T.why) T.why[p] = { psychic: 1, rate: rateFor(T, p), runs: R, opts: scores.map(o => [o.x, +o.own.toFixed(2), +o.hum.toFixed(2), +o.cpu.toFixed(2)]) };
  return chooseByGoal(T, p, scores);
}
// Passing: she sees every hand, so she tries a handful of passes and plays each one out (with everyone else's pass predicted
// from their own card). Covering, moon passes and keeping the queen all fall out of that: she does whichever works best.
function passPsychic(T, p, hand) {
  const H = T.hands, off = [1, 3, 2][T.dir];
  const danger = x => (x === QS ? 60 : suit(x) === 2 && rank(x) > 12 ? 45 : suit(x) === 3 ? rank(x) + 4 : rank(x));
  const top = hand.slice().sort((a, b) => danger(b) - danger(a)).slice(0, 7);
  const cands = [passHard(hand)];
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) for (let k = j + 1; k < top.length; k++) cands.push([top[i], top[j], top[k]]);
  const R = 6, hum = T.humans.filter(h => h !== p);
  const scores = cands.map(pick => {
    let own = 0, hu = 0, cp = 0;
    for (let r = 0; r < R; r++) {
      const hands = H.map(h => h.slice());
      const known = [[], [], [], []];
      const passes = [0, 1, 2, 3].map(q => q === p ? pick : T.cards[q] && T.cards[q].psychic !== 'all' ? girlPass(T, q, hands[q]) : passHard(hands[q]));
      passes.forEach((ps, q) => ps.forEach(c => hands[q].splice(hands[q].indexOf(c), 1)));
      passes.forEach((ps, q) => ps.forEach(c => { hands[(q + off) % 4].push(c); known[q].push({ c, q: (q + off) % 4 }); }));
      const s = newHandState(hands);
      const v = valueOf(T, p, playOut({ ...T, known }, s, p));
      own += v.own; hu += v.hum; cp += v.cpu;
    }
    return { x: pick, own: own / R, hum: hu / R, cpu: cp / R };
  });
  const chosen = chooseByGoal(T, p, scores);
  const pk = scores.find(o => o.x === chosen), obvious = scores[0], r2 = v => +v.toFixed(2);
  PASS_WHY = { psychic: 1, tried: cands.length, runs: R, goal: (T.cards[p] || {}).goal || null,
    picked: [r2(pk.own), r2(pk.hum), r2(pk.cpu)], obvious: [obvious.x.slice(), r2(obvious.own), r2(obvious.hum), r2(obvious.cpu)],
    cards: chosen.map(c => [c, 'psychic']) };
  return chosen;
}
// ===== end girls =====
