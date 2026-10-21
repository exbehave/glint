/* Lenses: stackable effects over the whole picture. Subtle batch (Oct 21, 2026), auditioned in Casting before joining the app.
   Same contract as MOODS: { key, name, mode (default blend), desc, shape: [sliders], draw(F, B, st, M) }.
   F = the output context (blend mode and opacity already set), B = the composed picture (a canvas), st = this lens's scratch state,
   M = { t, dt, energy, loud, kick, bass, hit, hat, chaos, k(key) → 0..1 slider value }. Keep every lens cheap: 2D canvas only. */
const LENS_BLENDS = [["source-over", "Normal"], ["lighter", "Add"], ["screen", "Screen"], ["overlay", "Overlay"], ["soft-light", "Soft light"], ["color-dodge", "Color dodge"], ["difference", "Difference"], ["exclusion", "Exclusion"], ["multiply", "Multiply"]];
const LENS_SAMPLE = 48; // width of the tiny luminance sample some lenses read
function lensSample(B, st, M, every = 3) {
  st.sn = (st.sn || 0) + 1; if (st.smp && st.sn % every) return st.smp;
  const w = LENS_SAMPLE, h = Math.max(4, Math.round(w * B.height / B.width)); st.sc ||= mk(w, h); const c = fit(st.sc, w, h);
  c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, w, h); c.drawImage(B, 0, 0, w, h);
  try { st.smp = { w, h, d: c.getImageData(0, 0, w, h).data }; } catch (_) { st.smp = null; }
  return st.smp;
}
function lensBright(smp, n) { // the n brightest cells, as [x, y, lum] in 0..1 units
  if (!smp) return []; const out = []; const { w, h, d } = smp;
  for (let i = 0; i < w * h; i++) { const l = (d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11) / 255 * d[i * 4 + 3] / 255; if (l < .18) continue; out.push([(i % w + .5) / w, (Math.floor(i / w) + .5) / h, l]); }
  out.sort((a, b) => b[2] - a[2]); return out.slice(0, n);
}
function lensCenter(smp) { if (!smp) return [.5, .5, 0]; let sx = 0, sy = 0, s = 0; const { w, h, d } = smp; for (let i = 0; i < w * h; i++) { const l = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765 * d[i * 4 + 3] / 255; sx += (i % w + .5) / w * l; sy += (Math.floor(i / w) + .5) / h * l; s += l; } return s > .01 ? [sx / s, sy / s, s / (w * h)] : [.5, .5, 0]; }
// bright parts only: multiplying the picture by itself twice pushes the dim parts toward black
function lensBrightCopy(B, st, scale) { st.bc ||= mk(1, 1); const w = B.width * scale, h = B.height * scale, c = fit(st.bc, w, h); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; c.clearRect(0, 0, w, h); c.drawImage(B, 0, 0, w, h); c.globalCompositeOperation = "multiply"; c.drawImage(B, 0, 0, w, h); c.drawImage(B, 0, 0, w, h); c.globalCompositeOperation = "source-over"; return st.bc; }
function lensNoise(st, w, h, key = "nz") { const c = st[key] ||= mk(w, h); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext("2d"), id = g.createImageData(w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 255; d[i + 3] = 255; } g.putImageData(id, 0, 0); return c; }
const lensRand = (st, key, n, make) => st[key] && st[key].length === n ? st[key] : (st[key] = Array.from({ length: n }, (_, i) => make(i)));
const LTAU = Math.PI * 2;

