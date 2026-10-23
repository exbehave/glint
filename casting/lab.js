/* ================= Casting: one node at a time ================= */
const $ = s => document.querySelector(s);
const cv = $("#stage"), Bc = cv, Bx = cv.getContext("2d");
const lavaC = mk(8, 8), lavaX = lavaC.getContext("2d"); let lavaImg = null;
let W = 600, H = 400, DPR = 1;
let db = null, dirty = false, pendingVerdict = null;

const KNOBS = [
  { key: "energy", label: "Energy", hint: "How big and busy it gets" },
  { key: "tempo", label: "Tempo", hint: "How fast its clock runs" },
  { key: "grace", label: "Grace", hint: "Smooth glide, or stepped and jerky when low" },
  { key: "chaos", label: "Chaos", hint: "Random jitter on its position" },
  { key: "size", label: "Size", hint: "Overall scale" },
  { key: "trails", label: "Trails", hint: "How long its marks linger" },
  { key: "roam", label: "Roam", hint: "How far it travels from home" },
  { key: "magnetism", label: "Magnetism", hint: "Pulls toward the partner (+) or pushes away (−)", min: -1, partner: true },
  { key: "social", label: "Social", hint: "Locks its rhythm to the partner's", partner: true }
];
// Starting point for visuals still to revisit, taken from what Kennedy's keeps have in common
const COMMON = { energy: 1, tempo: 1, chaos: .85, grace: .5, roam: .75, size: .55, trails: .6 };
const PDEF = { energy: .55, tempo: .45, grace: .7, chaos: .15, size: .5, trails: .5, roam: .45, magnetism: 0, social: .3 };
const NEEDS_PARTNER = new Set(["skater", "moth", "wallflower", "follow"]);
const LOW_HOME = { tornado: .9, tubeman: .94, seaweed: .92, fiddle: .72, aurora: .45 };
const WAVES = ["sine", "triangle", "square", "saw", "noise"];

// Bench aid only, not a Glint form: a plain glowing trail so a character's movement reads on its own.
const TRACER = { key: "tracer", name: "Plain trail", fade: 1, init: () => ({ h: [] }), shape: [{ key: "length", label: "Trail length" }],
  draw(E) { const { g, n, S, st, L, R } = E; st.h.push([n.x, n.y]); const max = Math.round(L("length", 20, 260)); while (st.h.length > max) st.h.shift();
    g.lineCap = g.lineJoin = "round";
    [[6, .1], [1.6, .75]].forEach(([w, a]) => { g.lineWidth = w; g.strokeStyle = hsl(n.hue, 90, 70, a); strokePath(g, st.h); });
    sprite(g, n.hue, n.x, n.y, S * (.03 + .03 * R.kick), .95); } };
const formOf = key => key === "tracer" ? TRACER : FORM[key];

/* ---------- state ---------- */
// Serve classic: Kennedy's saved Studio default for Serve (Oct 22, 2026; full copy with automations in serve-classic.json)
const SERVE_CLASSIC = {"shape": {"nod": 0.69, "arch": 0.42, "body": 1, "echo": 0.35, "fdir": 0.25, "feel": 0.6666666666666666, "foot": 1, "glow": 1, "hand": 1, "head": 1, "hold": 0.714285714285714, "kick": 0.57, "lean": 1, "roam": 0.49, "size": 0, "sway": 1, "walk": 0.93, "bsnap": 1, "crest": 0.69, "dlean": 1, "kicks": 0.5, "knees": 0, "persp": 0.99, "prism": 1, "ratio": 0.75, "reach": 1, "spins": 0.58, "split": 1, "squat": 0, "sweep": 0.01, "turns": 0.53, "waist": 1, "width": 0.64, "ankles": 0.17, "armlag": 1, "armlen": 1, "bounce": 1, "elbows": 0, "flicks": 0, "flings": 1, "freeze": 0.03, "kreach": 1, "rubber": 1, "spread": 1, "stance": 0.03, "waistw": 0.56, "weight": 0.35, "wspeed": 0.41, "crosses": 0.42, "echolen": 1, "mixbars": 0.428571428571429, "outward": 1, "stretch": 1, "vbounce": 1, "armspeed": 1, "dropbars": 0.428571428571429, "dropduck": 1, "legspeed": 0.23, "loudduck": 0.19, "posebeat": 0, "headstyle": 0.75, "posespeed": 0.76, "turnspeed": 0.27}, "p": {"roam": 0, "size": 0.5, "chaos": 0.15, "grace": 0.7, "tempo": 0.45, "energy": 0.9, "social": 0.3, "trails": 0.5, "magnetism": 0}, "hue": 20, "hy": 0.5};
const lab = { mode: "dance", idx: { dance: 0, reworks: 0, forms: 0, chars: 0, lenses: 0, traits: 0 }, partner: false, music: { reaction: 1, punch: 1, decay: 1 } };
const LENS_SCENES = ["cheshire", "lips", "storm", "graffiti", "synapse", "firework", "tornado2", "vine2"]; // reworks to look at through a lens
const base = mk(1, 1), baseX = base.getContext("2d"); // the composed picture, before any lens
const tweaks = {};     // per item, kept while you move around the list
const reviews = {};    // saved feedback, from the store
const DANCER_KEYS = ["serve", "servelet"];
const DANCERS = () => NEW_TRAITS.filter(r => DANCER_KEYS.includes(r.form.key)).sort((a, b) => DANCER_KEYS.indexOf(a.form.key) - DANCER_KEYS.indexOf(b.form.key)).map(r => ({ kind: "trait", key: r.form.key, name: r.form.name, desc: r.desc, r, classic: true }));
const itemsFor = m => m === "dance" ? DANCERS() : m === "traits" ? NEW_TRAITS.filter(r => !DANCER_KEYS.includes(r.form.key)).map(r => ({ kind: "trait", key: r.form.key, name: r.form.name, desc: r.desc, r })) : m === "lenses" ? LENSES.map(l => ({ kind: "lens", key: l.key, name: l.name, desc: l.desc, l })) : m === "reworks" ? REWORKS.map(r => ({ kind: "rework", key: r.form.key, name: r.form.name, desc: r.desc, from: r.from, r })) : m === "forms" ? FORMS.map(f => ({ kind: "form", key: f.key, name: f.name })) : CHARS.map(c => ({ kind: "char", key: c.key, name: c.name, desc: c.desc }));
const itemsForRaw = itemsFor;
const itemsForShown = m => { const all = itemsForRaw(m), live = all.filter(it => !(reviews[it.kind + "-" + it.key] && reviews[it.kind + "-" + it.key].verdict === "cut")); return live.length ? live : all; };
const cur = () => itemsForShown(lab.mode)[lab.idx[lab.mode]];
const docId = it => it.kind + "-" + it.key;

