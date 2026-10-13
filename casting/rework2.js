/* ================= Round 2 reworks, from Kennedy's Forms notes (Oct 13) ================= */

/* ---- Firework (from Dust spray): bursts at random spots, bigger and more often when loud ---- */
const FW_KINDS = ["peony", "willow", "ring", "crossette", "glitter", "chrysanthemum"];
const FIREWORK = { key: "firework", name: "Firework", fade: .16, init: () => ({ ps: [], rockets: [], next: .4, hues: null }),
  shape: [{ key: "rate", label: "Launch rate" }, { key: "size", label: "Burst size" }, { key: "colors", label: "Color variety", def: .7 }, { key: "gravity", label: "Gravity" }, { key: "linger", label: "Linger" }, { key: "rockets", label: "Rocket trails", def: .6 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, k } = E, loud = loudOf(R), boom = Math.max(loud, R.kick * .8);
    const pickHue = () => n.hue + (Math.random() < k("colors") ? [0, 40, 160, 200, 290, 330][Math.floor(Math.random() * 6)] + (Math.random() - .5) * 30 : (Math.random() - .5) * 30);
    const burst = (x, y, scale) => { const kind = FW_KINDS[Math.floor(Math.random() * FW_KINDS.length)], hue = pickHue(), hue2 = pickHue(), N = Math.round((50 + 110 * scale) * (kind === "ring" ? .7 : 1)), sp = S * (.18 + .35 * scale) * L("size", .5, 1.6);
      for (let i = 0; i < N; i++) { const a = kind === "ring" ? i / N * TAU : Math.random() * TAU, v = sp * (kind === "ring" ? 1 : kind === "peony" ? .6 + .4 * Math.random() : .3 + .7 * Math.sqrt(Math.random()));
        const life = (kind === "willow" ? 2.6 : kind === "chrysanthemum" ? 1.8 : 1.3) * (.7 + .5 * Math.random()) * L("linger", .5, 1.8);
        st.ps.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * (kind === "ring" ? .55 : 1), life, max: life, h: i % 3 === 0 ? hue2 : hue, kind, split: kind === "crossette" ? .45 + Math.random() * .2 : 0, tw: Math.random() * 9 }); }
      st.flashes = (st.flashes || []).concat([{ x, y, a: 1, r: sp * .5, h: hue }]); };
    // launches: random spots and intervals; louder means more often, bigger, and finales of several at once
    st.next -= dt * L("rate", .4, 2.2) * (.35 + 2.6 * boom);
    if (st.next <= 0 || (E.beat && boom > .55 && Math.random() < .5)) { st.next = .5 + Math.random() * 1.6;
      const count = boom > .75 && Math.random() < .5 ? 2 + Math.floor(Math.random() * 3) : 1;
      for (let c = 0; c < count; c++) { const x = W * (.1 + Math.random() * .8), y = H * (.12 + Math.random() * .5), scale = clamp(.3 + boom * .9 + (Math.random() - .5) * .3, .2, 1.3);
        if (Math.random() < k("rockets")) st.rockets.push({ x: x + (Math.random() - .5) * W * .06, y: H * 1.02, tx: x, ty: y, t: 0, dur: .55 + Math.random() * .4, scale, h: pickHue() }); else burst(x, y, scale); } }
    g.lineCap = "round";
    for (let i = st.rockets.length - 1; i >= 0; i--) { const r = st.rockets[i]; r.t += dt / r.dur; const e = 1 - Math.pow(1 - Math.min(1, r.t), 2), x = lerp(r.x, r.tx, e), y = lerp(r.y, r.ty, e);
      g.lineWidth = 1.6; g.strokeStyle = hsl(r.h, 80, 80, .7); g.beginPath(); g.moveTo(lerp(r.x, r.tx, Math.max(0, e - .08)), lerp(r.y, r.ty, Math.max(0, e - .08))); g.lineTo(x, y); g.stroke(); sprite(g, r.h, x, y, S * .012, .9);
      if (r.t >= 1) { burst(r.tx, r.ty, r.scale); st.rockets.splice(i, 1); } }
    const grav = S * L("gravity", .05, .5), ps = st.ps;
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.life -= dt; if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      const drag = p.kind === "willow" ? 2.4 : 1.4; p.vx *= Math.exp(-drag * dt); p.vy *= Math.exp(-drag * dt); p.vy += grav * dt * (p.kind === "willow" ? 1.6 : 1);
      p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.split && p.max - p.life > p.split) { p.split = 0; for (let q = 0; q < 4; q++) { const a = q / 4 * TAU + Math.random(), v = S * .12; ps.push({ x: p.x, y: p.y, px: p.x, py: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .7, max: .7, h: p.h + 30, kind: "peony", split: 0, tw: 0 }); } p.life = 0; continue; }
      const f = p.life / p.max, tw = p.kind === "glitter" ? (Math.sin(p.tw + (p.max - p.life) * 30) > .2 ? 1 : .15) : 1, a = Math.min(1, f * 1.8) * tw;
      const lt = p.kind === "chrysanthemum" || p.kind === "willow" ? 60 + 25 * f : 55 + 35 * f;
      g.lineWidth = p.kind === "willow" ? 1.4 : 1.8; g.strokeStyle = hsl(p.h, 100, lt, a); g.beginPath(); g.moveTo(p.px, p.py); g.lineTo(p.x, p.y); g.stroke();
      if (f > .6 || p.kind === "glitter") sprite(g, p.h, p.x, p.y, S * .008 * (.5 + f), a * .8); }
    if (ps.length > 2600) ps.splice(0, ps.length - 2600);
    (st.flashes || []).forEach(fl => { fl.a -= dt * 4; if (fl.a > 0) sprite(g, fl.h, fl.x, fl.y, fl.r, fl.a * .35); });
    st.flashes = (st.flashes || []).filter(fl => fl.a > 0); } };

