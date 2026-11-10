// ===== Highlights (Kennedy, Nov 9, 2026) =====
// A short reel of a game's best moments, built from the game record (hb_games.data), so every recorded game has one.
// Shown after the final score and in My games, and saved as a video. Kennedy's rules for what counts:
//  - every trick with the Q♠ in it (played and taken), and every moon;
//  - a broken-hearts or hearts-taken moment only when two different girls traded quotes right after each other
//    on that trick and the reply answers strongly (pair score 3 or better, or one of Kennedy's own links).
// A quick swish marks a jump to a trick that isn't the very next one (Kennedy); back-to-back tricks just carry on.
// Each moment replays its trick card by card at a mini table (Kennedy's pick), then the quotes with their real clips.

const HL_MAX = 10;              // longest reel, in moments
const HL_PAIR_MIN = 3;

// tricks of one recorded hand: [{ n, cards: [{p, c}], w (winner seat), t0, t1 (ms window for its quotes) }]
function hlTricks(h) {
  const out = [], P = h.plays || [];
  for (let i = 0; i + 3 < P.length; i += 4) {
    const cards = P.slice(i, i + 4).map(x => ({ p: x[0], c: x[1] }));
    out.push({ n: i / 4, cards, w: winnerOf(cards).p, t0: P[i][2], t1: P[i + 4] ? P[i + 4][2] : Infinity });
  }
  // a TRAM claimed the rest (in a debug game it can take a moon): the claimed cards become the tricks you'd have won,
  // the half-played trick first, then one card from each hand per trick
  if (h.tram && h.tram.hands) {
    const hands = h.tram.hands.map(x => x.slice()), table = (h.tram.table || []).map(([p, c]) => ({ p, c }));
    let ms = h.tram.ms || (out.length ? out[out.length - 1].t1 : 0);
    if (out.length) out[out.length - 1].t1 = Math.min(out[out.length - 1].t1, ms);
    for (let n = out.length; n < 13; n++) {
      const cards = n === out.length ? table.slice() : [];
      for (let k = 0; k < 4; k++) if (!cards.some(x => x.p === k) && hands[k].length) cards.push({ p: k, c: hands[k].shift() });
      if (cards.length < 4) break;
      out.push({ n, cards, w: h.tram.by != null ? h.tram.by : 0, t0: ms, t1: n === 12 ? Infinity : ms, tram: true });
    }
  }
  return out;
}
function hlMoonMoment(rec, hi, who) {   // also used by the game, the moment she shoots it
  const h = rec.hands[hi], tricks = hlTricks(h);
  const ff = tricks.filter(t => t.w === who && t.cards.some(x => suit(x.c) === 3 || x.c === QS));
  return { kind: 'moon', hand: hi, trick: tricks[tricks.length - 1], ff, quotes: [], rank: 3, who, choice: h.choice };
}
function hlFind(rec) {
  if (!rec || !rec.hands) return [];
  const found = [];
  rec.hands.forEach((h, hi) => {
    const tricks = hlTricks(h), says = (h.says || []).map(s => ({ p: s[0], ev: s[1], line: s[2], ms: s[3], sc: s[4] || 0, ans: s[5] || null }));
    const trickAt = ms => tricks.find(t => ms >= t.t0 && ms < t.t1) || tricks[tricks.length - 1];
    const used = new Set();
    for (const t of tricks) {
      if (t.tram || !t.cards.some(x => x.c === QS)) continue;   // cards claimed by a TRAM were never played
      const qs = says.filter(s => (s.ev === 'qsGive' || s.ev === 'qsGet') && s.ms >= t.t0 && s.ms < t.t1);
      qs.forEach(s => used.add(s));
      found.push({ kind: 'qs', hand: hi, trick: t, quotes: qs, rank: 2, who: t.w, by: t.cards.find(x => x.c === QS).p });
    }
    if (h.moon >= 0 && tricks.length) {
      // the moon (Kennedy, Nov 9): a fast-forward of every trick she took points in, then the revolver finale
      found.push(Object.assign(hlMoonMoment(rec, hi, h.moon), { quotes: says.filter(s => s.ev === 'moon') }));
    }
    // breaks / hearts (Kennedy, Nov 9, evening): only a real back-and-forth on one trick — the reply has a pair score of 3+,
    // it comes right after the quote it answers (nothing said in between), a different girl said that quote,
    // and both were said during the trick on screen (Dalila answering herself across tricks wasn't worth it)
    says.forEach((s, i) => {
      if (used.has(s) || !/^(breaks|hearts|fewHearts)$/.test(s.ev) || s.sc < HL_PAIR_MIN || i === 0) return;
      const prev = says[i - 1], t = trickAt(s.ms);
      if (used.has(prev) || prev.p === s.p || (s.ans && normLine(prev.line) !== s.ans)) return;
      if (trickAt(prev.ms) !== t || found.some(f => f.hand === hi && f.trick === t)) return;
      used.add(s); used.add(prev);
      found.push({ kind: s.ev === 'breaks' ? 'breaks' : 'hearts', hand: hi, trick: t, quotes: [prev, s], rank: 1 + s.sc / 10, who: s.p });
    });
  });
  // the strongest moments when there are too many, shown in the order they happened
  const keep = found.slice().sort((a, b) => b.rank - a.rank).slice(0, HL_MAX);
  return found.filter(m => keep.includes(m)).sort((a, b) => a.hand - b.hand || a.trick.n - b.trick.n);
}

// ---------- the reel ----------
const HL_SHAPES = { tall: [720, 1280], square: [960, 960], wide: [1280, 720] };
const hlDefaultShape = () => (innerHeight > innerWidth ? 'tall' : 'wide');
const hlImgs = {};
function hlImg(src) {
  if (!src) return null;
  if (!hlImgs[src]) { const im = new Image(); im.src = src; hlImgs[src] = im; }
  return hlImgs[src].complete && hlImgs[src].naturalWidth ? hlImgs[src] : null;
}
const hlVoice = (rec, p) => (p === 0 ? rec.me : rec.names[p]);
const hlLabel = (rec, p) => (p === 0 ? (rec.handle || 'You') : rec.names[p]);
const hlStrip = s => String(s).replace(/\s*\(\d+\)$/, '');
function hlCaption(rec, m) {
  const R = `Round ${m.hand + 1}`, nm = p => (p === 0 ? (rec.handle || 'You') : rec.names[p]);
  if (m.kind === 'qs') return `${R} · ${m.by === m.who ? `${nm(m.who)} ate the Q♠` : `${nm(m.by)} → Q♠ → ${nm(m.who)}`}`;
  if (m.kind === 'moon') return `${R} · ${nm(m.who)} shot the moon`;
  if (m.kind === 'breaks') return `${R} · ${nm(m.who)} broke hearts`;
  const h = m.trick.cards.filter(x => suit(x.c) === 3).length;
  return `${R} · ${nm(m.trick.w)} took ${h} heart${h === 1 ? '' : 's'}`;
}

// The timeline: every moment as timed steps, so playing and recording draw the same frames and schedule the same sounds.
// clips: line -> decoded buffer (or null); done before the reel starts so nothing waits mid-reel.
function hlTimeline(rec, moments, clips, opts = {}) {
  const T = [], A = [];   // T: segments {t0, t1, m, i}; A: audio {at, buf | sfx}
  let t = 0;
  const INTRO = 1.6, CARD = 0.42, AFTER = 0.5, GAP = 0.25, OUTRO = 3;
  if (!opts.bare && !opts.endOnly) { T.push({ t0: 0, t1: INTRO, intro: true }); t = INTRO; }   // endOnly: the ending alone, in the game   // bare: the moon alone, during the game
  const SWISH = 0.5;
  let prev = null, sw = null;
  moments.forEach((m, i) => {
    if (prev && (m.kind === 'moon' || !(prev.m.hand === m.hand && m.trick.n === prev.m.trick.n + 1))) {   // a jump: swish over to it
      sw = { t0: t, t1: t + SWISH, swish: true, a: prev }; T.push(sw); A.push({ at: t, sfx: 'whoosh' }); t += SWISH;
    }
    const seg = { t0: t, m, i, cardsAt: [], quotes: [] };
    if (sw) { sw.b = seg; sw = null; }
    if (m.kind === 'moon') { t = hlMoonSeg(rec, seg, clips, A, t, opts); T.push(seg); prev = seg; return; }
    m.trick.cards.forEach((x, k) => {
      const at = t + 0.3 + k * CARD;
      seg.cardsAt.push(at); if (x.c === QS && k === 0) t += 0.6;   // a led queen bounces longer (1 s), like the table
      A.push({ at: at + 0.2, soft: 'card' });
      if (x.c === QS) { A.push({ at, sfx: k === 0 ? 'gong' : 'timpani' }); if (k === 0) seg.gambitAt = at; }
      if (m.kind === 'breaks' && suit(x.c) === 3 && !m.trick.cards.slice(0, k).some(y => suit(y.c) === 3)) { A.push({ at: at + 0.2, glass: true }); seg.glassAt = at + 0.2; seg.glassK = k; }
    });
    t += 0.3 + 4 * CARD + AFTER;
    for (const q of m.quotes) {
      const buf = clips[hlVoice(rec, q.p) + '|' + normLine(q.line)] || null;
      const len = buf ? (buf.sp != null ? buf.sp : buf.duration) : 1.8;
      if (buf) A.push({ at: t, buf });
      seg.quotes.push({ q, t0: t, t1: t + len + GAP + 0.6 });
      t += len + GAP;
    }
    seg.sweepAt = t + 0.2; A.push({ at: t + 0.2, soft: 'sweep' });
    t += 1.1;
    seg.t1 = t; T.push(seg); prev = seg;
  });
  if (opts.bare) return { T, A, len: t };
  // a finished game ends with the slot machine and a finale (ending.js); an unfinished one with the scores so far
  if (rec.finished && rec.totals) {
    let into = null;
    if (prev) { into = { t0: t, t1: t + 0.5, swish: true, a: prev }; T.push(into); A.push({ at: t, sfx: 'whoosh' }); t += 0.5; }
    const seg = { t0: t }; t = hlEndSeg(rec, seg, clips, A, t); T.push(seg); if (into) into.b = seg;
    return { T, A, len: t };
  }
  T.push({ t0: t, t1: t + OUTRO, outro: true }); A.push({ at: t + 0.2, sfx: ['applause', 'fanfare', 'ta-da'][moments.length % 3] });
  return { T, A, len: t + OUTRO };
}

// fetch and decode every clip the reel needs (signed-in players only; the bucket is private)
async function hlLoadClips(rec, moments) {
  const out = {}, c = SFX.ctx || (SFX.ctx = new (window.AudioContext || window.webkitAudioContext)());
  if (!bitesLoaded()) { try { await loadBites(); } catch (e) {} }
  const jobs = [];
  for (const m of moments) for (const q of m.quotes) {
    const nm = hlVoice(rec, q.p), key = nm + '|' + normLine(q.line), list = BITES[nm] && BITES[nm][normLine(q.line)];
    if (!list || !list.length || key in out) continue;
    out[key] = null;
    const b = list[0];
    jobs.push((async () => {
      try {
        if (!b.buf) {
          if (!b.ab && b.url) { const r = await fetch(b.url); if (r.ok) b.ab = await r.arrayBuffer(); }
          if (b.ab) b.buf = await c.decodeAudioData(b.ab.slice(0));
        }
        if (b.buf) { if (b.sp == null) b.sp = speechEnd(b.buf); out[key] = Object.assign(b.buf, { sp: b.sp }); }
      } catch (e) {}
    })());
  }
  await Promise.all(jobs);
  return out;
}

