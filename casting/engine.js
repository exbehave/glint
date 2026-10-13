const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const frac = x => x - Math.floor(x);
function seeded(i) { return frac(Math.sin(i * 127.1 + 311.7) * 43758.5453); }
function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(seeded(i) * 2 - 1, seeded(i + 1) * 2 - 1, u); }
function wave(type, ph) {
  switch (type) {
    case "sine": return Math.sin(ph * TAU);
    case "triangle": return 1 - 4 * Math.abs(frac(ph + .25) - .5);
    case "square": return Math.tanh(5 * Math.sin(ph * TAU)) / Math.tanh(5);
    case "saw": return 2 * frac(ph) - 1;
    case "noise": return vnoise(ph * 2);
  }
  return 0;
}
const hsl = (h, s, l, a) => `hsla(${h},${s}%,${l}%,${a})`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ================= Drawing helpers ================= */
const glowCache = new Map();
function glowSprite(h) {
  const hue = ((Math.round(h / 5) * 5) % 360 + 360) % 360;
  let c = glowCache.get(hue); if (c) return c;
  c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hsl(hue, 100, 95, 1)); gr.addColorStop(.16, hsl(hue, 100, 70, .75)); gr.addColorStop(.42, hsl(hue, 95, 55, .22)); gr.addColorStop(1, hsl(hue, 90, 45, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowCache.set(hue, c); return c;
}
function sprite(g, h, x, y, r, a) { if (r <= 0 || a <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(glowSprite(h), x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }
let whiteGlow = null;
function spriteWhite(g, x, y, r, a) {
  if (!whiteGlow) { whiteGlow = document.createElement("canvas"); whiteGlow.width = whiteGlow.height = 64; const w = whiteGlow.getContext("2d"), gr = w.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.2, "rgba(255,235,250,.7)"); gr.addColorStop(.5, "rgba(255,190,240,.18)"); gr.addColorStop(1, "rgba(255,160,230,0)"); w.fillStyle = gr; w.fillRect(0, 0, 64, 64); }
  g.globalAlpha = Math.min(1, a); g.drawImage(whiteGlow, x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
const colCache = new Map();
function column(h) {
  const hue = ((Math.round(h / 5) * 5) % 360 + 360) % 360;
  let c = colCache.get(hue); if (c) return c;
  c = document.createElement("canvas"); c.width = 2; c.height = 128;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 128, 0, 0);
  gr.addColorStop(0, hsl(hue, 95, 55, 0)); gr.addColorStop(.12, hsl(hue, 100, 62, .9)); gr.addColorStop(.5, hsl(hue + 25, 95, 58, .45)); gr.addColorStop(1, hsl(hue + 50, 90, 55, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 2, 128); colCache.set(hue, c); return c;
}
function fillRibbon(g, pts, halfAt) {
  const n = pts.length; if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, h = halfAt(i / (n - 1));
    const nx = -ty / tl * h, ny = tx / tl * h;
    L.push([pts[i][0] + nx, pts[i][1] + ny]); R.push([pts[i][0] - nx, pts[i][1] - ny]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fill();
}
const NEON = [[1, .07, 0], [.45, .22, 0], [.2, .7, .1], [.07, .95, .6]];
function ribbonNeon(g, pts, hue, halfAt, alpha = 1) { NEON.forEach(([k, a, wh]) => { g.fillStyle = hsl(hue, 100, 60 + wh * 40, a * alpha); fillRibbon(g, pts, f => halfAt(f) * k); }); }
function strokePath(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
function hueRGB(h) { h = ((h % 360) + 360) % 360 / 60; const x = 1 - Math.abs(h % 2 - 1); const m = [[1, x, 0], [x, 1, 0], [0, 1, x], [0, x, 1], [x, 0, 1], [1, 0, x]][Math.floor(h) % 6]; return m.map(v => Math.round(40 + v * 215)); }
function bolt(x0, y0, x1, y1, disp) {
  let pts = [[x0, y0], [x1, y1]];
  for (let k = 0; k < 6; k++) { const nx = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, o = (Math.random() - .5) * disp; nx.push(a, [(a[0] + b[0]) / 2 - dy / l * o, (a[1] + b[1]) / 2 + dx / l * o]); } nx.push(pts[pts.length - 1]); pts = nx; disp *= .55; }
  return pts;
}
const E2 = v => Math.min(1.25, v);
/* ================= Forms: what a node draws =================
   draw(E): E.g is the node's own layer; E.n is the node's live state (x, y, ang, vx, vy, hue);
   E.R is the music as this node hears it; E.S is the node's scale; E.t is the node's clock. */
const FORMS = [
  { key: "ribbon", name: "Neon ribbon", fade: 1, char: "skater", init: () => ({ h: [] }),
    shape: [{ key: "length", label: "Length" }, { key: "thick", label: "Thickness" }, { key: "taper", label: "Taper" }],
    draw(E) { const { g, n, R, S, st, L } = E, max = Math.round(L("length", 50, 320)); st.h.push([n.x, n.y]); while (st.h.length > max) st.h.shift();
      const w = S * (.016 + .03 * R.kick + .008 * R.bass) * (1 + .15 * R.idle * R.breath) * L("thick", .35, 1.65), tp = L("taper", .2, 1.8);
      ribbonNeon(g, st.h, n.hue, f => w * Math.pow(f, tp)); sprite(g, n.hue, n.x, n.y, w * 2.4, .9); } },
  { key: "whip", name: "Whip strand", fade: .42, char: "wander", init: () => ({ ch: null }),
    shape: [{ key: "length", label: "Length" }, { key: "thick", label: "Thickness" }, { key: "wiggle", label: "Wiggle" }],
    draw(E) { const { g, n, R, S, st, t, L } = E, N = Math.round(L("length", 12, 44)), seg = S * (.015 + .006 * R.bass);
      if (!st.ch || st.ch.length !== N) st.ch = Array.from({ length: N }, (_, i) => ({ x: n.x, y: n.y + i * seg, px: n.x, py: n.y + i * seg }));
      const ch = st.ch;
      for (let i = 1; i < N; i++) { const p = ch[i], vx = (p.x - p.px) * .93, vy = (p.y - p.py) * .93; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; }
      if (E.beat) { const a = n.ang + Math.PI / 2; for (let i = 1; i < N; i++) { const f = S * (.012 + .03 * R.kick) * (i / N) * (Math.random() < .5 ? 1 : -1); ch[i].x += Math.cos(a) * f; ch[i].y += Math.sin(a) * f; } }
      ch[0].x = n.x; ch[0].y = n.y;
      for (let it = 0; it < 4; it++) for (let i = 1; i < N; i++) { const a = ch[i - 1], b = ch[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - seg) / d; if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * .5; a.y += dy * k * .5; b.x -= dx * k * .5; b.y -= dy * k * .5; } ch[0].x = n.x; ch[0].y = n.y; }
      const ph = E.node.seed * 20, wg = L("wiggle", 0, 2);
      const pts = ch.map((p, i) => { const a = ch[Math.max(0, i - 1)], b = ch[Math.min(N - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, o = Math.sin(i * .55 - t * 9 + ph) * S * (.014 + .03 * R.kick + .012 * E2(R.energy)) * (i / N) * wg; return [p.x - ty / l * o, p.y + tx / l * o]; });
      const w = S * (.013 + .02 * R.kick) * L("thick", .35, 1.65); ribbonNeon(g, pts, n.hue, f => w * (1 - f * .85)); sprite(g, n.hue, n.x, n.y, w * 2.6, .95); } },
  { key: "halo", name: "Halo rings", fade: .32, char: "wander", init: () => ({ rings: [] }),
    shape: [{ key: "tilt", label: "Tilt" }, { key: "speed", label: "Ring speed" }, { key: "count", label: "Rings", min: 1, max: 4, def: 0 }],
    draw(E) { const { g, n, R, S, st, t, dt, L, I } = E, sd = E.node.seed, tilt = L("tilt", .95, .12);
      if (E.beat) for (let k = 0, c = I("count"); k < c; k++) st.rings.push({ r: S * (.02 + k * .03), a: 1, rot: n.ang + k * .4, sq: clamp(tilt + (Math.random() - .5) * .2, .08, 1) });
      for (let i = st.rings.length - 1; i >= 0; i--) { const q = st.rings[i]; q.r += dt * S * (.22 + .35 * E2(R.energy)) * L("speed", .35, 1.8); q.a -= dt * .9; if (q.a <= 0) { st.rings.splice(i, 1); continue; }
        [[4, .12], [1, .8]].forEach(([wm, al]) => { g.lineWidth = S * .004 * wm * q.a + .8; g.strokeStyle = hsl(n.hue, 100, 70, q.a * al); g.beginPath(); g.ellipse(n.x, n.y, q.r, q.r * q.sq, q.rot, 0, TAU); g.stroke(); }); }
      const r = S * (.055 + .035 * R.bass + .01 * R.idle * R.breath);
      g.setLineDash([S * .012, S * .022]); g.lineDashOffset = -t * S * .3 * (sd > .5 ? 1 : -1); g.lineWidth = 1.6; g.strokeStyle = hsl(n.hue, 90, 75, .7);
      g.beginPath(); g.ellipse(n.x, n.y, r, r * tilt, t * .4 + sd * 6, 0, TAU); g.stroke(); g.setLineDash([]);
      sprite(g, n.hue, n.x, n.y, S * (.035 + .03 * R.kick), .95); } },
  { key: "wave", name: "Wave line", fade: .38, char: "wander",
    shape: [{ key: "freq", label: "Waves" }, { key: "height", label: "Height" }, { key: "rough", label: "Roughness" }],
    draw(E) { const { g, n, R, S, t, W, L } = E, sd = E.node.seed, freq = L("freq", .8, 6.5) + sd, amp = S * (.08 + .16 * E2(R.energy)) * L("height", .3, 1.7), rough = L("rough", 0, 2.2), pts = [];
      g.lineJoin = g.lineCap = "round";
      for (let x = 0; x <= W; x += W / 180) { const f = x / W, d = (x - n.x) / (W * .3), env = .12 + Math.exp(-d * d) * (.7 + .5 * R.kick); const v = Math.sin(f * freq * TAU - t * 3.2 + sd * 9) * .7 + Math.sin(f * freq * 2.7 * TAU + t * 2.1) * .3 * (.4 + R.treble) * rough; pts.push([x, n.y + v * env * amp]); }
      [[7, .1], [2.6, .38], [1.1, 1]].forEach(([w, a]) => { g.lineWidth = w * (1 + R.kick * .6); g.strokeStyle = hsl(n.hue, 100, 64 + (w < 2 ? 25 : 0), a); strokePath(g, pts); });
      sprite(g, n.hue, n.x, n.y, S * .03, .7); } },
  { key: "aurora", name: "Aurora curtain", fade: 1, char: "wander", def: { roam: .3, tempo: .35 },
    shape: [{ key: "width", label: "Width" }, { key: "height", label: "Height" }, { key: "folds", label: "Folds" }],
    draw(E) { const { g, n, R, S, t, W, L } = E, sd = E.node.seed * 9, cols = 60, span = Math.min(W * L("width", .3, .98), S * L("width", .7, 2.2)), cw = span / cols, fo = L("folds", 5, 22);
      for (let k = 0; k < cols; k++) { const f = k / (cols - 1), x = n.x - span / 2 + f * span + Math.sin(f * 3 + t + sd) * S * .03;
        const fold = .5 + .5 * Math.sin(f * fo + t * 2.2 + sd * 2) * Math.sin(f * 4.5 - t * .8 + sd), edge = Math.sin(f * Math.PI);
        const h = S * (.16 + .42 * E2(R.energy)) * (.55 + .45 * fold) * edge * L("height", .4, 1.7), base = n.y + S * .15 + Math.sin(f * 5 + t * .6) * S * .02;
        g.globalAlpha = Math.min(1, (.25 + .55 * fold) * edge * (.8 + .4 * R.kick)); g.drawImage(column(n.hue + f * 30), x, base - h, cw * 1.7, h); }
      g.globalAlpha = 1; } },
  { key: "branches", name: "Branching limbs", fade: .3, char: "wander",
    shape: [{ key: "spread", label: "Spread" }, { key: "depth", label: "Depth", min: 2, max: 6, def: .25 }, { key: "limb", label: "Limb length" }],
    draw(E) { const { g, n, R, S, t, L, I } = E, i = E.node.seed * 10; g.lineCap = "round";
      const depth = clamp(I("depth") + Math.round(E2(R.energy) * 1.2), 2, 7), trunk = S * (.1 + .04 * E2(R.energy)) * (1 + .25 * R.kick) * L("limb", .5, 1.6), spread = L("spread", .25, 1.05) + .16 * Math.sin(t * .7 + i) + R.mid * .25, segs = [], tips = [];
      (function br(x, y, a, len, d) {
        const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, bend = Math.sin(t * 1.3 + d * 1.7 + i) * len * .28;
        segs.push([x, y, (x + ex) / 2 - Math.sin(a) * bend, (y + ey) / 2 + Math.cos(a) * bend, ex, ey, d]);
        if (d >= depth) { tips.push([ex, ey]); return; }
        const s = spread * (1 - d * .06) + Math.sin(t * 1.1 + d + i) * .14, nl = len * .76;
        br(ex, ey, a - s, nl, d + 1); br(ex, ey, a + s, nl, d + 1);
      })(n.x, n.y, E.node.char === "anchored" ? n.ang : n.ang + Math.PI, trunk, 0);
      [[3.4, .12], [1, .85]].forEach(([wm, al]) => { for (let d = 0; d <= depth; d++) { g.lineWidth = (1.2 + (depth - d) * 1.1) * wm; g.strokeStyle = hsl(n.hue + d * 8, 100, 62 + (wm < 2 ? 18 : 0), al); g.beginPath(); segs.forEach(s => { if (s[6] === d) { g.moveTo(s[0], s[1]); g.quadraticCurveTo(s[2], s[3], s[4], s[5]); } }); g.stroke(); } });
      tips.forEach((p, k) => { const tw = .5 + .5 * Math.sin(t * 4 + k * .7 + i); sprite(g, n.hue + 20, p[0], p[1], S * (.008 + .012 * R.hat) * (.6 + .6 * tw), .7 * tw + .2); });
      sprite(g, n.hue, n.x, n.y, S * .035, .9); } },
  { key: "lightning", name: "Lightning", fade: .5, char: "wander", init: () => ({ bolts: [], flash: 0 }),
    shape: [{ key: "forks", label: "Forks", min: 0, max: 5, def: .4 }, { key: "jagged", label: "Jagged" }, { key: "reach", label: "Reach" }],
    draw(E) { const { g, n, R, S, st, dt, L, I } = E, jag = L("jagged", .3, 1.9); g.lineJoin = g.lineCap = "round";
      const others = E.all.filter(o => o.rt !== n);
      let near = null, bd = 1e12; others.forEach(o => { const d = (o.rt.x - n.x) ** 2 + (o.rt.y - n.y) ** 2; if (d < bd) { bd = d; near = o; } });
      g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 90, 70, .1 + .15 * Math.min(1, R.energy));
      if (near) strokePath(g, bolt(n.x, n.y, near.rt.x, near.rt.y, S * (.03 + .04 * R.treble) * jag));
      else for (let k = 0; k < 3; k++) { const a = Math.random() * TAU, Ln = S * (.06 + .06 * R.energy); strokePath(g, bolt(n.x, n.y, n.x + Math.cos(a) * Ln, n.y + Math.sin(a) * Ln, Ln * .5 * jag)); }
      if (E.beat) {
        let tx, ty; if (others.length && Math.random() < .7) { const o = others[Math.floor(Math.random() * others.length)]; tx = o.rt.x; ty = o.rt.y; } else { const a = Math.random() * TAU, Ln = S * (L("reach", .12, .6) + Math.random() * .2); tx = n.x + Math.cos(a) * Ln; ty = n.y + Math.sin(a) * Ln; }
        const main = bolt(n.x, n.y, tx, ty, Math.min(S * .25, Math.hypot(tx - n.x, ty - n.y) * .4) * jag); st.bolts.push({ pts: main, age: 0, w: 1 });
        for (let f = 0, fc = I("forks"); f < fc; f++) { const s = main[Math.floor(main.length * (.2 + Math.random() * .6))], ang = Math.random() * TAU, Ln = S * (.08 + Math.random() * .12); st.bolts.push({ pts: bolt(s[0], s[1], s[0] + Math.cos(ang) * Ln, s[1] + Math.sin(ang) * Ln, Ln * .5 * jag), age: 0, w: .55 }); }
        st.flash = .5 + .4 * R.kick;
      }
      for (let i = st.bolts.length - 1; i >= 0; i--) { const bl = st.bolts[i]; bl.age += dt; if (bl.age > .5) { st.bolts.splice(i, 1); continue; }
        const env = 1 - bl.age / .5, fl = bl.age < .25 ? .55 + .45 * Math.abs(Math.sin(bl.age * 30)) : 1, a = env * env * fl;
        [[8, .12, 70], [3, .45, 72], [1.2, 1, 97]].forEach(([w, al, l]) => { g.lineWidth = w * bl.w; g.strokeStyle = hsl(n.hue, 100, l, a * al); strokePath(g, bl.pts); }); }
      if (st.flash > 0) { sprite(g, n.hue, n.x, n.y, S * .35, st.flash * .35); st.flash = Math.max(0, st.flash - dt * 2.5); }
      sprite(g, n.hue, n.x, n.y, S * (.03 + .025 * R.kick), .9); } },
  { key: "kaleido", name: "Kaleidoscope", fade: .1, char: "wander",
    shape: [{ key: "folds", label: "Folds", min: 3, max: 9, def: .5, fmt: v => (v * 2) + "-way" }, { key: "petal", label: "Petal length" }, { key: "width", label: "Petal width" }],
    draw(E) { const { g, n, R, S, t, W, H, L, I } = E, cx = W / 2, cy = H / 2, spin = t * .12 * (E.node.seed > .5 ? 1 : -1), pairs = I("folds");
      const rx = (n.x - cx) * .85, ry = (n.y - cy) * .85, Ln = S * (.035 + .05 * E2(R.energy) + .03 * R.kick) * L("petal", .5, 1.9), wd = Ln * L("width", .12, .65);
      for (let k = 0; k < pairs * 2; k++) {
        g.save(); g.translate(cx, cy); g.rotate(spin + Math.floor(k / 2) * TAU / pairs); if (k % 2) g.scale(1, -1);
        g.translate(rx, ry); g.rotate(n.ang);
        g.beginPath(); g.moveTo(-Ln / 2, 0); g.quadraticCurveTo(0, -wd, Ln / 2, 0); g.quadraticCurveTo(0, wd, -Ln / 2, 0);
        g.fillStyle = hsl(n.hue, 95, 58, .22 + .2 * R.kick); g.fill(); g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 100, 85, .35); g.stroke();
        g.restore();
      }
      sprite(g, n.hue, cx, cy, S * (.03 + .03 * R.kick), .3); } },
  { key: "orbiters", name: "Orbiters", fade: .2, char: "waltz", init: () => ({ moons: [] }),
    shape: [{ key: "moons", label: "Moons", min: 2, max: 8, def: .5 }, { key: "orbit", label: "Orbit width" }, { key: "tilt", label: "Tilt" }],
    draw(E) { const { g, n, R, S, st, t, dt, L, I } = E, sd = E.node.seed, dirn = sd > .5 ? 1 : -1, tilt = t * .15 + sd * 6, sq = L("tilt", .95, .12) + .1 * Math.sin(t * .3 + sd * 4), back = [], front = [], cnt = I("moons");
      while (st.moons.length < cnt) { const j = st.moons.length; st.moons.push({ th: seeded(sd * 99 + j) * TAU, dh: (j - 2) * 22 }); }
      st.moons.length = cnt;
      st.moons.forEach((m, j) => { const r = S * (.06 + .04 * j * 5 / cnt) * (1 + .45 * R.kick + .1 * R.bass) * L("orbit", .5, 1.7); m.th += dt * (1.8 / Math.pow(j + 1, .7)) * (1 + R.rms * 1.5) * dirn;
        const ox = Math.cos(m.th) * r, oy = Math.sin(m.th) * r * sq, z = Math.sin(m.th);
        (z < 0 ? back : front).push([n.x + ox * Math.cos(tilt) - oy * Math.sin(tilt), n.y + ox * Math.sin(tilt) + oy * Math.cos(tilt), z, n.hue + m.dh]); });
      const draw = list => list.forEach(([x, y, z, h]) => sprite(g, h, x, y, S * .026 * (1 + .35 * z), .55 + .4 * (z + 1) / 2));
      draw(back); sprite(g, n.hue, n.x, n.y, S * (.06 + .03 * R.kick + .01 * R.breath), .95); draw(front); } },
  { key: "dust", name: "Dust spray", fade: .22, char: "moth", init: () => ({ ps: [], acc: 0 }),
    shape: [{ key: "amount", label: "Amount" }, { key: "spread", label: "Spread", def: 1 }, { key: "life", label: "Linger" }],
    draw(E) { const { g, n, R, S, st, dt, L } = E, cone = L("spread", .08, 1) * TAU;
      st.acc += dt * (30 + 160 * E2(R.energy)) * L("amount", .25, 2.2);
      while (st.acc >= 1 && st.ps.length < 900) { st.acc -= 1; const a = n.ang + Math.PI + (Math.random() - .5) * cone, sp = S * (.04 + .2 * R.kick + .05 * Math.random()), life = (.8 + Math.random()) * L("life", .35, 2); st.ps.push({ x: n.x, y: n.y, vx: Math.cos(a) * sp + n.vx * .35, vy: Math.sin(a) * sp + n.vy * .35, life, max: life, h: n.hue + (Math.random() - .5) * 30 }); }
      st.acc = Math.min(st.acc, 1);
      const ps = st.ps, damp = Math.pow(.4, dt);
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.life -= dt; if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; } p.vx *= damp; p.vy *= damp; p.x += p.vx * dt; p.y += p.vy * dt; const k = p.life / p.max; sprite(g, p.h, p.x, p.y, S * .012 * (.4 + .6 * k), Math.min(1, (1 - k) * 6) * k * .8); }
      sprite(g, n.hue, n.x, n.y, S * (.03 + .03 * R.kick), .95); } },
  { key: "tornado", name: "Tornado", fade: 1, char: "anchored", def: { roam: .18 }, init: () => ({ strands: [] }),
    shape: [{ key: "flare", label: "Top width", def: .4 }, { key: "base", label: "Bottom width", def: .05 }, { key: "height", label: "Height" }, { key: "twist", label: "Twist" }, { key: "strands", label: "Strands", min: 2, max: 9, def: .57 }],
    draw(E) { const { g, n, R, S, st, t, L, I } = E, cnt = I("strands");
      if (st.strands.length !== cnt) st.strands = Array.from({ length: cnt }, (_, i) => { const b = E.node.seed * 50 + i; return { dh: i * 360 / cnt, az: i / cnt * TAU + seeded(b) * .4, twist: .9 + seeded(b + 9) * .5, pitch: 1.1 + seeded(b + 19) * .5, dir: i % 2 ? -1 : 1, ph: seeded(b + 29) }; });
      const bx = n.x, by = n.y, height = S * L("height", .45, 1.7), coneW = S * (.2 + .12 * E2(R.energy) + .1 * R.kick), flare = L("flare", .3, 2.1), base = L("base", .005, .35), tw = L("twist", .15, 1.9);
      const spin = 1.2 + 1.6 * R.rms, lean = Math.sin(t * .5) * coneW * .35;
      st.strands.forEach(s => { const pts = [];
        for (let i = 0; i <= 70; i++) { const h = i / 70, ang = s.az + s.twist * tw * h * TAU * s.dir + t * spin * s.dir + Math.sin(t * 1.3 + h * 6 + s.ph * 9) * .35, r = coneW * (base + Math.pow(h, s.pitch) * flare) * (1 + .07 * Math.sin(h * 8 - t * 2)); pts.push([bx + lean * h + Math.cos(ang) * r, by - h * height + Math.sin(ang) * r * .28]); }
        const w = S * (.02 + .018 * R.kick); ribbonNeon(g, pts, n.hue + s.dh, f => w * (.25 + .75 * Math.min(1, f * 2.5)), .85); });
      spriteWhite(g, bx, by, S * (.07 + .05 * R.kick) * (1 + base * 2), .95); } },
  { key: "vine", name: "Filigree vine", fade: 1, char: "skater", init: () => ({ h: [] }),
    shape: [{ key: "length", label: "Length" }, { key: "petal", label: "Petal size" }, { key: "curl", label: "Curl" }],
    draw(E) { const { g, n, R, S, st, t, L } = E, h = st.h, last = h[h.length - 1], max = Math.round(L("length", 50, 320));
      if (!last || Math.hypot(n.x - last[0], n.y - last[1]) > S * .004) { h.push([n.x, n.y]); }
      while (h.length > max) h.shift();
      g.lineCap = g.lineJoin = "round";
      if (h.length >= 6) {
        [[3, .12], [1.2, .9]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(n.hue, 90, 70, a); strokePath(g, h); });
        const Ln = S * (.045 + .02 * E2(R.energy) + .02 * R.kick), curl = L("curl", .3, 1.9), ps = L("petal", .25, 2.1);
        for (let i = h.length - 1, k = 0; i > 4; i -= 12, k++) {
          const p = h[i], q = h[i - 3], tang = Math.atan2(p[1] - q[1], p[0] - q[0]), side = k % 2 ? 1 : -1;
          const grow = Math.min(1, (h.length - 1 - i) / 24), len = Ln * grow * (1 - (h.length - 1 - i) / h.length * .45);
          if (len < 1) continue;
          const pts = []; let x = p[0], y = p[1], a = tang + side * 1.1;
          for (let u = 0; u <= 24; u++) { pts.push([x, y]); const f = u / 24; a += side * (.05 + f * f * .5) * curl * (1 + .25 * Math.sin(t * 2 + k)); const sl = len / 24 * (1 - f * .6); x += Math.cos(a) * sl; y += Math.sin(a) * sl; }
          g.lineWidth = 1.4; g.strokeStyle = hsl(n.hue + 30, 95, 72, .75); strokePath(g, pts);
          g.save(); g.translate(pts[6][0], pts[6][1]); g.rotate(tang + side * 1.9);
          const pl = len * .5 * (1 + .4 * R.kick) * ps;
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(pl * .5, -pl * .45, pl, -pl * .1, pl * .8, pl * .25); g.bezierCurveTo(pl * .6, pl * .4, pl * .2, pl * .2, 0, 0);
          g.fillStyle = hsl(n.hue - 25, 100, 60, .3); g.fill(); g.lineWidth = 1; g.strokeStyle = hsl(n.hue - 25, 100, 82, .6); g.stroke();
          g.restore();
        }
        for (let i = 0; i < h.length; i += 5) { const tw = Math.pow(.5 + .5 * Math.sin(t * 7 - i * .25), 6); sprite(g, n.hue + 40, h[i][0], h[i][1], S * (.006 + .012 * tw), .25 + .75 * tw); }
      }
      sprite(g, n.hue, n.x, n.y, S * .035, .9); } },
  { key: "tubeman", name: "Tube dancer", fade: 1, char: "anchored", def: { roam: .14 },
    init: node => ({ fold: 0, side: node.seed > .5 ? 1 : -1 }),
    shape: [{ key: "height", label: "Height" }, { key: "flop", label: "Floppiness" }, { key: "arms", label: "Arm length" }],
    draw(E) { const { g, n, R, S, st, t, dt, L } = E, T = t * 2.6, i = E.node.seed * 7, flop = L("flop", .25, 1.9);
      if (E.beat && Math.random() < .75) { st.fold = 1; st.side = Math.random() < .5 ? -1 : 1; }
      st.fold = Math.max(0, st.fold - dt * 1.5);
      const N = 30, seg = S * L("height", .4, 1.3) / N; let x = n.x, y = n.y, a; const pts = [[x, y]];
      for (let k = 1; k <= N; k++) { const f = k / N;
        a = -Math.PI / 2 + f * (.8 + .7 * E2(R.energy)) * flop * (Math.sin(T * 1.7 - k * .35 + i) * .55 + Math.sin(T * 2.9 - k * .6 + i * .5) * .3) + (f > .45 ? st.side * Math.sin(st.fold * Math.PI) * 2.4 * (f - .45) / .55 : 0);
        x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
      const w = S * .042 * (1 + .15 * R.kick), arm = S * .017 * L("arms", .3, 1.9);
      ribbonNeon(g, pts, n.hue, f => w * .5 * (1.5 - f * .3), .9);
      const ai = Math.round(N * .74), sh = pts[ai], sp = pts[ai - 1], bodyA = Math.atan2(sh[1] - sp[1], sh[0] - sp[0]);
      [-1, 1].forEach(sd => { const armPts = [[sh[0], sh[1]]]; let ax = sh[0], ay = sh[1], aa = bodyA + sd * (1.3 + .8 * Math.sin(T * 2.4 + sd + i));
        for (let k = 0; k < 10; k++) { aa += sd * .14 * flop * Math.sin(T * 3.1 + k * .5 + i); ax += Math.cos(aa) * arm; ay += Math.sin(aa) * arm; armPts.push([ax, ay]); }
        ribbonNeon(g, armPts, n.hue + 15, f => w * .3 * (1 - f * .4), .9); });
      sprite(g, n.hue, pts[N][0], pts[N][1], w * 1.5, .9); } },
  { key: "fiddle", name: "Fiddlehead", fade: .3, char: "anchored", def: { roam: .12 }, init: () => ({ curl: 1 }),
    shape: [{ key: "fronds", label: "Fronds", min: 2, max: 6, def: .25 }, { key: "length", label: "Length" }, { key: "curl", label: "Curl" }],
    draw(E) { const { g, n, R, S, st, t, dt, L, I } = E, i = E.node.seed * 7, target = 1 - Math.min(.85, R.energy * .7), cnt = I("fronds"), curlK = L("curl", .3, 1.9);
      if (E.beat) st.curl = Math.max(0, st.curl - .4);
      st.curl += (target - st.curl) * dt * 1.1;
      g.lineCap = "round";
      for (let f = 0; f < cnt; f++) {
        const dirn = f % 2 ? 1 : -1, Ln = S * (.13 + .04 * E2(R.energy)) * L("length", .5, 1.8), N = 40, pts = [];
        let x = n.x, y = n.y, a = n.ang + (f - (cnt - 1) / 2) * (TAU / 3) / Math.max(1, cnt - 1) * 1.6 + Math.sin(t * .5 + i) * .3;
        for (let u = 0; u <= N; u++) { pts.push([x, y]); const k = u / N; a += dirn * st.curl * curlK * k * k * .55 + .012 * Math.sin(t * 3 + u * .3); x += Math.cos(a) * Ln / N; y += Math.sin(a) * Ln / N; }
        const w = S * .012; ribbonNeon(g, pts, n.hue + f * 12, ff => w * (1 - ff * .75), .85);
        g.lineWidth = 1; g.strokeStyle = hsl(n.hue + 20, 100, 75, .6); g.beginPath();
        for (let u = 4; u < N - 4; u += 4) { const p = pts[u], q = pts[u + 1], ta = Math.atan2(q[1] - p[1], q[0] - p[0]), ll = S * .02 * (1 - u / N); [-1, 1].forEach(sd => { g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(ta + sd * 1.1) * ll, p[1] + Math.sin(ta + sd * 1.1) * ll); }); }
        g.stroke();
      }
      sprite(g, n.hue, n.x, n.y, S * .03, .9); } },
  { key: "doodle", name: "Boiling doodle", fade: 1, char: "wander",
    init: () => ({ boil: 0, seed: 0 }),
    shape: [{ key: "kind", label: "Shape", min: 0, max: 2, fmt: v => ["Flower", "Blob", "Spiral"][v] }, { key: "wobble", label: "Wobble" }, { key: "size", label: "Size" }],
    draw(E) { const { g, n, R, S, st, t, dt, L } = E;
      const kind = E.node.shape && E.node.shape.kind != null ? Math.round(E.node.shape.kind * 2) : Math.floor(E.node.seed * 3) % 3;
      st.boil += dt; if (st.boil > 1 / 9) { st.boil = 0; st.seed++; }
      g.lineCap = g.lineJoin = "round";
      const jit = S * .006 * (1 + R.hat * 2.5) * L("wobble", 0, 3), base = E.node.seed * 1e4, J = k => (seeded(st.seed * 97 + k + base) - .5) * jit * 2;
      const sz = S * (.08 + .05 * E2(R.energy)) * (1 + .35 * R.kick) * L("size", .45, 1.8), N = 44, pts = [];
      for (let k = 0; k <= N; k++) { const u = k / N; let r, a;
        if (kind === 0) { a = u * TAU + t * .3; r = sz * (.62 + .38 * Math.cos(a * 5 - t * .4)); }
        else if (kind === 1) { a = u * TAU - t * .3; r = sz * (.82 + .18 * Math.sin(a * 3 + t) + .08 * Math.sin(a * 7)); }
        else { a = u * TAU * 2.4 + t; r = sz * (.12 + .88 * u); }
        pts.push([n.x + Math.cos(a) * r + J(k * 3), n.y + Math.sin(a) * r + J(k * 5 + 71)]); }
      g.lineWidth = 2.4; g.strokeStyle = hsl(n.hue, 100, 68, .9); strokePath(g, pts);
      g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 50, 92, .5); strokePath(g, pts.map((p, k) => [p[0] + 1.5 + J(k + 900), p[1] - 1 + J(k + 700)]));
      const idx = E.all.findIndex(o => o.rt === n), next = E.all.slice(idx + 1).find(o => o.node.form === "doodle");
      if (next) { const b = next.rt, dx = b.x - n.x, dy = b.y - n.y, l = Math.hypot(dx, dy) || 1, sq = [];
        for (let k = 0; k <= 40; k++) { const u = k / 40, o = Math.sin(u * 22 + t * 6) * S * .012 * Math.sin(Math.PI * u); sq.push([n.x + dx * u - dy / l * o + J(k + 400), n.y + dy * u + dx / l * o + J(k + 300)]); }
        g.lineWidth = 1.4; g.strokeStyle = "rgba(235,235,245,.45)"; strokePath(g, sq); } } },
  { key: "lava", name: "Lava blobs", fade: 1, char: "wander", init: () => ({ x: 0, y: 0, vx: 0, vy: 0, ready: false }),
    shape: [{ key: "blob", label: "Blob size" }, { key: "drip", label: "Droplet size" }, { key: "fling", label: "Fling" }],
    draw(E) { const { n, R, S, st, dt, t, L } = E;
      if (!st.ready) { st.x = n.x; st.y = n.y; st.ready = true; }
      if (E.beat) { const a = Math.random() * TAU, f = S * (1.4 + 2.6 * R.kick) * L("fling", 0, 2.2); st.vx += Math.cos(a) * f; st.vy += Math.sin(a) * f; }
      st.vx += (n.x - st.x) * dt * 7; st.vy += (n.y - st.y) * dt * 7; st.vx *= Math.pow(.3, dt); st.vy *= Math.pow(.3, dt); st.x += st.vx * dt; st.y += st.vy * dt;
      const r = S * (.09 + .035 * E2(R.energy)) * (1 + .1 * Math.sin(t * 2.2 + E.node.seed * 9)) * L("blob", .45, 1.7);
      E.frame.lava.push([n.x, n.y, r, n.hue, E.level], [st.x, st.y, r * L("drip", .2, 1), n.hue + 30, E.level]); } },
  { key: "spiro", name: "Spirograph", fade: .035, char: "anchored", def: { roam: .12 },
    init: () => ({ th: 0, k: 0, prev: null }),
    shape: [{ key: "gears", label: "Petals", min: 3, max: 9, def: .17 }, { key: "size", label: "Loop size" }, { key: "pen", label: "Pen reach" }],
    draw(E) { const { g, n, R, S, st, t, dt, L, I } = E, sd = E.node.seed, dirn = sd > .5 ? -1 : 1, baseK = I("gears");
      if (!st.k || Math.abs(st.k - baseK) > 1) st.k = baseK;
      if (E.beat && Math.random() < .3) st.k = clamp(baseK + (Math.random() < .5 ? -1 : 1), 3, 9);
      const Rr = S * (.19 + .06 * E2(R.energy)) * L("size", .45, 1.7), r = Rr / st.k, d = r * (1.1 + .7 * R.kick + .3 * Math.sin(t * .3 + sd * 9)) * L("pen", .3, 1.8);
      g.lineCap = "round"; g.lineWidth = 1.3; g.strokeStyle = hsl(n.hue + Math.sin(t * .2 + sd * 9) * 35, 100, 66, .75); g.beginPath();
      for (let q = 0; q <= 8; q++) {
        st.th += dt * (2.6 + 3 * R.rms) / 8 * dirn;
        const x = n.x + (Rr - r) * Math.cos(st.th) + d * Math.cos((Rr - r) / r * st.th), y = n.y + (Rr - r) * Math.sin(st.th) - d * Math.sin((Rr - r) / r * st.th);
        if (q === 0) g.moveTo(st.prev ? st.prev[0] : x, st.prev ? st.prev[1] : y); else g.lineTo(x, y);
        st.prev = [x, y];
      }
      g.stroke(); sprite(g, n.hue, st.prev[0], st.prev[1], S * .02, .9); } },
  { key: "cradle", name: "Cat's cradle", fade: .5, char: "wander", init: () => ({ s: {} }),
    shape: [{ key: "strings", label: "Corner strings", def: .6 }, { key: "tension", label: "Tension" }, { key: "pluck", label: "Pluck" }],
    draw(E) { const { g, n, R, S, st, dt, W, H, L, k } = E, sd = E.node.seed, pegs = [[.07, .12], [.93, .12], [.07, .88], [.93, .88]], keep = k("strings");
      const targets = E.all.filter(o => o.rt !== n).map(o => ({ key: "n" + o.node.id, x: o.rt.x, y: o.rt.y, node: true })).concat(pegs.map((p, i) => ({ key: "p" + i, x: p[0] * W, y: p[1] * H, node: false, rank: seeded(sd * 77 + i) })));
      targets.forEach((tg, i) => { if (!st.s[tg.key]) { const hs = seeded(sd * 100 + i * 7.3); st.s[tg.key] = { amp: 0, mode: 1 + Math.floor(hs * 3), f: 18 + seeded(sd * 31 + i) * 30, ph: 0 }; } st.s[tg.key].on = tg.node || tg.rank < keep; });
      if (E.beat) { const keys = targets.map(q => q.key).filter(key => st.s[key].on); for (let j = 0; j < 2 && keys.length; j++) st.s[keys[Math.floor(Math.random() * keys.length)]].amp = 1; }
      g.lineCap = "round";
      const ten = L("tension", .35, 2.2), pl = L("pluck", .25, 2.2);
      targets.forEach(tg => { const s = st.s[tg.key]; if (!s.on) return; s.amp *= Math.exp(-dt * 1.6); s.ph += dt * s.f * ten;
        const dx = tg.x - n.x, dy = tg.y - n.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, amp = (S * .05 * s.amp * (1 + R.bass) + S * .003 * R.breath * R.idle) * pl, pts = [];
        for (let j = 0; j <= 30; j++) { const u = j / 30, o = Math.sin(Math.PI * u * s.mode) * amp * Math.sin(s.ph); pts.push([n.x + dx * u + nx * o, n.y + dy * u + ny * o]); }
        [[3, .1 + .2 * s.amp], [1, .3 + .6 * s.amp]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(n.hue, 100, 72, a); strokePath(g, pts); });
        if (!tg.node) { g.lineWidth = 1; g.strokeStyle = "rgba(235,235,245,.4)"; g.beginPath(); g.arc(tg.x, tg.y, 4, 0, TAU); g.stroke(); } });
      sprite(g, n.hue, n.x, n.y, S * (.025 + .02 * R.kick), .95); } },
  { key: "seaweed", name: "Seaweed", fade: 1, char: "anchored", def: { roam: .1 }, init: () => ({ b: [] }),
    shape: [{ key: "fronds", label: "Fronds", min: 2, max: 9, def: .43 }, { key: "length", label: "Length" }, { key: "sway", label: "Sway" }],
    draw(E) { const { g, n, R, S, st, t, dt, L, I } = E, i = E.node.seed * 7, cnt = I("fronds"), sway = L("sway", .2, 2.1), lenK = L("length", .5, 1.8);
      for (let f = 0; f < cnt; f++) {
        const N = 26, seg = S * (.0085 + .003 * (f % 3)) * lenK, pts = [[n.x, n.y]], off = cnt > 1 ? f / (cnt - 1) - .5 : 0;
        let x = n.x, y = n.y, a = -Math.PI / 2 + off * 1.2;
        for (let k = 1; k <= N; k++) { const u = k / N; a += u * .1 * Math.sin(t * 1.5 - k * .3 + f * 1.3 + i) * (1 + E2(R.energy)) * sway - n.vx * .00006; x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
        ribbonNeon(g, pts, n.hue + f * 8, ff => S * .016 * (.35 + Math.sin(Math.PI * ff) * .7) * (1 - ff * .45), .55 + .3 * R.kick);
      }
      if (E.beat && Math.random() < .5) for (let b = 0; b < 2; b++) st.b.push({ x: n.x + (Math.random() - .5) * S * .08, y: n.y - S * .1 * lenK, r: S * (.006 + Math.random() * .01), life: 2.5 });
      for (let k = st.b.length - 1; k >= 0; k--) { const b = st.b[k]; b.life -= dt; if (b.life <= 0) { st.b.splice(k, 1); continue; } b.y -= dt * S * .18; b.x += Math.sin(b.y * .05 + k) * .4;
        g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 80, 85, Math.min(1, b.life) * .7); g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.stroke(); }
      sprite(g, n.hue, n.x, n.y, S * .025, .7); } }
];
const FORM = Object.fromEntries(FORMS.map(f => [f.key, f]));
/* ================= Characters: how a node travels ================= */
const CHARS = [
  { key: "anchored", name: "Planted", desc: "Stays at its home point and sways gently. Good for rooted forms." },
  { key: "wander", name: "Wanderer", desc: "Drifts in slow loops around its home point." },
  { key: "skater", name: "Figure Skater", desc: "Glides with almost no friction and orbits the nearest node; bigger nodes get wider orbits. Spins on the beat." },
  { key: "moth", name: "Moth", desc: "Spirals toward the biggest, brightest node and darts away on loud hits." },
  { key: "wallflower", name: "Wallflower", desc: "Shies away from nodes that come close and peeks back out when the music goes quiet." },
  { key: "metronome", name: "Metronome", desc: "Swings like a pendulum from its home point; turns into a chaotic double pendulum at high energy." },
  { key: "slinky", name: "Slinky", desc: "Hops from spot to spot, one hop per beat, landing with a bounce." },
  { key: "waltz", name: "Waltz", desc: "Circles its home point with a lilt on every third beat." },
  { key: "follow", name: "Shadow", desc: "Follows the node above it in the list, a half step behind." },
  { key: "housecat", name: "Housecat", desc: "Stalks slowly, freezes, then pounces on the beat." },
  { key: "custom", name: "Custom path", desc: "Traces a path you build from two oscillators. Shape it under Advanced." }
];
const CHAR = Object.fromEntries(CHARS.map(c => [c.key, c]));
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function fit(c, w, h) { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c.getContext("2d"); }
function leaderOf(node, all) { const i = all.findIndex(o => o.node === node); if (i < 0 || all.length < 2) return null; return i > 0 ? all[i - 1] : all[1]; }
function travel(node, rt, p, E) {
  const { dt, S0 } = E, roam = S0 * (.04 + .46 * p.roam), hx = node.hx * W, hy = node.hy * H, t = E.tc, sd = node.seed, tm = .35 + 1.4 * p.tempo, R = rt.R;
  const others = E.all.filter(o => o.rt !== rt);
  let tx = null, ty = null, ax = 0, ay = 0, damp = 0, phys = false;
  const px = rt.cx, py = rt.cy;
  switch (node.char) {
    case "dancer": case "taichi": { const m = mocapTarget(node, rt, p, E); tx = m[0]; ty = m[1]; break; }
    case "anchored": tx = hx + Math.sin(t * .9 + sd * 9) * roam * .1; ty = hy + Math.sin(t * .7 + sd * 5) * roam * .06; break;
    case "waltz": { const th = TAU * t * .3 * (sd > .5 ? 1 : -1), acc = .45 * Math.sin(TAU * t * .3 * 3); tx = hx + Math.cos(th + acc) * roam * .75; ty = hy + Math.sin(th + acc) * roam * .5; break; }
    case "metronome": { const sw = Math.sin(TAU * t * .45) * (.7 + .5 * p.energy); tx = hx + Math.sin(sw) * roam; ty = hy + Math.cos(sw) * roam;
      const wild = p.chaos * 2 + Math.max(0, p.energy - .55) * 3; if (wild > .3) { const a2 = sw * 2.3 + Math.sin(t * 2.7 + sd * 9) * wild; tx += Math.sin(a2) * roam * .45; ty += Math.cos(a2) * roam * .35; } break; }
    case "custom": { const amp = S0 * .9 * (.4 + p.energy), tt = t * 1.4, a = wave(node.o1.wave, tt * node.o1.rate) * node.o1.depth * amp, b = node.o2.on ? wave(node.o2.wave, tt * node.o2.rate + node.o2.phase) * node.o2.depth * amp : 0;
      tx = hx + Math.cos(node.dir) * a - Math.sin(node.dir) * b; ty = hy + Math.sin(node.dir) * a + Math.cos(node.dir) * b; break; }
    case "follow": { const lead = leaderOf(node, E.all);
      if (lead && lead.rt.hist.length > 4) { const h = lead.rt.hist[Math.max(0, lead.rt.hist.length - 28)], la = lead.rt.ang + Math.PI / 2; tx = h[0] + Math.cos(la) * S0 * .05; ty = h[1] + Math.sin(la) * S0 * .05; const k = Math.min(1, dt * 5); tx = lerp(px, tx, k); ty = lerp(py, ty, k); break; } }
    // falls through to wander when there is no one to follow
    case "wander": { const a = .5 + sd * .5, b = .23 + seeded(sd * 97) * .3, c = .4 + seeded(sd * 57) * .5, d = .17 + seeded(sd * 37) * .3;
      tx = hx + roam * Math.sin(t * a + sd * 20) * (.72 + .28 * Math.cos(t * b + sd * 7)); ty = hy + roam * .85 * Math.sin(t * c + sd * 13) * (.72 + .28 * Math.sin(t * d + sd * 3)); break; }
    case "skater": { phys = true; let tgt = null, best = 1e12;
      others.forEach(o => { const d = (o.rt.x - px) ** 2 + (o.rt.y - py) ** 2; if (d < best) { best = d; tgt = o; } });
      const cx0 = tgt ? tgt.rt.x : hx, cy0 = tgt ? tgt.rt.y : hy, R0 = tgt ? S0 * (.08 + .18 * tgt.rt.p.size) : roam * .6;
      const dx = px - cx0, dy = py - cy0, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, dirn = sd > .5 ? 1 : -1, tvx = -uy * dirn, tvy = ux * dirn;
      const vt = S0 * (.22 + .45 * p.energy) * tm * (1 + R.rms), vtan = rt.vx * tvx + rt.vy * tvy;
      ax = -ux * (d - R0) * 3.2 + tvx * (vt - vtan) * 1.6; ay = -uy * (d - R0) * 3.2 + tvy * (vt - vtan) * 1.6; damp = .5;
      if (E.beat) rt.spin = 1; break; }
    case "moth": { phys = true; let tgt = null, best = -1;
      others.forEach(o => { const v = o.rt.p.size * .6 + Math.min(1.2, o.rt.R ? o.rt.R.energy : 0) * .4; if (v > best) { best = v; tgt = o; } });
      const gx = tgt ? tgt.rt.x : W / 2, gy = tgt ? tgt.rt.y : H / 2, dx = gx - px, dy = gy - py, d = Math.hypot(dx, dy) || 1, near = Math.min(1, d / (S0 * .12)), dirn = sd > .5 ? 1 : -1;
      ax = dx / d * S0 * 1.3 * near * tm + (-dy / d) * S0 * 1.1 * dirn * tm; ay = dy / d * S0 * 1.3 * near * tm + (dx / d) * S0 * 1.1 * dirn * tm; damp = 1.3;
      if (E.beat && R.kick > .2) { rt.vx -= dx / d * S0 * (1.2 + 2 * R.kick); rt.vy -= dy / d * S0 * (1.2 + 2 * R.kick); } break; }
    case "wallflower": { phys = true; const quiet = R.energy < .45, gx = quiet ? lerp(hx, W / 2, .35) : hx, gy = quiet ? lerp(hy, H / 2, .35) : hy;
      ax = (gx - px) * 2.2; ay = (gy - py) * 2.2;
      others.forEach(o => { const dx = px - o.rt.x, dy = py - o.rt.y, d = Math.hypot(dx, dy) || 1, rr = S0 * .3; if (d < rr) { const f = (1 - d / rr) * S0 * 9; ax += dx / d * f; ay += dy / d * f; } });
      damp = 2.4; break; }
    case "slinky": { const cs = rt.cs;
      if (E.beat && !(cs.u < 1)) { const a = node.dir + (Math.random() - .5) * 1.8; let dd = roam * (.5 + Math.random() * .5), nx = px + Math.cos(a) * dd, ny = py + Math.sin(a) * dd;
        if (Math.hypot(nx - hx, ny - hy) > roam * 1.4) { nx = px + (hx - px) * .6; ny = py + (hy - py) * .6; dd = Math.hypot(nx - px, ny - py); }
        cs.from = [px, py]; cs.to = [clamp(nx, W * .03, W * .97), clamp(ny, H * .05, H * .97)]; cs.u = 0; cs.dur = .4 / Math.sqrt(tm); cs.dd = dd; }
      if (cs.u < 1) { cs.u = Math.min(1, cs.u + dt / cs.dur); const e = cs.u, arc = Math.sin(Math.PI * e) * cs.dd * .45; tx = lerp(cs.from[0], cs.to[0], e); ty = lerp(cs.from[1], cs.to[1], e) - arc; }
      else { tx = px; ty = py + Math.sin(t * 6) * S0 * .002; }
      break; }
    case "housecat": { const cs = rt.cs;
      const pick = () => { const a = Math.random() * TAU, dd = roam * (.4 + Math.random() * .6); cs.target = [clamp(hx + Math.cos(a) * dd, W * .03, W * .97), clamp(hy + Math.sin(a) * dd, H * .05, H * .97)]; cs.mode = "stalk"; cs.timer = 1 + Math.random() * 1.5; };
      if (!cs.target) pick();
      if (cs.mode === "stalk") { const dx = cs.target[0] - px, dy = cs.target[1] - py, d = Math.hypot(dx, dy) || 1, sp = Math.min(d * .5, S0 * .05 * tm) * dt; tx = px + dx / d * sp; ty = py + dy / d * sp; cs.timer -= dt; if (cs.timer <= 0) cs.mode = "freeze"; }
      else if (cs.mode === "freeze") { tx = px + Math.sin(t * 40) * .3; ty = py; if (E.beat) { cs.mode = "pounce"; cs.from = [px, py]; cs.u = 0; const a = Math.atan2(cs.target[1] - py, cs.target[0] - px); cs.target = [clamp(px + Math.cos(a) * roam * .9, W * .03, W * .97), clamp(py + Math.sin(a) * roam * .9, H * .05, H * .97)]; } }
      else { cs.u = Math.min(1, cs.u + dt / .18); const e = 1 - Math.pow(1 - cs.u, 3); tx = lerp(cs.from[0], cs.target[0], e); ty = lerp(cs.from[1], cs.target[1], e) - Math.sin(Math.PI * cs.u) * S0 * .04; if (cs.u >= 1) pick(); }
      break; }
  }
  if (phys) {
    const m = S0 * .04;
    if (px < m) ax += (m - px) * 12; if (px > W - m) ax -= (px - W + m) * 12; if (py < m) ay += (m - py) * 12; if (py > H - m) ay -= (py - H + m) * 12;
    rt.vx += ax * dt; rt.vy += ay * dt; const k = Math.exp(-damp * dt); rt.vx *= k; rt.vy *= k;
    rt.cx = clamp(px + rt.vx * dt, 0, W); rt.cy = clamp(py + rt.vy * dt, 0, H);
  } else {
    rt.cx = tx; rt.cy = ty; rt.vx = (tx - px) / Math.max(dt, 1e-3); rt.vy = (ty - py) / Math.max(dt, 1e-3);
  }
  // display position: magnetism, chaos jitter, grace (smooth vs. stepped)
  let ox = rt.cx, oy = rt.cy;
  if (others.length && p.magnetism !== 0) { let cx = 0, cy = 0; others.forEach(o => { cx += o.rt.x; cy += o.rt.y; }); cx /= others.length; cy /= others.length; ox += (cx - rt.cx) * p.magnetism * .3; oy += (cy - rt.cy) * p.magnetism * .3; }
  const jit = S0 * .045 * p.chaos * (1 + R.treble * 2); ox += vnoise(E.gt * 3 + sd * 50) * jit; oy += vnoise(E.gt * 3 + sd * 50 + 77) * jit;
  ox = clamp(ox, W * .01, W * .99); oy = clamp(oy, H * .01, H * .99);
  const prevX = rt.x == null ? ox : rt.x, prevY = rt.y == null ? oy : rt.y;
  const interval = Math.pow(1 - p.grace, 2) * .28; rt.hold += dt;
  if (rt.x == null || rt.hold >= interval) { rt.x = ox; rt.y = oy; rt.hold = 0; }
  const mvx = (rt.x - prevX) / Math.max(dt, 1e-3), mvy = (rt.y - prevY) / Math.max(dt, 1e-3);
  if (node.char === "anchored") rt.ang = node.dir;
  else if (Math.hypot(mvx, mvy) > S0 * .03) { const ta = Math.atan2(mvy, mvx); let d = ta - rt.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); rt.ang += d * Math.min(1, dt * 8); }
  rt.ang += rt.spin * dt * 16; rt.spin = Math.max(0, rt.spin - dt * 2);
  rt.hist.push([rt.x, rt.y]); if (rt.hist.length > 60) rt.hist.shift();
}
function fadeAlpha(base, trails, dt) { const k = trails < .5 ? lerp(3, 1, trails * 2) : lerp(1, .22, (trails - .5) * 2); const a = clamp(base * k, .015, 1); return a >= 1 ? 1 : 1 - Math.pow(1 - a, dt * 60); }
function drawLava(blobs) {
  const sc = 4, w = Math.max(8, Math.round(W / sc)), h = Math.max(8, Math.round(H / sc));
  if (lavaC.width !== w || lavaC.height !== h || !lavaImg) { lavaC.width = w; lavaC.height = h; lavaImg = lavaX.createImageData(w, h); }
  const bl = blobs.map(b => [b[0] / sc, b[1] / sc, (b[2] / sc) ** 2, hueRGB(b[3]), b[4]]), d = lavaImg.data;
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p += 4) {
    let f = 0, cr = 0, cg = 0, cb = 0, lv = 0;
    for (const b of bl) { const dx = x - b[0], dy = y - b[1], v = b[2] / (dx * dx + dy * dy + .5); f += v; cr += b[3][0] * v; cg += b[3][1] * v; cb += b[3][2] * v; lv += b[4] * v; }
    const inv = 1 / f, core = clamp((f - 2.2) / 4, 0, 1) * .55, edge = f > 1 ? Math.min(1, (f - 1) / .25) : 0, halo = f > .45 && f <= 1 ? (f - .45) / .55 * .28 : 0;
    d[p] = cr * inv + (255 - cr * inv) * core; d[p + 1] = cg * inv + (255 - cg * inv) * core; d[p + 2] = cb * inv + (255 - cb * inv) * core; d[p + 3] = Math.max(edge, halo) * clamp(lv * inv, 0, 1) * 255;
  }
  lavaX.putImageData(lavaImg, 0, 0);
  Bx.globalCompositeOperation = "lighter"; Bx.globalAlpha = 1; Bx.imageSmoothingEnabled = true; Bx.drawImage(lavaC, 0, 0, Bc.width, Bc.height);
}
