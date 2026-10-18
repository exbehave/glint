/* ---- Twerk squad (Oct 17, 2026, Kennedy's request): four comical twerking visuals ----
   Shared engine: the beat sets the rhythm (twerks per beat), the hips follow it on a springy joint, and each cheek or
   jiggly part rides its own spring on top, so it keeps wobbling after every hit. Node position = where the feet stand. */
const easeOut = x => 1 - Math.pow(1 - x, 3), easeIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function popCurve(u, sharp) { u = frac(u); const a = lerp(.42, .12, sharp); return u < a ? 1 - easeOut(u / a) : easeIO((u - a) / (1 - a)); } // 1 = dropped, 0 = popped up
function spr(s, target, tv, K, C, dt) { const n = 4, h = dt / n; for (let i = 0; i < n; i++) { const a = K * (target - s.p) + C * (tv - s.v); s.v += a * h; s.p += s.v * h; } if (!isFinite(s.p) || Math.abs(s.p) > 50) { s.p = target; s.v = 0; } }
const sp0 = () => ({ p: 0, v: 0 });
// rhythm: learns the gap between beats, so "twerks per beat" stays locked to the song
function twBeat(E, st) {
  st.since = (st.since ?? 9) + E.dt;
  if (E.beat) { if (st.since > .22 && st.since < 2.2) st.gap = lerp(st.gap ?? .55, st.since, .4); st.since = 0; st.hit = 1; st.beats = (st.beats || 0) + 1; }
  st.hit = Math.max(0, (st.hit || 0) - E.dt * 3);
  return clamp(st.gap ?? .55, .25, 1.8);
}
// the spring constants every twerker shares: Jiggle = looseness, Wobble time = how long it keeps going
function twSprings(E) { const f = E.L("jiggle", 7.5, 2.2), K = Math.pow(TAU * f, 2), z = E.L("wobble", .55, .05); return { K, C: 2 * z * Math.sqrt(K) }; }
function twAmp(E, st) { return E.L("bounce", .15, 1.25) * (.35 + .65 * Math.min(1, E.R.energy)) * (1 + .35 * st.hit) * (1 + .4 * E.R.kick); }