/* ---- Kaleidoscope: the folds now turn on their axis about a third of the time, either direction ---- */
const KALEIDO2 = Object.assign({}, FORM.kaleido, { key: "kaleido2", name: "Kaleidoscope", init: () => ({ phase: "hold", left: 2 + Math.random() * 2, rot: 0, dir: 1, v: 0 }),
  shape: FORM.kaleido.shape.concat([{ key: "turn", label: "Turn speed" }, { key: "turnShare", label: "Time spent turning", def: .33 }]),
  draw(E) { const { st, dt, L, k, R } = E;
    // alternate between holding still and turning; turning takes about a third of the time by default
    st.left -= dt; const share = clamp(k("turnShare"), .05, .95);
    if (st.left <= 0) { if (st.phase === "hold") { st.phase = "turn"; st.dir = Math.random() < .5 ? -1 : 1; st.left = (1.5 + Math.random() * 2) ; } else { st.phase = "hold"; st.left = (1.5 + Math.random() * 2) * (1 - share) / share; } }
    const target = st.phase === "turn" ? st.dir * L("turn", .2, 1.6) * (1 + loudOf(R)) : 0; st.v += (target - st.v) * Math.min(1, dt * 2.5); st.rot += st.v * dt;
    const t0 = E.t; E.t = st.rot / .12 * (E.node.seed > .5 ? 1 : -1); FORM.kaleido.draw(E); E.t = t0; } });

