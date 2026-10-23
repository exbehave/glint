"""Rebuild engine/servelet.js and casting/servelet.js: Serve classic's motion (sliced verbatim from engine/serve.js,
between 'draw(E) {' and '// ---- drawing:') plus Servelet's own drawing in casting/servelet-draw.js.
Run from the repo root: python3 casting/make_servelet.py"""
# Servelet's own motion changes, applied to the copied motion. Round 2 (Oct 22, 22:12) fixed Kennedy's "hands jerk back and
# forth" / "puppet master" notes but made the dance boring (Kennedy, 22:30: "it's not really posing like it was before"), so every
# hand change now rides the "Hand follow-through" slider (key settle): 0 = exactly Serve classic's hands (the default),
# 1 = round 2 in full. ST = clamp(k("settle")) is defined at the top of the motion.
MOTION_PATCHES = [
  ('const { g, n, R, S, st, dt, t, L, I, k } = E,',
   'const { g, n, R, S, st, dt, t, L, I, k } = E, ST = Math.max(0, Math.min(1, k("settle"))),'),
  # arm lag lowered the damping (lag maxed = zeta .18, so hands bounced past every target); with follow-through up, lag
  # softens the spring instead and the damping rises toward .95
  ('fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2), Carm = 2 * L("armlag", .9, .18) * Math.sqrt(Karm)',
   'fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2) * lerp(1, lerp(1, .3, k("armlag")), ST), Carm = 2 * lerp(L("armlag", .9, .18), .95, ST) * Math.sqrt(Karm)'),
  ('KK = lerp(Karm, K, k("rubber") * .35), CC = lerp(Carm, C, k("rubber") * .35)',
   'KK = lerp(Karm, K, k("rubber") * .35), CC = lerp(lerp(Carm, C, k("rubber") * .35), 2 * .95 * Math.sqrt(KK), ST)'),
  # duck walk arms: with follow-through past halfway, new targets once a bar instead of every beat; the fast wobble fades into the body bounce
  ('for (let i = 0; i < 2; i++) { const a = st.duckArm[i]; a[0] = (Math.random() - .5) * .3; a[1] = (Math.random() - .5) * .3; if (bn % 4 === i * 2 && Math.random() < k("flings") * 1.4) a[0] += .8 * (Math.random() > .5 ? 1 : .35); }',
   'for (let i = 0; i < 2; i++) { const a = st.duckArm[i]; if (ST < .5 || bn % 4 === 0 || a[3] == null) { a[3] = (Math.random() - .5) * .3; a[4] = (Math.random() - .5) * .3; } a[0] = a[3]; a[1] = a[4]; if (bn % 4 === i * 2 && Math.random() < k("flings") * 1.4) a[0] += .8 * (Math.random() > .5 ? 1 : .35); }'),
  ('(.05 + da[1]) * (ua + fa) + .05 * Math.sin(t * TAU / gap * 2 + i), .12]',
   '(.05 + da[1]) * (ua + fa) + lerp(.05 * Math.sin(t * TAU / gap * 2 + i), bounce * .5, ST), .12]'),
  # a hand's next angle is picked as the arm arrives at a new pose (follow-through past halfway)
  ('st.hcl ||= [0, 0]; st.hcl[i] -= dt;',
   'st.hcl ||= [0, 0]; if (st.poseT === t) st.hcl[i] = .85 / (3 * L("posespeed", .15, 1.6)) * (.85 + .3 * Math.random()); st.hcl[i] -= dt;'),
  # while the hand travels the wrist trails behind, then flicks into place; strength follows the slider
  ('s.p = ht + svAng(s.p - ht); svSpr(s, ht,',
   'const pw = st.prev && st.prev["w" + i], spd = pw ? Math.hypot(J.wrists[i][0] - pw[0], J.wrists[i][1] - pw[1]) / Math.max(dt, 1e-3) / U : 0; let hT = ht; if (pw && spd > .25) { const trail = Math.atan2(pw[1] - J.wrists[i][1], pw[0] - J.wrists[i][0]); hT += svAng(trail - hT) * Math.min(.75, (spd - .25) * .5) * Math.max(ST, k("swish")); } s.p = hT + svAng(s.p - hT); svSpr(s, hT,'),
  ('K * (st.hat[i].out ? .6 : 1.4), st.hat[i].out ? 2 * Math.max(.45, zeta) * Math.sqrt(K * .6) : C * .8, dt)',
   'K * (st.hat[i].out ? .6 : 1.4), st.hat[i].style ? 2 * .42 * Math.sqrt(K * 1.4) : lerp(st.hat[i].out ? 2 * Math.max(.45, zeta) * Math.sqrt(K * .6) : C * .8, 2 * .45 * Math.sqrt(K * (st.hat[i].out ? .6 : 1.4)), ST), dt)'),
  # ---- round 3 (Oct 22, 22:45, Kennedy: "it keeps reverting back to the same poses"; wants ~30 pre-selected poses, and a swishy
  # windshield-wiper motion in both vogue and the duck walk, like the geometric version had)
  # a 32-pose library dealt like a shuffled deck: every pose comes up once before any repeats (st.forcePose pins one, for the pose sheet)
  ('if (bn % every === 0) { let p = st.pose; while (p === st.pose) p = Math.floor(Math.random() * SV_POSES.length); st.pose = p;',
   'if (bn % every === 0) { let p; if (st.forcePose != null) p = st.forcePose; else { if (!st.deck || !st.deck.length) { st.deck = SL_POSES.map((_, j) => j).sort(() => Math.random() - .5); if (st.deck[st.deck.length - 1] === st.pose) st.deck.unshift(st.deck.pop()); } p = st.deck.pop(); } st.pose = p;'),
  # Servelet's hands always use the landing finishes below (the Hand motion picker and its Flick size / Hands point outward are dropped)
  ('const fmode = I("fdir")', 'const fmode = 0'),
  ('pose = SV_POSES[st.pose](reach)', 'pose = SL_POSES[st.pose % SL_POSES.length].f(reach)'),
  # vogue transitions swing along an arc around the shoulder (the hand bows out mid-path) and land with a small overshoot (Swish)
  ('handT[i] = V3.mix(st.handFrom[i], handT[i], svEaseIO(u)); }',
   'const SW = k("swish"); if (st.poseT === t && i === 0) { const q = Math.random(), sn = .12 + .35 * (1 - SW); st.tt = q < sn ? "snap" : q < sn + (1 - sn) * .55 ? "arc" : "wiper"; } const TT = st.tt || "arc"; if (TT === "snap") handT[i] = V3.mix(st.handFrom[i], handT[i], svEaseIO(Math.min(1, u * 1.6))); else { const e0 = svEaseIO(u), c1 = 1.2 * SW, ob = u >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2), e = lerp(e0, ob, Math.min(1, SW * 1.2)); const shp = i ? shR : shL, a0 = V3.sub(st.handFrom[i], shp), a1 = V3.sub(handT[i], shp), r0 = V3.len(a0), r1 = V3.len(a1), dir = V3.norm(V3.mix(V3.norm(a0), V3.norm(a1), e)), rad = lerp(r0, r1, e) + SW * .28 * (ua + fa) * Math.sin(Math.PI * Math.min(1, Math.max(0, e))); let hp = V3.mix(V3.mix(st.handFrom[i], handT[i], e), V3.add(shp, dir, rad), Math.max(.35, SW)); if (TT === "wiper") { const sw = Math.sin(TAU * Math.min(1, u)) * (1 - Math.min(1, u)) * (.35 + .4 * SW) * (ua + fa); hp = V3.add(hp, [(i ? 1 : -1) * sw, -Math.abs(sw) * .35, 0]); } handT[i] = hp; } }'),
  # rolling hands: when the hands come close together they circle each other (half a turn per dancer beat) instead of sitting still
  ('st.handPrev = handT.map(h => h.slice()); }',
   'st.handPrev = handT.map(h => h.slice()); { const RL = k("roll"), dd = V3.len(V3.sub(handT[0], handT[1])), near = .5 * (ua + fa); if (RL > .01 && dd < near) { const amt = (1 - dd / near) * RL, phi = Math.PI * (bn + ph), rr = .1 * (ua + fa) * amt; for (let i = 0; i < 2; i++) handT[i] = V3.add(handT[i], [Math.cos(phi + i * Math.PI) * rr, Math.sin(phi + i * Math.PI) * rr, Math.sin(phi * .5 + i) * rr * .5]); } } }'),
  # duck walk: the forearms sweep side to side on the beat like windshield wipers, both the same way, rising at the middle of each sweep
  ('handT.push(V3.mix(vog, dk, duck)); }',
   'const WP = k("wiper"), DV = k("duckvogue"), wA = WP * (Math.PI / 2.6) * Math.cos(Math.PI * (bn + ph)), wR = (ua + fa) * .5, base = V3.mix(vog, dk, duck * (1 - DV)), fin = WP > .01 ? V3.add(base, [Math.sin(wA) * wR * duck, ((1 - Math.cos(wA)) * wR - WP * .25 * wR) * duck, 0]) : base; handT.push(fin); }'),
  # hand finishes: each landing picks one. Egyptian (flat, pointing sideways away from the body) at most a share set by the
  # Egyptian hands slider; mostly the wrist flicks so the hand tips up, sometimes down on a reach, sometimes straight along the arm.
  ('st.hat[i] = { abs: false, out: true, a: (Math.random() - .5) * 2 * spreadA * (Math.random() < .35 + .65 * (1 - bias) ? 1 : .35) };',
   '{ const EG = k("egypt"), rr = Math.random(); st.hat[i] = { style: rr < EG ? "egypt" : rr < EG + (1 - EG) * .6 ? "up" : rr < EG + (1 - EG) * .88 ? "down" : "line", b: .55 + .55 * Math.random(), a: 0 }; }'),
  ('ht = st.hat[i].abs ? st.hat[i].a : (st.hat[i].out ? odir : fdir) + st.hat[i].a;',
   'ht = (() => { const h = st.hat[i]; if (h.style) { if (h.style === "egypt") return J.wrists[i][0] >= J.chest[0] ? 0 : Math.PI; if (h.style === "line") return fdir; const want = h.style === "up" ? -Math.PI / 2 : Math.PI / 2, d = svAng(want - fdir); return fdir + Math.sign(d || 1) * Math.min(Math.abs(d), h.b); } return h.abs ? h.a : (h.out ? odir : fdir) + h.a; })();'),
  # ---- round 5 (Oct 22, 23:28, from Kennedy's reference video of a voguer in purple: big overhead sweeps, the palm flicked back at the
  # end of a reach, voguing down on one knee, and a death drop; plus Kennedy's note that any squat depth above 0 made the duck-walk
  # legs look inverted, so the old 0 now sits at 75% and lower values squat less)
  ('st.dF = Math.min(1, st.dF + dt * 1.6); const mixF = svEaseIO(st.dF), duck = lerp(st.dPrev === 2 ? 1 : 0, st.dCur === 2 ? 1 : 0, mixF);',
   'st.dF = Math.min(1, st.dF + dt * 1.6); const mixF = svEaseIO(st.dF), duck0 = lerp(st.dPrev === 2 ? 1 : 0, st.dCur === 2 ? 1 : 0, mixF);'
   # kneeling vogue: on a bar, sometimes go down on one knee for a few bars and keep voguing with the arms
   ' st.wall = (st.wall || 0) + dt; st.kn ||= { on: false, f: 0, until: 0, back: 1 }; const KNs = st.kn;'
   ' if (bar && !st.dd && st.ddPend == null && duck0 < .5) { if (KNs.on && bn >= KNs.until) KNs.on = false; else if (!KNs.on && k("kneel") > .02 && Math.random() < k("kneel") * .45) { KNs.on = true; KNs.until = bn + I("kneelbars") * 4; KNs.back = Math.random() < .5 ? 0 : 1; st.yawT = st.yaw.p + svAng((Math.random() < .5 ? 1 : -1) * (.45 + Math.random() * .5) - st.yaw.p); } }'
   ' if (st.dCur === 2 && duck0 > .5) KNs.on = false; KNs.f = clamp(KNs.f + (KNs.on ? 1 : -1) * dt * 1.5, 0, 1); const KN = svEaseIO(KNs.f);'
   # death drop: on beat drops (a quiet break, then a loud return on a kick), loud hits, every 8 bars, or the button
   ' const rawL = R.raw || 0; st.dslow = lerp(st.dslow ?? rawL, rawL, 1 - Math.exp(-dt / 6)); st.dfast = lerp(st.dfast ?? rawL, rawL, 1 - Math.exp(-dt / .25)); st.sinceDD = (st.sinceDD ?? 99) + dt;'
   ' const ddw = I("ddrop"), dsens = L("ddsens", .75, 1.35); if (st.dfast < st.dslow * .62 * dsens) st.brk = (st.brk || 0) + dt; else st.brk = Math.max(0, (st.brk || 0) - dt * .4);'
   ' let fireDD = false; { const req = E.node && E.node.shape && E.node.shape.ddnow; if (req && req !== st.ddReq) { if (st.ddReq != null || Date.now() - req < 3000) fireDD = true; } st.ddReq = req || st.ddReq || 0; }'
   ' if (!st.dd && st.sinceDD > 4) { if (E.beat && R.raw != null) { if (ddw === 1 && st.brk > .8 && st.dfast > st.dslow * (1.12 / dsens)) fireDD = true; if (ddw === 2 && st.dfast > st.dslow * (1.5 / dsens)) fireDD = true; } if (ddw === 3 && (st.ddAcc || 0) >= [4, 8, 16, 32][I("ddevery")] * 4) fireDD = true; } st.ddAcc = ddw === 3 && !st.dd && st.ddPend == null ? (st.ddAcc || 0) + dt / gap0 : 0;'
   ' if (fireDD && !st.dd && st.ddPend == null && dsel !== 2) st.ddPend = st.wall; if (st.ddPend != null && !st.dd) { KNs.on = false; if (dsel === 0 && st.dCur === 2) { st.dPrev = 2; st.dCur = 1; st.dF = 0; st.segStart = bn; st.dropUntil = null; } if (st.wall - st.ddPend > 5) st.ddPend = null; }'
   ' if (st.ddPend != null && !st.dd && duck0 < .03 && KNs.f < .03) { st.ddPend = null; const ep = I("ddend"), picks = SL_DD_PICK.length ? SL_DD_PICK : SL_DD_ENDS.map((_, j) => j); st.dd = { t: 0, front: Math.random() < .5 ? 0 : 1, lead: Math.random() < .5 ? 0 : 1, legMove: Math.floor(Math.random() * SL_DD_LEGUP.length), legV: SL_DD_LEG_POOL[Math.floor(Math.random() * SL_DD_LEG_POOL.length)], end: st.forceEnd ?? (ep > 0 ? ep - 1 : picks[Math.floor(Math.random() * picks.length)]) }; st.brk = 0; KNs.on = false; st.yawT = st.yaw.p + svAng((Math.random() < .5 ? 1 : -1) * (1.0 + Math.random() * .35) - st.yaw.p); st.hat = [{ style: "up", b: 1.35, a: 0 }, { style: "up", b: 1.2, a: 0 }]; }'
   # phases: wind up (rise, the arm sweeps up) → fall (gravity) → hold on the floor, arched back → rise
   # DD = how far down (hips on the floor), DL = how far the torso has fallen back, LU = the raised leg's climb, HU = the hands forming the ending pose
   ' let DD = 0, DA = 0, DL = 0, DP = 0, LU = 0, HU = 0; if (st.dd) { const D = st.dd, prep = .5, fall = .8, hold = Math.max(.8, I("ddhold") * gap), rise = .75; D.t += dt; D.hold = hold;'
   ' if (D.t < prep) { const u = D.t / prep; DA = svEaseIO(u) * .7; DP = 1.6 * Math.sin(Math.PI * u); }'
   ' else if (D.t < prep + fall) { const u = (D.t - prep) / fall; DD = u * u; DA = .7 + .3 * u; DL = Math.pow(u, .8); }'
   ' else if (D.t < prep + fall + hold) { const u = (D.t - prep - fall) / hold; DD = 1; DA = 1; DL = 1 + .18 * svEaseIO(u); LU = svEaseIO(u); HU = svEaseIO(Math.min(1, u * 1.1)); }'
   ' else if (D.t < prep + fall + hold + rise) { const u = svEaseIO((D.t - prep - fall - hold) / rise); DD = 1 - u; DA = 1 - u; DL = 1.18 * (1 - u); LU = 1 - u; HU = 1 - u; }'
   ' else { st.dd = null; st.sinceDD = 0; st.hcl = [0, 0]; } }'
   ' const duck = duck0 * (1 - Math.max(KN, DD));'),
  # no dance switches while a drop is waiting or happening
  ('if (newBeat && bn - st.segStart >= segLen)', 'if (newBeat && bn - st.segStart >= segLen && !st.dd && st.ddPend == null)'),
  ('if (k("dropduck") > .02 && st.dCur === 1 &&', 'if (k("dropduck") > .02 && st.dCur === 1 && !st.dd && st.ddPend == null &&'),
  # once down nothing breathes: the vogue bends, lean and head nod straighten out, and automated arm length / elbows hold still
  ('const armL = L("armlen", .22, .5)', 'const armL = st.dd ? (st.dd.armL ??= L("armlen", .22, .5)) : L("armlen", .22, .5)'),
  ('const eo = L("elbows", 0, 1)', 'const eo = st.dd ? (st.dd.eo ??= L("elbows", 0, 1)) : L("elbows", 0, 1)'),
  ('svSpr(st.nod, st.nodT * (1 - duck) + duck * .15 * Math.sin(t * TAU / gap) * k("nod"), 40, 7, dt);', 'svSpr(st.nod, (st.nodT * (1 - duck) + duck * .15 * Math.sin(t * TAU / gap) * k("nod")) * (1 - DA), 40, 7, dt);'),
  ('const arch = L("arch", .25, 1), wb = k("waist") * (1 - duck);', 'const arch = st.dd ? (st.dd.arch ??= L("arch", .25, 1)) : L("arch", .25, 1), wb = k("waist") * (1 - duck) * (1 - DA);'),
  ('+ st.leanT * (1 - duck) + L("dlean"', '+ st.leanT * (1 - duck) * (1 - DA) + L("dlean"'),
  # while down (kneeling or dropped) the dancer stays put: no roaming, turning or spinning
  ('if (bar && roam > .02 && Math.random() < .35 + .5 * roam) st.tgt =', 'if (bar && !st.dd && KN < .05 && roam > .02 && Math.random() < .35 + .5 * roam) st.tgt ='),
  ('if (roam < .02) st.tgt = [0, 0];', 'if (roam < .02) st.tgt = [0, 0]; if (st.dd || KN > .05) st.tgt = [st.pos.x.p, st.pos.z.p];'),
  ('if (st.moving) st.yawT = Math.atan2(vx, vz);', 'if (st.moving && !st.dd && KN < .05) st.yawT = Math.atan2(vx, vz);'),
  ('else if (bar && Math.random() < k("turns") * .8)', 'else if (bar && !st.dd && KN < .05 && Math.random() < k("turns") * .8)'),
  ('if (newBeat && k("spins") > .02 &&', 'if (newBeat && !st.dd && KN < .05 && k("spins") > .02 &&'),
  # squat depth: hips .40 (shallow) → .24 (the old 0, now at 75%) → .19 off the floor; past that the legs folded backward
  ('lerp(floor - .24, floor - .07, k("squat"))', 'floor - (q => q < .75 ? lerp(.4, .24, q / .75) : lerp(.24, .19, (q - .75) / .25))(k("squat2"))'),
  # hips: kneeling sits on the back thigh; the drop lands on the floor; the wind-up lifts a little
  ('svSpr3(st.hip, [sway, squatY + lerp(vb, bounce, duck), 0], 900, 55, dt);',
   'svSpr3(st.hip, [sway * (1 - KN) * (1 - DD), lerp(lerp(squatY + lerp(vb, bounce, duck), floor - thigh * .97 + vb * .5, KN), floor - .05, DD) - .025 * DP, -.03 * KN - .08 * DD - .04 * LU], 900, 55, dt);'),
  # the drop lays the torso back
  ('const waist = V3.add(hipC, [sideB * .06, -.15, .05 * arch + fwdB * .04]);',
   'const PA = DL * 1.22, RB = (v, f) => { if (!PA) return v; const a = PA * f, c = Math.cos(a), s_ = Math.sin(a); return [v[0], v[1] * c - v[2] * s_, v[2] * c + v[1] * s_]; }; const waist = V3.add(hipC, RB([sideB * .06, -.15, .05 * arch + fwdB * .04], .6));'),
  ('const chest = V3.add(waist, [sideB * .12, -.17 + .02 * Math.abs(fwdB), -.1 * arch + fwdB * .14]);',
   'const chest = V3.add(waist, RB([sideB * .12, -.17 + .02 * Math.abs(fwdB), -.1 * arch + fwdB * .14], 1));'),
  ('const neck = V3.add(chest, [sideB * .02, -.045, .02 * arch]), head = V3.add(neck, [sideB * .03 + st.nod.p * .03, -.062, .03 * arch + fwdB * .02]);',
   'const neck = V3.add(chest, RB([sideB * .02, -.045, .02 * arch], 1.3)), head = V3.add(neck, RB([sideB * .03 + st.nod.p * .03, -.062, .03 * arch + fwdB * .02], 1.6));'),
  # legs: kneeling = back knee on the floor, front foot planted; drop = front leg straight along the floor, back leg folded out to the side
  ('feetT.push([lerp(vx_, dx_, duck), lerp(floor - .015, dy_, duck), lerp(vz_, dz_, duck), 1 + kc * .9 * duck]);',
   'const KB = KNs.back === i, FR = st.dd ? st.dd.front === i : i === 1, f0_ = [lerp(vx_, dx_, duck), lerp(floor - .015, dy_, duck), lerp(vz_, dz_, duck)], kF_ = KB ? [sd * .07, floor - .01, -shin * .92] : [sd * .09, floor - .015, .2], BL_ = SL_DD_LEGS[st.ddLegV ?? (st.dd ? st.dd.legV : 0)](sd, floor, legL, shin), dF_ = FR ? SL_DD_LEGUP[st.dd ? st.dd.legMove % SL_DD_LEGUP.length : 0](sd, floor, legL, LU, DD) : BL_.slice(0, 3);'
   ' feetT.push([0, 1, 2].map(j => lerp(lerp(f0_[j], kF_[j], KN), dF_[j], DD)).concat([lerp(1 + kc * .9 * duck, 1, Math.max(KN, DD))]));'),
  ('poles.push(V3.mix([sd * (crossF ? -.6 : .25), 0, 1], [sd * L("knees", .05, 1.2), 0, 1], duck)); }',
   'poles.push(V3.mix(V3.mix(V3.mix([sd * (crossF ? -.6 : .25), 0, 1], [sd * L("knees", .05, 1.2), 0, 1], duck), KB ? [sd * .1, .4, 1] : [sd * .15, -.3, 1], KN), FR ? [0, -1, .15] : BL_.slice(3, 6), DD)); }'),
  # while down, knees and hands never sink through the floor
  ('const knees = ankles.map((a, i) => svIK(i ? hipR : hipL, a, thigh, shin, poles[i]));',
   'const knees = ankles.map((a, i) => svIK(i ? hipR : hipL, a, thigh, shin, poles[i])).map(q => st.dd ? [q[0], Math.min(q[1], floor - .025), q[2]] : q);'),
  ('st.hands[i].x.p = w[0]; st.hands[i].y.p = w[1]; st.hands[i].z.p = w[2]; } return w; });',
   'st.hands[i].x.p = w[0]; st.hands[i].y.p = w[1]; st.hands[i].z.p = w[2]; } if (st.dd && w[1] > floor - .02) w = [w[0], floor - .02, w[2]]; return w; });'),
  ('svSpr3(st.feet[i], ft, Kleg, Cleg, dt)', 'svSpr3(st.feet[i], ft, Kleg * (st.dd ? 9 : 1), Cleg * (st.dd ? 3 : 1), dt)'),
  # overhead sweep: one arm swings up and over the head in a big arc while the other drifts out low the other way; a slower move
  ('u = Math.min(1, (t - st.poseT) * 3 * ps);', 'u = Math.min(1, (t - st.poseT) * 3 * ps * (st.tt === "over" ? .5 : 1));'),
  ('st.tt = q < sn ? "snap" : q < sn + (1 - sn) * .55 ? "arc" : "wiper"; }',
   'st.tt = Math.random() < k("over") * .6 ? "over" : q < sn ? "snap" : q < sn + (1 - sn) * .55 ? "arc" : "wiper"; st.ttLead = Math.random() < .5 ? 0 : 1; }'),
  ('if (TT === "wiper") {',
   'if (TT === "over") { const sd2 = i ? 1 : -1, ap = V3.add(shp, i === st.ttLead ? [sd2 * .1, -1.12, .14] : [sd2 * .95, .45, .2], ua + fa), P0 = st.handFrom[i], P2 = handT[i], ue = Math.min(1, Math.max(0, e)), Cc = [0, 1, 2].map(j => 2 * ap[j] - .5 * (P0[j] + P2[j])); hp = [0, 1, 2].map(j => (1 - ue) * (1 - ue) * P0[j] + 2 * ue * (1 - ue) * Cc[j] + ue * ue * P2[j] + (e - ue) * (P2[j] - P0[j])); } if (TT === "wiper") {'),
  # death drop arms: one thrown up and back, the other out low; both hands flicked back
  ('    // the hands chase their targets on a lagging spring',
   '    if (DA > 0) for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sh = i ? shR : shL, ld = st.dd && st.dd.lead === i; const EP = SL_DD_ENDS[st.dd ? st.dd.end % SL_DD_ENDS.length : 0].f, ev = ld ? EP[0] : EP[1], fU = st.dd ? svEaseIO(clamp((st.dd.t - .5) / .8, 0, 1)) : 1, up = ld ? [.25, -1, .05] : [.45, -.85, .05], wide = ld ? [1, -.3, -.05] : [1, -.15, .05], fl = [0, 1, 2].map(j => lerp(up[j], wide[j], fU)), bl = 1 + .12 * HU, tv = [0, 1, 2].map(j => lerp(fl[j], ev[j], HU) * bl); handT[i] = V3.mix(handT[i], V3.add(sh, [sd * tv[0], tv[1], tv[2]], ua + fa), DA); if (st.dd) st.hcl[i] = 9; }\n    // the hands chase their targets on a lagging spring'),
  # palm-back flick: the "up" finish bends further, and on a straight raised arm the hand bends back so the fingertips point out
  ('style: rr < EG ? "egypt" : rr < EG + (1 - EG) * .6 ? "up" : rr < EG + (1 - EG) * .88 ? "down" : "line", b: .55 + .55 * Math.random(), a: 0 }',
   'style: rr < EG ? "egypt" : rr < EG + (1 - EG) * .6 ? "up" : rr < EG + (1 - EG) * .88 ? "down" : "line", b: rr >= EG && rr < EG + (1 - EG) * .6 ? .95 + .45 * Math.random() : .55 + .55 * Math.random(), a: 0 }'),
  ('const want = h.style === "up" ? -Math.PI / 2 : Math.PI / 2,',
   'const ext = Math.hypot(J.wrists[i][0] - sh2[0], J.wrists[i][1] - sh2[1]) / Math.max(1, (ua + fa) * U * J.wrists[i][2]), want = h.style === "up" ? (Math.sin(fdir) < -.55 && ext > .82 ? (J.wrists[i][0] >= J.chest[0] ? 0 : Math.PI) : -Math.PI / 2) : Math.PI / 2,'),
]
src = open("engine/serve.js").read()
a = src.index("  draw(E) {\n") + len("  draw(E) {\n")
b = src.index("    // ---- drawing:")
motion = src[a:b]
for old, new in MOTION_PATCHES:
    assert motion.count(old) == 1, "motion patch no longer matches: " + old[:60]
    motion = motion.replace(old, new)