// ---- shared extras ----
function cheekBall(g, x, y, rx, ry, hue, glow) {
  sprite(g, hue, x, y, Math.max(rx, ry) * 2.1, .35 * glow);
  const gr = g.createRadialGradient(x - rx * .35, y - ry * .4, rx * .08, x, y, Math.max(rx, ry));
  gr.addColorStop(0, hsl(hue, 100, 88, .75)); gr.addColorStop(.35, hsl(hue, 100, 60, .45)); gr.addColorStop(1, hsl(hue, 100, 45, .12));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
  g.lineWidth = Math.max(1, rx * .07); g.strokeStyle = hsl(hue, 100, 78, .9); g.stroke();
  g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.ellipse(x - rx * .38, y - ry * .42, rx * .16, ry * .1, -.5, 0, TAU); g.fill();
}
function limb(g, pts, hue, w, a = .9) { ribbonNeon(g, pts, hue, () => w, a); }
function bend(a, b, out, n = 10) { const mx = (a[0] + b[0]) / 2 + out[0], my = (a[1] + b[1]) / 2 + out[1], pts = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; pts.push([v * v * a[0] + 2 * v * u * mx + u * u * b[0], v * v * a[1] + 2 * v * u * my + u * u * b[1]]); } return pts; }
function joint(a, b, len1, len2, side) { // two-bone limb: where the knee or elbow goes
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(Math.hypot(dx, dy), len1 + len2 - .01) || .01, ang = Math.atan2(dy, dx), c = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
  const k = ang + side * Math.acos(c); return [a[0] + Math.cos(k) * len1, a[1] + Math.sin(k) * len1];
}
function twExtras(E, st, spots, hue, vel) {
  const { g, S, dt, t, k } = E;
  // ripple rings off each cheek on the beat
  st.rip ||= []; if (E.beat && k("ripples") > .02) spots.forEach(([x, y, r]) => st.rip.push({ x, y, r, age: 0 }));
  st.rip = st.rip.filter(o => (o.age += dt) < .7);
  st.rip.forEach(o => { const f = o.age / .7; g.lineWidth = 1.5; g.strokeStyle = hsl(hue, 100, 75, (1 - f) * .8 * k("ripples")); g.beginPath(); g.ellipse(o.x, o.y, o.r * (1 + f * 1.6), o.r * (.8 + f * 1.2), 0, 0, TAU); g.stroke(); });
  // cartoon motion lines when the hips move fast
  const ml = k("lines") * Math.min(1, Math.abs(vel) * .35);
  if (ml > .03) spots.forEach(([x, y, r], i) => { const sd = i % 2 ? 1 : -1; g.lineWidth = 2; g.lineCap = "round"; g.strokeStyle = hsl(hue + 20, 100, 85, ml);
    for (let j = 0; j < 3; j++) { const rr = r * (1.35 + j * .28); g.beginPath(); g.arc(x, y, rr, sd > 0 ? -.5 + j * .05 : Math.PI - .5, sd > 0 ? .5 : Math.PI + .5 - j * .05); g.stroke(); } });
  // sweat drops fly off on big hits
  st.drops ||= []; if (E.beat && Math.random() < k("sweat")) { const [x, y, r] = spots[Math.floor(Math.random() * spots.length)]; for (let j = 0; j < 3; j++) st.drops.push({ x, y: y - r * .5, vx: (Math.random() - .5) * S * .6, vy: -S * (.25 + Math.random() * .35), age: 0 }); }
  st.drops = st.drops.filter(d => (d.age += dt) < 1.1);
  st.drops.forEach(d => { d.vy += S * 1.6 * dt; d.x += d.vx * dt; d.y += d.vy * dt; const a = Math.atan2(d.vy, d.vx), s = S * .012, al = 1 - d.age / 1.1;
    g.save(); g.translate(d.x, d.y); g.rotate(a + Math.PI / 2); g.beginPath(); g.moveTo(0, -s * 1.8); g.quadraticCurveTo(s, 0, 0, s); g.quadraticCurveTo(-s, 0, 0, -s * 1.8); g.fillStyle = hsl(195, 100, 80, .8 * al); g.fill(); g.restore(); });
  // sparkles twinkle around the dancer
  const ns = Math.round(k("sparkle") * 14);
  for (let j = 0; j < ns; j++) { const [x, y, r] = spots[j % spots.length], a = seeded(j * 7.1 + E.node.seed) * TAU + t * .3, d = r * (1.6 + 1.6 * seeded(j * 3.3)), tw = Math.pow(.5 + .5 * Math.sin(t * (3 + j % 4) + j * 2), 8), s = S * .022 * tw;
    if (s < .5) continue; const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * .8;
    g.strokeStyle = hsl(hue + 40, 100, 90, tw); g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx - s, sy); g.lineTo(sx + s, sy); g.moveTo(sx, sy - s); g.lineTo(sx, sy + s); g.stroke(); sprite(g, hue + 40, sx, sy, s * .9, tw * .6); }
}

