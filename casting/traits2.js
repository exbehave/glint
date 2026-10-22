/* ================= New traits, part 2 (Oct 21, 2026): scatters · lines · geometric · figures · text ================= */

/* ---- Murmuration: hundreds of points flocking as one body ---- */
const MURMUR = { key: "murmur", name: "Murmuration", fade: .3, init: () => ({ b: null, tx: 0, ty: 0, tt: 0 }),
  shape: [{ key: "count", label: "Birds", def: .5 }, { key: "cohesion", label: "Cohesion", def: .5 }, { key: "speed", label: "Speed", def: .5 }, { key: "turn", label: "Turn on hits", def: .6 }, { key: "size", label: "Bird size", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, k } = E, N = Math.round(lerp(80, 400, k("count"))), loud = tLoud(R);
    if (!st.b || st.b.length !== N) st.b = Array.from({ length: N }, () => { const a = Math.random() * TAU, r = Math.sqrt(Math.random()); return { x: n.x + (Math.random() - .5) * S * .4, y: n.y + (Math.random() - .5) * S * .3, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, ox: Math.cos(a) * r, oy: Math.sin(a) * r * .6, ph: Math.random() * TAU }; });
    st.tt -= dt; if (st.tt <= 0 || (E.beat && Math.random() < k("turn"))) { st.tx = W * (.2 + .6 * Math.random()); st.ty = H * (.2 + .6 * Math.random()); st.tt = 2 + Math.random() * 4; }
    // cheap flocking: everyone steers toward the flock center plus a wandering target, with a shared heading that drifts
    let cx = 0, cy = 0, vxm = 0, vym = 0; st.b.forEach(b => { cx += b.x; cy += b.y; vxm += b.vx; vym += b.vy; }); cx /= N; cy /= N; vxm /= N; vym /= N;
    const sp = S * L("speed", .25, .9) * (.6 + loud + .6 * R.kick), coh = L("cohesion", .3, 2.2);
    const room = S * .22 * (1 + .5 * loud); // each bird keeps its own place inside a body-sized blob that stretches along the direction of travel
    const hx = vxm / (Math.hypot(vxm, vym) || 1), hy = vym / (Math.hypot(vxm, vym) || 1);
    st.b.forEach((b, i) => { const sw = Math.sin(E.t * 1.5 + b.ph) * .25, ox = (b.ox + hx * sw) * room, oy = (b.oy + hy * sw) * room, dx = cx + ox - b.x, dy = cy + oy - b.y, jit = sp * 5;
      const ax = (st.tx - b.x) * .4 + dx * coh * 2 + (vxm - b.vx) * 1.2 + (Math.random() - .5) * jit, ay = (st.ty - b.y) * .4 + dy * coh * 2 + (vym - b.vy) * 1.2 + (Math.random() - .5) * jit;
      b.vx += ax * dt; b.vy += ay * dt; const v = Math.hypot(b.vx, b.vy) || 1, vmax = sp * (.8 + .4 * ((i * 7) % 5) / 5); if (v > vmax) { b.vx *= vmax / v; b.vy *= vmax / v; } b.x += b.vx * dt; b.y += b.vy * dt; });
    const bs = S * (.003 + .008 * k("size")); g.lineCap = "round"; g.lineWidth = Math.max(1, bs * .5);
    st.b.forEach((b, i) => { const v = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / v, uy = b.vy / v, flap = Math.sin(E.t * 14 + i); g.strokeStyle = hsl(n.hue + (i % 9) * 3, 80, 70, .85); g.beginPath(); g.moveTo(b.x - uy * bs * flap, b.y + ux * bs * flap); g.lineTo(b.x + ux * bs * .6, b.y + uy * bs * .6); g.lineTo(b.x + uy * bs * flap, b.y - ux * bs * flap); g.stroke(); });
    sprite(g, n.hue, cx, cy, S * .12, .12 + .15 * loud); } };

/* ---- Embers: rising sparks that flare on hits ---- */
const EMBERS = { key: "embers", name: "Embers", fade: .25, init: () => ({ ps: [] }),
  shape: [{ key: "rate", label: "Rate", def: .5 }, { key: "rise", label: "Rise", def: .5 }, { key: "flare", label: "Flare on hits", def: .7 }, { key: "wind", label: "Wind", def: .3 }, { key: "warm", label: "Warmth", def: .6 }],
  draw(E) { const { g, n, R, S, st, dt, t, W, H, L, k } = E, loud = tLoud(R), ps = st.ps, rate = L("rate", 20, 160) * (.5 + loud + 3 * R.kick * k("flare"));
    for (let c = rate * dt + (E.beat ? 12 * k("flare") : 0); c > 0; c--) if (Math.random() < Math.min(1, c)) { const life = 1.5 + Math.random() * 2.5; ps.push({ x: n.x + (Math.random() - .5) * S * .5, y: H * .98, vx: (Math.random() - .5) * S * .1, vy: -S * L("rise", .08, .4) * (.6 + Math.random()), life, max: life, h: Math.random(), tw: Math.random() * 9 }); }
    const wind = Math.sin(t * .5) * S * .06 * k("wind"), warm = k("warm");
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.life -= dt; if (p.life <= 0 || p.y < -10) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; } p.vx += (wind + Math.sin(t * 3 + p.tw) * S * .05) * dt; p.vy -= S * .02 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const f = p.life / p.max, fl = .5 + .5 * Math.sin(t * 9 + p.tw), hue = lerp(n.hue, lerp(40, 10, p.h), warm) - 20 * (1 - f), r = S * (.003 + .006 * fl) * (.5 + f); g.fillStyle = hsl(hue, 100, 55 + 30 * fl, .3 + .7 * f); g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); if (fl > .7 && f > .5) sprite(g, hue, p.x, p.y, r * 4, .4); }
    if (ps.length > 1500) ps.splice(0, ps.length - 1500); } };

/* ---- Confetti: bursts of flat shapes tumbling on big hits ---- */
const CONFETTI = { key: "confetti", name: "Confetti", fade: .3, init: () => ({ ps: [] }),
  shape: [{ key: "burst", label: "Burst size", def: .5 }, { key: "on", label: "Burst on", min: 0, max: 2, def: 0, fmt: i => ["Loud hits", "Every kick", "Steady rain"][i] }, { key: "gravity", label: "Gravity", def: .4 }, { key: "colors", label: "Color variety", def: .8 }, { key: "shapes", label: "Shape mix", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, I, k } = E, loud = tLoud(R), on = I("on"), ps = st.ps, grav = S * (.1 + .6 * k("gravity"));
    const add = (cnt, from) => { for (let i = 0; i < cnt; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 1.6, v = S * (.3 + .6 * Math.random()) * (from === "rain" ? .1 : 1); ps.push({ x: from === "rain" ? Math.random() * W : n.x, y: from === "rain" ? -10 : H * .8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * TAU, vr: (Math.random() - .5) * 8, sh: Math.random() < k("shapes") ? Math.floor(Math.random() * 3) : 0, h: Math.random() < k("colors") ? Math.random() * 360 : n.hue + (Math.random() - .5) * 40, sz: S * (.008 + .012 * Math.random()), ph: Math.random() * TAU }); } };
    const cnt = Math.round(lerp(30, 150, k("burst"))); if (on === 2) { if (Math.random() < dt * 25 * (.4 + loud)) add(1, "rain"); } else if (E.beat && (on === 1 || loud > .55)) add(cnt, "burst");
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.vy += grav * dt; p.vx *= Math.exp(-1.2 * dt); p.vy *= Math.exp(-.8 * dt); p.x += p.vx * dt + Math.sin(E.t * 3 + p.ph) * S * .06 * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y > H + 20) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); const w = p.sz * Math.abs(Math.cos(E.t * 5 + p.ph)) + p.sz * .15; g.fillStyle = hsl(p.h, 90, 62, .95); g.beginPath(); if (p.sh === 0) g.rect(-w, -p.sz * .6, w * 2, p.sz * 1.2); else if (p.sh === 1) g.arc(0, 0, w, 0, TAU); else { g.moveTo(0, -p.sz); g.lineTo(w, p.sz * .6); g.lineTo(-w, p.sz * .6); g.closePath(); } g.fill(); g.restore(); }
    if (ps.length > 1200) ps.splice(0, ps.length - 1200); } };

