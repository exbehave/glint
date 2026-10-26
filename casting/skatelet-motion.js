    // ======== Skatelet motion (round 1, Oct 25, 2026): a figure skater, from Kennedy's layback-spin reference ========
    // One routine on a loop: glide on a long curve → step into a spin on the left blade → layback positions (from the clip)
    // → catch the free foot → Biellmann (the foot pulled up over the head, both hands on the blade) → exit → glide again.
    // Positions change on bar lines; spin speed follows loudness; a beat drop cuts into the catch-foot and Biellmann.
    // Everything is in the same local frame as Servelet (x right, y down, z toward the room), so Servelet's body drawing is reused.
    const { g, n, R, S, st, dt, t, L, I, k } = E, loud = tLoud(R), gap0 = svBeat(E, st), gap = gap0, ph = clamp(st.since / gap0, 0, 1), bn = st.beats || 0;
    const newBeat = bn !== (st.vb ?? -1); st.vb = bn; const bar = newBeat && bn > 0 && bn % 4 === 0;
    const U = S * L("size", .34, 1.0), hue = n.hue, glow = k("glow"), DL = 0;
    // beat drops: a quiet break, then a loud return (the same test as Servelet's death drop)
    const rawL = R.raw != null ? R.raw : loud; st.dslow = lerp(st.dslow ?? rawL, rawL, 1 - Math.exp(-dt / 6)); st.dfast = lerp(st.dfast ?? rawL, rawL, 1 - Math.exp(-dt / .25));
    if (st.dfast < st.dslow * .62) st.brk = (st.brk || 0) + dt; else st.brk = Math.max(0, (st.brk || 0) - dt * .4);
    let dropNow = false; if (E.beat && st.brk > .8 && st.dfast > st.dslow * 1.12) { dropNow = true; st.brk = 0; }
    // ---- the routine
    const SK = st.sk ||= { ph: "glide", at: bn, n: 0, lay: [], li: 0, biel: false, from: SK_SET.glide, to: SK_SET.glide, t0: -9 };
    const BM = I("biel"), spinBars = [4, 8, 12, 16][I("spinbars")], posBars = [1, 2, 4][I("posbars")], glideBars = [0, 1, 2, 4][I("glidebars")];
    const go = (ph, set) => { SK.from = SK.cur || SK.to; SK.to = set; SK.t0 = t; SK.ph = ph; SK.at = bn; };
    const layDeal = () => { if (!SK.deck || !SK.deck.length) { SK.deck = SK_LAY.map((_, j) => j).sort(() => Math.random() - .5); if (SK.deck[SK.deck.length - 1] === SK.lastLay) SK.deck.unshift(SK.deck.pop()); } SK.lastLay = SK.deck.pop(); return SK_LAY[SK.forceLay ?? SK.lastLay]; };
    const elapsed = bars => bn - SK.at >= bars * 4;
    if (SK.force) { go(SK.force, SK.force === "lay" ? layDeal() : SK_SET[SK.force]); if (SK.force === "entry") { SK.spinAt = bn; SK.n++; SK.biel = BM === 0 || (BM === 1 && SK.n % 2 === 0); } SK.force = null; }
    else if (dropNow && BM !== 3 && (SK.ph === "entry" || SK.ph === "lay")) go("catch", SK_SET.catch);
    else if (bar) {
      if (SK.ph === "glide" && elapsed(glideBars)) { SK.n++; SK.biel = BM === 0 || (BM === 1 && SK.n % 2 === 0); go("entry", SK_SET.entry); SK.spinAt = bn; }
      else if (SK.ph === "entry" && elapsed(1)) go("lay", layDeal());
      else if (SK.ph === "lay" && elapsed(posBars)) { const left = spinBars * 4 - (bn - SK.spinAt) - (SK.biel ? 12 : 4); if (left >= posBars * 4) go("lay", layDeal()); else go(SK.biel ? "catch" : "exit", SK.biel ? SK_SET.catch : SK_SET.exit); }
      else if (SK.ph === "catch" && elapsed(1)) go("biel", SK_SET.biel);
      else if (SK.ph === "biel" && elapsed(2)) go("exit", SK_SET.exit);
      else if (SK.ph === "exit" && elapsed(1)) { if (glideBars) go("glide", SK_SET.glide); else { SK.n++; SK.biel = BM === 0 || (BM === 1 && SK.n % 2 === 0); go("entry", SK_SET.entry); SK.spinAt = bn; } } }
    // blend from the last position to the new one (eased); every joint also rides a spring, so limbs lag and settle
    const tr = L("ease", .35, 2.2), u = svEaseIO(clamp((t - SK.t0) / tr, 0, 1)), mixA = (a, b) => Array.isArray(a) ? a.map((x, j) => mixA(x, b[j])) : lerp(a, b, u);
    const cur = SK.cur = {}; for (const key in SK.to) cur[key] = mixA(SK.from[key] ?? SK.to[key], SK.to[key]);
    const cs = clamp(cur.spin, 0, 1);
    // ---- travel: glide around a long ellipse on the ice; spinning holds the spot
    const legL = L("leglen", .36, .56), thigh = legL / 2, shin = legL / 2, floor = .46 + legL, armL = L("armlen", .24, .36), ua = armL * .51, fa = armL * .49;
    const xr = Math.max(.15, E.W * .5 / U - .6), zr = .4, glideW = clamp(1 - cs * 2, 0, 1); st.th ??= Math.PI / 2;
    { const sp = L("glidespeed", .12, .9) * (.8 + .4 * loud), dl = Math.hypot(xr * Math.sin(st.th), zr * Math.cos(st.th)) || 1; st.th += glideW * sp / dl * dt * SK_DIR; }
    { const Kw = 30, Cw = 2 * .95 * Math.sqrt(Kw); svSpr(st.pos.x, xr * Math.cos(st.th), Kw, Cw, dt); svSpr(st.pos.z, zr * Math.sin(st.th), Kw, Cw, dt); }
    // facing: one continuous turning rate — spinning on the blade, or steering to face the way she glides
    { const tx = -xr * Math.sin(st.th) * SK_DIR, tz = zr * Math.cos(st.th) * SK_DIR, tanYaw = Math.atan2(tx, tz);
      const spinRate = TAU * L("spin", .45, 2.4) * Math.max(.3, 1 + k("spinloud") * (loud - .35) * 1.6 + .25 * k("spinloud") * R.kick);
      const tgt = SK_DIR * spinRate * Math.max(0, cur.spin) + (1 - cs) * svAng(tanYaw - st.yaw.p) * 3;
      st.yr = lerp(st.yr || 0, tgt, 1 - Math.exp(-dt / .45)); st.yaw.p += st.yr * dt; st.spinning = Math.abs(st.yr) > 3; }
    const yaw = st.yaw.p, cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    // ---- the body in local space
    const body = k("body"), shW = L("shoulders", .07, .14) * lerp(.8, 1.3, body), hipW = L("hips", .04, .08) * lerp(1.35, .7, body), wW = L("waistw", .02, .075) * lerp(.85, 1.15, body);
    // the spine is a chain (2 lumbar, 2 thoracic, neck, head); a backbend is shared out in proportion to each region's real range
    // (adult extension ~31° lumbar, 22° thoracic, 63° cervical), scaled by Layback depth × Flexibility, each region capped (SK_SPINE)
    const D2R = Math.PI / 180, flex = L("flex", 1, 2), archT = cur.arch * L("layback", .4, 1.3), latT = cur.side, tilt = cur.tilt * D2R;
    const turn = (v, sa, pa) => { let [x, y, z] = v; const c = Math.cos(sa), s_ = Math.sin(sa); [x, y] = [x * c - y * s_, x * s_ + y * c]; const cb = Math.cos(pa), sb = Math.sin(pa); return [x, y * cb - z * sb, z * cb + y * sb]; };
    const chain = o => { let pa = tilt, sa = 0, p = o; const pts = [o], fr = [[0, tilt]];
      SK_SPINE.forEach(([len, ext, cap, lat]) => { pa += Math.min(ext * archT * flex, cap * flex) * D2R; sa += lat * latT * Math.min(flex, 1.4) * D2R; p = V3.add(p, turn([0, -len, 0], sa, pa)); pts.push(p); fr.push([sa, pa]); });
      return { pts, fr }; };
    // balance: shift the hips so her weight (trunk, head, free leg) stays over the skating blade
    const stand = [-hipW * .55, floor - .015, 0], hipY = floor - .015 - legL * (.995 - .16 * cur.bend);
    { const c0 = chain([0, hipY, 0]).pts, freeA = V3.add([hipW, hipY, 0], V3.norm(cur.leg), legL * .9), com = [c0[2], c0[4], c0[6], freeA, V3.mix([hipW, hipY, 0], freeA, .5), [0, hipY, 0]], wt = [.22, .25, .1, .1, .15, .18];
      let cx = 0, cz = 0; com.forEach((q, j) => { cx += q[0] * wt[j]; cz += q[2] * wt[j]; }); svSpr3(st.hip, [stand[0] - cx * .9 + hipW * .3, hipY, -cz * .9 + (cur.push || 0)], 500, 42, dt); }
    { const hl = [st.hip.x.p - hipW, st.hip.y.p, st.hip.z.p], d = V3.sub(hl, stand), dl = V3.len(d), mx = legL * .995; if (dl > mx) { const q = V3.add(stand, d, mx / dl); st.hip.x.p = q[0] + hipW; st.hip.y.p = q[1]; st.hip.z.p = q[2]; } }
    const hipC = svP(st.hip), SP = chain(hipC), [, l3, waist, t8, chest, neck, head] = SP.pts, frC = SP.fr[4], frW = SP.fr[2];
    const rotC = v => turn(v, frC[0], frC[1]);
    const shDir = V3.norm(rotC([1, 0, 0])), shL = V3.add(chest, shDir, -shW), shR = V3.add(chest, shDir, shW), hipL = V3.add(hipC, [-hipW, 0, 0]), hipR = V3.add(hipC, [hipW, 0, 0]);
    const wd = V3.norm(turn([1, 0, 0], frW[0], frW[1])), waistL = V3.add(waist, wd, -wW), waistR = V3.add(waist, wd, wW);
    // the torso's cross-sections along the spine (half width across, half depth front to back), so it bends as one smooth piece
    const XS = [[hipC, [1, 0, 0], hipW * 1.2, .068], [l3, turn([1, 0, 0], SP.fr[1][0], SP.fr[1][1]), wW + .014, .055], [waist, wd, wW + .004, .05], [t8, turn([1, 0, 0], SP.fr[3][0], SP.fr[3][1]), shW * .72, .06], [chest, shDir, shW * .74, .058]];
    // legs: the left blade stays planted under her; the free leg takes the position's shape (Free leg height tips it up or down)
    const up = (k("freeleg") - .5) * .7, lv = cur.leg, lvn = V3.norm(lv), lr = [lvn[0], lvn[1] * Math.cos(up) + lvn[2] * Math.sin(up), lvn[2] * Math.cos(up) - lvn[1] * Math.sin(up)];
    // in a layback the free leg joins the curve of her back (Kennedy, Oct 25): the knee bends more and the foot comes in closer (curl =
    // how much, per position). The thigh keeps its length: Kennedy, Oct 26, "the femur needs to stay proportional to the tibia"
    const curl = clamp(cur.curl || 0, 0, 1), thighF = thigh, reachF = thighF + shin;
    const freeT = V3.add(hipR, lr, reachF * Math.min(.97, V3.len(lv)) * (1 - .2 * curl));
    const Kleg = Math.pow(TAU * L("legspeed", .6, 6), 2), Cleg = 2 * .85 * Math.sqrt(Kleg);
    svSpr3(st.feet[0], stand, 4000, 2 * .95 * Math.sqrt(4000), dt); svSpr3(st.feet[1], freeT, Kleg, Cleg, dt);
    // limbs never stretch: the free foot is held within leg length of its hip, and the hip within reach of the skating blade
    { const f1 = st.feet[1], d = V3.sub(svP(f1), hipR), dl = V3.len(d), mx = reachF * .985; if (dl > mx) { const q = V3.add(hipR, d, mx / dl); f1.x.p = q[0]; f1.y.p = q[1]; f1.z.p = q[2]; } }
    const ankles = [svP(st.feet[0]), svP(st.feet[1])].map(a => (a.push(1), a));
    const knees = [svIK(hipL, ankles[0], thigh, shin, [-.1, 0, 1]), svIK(hipR, ankles[1], thighF, shin, V3.norm(cur.pole))]; st.legX = V3.len(V3.sub(ankles[1], hipR)) / reachF;
    const soles = [0, 1].map(i => { const hp = i ? hipR : hipL, a = ankles[i], dd = V3.norm(V3.sub(a, knees[i])), kb = V3.sub(knees[i], V3.mix(hp, a, .5)), pole = i ? V3.norm(cur.pole) : [0, 0, 1];
      const fr = V3.len(kb) > .01 ? kb : pole, dot = fr[0] * dd[0] + fr[1] * dd[1] + fr[2] * dd[2], pf = V3.add(fr, dd, -dot); return V3.len(pf) > 1e-3 ? V3.norm(pf).map(v => -v) : [0, -1, 0]; });
    // arms: the position's pose turns with the torso; they float a little; in the catch and the Biellmann the hands go to the blade
    const blade = V3.add(ankles[1], [0, -.015, 0]), handT = [];
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sh = i ? shR : shL, pv = cur.arms[i], aw = [sd * pv[0], pv[1], pv[2]], off = V3.mix(rotC(aw), aw, clamp(cur.up || 0, 0, 1)), fl = (ua + fa) * .07 * k("float");
      let h = V3.add(V3.add(sh, off, ua + fa), [Math.sin(t * .7 + i * 2.1) * fl, Math.sin(t * .53 + i) * fl, Math.cos(t * .61 + i) * fl * .6]);
      h = V3.mix(h, blade, Math.max(cur.hold, i === 1 ? cur.reach : 0)); handT.push(h); }
    const fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2), Carm = 2 * .8 * Math.sqrt(Karm);
    const wrists = handT.map((h, i) => { const sh = i ? shR : shL; svSpr3(st.hands[i], h, Karm, Carm, dt); let w = svP(st.hands[i]); const d = V3.sub(w, sh), dl = V3.len(d); if (dl > ua + fa - .005) { w = V3.add(sh, d, (ua + fa - .005) / dl); st.hands[i].x.p = w[0]; st.hands[i].y.p = w[1]; st.hands[i].z.p = w[2]; } return w; });
    const eo = L("elbows", 0, 1), elbows = wrists.map((w, i) => svIK(i ? shR : shL, w, ua, fa, [(i ? 1 : -1) * (.1 + .9 * eo), .5 - .4 * eo, -.3 - .5 * eo]));
    // ---- world space: turn by yaw, move to her spot on the ice; then project with perspective
    const f = L("persp", 7, 2.2), px = st.pos.x.p, pz = st.pos.z.p;
    const proj = p => { const wx = p[0] * cy_ + p[2] * sy_ + px, wz = -p[0] * sy_ + p[2] * cy_ + pz, s = f / Math.max(.5, f - wz); return [n.x + wx * U * s, n.y + (p[1] - .5) * U * s, s, wz]; };
    const J = { head: proj(head), neck: proj(neck), shL: proj(shL), shR: proj(shR), chest: proj(chest), waist: proj(waist), hipL: proj(hipL), hipR: proj(hipR), hipC: proj(hipC), waistL: proj(waistL), waistR: proj(waistR), elbows: elbows.map(proj), wrists: wrists.map(proj), knees: knees.map(proj), ankles: ankles.map(a => { const q = proj(a); q.push(a[3]); return q; }) };
    J.spine = []; for (let j = 0; j < XS.length - 1; j++) for (let q = 0; q < 4; q++) { const u2 = q / 4, A = XS[j], B = XS[j + 1], p = V3.mix(A[0], B[0], u2), ax = V3.norm(V3.mix(A[1], B[1], u2)), hw = lerp(A[2], B[2], u2), hd = lerp(A[3], B[3], u2), c = proj(p), e = proj(V3.add(p, ax, hw)); J.spine.push({ c, ax: [e[0] - c[0], e[1] - c[1]], d: hd * U * c[2] }); }
    { const A = XS[XS.length - 1], c = proj(A[0]), e = proj(V3.add(A[0], A[1], A[2])); J.spine.push({ c, ax: [e[0] - c[0], e[1] - c[1]], d: A[3] * U * c[2] }); }
    // hands carry on the line of the forearm with a soft lifted wrist; a gripping hand curls toward the blade
    const hAng = [], fAng = [], Kh = Math.pow(TAU * 2.2, 2);
    for (let i = 0; i < 2; i++) { const fdir = Math.atan2(J.wrists[i][1] - J.elbows[i][1], J.wrists[i][0] - J.elbows[i][0]), s = st.ha[i]; s.p = fdir + svAng(s.p - fdir); svSpr(s, fdir + (i ? -1 : 1) * .3 * (1 - cur.hold), Kh, 2 * .7 * Math.sqrt(Kh), dt); hAng.push(s);
      const sdir = Math.atan2(J.ankles[i][1] - J.knees[i][1], J.ankles[i][0] - J.knees[i][0]), a = st.fa[i]; a.p = sdir + svAng(a.p - sdir); svSpr(a, sdir, Kh, 2 * .8 * Math.sqrt(Kh), dt); fAng.push(a); }
    st.prev = { w0: J.wrists[0], w1: J.wrists[1] };
