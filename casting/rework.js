/* ================= Reworks: new takes built from Kennedy's Casting notes ================= */
const loudOf = R => clamp(R.rms * 1.15, 0, 1);

/* ---- Graffiti: a neon pencil that sketches notebook doodles and short words, retracing lines a few times ---- */
// single-stroke letters on a 4 x 6 grid (y down)
const P_ = { O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]], P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]] };
const GLYPH = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.5], [3, 3.5]]], B: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [0, 6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]], D: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]], F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]], H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[1, 0], [3, 0]], [[2, 0], [2, 6]], [[1, 6], [3, 6]]], J: [[[4, 0], [4, 5], [3, 6], [1, 6], [0, 5]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.5]], [[1.3, 2.7], [4, 6]]], L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]], N: [[[0, 6], [0, 0], [4, 6], [4, 0]]], O: P_.O, P: P_.P,
  Q: P_.O.concat([[[2.5, 4.5], [4.2, 6.2]]]), R: P_.P.concat([[[2, 3], [4, 6]]]),
  S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]], T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]], V: [[[0, 0], [2, 6], [4, 0]]], W: [[[0, 0], [1, 6], [2, 3], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]], Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]], Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  "4": [[[3, 6], [3, 0], [0, 4], [4, 4]]], "2": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]], "1": [[[1, 1], [2, 0], [2, 6]], [[1, 6], [3, 6]]],
  "?": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [2, 3.5], [2, 4.4]], [[2, 5.6], [2, 6]]], "!": [[[2, 0], [2, 4.4]], [[2, 5.6], [2, 6]]],
  "<": [[[4, 1], [0, 3], [4, 5]]], "3": [[[0, 0], [4, 0], [2, 2.5], [4, 4], [3, 6], [1, 6], [0, 5]]], "'": [[[2, 0], [2, 1.5]]], ".": [[[2, 5.6], [2, 6]]]
};
const ring = (cx, cy, r, n = 18, a0 = 0) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + i / n * TAU) * r, cy + Math.sin(a0 + i / n * TAU) * r]);
// doodles on a 10 x 10 box
const DOODLES = {
  crown: [[[1, 8], [0.6, 3], [3, 5.4], [5, 1.5], [7, 5.4], [9.4, 3], [9, 8], [1, 8]], [[1.2, 6.6], [8.8, 6.6]], ring(0.6, 2.3, .55, 8), ring(5, .8, .55, 8), ring(9.4, 2.3, .55, 8)],
  coolS: [[[3, 3], [5, 1], [7, 3]], [[3, 3], [3, 4.6]], [[5, 3], [5, 4.6]], [[7, 3], [7, 4.6]], [[5, 3], [6, 2]],
    [[3, 4.6], [5, 6.4]], [[5, 4.6], [7, 6.4]], [[7, 4.6], [6, 5.5]], [[3, 6.4], [4, 5.5]],
    [[3, 6.4], [3, 8]], [[5, 6.4], [5, 8]], [[7, 6.4], [7, 8]], [[3, 8], [5, 10], [7, 8]], [[5, 8], [4, 9]]],
  cube: [[[1, 3.5], [6.5, 3.5], [6.5, 9], [1, 9], [1, 3.5]], [[3.5, 1], [9, 1], [9, 6.5], [3.5, 6.5], [3.5, 1]], [[1, 3.5], [3.5, 1]], [[6.5, 3.5], [9, 1]], [[6.5, 9], [9, 6.5]], [[1, 9], [3.5, 6.5]]],
  star: [[[5, .5], [6.2, 3.8], [9.6, 3.8], [6.9, 5.9], [7.9, 9.3], [5, 7.2], [2.1, 9.3], [3.1, 5.9], [.4, 3.8], [3.8, 3.8], [5, .5]]],
  heart: [[[5, 9], [1.2, 5.4], [.6, 3.2], [1.6, 1.4], [3.4, 1], [5, 2.6], [6.6, 1], [8.4, 1.4], [9.4, 3.2], [8.8, 5.4], [5, 9]]],
  smiley: [ring(5, 5, 4.5, 26), [[3.4, 3.4], [3.4, 4.6]], [[6.6, 3.4], [6.6, 4.6]], [[2.6, 6], [3.6, 7.3], [5, 7.8], [6.4, 7.3], [7.4, 6]]],
  bolt: [[[6, .5], [2.4, 5.4], [5, 5.4], [3.8, 9.5], [7.6, 4.2], [5, 4.2], [6, .5]]],
  spiral: [Array.from({ length: 60 }, (_, i) => { const a = i / 59 * TAU * 3, r = .2 + i / 59 * 4.5; return [5 + Math.cos(a) * r, 5 + Math.sin(a) * r]; })],
  eye: [[[0.4, 5], [2.6, 2.6], [5, 1.8], [7.4, 2.6], [9.6, 5], [7.4, 7.4], [5, 8.2], [2.6, 7.4], [0.4, 5]], ring(5, 5, 2, 16), ring(5, 5, .7, 8)],
  arrow: [[[0.8, 8.4], [8.6, 1.6]], [[4.4, 1.4], [8.6, 1.6], [8.4, 5.6]]]
};
const DOODLE_NAMES = { crown: "Crown", coolS: "Cool S", cube: "Cube", star: "Star", heart: "Heart", smiley: "Smiley", bolt: "Bolt", spiral: "Spiral", eye: "Eye", arrow: "Arrow" };
const GRAFFITI_WORDS = "U UP?, AS IF, SEND NUDES, LOL, NO WAY, OOPS, XOXO, HOLE PIC?, F4GG0T, C.U.N.T.";
function wordStrokes(word) {
  const out = []; let x = 0;
  for (const ch of word.toUpperCase()) { if (ch === " ") { x += 3.5; continue; } const gl = GLYPH[ch]; if (!gl) continue; gl.forEach(s => out.push(s.map(([a, b]) => [x + a, b]))); x += 5.6; }
  return { strokes: out, w: Math.max(1, x - 1.6), h: 6 };
}
function jitterLine(pts, amt, over, grain = 0) {
  // a hand-drawn pass: wobble every vertex a little, and overshoot or stop short at the ends
  const p = pts.map(([x, y]) => [x + (Math.random() - .5) * amt, y + (Math.random() - .5) * amt]);
  if (p.length > 1) { const [a, b] = [p[0], p[1]], [c, d] = [p[p.length - 1], p[p.length - 2]], e = (Math.random() - .3) * over, f = (Math.random() - .3) * over;
    const l1 = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, l2 = Math.hypot(c[0] - d[0], c[1] - d[1]) || 1;
    p[0] = [a[0] + (a[0] - b[0]) / l1 * e, a[1] + (a[1] - b[1]) / l1 * e]; p[p.length - 1] = [c[0] + (c[0] - d[0]) / l2 * f, c[1] + (c[1] - d[1]) / l2 * f]; }
  const dense = [];
  for (let i = 0; i < p.length - 1; i++) { const [x0, y0] = p[i], [x1, y1] = p[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3)); for (let q = 0; q < n; q++) dense.push([lerp(x0, x1, q / n), lerp(y0, y1, q / n)]); }
  dense.push(p[p.length - 1]);
  if (grain) { let ox = 0, oy = 0; dense.forEach(d => { ox = ox * .35 + (Math.random() - .5) * grain; oy = oy * .35 + (Math.random() - .5) * grain; d[0] += ox; d[1] += oy; }); }
  return dense;
}
const GRAFFITI = { key: "graffiti", name: "Graffiti", fade: 1, init: () => ({ marks: [], job: null, hp: 0, pen: null, next: 0, recent: [] }),
  shape: [{ key: "words", label: "Words (comma-separated)", text: true, def: GRAFFITI_WORDS }, { key: "mix", label: "Doodles ↔ words", def: 1 },
    { key: "size", label: "Doodle size", def: .85 }, { key: "sketch", label: "Sketchiness", def: .88 }, { key: "speed", label: "Pencil speed", def: .79 },
    { key: "weight", label: "Line weight", def: .1 }, { key: "swell", label: "Swell with music", def: 1, cfmt: v => (1 + 4 * v).toFixed(1) + "× max" },
    { key: "span", label: "Gradient span", def: .71 }, { key: "cycle", label: "Color cycle", def: .17 }, { key: "linger", label: "Linger", def: .27 }],
  draw(E) { const { g, n, R, S, st, t, dt, W, H, L, k } = E, loud = loudOf(R), sk = k("sketch");
    st.hp += dt * L("cycle", 0, 140);
    // start the next doodle or word when the pencil is free
    if (!st.job) { st.next -= dt;
      if (st.next <= 0) {
        const raw = (E.node.shape && E.node.shape.words != null ? E.node.shape.words : GRAFFITI_WORDS).split(",").map(w => w.trim()).filter(Boolean);
        const useWord = raw.length && Math.random() < k("mix");
        let strokes, bw, bh;
        if (useWord) { const pool = raw.filter(x => !(st.recentW || []).includes(x)), pick = (pool.length ? pool : raw)[Math.floor(Math.random() * (pool.length || raw.length))]; st.recentW = [pick].concat(st.recentW || []).slice(0, Math.min(4, raw.length - 1)); const w = wordStrokes(pick); strokes = w.strokes; bw = w.w; bh = w.h; }
        else { const keys = Object.keys(DOODLES).filter(d => !st.recent.includes(d)), d = keys[Math.floor(Math.random() * keys.length)]; st.recent = [d].concat(st.recent).slice(0, 4); strokes = DOODLES[d]; bw = bh = 10; }
        const scale = Math.min(S * L("size", .18, .5) / Math.max(bw, bh) * (useWord ? 1.6 : 1), W * .8 / bw), bwS = bw * scale, bhS = bh * scale;
        // pick the open spot: try several places and keep the one that overlaps what's still visible the least
        let cx = 0, cy = 0, best = 1e18; st.boxes = (st.boxes || []).filter(b => b.life > 0);
        for (let tries = 0; tries < 12; tries++) { const x = W * .04 + Math.random() * Math.max(1, W * .92 - bwS), y = H * .05 + Math.random() * Math.max(1, H * .9 - bhS);
          let ov = 0; st.boxes.forEach(b => { ov += Math.max(0, Math.min(x + bwS, b.x + b.w) - Math.max(x, b.x)) * Math.max(0, Math.min(y + bhS, b.y + b.h) - Math.max(y, b.y)); });
          if (ov < best) { best = ov; cx = x; cy = y; } if (ov === 0) break; }
        st.boxes.push({ x: cx, y: cy, w: bwS, h: bhS, life: L("linger", 1.5, 14) + 3 });
        const rot = (Math.random() - .5) * .3, cr = Math.cos(rot), sr = Math.sin(rot);
        const place = ([x, y]) => { const px = (x - bw / 2) * scale, py = (y - bh / 2) * scale; return [cx + bw * scale / 2 + px * cr - py * sr, cy + bh * scale / 2 + px * sr + py * cr]; };
        // each stroke is gone over 1-3 times, a different number of times each, never quite on the same line
        const queue = [];
        strokes.forEach(s => { const passes = 1 + (Math.random() < .55 + .4 * sk ? 1 : 0) + (Math.random() < .3 + .4 * sk ? 1 : 0) + (Math.random() < .35 * sk ? 1 : 0) + (Math.random() < .2 * sk ? 1 : 0) + (Math.random() < .3 * sk * sk ? 1 : 0);
          for (let q = 0; q < passes; q++) queue.push(jitterLine(s.map(place), S * .009 * (.4 + 1.8 * sk) * (q ? 1.5 : 1), S * .035 * sk, S * .008 * (.4 + 1.4 * sk))); });
        st.job = { queue, si: 0, pi: 0 };
      } }
    (st.boxes || []).forEach(b => { b.life -= dt; });
    // move the pencil along the current stroke
    const base = S * .0032 * L("weight", .4, 2.2), swell = 1 + 4 * k("swell") * Math.max(loud, R.kick * .8);
    if (st.job) { let budget = dt * S * L("speed", .5, 2.6) * (.75 + 1.1 * E2(R.energy) * .6 + .6 * loud);
      while (budget > 0 && st.job) { const s = st.job.queue[st.job.si];
        if (!s) { st.job = null; st.next = .25 + Math.random() * .5; break; }
        if (st.job.pi === 0) { st.marks.push({ pts: [], age: 0 }); }
        const mark = st.marks[st.marks.length - 1];
        while (budget > 0 && st.job.pi < s.length) { const p = s[st.job.pi]; mark.pts.push([p[0], p[1], base * swell, n.hue + st.hp]); st.pen = p; st.job.pi++; budget -= 3; }
        if (st.job.pi >= s.length) { st.job.si++; st.job.pi = 0; } } }
    // draw every mark, fading with age
    const life = L("linger", 1.5, 14), span = L("span", 0, 300);
    g.lineCap = g.lineJoin = "round";
    for (let m = st.marks.length - 1; m >= 0; m--) { const mk = st.marks[m]; if (mk !== st.marks[st.marks.length - 1] || !st.job) mk.age += dt;
      const fadeA = 1 - mk.age / life; if (fadeA <= 0) { st.marks.splice(m, 1); continue; }
      const pts = mk.pts, N = pts.length; if (N < 2) continue;
      // scratchy: a soft glow, a broken main line, and two hairlines that wander off it like pencil grain
      mk.seed ??= Math.random() * 1000;
      [[2.4, .07, 55, 0, 0], [.8, .75, 62, 0, .12], [.35, .55, 75, 1, .18], [.3, .45, 70, -1, .22], [.25, .35, 80, 2, .3], [.25, .3, 68, -2, .35], [.2, .25 * sk, 82, 3, .4], [.2, .22 * sk, 66, -3, .45]].forEach(([wK, al, lt, off, drop]) => {
        for (let i = 1; i < N; i++) { if (drop && seeded(mk.seed + i * 1.7 + wK * 31) < drop) continue; const p0 = pts[i - 1], p1 = pts[i], o = off * (1 + p1[2] * .5) * (.5 + seeded(mk.seed + i * .3 + off * 7));
          g.lineWidth = Math.max(.5, p1[2] * wK); g.strokeStyle = hsl(p1[3] + (i / N) * span * .2 + off * 12, 100, lt, al * fadeA); g.beginPath(); g.moveTo(p0[0] + o, p0[1] - o * .6); g.lineTo(p1[0] + o, p1[1] - o * .6); g.stroke(); } });
      g.lineWidth = .7; g.strokeStyle = `rgba(255,255,255,${.3 * fadeA})`; strokePath(g, pts); }
    if (st.marks.length > 160) st.marks.splice(0, st.marks.length - 160);
    if (st.pen) sprite(g, n.hue + st.hp, st.pen[0], st.pen[1], base * swell * 3 + S * .012, st.job ? .95 : .4); } };

