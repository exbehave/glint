/* ================= New traits (Oct 21, 2026), from the slate Kennedy approved =================
   Built on the Casting bench first; each joins the app after a Keep. Same contract as every form: draw(E).
   Families: spins and orbits · reveals and holds · pulses and breathing. */
const tLoud = R => clamp(R.rms * 1.15, 0, 1);
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
// a point on a ring in 3D (radius r, angle a, height y) seen from the front with a little tilt; returns [sx, sy, depth 0..1]
function spin3(cx, cy, r, a, y, tilt, lean) { const x = Math.cos(a) * r, z = Math.sin(a) * r, ty = y * Math.cos(tilt) - z * Math.sin(tilt), tz = y * Math.sin(tilt) + z * Math.cos(tilt); return [cx + x + ty * Math.sin(lean), cy + ty * Math.cos(lean), .5 + .5 * tz / (r || 1)]; }

/* ---- Layback: a ribbon spinning on its axis, tightening as it speeds up, like a skater's layback spin ---- */
const LAYBACK = { key: "layback", name: "Layback", fade: .5, init: () => ({ a: 0, v: .8, phase: 0, ph: 0 }),
  shape: [{ key: "strands", label: "Strands", min: 1, max: 5, def: .5 }, { key: "tighten", label: "Tighten at speed", def: .7 }, { key: "height", label: "Height", def: .6 }, { key: "lean", label: "Lean", def: .45 }, { key: "cycle", label: "Wind up and release", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, I, k } = E, loud = tLoud(R);
    // a spin winds up over several seconds, holds, then lets go; music speeds the wind-up
    st.ph += dt * (.12 + .25 * k("cycle")) * (.6 + loud + R.kick); const c = st.ph % 1, wind = c < .55 ? ease(c / .55) : c < .8 ? 1 : 1 - ease((c - .8) / .2);
    st.v = lerp(st.v, .6 + 7 * wind + 3 * loud, dt * 2); st.a += st.v * dt;
    const r0 = S * .26, r = r0 * (1 - .55 * wind * k("tighten")), h = S * L("height", .3, .9), lean = L("lean", 0, .9) * (.3 + .7 * wind), tilt = .35, N = I("strands");
    g.lineCap = g.lineJoin = "round";
    for (let s = 0; s < N; s++) { const off = s / N * TAU, pts = [], M = 56;
      for (let i = 0; i <= M; i++) { const u = i / M, y = -h / 2 + h * u, a = st.a + off + u * (2.2 + 1.5 * wind), rr = r * (.6 + .4 * Math.sin(u * Math.PI)); pts.push(spin3(n.x, n.y, rr, a, y, tilt, lean)); }
      [[S * .02, .12], [S * .006, .85]].forEach(([w, al]) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], d = (p[2] + q[2]) / 2; g.lineWidth = w * (.5 + d); g.strokeStyle = hsl(n.hue + s * 18, 95, 65 + 15 * d, al * (.35 + .65 * d)); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }); }
    sprite(g, n.hue, n.x, n.y + h * .5 * Math.cos(lean), S * (.03 + .04 * R.kick), .9); } };

