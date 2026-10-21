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
const BLINK = { key: "blink", name: "Blink", fade: .5, init: () => ({ open: 1, next: 1.5, lash: 1, lashV: 0, spin: 0, glints: [], tw: 0 }),
  shape: [{ key: "size", label: "Eye size", def: .5 }, { key: "on", label: "Blink on", min: 0, max: 2, def: 0, fmt: i => ["Kicks", "Its own time", "Both"][i] }, { key: "speed", label: "Open speed", def: .4 },
    { key: "inside", label: "Inside the iris", min: 0, max: 4, def: 0, fmt: i => ["Spiral", "Starburst", "Rings", "Galaxy", "Kaleidoscope"][i], grp: "Iris" }, { key: "detail", label: "Detail", def: .5, grp: "Iris" }, { key: "swirl", label: "Swirl speed", def: .4, grp: "Iris" }, { key: "irishue", label: "Iris color shift", def: .17, grp: "Iris" }, { key: "pupil", label: "Pupil size", def: .4, grp: "Iris" },
    { key: "twinkle", label: "Twinkle", def: .6, grp: "Sparkle" }, { key: "glints", label: "Glints", def: .4, grp: "Sparkle" }, { key: "catch", label: "Catchlight", def: .6, grp: "Sparkle" },
    { key: "lashes", label: "Lashes", def: .5, grp: "Lashes" }, { key: "lashlen", label: "Lash length", def: .3, grp: "Lashes" }, { key: "curl", label: "Curl", def: .5, grp: "Lashes" }, { key: "flutter", label: "Flutter", def: .5, grp: "Lashes" },
    { key: "pair", label: "Two eyes", min: 0, max: 1, def: 1, fmt: i => ["One", "Two"][i] }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E, on = I("on"); st.next -= dt;
    if ((on !== 1 && E.beat) || (on !== 0 && st.next <= 0)) { st.open = 0; st.next = 1.2 + Math.random() * 3; } st.open = lerp(st.open, 1, dt * L("speed", .8, 5));
    // lashes ride a spring behind the lid: they fold down as it shuts, then overshoot and settle as it opens (follow-through, not a stiff hinge)
    const lashK = 70, lashD = 2 * Math.sqrt(lashK) * lerp(.9, .35, k("flutter")); st.lashV += ((st.open - st.lash) * lashK - st.lashV * lashD) * dt; st.lash += st.lashV * dt;
    st.spin += dt * L("swirl", .05, 1.6) * (1 + 1.2 * R.kick + tLoud(R)); st.tw += dt * (1 + 3 * k("twinkle"));
    const two = I("pair") === 1, eyes = two ? [n.x - S * .22, n.x + S * .22] : [n.x], w = S * L("size", .12, .3), op = ease(clamp(st.open, 0, 1)), hgt = w * .55 * op, inside = I("inside"), ihue = n.hue + k("irishue") * 360;
    eyes.forEach((ex, ei) => { const up = [], lo = []; for (let i = 0; i <= 30; i++) { const v = i / 30 * 2 - 1, x = ex + v * w, b = (1 - v * v); up.push([x, n.y - hgt * b]); lo.push([x, n.y + hgt * b * .7]); }
      const mir = ei === 1 ? -1 : 1, ir = Math.max(1, w * .44 * (1 + .12 * R.kick));
      // inside the eye: clip to the lids so the iris tucks under them as they close
      if (st.open > .05) { g.save(); g.beginPath(); g.moveTo(up[0][0], up[0][1]); up.forEach(p => g.lineTo(p[0], p[1])); for (let i = lo.length - 1; i >= 0; i--) g.lineTo(lo[i][0], lo[i][1]); g.closePath(); g.clip();
        const cx = ex, cy = n.y, N = Math.round(lerp(3, 12, k("detail"))), rot = st.spin * mir; g.lineCap = "round";
        if (inside === 0) { for (let a = 0; a < N; a++) { g.beginPath(); for (let q = 0; q <= 50; q++) { const u = q / 50, th = rot + a / N * TAU + u * 4.2, r = ir * u; q ? g.lineTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r) : g.moveTo(cx, cy); } g.lineWidth = S * .003; g.strokeStyle = hsl(ihue + a * 9, 90, 62, .85); g.stroke(); } }
        else if (inside === 1) { for (let a = 0; a < N * 3; a++) { const th = rot * .4 + a / (N * 3) * TAU, r0 = ir * .25, r1 = ir * (.75 + .25 * Math.sin(a * 2.3 + st.spin * 3)); g.lineWidth = S * (a % 3 ? .0025 : .004); g.strokeStyle = hsl(ihue + (a % 3) * 20, 90, 60 + 15 * (a % 2), .8); g.beginPath(); g.moveTo(cx + Math.cos(th) * r0, cy + Math.sin(th) * r0); g.lineTo(cx + Math.cos(th) * r1, cy + Math.sin(th) * r1); g.stroke(); } }
        else if (inside === 2) { for (let a = 1; a <= N; a++) { const r = ir * a / N, ph = (st.spin * 1.5 - a * .4); g.setLineDash([S * .01 * (1 + a % 3), S * .008]); g.lineDashOffset = ph * S * .05 * (a % 2 ? 1 : -1); g.lineWidth = S * .003; g.strokeStyle = hsl(ihue + a * 12, 90, 55 + 20 * (a / N), .85); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); } g.setLineDash([]); }
        else if (inside === 3) { const pts = N * 14; for (let q = 0; q < pts; q++) { const arm = q % 3, u = (q * 0.61803 % 1), th = rot + arm / 3 * TAU + u * 5.5, r = ir * Math.pow(u, .8), j = Math.sin(q * 12.9898) * ir * .06; g.fillStyle = hsl(ihue + u * 60, 90, 55 + 35 * (1 - u), .85); g.beginPath(); g.arc(cx + Math.cos(th) * r + j, cy + Math.sin(th) * r + j, S * .0025 * (1.4 - u), 0, TAU); g.fill(); } }
        else { const seg = Math.max(5, N); for (let a = 0; a < seg; a++) { g.save(); g.translate(cx, cy); g.rotate(rot + a / seg * TAU); if (a % 2) g.scale(1, -1); g.lineWidth = S * .003; g.strokeStyle = hsl(ihue + a * 14, 90, 62, .85); g.beginPath(); for (let q = 0; q <= 16; q++) { const u = q / 16, r = ir * u, th = Math.sin(u * 5 + st.spin * 2) * .35; q ? g.lineTo(Math.cos(th) * r, Math.sin(th) * r) : g.moveTo(0, 0); } g.stroke(); g.restore(); } }
        // iris rim, pupil, catchlight
        g.lineWidth = S * .004; g.strokeStyle = hsl(ihue, 90, 72, .9); g.beginPath(); g.arc(cx, cy, ir, 0, TAU); g.stroke();
        const pr = ir * L("pupil", .15, .6) * (1 - .25 * tLoud(R)); g.fillStyle = "rgba(0,0,0,.92)"; g.beginPath(); g.arc(cx, cy, pr, 0, TAU); g.fill(); g.lineWidth = S * .002; g.strokeStyle = hsl(ihue, 80, 70, .6); g.stroke();
        sprite(g, ihue, cx, cy, ir * 1.5, .35 * st.open);
        if (k("catch") > .05) { const cl = k("catch"), tw = .7 + .3 * Math.sin(st.tw * 2.1 + ei); spriteWhite(g, cx - ir * .35, cy - ir * .35, ir * .5 * cl, .9 * tw); g.fillStyle = `rgba(255,255,255,${.95 * tw})`; g.beginPath(); g.arc(cx - ir * .35, cy - ir * .35, ir * .09 * (.5 + cl), 0, TAU); g.fill(); g.beginPath(); g.arc(cx + ir * .3, cy + ir * .25, ir * .04 * (.5 + cl), 0, TAU); g.fill(); }
        // twinkles: small four-point stars that pop on the iris and fade, more on loud parts and hits
        if (k("twinkle") > .02) { const want = Math.round(k("glints") * 8); if (st.glints.length < want * 2 && Math.random() < dt * (2 + 10 * k("twinkle")) * (1 + tLoud(R) + 2 * R.kick)) { const a = Math.random() * TAU, r = ir * (.35 + .6 * Math.random()); st.glints.push({ e: ei, x: Math.cos(a) * r, y: Math.sin(a) * r * .8, life: 1, s: .5 + Math.random() }); }
          st.glints.forEach(gl => { if (gl.e !== ei) return; const a = Math.sin(gl.life * Math.PI), r = ir * .14 * gl.s * a, x = cx + gl.x, y = cy + gl.y; g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = Math.max(1, r * .15); g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke(); spriteWhite(g, x, y, r * .8, a * .6); }); }
        g.restore(); }
      st.glints = st.glints.filter(gl => (gl.life -= dt * (.8 + 1.5 * k("twinkle"))) > 0);
      g.lineCap = "round"; g.lineWidth = S * .016; g.strokeStyle = hsl(n.hue, 90, 55, .2); strokePath(g, up); strokePath(g, lo); g.lineWidth = S * .005; g.strokeStyle = hsl(n.hue, 95, 72, .95); strokePath(g, up); strokePath(g, lo);
      // lashes: tapered, curled, they fold down with the lid and spring back past upright before settling; a breath of sway when open
      if (k("lashes") > .05) { const Lh = Math.round(3 + 9 * k("lashes")), LL = S * (.02 + .3 * k("lashlen")), lsh = clamp(st.lash, -.1, 1.25), curl = k("curl");
        for (let i = 0; i < Lh; i++) { const v = -.92 + 1.84 * (i + .5) / Lh, x = ex + v * w, y = n.y - hgt * (1 - v * v), len = LL * (1 - .4 * Math.abs(v)) * (.55 + .45 * clamp(lsh, 0, 1.2)),
            base = -Math.PI / 2 + v * .9, droop = (1 - lsh) * (1.25 + .3 * Math.abs(v)), sway = Math.sin(t * 2.2 + i * .9) * .06 * k("flutter") * lsh;
            // the lash bends downward as it folds: rotate its direction toward the cheek by the droop amount
            const dir = base + sway + (Math.PI) * .42 * (1 - clamp(lsh, 0, 1)) * (v >= 0 ? 1 : -1), mid = len * .55, x1 = x + Math.cos(dir) * mid, y1 = y + Math.sin(dir) * mid, tipDir = dir + (v >= 0 ? 1 : -1) * -curl * .9 * (.4 + .6 * lsh), x2 = x1 + Math.cos(tipDir) * len * .5, y2 = y1 + Math.sin(tipDir) * len * .5;
            g.strokeStyle = hsl(n.hue, 95, 72, .85); g.lineWidth = S * .0045; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x1, y1, (x1 + x2) / 2, (y1 + y2) / 2); g.stroke(); g.lineWidth = S * .0022; g.beginPath(); g.moveTo((x1 + x2) / 2, (y1 + y2) / 2); g.lineTo(x2, y2); g.stroke(); } } }); } };

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
    { key: "depth", label: "Depth", min: 1, max: 5, def: 1, slide: true, fmt: i => String(i), grp: "Inside the carvings" }, { key: "every", label: "Pumpkins in", min: 0, max: 1, def: 0.86, fmt: i => ["The zoom hole", "Every hole"][i], grp: "Inside the carvings" }, { key: "next", label: "Next zoom", min: 0, max: 2, def: 0, fmt: i => ["In order", "Random", "Same hole"][i], grp: "Inside the carvings" }, { key: "order", label: "Order", min: 0, max: 3, def: 0, fmt: i => ["Left eye → right eye → nose → mouth", "Right eye → left eye → nose → mouth", "Left eye → right eye → mouth → nose", "Mouth → nose → right eye → left eye"][i], grp: "Inside the carvings", when: pick => pick("next") === 0 }, { key: "hole", label: "Hole", min: 0, max: 3, def: .667, fmt: i => ["Left eye", "Right eye", "Nose", "Mouth"][i], grp: "Inside the carvings", when: pick => pick("next") === 2 }, { key: "zoom", label: "Zoom speed", def: 0.51, grp: "Inside the carvings" }, { key: "kickzoom", label: "Zoom on kicks", def: 0.67, grp: "Inside the carvings" }, { key: "twist", label: "Twist", def: 0.96, grp: "Inside the carvings" }, { key: "fill", label: "Inner pumpkin size", def: 0.06, grp: "Inside the carvings" },
    { key: "flicker", label: "Flicker", def: 1, grp: "Candle" }, { key: "beams", label: "Beam length", def: 0.91, grp: "Candle" }, { key: "sweep", label: "Beam sweep", def: 0.3, grp: "Candle" }, { key: "flame", label: "Flame", def: 0.25, grp: "Candle" }, { key: "warm", label: "Candle color shift", def: .1, grp: "Candle" }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E; st.z ??= 0; st.turn ??= 0; st.fl ??= []; const hk = I("teeth") + "/" + k("menace").toFixed(3); if (st.hk !== hk) { st.hk = hk; st.holes = jackHoles(I("teeth"), k("menace")); } const holes = st.holes, depth = I("depth"), every = I("every") === 1, nx = I("next"), loud = tLoud(R), hue = n.hue, chue = hue + k("warm") * 120 - 10;
    const flick = lerp(1, .55 + .25 * Math.sin(t * 13.1) + .15 * Math.sin(t * 29.7 + 1) + .1 * Math.sin(t * 5.3) + .25 * R.kick, k("flicker")), unit = S * L("size", .1, .3) * (1 + .06 * R.kick);
    // Droste zoom: which hole we fly into, and its child map a = r·e^(iθ), placed at the hole's center
    const ORD = [[0, 1, 2, 3], [1, 0, 2, 3], [0, 1, 3, 2], [3, 2, 1, 0]][I("order")]; st.rnd ??= 1; const ti = nx === 0 ? ORD[st.turn % ORD.length] : nx === 1 ? st.rnd : I("hole"), th = holes[ti], ang = (k("twist") - .5) * 1.4, CH = L("fill", .9, 1.8), ar = th.r * CH;
    st.z += dt * L("zoom", 0, .45) * (1 + 3 * k("kickzoom") * R.kick + loud); if (st.z >= 1) { st.z -= 1; st.turn++; let r = st.rnd; while (r === st.rnd) r = Math.floor(Math.random() * 4); st.rnd = r; }
    const z = st.z, A = [ar * Math.cos(ang), ar * Math.sin(ang)], cm = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]], om = [1 - A[0], -A[1]], d2 = om[0] * om[0] + om[1] * om[1],
      Q = cm([th.cx, th.cy], [om[0] / d2, -om[1] / d2]), wm = Math.pow(ar, -z), W = [wm * Math.cos(-ang * z), wm * Math.sin(-ang * z)], WQ = cm(W, Q);
    const sweep = Math.sin(t * .7) * .25 * k("sweep") + Math.sin(t * 1.9) * .08 * k("sweep"), cand = [sweep, .18 + .03 * Math.sin(t * 7)];
    const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
    const ribsN = Math.round(lerp(3, 9, k("ribs")));
    function level(i, sc, alpha, hot) { if (alpha <= .01 || sc < 3) return; const lw = 1 / sc;
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
        const gr = g.createRadialGradient(cand[0], cand[1], 0, cand[0], cand[1], 1.1); gr.addColorStop(0, hsl(chue + 20, 100, 66, .5 * flick * fa)); gr.addColorStop(.6, hsl(chue, 100, 48, .22 * flick * fa)); gr.addColorStop(1, hsl(chue - 10, 100, 35, .08 * fa)); g.fillStyle = gr; g.fillRect(-1.3, -1.3, 2.6, 2.6); g.restore();
        // the child pumpkin overfills its carving and is clipped to it; as the screen-filling parent fades out, that clip widens so the child arrives whole
        const deep = hi === ti ? i < depth : every && i < Math.min(depth, 2);
        if (deep) { const grow = hot && hi === ti ? 1 + 3 * (1 - alpha) : 1, ca = hi === ti ? A : [h.r * CH * Math.cos(ang), h.r * CH * Math.sin(ang)]; g.save(); path(h.pts.map(p => [h.cx + (p[0] - h.cx) * grow, h.cy + (p[1] - h.cy) * grow])); g.clip();
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

FORM.mobius = MOBIUS; FORM.grid = GRID; FORM.gyro = GYRO; FORM.iris = IRISF; FORM.curtain = CURTAIN; FORM.grin = GRIN; FORM.blink = BLINK; FORM.jack = JACK;