/* ---- Seismograph: a scrolling line that spikes with the music ---- */
const SEISMO = { key: "seismo", name: "Seismograph", fade: .5, init: () => ({ h: [] }),
  shape: [{ key: "speed", label: "Scroll speed", def: .5 }, { key: "gain", label: "Gain", def: .6 }, { key: "pens", label: "Pens", min: 1, max: 3, def: 0 }, { key: "paper", label: "Paper grid", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R), pens = I("pens"), gain = S * L("gain", .1, .5), h = st.h;
    h.push([loud, R.bass, R.treble + R.hat]); const max = Math.round(lerp(400, 120, k("speed"))); while (h.length > max) h.shift();
    if (k("paper") > .05) { g.strokeStyle = hsl(n.hue, 30, 50, .15 * k("paper")); g.lineWidth = 1; const gs = S * .05; for (let x = n.x - W * .45; x <= n.x + W * .45; x += gs) { g.beginPath(); g.moveTo(x, n.y - S * .35); g.lineTo(x, n.y + S * .35); g.stroke(); } for (let y = n.y - S * .35; y <= n.y + S * .35; y += gs) { g.beginPath(); g.moveTo(n.x - W * .45, y); g.lineTo(n.x + W * .45, y); g.stroke(); } }
    g.lineCap = g.lineJoin = "round"; for (let p = 0; p < pens; p++) { const pts = h.map((v, i) => { const x = n.x - W * .45 + i / (max - 1) * W * .9, raw = v[p], jag = Math.sin(i * 1.7 + p) * .5 + .5; return [x, n.y + (p - (pens - 1) / 2) * S * .18 - raw * gain * (.5 + jag * raw) * (p === 2 ? .6 : 1)]; });
      g.lineWidth = S * .012; g.strokeStyle = hsl(n.hue + p * 50, 90, 55, .2); strokePath(g, pts); g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + p * 50, 95, 72, .95); strokePath(g, pts); const last = pts[pts.length - 1]; sprite(g, n.hue + p * 50, last[0], last[1], S * (.012 + .03 * R.kick), .9); } } };

/* ---- Spirograph v2: epicycle curves that reshape as the song moves ---- */
const SPIRO2 = { key: "spiro2", name: "Spirograph", fade: .55, init: () => ({ a: 0, Rr: .62, rr: .45, d: .7 }),
  shape: [{ key: "big", label: "Outer wheel", def: .62 }, { key: "small", label: "Inner wheel", def: .45 }, { key: "pen", label: "Pen offset", def: .7 }, { key: "drift", label: "Reshape with the music", def: .6 }, { key: "speed", label: "Draw speed", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, loud = tLoud(R); st.Rr = lerp(st.Rr, k("big") + .08 * Math.sin(E.t * .3) * k("drift"), dt); st.rr = lerp(st.rr, k("small") + .12 * R.bass * k("drift"), dt * 2); st.d = lerp(st.d, k("pen") + .3 * loud * k("drift"), dt * 2);
    st.a += dt * L("speed", 1, 8) * (.5 + loud + R.kick); const Rr = S * .3 * st.Rr, rr = Rr * (.12 + .4 * st.rr), d = rr * (.3 + 1.2 * st.d), pts = [], N = 180, span = 7;
    for (let i = 0; i <= N; i++) { const a = st.a - span + i / N * span, x = (Rr - rr) * Math.cos(a) + d * Math.cos((Rr - rr) / rr * a), y = (Rr - rr) * Math.sin(a) - d * Math.sin((Rr - rr) / rr * a); pts.push([n.x + x, n.y + y]); }
    g.lineCap = g.lineJoin = "round"; for (let i = 1; i < pts.length; i++) { const f = i / pts.length; g.lineWidth = S * .004 * (.3 + .7 * f); g.strokeStyle = hsl(n.hue + f * 40, 95, 65, .15 + .8 * f * f); g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    const last = pts[N]; sprite(g, n.hue + 40, last[0], last[1], S * (.015 + .03 * R.kick), .9); } };

/* ---- Constellation: drifting points that link when near ---- */
const CONSTEL = { key: "constel", name: "Constellation", fade: .4, init: () => ({ ps: null }),
  shape: [{ key: "stars", label: "Stars", def: .4 }, { key: "reach", label: "Link reach", def: .4 }, { key: "drift", label: "Drift", def: .3 }, { key: "pulse", label: "Pulse links on hits", def: .6 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, k } = E, loud = tLoud(R), N = Math.round(lerp(12, 70, k("stars")));
    if (!st.ps || st.ps.length !== N) st.ps = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5), vy: (Math.random() - .5), r: .5 + Math.random() }));
    const sp = S * L("drift", .02, .15) * (1 + loud), reach = S * L("reach", .12, .35); st.pu = Math.max((st.pu || 0) - dt * 2, E.beat ? k("pulse") : 0);
    st.ps.forEach(p => { p.x += p.vx * sp * dt; p.y += p.vy * sp * dt; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
    g.lineCap = "round"; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = st.ps[i], b = st.ps[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > reach) continue; const al = (1 - d / reach) * (.35 + .65 * st.pu); g.lineWidth = 1 + 1.5 * st.pu; g.strokeStyle = hsl(n.hue, 80, 70, al); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    st.ps.forEach((p, i) => { const tw = .6 + .4 * Math.sin(E.t * 2 + i), r = S * .004 * p.r * (1 + .5 * R.kick); g.fillStyle = `rgba(255,255,255,${.6 + .4 * tw})`; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill(); if (p.r > 1.2) sprite(g, n.hue, p.x, p.y, r * 5, .4 * tw); }); } };

/* ---- Lissajous: the classic oscilloscope figure ---- */
const LISSA = { key: "lissa", name: "Lissajous", fade: .55, init: () => ({ ph: 0, a: 3, b: 2 }),
  shape: [{ key: "ratio", label: "Ratio", min: 0, max: 5, def: .2, fmt: i => ["1:2", "2:3", "3:4", "3:5", "4:5", "5:6"][i] }, { key: "phase", label: "Phase drift", def: .4 }, { key: "size", label: "Size", def: .55 }, { key: "beam", label: "Beam width", def: .4 }, { key: "react", label: "Shape with bass", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, I, k } = E, loud = tLoud(R), [a, b] = [[1, 2], [2, 3], [3, 4], [3, 5], [4, 5], [5, 6]][I("ratio")]; st.ph += dt * L("phase", 0, 1.5) * (1 + loud);
    const sz = S * L("size", .15, .4), sx = sz * (1 + .25 * R.bass * k("react")), sy = sz * (1 - .15 * R.bass * k("react")), pts = [], N = 360;
    for (let i = 0; i <= N; i++) { const u = i / N * TAU; pts.push([n.x + Math.sin(a * u + st.ph) * sx, n.y + Math.sin(b * u) * sy]); }
    g.lineCap = g.lineJoin = "round"; const w = S * (.004 + .02 * k("beam")); g.lineWidth = w * 3; g.strokeStyle = hsl(n.hue, 90, 55, .12); strokePath(g, pts); g.lineWidth = w; g.strokeStyle = hsl(n.hue, 95, 75, .9); strokePath(g, pts);
    const dot = pts[Math.floor((E.t * 60) % N)]; sprite(g, n.hue, dot[0], dot[1], S * (.02 + .03 * R.kick), .9); } };