/* ---- Orrery: nested rings of orbiters at related speeds ---- */
const ORRERY = { key: "orrery", name: "Orrery", fade: .3, init: () => ({ t: 0 }),
  shape: [{ key: "rings", label: "Rings", min: 2, max: 6, def: .5 }, { key: "ratio", label: "Speed ratio", def: .5 }, { key: "tilt", label: "Tilt", def: .35 }, { key: "size", label: "Orbiter size", def: .4 }, { key: "moons", label: "Moons", def: .4 }],
  draw(E) { const { g, n, R, S, st, dt, L, I, k } = E, N = I("rings"), tilt = L("tilt", 1, .25), ratio = L("ratio", 1.2, 2.2), loud = tLoud(R);
    st.t += dt * (.5 + 1.6 * E.p.tempo) * (.5 + loud + R.kick * .5);
    for (let i = 0; i < N; i++) { const r = S * (.07 + .07 * i) * (1 + .05 * R.bass), sp = Math.pow(ratio, N - 1 - i) * (i % 2 ? -1 : 1), a = st.t * sp * .4 + i * 1.3, hue = n.hue + i * 22;
      g.lineWidth = 1; g.strokeStyle = hsl(hue, 70, 70, .25); g.beginPath(); g.ellipse(n.x, n.y, r, r * tilt, 0, 0, TAU); g.stroke();
      const x = n.x + Math.cos(a) * r, y = n.y + Math.sin(a) * r * tilt, front = Math.sin(a) > 0, rs = S * (.008 + .02 * k("size")) * (1.4 - .4 * (i / N)) * (1 + .4 * R.kick);
      sprite(g, hue, x, y, rs * 3, front ? .9 : .5); g.fillStyle = hsl(hue, 90, front ? 80 : 60, 1); g.beginPath(); g.arc(x, y, rs, 0, TAU); g.fill();
      if (k("moons") > .2 && i > 0) { const mn = Math.round(k("moons") * 3), mr = rs * 3.2; for (let m = 0; m < mn; m++) { const ma = st.t * sp * 2.5 + m / mn * TAU, mx = x + Math.cos(ma) * mr, my = y + Math.sin(ma) * mr * tilt; g.fillStyle = hsl(hue + 30, 80, 80, .8); g.beginPath(); g.arc(mx, my, rs * .35, 0, TAU); g.fill(); } } }
    sprite(g, n.hue + 40, n.x, n.y, S * (.03 + .03 * R.kick), .95); g.fillStyle = hsl(n.hue + 40, 80, 90, 1); g.beginPath(); g.arc(n.x, n.y, S * .012, 0, TAU); g.fill(); } };

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

/* ---- Heartbeat: a glowing shape that double-thumps on kicks ---- */
const HEART = { key: "heartbeat", name: "Heartbeat", fade: .35, init: () => ({ b: 0, b2: 0 }),
  shape: [{ key: "form", label: "Shape", min: 0, max: 2, def: 0, fmt: i => ["Heart", "Circle", "Ring"][i] }, { key: "size", label: "Size", def: .5 }, { key: "thump", label: "Thump strength", def: .6 }, { key: "glow", label: "Glow", def: .5 }, { key: "ekg", label: "Pulse line", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k, W } = E; if (E.beat) { st.b = 1; st.b2 = -.14; } st.b *= Math.exp(-dt * 6); if (st.b2 < 0) { st.b2 += dt; if (st.b2 >= 0) st.b2 = 1; } else st.b2 *= Math.exp(-dt * 7);
    const pulse = 1 + (st.b + .6 * Math.max(0, st.b2)) * .25 * L("thump", .3, 2), r = S * L("size", .1, .3) * pulse * (1 + .03 * Math.sin(t * 2)), f = I("form");
    g.lineJoin = "round"; const path = () => { g.beginPath(); if (f === 0) { for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU, x = 16 * Math.pow(Math.sin(a), 3), y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); const px = n.x + x / 17 * r, py = n.y + y / 17 * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); } else g.arc(n.x, n.y, r, 0, TAU); };
    sprite(g, n.hue, n.x, n.y, r * (1.6 + .8 * k("glow")) , .5 * k("glow") * (1 + st.b)); if (f !== 2) { g.fillStyle = hsl(n.hue, 95, 55, .35 + .35 * st.b); path(); g.fill(); }
    g.lineWidth = S * .008; g.strokeStyle = hsl(n.hue, 95, 72, .95); path(); g.stroke();
    if (k("ekg") > .05) { const pts = [], y0 = n.y + r * 1.6, spd = t * W * .25; for (let i = 0; i <= 80; i++) { const x = n.x - W * .3 + i / 80 * W * .6, ph = ((x + spd) / (W * .22)) % 1, s = ph < .1 ? 0 : ph < .14 ? -.2 : ph < .2 ? 1 : ph < .25 ? -.45 : ph < .3 ? 0 : ph < .42 ? .15 * Math.sin((ph - .3) / .12 * Math.PI) : 0; pts.push([x, y0 - s * r * .5 * (.5 + .5 * k("thump"))]); }
      g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + 20, 90, 70, .7 * k("ekg")); strokePath(g, pts); } } };

