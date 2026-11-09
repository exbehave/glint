// ===== Highlights (Kennedy, Nov 9, 2026) =====
// A short reel of a game's best moments, built from the game record (hb_games.data), so every recorded game has one.
// Shown after the final score and in My games, and saved as a video. Kennedy's rules for what counts:
//  - every trick with the Q♠ in it (played and taken), and every moon;
//  - a broken-hearts or hearts-taken moment only when its quote answered the quote before it strongly
//    (pair score 3 or better, or one of Kennedy's own links).
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
  return out;
}
function hlFind(rec) {
  if (!rec || !rec.hands) return [];
  const found = [];
  rec.hands.forEach((h, hi) => {
    const tricks = hlTricks(h), says = (h.says || []).map(s => ({ p: s[0], ev: s[1], line: s[2], ms: s[3], sc: s[4] || 0, ans: s[5] || null }));
    const trickAt = ms => tricks.find(t => ms >= t.t0 && ms < t.t1) || tricks[tricks.length - 1];
    const used = new Set();
    for (const t of tricks) {
      if (!t.cards.some(x => x.c === QS)) continue;
      const qs = says.filter(s => (s.ev === 'qsGive' || s.ev === 'qsGet') && s.ms >= t.t0 && s.ms < t.t1);
      qs.forEach(s => used.add(s));
      found.push({ kind: 'qs', hand: hi, trick: t, quotes: qs, rank: 2, who: t.w, by: t.cards.find(x => x.c === QS).p });
    }
    if (h.moon >= 0 && tricks.length) {
      found.push({ kind: 'moon', hand: hi, trick: tricks[tricks.length - 1], quotes: says.filter(s => s.ev === 'moon'), rank: 3, who: h.moon, choice: h.choice });
    }
    says.forEach((s, i) => {
      if (used.has(s) || !/^(breaks|hearts|fewHearts)$/.test(s.ev) || s.sc < HL_PAIR_MIN) return;
      // the quote it answered: recorded since Nov 9; older games: the quote just before it
      let prev = null;
      for (let j = i - 1; j >= 0; j--) if (!s.ans || normLine(says[j].line) === s.ans) { prev = says[j]; break; }
      const t = trickAt(s.ms);
      found.push({ kind: s.ev === 'breaks' ? 'breaks' : 'hearts', hand: hi, trick: t, quotes: prev ? [prev, s] : [s], rank: 1 + s.sc / 10, who: s.p });
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
function hlTimeline(rec, moments, clips) {
  const T = [], A = [];   // T: segments {t0, t1, m, i}; A: audio {at, buf | sfx}
  let t = 0;
  const INTRO = 1.6, CARD = 0.42, AFTER = 0.5, GAP = 0.25, OUTRO = 3;
  T.push({ t0: 0, t1: INTRO, intro: true }); t = INTRO;
  moments.forEach((m, i) => {
    const seg = { t0: t, m, i, cardsAt: [], quotes: [] };
    m.trick.cards.forEach((x, k) => {
      const at = t + 0.3 + k * CARD;
      seg.cardsAt.push(at); if (x.c === QS && k === 0) t += 0.6;   // a led queen bounces longer (1 s), like the table
      A.push({ at: at + 0.2, soft: 'card' });
      if (x.c === QS) { A.push({ at, sfx: k === 0 ? 'gong' : 'timpani' }); if (k === 0) seg.gambitAt = at; }
      if (m.kind === 'breaks' && suit(x.c) === 3 && !m.trick.cards.slice(0, k).some(y => suit(y.c) === 3)) { A.push({ at: at + 0.2, glass: true }); seg.glassAt = at + 0.2; seg.glassK = k; }
    });
    t += 0.3 + 4 * CARD + AFTER;
    if (m.kind === 'moon') A.push({ at: t - 0.3, sfx: ['choir-ahh', 'kids-woah'][i % 2] });
    for (const q of m.quotes) {
      const buf = clips[hlVoice(rec, q.p) + '|' + normLine(q.line)] || null;
      const len = buf ? (buf.sp != null ? buf.sp : buf.duration) : 1.8;
      if (buf) A.push({ at: t, buf });
      seg.quotes.push({ q, t0: t, t1: t + len + GAP + 0.6 });
      t += len + GAP;
    }
    seg.sweepAt = t + 0.2; A.push({ at: t + 0.2, soft: 'sweep' });
    t += 1.1;
    seg.t1 = t; T.push(seg);
  });
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
function hlGambit(g, x, y, e, U, rng) {
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
    for (const [c, b] of [['#ff3d8e', 70], ['#ff3d8e', 38], ['#ff3d8e', 18], ['#ff9a3c', 6]]) { g.shadowColor = c; g.shadowBlur = b * U / 3.9 * lit; g.fillStyle = '#fff4e8'; g.fillText('Queen’s Gambit', jx, jy - fs * 0.15); }
    g.shadowBlur = 0; g.fillStyle = '#ffb877'; g.font = HL_FONT(700, fs * 0.22, 'caps');
    g.letterSpacing = `${fs * 0.066}px`; g.fillText('NO WAY OUT', 0, fs * 0.62); g.letterSpacing = '0px';
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
  // the table's devil-heart outline behind the trick
  const hi = hlImg(HL_SRC.heart);
  if (hi) { g.save(); g.globalAlpha = 0.16; const hw = L.cw * 1.9, hh = hw * hi.naturalHeight / hi.naturalWidth; g.drawImage(hi, tx - hw / 2, cy - hh / 2, hw, hh); g.restore(); }
  const seatXY = [[tx, cy + sy], [tx - sx, cy], [tx, cy - sy], [tx + sx, cy]];
  for (let p = 0; p < 4; p++) {
    const [x, y] = seatXY[p], nm = hlVoice(rec, p);
    const speaking = seg.quotes.some(qq => qq.q.p === p && t >= qq.t0 && t < qq.t1);
    const k = seg.cardsAt.findIndex(a => t < a), turn = k >= 0 && m.trick.cards[k].p === p && t > seg.t0 + 0.15;
    const flip = (FACING[nm] === 'right' && p === 3) || (FACING[nm] === 'left' && p === 1);
    hlPlate(g, x, y, ps, nm, p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', speaking || turn, flip);
  }
  // the trick, the table's way: each card slides into its slot (the Q♠ drops in and bounces, glowing violet),
  // the winner's card gets a bone ring, then the cards gather in the middle, tilt, and fly off to whoever took them
  const cw = L.cw, off = [[0, 1], [-1, 0], [0, -1], [1, 0]], rng = hlRng(seg.i * 97 + 13);
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
  // caption
  g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, 3.5 * U, 'caps'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 2 * U;
  g.fillText(hlCaption(rec, m).toUpperCase(), wide ? tx : W / 2, L.capY);
  g.restore();
  if (logo && tall) { const lw = 46 * U, lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.025, lw, lh); }
  g.restore();
  if (seg.gambitAt != null && t >= seg.gambitAt && t < seg.gambitAt + 3.2) hlGambit(g, W / 2, H * (tall ? 0.44 : 0.46), t - seg.gambitAt, U, hlRng(seg.i * 53 + 3));
  // the quote being said, in the table's bubble style
  const cur = seg.quotes.filter(qq => t >= qq.t0 && t < qq.t1).pop();
  if (cur) {
    const a = ease((t - cur.t0) / 0.2);
    g.globalAlpha = a;
    g.font = HL_FONT(700, 4.4 * U);
    const maxW = Math.min(L.qw, 92 * U), lines = hlWrap(g, `“${hlStrip(cur.q.line)}”`, maxW - 7 * U);
    const lh = 5.6 * U, bh = lines.length * lh + 9.5 * U, bw = Math.min(maxW, Math.max(...lines.map(l => g.measureText(l).width)) + 9 * U);
    const by = Math.min(H - bh - 2 * U, L.qy - bh / 2), qx = L.qx;
    g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 3 * U; g.shadowOffsetY = U;
    g.fillStyle = '#f6edf2'; g.beginPath(); g.roundRect(qx - bw / 2, by, bw, bh, 3.4 * U); g.fill(); g.restore();
    g.fillStyle = '#c2185b'; g.font = HL_FONT(700, 2.8 * U, 'caps');
    g.fillText(hlVoice(rec, cur.q.p).toUpperCase(), qx, by + 3.8 * U);
    g.fillStyle = '#2a0b22'; g.font = HL_FONT(700, 4.4 * U);
    lines.forEach((l, k) => g.fillText(l, qx, by + 8.8 * U + k * lh));
    g.globalAlpha = 1;
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
      gn.gain.value = a.sfx ? SFX_GAIN : 1; s.buffer = buf; s.connect(gn); gn.connect(bus);
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
    if (t >= TL.len) { run.stop(); if (opts.onEnd) opts.onEnd(); return; }
    raf = requestAnimationFrame(tick);
  };
  const run = { stop() { if (stopped) return; stopped = true; cancelAnimationFrame(raf); srcs.forEach(s => { try { s.stop(); } catch (e) {} }); if (bus) try { bus.disconnect(); } catch (e) {} } };
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
  const clips = await hlLoadClips(rec, moments);
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
    const { data, error } = await sb.from('hb_games').select('id, started_at, finished, data').eq('user_id', ME.id).order('started_at', { ascending: false }).limit(25);
    if (error) throw error;
    rows = (data || []).filter(r => r.data && r.data.hands && r.data.hands.length);
  } catch (e) { if ($('mg-sub')) $('mg-sub').textContent = 'Couldn’t load your games. Try again in a moment.'; return; }
  if (!$('mg-list')) return;
  $('mg-sub').textContent = rows.length ? 'Tap a game to watch its highlights.' : 'No games yet.';
  $('mg-list').innerHTML = rows.map((r, i) => {
    const d = r.data, tot = d.totals || [0, 0, 0, 0], low = Math.min(...tot), n = hlFind(d).length;
    const place = 1 + tot.filter(x => x < tot[0]).length;
    const res = d.quit ? 'Left early' : !r.finished ? 'Unfinished' : tot[0] === low ? 'Won' : `${['', '1st', '2nd', '3rd', '4th'][place]} place`;
    const when = new Date(r.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `<button class="mg-row" type="button" data-i="${i}" ${n ? '' : 'disabled'}><span class="mg-when">${esc(when)}</span><span class="mg-who">as ${esc(d.me || '')} · vs ${esc(d.names.slice(1).join(', '))}</span><span class="mg-res">${esc(res)}${d.practice ? ' · practice' : ''}</span><span class="mg-n">${n ? `${n} highlight${n === 1 ? '' : 's'}` : 'no highlights'}</span></button>`;
  }).join('');
  $('mg-list').querySelectorAll('.mg-row').forEach(b => b.onclick = () => showHighlights(rows[+b.dataset.i].data, () => showMyGames(back)));
}
// ===== end highlights =====
