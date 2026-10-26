"""Rebuild engine/skatelet.js and casting/skatelet.js.
Skatelet (Oct 25, 2026, Kennedy's request and name): a figure skater on Servelet's realistic body.
  motion  = casting/skatelet-motion.js (its own: glide, spin, layback positions, catch-foot, Biellmann)
  drawing = Servelet's body drawing, sliced verbatim from engine/servelet.js (run make_servelet.py first), plus DRAW_PATCHES
Servelet stays untouched. Run from the repo root: python3 casting/make_skatelet.py"""

SETS = r'''// Skatelet's positions (round 2, Oct 25, 2026), from Kennedy's reference clip (a layback spin into a Biellmann).
// Each: spin (0 = gliding, 1 = full spin speed), tilt (whole trunk tipped at the hips, degrees, + = back, - = forward), arch (backbend
// as a share of a typical adult's full range, shared out along the spine by SK_SPINE), side (side bend, share of the normal range),
// bend (skating knee, 0 = straight), leg (free ankle from its hip: x out, y down, z toward the room; normalized), pole (which way that
// knee points), arms ([left, right], from each shoulder in arm lengths: x outward, y down, z toward the room, in the chest's frame),
// hold (both hands on the free blade), reach (the free-side hand reaching back to the blade), curl (the free leg joins the curve of
// the back: knee bent more, foot closer in; the thigh keeps its length).
const SK_SET = {
  glide: { spin: 0, tilt: -18, arch: .12, side: 0, bend: .3, leg: [.04, .3, -.95], pole: [.3, 0, 1], arms: [[.95, .05, -.05], [.9, .15, .22]], hold: 0, reach: 0 },
  entry: { spin: .75, tilt: -12, arch: .25, side: -.25, bend: .05, leg: [.35, -.05, -.94], pole: [.4, -.3, 1], arms: [[1, -.15, 0], [1, -.15, 0]], hold: 0, reach: 0 }, // clip 1–2
  catch: { spin: 1, tilt: -28, arch: .6, side: .2, bend: .04, leg: [.15, -.6, -.78], pole: [.5, .6, -.6], arms: [[1, -.2, 0], [.3, -.6, -.6]], hold: 0, reach: 1 }, // clip 9–10
  biel: { spin: 1.35, tilt: -55, arch: .75, side: .1, bend: .03, leg: [.1, -.78, -.62], pole: [.2, -.5, -1], arms: [[.1, -1, -.2], [.1, -1, -.2]], hold: 1, reach: 0 }, // clip 11–14
  exit: { spin: .35, tilt: 0, arch: .1, side: 0, bend: .12, leg: [.3, .85, -.35], pole: [.4, 0, 1], arms: [[.85, .3, .1], [.85, .3, .1]], hold: 0, reach: 0 }, // clip 15
};
// layback positions, dealt like a shuffled deck (each once before any repeats)
const SK_LAY = [
  { n: "Halo: arms ringed over the head", spin: 1, tilt: 4, arch: .75, side: 0, bend: .03, push: .08, leg: [.4, .45, -.8], pole: [1, .3, -.3], up: .45, arms: [[-.15, -1, -.2], [-.15, -1, -.2]], curl: .6, hold: 0, reach: 0 }, // clip 4
  { n: "One arm up, one by the head", spin: 1, tilt: 4, arch: .6, side: .1, bend: .03, push: .07, leg: [.4, .45, -.8], pole: [1, .3, -.3], up: .85, arms: [[.1, -1.05, .1], [-.1, -.6, -.5]], curl: .6, hold: 0, reach: 0 }, // clip 5
  { n: "Arms open, leaning to the side", spin: 1, tilt: 2, arch: .45, side: .5, bend: .03, push: .05, up: .3, leg: [.5, .42, -.76], pole: [1, .3, -.3], arms: [[.95, -.1, -.1], [.9, -.35, -.05]], curl: .6, hold: 0, reach: 0 }, // clip 3, 7, 8
  { n: "Framing the face", spin: 1, tilt: 4, arch: .6, side: -.15, bend: .03, push: .07, leg: [.4, .45, -.8], pole: [1, .3, -.3], arms: [[-.25, -.7, -.15], [-.25, -.7, -.15]], curl: .6, hold: 0, reach: 0 }, // clip 6
  { n: "Leg up behind, arms wide", spin: 1, tilt: -8, arch: .35, side: .25, bend: .04, leg: [.2, -.45, -.87], pole: [.5, .6, -.6], arms: [[1, -.2, 0], [1, -.05, .1]], curl: .6, hold: 0, reach: 0 }, // clip 9
];
// the spine, hips up: [segment length, share of the backbend (degrees at a typical adult's full range), cap (degrees, × Flexibility),
// side-bend degrees at full range]. Typical adult extension: lumbar ~31°, thoracic ~22°, cervical ~63° (anatomystandard.com).
// Kennedy's layback silhouettes (Oct 26): the head drops back below the shoulders, the bend mostly in the upper back and neck.
const SK_SPINE = [[.075, 15.5, 18, 15], [.075, 15.5, 18, 15], [.085, 11, 12, 15], [.085, 11, 12, 15], [.07, 31.5, 32, 12], [.075, 31.5, 32, 12]];
const SK_DIR = -1; // spins turn this way (a left-foot spin, counterclockwise seen from above)
'''