// ---- one bubble-booty dancer, seen from behind; used alone and by the crew ----
function bootyState() { return { hip: sp0(), cl: sp0(), cr: sp0(), sx: sp0() }; }
function drawBooty(E, m, x0, y0, U, hue, spread, ph, amp) {
  const { g, dt, t, k, L } = E, { K, C } = twSprings(E), sharp = k("sharp");
  const alt = k("alt"), dropL = popCurve(ph, sharp) * amp, dropR = popCurve(ph + alt * .5, sharp) * amp;
  spr(m.hip, (dropL + dropR) / 2, 0, 900, 2 * .35 * 30, dt);
  const hv = m.hip.v;
  spr(m.cl, dropL, 0, K, C, dt); spr(m.cr, dropR, 0, K, C, dt);
  const sway = Math.sin(t * 1.3 + E.node.seed * 5) * k("sway") * .22 + (dropL - dropR) * .25;
  spr(m.sx, sway, 0, K * .6, C * .8, dt);
  const legL = U * L("legs", .55, 1.05), hipW = U * L("hips", .16, .34), br = U * L("booty", .085, .2), squat = k("squat"), lean = k("lean");
  const hx = x0 + m.sx.p * U * .5, hy = y0 - legL * (1 - .38 * squat) + m.hip.p * U * .16;
  const w = Math.max(1.5, U * .045);
  // legs: feet planted wide, knees pushed out over the toes
  [-1, 1].forEach(sd => { const foot = [x0 + sd * hipW * 1.5, y0], hp = [hx + sd * hipW * .55, hy], kn = [lerp(foot[0], hp[0], .5) + sd * U * (.08 + .1 * squat), lerp(foot[1], hp[1], .5) + U * .02];
    limb(g, bend(foot, kn, [0, 0], 4).concat(bend(kn, hp, [0, 0], 4).slice(1)), hue + spread * 40, w);
    limb(g, [[foot[0] - sd * U * .01, foot[1]], [foot[0] + sd * U * .09, foot[1] + U * .01]], hue + spread * 40, w * .9); m["k" + sd] = kn; });
  // torso leans forward (away from us), so it looks shorter the more they bend
  const waist = [hx, hy - br * .55], tl = U * .5 * (1 - lean * .55), sh = [hx + m.sx.p * U * .2, waist[1] - tl], hw = hipW * .95;
  ribbonNeon(g, bend(waist, sh, [0, 0], 8), hue + spread * 70, f => U * (.07 - .02 * f), .75);
  // arms reach down to the knees: hands on knees
  [-1, 1].forEach(sd => { const s = [sh[0] + sd * hw, sh[1] + U * .03], kn = m["k" + sd], hand = [kn[0] + sd * U * .01, kn[1] - U * .03], el = joint(s, hand, U * .27, U * .27, sd > 0 ? -1 : 1);
    limb(g, bend(s, el, [0, 0], 4).concat(bend(el, hand, [0, 0], 4).slice(1)), hue + spread * 90, w * .8); sprite(g, hue + spread * 90, hand[0], hand[1], w * 1.4, .7); });
  limb(g, [[sh[0] - hw, sh[1] + U * .03], [sh[0] + hw, sh[1] + U * .03]], hue + spread * 70, w * .9);
  const hr = U * .085, head = [sh[0], sh[1] - hr * (1.1 - lean * .9)];
  sprite(g, hue + spread * 120, head[0], head[1], hr * 2.2, .4); g.fillStyle = hsl(hue + spread * 120, 100, 70, .35); g.beginPath(); g.arc(head[0], head[1], hr, 0, TAU); g.fill(); g.lineWidth = 1.5; g.strokeStyle = hsl(hue + spread * 120, 100, 80, .85); g.stroke();
  // the stars of the show
  const spots = [];
  [[-1, m.cl], [1, m.cr]].forEach(([sd, c]) => { const rel = clamp(c.p - m.hip.p, -.9, .9), vel = c.v - m.hip.v, sq = clamp(1 + vel * .025, .78, 1.25), ry = br * sq, rx = br * 1.02 / Math.sqrt(sq);
    const cx = hx + sd * br * .8 + m.sx.p * U * .06 * sd, cy = hy + rel * U * .2; cheekBall(g, cx, cy, rx, ry, hue + (sd > 0 ? spread * 25 : 0), L("glow", .3, 1.6)); spots.push([cx, cy, br]); });
  return { spots, vel: hv };
}

const BOOTY = { key: "booty", name: "Bubble booty", fade: 1, char: "anchored",
  init: () => ({ m: bootyState() }),
  shape: [
    { key: "per", label: "Twerks per beat", min: 1, max: 4, def: 1 / 3, grp: "Dance" }, { key: "bounce", label: "Bounce", def: .6, grp: "Dance" }, { key: "jiggle", label: "Jiggle", def: .65, grp: "Dance" },
    { key: "wobble", label: "Wobble time", def: .6, grp: "Dance" }, { key: "alt", label: "Cheek independence", def: .25, grp: "Dance" }, { key: "sharp", label: "Snap", def: .6, grp: "Dance" }, { key: "sway", label: "Sway", def: .35, grp: "Dance" },
    { key: "booty", label: "Booty size", def: .6, grp: "Body" }, { key: "hips", label: "Hip width", def: .5, grp: "Body" }, { key: "legs", label: "Leg length", def: .5, grp: "Body" }, { key: "squat", label: "Squat", def: .55, grp: "Body" }, { key: "lean", label: "Lean forward", def: .5, grp: "Body" },
    { key: "ripples", label: "Ripples", def: .6, grp: "Extras" }, { key: "lines", label: "Motion lines", def: .5, grp: "Extras" }, { key: "sweat", label: "Sweat drops", def: .25, grp: "Extras" }, { key: "sparkle", label: "Sparkles", def: .3, grp: "Extras" }, { key: "spread", label: "Color spread", def: .35, grp: "Extras" }, { key: "glow", label: "Glow", def: .5, grp: "Extras" }],
  draw(E) { const { n, S, st, R, I, k } = E, gap = twBeat(E, st), ph = st.since * I("per") / gap;
    const out = drawBooty(E, st.m, n.x, n.y, S * .5, n.hue, k("spread"), ph, twAmp(E, st));
    twExtras(E, st, out.spots, n.hue, out.vel); } };

