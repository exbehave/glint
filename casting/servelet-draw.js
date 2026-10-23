    // ======== Servelet drawing (everything above is Serve classic's motion, copied verbatim) ========
    // The body is built as one solid silhouette off-screen (round sausages for limbs, a sculpted torso, neck and head),
    // then only its outer edge is inked: one continuous neon outline with no seams at the joints, a dark fill, and one
    // head-to-toe color gradient. An arm crossing in front of the chest (or a leg crossing in front of the other) is
    // inked on its own on top, so it doesn't melt into the outline. A few anatomy lines sit inside; a glow spot sits on the floor.
    // feet: a heel and toes in 3D (local +z is the way the dancer faces), so the foot lies flat and turns with the body;
    // only a kicking foot lifts its toes a little. (Kennedy's first rehearsal: the feet looked hyperextended, i.e. on tiptoe.)
    { const fl = L("foot", .6, 1.6); J.heels = []; J.toes = [];
      ankles.forEach((a, i) => { const sd = i ? 1 : -1, kc = clamp(((a[3] || 1) - 1) / .9, 0, 1);
        J.heels.push(proj(V3.add(a, [0, .016, -.022 * fl]))); J.toes.push(proj(V3.add(a, [sd * .014 * fl, .018 - .035 * kc, .072 * fl]))); }); }
    const DPRg = (g.getTransform ? g.getTransform().a : 1) || 1, mus = k("muscle"), defn = k("defn"), oglow = k("oglow");
    const lwO = Math.max(1, U * .004) * L("weight", .6, 2.4); // outline width in CSS px at full size
    st.mk ||= { a: mk(8, 8), b: mk(8, 8), c: mk(8, 8) }; const MK = st.mk;
    const ensure = (cnv, w, h) => { if (cnv.width !== w || cnv.height !== h) { cnv.width = w; cnv.height = h; } return cnv.getContext("2d"); };
    // stamp a smooth limb into the mask: circles along A→B whose radius tapers from rA to rB with a muscle bulge
    const limb = (m, A, B, rA, rB, bulge, at) => { const d = Math.hypot(B[0] - A[0], B[1] - A[1]), sA = A[2], sB = B[2], n2 = Math.max(6, Math.ceil(d / Math.max(2, Math.min(rA * sA, rB * sB) * .45)));
      for (let i = 0; i <= n2; i++) { const u = i / n2, s = lerp(sA, sB, u), r = (lerp(rA, rB, u) + bulge * Math.exp(-Math.pow((u - at) / .24, 2))) * s; m.beginPath(); m.arc(lerp(A[0], B[0], u), lerp(A[1], B[1], u), Math.max(.5, r), 0, TAU); m.fill(); } };
    const blob = (m, c, rx, ry, ang) => { m.beginPath(); m.ellipse(c[0], c[1], Math.max(.5, rx * c[2]), Math.max(.5, ry * c[2]), ang, 0, TAU); m.fill(); };
    const Mu = 1 + .55 * mus; // muscle scale
    const R_ = { thigh: [.052, .036], shin: [.034, .02], calf: .012, quad: .012, ua: [.03, .024], fa: [.024, .016], bic: .008, fore: .006, neck: .028 };
    // the parts, each a mask painter; chains (arms, legs) can be pulled out and inked on their own when they cross in front
    const painters = (J, hA, fA) => {
      const r = (v, m2 = 1) => U * v * L("width", .75, 1.35) * m2;
      const legP = i => m => { const hp = i ? J.hipR : J.hipL, kn = J.knees[i], an = J.ankles[i];
        limb(m, hp, kn, r(R_.thigh[0], Mu * .95), r(R_.thigh[1], Mu), r(R_.quad * mus), .35);
        limb(m, kn, an, r(R_.shin[0], Mu), r(R_.shin[1]), r(R_.calf * (.5 + mus)), .28);
        if (J.heels) { limb(m, an, J.heels[i], r(.017), r(.014), 0, .5); limb(m, J.heels[i], J.toes[i], r(.014), r(.008), r(.003), .3); limb(m, an, J.toes[i], r(.015), r(.009), 0, .5); } };
      const armP = i => m => { const sh = i ? J.shR : J.shL, el = J.elbows[i], wr = J.wrists[i];
        limb(m, sh, el, r(R_.ua[0], Mu), r(R_.ua[1], Mu * .9), r(R_.bic * (.4 + mus)), .45);
        limb(m, el, wr, r(R_.fa[0], Mu * .95), r(R_.fa[1]), r(R_.fore * (.4 + mus)), .25);
        // hand: a mitt along the hand angle with a thumb
        const a = hA[i].p, hl = U * L("hand", .045, .085) * wr[2], tip = [wr[0] + Math.cos(a) * hl, wr[1] + Math.sin(a) * hl, wr[2]];
        limb(m, wr, tip, r(.014), r(.011), r(.004), .5);
        const ta = a + (i ? -1 : 1) * .7, th = [wr[0] + Math.cos(ta) * hl * .55, wr[1] + Math.sin(ta) * hl * .55, wr[2]]; limb(m, wr, th, r(.008), r(.005), 0, .5); };
      const coreP = m => { // torso, glutes, neck and head as one sculpted piece
        const s = (J.chest[2] + J.hipC[2]) / 2, minW = U * .05 * s;
        const wid = (P, Lp, Rp, extra) => { const dx = Rp[0] - Lp[0], dy = Rp[1] - Lp[1], d = Math.hypot(dx, dy), ux = d > 1e-3 ? dx / d : 1, uy = d > 1e-3 ? dy / d : 0, half = Math.max(d / 2, minW) + extra; return [[P[0] - ux * half, P[1] - uy * half], [P[0] + ux * half, P[1] + uy * half]]; };
        const lat = U * .012 * mus * s; // lats widen the upper back
        const [sL, sR] = wid(J.chest, J.shL, J.shR, U * .02 * s * Mu), [wl, wr] = wid(J.waist, J.waistL, J.waistR, U * .012 * s), [hl, hr] = wid(J.hipC, J.hipL, J.hipR, U * .03 * s);
        const ribL = [lerp(sL[0], wl[0], .45), lerp(sL[1], wl[1], .45)], ribR = [lerp(sR[0], wr[0], .45), lerp(sR[1], wr[1], .45)];
        const pushOut = (p, c, amt) => { const dx = p[0] - c[0], dy = p[1] - c[1], d = Math.hypot(dx, dy) || 1; return [p[0] + dx / d * amt, p[1] + dy / d * amt]; };
        const rl = pushOut(ribL, J.waist, lat), rr = pushOut(ribR, J.waist, lat);
        m.beginPath(); m.moveTo(sL[0], sL[1]); m.quadraticCurveTo(rl[0], rl[1], wl[0], wl[1]); m.quadraticCurveTo(lerp(wl[0], hl[0], .5) - (wr[0] - wl[0]) * .04, lerp(wl[1], hl[1], .6), hl[0], hl[1]);
        m.quadraticCurveTo(J.hipC[0], J.hipC[1] + U * .06 * s, hr[0], hr[1]); m.quadraticCurveTo(lerp(wr[0], hr[0], .5) + (wr[0] - wl[0]) * .04, lerp(wr[1], hr[1], .6), wr[0], wr[1]); m.quadraticCurveTo(rr[0], rr[1], sR[0], sR[1]);
        m.quadraticCurveTo(J.neck[0], J.neck[1] + U * .01 * s, sL[0], sL[1]); m.closePath(); m.fill();
        // deltoids (round shoulders overlapping the torso), traps, glutes
        const dR = U * .036 * Mu * L("width", .8, 1.25); blob(m, J.shL, dR, dR * .92, 0); blob(m, J.shR, dR, dR * .92, 0);
        // pelvis: one smooth capsule from hip to hip (two separate glute blobs popped out at odd angles during turns)
        limb(m, J.hipL, J.hipR, U * .046 * L("width", .85, 1.15), U * .046 * L("width", .85, 1.15), U * .004 * mus, .5);
        limb(m, J.chest, J.neck, U * .05 * (1 + .3 * mus), r(R_.neck, 1 + .25 * mus), 0, .5);
        limb(m, J.neck, J.head, r(R_.neck, 1 + .25 * mus), r(R_.neck * .9), 0, .5);
        // head: a smooth oval with a jaw, tilted with the neck
        const hr2 = U * L("head", .042, .068) * J.head[2], ha = Math.atan2(J.head[1] - J.neck[1], J.head[0] - J.neck[0]) + Math.PI / 2;
        m.save(); m.translate(J.head[0], J.head[1] - hr2 * .15); m.rotate(ha); m.beginPath(); m.moveTo(0, -hr2 * 1.05); m.bezierCurveTo(hr2 * .98, -hr2 * 1.05, hr2 * .95, hr2 * .3, hr2 * .4, hr2 * .95); m.quadraticCurveTo(0, hr2 * 1.12, -hr2 * .4, hr2 * .95); m.bezierCurveTo(-hr2 * .95, hr2 * .3, -hr2 * .98, -hr2 * 1.05, 0, -hr2 * 1.05); m.fill(); m.restore(); };
      return { coreP, legP, armP };
    };
    // bounding box of the figure on screen (CSS px), with room for the outline and glow
    const bboxOf = J => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const add = p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
      [J.head, J.neck, J.shL, J.shR, J.chest, J.waist, J.hipL, J.hipR, J.hipC, ...J.elbows, ...J.wrists, ...J.knees, ...J.ankles].forEach(add); const pad = U * .2; return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
    const segDist = (p, A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], l2 = dx * dx + dy * dy || 1, u = clamp(((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / l2, 0, 1); return Math.hypot(p[0] - A[0] - dx * u, p[1] - A[1] - dy * u); };
    // ink one mask: dark fill, glow, then the outline ring colored head to toe
    const ink = (paint, J, al, bb, yTop, yBot, holes, gAx) => {
      const ox = bb[0], oy = bb[1], Wc = Math.max(2, Math.ceil((bb[2] - bb[0]) * DPRg)), Hc = Math.max(2, Math.ceil((bb[3] - bb[1]) * DPRg));
      const ma = ensure(MK.a, Wc, Hc), mb = ensure(MK.b, Wc, Hc);
      ma.setTransform(1, 0, 0, 1, 0, 0); ma.globalCompositeOperation = "source-over"; ma.clearRect(0, 0, Wc, Hc); ma.setTransform(DPRg, 0, 0, DPRg, -ox * DPRg, -oy * DPRg); ma.fillStyle = "#fff"; paint(ma);
      // ring = the mask grown by the line width, minus the mask
      const lw = lwO * DPRg * (.6 + .4 * J.chest[2]); mb.setTransform(1, 0, 0, 1, 0, 0); mb.globalCompositeOperation = "source-over"; mb.clearRect(0, 0, Wc, Hc);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; mb.drawImage(MK.a, Math.cos(a) * lw, Math.sin(a) * lw); }
      mb.globalCompositeOperation = "destination-out"; mb.drawImage(MK.a, 0, 0);
      (holes || []).forEach(([x, y, rr]) => { mb.beginPath(); mb.arc((x - ox) * DPRg, (y - oy) * DPRg, rr * DPRg, 0, TAU); mb.fill(); });
      const span = 60 + 260 * k("spread"), gx = gAx || [0, yTop, 0, yBot], gr = mb.createLinearGradient((gx[0] - ox) * DPRg, (gx[1] - oy) * DPRg, (gx[2] - ox) * DPRg, (gx[3] - oy) * DPRg), hs = [0, .25, .5, .75, 1];
      hs.forEach(u => gr.addColorStop(u, hsl(hue + span * u, 95, 64, 1))); mb.globalCompositeOperation = "source-in"; mb.fillStyle = gr; mb.fillRect(0, 0, Wc, Hc);
      // dark fill (normal painting, so the body hides its own trail and anything drawn behind it in this layer)
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-out"; g.globalAlpha = .92 * al; g.drawImage(MK.a, ox * DPRg, oy * DPRg); g.restore();
      const mc = ensure(MK.c, Wc, Hc); mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalCompositeOperation = "source-over"; mc.clearRect(0, 0, Wc, Hc); mc.drawImage(MK.a, 0, 0); mc.globalCompositeOperation = "source-in"; mc.fillStyle = gr; mc.globalAlpha = .07 + .05 * loud; mc.fillRect(0, 0, Wc, Hc); mc.globalAlpha = 1;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = al; g.drawImage(MK.c, ox * DPRg, oy * DPRg); // faint colored body glow inside
      if (oglow > .02) { g.shadowColor = hsl(hue + span * .5, 95, 60, .8); g.shadowBlur = U * .03 * DPRg * oglow * (1 + .6 * loud); g.globalAlpha = al * .8; g.drawImage(MK.b, ox * DPRg, oy * DPRg); g.shadowBlur = 0; }
      g.globalAlpha = al; g.drawImage(MK.b, ox * DPRg, oy * DPRg); g.restore();
      return gr; };
    const drawBody = (J, hA, fA, al, live) => {
      const P = painters(J, hA, fA), bb = bboxOf(J), yTop = J.head[1] - U * .07 * J.head[2], yBot = Math.max(J.ankles[0][1], J.ankles[1][1]) + U * .02;
      // lying back (the death drop) the head-to-toe colors follow the body's axis instead of straight down the screen
      const wL = clamp(DL, 0, 1), fm = [(J.ankles[0][0] + J.ankles[1][0]) / 2, (J.ankles[0][1] + J.ankles[1][1]) / 2], axd = Math.hypot(fm[0] - J.head[0], fm[1] - J.head[1]) || 1, axn = [(fm[0] - J.head[0]) / axd, (fm[1] - J.head[1]) / axd];
      const gAx = wL > .01 ? [lerp(J.head[0], J.head[0] - axn[0] * U * .07, 1), lerp(yTop, J.head[1] - axn[1] * U * .07, wL), lerp(J.head[0], fm[0] + axn[0] * U * .02, wL), lerp(yBot, fm[1] + axn[1] * U * .02, wL)] : null;
      // which chains cross in front of the body? (z toward the room, and overlapping the torso or the other leg on screen)
      const tz = (J.chest[3] + J.hipC[3]) / 2, tw = Math.max(Math.hypot(J.shR[0] - J.shL[0], J.shR[1] - J.shL[1]) * .5, U * .05 * J.chest[2]) + U * .02;
      const sep = [], base = [P.coreP];
      // arms: inked on their own only while clearly in front of the chest; hysteresis stops them flickering on and off through a turn
      st.armSep ||= [false, false];
      for (let i = 0; i < 2; i++) { const cz = (J.elbows[i][3] + J.wrists[i][3]) / 2, d = Math.min(segDist(J.wrists[i], J.chest, J.hipC), segDist(J.elbows[i], J.chest, J.hipC));
        let on = cz > tz + .02 && d < tw; if (live) { const was = st.armSep[i]; on = was ? (cz > tz - .02 && d < tw * 1.3) : on; st.armSep[i] = on; }
        if (on) sep.push({ z: cz, p: P.armP(i), sh: i ? J.shR : J.shL }); else base.push(P.armP(i)); }
      // legs always belong to the one outline (Kennedy, Oct 22: inking a leg on its own drew extra lines across the hips that flickered in turns)
      base.push(P.legP(0), P.legP(1));
      const gr = ink(m => base.forEach(f => f(m)), J, al, bb, yTop, yBot, null, gAx);
      sep.sort((a, b) => a.z - b.z).forEach(c => ink(c.p, J, al, bb, yTop, yBot, c.sh ? [[c.sh[0], c.sh[1], U * .036 * Mu * L("width", .8, 1.25) * c.sh[2] * 1.25]] : null, gAx));
      // anatomy lines: chest, abs and V-lines from the front; spine and shoulder blades from behind; they fade toward profile
      if (defn > .02) { const sw = Math.hypot(J.shR[0] - J.shL[0], J.shR[1] - J.shL[1]), wide = clamp(sw / (U * .2 * J.chest[2]) - .25, 0, 1), front = Math.cos(yaw) > 0, a3 = al * defn * wide * (.5 + .2 * loud);
        if (a3 > .02) { const C0 = J.chest, Hc = J.hipC, Wc = J.waist, ux = (J.shR[0] - J.shL[0]) / (sw || 1), uy = (J.shR[1] - J.shL[1]) / (sw || 1), at = (p, a, b) => [p[0] + ux * a + (Hc[0] - C0[0]) * b, p[1] + uy * a + (Hc[1] - C0[1]) * b], half = sw * .5;
          g.save(); g.lineCap = "round"; g.lineWidth = lwO * .7 * C0[2]; g.strokeStyle = gr; g.globalAlpha = a3; g.setTransform(DPRg, 0, 0, DPRg, 0, 0); g.beginPath();
          if (front) { for (const sd of [-1, 1]) { const p0 = at(C0, sd * half * .08, .08), p1 = at(C0, sd * half * .55, .3), p2 = at(C0, sd * half * .85, .05); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); // pecs
              const v0 = at(Hc, sd * half * .55, -.25), v1 = at(Hc, sd * half * .12, .02); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); } // V-lines
            const c0 = at(C0, 0, .3), c1 = at(Hc, 0, -.15); g.moveTo(c0[0], c0[1]); g.lineTo(c1[0], c1[1]); // linea alba
            for (let j = 0; j < 3; j++) { const v = .42 + j * .17, a0 = at(C0, -half * .3, v), a1 = at(C0, half * .3, v); g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(lerp(a0[0], a1[0], .5), lerp(a0[1], a1[1], .5) + U * .006, a1[0], a1[1]); } } // abs
          else { const s0 = at(C0, 0, .02), s1 = at(Hc, 0, -.1); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); // spine
            for (const sd of [-1, 1]) { const b0 = at(C0, sd * half * .2, .08), b1 = at(C0, sd * half * .62, .22), b2 = at(C0, sd * half * .3, .4); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(b1[0], b1[1], b2[0], b2[1]); } } // shoulder blades
          g.stroke(); g.restore(); } }
      // hands flare a little when they snap to a new position
      if (live && glow > .02) for (let i = 0; i < 2; i++) { const wr = J.wrists[i], a = hA[i]; sprite(g, hue + 260 * k("spread") * .2, wr[0], wr[1], U * .05 * wr[2], (.08 + .4 * Math.min(1, Math.abs(a.v) * .06)) * glow * al); } };
    // ---- floor glow: a soft colored spot under the dancer, sliding with them; brighter on kicks
    if (k("floor") > .02) { const fp = proj([0, floor + .005, 0]), fhue = hue + (60 + 260 * k("spread")) * (.5 + .5 * Math.sin(t * .4)), rx = U * .2 * fp[2], ry = rx * .22 * (.6 + .4 * L("persp", 1, 1.6));
      g.save(); g.translate(fp[0], fp[1]); g.scale(1, ry / rx); const gr2 = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr2.addColorStop(0, hsl(fhue, 95, 60, .55 * k("floor") * (1 + .5 * R.kick))); gr2.addColorStop(.6, hsl(fhue, 95, 50, .25 * k("floor"))); gr2.addColorStop(1, hsl(fhue, 95, 50, 0)); g.fillStyle = gr2; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore(); }
    // ---- flick echoes: ghost hand outlines tracing each hand, drifting and fading
    if (k("echo") > .02) { const maxN = Math.round(L("echolen", 6, 40) * (.4 + .6 * loud + .4 * R.kick)), hl0 = U * L("hand", .045, .085);
      for (let i = 0; i < 2; i++) { const tr = st.trail[i], a = hAng[i], w = J.wrists[i]; if (Math.abs(a.v) > .6 || Math.hypot(st.hands[i].x.v, st.hands[i].y.v, st.hands[i].z.v) > .35) tr.push({ x: w[0], y: w[1], s: w[2], a: a.p, age: 0 }); while (tr.length > maxN) tr.shift();
        tr.forEach(e => e.age += dt); st.trail[i] = tr.filter(e => e.age < 1.1);
        st.trail[i].forEach((e, j) => { if (j % 3) return; const fd = 1 - e.age / 1.1, al = fd * fd * .45 * k("echo"), ang = e.a + e.age * 1.2 * (i ? 1 : -1), c = [e.x + Math.cos(ang) * e.age * U * .03, e.y - e.age * U * .02], len = hl0 * e.s * (1 + e.age * .6), wid = len * .32;
          g.save(); g.translate(c[0], c[1]); g.rotate(ang); g.beginPath(); g.ellipse(len * .5, 0, len * .55, wid, 0, 0, TAU); g.lineWidth = lwO * .8 * e.s; g.strokeStyle = hsl(hue + 30 + e.age * 80, 95, 70, al); g.stroke(); g.restore(); }); } }
    else st.trail = [[], []];
    // ---- pose freezes: on each kick, stamp the pose; it stays dim for N beats then fades
    if (k("freeze") > .02 && newBeat && R.kick > .25) { st.freezes.push({ J: JSON.parse(JSON.stringify(J)), hA: hAng.map(a => ({ p: a.p, v: 0 })), fA: fAng.map(a => ({ p: a.p, v: 0 })), age: 0 }); while (st.freezes.length > 4) st.freezes.shift(); }
    const holdS = I("hold") * gap; st.freezes.forEach(fz => fz.age += dt); st.freezes = st.freezes.filter(fz => fz.age < holdS);
    st.freezes.forEach(fz => { const al = Math.pow(1 - fz.age / holdS, 1.3) * .45 * k("freeze"); drawBody(fz.J, fz.hA, fz.fA, al, false); });
    // ---- the live figure
    drawBody(J, hAng, fAng, 1, true);
  } };
