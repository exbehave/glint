// ===== Hearts engine + bots =====
const QS = 36; // queen of spades (suit 2, rank 12)
const suit = c => Math.floor(c / 13);
const rank = c => (c % 13) + 2;
const pts = c => (suit(c) === 3 ? 1 : c === QS ? 13 : 0);
const cardId = (s, r) => s * 13 + (r - 2);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const desc = a => a.slice().sort((x, y) => rank(y) - rank(x));
const asc = a => a.slice().sort((x, y) => rank(x) - rank(y));

function winnerOf(trick) {
  const ls = suit(trick[0].c);
  let w = trick[0];
  for (const x of trick) if (suit(x.c) === ls && rank(x.c) > rank(w.c)) w = x;
  return w;
}

function newHandState(hands) {
  const lead = hands.findIndex(h => h.includes(0));
  return {
    hands, pts: [0, 0, 0, 0], won: [0, 0, 0, 0], ptTricks: [0, 0, 0, 0], trick: [], turn: lead,
    broken: false, trickNo: 0, played: new Uint8Array(52),
    voids: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  };
}

function cloneSt(st, hands) {
  return {
    hands: hands || st.hands.map(h => h.slice()), pts: st.pts.slice(), won: st.won.slice(), ptTricks: (st.ptTricks || [0, 0, 0, 0]).slice(),
    trick: st.trick.slice(), turn: st.turn, broken: st.broken, trickNo: st.trickNo,
    played: st.played.slice(), voids: st.voids.map(v => v.slice())
  };
}

function legalFor(st, p) {
  const h = st.hands[p];
  const first = st.trickNo === 0;
  if (!st.trick.length) {
    if (first && h.includes(0)) return [0];
    if (!st.broken) {
      const nh = h.filter(c => suit(c) !== 3);
      if (nh.length) return nh;
    }
    return h.slice();
  }
  const ls = suit(st.trick[0].c);
  const f = h.filter(c => suit(c) === ls);
  if (f.length) return f;
  if (first) {
    const np = h.filter(c => !pts(c));
    if (np.length) return np;
  }
  return h.slice();
}

// returns null, or {w, trick} when a trick completes
function doPlay(st, p, c) {
  const h = st.hands[p];
  h.splice(h.indexOf(c), 1);
  if (st.trick.length && suit(c) !== suit(st.trick[0].c)) st.voids[p][suit(st.trick[0].c)] = 1;
  if (suit(c) === 3) st.broken = true;
  st.trick.push({ p, c });
  st.played[c] = 1;
  if (st.trick.length === 4) {
    const w = winnerOf(st.trick).p;
    let s = 0;
    for (const x of st.trick) s += pts(x.c);
    st.pts[w] += s;
    st.won[w]++;
    if (s && st.ptTricks) st.ptTricks[w]++;
    st.trickNo++;
    const t = st.trick;
    st.trick = [];
    st.turn = w;
    return { w, trick: t };
  }
  st.turn = (p + 1) % 4;
  return null;
}

// final hand scores with shooting the moon applied
function settle(P) {
  const m = P.indexOf(26);
  return m >= 0 ? P.map((_, i) => (i === m ? 0 : 26)) : P.slice();
}

// ---------- why (Theater's thinking panel, Kennedy Nov 9): every brain notes its reason here as it decides ----------
// Read it straight after the call (later calls overwrite it). Setting it never changes which card is picked.
let BRAIN_WHY = null;
const why_ = (code, c) => { BRAIN_WHY = code; return c; };

// ---------- passing ----------
function passEasy(hand) { BRAIN_WHY = 'random'; return shuffle(hand.slice()).slice(0, 3); }

function passMedium(hand) {
  const danger = c => (c === QS ? 60 : suit(c) === 2 && rank(c) > 12 ? 45 : suit(c) === 3 ? rank(c) + 4 : rank(c));
  BRAIN_WHY = 'danger';
  return hand.slice().sort((a, b) => danger(b) - danger(a)).slice(0, 3);
}

