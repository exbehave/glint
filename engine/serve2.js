/* ---- Serve, muscle body (Oct 22, 2026, Kennedy's request): the same dancer, dances, settings and controls as Serve, drawn as a
   smooth, muscular neon outline after Kennedy's reference image (a friend's Claude-made take on Serve): traps, round deltoids
   overlapping the torso, bulging biceps, pecs and a six-pack, V-lines, big quads and calves, a smooth egg head, one color gradient
   head to toe and a glow on the floor. Serve itself (engine/serve.js) is untouched: this file reuses its helpers (svBeat, svIK,
   springs, SV_POSES, SV_FACES, SERVE.init), so it must load after serve.js. Name kept by Kennedy. ---- */
const SERVE2 = { key: "serve2", name: "Serve (muscle)", fade: .55,
  init: SERVE.init,
  shape: [
    { key: "dance", label: "Dance", min: 0, max: 2, def: 0, fmt: i => ["Mix it up", "Vogue", "Duck walk"][i], grp: "Dance" },
    { key: "feel", label: "Tempo feel", min: 0, max: 3, def: 2 / 3, fmt: i => ["Double time", "On the beat", "Half time", "Quarter time"][i], grp: "Dance" },
    { key: "mixbars", label: "Duck walk for", min: 1, max: 8, def: 3 / 7, slide: true, fmt: v => v + (v > 1 ? " bars" : " bar"), grp: "Dance", when: g => g("dance") === 0 },
    { key: "ratio", label: "Vogue : duck walk", min: 0, max: 4, def: .5, fmt: i => ["1 : 1", "2 : 1", "3 : 1", "4 : 1", "6 : 1"][i], grp: "Dance", when: g => g("dance") === 0 },
    { key: "loudduck", label: "Duck walk more when loud", def: .5, grp: "Dance", when: g => g("dance") === 0 },
    { key: "dropduck", label: "Beat drops → duck walk", def: .6, grp: "Dance", when: g => g("dance") === 0 },
    { key: "dropbars", label: "Drop duck walk for", min: 1, max: 8, def: 3 / 7, slide: true, fmt: v => v + (v > 1 ? " bars" : " bar"), grp: "Dance", when: g => g("dance") === 0 },
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
    { key: "fdir", label: "Hand motion", min: 0, max: 4, def: 0, fmt: i => ["Clock hands", "Flick anywhere", "Up and down", "Side to side", "Circles"][i], grp: "Hands" },
    { key: "outward", label: "Hands point outward", def: .55, grp: "Hands" },
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
    { key: "width", label: "Limb thickness", def: 0.58, grp: "Body" },
    { key: "weight", label: "Line weight", def: 0.12, grp: "Body" },
    { key: "head", label: "Head size", def: 0.46, grp: "Body" },
    { key: "nod", label: "Head bob", def: 1, grp: "Body" },
    { key: "roam", label: "Roam the stage", def: .5, grp: "Moving around" },
    { key: "walk", label: "Walk speed", def: .5, grp: "Moving around" },
    { key: "turns", label: "Turns", def: .6, grp: "Moving around" },
    { key: "turnspeed", label: "Turn speed", def: .5, grp: "Moving around" },
    { key: "spins", label: "Spins on big hits", def: .4, grp: "Moving around" },
    { key: "persp", label: "Perspective", def: .5, grp: "Moving around" },
    { key: "prism", label: "Light sweep", def: .7, grp: "Inside" },
    { key: "sweep", label: "Sweep speed", def: .5, grp: "Inside" },
    { key: "echo", label: "Flick echoes", def: .6, grp: "Inside" },
    { key: "echolen", label: "Echo length", def: .5, grp: "Inside" },
    { key: "freeze", label: "Pose freeze", def: .5, grp: "Inside" },
    { key: "hold", label: "Freeze hold", min: 1, max: 8, def: 1 / 7, slide: true, fmt: v => v + (v > 1 ? " beats" : " beat"), grp: "Inside" },
    { key: "spread", label: "Color spread", def: .3, grp: "Extras" },
    { key: "glow", label: "Glow", def: .5, grp: "Extras" },
    { key: "muscle", label: "Muscle", def: .6, grp: "Body" },
    { key: "defn", label: "Definition", def: .7, grp: "Body" },
    { key: "flex", label: "Flex when loud", def: .5, grp: "Body" },
    { key: "floor", label: "Floor glow", def: .6, grp: "Extras" }],
  draw(E) {
    const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), gap0 = svBeat(E, st), ph0 = clamp(st.since / gap0, 0, 1), bn0 = st.beats || 0;
    // tempo feel: the dancer counts its own beat — double time subdivides the song's beat, half/quarter time stretch it
    const mult = [.5, 1, 2, 4][I("feel")], gap = gap0 * mult, vpos = (bn0 + ph0) / mult, bn = Math.floor(vpos), ph = vpos - bn, newBeat = bn !== (st.vb ?? -1); st.vb = bn;
    const H0 = S * L("size", .34, 1.0), U = H0, lw0 = Math.max(1, H0 * .0045) * L("weight", .5, 2.2), hue = n.hue, spread = k("spread") * 90, glow = k("glow");
    const dsel = I("dance"), bar = newBeat && bn > 0 && bn % 4 === 0;
    // ---- which dance (Mix it up alternates every few bars, blended)
    // Mix it up: vogue is the home dance; duck-walk stretches last "Duck walk for" bars, vogue stretches last that × the ratio.
    // Loud passages shorten the vogue stretch (Duck walk more when loud); a beat drop (quiet → suddenly loud) cuts straight to a duck walk
    st.lf = lerp(st.lf ?? loud, loud, Math.min(1, dt * 4)); st.ls = lerp(st.ls ?? loud, loud, Math.min(1, dt * .18)); const drop = st.lf - st.ls; // fast vs slow loudness
    if (dsel === 0) { const ratio = [1, 2, 3, 4, 6][I("ratio")], loudF = clamp((st.ls - .25) * 1.6, 0, 1) * k("loudduck"), duckBars = I("mixbars"), vogueBars = Math.max(1, Math.round(duckBars * ratio * (1 - .7 * loudF)));
      st.segStart ??= bn; const segLen = st.dCur === 2 ? (st.dropUntil != null ? st.dropUntil - st.segStart : duckBars * 4) : vogueBars * 4;
      if (newBeat && bn - st.segStart >= segLen) { st.dPrev = st.dCur; st.dCur = st.dCur === 1 ? 2 : 1; st.dF = 0; st.segStart = bn; st.dropUntil = null; }
      // beat drop: fast loudness jumps well above the slow average → duck walk now, for Drop duck walk for bars
      if (k("dropduck") > .02 && st.dCur === 1 && drop > .5 - .4 * k("dropduck") && st.ls < .55 && t - (st.dropT ?? -9) > 6) { st.dropT = t; st.dPrev = 1; st.dCur = 2; st.dF = 0; st.segStart = bn; st.dropUntil = bn + I("dropbars") * 4; } }
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
    if (fmode === 0) {
      // clock hands: each hand, on its own clock, picks a new position anywhere around the dial and sweeps there smoothly
      // (never a jittery wedge); the dial is centered on "away from the body", Egyptian style, and Hands point outward
      // decides how often it lands near that than anywhere else
      for (let i = 0; i < 2; i++) { st.hcl ||= [0, 0]; st.hcl[i] -= dt; if (st.hcl[i] <= 0) { const per = gap / Math.max(.25, fpb); st.hcl[i] = per * (.55 + .9 * Math.random()); const bias = k("outward"), spreadA = Math.PI * (1 - .85 * bias * bias); st.hat[i] = { abs: false, out: true, a: (Math.random() - .5) * 2 * spreadA * (Math.random() < .35 + .65 * (1 - bias) ? 1 : .35) }; } }
    } else
    for (let i = 0; i < 2; i++) if (fphase !== st.fl[i]) { st.fl[i] = fphase; st.hdir[i] = -st.hdir[i];
      if (fmode === 1) st.hat[i] = { abs: false, a: svAng((st.hat[i].a || 0) + (Math.random() - .5) * 2 * frange + (Math.random() < .3 ? Math.PI : 0)) };
      else if (fmode === 2) st.hat[i] = { abs: true, a: -Math.PI / 2 + st.hdir[i] * frange * .5 + (Math.random() - .5) * .4 };
      else if (fmode === 3) st.hat[i] = { abs: true, a: (st.hdir[i] > 0 ? 0 : Math.PI) + (Math.random() - .5) * frange * .5 };
      else st.hat[i] = { abs: false, a: (st.hat[i].a || 0) + (i ? 1 : -1) * frange * .7 }; }
    for (let i = 0; i < 2; i++) if (typeof st.hat[i] !== "object") st.hat[i] = { abs: false, a: 0 };
    if (newBeat) for (let i = 0; i < 2; i++) if (st.kickFoot === i || Math.random() < .3) st.ft[i] = (Math.random() - .5) * 1.6 * k("ankles");
    const f0 = L("wspeed", .7, 7), K = Math.pow(TAU * f0, 2), zeta = L("rubber", .6, .05), C = 2 * zeta * Math.sqrt(K), Ka = Math.pow(TAU * f0 * .9, 2), Ca = 2 * Math.max(.12, zeta * 1.3) * Math.sqrt(Ka);
    const fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2), Carm = 2 * L("armlag", .9, .18) * Math.sqrt(Karm), fLeg = L("legspeed", .6, 6), Kleg = Math.pow(TAU * fLeg, 2), Cleg = 2 * .8 * Math.sqrt(Kleg);
    // ---- the skeleton in local space (figure units; x right, y down from the top of the head, z toward the room)
    const kpb = [.5, 1, 2][I("kicks")], bounce = svPop((bn + ph) * kpb, k("bsnap")) * L("bounce", .02, .16) * (.7 + .3 * Math.min(1, R.energy)) * (1 + .4 * R.kick), vb = svPop(ph, .4) * L("vbounce", 0, .05) * (.7 + .3 * loud);
    const legL = L("leglen", .36, .56), thigh = legL / 2, shin = legL / 2, floor = .46 + legL, squatY = lerp(.46 + (legL - .46), lerp(floor - .24, floor - .07, k("squat")), duck), sway = Math.sin(t * Math.PI / gap * .5) * L("sway", 0, .06) * (1 - duck) * (.5 + loud);
    svSpr3(st.hip, [sway, squatY + lerp(vb, bounce, duck), 0], 900, 55, dt); const hipC = svP(st.hip);
    // torso: pelvis → waist → chest. The back is always arched (pelvis tipped forward, chest lifted and carried back); vogue adds a waist bend on each pose
    const arch = L("arch", .25, 1), wb = k("waist") * (1 - duck); { const Kb = L("posespeed", 6, 90); svSpr3(st.bend, [st.bendT[0] * wb, st.bendT[1] * wb, st.bendT[2] * wb + st.leanT * (1 - duck) + L("dlean", .1, .7) * duck], Kb, 2 * .65 * Math.sqrt(Kb), dt); }
    const sideB = st.bend.x.p, twist = st.bend.y.p, fwdB = st.bend.z.p;
    const waist = V3.add(hipC, [sideB * .06, -.15, .05 * arch + fwdB * .04]);
    const chest = V3.add(waist, [sideB * .12, -.17 + .02 * Math.abs(fwdB), -.1 * arch + fwdB * .14]);
    const shDir = [Math.cos(twist * .6), 0, -Math.sin(twist * .6)], body = k("body"), shW = L("shoulders", .07, .14) * lerp(.8, 1.3, body) * L("muscle", 1.1, 1.6), hipW = L("hips", .04, .08) * lerp(1.35, .7, body), wW = L("waistw", .02, .075) * lerp(.85, 1.15, body), shL = V3.add(chest, shDir, -shW), shR = V3.add(chest, shDir, shW), hipL = V3.add(hipC, [-hipW, 0, -.02 * arch]), hipR = V3.add(hipC, [hipW, 0, -.02 * arch]), waistL = V3.add(waist, shDir, -wW), waistR = V3.add(waist, shDir, wW);
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
    const ua = armL * .51, fa = armL * .49, reach = L("reach", .5, 1.0) * (.8 + .3 * loud) * (1 + .15 * R.kick), pose = SV_POSES[st.pose](reach), handT = [];
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
    for (let i = 0; i < 2; i++) { const fdir = Math.atan2(J.wrists[i][1] - J.elbows[i][1], J.wrists[i][0] - J.elbows[i][0]), s = st.ha[i]; s.p = fdir + svAng(s.p - fdir); const sh2 = i ? J.shR : J.shL, odir = Math.atan2(J.wrists[i][1] - sh2[1], J.wrists[i][0] - sh2[0]), ht = st.hat[i].abs ? st.hat[i].a : (st.hat[i].out ? odir : fdir) + st.hat[i].a; s.p = ht + svAng(s.p - ht); svSpr(s, ht, K * (st.hat[i].out ? .6 : 1.4), st.hat[i].out ? 2 * Math.max(.45, zeta) * Math.sqrt(K * .6) : C * .8, dt); hAng.push(s);
      const sdir = Math.atan2(J.ankles[i][1] - J.knees[i][1], J.ankles[i][0] - J.knees[i][0]), a = st.fa[i]; a.p = sdir + svAng(a.p - sdir); svSpr(a, sdir + st.ft[i] + (i ? 1 : -1) * lerp(-.1, .3, duck) * .5 * Math.cos(yaw), Ka, Ca, dt); fAng.push(a); }
    // velocities → flare
    const prev = st.prev, vel = (key, p) => prev && prev[key] ? Math.hypot(p[0] - prev[key][0], p[1] - prev[key][1]) / Math.max(dt, 1e-3) / U : 0;
    const vk = { ua0: vel("e0", J.elbows[0]), ua1: vel("e1", J.elbows[1]), fa0: vel("w0", J.wrists[0]), fa1: vel("w1", J.wrists[1]), th0: vel("k0", J.knees[0]), th1: vel("k1", J.knees[1]), sh0: vel("a0", J.ankles[0]), sh1: vel("a1", J.ankles[1]), torso: vel("sc", J.chest), head: vel("hd", J.head) };
    for (const key in vk) st.flare[key] = Math.max((st.flare[key] || 0) * Math.max(0, 1 - dt * 4), Math.min(1, vk[key] * .55));
    st.prev = { e0: J.elbows[0], e1: J.elbows[1], w0: J.wrists[0], w1: J.wrists[1], k0: J.knees[0], k1: J.knees[1], a0: J.ankles[0], a1: J.ankles[1], sc: J.chest, hd: J.head };
    st.sweep += dt * L("sweep", .15, 1.6) * (1 + loud + 1.5 * R.kick);
    // ---- drawing: a smooth, muscular neon outline (after Kennedy's reference): every part is a soft sausage with muscle bulges,
    // filled dark and inked with one head-to-toe color gradient, drawn far to near so nearer parts overlap farther ones
    const wf = L("width", .75, 1.25), hs0 = U * L("hand", .035, .075), dfn = k("defn"), flexK = k("flex");
    const smooth = pts => { const m = pts.length; g.beginPath(); g.moveTo((pts[m - 1][0] + pts[0][0]) / 2, (pts[m - 1][1] + pts[0][1]) / 2); for (let i = 0; i < m; i++) { const p = pts[i], q = pts[(i + 1) % m]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.closePath(); };
    // a limb outline from A to B: widths w0 → w1 with a muscle bulge wm at bp; bias pushes the bulge to one side (+ = the left normal)
    const limbPts = (A, B, w0, wm, bp, w1, bias = 0) => { const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux, N = 8, Lp = [], Rp = [];
      for (let i = 0; i <= N; i++) { const u = i / N, base = lerp(w0, w1, u), bul = Math.max(0, wm - lerp(w0, w1, bp)) * Math.exp(-Math.pow((u - bp) / .3, 2)), wl = base + bul * (1 + bias), wr = base + bul * (1 - bias), cx = A[0] + dx * u, cy = A[1] + dy * u; Lp.push([cx + nx * wl, cy + ny * wl]); Rp.push([cx - nx * wr, cy - ny * wr]); }
      const pts = Lp.slice(); for (let j = 1; j < 4; j++) { const an = Math.atan2(ny, nx) - j / 4 * Math.PI; pts.push([B[0] + Math.cos(an) * w1, B[1] + Math.sin(an) * w1]); }
      for (let i = N; i >= 0; i--) pts.push(Rp[i]); for (let j = 1; j < 4; j++) { const an = Math.atan2(-ny, -nx) - j / 4 * Math.PI; pts.push([A[0] + Math.cos(an) * w0, A[1] + Math.sin(an) * w0]); } return pts; };
    const ellPts = (c, ang, rx, ry) => { const pts = [], ca = Math.cos(ang), sa = Math.sin(ang); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; pts.push([c[0] + x * ca - y * sa, c[1] + x * sa + y * ca]); } return pts; };
    const yawOf = J => Math.acos(clamp((J.nose[3] - J.head[3]) / .055, -1, 1));
    const drawBody = (J, hA, fA, al, live) => {
      const F = key => live ? (st.flare[key] || 0) : 0, Q = [], zOf = (...ps) => ps.reduce((a, p) => a + p[3], 0) / ps.length;
      const m = L("muscle", .8, 1.35) * (live ? 1 + flexK * (.1 * R.bass + .16 * R.kick) : 1);
      const facing = clamp((J.nose[3] - J.head[3]) / .055, -1, 1), front = clamp(facing * 2, 0, 1), back = clamp(-facing * 2, 0, 1);
      const hr0 = U * L("head", .04, .075), yTop = J.head[1] - hr0 * J.head[2] * 1.2, yBot = Math.max(J.ankles[0][1], J.ankles[1][1]) + hs0 * .6, span = 30 + 170 * spread / 90;
      const hueAt = y => hue + span * clamp((y - yTop) / Math.max(1, yBot - yTop), 0, 1);
      const SG = g.createLinearGradient(0, yTop, 0, yBot), FG = g.createLinearGradient(0, yTop, 0, yBot);
      for (let i = 0; i <= 5; i++) { const u = i / 5; SG.addColorStop(u, hsl(hue + span * u, 95, 64, 1)); FG.addColorStop(u, hsl(hue + span * u, 80, 32, .5)); }
      // fill dark, tint, then a wide soft glow, a mid glow and a bright core line; a flare brightens the part that just moved
      const ink = (pts, s, a0, fl, axis) => { const lw = lw0 * s, a2 = a0 * clamp(.45 + (s - .8) * 1.6, .4, 1); smooth(pts);
        g.globalAlpha = .85 * a0; g.fillStyle = "#000"; g.fill(); g.globalAlpha = a2 * (.75 + .5 * fl); g.fillStyle = FG; g.fill();
        if (axis && k("prism") > .02) { const [A, B] = axis; g.save(); g.clip(); const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, sw = frac(st.sweep * .5 + (A[0] * .013 + A[1] * .007) / U), bx = A[0] + dx * sw, by = A[1] + dy * sw, bw = d * (.14 + .1 * fl), hh2 = hueAt(by) + 40;
          const gr = g.createLinearGradient(bx - ux * bw, by - uy * bw, bx + ux * bw, by + uy * bw); gr.addColorStop(0, hsl(hh2, 100, 80, 0)); gr.addColorStop(.5, hsl(hh2, 100, 85, 1)); gr.addColorStop(1, hsl(hh2, 100, 80, 0)); g.globalAlpha = (.18 + .45 * fl) * k("prism") * a2; g.fillStyle = gr; g.fillRect(Math.min(A[0], B[0]) - d, Math.min(A[1], B[1]) - d, Math.abs(dx) + 2 * d, Math.abs(dy) + 2 * d); g.restore(); smooth(pts); }
        g.strokeStyle = SG; g.globalAlpha = .12 * a2 * (1 + glow); g.lineWidth = lw * 5.5; g.stroke(); g.globalAlpha = .3 * a2; g.lineWidth = lw * 2.3; g.stroke(); g.globalAlpha = .95 * a2; g.lineWidth = lw; g.stroke();
        if (fl > .05) { g.globalAlpha = .5 * fl * a2; g.strokeStyle = "#fff"; g.lineWidth = lw * .45; g.stroke(); } g.globalAlpha = 1; };
      // muscle definition lines, in the same gradient
      const lines = (segs, s, a0) => { if (a0 < .02) return; g.strokeStyle = SG; g.lineWidth = lw0 * s * .75; g.globalAlpha = a0 * clamp(.45 + (s - .8) * 1.6, .4, 1); g.beginPath(); segs.forEach(sg => { g.moveTo(sg[0][0], sg[0][1]); if (sg.length === 3) g.quadraticCurveTo(sg[1][0], sg[1][1], sg[2][0], sg[2][1]); else g.lineTo(sg[1][0], sg[1][1]); }); g.stroke(); g.globalAlpha = 1; };
      const along = (A, B, u, off, w) => { const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1; return [A[0] + dx * u - dy / d * off * w, A[1] + dy * u + dx / d * off * w]; };
      const side = (P, A, B) => Math.sign((B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0])) || 1; // which normal of A→B points at P
      // legs: big quads that taper into the knee, calves that bulge on the outside, rounded feet
      for (let i = 0; i < 2; i++) { const hp = i ? J.hipR : J.hipL, kn = J.knees[i], an = J.ankles[i], s1 = (hp[2] + kn[2]) / 2, s2 = (kn[2] + an[2]) / 2, oT = -side(J.hipC, hp, kn), oS = -side(J.hipC, kn, an);
        const tw = [.062, .07, .035].map(v => v * U * s1 * wf * m), sw2 = [.036, .046, .022].map(v => v * U * s2 * wf * m);
        Q.push({ z: zOf(hp, kn), fn: () => { ink(limbPts(hp, kn, tw[0], tw[1], .32, tw[2], .25 * oT), s1, al, F("th" + i), [hp, kn]); lines([[along(hp, kn, .25, .15 * oT, tw[1]), along(hp, kn, .55, .3 * oT, tw[1]), along(hp, kn, .86, .05, tw[1])], [along(hp, kn, .9, -.5, tw[2]), along(hp, kn, 1.02, 0, tw[2]), along(hp, kn, .9, .5, tw[2])]], s1, .7 * dfn * al); } });
        Q.push({ z: zOf(kn, an), fn: () => { ink(limbPts(kn, an, sw2[0], sw2[1], .3, sw2[2], .45 * oS), s2, al, F("sh" + i), [kn, an]); lines([[along(kn, an, .12, .35 * oS, sw2[1]), along(kn, an, .3, .7 * oS, sw2[1]), along(kn, an, .55, .3 * oS, sw2[1])]], s2, .6 * dfn * al); } });
        const fs = (1 + ((an[4] || 1) - 1) * .3) * an[2] * L("foot", .6, 1.6), a = fA[i]; Q.push({ z: an[3] + .02, fn: () => { const len = hs0 * fs * (1 + k("stretch") * .2 * Math.min(2, Math.abs(a.v) * .15)), ang = a.p - Math.PI / 2 * Math.cos(yawOf(J)), c = [an[0] + Math.cos(a.p) * hs0 * fs * .3, an[1] + Math.sin(a.p) * hs0 * fs * .3]; ink(ellPts(c, ang, len * .6, hs0 * .34 * fs), an[2], al, F("sh" + i)); } }); }
      // torso: traps sloping from the neck, broad shoulders and lats, a tight waist, hips flowing into the legs
      { const spX = J.hipC[0] - J.neck[0], spY = J.hipC[1] - J.neck[1], spD = Math.hypot(spX, spY) || 1, perp = [-spY / spD, spX / spD], s = (J.chest[2] + J.hipC[2]) / 2;
        const shV = [(J.shR[0] - J.shL[0]) / 2, (J.shR[1] - J.shL[1]) / 2], wV = [(J.waistR[0] - J.waistL[0]) / 2, (J.waistR[1] - J.waistL[1]) / 2], hV = [(J.hipR[0] - J.hipL[0]) / 2, (J.hipR[1] - J.hipL[1]) / 2];
        const acr = (v, half, want, depth) => { const l = Math.hypot(v[0], v[1]), dir = l > 1e-3 ? [v[0] / l, v[1] / l] : (perp[0] >= 0 ? perp : [-perp[0], -perp[1]]), w = Math.max(l * want / half, depth * U * s); return [dir[0] * w, dir[1] * w]; };
        const shH = shW, lat = shW * .93 * lerp(.9, 1.1, (m - .8) / .55), wv = (wW * 1.3 + .012) * lerp(.95, 1.08, (m - .8) / .55), hv = hipW + .062 * wf * m * .8;
        const P = (a, b) => [a[0] * (1 - b) + b * 0, a[1]], mixP = (A, B, u) => [lerp(A[0], B[0], u), lerp(A[1], B[1], u)];
        const lv = [[mixP(J.chest, J.neck, .55), acr(shV, shH, .045 * m, .04)], [mixP(J.chest, J.neck, .2), acr(shV, shH, shH * .72, .08)], [J.chest, acr(shV, shH, shH * 1.0, .1)], [mixP(J.chest, J.waist, .32), acr(shV, shH, lat, .1)], [mixP(J.chest, J.waist, .68), acr(shV, shH, lerp(lat, wv, .45), .09)], [J.waist, acr(wV, wW, wv, .08)], [mixP(J.waist, J.hipC, .75), acr(hV, hipW, hv, .09)]];
        const crotch = [J.hipC[0] + spX / spD * U * s * .07, J.hipC[1] + spY / spD * U * s * .07], pts = [];
        lv.forEach(([c, a]) => pts.push([c[0] - a[0], c[1] - a[1]])); pts.push(crotch); for (let i = lv.length - 1; i >= 0; i--) { const [c, a] = lv[i]; pts.push([c[0] + a[0], c[1] + a[1]]); }
        // torso-local point: across in shoulder half-widths (narrowing toward the hips), down 0 at the shoulders → 1 at the hips
        const X = acr(shV, shH, shH, .085), XR = Math.min(1, hv / shH), T = (a, b) => { const c = mixP(J.chest, J.hipC, b), f = lerp(1, XR, clamp(b, 0, 1)); return [c[0] + X[0] * a * f, c[1] + X[1] * a * f]; };
        Q.push({ z: zOf(J.chest, J.hipC) + .015, fn: () => { ink(pts, s, al, F("torso"), [J.chest, J.hipC]); const fd = .75 * dfn * al;
          const fr = []; for (const sd of [-1, 1]) { fr.push([T(0, .1), T(.32 * sd, .3), T(.74 * sd, .1)]); for (const b of [.42, .55, .68]) fr.push([T(.05 * sd, b), T(.3 * sd, b - .03)]); fr.push([T(.62 * sd, .8), T(.32 * sd, .95), T(.1 * sd, 1.05)]); }
          fr.push([T(0, .12), T(0, .8)]); lines(fr, s, fd * front);
          const bk = [[T(0, -.05), T(0, .92)]]; for (const sd of [-1, 1]) bk.push([T(.2 * sd, .02), T(.6 * sd, .12), T(.35 * sd, .38)], [T(.75 * sd, .35), T(.5 * sd, .62), T(.15 * sd, .78)]); lines(bk, s, fd * back); } }); }
      // arms: round deltoid caps that overlap the torso, bulging biceps, thick forearms, rounded mitt hands
      for (let i = 0; i < 2; i++) { const sh = i ? J.shR : J.shL, el = J.elbows[i], wr = J.wrists[i], s1 = (sh[2] + el[2]) / 2, s2 = (el[2] + wr[2]) / 2, oU = -side(J.chest, sh, el);
        const uw = [.042, .052, .032].map(v => v * U * s1 * wf * m), fw = [.034, .04, .022].map(v => v * U * s2 * wf * m);
        Q.push({ z: zOf(sh, el), fn: () => { ink(limbPts(sh, el, uw[0], uw[1], .5, uw[2], .35 * oU), s1, al, F("ua" + i), [sh, el]); lines([[along(sh, el, .35, .1 * oU, uw[1]), along(sh, el, .6, .45 * oU, uw[1]), along(sh, el, .88, .15 * oU, uw[1])]], s1, .6 * dfn * al); } });
        Q.push({ z: zOf(sh) + .03, fn: () => { const ang = Math.atan2(el[1] - sh[1], el[0] - sh[0]), c = along(sh, el, .14, .25 * oU, uw[1]); ink(ellPts(c, ang, U * sh[2] * .07 * wf * m, U * sh[2] * .055 * wf * m), sh[2], al, F("ua" + i)); } });
        Q.push({ z: zOf(el, wr), fn: () => ink(limbPts(el, wr, fw[0], fw[1], .28, fw[2], .2), s2, al, F("fa" + i), [el, wr]) });
        const a = hA[i]; Q.push({ z: wr[3] + .02, fn: () => { const st2 = 1 + k("stretch") * .4 * Math.min(2.5, Math.abs(a.v) * .12), hs = hs0 * wr[2] * st2, c = [wr[0] + Math.cos(a.p) * hs * .4, wr[1] + Math.sin(a.p) * hs * .4];
          ink(ellPts(c, a.p, hs * .55, hs0 * wr[2] * .36 / Math.sqrt(st2)), wr[2], al, F("fa" + i) + (live ? Math.min(1, Math.abs(a.v) * .08) : 0));
          if (live && glow > .02) sprite(g, hueAt(wr[1]), wr[0], wr[1], hs0 * wr[2] * 1.6, (.1 + .4 * Math.min(1, Math.abs(a.v) * .06)) * glow * al); } }); }
      // neck and head: a thick neck under a smooth egg-shaped head with a soft jaw, tilting with the neck
      { const s = J.head[2], hr = hr0 * s; Q.push({ z: zOf(J.neck, J.chest) - .01, fn: () => ink(limbPts(J.chest, J.head, .045 * U * s * m, .05 * U * s * m, .4, .04 * U * s, 0), s, al, F("head")) });
        Q.push({ z: J.head[3] + .01, fn: () => { const ang = Math.atan2(J.head[1] - J.neck[1], J.head[0] - J.neck[0]) + Math.PI / 2, ca = Math.cos(ang), sa = Math.sin(ang), w = hr * .78, h = hr * .98;
          const loc = [[0, -h], [w * .78, -h * .82], [w, -h * .22], [w * .9, h * .35], [w * .55, h * .82], [0, h], [-w * .55, h * .82], [-w * .9, h * .35], [-w, -h * .22], [-w * .78, -h * .82]];
          ink(loc.map(([x, y]) => [J.head[0] + x * ca - y * sa, J.head[1] + x * sa + y * ca]), s, al, F("head")); } }); }
      // the layer draws additively; switch to normal painting so nearer parts hide what is behind them, as in the reference
      const op0 = g.globalCompositeOperation; g.globalCompositeOperation = "source-over"; Q.sort((a, b) => a.z - b.z); g.lineJoin = "round"; g.lineCap = "round"; Q.forEach(q => q.fn()); g.globalCompositeOperation = op0; };
    // ---- floor glow under the feet
    if (k("floor") > .02 && glow > .02) { const fy = Math.max(J.ankles[0][1], J.ankles[1][1]) + hs0 * .65 * J.ankles[0][2], fx = (J.ankles[0][0] + J.ankles[1][0]) / 2, rx = U * .32 * J.hipC[2], gr = g.createRadialGradient(fx, fy, 0, fx, fy, rx);
      gr.addColorStop(0, hsl(hue, 90, 55, .8 * k("floor") * glow * (1 + .5 * loud))); gr.addColorStop(1, hsl(hue, 90, 50, 0)); g.save(); g.translate(fx, fy); g.scale(1, .1); g.translate(-fx, -fy); g.fillStyle = gr; g.beginPath(); g.arc(fx, fy, rx, 0, TAU); g.fill(); g.restore(); }
    // ---- flick echoes: ghost hands tracing each hand, drifting and fading; more when loud
    if (k("echo") > .02) { const maxN = Math.round(L("echolen", 6, 40) * (.4 + .6 * loud + .4 * R.kick));
      for (let i = 0; i < 2; i++) { const tr = st.trail[i], a = hAng[i], w = J.wrists[i]; if (Math.abs(a.v) > .6 || Math.hypot(st.hands[i].x.v, st.hands[i].y.v, st.hands[i].z.v) > .35) tr.push({ x: w[0], y: w[1], s: w[2], a: a.p, age: 0, v: Math.min(3, Math.abs(a.v) * .1) }); while (tr.length > maxN) tr.shift();
        tr.forEach(e => e.age += dt); st.trail[i] = tr.filter(e => e.age < 1.1);
        st.trail[i].forEach((e, j) => { if (j % 3) return; const fd = 1 - e.age / 1.1, al = fd * fd * .5 * k("echo"), sc = (1 + e.age * .9) * e.s, ang = e.a + e.age * 1.6 * (i ? 1 : -1), c = [e.x + Math.cos(ang) * e.age * U * .04, e.y + Math.sin(ang) * e.age * U * .04 - e.age * U * .02], ux = Math.cos(ang), uy = Math.sin(ang), len = hs0 * (1 + e.v * .4) * sc, wid = hs0 * .45 * sc; g.beginPath(); g.ellipse(c[0] + ux * len * .45, c[1] + uy * len * .45, len * .55, wid * .8, ang, 0, TAU); g.lineWidth = lw0 * .8 * e.s; g.strokeStyle = hsl(hue - spread * 1.1 + e.age * 60, 95, 70, al); g.stroke(); }); } }
    else st.trail = [[], []];
    // ---- pose freezes: on each kick, stamp the pose; it stays dim for N beats then fades
    if (k("freeze") > .02 && newBeat && R.kick > .25) { st.freezes.push({ J: JSON.parse(JSON.stringify(J)), hA: hAng.map(a => ({ p: a.p, v: 0 })), fA: fAng.map(a => ({ p: a.p, v: 0 })), age: 0 }); while (st.freezes.length > 5) st.freezes.shift(); }
    const holdS = I("hold") * gap; st.freezes.forEach(fz => fz.age += dt); st.freezes = st.freezes.filter(fz => fz.age < holdS);
    st.freezes.forEach(fz => { const al = Math.pow(1 - fz.age / holdS, 1.3) * .5 * k("freeze"); drawBody(fz.J, fz.hA, fz.fA, al, false); });
    // ---- the live figure
    drawBody(J, hAng, fAng, 1, true);
    if (glow > .02) sprite(g, hue, J.head[0], J.head[1], U * .07 * J.head[2], .25 * glow * (1 + loud));
  } };
FORM.serve2 = SERVE2;
