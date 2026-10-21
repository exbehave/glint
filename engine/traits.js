/* Traits kept from Casting (Oct 21, 2026). Same contract as every form. */
const tLoud = R => clamp(R.rms * 1.15, 0, 1);
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
// a point on a ring in 3D (radius r, angle a, height y) seen from the front with a little tilt; returns [sx, sy, depth 0..1]
function spin3(cx, cy, r, a, y, tilt, lean) { const x = Math.cos(a) * r, z = Math.sin(a) * r, ty = y * Math.cos(tilt) - z * Math.sin(tilt), tz = y * Math.sin(tilt) + z * Math.cos(tilt); return [cx + x + ty * Math.sin(lean), cy + ty * Math.cos(lean), .5 + .5 * tz / (r || 1)]; }

/* ---- Möbius: a twisted band rotating through itself ---- */
const MOBIUS = { key: "mobius", name: "Möbius", fade: .45, init: () => ({ a: 0 }),
  shape: [{ key: "width", label: "Band width", def: .4 }, { key: "speed", label: "Speed", def: .4 }, { key: "rungs", label: "Rungs", def: .5 }, { key: "tilt", label: "Tilt", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, loud = tLoud(R); st.a += dt * L("speed", .2, 1.5) * (.5 + loud + .5 * R.kick); const Rr = S * .24 * (1 + .05 * R.bass), w = S * L("width", .03, .12), tilt = L("tilt", .2, 1.1), N = 120, rails = [[], []], rung = [];
    for (let i = 0; i <= N; i++) { const u = i / N * TAU, tw = u / 2 + st.a; for (let s = 0; s < 2; s++) { const off = (s ? 1 : -1) * w, x = Math.cos(u) * (Rr + off * Math.cos(tw)), yy = off * Math.sin(tw), z = Math.sin(u) * (Rr + off * Math.cos(tw)), y = yy * Math.cos(tilt) - z * Math.sin(tilt), zz = yy * Math.sin(tilt) + z * Math.cos(tilt); rails[s].push([n.x + x, n.y + y, .5 + .5 * zz / Rr]); } if (i % Math.round(lerp(12, 3, k("rungs"))) === 0) rung.push(i); }
    g.lineCap = "round"; rung.forEach(i => { const a = rails[0][i], b = rails[1][i], d = (a[2] + b[2]) / 2; g.lineWidth = 1 + d; g.strokeStyle = hsl(n.hue + 30, 80, 65, .15 + .5 * d); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    rails.forEach((pts, s) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], d = (p[2] + q[2]) / 2; g.lineWidth = S * .005 * (.4 + d); g.strokeStyle = hsl(n.hue + s * 25, 95, 55 + 25 * d, .3 + .7 * d); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }); } };

/* ---- Breathing grid: a lattice that bulges toward the center on bass ---- */
const GRID = { key: "grid", name: "Breathing grid", fade: .5, init: () => ({ b: 0 }),
  shape: [{ key: "cells", label: "Cells", min: 6, max: 24, def: .4 }, { key: "bulge", label: "Bulge", def: .6 }, { key: "dots", label: "Dots at crossings", def: .5 }, { key: "persp", label: "Perspective", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R); st.b = lerp(st.b, R.bass * .8 + R.kick * .5, dt * 8); const N = I("cells"), amp = k("bulge") * (.15 + .6 * st.b), persp = k("persp");
    const P = (i, j) => { let u = i / N * 2 - 1, v = j / N * 2 - 1; const d = Math.hypot(u, v), f = 1 + amp * Math.exp(-d * d * 2); u *= f; v *= f; const z = 1 + persp * (v + 1) * .6; return [n.x + u * W * .45 / z, n.y + v * H * .42 / z * (1 - persp * .3)]; };
    g.lineCap = "round"; g.lineWidth = S * .003; for (let i = 0; i <= N; i++) { const col = [], row = []; for (let j = 0; j <= N; j++) { col.push(P(i, j)); row.push(P(j, i)); } g.strokeStyle = hsl(n.hue, 85, 65, .55 + .3 * st.b); strokePath(g, col); strokePath(g, row); }
    if (k("dots") > .05) for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const [x, y] = P(i, j), d = Math.hypot(i / N * 2 - 1, j / N * 2 - 1); g.fillStyle = hsl(n.hue + 30, 90, 80, (.3 + .7 * st.b * Math.exp(-d * d * 2)) * k("dots")); g.beginPath(); g.arc(x, y, S * .004 * (1 + st.b), 0, TAU); g.fill(); }
    sprite(g, n.hue, n.x, n.y, S * .15 * (1 + st.b), .12 + .2 * st.b); } };