/* ---- Breathing grid: a lattice that bulges toward the center on bass ---- */
const GRID = { key: "grid", name: "Breathing grid", fade: .5, init: () => ({ b: 0 }),
  shape: [{ key: "cells", label: "Cells", min: 6, max: 24, def: .4 }, { key: "bulge", label: "Bulge", def: .6 }, { key: "dots", label: "Dots at crossings", def: .5 }, { key: "persp", label: "Perspective", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R); st.b = lerp(st.b, R.bass * .8 + R.kick * .5, dt * 8); const N = I("cells"), amp = k("bulge") * (.15 + .6 * st.b), persp = k("persp");
    const P = (i, j) => { let u = i / N * 2 - 1, v = j / N * 2 - 1; const d = Math.hypot(u, v), f = 1 + amp * Math.exp(-d * d * 2); u *= f; v *= f; const z = 1 + persp * (v + 1) * .6; return [n.x + u * W * .45 / z, n.y + v * H * .42 / z * (1 - persp * .3)]; };
    g.lineCap = "round"; g.lineWidth = S * .003; for (let i = 0; i <= N; i++) { const col = [], row = []; for (let j = 0; j <= N; j++) { col.push(P(i, j)); row.push(P(j, i)); } g.strokeStyle = hsl(n.hue, 85, 65, .55 + .3 * st.b); strokePath(g, col); strokePath(g, row); }
    if (k("dots") > .05) for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const [x, y] = P(i, j), d = Math.hypot(i / N * 2 - 1, j / N * 2 - 1); g.fillStyle = hsl(n.hue + 30, 90, 80, (.3 + .7 * st.b * Math.exp(-d * d * 2)) * k("dots")); g.beginPath(); g.arc(x, y, S * .004 * (1 + st.b), 0, TAU); g.fill(); }
    sprite(g, n.hue, n.x, n.y, S * .15 * (1 + st.b), .12 + .2 * st.b); } };