const CREW = { key: "crew", name: "Backup crew", fade: 1, char: "anchored",
  init: () => ({ ms: [] }),
  shape: [
    { key: "count", label: "Dancers", min: 2, max: 9, def: 3 / 7, grp: "Crew" }, { key: "spacing", label: "Spacing", def: .55, grp: "Crew" }, { key: "lag", label: "Wave delay", def: .4, grp: "Crew" }, { key: "dir", label: "Wave direction", min: 0, max: 2, def: 0, fmt: v => ["Left to right", "Right to left", "From the middle"][v], grp: "Crew" },
    { key: "hype", label: "Double time when loud", def: .5, grp: "Crew" }, { key: "mix", label: "Mixed heights", def: .35, grp: "Crew" },
    { key: "per", label: "Twerks per beat", min: 1, max: 4, def: 1 / 3, grp: "Dance" }, { key: "bounce", label: "Bounce", def: .6, grp: "Dance" }, { key: "jiggle", label: "Jiggle", def: .65, grp: "Dance" }, { key: "wobble", label: "Wobble time", def: .6, grp: "Dance" },
    { key: "alt", label: "Cheek independence", def: .25, grp: "Dance" }, { key: "sharp", label: "Snap", def: .6, grp: "Dance" }, { key: "sway", label: "Sway", def: .3, grp: "Dance" },
    { key: "booty", label: "Booty size", def: .6, grp: "Body" }, { key: "hips", label: "Hip width", def: .5, grp: "Body" }, { key: "legs", label: "Leg length", def: .5, grp: "Body" }, { key: "squat", label: "Squat", def: .55, grp: "Body" }, { key: "lean", label: "Lean forward", def: .5, grp: "Body" },
    { key: "ripples", label: "Ripples", def: .4, grp: "Extras" }, { key: "lines", label: "Motion lines", def: .3, grp: "Extras" }, { key: "sweat", label: "Sweat drops", def: .15, grp: "Extras" }, { key: "sparkle", label: "Sparkles", def: .15, grp: "Extras" }, { key: "spread", label: "Color spread", def: .6, grp: "Extras" }, { key: "glow", label: "Glow", def: .45, grp: "Extras" }],
  draw(E) { const { n, S, st, R, I, k, W } = E, gap = twBeat(E, st), cnt = I("count");
    while (st.ms.length < cnt) st.ms.push(bootyState()); st.ms.length = cnt;
    const loud = R.rms > .55 ? 1 : 0; st.dbl = lerp(st.dbl || 0, loud * k("hype"), E.dt * 3);
    const rate = I("per") / gap * (1 + (st.dbl > .5 ? 1 : 0)), dir = I("dir"), span = Math.min(W * .74, S * (.3 + .3 * cnt) * lerp(.55, 1.4, k("spacing"))), amp = twAmp(E, st), spread = k("spread");
    let all = [], vmax = 0;
    st.ms.forEach((m, i) => { const u = cnt > 1 ? i / (cnt - 1) : .5, x = n.x + (u - .5) * span, order = dir === 0 ? u : dir === 1 ? 1 - u : Math.abs(u - .5) * 2;
      const sc = 1 - k("mix") * .35 * seeded(i * 5.7 + 2), U = Math.min(S * .5, span / Math.max(1, cnt - 1) * .95) * sc, hue = n.hue + (u - .5) * spread * 220;
      const out = drawBooty(E, m, x, n.y, U, hue, spread * .4, st.since * rate - order * k("lag") * 1.5, amp);
      all = all.concat(out.spots); vmax = Math.max(vmax, Math.abs(out.vel)); });
    twExtras(E, st, all, n.hue, vmax); } };