/* ---- Lightning trio: three storm cells circle each other and strike ---- */
const STORM = { key: "storm", name: "Lightning trio", fade: .5,
  init: () => ({ bodies: null, bolts: [], boops: [] }),
  shape: [{ key: "orbit", label: "Orbit width", def: 1 }, { key: "rate", label: "Strike rate", def: .24 }, { key: "violence", label: "Violence", def: 1 }, { key: "aim", label: "Hits each other", def: 1 }, { key: "spread", label: "Color spread", def: 1 }],
  draw(E) { const { g, n, R, S, st, t, dt, W, H, L, k } = E, loud = loudOf(R), orbit = S * L("orbit", .1, .42);
    if (!st.bodies) st.bodies = [0, 1, 2].map(i => { const a = i / 3 * TAU; return { x: n.x + Math.cos(a) * orbit, y: n.y + Math.sin(a) * orbit, vx: -Math.sin(a) * S * .2, vy: Math.cos(a) * S * .2, sp: [.8, 1.15, .95][i], ph: i * 2.3, cool: .5 + i * .4 }; });
    const B = st.bodies, cx = (B[0].x + B[1].x + B[2].x) / 3, cy = (B[0].y + B[1].y + B[2].y) / 3, pace = .55 + E2(R.energy) * .8;
    B.forEach((b, i) => {
      // pulled toward its own drifting slot around the home point, with a swirl around the group
      const sa = t * .35 * b.sp + i / 3 * TAU + Math.sin(t * .23 + b.ph) * .9, rr = orbit * (.75 + .35 * Math.sin(t * .4 * b.sp + b.ph));
      const gx = n.x + Math.cos(sa) * rr, gy = n.y + Math.sin(sa) * rr * .8;
      let ax = (gx - b.x) * 2.2 * pace, ay = (gy - b.y) * 2.2 * pace;
      const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy) || 1; ax += -dy / d * S * .5 * b.sp * pace; ay += dx / d * S * .5 * b.sp * pace;
      ax += vnoise(t * 1.3 + i * 9) * S * .6; ay += vnoise(t * 1.1 + i * 17) * S * .6;
      B.forEach((o, j) => { if (o === b) return; const ex = b.x - o.x, ey = b.y - o.y, e = Math.hypot(ex, ey) || 1, near = S * .07;
        if (e < near) { ax += ex / e * S * 12 * (1 - e / near); ay += ey / e * S * 12 * (1 - e / near); if (j > B.indexOf(b) && !b.boopT) { st.boops.push({ x: (b.x + o.x) / 2, y: (b.y + o.y) / 2, a: 1 }); b.boopT = .8; } } });
      b.boopT = Math.max(0, (b.boopT || 0) - dt);
      const m = S * .06; if (b.x < m) ax += (m - b.x) * 20; if (b.x > W - m) ax -= (b.x - W + m) * 20; if (b.y < m) ay += (m - b.y) * 20; if (b.y > H - m) ay -= (b.y - H + m) * 20;
      b.vx = (b.vx + ax * dt) * Math.exp(-1.6 * dt); b.vy = (b.vy + ay * dt) * Math.exp(-1.6 * dt); b.x += b.vx * dt; b.y += b.vy * dt;
    });
    // strikes: more often, bigger and more violent as it gets louder
    const vio = L("violence", .25, 1.4) * (.45 + 1.1 * loud), aim = k("aim"), rate = L("rate", .3, 2.2) * (.25 + 3 * loud);
    B.forEach((b, i) => { b.cool -= dt * rate; if (E.beat && Math.random() < .55) b.cool = Math.min(b.cool, 0);
      if (b.cool > 0) return; b.cool = .4 + Math.random() * 1.2;
      const r = Math.random(), hue = n.hue + (i - 1) * k("spread") * 120, jag = .5 + vio * .9;
      if (r < aim) { const o = B[(i + 1 + (Math.random() < .5 ? 0 : 1)) % 3], main = bolt(b.x, b.y, o.x, o.y, Math.hypot(o.x - b.x, o.y - b.y) * .35 * jag); st.bolts.push({ pts: main, age: 0, w: 1 + vio * .8, hue });
        for (let f = 0, fc = Math.round(vio * 2.5); f < fc; f++) { const s = main[Math.floor(main.length * (.2 + Math.random() * .6))], a = Math.random() * TAU, Ln = S * (.04 + Math.random() * .08) * (1 + vio); st.bolts.push({ pts: bolt(s[0], s[1], s[0] + Math.cos(a) * Ln, s[1] + Math.sin(a) * Ln, Ln * .5 * jag), age: 0, w: .5, hue }); } }
      else if (r < aim + (1 - aim) * .83) { const a = Math.random() * TAU, Ln = S * (.12 + .3 * Math.random()) * (1 + vio * 1.2); st.bolts.push({ pts: bolt(b.x, b.y, b.x + Math.cos(a) * Ln, b.y + Math.sin(a) * Ln, Ln * .45 * jag), age: 0, w: .8 + vio * .6, hue }); }
      else for (let q = 0; q < 3; q++) { const a = Math.random() * TAU, Ln = S * .035; st.bolts.push({ pts: bolt(b.x, b.y, b.x + Math.cos(a) * Ln, b.y + Math.sin(a) * Ln, Ln * .6), age: .2, w: .5, hue }); }
      b.flash = .6 + .4 * loud; });
    g.lineJoin = g.lineCap = "round";
    for (let i = st.bolts.length - 1; i >= 0; i--) { const bl = st.bolts[i]; bl.age += dt; if (bl.age > .5) { st.bolts.splice(i, 1); continue; }
      const env = 1 - bl.age / .5, fl = bl.age < .25 ? .55 + .45 * Math.abs(Math.sin(bl.age * 30)) : 1, a = env * env * fl;
      [[8, .12, 70], [3, .45, 72], [1.2, 1, 97]].forEach(([w, al, l]) => { g.lineWidth = w * bl.w; g.strokeStyle = hsl(bl.hue, 100, l, a * al); strokePath(g, bl.pts); }); }
    for (let i = st.boops.length - 1; i >= 0; i--) { const p = st.boops[i]; p.a -= dt * 2; if (p.a <= 0) { st.boops.splice(i, 1); continue; } g.lineWidth = 1.2; g.strokeStyle = hsl(n.hue + 40, 100, 85, p.a * .7); g.beginPath(); g.arc(p.x, p.y, S * .03 * (1.6 - p.a), 0, TAU); g.stroke(); }
    B.forEach((b, i) => { const hue = n.hue + (i - 1) * k("spread") * 120; b.flash = Math.max(0, (b.flash || 0) - dt * 2.5);
      if (b.flash > 0) sprite(g, hue, b.x, b.y, S * .22, b.flash * .3);
      g.lineWidth = 1; g.strokeStyle = hsl(hue, 90, 72, .12 + .2 * loud); strokePath(g, bolt(b.x, b.y, b.x + (Math.random() - .5) * S * .08, b.y + (Math.random() - .5) * S * .08, S * .03));
      sprite(g, hue, b.x, b.y, S * (.032 + .03 * R.kick), .95); }); } };