/* ---- Seaweed: iridescent bubbles in rotating pink, gold and champagne ---- */
const IRIS = [[330, 85, 72], [42, 90, 62], [38, 55, 82], [315, 70, 80]];
function iridescentBubble(g, x, y, r, a, ph) {
  const c = Math.cos(ph) * r, s = Math.sin(ph) * r, gr = g.createLinearGradient(x - c, y - s, x + c, y + s);
  IRIS.forEach(([h, sat, l], i) => gr.addColorStop(i / (IRIS.length - 1), hsl(h, sat, l, a)));
  g.fillStyle = gr; g.globalAlpha = .18; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1;
  g.lineWidth = Math.max(1, r * .14); g.strokeStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.lineWidth = Math.max(.8, r * .08); g.strokeStyle = `rgba(255,248,235,${a * .8})`; g.beginPath(); g.arc(x - r * .1, y - r * .1, r * .62, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
}
const SEAWEED2 = Object.assign({}, FORM.seaweed, { key: "seaweed2", name: "Seaweed", init: () => ({ b: [] }),
  shape: FORM.seaweed.shape.concat([{ key: "bubbles", label: "Bubbles" }, { key: "bsize", label: "Bubble size" }]),
  draw(E) { const { g, n, R, S, st, t, dt, L, I, k } = E, i = E.node.seed * 7, cnt = I("fronds"), sway = L("sway", .2, 2.1), lenK = L("length", .5, 1.8);
    for (let f = 0; f < cnt; f++) {
      const N = 26, seg = S * (.0085 + .003 * (f % 3)) * lenK, pts = [[n.x, n.y]], off = cnt > 1 ? f / (cnt - 1) - .5 : 0;
      let x = n.x, y = n.y, a = -Math.PI / 2 + off * 1.2;
      for (let kk = 1; kk <= N; kk++) { const u = kk / N; a += u * .1 * Math.sin(t * 1.5 - kk * .3 + f * 1.3 + i) * (1 + E2(R.energy)) * sway - n.vx * .00006; x += Math.cos(a) * seg; y += Math.sin(a) * seg; pts.push([x, y]); }
      ribbonNeon(g, pts, n.hue + f * 8, ff => S * .016 * (.35 + Math.sin(Math.PI * ff) * .7) * (1 - ff * .45), .55 + .3 * R.kick);
    }
    const rate = L("bubbles", .3, 2.5);
    if ((E.beat && Math.random() < .6) || Math.random() < dt * rate * (.3 + loudOf(R))) for (let b = 0; b < 1 + Math.floor(Math.random() * 3); b++) st.b.push({ x: n.x + (Math.random() - .5) * S * .12, y: n.y - S * .1 * lenK * Math.random(), r: S * (.008 + Math.random() * .016) * L("bsize", .6, 2.2), life: 3.2, ph: Math.random() * TAU, spin: (Math.random() < .5 ? -1 : 1) * (1 + Math.random() * 2), wob: Math.random() * 9 });
    for (let kk = st.b.length - 1; kk >= 0; kk--) { const b = st.b[kk]; b.life -= dt; if (b.life <= 0) { st.b.splice(kk, 1); continue; }
      b.y -= dt * S * (.12 + .08 * (b.r / S) * 30); b.x += Math.sin(t * 2 + b.wob) * dt * S * .03; b.ph += dt * b.spin;
      iridescentBubble(g, b.x, b.y, b.r * (1 + .04 * Math.sin(t * 6 + b.wob)), Math.min(1, b.life) * .9, b.ph); }
    if (st.b.length > 120) st.b.splice(0, st.b.length - 120);
    sprite(g, n.hue, n.x, n.y, S * .025, .7); } });

/* ---- Tornado: slower and smoother so each strand's path reads, with a dancing hourglass silhouette ---- */
const TORNADO2 = Object.assign({}, FORM.tornado, { key: "tornado2", name: "Tornado", init: () => ({ strands: [], ph: 0, w: 0 }),
  shape: [{ key: "flare", label: "Top width", def: .82 }, { key: "base", label: "Bottom width", def: 0 }, { key: "height", label: "Height" }, { key: "twist", label: "Twist", def: .83 },
    { key: "strands", label: "Strands", min: 2, max: 9, def: .2857 }, { key: "spin", label: "Spin speed", def: .3 }, { key: "cinch", label: "Waist cinch", def: .6 }, { key: "sway", label: "Body sway", def: .6 }],
  draw(E) { const { g, n, R, S, st, t, dt, L, I, k } = E, cnt = I("strands"), loud = loudOf(R);
    if (st.strands.length !== cnt) st.strands = Array.from({ length: cnt }, (_, i) => { const b = E.node.seed * 50 + i; return { dh: i * 360 / cnt, az: i / cnt * TAU + seeded(b) * .4, twist: .9 + seeded(b + 9) * .5, pitch: 1.1 + seeded(b + 19) * .5, dir: i % 2 ? -1 : 1, ph: seeded(b + 29) }; });
    // spin is integrated, so the music changes its speed smoothly instead of jumping the strands around
    st.ph += dt * L("spin", .1, 1.4) * (.5 + .6 * loud); st.w += dt * (.25 + .25 * loud);
    const bx = n.x, by = n.y, height = S * L("height", .45, 1.7), coneW = S * (.2 + .1 * E2(R.energy) + .06 * R.kick), flare = L("flare", .3, 2.1), base = L("base", .005, .35), tw = L("twist", .15, 1.9);
    const cinch = k("cinch"), swayK = L("sway", 0, 1.6), waistH = .42 + .1 * vnoise(st.w * .7 + 3), wst = st.w;
    // the silhouette: a cinched waist that drifts up and down, and a body that sways side to side in an S-curve
    const waist = h => 1 - cinch * .55 * Math.exp(-Math.pow((h - waistH) / .14, 2));
    const swayAt = h => (vnoise(wst * .9 + h * 1.6) * .6 + Math.sin(wst * 1.3 + h * 3.2) * .4) * coneW * .45 * swayK * h;
    st.strands.forEach(s => { const pts = [];
      for (let i = 0; i <= 90; i++) { const h = i / 90, ang = s.az + s.twist * tw * h * TAU * s.dir + st.ph * TAU * .35 * s.dir + Math.sin(st.w + h * 4 + s.ph * 9) * .2, r = coneW * (base + Math.pow(h, s.pitch) * flare) * waist(h);
        pts.push([bx + swayAt(h) + Math.cos(ang) * r, by - h * height + Math.sin(ang) * r * .28]); }
      const w = S * (.02 + .012 * R.kick); ribbonNeon(g, pts, n.hue + s.dh, f => w * (.25 + .75 * Math.min(1, f * 2.5)), .85); });
    spriteWhite(g, bx, by, S * (.07 + .04 * R.kick) * (1 + base * 2), .95); } });

/* ---- Boiling doodle: more shapes ---- */
const DOODLE_SHAPES = ["Flower", "Blob", "Spiral", "Heart", "Star", "Cloud", "Moon", "Teardrop", "Squiggle"];
const DOODLE2 = Object.assign({}, FORM.doodle, { key: "doodle2", name: "Boiling doodle",
  shape: [{ key: "kind", label: "Shape", min: 0, max: 8, def: .25, fmt: v => DOODLE_SHAPES[v] }, { key: "wobble", label: "Wobble", def: 1 }, { key: "size", label: "Size", def: 1 }, { key: "morph", label: "Change shape on the beat", def: 0 }],
  draw(E) { const { g, n, R, S, st, t, dt, L, I, k } = E;
    st.boil = (st.boil || 0) + dt; st.seed = st.seed || 0; if (st.boil > 1 / 9) { st.boil = 0; st.seed++; }
    if (st.kind == null) st.kind = I("kind");
    if (!st.lastPick || st.lastPick !== E.node.shape.kind) { st.kind = I("kind"); st.lastPick = E.node.shape.kind; }
    if (E.beat && Math.random() < k("morph")) st.kind = Math.floor(Math.random() * DOODLE_SHAPES.length);
    const kind = st.kind;
    g.lineCap = g.lineJoin = "round";
    const jit = S * .006 * (1 + R.hat * 2.5) * L("wobble", 0, 3), base = E.node.seed * 1e4, J = q => (seeded(st.seed * 97 + q + base) - .5) * jit * 2;
    const sz = S * (.08 + .05 * E2(R.energy)) * (1 + .35 * R.kick) * L("size", .45, 1.8), N = 64, pts = [];
    for (let q = 0; q <= N; q++) { const u = q / N; let x, y;
      if (kind === 0) { const a = u * TAU + t * .3, r = sz * (.62 + .38 * Math.cos(a * 5 - t * .4)); x = Math.cos(a) * r; y = Math.sin(a) * r; }
      else if (kind === 1) { const a = u * TAU - t * .3, r = sz * (.82 + .18 * Math.sin(a * 3 + t) + .08 * Math.sin(a * 7)); x = Math.cos(a) * r; y = Math.sin(a) * r; }
      else if (kind === 2) { const a = u * TAU * 2.4 + t, r = sz * (.12 + .88 * u); x = Math.cos(a) * r; y = Math.sin(a) * r; }
      else if (kind === 3) { const a = u * TAU; x = sz * .062 * 16 * Math.pow(Math.sin(a), 3); y = -sz * .062 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); }
      else if (kind === 4) { const v = Math.min(10, Math.floor(u * 10)), fr = u * 10 - v, a0 = v / 10 * TAU - Math.PI / 2 + t * .2, a1 = (v + 1) / 10 * TAU - Math.PI / 2 + t * .2, r0 = v % 2 ? .42 : 1, r1 = (v + 1) % 2 ? .42 : 1; x = lerp(Math.cos(a0) * r0, Math.cos(a1) * r1, fr) * sz; y = lerp(Math.sin(a0) * r0, Math.sin(a1) * r1, fr) * sz; }
      else if (kind === 5) { const a = u * TAU, r = sz * (.72 + .16 * Math.abs(Math.sin(a * 3.5 + t * .3))); x = Math.cos(a) * r * 1.25; y = Math.sin(a) * r * .8; }
      else if (kind === 6) { if (u < .5) { const b = lerp(.32 * Math.PI, 1.68 * Math.PI, u * 2); x = Math.cos(b) * sz; y = Math.sin(b) * sz; } else { const b = lerp(1.42 * Math.PI, .58 * Math.PI, (u - .5) * 2); x = sz * .48 + Math.cos(b) * sz * .82; y = Math.sin(b) * sz * .82; } }
      else if (kind === 7) { const a = u * TAU; x = sz * .75 * Math.sin(a) * Math.pow(Math.sin(a / 2), 1.2); y = -sz * Math.cos(a) * .95; }
      else { const a = u * TAU * 3; x = (u - .5) * sz * 2.4 + Math.cos(a) * sz * .32; y = Math.sin(a) * sz * .38 + Math.sin(u * TAU + t) * sz * .15; }
      pts.push([n.x + x + J(q * 3), n.y + y + J(q * 5 + 71)]); }
    g.lineWidth = 2.4; g.strokeStyle = hsl(n.hue, 100, 68, .9); strokePath(g, pts);
    g.lineWidth = 1; g.strokeStyle = hsl(n.hue, 50, 92, .5); strokePath(g, pts.map((p, q) => [p[0] + 1.5 + J(q + 900), p[1] - 1 + J(q + 700)])); } });