// ---- neon line dancer: side view, outline only, rubbery hip pops ----
const LINER = { key: "liner", name: "Neon line dancer", fade: 1, char: "anchored",
  init: () => ({ hip: sp0(), hx: sp0(), bt: sp0(), btx: sp0() }),
  shape: [
    { key: "per", label: "Twerks per beat", min: 1, max: 4, def: 1 / 3, grp: "Dance" }, { key: "bounce", label: "Bounce", def: .65, grp: "Dance" }, { key: "rubber", label: "Rubberiness", def: .6, grp: "Dance" }, { key: "jiggle", label: "Jiggle", def: .6, grp: "Dance" },
    { key: "wobble", label: "Wobble time", def: .55, grp: "Dance" }, { key: "sharp", label: "Snap", def: .6, grp: "Dance" }, { key: "back", label: "Push back", def: .5, grp: "Dance" }, { key: "nod", label: "Head bob", def: .5, grp: "Dance" },
    { key: "facing", label: "Facing", min: 0, max: 1, def: 0, fmt: v => ["Right", "Left"][v], grp: "Body" }, { key: "booty", label: "Booty size", def: .55, grp: "Body" }, { key: "legs", label: "Leg length", def: .5, grp: "Body" }, { key: "squat", label: "Squat", def: .6, grp: "Body" }, { key: "lean", label: "Lean forward", def: .55, grp: "Body" }, { key: "line", label: "Line weight", def: .45, grp: "Body" },
    { key: "ripples", label: "Ripples", def: .4, grp: "Extras" }, { key: "lines", label: "Motion lines", def: .7, grp: "Extras" }, { key: "sweat", label: "Sweat drops", def: .3, grp: "Extras" }, { key: "sparkle", label: "Sparkles", def: .25, grp: "Extras" }, { key: "spread", label: "Color spread", def: .3, grp: "Extras" }, { key: "glow", label: "Glow", def: .5, grp: "Extras" }],
  draw(E) { const { g, n, S, st, dt, t, I, k, L } = E, gap = twBeat(E, st), ph = st.since * I("per") / gap, amp = twAmp(E, st), { K, C } = twSprings(E);
    const drop = popCurve(ph, k("sharp")) * amp, z = L("rubber", .6, .12), KH = 700;
    spr(st.hip, drop, 0, KH, 2 * z * Math.sqrt(KH), dt); spr(st.hx, drop * L("back", .2, 1.4), 0, KH * .8, 2 * z * Math.sqrt(KH * .8), dt);
    spr(st.bt, st.hip.p, 0, K, C, dt); spr(st.btx, st.hx.p, 0, K * .8, C, dt);
    const U = S * .5, F = I("facing") ? -1 : 1, X = v => n.x + v * F, y0 = n.y, hue = n.hue, sp = k("spread"), w = U * L("line", .02, .06);
    const legL = U * L("legs", .55, 1.05), squat = k("squat"), lean = k("lean");
    const hip = [X(-U * (.08 + .1 * squat) - st.hx.p * U * .12), y0 - legL * (1 - .4 * squat) + st.hip.p * U * .14];
    const ankle = [X(U * .02), y0 - U * .02], knee = [X(U * (.17 + .07 * squat)), y0 - legL * .5 * (1 - .2 * squat)];
    limb(g, [[X(-U * .04), y0], [X(U * .14), y0]], hue + sp * 30, w);
    limb(g, bend(ankle, knee, [0, 0], 4).concat(bend(knee, hip, [0, 0], 4).slice(1)), hue + sp * 30, w);
    const ta = -Math.PI / 2 + F * lean * 1.15, tl = U * .5, sh = [hip[0] + Math.cos(ta) * tl, hip[1] + Math.sin(ta) * tl];
    limb(g, bend(hip, sh, [Math.cos(ta - F * Math.PI / 2) * U * .05, Math.sin(ta - F * Math.PI / 2) * U * .05], 10), hue + sp * 60, w);
    const hand = [knee[0] + F * U * .02, knee[1] - U * .02], el = joint(sh, hand, U * .27, U * .27, F > 0 ? 1 : -1);
    limb(g, bend(sh, el, [0, 0], 4).concat(bend(el, hand, [0, 0], 4).slice(1)), hue + sp * 90, w * .9);
    const nod = Math.sin(ph * TAU) * k("nod") * .25, hr = U * .085, ha = ta + F * nod, head = [sh[0] + Math.cos(ha) * hr * 1.5, sh[1] + Math.sin(ha) * hr * 1.5];
    g.lineWidth = w * .9; g.strokeStyle = hsl(hue + sp * 120, 100, 78, .9); g.beginPath(); g.arc(head[0], head[1], hr, 0, TAU); g.stroke(); sprite(g, hue + sp * 120, head[0], head[1], hr * 2.2, .3 * L("glow", .3, 1.6));
    // the booty: an outline bulging out behind the hip that jiggles and ripples
    const br = U * L("booty", .1, .22), rel = clamp(st.bt.p - st.hip.p, -1, 1), relx = clamp(st.btx.p - st.hx.p, -1, 1), td = [Math.cos(ta), Math.sin(ta)], kl = Math.hypot(knee[0] - hip[0], knee[1] - hip[1]) || 1, kd = [(knee[0] - hip[0]) / kl, (knee[1] - hip[1]) / kl];
    const A = [hip[0] + td[0] * br * 1.4, hip[1] + td[1] * br * 1.4], B = [hip[0] + kd[0] * br * .8, hip[1] + kd[1] * br * .8 + br * .25], bul = br * (2.1 + .5 * relx), dy = rel * U * .09;
    const c1 = [A[0] - F * bul, A[1] + dy * .5], c2 = [B[0] - F * bul, B[1] + br * .3 + dy], pts = [];
    for (let i = 0; i <= 28; i++) { const u = i / 28, v = 1 - u, x = v * v * v * A[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * B[0], y = v * v * v * A[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * B[1];
      const rip = Math.min(1, Math.abs(rel) * 1.5) * br * .07 * Math.sin(u * 10 - t * 16) * Math.sin(u * Math.PI); pts.push([x - F * rip, y]); }
    const cx = (A[0] + B[0]) / 2 - F * bul * .6, cy = (A[1] + B[1]) / 2 + dy * .6;
    ribbonNeon(g, pts, hue + sp * 15, () => w * 1.1, .95);
    twExtras(E, st, [[cx, cy, br]], hue, st.hip.v); } };

// ---- jelly bean: a squishy bean that squats and springs; its back end jiggles like gelatin ----
const JELLY = { key: "jelly", name: "Jelly bean", fade: 1, char: "anchored",
  init: () => ({ sq: sp0(), jig: sp0(), tilt: sp0(), wave: 0 }),
  shape: [
    { key: "per", label: "Twerks per beat", min: 1, max: 4, def: 1 / 3, grp: "Dance" }, { key: "bounce", label: "Squish", def: .6, grp: "Dance" }, { key: "jiggle", label: "Jiggle", def: .7, grp: "Dance" }, { key: "wobble", label: "Wobble time", def: .7, grp: "Dance" },
    { key: "sharp", label: "Snap", def: .5, grp: "Dance" }, { key: "tiltk", label: "Tip forward", def: .5, grp: "Dance" }, { key: "ripk", label: "Ripple waves", def: .6, grp: "Dance" },
    { key: "facing", label: "Facing", min: 0, max: 1, def: 0, fmt: v => ["Right", "Left"][v], grp: "Body" }, { key: "plump", label: "Plumpness", def: .5, grp: "Body" }, { key: "booty", label: "Booty bump", def: .6, grp: "Body" }, { key: "legs", label: "Leg length", def: .4, grp: "Body" }, { key: "arms", label: "Tiny arms", def: .5, grp: "Body" }, { key: "bubbles", label: "Bubbles inside", def: .5, grp: "Body" },
    { key: "ripples", label: "Ripples", def: .3, grp: "Extras" }, { key: "lines", label: "Motion lines", def: .4, grp: "Extras" }, { key: "sweat", label: "Sweat drops", def: .2, grp: "Extras" }, { key: "sparkle", label: "Sparkles", def: .35, grp: "Extras" }, { key: "spread", label: "Color spread", def: .3, grp: "Extras" }, { key: "glow", label: "Glow", def: .55, grp: "Extras" }],
  draw(E) { const { g, n, S, st, dt, t, I, k, L } = E, gap = twBeat(E, st), ph = st.since * I("per") / gap, amp = twAmp(E, st), { K, C } = twSprings(E);
    const drop = popCurve(ph, k("sharp")) * amp; spr(st.sq, drop, 0, 600, 2 * .3 * Math.sqrt(600), dt); spr(st.jig, st.sq.p, 0, K, C, dt); spr(st.tilt, drop * k("tiltk"), 0, 300, 2 * .4 * Math.sqrt(300), dt);
    const rel = st.jig.p - st.sq.p; st.wave += dt * (6 + 10 * Math.abs(st.jig.v));
    const U = S * .5, F = I("facing") ? -1 : 1, hue = n.hue, sp = k("spread"), legH = U * L("legs", .05, .3), sq = clamp(st.sq.p, -.6, 1.4);
    const rx = U * L("plump", .26, .46) * (1 + sq * .22), ry = U * .38 * (1 - sq * .25), cx = n.x, cy = n.y - legH - ry, tilt = F * st.tilt.p * .45, bump = L("booty", 0, .5), rk = k("ripk");
    // legs and tiny arms
    [-1, 1].forEach(sd => { const top = [cx + sd * rx * .35, cy + ry * .85], foot = [cx + sd * rx * .45 + F * U * .03, n.y]; limb(g, bend(top, foot, [-sd * U * .03 * sq, 0], 6), hue + sp * 40, U * .04); limb(g, [foot, [foot[0] + F * U * .07, foot[1]]], hue + sp * 40, U * .035); });
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, ca = Math.cos(a), sa = Math.sin(a), back = Math.max(0, -ca * F);
      let r = 1 - .1 * Math.max(0, ca * F) * Math.max(0, -sa) ; // kidney dent at the front top
      r += bump * Math.pow(back, 2) * Math.max(0, sa + .3); // the booty bump low at the back
      r += back * (rel * .35 + rk * .06 * Math.sin(a * 5 - st.wave) * Math.min(1, Math.abs(rel) * 3 + .15));
      const x = ca * rx * r, y = sa * ry * r, xr = x * Math.cos(tilt) - y * Math.sin(tilt), yr = x * Math.sin(tilt) + y * Math.cos(tilt); pts.push([cx + xr, cy + yr]); }
    sprite(g, hue, cx, cy, Math.max(rx, ry) * 2.2, .3 * L("glow", .3, 1.6));
    const gr = g.createRadialGradient(cx - F * rx * .3, cy - ry * .4, rx * .1, cx, cy, rx * 1.3); gr.addColorStop(0, hsl(hue + sp * 30, 100, 80, .55)); gr.addColorStop(.6, hsl(hue, 100, 55, .3)); gr.addColorStop(1, hsl(hue - sp * 30, 100, 45, .15));
    g.fillStyle = gr; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill();
    g.lineWidth = Math.max(1.5, U * .025); g.strokeStyle = hsl(hue, 100, 78, .9); g.stroke();
    g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.ellipse(cx + F * rx * .25, cy - ry * .55, rx * .22, ry * .09, F * -.3, 0, TAU); g.fill();
    const nb = Math.round(k("bubbles") * 7); for (let j = 0; j < nb; j++) { const bx = cx + (seeded(j * 3.1) - .5) * rx * 1.1 + Math.sin(t * 1.5 + j) * rx * .05, by = cy + ((seeded(j * 7.7) + t * .15 + j * .13) % 1 - .5) * ry * 1.2, r = U * (.012 + .02 * seeded(j * 1.9));
      g.lineWidth = 1; g.strokeStyle = hsl(hue + sp * 60, 100, 85, .6); g.beginPath(); g.arc(bx, by, r, 0, TAU); g.stroke(); }
    const ar = k("arms"); if (ar > .03) [-1, 1].forEach(sd => { const s = [cx + F * rx * .55, cy + sd * ry * .1], e = [s[0] + F * U * .12 * ar, s[1] + U * .06 * ar + Math.sin(ph * TAU + sd) * U * .03]; limb(g, bend(s, e, [0, -U * .03], 6), hue + sp * 80, U * .03); });
    const butt = [cx - F * rx * (1 + bump * .4), cy + ry * .45];
    twExtras(E, st, [[butt[0], butt[1], ry * .45]], hue, st.sq.v); } };

[BOOTY, LINER, JELLY, CREW].forEach(f => { FORM[f.key] = f; });
