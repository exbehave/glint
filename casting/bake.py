"""Bake CMU BVH clips into compact joint-position tracks for Glint Casting.
Output: mocap.js defining MOCAP = {clipKey: {name, src, fps, n, joints:[...], data: base64 int16 (frames x joints x 3, centimetre-ish units /scale)}}"""
import numpy as np, base64, json, sys, os

KEEP = ["Hips", "Spine1", "Neck", "Head", "LeftArm", "LeftForeArm", "LeftHand", "LeftHandIndex1", "RightArm", "RightForeArm", "RightHand", "RightHandIndex1",
        "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"]

def parse(path):
    toks = open(path).read().split()
    i = 0; joints = []; stack = []
    while toks[i] != "MOTION":
        t = toks[i]
        if t in ("ROOT", "JOINT"):
            joints.append({"name": toks[i + 1], "parent": stack[-1] if stack else -1, "off": None, "ch": []}); i += 2; continue
        if t == "End":
            joints.append({"name": None, "parent": stack[-1], "off": None, "ch": []}); i += 2; continue
        if t == "{": stack.append(len(joints) - 1); i += 1; continue
        if t == "}": stack.pop(); i += 1; continue
        if t == "OFFSET": joints[stack[-1]]["off"] = np.array([float(x) for x in toks[i + 1:i + 4]]); i += 4; continue
        if t == "CHANNELS": n = int(toks[i + 1]); joints[stack[-1]]["ch"] = toks[i + 2:i + 2 + n]; i += 2 + n; continue
        i += 1
    i += 1; assert toks[i] == "Frames:"; nf = int(toks[i + 1]); i += 2
    assert toks[i] == "Frame" and toks[i + 1] == "Time:"; ft = float(toks[i + 2]); i += 3
    vals = np.array(toks[i:], dtype=float).reshape(nf, -1)
    return joints, vals, ft

def rot(axis, deg):
    a = np.radians(deg); c, s = np.cos(a), np.sin(a); n = len(a)
    R = np.zeros((n, 3, 3)); R[:, 0, 0] = R[:, 1, 1] = R[:, 2, 2] = 1
    i, j = {"X": (1, 2), "Y": (2, 0), "Z": (0, 1)}[axis]
    R[:, i, i] = c; R[:, j, j] = c; R[:, i, j] = -s; R[:, j, i] = s
    return R

def fk(joints, vals):
    nf = vals.shape[0]; col = 0
    G = [None] * len(joints); P = [None] * len(joints)
    for k, jt in enumerate(joints):
        L = np.tile(np.eye(3), (nf, 1, 1)); t = np.tile(jt["off"], (nf, 1))
        for ch in jt["ch"]:
            v = vals[:, col]; col += 1
            if ch.endswith("position"): t = t.copy(); t[:, "XYZ".index(ch[0])] += v
            else: L = L @ rot(ch[0], v)
        if jt["parent"] < 0: G[k] = L; P[k] = t
        else:
            pg, pp = G[jt["parent"]], P[jt["parent"]]
            P[k] = pp + np.einsum("nij,nj->ni", pg, t); G[k] = pg @ L
    return P

CLIPS = [
    ("pirouette", "05_02", "Ballet · pirouette", 1, None),
    ("jete", "05_06", "Ballet · pirouettes and jeté", 1, None),
    ("arabesque", "05_18", "Ballet · arabesque, bending back", 1, None),
    ("whirl", "55_01", "Dance · whirl", 1, None),
    ("taichi", "12_04", "Tai chi", 1, (20.0, 50.0)),
]
FPS = 30
out = {}
for key, cid, name, _, window in CLIPS:
    joints, vals, ft = parse(f"raw/{cid}.bvh")
    vals = vals[1:]  # drop the added T-pose frame
    src_fps = round(1 / ft)
    if window: vals = vals[int(window[0] * src_fps):int(window[1] * src_fps)]
    step = max(1, round(src_fps / FPS)); vals = vals[::step]
    P = fk(joints, vals)
    idx = [next(i for i, j in enumerate(joints) if j["name"] == n) for n in KEEP]
    X = np.stack([P[i] for i in idx], axis=1)  # frames x joints x 3, Y up
    # centre: subtract the mean ground position of the hips so the dancer stays on stage
    hips = X[:, 0, :]
    X[:, :, 0] -= hips[:, 0].mean(); X[:, :, 2] -= hips[:, 2].mean(); X[:, :, 1] -= X[:, :, 1].min()
    height = np.percentile(X[:, 3, 1], 90)  # head height ~ body height
    X /= height  # body height ~1
    q = np.clip(np.round(X * 8000), -32767, 32767).astype("<i2")
    out[key] = {"name": name, "src": "CMU " + cid, "fps": src_fps / step, "n": int(X.shape[0]), "data": base64.b64encode(q.tobytes()).decode()}
    print(key, cid, X.shape, f"{X.shape[0] / (src_fps / step):.1f}s", "range", X.min(axis=(0, 1)).round(2), X.max(axis=(0, 1)).round(2), "kB", len(out[key]["data"]) // 1024)
js = "const MOCAP_JOINTS = " + json.dumps(KEEP) + ";\nconst MOCAP_RAW = " + json.dumps(out) + ";\n"
open("mocap.js", "w").write(js)
print("total kB", len(js) // 1024)