KEEP = {  # Servelet controls Skatelet keeps, regrouped
  "body": "Body", "waistw": "Body", "width": "Body", "muscle": "Body", "defn": "Body", "head": "Body", "size": "Body",
  "armlen": "Arms", "armspeed": "Arms", "elbows": "Arms", "shoulders": "Arms", "hand": "Arms",
  "leglen": "Legs", "hips": "Legs", "legspeed": "Legs", "foot": "Legs",
  "weight": "Look", "oglow": "Look", "floor": "Look", "spread": "Look", "glow": "Look", "persp": "Look",
  "echo": "Spin trails", "echolen": "Spin trails", "freeze": "Spin trails", "hold": "Spin trails",
}
NEW_SHAPE = r'''[
    { key: "spin", label: "Spin speed", def: .45, grp: "Skating" },
    { key: "spinloud", label: "Spin faster when loud", def: .5, grp: "Skating" },
    { key: "spinbars", label: "Each spin lasts", min: 0, max: 3, def: 1 / 3, fmt: v => ["4 bars", "8 bars", "12 bars", "16 bars"][v], grp: "Skating" },
    { key: "posbars", label: "New position every", min: 0, max: 2, def: .5, fmt: v => ["Bar", "2 bars", "4 bars"][v], grp: "Skating" },
    { key: "biel", label: "Biellmann", min: 0, max: 3, def: 1 / 3, fmt: v => ["Every spin", "Every other spin", "Only on beat drops", "Never"][v], grp: "Skating" },
    { key: "glidebars", label: "Glide between spins", min: 0, max: 3, def: 2 / 3, fmt: v => ["None", "1 bar", "2 bars", "4 bars"][v], grp: "Skating" },
    { key: "glidespeed", label: "Glide speed", def: .5, grp: "Skating" },
    { key: "layback", label: "Layback depth", def: .65, grp: "Skating" },
    { key: "flex", label: "Flexibility", def: .7, cfmt: v => v < .2 ? "Typical adult" : v < .6 ? "Dancer" : "Elite skater", grp: "Skating" },
    { key: "freeleg", label: "Free leg height", def: .6, grp: "Skating" },
    { key: "ease", label: "Ease between positions", def: .45, grp: "Skating" },
    { key: "float", label: "Arm float", def: .5, grp: "Skating" },
    { key: "blade", label: "Blades", def: .7, grp: "Look" }]'''