const LENSES = [
  { key: "flare", name: "Lens flare", mode: "lighter", desc: "A horizontal streak that follows the brightest spot, a vertical one that wanders on its own path, and ghost discs; the two streaks keep drifting back together into a crosshair.",
    shape: [{ key: "streak", label: "Streak length", def: .55 }, { key: "vert", label: "Vertical streak", def: .7 }, { key: "meet", label: "How often they meet", def: .5 }, { key: "ghosts", label: "Ghosts", def: .5 }, { key: "warm", label: "Warmth", def: .35 }, { key: "flash", label: "Flare on hits", def: .6 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, smp = lensSample(B, st, M), b = lensBright(smp, 1)[0]; st.x = lerp(st.x ?? .5, b ? b[0] : .5, .08); st.y = lerp(st.y ?? .5, b ? b[1] : .5, .08); st.l = lerp(st.l ?? 0, b ? b[2] : 0, .1);
      st.f = Math.max((st.f || 0) - M.dt * 2.5, M.hit ? M.k("flash") : 0); const hue = lerp(200, 30, M.k("warm")), a = (.25 + .75 * st.l) * (1 + 1.5 * st.f), len = W * (.25 + .75 * M.k("streak")) * (1 + .5 * st.f), x = st.x * W, y = st.y * H;
      const streak = (sx, sy, horiz, al) => { const L2 = horiz ? len : len * H / W * 1.2, g = horiz ? F.createLinearGradient(sx - L2, sy, sx + L2, sy) : F.createLinearGradient(sx, sy - L2, sx, sy + L2); g.addColorStop(0, hsl(hue, 90, 70, 0)); g.addColorStop(.5, hsl(hue, 80, 80, .55 * al)); g.addColorStop(1, hsl(hue, 90, 70, 0)); F.fillStyle = g; if (horiz) F.fillRect(sx - L2, sy - H * .006, L2 * 2, H * .012); else F.fillRect(sx - W * .004, sy - L2, W * .008, L2 * 2); };
      streak(x, y, true, a);
      if (M.k("vert") > .02) { // the vertical streak has a slow path of its own; a tide pulls it to the crosshair and lets it go again
        st.ph = (st.ph || 0) + M.dt * (.06 + .2 * M.k("meet")); const tide = .5 + .5 * Math.cos(st.ph * LTAU), wx = .5 + .35 * Math.sin(M.t * .17 + 1.3) + .1 * Math.sin(M.t * .41), wy = .5 + .3 * Math.cos(M.t * .13) + .1 * Math.cos(M.t * .37 + 2);
        st.vx = lerp(st.vx ?? wx, lerp(wx, st.x, tide * tide), .04); st.vy = lerp(st.vy ?? wy, lerp(wy, st.y, tide * tide), .04); const near = 1 - Math.min(1, Math.hypot(st.vx - st.x, st.vy - st.y) * 6); streak(st.vx * W, st.vy * H, false, a * M.k("vert") * (.7 + .6 * near));
        if (near > .6) spriteWhite(F, (st.vx + st.x) / 2 * W, (st.vy + st.y) / 2 * H, W * .04 * (near - .6) / .4, .5 * a); }
      const core = F.createRadialGradient(x, y, 0, x, y, W * .05 * (1 + st.f)); core.addColorStop(0, hsl(hue, 60, 95, .5 * a)); core.addColorStop(1, hsl(hue, 90, 70, 0)); F.fillStyle = core; F.fillRect(x - W * .06, y - W * .06, W * .12, W * .12);
      const n = Math.round(M.k("ghosts") * 6), cx = W / 2, cy = H / 2;
      for (let i = 1; i <= n; i++) { const tt = -.3 - i * .35, gx = lerp(x, cx, tt), gy = lerp(y, cy, tt), r = W * (.012 + .014 * ((i * 7) % 3)); const gg = F.createRadialGradient(gx, gy, r * .6, gx, gy, r); gg.addColorStop(0, hsl(hue + i * 40, 80, 70, .18 * a)); gg.addColorStop(1, hsl(hue + i * 40, 80, 70, 0)); F.fillStyle = gg; F.beginPath(); F.arc(gx, gy, r, 0, LTAU); F.fill(); } } },

  { key: "prism", name: "Prism", mode: "lighter", desc: "The picture split into a rainbow fringe, like light through glass; wider with the bass.",
    shape: [{ key: "spread", label: "Spread", def: .5 }, { key: "angle", label: "Angle", def: .5 }, { key: "amount", label: "Amount", def: .8 }, { key: "bands", label: "Bands", def: .5, min: 3, max: 7 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = W * .035 * M.k("spread") * (1 + .8 * M.bass), an = M.k("angle") * LTAU, dx = Math.cos(an) * s, dy = Math.sin(an) * s, nb = Math.round(lerp(3, 7, M.k("bands"))), a = .9 * M.k("amount") / Math.sqrt(nb);
      st.t1 ||= mk(1, 1); const hw = W / 2, hh = H / 2, tc = fit(st.t1, hw, hh);
      for (let i = 0; i < nb; i++) { const u = nb > 1 ? i / (nb - 1) : .5, o = u * 2 - 1, hue = u * 300; tc.globalCompositeOperation = "source-over"; tc.clearRect(0, 0, hw, hh); tc.drawImage(B, 0, 0, hw, hh); tc.globalCompositeOperation = "multiply"; tc.fillStyle = hsl(hue, 100, 50, 1); tc.fillRect(0, 0, hw, hh); tc.globalCompositeOperation = "destination-in"; tc.drawImage(B, 0, 0, hw, hh);
        F.globalAlpha *= a; F.drawImage(st.t1, dx * o, dy * o, W, H); F.globalAlpha /= a; } } },

  { key: "sparkle", name: "Sparkle", mode: "lighter", desc: "Small four-point glints that settle on the brightest spots and twinkle.",
    shape: [{ key: "count", label: "Count", def: .4 }, { key: "size", label: "Size", def: .35 }, { key: "twinkle", label: "Twinkle speed", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 4 + Math.round(M.k("count") * 28), smp = lensSample(B, st, M, 6), pts = lensBright(smp, n);
      // glints live on grid cells: a cell that stays bright keeps its glint, so the picture doesn't crackle with every refresh
      st.gl ||= new Map(); st.fr = (st.fr || 0) + 1; if (st.fr % 6 === 1) { const live = new Set(); pts.forEach(([x, y, l]) => { const id = Math.round(x * 48) + ":" + Math.round(y * 30); live.add(id); const g2 = st.gl.get(id); if (g2) g2.l = l; else st.gl.set(id, { x, y, l, a: 0, ph: Math.random() * LTAU, sp: .6 + Math.random() * .8 }); }); st.gl.forEach((g2, id) => { if (!live.has(id)) g2.l = 0; }); }
      const sp = .15 + 5 * M.k("twinkle"), sz = W * (.004 + .02 * M.k("size"));
      st.gl.forEach((g2, id) => { g2.a = lerp(g2.a, g2.l > 0 ? 1 : 0, M.dt * 3); if (g2.a < .02 && g2.l <= 0) { st.gl.delete(id); return; } const tw = .55 + .45 * Math.sin(M.t * sp * g2.sp + g2.ph), a = g2.a * tw * (.4 + .6 * g2.l), r = sz * (.7 + .3 * tw) * (1 + .5 * M.kick), px = g2.x * W, py = g2.y * H;
        F.strokeStyle = `rgba(255,255,255,${a})`; F.lineWidth = Math.max(1, r * .12); F.lineCap = "round"; F.beginPath(); F.moveTo(px - r, py); F.lineTo(px + r, py); F.moveTo(px, py - r); F.lineTo(px, py + r); F.stroke();
        F.lineWidth = Math.max(1, r * .06); F.beginPath(); F.moveTo(px - r * .4, py - r * .4); F.lineTo(px + r * .4, py + r * .4); F.moveTo(px + r * .4, py - r * .4); F.lineTo(px - r * .4, py + r * .4); F.stroke(); spriteWhite(F, px, py, r * .9, a * .5); }); } },

  { key: "dust", name: "Dust", mode: "lighter", desc: "Slow-drifting motes catching light, most visible against the dark.",
    shape: [{ key: "count", label: "Count", def: .45 }, { key: "size", label: "Size", def: .3 }, { key: "drift", label: "Drift", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 20 + Math.round(M.k("count") * 120), ps = lensRand(st, "ps", n, () => ({ x: Math.random(), y: Math.random(), r: .3 + Math.random(), s: Math.random() * LTAU, v: .4 + Math.random() })), d = M.dt * (.01 + .06 * M.k("drift")) * (1 + .8 * M.loud);
      ps.forEach(p => { p.x += Math.sin(M.t * .3 * p.v + p.s) * d; p.y -= d * p.v * .6; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } if (p.x < -.02) p.x = 1.02; if (p.x > 1.02) p.x = -.02;
        const a = .12 + .3 * (Math.sin(M.t * 1.3 * p.v + p.s) * .5 + .5), r = W * (.0015 + .006 * M.k("size")) * p.r; spriteWhite(F, p.x * W, p.y * H, r * 3, a * .35); F.fillStyle = `rgba(255,255,255,${a})`; F.beginPath(); F.arc(p.x * W, p.y * H, r, 0, LTAU); F.fill(); }); } },

  { key: "vignette", name: "Vignette", mode: "source-over", desc: "Soft dark edges that breathe in and out with the music.",
    shape: [{ key: "size", label: "Size", def: .5 }, { key: "soft", label: "Softness", def: .6 }, { key: "breath", label: "Breath", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy), inner = R * (.25 + .6 * (1 - M.k("size"))) * (1 + .25 * M.k("breath") * M.loud), outer = inner + R * (.15 + .7 * M.k("soft"));
      const g = F.createRadialGradient(cx, cy, inner, cx, cy, outer); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)"); F.fillStyle = g; F.fillRect(0, 0, W, H); } },

  { key: "bloom", name: "Bloom", mode: "lighter", desc: "A gentle halo on anything bright; nothing blows out to white.",
    shape: [{ key: "radius", label: "Radius", def: .45 }, { key: "strength", label: "Strength", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, bc = lensBrightCopy(B, st, 1 / (4 + 10 * M.k("radius"))), a = .35 + .5 * M.k("strength");
      st.sm ||= mk(1, 1); const sc = fit(st.sm, bc.width / 2, bc.height / 2); sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, sc.canvas.width, sc.canvas.height); sc.drawImage(bc, 0, 0, sc.canvas.width, sc.canvas.height);
      F.imageSmoothingEnabled = true; F.globalAlpha *= a; F.drawImage(st.bc, 0, 0, W, H); F.globalAlpha /= a; F.globalAlpha *= a * .7; F.drawImage(st.sm, 0, 0, W, H); F.globalAlpha /= a * .7; } },

  { key: "leak", name: "Light leak", mode: "screen", desc: "A warm wash creeping in from a corner, slow and lazy.",
    shape: [{ key: "corner", label: "Corner", def: 0, min: 0, max: 3, fmt: i => ["Top left", "Top right", "Bottom right", "Bottom left"][i] }, { key: "warm", label: "Warmth", def: .3 }, { key: "drift", label: "Drift", def: .4 }, { key: "reach", label: "Reach", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, c = Math.round(M.k("corner") * 3), hue = lerp(300, 25, M.k("warm")) % 360, d = M.k("drift"), ox = [0, 1, 1, 0][c] * W, oy = [0, 0, 1, 1][c] * H;
      const wob = Math.sin(M.t * (.15 + .3 * d)) * W * .08 * d, r = Math.hypot(W, H) * (.25 + .5 * M.k("reach")) * (1 + .08 * Math.sin(M.t * .4 + 1)), x = ox + wob, y = oy + Math.cos(M.t * .22) * H * .05 * d;
      const g = F.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hsl(hue, 90, 65, .85)); g.addColorStop(.45, hsl(hue + 20, 90, 55, .35)); g.addColorStop(1, hsl(hue + 40, 90, 50, 0)); F.fillStyle = g; F.fillRect(0, 0, W, H); } },

  { key: "rain", name: "Rain", mode: "source-over", desc: "Faint droplets on the glass, each bending the picture a little; some run.",
    shape: [{ key: "drops", label: "Drops", def: .4 }, { key: "size", label: "Size", def: .4 }, { key: "run", label: "Running", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 8 + Math.round(M.k("drops") * 60), ds = lensRand(st, "ds", n, i => ({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * .9, vy: 0, run: i % 5 === 0 })), sz = W * (.008 + .02 * M.k("size"));
      ds.forEach(dp => { if (dp.run) { dp.vy = Math.min(dp.vy + M.dt * .05 * M.k("run"), .25 * M.k("run")); dp.y += dp.vy * M.dt; if (dp.y > 1.05) { dp.y = -.05; dp.x = Math.random(); dp.vy = 0; } }
        const r = sz * dp.r, x = dp.x * W, y = dp.y * H; F.save(); F.beginPath(); F.ellipse(x, y, r, r * (dp.run ? 1.5 : 1.1), 0, 0, LTAU); F.clip();
        F.drawImage(B, x - r * 1.6, y - r * 1.8, r * 3.2, r * 3.6); F.restore();
        F.strokeStyle = "rgba(255,255,255,.22)"; F.lineWidth = 1; F.beginPath(); F.ellipse(x, y, r, r * (dp.run ? 1.5 : 1.1), 0, 0, LTAU); F.stroke(); F.fillStyle = "rgba(255,255,255,.35)"; F.beginPath(); F.arc(x - r * .35, y - r * .4, r * .18, 0, LTAU); F.fill(); }); } },

  { key: "frost", name: "Frost", mode: "screen", desc: "A crystalline edge that creeps inward when the music is quiet.",
    shape: [{ key: "reach", label: "Reach", def: .4 }, { key: "detail", label: "Detail", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height; if (!st.nz || st.nzw !== W) { st.nzw = W; lensNoise(st, 96, Math.round(96 * H / W)); } st.q = lerp(st.q ?? .5, 1 - M.loud, M.dt * .6);
      const reach = (.08 + .35 * M.k("reach")) * (.6 + .6 * st.q), cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
      st.m ||= mk(1, 1); const mc = fit(st.m, W / 2, H / 2); mc.globalCompositeOperation = "source-over"; mc.clearRect(0, 0, W / 2, H / 2); mc.imageSmoothingEnabled = M.k("detail") < .5; mc.drawImage(st.nz, 0, 0, W / 2, H / 2);
      mc.globalCompositeOperation = "destination-in"; const g = mc.createRadialGradient(cx / 2, cy / 2, R / 2 * (1 - reach * 1.6), cx / 2, cy / 2, R / 2); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,1)"); mc.fillStyle = g; mc.fillRect(0, 0, W / 2, H / 2);
      F.globalAlpha *= .75; F.drawImage(st.m, 0, 0, W, H); F.globalAlpha /= .75; } },

  { key: "diffusion", name: "Soft focus", mode: "screen", desc: "A diffusion layer, like a stocking over the lens.",
    shape: [{ key: "soft", label: "Softness", def: .5 }, { key: "amount", label: "Amount", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / (3 + 9 * M.k("soft")); st.a ||= mk(1, 1); const c = fit(st.a, W * s, H * s); c.globalCompositeOperation = "source-over"; c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.drawImage(B, 0, 0, W * s, H * s);
      F.imageSmoothingEnabled = true; const a = .3 + .6 * M.k("amount"); F.globalAlpha *= a; F.drawImage(st.a, 0, 0, W, H); F.globalAlpha /= a; } },

  { key: "starlight", name: "Starlight", mode: "lighter", desc: "A few slow pinpoint stars behind everything.",
    shape: [{ key: "count", label: "Count", def: .4 }, { key: "twinkle", label: "Twinkle", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 10 + Math.round(M.k("count") * 120), ss = lensRand(st, "ss", n, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * LTAU, r: .5 + Math.random(), v: .3 + Math.random() * 1.2 }));
      ss.forEach(s => { const a = .25 + .6 * (Math.sin(M.t * s.v * (1 + 2 * M.k("twinkle")) + s.s) * .5 + .5), r = W * .0015 * s.r; F.fillStyle = `rgba(255,255,255,${a})`; F.beginPath(); F.arc(s.x * W, s.y * H, r, 0, LTAU); F.fill(); if (s.r > 1.2) spriteWhite(F, s.x * W, s.y * H, r * 5, a * .25); }); } },

  { key: "wash", name: "Gradient wash", mode: "overlay", desc: "A two-tone tint across the frame, hues drifting slowly.",
    shape: [{ key: "a", label: "Color A", def: .6 }, { key: "b", label: "Color B", def: .9 }, { key: "angle", label: "Angle", def: .15 }, { key: "drift", label: "Drift", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, dr = M.t * 6 * M.k("drift"), ha = (M.k("a") * 360 + dr) % 360, hb = (M.k("b") * 360 - dr) % 360, an = M.k("angle") * LTAU, dx = Math.cos(an), dy = Math.sin(an), L = Math.hypot(W, H) / 2;
      const g = F.createLinearGradient(W / 2 - dx * L, H / 2 - dy * L, W / 2 + dx * L, H / 2 + dy * L); g.addColorStop(0, hsl(ha, 85, 55, .9)); g.addColorStop(1, hsl(hb, 85, 55, .9)); F.fillStyle = g; F.fillRect(0, 0, W, H); } },

  { key: "scanlines", name: "Scanline whisper", mode: "source-over", desc: "Barely-there horizontal lines, breathing with the beat.",
    shape: [{ key: "spacing", label: "Spacing", def: .3 }, { key: "thick", label: "Thickness", def: .3 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, sp = Math.max(2, Math.round(2 + 10 * M.k("spacing"))), th = Math.max(1, Math.round(sp * (.15 + .5 * M.k("thick")))), key = sp + ":" + th;
      if (st.key !== key) { st.key = key; const p = mk(1, sp), pc = p.getContext("2d"); pc.fillStyle = "#000"; pc.fillRect(0, sp - th, 1, th); st.pat = F.createPattern(p, "repeat"); }
      F.globalAlpha *= .35 + .3 * M.kick; F.fillStyle = st.pat; F.fillRect(0, 0, W, H); F.globalAlpha /= .35 + .3 * M.kick; } },

  { key: "glass", name: "Glass", mode: "source-over", desc: "Subtle refraction, as if the picture sits behind rippled glass.",
    shape: [{ key: "ripple", label: "Ripple", def: .4 }, { key: "amount", label: "Amount", def: .3 }, { key: "flow", label: "Flow", def: .2 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = Math.round(24 + 60 * M.k("ripple")), sw = W / n, amp = H * .012 * M.k("amount") * (1 + .5 * M.bass), fl = M.t * (.2 + 2 * M.k("flow"));
      for (let i = 0; i < n; i++) { const sx = i * sw, off = Math.sin(i * .7 + fl) * amp + Math.sin(i * .23 - fl * .6) * amp * .5; F.drawImage(B, sx, 0, sw + 1, H, sx, off, sw + 1, H); } } },

  { key: "caustics", name: "Caustics", mode: "lighter", desc: "Faint underwater light patterns moving across the frame.",
    shape: [{ key: "scale", label: "Scale", def: .5 }, { key: "speed", label: "Speed", def: .3 }, { key: "bright", label: "Brightness", def: .4 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, T = 160; if (!st.tile) { st.tile = mk(T, T); const c = st.tile.getContext("2d"); c.fillStyle = "#000"; c.fillRect(0, 0, T, T); c.globalCompositeOperation = "lighter";
        for (let i = 0; i < 26; i++) { const x = Math.random() * T, y = Math.random() * T, r = 12 + Math.random() * 28, g = c.createRadialGradient(x, y, r * .7, x, y, r); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.85, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; [[0, 0], [T, 0], [-T, 0], [0, T], [0, -T]].forEach(([ox, oy]) => { c.beginPath(); c.arc(x + ox, y + oy, r, 0, LTAU); c.fill(); }); }
        st.pat = F.createPattern(st.tile, "repeat"); }
      const sc = .6 + 2.4 * M.k("scale"), v = M.t * (8 + 40 * M.k("speed")), a = (.12 + .35 * M.k("bright")) * (1 + .4 * M.loud);
      [[v, v * .6, 1], [-v * .7, v * .4, 1.37]].forEach(([ox, oy, k2], i) => { F.save(); F.translate(ox % (T * sc * k2), oy % (T * sc * k2)); F.scale(sc * k2, sc * k2); F.globalAlpha *= a * (i ? .6 : 1); F.fillStyle = st.pat; F.fillRect(-W, -H, W * 3 / (sc * k2), H * 3 / (sc * k2)); F.restore(); }); } },

  { key: "glowtrail", name: "Glow trail", mode: "lighter", desc: "A soft smear left only by the brightest moving parts.",
    shape: [{ key: "length", label: "Length", def: .5 }, { key: "strength", label: "Strength", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, bc = lensBrightCopy(B, st, .25); st.acc ||= mk(1, 1); const ac = fit(st.acc, bc.width, bc.height);
      ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalCompositeOperation = "destination-out"; ac.fillStyle = `rgba(0,0,0,${clamp(M.dt * (.3 + 4 * (1 - M.k("length"))), 0, 1)})`; ac.fillRect(0, 0, bc.width, bc.height);
      ac.globalCompositeOperation = "lighter"; ac.globalAlpha = .5; ac.drawImage(bc, 0, 0); ac.globalAlpha = 1;
      F.imageSmoothingEnabled = true; const a = .4 + .6 * M.k("strength"); F.globalAlpha *= a; F.drawImage(st.acc, 0, 0, W, H); F.globalAlpha /= a; } },

  { key: "grain", name: "Grain", mode: "overlay", desc: "Fine film grain, always moving.",
    shape: [{ key: "amount", label: "Amount", def: .4 }, { key: "size", label: "Size", def: .2 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, s = 1 / (1 + 3 * M.k("size")), w = Math.max(16, Math.round(W * s * .5)), h = Math.max(16, Math.round(H * s * .5)); st.fr = (st.fr || 0) + 1; if (st.fr % 2 === 0 || !st.nz) lensNoise(st, w, h);
      F.imageSmoothingEnabled = M.k("size") < .3; F.globalAlpha *= .2 + .6 * M.k("amount"); F.drawImage(st.nz, 0, 0, W, H); F.globalAlpha /= .2 + .6 * M.k("amount"); } },

  { key: "veil", name: "Aurora veil", mode: "screen", desc: "A slow shimmering curtain of color along the top edge.",
    shape: [{ key: "height", label: "Height", def: .35 }, { key: "shimmer", label: "Shimmer", def: .5 }, { key: "cmode", label: "Color", min: 0, max: 2, def: 0, fmt: i => ["One color", "Rotate", "On the beat"][i] }, { key: "hue", label: "Hue", def: .45, when: pick => pick("cmode") === 0 }, { key: "rot", label: "Rotate speed", def: .3, when: pick => pick("cmode") !== 0 }, { key: "spread", label: "Color spread", def: .4 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 40, sw = W / n, h0 = H * (.1 + .45 * M.k("height")), sh = M.k("shimmer"), cm = Math.round(M.k("cmode") * 2), sp = 2.5 * M.k("spread");
      // color: a fixed hue with a gentle sway, a steady hue rotation, or a jump around the wheel on each kick (eased)
      st.rh = (st.rh ?? M.k("hue") * 360) + (cm === 1 ? M.dt * (4 + 116 * M.k("rot")) : 0); if (cm === 2 && M.hit) st.tgt = (st.tgt ?? st.rh) + 30 + 120 * M.k("rot"); if (cm === 2) st.rh += ((st.tgt ?? st.rh) - st.rh) * Math.min(1, M.dt * 4);
      const hue = cm === 0 ? M.k("hue") * 360 + Math.sin(M.t * .2) * 25 : st.rh;
      for (let i = 0; i < n; i++) { const u = i / n, hh = h0 * (.6 + .4 * Math.sin(u * 7 + M.t * (.6 + 2 * sh)) * Math.sin(u * 3.3 - M.t * .4)) * (1 + .3 * M.loud); const g = F.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, hsl(hue + u * 60 * sp, 85, 60, .8)); g.addColorStop(.5, hsl(hue + (40 + u * 60) * sp, 85, 55, .35)); g.addColorStop(1, hsl(hue + 80 * sp, 85, 50, 0));
        F.fillStyle = g; F.fillRect(i * sw, 0, sw + 1, hh); } } },

  { key: "halo", name: "Halo", mode: "lighter", desc: "A soft ring of light around wherever the picture's weight is.",
    shape: [{ key: "radius", label: "Radius", def: .4 }, { key: "width", label: "Width", def: .4 }, { key: "hue", label: "Hue", def: .55 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, [cx0, cy0, mass] = lensCenter(lensSample(B, st, M, 4)); st.x = lerp(st.x ?? .5, cx0, .05); st.y = lerp(st.y ?? .5, cy0, .05);
      const r = Math.min(W, H) * (.12 + .4 * M.k("radius")) * (1 + .12 * M.kick), w = r * (.1 + .6 * M.k("width")), x = st.x * W, y = st.y * H, hue = M.k("hue") * 360, a = .25 + .4 * Math.min(1, mass * 4) + .3 * M.loud;
      const g = F.createRadialGradient(x, y, Math.max(0, r - w), x, y, r + w); g.addColorStop(0, hsl(hue, 80, 65, 0)); g.addColorStop(.5, hsl(hue, 80, 70, a)); g.addColorStop(1, hsl(hue, 80, 65, 0)); F.fillStyle = g; F.beginPath(); F.arc(x, y, r + w, 0, LTAU); F.fill(); } },

  { key: "letterbox", name: "Letterbox", mode: "source-over", desc: "Cinema bars that ease in on quiet parts and out on loud ones.",
    shape: [{ key: "height", label: "Height", def: .35 }, { key: "ease", label: "Ease", def: .5 }, { key: "follow", label: "Follow the music", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, target = 1 - M.loud * M.k("follow"); st.o = lerp(st.o ?? 1, target, M.dt * (.3 + 3 * (1 - M.k("ease")))); const h = H * (.04 + .16 * M.k("height")) * st.o;
      F.fillStyle = "#000"; F.fillRect(0, 0, W, h); F.fillRect(0, H - h, W, h); } },

  { key: "fog", name: "Fog", mode: "screen", desc: "A thin ground mist along the bottom, stirred by the bass.",
    shape: [{ key: "height", label: "Height", def: .35 }, { key: "density", label: "Density", def: .4 }, { key: "stir", label: "Stir", def: .5 }],
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 14, bl = lensRand(st, "bl", n, () => ({ x: Math.random(), y: .7 + Math.random() * .3, r: .5 + Math.random(), v: .3 + Math.random() * .7, s: Math.random() * LTAU })), h0 = H * (.15 + .45 * M.k("height")), d = .25 + .5 * M.k("density"), stir = M.k("stir") * (1 + 2 * M.bass);
      bl.forEach(b => { b.x += M.dt * .02 * b.v * stir * Math.cos(M.t * .3 + b.s); if (b.x > 1.3) b.x = -.3; if (b.x < -.3) b.x = 1.3; const x = b.x * W, y = H - h0 * (1 - b.y) * .4 + Math.sin(M.t * .5 * b.v + b.s) * h0 * .08 * stir, rx = W * .25 * b.r, ry = h0 * .55 * b.r;
        const g = F.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(200,205,220,${.25 * d})`); g.addColorStop(1, "rgba(200,205,220,0)"); F.save(); F.translate(x, y); F.scale(1, ry / rx); F.translate(-x, -y); F.fillStyle = g; F.beginPath(); F.arc(x, y, rx, 0, LTAU); F.fill(); F.restore(); }); } }
];
const LENS = Object.fromEntries(LENSES.map(l => [l.key, l]));
