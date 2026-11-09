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
      seg.cardsAt.push(at);
      A.push({ at: at + 0.2, soft: 'card' });
      if (x.c === QS) A.push({ at, sfx: k === 0 ? 'gong' : 'timpani' });
      if (m.kind === 'breaks' && suit(x.c) === 3 && !m.trick.cards.slice(0, k).some(y => suit(y.c) === 3)) A.push({ at: at + 0.2, glass: true });
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
function hlCard(g, c, cx, cy, w, glow, alpha = 1) {
  const k = w / 66, h = 94 * k, r = 9 * k, s = suit(c), col = s === 1 || s === 3 ? '#ff3d8e' : s === 0 ? '#4fe3b2' : '#ece8f2';
  const x = cx - w / 2, y = cy - h / 2;
  g.save(); g.globalAlpha = alpha;
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
  // corner index: rank, suit under it
  g.fillStyle = col; g.font = HL_FONT(700, 22 * k, 'caps'); g.textAlign = 'center'; g.textBaseline = 'top';
  const ix = x + 5 * k + (RL(rank(c)).length > 1 ? 13 : 8) * k;
  g.fillText(RL(rank(c)), ix, y + 5 * k);
  hlSuit(g, s, ix, y + 5 * k + 30 * k, 17 * k, col);
  // big suit bottom right
  g.globalAlpha = alpha * 0.92; hlSuit(g, s, x + w - 6 * k - 17 * k, y + h - 5 * k - 18 * k, 34 * k, col);
  g.restore();
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
  const L = tall ? { cx: W / 2, cy: H * 0.5, sx: 37 * U, sy: 42 * U, ps: 21 * U, cw: 13 * U, qx: W / 2, qy: H * 0.87, qw: W * 0.86, capY: H * 0.12 }
    : wide ? { cx: W * 0.36, cy: H * 0.53, sx: 40 * U, sy: 30 * U, ps: 15 * U, cw: 10.5 * U, qx: W * 0.79, qy: H * 0.54, qw: W * 0.34, capY: H * 0.06 }
    : { cx: W / 2, cy: H * 0.41, sx: 37 * U, sy: 27 * U, ps: 13.5 * U, cw: 9 * U, qx: W / 2, qy: H * 0.9, qw: W * 0.84, capY: H * 0.032 };
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
  // the table's devil-heart outline behind the trick
  const hi = hlImg(HL_SRC.heart);
  if (hi) { g.save(); g.globalAlpha = 0.16; const hw = L.cw * 1.9, hh = hw * hi.naturalHeight / hi.naturalWidth; g.drawImage(hi, tx - hw / 2, cy - hh / 2, hw, hh); g.restore(); }
  const seatXY = [[tx, cy + sy], [tx - sx, cy], [tx, cy - sy], [tx + sx, cy]];
  for (let p = 0; p < 4; p++) {
    const [x, y] = seatXY[p], nm = hlVoice(rec, p);
    const speaking = seg.quotes.some(qq => qq.q.p === p && t >= qq.t0 && t < qq.t1);
    const flip = (FACING[nm] === 'right' && p === 3) || (FACING[nm] === 'left' && p === 1);
    hlPlate(g, x, y, ps, nm, p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', speaking, flip);
  }
  // the trick, card by card toward the middle, then swept to whoever took it
  const cw = L.cw, off = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const sw = seg.sweepAt != null ? ease((t - seg.sweepAt) / 0.45) : 0, wxy = seatXY[m.trick.w];
  m.trick.cards.forEach((x, k) => {
    const at = seg.cardsAt[k]; if (t < at) return;
    const a = ease((t - at) / 0.28), [ox, oy] = off[x.p];
    const from = seatXY[x.p], toX = tx + ox * cw * 1.04, toY = cy + oy * cw * 0.9;
    let px = from[0] + (toX - from[0]) * a, py = from[1] + (toY - from[1]) * a;
    if (sw > 0) { px += (wxy[0] - px) * sw; py += (wxy[1] - py) * sw; }
    const won = t > seg.cardsAt[3] + 0.35 && x.p === m.trick.w;
    hlCard(g, x.c, px, py, cw * (1 - sw * 0.4), x.c === QS ? 'rgba(178,140,255,.85)' : won ? 'rgba(255,61,142,.75)' : null, 1 - sw * 0.9);
  });
  // caption
  g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, 3.5 * U, 'caps'); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 2 * U;
  g.fillText(hlCaption(rec, m).toUpperCase(), wide ? tx : W / 2, L.capY);
  g.restore();
  if (logo && tall) { const lw = 46 * U, lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.025, lw, lh); }
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