/* ---- Cheshire: two menacing eyes that get agitated and bamboozled when it's loud ---- */
const CHESHIRE = { key: "cheshire", name: "Cheshire", fade: .55, init: () => ({ rings: [], gaze: [0, 0], tgt: [0, 0], blink: 0, nextBlink: 2, roll: 0, shake: 0, spin: 0, ringT: 0, lid: [0, 0], wall: 0 }),
  shape: [{ key: "menace", label: "Menace", def: 1 }, { key: "spacing", label: "Eye spacing", def: .28 }, { key: "size", label: "Eye size" }, { key: "twitch", label: "Twitchiness", def: 1 }, { key: "hypno", label: "Hypnotic spirals", def: 1 }, { key: "drift", label: "Color drift", def: .57 }, { key: "brow", label: "Brow arch", def: .29 }, { key: "halo", label: "Halo size", def: .6 }],
  kickBoost: ["size", "trails", "roam"],
  draw(E) { const { g, n, R, S, st, t, dt, W, H, L, k } = E, loud = loudOf(R), tw = k("twitch"), men = k("menace");
    st.wall += dt; const drift = L("drift", 0, 60), H0 = n.hue + Math.sin(st.wall * .45) * drift, H1 = n.hue + Math.sin(st.wall * .45 + 2.1) * drift, H2 = n.hue + Math.sin(st.wall * .45 + 4.2) * drift;
    const agit = clamp(loud * 1.3 + R.kick * .5, 0, 1.4) * (.4 + tw);
    // gaze: drifts when quiet, darts on beats, wanders independently per eye when agitated
    if (E.beat || Math.random() < dt * (.3 + 3 * agit)) st.tgt = [(Math.random() - .5) * 1.6, (Math.random() - .5) * 1.1];
    const gk = Math.min(1, dt * (2 + 14 * agit)); st.gaze[0] += (st.tgt[0] - st.gaze[0]) * gk; st.gaze[1] += (st.tgt[1] - st.gaze[1]) * gk;
    st.roll += dt * agit * 7; st.spin += dt * (.8 + 5 * agit) * L("hypno", .2, 1.6);
    st.ringT -= dt * (.8 + 2.5 * loud); if (st.ringT <= 0 || E.beat) { st.ringT = 1; st.emit = true; }
    st.lid = st.lid.map(v => Math.random() < dt * 6 * agit * tw ? Math.random() * .35 : v * Math.exp(-dt * 10));
    st.nextBlink -= dt; if (st.nextBlink <= 0) { st.blink = 1; st.nextBlink = 2 + Math.random() * 4 - agit * 1.5; }
    st.blink = Math.max(0, st.blink - dt * 7);
    st.shake = agit > .55 ? (agit - .55) * S * .02 * tw : 0;
    const rm = E.p ? E.p.roam : 0, cx = W / 2 + vnoise(st.wall * .35) * W * .22 * rm + (Math.random() - .5) * st.shake * 2, cy = H / 2 + vnoise(st.wall * .3 + 50) * H * .16 * rm + (Math.random() - .5) * st.shake * 2;
    const ew = S * .2 * L("size", .6, 1.5), gap = S * L("spacing", .1, .34);
    const open = clamp((.38 + .62 * Math.min(1, agit)) * (1 - Math.sin(st.blink * Math.PI)), .03, 1);
    g.lineCap = g.lineJoin = "round";
    [-1, 1].forEach(side => {
      const lop = 1 + (side > 0 ? .18 : -.06) * Math.min(1, agit), ew2 = ew * lop, ex = cx + side * (gap + ew * .5), ey = cy + (side > 0 ? -1 : 1) * ew * .05 * Math.min(1, agit), tilt = -side * (.22 + .3 * men) + Math.sin(t * 23 + side) * .06 * agit * tw;
      g.save(); g.translate(ex, ey); g.rotate(tilt);
      // almond with a flattened, lowered upper lid (the glare) and a sharp outer corner
      const li = side > 0 ? 1 : 0, op2 = Math.max(.03, open - st.lid[li]), hw = ew2 * .5, top = ew2 * .42 * op2 * (1 - .4 * men), bot = ew2 * .3 * op2;
      const outline = () => { g.beginPath(); g.moveTo(-hw * side, 0); g.bezierCurveTo(-hw * .3 * side, -top * 1.25, hw * .5 * side, -top * 1.1, hw * side, -top * .25 * men); g.lineTo(hw * 1.08 * side, 0);
        g.bezierCurveTo(hw * .55 * side, bot * 1.3, -hw * .3 * side, bot * 1.25, -hw * side, 0); g.closePath(); };
      outline(); g.fillStyle = hsl(H0, 100, 55, .1 + .12 * agit); g.fill();
      [[5, .12], [1.6, .9]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(H0, 100, 68, a); outline(); g.stroke(); });
      // slit pupil: narrow when calm, dilates and rolls when bamboozled
      g.save(); outline(); g.clip();
      const wob = agit > .7 ? (agit - .7) * hw * .5 : 0, px = st.gaze[0] * hw * .45 + Math.cos(st.roll * side) * wob, py = st.gaze[1] * top * .4 + Math.sin(st.roll * side) * wob * .6;
      const hyp = k("hypno"); if (hyp > .02) { g.lineWidth = 1.1; g.strokeStyle = hsl(H1, 100, 70, .25 + .45 * hyp); g.beginPath();
        for (let i = 0; i <= 90; i++) { const u = i / 90, a = u * TAU * 4 + st.spin * side, rr = u * hw * 1.1; const x = px + Math.cos(a) * rr, y = py + Math.sin(a) * rr * .8; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      const pin = clamp((agit - .6) * 2.5, 0, 1), pw = ew * lerp(.04 + .03 * Math.sin(t * 2), .012, pin), ph = Math.max(top, bot) * lerp(1.1, .25, pin);
      g.beginPath(); g.ellipse(px, py, pw, ph, 0, 0, TAU); g.fillStyle = "rgba(0,0,0,.92)"; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = hsl(H1, 100, 80, .8); g.stroke();
      sprite(g, H1, px + pw * .6, py - ph * .45, ew * .04, .7);
      g.restore();
      // brow: groomed and sharp. Blunt at the inner end, rising to a crisp arch, tapering to a fine tail
      const by = -top * 1.3 - ew * (.1 + .05 * Math.sin(t * 31 + side) * agit * tw) - ew * .03 * (1 - men), arch = k("brow");
      const P0 = [-hw * 1.02 * side, by + ew * (.02 + .1 * men)], P1 = [hw * .45 * side, by - ew * (.06 + .14 * arch)], P2 = [hw * 1.18 * side, by + ew * (.02 + .03 * arch)];
      const bpts = [];
      for (let i = 0; i <= 24; i++) { const u = i / 24;
        if (u <= .62) { const v = u / .62, c1 = [lerp(P0[0], P1[0], .55), P1[1] + ew * .015]; bpts.push([(1 - v) * (1 - v) * P0[0] + 2 * (1 - v) * v * c1[0] + v * v * P1[0], (1 - v) * (1 - v) * P0[1] + 2 * (1 - v) * v * c1[1] + v * v * P1[1]]); }
        else { const v = (u - .62) / .38, c1 = [lerp(P1[0], P2[0], .35), P1[1] - ew * .005]; bpts.push([(1 - v) * (1 - v) * P1[0] + 2 * (1 - v) * v * c1[0] + v * v * P2[0], (1 - v) * (1 - v) * P1[1] + 2 * (1 - v) * v * c1[1] + v * v * P2[1]]); } }
      const bw = ew * .05; ribbonNeon(g, bpts, H2, f => bw * (f < .62 ? 1 - f * .45 : Math.max(.02, (1 - f) / .38 * .72)), .9);
      g.restore();
      if (st.emit) {
        // each halo starts as an exact copy of this eye's outline in this frame (never flatter than a half-open eye)
        const o2 = Math.max(op2, .45), tp = ew2 * .42 * o2 * (1 - .4 * men), bt = ew2 * .3 * o2, bz = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; }, shp = [];
        for (let j = 0; j < 40; j++) { const u = j / 40; shp.push([bz(-hw * side, -hw * .3 * side, hw * .5 * side, hw * side, u), bz(0, -tp * 1.25, -tp * 1.1, -tp * .25 * men, u)]); }
        shp.push([hw * 1.08 * side, 0]);
        for (let j = 1; j < 40; j++) { const u = j / 40; shp.push([bz(hw * 1.08 * side, hw * .55 * side, -hw * .3 * side, -hw * side, u), bz(0, bt * 1.3, bt * 1.25, 0, u)]); }
        st.rings.push({ x: ex, y: ey, sc: 1 + .4 * loud, a: .85, side, h: side > 0 ? H1 : H0, seed: Math.random() * 100, shp, rot: tilt, spin: (Math.random() - .5) * 1.4, sx: 1, sxT: .7 + Math.random() * .7, vx: (Math.random() - .5) * S * .12, vy: (Math.random() - .5) * S * .08, ph: Math.random() * TAU });
      }
    });
    st.emit = false;
    for (let i = st.rings.length - 1; i >= 0; i--) { const q = st.rings[i];
      q.sc += dt * (S / ew) * (.16 + .8 * loud) * L("halo", .4, 1.8) * (1 + 2 * (1 - q.a / .85)); q.a -= dt * (.42 - .24 * loud); if (q.a <= 0) { st.rings.splice(i, 1); continue; }
      // then it modulates: breathes, stretches, drifts and twists, wobbling more and tearing apart as it fades
      const age = 1 - q.a / .85, ch = Math.min(1, age * 1.4) * (.6 + .6 * loud), tt = st.wall * (1.5 + 3 * loud);
      q.rot += dt * q.spin * ch; q.sx += (q.sxT - q.sx) * dt * .8 * ch; q.x += q.vx * dt * ch; q.y += q.vy * dt * ch;
      const breathe = 1 + .08 * ch * Math.sin(tt * 2.2 + q.ph), cr = Math.cos(q.rot), sr = Math.sin(q.rot), N = q.shp.length;
      g.lineWidth = 1 + 2.2 * age; g.strokeStyle = hsl(q.h + (seeded(q.seed) - .5) * 40 * ch, 100, 70, q.a * .5); g.beginPath();
      let pen = false;
      for (let j = 0; j <= N; j++) { const p = q.shp[j % N], th = j / N * TAU, wob = 1 + ch * (.24 * vnoise(th * 2.5 + q.seed + tt * .5) + .1 * vnoise(th * 7 + q.seed * 3 - tt));
        const gapHere = ch > .35 && seeded(q.seed + Math.floor(j / 5)) < (ch - .35) * .8;
        const ox = p[0] * q.sc * q.sx * breathe * wob, oy = p[1] * q.sc / q.sx * breathe * wob, x = q.x + ox * cr - oy * sr, y = q.y + ox * sr + oy * cr;
        if (gapHere) { pen = false; continue; } pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; }
      g.stroke(); } } };

