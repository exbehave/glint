"""Rebuild engine/skatelet.js and casting/skatelet.js.
Skatelet (Oct 25, 2026, Kennedy's request and name): a figure skater on Servelet's realistic body.
  motion  = casting/skatelet-motion.js (its own: glide, spin, layback positions, catch-foot, Biellmann)
  drawing = Servelet's body drawing, sliced verbatim from engine/servelet.js (run make_servelet.py first), plus DRAW_PATCHES
Servelet stays untouched. Run from the repo root: python3 casting/make_skatelet.py"""

SETS = r'''// Skatelet's positions (Oct 25, 2026), read from Kennedy's reference clip (a layback spin into a Biellmann) with a pose tracker.
// Each: spin (0 = gliding, 1 = full spin speed), lay (upper back arched back, radians-ish; < 0 leans forward), low (the whole
// torso tipped from the hips, < 0 = forward: the Biellmann tips forward while the upper back arches), side (side lean),
// bend (skating knee), leg (free ankle from its hip, in leg lengths: x out, y down, z toward the room), pole (which way that knee
// points), arms ([left, right], from each shoulder in arm lengths: x outward, y down, z toward the room; they turn with the torso),
// hold (both hands on the free blade), reach (the free-side hand reaching back to the blade).
const SK_SET = {
  glide: { spin: 0, lay: -.14, side: 0, bend: .32, leg: [.04, .62, -.78], pole: [.3, 0, 1], arms: [[.95, .12, -.05], [.9, .2, .22]], hold: 0, reach: 0 },
  entry: { spin: .75, lay: .1, side: -.06, bend: .16, leg: [.55, .5, -.6], pole: [.4, -.3, 1], arms: [[1, -.05, 0], [1, -.05, 0]], hold: 0, reach: 0 }, // clip 1–2: arms wide, leg out behind
  catch: { spin: 1, low: -.18, lay: .5, side: .12, bend: .12, leg: [.18, -.3, -.62], pole: [.5, .5, -.7], arms: [[1, -.12, 0], [.3, -.6, -.5]], hold: 0, reach: 1 }, // clip 9–10
  biel: { spin: 1.35, low: -.5, lay: .7, side: .08, bend: .08, leg: [.2, -.85, -.5], pole: [.3, -.2, -1], arms: [[.1, -1.05, -.2], [.1, -1.05, -.2]], hold: 1, reach: 0 }, // clip 11–14
  exit: { spin: .35, lay: 0, side: 0, bend: .22, leg: [.3, .85, -.35], pole: [.4, 0, 1], arms: [[.85, .3, .1], [.85, .3, .1]], hold: 0, reach: 0 }, // clip 15
};
// layback positions, dealt like a shuffled deck (each once before any repeats)
const SK_LAY = [
  { n: "Halo: arms ringed over the head", spin: 1, lay: .95, side: 0, bend: .14, leg: [.35, .15, -.55], pole: [1, .4, -.4], arms: [[-.18, -1, -.15], [-.18, -1, -.15]], hold: 0, reach: 0 }, // clip 4
  { n: "One arm up, one by the head", spin: 1, lay: .75, side: .12, bend: .14, leg: [.45, .35, -.6], pole: [.8, .2, -.2], arms: [[.15, -1.05, 0], [-.2, -.8, .1]], hold: 0, reach: 0 }, // clip 5
  { n: "Arms open, leaning to the side", spin: 1, lay: .85, side: .28, bend: .14, leg: [.4, .2, -.62], pole: [1, .3, -.4], arms: [[.95, .2, -.15], [.9, -.2, -.1]], hold: 0, reach: 0 }, // clip 3, 7, 8
  { n: "Framing the face", spin: 1, lay: .9, side: -.1, bend: .14, leg: [.35, .25, -.6], pole: [1, .4, -.4], arms: [[-.25, -.75, -.3], [-.25, -.75, -.3]], hold: 0, reach: 0 }, // clip 6
  { n: "Leg up behind, arms wide", spin: 1, lay: .5, side: .2, bend: .14, leg: [.15, -.05, -.7], pole: [.6, .5, -.6], arms: [[1, -.15, 0], [1, 0, .1]], hold: 0, reach: 0 }, // clip 9
];
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
    { key: "freeleg", label: "Free leg height", def: .6, grp: "Skating" },
    { key: "ease", label: "Ease between positions", def: .45, grp: "Skating" },
    { key: "float", label: "Arm float", def: .5, grp: "Skating" },
    { key: "blade", label: "Blades", def: .7, grp: "Look" }]'''

# Servelet's drawing reads a few things Skatelet doesn't have; and the skates get blades
DRAW_PATCHES = [
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
