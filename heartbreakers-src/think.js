// ===== Calculating (Theater's thinking panel, Kennedy Nov 10, 2026): why each girl made each move, in plain English =====
// Reads a game record (rec.hands[i].plays = [seat, card, ms, why], rec.hands[i].passWhy) and builds what the panel shows.
// No DOM here: the panel in ui.html draws it. Concatenated by build.py after ending.js.
const TK_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const TK_SUIT = ['♣︎', '♦︎', '♠︎', '♥︎'];
const TK_SUITN = ['clubs', 'diamonds', 'spades', 'hearts'], TK_SUIT1 = ['club', 'diamond', 'spade', 'heart'];
const tkCard = c => TK_RANK[c % 13] + TK_SUIT[Math.floor(c / 13)];
const tkPlural = n => /twins|clermonts/i.test(String(n));
const tkPro = n => (tkPlural(n) ? { she: 'they', her: 'them', hers: 'their', was: 'were', has: 'have', is: 'are', s: '' } : { she: 'she', her: 'her', hers: 'her', was: 'was', has: 'has', is: 'is', s: 's' });
const tkCap = s => s.charAt(0).toUpperCase() + s.slice(1);

// the hands right after the pass (or the deal, on a hold round)
function tkAfterPass(rh) {
  const hands = rh.deal.map(h => h.slice());
  if (rh.passes && rh.dir !== 3) {
    const off = [1, 3, 2][rh.dir];
    rh.passes.forEach((ps, p) => ps.forEach(c => hands[p].splice(hands[p].indexOf(c), 1)));
    rh.passes.forEach((ps, p) => ps.forEach(c => hands[(p + off) % 4].push(c)));
  }
  return hands;
}
// the hand state just before play n (n cards already played this round)
function tkStateAt(rh, n) {
  const st = newHandState(tkAfterPass(rh));
  for (let i = 0; i < n; i++) doPlay(st, rh.plays[i][0], rh.plays[i][1]);
  return st;
}
// every finished trick in a round up to play n: [{trick: [{p, c}], w, pts}]
function tkTricks(rh, n) {
  const out = [], st = newHandState(tkAfterPass(rh));
  for (let i = 0; i < Math.min(n, rh.plays.length); i++) {
    const res = doPlay(st, rh.plays[i][0], rh.plays[i][1]);
    if (res) out.push({ trick: res.trick, w: res.w, pts: res.trick.reduce((a, x) => a + pts(x.c), 0) });
  }
  return out;
}
// what each seat has taken this round, as of play n: point cards and trick count
function tkTaken(rh, n) {
  const out = [0, 1, 2, 3].map(() => ({ cards: [], tricks: 0 }));
  if (!rh) return out;
  for (const t of tkTricks(rh, n)) {
    out[t.w].tricks++;
    for (const x of t.trick) if (pts(x.c)) out[t.w].cards.push(x.c);
  }
  out.forEach(o => o.cards.sort((a, b) => (a === QS ? -1 : b === QS ? 1 : rank(b) - rank(a))));
  return out;
}
// the last time `from` stuck `to` with the Q♠ or a pile of hearts, before round hi, play n: a phrase, or ''
function tkGrudgeWhy(rec, hi, n, to, from, names) {
  for (let h = hi; h >= 0; h--) {
    const rh = rec.hands[h];
    const ts = tkTricks(rh, h === hi ? n : rh.plays.length).reverse();
    for (const t of ts) {
      if (t.w !== to) continue;
      const q = t.trick.find(x => x.c === QS);
      const when = h === hi ? 'earlier this round' : h === hi - 1 ? 'last round' : `in round ${h + 1}`;
      if (q && q.p === from) return `who stuck ${tkPro(names[to]).her} with the Q♠ ${when}`;
      if (t.trick.some(x => x.p === from && suit(x.c) === 3) && t.trick.filter(x => suit(x.c) === 3).length >= 2) return `who piled hearts on ${tkPro(names[to]).her} ${when}`;
    }
  }
  return '';
}

const TK_HABIT = { hotPotato: 'Hot potato', grudge: 'Grudge', leader: 'Going after the leader', breakEarly: 'Breaks hearts early', holdsHearts: 'Holds her hearts',
  ducking: 'Ducking', hothead: 'Hothead', psychic: 'Sees every hand', random: 'Instinct' };