/* ---- Swimmers (name to be picked): a current of whip-tailed swimmers that thickens with the music ---- */
const SWIM = { key: "swim", name: "Swimmers", fade: .45, init: () => ({ sw: [], acc: 0, surge: 0 }),
  shape: [{ key: "dir", label: "Direction", def: .875, cfmt: v => Math.round(v * 360) + "°" }, { key: "density", label: "Density" }, { key: "speed", label: "Speed" }, { key: "wiggle", label: "Wiggle" }, { key: "size", label: "Size" }, { key: "varied", label: "Color variety", def: .35 }],
  draw(E) { const { g, n, R, S, st, t, dt, W, H, L, k } = E, loud = loudOf(R), dir = k("dir") * TAU, dx = Math.cos(dir), dy = Math.sin(dir);
    st.surge = Math.max(st.surge * Math.exp(-dt * 3), R.kick);
    st.acc += dt * L("density", .3, 2.2) * (3 + 55 * loud) * (1 + .8 * st.surge);
    if (E.beat) st.acc += L("density", 1, 5) * (1 + 4 * loud);
    const diag = Math.hypot(W, H), sz = L("size", .5, 1.8), ext = Math.abs(dx) * W / 2 + Math.abs(dy) * H / 2, margin = S * .08;
    if (!st.filled) { st.filled = true; st.acc += 26; st.prefill = true; }
    while (st.acc >= 1 && st.sw.length < 220) { st.acc -= 1;
      const along = st.prefill ? (Math.random() * 2 - 1) * ext : -ext - margin * (.3 + Math.random()), across = (Math.random() - .5) * diag;
      st.sw.push({ x: W / 2 + dx * along - dy * across, y: H / 2 + dy * along + dx * across, h: (Math.random() - .5) * .5, ph: Math.random() * TAU, s: sz * (.7 + Math.random() * .6), sp: S * (.2 + .12 * Math.random()) * L("speed", .5, 1.8), wr: 9 + Math.random() * 4, hue: n.hue + (Math.random() - .5) * 140 * k("varied") }); }
    st.prefill = false; st.acc = Math.min(st.acc, 3);
    const wig = L("wiggle", .2, 2);
    g.lineCap = g.lineJoin = "round";
    for (let i = st.sw.length - 1; i >= 0; i--) { const s = st.sw[i];
      s.h += (vnoise(t * .6 + s.ph * 9) * .5 - s.h) * dt * .8;
      const hd = dir + s.h, hx = Math.cos(hd), hy = Math.sin(hd), v = s.sp;
      s.x += hx * v * dt; s.y += hy * v * dt; s.ph += dt * s.wr;
      const proj = (s.x - W / 2) * dx + (s.y - H / 2) * dy; if (proj > ext + margin * 2) { st.sw[i] = st.sw[st.sw.length - 1]; st.sw.pop(); continue; }
      const seg = S * .007 * s.s, pts = [];
      for (let j = 0; j <= 12; j++) { const f = j / 12, o = Math.sin(s.ph - j * .7) * seg * 1.6 * f * wig; pts.push([s.x - hx * seg * j * 1.5 - hy * o, s.y - hy * seg * j * 1.5 + hx * o]); }
      [[3, .12], [1.1, .85]].forEach(([w, a]) => { g.lineWidth = w * s.s; g.strokeStyle = hsl(s.hue, 100, 70, a); strokePath(g, pts); });
      g.save(); g.translate(s.x, s.y); g.rotate(hd); g.beginPath(); g.ellipse(seg * .6, 0, seg * 1.5, seg * .95, 0, 0, TAU); g.fillStyle = hsl(s.hue, 100, 78, .9); g.fill(); g.restore();
      sprite(g, s.hue, s.x, s.y, seg * 3.2, .5); } } };