function passHard(hand) {
  const pick = [], rs = [];
  const add = (c, r) => { if (pick.length < 3 && !pick.includes(c)) { pick.push(c); rs.push(r); } };
  const of = s => hand.filter(c => suit(c) === s);
  const sp = of(2);
  const hasQ = hand.includes(QS);
  const lowSp = sp.filter(c => rank(c) < 12).length;
  if (hasQ && lowSp < 3) add(QS, 'nakedQueen'); // unprotected queen goes
  const keepingQ = hasQ && !pick.includes(QS);
  if (!keepingQ) desc(sp.filter(c => rank(c) > 12)).forEach(c => add(c, 'bigSpade')); // A/K♠ attract the queen
  // try to void clubs or diamonds
  const shortest = [0, 1].map(s => of(s)).filter(a => a.length && a.length <= 3 - pick.length)
    .sort((a, b) => a.length - b.length)[0];
  if (shortest) desc(shortest).forEach(c => add(c, 'void'));
  desc(of(3).filter(c => rank(c) >= 11)).forEach(c => add(c, 'bigHeart'));
  const rest = desc(hand.filter(c => !(keepingQ && suit(c) === 2)));
  rest.forEach(c => add(c, keepingQ ? 'highKeepQ' : 'high'));
  desc(hand).forEach(c => add(c, 'high'));
  BRAIN_WHY = pick.map((c, i) => [c, rs[i]]);
  return pick;
}

// ---------- play policies ----------
function pickEasy(st, p) {
  const L = legalFor(st, p);
  const i = Math.floor(Math.random() * L.length);
  return why_(L.length === 1 ? 'only' : 'random', L[i]);
}

function pickMedium(st, p) {
  const L = legalFor(st, p);
  if (L.length === 1) return why_('only', L[0]);
  const t = st.trick;
  if (!t.length) {
    const safe = asc(L.filter(c => suit(c) !== 3 && c !== QS && !(suit(c) === 2 && rank(c) > 12)));
    return safe.length ? why_('leadLow', safe[0]) : why_('leadForced', asc(L)[0]);
  }
  const ls = suit(t[0].c), win = winnerOf(t).c, last = t.length === 3;
  if (L.some(c => suit(c) === ls)) {
    if (ls === 2 && L.includes(QS) && rank(win) > 12) return why_('feedQueen', QS);
    const under = desc(L.filter(c => rank(c) < rank(win) && c !== QS));
    if (under.length) return why_('duck', under[0]);
    const above = L.filter(c => c !== QS);
    if (!above.length) return why_('only', L[0]);
    return last ? why_('takeLast', desc(above)[0]) : why_('takeLow', asc(above)[0]);
  }
  if (L.includes(QS)) return why_('dumpQueen', QS);
  const bigSp = desc(L.filter(c => suit(c) === 2 && rank(c) > 12));
  if (bigSp.length) return why_('dumpBigSpade', bigSp[0]);
  const hs = desc(L.filter(c => suit(c) === 3));
  if (hs.length) return why_('dumpHeart', hs[0]);
  return why_('dumpHigh', desc(L)[0]);
}