// One move explained. rec.hands[hi].plays[n] is the move; names = rec.names.
// → { p, c, who, round, trick, place, tag, reason, opts: [{c, own, picked, best}], runs, basis, legal: [cards], human }
function thinkMove(rec, hi, n, names) {
  const rh = rec.hands[hi], [p, c, , why] = rh.plays[n];
  const st = tkStateAt(rh, n), L = legalFor(st, p), t = st.trick;
  const nm = names[p], P = tkPro(nm);
  const out = { p, c, who: nm, round: hi + 1, trick: st.trickNo + 1, place: ['led', 'second to play', 'third to play', 'last to play'][t.length], legal: L, opts: [], tag: '', reason: '' };
  const w = why || {};
  const led = t.length ? suit(t[0].c) : -1, void_ = t.length && suit(c) !== led;
  const win = t.length ? winnerOf(t) : null, winNm = win ? names[win.p] : '', winC = win ? tkCard(win.c) : '';
  const inPts = t.reduce((a, x) => a + pts(x.c), 0);
  const hasHearts = t.some(x => suit(x.c) === 3), hasQ = t.some(x => x.c === QS);
  const what = hasQ ? 'the Q♠' : hasHearts ? 'the hearts' : 'the trick';
  const C = tkCard(c), ledN = led >= 0 ? TK_SUITN[led] : '', led1 = led >= 0 ? TK_SUIT1[led] : '';
  // the girl a dump lands on: whoever is winning the trick (she could still be overtaken, but that's who she aimed at)
  const onWho = winNm ? ` on ${winNm}` : '';
  const base = code => {
    switch (code) {
      case 'only': if (c === 0 && st.trickNo === 0 && !t.length) return `Led the 2♣, as the rules say.`;
        return L.length === 1 ? `${tkCap(P.she)} had no choice: the ${C} was ${P.hers} only legal card.` : `Played the ${C}.`;
      case 'random': return `${tkCap(P.she)} play${P.s} on instinct: a legal card at random.`;
      case 'leadLow': return `Led ${P.hers} lowest safe card, the ${C}, to stay out of trouble.`;
      case 'leadForced': return `Nothing safe left to lead, so ${P.she} led ${P.hers} lowest card.`;
      case 'leadSafe': return `Led the ${C}: the lead least likely to come back with points.`;
      case 'flushQueen': return `Led spades to smoke out the Q♠ while ${P.she} ${P.has} nothing that could catch her.`;
      case 'stopMoonLead': return `Led a heart nobody can beat, to stop the moon.`;
      case 'feedQueen': return `Fed the Q♠ under ${winNm}'s ${winC}.`;
      case 'duck': return `Ducked under the ${winC} so ${P.she} wouldn't win ${what}.`;
      case 'takeLast': return `Last to play and couldn't get under the ${winC}, so ${P.she} took it with ${P.hers} highest ${led1}${inPts ? '' : ' (no points in it)'}.`;
      case 'takeLow': return `Couldn't get under the ${winC}, so ${P.she} played ${P.hers} lowest ${led1} and hoped someone goes higher.`;
      case 'winAnyway': return `${tkCap(P.she)} ${P.was} winning this one no matter what, so ${P.she} shed ${P.hers} biggest ${led1}.`;
      case 'underQueen': return `Played ${P.hers} highest spade below the queen, keeping the big ones back.`;
      case 'stopMoonBeat': return `Took the trick so ${winNm} can't shoot the moon.`;
      case 'stopMoonDump': return `Out of ${ledN}: threw a card with no points, so ${winNm}'s run at the moon gets no help.`;
      case 'dumpQueen': return `Out of ${ledN}: dumped the Q♠${onWho}.`;
      case 'dumpBigSpade': return `Out of ${ledN}: shed the ${C} so it can't get caught under the queen later.`;
      case 'dumpHeart': return `Out of ${ledN}: dumped the ${C}${onWho}.`;
      case 'dumpHigh': return `Out of ${ledN}: got rid of ${P.hers} highest card, the ${C}.`;
      case 'dumpShort': return `Out of ${ledN}: threw the ${C} from a short suit, working toward another void.`;
      case 'bestSampled': return `Picked the card with the lowest expected cost.`;
      default: return `Played the ${C}.`;
    }
  };
  const habit = (h, tgt) => {
    const tn = tgt >= 0 ? names[tgt] : '';
    switch (h) {
      case 'hotPotato': return `Hot potato: got rid of the Q♠ the first moment it couldn't win the trick.`;
      case 'grudge': {
        const g = tgt >= 0 ? tkGrudgeWhy(rec, hi, n, p, tgt, names) : '';
        if (c === QS || pts(c)) return `Holding a grudge: dumped the ${C} on ${tn || winNm}${g ? ', ' + g : ''}.`;
        return `Holding a grudge: saving the Q♠ for ${tn}${g ? ', ' + g : ''}.`;
      }
      case 'leader': return c === QS || pts(c) ? `Going after the leader: dumped the ${C} on ${tn || winNm}, who has the lowest score.` : `Saving the Q♠ for ${tn}, who has the lowest score.`;
      case 'breakEarly': return `Couldn't wait to break hearts: out came the ${C} at the first chance.`;
      case 'holdsHearts': return `Held ${P.hers} hearts back for now and played the ${C} instead.`;
      case 'ducking': return `Ducked under the ${winC} so ${P.she} wouldn't win ${what}.`;
      case 'hothead': return `Still steaming from that last big trick: slammed ${P.hers} highest card, the ${C}.`;
      default: return null;
    }
  };
  if (w.psychic) {
    out.tag = TK_HABIT.psychic;
    out.opts = (w.opts || []).map(o => ({ c: o[0], own: o[1] }));
    out.runs = w.runs; out.basis = 'psychic';
    const me = out.opts.find(o => o.c === c), lo = out.opts.length ? Math.min(...out.opts.map(o => o.own)) : null;
    if (!me) out.reason = base('only');
    else if (me.own <= lo + 0.05) out.reason = `${tkCap(P.she)} saw every hand and played each card out${w.runs > 1 ? ` ${w.runs} times` : ''}: the ${C} costs ${P.her} the least, about ${me.own.toFixed(1)} points from here.`;
    else out.reason = c === QS || !t.length
      ? `${tkCap(P.she)} saw every hand. The ${C} costs a little more on paper, but ${P.she} won't risk the Q♠ coming back ${P.her} way.`
      : `${tkCap(P.she)} saw every hand. The ${C} costs a little more on paper (${me.own.toFixed(1)} vs ${lo.toFixed(1)}), but it keeps ${P.hers} spades guarding the queen.`;
  } else if (w.habit && w.habit !== 'base' && !String(w.habit).startsWith('veto:')) {
    out.tag = TK_HABIT[w.habit] || tkCap(w.habit);
    out.reason = habit(w.habit, w.target) || base(w.base);
  } else if (w.habit && String(w.habit).startsWith('veto:')) {
    const h = w.habit.slice(5), wanted = { hotPotato: 'dump the Q♠ right away', grudge: 'go after a grudge', leader: 'go after the leader', breakEarly: 'break hearts', holdsHearts: 'hold her hearts', ducking: 'duck', hothead: 'slam her highest card' }[h] || h;
    out.tag = 'Thought better of it';
    out.reason = `Wanted to ${wanted.replace(/\bher\b/g, P.hers)}, but it would cost too much. ${base(w.base)}`;
  } else if (w.level === 'easy' || w.base === 'random') {
    out.tag = TK_HABIT.random;
    out.reason = base(w.base === 'only' ? 'only' : 'random');
  } else if (w.base) out.reason = base(w.base);
  else if (why == null) { out.human = true; out.reason = ''; }
  else out.reason = L.length === 1 ? base('only') : `Played the ${C}.`;
  if (!w.psychic && w.opts) { out.opts = w.opts.map(o => ({ c: o[0], own: o[1] })); out.runs = w.n; out.basis = 'sampled'; }
  if (out.opts.length) {
    const lo = Math.min(...out.opts.map(o => o.own));
    out.opts.forEach(o => { o.picked = o.c === c; o.best = o.own <= lo + 0.005; });
    out.opts.sort((a, b) => a.own - b.own || a.c - b.c);
  }
  return out;
}