/* ---- Synapse stems (name to be picked): 3-5 nerve stems that grow and fire with the loud parts ---- */
const SYNAPSE = { key: "synapse", name: "Nerve stems", fade: .35, init: node => ({ lv: new Array(13).fill(0), imp: [], fires: [], all: 0 }),
  shape: [{ key: "stems", label: "Stems", min: 3, max: 5, def: .5 }, { key: "reach", label: "Reach", def: .27 }, { key: "firing", label: "Firing", def: .84 }, { key: "branch", label: "Branching", def: .63 }, { key: "core", label: "Core density", def: 1 }],
  draw(E) { const { g, n, R, S, st, t, dt, L, I, k } = E, loud = loudOf(R), cnt = I("stems"), sd = E.node.seed * 10;
    st.all += (Math.max(loud, R.kick * .6) - st.all) * Math.min(1, dt * 2);
    const extra = Math.round(clamp((st.all - .15) / .7, 0, 1) * 8), total = cnt + extra;
    const segsBy = {}, tips = [];
    g.lineCap = "round";
    for (let s = 0; s < total; s++) {
      // each stem hears the music with its own lag, so they swell at slightly different times
      const lag = [1.2, 3.5, .7, 2.2, 5, 1.6, 2.8, .9, 4, 1.3, 2.4, 3.1, 1.9][s]; st.lv[s] += (Math.max(loud, R.kick * .7) - st.lv[s]) * Math.min(1, dt * lag);
      const lv = st.lv[s] * (s < cnt ? 1 : clamp((st.all - .15) / .7 * 8 - (s - cnt), 0, 1)), base = s < cnt ? s / cnt * TAU + seeded(sd + s) * .9 + Math.sin(t * .15 + s) * .2 : ((s - cnt) / 8 + 1 / 16) * TAU + seeded(sd + s) * .5 + Math.sin(t * .2 + s) * .2;
      if (lv < .02 && s >= cnt) continue;
      const len = S * (.06 + .08 * seeded(sd + s * 3) + .26 * lv) * (s < cnt ? 1 : .85) * L("reach", .5, 1.7), depth = clamp(2 + Math.round(lv * 3 * L("branch", .3, 1.4)), 2, 6), spread = .35 + .25 * seeded(sd + s * 7) + .2 * lv;
      const hue = n.hue + (s - cnt / 2) * 14;
      (function br(x, y, a, ln, d, code) {
        const ex = x + Math.cos(a) * ln, ey = y + Math.sin(a) * ln, bend = Math.sin(t * 1.1 + d * 1.7 + s * 2 + sd) * ln * .3;
        const sg = [x, y, (x + ex) / 2 - Math.sin(a) * bend, (y + ey) / 2 + Math.cos(a) * bend, ex, ey, d, hue]; segsBy[s + ":" + code] = sg;
        if (d >= depth) { tips.push([ex, ey, hue, s]); return; }
        const sp = spread * (1 - d * .05) + Math.sin(t * .9 + d + s) * .12, nl = ln * (.7 + .1 * Math.sin(t + d + s));
        br(ex, ey, a - sp, nl, d + 1, code + "0"); br(ex, ey, a + sp * (.8 + .4 * seeded(sd + d + s)), nl, d + 1, code + "1");
      })(n.x, n.y, base, len, 0, "");
      if (E.beat && Math.random() < .4 + .6 * lv) st.imp.push({ s, code: Array.from({ length: depth }, () => Math.random() < .5 ? "0" : "1").join(""), u: 0, sp: 2.5 + 3 * lv });
    }
    // dense core: a tangle of short dendrites around the center, thicker when it's loud
    const coreN = Math.round(L("core", 4, 16) * (1 + 1.2 * st.all));
    for (let c = 0; c < coreN; c++) { const a = c / coreN * TAU + t * .12 * (c % 2 ? 1 : -1) + seeded(sd + c * 5) * .6, ln = S * (.025 + .035 * seeded(sd + c * 11)) * (1 + st.all);
      let x = n.x, y = n.y, aa = a; for (let d = 0; d < 3; d++) { const l2 = ln * (1 - d * .25), ex = x + Math.cos(aa) * l2, ey = y + Math.sin(aa) * l2, bend = Math.sin(t * 1.7 + c + d) * l2 * .35;
        segsBy["c" + c + ":" + d] = [x, y, (x + ex) / 2 - Math.sin(aa) * bend, (y + ey) / 2 + Math.cos(aa) * bend, ex, ey, 3 + d, n.hue + 20]; x = ex; y = ey; aa += (seeded(sd + c + d) - .5) * 1.4; }
      if (Math.random() < dt * (1 + 6 * st.all) * .3) st.fires.push({ x, y, hue: n.hue + 20, a: .8, r: S * .015 }); }
    const segs = Object.values(segsBy);
    [[3.4, .1], [1, .8]].forEach(([wm, al]) => segs.forEach(q => { g.lineWidth = (1 + (6 - q[6]) * .5) * wm; g.strokeStyle = hsl(q[7] + q[6] * 6, 100, 62 + (wm < 2 ? 18 : 0), al); g.beginPath(); g.moveTo(q[0], q[1]); g.quadraticCurveTo(q[2], q[3], q[4], q[5]); g.stroke(); }));
    // impulses travel out from the center to a tip, and the tip fires
    const fireK = L("firing", .3, 1.8);
    for (let i = st.imp.length - 1; i >= 0; i--) { const p = st.imp[i]; p.u += dt * p.sp; const lvl = Math.floor(p.u), q = segsBy[p.s + ":" + p.code.slice(0, lvl)];
      if (!q) { const tip = segsBy[p.s + ":" + p.code.slice(0, lvl - 1)]; if (tip) st.fires.push({ x: tip[4], y: tip[5], hue: tip[7], a: 1, r: S * (.025 + .03 * st.lv[p.s]) * fireK }); st.imp.splice(i, 1); continue; }
      const f = p.u - lvl, x = (1 - f) * (1 - f) * q[0] + 2 * (1 - f) * f * q[2] + f * f * q[4], y = (1 - f) * (1 - f) * q[1] + 2 * (1 - f) * f * q[3] + f * f * q[5];
      sprite(g, q[7] + 30, x, y, S * .018 * fireK, .95); }
    for (let i = st.fires.length - 1; i >= 0; i--) { const f = st.fires[i]; f.a -= dt * 2.2; if (f.a <= 0) { st.fires.splice(i, 1); continue; }
      sprite(g, f.hue + 40, f.x, f.y, f.r * (1.6 - f.a * .6), f.a);
      g.lineWidth = 1; g.strokeStyle = hsl(f.hue + 40, 100, 85, f.a * .6); for (let q = 0; q < 4; q++) { const a = q / 4 * TAU + f.x; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x + Math.cos(a) * f.r * 1.4, f.y + Math.sin(a) * f.r * 1.4); g.stroke(); } }
    // at the loud parts, tips of different stems reach for each other across a synapse gap
    const reachK = Math.max(0, st.all - .3) * fireK * 1.4;
    if (reachK > 0) { g.lineWidth = 1; tips.forEach((a, i) => { for (let j = i + 1; j < tips.length; j++) { const b = tips[j]; if (a[3] === b[3]) continue; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > S * .12 * (1 + reachK)) continue;
      const fl = .5 + .5 * Math.sin(t * 20 + i + j); g.strokeStyle = hsl(a[2] + 50, 100, 80, Math.min(.6, reachK) * fl * (1 - d / (S * .12 * (1 + reachK))));
      g.setLineDash([2, 4]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]); } }); }
    tips.forEach((p, i) => { const tw = .5 + .5 * Math.sin(t * 5 + i * .9); sprite(g, p[2] + 20, p[0], p[1], S * (.006 + .01 * st.lv[p[3]]) * (.7 + .6 * tw), .4 + .5 * tw); });
    sprite(g, n.hue, n.x, n.y, S * (.04 + .03 * R.kick), .95); } };