// o (optional, for the girls): o.seen = what she remembers as played (Card memory), o.live = spot a moon by the live-moon rule (Covers)
function pickHard(st, p, known, o) {
  const L = legalFor(st, p);
  if (L.length === 1) return why_('only', L[0]);
  const h = st.hands[p], t = st.trick;
  const seen = (o && o.seen) || st.played;
  const qsOut = !seen[QS] && !h.includes(QS);
  const hi = c => { // unseen cards that beat c in its suit
    let n = 0;
    for (let r = rank(c) + 1; r <= 14; r++) {
      const x = cardId(suit(c), r);
      if (!seen[x] && !h.includes(x)) n++;
    }
    return n;
  };
  const total = st.pts[0] + st.pts[1] + st.pts[2] + st.pts[3];
  let shooter = -1;
  for (let q = 0; q < 4; q++) if (q !== p && st.pts[q] >= 10 && st.pts[q] === total) shooter = q;
  if (shooter < 0 && o && o.live) shooter = liveMoon(st, p);

  if (!t.length) {
    if (shooter >= 0 && st.broken) {
      const hs = desc(L.filter(c => suit(c) === 3));
      if (hs.length && hi(hs[0]) === 0) return why_('stopMoonLead', hs[0]); // grab a heart to stop the moon
    }
    const sp = L.filter(c => suit(c) === 2);
    if (qsOut && sp.length && !h.some(c => suit(c) === 2 && rank(c) >= 12)) return why_('flushQueen', desc(sp)[0]); // flush the queen
    let best = L[0], bs = -1e9;
    for (const c of L) {
      let s = hi(c) * 3 - rank(c);
      if (suit(c) === 3) s -= 6;
      if (c === QS) s -= 60;
      if (suit(c) === 2 && rank(c) > 12 && !seen[QS]) s -= 40;
      if (hi(c) === 0) s -= 25;
      if (s > bs) { bs = s; best = c; }
    }
    return why_('leadSafe', best);
  }

  const ls = suit(t[0].c), wc = winnerOf(t), win = wc.c, last = t.length === 3;
  const pin = t.reduce((a, x) => a + pts(x.c), 0);
  if (L.some(c => suit(c) === ls)) {
    if (shooter >= 0 && wc.p === shooter && pin > 0) {
      const beat = asc(L.filter(c => rank(c) > rank(win) && c !== QS));
      if (beat.length) return why_('stopMoonBeat', beat[0]);
    }
    if (ls === 2 && L.includes(QS) && rank(win) > 12) return why_('feedQueen', QS);
    const under = desc(L.filter(c => rank(c) < rank(win) && c !== QS));
    if (under.length) return why_('duck', under[0]);
    const above = L.filter(c => c !== QS);
    if (!above.length) return why_('only', L[0]);
    if (last) return why_('takeLast', desc(above)[0]);
    const up = asc(above);
    if (hi(up[0]) === 0) return why_('winAnyway', desc(above)[0]); // winning regardless: shed the biggest
    if (ls === 2 && qsOut) {
      const lowK = up.filter(c => rank(c) < 12);
      if (lowK.length) return why_('underQueen', lowK[lowK.length - 1]);
    }
    return why_('takeLow', up[0]);
  }
  // void in the led suit: dump
  if (shooter >= 0 && wc.p === shooter) {
    const np = L.filter(c => !pts(c));
    if (np.length) return why_('stopMoonDump', desc(np)[0]);
  }
  if (L.includes(QS)) return why_('dumpQueen', QS);
  if (qsOut) {
    const big = desc(L.filter(c => suit(c) === 2 && rank(c) > 12));
    if (big.length) return why_('dumpBigSpade', big[0]);
  }
  const hs = desc(L.filter(c => suit(c) === 3));
  if (hs.length && rank(hs[0]) >= 9) return why_('dumpHeart', hs[0]);
  let best = L[0], bs = -1e9;
  for (const c of L) {
    const len = h.filter(x => suit(x) === suit(c)).length;
    const s = rank(c) * 2 - len * 3 + (suit(c) === 3 ? 4 : 0);
    if (s > bs) { bs = s; best = c; }
  }
  return why_('dumpShort', best);
}