function reworkTweak(r) { return { form: r.form.key, char: r.char, hue: r.hue, hy: r.hy, shape: {}, p: Object.assign({}, PDEF, r.p), o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
function freshTweak(it) {
  if (it.kind === "lens") return { scene: "cheshire", op: .75, mode: it.l.mode, lk: {} };
  if (it.classic) { const r = it.r; return { form: r.form.key, char: r.char, hue: r.form.key === "serve" ? SERVE_CLASSIC.hue : r.hue, hy: SERVE_CLASSIC.hy, shape: Object.assign({}, SERVE_CLASSIC.shape), p: Object.assign({}, PDEF, SERVE_CLASSIC.p), o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
  if (it.kind === "rework" || it.kind === "trait") { const r = it.r; return { form: r.form.key, char: r.char, hue: r.hue, hy: r.hy, shape: {}, p: Object.assign({}, PDEF, r.p), o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
  if (it.kind === "form") { const f = FORM[it.key]; return { form: it.key, char: f.keepChar || f.char, hue: f.keepHue ?? 300, shape: {}, p: Object.assign({}, PDEF, COMMON, f.def || {}, f.keepP || {}), o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
  return { form: "tracer", char: it.key, hue: 190, shape: MOCAP_DEF[it.key] ? { length: .85 } : {}, mc: MOCAP_DEF[it.key] ? Object.assign({}, MOCAP_DEF[it.key]) : undefined, p: Object.assign({}, PDEF, COMMON, MOCAP_DEF[it.key] ? { roam: .4 } : {}), o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } };
}
const tw = () => { const it = cur(), id = docId(it); return tweaks[id] ||= freshTweak(it); };

/* ---------- nodes ---------- */
const RT = new Map();
function subjectNode() {
  const it = cur(); let t = tw();
  if (it.kind === "lens") { const r = REWORKS.find(x => x.form.key === t.scene) || REWORKS[0]; t = t.sceneT && t.sceneT.form === r.form.key ? t.sceneT : (t.sceneT = reworkTweak(r)); }
  const hy = t.hy ?? LOW_HOME[t.form] ?? .52, hx = t.hx ?? (lab.partner && hy < .7 ? .38 : .5);
  return { id: "subject", form: t.form, char: t.char, hx, hy, dir: t.dir ?? -Math.PI / 2, hue: t.hue, level: 1, listen: "mix", seed: .62, shape: t.shape, p: t.p, o1: t.o1, o2: t.o2, mc: t.mc };
}
function partnerNode() { return { id: "partner", form: "tracer", char: "wander", hx: .7, hy: .4, dir: -Math.PI / 2, hue: 45, level: .55, listen: "mix", seed: .21, shape: { length: .3 }, p: Object.assign({}, PDEF, { roam: .35, size: .35 }) }; }
function runtime(node) {
  let rt = RT.get(node.id);
  const sig = node.form + "|" + node.char;
  if (!rt || rt.sig !== sig) {
    rt = { sig, x: null, y: null, cx: node.hx * W, cy: node.hy * H, vx: 0, vy: 0, ang: node.dir, spin: 0, clock: node.seed * 10, hold: 1, hist: [], cs: {}, idleGap: node.seed * 1.2, p: node.p, R: null };
    const f = formOf(node.form); rt.st = f.init ? f.init(node) : {};
    rt.layer = mk(cv.width, cv.height); rt.lx = rt.layer.getContext("2d");
    RT.set(node.id, rt);
  }
  if (rt.layer.width !== cv.width || rt.layer.height !== cv.height) { rt.layer.width = cv.width; rt.layer.height = cv.height; }
  return rt;
}
function restart() { RT.clear(); }

/* ---------- audio: demo beat or a file you load ---------- */
const A = { bass: 0, mid: 0, treble: 0, rms: 0, kick: 0, midHit: 0, hat: 0, active: false };
const au = { ctx: null, an: null, input: null, mode: "none", el: null, elSrc: null, demo: null, freq: null, time: null };
const agc = { bass: .2, mid: .2, treble: .2, rms: .1 }, prevB = { bass: 0, mid: 0, treble: 0 }, since = { bass: 1, mid: 1, treble: 1 };
function ensureCtx() {
  if (au.ctx) return au.ctx;
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .5;
  const input = ctx.createGain(); input.connect(an); an.connect(ctx.destination);
  Object.assign(au, { ctx, an, input, freq: new Uint8Array(an.frequencyBinCount), time: new Uint8Array(an.fftSize) });
  return ctx;
}
function stopAll() {
  if (au.demo) { clearInterval(au.demo.timer); try { au.demo.bus.disconnect(); } catch (_) {} au.demo = null; }
  if (au.el) { au.el.pause(); try { au.elSrc.disconnect(); } catch (_) {} URL.revokeObjectURL(au.el.src); au.el = null; }
  au.mode = "none"; syncMusicUI("Silence · idle motion only");
}
function startDemo() {
  stopAll(); const ctx = ensureCtx(); ctx.resume();
  const bus = ctx.createGain(); bus.gain.value = .6; bus.connect(au.input);
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = (t, d) => { const s = ctx.createBufferSource(); s.buffer = nb; s.start(t, Math.random() * .5); s.stop(t + d); return s; };
  const env = (g, t, v, d) => { g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); };
  const kick = (t, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); env(g, t, v, .42); o.connect(g).connect(bus); o.start(t); o.stop(t + .45); };
  const snare = (t, v) => { const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = .8; const g = ctx.createGain(); env(g, t, v * .5, .2); noise(t, .22).connect(f).connect(g).connect(bus); };
  const hat = (t, v) => { const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7500; const g = ctx.createGain(); env(g, t, v * .16, .05); noise(t, .06).connect(f).connect(g).connect(bus); };
  const bass = (t, fq, d) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = fq; f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + d); g.gain.setValueAtTime(.0008, t); g.gain.exponentialRampToValueAtTime(.2, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + d + .02); };
  const ROOTS = [55, 43.65, 65.41, 49], step = 60 / 122 / 4; let next = ctx.currentTime + .08, n = 0;
  function sched(i, t) { const s = i % 16, bar = Math.floor(i / 16), sec = bar % 8, ci = bar % 4;
    if (sec === 7 && s >= 12) { snare(t, .4 + (s - 12) * .15); return; }
    if (s % 4 === 0) kick(t, 1); if (s === 4 || s === 12) snare(t, .9);
    if (s % 4 === 2) hat(t, 1); else if (s % 2 === 1) hat(t, .45);
    if ([0, 3, 6, 10, 14].includes(s)) bass(t, ROOTS[ci] * (s === 10 ? 2 : 1), step * 2.2); }
  const timer = setInterval(() => { while (next < ctx.currentTime + .12) { sched(n, next); next += step; n++; } }, 25);
  au.demo = { timer, bus }; au.mode = "demo"; syncMusicUI("Demo beat · 122 BPM");
}
function startFile(f) {
  stopAll(); const ctx = ensureCtx(); ctx.resume();
  const el = new Audio(); el.src = URL.createObjectURL(f); el.loop = true;
  const src = ctx.createMediaElementSource(el); src.connect(au.input);
  au.el = el; au.elSrc = src; au.mode = "file";
  el.addEventListener("error", () => { if (au.el === el) { stopAll(); syncMusicUI(`Couldn't play “${f.name}”. Try an MP3 or M4A.`); } });
  el.play().catch(() => {});
  syncMusicUI(f.name.replace(/\.[^.]+$/, "") + " · looping");
}
function band(lo, hi, hz) { const f = au.freq; let s = 0, c = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.ceil(hi / hz) && i < f.length; i++) { s += f[i]; c++; } return c ? s / c / 255 : 0; }
function updateAudio(dt) {
  const hits = { kick: false, mid: false, hat: false }, dec = 2 + (1 - lab.music.decay) * 14;
  A.kick *= Math.exp(-dec * dt); A.midHit *= Math.exp(-dec * dt); A.hat *= Math.exp(-dec * 1.6 * dt);
  const playing = au.mode !== "none" && !(au.mode === "file" && au.el && au.el.paused); A.active = playing;
  if (!playing) { A.bass *= .9; A.mid *= .9; A.treble *= .9; A.rms *= .9; return hits; }
  au.an.getByteFrequencyData(au.freq); au.an.getByteTimeDomainData(au.time);
  const hz = au.ctx.sampleRate / au.an.fftSize, raw = { bass: band(30, 140, hz), mid: band(250, 2500, hz), treble: band(5000, 12000, hz) };
  let sum = 0; for (let i = 0; i < au.time.length; i++) { const v = (au.time[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / au.time.length), keep = Math.pow(.5, dt / 4);
  for (const key of ["bass", "mid", "treble"]) {
    agc[key] = Math.max(raw[key], agc[key] * keep, .04);
    const norm = clamp(raw[key] / agc[key], 0, 1), flux = norm - prevB[key]; since[key] += dt;
    if (flux > .11 && norm > .6 && since[key] > .11) { since[key] = 0; if (key === "bass") { A.kick = 1; hits.kick = true; } else if (key === "mid") { A.midHit = 1; hits.mid = true; } else { A.hat = 1; hits.hat = true; } }
    prevB[key] = norm; A[key] = lerp(A[key], Math.pow(norm, 1.4), .5);
  }
  agc.rms = Math.max(rms, agc.rms * keep, .02); A.rms = lerp(A.rms, clamp(rms / agc.rms, 0, 1), .4);
  return hits;
}

/* ---------- render loop ---------- */
function resize() {
  const r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(50, r.width); H = Math.max(50, r.height);
  const w = Math.round(W * DPR), h = Math.round(H * DPR); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; restart(); }
}
new ResizeObserver(resize).observe(cv);
let gclock = 0, gtime = 0, last = performance.now(), paused = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; if (paused) return; gtime += dt;
  const hits = updateAudio(dt), m = lab.music, r = m.reaction, breath = .5 + .5 * Math.sin(gtime * .9), idle = 1 - r * .7, S0 = Math.min(W, H);
  gclock += dt * (.3 + idle * .25 * breath + A.rms * r * 1.2);
  const nodes = [subjectNode()]; if (lab.partner) nodes.push(partnerNode());
  const all = nodes.map(node => ({ node, rt: runtime(node) }));
  all.forEach(({ node, rt }) => {
    let p = node.p; const kb = formOf(node.form).kickBoost;
    if (kb) { const kick = clamp(A.kick * r * m.punch, 0, 1); p = Object.assign({}, p); kb.forEach(key => { p[key] += (1 - p[key]) * kick; }); }
    rt.p = p;
    const R = { kick: A.kick * r * m.punch * 1.4 * (.5 + p.energy), bass: A.bass * r, mid: A.mid * r, treble: A.treble * r, rms: A.rms * r, hat: A.hat * r, idle, breath };
    R.energy = (idle * (.3 + .25 * breath) + R.rms * 1.1 + R.kick * .45) * (.35 + 1.3 * p.energy);
    rt.R = R; rt.hue = node.hue;
    rt.clock += dt * (.3 + idle * .25 * breath + R.rms * 1.2 + R.kick * .5) * (.35 + 1.4 * p.tempo);
    rt.tUse = lerp(rt.clock + node.seed * 13, gclock, p.social);
    let beat = A.active ? (hits.kick && r > .05) : false;
    if (!A.active) { rt.idleGap -= dt * (.6 + .8 * p.tempo); if (rt.idleGap <= 0) { beat = true; rt.idleGap = 1.2 + Math.random() * 1.2; } }
    rt.beat = beat;
  });
  all.forEach(({ node, rt }) => travel(node, rt, rt.p, { dt, S0, tc: rt.tUse * .6, all, beat: rt.beat, gt: gtime }));
  const shared = { lava: [] };
  all.forEach(({ node, rt }) => {
    const f = formOf(node.form), lx = rt.lx, a = fadeAlpha(f.fade, rt.p.trails, dt);
    lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1;
    if (a >= 1) lx.clearRect(0, 0, rt.layer.width, rt.layer.height);
    else { lx.globalCompositeOperation = "destination-out"; lx.fillStyle = `rgba(0,0,0,${a})`; lx.fillRect(0, 0, rt.layer.width, rt.layer.height); }
    lx.setTransform(DPR, 0, 0, DPR, 0, 0); lx.globalCompositeOperation = "lighter";
    const items = f.shape || [], shp = node.shape || {};
    const k = key => { const it = items.find(x => x.key === key); return shp[key] != null ? shp[key] : (it && it.def != null ? it.def : .5); };
    const L = (key, lo, hi) => lerp(lo, hi, k(key));
    const I = key => { const it = items.find(x => x.key === key) || {}; return Math.round(lerp(it.min ?? 0, it.max ?? 1, k(key))); };
    try { f.draw({ g: lx, n: rt, node, p: rt.p, st: rt.st, R: rt.R, S: S0 * (.5 + rt.p.size), W, H, dt, t: rt.tUse, beat: rt.beat, all, frame: shared, level: node.level, k, L, I }); } catch (err) { console.error(err); }
    lx.globalAlpha = 1; lx.setLineDash([]);
  });
  Bx.setTransform(1, 0, 0, 1, 0, 0); Bx.globalAlpha = 1; Bx.globalCompositeOperation = "source-over"; Bx.clearRect(0, 0, cv.width, cv.height);
  Bx.globalCompositeOperation = "lighter";
  all.forEach(({ node, rt }) => { if (node.form === "lava") return; Bx.globalAlpha = node.level; Bx.drawImage(rt.layer, 0, 0); });
  if (shared.lava.length) drawLava(shared.lava);
  Bx.globalAlpha = 1; Bx.globalCompositeOperation = "source-over";
  // lens audition: copy the picture aside, then draw the lens over it with its blend mode and opacity
  const it0 = cur(); if (it0.kind === "lens") { const t = tw(); if (base.width !== cv.width || base.height !== cv.height) { base.width = cv.width; base.height = cv.height; }
    baseX.setTransform(1, 0, 0, 1, 0, 0); baseX.globalCompositeOperation = "source-over"; baseX.globalAlpha = 1; baseX.clearRect(0, 0, base.width, base.height); baseX.drawImage(cv, 0, 0);
    const sh = it0.l.shape || [], M = { t: gtime, dt, energy: idle * (.3 + .25 * breath) + A.rms * r * 1.1, loud: A.rms * r, kick: A.kick * r * m.punch, bass: A.bass * r, hit: hits.kick && r > .05, hat: hits.hat && r > .05, chaos: .15,
      k: key => { const d = sh.find(x => x.key === key); return t.lk[key] ?? (d && d.def != null ? d.def : .5); } };
    if (!A.active && Math.random() < dt * .8) M.hit = true;
    t.st ||= {}; Bx.save(); Bx.globalCompositeOperation = t.mode; Bx.globalAlpha = t.op; try { it0.l.draw(Bx, base, t.st, M); } catch (err) { console.error(err); } Bx.restore(); }
  const beatEl = $("#beat"); beatEl.style.opacity = .18 + A.kick * .82;
}

/* ---------- UI ---------- */
function slider(id, label, hint, min, max, step, val, fmt, onInput) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label><output id="${id}-o">${fmt(val)}</output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<div class="ctl-hint">${esc(hint)}</div>` : ""}`;
  const inp = row.querySelector("input"), out = row.querySelector("output");
  const paint = () => inp.style.setProperty("--p", ((inp.value - min) / (max - min) * 100) + "%"); paint();
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); paint(); onInput(v); });
  return row;
}
const pct = v => Math.round(v * 100) + "%";
function selectRow(id, label, opts, val, onChange) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label></div><select id="${id}" class="sel">${opts.map(([k, n]) => `<option value="${k}"${k === val ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  row.querySelector("select").addEventListener("change", e => onChange(e.target.value));
  return row;
}
function section(title, sub) { const s = document.createElement("section"); s.className = "grp"; s.innerHTML = `<h3>${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ""}</h3><div class="ctls"></div>`; return [s, s.querySelector(".ctls")]; }

function renderStrip() {
  const strip = $("#strip"); strip.innerHTML = "";
  itemsForShown(lab.mode).forEach((it, i) => {
    const b = document.createElement("button"), rv = reviews[docId(it)];
    b.className = "pick"; b.setAttribute("aria-pressed", i === lab.idx[lab.mode]); b.dataset.v = rv && rv.verdict || "";
    b.innerHTML = `<i></i>${esc(it.name)}`;
    b.addEventListener("click", () => go(i)); strip.append(b);
  });
  const on = strip.querySelector('[aria-pressed="true"]'); if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
  const list = itemsForShown(lab.mode), done = list.filter(it => reviews[docId(it)] && reviews[docId(it)].verdict).length;
  $("#progress").textContent = `${done} of ${list.length} reviewed`;
}
function renderHead() {
  const it = cur(), list = itemsForShown(lab.mode), t = tw();
  $("#item-name").textContent = it.name;
  $("#item-count").textContent = `${lab.idx[lab.mode] + 1} / ${list.length}`;
  $("#item-desc").textContent = it.kind === "lens" || it.kind === "trait" ? it.desc : it.kind === "rework" ? it.desc + " From your notes on " + it.from + "." : it.kind === "char" ? it.desc : `Moves as ${CHAR[t.char].name}${t.char === FORM[it.key].char ? " (its default)" : ""}.`;
}
function mocapSection(box, t) {
  if (!MOCAP_DEF[t.char]) return;
  t.mc = Object.assign({}, MOCAP_DEF[t.char], t.mc || {});
  const [s, c] = section("Performance", "real motion capture");
  c.append(selectRow("mc-clip", "Clip", Object.entries(MOCAP).map(([k, m]) => [k, m.name + " · " + (m.n / m.fps).toFixed(0) + "s"]), t.mc.clip, v => { t.mc.clip = v; restart(); }));
  c.append(selectRow("mc-joint", "Follow", MOCAP_TRACK, t.mc.joint, v => { t.mc.joint = v; restart(); }));
  c.append(slider("mc-orbit", "Camera orbit", "How fast the view circles the performer", 0, 1, .01, t.mc.orbit, pct, v => { t.mc.orbit = v; }));
  c.append(slider("mc-height", "Camera height", "Eye level, or looking down from above", 0, 1, .01, t.mc.height, pct, v => { t.mc.height = v; }));
  c.append(slider("mc-persp", "Depth", "How strongly near limbs grow and far ones shrink", 0, 1, .01, t.mc.persp, pct, v => { t.mc.persp = v; }));
  box.append(s);
}
function renderControls() {
  const box = $("#controls"); box.innerHTML = ""; const it = cur(), t = tw(), f = formOf(t.form);
  // the thing under test comes first
  if (it.kind === "lens") {
    const [s, c] = section("Lens", "this effect's own settings");
    c.append(slider("lens-op", "Opacity", "", 0, 1, .01, t.op, pct, v => { t.op = v; }));
    c.append(selectRow("lens-mode", "Blend", LENS_BLENDS, t.mode, v => { t.mode = v; }));
    (it.l.shape || []).forEach(sh => { const mn = sh.min ?? 0, mx = sh.max ?? 1, steps = mn === 0 && mx === 1 ? 0 : mx - mn, v0 = t.lk[sh.key] ?? sh.def ?? .5;
      if (sh.fmt && steps) { c.append(selectRow("lk-" + sh.key, sh.label, Array.from({ length: steps + 1 }, (_, i) => [String(i / steps), sh.fmt(i)]), String(Math.round(v0 * steps) / steps), v => { t.lk[sh.key] = parseFloat(v); })); return; }
      c.append(slider("lk-" + sh.key, sh.label, "", 0, 1, .01, v0, pct, v => { t.lk[sh.key] = v; })); });
    box.append(s);
    const [s2, c2] = section("Scene", "what you're looking at through it");
    c2.append(selectRow("lens-scene", "Trait", LENS_SCENES.filter(k => REWORKS.some(r => r.form.key === k)).map(k => [k, REWORKS.find(r => r.form.key === k).form.name]), t.scene, v => { t.scene = v; t.sceneT = null; restart(); }));
    box.append(s2);
    $("#hue-swatch").style.background = "transparent";
    return;
  }
  if (it.kind === "form" || it.kind === "rework" || it.kind === "trait") {
    // a visual can split its controls into named groups (sh.grp) and hide settings that don't apply (sh.when), like the Studio
    const secs = new Map(), rows = [], shapeItems = f.shape || [];
    const secFor = name => { if (!secs.has(name)) { const sc = section(name === "Shape" ? "Shape" : name, secs.size ? "" : it.kind === "rework" ? "this take" : it.kind === "trait" ? "its own settings" : "unique to this form"); secs.set(name, sc); box.append(sc[0]); } return secs.get(name); };
    const pickV = key => { const sh = shapeItems.find(x => x.key === key) || {}; return Math.round(lerp(sh.min ?? 0, sh.max ?? 1, t.shape[key] ?? sh.def ?? .5)); };
    const applyWhen = () => { rows.forEach(([sh, row]) => { row.hidden = !!(sh.when && !sh.when(pickV)); }); secs.forEach(([sec, cc]) => { sec.hidden = !Array.from(cc.children).some(r => !r.hidden); }); };
    shapeItems.forEach(sh => { const c = secFor(sh.grp || "Shape")[1], s = null; if (sh.text) { const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label for="sh-${sh.key}">${esc(sh.label)}</label></div><textarea id="sh-${sh.key}" class="words" rows="2"></textarea>`; const ta = row.querySelector("textarea"); ta.value = t.shape[sh.key] ?? sh.def; ta.addEventListener("input", () => { t.shape[sh.key] = ta.value; }); c.append(row); return; }
      // two-choice settings (min 0, max 1 with labels) are steps too, not a percent slider; matches the Studio
      const mn = sh.min ?? 0, mx = sh.max ?? 1, steps = mn === 0 && mx === 1 && !sh.fmt ? 0 : mx - mn;
      const v0 = t.shape[sh.key] ?? sh.def ?? .5;
      const fmt = v => { if (sh.cfmt) return sh.cfmt(v); if (!steps) return pct(v); const n = Math.round(lerp(mn, mx, v)); return sh.fmt ? sh.fmt(n) : String(n); };
      const row = slider("sh-" + sh.key, sh.label, "", 0, 1, steps ? 1 / steps : .01, v0, fmt, v => { t.shape[sh.key] = v; if (sh.when || shapeItems.some(x => x.when)) applyWhen(); }); rows.push([sh, row]); c.append(row); });
    applyWhen();
    if (it.kind === "trait" || (it.kind === "rework" && ["graffiti", "storm", "cheshire", "swim", "synapse", "lips", "firework"].includes(it.key))) { /* these place their own parts on the canvas */ } else {
    const [s2, c2] = section("Movement", "try it with other characters");
    c2.append(selectRow("mv-char", "Character", CHARS.filter(ch => ch.key !== "custom").map(ch => [ch.key, ch.name + (ch.key === (it.kind === "rework" || it.kind === "trait" ? it.r.char : FORM[it.key].char) ? " · default" : "")]), t.char, v => { t.char = v; restart(); renderHead(); renderControls(); }));
    box.append(s2);
    mocapSection(box, t); }
  } else {
    const [s, c] = section("Draw as", "swap the plain trail for a form");
    c.append(selectRow("mv-form", "Form", [["tracer", "Plain trail (bench only)"]].concat(FORMS.map(fm => [fm.key, fm.name])), t.form, v => { t.form = v; t.shape = {}; restart(); renderControls(); }));
    box.append(s);
    mocapSection(box, t);
    if (t.char === "custom") {
      const [s3, c3] = section("Path", "two oscillators");
      [["o1", "A"], ["o2", "B"]].forEach(([o, n]) => {
        c3.append(selectRow("w-" + o, `Wave ${n}`, WAVES.map(w => [w, w[0].toUpperCase() + w.slice(1)]), t[o].wave, v => { t[o].wave = v; }));
        c3.append(slider("r-" + o, `Rate ${n}`, "", .05, 3, .01, t[o].rate, v => v.toFixed(2) + "×", v => { t[o].rate = v; }));
        c3.append(slider("d-" + o, `Depth ${n}`, "", 0, .5, .01, t[o].depth, pct, v => { t[o].depth = v; }));
      });
      box.append(s3);
    }
  }
  // every trait can be placed: where its home sits on the stage (anchored traits sit there; travelling ones orbit it)
  const [sp, cp] = section("Position", "where it sits on the stage");
  cp.append(slider("pos-x", "Across", "", 0, 1, .01, t.hx ?? .5, pct, v => { t.hx = v; }));
  cp.append(slider("pos-y", "Down", "", 0, 1, .01, t.hy ?? LOW_HOME[t.form] ?? .52, pct, v => { t.hy = v; }));
  box.append(sp);
  const [s4, c4] = section("Motion", "shared by every node");
  KNOBS.filter(kn => !kn.partner || lab.partner).forEach(kn => c4.append(slider("p-" + kn.key, kn.label, kn.hint, kn.min ?? 0, 1, .01, t.p[kn.key], kn.min ? v => (v > 0 ? "+" : "") + Math.round(v * 100) : pct, v => { t.p[kn.key] = v; })));
  box.append(s4);
  const [s5, c5] = section("Look");
  c5.append(slider("hue", "Color", "", 0, 359, 1, t.hue, v => Math.round(v) + "°", v => { t.hue = v; }));
  box.append(s5);
  $("#hue-swatch").style.background = `hsl(${t.hue} 95% 60%)`;
}
function renderReview() {
  const it = cur(), rv = reviews[docId(it)] || {};
  document.querySelectorAll("#verdict button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === rv.verdict || (b.dataset.v === "hire" && rv.verdict === "keep")));
  if (document.activeElement !== $("#notes")) $("#notes").value = rv.notes || "";
  $("#review-for").textContent = it.name;
  $("#saved-at").textContent = rv.updatedAt ? "Saved " + new Date(rv.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + (rv.settings ? " with these settings" : "") : (db ? "Tap a verdict to save it with the current settings" : "");
  $("#load-saved").hidden = !rv.settings;
}
function renderAll() {
  const arch = lab.mode !== "dance"; $("#tab-dance").setAttribute("aria-pressed", !arch); $("#tab-archive").setAttribute("aria-pressed", arch); $("#archive-row").hidden = !arch;
  $("#tab-lenses").setAttribute("aria-pressed", lab.mode === "lenses"); $("#tab-traits").setAttribute("aria-pressed", lab.mode === "traits"); $("#tab-reworks").setAttribute("aria-pressed", lab.mode === "reworks"); $("#tab-forms").setAttribute("aria-pressed", lab.mode === "forms"); $("#tab-chars").setAttribute("aria-pressed", lab.mode === "chars");
  const it = cur();
  $("#partner").checked = lab.partner;
  $("#partner-note").textContent = it.kind === "char" && NEEDS_PARTNER.has(it.key) ? "This character reacts to other nodes, so a partner is on." : "A dim second node to react to.";
  renderStrip(); renderHead(); renderControls(); renderReview();
}
function go(i) {
  const n = itemsForShown(lab.mode).length; lab.idx[lab.mode] = (i + n) % n;
  const it = cur(); lab.partner = it.kind === "char" ? NEEDS_PARTNER.has(it.key) : (it.key === "lightning" || it.key === "cradle" ? lab.partner : false);
  restart(); renderAll(); remember();
}
function setMode(m) { lab.mode = m; if (m !== "dance") lab.archMode = m; go(lab.idx[m]); }
function syncMusicUI(text) {
  $("#music-now").textContent = text;
  $("#m-demo").setAttribute("aria-pressed", au.mode === "demo"); $("#m-off").setAttribute("aria-pressed", au.mode === "none"); $("#m-file-l").setAttribute("aria-pressed", au.mode === "file");
}

$("#tab-dance").addEventListener("click", () => setMode("dance"));
$("#tab-archive").addEventListener("click", () => setMode(lab.archMode || "traits"));
$("#tab-forms").addEventListener("click", () => setMode("forms"));
$("#tab-reworks").addEventListener("click", () => setMode("reworks"));
$("#tab-chars").addEventListener("click", () => setMode("chars"));
$("#tab-lenses").addEventListener("click", () => setMode("lenses"));
$("#tab-traits").addEventListener("click", () => setMode("traits"));
$("#prev").addEventListener("click", () => go(lab.idx[lab.mode] - 1));
$("#next").addEventListener("click", () => go(lab.idx[lab.mode] + 1));
$("#reset").addEventListener("click", () => { delete tweaks[docId(cur())]; restart(); renderAll(); });
$("#replay").addEventListener("click", () => restart());
$("#partner").addEventListener("change", e => { lab.partner = e.target.checked; restart(); renderControls(); });
$("#m-demo").addEventListener("click", () => au.mode === "demo" ? stopAll() : startDemo());
$("#m-off").addEventListener("click", stopAll);
$("#m-file").addEventListener("change", e => { const f = e.target.files && e.target.files[0]; if (f) startFile(f); e.target.value = ""; });
$("#stage").addEventListener("click", () => { paused = !paused; $("#paused").hidden = !paused; });
document.addEventListener("keydown", e => { if (e.target.closest("input, textarea, select")) return; if (e.key === "ArrowRight") go(lab.idx[lab.mode] + 1); if (e.key === "ArrowLeft") go(lab.idx[lab.mode] - 1); });
(function music() {
  const box = $("#music-ctl");
  box.append(slider("reaction", "Reaction", "0% = idle motion only", 0, 1, .01, lab.music.reaction, pct, v => { lab.music.reaction = v; }),
    slider("punch", "Punch", "How hard beats hit", 0, 1, .01, lab.music.punch, pct, v => { lab.music.punch = v; }),
    slider("decay", "Decay", "How long each hit rings", 0, 1, .01, lab.music.decay, pct, v => { lab.music.decay = v; }));
})();

/* ---------- feedback store ---------- */
function setStatus(msg, bad) { const el = $("#store-status"); el.textContent = msg; el.dataset.bad = bad ? "1" : ""; }
async function connectStore() {
  if (!window.claude || !window.claude.use) { setStatus("Notes can't be saved in this view.", true); disableReview(); return; }
  db = await window.claude.use("db");
  if (!db) { setStatus("Notes can't be saved in this view. Open it from claude.ai while signed in.", true); disableReview(); return; }
  setStatus("Notes save for Claude to read.");
  db.collection("reviews").onSnapshot(snap => {
    // cut items drop out of the list when notes arrive, so keep pointing at the same item (by id), not the same position
    const before = cur(), was = lab.wantKey || (before && docId(before)); lab.wantKey = null;
    snap.docs.forEach(d => { reviews[d.id] = d.data(); });
    snap.docChanges().forEach(ch => { if (ch.type === "removed") delete reviews[ch.doc.id]; });
    const list = itemsForShown(lab.mode), at = list.findIndex(it => docId(it) === was);
    if (at >= 0 && at !== lab.idx[lab.mode]) { lab.idx[lab.mode] = at; renderAll(); } else if (lab.idx[lab.mode] >= list.length) { lab.idx[lab.mode] = list.length - 1; renderAll(); } else renderHead();
    renderStrip(); if (!dirty) renderReview(); else $("#saved-at").textContent = "Unsaved changes";

  }, err => setStatus("Lost the connection to saved notes (" + err.code + "). Reload the page.", true));
}
function disableReview() { ["#notes"].forEach(s => $(s).disabled = true); document.querySelectorAll("#verdict button").forEach(b => b.disabled = true); }

document.querySelectorAll("#verdict button").forEach(b => b.addEventListener("click", () => {
  pendingVerdict = b.dataset.v; document.querySelectorAll("#verdict button").forEach(x => x.setAttribute("aria-pressed", x === b));
  if (b.dataset.v === "rework") $("#notes").focus(); saveReview();
}));
$("#notes").addEventListener("input", () => { dirty = true; $("#saved-at").textContent = "Unsaved note"; });
$("#save-note").addEventListener("click", () => saveReview());
function snapshotSettings() { const t = tw(); if (cur().kind === "lens") return JSON.parse(JSON.stringify({ lens: cur().key, scene: t.scene, opacity: Math.round(t.op * 100), blend: t.mode, settings: t.lk, music: { source: au.mode, ...lab.music } })); return JSON.parse(JSON.stringify({ form: t.form, char: t.char, hue: Math.round(t.hue), shape: t.shape, motion: t.p, position: { x: t.hx ?? .5, y: t.hy ?? LOW_HOME[t.form] ?? .52 }, partner: lab.partner, music: { source: au.mode, ...lab.music }, path: t.char === "custom" ? { a: t.o1, b: t.o2 } : undefined, performance: MOCAP_DEF[t.char] ? t.mc : undefined })); }
// one tap is the whole review: the verdict, the note so far, and every slider position go to the store together
async function saveReview() {
  if (!db) return; const it = cur(), id = docId(it), prev = reviews[id] || {};
  const body = { kind: it.kind, key: it.key, name: it.name, verdict: pendingVerdict ?? prev.verdict ?? null, notes: $("#notes").value.trim(), settings: snapshotSettings(), updatedAt: new Date().toISOString() };
  try { await db.collection("reviews").doc(id).set(body); reviews[id] = body; dirty = false; pendingVerdict = null; renderReview(); renderStrip(); $("#saved-at").textContent = "Saved"; }
  catch (e) { $("#saved-at").textContent = e.code === "invalid_argument" ? "Only you can save notes here." : "Didn't save (" + e.code + "). Try again."; }
}
$("#load-saved").addEventListener("click", () => {
  const rv = reviews[docId(cur())]; if (!rv || !rv.settings) return; const s = rv.settings, t = tw();
  if (cur().kind === "lens") { Object.assign(t, { scene: s.scene || t.scene, op: (s.opacity ?? 75) / 100, mode: s.blend || t.mode, lk: Object.assign({}, s.settings) }); t.sceneT = null; restart(); renderAll(); return; }
  Object.assign(t, { form: s.form, char: s.char, hue: s.hue, shape: Object.assign({}, s.shape), p: Object.assign({}, PDEF, s.motion) }); if (s.position) { t.hx = s.position.x; t.hy = s.position.y; }
  if (s.path) { t.o1 = Object.assign({}, s.path.a); t.o2 = Object.assign({}, s.path.b); }
  if (s.performance) t.mc = Object.assign({}, s.performance);
  lab.partner = !!s.partner; restart(); renderAll();
});

function remember() { dirty = false; pendingVerdict = null; try { localStorage.setItem("casting.pos2", JSON.stringify({ mode: lab.mode, idx: lab.idx, key: cur() ? docId(cur()) : null })); } catch (_) {} }

try { const pos = JSON.parse(localStorage.getItem("casting.pos2") || "null"); if (pos && pos.idx) { lab.wantKey = pos.key || null; lab.mode = ["dance", "reworks", "forms", "chars", "lenses", "traits"].includes(pos.mode) ? pos.mode : "dance"; if (lab.mode !== "dance") lab.archMode = lab.mode; lab.idx.lenses = clamp(pos.idx.lenses | 0, 0, LENSES.length - 1); lab.idx.traits = clamp(pos.idx.traits | 0, 0, NEW_TRAITS.length - 3); lab.idx.reworks = clamp(pos.idx.reworks | 0, 0, REWORKS.length - 1); lab.idx.forms = clamp(pos.idx.forms | 0, 0, FORMS.length - 1); lab.idx.chars = clamp(pos.idx.chars | 0, 0, CHARS.length - 1); } } catch (_) {}
syncMusicUI("Silence · idle motion only");
go(lab.idx[lab.mode]);
resize(); requestAnimationFrame(frame);
connectStore();
