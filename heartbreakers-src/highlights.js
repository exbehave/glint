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
const HL_HEART = new Path2D('M11 18C4.8 13.6 2 10.6 2 7.2 2 4.6 4 2.6 6.4 2.6c1.9 0 3.6 1.1 4.6 2.7 1-1.6 2.7-2.7 4.6-2.7C18 2.6 20 4.6 20 7.2c0 3.4-2.8 6.4-9 10.8z');
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
      seg.cardsAt.push(t + 0.3 + k * CARD);
      if (x.c === QS) A.push({ at: t + 0.3 + k * CARD, sfx: k === 0 ? 'gong' : 'timpani' });
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
    t += 0.9;
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

// ---------- drawing one frame ----------
function hlCard(x, cx, cy, w, glow) {
  const h = w * 1.42, r = w * 0.12, s = suit(x), red = s === 1 || s === 3, col = red ? '#ff3d8e' : s === 0 ? '#4fe3b2' : '#ece8f2';
  x = { c: x };
  cx -= w / 2; cy -= h / 2;
  const g = this;
  g.save();
  if (glow) { g.shadowColor = glow; g.shadowBlur = w * 0.45; }
  const grd = g.createLinearGradient(cx, cy, cx + w * 0.4, cy + h);
  grd.addColorStop(0, '#2b0f27'); grd.addColorStop(1, '#150712');
  g.beginPath(); g.roundRect(cx, cy, w, h, r); g.fillStyle = grd; g.fill();
  g.shadowBlur = 0; g.lineWidth = Math.max(1, w * 0.02); g.strokeStyle = x.c === QS ? 'rgba(178,140,255,.85)' : '#443c4e'; g.stroke();
  g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'top';
  g.font = `800 ${w * 0.3}px Montserrat, "Avenir Next", Arial, sans-serif`;
  g.fillText(RL(rank(x.c)), cx + w * 0.09, cy + w * 0.08);
  // the suit, big in the middle (hearts get the devil heart, like the table)
  const big = w * 0.5;
  if (s === 3) { g.save(); g.translate(cx + w / 2 - big / 2, cy + h * 0.56 - big / 2); g.scale(big / 22, big / 22); g.fill(HL_HEART); g.restore(); }
  else { g.font = `${big}px "Apple Symbols", "Segoe UI Symbol", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SYM[s], cx + w / 2, cy + h * 0.58); }
  g.restore();
}
function hlWrap(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
function hlFrame(g, W, H, rec, TL, t) {
  const U = Math.min(W, H) / 100, tall = H > W * 1.2, wide = W > H * 1.2;
  // layout per shape: tall stacks the quote under the table; wide puts it beside the table; square tightens the table
  const L = tall ? { cx: W / 2, cy: H * 0.47, sx: 34 * U, sy: 40 * U, ps: 19 * U, cw: 13 * U, qx: W / 2, qy: H * 0.86, qw: W * 0.84, capY: H * 0.11 }
    : wide ? { cx: W * 0.36, cy: H * 0.53, sx: 36 * U, sy: 33 * U, ps: 15 * U, cw: 9.5 * U, qx: W * 0.79, qy: H * 0.53, qw: W * 0.34, capY: H * 0.07 }
    : { cx: W / 2, cy: H * 0.42, sx: 33 * U, sy: 28 * U, ps: 12 * U, cw: 9 * U, qx: W / 2, qy: H * 0.9, qw: W * 0.84, capY: H * 0.032 };
  // background: the table's deep plum felt
  const bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
  bg.addColorStop(0, '#2c1026'); bg.addColorStop(0.5, '#1d0a18'); bg.addColorStop(1, '#12060f');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const seg = TL.T.find(s => t >= s.t0 && t < s.t1) || TL.T[TL.T.length - 1];
  const logo = hlImg('brand/logo.webp');
  const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (seg.intro || seg.outro) {
    const a = ease((t - seg.t0) / 0.5);
    g.globalAlpha = a;
    if (logo) { const lw = Math.min(W * 0.8, 70 * U), lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.36 - lh / 2, lw, lh); }
    g.fillStyle = '#f6edf2'; g.font = `700 ${6 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
    if (seg.intro) {
      g.fillText('Highlights', W / 2, H * 0.56);
      g.fillStyle = '#c6b0bf'; g.font = `600 ${3.6 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
      const d = new Date(rec.started);
      g.fillText(d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }), W / 2, H * 0.62);
    } else {
      const tot = rec.totals || [0, 0, 0, 0], order = [0, 1, 2, 3].sort((a, b) => tot[a] - tot[b]);
      g.fillText(rec.finished ? 'Final scores' : 'Scores so far', W / 2, H * 0.52);
      g.font = `600 ${4 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
      order.forEach((p, k) => { g.fillStyle = k === 0 ? '#ff3d8e' : '#f6edf2'; g.fillText(`${hlLabel(rec, p)}  ${tot[p]}`, W / 2, H * 0.6 + k * 6 * U); });
    }
    g.globalAlpha = 1;
    return;
  }
  const m = seg.m;
  // seats: 0 You (bottom), 1 Left, 2 Across, 3 Right
  const { cx: tx, cy, sx, sy, ps } = L;
  const seatXY = [[tx, cy + sy], [tx - sx, cy], [tx, cy - sy], [tx + sx, cy]];
  for (let p = 0; p < 4; p++) {
    const [x, y] = seatXY[p], nm = hlVoice(rec, p), im = hlImg(AVATARS[nm]);
    const speaking = seg.quotes.some(qq => qq.q.p === p && t >= qq.t0 && t < qq.t1);
    g.save();
    g.beginPath(); g.roundRect(x - ps / 2, y - ps * 0.62, ps, ps * 1.25, ps * 0.14); g.clip();
    g.fillStyle = '#150712'; g.fillRect(x - ps / 2, y - ps * 0.62, ps, ps * 1.25);
    if (im) {
      const flip = (FACING[nm] === 'right' && p === 3) || (FACING[nm] === 'left' && p === 1);
      if (flip) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); }
      g.imageSmoothingEnabled = false;
      g.drawImage(im, x - ps / 2, y - ps * 0.62, ps, ps * 1.25);
    }
    g.restore();
    g.lineWidth = speaking ? U * 0.7 : U * 0.25; g.strokeStyle = speaking ? '#ff3d8e' : 'rgba(214,200,214,.45)';
    g.beginPath(); g.roundRect(x - ps / 2, y - ps * 0.62, ps, ps * 1.25, ps * 0.14); g.stroke();
    g.fillStyle = '#f6edf2'; g.font = `700 ${2.9 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
    g.fillText(p === 0 && rec.handle ? `${rec.handle} · ${rec.me}` : nm, x, y + ps * 0.63 + 2.6 * U);
  }
  // the trick, card by card toward the middle
  const cw = L.cw, off = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  m.trick.cards.forEach((x, k) => {
    const at = seg.cardsAt[k]; if (t < at) return;
    const a = ease((t - at) / 0.28), [ox, oy] = off[x.p], d = cw * 1.08;
    const from = seatXY[x.p], toX = tx + ox * d, toY = cy + oy * d * 0.9;
    const px = from[0] + (toX - from[0]) * a, py = from[1] + (toY - from[1]) * a;
    const won = t > seg.cardsAt[3] + 0.35 && x.p === m.trick.w;
    hlCard.call(g, x.c, px, py, cw, x.c === QS ? 'rgba(178,140,255,.9)' : won ? 'rgba(255,61,142,.7)' : null);
  });
  // caption
  g.fillStyle = '#c6b0bf'; g.font = `700 ${3.4 * U}px Montserrat, "Avenir Next", Arial, sans-serif`;
  g.fillText(hlCaption(rec, m).toUpperCase(), wide ? tx : W / 2, L.capY);
  if (logo && tall) { const lw = 40 * U, lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, (W - lw) / 2, H * 0.03, lw, lh); }
  // the quote being said: a bubble under the table (tall) or along the bottom
  const cur = seg.quotes.filter(qq => t >= qq.t0 && t < qq.t1).pop();
  if (cur) {
    const a = ease((t - cur.t0) / 0.2);
    g.globalAlpha = a;
    g.font = `700 ${4.2 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
    const maxW = Math.min(L.qw, 90 * U), lines = hlWrap(g, `“${hlStrip(cur.q.line)}”`, maxW - 6 * U);
    const lh = 5.4 * U, bh = lines.length * lh + 9 * U, bw = Math.min(maxW, Math.max(...lines.map(l => g.measureText(l).width)) + 8 * U);
    const by = Math.min(H - bh - 2 * U, L.qy - bh / 2), qx = L.qx;
    g.fillStyle = '#f6edf2'; g.beginPath(); g.roundRect(qx - bw / 2, by, bw, bh, 3 * U); g.fill();
    g.fillStyle = '#12060f'; g.font = `700 ${2.8 * U}px Montserrat, "Avenir Next", Arial, sans-serif`;
    g.fillText(hlVoice(rec, cur.q.p).toUpperCase(), qx, by + 3.6 * U);
    g.font = `700 ${4.2 * U}px Quicksand, "Avenir Next", Arial, sans-serif`;
    lines.forEach((l, k) => g.fillText(l, qx, by + 8.4 * U + k * lh));
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