DROP = ["crest", "fdir", "head", "headstyle", "hand", "outward", "prism", "split", "sweep", "weight", "width", "wild"]
hdr = '''/* ================= Servelet (Oct 22, 2026, name picked by Kennedy) =================
   Serve classic's dancing (motion copied verbatim from engine/serve.js, which is frozen) on a realistic human body:
   one continuous neon outline around the whole silhouette, a dark fill, a head-to-toe color gradient, a few anatomy
   lines, and a glow spot on the floor (after a friend's breakdance video, whose body shape Kennedy liked).
   Generated by casting/make_servelet.py from engine/serve.js + casting/servelet-draw.js: edit those, then rerun. */
// Servelet's pose library (x outward from that shoulder, y down, z toward the room, in arm lengths; r = reach).
// Oct 22, 22:57: Kennedy kept 16 of the first 32 (old numbers 3 4 5 8 9 11 12 13 15 18 19 22 24 27 29 31) and asked for
// variations of those; each kept pose (k: its old number) is followed by two variations (a, b).
const SL_POSES = [
  { k: "3", n: "One up and out, one down", f: r => [[.95 * r, -.7 * r, .1], [.3, .85 * r, .1]] },
  { k: "3a", n: "One straight up, one out low", f: r => [[.45 * r, -1.05 * r, .05], [.55, .7 * r, .15]] },
  { k: "3b", n: "One up and back, one down in front", f: r => [[.85 * r, -.75 * r, -.35], [.25, .8, .35]] },
  { k: "4", n: "Framing the face", f: r => [[-.28, -.78, .3], [-.28, -.78, .3]] },
  { k: "4a", n: "One framing the face, one over the head", f: r => [[-.28, -.78, .3], [-.1, -1.05, .1]] },
  { k: "4b", n: "Both hands to one side of the face", f: r => [[.05, -.8, .25], [-.6, -.75, .3]] },
  { k: "5", n: "Behind the head", f: r => [[-.2, -.95, -.25], [-.2, -.95, -.25]] },
  { k: "5a", n: "One behind the head, one behind the back", f: r => [[-.2, -.95, -.25], [-.15, .75, -.35]] },
  { k: "5b", n: "One behind the head, one out to the side", f: r => [[-.2, -.95, -.25], [1.0 * r, -.3, .05]] },
  { k: "8", n: "Diagonal", f: r => [[.4, -1.05 * r, .05], [.7 * r, .6 * r, .2]] },
  { k: "8a", n: "Steep diagonal, top hand back", f: r => [[.25, -1.1 * r, -.15], [.55 * r, .75 * r, .25]] },
  { k: "8b", n: "Wide, flat diagonal", f: r => [[.85 * r, -.6 * r, .05], [.85 * r, .45 * r, .1]] },
  { k: "9", n: "Arms crossed over the chest", f: r => [[-.45, -.2, .3], [-.45, -.2, .3]] },
  { k: "9a", n: "Arms crossed low at the hips", f: r => [[-.4, .35, .3], [-.4, .35, .3]] },
  { k: "9b", n: "Arms crossed high at the neck", f: r => [[-.42, -.55, .32], [-.42, -.55, .32]] },
  { k: "11", n: "One hanging, one up by the head", f: r => [[.15, .95, .05], [-.05, -.75, .3]] },
  { k: "11a", n: "One down the back of the thigh, one behind the head", f: r => [[.1, .9, -.2], [-.2, -.95, -.2]] },
  { k: "11b", n: "One hanging in front, one straight up", f: r => [[.15, .9, .25], [.1, -1.1 * r, .05]] },
  { k: "12", n: "One out, one on the hip", f: r => [[.95 * r, .15, .1], [-.3, .5, -.05]] },
  { k: "12a", n: "One raised out at 45°, one on the hip", f: r => [[.8 * r, -.6 * r, .05], [-.3, .5, -.05]] },
  { k: "12b", n: "One low and forward, one on the hip", f: r => [[.8 * r, .4, .35], [-.3, .5, -.05]] },
  { k: "13", n: "Egyptian: one forearm up, one down", f: r => [[.55, -.55, .05], [.55, .45, .05]] },
  { k: "13a", n: "Egyptian: up forearm forward, down forearm back", f: r => [[.5, -.55, .3], [.5, .45, -.1]] },
  { k: "13b", n: "Egyptian: wide, one high, one low", f: r => [[.7, -.75, 0], [.7, .6, 0]] },
  { k: "15", n: "Egyptian: one by the ear, one out low", f: r => [[.3, -.75, .05], [.65, .2, .05]] },
  { k: "15a", n: "Egyptian: one by the ear, one out level", f: r => [[.3, -.75, .05], [.8 * r, -.05, .05]] },
  { k: "15b", n: "Egyptian: one by the ear, one behind the back", f: r => [[.3, -.75, .05], [-.15, .7, -.35]] },
  { k: "18", n: "Behind the back, below the butt", f: r => [[-.15, .78, -.38], [-.15, .78, -.38]] },
  { k: "18a", n: "One behind the back, one straight up", f: r => [[-.15, .78, -.38], [.1, -1.1 * r, .05]] },
  { k: "18b", n: "Both behind the back at the waist, elbows winged", f: r => [[-.25, .45, -.35], [-.25, .45, -.35]] },
  { k: "19", n: "Crown: hands meet over the head", f: r => [[-.22, -1.0, .05], [-.22, -1.0, .05]] },
  { k: "19a", n: "Tilted crown, leaning to one side", f: r => [[.05, -1.0, .05], [-.5, -.95, .05]] },
  { k: "19b", n: "Crown held in front of the face", f: r => [[-.22, -.95, .3], [-.22, -.95, .3]] },
  { k: "22", n: "Cradle: one arched over the head, one at the waist", f: r => [[-.12, -1.05, .05], [.2, .3, .28]] },
  { k: "22a", n: "Cradle low: one arched behind the head, one forward", f: r => [[-.15, -.95, -.15], [.35, .35, .4]] },
  { k: "22b", n: "Cradle: one arched over the head, one on the hip", f: r => [[-.12, -1.05, .05], [-.3, .5, -.05]] },
  { k: "24", n: "Prayer at the chest", f: r => [[-.42, -.08, .35], [-.42, -.08, .35]] },
  { k: "24a", n: "Prayer at the lips", f: r => [[-.4, -.45, .4], [-.4, -.45, .4]] },
  { k: "24b", n: "Prayer low, pointing forward", f: r => [[-.4, .3, .45], [-.4, .3, .45]] },
  { k: "27", n: "Point up the diagonal, hand on the chest", f: r => [[.75 * r, -.95 * r, .05], [-.4, -.15, .3]] },
  { k: "27a", n: "Point down the diagonal, hand on the chest", f: r => [[.8 * r, .6 * r, .15], [-.4, -.15, .3]] },
  { k: "27b", n: "Point up the diagonal, hand behind the head", f: r => [[.75 * r, -.95 * r, .05], [-.2, -.95, -.25]] },
  { k: "29", n: "Hand at the chin, other arm out", f: r => [[-.35, -.55, .35], [1.05 * r, -.25, .05]] },
  { k: "29a", n: "Hand at the chin, other arm up the diagonal", f: r => [[-.35, -.55, .35], [.8 * r, -.8 * r, .05]] },
  { k: "29b", n: "Hand at the chin, other on the hip", f: r => [[-.35, -.55, .35], [-.3, .5, -.05]] },
  { k: "31", n: "Dip: one behind the head, one down to the knee", f: r => [[-.2, -.95, -.2], [.25, .95, .25]] },
  { k: "31a", n: "Deep dip: one behind the head, one reaching past the knee", f: r => [[-.2, -.95, -.2], [.3, 1.05, .35]] },
  { k: "31b", n: "Dip: one straight up, one down to the knee", f: r => [[.1, -1.1 * r, .05], [.25, .95, .25]] },
];
// death drop endings: [lead arm, other arm], each [x outward from that shoulder, y down, z toward the room] in arm lengths, in
// the room's frame (she is lying back, so "up" is the sky and "back over the head" is -z). Oct 23: sent to Kennedy to pick by number.
const SL_DD_ENDS = [
  { n: "Reach for the sky", f: [[.15, -1, .15], [1, .2, 0]] },
  { n: "Surrender: both arms thrown back on the floor", f: [[.35, .15, -.95], [.35, .15, -.95]] },
  { n: "Swoon: back of the hand to the forehead", f: [[-.2, -.35, -.45], [1, .2, .1]] },
  { n: "Hand on the heart, other to the sky", f: [[.15, -1, .1], [-.4, -.3, .15]] },
  { n: "Wrists crossed to the sky", f: [[-.12, -1, .15], [-.12, -1, .15]] },
  { n: "Hide the eyes", f: [[-.35, -.4, -.35], [.95, .2, .1]] },
  { n: "Sprawl: arms wide on the floor", f: [[1, .2, -.1], [1, .2, -.1]] },
  { n: "Caught myself: one hand propped behind, one up", f: [[.35, .25, -.6], [.2, -1, .2]] },
  { n: "Frame the face", f: [[-.25, -.5, -.35], [-.25, -.5, -.35]] },
  { n: "Chase the foot", f: [[.1, -.75, .65], [.3, .15, -.9]] },
  { n: "Lounge: hands behind the head", f: [[-.2, -.2, -.7], [-.2, -.2, -.7]] },
  { n: "Flick to the room", f: [[.6, -.75, .5], [.25, .2, .8]] },
];
const SL_DD_PICK = []; // Kennedy's picks (indexes into SL_DD_ENDS); empty = Random uses them all
// the bent leg: [ankle x, y, z, knee pole x, y, z]
const SL_DD_LEGS = [
  (sd, fl, L, sh) => [sd * .24, fl - .02, -.1, sd, 0, .3],      // A: splayed out to the side, knee out, foot behind
  (sd, fl, L, sh) => [sd * .06, fl - .03, -.3, sd * .3, -.25, 1], // B: tucked under, knee forward, shin folded back under the body
  (sd, fl, L, sh) => [sd * .3, fl - .24, -.3, sd * .6, -.3, -1], // C: wrong way: knee bent backward, foot kicked up behind
  (sd, fl, L, sh) => [sd * .4, fl - .2, .02, sd, .45, 0],         // D: knee jammed down to the side, shin sticking up
];
// Oct 23, 00:14, Kennedy: "I mostly like A. D is okay" (B and C didn't look right): each drop picks A most of the time, D sometimes
const SL_DD_LEG_POOL = [0, 0, 0, 3];
// what the raised leg does while she's down (Oct 23, 00:32, Kennedy: not every drop should slowly lift the leg); one is picked per drop
const SL_DD_RAISE = (sd, fl, L, a) => [sd * .05, fl - .05 - L * .97 * Math.sin(a), -.08 + L * .97 * Math.cos(a)];
const SL_DD_LEGUP = [
  (sd, fl, L, LU, DD) => SL_DD_RAISE(sd, fl, L, lerp(.06, .66, LU)),         // slowly climbs to ~38°
  (sd, fl, L, LU, DD) => SL_DD_RAISE(sd, fl, L, lerp(.06, .7, Math.min(1, DD))), // flung up by the fall, then held still
  (sd, fl, L, LU, DD) => SL_DD_RAISE(sd, fl, L, .06 + .05 * LU),             // stays long along the floor
  (sd, fl, L, LU, DD) => [sd * .07, fl - .03, lerp(L * .9, L * .45, Math.min(1, DD))], // foot planted, knee bent up
];
const SERVELET_DROP = new Set(%s);
const SERVELET = { key: "servelet", name: "Servelet", fade: .55, init: SERVE.init,
  shape: [...SERVE.shape.filter(s => !SERVELET_DROP.has(s.key)).map(s => s.key === "squat" ? { key: "squat2", label: "Squat depth", def: .75, grp: "Duck walk", when: s.when } : s),
    { key: "width", label: "Build", def: .5, cfmt: v => v < .3 ? "Lean" : v < .7 ? "Athletic" : "Heavy", grp: "Body" },
    { key: "muscle", label: "Muscle", def: .6, grp: "Body" },
    { key: "defn", label: "Definition lines", def: .55, grp: "Body" },
    { key: "head", label: "Head size", def: .45, grp: "Body" },
    { key: "hand", label: "Hand size", def: .5, grp: "Hands" },
    { key: "settle", label: "Hand follow-through", def: 0, grp: "Hands" },
    { key: "egypt", label: "Egyptian hands", def: .2, cfmt: v => Math.round(v * 100) + "%% of landings", grp: "Hands" },
    { key: "roll", label: "Rolling hands when close", def: .6, grp: "Hands" },
    { key: "duckvogue", label: "Vogue arms in the duck walk", def: .75, grp: "Duck walk" },
    { key: "swish", label: "Swish between poses", def: .6, grp: "Vogue" },
    { key: "over", label: "Overhead sweeps", def: .35, grp: "Vogue" },
    { key: "kneel", label: "Kneel down", def: .3, grp: "Floor work" },
    { key: "kneelbars", label: "Stay kneeling for", min: 1, max: 4, def: 1 / 3, fmt: v => v + (v > 1 ? " bars" : " bar"), slide: true, grp: "Floor work" },
    { key: "ddrop", label: "Death drop", min: 0, max: 3, def: 1 / 3, fmt: v => ["Off", "Beat drops", "Loud hits", "On a timer"][v], grp: "Floor work" },
    { key: "ddevery", label: "Drop every", min: 0, max: 3, def: 2 / 3, fmt: v => ["4 bars", "8 bars", "16 bars", "32 bars"][v], grp: "Floor work", when: g => g("ddrop") === 3 },
    { key: "ddsens", label: "Drop sensitivity", def: .5, grp: "Floor work", when: g => [1, 2].includes(g("ddrop")) },
    { key: "ddhold", label: "Stay down for", min: 1, max: 8, def: 2 / 7, fmt: v => v + (v > 1 ? " beats" : " beat"), slide: true, grp: "Floor work" },
    { key: "ddend", label: "Ending pose", min: 0, max: 12, def: 0, fmt: v => v ? v + ". " + SL_DD_ENDS[v - 1].n : "Random", slide: true, grp: "Floor work" },
    { key: "ddnow", label: "Death drop now", button: true, grp: "Floor work" },
    { key: "wiper", label: "Wiper sweeps", def: .6, grp: "Duck walk" },
    { key: "weight", label: "Outline weight", def: .35, grp: "Look" },
    { key: "oglow", label: "Outline glow", def: .6, grp: "Look" },
    { key: "floor", label: "Floor glow", def: .7, grp: "Look" }],
  draw(E) {
''' % ("[" + ", ".join('"%s"' % d for d in DROP) + "]")
body = hdr + motion + open("casting/servelet-draw.js").read()
DESC = ("Serve classic's vogue and duck walk on a realistic human body: one continuous neon outline around the whole figure, "
        "a dark fill, a head-to-toe rainbow, chest and ab lines from the front, spine and shoulder blades from behind, and a glow "
        "spot on the floor. An arm crossing the chest is outlined on its own so it never melts into the body.")
open("engine/servelet.js", "w").write(body + "FORM.servelet = SERVELET;\n")
open("casting/servelet.js", "w").write(body + 'NEW_TRAITS.push({ form: SERVELET, char: "anchored", hue: 120, hy: .5, p: { chaos: .15, energy: .9, grace: .7, magnetism: 0, roam: 0, size: .5, social: .3, tempo: .45, trails: .5 }, desc: "%s" });\nFORM.servelet = SERVELET;\n' % DESC.replace('"', '\\"'))
print("servelet:", len(body), "chars")