/* ---- Filigree vine: the color shifts slowly over time, so older lingering sketches contrast with new ones ---- */
const VINE2 = Object.assign({}, FORM.vine, { key: "vine2", name: "Filigree vine", init: () => ({ h: [], hc: 0 }),
  shape: FORM.vine.shape.concat([{ key: "cycle", label: "Color cycle", def: .3 }, { key: "span", label: "Color range", def: .6 }]),
  draw(E) { const { g, n, R, S, st, t, dt, L } = E, h = st.h, last = h[h.length - 1], max = Math.round(L("length", 50, 320));
    st.hc += dt * L("cycle", 0, 40);
    const hueNow = n.hue + Math.sin(st.hc * TAU / 360 * 2) * L("span", 0, 120);
    if (!last || Math.hypot(n.x - last[0], n.y - last[1]) > S * .004) h.push([n.x, n.y, hueNow]);
    while (h.length > max) h.shift();
    g.lineCap = g.lineJoin = "round";
    if (h.length >= 6) {
      [[3, .12], [1.2, .9]].forEach(([w, a]) => { g.lineWidth = w; for (let q = 1; q < h.length; q++) { g.strokeStyle = hsl(h[q][2], 90, 70, a); g.beginPath(); g.moveTo(h[q - 1][0], h[q - 1][1]); g.lineTo(h[q][0], h[q][1]); g.stroke(); } });
      const Ln = S * (.045 + .02 * E2(R.energy) + .02 * R.kick), curl = L("curl", .3, 1.9), ps = L("petal", .25, 2.1);
      for (let q = h.length - 1, kk = 0; q > 4; q -= 12, kk++) {
        const p = h[q], qq = h[q - 3], tang = Math.atan2(p[1] - qq[1], p[0] - qq[0]), side = kk % 2 ? 1 : -1, hue = p[2];
        const grow = Math.min(1, (h.length - 1 - q) / 24), len = Ln * grow * (1 - (h.length - 1 - q) / h.length * .45);
        if (len < 1) continue;
        const pts = []; let x = p[0], y = p[1], a = tang + side * 1.1;
        for (let u = 0; u <= 24; u++) { pts.push([x, y]); const f = u / 24; a += side * (.05 + f * f * .5) * curl * (1 + .25 * Math.sin(t * 2 + kk)); const sl = len / 24 * (1 - f * .6); x += Math.cos(a) * sl; y += Math.sin(a) * sl; }
        g.lineWidth = 1.4; g.strokeStyle = hsl(hue + 30, 95, 72, .75); strokePath(g, pts);
        g.save(); g.translate(pts[6][0], pts[6][1]); g.rotate(tang + side * 1.9);
        const pl = len * .5 * (1 + .4 * R.kick) * ps;
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(pl * .5, -pl * .45, pl, -pl * .1, pl * .8, pl * .25); g.bezierCurveTo(pl * .6, pl * .4, pl * .2, pl * .2, 0, 0);
        g.fillStyle = hsl(hue - 25, 100, 60, .3); g.fill(); g.lineWidth = 1; g.strokeStyle = hsl(hue - 25, 100, 82, .6); g.stroke();
        g.restore();
      }
      for (let q = 0; q < h.length; q += 5) { const tw = Math.pow(.5 + .5 * Math.sin(t * 7 - q * .25), 6); sprite(g, h[q][2] + 40, h[q][0], h[q][1], S * (.006 + .012 * tw), .25 + .75 * tw); }
    }
    sprite(g, hueNow, n.x, n.y, S * .035, .9); } });