# Servelet's drawing reads a few things Skatelet doesn't have; and the skates get blades
DRAW_PATCHES = [
  # a raised foot is pointed like a skater's: toes carry on the line of the shin, curling a little toward the sole, heel behind the
  # ankle on the sole side (Kennedy, Oct 25: Servelet's raised foot flexed the wrong way, so a leg behind her read as a leg in front)
  ('const d = V3.norm(V3.sub(a, knees[i])), pr = V3.add([0, -1, 0], d, d[1]), pn = V3.len(pr) > 1e-3 ? V3.norm(pr) : [0, 0, 1], f = V3.norm(V3.add(d, pn, .55));',
   'const d = V3.norm(V3.sub(a, knees[i])), pn = soles[i], f = V3.norm(V3.add(d, pn, .2));'),
  ('const hl2 = V3.add(V3.add(a, pn, -.018), d, .006), tp2 = V3.add(a, f, .075 * fl);',
   'const hl2 = V3.add(V3.add(a, pn, .02), d, -.004), tp2 = V3.add(a, f, .08 * fl);'),
  # the torso: ellipses stamped along the spine (each as wide as the body there, seen from this angle), so it curves as one piece
  # in a backbend instead of a fixed shoulders-waist-hips outline that pinches when she arches
  ('TORSO', '        if (J.spine) J.spine.forEach(q => { const w = Math.hypot(q.ax[0], q.ax[1]); m.beginPath(); m.ellipse(q.c[0], q.c[1], Math.max(w, q.d), Math.max(.5, q.d * 1.05), Math.atan2(q.ax[1], q.ax[0]), 0, TAU); m.fill(); });\n'),
  # store each foot's blade (under the sole, a little longer than the boot) next to its heel and toe
  ('J.heels.push(proj(hl)); J.toes.push(proj(tp)); }); }',
   'J.heels.push(proj(hl)); J.toes.push(proj(tp)); { const fd = V3.norm(V3.sub(tp, hl)), mid = V3.mix(hl, tp, .5), d0 = V3.sub(mid, a), dn = V3.norm(V3.add(d0, fd, -(d0[0] * fd[0] + d0[1] * fd[1] + d0[2] * fd[2]))); (J.blades ||= []).push([proj(V3.add(V3.add(hl, dn, .026), fd, -.012)), proj(V3.add(V3.add(tp, dn, .026), fd, .018)), proj(V3.add(V3.add(tp, dn, .012), fd, .024))]); } }); }'),
  # the blades: a bright steel line with a curled toe pick, glinting as she turns
  ('    drawBody(J, hAng, fAng, 1, true);\n',
   '    drawBody(J, hAng, fAng, 1, true);\n'
   '    if (k("blade") > .02 && J.blades) { g.save(); g.lineCap = "round"; J.blades.forEach(([b0, b1, b2], i) => { const s = (b0[2] + b1[2]) / 2, gl = (.55 + .45 * Math.abs(Math.sin(yaw * 2 + i))) * ((b0[3] + b1[3]) / 2 < J.hipC[3] - .04 ? .12 : 1); g.strokeStyle = hsl(hue + 200, 30, 88, .85 * k("blade") * gl); g.lineWidth = Math.max(1, U * .006 * s); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.quadraticCurveTo(b2[0], b2[1], lerp(b1[0], b2[0], .5), lerp(b1[1], b2[1], .5) - U * .008 * s); g.stroke(); if (glow > .02) sprite(g, hue + 200, b1[0], b1[1], U * .03 * s, .25 * gl * glow * k("blade")); }); g.restore(); }\n'),
]

srv = open("engine/servelet.js").read()
a = srv.index("    // ======== Servelet drawing")
b = srv.rindex("  } };\nFORM.servelet = SERVELET;")
drawing = srv[a:b]
ta = drawing.index("        const lat = U * .012 * mus * s;"); tb = drawing.index("m.closePath(); m.fill();\n", ta) + len("m.closePath(); m.fill();\n")
drawing = drawing[:ta] + "TORSO" + drawing[tb:]
for old, new in DRAW_PATCHES:
    assert drawing.count(old) == 1, "draw patch no longer matches: " + old[:60]
    drawing = drawing.replace(old, new)
motion = open("casting/skatelet-motion.js").read()
keep = "{" + ", ".join('"%s": "%s"' % kv for kv in KEEP.items()) + "}"
obj = '''const SKATELET_KEEP = %s;
const SKATELET = { key: "skatelet", name: "Skatelet", fade: .55, init: () => Object.assign(SERVE.init(), { sk: null, yr: 0 }),
  shape: [...%s, ...SERVELET.shape.filter(s => SKATELET_KEEP[s.key]).map(s => Object.assign({}, s, { grp: SKATELET_KEEP[s.key] }))],
  draw(E) {
''' % (keep, NEW_SHAPE)
hdr = """/* ================= Skatelet (Oct 25, 2026, name picked by Kennedy) =================
   A figure skater on Servelet's realistic body: glides, spins on one blade through layback positions, catches the free
   foot and pulls it up into a Biellmann, from Kennedy's reference clip. Loads after engine/servelet.js (reuses its drawing
   helpers' globals and SERVE.init). Generated by casting/make_skatelet.py from casting/skatelet-motion.js + Servelet's
   drawing: edit those, then rerun. */
"""
body = hdr + SETS + obj + motion + drawing + "  } };\n"
DESC = ("A figure skater on Servelet's body: glides on a long curve, spins on one blade through layback positions from Kennedy's "
        "reference clip, catches the free foot and pulls it into a Biellmann. Positions change on bar lines; spins speed up when loud.")
open("engine/skatelet.js", "w").write(body + "FORM.skatelet = SKATELET;\n")
open("casting/skatelet.js", "w").write(body + 'NEW_TRAITS.push({ form: SKATELET, char: "anchored", hue: 285, hy: .62, p: { chaos: .05, energy: .9, grace: .7, magnetism: 0, roam: 0, size: .5, social: .3, tempo: .45, trails: .5 }, desc: "%s" });\nFORM.skatelet = SKATELET;\n' % DESC.replace('"', '\\"'))
print("skatelet:", len(body), "chars")
