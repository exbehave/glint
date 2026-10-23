"""Rebuild engine/servelet.js and casting/servelet.js: Serve classic's motion (sliced verbatim from engine/serve.js,
between 'draw(E) {' and '// ---- drawing:') plus Servelet's own drawing in casting/servelet-draw.js.
Run from the repo root: python3 casting/make_servelet.py"""
# Servelet's own motion changes, applied to the copied motion (Kennedy's first rehearsal, Oct 22, 2026: "the hands jerk back and
# forth instead of following through to new poses"; in the duck walk "the hands are giving puppet master, up and down, back and forth").
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
   'st.hcl ||= [0, 0]; if (ST > .5 && st.poseT === t) st.hcl[i] = .85 / (3 * L("posespeed", .15, 1.6)); st.hcl[i] -= dt;'),
  # while the hand travels the wrist trails behind, then flicks into place; strength follows the slider
  ('s.p = ht + svAng(s.p - ht); svSpr(s, ht,',
   'const pw = st.prev && st.prev["w" + i], spd = pw ? Math.hypot(J.wrists[i][0] - pw[0], J.wrists[i][1] - pw[1]) / Math.max(dt, 1e-3) / U : 0; let hT = ht; if (ST > 0 && pw && spd > .25) { const trail = Math.atan2(pw[1] - J.wrists[i][1], pw[0] - J.wrists[i][0]); hT += svAng(trail - hT) * Math.min(.75, (spd - .25) * .5) * ST; } s.p = hT + svAng(s.p - hT); svSpr(s, hT,'),
  ('K * (st.hat[i].out ? .6 : 1.4), st.hat[i].out ? 2 * Math.max(.45, zeta) * Math.sqrt(K * .6) : C * .8, dt)',
   'K * (st.hat[i].out ? .6 : 1.4), lerp(st.hat[i].out ? 2 * Math.max(.45, zeta) * Math.sqrt(K * .6) : C * .8, 2 * .45 * Math.sqrt(K * (st.hat[i].out ? .6 : 1.4)), ST), dt)'),
  # ---- round 3 (Oct 22, 22:45, Kennedy: "it keeps reverting back to the same poses"; wants ~30 pre-selected poses, and a swishy
  # windshield-wiper motion in both vogue and the duck walk, like the geometric version had)
  # a 32-pose library dealt like a shuffled deck: every pose comes up once before any repeats (st.forcePose pins one, for the pose sheet)
  ('if (bn % every === 0) { let p = st.pose; while (p === st.pose) p = Math.floor(Math.random() * SV_POSES.length); st.pose = p;',
   'if (bn % every === 0) { let p; if (st.forcePose != null) p = st.forcePose; else { if (!st.deck || !st.deck.length) { st.deck = SL_POSES.map((_, j) => j).sort(() => Math.random() - .5); if (st.deck[st.deck.length - 1] === st.pose) st.deck.unshift(st.deck.pop()); } p = st.deck.pop(); } st.pose = p;'),
  ('pose = SV_POSES[st.pose](reach)', 'pose = SL_POSES[st.pose % SL_POSES.length].f(reach)'),
  # vogue transitions swing along an arc around the shoulder (the hand bows out mid-path) and land with a small overshoot (Swish)
  ('handT[i] = V3.mix(st.handFrom[i], handT[i], svEaseIO(u)); }',
   'const SW = k("swish"), e0 = svEaseIO(u), c1 = 1.2 * SW, ob = u >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2), e = lerp(e0, ob, Math.min(1, SW * 1.2)); const shp = i ? shR : shL, a0 = V3.sub(st.handFrom[i], shp), a1 = V3.sub(handT[i], shp), r0 = V3.len(a0), r1 = V3.len(a1), dir = V3.norm(V3.mix(V3.norm(a0), V3.norm(a1), e)), rad = lerp(r0, r1, e) + SW * .28 * (ua + fa) * Math.sin(Math.PI * Math.min(1, Math.max(0, e))); handT[i] = V3.mix(V3.mix(st.handFrom[i], handT[i], e), V3.add(shp, dir, rad), SW); }'),
  # duck walk: the forearms sweep side to side on the beat like windshield wipers, both the same way, rising at the middle of each sweep
  ('handT.push(V3.mix(vog, dk, duck)); }',
   'const WP = k("wiper"), wA = WP * (Math.PI / 2.6) * Math.cos(Math.PI * (bn + ph)), wR = (ua + fa) * .5, dkw = WP > .01 ? V3.add(dk, [sd * Math.sin(wA) * wR * (i ? 1 : -1), (1 - Math.cos(wA)) * wR - WP * .25 * wR, 0]) : dk; handT.push(V3.mix(vog, dkw, duck)); }'),
]
src = open("engine/serve.js").read()
a = src.index("  draw(E) {\n") + len("  draw(E) {\n")
b = src.index("    // ---- drawing:")
motion = src[a:b]
for old, new in MOTION_PATCHES:
    assert motion.count(old) == 1, "motion patch no longer matches: " + old[:60]
    motion = motion.replace(old, new)
