/* ---- Serve (Oct 21, 2026, Kennedy's request, built with the Fever Dream skill): a NYC ballroom dancer drawn as a lattice of
   hollow geometric facets (long kites for the torso and limbs, small diamonds for hands and feet, after Kennedy's reference).
   The skeleton is posed in 3D (x right, y down, z toward the room) and turned by a yaw angle, so the dancer can face the
   room, go to profile, show their back, spin, and roam the stage with perspective (nearer = bigger, farther = dimmer).
   Elbows and knees are rigid (two-bone IK with a pole direction); wrists and ankles are rubber: the hands ride loose springs
   that lag, overshoot and settle, and flick to a new direction on the beat. Dances: Vogue (upright, arms thrown into
   randomized poses, waist bending, back always arched), Duck walk (a low squat, knees forward and close, bouncing on every
   beat, feet kicked forward in turn), Mix it up. Inside: Prism facets, Flick echoes, Pose freeze. ---- */
const svEaseOut = x => 1 - Math.pow(1 - x, 3), svEaseIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function svPop(u, sharp) { u = frac(u); const a = lerp(.42, .12, sharp); return u < a ? 1 - svEaseOut(u / a) : svEaseIO((u - a) / (1 - a)); } // 1 at the beat, eases back to 0
function svSpr(s, target, K, C, dt) { const n = 4, h = dt / n; for (let i = 0; i < n; i++) { const a = K * (target - s.p) - C * s.v; s.v += a * h; s.p += s.v * h; } if (!isFinite(s.p) || Math.abs(s.p) > 1e4) { s.p = target; s.v = 0; } }
function svSpr3(s, t, K, C, dt) { svSpr(s.x, t[0], K, C, dt); svSpr(s.y, t[1], K, C, dt); svSpr(s.z, t[2], K, C, dt); }
const svS0 = () => ({ p: 0, v: 0 }), svS3 = () => ({ x: svS0(), y: svS0(), z: svS0() }), svP = s => [s.x.p, s.y.p, s.z.p];
const V3 = { add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len: a => Math.hypot(a[0], a[1], a[2]), mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mix: (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
// two-bone IK in 3D: the joint bends toward `pole`; returns the joint
function svIK(A, B, l1, l2, pole) { const d = V3.sub(B, A), dist = clamp(V3.len(d), .001, l1 + l2 - .001), dir = V3.norm(d), a = (l1 * l1 + dist * dist - l2 * l2) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let perp = V3.sub(pole, V3.mul(dir, V3.dot(pole, dir))); if (V3.len(perp) < 1e-4) perp = [dir[1], -dir[0], 0]; perp = V3.norm(perp); return V3.add(V3.add(A, dir, a), perp, h); }
function svBeat(E, st) { st.since = (st.since ?? 9) + E.dt; if (E.beat) { if (st.since > .22 && st.since < 2.2) st.gap = lerp(st.gap ?? .5, st.since, .4); st.since = 0; st.beats = (st.beats || 0) + 1; st.hit = 1; } st.hit = Math.max(0, (st.hit || 0) - E.dt * 3); return clamp(st.gap ?? .5, .25, 1.8); }
const svAng = a => Math.atan2(Math.sin(a), Math.cos(a));
// vogue arm poses, relative to each shoulder in local units (x outward, y down, z toward the room), scaled by reach where marked
const SV_POSES = [
  r => [[.1 * r, -1.1 * r, .05], [.1 * r, -1.1 * r, .05]],            // both straight up
  r => [[1.05 * r, -.1, .05], [1.05 * r, -.1, .05]],                  // T: both out
  r => [[.95 * r, -.7 * r, .1], [.3, .85 * r, .1]],                   // one up-and-out, one down
  r => [[-.28, -.78, .3], [-.28, -.78, .3]],                           // hands framing the face, in front
  r => [[-.2, -.95, -.25], [-.2, -.95, -.25]],                         // hands behind the head
  r => [[.85 * r, .5 * r, .15], [-.1, -.8, .3]],                       // one out low, one up by the face
  r => [[-.3, .55, -.05], [-.3, .55, -.05]],                           // hands on hips
  r => [[.4, -1.05 * r, .05], [.7 * r, .6 * r, .2]],                   // diagonal
  r => [[-.45, -.2, .3], [-.45, -.2, .3]],                             // arms crossed over the chest
  r => [[1.0 * r, -.95 * r, 0], [1.0 * r, -.95 * r, 0]],              // V: both up and out
  r => [[.15, .95, .05], [-.05, -.75, .3]],                            // one hanging, one up by the head
  r => [[.95 * r, .15, .1], [-.3, .5, -.05]],                          // one out, one on the hip
  r => [[.3, -.3, .9 * r], [.3, -.3, .9 * r]],                         // both reaching straight at the room
  r => [[.2, -1.0 * r, -.4], [.95 * r, -.2, .4]],                      // one up and back, one out and forward
];
const SV_FACES = [0, 0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI, 3 * Math.PI / 4, -3 * Math.PI / 4]; // front, 3/4s, profiles, back
const SERVE = { key: "serve", name: "Serve", fade: .55,
  init: () => ({ hands: [svS3(), svS3()], ha: [svS0(), svS0()], fa: [svS0(), svS0()], feet: [svS3(), svS3()], hip: svS3(), bend: svS3(), nod: svS0(), yaw: svS0(), pos: { x: svS0(), z: svS0() }, pose: -1, poseT: 0, hat: [0, 0], hdir: [1, -1], ft: [0, 0], fl: [0, 0], trail: [[], []], freezes: [], prev: null, flare: {}, dCur: 1, dPrev: 1, dF: 1, sweep: 0, kickFoot: 0, cross: 0, crossT: 0, lastBeat: -1, duckArm: [[0, 0], [0, 0]], face: 0, tgt: [0, 0], moving: 0, yawT: 0, spin: -9, bendT: [0, 0, 0], nodT: 0, leanT: 0 }),
  shape: [
    { key: "dance", label: "Dance", min: 0, max: 2, def: 0, fmt: i => ["Mix it up", "Vogue", "Duck walk"][i], grp: "Dance" },
    { key: "feel", label: "Tempo feel", min: 0, max: 3, def: 2 / 3, fmt: i => ["Double time", "On the beat", "Half time", "Quarter time"][i], grp: "Dance" },
    { key: "mixbars", label: "Switch dance every", min: 1, max: 8, def: 3 / 7, slide: true, fmt: v => v + (v > 1 ? " bars" : " bar"), grp: "Dance", when: g => g("dance") === 0 },
    { key: "posebeat", label: "New pose every", min: 0, max: 3, def: 0, fmt: i => ["Beat", "2 beats", "Bar", "2 bars"][i], grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "reach", label: "Reach", def: .7, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "posespeed", label: "Pose speed", def: .6, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "waist", label: "Waist bend", def: .5, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "lean", label: "Lean", def: 0.91, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "sway", label: "Hip sway", def: .5, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "vbounce", label: "Bounce", def: .3, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "crosses", label: "Leg crosses", def: .5, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "stance", label: "Stance width", def: 0.23, grp: "Vogue", when: g => g("dance") !== 2 },
    { key: "squat", label: "Squat depth", def: 0.06, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "bounce", label: "Bounce", def: 1, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "bsnap", label: "Bounce snap", def: 1, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "kicks", label: "Kicks per beat", min: 0, max: 2, def: .5, fmt: i => ["½×", "1×", "2×"][i], grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "kick", label: "Kick height", def: 0.74, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "kreach", label: "Kick reach", def: 1, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "knees", label: "Knee spread", def: 0, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "dlean", label: "Lean forward", def: 0.74, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "flings", label: "Arm flings", def: 1, grp: "Duck walk", when: g => g("dance") !== 1 },
    { key: "body", label: "Body type", def: 0.52, cfmt: v => v < .15 ? "Feminine" : v < .4 ? "Femme-leaning" : v < .6 ? "Androgynous" : v < .85 ? "Masc-leaning" : "Masculine", grp: "Body" },
    { key: "waistw", label: "Waist", def: 0.25, grp: "Body" },
    { key: "arch", label: "Back arch", def: 1, grp: "Body" },
    { key: "flicks", label: "Flicks per beat", min: 0, max: 5, def: .4, fmt: i => ["¼×", "½×", "1×", "2×", "3×", "4×"][i], grp: "Hands" },
    { key: "fdir", label: "Flick direction", min: 0, max: 3, def: 0, fmt: i => ["Anywhere", "Up and down", "Side to side", "Circles"][i], grp: "Hands" },
    { key: "wild", label: "Flick size", def: 0.99, grp: "Hands" },
    { key: "wspeed", label: "Wrist speed", def: .6, grp: "Hands" },
    { key: "rubber", label: "Rubber", def: 0.98, grp: "Hands" },
    { key: "stretch", label: "Stretch", def: 1, grp: "Hands" },
    { key: "hand", label: "Hand size", def: .5, grp: "Hands" },
    { key: "armlen", label: "Arm length", def: 0.91, grp: "Arms" },
    { key: "elbows", label: "Elbows out", def: 0.19, grp: "Arms" },
    { key: "armspeed", label: "Arm speed", def: 0.3, grp: "Arms" },
    { key: "armlag", label: "Arm lag", def: 0.74, grp: "Arms" },
    { key: "shoulders", label: "Shoulder width", def: 0.22, grp: "Arms" },
    { key: "leglen", label: "Leg length", def: 0.97, grp: "Legs" },
    { key: "hips", label: "Hip width", def: 0.31, grp: "Legs" },
    { key: "legspeed", label: "Leg speed", def: 0.2, grp: "Legs" },
    { key: "ankles", label: "Ankle flicks", def: .5, grp: "Legs" },
    { key: "foot", label: "Foot size", def: .5, grp: "Legs" },
    { key: "size", label: "Size", def: 0.65, grp: "Body" },
    { key: "width", label: "Limb width", def: 0.58, grp: "Body" },
    { key: "weight", label: "Line weight", def: 0.12, grp: "Body" },
    { key: "head", label: "Head size", def: 0.46, grp: "Body" },
    { key: "nod", label: "Head bob", def: 1, grp: "Body" },
    { key: "crest", label: "Hair crest", def: 0, grp: "Body" },
    { key: "roam", label: "Roam the stage", def: .5, grp: "Moving around" },
    { key: "walk", label: "Walk speed", def: .5, grp: "Moving around" },
    { key: "turns", label: "Turns", def: .6, grp: "Moving around" },
    { key: "turnspeed", label: "Turn speed", def: .5, grp: "Moving around" },
    { key: "spins", label: "Spins on big hits", def: .4, grp: "Moving around" },
    { key: "persp", label: "Perspective", def: .5, grp: "Moving around" },
    { key: "prism", label: "Prism facets", def: .7, grp: "Inside" },
    { key: "sweep", label: "Sweep speed", def: .5, grp: "Inside" },
    { key: "split", label: "Split when loud", def: .6, grp: "Inside" },
    { key: "echo", label: "Flick echoes", def: .6, grp: "Inside" },
    { key: "echolen", label: "Echo length", def: .5, grp: "Inside" },
    { key: "freeze", label: "Pose freeze", def: .5, grp: "Inside" },
    { key: "hold", label: "Freeze hold", min: 1, max: 8, def: 1 / 7, slide: true, fmt: v => v + (v > 1 ? " beats" : " beat"), grp: "Inside" },
    { key: "spread", label: "Color spread", def: .3, grp: "Extras" },
    { key: "glow", label: "Glow", def: .5, grp: "Extras" }],
  draw(E) {
    const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), gap0 = svBeat(E, st), ph0 = clamp(st.since / gap0, 0, 1), bn0 = st.beats || 0;
    // tempo feel: the dancer counts its own beat — double time subdivides the song's beat, half/quarter time stretch it
    const mult = [.5, 1, 2, 4][I("feel")], gap = gap0 * mult, vpos = (bn0 + ph0) / mult, bn = Math.floor(vpos), ph = vpos - bn, newBeat = bn !== (st.vb ?? -1); st.vb = bn;
    const H0 = S * L("size", .34, 1.0), U = H0, lw0 = Math.max(1, H0 * .0045) * L("weight", .5, 2.2), hue = n.hue, spread = k("spread") * 90, glow = k("glow");
    const dsel = I("dance"), bar = newBeat && bn > 0 && bn % 4 === 0;
    // ---- which dance (Mix it up alternates every few bars, blended)
    if (dsel === 0) { if (newBeat && bn > 0 && bn % (I("mixbars") * 4) === 0 && st.lastBeat !== bn) { st.dPrev = st.dCur; st.dCur = st.dCur === 1 ? 2 : 1; st.dF = 0; st.lastBeat = bn; } }
    else if (st.dCur !== dsel) { st.dPrev = st.dCur; st.dCur = dsel; st.dF = 0; }
    st.dF = Math.min(1, st.dF + dt * 1.6); const mixF = svEaseIO(st.dF), duck = lerp(st.dPrev === 2 ? 1 : 0, st.dCur === 2 ? 1 : 0, mixF);
    // ---- roaming the stage: a new spot every bar or so, walked to on a spring; facing follows the walk, otherwise a new facing is picked on bars
    const armL = L("armlen", .22, .5), roam = k("roam"), xr = Math.max(0, E.W * .5 / U - .2 - armL);
    if (bar && roam > .02 && Math.random() < .35 + .5 * roam) st.tgt = [(Math.random() * 2 - 1) * xr * roam, (Math.random() * 2 - 1) * .55 * roam];
    if (roam < .02) st.tgt = [0, 0];
    { const Kw = L("walk", 1.5, 40), Cw = 2 * .95 * Math.sqrt(Kw); svSpr(st.pos.x, st.tgt[0], Kw, Cw, dt); svSpr(st.pos.z, st.tgt[1], Kw, Cw, dt); }
    const vx = st.pos.x.v, vz = st.pos.z.v; st.moving = Math.hypot(vx, vz) > .12;
    // facing: yaw 0 looks at the room (+z), π is the back. While walking, face the way you go.
    if (st.moving) st.yawT = Math.atan2(vx, vz);
    else if (bar && Math.random() < k("turns") * .8) { let fc = st.face; while (fc === st.face) fc = Math.floor(Math.random() * SV_FACES.length); st.face = fc; st.yawT = SV_FACES[fc]; }
    if (newBeat && k("spins") > .02 && R.kick * (.6 + loud) > 1.1 - .7 * k("spins") && t - st.spin > 2.5) { st.spin = t; st.yawT += TAU * (Math.random() < .5 ? 1 : -1); }
    // the spring chases the nearest equivalent angle, except during a spin (which adds a whole turn on purpose)
    if (t - st.spin > .9) st.yawT = st.yaw.p + svAng(st.yawT - st.yaw.p); { const Ky = L("turnspeed", 2, 90); svSpr(st.yaw, st.yawT, Ky, 2 * .7 * Math.sqrt(Ky), dt); }
    const yaw = st.yaw.p, cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    // ---- pose events: vogue poses every Beat / 2 beats / Bar; the duck walk kicks alternate every beat
    const every = [1, 2, 4, 8][I("posebeat")];
    if (newBeat) { st.kickFoot = bn % 2; if (bn % every === 0) { let p = st.pose; while (p === st.pose) p = Math.floor(Math.random() * SV_POSES.length); st.pose = p; st.poseT = t; st.nodT = (Math.random() - .5) * .6 * k("nod") * 2; st.leanT = (Math.random() - .5) * .6 * k("lean") * 2; st.poseMirror = Math.random() < .5;
        st.bendT = [(Math.random() - .5) * .9, (Math.random() - .5) * .5, (Math.random() - .5) * 1.2]; // side bend, twist, forward bend
        if (Math.random() < k("crosses") * .6) { st.cross = Math.random() < .5 ? -1 : 1; st.crossT = t; } else if (Math.random() < .5) st.cross = 0; }
      for (let i = 0; i < 2; i++) { const a = st.duckArm[i]; a[0] = (Math.random() - .5) * .3; a[1] = (Math.random() - .5) * .3; if (bn % 4 === i * 2 && Math.random() < k("flings") * 1.4) a[0] += .8 * (Math.random() > .5 ? 1 : .35); } }
    if (st.pose < 0) { st.pose = 0; st.nodT = 0; }
    // ---- flicks
    const fpb = [.25, .5, 1, 2, 3, 4][I("flicks")], fphase = Math.floor((bn + ph) * fpb);
    const fmode = I("fdir"), frange = Math.PI * (.15 + .85 * k("wild")) * (.6 + .6 * loud);
    for (let i = 0; i < 2; i++) if (fphase !== st.fl[i]) { st.fl[i] = fphase; st.hdir[i] = -st.hdir[i];
      if (fmode === 0) st.hat[i] = { abs: false, a: svAng(st.hat[i].a + (Math.random() - .5) * 2 * frange + (Math.random() < .3 ? Math.PI : 0)) };
      else if (fmode === 1) st.hat[i] = { abs: true, a: -Math.PI / 2 + st.hdir[i] * frange * .5 + (Math.random() - .5) * .4 };
      else if (fmode === 2) st.hat[i] = { abs: true, a: (st.hdir[i] > 0 ? 0 : Math.PI) + (Math.random() - .5) * frange * .5 };
      else st.hat[i] = { abs: false, a: (st.hat[i].a || 0) + (i ? 1 : -1) * frange * .7 }; }
    for (let i = 0; i < 2; i++) if (typeof st.hat[i] !== "object") st.hat[i] = { abs: false, a: 0 };
    if (newBeat) for (let i = 0; i < 2; i++) if (st.kickFoot === i || Math.random() < .3) st.ft[i] = (Math.random() - .5) * 1.6 * k("ankles");
    const f0 = L("wspeed", .7, 7), K = Math.pow(TAU * f0, 2), zeta = L("rubber", .6, .05), C = 2 * zeta * Math.sqrt(K), Ka = Math.pow(TAU * f0 * .9, 2), Ca = 2 * Math.max(.12, zeta * 1.3) * Math.sqrt(Ka);
    const fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2), Carm = 2 * L("armlag", .9, .18) * Math.sqrt(Karm), fLeg = L("legspeed", .6, 6), Kleg = Math.pow(TAU * fLeg, 2), Cleg = 2 * .8 * Math.sqrt(Kleg);
    // ---- the skeleton in local space (figure units; x right, y down from the top of the head, z toward the room)
    const kpb = [.5, 1, 2][I("kicks")], bounce = svPop((bn + ph) * kpb, k("bsnap")) * L("bounce", .02, .16) * (.5 + .5 * Math.min(1, R.energy)) * (1 + .4 * R.kick), vb = svPop(ph, .4) * L("vbounce", 0, .05) * (.4 + .6 * loud);
    const legL = L("leglen", .36, .56), thigh = legL / 2, shin = legL / 2, floor = .46 + legL, squatY = lerp(.46 + (legL - .46), lerp(floor - .24, floor - .07, k("squat")), duck), sway = Math.sin(t * Math.PI / gap * .5) * L("sway", 0, .06) * (1 - duck) * (.5 + loud);
    svSpr3(st.hip, [sway, squatY + lerp(vb, bounce, duck), 0], 900, 55, dt); const hipC = svP(st.hip);
    // torso: pelvis → waist → chest. The back is always arched (pelvis tipped forward, chest lifted and carried back); vogue adds a waist bend on each pose
    const arch = L("arch", .25, 1), wb = k("waist") * (1 - duck); { const Kb = L("posespeed", 6, 90); svSpr3(st.bend, [st.bendT[0] * wb, st.bendT[1] * wb, st.bendT[2] * wb + st.leanT * (1 - duck) + L("dlean", .1, .7) * duck], Kb, 2 * .65 * Math.sqrt(Kb), dt); }
    const sideB = st.bend.x.p, twist = st.bend.y.p, fwdB = st.bend.z.p;
    const waist = V3.add(hipC, [sideB * .06, -.15, .05 * arch + fwdB * .04]);
    const chest = V3.add(waist, [sideB * .12, -.17 + .02 * Math.abs(fwdB), -.1 * arch + fwdB * .14]);
    const shDir = [Math.cos(twist * .6), 0, -Math.sin(twist * .6)], body = k("body"), shW = L("shoulders", .07, .14) * lerp(.8, 1.3, body), hipW = L("hips", .04, .08) * lerp(1.35, .7, body), wW = L("waistw", .02, .075) * lerp(.85, 1.15, body), shL = V3.add(chest, shDir, -shW), shR = V3.add(chest, shDir, shW), hipL = V3.add(hipC, [-hipW, 0, -.02 * arch]), hipR = V3.add(hipC, [hipW, 0, -.02 * arch]), waistL = V3.add(waist, shDir, -wW), waistR = V3.add(waist, shDir, wW);
    svSpr(st.nod, st.nodT * (1 - duck) + duck * .15 * Math.sin(t * TAU / gap) * k("nod"), 40, 7, dt);
    const neck = V3.add(chest, [sideB * .02, -.045, .02 * arch]), head = V3.add(neck, [sideB * .03 + st.nod.p * .03, -.062, .03 * arch + fwdB * .02]);
    // legs: vogue = planted, weight shifting, the odd cross; duck walk = squat with the knees forward and close, feet kicking forward in turn
    const feetT = [], poles = [], stance = L("stance", .05, .14);
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1;
      const crossF = st.cross === sd ? svEaseIO(Math.min(1, (t - st.crossT) * 3)) : 0, vx_ = sd * stance - sd * (stance + .045) * crossF, vz_ = crossF * .1;
      const kph = frac((bn + ph) * kpb), kfoot = Math.floor((bn + ph) * kpb) % 2, kickOn = kfoot === i, kc = kickOn ? Math.sin(Math.PI * clamp(kph / .7, 0, 1)) : 0;
      const dx_ = sd * (.05 + .03 * loud), dz_ = .08 + kc * L("kreach", .05, .4), dy_ = floor - kc * L("kick", .02, .22);
      feetT.push([lerp(vx_, dx_, duck), lerp(floor - .015, dy_, duck), lerp(vz_, dz_, duck), 1 + kc * .9 * duck]);
      // knee bend direction: vogue knees forward (the crossing leg's inward), duck walk knees forward and a touch out
      poles.push(V3.mix([sd * (crossF ? -.6 : .25), 0, 1], [sd * L("knees", .05, 1.2), 0, 1], duck)); }
    const ankles = feetT.map((ft, i) => { svSpr3(st.feet[i], ft, Kleg, Cleg, dt); const p = svP(st.feet[i]); p.push(ft[3]); return p; });
    const knees = ankles.map((a, i) => svIK(i ? hipR : hipL, a, thigh, shin, poles[i]));
    // arms
    const ua = armL * .51, fa = armL * .49, reach = L("reach", .5, 1.0) * (.7 + .4 * loud) * (1 + .15 * R.kick), pose = SV_POSES[st.pose](reach), handT = [];
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sh = i ? shR : shL, pv = pose[st.poseMirror ? 1 - i : i], vog = V3.add(sh, [sd * pv[0] * (ua + fa), pv[1] * (ua + fa), pv[2] * (ua + fa)]);
      const da = st.duckArm[i], dk = V3.add(sh, [sd * (.16 + da[0]) * (ua + fa) * .95, (.05 + da[1]) * (ua + fa) + .05 * Math.sin(t * TAU / gap * 2 + i), .12]);
      handT.push(V3.mix(vog, dk, duck)); }
    { const ps = L("posespeed", .15, 1.6); for (let i = 0; i < 2; i++) { const prevT = st.handPrev ? st.handPrev[i] : handT[i], u = Math.min(1, (t - st.poseT) * 3 * ps); if (!st.handFrom) st.handFrom = handT.map(h => h.slice()); if (st.poseT === t) st.handFrom[i] = prevT; handT[i] = V3.mix(st.handFrom[i], handT[i], svEaseIO(u)); } st.handPrev = handT.map(h => h.slice()); }
    // the hands chase their targets on a lagging spring, then are held within arm's length of the shoulder (no stretching off the body)
    const wrists = handT.map((h, i) => { const sh = i ? shR : shL, KK = lerp(Karm, K, k("rubber") * .35), CC = lerp(Carm, C, k("rubber") * .35); svSpr3(st.hands[i], h, KK, CC, dt); let w = svP(st.hands[i]); const d = V3.sub(w, sh), dl = V3.len(d); if (dl > ua + fa - .005) { w = V3.add(sh, d, (ua + fa - .005) / dl); st.hands[i].x.p = w[0]; st.hands[i].y.p = w[1]; st.hands[i].z.p = w[2]; } return w; });
    const eo = L("elbows", 0, 1), elbows = wrists.map((w, i) => svIK(i ? shR : shL, w, ua, fa, [(i ? 1 : -1) * (.1 + .9 * eo), .5 - .4 * eo, -.3 - .5 * eo]));
    // ---- world space: turn by yaw, move to the spot on the stage; then project with perspective
    const f = L("persp", 7, 2.2), px = st.pos.x.p, pz = st.pos.z.p;
    const proj = p => { const wx = p[0] * cy_ + p[2] * sy_ + px, wz = -p[0] * sy_ + p[2] * cy_ + pz, s = f / Math.max(.5, f - wz); return [n.x + wx * U * s, n.y + (p[1] - .5) * U * s, s, wz]; };
    const J = { head: proj(head), neck: proj(neck), shL: proj(shL), shR: proj(shR), chest: proj(chest), waist: proj(waist), hipL: proj(hipL), hipR: proj(hipR), hipC: proj(hipC), waistL: proj(waistL), waistR: proj(waistR), elbows: elbows.map(proj), wrists: wrists.map(proj), knees: knees.map(proj), ankles: ankles.map(a => { const q = proj(a); q.push(a[3]); return q; }), nose: proj(V3.add(head, [0, .01, .055])) };
    // hand and foot angles ride their own springs (the flick), in the screen plane
    const hAng = [], fAng = [];
    for (let i = 0; i < 2; i++) { const fdir = Math.atan2(J.wrists[i][1] - J.elbows[i][1], J.wrists[i][0] - J.elbows[i][0]), s = st.ha[i]; s.p = fdir + svAng(s.p - fdir); const ht = st.hat[i].abs ? st.hat[i].a : fdir + st.hat[i].a; s.p = ht + svAng(s.p - ht); svSpr(s, ht, K * 1.4, C * .8, dt); hAng.push(s);
      const sdir = Math.atan2(J.ankles[i][1] - J.knees[i][1], J.ankles[i][0] - J.knees[i][0]), a = st.fa[i]; a.p = sdir + svAng(a.p - sdir); svSpr(a, sdir + st.ft[i] + (i ? 1 : -1) * lerp(-.1, .3, duck) * .5 * Math.cos(yaw), Ka, Ca, dt); fAng.push(a); }
    // velocities → flare
    const prev = st.prev, vel = (key, p) => prev && prev[key] ? Math.hypot(p[0] - prev[key][0], p[1] - prev[key][1]) / Math.max(dt, 1e-3) / U : 0;
    const vk = { ua0: vel("e0", J.elbows[0]), ua1: vel("e1", J.elbows[1]), fa0: vel("w0", J.wrists[0]), fa1: vel("w1", J.wrists[1]), th0: vel("k0", J.knees[0]), th1: vel("k1", J.knees[1]), sh0: vel("a0", J.ankles[0]), sh1: vel("a1", J.ankles[1]), torso: vel("sc", J.chest), head: vel("hd", J.head) };
    for (const key in vk) st.flare[key] = Math.max((st.flare[key] || 0) * Math.max(0, 1 - dt * 4), Math.min(1, vk[key] * .55));
    st.prev = { e0: J.elbows[0], e1: J.elbows[1], w0: J.wrists[0], w1: J.wrists[1], k0: J.knees[0], k1: J.knees[1], a0: J.ankles[0], a1: J.ankles[1], sc: J.chest, hd: J.head };
    st.sweep += dt * L("sweep", .15, 1.6) * (1 + loud + 1.5 * R.kick);
    // ---- drawing: every piece is queued with its depth, then drawn far to near (far pieces dimmer and thinner)
    const wBase = U * L("width", .02, .05), hs0 = U * L("hand", .035, .075);
    const kite = (A, B, w, bias) => { const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, nx2 = -dy / d, ny2 = dx / d, mx = A[0] + dx * bias, my = A[1] + dy * bias; return [A, [mx + nx2 * w, my + ny2 * w], B, [mx - nx2 * w, my - ny2 * w]]; };
    const poly = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
    const inkPoly = (pts, h, al, fl, lw, fill = .06) => { poly(pts); g.fillStyle = hsl(h, 90, 50, (fill + .12 * fl) * al); g.fill(); g.lineWidth = lw * 3.4; g.strokeStyle = hsl(h, 95, 60, .16 * al * (1 + fl)); g.stroke(); g.lineWidth = lw; g.strokeStyle = hsl(h, 95, 66 + 20 * fl, .92 * al); g.stroke();
      g.lineWidth = lw * .55; g.strokeStyle = hsl(h + 30, 100, 90, .55 * al); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); };
    const prism = (pts, A, B, h, al, fl, lw) => { const pr = k("prism"); if (pr < .02) return; g.save(); poly(pts); g.clip();
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, s = frac(st.sweep * .5 + (A[0] * .013 + A[1] * .007) / U), bx = A[0] + ux * d * s, by = A[1] + uy * d * s, bw = d * (.12 + .1 * fl);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), gr = g.createLinearGradient(bx - ux * bw, by - uy * bw, bx + ux * bw, by + uy * bw); gr.addColorStop(0, hsl(h + 40, 100, 80, 0)); gr.addColorStop(.5, hsl(h + 40, 100, 88, (.35 + .6 * fl) * pr * al)); gr.addColorStop(1, hsl(h + 40, 100, 80, 0)); g.fillStyle = gr; g.fillRect(Math.min(...xs) - 2, Math.min(...ys) - 2, Math.max(...xs) - Math.min(...xs) + 4, Math.max(...ys) - Math.min(...ys) + 4);
      const nsp = Math.round(k("split") * pr * (loud * 3.4 + R.kick * 1.5)); if (nsp > 0) { g.lineWidth = lw * .45; g.strokeStyle = hsl(h + 20, 95, 80, .5 * al); g.beginPath();
        for (let i = 1; i <= nsp; i++) { const q = i / (nsp + 1), Q = [A[0] + dx * q, A[1] + dy * q], e = [pts[1], pts[3]][i % 2], e2 = [pts[3], pts[1]][i % 2], R2 = i % 2 ? B : A; g.moveTo(Q[0], Q[1]); g.lineTo(e[0], e[1]); g.moveTo(Q[0], Q[1]); g.lineTo(e2[0] * .5 + R2[0] * .5, e2[1] * .5 + R2[1] * .5); } g.stroke(); }
      g.restore(); };
    const depthAl = s => clamp(.45 + (s - .8) * 1.6, .4, 1);
    const facet = (A, B, w, h, al, fl, bias, inner = true) => { const s = (A[2] + B[2]) / 2, lw = lw0 * s, pts = kite(A, B, w * s, bias), a2 = al * depthAl(s); inkPoly(pts, h, a2, fl, lw);
      if (inner) { g.lineWidth = lw * .6; g.strokeStyle = hsl(h, 90, 70, .5 * a2); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); }
      prism(pts, A, B, h, a2, fl, lw); };
    const diamond = (c, ang, len, wid, h, al, fl) => { const s = c[2], lw = lw0 * s, a2 = al * depthAl(s), ux = Math.cos(ang), uy = Math.sin(ang), pts = [[c[0], c[1]], [c[0] + ux * len * .5 - uy * wid, c[1] + uy * len * .5 + ux * wid], [c[0] + ux * len, c[1] + uy * len], [c[0] + ux * len * .5 + uy * wid, c[1] + uy * len * .5 - ux * wid]]; inkPoly(pts, h, a2, fl, lw); g.lineWidth = lw * .55; g.strokeStyle = hsl(h, 90, 75, .5 * a2); g.beginPath(); g.moveTo(pts[1][0], pts[1][1]); g.lineTo(pts[3][0], pts[3][1]); g.stroke(); };
    const drawBody = (J, hA, fA, al, live) => { const hh = i => hue + spread * i, F = key => live ? (st.flare[key] || 0) : 0, Q = [], zOf = (...ps) => ps.reduce((a, p) => a + p[3], 0) / ps.length;
      for (let i = 0; i < 2; i++) { const hp = i ? J.hipR : J.hipL, kn = J.knees[i], an = J.ankles[i];
        Q.push({ z: zOf(hp, kn), fn: () => facet(hp, kn, wBase * 1.25, hh(.5 + .3 * i), al, F("th" + i), .4) });
        Q.push({ z: zOf(kn, an), fn: () => facet(kn, an, wBase * .95, hh(.8 + .3 * i), al, F("sh" + i), .45) });
        const fs = (an[4] || 1) * an[2] * L("foot", .6, 1.6), a = fA[i]; Q.push({ z: an[3] + .02, fn: () => diamond(an, a.p, hs0 * 1.1 * fs * (1 + k("stretch") * .25 * Math.min(2, Math.abs(a.v) * .15)), hs0 * .42 * fs, hh(1.2), al, F("sh" + i)) }); }
      // torso: one faceted hexagon from the shoulders through the waist to the hips (hourglass or V depending on Body type), crossed inside
      Q.push({ z: zOf(J.chest, J.hipC), fn: () => { const s = (J.chest[2] + J.hipC[2]) / 2, lw = lw0 * s, a2 = al * depthAl(s), minW = U * .045 * s;
        const widen = (P, Lp, Rp) => { const dx = Rp[0] - Lp[0], dy = Rp[1] - Lp[1], d = Math.hypot(dx, dy); if (d >= minW * 2) return [Lp, Rp]; const ux = d > 1e-3 ? dx / d : 1, uy = d > 1e-3 ? dy / d : 0; return [[P[0] - ux * minW, P[1] - uy * minW], [P[0] + ux * minW, P[1] + uy * minW]]; };
        const [sL, sR] = widen(J.chest, J.shL, J.shR), [wL, wR] = widen(J.waist, J.waistL, J.waistR), [hL, hR] = widen(J.hipC, J.hipL, J.hipR), pts = [sL, wL, hL, hR, wR, sR];
        inkPoly(pts, hh(.2), a2, F("torso"), lw); g.lineWidth = lw * .6; g.strokeStyle = hsl(hh(.2), 90, 70, .5 * a2); g.beginPath(); g.moveTo(sL[0], sL[1]); g.lineTo(hR[0], hR[1]); g.moveTo(sR[0], sR[1]); g.lineTo(hL[0], hL[1]); g.moveTo(J.chest[0], J.chest[1]); g.lineTo(J.hipC[0], J.hipC[1]); g.moveTo(wL[0], wL[1]); g.lineTo(wR[0], wR[1]); g.stroke();
        g.lineWidth = lw * 1.3; g.strokeStyle = hsl(hh(.2), 92, 66, .9 * a2); g.beginPath(); g.moveTo(J.shL[0], J.shL[1]); g.lineTo(J.chest[0], J.chest[1]); g.lineTo(J.shR[0], J.shR[1]); g.stroke(); prism(pts, J.chest, J.hipC, hh(.2), a2, F("torso"), lw); } });
      for (let i = 0; i < 2; i++) { const sh = i ? J.shR : J.shL, el = J.elbows[i], wr = J.wrists[i];
        Q.push({ z: zOf(sh, el), fn: () => facet(sh, el, wBase, hh(-.4 - .3 * i), al, F("ua" + i), .38) });
        Q.push({ z: zOf(el, wr), fn: () => facet(el, wr, wBase * .8, hh(-.7 - .3 * i), al, F("fa" + i), .45) });
        const a = hA[i]; Q.push({ z: wr[3] + .02, fn: () => { const st2 = 1 + k("stretch") * .5 * Math.min(2.5, Math.abs(a.v) * .12), hs = hs0 * wr[2]; diamond(wr, a.p, hs * st2, hs * .45 / Math.sqrt(st2), hh(-1.1), al, F("fa" + i) + (live ? Math.min(1, Math.abs(a.v) * .08) : 0));
          if (live && glow > .02) sprite(g, hh(-1.1), wr[0], wr[1], hs * 1.6, (.12 + .5 * Math.min(1, Math.abs(a.v) * .06)) * glow * al); } }); }
      // head: a hollow oval (dark inside, so what's behind it hides), a crest; a nose wedge shows which way it faces
      Q.push({ z: J.head[3], fn: () => { const s = J.head[2], lw = lw0 * s, a2 = al * depthAl(s), hr = U * L("head", .04, .075) * s, ha2 = Math.atan2(J.head[1] - J.neck[1], J.head[0] - J.neck[0]) + Math.PI / 2;
        g.lineWidth = lw * 1.6; g.strokeStyle = hsl(hh(0), 90, 62, .85 * a2); g.beginPath(); g.moveTo(J.chest[0], J.chest[1]); g.lineTo(J.neck[0], J.neck[1]); g.lineTo(J.head[0], J.head[1]); g.stroke();
        g.save(); g.translate(J.head[0], J.head[1]); g.rotate(ha2); g.beginPath(); g.ellipse(0, 0, hr * .85, hr, 0, 0, TAU); g.fillStyle = `rgba(0,0,0,${.75 * al})`; g.fill(); g.fillStyle = hsl(hh(0), 90, 50, .1 * a2); g.fill(); g.lineWidth = lw * 3.2; g.strokeStyle = hsl(hh(0), 95, 60, .16 * a2); g.stroke(); g.lineWidth = lw; g.strokeStyle = hsl(hh(0), 95, 68, .92 * a2); g.stroke(); g.lineWidth = lw * .55; g.strokeStyle = hsl(hh(0) + 30, 100, 90, .6 * a2); g.beginPath(); g.ellipse(0, 0, hr * .85, hr, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
        if (k("crest") > .02) { const cl = hr * 3.2 * k("crest"); g.beginPath(); g.moveTo(-hr * .25, -hr * .95); g.lineTo(0, -hr - cl); g.lineTo(hr * .25, -hr * .95); g.lineTo(0, -hr * .7); g.closePath(); g.fillStyle = hsl(hh(0) + 20, 90, 55, .25 * a2); g.fill(); g.lineWidth = lw; g.strokeStyle = hsl(hh(0) + 20, 95, 72, .9 * a2); g.stroke(); }
        g.restore(); } });
      Q.push({ z: J.nose[3], fn: () => { const s = J.head[2], hr = U * L("head", .04, .075) * s, dx = J.nose[0] - J.head[0], dy = J.nose[1] - J.head[1], d = Math.hypot(dx, dy); if (d < hr * .3) return; const ux = dx / d, uy = dy / d, b = [J.head[0] + ux * hr * .7, J.head[1] + uy * hr * .7], tip = [J.head[0] + ux * hr * 1.15, J.head[1] + uy * hr * 1.15];
        inkPoly([b, [b[0] - uy * hr * .14, b[1] + ux * hr * .14], tip, [b[0] + uy * hr * .14, b[1] - ux * hr * .14]], hh(0) + 20, al * depthAl(s), 0, lw0 * s, .2); } });
      Q.sort((a, b) => a.z - b.z); g.lineJoin = "round"; g.lineCap = "round"; Q.forEach(q => q.fn()); };
    // ---- flick echoes: ghost diamonds tracing each hand, drifting and fading; more when loud
    if (k("echo") > .02) { const maxN = Math.round(L("echolen", 6, 40) * (.4 + .6 * loud + .4 * R.kick));
      for (let i = 0; i < 2; i++) { const tr = st.trail[i], a = hAng[i], w = J.wrists[i]; if (Math.abs(a.v) > .6 || Math.hypot(st.hands[i].x.v, st.hands[i].y.v, st.hands[i].z.v) > .35) tr.push({ x: w[0], y: w[1], s: w[2], a: a.p, age: 0, v: Math.min(3, Math.abs(a.v) * .1) }); while (tr.length > maxN) tr.shift();
        tr.forEach(e => e.age += dt); st.trail[i] = tr.filter(e => e.age < 1.1);
        st.trail[i].forEach((e, j) => { if (j % 3) return; const fd = 1 - e.age / 1.1, al = fd * fd * .5 * k("echo"), sc = (1 + e.age * .9) * e.s, ang = e.a + e.age * 1.6 * (i ? 1 : -1), c = [e.x + Math.cos(ang) * e.age * U * .04, e.y + Math.sin(ang) * e.age * U * .04 - e.age * U * .02], ux = Math.cos(ang), uy = Math.sin(ang), len = hs0 * (1 + e.v * .4) * sc, wid = hs0 * .45 * sc; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + ux * len * .5 - uy * wid, c[1] + uy * len * .5 + ux * wid); g.lineTo(c[0] + ux * len, c[1] + uy * len); g.lineTo(c[0] + ux * len * .5 + uy * wid, c[1] + uy * len * .5 - ux * wid); g.closePath(); g.lineWidth = lw0 * .8 * e.s; g.strokeStyle = hsl(hue - spread * 1.1 + e.age * 60, 95, 70, al); g.stroke(); }); } }
    else st.trail = [[], []];
    // ---- pose freezes: on each kick, stamp the pose; it stays dim for N beats then fades
    if (k("freeze") > .02 && newBeat && R.kick > .25) { st.freezes.push({ J: JSON.parse(JSON.stringify(J)), hA: hAng.map(a => ({ p: a.p, v: 0 })), fA: fAng.map(a => ({ p: a.p, v: 0 })), age: 0 }); while (st.freezes.length > 5) st.freezes.shift(); }
    const holdS = I("hold") * gap; st.freezes.forEach(fz => fz.age += dt); st.freezes = st.freezes.filter(fz => fz.age < holdS);
    st.freezes.forEach(fz => { const al = Math.pow(1 - fz.age / holdS, 1.3) * .5 * k("freeze"); drawBody(fz.J, fz.hA, fz.fA, al, false); });
    // ---- the live figure
    drawBody(J, hAng, fAng, 1, true);
    if (glow > .02) sprite(g, hue, J.head[0], J.head[1], U * .07 * J.head[2], .25 * glow * (1 + loud));
  } };
NEW_TRAITS.push({ form: SERVE, char: "anchored", hue: 20, hy: .5, p: { chaos: .15, energy: .9, grace: .7, magnetism: 0, roam: 0, size: .5, social: .3, tempo: .45, trails: .5 }, desc: "A ballroom dancer drawn as hollow geometric facets and posed in 3D: they turn to profile, show their back, spin on big hits and roam the stage with perspective. Vogues upright (arms thrown into new poses on the beat, waist bending, back always arched) or duck walks low and bouncing with the knees forward and the feet kicked out in turn; elbows and knees stay rigid while the wrists are pure rubber. Light sweeps across every facet, the hands leave ghost diamonds behind, and each kick stamps a dim copy of the pose." });
FORM[SERVE.key] = SERVE;