const COMMON_P = { energy: 1, tempo: 1, chaos: .85, grace: .5, roam: .75, size: .55, trails: .6 };
REWORKS.push(
  { form: FIREWORK, from: "Dust spray", char: "anchored", hue: 330, p: { roam: .02, trails: .6 }, desc: "Bursts at random spots on the canvas: peony, willow, ring, crossette, glitter and chrysanthemum, in several colors. Louder music launches them more often, makes them bigger, and sets off finales of several at once." },
  { form: KALEIDO2, from: "Kaleidoscope", char: "follow", hue: 300, p: { chaos: 1, energy: 1, grace: 1, roam: 1, size: 1, tempo: 1, trails: 1 }, desc: "Your settings, and now the folds turn on their axis about a third of the time, clockwise or counterclockwise at random, holding still in between." },
  { form: SEAWEED2, from: "Seaweed", char: "anchored", hy: .92, hue: 300, p: { chaos: .12, energy: 1, grace: .5, roam: 0, size: .72, tempo: 1, trails: .29 }, desc: "Your settings, with iridescent bubbles: pink, gold and champagne gradients that turn as they rise." },
  { form: TORNADO2, from: "Tornado", char: "anchored", hy: .9, hue: 300, p: { chaos: .38, energy: .42, grace: 1, roam: .77, size: .17, tempo: 0, trails: .6 }, desc: "Starts from your settings, much slower and smoother so each strand's path reads. The silhouette dances: a cinched waist that drifts up and down and a body that sways side to side." },
  { form: DOODLE2, from: "Boiling doodle", char: "wallflower", hue: 300, p: COMMON_P, desc: "Your settings, with nine shapes now: flower, blob, spiral, heart, star, cloud, moon, teardrop and squiggle. Turn up \"Change shape on the beat\" to have it switch on its own." },
  { form: VINE2, from: "Filigree vine", char: "wander", hue: 300, p: COMMON_P, desc: "The color now drifts slowly through a range, so older lingering parts of the vine contrast with the new growth. (Your saved slider settings for this one didn't come through; re-save them here.)" }
);
[FIREWORK, KALEIDO2, SEAWEED2, TORNADO2, DOODLE2, VINE2].forEach(f => { FORM[f.key] = f; });
// Kennedy's keeps start from the settings they saved
Object.assign(FORM.cradle, { keepChar: "waltz", keepHue: 319, keepP: { chaos: .45, energy: 1, grace: 1, roam: .38, size: 1, tempo: 1, trails: 1 } });
FORM.cradle.shape.forEach(s => { if (s.key === "pluck") s.def = .47; if (s.key === "strings") s.def = 1; if (s.key === "tension") s.def = .98; });
Object.assign(FORM.tubeman, { keepChar: "anchored", keepHue: 300, keepP: Object.assign({}, COMMON_P, { roam: .14 }) });
FORM.tubeman.shape.forEach(s => { if (s.key === "flop") s.def = .13; if (s.key === "height") s.def = .23; });
Object.assign(FORM.doodle, { keepChar: "wallflower", keepHue: 300, keepP: COMMON_P });
FORM.doodle.shape.forEach(s => { if (s.key === "kind") s.def = 1; if (s.key === "size") s.def = 1; if (s.key === "wobble") s.def = 1; });