DROP = ["crest", "head", "headstyle", "hand", "prism", "split", "sweep", "weight", "width"]
hdr = '''/* ================= Servelet (Oct 22, 2026, name picked by Kennedy) =================
   Serve classic's dancing (motion copied verbatim from engine/serve.js, which is frozen) on a realistic human body:
   one continuous neon outline around the whole silhouette, a dark fill, a head-to-toe color gradient, a few anatomy
   lines, and a glow spot on the floor (after a friend's breakdance video, whose body shape Kennedy liked).
   Generated by casting/make_servelet.py from engine/serve.js + casting/servelet-draw.js: edit those, then rerun. */
// Servelet's pose library (x outward from that shoulder, y down, z toward the room, in arm lengths; r = reach). Numbered for Kennedy's pose sheet.
const SL_POSES = [
  { n: "Halo: both straight up", f: r => [[.1 * r, -1.1 * r, .05], [.1 * r, -1.1 * r, .05]] },
  { n: "T: both out", f: r => [[1.05 * r, -.1, .05], [1.05 * r, -.1, .05]] },
  { n: "One up and out, one down", f: r => [[.95 * r, -.7 * r, .1], [.3, .85 * r, .1]] },
  { n: "Framing the face", f: r => [[-.28, -.78, .3], [-.28, -.78, .3]] },
  { n: "Behind the head", f: r => [[-.2, -.95, -.25], [-.2, -.95, -.25]] },
  { n: "One out low, one up by the face", f: r => [[.85 * r, .5 * r, .15], [-.1, -.8, .3]] },
  { n: "Hands on hips", f: r => [[-.3, .55, -.05], [-.3, .55, -.05]] },
  { n: "Diagonal", f: r => [[.4, -1.05 * r, .05], [.7 * r, .6 * r, .2]] },
  { n: "Arms crossed over the chest", f: r => [[-.45, -.2, .3], [-.45, -.2, .3]] },
  { n: "V: both up and out", f: r => [[1.0 * r, -.95 * r, 0], [1.0 * r, -.95 * r, 0]] },
  { n: "One hanging, one up by the head", f: r => [[.15, .95, .05], [-.05, -.75, .3]] },
  { n: "One out, one on the hip", f: r => [[.95 * r, .15, .1], [-.3, .5, -.05]] },
  { n: "Egyptian: one forearm up, one down", f: r => [[.55, -.55, .05], [.55, .45, .05]] },
  { n: "Egyptian: both forearms out level", f: r => [[.6, -.1, .05], [.6, -.1, .05]] },
  { n: "Egyptian: one by the ear, one out low", f: r => [[.3, -.75, .05], [.65, .2, .05]] },
  { n: "Both reaching at the room", f: r => [[.3, -.3, .9 * r], [.3, -.3, .9 * r]] },
  { n: "One up and back, one out and forward", f: r => [[.2, -1.0 * r, -.4], [.95 * r, -.2, .4]] },
  { n: "Behind the back, below the butt", f: r => [[-.15, .78, -.38], [-.15, .78, -.38]] },
  { n: "Crown: hands meet over the head", f: r => [[-.22, -1.0, .05], [-.22, -1.0, .05]] },
  { n: "Goalposts: both forearms up", f: r => [[.62, -.62, 0], [.62, -.62, 0]] },
  { n: "Low W: both forearms down", f: r => [[.6, .48, .05], [.6, .48, .05]] },
  { n: "Cradle: one arched over the head, one at the waist", f: r => [[-.12, -1.05, .05], [.2, .3, .28]] },
  { n: "Swan: both winged back and low", f: r => [[.78 * r, .35, -.45], [.78 * r, .35, -.45]] },
  { n: "Prayer at the chest", f: r => [[-.42, -.08, .35], [-.42, -.08, .35]] },
  { n: "Prayer over the head", f: r => [[-.33, -1.05, .05], [-.33, -1.05, .05]] },
  { n: "Low sweep to one side", f: r => [[.92 * r, .55, .2], [-.62, .55, .35]] },
  { n: "Point up the diagonal, hand on the chest", f: r => [[.75 * r, -.95 * r, .05], [-.4, -.15, .3]] },
  { n: "Wings flat and back", f: r => [[.92 * r, -.15, -.5], [.92 * r, -.15, -.5]] },
  { n: "Hand at the chin, other arm out", f: r => [[-.35, -.55, .35], [1.05 * r, -.25, .05]] },
  { n: "Presenting: both forward and low", f: r => [[.35, .35, .85 * r], [.35, .35, .85 * r]] },
  { n: "Dip: one behind the head, one down to the knee", f: r => [[-.2, -.95, -.2], [.25, .95, .25]] },
  { n: "Hands at the shoulders, elbows out", f: r => [[.25, -.38, -.1], [.25, -.38, -.1]] },
];
const SERVELET_DROP = new Set(%s);
const SERVELET = { key: "servelet", name: "Servelet", fade: .55, init: SERVE.init,
  shape: [...SERVE.shape.filter(s => !SERVELET_DROP.has(s.key)),
    { key: "width", label: "Build", def: .5, cfmt: v => v < .3 ? "Lean" : v < .7 ? "Athletic" : "Heavy", grp: "Body" },
    { key: "muscle", label: "Muscle", def: .6, grp: "Body" },
    { key: "defn", label: "Definition lines", def: .55, grp: "Body" },
    { key: "head", label: "Head size", def: .45, grp: "Body" },
    { key: "hand", label: "Hand size", def: .5, grp: "Hands" },
    { key: "settle", label: "Hand follow-through", def: 0, grp: "Hands" },
    { key: "swish", label: "Swish between poses", def: .6, grp: "Vogue" },
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