/* ---- Aurora lips: two mirrored curtains shaped as lips that smooch on the beat ---- */
const LIPS = { key: "lips", name: "Smooch", fade: 1, init: () => ({ s: 0, curl: 0, curlSide: 1, prints: [] }),
  shape: [{ key: "width", label: "Width" }, { key: "full", label: "Fullness", def: .6 }, { key: "part", label: "Parted", def: .55 }, { key: "smooch", label: "Pucker" , def: .6 }, { key: "play", label: "Lip curl", def: .6 },
    { key: "gloss", label: "Gloss", def: .6 }, { key: "tails", label: "Tails", def: .6 }, { key: "buzz", label: "Buzz", def: .6 }, { key: "line", label: "Lip line", def: .08 }],
  draw(E) { const { g, n, R, S, st, t, dt, L, k } = E, loud = loudOf(R), cx = n.x, cy = n.y;
    // on the beat she either puckers up or curls one side of her upper lip
    if (E.beat) { const r = Math.random();
      if (r < k("smooch") * .75) { st.s = Math.max(st.s, .65 + .35 * R.kick); if (Math.random() < .35 + .65 * loud) st.prints.push({ a: .35 + .65 * loud, sc: 1 }); }
      else if (r < k("smooch") * .75 + k("play") * .6 && st.curl < .3) { st.curl = 1; st.curlSide = Math.random() < .5 ? -1 : 1; } }
    st.s = Math.max(0, st.s - dt * 1.1); st.curl = Math.max(0, st.curl - dt * .7);
    const s = st.s * st.s * (3 - 2 * st.s), cu = Math.sin(Math.min(1, st.curl) * Math.PI * .5);
    const span = S * L("width", .35, .9) * (1 - .42 * s), full = S * L("full", .07, .24) * (1 + .5 * s), round = lerp(.75, .4, s);
    const gapBase = S * (.006 + .07 * k("part")) * (1 + .6 * loud);
    const gapAt = f => lerp(gapBase, S * .03 * Math.exp(-Math.pow(f / .22, 2)), s);   // a pucker closes to a small O
    const lift = f => cu * full * .75 * clamp((f * st.curlSide - .05) / .55, 0, 1) ** 1.5; // the playful curl
    const upper = f => { const e = Math.pow(Math.max(0, 1 - f * f), round); return full * e * (1 - .3 * (1 - s) * Math.exp(-Math.pow(f / .16, 2))) * (1 + .22 * (1 - s) * Math.exp(-Math.pow((Math.abs(f) - .3) / .18, 2))); };
    const lower = f => full * 1.35 * Math.pow(Math.max(0, 1 - f * f), round * .8);
    const mouth = f => cy + span * .05 * f * f * (1 - s) + Math.sin(f * 3 + t * .8) * S * .004;
    const tails = S * (.03 + .6 * loud * loud + .1 * loud) * L("tails", 0, 1.6), buzz = loud * loud * L("buzz", 0, 1.6);
    const cols = 72, cw = span * 2 / cols;
    for (let c = 0; c < cols; c++) { const f = (c + .5) / cols * 2 - 1, x = cx + f * span, m = mouth(f), gp = gapAt(f), fold = .55 + .45 * Math.sin(f * 14 + t * (2.2 + 9 * buzz)) * Math.sin(f * 5 - t * .7), e = Math.pow(1 - f * f, .5);
      const uh = upper(f) + tails * fold * e * (1 + buzz * (Math.random() - .5) * 1.1), lh = lower(f) + tails * fold * e * .8 * (1 + buzz * (Math.random() - .5) * 1.1);
      g.globalAlpha = Math.min(1, (.4 + .55 * fold) * (.75 + .4 * R.kick));
      g.save(); g.translate(x, m - gp / 2 - lift(f)); g.scale(1, -1); g.drawImage(column(n.hue + f * 18), 0, 0, cw * 1.7, uh); g.restore();
      g.drawImage(column(n.hue - f * 18), x, m + gp / 2, cw * 1.7, lh); }
    g.globalAlpha = 1;
    // juicy: a soft sheen across the whole lower lip, brightest in the middle, no isolated marks
    const gl = k("gloss");
    if (gl > .02) { g.globalCompositeOperation = "lighter";
      for (let c = 0; c < cols; c++) { const f = (c + .5) / cols * 2 - 1, e = Math.pow(Math.max(0, 1 - f * f), 1.5), lh = lower(f), y0 = mouth(f) + gapAt(f) / 2 + lh * .18, hh = lh * .45;
        if (hh < 1) continue; const gr = g.createLinearGradient(0, y0, 0, y0 + hh); gr.addColorStop(0, "rgba(255,235,240,0)"); gr.addColorStop(.45, `rgba(255,235,240,${.22 * gl * e})`); gr.addColorStop(1, "rgba(255,235,240,0)");
        g.fillStyle = gr; g.fillRect(cx + f * span, y0, cw * 1.7, hh); } }
    const outline = (sc, a) => { g.lineWidth = 1.4; g.strokeStyle = hsl(n.hue, 100, 78, a); g.beginPath();
      for (let i = 0; i <= 60; i++) { const f = i / 30 - 1, x = cx + f * span * sc, y = cy + (mouth(f) - cy) * sc - (upper(f) + gapAt(f) / 2 + lift(f)) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let i = 60; i >= 0; i--) { const f = i / 30 - 1, x = cx + f * span * sc, y = cy + (mouth(f) - cy) * sc + (lower(f) + gapAt(f) / 2) * sc; g.lineTo(x, y); }
      g.closePath(); g.stroke(); };
    const lineK = k("line"); if (lineK > .01) outline(1, lineK * (.6 + .4 * s));
    for (let i = st.prints.length - 1; i >= 0; i--) { const p = st.prints[i]; p.sc += dt * (.35 + .5 * loud); p.a -= dt * .55; if (p.a <= 0) { st.prints.splice(i, 1); continue; } outline(p.sc, p.a * .3); } } };