/* ---- Fiddlehead: animal silhouettes built from many curling fronds ---- */
// each frond: [x, y, angle, length, curl direction, curl amount]; positions and lengths are in body units (1 = Size)
const P2 = Math.PI;
const ANIMALS = {
  Octopus: [[-.04, 0, -P2 / 2 - .55, .55, 1, 1.15], [.04, 0, -P2 / 2 + .55, .55, -1, 1.15]].concat([-.3, -.21, -.12, -.04, .04, .12, .21, .3].map((x, i) => [x * .7, -.02, P2 / 2 + x * 1.5, .62 + .14 * Math.abs(Math.sin(i * 1.7)), x < 0 ? 1 : -1, .7 + .35 * (i % 3)])),
  Peacock: Array.from({ length: 11 }, (_, i) => { const u = i / 10; return [0, .15, -P2 * (.9 - .8 * u), .78 - .12 * Math.abs(u - .5), u < .5 ? -1 : 1, 1.1]; }).concat([[0, .38, -P2 / 2, .3, 1, .35], [0, .1, -P2 / 2, .22, -1, 2.2]]),
  Butterfly: [[0, -.02, -P2 * .82, .62, 1, 1.5], [0, -.02, -P2 * .18, .62, -1, 1.5], [0, .04, P2 * .78, .46, -1, 1.6], [0, .04, P2 * .22, .46, 1, 1.6], [0, -.1, -P2 * .6, .32, -1, 2.4], [0, -.1, -P2 * .4, .32, 1, 2.4], [0, -.1, P2 / 2, .32, 1, .1]],
  Seahorse: [[0, -.42, P2 / 2 + .35, 1.05, -1, 1.2], [0, -.42, -.15, .22, 1, .3], [0, -.44, -P2 / 2 - .2, .14, -1, 1.8], [.13, -.18, .1, .18, -1, 1.2], [.17, -.04, .05, .2, -1, 1.2], [.15, .1, 0, .16, -1, 1.2], [-.04, -.1, P2 * .85, .14, 1, 1.6]],
  Jellyfish: [[0, -.3, P2, .36, -1, .8], [0, -.3, 0, .36, 1, .8]].concat([-.27, -.16, -.06, .06, .16, .27].map((x, i) => [x, -.14, P2 / 2 + x * .4, .7 + .2 * (i % 2), i % 2 ? 1 : -1, .55])),
  Ram: [[-.12, -.2, -P2 / 2 - .6, .9, -1, 2.1], [.12, -.2, -P2 / 2 + .6, .9, 1, 2.1], [0, -.24, P2 / 2, .42, 1, .15], [-.1, -.12, P2 * .9, .18, -1, 1.6], [.1, -.12, P2 * .1, .18, 1, 1.6]]
};
const ANIMAL_NAMES = Object.keys(ANIMALS);
function frond(g, x, y, a, len, dirn, curlK, hue, w, leaf, t, seedOff) {
  const N = 40, pts = [];
  for (let u = 0; u <= N; u++) { pts.push([x, y]); const k = u / N; a += dirn * curlK * k * k * .55 + .01 * Math.sin(t * 3 + u * .3 + seedOff); x += Math.cos(a) * len / N; y += Math.sin(a) * len / N; }
  ribbonNeon(g, pts, hue, ff => w * (1 - ff * .75), .85);
  if (leaf > .02) { g.lineWidth = 1; g.strokeStyle = hsl(hue + 20, 100, 75, .55); g.beginPath();
    for (let u = 4; u < N - 4; u += 3) { const p = pts[u], q = pts[u + 1], ta = Math.atan2(q[1] - p[1], q[0] - p[0]), ll = len * .09 * leaf * (1 - u / N); [-1, 1].forEach(sd => { g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(ta + sd * 1.1) * ll, p[1] + Math.sin(ta + sd * 1.1) * ll); }); }
    g.stroke(); }
  return pts[N];
}
const FIDDLE2 = { key: "fiddle2", name: "Fiddlehead", fade: .3, init: () => ({ curl: 1, animal: null, pick: null }),
  shape: [{ key: "animal", label: "Animal", min: 0, max: ANIMAL_NAMES.length - 1, def: 0, fmt: v => ANIMAL_NAMES[v] }, { key: "size", label: "Size" }, { key: "curl", label: "Curl" }, { key: "leaf", label: "Leaflets" }, { key: "morph", label: "Change animal on the beat", def: 0 }],
  draw(E) { const { g, n, R, S, st, t, dt, L, I, k } = E, target = 1 - Math.min(.85, R.energy * .7);
    if (st.pick !== (E.node.shape && E.node.shape.animal)) { st.animal = ANIMAL_NAMES[I("animal")]; st.pick = E.node.shape && E.node.shape.animal; }
    if (!st.animal) st.animal = ANIMAL_NAMES[I("animal")];
    if (E.beat && Math.random() < k("morph")) st.animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
    if (E.beat) st.curl = Math.max(0, st.curl - .4);
    st.curl += (target - st.curl) * dt * 1.1;
    const body = S * .75 * L("size", .5, 1.6), curlK = L("curl", .3, 1.9), leaf = L("leaf", 0, 1.6), sway = Math.sin(t * .5 + E.node.seed * 7) * .08;
    g.lineCap = "round";
    ANIMALS[st.animal].forEach(([x, y, a, len, dirn, c], i) => {
      const bx = n.x + x * body, by = n.y + y * body, breath = 1 + .05 * Math.sin(t * 1.3 + i);
      frond(g, bx, by, a + sway * (i % 2 ? 1 : -1), len * body * breath, dirn, (.35 + .65 * st.curl) * curlK * c * 1.6, n.hue + i * 9, S * .011, leaf, t, i * 1.3);
    });
    sprite(g, n.hue, n.x, n.y, S * .025, .7); } };
REWORKS.push({ form: FIDDLE2, from: "Fiddlehead", char: "anchored", hue: 300, p: Object.assign({}, COMMON_P, { roam: .12 }), desc: "Animal silhouettes made of many curling fronds: octopus, peacock, butterfly, seahorse, jellyfish and ram. They unfurl as the music gets louder and snap back curled on the beat. Turn up \"Change animal on the beat\" to cycle." });
FORM.fiddle2 = FIDDLE2;