// ---------- drawing one frame: the table's own look (Kennedy, Nov 9: the first reel looked sterile) ----------
// Same rose-filigree background, devil-heart outline in the middle, seat plates and card design as the table.
// Pictures are the game's own: the logo comes from the page (it's already inlined once), the rest are small.
const HL_SRC = { port: 'brand/bg-port.webp', land: 'brand/bg-land.webp', heart: 'brand/heart.webp', tex: 'brand/tex.webp' };
const HL_DH = [new Path2D('M11 18C4.8 13.6 2 10.6 2 7.2 2 4.6 4 2.6 6.4 2.6c1.9 0 3.6 1.1 4.6 2.7 1-1.6 2.7-2.7 4.6-2.7C18 2.6 20 4.6 20 7.2c0 3.4-2.8 6.4-9 10.8z'), new Path2D('M21.8 18.1l-4.1-.1 1.9 3.4z')];
const HL_DH_TAIL = new Path2D('M11 17.4c.4 3.2 3.8 4.4 7.3 2.5');
function hlLogo() { const im = [...document.querySelectorAll('img')].find(i => /logo/.test(i.getAttribute('src') || '') || (i.alt === 'Heartbreakers' && i.src.startsWith('data:'))); return im ? hlImg(im.src) : null; }
const HL_FONT = (w, px, fam) => `${w} ${px}px ${fam === 'caps' ? 'Montserrat, "Avenir Next", Arial, sans-serif' : 'Quicksand, "Avenir Next", Arial, sans-serif'}`;
function hlSuit(g, s, x, y, size, col) {           // a suit mark centered at x, y
  g.fillStyle = col; g.strokeStyle = col;
  if (s === 3) {                                    // the deck's devil heart, tail and all
    g.save(); g.translate(x - size / 2, y - size / 2); g.scale(size / 24, size / 24);
    HL_DH.forEach(p => g.fill(p)); g.lineWidth = 1.5; g.lineCap = 'round'; g.stroke(HL_DH_TAIL); g.restore();
  } else {
    g.font = `${size}px "Apple Symbols", "Segoe UI Symbol", "DejaVu Sans", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(SYM[s], x, y + size * 0.04);
  }
}
function hlCard(g, c, cx, cy, w, glow, alpha = 1, rot = 0, ring = null) {
  const k = w / 66, h = 94 * k, r = 9 * k, s = suit(c), col = s === 1 || s === 3 ? '#ff3d8e' : s === 0 ? '#4fe3b2' : '#ece8f2';
  const x = -w / 2, y = -h / 2;
  g.save(); g.translate(cx, cy); if (rot) g.rotate(rot); cx = 0; cy = 0; g.globalAlpha = alpha;
  g.shadowColor = glow || 'rgba(0,0,0,.55)'; g.shadowBlur = (glow ? 16 : 20) * k; g.shadowOffsetY = glow ? 0 : 8 * k;
  const grd = g.createLinearGradient(x, y, x + w * 0.18, y + h);
  grd.addColorStop(0, '#2b0f27'); grd.addColorStop(1, '#150712');
  g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = grd; g.fill();
  g.shadowColor = 'transparent';
  // the filigree texture across the lower two thirds, like the table's cards
  const tex = hlImg(HL_SRC.tex);
  if (tex) { g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.clip(); g.globalAlpha = alpha * 0.3; const tw = w * 1.1, th = tw * tex.naturalHeight / tex.naturalWidth; g.drawImage(tex, cx - tw / 2, y + h * 0.34 - th * 0.2 * (th > h * 0.66 ? 1 : 0), tw, th); g.restore(); }
  g.lineWidth = 1.5 * k; g.strokeStyle = c === QS ? 'rgba(178,140,255,.75)' : 'rgba(232,222,236,.6)';
  g.beginPath(); g.roundRect(x, y, w, h, r); g.stroke();
  if (ring) { g.lineWidth = 2.5 * k; g.strokeStyle = ring; g.beginPath(); g.roundRect(x - 1.5 * k, y - 1.5 * k, w + 3 * k, h + 3 * k, r + k); g.stroke(); }
  // corner index: rank, suit under it
  g.fillStyle = col; g.font = HL_FONT(700, 22 * k, 'caps'); g.textAlign = 'center'; g.textBaseline = 'top';
  const ix = x + 5 * k + (RL(rank(c)).length > 1 ? 13 : 8) * k;
  g.fillText(RL(rank(c)), ix, y + 5 * k);
  hlSuit(g, s, ix, y + 5 * k + 30 * k, 17 * k, col);
  // big suit bottom right
  g.globalAlpha = alpha * 0.92; hlSuit(g, s, x + w - 6 * k - 17 * k, y + h - 5 * k - 18 * k, 34 * k, col);
  g.restore();
}
function hlRng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// The table's Queen's Gambit banner (2.3 s): lettering slams in and sizzles, smoke curls up off it, sparks fly.
function hlGambit(g, x, y, e, U, rng, title = 'Queen’s Gambit', sub = 'NO WAY OUT') {
  const f = e / 2.3, KF = [[0, 0, 1.8], [.12, 1, .96], [.2, 1, 1], [.8, 1, 1.03], [1, 0, 1.08]];
  let j = 0; while (j < KF.length - 2 && f > KF[j + 1][0]) j++;
  const u = Math.max(0, Math.min(1, (f - KF[j][0]) / (KF[j + 1][0] - KF[j][0]))), op = f >= 1 ? 0 : KF[j][1] + (KF[j + 1][1] - KF[j][1]) * u, sc = KF[j][2] + (KF[j + 1][2] - KF[j][2]) * u;
  const fs = 8.6 * U, bw = fs * 6.4, bh = fs * 2.2;
  // smoke (16 puffs) and sparks (26), each on its own clock like the table's
  for (let i = 0; i < 16; i++) {
    const z = (40 + rng() * 70) * U / 3.9, px = x + (rng() - 0.5) * bw, py = y + (rng() - 0.5) * bh * 0.6, dx = (rng() - 0.5) * 60 * U / 3.9, d = 1.7 + rng() * 0.9, dl = 0.15 + rng() * 0.5, rise = (90 + rng() * 80) * U / 3.9;
    const q = (e - dl) / d; if (q <= 0 || q >= 1) continue;
    const a = q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75, s2 = 0.5 + 1.2 * q, cx = px + dx * q, cy = py - rise * q, rr = z / 2 * s2;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    grd.addColorStop(0, `rgba(220,200,210,${0.38 * a})`); grd.addColorStop(0.4, `rgba(160,120,150,${0.18 * a})`); grd.addColorStop(1, 'rgba(160,120,150,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
  }
  if (op > 0) {
    g.save(); g.translate(x, y); g.scale(sc, sc); g.globalAlpha = op;
    const bg = g.createRadialGradient(0, 0, 0, 0, 0, bw / 2);
    bg.addColorStop(0, 'rgba(12,4,12,.85)'); bg.addColorStop(0.7, 'rgba(12,4,12,.55)'); bg.addColorStop(1, 'rgba(12,4,12,0)');
    g.fillStyle = bg; g.fillRect(-bw / 2, -bh / 2 - fs * 0.4, bw, bh + fs * 0.8);
    const jx = (Math.floor(e / 0.045) % 2 ? 0.6 : -0.5) * U / 3.9, jy = (Math.floor(e / 0.045) % 2 ? -0.4 : 0.3) * U / 3.9, lit = Math.floor(e / 0.045) % 2 ? 1.35 : 0.9;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = HL_FONT(800, fs, 'caps');
    for (const [c, b] of [['#ff3d8e', 70], ['#ff3d8e', 38], ['#ff3d8e', 18], ['#ff9a3c', 6]]) { g.shadowColor = c; g.shadowBlur = b * U / 3.9 * lit; g.fillStyle = '#fff4e8'; g.fillText(title, jx, jy - fs * 0.15); }
    g.shadowBlur = 0; g.fillStyle = '#ffb877'; g.font = HL_FONT(700, fs * 0.22, 'caps');
    g.letterSpacing = `${fs * 0.066}px`; g.fillText(sub, 0, fs * 0.62); g.letterSpacing = '0px';
    g.restore();
  }
  for (let i = 0; i < 26; i++) {
    const px = x + (rng() - 0.5) * bw * sc, py = y, a = rng() * Math.PI * 2, dist = (30 + rng() * 70) * U / 3.9, d = 0.5 + rng() * 0.5, dl = rng() * 1.2;
    const q = (e - dl) / d; if (q <= 0 || q >= 1) continue;
    const qq = 1 - Math.pow(1 - q, 2), sx = px + Math.cos(a) * dist * qq, sy = py + (Math.sin(a) * dist - 20 * U / 3.9) * qq;
    g.save(); g.globalAlpha = 1 - q; g.shadowColor = '#ff3d8e'; g.shadowBlur = 12 * U / 3.9; g.fillStyle = '#ffd08a';
    g.beginPath(); g.arc(sx, sy, 1.5 * U / 3.9 * 1.4, 0, Math.PI * 2); g.fill(); g.restore();
  }
}
// The table's heartbreak: a white flash, cracks racing out from the card, shards flying off and falling.
function hlGlass(g, x, y, e, U, W, H, rng) {
  const k = U / 3.9;
  if (e < 0.38) { g.save(); g.globalAlpha = e < 0.057 ? 0.14 * e / 0.057 : 0.14 * (1 - (e - 0.057) / 0.323); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  const RAYS = 11, rays = [];
  for (let i = 0; i < RAYS; i++) {
    let a = (i / RAYS) * Math.PI * 2 + (rng() - 0.5) * 0.4, px = x, py = y; const pts = [[px, py]], total = (75 + rng() * 95) * k;
    for (let s2 = 0; s2 < 4; s2++) { a += (rng() - 0.5) * 0.45; const sg = total / 4 * (0.7 + rng() * 0.6); px += Math.cos(a) * sg; py += Math.sin(a) * sg; pts.push([px, py]); }
    rays.push(pts);
  }
  const lines = rays.slice(); for (const j of [1, 2]) for (let i = 0; i < RAYS; i++) if (rng() < 0.75) lines.push([rays[i][j], rays[(i + 1) % RAYS][j]]);
  const fade = e < 0.825 ? 1 : Math.max(0, 1 - (e - 0.825) / 0.675);
  g.save(); g.globalAlpha = fade; g.strokeStyle = 'rgba(240,244,255,.85)'; g.lineCap = 'round';
  lines.forEach((pts, i) => {
    const d0 = i < RAYS ? 0 : 0.11, dur = i < RAYS ? 0.17 : 0.12, p = Math.max(0, Math.min(1, (e - d0) / dur)); if (!p) return;
    const segs = pts.length - 1, upto = p * segs; g.lineWidth = (i < RAYS ? 1.6 : 1) * k; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let s2 = 1; s2 <= segs; s2++) { const f = Math.min(1, upto - (s2 - 1)); if (f <= 0) break; const [ax, ay] = pts[s2 - 1], [bx, by] = pts[s2]; g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); }
    g.stroke();
  });
  g.restore();
  for (let i = 0; i < 12; i++) {
    const s2 = (7 + rng() * 13) * k, hh = s2 * (0.6 + rng() * 0.8), a = rng() * Math.PI * 2, dist = (50 + rng() * 90) * k;
    const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist + (70 + rng() * 60) * k, rt = (rng() * 540 - 270) * Math.PI / 180, d = 0.75 + rng() * 0.45;
    const tri = [[rng(), rng()], [rng(), rng()], [rng(), rng()]], q = Math.min(1, e / d); if (q >= 1) continue;
    const qq = 1 - Math.pow(1 - q, 2.2);
    g.save(); g.translate(x + dx * qq, y + dy * qq); g.rotate(rt * qq); g.globalAlpha = 1 - q;
    const grd = g.createLinearGradient(-s2 / 2, -hh / 2, s2 / 2, hh / 2); grd.addColorStop(0, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(220,225,255,.15)');
    g.fillStyle = grd; g.beginPath(); tri.forEach(([u, v], j) => (j ? g.lineTo : g.moveTo).call(g, (u - 0.5) * s2, (v - 0.5) * hh)); g.closePath(); g.fill(); g.restore();
  }
}
function hlWrap(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
function hlCover(g, im, W, H) {
  const r = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * r, h = im.naturalHeight * r;
  g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}
function hlPlate(g, x, y, ps, nm, sub, lit, flip) {   // a seat plate: portrait, name, CPU / YOU
  const w = ps, h = ps * 1.52, top = y - h * 0.42, r = ps * 0.1;
  g.save();
  g.shadowColor = lit ? 'rgba(255,61,142,.55)' : 'transparent'; g.shadowBlur = lit ? ps * 0.18 : 0;
  g.beginPath(); g.roundRect(x - w / 2, top, w, h, r); g.fillStyle = 'rgba(26,9,23,.82)'; g.fill();
  g.shadowColor = 'transparent';
  g.lineWidth = Math.max(1.5, ps * (lit ? 0.022 : 0.012)); g.strokeStyle = lit ? '#ff3d8e' : 'rgba(214,200,214,.45)'; g.stroke();
  const im = hlImg(AVATARS[nm]), pw = w * 0.86, ph = pw * 1.25, px = x - pw / 2, py = top + w * 0.07;
  g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, r * 0.6); g.clip();
  if (im) { if (flip) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); } g.imageSmoothingEnabled = false; g.drawImage(im, px, py, pw, ph); }
  g.restore();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, ps * 0.13); g.fillText(nm, x, py + ph + ps * 0.12, w * 0.96);
  g.fillStyle = '#ff3d8e'; g.font = HL_FONT(700, ps * 0.075, 'caps'); g.fillText(sub, x, py + ph + ps * 0.25, w * 0.96);
  g.restore();
}
function hlFrame(g, W, H, rec, TL, t) {
  const U = Math.min(W, H) / 100, tall = H > W * 1.2, wide = W > H * 1.2;
  // layout per shape: tall stacks the quote under the table; wide puts it beside the table; square tightens the table
  const L = tall ? { cx: W / 2, cy: H * 0.5, sx: 39 * U, sy: 46 * U, ps: 16 * U, cw: 16 * U, qx: W / 2, qy: H * 0.9, qw: W * 0.86, capY: H * 0.12 }
    : wide ? { cx: W * 0.36, cy: H * 0.53, sx: 44 * U, sy: 33 * U, ps: 14 * U, cw: 13 * U, qx: W * 0.8, qy: H * 0.54, qw: W * 0.3, capY: H * 0.06 }
    : { cx: W / 2, cy: H * 0.44, sx: 36 * U, sy: 31 * U, ps: 12 * U, cw: 11 * U, qx: W / 2, qy: H * 0.915, qw: W * 0.84, capY: H * 0.032 };
  // background: the table's rose-filigree art, cropped to fill
  g.fillStyle = '#12060f'; g.fillRect(0, 0, W, H);
  const bgi = hlImg(W > H ? HL_SRC.land : HL_SRC.port);
  if (bgi) hlCover(g, bgi, W, H);
  const seg = TL.T.find(s => t >= s.t0 && t < s.t1) || TL.T[TL.T.length - 1];
  if (seg.ending) return hlEndDraw(g, W, H, rec, seg, t, U);
  if (seg.swish) return hlSwish(g, W, H, rec, TL, seg, t);
  const logo = hlLogo();
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (seg.intro || seg.outro) {
    g.fillStyle = 'rgba(14,4,12,.45)'; g.fillRect(0, 0, W, H);
    const a = ease((t - seg.t0) / 0.5);
    g.globalAlpha = a;
    if (logo) { const lw = Math.min(W * 0.82, 75 * U), lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.36 - lh / 2, lw, lh); }
    g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, 6.5 * U);
    if (seg.intro) {
      g.fillText('Highlights', W / 2, H * 0.56);
      g.fillStyle = '#c6b0bf'; g.font = HL_FONT(600, 3.8 * U);
      g.fillText(new Date(rec.started).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), W / 2, H * 0.62);
    } else {
      const tot = rec.totals || [0, 0, 0, 0], order = [0, 1, 2, 3].sort((a, b) => tot[a] - tot[b]);
      g.fillText(rec.finished ? 'Final scores' : 'Scores so far', W / 2, H * 0.53);
      g.font = HL_FONT(700, 4.4 * U);
      order.forEach((p, k) => { g.fillStyle = k === 0 ? '#ff3d8e' : '#f6edf2'; g.fillText(`${hlLabel(rec, p)}  ${tot[p]}`, W / 2, H * 0.61 + k * 6.4 * U); });
    }
    g.globalAlpha = 1;
    return;
  }
  const m = seg.m, { cx: tx, cy, sx, sy, ps } = L;
  g.save();
  if (seg.gambitAt != null && t >= seg.gambitAt && t < seg.gambitAt + 0.5) {   // the table shakes when the queen is led
    const f = (t - seg.gambitAt) / 0.5, ks = [[0, 0, 0], [.15, -9, 3], [.3, 8, -4], [.45, -6, 2], [.6, 5, -2], [.75, -3, 1], [1, 0, 0]];
    let j = 0; while (j < ks.length - 2 && f > ks[j + 1][0]) j++;
    const u = (f - ks[j][0]) / (ks[j + 1][0] - ks[j][0]), k1 = U / 3.9;
    g.translate((ks[j][1] + (ks[j + 1][1] - ks[j][1]) * u) * k1, (ks[j][2] + (ks[j + 1][2] - ks[j][2]) * u) * k1);
  }
  if (seg.bangAt != null && t >= seg.bangAt && t < seg.bangAt + 0.5) {   // the shot shakes it harder
    const e = t - seg.bangAt, a = Math.exp(-e * 9) * 3.2 * U;
    g.translate(Math.sin(e * 90) * a, Math.cos(e * 73) * a * 0.7);
  }
  // the table's devil-heart outline behind the trick
  const hi = hlImg(HL_SRC.heart);
  if (hi) { g.save(); g.globalAlpha = 0.16; const hw = L.cw * 1.9, hh = hw * hi.naturalHeight / hi.naturalWidth; g.drawImage(hi, tx - hw / 2, cy - hh / 2, hw, hh); g.restore(); }
  const seatXY = [[tx, cy + sy], [tx - sx, cy], [tx, cy - sy], [tx + sx, cy]];
  for (let p = 0; p < 4; p++) {
    const [x, y] = seatXY[p], nm = hlVoice(rec, p);
    const speaking = seg.quotes.some(qq => qq.q.p === p && t >= qq.t0 && t < qq.t1);
    const k = seg.cardsAt.findIndex(a => t < a), turn = k >= 0 && m.trick.cards[k].p === p && t > seg.t0 + 0.15;
    const flip = (FACING[nm] === 'right' && p === 3) || (FACING[nm] === 'left' && p === 1);
    const focus = seg.moon && t > seg.ringAt;   // the finale: her seat lit, the others dimmed
    g.save(); if (focus && p !== m.who) g.globalAlpha = 1 - 0.55 * hlClamp((t - seg.ringAt) / 0.5);
    hlPlate(g, x, y, ps, nm, p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', speaking || turn || (focus && p === m.who), flip);
    g.restore();
  }
  // the trick, the table's way: each card slides into its slot (the Q♠ drops in and bounces, glowing violet),
  // the winner's card gets a bone ring, then the cards gather in the middle, tilt, and fly off to whoever took them
  const cw = L.cw, off = [[0, 1], [-1, 0], [0, -1], [1, 0]], rng = hlRng(seg.i * 97 + 13);
  if (seg.moon) hlMoonDraw(g, W, H, rec, seg, t, L, U, seatXY);
  else {
  const tilt = m.trick.cards.map(() => rng() * 18 - 9);
  const done4 = seg.cardsAt[3] + 0.3, wxy = seatXY[m.trick.w];
  m.trick.cards.forEach((x, k) => {
    const at = seg.cardsAt[k]; if (t < at) return;
    const [ox, oy] = off[x.p], sx0 = tx + ox * cw * 1.32, sy0 = cy + oy * cw * 1.12;
    let px = sx0, py = sy0, sc = 1, rot = 0, al = 1, e = t - at;
    if (x.c === QS) {                                  // qsBounce: from above, bounce, settle (1 s)
      const f = Math.min(1, e / 1), ky = [[0, -80, 1.2, 0, 0], [.28, 0, 1, 0, 1], [.44, -24, 1.05, -3, 1], [.6, 0, 1, 0, 1], [.72, -10, 1, 2, 1], [.84, 0, 1, 0, 1], [.93, -3, 1, 0, 1], [1, 0, 1, 0, 1]];
      let j = 0; while (j < ky.length - 2 && f > ky[j + 1][0]) j++;
      const a0 = ky[j], a1 = ky[j + 1], u = (f - a0[0]) / (a1[0] - a0[0] || 1), q = 1 - Math.pow(1 - u, 2), lerp = (i) => a0[i] + (a1[i] - a0[i]) * q;
      py += lerp(1) * cw / 66; sc = lerp(2); rot = lerp(3) * Math.PI / 180; al = lerp(4);
    } else {                                           // in0–in3: slide 80–90px from the seat's side, .28 s ease-out
      const u = Math.min(1, e / 0.28), q = 1 - Math.pow(1 - u, 2), d = (x.p === 0 ? 90 : 80) * cw / 66 * (1 - q);
      px += ox * d; py += oy * d; al = q;
    }
    // sweep (.86 s, 40 ms apart): gather at the middle with a tilt, hold, then off to the winner, shrinking
    const sw0 = seg.sweepAt + k * 0.04;
    if (seg.sweepAt != null && t > sw0) {
      const f = Math.min(1, (t - sw0) / 0.86), E = v => v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
      const gx = tx + (k - 1.5) * 4 * cw / 66, gy = cy + (1.5 - k) * 3 * cw / 66;
      if (f < 0.36) { const q = E(f / 0.36); px += (gx - px) * q; py += (gy - py) * q; rot += tilt[k] * Math.PI / 180 * q; }
      else if (f < 0.5) { px = gx; py = gy; rot += tilt[k] * Math.PI / 180 * (1 - 0.4 * (f - 0.36) / 0.14); }
      else { const q = E((f - 0.5) / 0.5); px = gx + (wxy[0] - gx) * q; py = gy + (wxy[1] - gy) * q; rot += tilt[k] * Math.PI / 180 * (0.6 - 0.3 * q); sc *= 1 - 0.7 * q; al *= 1 - q; }
    }
    const qsGlow = x.c === QS ? Math.max(0.35, e < 0.72 ? 1 : 1 - (e - 0.72) / 0.88) : 0;
    const won = t > done4 + 0.1 && x.p === m.trick.w;
    hlCard(g, x.c, px, py, cw * sc, qsGlow ? `rgba(178,140,255,${0.9 * qsGlow})` : null, al, rot, won ? 'rgba(246,237,242,.95)' : null);
  });
  if (seg.glassAt != null && t >= seg.glassAt && t < seg.glassAt + 1.6) {
    const x = m.trick.cards[seg.glassK], [ox, oy] = off[x.p];
    hlGlass(g, tx + ox * cw * 1.32, cy + oy * cw * 1.12, t - seg.glassAt, U, W, H, hlRng(seg.i * 31 + 7));
  }
  }
  // caption
  g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, 3.5 * U, 'caps'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 2 * U;
  g.fillText(hlCaption(rec, m).toUpperCase(), wide ? tx : W / 2, L.capY);
  g.restore();
  if (logo && tall) { const lw = 46 * U, lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.025, lw, lh); }
  g.restore();
  if (seg.gambitAt != null && t >= seg.gambitAt && t < seg.gambitAt + 3.2) hlGambit(g, W / 2, H * (tall ? 0.44 : 0.46), t - seg.gambitAt, U, hlRng(seg.i * 53 + 3));
  if (seg.bangAt != null) {
    const e = t - seg.bangAt;
    if (e >= 0 && e < 0.14) { g.save(); g.globalAlpha = 0.55 * (1 - e / 0.14); g.fillStyle = '#fff6ee'; g.fillRect(0, 0, W, H); g.restore(); }
    if (e >= HLMS.BANNER && e < HLMS.BANNER + 2.4) hlGambit(g, wide ? tx : W / 2, cy + (seg.mfaceR || 0) * 1.95, e - HLMS.BANNER, U, hlRng(seg.i * 53 + 3), 'Shot the Moon', hlLabel(rec, m.who).toUpperCase());
  }
  // the quote being said, in the table's bubble style
  const cur = seg.quotes.filter(qq => t >= qq.t0 && t < qq.t1).pop();
  if (cur) {
    const a = ease((t - cur.t0) / 0.2);
    g.globalAlpha = a;
    g.font = HL_FONT(700, 4.4 * U);
    const maxW = Math.min(L.qw, 92 * U), lines = hlWrap(g, `“${hlStrip(cur.q.line)}”`, maxW - 7 * U);
    const lh = 5.6 * U, bh = lines.length * lh + 9.5 * U, bw = Math.min(maxW, Math.max(...lines.map(l => g.measureText(l).width)) + 9 * U);
    const by = Math.min(H - bh - 2 * U, L.qy - bh / 2), qx = L.qx;
    g.save();
    g.fillStyle = 'rgba(246,237,242,.5)';   // Kennedy, Nov 9: 50% see-through g.beginPath(); g.roundRect(qx - bw / 2, by, bw, bh, 3.4 * U); g.fill(); g.restore();
    g.fillStyle = '#c2185b'; g.font = HL_FONT(700, 2.8 * U, 'caps');
    g.fillText(hlVoice(rec, cur.q.p).toUpperCase(), qx, by + 3.8 * U);
    g.fillStyle = '#2a0b22'; g.font = HL_FONT(700, 4.4 * U);
    lines.forEach((l, k) => g.fillText(l, qx, by + 8.8 * U + k * lh));
    g.globalAlpha = 1;
  }
}

// the jump between moments that aren't back to back: the old table whips off to the left, the next one whips in
// from the right with a little motion blur, and a pink streak of light sweeps across (.5 s, with the passing whoosh)
function hlSwish(g, W, H, rec, TL, seg, t) {
  const shot = (at) => { const c = document.createElement('canvas'); c.width = W; c.height = H; hlFrame(c.getContext('2d'), W, H, rec, TL, at); return c; };
  if (!seg.shots || seg.shots.W !== W || seg.shots.H !== H) seg.shots = { W, H, a: shot(seg.a.t1 - 0.001), b: shot(seg.b.t0 + 0.001) };
  const f = Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0)));
  const E = v => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2), e = E(f);
  const v = Math.abs(E(Math.min(1, f + 0.02)) - E(Math.max(0, f - 0.02))) / 0.04;   // speed, for the blur
  const blur = (c, x) => {
    g.globalAlpha = 1; g.drawImage(c, x, 0);
    for (let k = 1; k <= 3; k++) { g.globalAlpha = 0.22 / k; g.drawImage(c, x + k * v * W * 0.012, 0); }
    g.globalAlpha = 1;
  };
  blur(seg.shots.a, -e * W);
  blur(seg.shots.b, (1 - e) * W);
  // the streak: a slanted band of pink light crossing right to left, brightest mid-swish
  const sx = W * (1.25 - 1.5 * f), bw = W * 0.22, a = Math.sin(Math.PI * f);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85 * a;
  g.translate(sx, H / 2); g.transform(1, 0, -0.35, 1, 0, 0);
  const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  gr.addColorStop(0, 'rgba(255,61,142,0)'); gr.addColorStop(0.4, 'rgba(255,61,142,.55)'); gr.addColorStop(0.5, 'rgba(255,225,240,.9)');
  gr.addColorStop(0.6, 'rgba(255,61,142,.55)'); gr.addColorStop(1, 'rgba(255,61,142,0)');
  g.fillStyle = gr; g.fillRect(-bw / 2, -H, bw, H * 2);
  g.restore();
}


// ---------- shooting the moon (Kennedy, Nov 9) ----------
// A fast-forward of every trick she took points in (cards only: no quotes, no effects), her point cards piling up
// by her seat; then it slows down: the hearts and the Q♠ fly up and fan into a full circle around a glowing moon,
// a gloved hand with stiletto nails swings in a pink chrome revolver, cocks it, and fires through the middle.
// The cards blow outward, the moon cracks around a smoking bullet hole, “Shot the Moon” slams in, she blows the smoke away.
const HLM = { FF: 0.4, FF0: 0.25, PAUSE: 0.45, RING: 1.0, GUN: 0.7, COCK: 1.75, BANG: 2.6 };
function hlMoonSeg(rec, seg, clips, A, t, opts = {}) {
  // Kennedy, Nov 9: the fast-forward is only for replays; in the game she goes straight to the circle and the shot
  const m = seg.m, ff = m.ff && m.ff.length ? m.ff : [m.trick], skipFF = !!opts.bare;
  seg.moon = true; seg.ff = skipFF ? [] : ff.map((tr, k) => ({ tr, at: t + HLM.FF0 + k * HLM.FF }));
  seg.ff.forEach(f => { A.push({ at: f.at + 0.04, soft: 'card' }); A.push({ at: f.at + 0.19, soft: 'sweep' }); });
  seg.pts = [];   // her point cards, in the order she took them: [{c, at (when it reached her pile)}]
  ff.forEach((tr, k) => tr.cards.forEach(x => { if (suit(x.c) === 3 || x.c === QS) seg.pts.push({ c: x.c, at: skipFF ? t : seg.ff[k].at + HLM.FF }); }));
  const F0 = skipFF ? t + 0.35 : t + HLM.FF0 + ff.length * HLM.FF + HLM.PAUSE;
  seg.ringAt = F0;
  // the choir and her moon line start as the cards fly into the circle; the gun fires once she's done talking
  A.push({ at: F0, sfx: 'choir-ahh' });
  let q0 = F0 + 0.15;
  for (const q of m.quotes) {
    const buf = clips[hlVoice(rec, q.p) + '|' + normLine(q.line)] || null;
    const len = buf ? (buf.sp != null ? buf.sp : buf.duration) : 1.8;
    if (buf) A.push({ at: q0, buf });
    seg.quotes.push({ q, t0: q0, t1: q0 + len + 0.6 });
    q0 += len + 0.25;
  }
  seg.bangAt = F0 + HLM.BANG;   // Kennedy: the shot doesn't wait for her line
  seg.gunAt = seg.bangAt - (HLM.BANG - HLM.RING + 0.1); seg.cockAt = seg.bangAt - (HLM.BANG - HLM.COCK);
  A.push({ at: seg.cockAt, sfx: 'cock' }); A.push({ at: seg.bangAt, sfx: 'shot', gain: 1.6 });
  seg.gustAt = seg.bangAt + 1.7; seg.gunOut = seg.bangAt + 2.5;
  seg.t1 = Math.max(seg.bangAt + 4.0, q0 + 0.6);
  return seg.t1;
}
const hlClamp = v => Math.max(0, Math.min(1, v));
const hlEaseOut = v => 1 - Math.pow(1 - hlClamp(v), 3);
const hlEaseIO = v => { v = hlClamp(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

// The revolver, in profile, muzzle to the right. Units: the gun's length is 1, origin at the web of the hand.
// cock: 0 = hammer down, 1 = pulled back. Drawn into whatever transform the caller set.
function hlRevolver(g, cock, lw) {
  const chrome = (y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#ffe6f2'); gr.addColorStop(0.22, '#ff8cc6'); gr.addColorStop(0.48, '#a3215f'); gr.addColorStop(0.56, '#ffd3ea');
    gr.addColorStop(0.8, '#ff5fa8'); gr.addColorStop(1, '#4d0b2c'); return gr; };
  const ink = '#1c0616';
  g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = ink;
  const shape = (f, fill) => { g.beginPath(); f(); g.fillStyle = fill; g.fill(); g.stroke(); };
  // ejector rod housing under the barrel, then the barrel with its top rib and front sight
  shape(() => { g.moveTo(0.16, 0.012); g.lineTo(0.62, 0.012); g.quadraticCurveTo(0.68, 0.04, 0.62, 0.07); g.lineTo(0.16, 0.07); g.closePath(); }, chrome(0.012, 0.07));
  shape(() => { g.moveTo(0.14, -0.1); g.lineTo(0.8, -0.095); g.lineTo(0.8, 0.016); g.lineTo(0.14, 0.018); g.closePath(); }, chrome(-0.1, 0.018));
  shape(() => { g.moveTo(0.73, -0.095); g.lineTo(0.765, -0.135); g.lineTo(0.785, -0.135); g.lineTo(0.792, -0.095); g.closePath(); }, '#ffb3d9');
  g.save(); g.globalAlpha = 0.7; g.strokeStyle = '#fff'; g.lineWidth = lw * 1.1;
  g.beginPath(); g.moveTo(0.2, -0.078); g.lineTo(0.77, -0.075); g.stroke(); g.restore();
  // the bore
  g.beginPath(); g.ellipse(0.8, -0.04, 0.01, 0.03, 0, 0, Math.PI * 2); g.fillStyle = '#0b0208'; g.fill();
  // frame
  shape(() => { g.moveTo(-0.23, -0.055); g.quadraticCurveTo(-0.15, -0.115, -0.05, -0.112); g.lineTo(0.16, -0.105); g.lineTo(0.16, 0.08);
    g.lineTo(0.06, 0.105); g.lineTo(-0.11, 0.105); g.quadraticCurveTo(-0.19, 0.1, -0.235, 0.05); g.closePath(); }, chrome(-0.1, 0.105));
  // cylinder with its flutes (they slide over by a chamber as the hammer comes back)
  shape(() => { g.roundRect(-0.05, -0.11, 0.2, 0.2, 0.035); }, chrome(-0.11, 0.09));
  g.save(); g.beginPath(); g.roundRect(-0.05, -0.11, 0.2, 0.2, 0.035); g.clip();
  g.strokeStyle = 'rgba(60,8,36,.75)'; g.lineWidth = lw * 1.6;
  for (let i = 0; i < 4; i++) { const y = -0.09 + ((i * 0.055 + cock * 0.055) % 0.22); g.beginPath(); g.moveTo(-0.02, y); g.lineTo(0.12, y); g.stroke(); }
  g.restore();
  // trigger guard and trigger
  g.lineWidth = lw * 2.2; g.strokeStyle = ink; g.beginPath(); g.ellipse(-0.02, 0.135, 0.075, 0.05, 0, 0, Math.PI); g.stroke();
  g.lineWidth = lw * 1.3; g.strokeStyle = '#ff9ccf'; g.beginPath(); g.ellipse(-0.02, 0.135, 0.075, 0.05, 0, 0, Math.PI); g.stroke();
  g.lineWidth = lw * 2; g.strokeStyle = '#ff7fbf'; g.beginPath(); g.moveTo(-0.005, 0.105); g.quadraticCurveTo(0.0, 0.15, -0.035, 0.17); g.stroke();
  g.lineWidth = lw; g.strokeStyle = ink;
  // hammer, pivoting back when cocked
  g.save(); g.translate(-0.17, -0.045); g.rotate(-0.75 * cock);
  shape(() => { g.moveTo(0.03, 0.0); g.lineTo(-0.01, -0.06); g.quadraticCurveTo(-0.05, -0.1, -0.09, -0.095); g.lineTo(-0.07, -0.065); g.lineTo(-0.04, 0.02); g.closePath(); }, chrome(-0.1, 0.02));
  g.restore();
  // pearl grip with a little pink medallion
  const pg = g.createLinearGradient(-0.32, 0.05, -0.12, 0.4); pg.addColorStop(0, '#fff6fb'); pg.addColorStop(0.5, '#f2c6dc'); pg.addColorStop(1, '#c98aab');
  shape(() => { g.moveTo(-0.22, 0.0); g.bezierCurveTo(-0.27, 0.12, -0.31, 0.25, -0.36, 0.38); g.quadraticCurveTo(-0.3, 0.44, -0.21, 0.42);
    g.bezierCurveTo(-0.17, 0.3, -0.12, 0.2, -0.085, 0.105); g.closePath(); }, pg);
  g.beginPath(); g.arc(-0.215, 0.2, 0.022, 0, Math.PI * 2); g.fillStyle = '#ff3d8e'; g.fill(); g.stroke();
}
// The hand: black satin glove, long hot-pink stiletto nails; thumb along the top, fingers wrapped round the grip,
// index finger on the trigger. Drawn over the gun in the same units.
function hlHand(g, lw) {
  const satin = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#5a2a4c'); gr.addColorStop(0.35, '#1d0a18'); gr.addColorStop(1, '#070206'); return gr; };
  const ink = '#0a0208';
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = ink; g.lineWidth = lw;
  const nail = (x, y, a, len) => { len *= 1.5;   // an almond-to-stiletto nail from a fingertip at (x, y), pointing at angle a
    g.save(); g.translate(x, y); g.rotate(a);
    const gr = g.createLinearGradient(0, -0.012, 0, 0.012); gr.addColorStop(0, '#ffc0e0'); gr.addColorStop(0.45, '#ff2f8a'); gr.addColorStop(1, '#8a0f4c');
    g.beginPath(); g.moveTo(0, -0.013); g.quadraticCurveTo(len * 0.6, -0.012, len, 0); g.quadraticCurveTo(len * 0.6, 0.012, 0, 0.013); g.closePath();
    g.fillStyle = gr; g.fill(); g.stroke();
    g.globalAlpha = 0.85; g.strokeStyle = '#fff'; g.lineWidth = lw * 0.7; g.beginPath(); g.moveTo(len * 0.12, -0.006); g.lineTo(len * 0.62, -0.004); g.stroke();
    g.restore();
  };
  const finger = (pts, w) => {   // a gloved finger along a short path
    g.save(); g.lineWidth = w + lw * 2; g.strokeStyle = ink; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.lineWidth = w; g.strokeStyle = satin(pts[0][0], pts[0][1] - w, pts[0][0], pts[0][1] + w); g.stroke();
    g.lineWidth = w * 0.25; g.strokeStyle = 'rgba(160,100,140,.55)'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y - w * 0.22) : g.moveTo(x, y - w * 0.22))); g.stroke();
    g.restore();
  };
  // forearm and cuff, coming in from below and behind
  g.beginPath(); g.moveTo(-0.26, 0.3); g.lineTo(-0.62, 0.78); g.lineTo(-0.44, 0.9); g.lineTo(-0.12, 0.38); g.closePath();
  g.fillStyle = satin(-0.5, 0.6, -0.3, 0.75); g.fill(); g.stroke();
  g.save(); g.lineWidth = lw * 3; g.strokeStyle = '#ff3d8e'; g.beginPath(); g.moveTo(-0.37, 0.5); g.lineTo(-0.22, 0.6); g.stroke();
  g.lineWidth = lw * 1.2; g.strokeStyle = '#ffd3ea'; g.beginPath(); g.moveTo(-0.4, 0.55); g.lineTo(-0.25, 0.65); g.stroke(); g.restore();
  // palm over the back of the grip
  g.beginPath(); g.moveTo(-0.25, -0.02); g.bezierCurveTo(-0.33, 0.06, -0.37, 0.24, -0.34, 0.4); g.lineTo(-0.16, 0.44);
  g.bezierCurveTo(-0.12, 0.3, -0.13, 0.16, -0.1, 0.1); g.quadraticCurveTo(-0.16, 0.02, -0.25, -0.02); g.closePath();
  g.fillStyle = satin(-0.33, 0.0, -0.15, 0.4); g.fill(); g.stroke();
  // middle, ring and little fingers wrapped round the front of the grip, tips curling back with their nails
  [[0.16, 0.035], [0.25, 0.032], [0.33, 0.028]].forEach(([y, w], i) => {
    const x0 = -0.08 - i * 0.045;
    finger([[x0 + 0.03, y - 0.02], [x0 - 0.02, y + 0.005], [x0 - 0.1, y + 0.01]], w);
    nail(x0 - 0.1 - w * 0.3, y + 0.012, Math.PI + 0.12, 0.07 - i * 0.008);
  });
  // index finger along the guard onto the trigger
  finger([[-0.1, 0.11], [-0.04, 0.12], [0.0, 0.14]], 0.03);
  nail(0.012, 0.145, 0.55, 0.06);
  // thumb along the top of the frame, nail pointing forward
  finger([[-0.25, 0.0], [-0.17, -0.02], [-0.09, -0.015]], 0.032);
  nail(-0.075, -0.016, 0.05, 0.065);
}

// where the gun sits: below the circle on the shooter's side, aimed at the middle
// First person (Kennedy, Nov 9): the hand is close to us at the bottom of the screen and the barrel reaches
// up into the scene toward the circle, foreshortened (the far end draws smaller), as if we're the one aiming.
const HLG = { P: 0.5, U0: -0.75, U1: 1.05, V0: -0.75, V1: 1.0, AX: -0.04 };   // perspective strength, sprite bounds (gun units), bore line
const hlGunX = u => Math.log(1 + HLG.P * (u - HLG.U0)) / HLG.P;   // distance along the axis on screen (gun units, before scale)
const hlGunF = u => 1 / (1 + HLG.P * (u - HLG.U0));               // how big things are at that depth
function hlGunPose(L, W, H, who, R, cw) {
  const tall = H > W * 1.2, right = who === 2 || who === 3, sgn = right ? 1 : -1;
  const wide = W > H * 1.2, gx = L.cx + sgn * (tall ? 0.3 : wide ? 0.22 : 0.3) * W, gy = H * (tall ? 0.86 : wide ? 0.8 : 0.84);   // the hand, low on our side
  let dx = L.cx - gx, dy = L.cy - gy; const d = Math.hypot(dx, dy); dx /= d; dy /= d;
  const reach = d - (R + cw * 0.45);                                   // the muzzle stops just outside the circle
  const S = reach / (hlGunX(0.8) - hlGunX(0));                         // pixels per gun unit at the hand
  return { gx, gy, dx, dy, rot: Math.atan2(dy, dx), flip: dx < 0 ? -1 : 1, S };
}
// the gun drawn flat (profile) into a scratch canvas, then laid onto the screen in strips that shrink with distance
let HL_GUNC = null;
function hlGunDraw(g, P, cock, kick, U) {
  const res = Math.min(2, Math.max(1, P.S / 260)), Sp = P.S / res;    // scratch pixels per gun unit
  const Wc = Math.ceil((HLG.U1 - HLG.U0) * Sp), Hc = Math.ceil((HLG.V1 - HLG.V0) * Sp);
  if (!HL_GUNC) HL_GUNC = document.createElement('canvas');
  const c = HL_GUNC; if (c.width !== Wc || c.height !== Hc) { c.width = Wc; c.height = Hc; }
  const q = c.getContext('2d'); q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, Wc, Hc);
  q.setTransform(Sp, 0, 0, Sp, -HLG.U0 * Sp, -HLG.V0 * Sp);
  q.rotate(-0.45 * kick); q.translate(-0.1 * kick, 0);                  // recoil: muzzle flips up, gun jumps back
  q.shadowColor = 'rgba(255,61,142,.45)'; q.shadowBlur = 0.03 * Sp;
  hlRevolver(q, cock, 0.006); q.shadowBlur = 0; hlHand(q, 0.006);
  g.save(); g.translate(P.gx, P.gy); g.rotate(P.rot); g.scale(1, P.flip);
  const ax = (HLG.AX - HLG.V0) * Sp, x0 = hlGunX(0), step = 2;
  for (let i = 0; i < Wc; i += step) {
    const u = HLG.U0 + i / Sp, f = hlGunF(u), X = (hlGunX(u) - x0) * P.S;
    g.drawImage(c, i, 0, step, Hc, X, -ax * f * res, step * f * res + 0.8, Hc * f * res);
  }
  g.restore();
  // where the muzzle ended up (recoil included), for the flash, tracer and smoke
  const a = -0.45 * kick, mu = 0.8 * Math.cos(a) - (-0.04) * Math.sin(a) - 0.1 * kick, mv = 0.8 * Math.sin(a) + (-0.04) * Math.cos(a);
  const X = (hlGunX(mu) - x0) * P.S, Y = (mv - HLG.AX) * hlGunF(mu) * P.S * P.flip;
  return { x: P.gx + X * Math.cos(P.rot) - Y * Math.sin(P.rot), y: P.gy + X * Math.sin(P.rot) + Y * Math.cos(P.rot) };
}

// Kennedy, Nov 9: the cards land in the deck's devil heart, not a circle: a heart outline (16 sin³t, 13 cos t − 5 cos 2t −
// 2 cos 3t − cos 4t), a card on each horn and two on the tail, the Q♠ as the arrow tip. Units: y down, the heart's
// biggest inscribed circle (r 8.3, centre 3.5 below the dip) sits on the moon at cx, cy.
const HL_HEART = (() => {
  const P = [], M = 720;
  for (let i = 0; i <= M; i++) { const t = i / M * Math.PI * 2; P.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 3.5]); }
  const C = [0]; for (let i = 1; i < P.length; i++) C.push(C[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, C, len: C[C.length - 1], inR: 8.3 };
})();
function hlDevilSlots(N) {   // [{x, y, rot}] in heart units; the last slot is the tail's arrow tip
  const extra = N >= 8 ? 5 : 0, M = N - extra, H = HL_HEART, out = [];
  for (let j = 0; j < M; j++) {
    const want = (j + 0.5) / M * H.len; let i = 1; while (i < H.C.length - 1 && H.C[i] < want) i++;
    const [x, y] = H.P[i], tx = H.P[i][0] - H.P[i - 1][0], ty = H.P[i][1] - H.P[i - 1][1];
    let nx = ty, ny = -tx; if (nx * x + ny * y < 0) { nx = -nx; ny = -ny; }   // outward
    out.push({ x, y, rot: Math.atan2(ny, nx) });   // laid end to end along the line
  }
  if (extra) {
    out.push({ x: -12.5, y: -21, rot: -0.5 }, { x: 12.5, y: -21, rot: 0.5 });   // horns, pointing up and out
    // tail: three cards chained from the bottom point, swooping down and round to the right, the last one the arrow tip
    const B = u => [2 * (1 - u) * u * 7 + u * u * 26, (1 - u) ** 2 * 13.5 + 2 * (1 - u) * u * 32 + u * u * 4];
    const gap = H.len / M, Q = []; let acc = 0, prev = B(0);
    for (let i = 1; i <= 400; i++) { const q = B(i / 400); acc += Math.hypot(q[0] - prev[0], q[1] - prev[1]); Q.push([acc, q, prev]); prev = q; }
    for (const d of [0.62, 1.6, 2.6].map(f => f * gap)) {
      const [, [x, y], [px, py]] = Q.find(e => e[0] >= d) || Q[Q.length - 1];
      out.push({ x, y, rot: Math.atan2(y - py, x - px) + Math.PI / 2 });
    }
  }
  return out;
}
function hlMoonDraw(g, W, H, rec, seg, t, L, U, seatXY) {
  const cw = L.cw, cx = L.cx, cy = L.cy, who = seg.m.who, rng = hlRng(seg.i * 71 + 5), tau = t;
  const off = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const pile = seatXY[who], toC = [cx - pile[0], cy - pile[1]], dC = Math.hypot(...toC) || 1;
  const pileX = pile[0] + toC[0] / dC * cw * 1.05, pileY = pile[1] + toC[1] / dC * cw * 1.05;
  // ---- the fast-forward: each trick zips in and sweeps off to whoever took it
  const ffEnd = seg.ff.length ? seg.ff[seg.ff.length - 1].at + HLM.FF : seg.t0;
  if (t < ffEnd + 0.05) {
    for (const f of seg.ff) {
      const e = t - f.at; if (e < 0 || e > HLM.FF) continue;
      const w = seatXY[f.tr.w];
      f.tr.cards.forEach((x, k) => {
        const at = k * 0.035, ee = e - at; if (ee < 0) return;
        const [ox, oy] = off[x.p], sx0 = cx + ox * cw * 1.32, sy0 = cy + oy * cw * 1.12;
        const u = hlEaseOut(ee / 0.08); let px = sx0 + ox * 60 * cw / 66 * (1 - u), py = sy0 + oy * 60 * cw / 66 * (1 - u), sc = 1, al = u;
        const sw = e - 0.19 - k * 0.015;
        if (sw > 0) { const q = hlEaseIO(sw / 0.17); px += (w[0] - px) * q; py += (w[1] - py) * q; sc = 1 - 0.65 * q; al *= 1 - q * 0.9; }
        hlCard(g, x.c, px, py, cw * sc, x.c === QS ? 'rgba(178,140,255,.8)' : null, al);
      });
    }
    // the fast-forward badge, blinking like a VCR
    if (t < ffEnd) {
      g.save(); g.globalAlpha = Math.floor(t / 0.35) % 2 ? 0.95 : 0.6; g.fillStyle = '#f6edf2'; g.font = HL_FONT(800, 3.2 * U, 'caps');
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff3d8e'; g.shadowBlur = 2 * U;
      g.fillText('▶▶  FAST-FORWARD', W / 2, L.capY + 5.2 * U); g.restore();
    }
  }
  // ---- her point cards: on her pile as they arrive, then up into the circle, then blown away by the shot
  let rcw; const N = seg.pts.length, ring = seg.ringAt, bang = seg.bangAt; const hs = Math.min(W * 0.6 / 38, H * 0.52 / 46), R = 15 * hs;
  rcw = Math.min(cw * 0.85, HL_HEART.len / Math.max(1, N - 5) * hs * 0.88 / 1.4);   // a big heart, the cards sized to almost meet end to end
  const mir = who === 2 || who === 3 ? -1 : 1;   // the gun comes from the right for these seats: the tail swings left, out of its way
  const slots = hlDevilSlots(N).map(q => ({ x: q.x * mir, y: q.y, rot: q.rot * mir })), qk = seg.pts.findIndex(p => p.c === QS);
  const slotOf = k => slots[N >= 8 && qk >= 0 ? (k === qk ? N - 1 : k === N - 1 ? qk : k) : k];   // the Q♠ takes the arrow tip
  // the moon inside the heart (Kennedy, Nov 9: it looked cheap after the shot; option 2 — the texture stays until
  // the cracks reach it, the cracks glow from inside, then it splits in two and light pours out of the gap)
  const moonA = hlClamp((t - ring - 0.45) / 0.5), Rd = HL_HEART.inR * hs * 0.97;
  if (moonA > 0) hlMoonSplit(g, seg, cx, cy, Rd, t, bang, ring, moonA, U);
  seg.pts.forEach((p, k) => {
    if (t < p.at) return;
    const sl = slotOf(k), breathe = t > ring + HLM.RING && t < bang ? 1 + 0.025 * Math.sin((t - ring - HLM.RING) * 5) : 1;
    const a = Math.atan2(sl.y, sl.x);   // which way it blows out from the middle
    const pileXY = [pileX + (k - N / 2) * cw * 0.09, pileY - k * cw * 0.012], ringXY = [cx + sl.x * hs * breathe, cy + sl.y * hs * breathe];
    const fly = hlEaseIO((t - ring - k * 0.035) / (HLM.RING - 0.35));
    let px = pileXY[0] + (ringXY[0] - pileXY[0]) * fly, py = pileXY[1] + (ringXY[1] - pileXY[1]) * fly - Math.sin(Math.PI * fly) * cw * 0.8;
    let rot = (k - N / 2) * 0.06 * (1 - fly) + sl.rot * fly, sc = 0.5 + (rcw / cw - 0.5) * fly, al = 1;
    if (t > bang) {   // blown outward, spinning, gone
      const e = t - bang - 0.03, d = (0.7 + rng() * 0.9) * Math.max(W, H), sp = (rng() - 0.5) * 14;
      if (e > 0) { const q = hlEaseOut(e / 1.1); px += Math.cos(a) * d * q; py += Math.sin(a) * d * q + cw * 2 * q * q; rot += sp * q; al = 1 - hlClamp(e / 1.0); }
    } else { rng(); rng(); }
    if (al <= 0) return;
    hlCard(g, p.c, px, py, cw * sc, p.c === QS ? 'rgba(178,140,255,.85)' : (fly > 0.98 ? 'rgba(255,61,142,.5)' : null), al, rot);
  });
  // ---- the gun
  if (t >= seg.gunAt && t < seg.gunOut + 0.6) {
    const P = hlGunPose(L, W, H, who, R, cw);
    const inn = hlEaseOut((t - seg.gunAt) / HLM.GUN), out = hlEaseIO((t - seg.gunOut) / 0.55);
    const slide = (1 - inn + out) * Math.max(W, H) * 0.55;            // raised into view from below, lowered away after
    P.gx -= P.dx * slide; P.gy -= P.dy * slide;
    const cock = hlEaseIO((t - seg.cockAt) / 0.18) * (t < bang ? 1 : 0);
    const e = t - bang, kick = e > 0 ? Math.exp(-e * 7) * Math.sin(Math.min(1, e / 0.04) * Math.PI / 2) : 0;
    const mz = hlGunDraw(g, P, cock, kick, U);
    if (e >= 0 && e < 0.12) hlMuzzle(g, mz.x, mz.y, P.rot, P.flip, e, U);
    if (e >= 0 && e < 0.07) {   // the tracer, muzzle to the middle
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - e / 0.07; g.strokeStyle = '#fff4d6'; g.lineWidth = 1.4 * U; g.shadowColor = '#ff9a3c'; g.shadowBlur = 3 * U;
      g.beginPath(); g.moveTo(mz.x, mz.y); g.lineTo(cx, cy); g.stroke(); g.restore();
    }
    seg.muzzle = [mz.x, mz.y];
  }
  // ---- smoke: curling off the barrel and out of the hole; a gust blows it away
  if (t > bang) hlSmoke(g, seg, t, cx, cy, U, cw);
}
// the crack around the bullet hole, spreading across the moon
// The moon: a textured face drawn once (pink maria, shaded craters, a darker limb), then per frame the cracks
// racing out from the bullet hole and glowing from inside, then the split: two halves drift apart and rotate,
// a beam of light blasting out of the gap.
const HLMS = { CRACK: 0.45, SPLIT: 0.9, OPEN: 1.5, FADE: 2.7, BANNER: 1.0 };
function hlMoonFace(Rd) {
  const S = Math.ceil(Rd * 2.4), c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), x = S / 2, y = S / 2, rng = hlRng(77);
  g.beginPath(); g.arc(x, y, Rd, 0, Math.PI * 2); g.save(); g.clip();
  const mg = g.createRadialGradient(x - Rd * 0.3, y - Rd * 0.35, Rd * 0.1, x, y, Rd);
  mg.addColorStop(0, '#fff6fb'); mg.addColorStop(0.5, '#ffc9e3'); mg.addColorStop(1, '#e46aa6');
  g.fillStyle = mg; g.fillRect(0, 0, S, S);
  // maria: soft darker seas
  for (const [a, b, r] of [[-0.3, -0.15, 0.42], [0.25, 0.3, 0.34], [0.38, -0.32, 0.22], [-0.15, 0.5, 0.2]]) {
    const m = g.createRadialGradient(x + a * Rd, y + b * Rd, 0, x + a * Rd, y + b * Rd, r * Rd);
    m.addColorStop(0, 'rgba(196,72,138,.32)'); m.addColorStop(0.7, 'rgba(196,72,138,.16)'); m.addColorStop(1, 'rgba(196,72,138,0)');
    g.fillStyle = m; g.fillRect(0, 0, S, S);
  }
  // craters: a dark bowl, a lit rim on the far side, a shadow on the near side
  const cr = [[-0.35, 0.2, 0.16], [0.3, -0.25, 0.12], [0.25, 0.38, 0.1], [-0.1, -0.45, 0.08], [0.52, 0.1, 0.07], [-0.55, -0.2, 0.06], [0.05, 0.12, 0.05], [-0.42, 0.55, 0.05], [0.12, -0.68, 0.045], [0.62, 0.42, 0.04], [-0.2, -0.05, 0.035], [0.4, 0.62, 0.03]];
  for (const [a, b, r] of cr) {
    const px = x + a * Rd, py = y + b * Rd, rr = r * Rd;
    const bowl = g.createRadialGradient(px - rr * 0.25, py - rr * 0.25, rr * 0.1, px, py, rr);
    bowl.addColorStop(0, 'rgba(150,40,100,.42)'); bowl.addColorStop(1, 'rgba(150,40,100,.12)');
    g.fillStyle = bowl; g.beginPath(); g.arc(px, py, rr, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(1, rr * 0.18);
    g.strokeStyle = 'rgba(255,245,250,.55)'; g.beginPath(); g.arc(px, py, rr * 0.92, 0.1, Math.PI * 0.95); g.stroke();
    g.strokeStyle = 'rgba(120,25,80,.45)'; g.beginPath(); g.arc(px, py, rr * 0.92, Math.PI * 1.1, Math.PI * 1.95); g.stroke();
  }
  // speckle, and the limb darkening toward the edge
  for (let i = 0; i < 160; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * Rd; g.fillStyle = rng() < 0.5 ? 'rgba(150,40,100,.12)' : 'rgba(255,255,255,.14)'; g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4, 1.4); }
  const limb = g.createRadialGradient(x, y, Rd * 0.6, x, y, Rd); limb.addColorStop(0, 'rgba(110,20,70,0)'); limb.addColorStop(1, 'rgba(110,20,70,.38)');
  g.fillStyle = limb; g.fillRect(0, 0, S, S);
  g.restore();
  g.lineWidth = Math.max(1, Rd * 0.02); g.strokeStyle = 'rgba(255,230,242,.6)'; g.beginPath(); g.arc(x, y, Rd * 0.99, 0, Math.PI * 2); g.stroke();
  return c;
}
function hlMoonPaths(seg) {   // in moon radii, from the hole at the middle: the split line top to bottom, plus branches
  if (seg.mpaths) return seg.mpaths;
  const rng = hlRng(seg.i * 13 + 1), split = [];
  for (let k = 0; k <= 10; k++) { const v = -1.15 + k * 0.23; split.push([Math.abs(v) < 0.05 ? 0 : (rng() - 0.5) * 0.16 + v * 0.12, v]); }
  const branches = [];
  for (let i = 0; i < 11; i++) {
    let a = i / 11 * Math.PI * 2 + (rng() - 0.5) * 0.5, px = 0, py = 0; const pts = [[0, 0]], len = 0.55 + rng() * 0.55;
    for (let k = 0; k < 6; k++) { a += (rng() - 0.5) * 0.6; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; pts.push([px, py]); }
    branches.push({ pts, w: 0.6 + rng() * 0.6, d: rng() * 0.12 });
  }
  return (seg.mpaths = { split, branches });
}
function hlMoonSplit(g, seg, cx, cy, Rd, t, bang, ring, moonA, U) {
  const e = t - bang, shot = e >= 0;
  if (!seg.mface || seg.mfaceR !== Rd) { seg.mface = hlMoonFace(Rd); seg.mfaceR = Rd; }
  const face = seg.mface, S = face.width, P = hlMoonPaths(seg);
  const pulse = !shot ? 1 + 0.03 * Math.sin((t - ring) * 7) * hlClamp((t - seg.cockAt) / 0.3) : 1;
  const open = shot ? hlEaseIO((e - HLMS.SPLIT) / HLMS.OPEN) : 0, gone = shot ? hlClamp((e - HLMS.FADE) / 0.9) : 0;
  g.save(); g.globalAlpha = moonA;
  // the outer glow: soft before the shot, hot just after, then handed over to the beam
  const heat = shot ? Math.exp(-e * 1.4) : 0;
  const gl = g.createRadialGradient(cx, cy, Rd * 0.2, cx, cy, Rd * 1.8 * pulse);
  gl.addColorStop(0, `rgba(255,90,170,${0.35 + 0.35 * heat})`); gl.addColorStop(1, 'rgba(255,90,170,0)');
  g.fillStyle = gl; g.globalAlpha = moonA * (1 - open * 0.6); g.beginPath(); g.arc(cx, cy, Rd * 1.8 * pulse, 0, Math.PI * 2); g.fill();
  g.globalAlpha = moonA;
  // this frame's moon: the face, plus cracks and the hole once it's shot
  let img = face;
  if (shot) {
    const c = seg.mtmp && seg.mtmp.width === S ? seg.mtmp : (seg.mtmp = document.createElement('canvas'), seg.mtmp.width = seg.mtmp.height = S, seg.mtmp);
    const q = c.getContext('2d'), o = S / 2; q.clearRect(0, 0, S, S); q.drawImage(face, 0, 0);
    q.save(); q.beginPath(); q.arc(o, o, Rd, 0, Math.PI * 2); q.clip();
    const grow = hlEaseOut(e / HLMS.CRACK), glow = 0.55 + 0.45 * hlClamp((e - 0.2) / 0.7);
    const line = (pts, frac, w) => {   // a crack: a dark seam with light leaking out of it
      const n = pts.length - 1, upto = frac * n;
      q.beginPath(); q.moveTo(o + pts[0][0] * Rd, o + pts[0][1] * Rd);
      for (let k = 1; k <= n; k++) { const f = Math.min(1, upto - (k - 1)); if (f <= 0) break; const [ax, ay] = pts[k - 1], [bx, by] = pts[k]; q.lineTo(o + (ax + (bx - ax) * f) * Rd, o + (ay + (by - ay) * f) * Rd); }
      q.lineCap = 'round'; q.lineJoin = 'round';
      q.strokeStyle = 'rgba(70,5,40,.85)'; q.lineWidth = w * 2.2; q.stroke();
      q.save(); q.globalCompositeOperation = 'lighter'; q.shadowColor = '#ff3d8e'; q.shadowBlur = w * 6 * glow;
      q.strokeStyle = `rgba(255,120,190,${0.75 * glow})`; q.lineWidth = w * 1.4; q.stroke();
      q.strokeStyle = `rgba(255,245,250,${0.9 * glow})`; q.lineWidth = w * 0.55; q.stroke(); q.restore();
    };
    const W0 = Math.max(1.2, Rd * 0.028);
    P.branches.forEach(b => line(b.pts, hlClamp((grow - b.d) / (1 - b.d)), W0 * b.w));
    const half = P.split.length >> 1, sg = hlEaseOut((e - 0.05) / (HLMS.CRACK + 0.3));
    line(P.split.slice(0, half + 1).reverse(), sg, W0 * 1.3); line(P.split.slice(half), sg, W0 * 1.3);
    // the bullet hole: ragged, burnt rim, a white-hot core for a moment
    const hr = Rd * 0.1, rng = hlRng(seg.i * 31 + 7);
    const rim = q.createRadialGradient(o, o, hr * 0.5, o, o, hr * 2.2); rim.addColorStop(0, 'rgba(60,0,30,.85)'); rim.addColorStop(1, 'rgba(60,0,30,0)');
    q.fillStyle = rim; q.beginPath(); q.arc(o, o, hr * 2.2, 0, Math.PI * 2); q.fill();
    q.fillStyle = '#12020c'; q.beginPath();
    for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI * 2, r = hr * (0.8 + rng() * 0.45); (k ? q.lineTo : q.moveTo).call(q, o + Math.cos(a) * r, o + Math.sin(a) * r); }
    q.closePath(); q.fill();
    q.save(); q.globalCompositeOperation = 'lighter'; const hot = Math.max(Math.exp(-e * 5), 0.35 * glow);
    const core = q.createRadialGradient(o, o, 0, o, o, hr * 2.6); core.addColorStop(0, `rgba(255,240,220,${hot})`); core.addColorStop(1, 'rgba(255,90,170,0)');
    q.fillStyle = core; q.beginPath(); q.arc(o, o, hr * 2.6, 0, Math.PI * 2); q.fill(); q.restore();
    q.restore();
    img = c;
  }
  // a tremble while the light builds up inside, then the split
  const tr = shot && e > 0.35 && e < HLMS.SPLIT + 0.2 ? Math.sin(e * 70) * U * 0.25 * hlClamp((e - 0.35) / 0.4) : 0;
  if (open <= 0) { g.globalAlpha = moonA; g.drawImage(img, cx - S / 2 + tr, cy - S / 2); }
  else {
    // the beam: a vertical shaft of light out of the gap, wider as the halves part, plus a bloom
    const gap = open * Rd * 1.5, beamA = hlClamp((e - HLMS.SPLIT) / 0.25) * (1 - gone * 0.8);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = moonA * beamA;
    const bw = gap * 1.1 + Rd * 0.08, bh = Rd * 7;
    const sh = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    sh.addColorStop(0, 'rgba(255,61,142,0)'); sh.addColorStop(0.3, 'rgba(255,120,190,.55)'); sh.addColorStop(0.5, 'rgba(255,250,252,.95)'); sh.addColorStop(0.7, 'rgba(255,120,190,.55)'); sh.addColorStop(1, 'rgba(255,61,142,0)');
    const fall = g.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
    fall.addColorStop(0, 'rgba(0,0,0,0)'); fall.addColorStop(0.5, 'rgba(0,0,0,1)'); fall.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.save(); g.beginPath(); g.ellipse(cx, cy, bw / 2, bh / 2, 0, 0, Math.PI * 2); g.clip(); g.fillRect(cx - bw / 2, cy - bh / 2, bw, bh); g.restore();
    const bloom = g.createRadialGradient(cx, cy, 0, cx, cy, Rd * (0.9 + open * 0.6));
    bloom.addColorStop(0, 'rgba(255,240,248,.6)'); bloom.addColorStop(0.3, 'rgba(255,90,170,.28)'); bloom.addColorStop(1, 'rgba(255,61,142,0)');
    g.fillStyle = bloom; g.beginPath(); g.arc(cx, cy, Rd * (0.9 + open * 0.6), 0, Math.PI * 2); g.fill();
    g.restore();
    // the two halves, each clipped along the split, drifting apart and turning away
    const clipHalf = (q, side) => {
      q.beginPath(); q.moveTo(side * Rd * 1.3, -Rd * 1.3);
      P.split.forEach(([u, v]) => q.lineTo(u * Rd, v * Rd));
      q.lineTo(side * Rd * 1.3, Rd * 1.3); q.closePath(); q.clip();
    };
    for (const side of [-1, 1]) {
      g.save(); g.globalAlpha = moonA * (1 - gone);
      g.translate(cx + side * gap / 2, cy + open * Rd * 0.1); g.rotate(side * open * 0.32);
      clipHalf(g, side);
      g.drawImage(img, -S / 2, -S / 2);
      // the broken edge glows hot
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,160,210,${0.8 * beamA})`; g.lineWidth = Math.max(1.5, Rd * 0.035);
      g.shadowColor = '#ff3d8e'; g.shadowBlur = Rd * 0.2; g.beginPath(); P.split.forEach(([u, v], k) => (k ? g.lineTo : g.moveTo).call(g, u * Rd, v * Rd)); g.stroke();
      g.restore();
    }
  }
  g.restore();
}
function hlMoonCrack(g, x, y, Rd, e, U, rng) {
  g.save(); g.beginPath(); g.arc(x, y, Rd, 0, Math.PI * 2); g.clip();
  const p = hlClamp(e / 0.16);
  g.strokeStyle = 'rgba(90,10,50,.8)'; g.lineCap = 'round';
  for (let i = 0; i < 13; i++) {
    let a = i / 13 * Math.PI * 2 + (rng() - 0.5) * 0.5, px = x, py = y; g.lineWidth = (1.6 - i % 3 * 0.35) * U * 0.4;
    g.beginPath(); g.moveTo(px, py);
    const n = 5, len = Rd * (0.6 + rng() * 0.6);
    for (let s = 0; s < n; s++) { a += (rng() - 0.5) * 0.5; const sl = len / n * p; px += Math.cos(a) * sl; py += Math.sin(a) * sl; g.lineTo(px, py); }
    g.stroke();
  }
  for (let i = 0; i < 3; i++) { g.lineWidth = 0.5 * U; g.beginPath(); g.arc(x, y, Rd * (0.18 + i * 0.16) * p, rng() * 6, rng() * 6 + 1.2); g.stroke(); }
  // the hole itself, ragged, with a burnt rim
  const hr = Rd * 0.11;
  const rim = g.createRadialGradient(x, y, hr * 0.5, x, y, hr * 2.4); rim.addColorStop(0, 'rgba(40,0,20,.9)'); rim.addColorStop(1, 'rgba(40,0,20,0)');
  g.fillStyle = rim; g.beginPath(); g.arc(x, y, hr * 2.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0a0208'; g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, r = hr * (0.8 + rng() * 0.45); (i ? g.lineTo : g.moveTo).call(g, x + Math.cos(a) * r, y + Math.sin(a) * r); }
  g.closePath(); g.fill();
  if (e < 0.12) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,240,200,${1 - e / 0.12})`; g.beginPath(); g.arc(x, y, hr * 3, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function hlMuzzle(g, x, y, rot, flip, e, U) {
  const k = 1 - e / 0.12, r = 16 * U * (0.6 + 0.6 * (1 - k));
  g.save(); g.translate(x, y); g.rotate(rot); g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(255,255,235,${k})`); gr.addColorStop(0.3, `rgba(255,190,90,${0.9 * k})`); gr.addColorStop(1, 'rgba(255,61,142,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(r * 0.35, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = `rgba(255,245,215,${k})`;
  for (const [a, l] of [[0, 1.6], [0.5, 0.9], [-0.5, 0.9], [1.2, 0.55], [-1.2, 0.55]]) {
    g.beginPath(); g.moveTo(0, -r * 0.08); g.lineTo(Math.cos(a) * r * l, Math.sin(a) * r * l); g.lineTo(0, r * 0.08); g.closePath(); g.fill();
  }
  g.restore();
}
function hlSmoke(g, seg, t, cx, cy, U, cw) {
  const e = t - seg.bangAt, rng = hlRng(seg.i * 211 + 9), gust = Math.max(0, t - seg.gustAt);
  const src = [seg.muzzle || [cx, cy], [cx, cy]];
  const away = seg.muzzle ? Math.sign(cx - seg.muzzle[0]) || 1 : 1;   // the breath blows the smoke away from her side
  for (let i = 0; i < 34; i++) {
    const [sx, sy] = src[i % 2], born = rng() * 2.2 * (i % 2 ? 1 : 0.8), life = 1.6 + rng() * 1.4, q = (e - born) / life;
    const dx = (rng() - 0.5) * 10 * U, rise = (12 + rng() * 18) * U, curl = rng() * 6.28, sz = (3 + rng() * 5) * U;
    if (q <= 0 || q >= 1) continue;
    const gx = away * gust * gust * 70 * U * (0.6 + rng() * 0.8);
    const x = sx + dx * q + Math.sin(curl + q * 5) * 3 * U * q + gx, y = sy - rise * q;
    const r = sz * (0.6 + 2.2 * q), a = (q < 0.15 ? q / 0.15 : 1 - (q - 0.15) / 0.85) * (gust > 0 ? Math.max(0, 1 - gust * 0.9) : 1);
    if (a <= 0) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(230,214,224,${0.42 * a})`); gr.addColorStop(0.5, `rgba(170,130,160,${0.2 * a})`); gr.addColorStop(1, 'rgba(170,130,160,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}

// ---------- playing (and recording) ----------
// Sounds go through one bus that feeds the speakers and, while saving, the recorder.
let HL_RUN = null;
function hlStop() { if (HL_RUN) { HL_RUN.stop(); HL_RUN = null; } }
function hlPlay(canvas, rec, TL, opts = {}) {
  hlStop();
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  const c = SFX.ctx, srcs = [];
  let bus = null, t0c = 0;
  if (c && S.sound) {
    bus = c.createGain(); bus.gain.value = 0.9; bus.connect(c.destination);
    if (opts.dest) bus.connect(opts.dest);
    t0c = c.currentTime + 0.15;
    for (const a of TL.A) {
      if (a.soft) { SFX.soft(a.soft, { at: t0c + a.at, dest: bus }); continue; }
      if (a.glass) { SFX.glass({ at: t0c + a.at, dest: bus }); continue; }
      let buf = a.buf;
      if (a.sfx) { const b = SFX.bufs[a.sfx]; buf = b && b !== 'loading' ? b : null; }
      if (!buf) continue;
      const s = c.createBufferSource(), gn = c.createGain();
      gn.gain.value = a.sfx ? SFX_GAIN * (a.gain || 1) : 1; s.buffer = buf; s.connect(gn); gn.connect(bus);
      s.start(t0c + a.at); srcs.push(s);
    }
  }
  const start = performance.now() + 150;
  let raf = 0, stopped = false;
  const tick = () => {
    if (stopped) return;
    const t = c && bus ? c.currentTime - t0c : (performance.now() - start) / 1000;
    hlFrame(g, W, H, rec, TL, Math.max(0, Math.min(TL.len - 0.001, t)));
    if (opts.onTime) opts.onTime(t);
    if (t >= TL.len) { run.done(); if (opts.onEnd) opts.onEnd(); return; }   // a natural end lets the sounds ring out
    raf = requestAnimationFrame(tick);
  };
  const run = { done() { stopped = true; cancelAnimationFrame(raf); if (HL_RUN === run) HL_RUN = null; }, stop() { if (stopped) return; stopped = true; cancelAnimationFrame(raf); srcs.forEach(s => { try { s.stop(); } catch (e) {} }); if (bus) try { bus.disconnect(); } catch (e) {} } };
  HL_RUN = run;
  hlFrame(g, W, H, rec, TL, 0);
  raf = requestAnimationFrame(tick);
  return run;
}
function hlMime() {
  if (!window.MediaRecorder) return null;
  for (const t of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
    if (MediaRecorder.isTypeSupported(t)) return t;
  return null;
}
async function hlSave(canvas, rec, TL, onState) {
  const mime = hlMime();
  if (!mime || !canvas.captureStream) { onState('unsupported'); return; }
  const vid = canvas.captureStream(30), tracks = [...vid.getVideoTracks()];
  let dest = null;
  if (SFX.ctx && S.sound) { try { await wakeAudio(); dest = SFX.ctx.createMediaStreamDestination(); tracks.push(...dest.stream.getAudioTracks()); } catch (e) {} }
  const mr = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 4e6 });
  const parts = [];
  mr.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
  const done = new Promise(r => { mr.onstop = r; });
  mr.start(500);
  onState('recording', 0);
  await new Promise(r => hlPlay(canvas, rec, TL, { dest, onTime: t => onState('recording', t), onEnd: r }));
  mr.stop(); await done;
  tracks.forEach(t => t.stop());
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  const d = new Date(rec.started);
  const file = new File(parts, `Heartbreakers highlights ${d.toISOString().slice(0, 10)}.${ext}`, { type: mime.split(';')[0] });
  onState('ready', file);
}
async function hlShare(file) {
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Heartbreakers highlights' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}

// ---------- the viewer ----------
async function showHighlights(rec, back) {
  const moments = hlFind(rec);
  if (!moments.length) {
    openVeil(`<div class="panel" role="dialog" aria-label="Highlights"><div><h2>No highlights</h2><div class="sub">Nobody played the Q♠ or shot the moon, and no quotes lined up.</div></div><div class="btns"><button class="cta" id="hl-x">Back</button></div></div>`);
    $('hl-x').onclick = () => (back ? back() : closeVeil());
    return;
  }
  let shape = HL_SHAPES[S.reelShape] ? S.reelShape : hlDefaultShape();
  openVeil(`<div class="panel hl" role="dialog" aria-label="Highlights">
    <div><h2>Highlights</h2><div class="sub" id="hl-sub">${moments.length} moment${moments.length === 1 ? '' : 's'} · loading the clips…</div></div>
    <div class="hl-stage"><canvas id="hl-c"></canvas></div>
    <div class="field"><span class="lab">Video shape</span>${segHTML('hlshape', [['tall', 'Tall'], ['square', 'Square'], ['wide', 'Wide']], shape)}</div>
    <div class="btns"><button class="ghost" id="hl-x" type="button">Close</button><button class="ghost" id="hl-play" type="button" disabled>Replay</button><button class="cta" id="hl-save" type="button" disabled>Save video</button></div>
  </div>`);
  const cv = $('hl-c'), sub = $('hl-sub');
  const size = () => { const [w, h] = HL_SHAPES[shape]; cv.width = w; cv.height = h; cv.style.aspectRatio = `${w} / ${h}`; };
  size();
  SFX.unlock();
  const imgs = [HL_SRC.port, HL_SRC.land, HL_SRC.heart, HL_SRC.tex, ...rec.names.slice(1).map(n => AVATARS[n]), AVATARS[rec.me]].filter(Boolean).map(src => { hlImg(src); const im = hlImgs[src]; return im.complete ? null : new Promise(r => { im.onload = im.onerror = r; }); }).filter(Boolean);
  try { await Promise.race([Promise.all([...imgs, document.fonts ? document.fonts.ready : null]), new Promise(r => setTimeout(r, 3000))]); } catch (e) {}
  const wq = rec.finished && hlWinQuote(rec), clips = await hlLoadClips(rec, wq ? moments.concat([{ quotes: [wq] }]) : moments);
  if (!cv.isConnected) return;
  const TL = hlTimeline(rec, moments, clips);
  const secs = Math.round(TL.len);
  const idle = () => { sub.textContent = `${moments.length} moment${moments.length === 1 ? '' : 's'} · ${secs} s`; };
  idle();
  const play = () => hlPlay(cv, rec, TL);
  play();
  $('hl-play').disabled = false; $('hl-save').disabled = false;
  $('hl-play').onclick = play;
  $('veil').querySelectorAll('input[name="hlshape"]').forEach(r => r.onchange = () => { shape = r.value; S.reelShape = shape; saveSettings(); size(); play(); });
  $('hl-x').onclick = () => { hlStop(); back ? back() : closeVeil(); };
  $('hl-save').onclick = async () => {
    const btns = ['hl-play', 'hl-save', 'hl-x'].map($); btns.forEach(b => (b.disabled = true));
    await hlSave(cv, rec, TL, (st, v) => {
      if (st === 'recording') sub.textContent = `Recording… ${Math.min(secs, Math.floor(v))} of ${secs} s (keep this open)`;
      else if (st === 'unsupported') { sub.textContent = 'This browser can’t record video.'; btns.forEach(b => (b.disabled = false)); }
      else if (st === 'ready') {
        btns.forEach(b => (b.disabled = false));
        sub.textContent = 'Video ready.';
        $('hl-save').textContent = 'Share video';
        $('hl-save').onclick = () => hlShare(v);
        hlShare(v);
      }
    });
  };
}

// ---------- My games: your recorded games, newest first, each with its highlights ----------
async function showMyGames(back) {
  openVeil(`<div class="panel" role="dialog" aria-label="My games"><div><h2>My games</h2><div class="sub" id="mg-sub">Loading…</div></div><div class="mg" id="mg-list"></div><div class="btns"><button class="cta" id="mg-x" type="button">Back</button></div></div>`);
  $('mg-x').onclick = () => (back ? back() : closeVeil());
  let rows = [];
  try {
    const q = t => sb.from(t).select('id, started_at, finished, data').eq('user_id', ME.id).order('started_at', { ascending: false }).limit(25);
    const [real, dbg] = await Promise.all([q('hb_games'), IS_ADMIN ? q('hb_debug_games') : null]);   // debug games live apart (admin only)
    if (real.error) throw real.error;
    rows = (real.data || []).concat((dbg && dbg.data) || []).filter(r => r.data && r.data.hands && r.data.hands.length)
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1)).slice(0, 25);
  } catch (e) { if ($('mg-sub')) $('mg-sub').textContent = 'Couldn’t load your games. Try again in a moment.'; return; }
  if (!$('mg-list')) return;
  $('mg-sub').textContent = rows.length ? 'Tap a game to watch its highlights.' : 'No games yet.';
  $('mg-list').innerHTML = rows.map((r, i) => {
    const d = r.data, tot = d.totals || [0, 0, 0, 0], low = Math.min(...tot), n = hlFind(d).length;
    const place = 1 + tot.filter(x => x < tot[0]).length;
    const res = d.quit ? 'Left early' : !r.finished ? 'Unfinished' : tot[0] === low ? 'Won' : `${['', '1st', '2nd', '3rd', '4th'][place]} place`;
    const when = new Date(r.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `<button class="mg-row" type="button" data-i="${i}" ${n ? '' : 'disabled'}><span class="mg-when">${esc(when)}</span><span class="mg-who">as ${esc(d.me || '')} · vs ${esc(d.names.slice(1).join(', '))}</span><span class="mg-res">${esc(res)}${d.debug ? ' · debug' : d.practice ? ' · practice' : ''}</span><span class="mg-n">${n ? `${n} highlight${n === 1 ? '' : 's'}` : 'no highlights'}</span></button>`;
  }).join('');
  $('mg-list').querySelectorAll('.mg-row').forEach(b => b.onclick = () => showHighlights(rows[+b.dataset.i].data, () => showMyGames(back)));
}
// ===== end highlights =====