/* ---- Tessellate: tiles that flip and recolor in waves ---- */
const TESSEL = { key: "tessel", name: "Tessellate", fade: .6, init: () => ({ w: [] }),
  shape: [{ key: "tiles", label: "Tiles across", min: 6, max: 20, def: .4 }, { key: "sides", label: "Sides", min: 3, max: 8, def: 0, fmt: n => n + " sides", slide: true }, { key: "wave", label: "Wave speed", def: .5 }, { key: "fill", label: "Fill", def: .4 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R), N = I("tiles"), cw = W / N, sides = I("sides"), sh = sides === 3 ? 0 : sides === 4 ? 1 : 2; if (E.beat) st.w.push({ r: 0, x: n.x + (Math.random() - .5) * W * .6, y: n.y + (Math.random() - .5) * H * .6 }); st.w = st.w.filter(w => (w.r += dt * W * L("wave", .3, 1.2)) < W * 1.2);
    const rows = Math.ceil(H / cw) + 1; for (let j = 0; j < rows; j++) for (let i = -1; i <= N; i++) { const cx = (i + (sh === 2 && j % 2 ? .5 : 0)) * cw + cw / 2, cy = j * cw * (sh === 2 ? .87 : 1) + cw / 2; let flip = 0; st.w.forEach(w => { const d = Math.abs(Math.hypot(cx - w.x, cy - w.y) - w.r); flip = Math.max(flip, Math.max(0, 1 - d / (cw * 2.5))); });
      const sc = Math.cos(flip * Math.PI), hue = n.hue + flip * 80 + (i + j) * 2, r = cw * .5 * (.85 + .15 * loud); g.save(); g.translate(cx, cy); g.scale(Math.abs(sc) < .05 ? .05 : sc, 1); g.beginPath();
      if (sh === 0) { const up = (i + j) % 2 === 0; g.moveTo(-r, up ? r : -r); g.lineTo(r, up ? r : -r); g.lineTo(0, up ? -r : r); g.closePath(); } else if (sh === 1) g.rect(-r, -r, r * 2, r * 2); else { for (let q = 0; q < sides; q++) { const a = q / sides * TAU + Math.PI / sides; q ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
      g.fillStyle = hsl(hue, 85, 55, (.08 + .5 * flip) * k("fill") * 2); g.fill(); g.lineWidth = 1.2; g.strokeStyle = hsl(hue, 90, 70, .35 + .6 * flip); g.stroke(); g.restore(); } } };

/* ---- Hex bloom: hexagons growing outward from a seed on each kick ---- */
const HEXB = { key: "hexbloom", name: "Hex bloom", fade: .4, init: () => ({ blooms: [] }),
  shape: [{ key: "size", label: "Cell size", def: .4 }, { key: "rings", label: "Rings", min: 2, max: 7, def: .5 }, { key: "speed", label: "Growth speed", def: .5 }, { key: "fill", label: "Fill", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R), cs = S * L("size", .02, .07), rings = I("rings"); if (E.beat) st.blooms.push({ x: st.blooms.length ? n.x + (Math.random() - .5) * W * .7 : n.x, y: st.blooms.length ? n.y + (Math.random() - .5) * H * .6 : n.y, t: 0, h: n.hue + (Math.random() - .5) * 60 }); st.blooms = st.blooms.filter(b => (b.t += dt * L("speed", .6, 3)) < rings + 2.5).slice(-6);
    const hex = (x, y, r) => { g.beginPath(); for (let q = 0; q < 6; q++) { const a = q / 6 * TAU; q ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); };
    st.blooms.forEach(b => { for (let ring = 0; ring <= rings; ring++) { const grow = clamp(b.t - ring * .8, 0, 1), fade = clamp((rings + 2.5 - b.t) / 2, 0, 1); if (grow <= 0) continue; const cnt = ring ? ring * 6 : 1;
        for (let q = 0; q < cnt; q++) { let x = b.x, y = b.y; if (ring) { const side = Math.floor(q / ring), s = q % ring, a0 = side / 6 * TAU, a1 = (side + 1) / 6 * TAU, d = cs * 1.74 * ring; x = b.x + Math.cos(a0 + Math.PI / 6) * d + (Math.cos(a1 + Math.PI / 6) * d - Math.cos(a0 + Math.PI / 6) * d) * s / ring; y = b.y + Math.sin(a0 + Math.PI / 6) * d + (Math.sin(a1 + Math.PI / 6) * d - Math.sin(a0 + Math.PI / 6) * d) * s / ring; }
          const r = cs * ease(grow) * (1 + .1 * loud); hex(x, y, r); g.fillStyle = hsl(b.h + ring * 12, 85, 55, .5 * k("fill") * fade); g.fill(); g.lineWidth = 1.4; g.strokeStyle = hsl(b.h + ring * 12, 95, 72, .9 * fade); g.stroke(); } } }); } };

/* ---- Möbius: a twisted band rotating through itself ---- */
const MOBIUS = { key: "mobius", name: "Möbius", fade: .45, init: () => ({ a: 0 }),
  shape: [{ key: "width", label: "Band width", def: .4 }, { key: "speed", label: "Speed", def: .4 }, { key: "rungs", label: "Rungs", def: .5 }, { key: "tilt", label: "Tilt", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, loud = tLoud(R); st.a += dt * L("speed", .2, 1.5) * (.5 + loud + .5 * R.kick); const Rr = S * .24 * (1 + .05 * R.bass), w = S * L("width", .03, .12), tilt = L("tilt", .2, 1.1), N = 120, rails = [[], []], rung = [];
    for (let i = 0; i <= N; i++) { const u = i / N * TAU, tw = u / 2 + st.a; for (let s = 0; s < 2; s++) { const off = (s ? 1 : -1) * w, x = Math.cos(u) * (Rr + off * Math.cos(tw)), yy = off * Math.sin(tw), z = Math.sin(u) * (Rr + off * Math.cos(tw)), y = yy * Math.cos(tilt) - z * Math.sin(tilt), zz = yy * Math.sin(tilt) + z * Math.cos(tilt); rails[s].push([n.x + x, n.y + y, .5 + .5 * zz / Rr]); } if (i % Math.round(lerp(12, 3, k("rungs"))) === 0) rung.push(i); }
    g.lineCap = "round"; rung.forEach(i => { const a = rails[0][i], b = rails[1][i], d = (a[2] + b[2]) / 2; g.lineWidth = 1 + d; g.strokeStyle = hsl(n.hue + 30, 80, 65, .15 + .5 * d); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    rails.forEach((pts, s) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], d = (p[2] + q[2]) / 2; g.lineWidth = S * .005 * (.4 + d); g.strokeStyle = hsl(n.hue + s * 25, 95, 55 + 25 * d, .3 + .7 * d); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }); } };

/* ---- Hands: a pair of outlined hands that clap, snap and frame on the beat ---- */
function handPath(g, x, y, s, flip, spread, curl) { // a simple outlined hand: palm plus five fingers, fingers fan with spread and bend with curl
  g.save(); g.translate(x, y); g.scale(flip, 1); g.beginPath(); g.ellipse(0, 0, s * .32, s * .42, 0, 0, TAU); g.stroke();
  for (let f = 0; f < 5; f++) { const base = f === 0 ? [-s * .34, s * .05] : [-s * .26 + (f - 1) * s * .17, -s * .4], len = f === 0 ? s * .36 : s * (.42 + .1 * Math.sin(f * 1.1)), a = (f === 0 ? -1.3 : -Math.PI / 2 + (f - 2.5) * .12 * spread) + curl * .5 * (f ? 1 : .6), mid = [base[0] + Math.cos(a) * len * .5, base[1] + Math.sin(a) * len * .5], tip = [mid[0] + Math.cos(a + curl * .9) * len * .5, mid[1] + Math.sin(a + curl * .9) * len * .5];
    g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(mid[0], mid[1]); g.lineTo(tip[0], tip[1]); g.stroke(); g.beginPath(); g.arc(tip[0], tip[1], s * .035, 0, TAU); g.fill(); }
  g.restore(); }
const HANDS = { key: "hands", name: "Hands", fade: .45, init: () => ({ u: 0, move: 0, mt: 0 }),
  shape: [{ key: "move", label: "Move", min: 0, max: 3, def: 0, fmt: i => ["Mix it up", "Clap", "Snap", "Frame"][i] }, { key: "size", label: "Size", def: .5 }, { key: "snap", label: "Snappiness", def: .6 }, { key: "glow", label: "Glow", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, I, k } = E, loud = tLoud(R), pick = I("move"); st.mt -= dt; if (pick === 0 && st.mt <= 0) { st.move = 1 + Math.floor(Math.random() * 3); st.mt = 4 + Math.random() * 6; } const mv = pick || st.move || 1;
    if (E.beat) st.u = 1; st.u *= Math.exp(-dt * L("snap", 3, 12)); const u = ease(st.u), s = S * L("size", .18, .36), gap = s * .9;
    g.lineCap = g.lineJoin = "round"; g.lineWidth = S * .006; g.strokeStyle = hsl(n.hue, 95, 72, .95); g.fillStyle = hsl(n.hue + 30, 90, 80, .9);
    if (mv === 1) { const d = gap * (1.1 - u); handPath(g, n.x - d, n.y, s, 1, .6, .2 * (1 - u)); handPath(g, n.x + d, n.y, s, -1, .6, .2 * (1 - u)); if (u > .6) sprite(g, n.hue, n.x, n.y - s * .1, s * (.6 + .8 * u) * k("glow"), .7 * u); }
    else if (mv === 2) { handPath(g, n.x, n.y, s * 1.2, 1, .8 - .5 * u, .1 + .9 * (1 - u)); if (u > .5) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + E.t, r = s * (.35 + .4 * u); g.beginPath(); g.moveTo(n.x + Math.cos(a) * r * .6, n.y - s * .3 + Math.sin(a) * r * .6); g.lineTo(n.x + Math.cos(a) * r, n.y - s * .3 + Math.sin(a) * r); g.stroke(); } sprite(g, n.hue, n.x, n.y - s * .3, s * .8 * k("glow"), .6 * u); } }
    else { const d = gap * (1.2 + .3 * loud); handPath(g, n.x - d, n.y - s * .3, s, 1, .2, .8); handPath(g, n.x + d, n.y + s * .3, s, -1, .2, .8); g.lineWidth = S * .003; g.strokeStyle = hsl(n.hue + 40, 80, 70, .5 + .4 * u); g.strokeRect(n.x - d * .55, n.y - s * .45, d * 1.1, s * .9); sprite(g, n.hue + 40, n.x, n.y, s * .7 * k("glow"), .3 + .4 * loud); } } };

/* ---- Silhouette walk: a figure crossing the stage in a loop, pace to tempo ---- */
const WALK = { key: "walk", name: "Silhouette walk", fade: .45, init: () => ({ x: -.1, ph: 0, dir: 1 }),
  shape: [{ key: "size", label: "Size", def: .5 }, { key: "pace", label: "Pace", def: .5 }, { key: "swing", label: "Arm swing", def: .6 }, { key: "shadow", label: "Ground shadow", def: .5 }, { key: "both", label: "Walks back too", min: 0, max: 1, def: 1, fmt: i => ["Loops one way", "Walks back"][i] }],
  draw(E) { const { g, n, R, S, st, dt, W, L, I, k } = E, loud = tLoud(R), h = S * L("size", .3, .6), sp = L("pace", .5, 2) * (.5 + .5 * E.p.tempo + loud * .5); st.ph += dt * sp * 5; st.x += st.dir * dt * sp * .12;
    if (st.x > 1.12) { if (I("both")) { st.dir = -1; } else st.x = -.12; } if (st.x < -.12) st.dir = 1; const x = st.x * W, y = n.y + h * .5, step = Math.sin(st.ph), lift = Math.max(0, Math.cos(st.ph)) * h * .04;
    const J = (dx, dy) => [x + dx * st.dir, y + dy]; g.lineCap = g.lineJoin = "round"; g.lineWidth = S * .018; g.strokeStyle = hsl(n.hue, 95, 70, .95);
    const hip = J(0, -h * .45 - lift), sh = J(0, -h * .78 - lift), head = J(0, -h * .92 - lift); // legs
    [[1, 0], [-1, Math.PI]].forEach(([sg, off]) => { const sw = Math.sin(st.ph + off), kneeX = hip[0] + st.dir * sw * h * .14, kneeY = hip[1] + h * .22, footX = kneeX + st.dir * sw * h * .1, footY = y - Math.max(0, Math.cos(st.ph + off)) * h * .06; g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(kneeX, kneeY); g.lineTo(footX, footY); g.stroke();
      const aw = -Math.sin(st.ph + off) * k("swing"), elX = sh[0] + st.dir * aw * h * .12, elY = sh[1] + h * .17, hdX = elX + st.dir * aw * h * .1, hdY = elY + h * .14; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(elX, elY); g.lineTo(hdX, hdY); g.stroke(); });
    g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(sh[0], sh[1]); g.stroke(); g.fillStyle = hsl(n.hue, 95, 70, .95); g.beginPath(); g.arc(head[0], head[1], h * .06, 0, TAU); g.fill();
    if (k("shadow") > .05) { g.fillStyle = hsl(n.hue, 60, 40, .3 * k("shadow")); g.beginPath(); g.ellipse(x, y + h * .02, h * .18, h * .035, 0, 0, TAU); g.fill(); } sprite(g, n.hue, head[0], head[1], h * .14, .4 + .3 * R.kick); } };

/* ---- Marionette: a jointed figure jerked by strings on hits (rework Oct 21: a face, long flowing hair, a floppier head) ---- */
const MARIO = { key: "marionette", name: "Marionette", fade: .45, init: () => ({ j: null, hair: null }),
  shape: [{ key: "size", label: "Size", def: .5 }, { key: "jerk", label: "Jerk", def: .7 }, { key: "sag", label: "Sag", def: .5 }, { key: "floppy", label: "Floppy head", def: .7 }, { key: "hair", label: "Hair length", def: .7 }, { key: "strings", label: "Strings", def: .6 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, h = S * L("size", .3, .6), top = n.y - h * .55, names = ["head", "lh", "rh", "lf", "rf"], rest = { head: [0, -h * .9], lh: [-h * .3, -h * .5], rh: [h * .3, -h * .5], lf: [-h * .12, 0], rf: [h * .12, 0] };
    if (!st.j) { st.j = {}; names.forEach(nm => { st.j[nm] = { x: rest[nm][0], y: rest[nm][1], vx: 0, vy: 0 }; }); }
    const sag = L("sag", .02, .2) * h, flop = k("floppy"); names.forEach((nm, i) => { const j = st.j[nm], tx = rest[nm][0], ty = rest[nm][1] + (nm === "head" ? sag * .3 : sag), stiff = nm === "head" ? lerp(30, 7, flop) : 30, damp = nm === "head" ? lerp(4, 1.6, flop) : 4;
      if (E.beat) { j.vy -= h * (3 + 5 * k("jerk")) * (i === 0 ? .7 : Math.random()); j.vx += (Math.random() - .5) * h * (i === 0 ? 6 : 4) * k("jerk"); }
      j.vx += (tx - j.x) * stiff * dt; j.vy += (ty - j.y) * stiff * dt + h * 2 * dt; j.vx *= Math.exp(-damp * dt); j.vy *= Math.exp(-damp * dt); j.x += j.vx * dt; j.y += j.vy * dt; });
    const P = nm => [n.x + st.j[nm].x, n.y + h * .45 + st.j[nm].y], head = P("head"), lh = P("lh"), rh = P("rh"), lf = P("lf"), rf = P("rf"), hip = [n.x + (lf[0] + rf[0] - 2 * n.x) * .3, n.y + h * .45 - h * .4 + sag * .5], sh = [n.x + (head[0] - n.x) * .35, n.y + h * .45 - h * .72 + sag * .4];
    // the head hangs off the neck: its tilt follows where it has swung to
    const tilt = Math.atan2(head[0] - sh[0], -(head[1] - sh[1])) * .9, hr = h * .075;
    if (k("strings") > .05) { g.lineWidth = 1; g.strokeStyle = `rgba(255,255,255,${.35 * k("strings")})`; [head, lh, rh, lf, rf].forEach(([x, y], i) => { g.beginPath(); g.moveTo(n.x + (i === 0 ? 0 : [-h * .3, h * .3, -h * .12, h * .12][i - 1]), top); g.lineTo(x, y); g.stroke(); }); g.lineWidth = S * .008; g.strokeStyle = hsl(n.hue + 40, 60, 60, .6); g.beginPath(); g.moveTo(n.x - h * .35, top); g.lineTo(n.x + h * .35, top); g.stroke(); }
    g.lineCap = g.lineJoin = "round"; g.lineWidth = S * .016; g.strokeStyle = hsl(n.hue, 95, 70, .95); const seg = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    seg(sh, hip); seg(sh, lh); seg(sh, rh); seg(hip, lf); seg(hip, rf); [lh, rh, lf, rf].forEach(([x, y]) => { g.fillStyle = hsl(n.hue, 95, 70, .95); g.beginPath(); g.arc(x, y, h * .03, 0, TAU); g.fill(); });
    // hair: strands rooted around the crown, each a short chain that trails the head's motion
    const hl = L("hair", .1, .7) * h, HN = 14; if (!st.hair || st.hair.length !== HN) st.hair = Array.from({ length: HN }, (_, i) => ({ a: -Math.PI * .95 + i / (HN - 1) * Math.PI * .9, seg: Array.from({ length: 9 }, () => [head[0], head[1]]), ph: Math.random() * 7 }));
    st.hair.forEach((hs, i) => { const ra = hs.a + tilt, rx = head[0] + Math.cos(ra) * hr * .95, ry = head[1] + Math.sin(ra) * hr * .95; hs.seg[0] = [rx, ry]; const len = hl / 8 * (.6 + .4 * Math.abs(Math.cos(hs.a)));
      for (let j = 1; j < hs.seg.length; j++) { const p = hs.seg[j], q = hs.seg[j - 1], tx = q[0] + Math.sin(E.t * 2.2 + hs.ph + j * .6) * h * .012 * (1 + 2 * R.kick) + (st.j.head.vx * dt * -.3), ty = q[1] + len; p[0] = lerp(p[0], tx, dt * (22 - j * 1.5)); p[1] = lerp(p[1], ty, dt * (22 - j * 1.5)); const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1; if (d > len * 1.25) { p[0] = q[0] + dx / d * len * 1.25; p[1] = q[1] + dy / d * len * 1.25; } }
      g.lineWidth = S * .005; g.strokeStyle = hsl(n.hue + 25, 85, 68, .75); strokePath(g, hs.seg); });
    // the face: an oval with a jaw, two eyes and a small mouth, tilted with the head
    g.save(); g.translate(head[0], head[1]); g.rotate(tilt); g.lineWidth = S * .007; g.strokeStyle = hsl(n.hue, 95, 72, .95); g.fillStyle = hsl(n.hue, 60, 14, .85);
    g.beginPath(); g.moveTo(-hr, -hr * .3); g.bezierCurveTo(-hr * 1.05, -hr * 1.3, hr * 1.05, -hr * 1.3, hr, -hr * .3); g.bezierCurveTo(hr * .95, hr * .5, hr * .45, hr * 1.25, 0, hr * 1.3); g.bezierCurveTo(-hr * .45, hr * 1.25, -hr * .95, hr * .5, -hr, -hr * .3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = hsl(n.hue + 60, 90, 80, .95); [-1, 1].forEach(sx => { g.beginPath(); g.ellipse(sx * hr * .38, -hr * .15, hr * .13, hr * .18, 0, 0, TAU); g.fill(); }); g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + 60, 90, 80, .9); g.beginPath(); g.arc(0, hr * .55, hr * .3, .2, Math.PI - .2); g.stroke();
    g.restore(); sprite(g, n.hue, head[0], head[1], hr * 2.2, .35 + .4 * R.kick); } };

/* ---- Marquee: words sliding across in a theater-sign loop ---- */
const MARQUEE = { key: "marquee", name: "Marquee", fade: .5, init: () => ({ x: 0 }),
  shape: [{ key: "words", label: "Words", text: true, def: "GLINT · TONIGHT · ONE NIGHT ONLY · " }, { key: "size", label: "Letter size", def: .5 }, { key: "speed", label: "Speed", def: .4 }, { key: "bulbs", label: "Bulbs", def: .6 }, { key: "chase", label: "Chase speed", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, t, W, L, k } = E, loud = tLoud(R), words = String(k("words") || "GLINT"), fs = S * L("size", .06, .16); st.x -= dt * S * L("speed", .1, .6) * (.6 + loud);
    g.font = `500 ${Math.round(fs)}px Jost, "Avenir Next", system-ui, sans-serif`; g.textBaseline = "middle"; const tw = g.measureText(words).width + fs; if (st.x < -tw) st.x += tw;
    const y = n.y, bw = fs * 1.6; if (k("bulbs") > .05) { const nb = Math.ceil(W / (fs * .5)) + 2, on = Math.floor(t * L("chase", 2, 12)); for (let i = 0; i < nb; i++) for (const yy of [y - bw * .55, y + bw * .55]) { const lit = (i + on) % 3 === 0, x = i * fs * .5; g.fillStyle = hsl(n.hue + 40, 90, lit ? 80 : 35, (lit ? .95 : .4) * k("bulbs")); g.beginPath(); g.arc(x, yy, fs * .08, 0, TAU); g.fill(); if (lit) sprite(g, n.hue + 40, x, yy, fs * .3, .5 * k("bulbs")); } }
    for (let x = st.x; x < W; x += tw) { g.lineWidth = fs * .1; g.strokeStyle = hsl(n.hue, 95, 55, .25); g.strokeText(words, x, y); g.fillStyle = hsl(n.hue, 95, 78, .95); g.fillText(words, x, y); }
    g.lineWidth = S * .003; g.strokeStyle = hsl(n.hue, 60, 60, .5); g.beginPath(); g.moveTo(0, y - bw * .7); g.lineTo(W, y - bw * .7); g.moveTo(0, y + bw * .7); g.lineTo(W, y + bw * .7); g.stroke(); } };

/* ---- Stamp: a word slammed onto the screen on big hits, fading ---- */
const STAMP = { key: "stamp", name: "Stamp", fade: .35, init: () => ({ st: [], i: 0 }),
  shape: [{ key: "words", label: "Words (one per line)", text: true, def: "BOOM\nYES\nWORK\nLOUDER" }, { key: "size", label: "Size", def: .6 }, { key: "on", label: "Stamp on", min: 0, max: 1, def: 0, fmt: i => ["Loud hits", "Every kick"][i] }, { key: "tilt", label: "Tilt", def: .5 }, { key: "hold", label: "Hold", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, t, W, H, L, I, k } = E, loud = tLoud(R), words = String(k("words") || "BOOM").split(/\n+/).map(w => w.trim()).filter(Boolean);
    if (E.beat && (I("on") === 1 || loud > .55) && words.length) { st.st.push({ w: words[st.i++ % words.length], x: n.x + (Math.random() - .5) * W * .4, y: n.y + (Math.random() - .5) * H * .4, a: (Math.random() - .5) * .5 * k("tilt"), t: 0, h: n.hue + (Math.random() - .5) * 50 }); if (st.st.length > 5) st.st.shift(); }
    st.st.forEach(s => { s.t += dt; const life = L("hold", .6, 2.5), f = clamp(1 - (s.t - life * .6) / (life * .4), 0, 1), slam = 1 + Math.max(0, .5 - s.t * 4), fs = S * L("size", .1, .3) * slam; if (f <= 0) return;
      g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.font = `700 ${Math.round(fs)}px Jost, "Avenir Next", system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = fs * .12; g.strokeStyle = hsl(s.h, 95, 55, .35 * f); g.strokeText(s.w, 0, 0); g.fillStyle = hsl(s.h, 95, 80, .95 * f); g.fillText(s.w, 0, 0);
      g.lineWidth = fs * .06; g.strokeStyle = hsl(s.h, 90, 70, .7 * f); const tw2 = g.measureText(s.w).width; g.strokeRect(-tw2 / 2 - fs * .2, -fs * .62, tw2 + fs * .4, fs * 1.24); g.restore(); });
    st.st = st.st.filter(s => s.t < L("hold", .6, 2.5)); } };

/* ---- Jack-o'-lantern (Oct 21, 2026; Kennedy picked directions 1 + 3): a carved face whose holes each hold a smaller lit
   jack-o'-lantern, zooming forever into one of them (Droste), with a flickering candle throwing beams out through the carvings
   and flame tongues licking out of the mouth on hits. Geometry lives in unit space (pumpkin radius 1); the zoom is the complex
   map p -> q + a^-z (p - q), where a = r·e^(iθ) is the child placement and q its fixed point, so each loop lands exactly on the next level. */
function jackHoles(teeth, menace) {
  const m = menace, eyeL = [[-.7, -.44 + .1 * m], [-.13, -.16 + .1 * m], [-.48, -.02]].map(p => [p[0], p[1] - .02]), eyeR = eyeL.map(p => [-p[0], p[1]]).reverse(),
    nose = [[0, -.02], [-.1, .17], [.1, .17]], mouth = [], N = teeth, x0 = -.76, x1 = .76, top = x => .3 - .2 * x * x - .08 * m * (1 - x * x), bot = x => .4 + .26 * (1 - x * x / .6);
  for (let i = 0; i <= N * 2; i++) { const x = lerp(x0, x1, i / (N * 2)); mouth.push([x, top(x) + (i % 2 && i > 0 && i < N * 2 ? .13 + .04 * m : 0)]); }
  for (let i = N * 2 - 1; i >= 1; i--) { const x = lerp(x0 + .08, x1 - .08, i / (N * 2)); mouth.push([x, Math.max(top(x) + .05, bot(x) - (i % 2 ? 0 : .12 + .04 * m))]); }
  // anchor each child at the carving's roomiest point (largest inscribed circle, found on a grid), not its centroid, which can land on a tooth
  const inside = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; },
    edge = (pts, x, y) => { let r = 9; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, u = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1); r = Math.min(r, Math.hypot(x - ax - u * dx, y - ay - u * dy)); } return r; };
  return [eyeL, eyeR, nose, mouth].map(pts => { let x0 = 9, x1 = -9, y0 = 9, y1 = -9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    let best = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: 0 }; for (let i = 1; i < 28; i++) for (let j = 1; j < 18; j++) { const x = lerp(x0, x1, i / 28), y = lerp(y0, y1, j / 18); if (!inside(pts, x, y)) continue; const r = edge(pts, x, y) - Math.abs(x) * .02; if (r > best.r) best = { cx: x, cy: y, r }; }
    return { pts, cx: best.cx, cy: best.cy, r: Math.max(.02, best.r) }; });
}
const JACK = { key: "jack", name: "Jack-o'-lantern", fade: .75, init: () => ({ z: 0, turn: 0, fl: [], sw: 0 }),
  shape: [{ key: "size", label: "Size", def: 0.94, grp: "Face" }, { key: "teeth", label: "Teeth", min: 2, max: 9, def: 0.428571, slide: true, fmt: i => String(i), grp: "Face" }, { key: "menace", label: "Menace", def: 1, grp: "Face" }, { key: "ribs", label: "Ribs", def: 0.69, grp: "Face" },
    { key: "depth", label: "Depth", min: 1, max: 5, def: 1, slide: true, fmt: i => String(i), grp: "Inside the carvings" }, { key: "next", label: "Next zoom", min: 0, max: 2, def: 0, fmt: i => ["In order", "Random", "Same hole"][i], grp: "Inside the carvings" }, { key: "order", label: "Order", min: 0, max: 3, def: 0, fmt: i => ["Left eye → right eye → nose", "Right eye → left eye → nose", "Nose → left eye → right eye", "Nose → right eye → left eye"][i], grp: "Inside the carvings", when: pick => pick("next") === 0 }, { key: "hole", label: "Hole", min: 0, max: 2, def: .5, fmt: i => ["Left eye", "Right eye", "Nose"][i], grp: "Inside the carvings", when: pick => pick("next") === 2 }, { key: "zoom", label: "Zoom speed", def: 0.51, grp: "Inside the carvings" }, { key: "kickzoom", label: "Zoom on kicks", def: 0.67, grp: "Inside the carvings" }, { key: "twist", label: "Twist", def: 0.96, grp: "Inside the carvings" }, { key: "fill", label: "Inner pumpkin size", def: 0.06, grp: "Inside the carvings" },
    { key: "mflames", label: "Flames", min: 0, max: 9, def: .556, slide: true, fmt: i => i ? String(i) : "None", grp: "Mouth flames" }, { key: "mheight", label: "Flame height", def: .5, grp: "Mouth flames" }, { key: "mflick", label: "Flame flicker", def: .6, grp: "Mouth flames" }, { key: "mwidth", label: "Flame width", def: .5, grp: "Mouth flames" }, { key: "flicker", label: "Flicker", def: 1, grp: "Candle" }, { key: "beams", label: "Beam length", def: 0.91, grp: "Candle" }, { key: "sweep", label: "Beam sweep", def: 0.3, grp: "Candle" }, { key: "flame", label: "Flame", def: 0.25, grp: "Candle" }, { key: "warm", label: "Candle color shift", def: .1, grp: "Candle" }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E; st.z ??= 0; st.turn ??= 0; st.fl ??= []; const hk = I("teeth") + "/" + k("menace").toFixed(3); if (st.hk !== hk) { st.hk = hk; st.holes = jackHoles(I("teeth"), k("menace")); } const holes = st.holes, depth = I("depth"), every = true, nx = I("next"), loud = tLoud(R), hue = n.hue, chue = hue + k("warm") * 120 - 10;
    const flick = lerp(1, .55 + .25 * Math.sin(t * 13.1) + .15 * Math.sin(t * 29.7 + 1) + .1 * Math.sin(t * 5.3) + .25 * R.kick, k("flicker")), unit = S * L("size", .1, .3) * (1 + .06 * R.kick);
    // Droste zoom: which hole we fly into, and its child map a = r·e^(iθ), placed at the hole's center
    // each level of pumpkin has its own next hole: level i is the one we'll be flying into i loops from now, so when a loop ends
    // the pumpkin that becomes the big one already has its little one in the right carving (no jump halfway through)
    st.z += dt * L("zoom", 0, .45) * (1 + 3 * k("kickzoom") * R.kick + loud); if (st.z >= 1) { st.z -= 1; st.turn++; if (st.q) st.q.shift(); }
    const ORD = [[0, 1, 2], [1, 0, 2], [2, 0, 1], [2, 1, 0]][I("order")], ord = every ? ORD.filter(h => h !== 3) : ORD, hs = I("hole");
    st.q ??= []; while (st.q.length < 8) { const last = st.q.length ? st.q[st.q.length - 1] : -1; let r = last; while (r === last) r = Math.floor(Math.random() * 3); st.q.push(r); }
    const tgt = i => { if (nx === 0) return ord[(st.turn + i) % ord.length]; const v = nx === 1 ? st.q[Math.min(i, 7)] : hs; return every && v === 3 ? 2 : v; };
    const ti = tgt(0), th = holes[ti], ang = (k("twist") - .5) * 1.4, CH = L("fill", .9, 1.8), ar = th.r * CH;
    const z = st.z, A = [ar * Math.cos(ang), ar * Math.sin(ang)], cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]], om = [1 - A[0], -A[1]], d2 = om[0] * om[0] + om[1] * om[1],
      Q = cm([th.cx, th.cy], [om[0] / d2, -om[1] / d2]), wm = Math.pow(ar, -z), W = [wm * Math.cos(-ang * z), wm * Math.sin(-ang * z)], WQ = cm(W, Q);
    const sweep = Math.sin(t * .7) * .25 * k("sweep") + Math.sin(t * 1.9) * .08 * k("sweep"), cand = [sweep, .18 + .03 * Math.sin(t * 7)];
    const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
    const ribsN = Math.round(lerp(3, 9, k("ribs")));
    function level(i, sc, alpha, hot) { if (sc < 3) return; /* a faded parent still draws its children */ const lw = 1 / sc;
      // pumpkin body: a lobed outline, inner rib arcs, a stem
      const out = []; for (let q = 0; q <= 120; q++) { const a = q / 120 * TAU, lobe = 1 - .07 * (1 - Math.abs(Math.cos(a * ribsN / 2))), wob = 1 + .03 * R.bass * Math.sin(a * 3 + t * 2 + i); out.push([Math.cos(a) * 1.15 * lobe * wob, Math.sin(a) * .95 * lobe * wob]); }
      g.lineJoin = g.lineCap = "round";
      g.lineWidth = 9 * lw; g.strokeStyle = hsl(hue, 95, 50, .18 * alpha); path(out); g.stroke(); g.lineWidth = 2.6 * lw; g.strokeStyle = hsl(hue, 100, 62, .95 * alpha); path(out); g.stroke();
      // ribs: tapered grooves that bow out from the stem and meet again underneath, each a soft shadow band with a rim of light along its outer edge
      const half = Math.max(1, Math.floor(ribsN / 2)); for (let j = 1; j <= half; j++) { const xr = 1.12 * j / (half + .6), wj = .05 * (1 - .35 * j / half);
        [-1, 1].forEach(sd => { const P = (t, o) => { const sn = Math.pow(Math.sin(Math.PI * t), .75), x = sd * (xr * sn + o * wj * Math.sin(Math.PI * t)), y = -.84 + 1.7 * t + .04 * Math.sin(Math.PI * t) * (j / half); return [x, y]; };
          g.beginPath(); for (let q = 0; q <= 24; q++) { const [x, y] = P(q / 24, -1); q ? g.lineTo(x, y) : g.moveTo(x, y); } for (let q = 24; q >= 0; q--) { const [x, y] = P(q / 24, 1); g.lineTo(x, y); } g.closePath(); g.fillStyle = hsl(hue, 95, 45, .16 * alpha); g.fill();
          g.lineWidth = 1.8 * lw; g.strokeStyle = hsl(hue, 100, 64, .7 * alpha); g.beginPath(); for (let q = 1; q <= 23; q++) { const [x, y] = P(q / 24, 1); q > 1 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
          g.lineWidth = 1 * lw; g.strokeStyle = hsl(hue, 90, 50, .3 * alpha); g.beginPath(); for (let q = 2; q <= 22; q++) { const [x, y] = P(q / 24, -1); q > 2 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }); }
      g.lineWidth = 3 * lw; g.strokeStyle = hsl(hue + 70, 70, 50, .85 * alpha); g.beginPath(); g.moveTo(-.06, -.9); g.quadraticCurveTo(-.02, -1.12, .14, -1.2); g.moveTo(.06, -.9); g.quadraticCurveTo(.08, -1.06, .18, -1.12); g.stroke();
      // beams through the carvings, only from the pumpkin that fills the screen
      if (hot && k("beams") > .02) { const len = L("beams", .4, 4); g.save(); g.globalCompositeOperation = "lighter"; holes.forEach(h => { const ps = h.pts, far = ps.map(p => [p[0] + (p[0] - cand[0]) * len, p[1] + (p[1] - cand[1]) * len]);
          for (let e = 0; e < ps.length; e++) { const a1 = ps[e], a2 = ps[(e + 1) % ps.length], b2 = far[(e + 1) % ps.length], b1 = far[e], gr = g.createLinearGradient(h.cx, h.cy, h.cx + (h.cx - cand[0]) * len, h.cy + (h.cy - cand[1]) * len);
            gr.addColorStop(0, hsl(chue + 15, 100, 62, .16 * flick * alpha)); gr.addColorStop(1, hsl(chue, 100, 50, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.lineTo(b1[0], b1[1]); g.closePath(); g.fill(); } }); g.restore(); }
      // each carving: candlelight inside, a smaller lit pumpkin inside that, and so on
      holes.forEach((h, hi) => { g.save(); path(h.pts); g.clip(); const fa = alpha * alpha;
        const gr = g.createRadialGradient(cand[0], cand[1], 0, cand[0], cand[1], 1.1); gr.addColorStop(0, hsl(chue + 20, 100, 66, .5 * flick * fa)); gr.addColorStop(.6, hsl(chue, 100, 48, .22 * flick * fa)); gr.addColorStop(1, hsl(chue - 10, 100, 35, .08 * fa)); g.fillStyle = gr; g.fillRect(-1.3, -1.3, 2.6, 2.6);
        // a row of little candle flames standing behind the grin, peeking through between the teeth
        if (hi === 3 && I("mflames") > 0) { const nf = I("mflames"); let x0 = 9, x1 = -9, yb = -9; h.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); yb = Math.max(yb, y); });
          const fh = L("mheight", .08, .34), fw = fh * L("mwidth", .25, .6), fk = k("mflick"); g.save(); g.globalCompositeOperation = "lighter";
          for (let f = 0; f < nf; f++) { const u = nf === 1 ? .5 : f / (nf - 1), x = lerp(x0 + .14, x1 - .14, u), base = yb - .02 - .06 * (1 - Math.pow(2 * u - 1, 2)), ph = f * 2.39 + i * 1.7,
              hh = fh * (1 + fk * (.18 * Math.sin(t * 9 + ph) + .12 * Math.sin(t * 23 + ph * 2)) + .35 * R.kick), sx = fk * fw * (.6 * Math.sin(t * 6.3 + ph) + .3 * Math.sin(t * 15 + ph)), w = fw * (1 + .1 * fk * Math.sin(t * 11 + ph));
            const shape = (sc2, al, c) => { const H2 = hh * sc2, W2 = w * sc2, tx = x + sx * sc2, ty = base - H2; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(x + W2, base - H2 * .35, x + W2 * .55, base - H2 * .04); g.quadraticCurveTo(x, base + H2 * .1, x - W2 * .55, base - H2 * .04); g.quadraticCurveTo(x - W2, base - H2 * .35, tx, ty); g.closePath();
              const gg = g.createRadialGradient(x, base - H2 * .3, 0, x, base - H2 * .3, H2 * .8); gg.addColorStop(0, c(al)); gg.addColorStop(1, hsl(chue, 100, 45, 0)); g.fillStyle = gg; g.fill(); };
            shape(1.6, .25 * alpha, a2 => hsl(chue + 5, 100, 55, a2)); shape(1, .85 * alpha, a2 => hsl(chue + 15, 100, 60, a2)); shape(.5, .95 * alpha, a2 => hsl(chue + 45, 100, 85, a2)); }
          g.restore(); }
        g.restore();
        // the child pumpkin overfills its carving and is clipped to it; as the screen-filling parent fades out, that clip widens so the child arrives whole
        const tg = tgt(i), deep = hi === tg ? i < depth : every && hi !== 3 && i < Math.min(depth, 2);
        if (deep) { const grow = hot && hi === tg ? 1 + 3 * (1 - alpha) : 1, ca = [h.r * CH * Math.cos(ang), h.r * CH * Math.sin(ang)]; g.save(); path(h.pts.map(p => [h.cx + (p[0] - h.cx) * grow, h.cy + (p[1] - h.cy) * grow])); g.clip();
          g.transform(ca[0], ca[1], -ca[1], ca[0], h.cx, h.cy); level(i + 1, sc * Math.hypot(ca[0], ca[1]), 1, false); g.restore(); }
        g.lineWidth = 2 * lw; g.strokeStyle = hsl(chue + 25, 100, 72, .9 * alpha); path(h.pts); g.stroke(); });
      // flame tongues licking out of the mouth on hits
      if (hot) st.fl.forEach(f => { const a = Math.sin(clamp(f.life, 0, 1) * Math.PI), m = holes[3].pts, p = m[f.at % m.length]; g.lineWidth = 3 * lw * a; g.strokeStyle = hsl(chue + 30 * (1 - f.life), 100, 65, .9 * a); g.beginPath(); g.moveTo(p[0], p[1]);
        for (let q = 1; q <= 12; q++) { const u = q / 12, y = p[1] - u * f.h * (1.2 - f.life), x = p[0] + Math.sin(u * 7 + t * 9 + f.ph) * .06 * u + f.dx * u; g.lineTo(x, y); } g.stroke(); });
    }
    if (E.beat && Math.random() < k("flame")) for (let q = 0; q < 1 + Math.round(3 * k("flame") * (loud + R.kick)); q++) st.fl.push({ at: Math.floor(Math.random() * 40), h: .3 + .6 * Math.random() * (.5 + loud), dx: (Math.random() - .5) * .3, ph: Math.random() * 9, life: 1 });
    st.fl = st.fl.filter(f => (f.life -= dt * 1.4) > 0);
    g.save(); g.translate(n.x, n.y); g.scale(unit, unit); g.transform(W[0], W[1], -W[1], W[0], Q[0] - WQ[0], Q[1] - WQ[1]);
    const zf = Math.min(.6, Math.log(2) / -Math.log(ar)), a0 = z < zf ? 1 : Math.pow(1 - (z - zf) / (1 - zf), 1.5); level(0, unit * wm, a0, true);
    g.restore(); sprite(g, chue, n.x, n.y + unit * .2, unit * 1.6, .18 * flick); } };

NEW_TRAITS.push(
  { form: JACK, char: "anchored", hue: 28, hy: .5, p: { chaos: .27, energy: .92, grace: 1, magnetism: 0, roam: 0, size: .25, social: .3, tempo: .45, trails: .93 }, desc: "A carved, menacing jack-o'-lantern. Every carving holds a smaller lit one, and the view zooms forever into one of them while the candle throws beams through the holes and flames lick out of the grin on hits." },
  { form: MURMUR, char: "anchored", hue: 200, hy: .5, p: { roam: .02, size: .6, trails: .45 }, desc: "A few hundred birds flocking as one body, steering toward a wandering target. Hits can send the whole flock turning." },
  { form: EMBERS, char: "anchored", hue: 25, hy: .5, p: { roam: .02, size: .6, trails: .4 }, desc: "Sparks rising from the bottom edge, twinkling and drifting on the wind. Hits throw a handful more into the air." },
  { form: CONFETTI, char: "anchored", hue: 320, hy: .5, p: { roam: .02, size: .6, trails: .4 }, desc: "Bursts of flat shapes tumbling on loud hits (or every kick, or a steady rain), in mixed colors." },
  { form: SEISMO, char: "anchored", hue: 120, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "A line scrolling across like a seismograph, spiking with loudness; extra pens for bass and highs." },
  { form: SPIRO2, char: "anchored", hue: 280, hy: .5, p: { roam: .02, size: .6, trails: .6 }, desc: "An epicycle curve drawing itself, whose wheels reshape with the bass and loudness." },
  { form: CONSTEL, char: "anchored", hue: 210, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "Stars drifting across the stage, linking when they come near; links pulse on hits." },
  { form: LISSA, char: "anchored", hue: 150, hy: .5, p: { roam: .02, size: .6, trails: .55 }, desc: "The oscilloscope figure. Pick the ratio; the phase drifts and the bass stretches the shape." },
  { form: GRID, char: "anchored", hue: 190, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "A lattice that bulges toward the center on bass, with optional perspective and lit crossings." },
  { form: TESSEL, char: "anchored", hue: 270, hy: .5, p: { roam: .02, size: .6, trails: .55 }, desc: "Tiles (triangles, squares or hexagons) that flip and recolor in waves rippling out from each kick." },
  { form: HEXB, char: "anchored", hue: 45, hy: .5, p: { roam: .02, size: .6, trails: .45 }, desc: "Hexagons growing outward ring by ring from a seed on each kick, then fading." },
  { form: MOBIUS, char: "anchored", hue: 300, hy: .5, p: { roam: .02, size: .6, trails: .45 }, desc: "A twisted band turning through itself, brighter on the near side, with rungs across it." },
  { form: HANDS, char: "anchored", hue: 340, hy: .5, p: { roam: .02, size: .6, trails: .45 }, desc: "A pair of outlined hands that clap, snap, or frame the shot on the beat. Mix it up switches moves every few seconds." },
  { form: WALK, char: "anchored", hue: 180, hy: .55, p: { roam: .02, size: .6, trails: .4 }, desc: "A stick figure walking across the stage and back, pace set by the tempo. (A placeholder body; the real one needs motion capture.)" },
  { form: MARIO, char: "anchored", hue: 60, hy: .5, p: { roam: .02, size: .6, trails: .4 }, desc: "A jointed figure on strings, yanked up on every hit and sagging back down. Rework: a face with a jaw and eyes, long flowing hair that trails the head, and a floppier neck (slider)." },
  { form: MARQUEE, char: "anchored", hue: 40, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "Your words sliding across between two rows of chasing bulbs, like a theater sign." },
  { form: STAMP, char: "anchored", hue: 0, hy: .5, p: { roam: .02, size: .6, trails: .35 }, desc: "A word slammed onto the screen on big hits, cycling through your list, then fading." }
);
NEW_TRAITS.forEach(r => { FORM[r.form.key] = r.form; });