// deal unseen cards to opponents consistent with known voids and passed cards
function sampleHands(st, p, known) {
  const others = [0, 1, 2, 3].filter(q => q !== p);
  const base = [[], [], [], []];
  base[p] = st.hands[p].slice();
  const need = [0, 0, 0, 0];
  others.forEach(q => (need[q] = st.hands[q].length));
  const fixed = new Map();
  (known || []).forEach(k => { if (!st.played[k.c] && !st.hands[p].includes(k.c)) fixed.set(k.c, k.q); });
  const pool = [];
  for (let c = 0; c < 52; c++) {
    if (st.played[c] || st.hands[p].includes(c)) continue;
    if (fixed.has(c)) { const q = fixed.get(c); base[q].push(c); need[q]--; }
    else pool.push(c);
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const n = need.slice();
    const H = base.map(h => h.slice());
    const relax = attempt >= 30;
    const items = shuffle(pool.slice()).map(c => ({ c, el: others.filter(q => relax || !st.voids[q][suit(c)]) }));
    items.sort((a, b) => a.el.length - b.el.length);
    let ok = true;
    for (const it of items) {
      const cand = it.el.filter(q => n[q] > 0);
      if (!cand.length) { ok = false; break; }
      let r = Math.random() * cand.reduce((a, q) => a + n[q], 0), pick = cand[0];
      for (const q of cand) { r -= n[q]; if (r < 0) { pick = q; break; } }
      H[pick].push(it.c);
      n[pick]--;
    }
    if (ok) return H;
  }
  return null;
}

function moveCost(P, p) {
  const f = settle(P);
  const others = (f[0] + f[1] + f[2] + f[3] - f[p]) / 3;
  return f[p] - others * 0.35;
}

// live moon (Kennedy's rule, to be calibrated): one other player has won more than one trick with points, and nobody else has any
function liveMoon(st, p) {
  for (let q = 0; q < 4; q++) {
    if (q === p || (st.ptTricks || [])[q] < 2) continue;
    if ([0, 1, 2, 3].every(r => r === q || !st.pts[r])) return q;
  }
  return -1;
}

// average cost of each card over N imagined deals (rest of the hand played out by Hard)
// detail (Theater's thinking panel): each card maps to {own, others: [3 seats' points], runs} instead — her expected
// points this round and everyone else's (moon settled), judged only on what she could know.
function evalCards(st, p, known, L, N, detail) {
  const sum = new Map(L.map(c => [c, detail ? { own: 0, others: [0, 0, 0, 0] } : 0]));
  let runs = 0;
  for (let i = 0; i < N; i++) {
    const hands = sampleHands(st, p, known);
    if (!hands) continue;
    runs++;
    for (const c of L) {
      const s = cloneSt(st, hands.map(h => h.slice()));
      doPlay(s, p, c);
      while (s.trickNo < 13) { const q = s.turn; doPlay(s, q, pickHard(s, q)); }
      if (detail) { const f = settle(s.pts), o = sum.get(c); o.own += f[p]; for (let q = 0; q < 4; q++) o.others[q] += f[q]; }
      else sum.set(c, sum.get(c) + moveCost(s.pts, p));
    }
  }
  if (!runs) return null;
  for (const c of L) {
    if (detail) { const o = sum.get(c); o.own /= runs; o.others = o.others.map(v => v / runs); o.others[p] = null; o.runs = runs; }
    else sum.set(c, sum.get(c) / runs);
  }
  return sum;
}

function pickGenius(st, p, known) {
  const L = legalFor(st, p);
  if (L.length === 1) return why_('only', L[0]);
  const N = Math.min(120, Math.max(30, Math.floor(1400 / L.length)));
  const cost = evalCards(st, p, known, L, N);
  if (!cost) return pickHard(st, p);
  let best = L[0], bv = Infinity;
  for (const c of L) if (cost.get(c) < bv) { bv = cost.get(c); best = c; }
  return why_('bestSampled', best);
}

const LEVELS = {
  easy: { label: 'Easy', pick: pickEasy, pass: passEasy },
  medium: { label: 'Medium', pick: pickMedium, pass: passMedium },
  hard: { label: 'Hard', pick: pickHard, pass: passHard },
  genius: { label: 'Genius', pick: pickGenius, pass: passHard }
};

function dealHands() {
  const d = shuffle([...Array(52).keys()]);
  return [0, 1, 2, 3].map(i => d.slice(i * 13, i * 13 + 13));
}
// ===== end engine =====
