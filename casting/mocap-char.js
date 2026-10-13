/* ================= Mocap characters (Casting candidates) =================
   Real human motion from the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu,
   BVH conversion by B. Hahne). "The data used in this project was obtained from mocap.cs.cmu.edu.
   The database was created with funding from NSF EIA-0196217."
   The node follows one joint of the performer in 3D, seen through a slowly orbiting camera. */
const MOCAP = {};
for (const [k, c] of Object.entries(MOCAP_RAW)) {
  const bin = atob(c.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(u8.buffer), f = new Float32Array(i16.length); for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 8000;
  MOCAP[k] = { name: c.name, src: c.src, fps: c.fps, n: c.n, X: f };
}
const MJ = Object.fromEntries(MOCAP_JOINTS.map((j, i) => [j, i]));
const MOCAP_TRACK = [["RightHand", "Right hand"], ["LeftHand", "Left hand"], ["RightFoot", "Right foot"], ["LeftFoot", "Left foot"], ["Head", "Head"], ["Hips", "Hips"]];
const BONES = [["Hips", "Spine1"], ["Spine1", "Neck"], ["Neck", "Head"], ["Neck", "LeftArm"], ["LeftArm", "LeftForeArm"], ["LeftForeArm", "LeftHand"], ["LeftHand", "LeftHandIndex1"], ["Neck", "RightArm"], ["RightArm", "RightForeArm"], ["RightForeArm", "RightHand"], ["RightHand", "RightHandIndex1"],
  ["Hips", "LeftUpLeg"], ["LeftUpLeg", "LeftLeg"], ["LeftLeg", "LeftFoot"], ["LeftFoot", "LeftToeBase"], ["Hips", "RightUpLeg"], ["RightUpLeg", "RightLeg"], ["RightLeg", "RightFoot"], ["RightFoot", "RightToeBase"]].map(([a, b]) => [MJ[a], MJ[b]]);
const MOCAP_DEF = { dancer: { clip: "pirouette", joint: "RightHand", orbit: .35, height: .35, persp: .5, ghost: false }, taichi: { clip: "taichi", joint: "RightHand", orbit: .2, height: .3, persp: .4, ghost: false } };
CHARS.push(
  { key: "dancer", name: "Dancer · mocap", desc: "Traces one joint of a real ballet dancer in 3D (CMU motion capture), seen through a slowly circling camera. Pick the clip and the joint." },
  { key: "taichi", name: "Tai chi · mocap", desc: "Traces one joint of a real tai chi performer: slow, continuous, legato motion in 3D (CMU motion capture)." });
CHAR.dancer = CHARS[CHARS.length - 2]; CHAR.taichi = CHARS[CHARS.length - 1];
const BLEND = 12; // frames crossfaded at the loop seam so the clip repeats without a jump
function mocapPose(clip, f) {
  const c = MOCAP[clip], J = MOCAP_JOINTS.length, loop = c.n - BLEND, out = new Float32Array(J * 3);
  f = ((f % loop) + loop) % loop;
  const pose = (ff, w) => { const i0 = Math.floor(ff), i1 = Math.min(c.n - 1, i0 + 1), u = ff - i0;
    for (let k = 0; k < J * 3; k++) out[k] += w * (c.X[i0 * J * 3 + k] * (1 - u) + c.X[i1 * J * 3 + k] * u); };
  if (f < BLEND) { const w = f / BLEND; pose(f, w); pose(f + loop, 1 - w); } else pose(f, 1);
  return out;
}
// node position for the chosen joint; also leaves the projected skeleton on rt.ghost
function mocapTarget(node, rt, p, E) {
  const mc = Object.assign({}, MOCAP_DEF[node.char], node.mc || {}), c = MOCAP[mc.clip] || MOCAP.pirouette, R = rt.R;
  // legato playback: tempo sets the speed, the music only nudges it, beats never jump it
  rt.mf = (rt.mf || 0) + E.dt * c.fps * (.25 + 1.5 * p.tempo) * (.85 + .3 * Math.min(1, R.rms));
  rt.yaw = (rt.yaw ?? node.seed * TAU) + E.dt * (mc.orbit * mc.orbit) * 1.2;
  const P = mocapPose(mc.clip in MOCAP ? mc.clip : "pirouette", rt.mf), J = MOCAP_JOINTS.length;
  const cy = Math.cos(rt.yaw), sy = Math.sin(rt.yaw), pitch = lerp(-.05, .9, mc.height), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const body = E.S0 * (.35 + .9 * p.roam) * (.9 + .2 * E2(R.energy) * .5), dist = lerp(9, 1.7, mc.persp);
  const hx = node.hx * W, hy = node.hy * H, pts = [];
  for (let j = 0; j < J; j++) {
    let x = P[j * 3], y = P[j * 3 + 1] - .55, z = P[j * 3 + 2];
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;           // orbit around the performer
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;           // look down from above
    const k = dist / (dist + z2);
    pts.push([hx + x1 * k * body, hy - y2 * k * body, z2]);
  }
  const q = pts[MJ[mc.joint] ?? MJ.RightHand];
  return [q[0], q[1]];
}
function drawGhost(g, pts) {
  g.lineCap = "round"; g.lineWidth = 1.2; g.strokeStyle = "rgba(225,225,235,.16)"; g.beginPath();
  BONES.forEach(([a, b]) => { g.moveTo(pts[a][0], pts[a][1]); g.lineTo(pts[b][0], pts[b][1]); }); g.stroke();
  g.fillStyle = "rgba(225,225,235,.22)"; g.beginPath(); g.arc(pts[MJ.Head][0], pts[MJ.Head][1], 4, 0, TAU); g.fill();
}