const TK_PASSWHY = {
  nakedQueen: P => `Not enough low spades to hide the queen behind, so she had to go.`,
  bigSpade: P => `Big spades are how you end up eating the queen.`,
  void: (P, c) => `Clearing out ${P.hers} ${TK_SUITN[suit(c)]} to make a void.`,
  bigHeart: P => `High hearts win tricks full of points.`,
  high: P => `A high card that would win tricks ${P.she} doesn't want.`,
  highKeepQ: P => `Keeping ${P.hers} spades to guard the queen, so a high card from another suit went instead.`,
  danger: P => `One of ${P.hers} three most dangerous cards.`,
  random: P => `Passed without much thought.`,
  keptQueen: P => `${tkCap(P.she)} kept the Q♠ (${P.she} like${P.s} holding her) and passed this instead.`,
  panic: P => `Spade panic: the big spades had to go.`,
};
// One seat's pass explained → { p, who, to, cards: [{c, why}], summary, tag }
function thinkPass(rec, hi, p, names) {
  const rh = rec.hands[hi];
  if (!rh.passes || rh.dir === 3) return null;
  const off = [1, 3, 2][rh.dir], to = (p + off) % 4, nm = names[p], P = tkPro(nm);
  const w = (rh.passWhy || [])[p] || null, codes = new Map(((w && w.cards) || []).map(x => [x[0], x[1]]));
  const out = { p, who: nm, to: names[to], dir: ['left', 'right', 'across'][rh.dir], round: hi + 1, cards: rh.passes[p].map(c => ({ c, why: '' })), summary: '', tag: '', human: !w };
  if (!w) return out;
  if (w.psychic) {
    out.tag = TK_HABIT.psychic;
    const [own] = w.picked || [], ob = w.obvious;
    const same = ob && ob[0].every(c => rh.passes[p].includes(c));
    out.summary = `${tkCap(P.she)} tried ${w.tried} different passes, playing each one out ${w.runs} times. This one leaves ${P.her} about ${(+own).toFixed(1)} points`
      + (ob && !same ? `; the obvious pass (${ob[0].map(tkCard).join(' ')}) would have left about ${(+ob[1]).toFixed(1)}.` : ', and it\'s the obvious pass anyway.');
    return out;
  }
  if (w.panic) out.tag = 'Spade panic';
  else if (w.keptQ != null) out.tag = 'Keeps the queen';
  else if (w.level === 'easy') out.tag = TK_HABIT.random;
  out.cards.forEach(x => { const f = TK_PASSWHY[codes.get(x.c)] || TK_PASSWHY.high; x.why = f(P, x.c); });
  if (w.keptQ != null) out.summary = `${tkCap(P.she)} held on to the Q♠.`;
  return out;
}
// ===== end Calculating =====
