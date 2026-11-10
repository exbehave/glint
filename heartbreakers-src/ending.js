// ---------- the ending (Kennedy, Nov 9, 2026) ----------
// Every finished game ends the same way, in the game (endShow in ui.html) and at the end of Highlights:
//   1. the slot-machine scoreboard: four reels, one per player, spin and land one at a time, last place first,
//      the winner's last, with the jackpot (bulbs racing, hearts showering, the bell);
//   2. one of three finales for the winner, picked from the game's id so a replay shows the one the game did:
//      0 Crowning (a tiara drops onto her portrait, a sash with her name), 1 Reunion roll call (spotlights from last
//      place up, the winner's biggest), 2 Pack your bags (the losers' suitcases slam shut and they get wheeled off;
//      the winner stays "still in the house"). Her win line and the win sound land on the finale's big moment.
// For now it doesn't depend on who wins (Kennedy): you winning and a girl winning look the same.
const HLE = { SPIN: 0.35, FIRST: 1.7, STEP: 0.55, JACK: 0.15, TO_FIN: 1.4, CLIMAX: 1.7, HOLD: 2.6 };
let HLE_REEL = 2;   // reel window style (Kennedy, Nov 9, picked Neon tube, a tinge brighter): 0 original white, 1 Bubblegum, 2 Neon tube, 3 Pink chrome, 4 Hearts
const HLE_NAMES = ['Crowning', 'Reunion roll call', 'Pack your bags'];
function hlEndPick(rec) {   // the same finale every time this game is shown
  const s = String(rec.id || rec.started || '');
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 3;
}
function hlWinQuote(rec) {   // the win line said at the end of this game, if it was recorded
  const h = (rec.hands || [])[(rec.hands || []).length - 1];
  const s = h && (h.says || []).filter(x => x[1] === 'win').pop();
  return s ? { p: s[0], ev: 'win', line: s[2] } : null;
}
function hlEndSeg(rec, seg, clips, A, t) {
  const tot = rec.totals || [0, 0, 0, 0], lo = Math.min(...tot);
  const order = [0, 1, 2, 3].sort((a, b) => tot[a] - tot[b] || a - b);   // 1st first
  const win = (rec.winners && rec.winners.length ? rec.winners : order.filter(p => tot[p] === lo));
  Object.assign(seg, { ending: true, order, win, pick: hlEndPick(rec), spinAt: t + HLE.SPIN, stops: [] });
  // reels stop from last place up; winners (ties for first) stop together, last
  const losers = order.filter(p => !win.includes(p)).reverse();
  losers.forEach((p, k) => { seg.stops[p] = t + HLE.FIRST + k * HLE.STEP; });
  const last = t + HLE.FIRST + losers.length * HLE.STEP + 0.25;
  win.forEach(p => { seg.stops[p] = last; });
  seg.jackAt = last + HLE.JACK;
  for (let x = seg.spinAt; x < last; x += 0.075) A.push({ at: x, soft: 'reel' });
  losers.forEach(p => A.push({ at: seg.stops[p], soft: 'clunk' }));
  A.push({ at: last, soft: 'clunk' }); A.push({ at: seg.jackAt, soft: 'ding' });
  seg.finAt = seg.jackAt + HLE.TO_FIN; seg.climaxAt = seg.finAt + HLE.CLIMAX;
  if (seg.pick === 0) A.push({ at: seg.climaxAt - 0.1, soft: 'sparkle' });
  if (seg.pick === 2) losers.forEach((p, k) => A.push({ at: seg.finAt + 0.55 + k * 0.32, soft: 'slam' }));
  A.push({ at: seg.climaxAt, sfx: ['applause', 'fanfare', 'ta-da'][seg.pick] });
  let end = seg.climaxAt + HLE.HOLD;
  const q = hlWinQuote(rec);
  if (q) {
    const buf = clips[hlVoice(rec, q.p) + '|' + normLine(q.line)] || null, len = buf ? (buf.sp != null ? buf.sp : buf.duration) : 1.8;
    const at = seg.climaxAt + 0.9;
    if (buf) A.push({ at, buf });
    seg.quote = { q, t0: at, t1: at + len + 0.8 };
    end = Math.max(end, at + len + 1.2);
  }
  seg.t1 = end;
  return end;
}
// the slot machine's layout for this frame size
function hlEndLayout(W, H, U) {
  const tall = H > W * 1.2, wide = W > H * 1.2;
  const cw = Math.min(W * (tall ? 0.9 : wide ? 0.56 : 0.86), tall ? 92 * U : 118 * U);
  const rh = tall ? 15.5 * U : wide ? 15 * U : 14.5 * U, head = rh * 0.85;
  const ch = head + rh * 4 + rh * 0.35, cx = W / 2, cy = H * (tall ? 0.52 : 0.54);
  return { cw, ch, rh, head, x0: cx - cw / 2, y0: cy - ch / 2, cx, cy, tall, wide };
}
const hlNum = n => (n < 0 ? '−' + -n : String(n));
function hlEndDraw(g, W, H, rec, seg, t, U) {
  const K = hlEndLayout(W, H, U), tot = rec.totals || [0, 0, 0, 0];
  const fade = hlEaseIO((t - seg.finAt) / 0.6);   // the slot machine bows out as the finale starts
  if (fade < 1) {
    g.save(); g.globalAlpha = 1 - fade;
    g.translate(K.cx, K.cy); g.scale(1 - 0.08 * fade, 1 - 0.08 * fade); g.translate(-K.cx, -K.cy);
    hlSlot(g, W, H, rec, seg, t, U, K);
    g.restore();
  }
  if (t >= seg.finAt) [hlCrown, hlRollCall, hlBags][seg.pick](g, W, H, rec, seg, t, U);
  if (t >= seg.jackAt) hlHeartRain(g, W, H, seg, t, U);
  // her win line, in a bubble near the bottom
  if (seg.quote && t >= seg.quote.t0 && t < seg.quote.t1) {
    const a = hlClamp((t - seg.quote.t0) / 0.2) * hlClamp((seg.quote.t1 - t) / 0.3);
    hlEndBubble(g, W, H, U, hlVoice(rec, seg.quote.q.p), hlStrip(seg.quote.q.line), a);
  }
}
function hlSlot(g, W, H, rec, seg, t, U, K) {
  const { x0, y0, cw, ch, rh, head } = K, r = 3.2 * U, tot = rec.totals || [0, 0, 0, 0];
  const jack = t >= seg.jackAt, je = t - seg.jackAt;
  // the cabinet: plum body, pink chrome rim, a row of bulbs racing round it
  g.save();
  g.shadowColor = jack ? 'rgba(255,61,142,.75)' : 'rgba(255,61,142,.35)'; g.shadowBlur = (jack ? 5 : 3) * U;
  const body = g.createLinearGradient(0, y0, 0, y0 + ch); body.addColorStop(0, '#3a1030'); body.addColorStop(1, '#1d0718');
  g.fillStyle = body; g.beginPath(); g.roundRect(x0, y0, cw, ch, r); g.fill();
  g.shadowBlur = 0;
  const rim = g.createLinearGradient(x0, y0, x0 + cw, y0 + ch); rim.addColorStop(0, '#ffd1e6'); rim.addColorStop(0.5, '#ff3d8e'); rim.addColorStop(1, '#ffc0dc');
  g.lineWidth = 1.1 * U; g.strokeStyle = rim; g.stroke();
  g.restore();
  // bulbs: chase while spinning, flash all together on the jackpot
  const per = Math.max(1, Math.round((cw + ch) * 2 / (4.4 * U))), spin = t >= seg.spinAt;
  for (let i = 0; i < per; i++) {
    const d = i / per * (cw + ch) * 2;
    let bx, by;
    if (d < cw) { bx = x0 + d; by = y0; } else if (d < cw + ch) { bx = x0 + cw; by = y0 + d - cw; }
    else if (d < cw * 2 + ch) { bx = x0 + cw - (d - cw - ch); by = y0 + ch; } else { bx = x0; by = y0 + ch - (d - cw * 2 - ch); }
    const on = jack ? Math.floor(je / 0.12) % 2 === 0 : spin ? (i + Math.floor(t / 0.06)) % 4 === 0 : i % 4 === 0;
    g.beginPath(); g.arc(bx, by, 0.8 * U, 0, Math.PI * 2);
    g.fillStyle = on ? '#fff3c4' : 'rgba(255,190,220,.25)'; g.shadowColor = on ? '#ffd27a' : 'transparent'; g.shadowBlur = on ? 1.6 * U : 0; g.fill();
  }
  g.shadowBlur = 0;
  // the marquee
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = jack ? (Math.floor(je / 0.18) % 2 ? '#ff3d8e' : '#fff3f8') : '#f6edf2';
  g.font = HL_FONT(800, head * 0.36, 'caps');
  g.save(); g.shadowColor = '#ff3d8e'; g.shadowBlur = 1.6 * U;
  g.fillText(jack ? 'JACKPOT!' : 'FINAL SCORES', K.cx, y0 + head * 0.55, cw * 0.9); g.restore();
  // one row per player, 1st on top
  seg.order.forEach((p, row) => {
    const y = y0 + head + row * rh, cyr = y + rh / 2, isWin = seg.win.includes(p), landed = t >= seg.stops[p];
    const lit = landed && isWin && jack;
    // the row's panel
    g.save();
    g.fillStyle = lit ? 'rgba(255,61,142,.22)' : 'rgba(10,3,9,.45)';
    g.beginPath(); g.roundRect(x0 + 2.2 * U, y + rh * 0.08, cw - 4.4 * U, rh * 0.84, 2 * U); g.fill();
    if (lit) { g.strokeStyle = '#ff3d8e'; g.lineWidth = 0.5 * U; g.stroke(); }
    g.restore();
    // portrait
    const ps = rh * 0.7, px = x0 + 4 * U, py = cyr - ps / 2, im = hlImg(AVATARS[hlVoice(rec, p)]);
    g.save(); g.beginPath(); g.roundRect(px, py, ps, ps, 1.4 * U); g.clip();
    g.fillStyle = '#2a0d24'; g.fillRect(px, py, ps, ps);
    if (im) { g.imageSmoothingEnabled = false; const ih = ps * 1.25; g.drawImage(im, px, py, ps, ih); }
    g.restore();
    // name and place
    g.textAlign = 'left';
    g.fillStyle = '#f6edf2'; g.font = HL_FONT(700, rh * 0.22);
    const nx = px + ps + 3 * U, slotW = Math.min(cw * 0.36, 30 * U), nameW = x0 + cw - slotW - 7 * U - nx;
    g.fillText(hlLabel(rec, p), nx, cyr - rh * 0.11, nameW);
    if (landed) {
      const place = 1 + seg.order.filter(q => tot[q] < tot[p]).length;
      g.globalAlpha = hlClamp((t - seg.stops[p]) / 0.25);
      g.fillStyle = place === 1 ? '#ff3d8e' : '#c6b0bf'; g.font = HL_FONT(800, rh * 0.15, 'caps');
      g.fillText(['1ST', '2ND', '3RD', '4TH'][place - 1], nx, cyr + rh * 0.17, nameW);
      g.globalAlpha = 1;
    }
    // the reel window
    const wx = x0 + cw - slotW - 4 * U, wy = y + rh * 0.16, wh = rh * 0.68;
    g.save();
    const R = 1.6 * U, sty = HLE_REEL;
    g.beginPath(); g.roundRect(wx, wy, slotW, wh, R);
    // the window's face, by style (Kennedy, Nov 9: zhuzh up the plain white bars; options 1–4, 0 = the original)
    if (sty === 1) {        // Bubblegum: glossy pink candy
      const f = g.createLinearGradient(0, wy, 0, wy + wh); f.addColorStop(0, '#ff9cc6'); f.addColorStop(0.5, '#ffd6e8'); f.addColorStop(1, '#ff7ab3'); g.fillStyle = f;
    } else if (sty === 2) { // Neon tube: dark glass, glowing pink numbers
      const f = g.createLinearGradient(0, wy, 0, wy + wh); f.addColorStop(0, '#1e0619'); f.addColorStop(0.5, '#3d1036'); f.addColorStop(1, '#1e0619'); g.fillStyle = f;
    } else if (sty === 3) { // Pink chrome: a metal drum, banded like a real reel
      const f = g.createLinearGradient(0, wy, 0, wy + wh);
      [[0, '#7a2a55'], [0.18, '#f7a8cb'], [0.38, '#ffe8f2'], [0.5, '#ffffff'], [0.62, '#ffd0e4'], [0.82, '#e0789f'], [1, '#6b2049']].forEach(([o, c]) => f.addColorStop(o, c)); g.fillStyle = f;
    } else if (sty === 4) { // Hearts: soft pink with a faint devil-heart pattern, white numbers outlined in plum
      g.fillStyle = '#ffc2dc';
    } else g.fillStyle = '#f9eef4';
    g.fill(); g.clip();
    if (sty === 4) { const hs = wh * 0.32; for (let yy = wy - hs; yy < wy + wh + hs; yy += hs * 1.1) for (let xx = wx; xx < wx + slotW + hs; xx += hs * 1.2) hlSuit(g, 3, xx + ((Math.round((yy - wy) / hs) % 2) ? hs * 0.6 : 0), yy, hs * 0.7, 'rgba(255,61,142,.22)'); }
    if (sty === 1) { g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.roundRect(wx + slotW * 0.06, wy + wh * 0.08, slotW * 0.88, wh * 0.16, wh * 0.08); g.fill(); }
    // where the strip is: spins fast, eases into its number, bumps once
    const st = seg.spinAt, sp = seg.stops[p], S = 26 + row * 6;
    let pos;
    if (t < st) pos = -S;
    else if (t < sp) { const u = (t - st) / (sp - st); pos = -S * Math.pow(1 - u, 2.2); }
    else { const e = t - sp; pos = 0.18 * Math.sin(e * 22) * Math.exp(-e * 9); }
    const base = Math.round(pos), frac = pos - base;
    const rnd = i => { const h = Math.imul((i + 7) * 2654435761, (p + 3) * 40503) >>> 0; return (h % 152) - 26; };
    g.textAlign = 'center'; g.font = HL_FONT(800, wh * 0.62);
    for (let k = -1; k <= 1; k++) {
      const i = base + k, yy = wy + wh / 2 + (k - frac) * wh * 0.85, final = i === 0, txt = hlNum(final ? tot[p] : rnd(i)), tx = wx + slotW / 2, ty = yy + wh * 0.04;
      if (sty === 2) {
        g.save(); g.shadowColor = '#ff4f9a'; g.shadowBlur = (final && lit ? 3 : 2) * U;
        g.fillStyle = final ? (lit ? '#ffffff' : '#ffb3d6') : 'rgba(255,170,210,.7)'; g.fillText(txt, tx, ty); g.fillText(txt, tx, ty); g.restore();
      } else if (sty === 4) {
        g.lineJoin = 'round'; g.lineWidth = wh * 0.1; g.strokeStyle = final && lit ? '#ff1f7a' : '#3a0d30'; g.strokeText(txt, tx, ty);
        g.fillStyle = final ? '#ffffff' : 'rgba(255,255,255,.8)'; g.fillText(txt, tx, ty);
      } else if (sty === 3) {
        g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(txt, tx, ty + wh * 0.03);   // a pressed-in highlight under each number
        g.fillStyle = final ? (lit ? '#d4005a' : '#3a0d30') : 'rgba(58,13,48,.75)'; g.fillText(txt, tx, ty);
      } else {
        g.fillStyle = final ? (lit ? '#ff1f7a' : '#2a0d24') : 'rgba(42,13,36,.75)'; g.fillText(txt, tx, ty);
      }
    }
    // glass shading top and bottom
    const sh = g.createLinearGradient(0, wy, 0, wy + wh), dk = sty === 2 ? '18,3,15' : '26,6,22', a0 = sty === 3 ? 0.35 : sty === 2 ? 0.55 : 0.75;
    sh.addColorStop(0, `rgba(${dk},${a0})`); sh.addColorStop(0.3, `rgba(${dk},0)`); sh.addColorStop(0.7, `rgba(${dk},0)`); sh.addColorStop(1, `rgba(${dk},${a0})`);
    g.fillStyle = sh; g.fillRect(wx, wy, slotW, wh);
    g.restore();
    g.strokeStyle = lit ? '#ff7ab3' : sty === 2 ? 'rgba(255,90,160,.95)' : 'rgba(255,190,220,.55)'; g.lineWidth = (sty === 2 ? 0.6 : 0.45) * U;
    g.beginPath(); g.roundRect(wx, wy, slotW, wh, 1.6 * U); g.stroke();
  });
}
// pink devil hearts showering down from the jackpot on
function hlHeartRain(g, W, H, seg, t, U) {
  const e = t - seg.jackAt, rng = hlRng(4242), n = 46;
  for (let i = 0; i < n; i++) {
    const x0 = rng() * W, delay = rng() * 2.2, sp = (0.22 + rng() * 0.25) * H, sw = rng() * 6, sz = (2.4 + rng() * 2.6) * U, rot0 = rng() * 6;
    const k = e - delay; if (k < 0) continue;
    const y = -sz * 2 + k * sp; if (y > H + sz * 2) continue;
    const x = x0 + Math.sin(k * 2 + sw) * 3 * U;
    g.save(); g.translate(x, y); g.rotate(Math.sin(k * 1.5 + rot0) * 0.6); g.globalAlpha = 0.85 * hlClamp(1 - (k - 3.4) / 1.2);
    hlSuit(g, 3, 0, 0, sz, i % 5 === 0 ? '#ffd1e6' : '#ff3d8e'); g.restore();
  }
}
function hlEndBubble(g, W, H, U, nm, text, a) {
  const tall = H > W * 1.2, bw = Math.min(W * 0.86, 80 * U), fs = 3.6 * U;
  g.save(); g.globalAlpha = a; g.font = HL_FONT(700, fs);
  const lines = hlWrap(g, '“' + text + '”', bw - 8 * U), bh = lines.length * fs * 1.3 + fs * 2.6, x = W / 2 - bw / 2, y = H * (tall ? 0.86 : 0.83) - bh / 2;
  g.fillStyle = 'rgba(255,248,252,.5)'; g.beginPath(); g.roundRect(x, y, bw, bh, 2.4 * U); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ff3d8e'; g.font = HL_FONT(800, fs * 0.62, 'caps'); g.fillText(nm.toUpperCase(), W / 2, y + fs * 1.05);
  g.fillStyle = '#2a0d24'; g.font = HL_FONT(700, fs);
  lines.forEach((l, i) => g.fillText(l, W / 2, y + fs * 2.15 + i * fs * 1.3));
  g.restore();
}
// winners' plate positions for the finales (ties share the spotlight)
function hlWinSpots(W, H, seg, U, big) {
  const n = seg.win.length, ps = Math.min(big * U, W * 0.8 / n / 1.05), gap = ps * 1.12;
  return seg.win.map((p, i) => ({ p, x: W / 2 + (i - (n - 1) / 2) * gap, ps }));
}
// 0 Crowning: her plate rises to center stage, a tiara drops onto her portrait, a sash with her name unrolls;
// the others' plates slide away.
function hlCrown(g, W, H, rec, seg, t, U) {
  const e = t - seg.finAt, tall = H > W * 1.2, cy = H * (tall ? 0.44 : 0.46);
  // the others, dimmed, slide off the bottom
  const losers = seg.order.filter(p => !seg.win.includes(p));
  losers.forEach((p, i) => {
    const q = hlEaseIO((e - 0.1 - i * 0.08) / 0.8), x = W / 2 + (i - 1) * 22 * U, y = H * 0.82 + q * H * 0.3;
    g.save(); g.globalAlpha = 0.55 * (1 - q); hlPlate(g, x, y, 16 * U, hlVoice(rec, p), hlLabel(rec, p).toUpperCase(), false); g.restore();
  });
  hlWinSpots(W, H, seg, U, tall ? 52 : 40).forEach(({ p, x, ps }, i) => {
    const rise = hlEaseOut((e - 0.05) / 0.7), y = cy + (1 - rise) * H * 0.5;
    g.save(); g.globalAlpha = rise;
    // a soft spotlight
    const sl = g.createRadialGradient(x, y, ps * 0.2, x, y, ps * 1.4); sl.addColorStop(0, 'rgba(255,200,230,.28)'); sl.addColorStop(1, 'rgba(255,200,230,0)');
    g.fillStyle = sl; g.beginPath(); g.arc(x, y, ps * 1.4, 0, Math.PI * 2); g.fill();
    hlPlate(g, x, y, ps, hlVoice(rec, p), p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', t >= seg.climaxAt);
    g.restore();
    // the tiara: drops from above onto her head, bounces, sparkles
    const top = y - ps * 1.52 * 0.42 + ps * 0.07 + ps * 0.86 * 1.25 * 0.17, tw = ps * 0.46;   // band on her head, ~17% down the portrait
    const fall = hlClamp((t - (seg.climaxAt - 0.55)) / 0.55), land = t - seg.climaxAt;
    if (fall > 0) {
      const ty = top - H * 0.6 * (1 - fall * fall) + (land > 0 ? -Math.abs(Math.sin(land * 9)) * Math.exp(-land * 6) * ps * 0.08 : 0);
      hlTiara(g, x, ty, tw, t, U);
    }
    // the sash: unrolls across the lower portrait with her name
    const un = hlEaseOut((t - seg.climaxAt - 0.15) / 0.6);
    if (un > 0) {
      g.save(); g.translate(x, y + ps * 0.32); g.rotate(-0.32);
      const sw = ps * 1.15 * un, shh = ps * 0.17;
      const sg = g.createLinearGradient(0, -shh / 2, 0, shh / 2); sg.addColorStop(0, '#ff7ab3'); sg.addColorStop(0.5, '#ff3d8e'); sg.addColorStop(1, '#c2185b');
      g.fillStyle = sg; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = U;
      g.beginPath(); g.rect(-ps * 0.575, -shh / 2, sw, shh); g.fill(); g.shadowBlur = 0;
      g.beginPath(); g.rect(-ps * 0.575, -shh / 2, sw, shh); g.clip();
      g.fillStyle = '#fff4f9'; g.font = HL_FONT(800, shh * 0.5, 'caps'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(hlLabel(rec, p).toUpperCase(), 0, shh * 0.03, ps * 1.05);
      g.restore();
    }
  });
}
function hlTiara(g, x, y, w, t, U) {   // a rhinestone tiara, centered on x, its band's bottom at y
  const h = w * 0.42;
  g.save(); g.translate(x, y);
  const metal = g.createLinearGradient(0, -h, 0, 0); metal.addColorStop(0, '#ffffff'); metal.addColorStop(0.5, '#d9d4e0'); metal.addColorStop(1, '#9a92a8');
  g.fillStyle = metal; g.strokeStyle = 'rgba(80,60,90,.6)'; g.lineWidth = Math.max(1, w * 0.012);
  g.beginPath();
  g.moveTo(-w / 2, 0);
  const pk = [[-0.5, -0.18], [-0.36, -0.42], [-0.25, -0.3], [-0.13, -0.62], [0, -0.42], [0.13, -0.62], [0.25, -0.3], [0.36, -0.42], [0.5, -0.18]];
  pk.forEach(([u, v], i) => { if (i === 4) { g.lineTo(-0.06 * w, -0.66 * h); g.quadraticCurveTo(0, -1.05 * h, 0.06 * w, -0.66 * h); } g.lineTo(u * w, v * h); });
  g.lineTo(w / 2, 0); g.quadraticCurveTo(0, -0.12 * h, -w / 2, 0); g.closePath(); g.fill(); g.stroke();
  // gems: a pink heart in the middle, rhinestones on the points, twinkling
  const gem = (u, v, r, c) => { g.beginPath(); g.arc(u * w, v * h, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); };
  [[-0.36, -0.36], [-0.13, -0.54], [0.13, -0.54], [0.36, -0.36]].forEach(([u, v]) => gem(u, v, w * 0.028, '#e8f6ff'));
  for (let i = 0; i < 9; i++) gem(-0.42 + i * 0.105, -0.1, w * 0.017, '#ffffff');
  hlSuit(g, 3, 0, -0.62 * h, w * 0.16, '#ff3d8e');
  for (let i = 0; i < 4; i++) {   // twinkles
    const ph = (t * 1.7 + i * 0.27) % 1, s = Math.sin(ph * Math.PI) * w * 0.06;
    const [u, v] = [[-0.36, -0.36], [0.13, -0.54], [0, -0.85], [0.36, -0.36]][i];
    g.save(); g.translate(u * w, v * h); g.fillStyle = 'rgba(255,255,255,.95)';
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.18, 0); g.lineTo(0, s); g.lineTo(-s * 0.18, 0); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, s * 0.18); g.lineTo(s, 0); g.lineTo(0, -s * 0.18); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}
// 1 Reunion roll call: the four on a dark stage in finishing order; spotlights hit them from last place up,
// the winner's last and biggest.
function hlRollCall(g, W, H, rec, seg, t, U) {
  const e = t - seg.finAt, tall = H > W * 1.2, tot = rec.totals || [0, 0, 0, 0];
  const show = hlEaseOut(e / 0.5);
  g.save(); g.globalAlpha = show * 0.65; g.fillStyle = '#07020a'; g.fillRect(0, 0, W, H); g.restore();
  // seats: tall = 2 × 2 (winner top left), otherwise a row of four
  const ps = tall ? Math.min(30 * U, W * 0.36) : Math.min(24 * U, W * 0.19);
  const at = k => tall ? [W / 2 + (k % 2 ? 1 : -1) * ps * 0.66, H * 0.3 + Math.floor(k / 2) * ps * 2.05] : [W / 2 + (k - 1.5) * ps * 1.25, H * 0.5];
  const lightAt = p => seg.win.includes(p) ? seg.climaxAt : seg.finAt + 0.35 + (3 - seg.order.indexOf(p)) * 0.38;
  seg.order.forEach((p, k) => {
    const [x, y] = at(k), lt = lightAt(p), on = hlClamp((t - lt) / 0.18), isWin = seg.win.includes(p);
    const dimmed = isWin ? 0 : hlClamp((t - seg.climaxAt) / 0.5) * 0.45;
    // the beam from above
    if (on > 0) {
      g.save(); g.globalAlpha = on * (isWin ? 0.5 : 0.32) * (1 - dimmed);
      const bw = ps * (isWin ? 1.05 : 0.8);
      const bg = g.createLinearGradient(0, 0, 0, y + ps); bg.addColorStop(0, 'rgba(255,240,250,0)'); bg.addColorStop(1, isWin ? 'rgba(255,170,215,.95)' : 'rgba(255,240,250,.8)');
      g.fillStyle = bg; g.beginPath(); g.moveTo(x - bw * 0.12, 0); g.lineTo(x + bw * 0.12, 0); g.lineTo(x + bw, y + ps * 0.95); g.lineTo(x - bw, y + ps * 0.95); g.closePath(); g.fill();
      g.restore();
    }
    const sc = isWin ? 1 + 0.12 * hlEaseOut((t - lt) / 0.35) : 1;
    g.save(); g.globalAlpha = show * (0.35 + 0.65 * on) * (1 - dimmed);
    hlPlate(g, x, y, ps * sc, hlVoice(rec, p), p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', isWin && on > 0.5);
    g.restore();
    if (on > 0) {   // place and score under the plate
      const place = 1 + seg.order.filter(q => tot[q] < tot[p]).length;
      g.save(); g.globalAlpha = on * (1 - dimmed); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = isWin ? '#ff3d8e' : '#f6edf2'; g.font = HL_FONT(800, ps * 0.16, 'caps');
      g.fillText(`${['1ST', '2ND', '3RD', '4TH'][place - 1]} · ${hlNum(tot[p])}`, x, y + ps * sc * 1.52 * 0.66 + ps * 0.08);
      g.restore();
    }
  });
}
// 2 Pack your bags: a suitcase pops up in front of each loser, slams shut with a luggage tag (her score), and
// gets wheeled off; the winner stays in the spotlight, still in the house.
function hlBags(g, W, H, rec, seg, t, U) {
  const e = t - seg.finAt, tall = H > W * 1.2, tot = rec.totals || [0, 0, 0, 0];
  const losers = seg.order.filter(p => !seg.win.includes(p));
  const lps = tall ? Math.min(21 * U, W * 0.26) : Math.min(14 * U, W * 0.12);
  const ly = tall ? H * 0.74 : H * 0.86, gap = lps * 1.3, wy = tall ? H * 0.34 : H * 0.3, wbig = tall ? 40 : 26;
  // the winner(s), up top in the spotlight
  hlWinSpots(W, H, seg, U, wbig).forEach(({ p, x, ps }) => {
    const y = wy, a = hlEaseOut(e / 0.6), lit = t >= seg.climaxAt;
    g.save(); g.globalAlpha = a;
    const sl = g.createRadialGradient(x, y, ps * 0.2, x, y, ps * 1.3); sl.addColorStop(0, `rgba(255,200,230,${lit ? 0.32 : 0.15})`); sl.addColorStop(1, 'rgba(255,200,230,0)');
    g.fillStyle = sl; g.beginPath(); g.arc(x, y, ps * 1.3, 0, Math.PI * 2); g.fill();
    hlPlate(g, x, y, ps, hlVoice(rec, p), p === 0 ? (rec.handle ? rec.handle.toUpperCase() : 'YOU') : 'CPU', lit);
    g.restore();
  });
  if (t >= seg.climaxAt) {
    const wp = hlWinSpots(W, H, seg, U, wbig)[0].ps, k = hlEaseOut((t - seg.climaxAt) / 0.4), y = wy + wp * 1.52 * 0.58 + 4.5 * U;
    g.save(); g.globalAlpha = k; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ff3d8e'; g.shadowColor = '#ff3d8e'; g.shadowBlur = 2 * U; g.font = HL_FONT(800, 4.6 * U, 'caps');
    g.translate(W / 2, y); g.scale(1.25 - 0.25 * k, 1.25 - 0.25 * k);
    g.fillText('STILL IN THE HOUSE', 0, 0, W * 0.9); g.restore();
  }
  // the losers, each behind a suitcase
  losers.forEach((p, i) => {
    const x0 = W / 2 + (i - (losers.length - 1) / 2) * gap, slam = seg.finAt + 0.55 + i * 0.32;
    const out = hlEaseIO((t - seg.climaxAt + 0.15 - i * 0.07) / 0.9), dir = x0 < W / 2 ? -1 : x0 > W / 2 ? 1 : (i % 2 ? 1 : -1);
    const x = x0 + dir * out * W * 0.75, y = ly;
    const a = hlEaseOut(e / 0.4);
    g.save(); g.globalAlpha = a * (1 - hlClamp((out - 0.85) / 0.15));
    hlPlate(g, x, y - lps * 0.35, lps, hlVoice(rec, p), hlLabel(rec, p).toUpperCase(), false);
    // the suitcase pops up, then its lid swings shut over her
    const up = hlEaseOut((t - seg.finAt - 0.1 - i * 0.12) / 0.35);
    const sw = lps * 1.05, sh = lps * 0.95, sx = x - sw / 2, sy = y + lps * 0.55 - sh * up;
    hlSuitcase(g, sx, sy, sw, sh, hlClamp((t - slam + 0.18) / 0.18), t - slam, hlNum(tot[p]), U, out);
    g.restore();
  });
}
function hlSuitcase(g, x, y, w, h, shut, since, tag, U, roll) {
  g.save();
  const shake = since > 0 && since < 0.25 ? Math.sin(since * 80) * (0.25 - since) * 3 * U : 0;
  g.translate(shake, 0);
  // wheels while rolling away
  if (roll > 0) { g.fillStyle = '#1a0616'; [0.2, 0.8].forEach(u => { g.beginPath(); g.arc(x + u * w, y + h + 0.8 * U, 1.1 * U, 0, Math.PI * 2); g.fill(); }); }
  const body = g.createLinearGradient(x, y, x + w, y + h); body.addColorStop(0, '#ff6fa8'); body.addColorStop(1, '#b0154f');
  // open: the bottom half with its dark lining showing; the lid swings up over the front when it slams
  const bh = h * (0.45 + 0.55 * shut), by = y + h - bh;
  g.fillStyle = body; g.strokeStyle = '#ffd1e6'; g.lineWidth = 0.4 * U;
  g.beginPath(); g.roundRect(x, by, w, bh, 1.6 * U); g.fill(); g.stroke();
  if (shut < 1) { g.fillStyle = `rgba(40,6,24,${0.9 * (1 - shut)})`; g.beginPath(); g.roundRect(x + w * 0.05, by + 0.6 * U, w * 0.9, Math.min(bh * 0.35, 3.2 * U), 1 * U); g.fill(); }
  // ribs, clasps, handle
  g.strokeStyle = 'rgba(255,220,235,.45)'; [0.3, 0.7].forEach(u => { g.beginPath(); g.moveTo(x + u * w, by + 1.2 * U); g.lineTo(x + u * w, y + h - 1.2 * U); g.stroke(); });
  if (shut > 0.95) {
    g.fillStyle = '#ffe9a8'; [0.22, 0.78].forEach(u => g.fillRect(x + u * w - 0.9 * U, by - 0.2 * U, 1.8 * U, 1.6 * U));
    g.strokeStyle = '#3a0a24'; g.lineWidth = 0.9 * U; g.beginPath(); g.moveTo(x + w * 0.38, by); g.quadraticCurveTo(x + w / 2, by - 3 * U, x + w * 0.62, by); g.stroke();
    // the luggage tag, swinging, with her score
    const sw = Math.sin(since * 7) * Math.exp(-since * 2) * 0.5 + 0.15;
    g.save(); g.translate(x + w * 0.62, by); g.rotate(sw);
    g.strokeStyle = '#f6edf2'; g.lineWidth = 0.25 * U; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 3 * U); g.stroke();
    g.fillStyle = '#fff8ec'; g.beginPath(); g.roundRect(-4.2 * U, 3 * U, 8.4 * U, 5.2 * U, 0.8 * U); g.fill();
    g.fillStyle = '#2a0d24'; g.font = HL_FONT(800, 3 * U); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tag, 0, 5.7 * U); g.restore();
  }
  g.restore();
}