/* ---- Gyroscope: three rings tumbling on three axes ---- */
const GYRO = { key: "gyro", name: "Gyroscope", fade: .35, init: () => ({ a: [0, 0, 0] }),
  shape: [{ key: "spin", label: "Spin", def: .5 }, { key: "wobble", label: "Wobble", def: .4 }, { key: "thick", label: "Ring thickness", def: .4 }, { key: "rings", label: "Rings", min: 2, max: 4, def: .5 }, { key: "core", label: "Core", min: 0, max: 4, def: 0, fmt: i => ["Glow", "Dot", "Ring", "Diamond", "Star"][i] }, { key: "coresize", label: "Core size", def: .4 }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), N = I("rings"), r = S * (.2 + .04 * R.bass), sp = L("spin", .3, 2.2) * (.5 + loud + R.kick);
    st.a[0] += dt * sp; st.a[1] += dt * sp * .63; st.a[2] += dt * sp * .41; const wob = L("wobble", 0, .6) * Math.sin(t * .7);
    const rings = []; for (let i = 0; i < N; i++) { const ax = st.a[i % 3] + wob * (i + 1), ay = st.a[(i + 1) % 3] * .5, pts = [];
      for (let j = 0; j <= 64; j++) { const u = j / 64 * TAU; let x = Math.cos(u) * r, y = Math.sin(u) * r, z = 0; // rotate about x then y
        let y2 = y * Math.cos(ax) - z * Math.sin(ax), z2 = y * Math.sin(ax) + z * Math.cos(ax); y = y2; z = z2; let x2 = x * Math.cos(ay) + z * Math.sin(ay); z2 = -x * Math.sin(ay) + z * Math.cos(ay); x = x2; z = z2;
        pts.push([n.x + x, n.y + y, .5 + .5 * z / r]); } rings.push({ pts, hue: n.hue + i * 35 }); }
    g.lineCap = "round"; rings.forEach(({ pts, hue }) => { for (let j = 1; j < pts.length; j++) { const p = pts[j - 1], q = pts[j], d = (p[2] + q[2]) / 2; g.lineWidth = S * (.004 + .014 * k("thick")) * (.4 + d); g.strokeStyle = hsl(hue, 95, 55 + 25 * d, .3 + .7 * d); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } });
    // the core: what sits at the center of the rings
    const core = I("core"), cr = S * (.01 + .08 * k("coresize")) * (1 + .4 * R.kick); sprite(g, n.hue, n.x, n.y, cr * (core === 0 ? 2.2 : 1.4), .9);
    g.lineWidth = S * .005; g.strokeStyle = hsl(n.hue + 20, 95, 80, .95); g.fillStyle = hsl(n.hue + 20, 95, 85, .95); g.beginPath();
    if (core === 1) { g.arc(n.x, n.y, cr * .5, 0, TAU); g.fill(); } else if (core === 2) { g.arc(n.x, n.y, cr, 0, TAU); g.stroke(); } else if (core === 3) { g.moveTo(n.x, n.y - cr); g.lineTo(n.x + cr * .7, n.y); g.lineTo(n.x, n.y + cr); g.lineTo(n.x - cr * .7, n.y); g.closePath(); g.stroke(); } else if (core === 4) { for (let q = 0; q < 10; q++) { const a = q / 10 * TAU - Math.PI / 2 + t * .5, rr = q % 2 ? cr * .45 : cr; q ? g.lineTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr) : g.moveTo(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr); } g.closePath(); g.stroke(); } } };

