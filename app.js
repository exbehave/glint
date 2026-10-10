(() => {
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
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
    draw(E) { const { g, n, R, S, st } = E; st.h.push([n.x, n.y]); if (st.h.length > 170) st.h.shift();
      const w = S * (.016 + .03 * R.kick + .008 * R.bass) * (1 + .15 * R.idle * R.breath);
      ribbonNeon(g, st.h, n.hue, f => w * Math.pow(f, .9)); sprite(g, n.hue, n.x, n.y, w * 2.4, .9); } },
  { key: "whip", name: "Whip strand", fade: .42, char: "wander", init: () => ({ ch: null }),
    draw(E) { const { g, n, R, S, st, t } = E, N = 28, seg = S * (.015 + .006 * R.bass);
      if (!st.ch) st.ch = Array.from({ length: N }, (_, i) => ({ x: n.x, y: n.y + i * seg, px: n.x, py: n.y + i * seg }));
      const ch = st.ch;
      for (let i = 1; i < N; i++) { const p = ch[i], vx = (p.x - p.px) * .93, vy = (p.y - p.py) * .93; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; }
      if (E.beat) { const a = n.ang + Math.PI / 2; for (let i = 1; i < N; i++) { const f = S * (.012 + .03 * R.kick) * (i / N) * (Math.random() < .5 ? 1 : -1); ch[i].x += Math.cos(a) * f; ch[i].y += Math.sin(a) * f; } }
      ch[0].x = n.x; ch[0].y = n.y;
      for (let it = 0; it < 4; it++) for (let i = 1; i < N; i++) { const a = ch[i - 1], b = ch[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - seg) / d; if (i === 1) { b.x -= dx * k; b.y -= dy * k; } else { a.x += dx * k * .5; a.y += dy * k * .5; b.x -= dx * k * .5; b.y -= dy * k * .5; } ch[0].x = n.x; ch[0].y = n.y; }
      const ph = E.node.seed * 20;
      const pts = ch.map((p, i) => { const a = ch[Math.max(0, i - 1)], b = ch[Math.min(N - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, o = Math.sin(i * .55 - t * 9 + ph) * S * (.014 + .03 * R.kick + .012 * E2(R.energy)) * (i / N); return [p.x - ty / l * o, p.y + tx / l * o]; });
      const w = S * (.013 + .02 * R.kick); ribbonNeon(g, pts, n.hue, f => w * (1 - f * .85)); sprite(g, n.hue, n.x, n.y, w * 2.6, .95); } },
  { key: "halo", name: "Halo rings", fade: .32, char: "wander", init: () => ({ rings: [] }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, sd = E.node.seed;
      if (E.beat) st.rings.push({ r: S * .02, a: 1, rot: n.ang, sq: .3 + Math.random() * .5 });
      for (let i = st.rings.length - 1; i >= 0; i--) { const q = st.rings[i]; q.r += dt * S * (.22 + .35 * E2(R.energy)); q.a -= dt * .9; if (q.a <= 0) { st.rings.splice(i, 1); continue; }
        [[4, .12], [1, .8]].forEach(([wm, al]) => { g.lineWidth = S * .004 * wm * q.a + .8; g.strokeStyle = hsl(n.hue, 100, 70, q.a * al); g.beginPath(); g.ellipse(n.x, n.y, q.r, q.r * q.sq, q.rot, 0, TAU); g.stroke(); }); }
      const r = S * (.055 + .035 * R.bass + .01 * R.idle * R.breath);
      g.setLineDash([S * .012, S * .022]); g.lineDashOffset = -t * S * .3 * (sd > .5 ? 1 : -1); g.lineWidth = 1.6; g.strokeStyle = hsl(n.hue, 90, 75, .7);
      g.beginPath(); g.ellipse(n.x, n.y, r, r * .45, t * .4 + sd * 6, 0, TAU); g.stroke(); g.setLineDash([]);
      sprite(g, n.hue, n.x, n.y, S * (.035 + .03 * R.kick), .95); } },
  { key: "wave", name: "Wave line", fade: .38, char: "wander",
    draw(E) { const { g, n, R, S, t, W } = E, sd = E.node.seed, freq = 2.2 + sd * 3, amp = S * (.08 + .16 * E2(R.energy)), pts = [];
      g.lineJoin = g.lineCap = "round";
      for (let x = 0; x <= W; x += W / 180) { const f = x / W, d = (x - n.x) / (W * .3), env = .12 + Math.exp(-d * d) * (.7 + .5 * R.kick); const v = Math.sin(f * freq * TAU - t * 3.2 + sd * 9) * .7 + Math.sin(f * freq * 2.7 * TAU + t * 2.1) * .3 * (.4 + R.treble); pts.push([x, n.y + v * env * amp]); }
      [[7, .1], [2.6, .38], [1.1, 1]].forEach(([w, a]) => { g.lineWidth = w * (1 + R.kick * .6); g.strokeStyle = hsl(n.hue, 100, 64 + (w < 2 ? 25 : 0), a); strokePath(g, pts); });
      sprite(g, n.hue, n.x, n.y, S * .03, .7); } },
  { key: "aurora", name: "Aurora curtain", fade: 1, char: "wander", def: { roam: .3, tempo: .35 },
    draw(E) { const { g, n, R, S, t, W } = E, sd = E.node.seed * 9, cols = 60, span = Math.min(W * .62, S * 1.4), cw = span / cols;
      for (let k = 0; k < cols; k++) { const f = k / (cols - 1), x = n.x - span / 2 + f * span + Math.sin(f * 3 + t + sd) * S * .03;
        const fold = .5 + .5 * Math.sin(f * 13 + t * 2.2 + sd * 2) * Math.sin(f * 4.5 - t * .8 + sd), edge = Math.sin(f * Math.PI);
        const h = S * (.16 + .42 * E2(R.energy)) * (.55 + .45 * fold) * edge, base = n.y + S * .15 + Math.sin(f * 5 + t * .6) * S * .02;
        g.globalAlpha = Math.min(1, (.25 + .55 * fold) * edge * (.8 + .4 * R.kick)); g.drawImage(column(n.hue + f * 30), x, base - h, cw * 1.7, h); }
      g.globalAlpha = 1; } },
  { key: "branches", name: "Branching limbs", fade: .3, char: "wander",
    draw(E) { const { g, n, R, S, t } = E, i = E.node.seed * 10; g.lineCap = "round";
      const depth = clamp(3 + Math.round(E2(R.energy) * 1.6), 3, 5), trunk = S * (.1 + .04 * E2(R.energy)) * (1 + .25 * R.kick), spread = .62 + .16 * Math.sin(t * .7 + i) + R.mid * .25, segs = [], tips = [];
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
    draw(E) { const { g, n, R, S, st, dt } = E; g.lineJoin = g.lineCap = "round";
      const others = E.all.filter(o => o.rt !== n);
      let near = null, bd = 1e12; others.forEach(o => { const d = (o.rt.x - n.x) ** 2 + (o.rt.y - n.y) ** 2; if (d < bd) { bd = d; near = o; } });
      g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 90, 70, .1 + .15 * Math.min(1, R.energy));
      if (near) strokePath(g, bolt(n.x, n.y, near.rt.x, near.rt.y, S * (.03 + .04 * R.treble)));
      else for (let k = 0; k < 3; k++) { const a = Math.random() * TAU, L = S * (.06 + .06 * R.energy); strokePath(g, bolt(n.x, n.y, n.x + Math.cos(a) * L, n.y + Math.sin(a) * L, L * .5)); }
      if (E.beat) {
        let tx, ty; if (others.length && Math.random() < .7) { const o = others[Math.floor(Math.random() * others.length)]; tx = o.rt.x; ty = o.rt.y; } else { const a = Math.random() * TAU, L = S * (.25 + Math.random() * .25); tx = n.x + Math.cos(a) * L; ty = n.y + Math.sin(a) * L; }
        const main = bolt(n.x, n.y, tx, ty, Math.min(S * .25, Math.hypot(tx - n.x, ty - n.y) * .4)); st.bolts.push({ pts: main, age: 0, w: 1 });
        for (let f = 0; f < 2; f++) { const s = main[Math.floor(main.length * (.3 + Math.random() * .4))], ang = Math.random() * TAU, L = S * (.08 + Math.random() * .12); st.bolts.push({ pts: bolt(s[0], s[1], s[0] + Math.cos(ang) * L, s[1] + Math.sin(ang) * L, L * .5), age: 0, w: .55 }); }
        st.flash = .5 + .4 * R.kick;
      }
      for (let i = st.bolts.length - 1; i >= 0; i--) { const bl = st.bolts[i]; bl.age += dt; if (bl.age > .5) { st.bolts.splice(i, 1); continue; }
        const env = 1 - bl.age / .5, fl = bl.age < .25 ? .55 + .45 * Math.abs(Math.sin(bl.age * 30)) : 1, a = env * env * fl;
        [[8, .12, 70], [3, .45, 72], [1.2, 1, 97]].forEach(([w, al, l]) => { g.lineWidth = w * bl.w; g.strokeStyle = hsl(n.hue, 100, l, a * al); strokePath(g, bl.pts); }); }
      if (st.flash > 0) { sprite(g, n.hue, n.x, n.y, S * .35, st.flash * .35); st.flash = Math.max(0, st.flash - dt * 2.5); }
      sprite(g, n.hue, n.x, n.y, S * (.03 + .025 * R.kick), .9); } },
  { key: "kaleido", name: "Kaleidoscope", fade: .1, char: "wander",
    draw(E) { const { g, n, R, S, t, W, H } = E, cx = W / 2, cy = H / 2, spin = t * .12 * (E.node.seed > .5 ? 1 : -1);
      const rx = (n.x - cx) * .85, ry = (n.y - cy) * .85, L = S * (.035 + .05 * E2(R.energy) + .03 * R.kick), wd = L * .32;
      for (let k = 0; k < 12; k++) {
        g.save(); g.translate(cx, cy); g.rotate(spin + Math.floor(k / 2) * TAU / 6); if (k % 2) g.scale(1, -1);
        g.translate(rx, ry); g.rotate(n.ang);
        g.beginPath(); g.moveTo(-L / 2, 0); g.quadraticCurveTo(0, -wd, L / 2, 0); g.quadraticCurveTo(0, wd, -L / 2, 0);
        g.fillStyle = hsl(n.hue, 95, 58, .22 + .2 * R.kick); g.fill(); g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 100, 85, .35); g.stroke();
        g.restore();
      }
      sprite(g, n.hue, cx, cy, S * (.03 + .03 * R.kick), .3); } },
  { key: "orbiters", name: "Orbiters", fade: .2, char: "waltz",
    init: node => ({ moons: Array.from({ length: 5 }, (_, j) => ({ th: seeded(node.seed * 99 + j) * TAU, dh: (j - 2) * 22 })) }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, sd = E.node.seed, dirn = sd > .5 ? 1 : -1, tilt = t * .15 + sd * 6, sq = .38 + .15 * Math.sin(t * .3 + sd * 4), back = [], front = [];
      st.moons.forEach((m, j) => { const r = S * (.06 + .04 * j) * (1 + .45 * R.kick + .1 * R.bass); m.th += dt * (1.8 / Math.pow(j + 1, .7)) * (1 + R.rms * 1.5) * dirn;
        const ox = Math.cos(m.th) * r, oy = Math.sin(m.th) * r * sq, z = Math.sin(m.th);
        (z < 0 ? back : front).push([n.x + ox * Math.cos(tilt) - oy * Math.sin(tilt), n.y + ox * Math.sin(tilt) + oy * Math.cos(tilt), z, n.hue + m.dh]); });
      const draw = list => list.forEach(([x, y, z, h]) => sprite(g, h, x, y, S * .026 * (1 + .35 * z), .55 + .4 * (z + 1) / 2));
      draw(back); sprite(g, n.hue, n.x, n.y, S * (.06 + .03 * R.kick + .01 * R.breath), .95); draw(front); } },
  { key: "dust", name: "Dust spray", fade: .22, char: "moth", init: () => ({ ps: [], acc: 0 }),
    draw(E) { const { g, n, R, S, st, dt } = E;
      st.acc += dt * (30 + 160 * E2(R.energy));
      while (st.acc >= 1 && st.ps.length < 900) { st.acc -= 1; const a = Math.random() * TAU, sp = S * (.04 + .2 * R.kick + .05 * Math.random()), life = .8 + Math.random(); st.ps.push({ x: n.x, y: n.y, vx: Math.cos(a) * sp + n.vx * .35, vy: Math.sin(a) * sp + n.vy * .35, life, max: life, h: n.hue + (Math.random() - .5) * 30 }); }
      st.acc = Math.min(st.acc, 1);
      const ps = st.ps, damp = Math.pow(.4, dt);
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.life -= dt; if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; } p.vx *= damp; p.vy *= damp; p.x += p.vx * dt; p.y += p.vy * dt; const k = p.life / p.max; sprite(g, p.h, p.x, p.y, S * .012 * (.4 + .6 * k), Math.min(1, (1 - k) * 6) * k * .8); }
      sprite(g, n.hue, n.x, n.y, S * (.03 + .03 * R.kick), .95); } },
  { key: "tornado", name: "Tornado", fade: 1, char: "anchored", def: { roam: .18 },
    init: node => ({ strands: Array.from({ length: 6 }, (_, i) => { const b = node.seed * 50 + i; return { dh: i * 60, az: i / 6 * TAU + seeded(b) * .4, twist: .9 + seeded(b + 9) * .5, pitch: 1.1 + seeded(b + 19) * .5, dir: i % 2 ? -1 : 1, ph: seeded(b + 29) }; }) }),
    draw(E) { const { g, n, R, S, st, t } = E, bx = n.x, by = n.y, height = S * 1.05, coneW = S * (.2 + .12 * E2(R.energy) + .1 * R.kick), spin = 1.2 + 1.6 * R.rms, lean = Math.sin(t * .5) * coneW * .35;
      st.strands.forEach(s => { const pts = [];
        for (let i = 0; i <= 70; i++) { const h = i / 70, ang = s.az + s.twist * h * TAU * s.dir + t * spin * s.dir + Math.sin(t * 1.3 + h * 6 + s.ph * 9) * .35, r = coneW * (.02 + Math.pow(h, s.pitch)) * (1 + .07 * Math.sin(h * 8 - t * 2)); pts.push([bx + lean * h + Math.cos(ang) * r, by - h * height + Math.sin(ang) * r * .28]); }
        const w = S * (.02 + .018 * R.kick); ribbonNeon(g, pts, n.hue + s.dh, f => w * (.25 + .75 * Math.min(1, f * 2.5)), .85); });
      spriteWhite(g, bx, by, S * (.07 + .05 * R.kick), .95); } },
  { key: "vine", name: "Filigree vine", fade: 1, char: "skater", init: () => ({ h: [] }),
    draw(E) { const { g, n, R, S, st, t } = E, h = st.h, last = h[h.length - 1];
      if (!last || Math.hypot(n.x - last[0], n.y - last[1]) > S * .004) { h.push([n.x, n.y]); if (h.length > 170) h.shift(); }
      g.lineCap = g.lineJoin = "round";
      if (h.length >= 6) {
        [[3, .12], [1.2, .9]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(n.hue, 90, 70, a); strokePath(g, h); });
        const L = S * (.045 + .02 * E2(R.energy) + .02 * R.kick);
        for (let i = h.length - 1, k = 0; i > 4; i -= 12, k++) {
          const p = h[i], q = h[i - 3], tang = Math.atan2(p[1] - q[1], p[0] - q[0]), side = k % 2 ? 1 : -1;
          const grow = Math.min(1, (h.length - 1 - i) / 24), len = L * grow * (1 - (h.length - 1 - i) / h.length * .45);
          if (len < 1) continue;
          const pts = []; let x = p[0], y = p[1], a = tang + side * 1.1;
          for (let u = 0; u <= 24; u++) { pts.push([x, y]); const f = u / 24; a += side * (.05 + f * f * .5) * (1 + .25 * Math.sin(t * 2 + k)); const sl = len / 24 * (1 - f * .6); x += Math.cos(a) * sl; y += Math.sin(a) * sl; }
          g.lineWidth = 1.4; g.strokeStyle = hsl(n.hue + 30, 95, 72, .75); strokePath(g, pts);
          g.save(); g.translate(pts[6][0], pts[6][1]); g.rotate(tang + side * 1.9);
          const pl = len * .5 * (1 + .4 * R.kick);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(pl * .5, -pl * .45, pl, -pl * .1, pl * .8, pl * .25); g.bezierCurveTo(pl * .6, pl * .4, pl * .2, pl * .2, 0, 0);
          g.fillStyle = hsl(n.hue - 25, 100, 60, .3); g.fill(); g.lineWidth = 1; g.strokeStyle = hsl(n.hue - 25, 100, 82, .6); g.stroke();
          g.restore();
        }
        for (let i = 0; i < h.length; i += 5) { const tw = Math.pow(.5 + .5 * Math.sin(t * 7 - i * .25), 6); sprite(g, n.hue + 40, h[i][0], h[i][1], S * (.006 + .012 * tw), .25 + .75 * tw); }
      }
      sprite(g, n.hue, n.x, n.y, S * .035, .9); } },
  { key: "tubeman", name: "Tube dancer", fade: 1, char: "anchored", def: { roam: .14 },
    init: node => ({ fold: 0, side: node.seed > .5 ? 1 : -1 }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, T = t * 2.6, i = E.node.seed * 7;
      if (E.beat && Math.random() < .75) { st.fold = 1; st.side = Math.random() < .5 ? -1 : 1; }
      st.fold = Math.max(0, st.fold - dt * 1.5);
      const N = 30, seg = S * .85 / N; let x = n.x, y = n.y, a; const pts = [[x, y]];
      for (let k = 1; k <= N; k++) { const f = k / N;
        a = -Math.PI / 2 + f * (.8 + .7 * E2(R.energy)) * (Math.sin(T * 1.7 - k * .35 + i) * .55 + Math.sin(T * 2.9 - k * .6 + i * .5) * .3) + (f > .45 ? st.side * Math.sin(st.fold * Math.PI) * 2.4 * (f - .45) / .55 : 0);
        x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
      const w = S * .042 * (1 + .15 * R.kick);
      ribbonNeon(g, pts, n.hue, f => w * .5 * (1.5 - f * .3), .9);
      const ai = Math.round(N * .74), sh = pts[ai], sp = pts[ai - 1], bodyA = Math.atan2(sh[1] - sp[1], sh[0] - sp[0]);
      [-1, 1].forEach(sd => { const arm = [[sh[0], sh[1]]]; let ax = sh[0], ay = sh[1], aa = bodyA + sd * (1.3 + .8 * Math.sin(T * 2.4 + sd + i));
        for (let k = 0; k < 10; k++) { aa += sd * .14 * Math.sin(T * 3.1 + k * .5 + i); ax += Math.cos(aa) * S * .017; ay += Math.sin(aa) * S * .017; arm.push([ax, ay]); }
        ribbonNeon(g, arm, n.hue + 15, f => w * .3 * (1 - f * .4), .9); });
      sprite(g, n.hue, pts[N][0], pts[N][1], w * 1.5, .9); } },
  { key: "fiddle", name: "Fiddlehead", fade: .3, char: "anchored", def: { roam: .12 }, init: () => ({ curl: 1 }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, i = E.node.seed * 7, target = 1 - Math.min(.85, R.energy * .7);
      if (E.beat) st.curl = Math.max(0, st.curl - .4);
      st.curl += (target - st.curl) * dt * 1.1;
      g.lineCap = "round";
      for (let f = 0; f < 3; f++) {
        const dirn = f % 2 ? 1 : -1, L = S * (.13 + .04 * E2(R.energy)), N = 40, pts = [];
        let x = n.x, y = n.y, a = n.ang + f * TAU / 3 + Math.sin(t * .5 + i) * .3;
        for (let u = 0; u <= N; u++) { pts.push([x, y]); const k = u / N; a += dirn * st.curl * k * k * .55 + .012 * Math.sin(t * 3 + u * .3); x += Math.cos(a) * L / N; y += Math.sin(a) * L / N; }
        const w = S * .012; ribbonNeon(g, pts, n.hue + f * 12, ff => w * (1 - ff * .75), .85);
        g.lineWidth = 1; g.strokeStyle = hsl(n.hue + 20, 100, 75, .6); g.beginPath();
        for (let u = 4; u < N - 4; u += 4) { const p = pts[u], q = pts[u + 1], ta = Math.atan2(q[1] - p[1], q[0] - p[0]), ll = S * .02 * (1 - u / N); [-1, 1].forEach(sd => { g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(ta + sd * 1.1) * ll, p[1] + Math.sin(ta + sd * 1.1) * ll); }); }
        g.stroke();
      }
      sprite(g, n.hue, n.x, n.y, S * .03, .9); } },
  { key: "doodle", name: "Boiling doodle", fade: 1, char: "wander",
    init: node => ({ boil: 0, seed: 0, kind: Math.floor(node.seed * 3) % 3 }),
    draw(E) { const { g, n, R, S, st, t, dt } = E;
      st.boil += dt; if (st.boil > 1 / 9) { st.boil = 0; st.seed++; }
      g.lineCap = g.lineJoin = "round";
      const jit = S * .006 * (1 + R.hat * 2.5), base = E.node.seed * 1e4, J = k => (seeded(st.seed * 97 + k + base) - .5) * jit * 2;
      const sz = S * (.08 + .05 * E2(R.energy)) * (1 + .35 * R.kick), N = 44, pts = [];
      for (let k = 0; k <= N; k++) { const u = k / N; let r, a;
        if (st.kind === 0) { a = u * TAU + t * .3; r = sz * (.62 + .38 * Math.cos(a * 5 - t * .4)); }
        else if (st.kind === 1) { a = u * TAU - t * .3; r = sz * (.82 + .18 * Math.sin(a * 3 + t) + .08 * Math.sin(a * 7)); }
        else { a = u * TAU * 2.4 + t; r = sz * (.12 + .88 * u); }
        pts.push([n.x + Math.cos(a) * r + J(k * 3), n.y + Math.sin(a) * r + J(k * 5 + 71)]); }
      g.lineWidth = 2.4; g.strokeStyle = hsl(n.hue, 100, 68, .9); strokePath(g, pts);
      g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 50, 92, .5); strokePath(g, pts.map((p, k) => [p[0] + 1.5 + J(k + 900), p[1] - 1 + J(k + 700)]));
      const idx = E.all.findIndex(o => o.rt === n), next = E.all.slice(idx + 1).find(o => o.node.form === "doodle");
      if (next) { const b = next.rt, dx = b.x - n.x, dy = b.y - n.y, l = Math.hypot(dx, dy) || 1, sq = [];
        for (let k = 0; k <= 40; k++) { const u = k / 40, o = Math.sin(u * 22 + t * 6) * S * .012 * Math.sin(Math.PI * u); sq.push([n.x + dx * u - dy / l * o + J(k + 400), n.y + dy * u + dx / l * o + J(k + 300)]); }
        g.lineWidth = 1.4; g.strokeStyle = "rgba(235,235,245,.45)"; strokePath(g, sq); } } },
  { key: "lava", name: "Lava blobs", fade: 1, char: "wander", init: () => ({ x: 0, y: 0, vx: 0, vy: 0, ready: false }),
    draw(E) { const { n, R, S, st, dt, t } = E;
      if (!st.ready) { st.x = n.x; st.y = n.y; st.ready = true; }
      if (E.beat) { const a = Math.random() * TAU, f = S * (1.4 + 2.6 * R.kick); st.vx += Math.cos(a) * f; st.vy += Math.sin(a) * f; }
      st.vx += (n.x - st.x) * dt * 7; st.vy += (n.y - st.y) * dt * 7; st.vx *= Math.pow(.3, dt); st.vy *= Math.pow(.3, dt); st.x += st.vx * dt; st.y += st.vy * dt;
      const r = S * (.09 + .035 * E2(R.energy)) * (1 + .1 * Math.sin(t * 2.2 + E.node.seed * 9));
      E.frame.lava.push([n.x, n.y, r, n.hue, E.level], [st.x, st.y, r * .6, n.hue + 30, E.level]); } },
  { key: "spiro", name: "Spirograph", fade: .035, char: "anchored", def: { roam: .12 },
    init: node => ({ th: 0, k: 3 + Math.floor(node.seed * 3), prev: null }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, sd = E.node.seed, dirn = sd > .5 ? -1 : 1;
      if (E.beat && Math.random() < .3) st.k = [3, 4, 5, 6, 7][Math.floor(Math.random() * 5)];
      const Rr = S * (.19 + .06 * E2(R.energy)), r = Rr / st.k, d = r * (1.1 + .7 * R.kick + .3 * Math.sin(t * .3 + sd * 9));
      g.lineCap = "round"; g.lineWidth = 1.3; g.strokeStyle = hsl(n.hue + Math.sin(t * .2 + sd * 9) * 35, 100, 66, .75); g.beginPath();
      for (let q = 0; q <= 8; q++) {
        st.th += dt * (2.6 + 3 * R.rms) / 8 * dirn;
        const x = n.x + (Rr - r) * Math.cos(st.th) + d * Math.cos((Rr - r) / r * st.th), y = n.y + (Rr - r) * Math.sin(st.th) - d * Math.sin((Rr - r) / r * st.th);
        if (q === 0) g.moveTo(st.prev ? st.prev[0] : x, st.prev ? st.prev[1] : y); else g.lineTo(x, y);
        st.prev = [x, y];
      }
      g.stroke(); sprite(g, n.hue, st.prev[0], st.prev[1], S * .02, .9); } },
  { key: "cradle", name: "Cat's cradle", fade: .5, char: "wander", init: () => ({ s: {} }),
    draw(E) { const { g, n, R, S, st, dt, W, H } = E, sd = E.node.seed, pegs = [[.07, .12], [.93, .12], [.07, .88], [.93, .88]];
      const targets = E.all.filter(o => o.rt !== n).map(o => ({ key: "n" + o.node.id, x: o.rt.x, y: o.rt.y, node: true })).concat(pegs.map((p, i) => ({ key: "p" + i, x: p[0] * W, y: p[1] * H, node: false })));
      targets.forEach((tg, i) => { if (!st.s[tg.key]) { const hs = seeded(sd * 100 + i * 7.3); st.s[tg.key] = { amp: 0, mode: 1 + Math.floor(hs * 3), f: 18 + seeded(sd * 31 + i) * 30, ph: 0, on: tg.node || seeded(sd * 77 + i) < .6 }; } });
      if (E.beat) { const keys = targets.map(q => q.key).filter(k => st.s[k].on); for (let k = 0; k < 2 && keys.length; k++) st.s[keys[Math.floor(Math.random() * keys.length)]].amp = 1; }
      g.lineCap = "round";
      targets.forEach(tg => { const s = st.s[tg.key]; if (!s.on) return; s.amp *= Math.exp(-dt * 1.6); s.ph += dt * s.f;
        const dx = tg.x - n.x, dy = tg.y - n.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, amp = S * .05 * s.amp * (1 + R.bass) + S * .003 * R.breath * R.idle, pts = [];
        for (let k = 0; k <= 30; k++) { const u = k / 30, o = Math.sin(Math.PI * u * s.mode) * amp * Math.sin(s.ph); pts.push([n.x + dx * u + nx * o, n.y + dy * u + ny * o]); }
        [[3, .1 + .2 * s.amp], [1, .3 + .6 * s.amp]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(n.hue, 100, 72, a); strokePath(g, pts); });
        if (!tg.node) { g.lineWidth = 1; g.strokeStyle = "rgba(235,235,245,.4)"; g.beginPath(); g.arc(tg.x, tg.y, 4, 0, TAU); g.stroke(); } });
      sprite(g, n.hue, n.x, n.y, S * (.025 + .02 * R.kick), .95); } },
  { key: "seaweed", name: "Seaweed", fade: 1, char: "anchored", def: { roam: .1 }, init: () => ({ b: [] }),
    draw(E) { const { g, n, R, S, st, t, dt } = E, i = E.node.seed * 7;
      for (let f = 0; f < 5; f++) {
        const N = 26, seg = S * (.0085 + .003 * (f % 3)), pts = [[n.x, n.y]];
        let x = n.x, y = n.y, a = -Math.PI / 2 + (f - 2) * .3;
        for (let k = 1; k <= N; k++) { const u = k / N; a += u * .1 * Math.sin(t * 1.5 - k * .3 + f * 1.3 + i) * (1 + E2(R.energy)) - n.vx * .00006; x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
        ribbonNeon(g, pts, n.hue + f * 8, ff => S * .016 * (.35 + Math.sin(Math.PI * ff) * .7) * (1 - ff * .45), .55 + .3 * R.kick);
      }
      if (E.beat && Math.random() < .5) for (let b = 0; b < 2; b++) st.b.push({ x: n.x + (Math.random() - .5) * S * .08, y: n.y - S * .1, r: S * (.006 + Math.random() * .01), life: 2.5 });
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

/* ================= Personalities: whole-design moods =================
   Each one nudges every node's motion and paints a treatment layer over the scene,
   mixed in with its own opacity and blend mode. */
const BLENDS = [["source-over", "Normal"], ["lighter", "Add"], ["screen", "Screen"], ["overlay", "Overlay"], ["soft-light", "Soft light"], ["color-dodge", "Color dodge"], ["difference", "Difference"], ["exclusion", "Exclusion"], ["multiply", "Multiply"]];
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function fit(c, w, h) { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c.getContext("2d"); }
const MOODS = [
  { key: "hypnotic", name: "Hypnotic", mode: "screen", bias: { tempo: -.1, grace: .3, social: .35, chaos: -.15 },
    draw(F, B, st, M) { st.a ||= mk(1, 1); st.b ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2;
      fit(st.a, hw, hh); const bc = fit(st.b, hw, hh);
      bc.setTransform(1, 0, 0, 1, 0, 0); bc.globalCompositeOperation = "source-over"; bc.globalAlpha = 1; bc.fillStyle = "#000"; bc.fillRect(0, 0, hw, hh);
      bc.save(); bc.translate(hw / 2, hh / 2); bc.rotate(.012 + .02 * M.energy); const s = 1.03 + .05 * M.kick; bc.scale(s, s); bc.globalAlpha = .88; bc.drawImage(st.a, -hw / 2, -hh / 2, hw, hh); bc.restore();
      bc.globalCompositeOperation = "lighter"; bc.globalAlpha = .6; bc.drawImage(B, 0, 0, hw, hh);
      [st.a, st.b] = [st.b, st.a];
      F.drawImage(st.a, 0, 0, B.width, B.height); } },
  { key: "aggressive", name: "Aggressive", mode: "lighter", bias: { energy: .35, grace: -.35, chaos: .25 },
    draw(F, B, st, M) { st.p = Math.max((st.p || 0) - M.dt * 3.5, M.hit ? 1 : 0); const p = st.p, W = B.width, H = B.height;
      for (const [k, a] of [[.14, 1], [.3, .45]]) { const s = 1 + k * p, sx = (Math.random() - .5) * W * .03 * p, sy = (Math.random() - .5) * H * .03 * p;
        F.globalAlpha *= a; F.drawImage(B, (W - W * s) / 2 + sx, (H - H * s) / 2 + sy, W * s, H * s); F.globalAlpha /= a; } } },
  { key: "dreamy", name: "Dreamy", mode: "screen", bias: { tempo: -.2, grace: .35, energy: -.1, trails: .3 },
    draw(F, B, st, M) { st.s ||= mk(1, 1); st.m ||= mk(1, 1); const W = B.width, H = B.height;
      const sc = fit(st.s, W / 14, H / 14), mc = fit(st.m, W / 4, H / 4);
      sc.globalCompositeOperation = "source-over"; sc.drawImage(B, 0, 0, st.s.width, st.s.height);
      mc.globalCompositeOperation = "source-over"; mc.imageSmoothingEnabled = true; mc.drawImage(st.s, 0, 0, st.m.width, st.m.height);
      mc.globalCompositeOperation = "lighter"; mc.globalAlpha = .35; mc.drawImage(B, 0, 0, st.m.width, st.m.height); mc.globalAlpha = 1;
      const s = 1.04 + .02 * Math.sin(M.t * .5); F.drawImage(st.m, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s); } },
  { key: "glitch", name: "Glitch", mode: "source-over", bias: { chaos: .3, grace: -.45 },
    draw(F, B, st, M) { st.r ||= mk(1, 1); st.c ||= mk(1, 1); st.o ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2;
      const rc = fit(st.r, hw, hh), cc = fit(st.c, hw, hh), oc = fit(st.o, hw, hh);
      [[rc, "#ff0000"], [cc, "#00ffff"]].forEach(([c, col]) => { c.globalCompositeOperation = "source-over"; c.drawImage(B, 0, 0, hw, hh); c.globalCompositeOperation = "multiply"; c.fillStyle = col; c.fillRect(0, 0, hw, hh); });
      st.life = (st.life || 0) - M.dt;
      if (M.hit || Math.random() < M.dt * (.6 + 4 * M.chaos)) { const n = 6 + Math.floor(Math.random() * 8); st.bands = []; let y = 0; for (let i = 0; i < n && y < hh; i++) { const h = hh * (.03 + Math.random() * .16); st.bands.push([y, h, (Math.random() - .5) * hw * .18, 1 + Math.random() * hw * .02]); y += h + Math.random() * hh * .08; } st.life = .08 + Math.random() * .2; }
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = "#000"; oc.fillRect(0, 0, hw, hh); oc.globalCompositeOperation = "lighter";
      const bands = st.life > 0 && st.bands ? st.bands : [[0, hh, 0, 1.5]];
      if (st.life > 0) { oc.drawImage(st.r, 1.5, 0); oc.drawImage(st.c, -1.5, 0); oc.globalCompositeOperation = "source-over"; bands.forEach(([y, h]) => { oc.fillStyle = "#000"; oc.fillRect(0, y, hw, h); }); oc.globalCompositeOperation = "lighter"; }
      bands.forEach(([y, h, dx, sp]) => { oc.drawImage(st.r, 0, y, hw, h, dx + sp, y, hw, h); oc.drawImage(st.c, 0, y, hw, h, dx - sp, y, hw, h); });
      if (!st.scan) { const p = mk(1, 3), pc = p.getContext("2d"); pc.fillStyle = "rgba(0,0,0,.45)"; pc.fillRect(0, 2, 1, 1); st.scan = oc.createPattern(p, "repeat"); }
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = st.scan; oc.fillRect(0, 0, hw, hh);
      F.drawImage(st.o, 0, 0, B.width, B.height); } },
  { key: "electric", name: "Electric", mode: "lighter", bias: { energy: .2, tempo: .25 },
    draw(F, B, st, M) { st.o ||= mk(1, 1); const hw = B.width / 2, hh = B.height / 2, oc = fit(st.o, hw, hh);
      st.f = Math.max((st.f || 0) - M.dt * 6, M.hit || M.hat ? 1 : 0);
      oc.globalCompositeOperation = "source-over"; oc.fillStyle = "#000"; oc.fillRect(0, 0, hw, hh); oc.globalCompositeOperation = "lighter";
      const a = .2 + .8 * st.f * (.5 + Math.random() * .5), j = 3 * st.f;
      oc.globalAlpha = a; oc.drawImage(B, (Math.random() - .5) * j, (Math.random() - .5) * j, hw, hh); oc.drawImage(B, (Math.random() - .5) * j, (Math.random() - .5) * j, hw, hh); oc.globalAlpha = 1;
      F.drawImage(st.o, 0, 0, B.width, B.height); } },
  { key: "fluid", name: "Fluid", mode: "source-over", bias: { grace: .45, chaos: -.1, trails: .15 },
    draw(F, B, st, M) { const W = B.width, H = B.height, n = 60, sh = H / n;
      for (let i = 0; i < n; i++) { const sy = i * sh, off = Math.sin(i * .35 + M.t * 2.2) * W * .018 * (1 + 2 * M.bass) + Math.sin(i * .13 - M.t * 1.3) * W * .01;
        F.drawImage(B, 0, sy, W, sh + 1, off, sy + Math.sin(i * .2 + M.t) * 2, W, sh + 1); } } }
];
const MOOD = Object.fromEntries(MOODS.map(m => [m.key, m]));

/* ================= State ================= */
const PKEYS = ["energy", "tempo", "grace", "chaos", "size", "trails", "roam", "magnetism", "social"];
const PDEF = { energy: .55, tempo: .45, grace: .7, chaos: .15, size: .5, trails: .5, roam: .45, magnetism: 0, social: .3 };
const PINFO = {
  energy: { label: "Energy" }, tempo: { label: "Tempo" }, grace: { label: "Grace" }, chaos: { label: "Chaos" },
  size: { label: "Size" }, trails: { label: "Trails" }, roam: { label: "Roam" },
  magnetism: { label: "Magnetism", min: -1, max: 1, bipolar: true }, social: { label: "Social" }
};
const BUSKEYS = ["energy", "tempo", "size", "trails", "chaos"];
let seq = 0;
function mkNode(form, hx, hy, hue, over = {}) {
  const f = FORM[form];
  return Object.assign({
    id: "n" + Date.now().toString(36) + (seq++), form, char: f.char, charAuto: true, hx, hy, dir: -Math.PI / 2, hue,
    level: 1, listen: "mix", bus: "", visible: true, seed: Math.random(),
    p: Object.assign({}, PDEF, f.def || {}, over.p || {}),
    o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 }
  }, over, { p: Object.assign({}, PDEF, f.def || {}, over.p || {}) });
}
function freshBuses() { const b = {}; ["A", "B", "C"].forEach(k => b[k] = { level: 1, mute: false, push: Object.fromEntries(BUSKEYS.map(x => [x, 0])) }); return b; }
function freshMoods() { return Object.fromEntries(MOODS.map(m => [m.key, { on: false, op: .65, mode: m.mode }])); }
function moodsWith(list) { const m = freshMoods(); list.forEach(([k, op, mode]) => Object.assign(m[k], { on: true, op, mode: mode || MOOD[k].mode })); return m; }
// Scenes are composed on purpose: symmetric placements, a clear focal point, and a palette per scene.
const at = (form, x, y, hue, char, over = {}) => mkNode(form, x, y, hue, Object.assign({ char, charAuto: false }, over));
const SCENES = {
  // Three ribbons skate around a gold orbiter at the center.
  "Night Drive": () => ({ nodes: [at("orbiters", .5, .5, 45, "anchored", { p: { size: .55 } }), at("ribbon", .5, .5, 312, "waltz", { bus: "A", p: { roam: .34 } }), at("ribbon", .5, .5, 265, "waltz", { bus: "A", p: { roam: .5 } }), at("ribbon", .5, .5, 190, "waltz", { bus: "A", p: { roam: .66 } })], moods: moodsWith([["hypnotic", .35]]) }),
  // A tornado rises from the bottom center between two storm clouds; embers circle it.
  "Neon Storm": () => ({ nodes: [at("tornado", .5, .9, 300, "anchored", { p: { size: .6 } }), at("lightning", .2, .24, 210, "anchored"), at("lightning", .8, .24, 265, "anchored"), at("dust", .5, .55, 40, "moth")], moods: moodsWith([["electric", .55]]) }),
  // An evenly spaced seaweed bed, a pair of ferns, and a vine drifting through the water above.
  "Kelp Garden": () => ({ nodes: [at("seaweed", .14, .93, 160, "anchored", { bus: "A" }), at("seaweed", .38, .93, 175, "anchored", { bus: "A" }), at("seaweed", .62, .93, 140, "anchored", { bus: "A" }), at("seaweed", .86, .93, 185, "anchored", { bus: "A" }), at("fiddle", .26, .7, 120, "anchored"), at("fiddle", .74, .7, 95, "anchored"), at("vine", .5, .38, 320, "wander", { p: { roam: .6 } })], moods: moodsWith([["fluid", .5], ["dreamy", .3]]) }),
  // Two tube dancers frame the stage, two doodles bob between them, strings stretch from the center.
  "Cartoon Party": () => ({ nodes: [at("tubeman", .2, .95, 310, "anchored"), at("tubeman", .8, .95, 45, "anchored"), at("doodle", .36, .3, 350, "anchored"), at("doodle", .64, .3, 200, "anchored"), at("cradle", .5, .6, 150, "anchored")], moods: moodsWith([["aggressive", .4]]) }),
  // Everything turns around one center: a spirograph and halo in the middle, two petal rings orbiting.
  "Mandala": () => ({ nodes: [at("spiro", .5, .5, 330, "anchored", { p: { size: .6 } }), at("halo", .5, .5, 190, "anchored"), at("kaleido", .5, .3, 45, "waltz", { p: { roam: .3 } }), at("kaleido", .5, .72, 285, "waltz", { p: { roam: .3 } })], moods: moodsWith([["hypnotic", .55]]) }),
  // A lava lamp: three blobs rise and sink in the center column under an aurora, over a wave.
  "Lava Lounge": () => ({ nodes: [
      at("lava", .36, .5, 15, "custom", { p: { social: 0, size: .38 }, o1: { wave: "sine", rate: .2, depth: .32 }, o2: { on: false, wave: "sine", rate: .5, depth: .05, phase: 0 } }),
      at("lava", .5, .5, 320, "custom", { p: { social: 0, size: .38 }, o1: { wave: "sine", rate: .27, depth: .34 }, o2: { on: true, wave: "sine", rate: .13, depth: .04, phase: .3 } }),
      at("lava", .64, .5, 280, "custom", { p: { social: 0, size: .38 }, o1: { wave: "sine", rate: .34, depth: .3 }, o2: { on: false, wave: "sine", rate: .5, depth: .05, phase: 0 } }),
      at("aurora", .5, .12, 150, "anchored", { p: { roam: .1 } }), at("wave", .5, .9, 175, "anchored")], moods: moodsWith([["dreamy", .45]]) }),
  // Two trees grow up from the ground under a halo moon, with fireflies drifting between them.
  "Neon Grove": () => ({ nodes: [at("branches", .3, .9, 40, "anchored", { p: { size: .6 } }), at("branches", .7, .9, 330, "anchored", { p: { size: .6 } }), at("halo", .5, .2, 190, "anchored"), at("dust", .5, .5, 150, "moth")], moods: moodsWith([["glitch", .35]]) }),
  "Blank canvas": () => ({ nodes: [], moods: freshMoods() })
};
let state = null;
let sel = { type: "none", id: null };
const RT = new Map();

/* ================= Audio ================= */
const A = { bass: 0, mid: 0, treble: 0, rms: 0, kick: 0, midHit: 0, hat: 0, active: false };
const au = { ctx: null, an: null, input: null, out: null, mode: "none", el: null, elSrc: null, mic: null, micSrc: null, demo: null, freq: null, time: null };
const agc = { bass: .2, mid: .2, treble: .2, rms: .1 }, prevB = { bass: 0, mid: 0, treble: 0 }, since = { bass: 1, mid: 1, treble: 1 };
function ensureCtx() {
  if (au.ctx) return au.ctx;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .5;
  const input = ctx.createGain(), out = ctx.createGain(); input.connect(an); an.connect(out); out.connect(ctx.destination);
  Object.assign(au, { ctx, an, input, out, freq: new Uint8Array(an.frequencyBinCount), time: new Uint8Array(an.fftSize) });
  return ctx;
}
function setNP(t, s) { $("#np-title").textContent = t; $("#np-sub").textContent = s; }
function stopAll() {
  if (au.demo) { clearInterval(au.demo.timer); try { au.demo.bus.disconnect(); } catch (_) {} au.demo = null; }
  if (au.el) { au.el.pause(); try { au.elSrc.disconnect(); } catch (_) {} URL.revokeObjectURL(au.el.src); au.el = null; }
  if (au.mic) { au.mic.getTracks().forEach(t => t.stop()); try { au.micSrc.disconnect(); } catch (_) {} au.mic = null; }
  au.mode = "none";
  $("#src-demo").setAttribute("aria-pressed", "false"); $("#src-mic").setAttribute("aria-pressed", "false"); $("#src-pause").hidden = true;
  setNP("Nothing playing", "Idle motion only");
}
function startDemo() {
  stopAll();
  const ctx = ensureCtx(); ctx.resume(); au.out.gain.value = 1;
  const bus = ctx.createGain(); bus.gain.value = .75; bus.connect(au.input);
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = (t, d) => { const s = ctx.createBufferSource(); s.buffer = nb; s.start(t, Math.random() * .5); s.stop(t + d); return s; };
  const env = (g, t, v, d) => { g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); };
  const kick = (t, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); env(g, t, v, .42); o.connect(g).connect(bus); o.start(t); o.stop(t + .45); };
  const snare = (t, v) => { const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = .8; const g = ctx.createGain(); env(g, t, v * .5, .2); noise(t, .22).connect(f).connect(g).connect(bus); const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = "triangle"; o.frequency.value = 190; env(g2, t, v * .25, .1); o.connect(g2).connect(bus); o.start(t); o.stop(t + .12); };
  const hat = (t, v) => { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7500; const g = ctx.createGain(); env(g, t, v * .16, .05); noise(t, .06).connect(f).connect(g).connect(bus); };
  const bass = (t, fq, d) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = fq; f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + d); g.gain.setValueAtTime(.0008, t); g.gain.exponentialRampToValueAtTime(.2, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + d + .02); };
  const pad = (t, fs, d, br) => fs.forEach(fq => [-6, 6].forEach(c => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "triangle"; o.frequency.value = fq; o.detune.value = c; f.type = "lowpass"; f.frequency.value = 900 + br * 3500; g.gain.setValueAtTime(.0008, t); g.gain.exponentialRampToValueAtTime(.03, t + .5); g.gain.setValueAtTime(.03, t + d - .4); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + d + .05); }));
  const ROOTS = [55, 43.65, 65.41, 49], CH = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 261.63, 329.63], [196, 246.94, 293.66]];
  const step = 60 / 122 / 4; let next = ctx.currentTime + .08, n = 0;
  function sched(i, t) {
    const s = i % 16, bar = Math.floor(i / 16), sec = bar % 8, ci = bar % 4, build = sec >= 6;
    if (s === 0) pad(t, CH[ci], step * 16, build ? (sec - 5) / 2 : .15);
    if (sec === 7 && s >= 12) { snare(t, .4 + (s - 12) * .15); return; }
    if (s % 4 === 0 && !(sec === 7 && s >= 8)) kick(t, 1);
    if (s === 4 || s === 12) snare(t, .9);
    if (build && sec === 7 && s % 2 === 0) snare(t, .35 + s / 30);
    if (s % 4 === 2) hat(t, 1); else if (build || s % 2 === 1) hat(t, .45);
    if ([0, 3, 6, 10, 14].includes(s)) bass(t, ROOTS[ci] * (s === 10 ? 2 : 1), step * 2.2);
  }
  const timer = setInterval(() => { while (next < ctx.currentTime + .12) { sched(n, next); next += step; n++; } }, 25);
  au.demo = { timer, bus }; au.mode = "demo";
  $("#src-demo").setAttribute("aria-pressed", "true"); setNP("Demo beat", "122 BPM · synthesized in your browser");
}
$("#src-demo").addEventListener("click", () => au.mode === "demo" ? stopAll() : startDemo());
$("#src-file").addEventListener("change", e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  stopAll(); const ctx = ensureCtx(); ctx.resume(); au.out.gain.value = 1;
  const el = new Audio(); el.src = URL.createObjectURL(f);
  const src = ctx.createMediaElementSource(el); src.connect(au.input);
  au.el = el; au.elSrc = src; au.mode = "file";
  el.addEventListener("error", () => { if (au.el === el) { stopAll(); toast(`"${f.name}" isn't an audio file this phone can play.`); } });
  el.play().catch(err => { if (err && err.name === "NotSupportedError") return; toast("Tap Play to start the file."); });
  el.addEventListener("ended", () => { $("#src-pause").textContent = "Play"; });
  $("#src-pause").hidden = false; $("#src-pause").textContent = "Pause";
  setNP(f.name.replace(/\.[^.]+$/, ""), "Local file"); e.target.value = "";
});
$("#src-file-label").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("#src-file").click(); } });
$("#src-pause").addEventListener("click", () => { const el = au.el; if (!el) return; if (el.paused) { el.play(); $("#src-pause").textContent = "Pause"; } else { el.pause(); $("#src-pause").textContent = "Play"; } });
$("#src-mic").addEventListener("click", async () => {
  if (au.mode === "mic") { stopAll(); return; }
  stopAll();
  // Start the audio engine inside the tap itself. iPhone Safari only lets sound processing
  // start from a direct tap; starting it after the permission prompt can leave it silent.
  const ctx = ensureCtx(); ctx.resume().catch(() => {});
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) {} }
    au.out.gain.value = 0;
    const src = ctx.createMediaStreamSource(stream); src.connect(au.input);
    au.mic = stream; au.micSrc = src; au.mode = "mic"; micCheck.t = 0; micCheck.peak = 0; micCheck.warned = false;
    $("#src-mic").setAttribute("aria-pressed", "true"); setNP("Microphone", "Listening…");
  } catch (err) { toast(err && err.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in Settings → Safari → Microphone, then try again." : "The microphone couldn't start (" + (err && err.name || "unknown error") + ")."); }
});
// Live readout while the mic is on, so it's clear whether Glint can hear anything.
const micCheck = { t: 0, peak: 0, warned: false, shown: 0 };
function updateMicReadout(dt, rawLevel) {
  if (au.mode !== "mic") return;
  micCheck.t += dt; micCheck.peak = Math.max(micCheck.peak, rawLevel); micCheck.shown += dt;
  if (micCheck.shown > .25) { micCheck.shown = 0; $("#np-sub").textContent = `Listening · level ${Math.round(Math.min(1, rawLevel * 4) * 100)}% · engine ${au.ctx ? au.ctx.state : "off"}`; }
  if (!micCheck.warned && micCheck.t > 4 && micCheck.peak < .002) { micCheck.warned = true; toast(`Glint isn't hearing anything yet (engine: ${au.ctx ? au.ctx.state : "off"}). Turn the mic off and on again, and send me a screenshot of this line if it stays at 0%.`); }
}
function band(lo, hi, hz) { const f = au.freq; let s = 0, c = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.ceil(hi / hz) && i < f.length; i++) { s += f[i]; c++; } return c ? s / c / 255 : 0; }
function updateAudio(dt) {
  const hits = { kick: false, mid: false, hat: false };
  const dec = 2 + (1 - state.master.decay) * 14;
  A.kick *= Math.exp(-dec * dt); A.midHit *= Math.exp(-dec * dt); A.hat *= Math.exp(-dec * 1.6 * dt);
  const playing = au.mode !== "none" && !(au.mode === "file" && au.el && au.el.paused);
  A.active = playing;
  if (!playing) { A.bass *= .9; A.mid *= .9; A.treble *= .9; A.rms *= .9; return hits; }
  au.an.getByteFrequencyData(au.freq); au.an.getByteTimeDomainData(au.time);
  const hz = au.ctx.sampleRate / au.an.fftSize;
  const raw = { bass: band(30, 140, hz), mid: band(250, 2500, hz), treble: band(5000, 12000, hz) };
  let sum = 0; for (let i = 0; i < au.time.length; i++) { const v = (au.time[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / au.time.length), keep = Math.pow(.5, dt / 4);
  updateMicReadout(dt, rms);
  for (const key of ["bass", "mid", "treble"]) {
    agc[key] = Math.max(raw[key], agc[key] * keep, .04);
    const norm = clamp(raw[key] / agc[key], 0, 1), flux = norm - prevB[key];
    since[key] += dt;
    if (flux > .11 && norm > .6 && since[key] > .11) { since[key] = 0; if (key === "bass") { A.kick = 1; hits.kick = true; } else if (key === "mid") { A.midHit = 1; hits.mid = true; } else { A.hat = 1; hits.hat = true; } }
    prevB[key] = norm; A[key] = lerp(A[key], Math.pow(norm, 1.4), .5);
  }
  agc.rms = Math.max(rms, agc.rms * keep, .02);
  A.rms = lerp(A.rms, clamp(rms / agc.rms, 0, 1), .4);
  return hits;
}

/* ================= Knobs ================= */
function polar(cx, cy, r, deg) { const a = deg * Math.PI / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
function arcPath(cx, cy, r, a0, a1) {
  if (Math.abs(a1 - a0) < .5) return "";
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1), [x0, y0] = polar(cx, cy, r, lo), [x1, y1] = polar(cx, cy, r, hi);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${hi - lo > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
let TICKS = ""; for (let i = 0; i <= 10; i++) { const a = -135 + i * 27, [x0, y0] = polar(50, 50, 49, a), [x1, y1] = polar(50, 50, 53, a); TICKS += `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`; }
function makeKnob(def, get, set, size = "md") {
  const min = def.min ?? 0, max = def.max ?? 1, dflt = def.dflt ?? (def.bipolar ? 0 : .5);
  const fmt = v => def.bipolar ? ((v > 0 ? "+" : "") + Math.round(v * 100)) : Math.round(v * 100) + "%";
  const wrap = document.createElement("div"); wrap.className = "knob-wrap";
  const knob = document.createElement("div"); knob.className = "knob " + size; knob.tabIndex = 0; knob.setAttribute("role", "slider"); knob.setAttribute("aria-label", def.label);
  knob.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path class="ticks" d="${TICKS}"/><path class="track" d="${arcPath(50, 50, 45, -135, 135)}"/><path class="arc"/></svg><div class="rim"></div><div class="cap"></div><div class="needle"></div>`;
  const label = document.createElement("div"); label.className = "knob-label"; label.textContent = def.label;
  const val = document.createElement("div"); val.className = "knob-val";
  wrap.append(knob, label, val);
  const arc = knob.querySelector(".arc"), needle = knob.querySelector(".needle");
  function render() { const v = get(), t = (v - min) / (max - min), a = -135 + 270 * t;
    arc.setAttribute("d", arcPath(50, 50, 45, def.bipolar ? 0 : -135, a)); needle.style.setProperty("--a", a + "deg");
    val.textContent = fmt(v); knob.setAttribute("aria-valuetext", fmt(v)); }
  const put = v => { set(clamp(v, min, max)); render(); scheduleSave(); };
  let drag = null;
  knob.addEventListener("pointerdown", e => { e.preventDefault(); knob.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, v: get() }; knob.focus({ preventScroll: true }); });
  knob.addEventListener("pointermove", e => { if (!drag) return; put(drag.v + ((drag.y - e.clientY) + (e.clientX - drag.x)) / (e.shiftKey ? 700 : 200) * (max - min)); });
  const end = () => { drag = null; }; knob.addEventListener("pointerup", end); knob.addEventListener("pointercancel", end);
  knob.addEventListener("dblclick", () => put(dflt));
  knob.addEventListener("keydown", e => { const st = (max - min) / (e.shiftKey ? 10 : 100);
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { put(get() + st); e.preventDefault(); } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { put(get() - st); e.preventDefault(); } });
  render();
  return { el: wrap, render };
}
function paintRange(input) { const t = (input.value - input.min) / (input.max - input.min); input.style.setProperty("--p", (t * 100) + "%"); }

/* ================= UI: lists ================= */
const nodeById = id => state.nodes.find(n => n.id === id);
function nodeLabel(node) { const same = state.nodes.filter(n => n.form === node.form); return FORM[node.form].name + (same.length > 1 ? " " + (same.indexOf(node) + 1) : ""); }
const EYE_ON = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8z" stroke="currentColor" fill="none" stroke-width="1.2"/><circle cx="8" cy="8" r="2" stroke="currentColor" fill="none" stroke-width="1.2"/></svg>';
const EYE_OFF = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 8s2.6-4.5 7-4.5S15 8 15 8s-2.6 4.5-7 4.5S1 8 1 8zM2 14L14 2" stroke="currentColor" fill="none" stroke-width="1.2"/></svg>';
function renderLists() {
  const ul = $("#node-list"); ul.innerHTML = "";
  if (!state.nodes.length) { const li = document.createElement("li"); li.className = "list-foot"; li.textContent = "No nodes yet. Tap + or double-click the canvas."; ul.append(li); }
  state.nodes.forEach(node => {
    const li = document.createElement("li"); li.className = "row-item" + (node.visible ? "" : " off");
    li.setAttribute("role", "option"); li.setAttribute("aria-selected", sel.type === "node" && sel.id === node.id ? "true" : "false");
    li.style.setProperty("--sw", `hsl(${node.hue} 90% 60%)`);
    li.innerHTML = `<span class="swatch"></span><span class="row-text"><span class="row-name">${esc(nodeLabel(node))}</span><span class="row-sub">${esc(CHAR[node.char].name)}</span></span><span class="tag${node.bus ? "" : " empty"}">${node.bus || "–"}</span><button class="eye" aria-label="${node.visible ? "Hide" : "Show"} node">${node.visible ? EYE_ON : EYE_OFF}</button>`;
    li.addEventListener("click", e => { if (e.target.closest(".eye")) { node.visible = !node.visible; renderLists(); scheduleSave(); return; } select("node", node.id); });
    ul.append(li);
  });
  const bl = $("#bus-list"); bl.innerHTML = "";
  ["A", "B", "C"].forEach(k => {
    const b = state.buses[k], count = state.nodes.filter(n => n.bus === k).length;
    const li = document.createElement("li"); li.className = "row-item" + (b.mute ? " off" : "");
    li.setAttribute("aria-selected", sel.type === "bus" && sel.id === k ? "true" : "false");
    li.innerHTML = `<span class="bus-tag">${k}</span><span class="row-text"><span class="row-name">Bus ${k}</span><span class="row-sub">${count} node${count === 1 ? "" : "s"}${b.mute ? " · muted" : ""}</span></span><span></span><span></span>`;
    li.addEventListener("click", () => select("bus", k));
    bl.append(li);
  });
}

/* ================= UI: rack ================= */
function select(type, id) { sel = { type, id }; renderLists(); renderRack(); }
function chipsHTML(list, cur, attr, cls) { return `<div class="chips ${cls}">` + list.map(([k, name]) => `<button class="chip" data-${attr}="${k}" aria-pressed="${k === cur}" title="${esc(name)}">${esc(name)}</button>`).join("") + `</div>`; }
function rangeRow(id, label, min, max, step, val, out, cls = "") { return `<div class="row"><label for="${id}">${label}</label><input type="range" class="${cls}" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output id="${id}-out">${out}</output></div>`; }
const WAVES = ["sine", "triangle", "square", "saw", "noise"];
const waveOpts = cur => WAVES.map(w => `<option value="${w}"${w === cur ? " selected" : ""}>${w[0].toUpperCase() + w.slice(1)}</option>`).join("");
function renderRack() {
  const box = $("#rack"); box.innerHTML = "";
  if (sel.type === "node" && nodeById(sel.id)) {
    const node = nodeById(sel.id), deg = Math.round(((node.dir * 180 / Math.PI) % 360 + 360) % 360);
    box.innerHTML = `
      <section class="panel rsec" data-seg="shape">
        <div class="rack-title"><span class="swatch" style="--sw:hsl(${node.hue} 90% 60%)"></span><strong>${esc(nodeLabel(node))}</strong>
          <button class="icon-btn" data-act="dup" aria-label="Duplicate node" title="Duplicate"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" fill="none" stroke-width="1.2"/><path d="M9.5 2.5V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h.5" stroke="currentColor" fill="none" stroke-width="1.2"/></svg></button>
          <button class="icon-btn" data-act="del" aria-label="Delete node" title="Delete"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 3.5h10M5.5 3.5V2h3v1.5M3.5 3.5l.7 8.5h5.6l.7-8.5" stroke="currentColor" fill="none" stroke-width="1.2"/></svg></button>
        </div>
        <div class="label">Form</div>
        ${chipsHTML(FORMS.map(f => [f.key, f.name]), node.form, "form", "grid3")}
      </section>
      <section class="panel rsec" data-seg="shape">
        <div class="label">Character</div>
        ${chipsHTML(CHARS.map(c => [c.key, c.name]), node.char, "char", "grid2")}
        <p class="desc">${esc(CHAR[node.char].desc)}</p>
      </section>
      <section class="panel rsec" data-seg="shape">
        ${rangeRow("in-hue", "Color", 0, 359, 1, node.hue, node.hue + "°", "hue")}
        ${rangeRow("in-level", "Level", 0, 1, .01, node.level, Math.round(node.level * 100) + "%")}
        <div class="row wide"><span>Listens to</span>${chipsHTML([["mix", "Mix"], ["kick", "Kick"], ["bass", "Bass"], ["mids", "Mids"], ["highs", "Highs"]], node.listen, "listen", "")}</div>
        <div class="row wide"><span>Bus</span>${chipsHTML([["", "None"], ["A", "A"], ["B", "B"], ["C", "C"]], node.bus, "bus", "")}</div>
      </section>
      <section class="panel rsec" data-seg="tune">
        <details open><summary class="label">Fine tune</summary><div class="details-body"><div class="knobs" id="node-knobs"></div></div></details>
      </section>
      <section class="panel rsec" data-seg="tune">
        <details id="adv"${node.char === "custom" ? " open" : ""}><summary class="label">Advanced</summary><div class="details-body">
          <div class="pair">
            <label class="num-wrap">X<input class="num-in" id="in-x" type="number" min="0" max="100" step="1" value="${Math.round(node.hx * 100)}"></label>
            <label class="num-wrap">Y<input class="num-in" id="in-y" type="number" min="0" max="100" step="1" value="${Math.round(node.hy * 100)}"></label>
            <label class="num-wrap">Aim<input class="num-in" id="in-dir" type="number" min="0" max="359" step="1" value="${deg}"></label>
          </div>
          ${node.char === "custom" ? `
          <div class="osc"><div class="toggle-line"><span>Oscillator · along the aim</span></div>
            <div class="row"><label for="o1-wave">Wave</label><select class="select" id="o1-wave">${waveOpts(node.o1.wave)}</select><span></span></div>
            ${rangeRow("o1-rate", "Rate", .05, 4, .05, node.o1.rate, node.o1.rate.toFixed(2))}
            ${rangeRow("o1-depth", "Depth", 0, .45, .01, node.o1.depth, Math.round(node.o1.depth * 100) + "%")}</div>
          <div class="osc"><label class="toggle-line" for="o2-on"><span>Second axis · makes it 2D</span><span class="switch"><input type="checkbox" id="o2-on"${node.o2.on ? " checked" : ""}><span></span></span></label>
            <div class="row"><label for="o2-wave">Wave</label><select class="select" id="o2-wave">${waveOpts(node.o2.wave)}</select><span></span></div>
            ${rangeRow("o2-rate", "Rate", .05, 4, .05, node.o2.rate, node.o2.rate.toFixed(2))}
            ${rangeRow("o2-depth", "Depth", 0, .45, .01, node.o2.depth, Math.round(node.o2.depth * 100) + "%")}
            ${rangeRow("o2-phase", "Phase", 0, 1, .01, node.o2.phase, Math.round(node.o2.phase * 100) + "%")}</div>` : `<p class="desc">Choose the Custom path character to build a motion path from oscillators.</p>`}
        </div></details>
      </section>`;
    const kb = $("#node-knobs");
    PKEYS.forEach(k => kb.append(makeKnob(Object.assign({ dflt: PDEF[k] }, PINFO[k]), () => node.p[k], v => { node.p[k] = v; }).el));
  } else if (sel.type === "bus") {
    const k = sel.id, b = state.buses[k], members = state.nodes.filter(n => n.bus === k);
    box.innerHTML = `
      <section class="panel rsec" data-seg="nodes">
        <div class="rack-title"><span class="bus-tag">${k}</span><strong>Bus ${k}</strong></div>
        ${rangeRow("bus-level", "Level", 0, 1, .01, b.level, Math.round(b.level * 100) + "%")}
        <label class="toggle-line" for="bus-mute"><span>Mute</span><span class="switch"><input type="checkbox" id="bus-mute"${b.mute ? " checked" : ""}><span></span></span></label>
        <div class="label">Push</div>
        <div class="knobs" id="bus-knobs"></div>
        <p class="desc">Each knob pushes every node on this bus up or down from its own setting.</p>
        <div class="label">Members</div>
        <div class="chips">${members.length ? members.map(n => `<button class="chip" data-goto="${n.id}">${esc(nodeLabel(n))}</button>`).join("") : '<span class="desc">No nodes yet. Pick this bus in a node\'s settings.</span>'}</div>
      </section>`;
    const kb = $("#bus-knobs");
    BUSKEYS.forEach(key => kb.append(makeKnob({ label: PINFO[key].label, min: -1, max: 1, bipolar: true, dflt: 0 }, () => b.push[key], v => { b.push[key] = v; }).el));
  } else {
    box.innerHTML = `<section class="panel rsec" data-seg="shape"><div class="label">Selection</div><p class="empty-rack">Select a node to choose its form, how it travels, and how it reacts. Tap a node on the canvas or in the list, or add one with +.</p></section>`;
  }
  box.querySelectorAll('input[type=range]').forEach(paintRange);
}
$("#rack").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  if (sel.type === "node") {
    const node = nodeById(sel.id); if (!node) return;
    if (t.dataset.form) { node.form = t.dataset.form; if (node.charAuto) node.char = FORM[node.form].char; const rt = RT.get(node.id); if (rt) rt.st = null; Object.assign(node.p, FORM[node.form].def || {}); }
    else if (t.dataset.char) { node.char = t.dataset.char; node.charAuto = false; const rt = RT.get(node.id); if (rt) rt.cs = {}; }
    else if (t.dataset.listen) node.listen = t.dataset.listen;
    else if (t.dataset.bus !== undefined) node.bus = t.dataset.bus;
    else if (t.dataset.act === "del") { deleteNode(node.id); return; }
    else if (t.dataset.act === "dup") { if (state.nodes.length >= MAXN) { toast(`Glint keeps up to ${MAXN} nodes for now.`); return; } const c = JSON.parse(JSON.stringify(node)); c.id = "n" + Date.now().toString(36) + (seq++); c.hx = clamp(node.hx + .06, .02, .98); c.hy = clamp(node.hy + .04, .02, .98); c.seed = Math.random(); state.nodes.push(c); select("node", c.id); scheduleSave(); return; }
    else return;
    renderLists(); renderRack(); scheduleSave();
  } else if (t.dataset.goto) select("node", t.dataset.goto);
});
$("#rack").addEventListener("input", e => {
  const t = e.target, out = document.getElementById(t.id + "-out");
  if (t.type === "range") paintRange(t);
  if (sel.type === "node") {
    const node = nodeById(sel.id); if (!node) return; const v = t.type === "checkbox" ? t.checked : t.value;
    switch (t.id) {
      case "in-hue": node.hue = +v; out.textContent = v + "°"; renderLists(); $(".rack-title .swatch").style.setProperty("--sw", `hsl(${v} 90% 60%)`); break;
      case "in-level": node.level = +v; out.textContent = Math.round(v * 100) + "%"; break;
      case "in-x": node.hx = clamp(+v / 100, 0, 1); break;
      case "in-y": node.hy = clamp(+v / 100, 0, 1); break;
      case "in-dir": node.dir = (+v) * Math.PI / 180; break;
      case "o1-wave": node.o1.wave = v; break;
      case "o1-rate": node.o1.rate = +v; out.textContent = (+v).toFixed(2); break;
      case "o1-depth": node.o1.depth = +v; out.textContent = Math.round(v * 100) + "%"; break;
      case "o2-on": node.o2.on = v; break;
      case "o2-wave": node.o2.wave = v; break;
      case "o2-rate": node.o2.rate = +v; out.textContent = (+v).toFixed(2); break;
      case "o2-depth": node.o2.depth = +v; out.textContent = Math.round(v * 100) + "%"; break;
      case "o2-phase": node.o2.phase = +v; out.textContent = Math.round(v * 100) + "%"; break;
    }
  } else if (sel.type === "bus") {
    const b = state.buses[sel.id];
    if (t.id === "bus-level") { b.level = +t.value; out.textContent = Math.round(t.value * 100) + "%"; }
    if (t.id === "bus-mute") { b.mute = t.checked; renderLists(); }
  }
  scheduleSave();
});
function syncAdvanced() {
  if (sel.type !== "node") return; const node = nodeById(sel.id); if (!node) return;
  const x = $("#in-x"), y = $("#in-y"), d = $("#in-dir");
  if (x && document.activeElement !== x) x.value = Math.round(node.hx * 100);
  if (y && document.activeElement !== y) y.value = Math.round(node.hy * 100);
  if (d && document.activeElement !== d) d.value = Math.round(((node.dir * 180 / Math.PI) % 360 + 360) % 360);
}

/* ================= UI: moods ================= */
function thumb(cv, key) {
  const g = cv.getContext("2d"), w = cv.width, h = cv.height; g.fillStyle = "#0b0b0d"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(235,235,242,.85)"; g.fillStyle = "rgba(235,235,242,.85)"; g.lineWidth = 1.4;
  if (key === "hypnotic") { g.beginPath(); for (let a = 0; a < TAU * 4.5; a += .08) { const r = a * 1.0; g.lineTo(w / 2 + Math.cos(a) * r * 2.2, h / 2 + Math.sin(a) * r); } g.stroke(); }
  if (key === "aggressive") { for (let i = 0; i < 9; i++) { const x = seeded(i) * w, y = seeded(i + 30) * h, s = 6 + seeded(i + 60) * 16, a = seeded(i + 90) * TAU; g.globalAlpha = .35 + seeded(i + 5) * .65; g.beginPath(); g.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.lineTo(x + Math.cos(a + 2.5) * s * .5, y + Math.sin(a + 2.5) * s * .5); g.lineTo(x + Math.cos(a + 3.6) * s * .4, y + Math.sin(a + 3.6) * s * .4); g.closePath(); g.fill(); } }
  if (key === "dreamy") { for (let i = 0; i < 7; i++) { const x = seeded(i + 3) * w, y = h * (.3 + seeded(i + 13) * .5), r = 10 + seeded(i + 23) * 16, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(235,235,242,.5)"); gr.addColorStop(1, "rgba(235,235,242,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
  if (key === "glitch") { for (let y = 2; y < h; y += 5) { const o = (seeded(y) - .5) * 30, l = w * (.3 + seeded(y + 7) * .6); g.globalAlpha = .3 + seeded(y + 9) * .7; g.fillRect(w * .2 + o, y, l, 2 + seeded(y + 3) * 2); } }
  if (key === "electric") { g.shadowColor = "rgba(255,255,255,.9)"; g.shadowBlur = 6; g.beginPath(); let x = w * .58, y = 2; g.moveTo(x, y); for (let i = 0; i < 7; i++) { x += (seeded(i + 40) - .55) * 18; y += h / 7; g.lineTo(x, y); } g.stroke(); g.shadowBlur = 0; }
  if (key === "fluid") { for (let k = 0; k < 6; k++) { g.globalAlpha = .25 + k * .12; g.beginPath(); for (let x = 0; x <= w; x += 2) g.lineTo(x, h * (.2 + k * .12) + Math.sin(x * .09 + k) * 5); g.stroke(); } }
  g.globalAlpha = 1;
}
function renderMoods() {
  const box = $("#moods"); box.innerHTML = "";
  MOODS.forEach(m => {
    const s = state.moods[m.key], card = document.createElement("div");
    card.className = "panel mood" + (s.on ? " on" : "");
    card.innerHTML = `<button class="mood-top" aria-pressed="${s.on}" aria-label="${m.name} personality"><canvas width="240" height="60"></canvas><span class="mood-name">${m.name}</span><span class="check"><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.6 2.5L10 3" stroke="currentColor" stroke-width="1.8" fill="none"/></svg></span></button>
      <div class="mood-ctl"><div class="op-row"><input type="range" min="0" max="1" step=".01" value="${s.op}" aria-label="${m.name} opacity"><output>${Math.round(s.op * 100)}%</output></div>
      <select class="select" aria-label="${m.name} blend mode">${BLENDS.map(([v, l]) => `<option value="${v}"${v === s.mode ? " selected" : ""}>${l}</option>`).join("")}</select></div>`;
    thumb(card.querySelector("canvas"), m.key);
    const top = card.querySelector(".mood-top"), rng = card.querySelector("input"), out = card.querySelector("output"), selEl = card.querySelector("select");
    paintRange(rng);
    const setOn = on => { s.on = on; card.classList.toggle("on", on); top.setAttribute("aria-pressed", on); renderPill(); scheduleSave(); };
    top.addEventListener("click", () => setOn(!s.on));
    rng.addEventListener("input", () => { s.op = +rng.value; out.textContent = Math.round(s.op * 100) + "%"; paintRange(rng); if (!s.on) setOn(true); scheduleSave(); });
    selEl.addEventListener("change", () => { s.mode = selEl.value; if (!s.on) setOn(true); scheduleSave(); });
    box.append(card);
  });
  renderPill();
}
$("#blend-pill").addEventListener("click", () => { if (window.matchMedia("(max-width: 899px)").matches) setMobileGroup("mood"); else $("#moods").scrollIntoView({ block: "nearest" }); });
function renderPill() {
  const on = MOODS.filter(m => state.moods[m.key].on).map(m => m.name), pill = $("#blend-pill");
  pill.hidden = !on.length;
  pill.innerHTML = `<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" fill="none"/><circle cx="14" cy="6" r="5" stroke="currentColor" fill="none"/></svg>`;
  pill.append(on.join(" + "));
}

/* ================= Master ================= */
function buildMaster() {
  const m = $("#master"); m.innerHTML = "";
  m.append(makeKnob({ label: "Punch", dflt: .6 }, () => state.master.punch, v => { state.master.punch = v; }, "sm").el,
    makeKnob({ label: "Reaction", dflt: .65 }, () => state.master.reaction, v => { state.master.reaction = v; }, "lg").el,
    makeKnob({ label: "Decay", dflt: .45 }, () => state.master.decay, v => { state.master.decay = v; }, "sm").el);
}

/* ================= Stage ================= */
const fxc = $("#fx"), ui = $("#ui"), stage = $("#stage"), area = $("#stage-area");
const F = fxc.getContext("2d"), uctx = ui.getContext("2d");
const Bc = mk(1, 1), Bx = Bc.getContext("2d");
const lavaC = mk(8, 8), lavaX = lavaC.getContext("2d"); let lavaImg = null;
let W = 800, H = 450, DPR = 1, FD = 1, quality = 1, gridCache = null;
const MAXN = 10;
function layout() {
  const r = area.getBoundingClientRect(); let w = r.width, h = r.height;
  if (state.aspect !== "fill") { const [a, b] = state.aspect.split(":").map(Number); if (w / h > a / b) w = h * a / b; else h = w * b / a; }
  w = Math.max(40, Math.floor(w)); h = Math.max(40, Math.floor(h));
  stage.style.width = w + "px"; stage.style.height = h + "px"; W = w; H = h;
  DPR = Math.min(2, window.devicePixelRatio || 1); FD = Math.min(1.5, DPR) * quality;
  fxc.width = Math.round(w * FD); fxc.height = Math.round(h * FD);
  ui.width = Math.round(w * DPR); ui.height = Math.round(h * DPR);
  Bc.width = fxc.width; Bc.height = fxc.height;
  RT.forEach(rt => { if (rt.layer) { rt.layer.width = fxc.width; rt.layer.height = fxc.height; } });
  gridCache = null;
}
new ResizeObserver(() => layout()).observe(area);
const gridPx = () => +$("#grid").value, snapOn = () => $("#snap").checked;
$("#grid").addEventListener("change", () => { state.grid = gridPx(); gridCache = null; scheduleSave(); });
$("#snap").addEventListener("change", () => { state.snap = snapOn(); scheduleSave(); });
$("#aspect").addEventListener("change", e => { state.aspect = e.target.value; layout(); scheduleSave(); });
function buildGrid() {
  const c = mk(ui.width, ui.height), g = c.getContext("2d"); g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const s = gridPx(); g.fillStyle = "rgba(235,235,245,0.12)";
  for (let x = s; x < W; x += s) for (let y = s; y < H; y += s) { g.beginPath(); g.arc(x, y, .75, 0, TAU); g.fill(); }
  gridCache = c;
}

/* tools + pointer */
let tool = "select";
function setTool(t) { tool = t; $("#tool-select").setAttribute("aria-pressed", t === "select"); $("#tool-place").setAttribute("aria-pressed", t === "place"); ui.style.cursor = t === "place" ? "copy" : "crosshair"; }
$("#tool-select").addEventListener("click", () => setTool("select"));
$("#tool-place").addEventListener("click", () => setTool("place"));
function local(e) { const r = ui.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function snapPt(p, free) { if (!snapOn() || free) return p; const g = gridPx(); return { x: clamp(Math.round(p.x / g) * g, g, Math.floor((W - 1) / g) * g), y: clamp(Math.round(p.y / g) * g, g, Math.floor((H - 1) / g) * g) }; }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const homeOf = n => ({ x: n.hx * W, y: n.hy * H });
const tipOf = n => { const h = homeOf(n); return { x: h.x + Math.cos(n.dir) * 44, y: h.y + Math.sin(n.dir) * 44 }; };
let drag = null;
function addNodeAt(x, y) {
  if (state.nodes.length >= MAXN) { toast(`Glint keeps up to ${MAXN} nodes for now.`); return null; }
  const cur = sel.type === "node" && nodeById(sel.id), form = cur ? cur.form : "ribbon";
  const hues = [312, 190, 38, 265, 150, 0, 55, 220];
  const node = mkNode(form, clamp(x, .02, .98), clamp(y, .02, .98), hues[state.nodes.length % hues.length]);
  state.nodes.push(node); select("node", node.id); scheduleSave(); return node;
}
ui.addEventListener("pointerdown", e => {
  const p = local(e), s = sel.type === "node" && nodeById(sel.id);
  if (s && dist(tipOf(s), p) < 14) { drag = { type: "dir", id: s.id }; ui.setPointerCapture(e.pointerId); return; }
  let hit = state.nodes.slice().reverse().find(n => dist(homeOf(n), p) < 14);
  if (!hit) hit = state.nodes.slice().reverse().find(n => { const rt = RT.get(n.id); return rt && rt.x != null && dist({ x: rt.x, y: rt.y }, p) < 20; });
  if (hit) { if (!(sel.type === "node" && sel.id === hit.id)) select("node", hit.id); const h = homeOf(hit); drag = { type: "move", id: hit.id, dx: h.x - p.x, dy: h.y - p.y }; ui.setPointerCapture(e.pointerId); return; }
  if (tool === "place") { const q = snapPt(p, e.shiftKey), n = addNodeAt(q.x / W, q.y / H); if (n) { drag = { type: "move", id: n.id, dx: 0, dy: 0 }; ui.setPointerCapture(e.pointerId); } return; }
  if (sel.type !== "none") select("none", null);
});
ui.addEventListener("pointermove", e => {
  if (!drag) return; const n = nodeById(drag.id); if (!n) return; const p = local(e);
  if (drag.type === "move") { const q = snapPt({ x: p.x + drag.dx, y: p.y + drag.dy }, e.shiftKey); n.hx = clamp(q.x / W, 0, 1); n.hy = clamp(q.y / H, 0, 1); }
  else { const h = homeOf(n); let a = Math.atan2(p.y - h.y, p.x - h.x); if (snapOn() && !e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12); n.dir = a; }
  syncAdvanced();
});
const endDrag = () => { if (drag) { drag = null; scheduleSave(); } };
ui.addEventListener("pointerup", endDrag); ui.addEventListener("pointercancel", endDrag);
ui.addEventListener("dblclick", e => { const p = local(e); if (state.nodes.some(n => dist(homeOf(n), p) < 16)) return; const q = snapPt(p, e.shiftKey); addNodeAt(q.x / W, q.y / H); });
$("#add-node").addEventListener("click", () => { const g = gridPx(); addNodeAt(snapOn() ? Math.round(W * (.3 + Math.random() * .4) / g) * g / W : .5, snapOn() ? Math.round(H * (.3 + Math.random() * .4) / g) * g / H : .5); });
function deleteNode(id) { state.nodes = state.nodes.filter(n => n.id !== id); RT.delete(id); select(state.nodes.length ? "node" : "none", state.nodes.length ? state.nodes[state.nodes.length - 1].id : null); scheduleSave(); }
document.addEventListener("keydown", e => {
  if ((e.key === "Delete" || e.key === "Backspace") && sel.type === "node" && !e.target.closest("input, select, textarea, .knob")) { deleteNode(sel.id); e.preventDefault(); }
  if (e.key === "Escape" && document.body.classList.contains("perform")) setPerform(false);
});

/* ================= Engine ================= */
function runtime(node) {
  let rt = RT.get(node.id);
  if (!rt) { rt = { x: null, y: null, cx: node.hx * W, cy: node.hy * H, vx: 0, vy: 0, ang: node.dir, spin: 0, clock: node.seed * 10, hold: 1, hist: [], cs: {}, st: null, idleGap: node.seed * 1.2, layer: null, lx: null, p: node.p, R: null }; RT.set(node.id, rt); }
  if (!rt.layer) { rt.layer = mk(fxc.width, fxc.height); rt.lx = rt.layer.getContext("2d"); }
  if (!rt.st) { const f = FORM[node.form]; rt.st = f.init ? f.init(node) : {}; rt.stForm = node.form; }
  if (rt.stForm !== node.form) { const f = FORM[node.form]; rt.st = f.init ? f.init(node) : {}; rt.stForm = node.form; rt.lx.clearRect(0, 0, rt.layer.width, rt.layer.height); }
  return rt;
}
function moodBias() { const b = {}; MOODS.forEach(m => { const s = state.moods[m.key]; if (!s.on) return; for (const k in m.bias) b[k] = (b[k] || 0) + m.bias[k] * s.op; }); return b; }
function effective(node, bias) {
  const bus = node.bus && state.buses[node.bus], o = {};
  for (const k of PKEYS) { let v = node.p[k] + (bus && bus.push[k] != null ? bus.push[k] * .5 : 0) + (bias[k] || 0); o[k] = k === "magnetism" ? clamp(v, -1, 1) : clamp(v, 0, 1); }
  return o;
}
function leaderOf(node, all) { const i = all.findIndex(o => o.node === node); if (i < 0 || all.length < 2) return null; return i > 0 ? all[i - 1] : all[1]; }
function travel(node, rt, p, E) {
  const { dt, S0 } = E, roam = S0 * (.04 + .46 * p.roam), hx = node.hx * W, hy = node.hy * H, t = E.tc, sd = node.seed, tm = .35 + 1.4 * p.tempo, R = rt.R;
  const others = E.all.filter(o => o.rt !== rt);
  let tx = null, ty = null, ax = 0, ay = 0, damp = 0, phys = false;
  const px = rt.cx, py = rt.cy;
  switch (node.char) {
    case "anchored": tx = hx + Math.sin(t * .9 + sd * 9) * roam * .1; ty = hy + Math.sin(t * .7 + sd * 5) * roam * .06; break;
    case "waltz": { const th = TAU * t * .3 * (sd > .5 ? 1 : -1), acc = .45 * Math.sin(TAU * t * .3 * 3); tx = hx + Math.cos(th + acc) * roam * .75; ty = hy + Math.sin(th + acc) * roam * .5; break; }
    case "metronome": { const sw = Math.sin(TAU * t * .45) * (.7 + .5 * p.energy); tx = hx + Math.sin(sw) * roam; ty = hy + Math.cos(sw) * roam * .7;
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

let gclock = 0, gtime = 0, last = performance.now(), slowT = 0, frameMs = 16;
function frame(now) {
  const rawDt = (now - last) / 1000, dt = Math.min(.05, rawDt); last = now; gtime += dt;
  frameMs = lerp(frameMs, rawDt * 1000, .05);
  if (frameMs > 28 && quality > .55) { slowT += dt; if (slowT > 1.5) { quality *= .85; slowT = 0; layout(); } } else slowT = 0;
  const hits = updateAudio(dt);
  const r = state.master.reaction, breath = .5 + .5 * Math.sin(gtime * .9), idle = 1 - r * .7, S0 = Math.min(W, H);
  const bias = moodBias();
  gclock += dt * (.3 + idle * .25 * breath + A.rms * r * 1.2) * 1;
  const all = [];
  state.nodes.forEach(node => { if (!node.visible) return; const bus = node.bus && state.buses[node.bus]; if (bus && bus.mute) return; all.push({ node, rt: runtime(node) }); });
  // 1. how each node hears the music, and its clock
  all.forEach(({ node, rt }) => {
    const p = effective(node, bias); rt.p = p;
    const lv = node.listen, lvl = lv === "bass" || lv === "kick" ? A.bass : lv === "mids" ? A.mid : lv === "highs" ? A.treble : A.rms;
    const env = lv === "mids" ? A.midHit : lv === "highs" ? A.hat : A.kick, hit = lv === "mids" ? hits.mid : lv === "highs" ? hits.hat : hits.kick;
    const R = { kick: env * r * state.master.punch * 1.4 * (.5 + p.energy), bass: A.bass * r, mid: A.mid * r, treble: A.treble * r, rms: lvl * r, hat: A.hat * r, idle, breath };
    R.energy = (idle * (.3 + .25 * breath) + R.rms * 1.1 + R.kick * .45) * (.35 + 1.3 * p.energy);
    rt.R = R; rt.hue = node.hue;
    const flow = .3 + idle * .25 * breath + R.rms * 1.2 + R.kick * .5;
    rt.clock += dt * flow * (.35 + 1.4 * p.tempo);
    rt.tUse = lerp(rt.clock + node.seed * 13, gclock, p.social);
    let beat = A.active ? (hit && r > .05) : false;
    if (!A.active) { rt.idleGap -= dt * (.6 + .8 * p.tempo); if (rt.idleGap <= 0) { beat = true; rt.idleGap = 1.2 + Math.random() * 1.2; } }
    rt.beat = beat;
  });
  // 2. travel
  all.forEach(({ node, rt }) => travel(node, rt, rt.p, { dt, S0, tc: rt.tUse * .6, all, beat: rt.beat, gt: gtime }));
  // 3. draw each node into its own layer
  const frameShared = { lava: [] };
  all.forEach(({ node, rt }) => {
    const f = FORM[node.form], lx = rt.lx, a = fadeAlpha(f.fade, rt.p.trails, dt);
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1;
    if (a >= 1) lx.clearRect(0, 0, rt.layer.width, rt.layer.height);
    else { lx.globalCompositeOperation = "destination-out"; lx.fillStyle = `rgba(0,0,0,${a})`; lx.fillRect(0, 0, rt.layer.width, rt.layer.height); }
    lx.setTransform(FD, 0, 0, FD, 0, 0); lx.globalCompositeOperation = "lighter";
    const bus = node.bus && state.buses[node.bus];
    try { f.draw({ g: lx, n: rt, node, st: rt.st, R: rt.R, S: S0 * (.5 + rt.p.size), W, H, dt, t: rt.tUse, beat: rt.beat, all, frame: frameShared, level: node.level * (bus ? bus.level : 1) }); }
    catch (err) { console.error(err); }
    lx.globalAlpha = 1; lx.setLineDash([]);
  });
  // 4. composite
  Bx.setTransform(1, 0, 0, 1, 0, 0); Bx.globalCompositeOperation = "source-over"; Bx.globalAlpha = 1; Bx.fillStyle = "#040405"; Bx.fillRect(0, 0, Bc.width, Bc.height);
  Bx.globalCompositeOperation = "lighter";
  all.forEach(({ node, rt }) => { if (node.form === "lava") return; const bus = node.bus && state.buses[node.bus]; Bx.globalAlpha = node.level * (bus ? bus.level : 1); Bx.drawImage(rt.layer, 0, 0); });
  if (frameShared.lava.length) drawLava(frameShared.lava);
  Bx.globalAlpha = 1;
  F.setTransform(1, 0, 0, 1, 0, 0); F.globalCompositeOperation = "source-over"; F.globalAlpha = 1; F.drawImage(Bc, 0, 0);
  const M = { t: gtime, dt, energy: idle * (.3 + .25 * breath) + A.rms * r * 1.1, kick: A.kick * r * state.master.punch, bass: A.bass * r, hit: hits.kick && r > .05, hat: hits.hat && r > .05, chaos: clamp(.15 + (bias.chaos || 0), 0, 1) };
  if (!A.active && Math.random() < dt * .8) M.hit = true;
  MOODS.forEach(m => { const s = state.moods[m.key]; if (!s.on || s.op <= 0) return; s._st ||= {};
    F.save(); F.globalCompositeOperation = s.mode; F.globalAlpha = s.op;
    try { m.draw(F, Bc, s._st, M); } catch (err) { console.error(err); }
    F.restore(); });
  drawUI(); drawSpec();
  requestAnimationFrame(frame);
}
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
function drawUI() {
  uctx.setTransform(DPR, 0, 0, DPR, 0, 0); uctx.clearRect(0, 0, W, H);
  if (document.body.classList.contains("perform")) return;
  if (!gridCache) buildGrid(); uctx.drawImage(gridCache, 0, 0, W, H);
  const S0 = Math.min(W, H);
  state.nodes.forEach(node => {
    const isSel = sel.type === "node" && sel.id === node.id, h = homeOf(node), rt = RT.get(node.id);
    uctx.globalAlpha = node.visible ? 1 : .35;
    uctx.lineWidth = 1; uctx.strokeStyle = isSel ? "rgba(246,246,250,.95)" : "rgba(235,235,242,.38)";
    uctx.beginPath(); uctx.arc(h.x, h.y, isSel ? 6 : 4, 0, TAU); uctx.stroke();
    if (!isSel) return;
    const p = rt && rt.p ? rt.p : node.p, roam = S0 * (.04 + .46 * p.roam);
    uctx.setLineDash([3, 5]); uctx.strokeStyle = "rgba(240,240,246,.22)"; uctx.beginPath(); uctx.arc(h.x, h.y, roam, 0, TAU); uctx.stroke(); uctx.setLineDash([]);
    if (rt && rt.x != null) { uctx.strokeStyle = "rgba(240,240,246,.3)"; uctx.beginPath(); uctx.moveTo(h.x, h.y); uctx.lineTo(rt.x, rt.y); uctx.stroke(); uctx.strokeStyle = "rgba(246,246,250,.85)"; uctx.lineWidth = 1.3; uctx.beginPath(); uctx.arc(rt.x, rt.y, 13, 0, TAU); uctx.stroke(); }
    const t = tipOf(node), ux = Math.cos(node.dir), uy = Math.sin(node.dir);
    uctx.lineWidth = 1.3; uctx.strokeStyle = "rgba(246,246,250,.9)"; uctx.beginPath(); uctx.moveTo(h.x + ux * 10, h.y + uy * 10); uctx.lineTo(t.x, t.y); uctx.stroke();
    uctx.beginPath(); uctx.moveTo(t.x, t.y); uctx.lineTo(t.x - ux * 9 - uy * 5, t.y - uy * 9 + ux * 5); uctx.lineTo(t.x - ux * 9 + uy * 5, t.y - uy * 9 - ux * 5); uctx.closePath(); uctx.fillStyle = "rgba(246,246,250,.95)"; uctx.fill();
  });
  uctx.globalAlpha = 1;
}
const spec = $("#spec"), sctx = spec.getContext("2d");
function drawSpec() {
  const beatEl = $("#beat"); beatEl.style.background = A.kick > .05 ? `rgba(246,246,250,${.25 + A.kick * .75})` : "#2a2a2f";
  const r = spec.getBoundingClientRect(); if (!r.width) return;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR); if (spec.width !== w || spec.height !== h) { spec.width = w; spec.height = h; }
  sctx.setTransform(DPR, 0, 0, DPR, 0, 0); sctx.clearRect(0, 0, r.width, r.height);
  const bars = Math.floor(r.width / 6), f = au.freq;
  for (let i = 0; i < bars; i++) { let v = 0; if (A.active && f) { const lo = Math.floor(Math.pow(f.length * .45, i / bars)), hi = Math.max(lo + 1, Math.floor(Math.pow(f.length * .45, (i + 1) / bars))); for (let j = lo; j < hi; j++) v = Math.max(v, f[j]); v /= 255; }
    const bh = Math.max(1.5, v * r.height); sctx.fillStyle = `rgba(236,236,242,${.25 + v * .6})`; sctx.fillRect(i * 6, (r.height - bh) / 2, 3, bh); }
}

/* ================= Scenes, tabs, perform, toast ================= */
const sceneSel = $("#scene");
sceneSel.innerHTML = Object.keys(SCENES).map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("");
let undoSnap = null;
function loadScene(name, keepUndo) {
  if (!keepUndo) undoSnap = JSON.stringify(state);
  const s = SCENES[name](); state.nodes = s.nodes; state.moods = s.moods; state.buses = freshBuses(); state.scene = name;
  RT.clear(); renderMoods(); select(state.nodes.length ? "node" : "none", state.nodes.length ? state.nodes[0].id : null); scheduleSave();
}
sceneSel.addEventListener("change", () => { loadScene(sceneSel.value); toast(`Loaded ${sceneSel.value}.`, "Undo", () => { if (!undoSnap) return; state = JSON.parse(undoSnap); undoSnap = null; RT.clear(); sceneSel.value = state.scene; renderMoods(); select("none", null); applyStateUI(); scheduleSave(); }); });
function setMobileGroup(g) { document.body.dataset.mg = g; $$("#mseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.mg === g)); }
$("#mseg").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setMobileGroup(b.dataset.mg); });
setMobileGroup("shape");
function setPerform(on) {
  document.body.classList.toggle("perform", on); $("#exit-perform").hidden = !on;
  $$(".tab").forEach(t => t.setAttribute("aria-current", (on ? t.dataset.tab === "perform" : t.dataset.tab === "studio") ? "page" : "false"));
  if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  requestAnimationFrame(layout);
}
$("#exit-perform").addEventListener("click", () => setPerform(false));
// iPhone pauses the audio engine when the app is backgrounded or interrupted; wake it on the next tap.
const wakeAudio = () => { if (au.ctx && au.ctx.state !== "running" && au.mode !== "none") au.ctx.resume().catch(() => {}); };
document.addEventListener("pointerdown", wakeAudio, true);
document.addEventListener("visibilitychange", () => { if (!document.hidden) wakeAudio(); });
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("perform")) setPerform(false); });
const SOON = { library: "Library", sources: "Sources", gallery: "Gallery" };
$$(".tab").forEach(t => t.addEventListener("click", () => { const k = t.dataset.tab; if (k === "perform") setPerform(true); else if (k === "studio") setPerform(false); else toast(`${SOON[k]} comes in a later phase. The Studio is live now.`); }));
let toastTimer = null;
function toast(msg, act, fn) {
  const t = $("#toast"), b = $("#toast-act"); $("#toast-text").textContent = msg;
  b.hidden = !act; if (act) { b.textContent = act; b.onclick = () => { t.classList.remove("show"); fn(); }; }
  t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), act ? 6000 : 4000);
}

/* ================= Save (this browser only) ================= */
const KEY = "glint.studio.v2";
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { const moods = {}; for (const k in state.moods) { const { on, op, mode } = state.moods[k]; moods[k] = { on, op, mode }; } localStorage.setItem(KEY, JSON.stringify(Object.assign({}, state, { moods }))); } catch (_) {} }, 400);
}
function applyStateUI() {
  $("#aspect").value = state.aspect; $("#grid").value = String(state.grid); $("#snap").checked = state.snap; sceneSel.value = state.scene in SCENES ? state.scene : "Night Drive";
  buildMaster(); renderLists(); renderRack(); layout();
}
function load() {
  let data = null; try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) {}
  const mobile = window.matchMedia("(max-width: 899px)").matches;
  state = { nodes: [], buses: freshBuses(), moods: freshMoods(), master: { reaction: .65, punch: .6, decay: .45 }, aspect: mobile ? "fill" : "16:9", grid: 32, snap: true, scene: "Night Drive" };
  if (data && Array.isArray(data.nodes)) {
    Object.assign(state, data);
    state.nodes = data.nodes.filter(n => FORM[n.form] && CHAR[n.char]).map(n => Object.assign(n, { p: Object.assign({}, PDEF, n.p) }));
    state.moods = Object.assign(freshMoods(), data.moods || {}); state.buses = Object.assign(freshBuses(), data.buses || {});
    state.master = Object.assign({ reaction: .65, punch: .6, decay: .45 }, data.master || {});
  } else { const s = SCENES["Night Drive"](); state.nodes = s.nodes; state.moods = s.moods; }
  renderMoods(); applyStateUI();
  if (state.nodes.length) select("node", state.nodes[0].id);
}
load();
requestAnimationFrame(frame);
})();