const REWORKS = [
  { form: GRAFFITI, from: "Neon ribbon + Metronome", char: "anchored", hue: 300, p: { grace: .19, roam: .48, size: .65, trails: .27 }, desc: "A neon pencil sketches notebook doodles (crown, Cool S, cube, star, heart, smiley, bolt, spiral, eye, arrow) and short words, going over some lines two or three times. Lines swell up to 5× with the music; edit the word list below." },
  { form: STORM, from: "Lightning", char: "anchored", hue: 210, p: { chaos: 1, energy: 1, grace: .72, roam: .91, size: .53, tempo: 1, trails: .86 }, desc: "Three storm cells circle and bump into each other. The Hits each other slider sets how many strikes land on another cell (yours is at 100%; lower it for random strikes); strikes grow in size, frequency and violence as it gets louder." },
  { form: CHESHIRE, from: "Halo rings", char: "anchored", hue: 225, p: { chaos: 1, energy: 1, grace: 1, roam: .6, size: .7, tempo: 1, trails: .59 }, desc: "Two cat eyes slanted down toward the middle, with sculpted brows and spinning spiral irises. Kicks push Size, Trails and Roam toward 100%. Half-lidded and sly when it's quiet; when it's loud they go wide and lopsided, pupils shrink to pinpricks, lids twitch, and rings pour out." },
  { form: SWIM, from: "Whip strand", char: "anchored", hue: 190, p: { roam: .02 }, desc: "A current of whip-tailed swimmers heading one way, each at its own steady speed. Louder music sends in more of them; drums add little bursts. Name still to be picked." },
  { form: SYNAPSE, from: "Branching limbs", char: "anchored", hue: 256, p: { chaos: .67, energy: .46, grace: .22, roam: .37, size: .55, tempo: .35, trails: .4 }, desc: "A dense tangle at the center with three to five nerve stems. Loud parts grow up to eight more stems into every quadrant, fire impulses out to the tips, and spark across between neighbors. Name still to be picked." },
  { form: LIPS, from: "Aurora curtain", char: "anchored", hy: .5, hue: 350, p: { roam: .02 }, desc: "Full, glossy aurora lips, slightly parted. On the beat she puckers into a small O or curls one side of her upper lip; the light waves stretch and buzz harder as it gets louder." }
];
REWORKS.forEach(r => { FORM[r.form.key] = r.form; });