/* ---- Iris: a camera aperture that opens and closes ---- */
const IRISF = { key: "iris", name: "Iris", fade: .5, init: () => ({ open: .5, rot: 0 }),
  shape: [{ key: "blades", label: "Blades", min: 5, max: 12, def: .3 }, { key: "openwith", label: "Opens with", min: 0, max: 2, def: 0, fmt: i => ["Loudness", "Kicks (snaps shut)", "Slow breathing"][i] }, { key: "spin", label: "Rotation", def: .3 }, { key: "size", label: "Size", def: .55 }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), mode = I("openwith"), N = I("blades"), Rr = S * L("size", .18, .5);
    const target = mode === 0 ? .15 + .85 * loud : mode === 1 ? (E.beat ? 0 : .85) : .3 + .6 * (.5 + .5 * Math.sin(t * .6)); st.open = lerp(st.open, target, dt * (mode === 1 && target === 0 ? 30 : 4));
    st.rot += dt * L("spin", 0, 1.2) * (1 + R.kick); const hole = Rr * (.08 + .8 * st.open), blade = Rr * 1.15;
    g.lineJoin = "round"; for (let i = 0; i < N; i++) { const a0 = st.rot + i / N * TAU, a1 = a0 + TAU / N;
      // each blade is a petal between the outer ring and the hole, overlapping its neighbor
      const p = [[n.x + Math.cos(a0) * Rr, n.y + Math.sin(a0) * Rr], [n.x + Math.cos(a1 + .3) * Rr, n.y + Math.sin(a1 + .3) * Rr], [n.x + Math.cos(a1 + .3 + .9 * (1 - st.open)) * hole, n.y + Math.sin(a1 + .3 + .9 * (1 - st.open)) * hole], [n.x + Math.cos(a0 + .9 * (1 - st.open)) * hole, n.y + Math.sin(a0 + .9 * (1 - st.open)) * hole]];
      g.fillStyle = hsl(n.hue + i * 4, 60, 18 + 10 * (i % 2), .9); g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.fill();
      g.lineWidth = S * .005; g.strokeStyle = hsl(n.hue, 95, 70, .9); g.stroke(); }
    g.lineWidth = S * .008; g.strokeStyle = hsl(n.hue, 90, 75, .8); g.beginPath(); g.arc(n.x, n.y, Rr, 0, TAU); g.stroke();
    sprite(g, n.hue + 30, n.x, n.y, hole * 1.6 + S * .02, .4 + .5 * st.open); } };

/* ---- Curtain: vertical strands that part on the beat ---- */
const CURTAIN = { key: "curtain", name: "Curtain", fade: .45, init: () => ({ part: 0, sway: [] }),
  shape: [{ key: "strands", label: "Strands", min: 8, max: 40, def: .5 }, { key: "gap", label: "Gap between curtains", def: 0 }, { key: "part", label: "Part amount", def: .6 }, { key: "sway", label: "Sway", def: .4 }, { key: "ret", label: "Return speed", def: .5 }, { key: "height", label: "Height", def: .7 }],
  draw(E) { const { g, n, R, S, st, dt, t, W, L, I, k } = E, N = I("strands"), loud = tLoud(R), h = S * L("height", .4, 1), top = n.y - h / 2;
    if (E.beat) st.part = 1; st.part *= Math.exp(-dt * L("ret", .4, 3)); const part = st.part * k("part") * W * .3, span = W * .7;
    g.lineCap = "round"; for (let i = 0; i < N; i++) { const u = (i + .5) / N - .5, side = Math.sign(u) || 1, x0 = n.x + u * span + side * W * .25 * k("gap"), sh = Math.abs(u) * 2, pts = [], sw = L("sway", 0, 1);
      for (let j = 0; j <= 20; j++) { const v = j / 20, x = x0 + side * part * (1 - sh) * Math.pow(v, 1.5) + Math.sin(t * 1.3 + i * .7 + v * 4) * S * .02 * sw * (v + .3) * (1 + loud); pts.push([x, top + h * v]); }
      g.lineWidth = S * .012; g.strokeStyle = hsl(n.hue + (i % 3) * 8, 90, 55, .25); strokePath(g, pts); g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + (i % 3) * 8, 95, 72, .9); strokePath(g, pts);
      sprite(g, n.hue, pts[0][0], pts[0][1], S * .012, .8); } } };