/* ---- Lungs: two lobes that fill and empty with the loudness envelope ---- */
const LUNGS = { key: "lungs", name: "Lungs", fade: .4, init: () => ({ fill: .4 }),
  shape: [{ key: "speed", label: "Breath speed", def: .4 }, { key: "with", label: "Fill with", min: 0, max: 1, def: 0, fmt: i => ["Loudness", "Its own rhythm"][i] }, { key: "size", label: "Lobe size", def: .5 }, { key: "detail", label: "Bronchi", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), target = I("with") === 0 ? .15 + .85 * loud : .2 + .7 * (.5 + .5 * Math.sin(t * L("speed", .4, 2))); st.fill = lerp(st.fill, target, dt * L("speed", .8, 4));
    const f = ease(st.fill), sz = S * L("size", .12, .3), lobe = (side) => { g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, a = Math.PI * .5 + u * Math.PI, rr = sz * (.6 + .5 * f) * (1 + .25 * Math.sin(u * Math.PI)), x = n.x + side * (sz * .35 + Math.abs(Math.cos(a)) * rr * (1 + .3 * f)), y = n.y - sz * .5 + (u * 1.3) * sz * (1 + .4 * f) + Math.sin(u * Math.PI) * sz * .1; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    [-1, 1].forEach(side => { g.fillStyle = hsl(n.hue, 80, 50, .12 + .3 * f); lobe(side); g.fill(); g.lineWidth = S * .006; g.strokeStyle = hsl(n.hue, 95, 70, .9); lobe(side); g.stroke(); });
    g.lineCap = "round"; g.lineWidth = S * .008; g.strokeStyle = hsl(n.hue + 30, 80, 75, .9); g.beginPath(); g.moveTo(n.x, n.y - sz * 1.1); g.lineTo(n.x, n.y - sz * .3); g.stroke();
    if (k("detail") > .05) { const depth = Math.round(1 + 3 * k("detail")), branch = (x, y, a, len, d) => { if (d > depth) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = S * .006 / (d + 1); g.strokeStyle = hsl(n.hue + 30, 80, 75, .8 / (d * .6 + 1)); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); branch(x2, y2, a - .5 - .2 * f, len * .65, d + 1); branch(x2, y2, a + .5 + .2 * f, len * .65, d + 1); };
      branch(n.x, n.y - sz * .3, Math.PI / 2 - .9, sz * .5 * (1 + .3 * f), 1); branch(n.x, n.y - sz * .3, Math.PI / 2 + .9, sz * .5 * (1 + .3 * f), 1); } } };

