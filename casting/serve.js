/* ---- Serve (Oct 21, 2026, Kennedy's request, built with the Fever Dream skill): a NYC ballroom dancer drawn as a lattice of
   hollow geometric facets (long kites for the torso and limbs, small diamonds for hands and feet, after Kennedy's reference).
   Elbows and knees are rigid (two-bone IK); wrists and ankles are rubber: the hands ride loose springs that lag, overshoot
   and settle, and flick to a new direction on the beat. Dances: Vogue (upright, arms thrown into randomized poses, bigger
   when loud), Duck walk (a low squat bouncing on every beat, feet kicked forward in turn, wrists flicking), Mix it up.
   Inside the figure: Prism facets (a light sweep crossing every facet, the limb that just moved flaring; facets split into
   finer diamonds when loud), Flick echoes (ghost diamonds tracing each hand's path) and Pose freeze (a dim stamp of the pose
   left behind on each kick). ---- */
const svEaseOut = x => 1 - Math.pow(1 - x, 3), svEaseIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function svPop(u, sharp) { u = frac(u); const a = lerp(.42, .12, sharp); return u < a ? 1 - svEaseOut(u / a) : svEaseIO((u - a) / (1 - a)); } // 1 at the beat, eases back to 0
function svSpr(s, target, K, C, dt) { const n = 4, h = dt / n; for (let i = 0; i < n; i++) { const a = K * (target - s.p) - C * s.v; s.v += a * h; s.p += s.v * h; } if (!isFinite(s.p) || Math.abs(s.p) > 1e4) { s.p = target; s.v = 0; } }
function svSpr2(s, tx, ty, K, C, dt) { svSpr(s.x, tx, K, C, dt); svSpr(s.y, ty, K, C, dt); }
const svS0 = () => ({ p: 0, v: 0 }), svS2 = () => ({ x: svS0(), y: svS0() });
function svJoint(a, b, len1, len2, side) { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(.001, Math.min(Math.hypot(dx, dy), len1 + len2 - .001)), ang = Math.atan2(dy, dx), c = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1), k = ang + side * Math.acos(c); return [a[0] + Math.cos(k) * len1, a[1] + Math.sin(k) * len1]; }
function svBeat(E, st) { st.since = (st.since ?? 9) + E.dt; if (E.beat) { if (st.since > .22 && st.since < 2.2) st.gap = lerp(st.gap ?? .5, st.since, .4); st.since = 0; st.beats = (st.beats || 0) + 1; st.hit = 1; } st.hit = Math.max(0, (st.hit || 0) - E.dt * 3); return clamp(st.gap ?? .5, .25, 1.8); }
const svAng = a => Math.atan2(Math.sin(a), Math.cos(a));
// vogue arm poses (in figure units, relative to the shoulder; x is outward for each arm, y down). Each returns [dx, dy] given reach.
const SV_POSES = [
  (r, L) => [[.1 * r, -1.1 * r], [.1 * r, -1.1 * r]],                       // both hands straight up
  (r, L) => [[1.05 * r, -.1], [1.05 * r, -.1]],                             // T: both out
  (r, L) => [[.95 * r, -.7 * r], [.3, .85 * r]],                             // one up-and-out, one down
  (r, L) => [[-.28, -.78], [-.28, -.78]],                                     // hands framing the face
  (r, L) => [[-.2, -.95], [-.2, -.95]],                                      // hands behind the head
  (r, L) => [[.85 * r, .5 * r], [-.1, -.8]],                                 // one out low, one up by the face
  (r, L) => [[-.3, .55], [-.3, .55]],                                        // hands on hips
  (r, L) => [[.4, -1.05 * r], [.7 * r, .6 * r]],                             // diagonal: one up, one low
  (r, L) => [[-.45, -.2], [-.45, -.2]],                                      // arms crossed over the chest
  (r, L) => [[1.0 * r, -.95 * r], [1.0 * r, -.95 * r]],                      // V: both up and out
  (r, L) => [[.15, .95], [-.05, -.75]],                                      // one hanging, one up by the head
  (r, L) => [[.95 * r, .15], [-.3, .5]],                                     // one out, one on the hip
];
const SERVE = { key: "serve", name: "Serve", fade: .55,
  init: () => ({ hands: [svS2(), svS2()], ha: [svS0(), svS0()], fa: [svS0(), svS0()], feet: [svS2(), svS2()], hip: svS2(), lean: svS0(), nod: svS0(), pose: -1, poseT: 0, hat: [0, 0], ht: [0, 0], ft: [0, 0], fl: [0, 0], trail: [[], []], freezes: [], prev: null, flare: {}, dCur: 1, dPrev: 1, dF: 1, tx: 0, dir: 1, sweep: 0, kickFoot: 0, cross: 0, crossT: 0, beats: 0, lastBeat: -1, duckArm: [[0, 0], [0, 0]], seed: Math.random() * 99 }),
  shape: [
    { key: "dance", label: "Dance", min: 0, max: 2, def: 0, fmt: i => ["Mix it up", "Vogue", "Duck walk"][i], grp: "Dance" },
    { key: "mixbars", label: "Switch dance every", min: 1, max: 8, def: 3 / 7, slide: true, fmt: v => v + (v > 1 ? " bars" : " bar"), grp: "Dance", when: g => g("dance") === 0 },
    { key: "posebeat", label: "New pose every", min: 0, max: 2, def: 0, fmt: i => ["Beat", "2 beats", "Bar"][i], grp: "Dance", when: g => g("dance") !== 2 },
    { key: "reach", label: "Reach", def: .7, grp: "Dance", when: g => g("dance") !== 2 },
    { key: "crosses", label: "Leg crosses", def: .5, grp: "Dance", when: g => g("dance") !== 2 },
    { key: "squat", label: "Squat depth", def: .6, grp: "Dance", when: g => g("dance") !== 1 },
    { key: "bounce", label: "Bounce", def: .6, grp: "Dance", when: g => g("dance") !== 1 },
    { key: "kick", label: "Kick", def: .65, grp: "Dance", when: g => g("dance") !== 1 },
    { key: "travel", label: "Where", min: 0, max: 1, def: 0, fmt: i => ["In place", "Across the stage"][i], grp: "Dance", when: g => g("dance") !== 1 },
    { key: "flicks", label: "Flicks per beat", min: 1, max: 4, def: 1 / 3, fmt: v => v + "×", grp: "Wrists" },
    { key: "wild", label: "Flick wildness", def: .7, grp: "Wrists" },
    { key: "rubber", label: "Rubber", def: .7, grp: "Wrists" },
    { key: "snap", label: "Snap", def: .6, grp: "Wrists" },
    { key: "stretch", label: "Stretch", def: .6, grp: "Wrists" },
    { key: "hand", label: "Hand size", def: .5, grp: "Wrists" },
    { key: "ankles", label: "Ankles too", def: .5, grp: "Wrists" },
    { key: "size", label: "Size", def: .5, grp: "Body" },
    { key: "width", label: "Limb width", def: .5, grp: "Body" },
    { key: "weight", label: "Line weight", def: .5, grp: "Body" },
    { key: "crest", label: "Crest", def: .35, grp: "Body" },
    { key: "prism", label: "Prism facets", def: .7, grp: "Inside" },
    { key: "sweep", label: "Sweep speed", def: .5, grp: "Inside", when: g => g("prism") > .02 },
    { key: "split", label: "Split when loud", def: .6, grp: "Inside", when: g => g("prism") > .02 },
    { key: "echo", label: "Flick echoes", def: .6, grp: "Inside" },
    { key: "echolen", label: "Echo length", def: .5, grp: "Inside", when: g => g("echo") > .02 },
    { key: "freeze", label: "Pose freeze", def: .5, grp: "Inside" },
    { key: "hold", label: "Freeze hold", min: 1, max: 8, def: 1 / 7, slide: true, fmt: v => v + (v > 1 ? " beats" : " beat"), grp: "Inside", when: g => g("freeze") > .02 },
    { key: "spread", label: "Color spread", def: .3, grp: "Extras" },
    { key: "glow", label: "Glow", def: .5, grp: "Extras" }],
  draw(E) {
    const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), gap = svBeat(E, st), ph = clamp(st.since / gap, 0, 1), newBeat = E.beat, bn = st.beats || 0;
    const H0 = S * L("size", .34, 1.0), lw = Math.max(1, H0 * .0045) * L("weight", .5, 2.2), hue = n.hue, spread = k("spread") * 90, glow = k("glow");
    const dsel = I("dance");
    // ---- which dance (Mix it up alternates every few bars, blended)
    if (dsel === 0) { if (newBeat && bn > 0 && bn % (I("mixbars") * 4) === 0 && st.lastBeat !== bn) { st.dPrev = st.dCur; st.dCur = st.dCur === 1 ? 2 : 1; st.dF = 0; st.lastBeat = bn; } }
    else { if (st.dCur !== dsel) { st.dPrev = st.dCur; st.dCur = dsel; st.dF = 0; } }
    st.dF = Math.min(1, st.dF + dt * 1.6); const mixF = svEaseIO(st.dF), duck = lerp(st.dPrev === 2 ? 1 : 0, st.dCur === 2 ? 1 : 0, mixF);
    // ---- travel (duck walk across the stage)
    if (I("travel") === 1 && duck > .01) { st.tx += st.dir * dt * H0 * .22 * duck * (.6 + .8 * loud); const lim = E.W * .5 - H0 * .35; if (st.tx > lim) { st.tx = lim; st.dir = -1; } if (st.tx < -lim) { st.tx = -lim; st.dir = 1; } } else st.tx += (0 - st.tx) * Math.min(1, dt * 2);
    const cx = n.x + st.tx, top = n.y - H0 * .5;
    // figure units: everything in multiples of H0, y down from the top of the head
    const U = H0, P = (x, y) => [cx + x * U, top + y * U];
    // ---- pose events: new vogue pose every Beat / 2 beats / Bar; duck-walk kick alternates feet every beat
    const every = [1, 2, 4][I("posebeat")];
    if (newBeat) { st.kickFoot = bn % 2; if (bn % every === 0) { let p = st.pose; while (p === st.pose) p = Math.floor(Math.random() * SV_POSES.length); st.pose = p; st.poseT = t; st.leanT = (Math.random() - .5) * .5; st.nodT = (Math.random() - .5) * .6; st.poseMirror = Math.random() < .5;
        if (Math.random() < k("crosses") * .6) { st.cross = Math.random() < .5 ? -1 : 1; st.crossT = t; } else if (Math.random() < .5) st.cross = 0; }
      for (let i = 0; i < 2; i++) { const a = st.duckArm[i]; a[0] = (Math.random() - .5) * .3; a[1] = (Math.random() - .5) * .3; if (bn % 4 === i * 2) a[0] += .8 * (Math.random() > .5 ? 1 : .2); } }
    if (st.pose < 0) { st.pose = 0; st.leanT = 0; st.nodT = 0; }
    // ---- flicks: the wrists snap to a new direction several times a beat; ankles on kicks
    const fpb = I("flicks"); st.fl ||= [0, 0]; const fphase = Math.floor(ph * fpb) + bn * fpb;
    for (let i = 0; i < 2; i++) { const fi = fphase + (i ? 0 : 0); if (fi !== st.fl[i] && (fpb > 1 || newBeat || st.fl[i] === 0)) { st.fl[i] = fi; const w = k("wild"), spin = (Math.random() - .5) * 2 * Math.PI * (.25 + .75 * w) * (.6 + .6 * loud); st.hat[i] = svAng(st.hat[i] + spin + (Math.random() < .3 ? Math.PI : 0)); } }
    if (newBeat) for (let i = 0; i < 2; i++) if (st.kickFoot === i || Math.random() < .3) st.ft[i] = (Math.random() - .5) * 1.6 * k("ankles");
    // ---- springs (the rubber): wrists loose, ankles a little stiffer
    const f0 = L("snap", 2.2, 7), K = Math.pow(TAU * f0, 2), z = L("rubber", .6, .05), C = 2 * z * Math.sqrt(K), Ka = Math.pow(TAU * f0 * .9, 2), Ca = 2 * Math.max(.12, z * 1.3) * Math.sqrt(Ka);
    // ---- pose targets for each dance (figure units)
    const lean = svSpr(st.lean, lerp(st.leanT * (1 - duck), .22, duck), 40, 9, dt) || st.lean.p, nod = (svSpr(st.nod, st.nodT * (1 - duck) + duck * .15 * Math.sin(t * 7), 60, 7, dt), st.nod.p);
    const sway = Math.sin(t * Math.PI / gap * .5) * .035 * (1 - duck) * (.5 + loud);
    const bounce = svPop(ph, .55) * L("bounce", .015, .075) * (.5 + .5 * Math.min(1, R.energy)) * (1 + .4 * R.kick);
    const squatY = lerp(.46, lerp(.54, .66, k("squat")), duck);
    const pelvis = [sway + (duck ? Math.sin(ph * TAU) * .012 * duck : 0), squatY + bounce * duck + bounce * .25 * (1 - duck)];
    svSpr2(st.hip, pelvis[0], pelvis[1], 900, 55, dt); const hipC = [st.hip.x.p, st.hip.y.p];
    const torso = .32, tA = -Math.PI / 2 + st.lean.p, shC = [hipC[0] + Math.cos(tA) * torso, hipC[1] + Math.sin(tA) * torso], nx = -Math.sin(tA), ny = Math.cos(tA);
    const shW = .1, hipW = .05, shL = [shC[0] - nx * shW, shC[1] - ny * shW], shR = [shC[0] + nx * shW, shC[1] + ny * shW], hipL = [hipC[0] - nx * hipW, hipC[1] - ny * hipW], hipR = [hipC[0] + nx * hipW, hipC[1] + ny * hipW];
    const neck = [shC[0] + Math.cos(tA) * .04, shC[1] + Math.sin(tA) * .04], hA = tA + st.nod.p, head = [neck[0] + Math.cos(hA) * .062, neck[1] + Math.sin(hA) * .062];
    // legs: vogue = planted with a weight shift and the odd cross; duck = wide squat, kicking feet
    const thigh = .225, shin = .225, feetT = [], kneeSide = [];
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, hp = i ? hipR : hipL;
      let vx = sd * .085 + (st.cross === sd ? -sd * .13 : 0) * svEaseIO(Math.min(1, (t - st.crossT) * 3)), vy = .905 + .0 * sway;
      const kickOn = st.kickFoot === i, kc = kickOn ? Math.sin(Math.PI * clamp(ph / .7, 0, 1)) : 0, kk = L("kick", .05, .3);
      let dx = sd * (.13 + .05 * loud) + kc * kk * sd * 1.1, dy = .92 - kc * kk * .9;
      feetT.push([lerp(vx, dx, duck), lerp(vy, dy, duck), lerp(1, 1 + kc * 1.2, duck), i]); kneeSide.push(lerp(st.cross === sd ? -sd : sd, -sd, duck)); }
    const ankles = feetT.map((f, i) => { svSpr2(st.feet[i], f[0], f[1], 500, 40, dt); return [st.feet[i].x.p, st.feet[i].y.p, f[2]]; });
    const knees = ankles.map((a, i) => svJoint(i ? hipR : hipL, a, thigh, shin, kneeSide[i] > 0 ? 1 : -1));
    // arms: vogue poses from the pool, scaled by reach and loudness; duck walk keeps elbows out and hands by the chest, flinging one out now and then
    const ua = .17, fa = .165, reach = L("reach", .55, 1.05) * (.7 + .5 * loud) * (1 + .25 * R.kick), pose = SV_POSES[st.pose](reach, loud), handT = [];
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sh = i ? shR : shL, pi = st.poseMirror ? 1 - i : i, pv = pose[pi], vx = sh[0] + sd * pv[0] * (ua + fa), vy = sh[1] + pv[1] * (ua + fa);
      const da = st.duckArm[i], dxh = sh[0] + sd * (.16 + da[0]) * (ua + fa) * .95, dyh = sh[1] + (.05 + da[1]) * (ua + fa) + .05 * Math.sin(t * 9 + i);
      handT.push([lerp(vx, dxh, duck), lerp(vy, dyh, duck)]); }
    const wrists = handT.map((h, i) => { svSpr2(st.hands[i], h[0], h[1], K, C, dt); return [st.hands[i].x.p, st.hands[i].y.p]; });
    const elbows = wrists.map((w, i) => svJoint(i ? shR : shL, w, ua, fa, i ? -1 : 1));
    // hand and foot angles ride their own springs (the flick itself)
    const hAng = [], fAng = [];
    for (let i = 0; i < 2; i++) { const fdir = Math.atan2(wrists[i][1] - elbows[i][1], wrists[i][0] - elbows[i][0]); const s = st.ha[i]; const tgt = fdir + st.hat[i] * (.5 + .5 * k("wild")); s.p = fdir + svAng(s.p - fdir); svSpr(s, tgt, K * 1.4, C * .8, dt); hAng.push(s);
      const sdir = Math.atan2(ankles[i][1] - knees[i][1], ankles[i][0] - knees[i][0]); const a = st.fa[i]; a.p = sdir + svAng(a.p - sdir); svSpr(a, sdir + st.ft[i] + lerp(-.2, .35, duck) * (i ? 1 : -1) * .5, Ka, Ca, dt); fAng.push(a); }
    // ---- velocities, for the prism flare and the echoes
    const J = { head, neck, shL, shR, hipL, hipR, hipC, shC, elbows, wrists, knees, ankles };
    const flare = {}, prev = st.prev; const vel = (key, p, q) => { if (!prev) return 0; const o = prev[key]; if (!o) return 0; return Math.hypot(p[0] - o[0], p[1] - o[1]) / Math.max(dt, 1e-3); };
    const vk = { ua0: vel("e0", elbows[0]), ua1: vel("e1", elbows[1]), fa0: vel("w0", wrists[0]), fa1: vel("w1", wrists[1]), th0: vel("k0", knees[0]), th1: vel("k1", knees[1]), sh0: vel("a0", ankles[0]), sh1: vel("a1", ankles[1]), torso: vel("sc", shC), head: vel("hd", head) };
    for (const key in vk) { st.flare[key] = Math.max((st.flare[key] || 0) * Math.max(0, 1 - dt * 4), Math.min(1, vk[key] * .55)); }
    st.prev = { e0: elbows[0], e1: elbows[1], w0: wrists[0], w1: wrists[1], k0: knees[0], k1: knees[1], a0: ankles[0], a1: ankles[1], sc: shC, hd: head };
    st.sweep += dt * L("sweep", .15, 1.6) * (1 + loud + 1.5 * R.kick);
    // ---- drawing the facets: hollow kites with a body (wide dim stroke under a thin bright one, a rim of light on one edge)
    const wBase = U * L("width", .02, .05), hs = U * L("hand", .035, .075);
    const kite = (A, B, w, bias) => { const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, nx2 = -dy / d, ny2 = dx / d, mx = A[0] + dx * bias, my = A[1] + dy * bias; return [A, [mx + nx2 * w, my + ny2 * w], B, [mx - nx2 * w, my - ny2 * w]]; };
    const poly = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
    const inkPoly = (pts, h, al, fl) => { poly(pts); g.fillStyle = hsl(h, 90, 50, (.06 + .12 * fl) * al); g.fill(); g.lineWidth = lw * 3.4; g.strokeStyle = hsl(h, 95, 60, .16 * al * (1 + fl)); g.stroke(); g.lineWidth = lw; g.strokeStyle = hsl(h, 95, 66 + 20 * fl, .92 * al); g.stroke();
      // rim light along the upper-left edge
      g.lineWidth = lw * .55; g.strokeStyle = hsl(h + 30, 100, 90, .55 * al); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); };
    const facet = (A, B, w, h, al, fl, bias = .42, inner = true) => { const pts = kite(A, B, w, bias); inkPoly(pts, h, al, fl);
      if (inner) { g.lineWidth = lw * .6; g.strokeStyle = hsl(h, 90, 70, .5 * al); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); }
      prism(pts, A, B, h, al, fl); return pts; };
    // prism: a band of light sweeping along the facet's axis, flaring with how fast the limb moved; loud = the facet splits into finer diamonds
    const prism = (pts, A, B, h, al, fl) => { const pr = k("prism"); if (pr < .02) return; g.save(); poly(pts); g.clip();
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, s = frac(st.sweep * .5 + (A[0] * .013 + A[1] * .007) / U), bx = A[0] + ux * d * s, by = A[1] + uy * d * s, bw = d * (.12 + .1 * fl);
      const gr = g.createLinearGradient(bx - ux * bw, by - uy * bw, bx + ux * bw, by + uy * bw); gr.addColorStop(0, hsl(h + 40, 100, 80, 0)); gr.addColorStop(.5, hsl(h + 40, 100, 88, (.35 + .6 * fl) * pr * al)); gr.addColorStop(1, hsl(h + 40, 100, 80, 0)); g.fillStyle = gr; g.fillRect(Math.min(...pts.map(p => p[0])) - 2, Math.min(...pts.map(p => p[1])) - 2, Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])) + 4, Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1])) + 4);
      const nsp = Math.round(k("split") * pr * (loud * 3.4 + R.kick * 1.5)); if (nsp > 0) { g.lineWidth = lw * .45; g.strokeStyle = hsl(h + 20, 95, 80, .5 * al); g.beginPath();
        for (let i = 1; i <= nsp; i++) { const f = i / (nsp + 1), q = [A[0] + dx * f, A[1] + dy * f]; const e = [pts[1], pts[3]][i % 2]; g.moveTo(q[0], q[1]); g.lineTo(e[0], e[1]); const e2 = [pts[3], pts[1]][i % 2]; g.moveTo(q[0], q[1]); g.lineTo(e2[0] * .5 + (i % 2 ? B : A)[0] * .5, e2[1] * .5 + (i % 2 ? B : A)[1] * .5); } g.stroke(); }
      g.restore(); };
    const diamond = (c, ang, len, wid, h, al, fl) => { const ux = Math.cos(ang), uy = Math.sin(ang), pts = [[c[0], c[1]], [c[0] + ux * len * .5 - uy * wid, c[1] + uy * len * .5 + ux * wid], [c[0] + ux * len, c[1] + uy * len], [c[0] + ux * len * .5 + uy * wid, c[1] + uy * len * .5 - ux * wid]]; inkPoly(pts, h, al, fl); g.lineWidth = lw * .55; g.strokeStyle = hsl(h, 90, 75, .5 * al); g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); return pts; };
    // the whole body from a joint set, so freezes and the live figure share one renderer
    const drawBody = (J, hA, fA, al, live) => { const hh = i => hue + spread * i; g.lineJoin = "round"; g.lineCap = "round"; const F = key => live ? (st.flare[key] || 0) : 0;
      // far pieces first: legs, then torso, then arms, then head
      for (let i = 0; i < 2; i++) { const hp = i ? J.hipR : J.hipL; facet(hp, J.knees[i], wBase * 1.25, hh(.5 + .3 * i), al, F("th" + i), .4); facet(J.knees[i], J.ankles[i], wBase * .95, hh(.8 + .3 * i), al, F("sh" + i), .45);
        const fs = J.ankles[i][2] || 1, a = fA[i]; diamond(J.ankles[i], a.p, hs * 1.1 * fs * (1 + k("stretch") * .25 * Math.min(2, Math.abs(a.v) * .15)), hs * .42 * fs, hh(1.2), al, F("sh" + i)); }
      // torso: a kite from the shoulders to the pelvis with a crossing and a spine
      { const tp = [J.shL, J.shR, J.hipR, J.hipL]; inkPoly(tp, hh(.2), al, F("torso")); g.lineWidth = lw * .6; g.strokeStyle = hsl(hh(.2), 90, 70, .5 * al); g.beginPath(); g.moveTo(J.shL[0], J.shL[1]); g.lineTo(J.hipR[0], J.hipR[1]); g.moveTo(J.shR[0], J.shR[1]); g.lineTo(J.hipL[0], J.hipL[1]); g.moveTo(J.shC[0], J.shC[1]); g.lineTo(J.hipC[0], J.hipC[1]); g.stroke(); prism(tp, J.shC, J.hipC, hh(.2), al, F("torso")); }
      for (let i = 0; i < 2; i++) { const sh = i ? J.shR : J.shL; facet(sh, J.elbows[i], wBase, hh(-.4 - .3 * i), al, F("ua" + i), .38); facet(J.elbows[i], J.wrists[i], wBase * .8, hh(-.7 - .3 * i), al, F("fa" + i), .45);
        const a = hA[i], st2 = 1 + k("stretch") * .5 * Math.min(2.5, Math.abs(a.v) * .12); diamond(J.wrists[i], a.p, hs * st2, hs * .45 / Math.sqrt(st2), hh(-1.1), al, F("fa" + i) + (live ? Math.min(1, Math.abs(a.v) * .08) : 0));
        if (live && glow > .02) sprite(g, hh(-1.1), J.wrists[i][0], J.wrists[i][1], hs * 1.6, (.12 + .5 * Math.min(1, Math.abs(a.v) * .06)) * glow * al); }
      // neck and head: a hollow oval, rim-lit, with a crest diamond on top
      g.lineWidth = lw * 1.6; g.strokeStyle = hsl(hh(0), 90, 62, .85 * al); g.beginPath(); g.moveTo(J.shC[0], J.shC[1]); g.lineTo(J.neck[0], J.neck[1]); g.stroke();
      const hr = U * .056, ha2 = Math.atan2(J.head[1] - J.neck[1], J.head[0] - J.neck[0]) + Math.PI / 2; g.save(); g.translate(J.head[0], J.head[1]); g.rotate(ha2); g.beginPath(); g.ellipse(0, 0, hr * .82, hr, 0, 0, TAU); g.fillStyle = hsl(hh(0), 90, 50, .08 * al); g.fill(); g.lineWidth = lw * 3.2; g.strokeStyle = hsl(hh(0), 95, 60, .16 * al); g.stroke(); g.lineWidth = lw; g.strokeStyle = hsl(hh(0), 95, 68, .92 * al); g.stroke(); g.lineWidth = lw * .55; g.strokeStyle = hsl(hh(0) + 30, 100, 90, .6 * al); g.beginPath(); g.ellipse(0, 0, hr * .82, hr, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
      if (k("crest") > .02) { const cl = hr * 2.2 * k("crest"); g.beginPath(); g.moveTo(-hr * .25, -hr * .95); g.lineTo(0, -hr - cl); g.lineTo(hr * .25, -hr * .95); g.lineTo(0, -hr * .7); g.closePath(); g.fillStyle = hsl(hh(0) + 20, 90, 55, .25 * al); g.fill(); g.lineWidth = lw; g.strokeStyle = hsl(hh(0) + 20, 95, 72, .9 * al); g.stroke(); }
      g.restore(); };
    // ---- screen-space joints (everything above is in figure units)
    const JS = { head: P(...head), neck: P(...neck), shL: P(...shL), shR: P(...shR), hipL: P(...hipL), hipR: P(...hipR), hipC: P(...hipC), shC: P(...shC), elbows: elbows.map(p => P(...p)), wrists: wrists.map(p => P(...p)), knees: knees.map(p => P(...p)), ankles: ankles.map(a => { const q = P(a[0], a[1]); q.push(a[2]); return q; }) };
    // ---- flick echoes: ghost diamonds tracing each hand, copies that drift and fade; more of them when loud
    if (k("echo") > .02) { const maxN = Math.round(L("echolen", 6, 40) * (.4 + .6 * loud + .4 * R.kick));
      for (let i = 0; i < 2; i++) { const tr = st.trail[i], a = hAng[i], w = JS.wrists[i]; if (Math.abs(a.v) > .6 || Math.hypot(st.hands[i].x.v, st.hands[i].y.v) > .35) tr.push({ x: w[0], y: w[1], a: a.p, age: 0, v: Math.min(3, Math.abs(a.v) * .1) }); while (tr.length > maxN) tr.shift();
        tr.forEach(e => e.age += dt); st.trail[i] = tr.filter(e => e.age < 1.1);
        st.trail[i].forEach((e, j) => { if (j % 3) return; const f = 1 - e.age / 1.1, al = f * f * .5 * k("echo"), sc = 1 + e.age * .9, ang = e.a + e.age * 1.6 * (i ? 1 : -1); const c = [e.x + Math.cos(ang) * e.age * U * .04, e.y + Math.sin(ang) * e.age * U * .04 - e.age * U * .02]; const ux = Math.cos(ang), uy = Math.sin(ang), len = hs * (1 + e.v * .4) * sc, wid = hs * .45 * sc; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + ux * len * .5 - uy * wid, c[1] + uy * len * .5 + ux * wid); g.lineTo(c[0] + ux * len, c[1] + uy * len); g.lineTo(c[0] + ux * len * .5 + uy * wid, c[1] + uy * len * .5 - ux * wid); g.closePath(); g.lineWidth = lw * .8; g.strokeStyle = hsl(hue - spread * 1.1 + e.age * 60, 95, 70, al); g.stroke(); }); } }
    else st.trail = [[], []];
    // ---- pose freezes: on each kick, stamp the pose; it stays dim for N beats then fades
    if (k("freeze") > .02 && newBeat && R.kick > .25) { st.freezes.push({ J: JSON.parse(JSON.stringify(JS)), hA: hAng.map(a => ({ p: a.p, v: 0 })), fA: fAng.map(a => ({ p: a.p, v: 0 })), age: 0 }); while (st.freezes.length > 5) st.freezes.shift(); }
    const holdS = I("hold") * gap; st.freezes.forEach(f => f.age += dt); st.freezes = st.freezes.filter(f => f.age < holdS);
    st.freezes.forEach(f => { const al = Math.pow(1 - f.age / holdS, 1.3) * .5 * k("freeze"); drawBody(f.J, f.hA, f.fA, al, false); });
    // ---- the live figure
    drawBody(JS, hAng, fAng, 1, true);
    if (glow > .02) sprite(g, hue, JS.head[0], JS.head[1], U * .07, .25 * glow * (1 + loud));
  } };
NEW_TRAITS.push({ form: SERVE, char: "anchored", hue: 20, hy: .5, p: { roam: 0, size: .5, trails: .5, energy: .9 }, desc: "A ballroom dancer drawn as hollow geometric facets. Vogues upright, throwing the arms into new poses on the beat, or duck walks low and bouncing with the feet kicked forward in turn; elbows and knees stay rigid while the wrists are pure rubber, flicking to new directions and overshooting. Light sweeps across every facet (splitting into finer diamonds when loud), the hands leave ghost diamonds behind, and each kick stamps a dim copy of the pose." });
FORM[SERVE.key] = SERVE;