/* ---- Slow grin: a line that widens into a crescent and holds ---- */
const GRIN = { key: "grin", name: "Slow grin", fade: .6, init: () => ({ u: 0, hold: 0 }),
  shape: [{ key: "width", label: "Width", def: .6 }, { key: "curve", label: "Curve", def: .55 }, { key: "teeth", label: "Teeth", def: .4 }, { key: "hold", label: "Hold", def: .6 }, { key: "speed", label: "Speed", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, loud = tLoud(R);
    // widens slowly, holds, then relaxes; loud parts push it wider faster
    if (st.hold > 0) st.hold -= dt; else { st.u += dt * L("speed", .08, .5) * (st.dir ?? 1) * (1 + 1.5 * loud); if (st.u >= 1) { st.u = 1; st.dir = -1; st.hold = L("hold", 1, 6); } if (st.u <= 0) { st.u = 0; st.dir = 1; st.hold = L("hold", .5, 3); } }
    const u = ease(st.u), w = S * L("width", .25, .55) * (.3 + .7 * u), cv = S * L("curve", .05, .25) * u, lip = S * .02 * (.2 + .8 * u) * (1 + .5 * R.kick);
    const upper = [], lower = []; for (let i = 0; i <= 40; i++) { const v = i / 40 * 2 - 1, x = n.x + v * w, y = n.y + cv * (1 - v * v) - S * .02 * (1 - v * v) * u; upper.push([x, y - lip * (1 - v * v) * .6]); lower.push([x, y + lip * (1 - v * v)]); }
    g.lineCap = g.lineJoin = "round"; g.lineWidth = S * .018; g.strokeStyle = hsl(n.hue, 90, 55, .2); strokePath(g, upper); strokePath(g, lower);
    g.lineWidth = S * .006; g.strokeStyle = hsl(n.hue, 95, 72, .95); strokePath(g, upper); strokePath(g, lower);
    if (k("teeth") > .05 && u > .3) { const T = Math.round(4 + 10 * k("teeth")); g.lineWidth = S * .003; g.strokeStyle = hsl(n.hue + 20, 60, 90, .6 * (u - .3) / .7); for (let i = 1; i < T; i++) { const v = i / T * 2 - 1, x = n.x + v * w * .9, y = n.y + cv * (1 - v * v); g.beginPath(); g.moveTo(x, y - lip * (1 - v * v) * .5); g.lineTo(x, y + lip * (1 - v * v) * .9); g.stroke(); } }
    sprite(g, n.hue, upper[0][0], upper[0][1], S * .02, .6 * u); sprite(g, n.hue, upper[40][0], upper[40][1], S * .02, .6 * u); } };

/* ---- Blink: paired lids that snap shut and slowly open ---- */
const BLINK = { key: "blink", name: "Blink", fade: .5, init: () => ({ open: 1, next: 1.5 }),
  shape: [{ key: "size", label: "Eye size", def: .5 }, { key: "on", label: "Blink on", min: 0, max: 2, def: 0, fmt: i => ["Kicks", "Its own time", "Both"][i] }, { key: "speed", label: "Open speed", def: .4 }, { key: "lashes", label: "Lashes", def: .5 }, { key: "lashlen", label: "Lash length", def: .3 }, { key: "pair", label: "Two eyes", min: 0, max: 1, def: 1, fmt: i => ["One", "Two"][i] }],
  draw(E) { const { g, n, R, S, st, dt, L, I, k } = E, on = I("on"); st.next -= dt;
    if ((on !== 1 && E.beat) || (on !== 0 && st.next <= 0)) { st.open = 0; st.next = 1.2 + Math.random() * 3; } st.open = lerp(st.open, 1, dt * L("speed", .8, 5));
    const two = I("pair") === 1, eyes = two ? [n.x - S * .22, n.x + S * .22] : [n.x], w = S * L("size", .12, .3), hgt = w * .55 * ease(st.open);
    eyes.forEach((ex, ei) => { const up = [], lo = []; for (let i = 0; i <= 30; i++) { const v = i / 30 * 2 - 1, x = ex + v * w, b = (1 - v * v); up.push([x, n.y - hgt * b]); lo.push([x, n.y + hgt * b * .7]); }
      g.lineCap = "round"; g.lineWidth = S * .016; g.strokeStyle = hsl(n.hue, 90, 55, .2); strokePath(g, up); strokePath(g, lo); g.lineWidth = S * .005; g.strokeStyle = hsl(n.hue, 95, 72, .95); strokePath(g, up); strokePath(g, lo);
      if (st.open > .15) { const ir = hgt * .8 * (1 + .15 * R.kick); g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + 60, 90, 70, .9); g.beginPath(); g.arc(ex, n.y, ir, 0, TAU); g.stroke(); g.fillStyle = hsl(n.hue + 60, 90, 20, .9); g.beginPath(); g.arc(ex, n.y, ir * .5, 0, TAU); g.fill(); sprite(g, n.hue + 60, ex, n.y, ir * 1.4, .5 * st.open); }
      if (k("lashes") > .05) { const Lh = Math.round(3 + 6 * k("lashes")), LL = S * (.02 + .3 * k("lashlen")); g.lineWidth = S * .003; g.strokeStyle = hsl(n.hue, 95, 72, .8); for (let i = 0; i < Lh; i++) { const v = -.9 + 1.8 * (i + .5) / Lh, x = ex + v * w, y = n.y - hgt * (1 - v * v), len = LL * (1 - .45 * Math.abs(v)), cx2 = x + v * len * .5, cy2 = y - len * .55 * (.3 + .7 * st.open); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx2, cy2, x + v * len * .9 + Math.sin(E.t * 2 + i) * len * .05, y - len * (.25 + .75 * st.open)); g.stroke(); } } }); } };

FORM.mobius = MOBIUS; FORM.grid = GRID; FORM.gyro = GYRO; FORM.iris = IRISF; FORM.curtain = CURTAIN; FORM.grin = GRIN; FORM.blink = BLINK;