/* ---- Jellyfish bell: a dome that pumps and trails tendrils ---- */
const BELL = { key: "bell", name: "Jellyfish bell", fade: .4, init: () => ({ pump: 0, tails: null, y: 0 }),
  shape: [{ key: "tent", label: "Tentacles", min: 4, max: 16, def: .5 }, { key: "pump", label: "Pump", def: .6 }, { key: "drift", label: "Drift", def: .4 }, { key: "glow", label: "Glow", def: .5 }, { key: "size", label: "Size", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R); if (E.beat) st.pump = 1; st.pump *= Math.exp(-dt * 2.2);
    const sz = S * L("size", .1, .28), sq = 1 - .35 * st.pump * k("pump"), wd = sz * (1.25 - .25 * sq), ht = sz * sq, N = I("tent"), cy = n.y + Math.sin(t * .6) * S * .03 * k("drift") - st.pump * S * .03;
    if (!st.tails || st.tails.length !== N) st.tails = Array.from({ length: N }, (_, i) => ({ seg: Array.from({ length: 12 }, () => [n.x, cy]), ph: i * .9 }));
    const dome = () => { g.beginPath(); g.moveTo(n.x - wd, cy); g.bezierCurveTo(n.x - wd, cy - ht * 1.3, n.x + wd, cy - ht * 1.3, n.x + wd, cy); for (let i = 0; i <= N; i++) { const x = n.x + wd - i / N * 2 * wd; g.quadraticCurveTo(x + wd / N, cy + ht * .12, x, cy); } g.closePath(); };
    sprite(g, n.hue, n.x, cy - ht * .4, sz * (1.5 + k("glow")), .4 * k("glow") * (1 + st.pump)); g.fillStyle = hsl(n.hue, 85, 60, .18 + .2 * st.pump); dome(); g.fill(); g.lineWidth = S * .006; g.strokeStyle = hsl(n.hue, 95, 75, .9); dome(); g.stroke();
    g.lineCap = "round"; st.tails.forEach((tl, i) => { const u = (i + .5) / N * 2 - 1, ax = n.x + u * wd * .9; tl.seg[0] = [ax, cy]; for (let j = 1; j < tl.seg.length; j++) { const p = tl.seg[j], q = tl.seg[j - 1], tx = q[0] + Math.sin(t * 2 + tl.ph + j * .5) * S * .01 * (1 + loud), ty = q[1] + sz * .18 * (1 + .3 * st.pump); p[0] = lerp(p[0], tx, dt * 6); p[1] = lerp(p[1], ty, dt * 6); }
      g.lineWidth = S * .004; g.strokeStyle = hsl(n.hue + 25, 90, 75, .7); strokePath(g, tl.seg); }); } };

const NEW_TRAITS = [
  { form: LAYBACK, char: "anchored", hue: 200, hy: .5, p: { roam: .02, size: .6, trails: .55 }, desc: "A ribbon spinning on a vertical axis. It winds up over several seconds, tightening and leaning as it speeds, holds, then lets go — a skater's layback spin." },
  { form: ORRERY, char: "anchored", hue: 40, hy: .5, p: { roam: .02, size: .55, trails: .5 }, desc: "Nested rings of orbiters at related speeds, with moons around the outer ones. Tempo drives the clockwork; kicks nudge it." },
  { form: GYRO, char: "anchored", hue: 185, hy: .5, p: { roam: .02, size: .55, trails: .45 }, desc: "Rings tumbling on three axes at once, brighter where they pass in front." },
  { form: IRISF, char: "anchored", hue: 260, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "A camera aperture. Opens with loudness, or snaps shut on every kick and eases back open, or breathes on its own." },
  { form: CURTAIN, char: "anchored", hue: 330, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "Vertical strands that sway, and part from the middle on the beat before drifting closed." },
  { form: GRIN, char: "anchored", hue: 300, hy: .5, p: { roam: .02, size: .6, trails: .55 }, desc: "A line that slowly widens into a crescent, holds it, and relaxes. Teeth appear as it widens. The villain close-up." },
  { form: BLINK, char: "anchored", hue: 220, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "Lids that snap shut, on kicks or on their own time, and slowly open to show an iris." },
  { form: HEART, char: "anchored", hue: 350, hy: .5, p: { roam: .02, size: .55, trails: .45 }, desc: "A glowing heart, circle or ring that double-thumps on every kick, with a pulse line scrolling beneath." },
  { form: LUNGS, char: "anchored", hue: 170, hy: .5, p: { roam: .02, size: .6, trails: .5 }, desc: "Two lobes that fill and empty with the loudness envelope, or on their own rhythm, with branching bronchi." },
  { form: BELL, char: "anchored", hue: 280, hy: .42, p: { roam: .02, size: .6, trails: .5 }, desc: "A jellyfish dome that pumps on the beat and trails tendrils that follow its drift." }
];
NEW_TRAITS.forEach(r => { FORM[r.form.key] = r.form; });
