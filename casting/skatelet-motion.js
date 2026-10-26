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
    const layS = L("layback", .3, 1.35), lay = cur.lay * (cur.lay > 0 ? layS : 1), low = cur.low || 0, side = cur.side * (.6 + .4 * layS), cs = clamp(cur.spin, 0, 1);
    // ---- travel: glide around a long ellipse on the ice; spinning holds the spot
    const legL = L("leglen", .36, .56), thigh = legL / 2, shin = legL / 2, floor = .46 + legL, armL = L("armlen", .22, .5), ua = armL * .51, fa = armL * .49;
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
    const rot = (v, f) => { let [x, y, z] = v; const a = side * f, c = Math.cos(a), s_ = Math.sin(a); [x, y] = [x * c - y * s_, x * s_ + y * c]; const b = low + lay * f, cb = Math.cos(b), sb = Math.sin(b); return [x, y * cb - z * sb, z * cb + y * sb]; };
    const stand = [-hipW * .55, floor - .015, 0];
    svSpr3(st.hip, [0, floor - .015 - legL * (.995 - .16 * cur.bend), .07 * Math.max(0, lay) - .05 * Math.max(0, -lay)], 600, 45, dt); const hipC = svP(st.hip);
    const waist = V3.add(hipC, rot([0, -.15, .02], .35)), chest = V3.add(waist, rot([0, -.17, -.01], 1)), neck = V3.add(chest, rot([0, -.045, 0], 1.25)), head = V3.add(neck, rot([0, -.062, .012], 1.55));
    const shDir = V3.norm(rot([1, 0, 0], 1)), shL = V3.add(chest, shDir, -shW), shR = V3.add(chest, shDir, shW), hipL = V3.add(hipC, [-hipW, 0, 0]), hipR = V3.add(hipC, [hipW, 0, 0]);
    const wd = V3.norm(rot([1, 0, 0], .5)), waistL = V3.add(waist, wd, -wW), waistR = V3.add(waist, wd, wW);
    // legs: the left blade stays planted under her; the free leg takes the position's shape (Free leg height tips it up or down)
    const up = (k("freeleg") - .5) * .7, lv = cur.leg, lvn = V3.norm(lv), lr = [lvn[0], lvn[1] * Math.cos(up) + lvn[2] * Math.sin(up), lvn[2] * Math.cos(up) - lvn[1] * Math.sin(up)];
    const freeT = V3.add(hipR, lr, legL * Math.min(.97, V3.len(lv)));
    const Kleg = Math.pow(TAU * L("legspeed", .6, 6), 2), Cleg = 2 * .85 * Math.sqrt(Kleg);
    svSpr3(st.feet[0], stand, 4000, 2 * .95 * Math.sqrt(4000), dt); svSpr3(st.feet[1], freeT, Kleg, Cleg, dt);
    const ankles = [svP(st.feet[0]), svP(st.feet[1])].map(a => (a.push(1), a));
    const knees = [svIK(hipL, ankles[0], thigh, shin, [-.1, 0, 1]), svIK(hipR, ankles[1], thigh, shin, V3.norm(cur.pole))];
    // arms: the position's pose turns with the torso; they float a little; in the catch and the Biellmann the hands go to the blade
    const blade = V3.add(ankles[1], [0, -.015, 0]), handT = [];
    for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1, sh = i ? shR : shL, pv = cur.arms[i], off = rot([sd * pv[0], pv[1], pv[2]], 1), fl = (ua + fa) * .07 * k("float");
      let h = V3.add(V3.add(sh, off, ua + fa), [Math.sin(t * .7 + i * 2.1) * fl, Math.sin(t * .53 + i) * fl, Math.cos(t * .61 + i) * fl * .6]);
      h = V3.mix(h, blade, Math.max(cur.hold, i === 1 ? cur.reach : 0)); handT.push(h); }
    const fArm = L("armspeed", .5, 5), Karm = Math.pow(TAU * fArm, 2), Carm = 2 * .8 * Math.sqrt(Karm);
    const wrists = handT.map((h, i) => { const sh = i ? shR : shL; svSpr3(st.hands[i], h, Karm, Carm, dt); let w = svP(st.hands[i]); const d = V3.sub(w, sh), dl = V3.len(d); if (dl > ua + fa - .005) { w = V3.add(sh, d, (ua + fa - .005) / dl); st.hands[i].x.p = w[0]; st.hands[i].y.p = w[1]; st.hands[i].z.p = w[2]; } return w; });
    const eo = L("elbows", 0, 1), elbows = wrists.map((w, i) => svIK(i ? shR : shL, w, ua, fa, [(i ? 1 : -1) * (.1 + .9 * eo), .5 - .4 * eo, -.3 - .5 * eo]));
    // ---- world space: turn by yaw, move to her spot on the ice; then project with perspective
    const f = L("persp", 7, 2.2), px = st.pos.x.p, pz = st.pos.z.p;
    const proj = p => { const wx = p[0] * cy_ + p[2] * sy_ + px, wz = -p[0] * sy_ + p[2] * cy_ + pz, s = f / Math.max(.5, f - wz); return [n.x + wx * U * s, n.y + (p[1] - .5) * U * s, s, wz]; };
    const J = { head: proj(head), neck: proj(neck), shL: proj(shL), shR: proj(shR), chest: proj(chest), waist: proj(waist), hipL: proj(hipL), hipR: proj(hipR), hipC: proj(hipC), waistL: proj(waistL), waistR: proj(waistR), elbows: elbows.map(proj), wrists: wrists.map(proj), knees: knees.map(proj), ankles: ankles.map(a => { const q = proj(a); q.push(a[3]); return q; }) };
    // hands carry on the line of the forearm with a soft lifted wrist; a gripping hand curls toward the blade
    const hAng = [], fAng = [], Kh = Math.pow(TAU * 2.2, 2);
    for (let i = 0; i < 2; i++) { const fdir = Math.atan2(J.wrists[i][1] - J.elbows[i][1], J.wrists[i][0] - J.elbows[i][0]), s = st.ha[i]; s.p = fdir + svAng(s.p - fdir); svSpr(s, fdir + (i ? -1 : 1) * .3 * (1 - cur.hold), Kh, 2 * .7 * Math.sqrt(Kh), dt); hAng.push(s);
      const sdir = Math.atan2(J.ankles[i][1] - J.knees[i][1], J.ankles[i][0] - J.knees[i][0]), a = st.fa[i]; a.p = sdir + svAng(a.p - sdir); svSpr(a, sdir, Kh, 2 * .8 * Math.sqrt(Kh), dt); fAng.push(a); }
    st.prev = { w0: J.wrists[0], w1: J.wrists[1] };
