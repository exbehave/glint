/* Glint: up to three visuals layered on one stage, each with only its own sliders, plus music and personalities. */
const $ = s => document.querySelector(s);
const cv = $("#stage"), F = cv.getContext("2d");
const Bc = document.createElement("canvas"), Bx = Bc.getContext("2d");
const lavaC = mk(8, 8), lavaX = lavaC.getContext("2d"); let lavaImg = null;
let W = 600, H = 400, DPR = 1;

/* ---------- the approved visuals and how each one starts ---------- */
const COMMON = { energy: 1, tempo: 1, chaos: .85, grace: .5, roam: .75, size: .55, trails: .6 };
const PDEF = { energy: .55, tempo: .45, grace: .7, chaos: .15, size: .5, trails: .5, roam: .45, magnetism: 0, social: .3 };
const fromCasting = key => { const r = REWORKS.find(x => x.form.key === key); return { char: r.char, hue: r.hue, hy: r.hy, p: r.p, shape: {} }; };
const VISUALS = [
  ["graffiti", fromCasting("graffiti")],
  ["storm", fromCasting("storm")],
  ["cheshire", fromCasting("cheshire")],
  ["synapse", fromCasting("synapse")],
  ["lips", fromCasting("lips")],
  ["cradle", { char: "waltz", hue: 319, p: { chaos: .45, energy: 1, grace: 1, roam: .38, size: 1, tempo: 1, trails: 1 }, shape: { pluck: .47, strings: 1, tension: .98 } }],
  ["doodle2", fromCasting("doodle2")],
  ["tubeman", { char: "anchored", hue: 300, hy: .94, p: Object.assign({}, COMMON, { roam: .14 }), shape: { flop: .13, height: .23 } }],
  ["tornado2", fromCasting("tornado2")],
  ["vine2", fromCasting("vine2")],
  ["firework", fromCasting("firework")]
];
const VIS = Object.fromEntries(VISUALS);
// these place their own parts on the canvas, so a movement choice would do nothing
const FIXED = new Set(["graffiti", "storm", "cheshire", "synapse", "lips", "firework"]);
const MOTION = [
  { key: "energy", label: "Energy", hint: "How big and busy it gets" },
  { key: "tempo", label: "Tempo", hint: "How fast its clock runs" },
  { key: "chaos", label: "Chaos", hint: "Random jitter" },
  { key: "grace", label: "Grace", hint: "Smooth glide, or stepped and jerky when low" },
  { key: "size", label: "Size" },
  { key: "trails", label: "Trails", hint: "How long its marks linger" },
  { key: "roam", label: "Roam", hint: "How far it travels from home" }
];
const MOVES = ["anchored", "wander", "skater", "moth", "wallflower", "metronome", "slinky", "waltz", "follow", "housecat"];

/* ---------- state, saved on this device ---------- */
const KEY = "glint.v3";
let state = null, sel = 0, seq = 0;
function newLayer(form) {
  const v = VIS[form];
  return { id: "L" + Date.now().toString(36) + (seq++), form, char: v.char, hue: v.hue, level: 1, on: true, hy: v.hy ?? .52, seed: Math.random(), shape: Object.assign({}, v.shape), p: Object.assign({}, PDEF, v.p) };
}
function fresh() { return { layers: [newLayer("cheshire")], moods: Object.fromEntries(MOODS.map(m => [m.key, { on: false, op: .5, mode: m.mode }])), music: { reaction: 1, punch: 1, decay: 1 } }; }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.layers)) s.layers.forEach(l => { if (l.form === "doodle") l.form = "doodle2"; }); if (s && Array.isArray(s.layers) && s.layers.length && s.layers.every(l => VIS[l.form])) { MOODS.forEach(m => { s.moods[m.key] ||= { on: false, op: .5, mode: m.mode }; }); return s; } } catch (_) {} return fresh(); }
let saveT = 0; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state, (k, v) => k === "_st" ? undefined : v)); } catch (_) {} }, 300); }
state = load();

/* ---------- audio ---------- */
const A = { bass: 0, mid: 0, treble: 0, rms: 0, kick: 0, midHit: 0, hat: 0, active: false };
const au = { ctx: null, an: null, input: null, out: null, mode: "none", el: null, elSrc: null, mic: null, micSrc: null, demo: null, freq: null, time: null };
const agc = { bass: .2, mid: .2, treble: .2, rms: .1 }, prevB = { bass: 0, mid: 0, treble: 0 }, since = { bass: 1, mid: 1, treble: 1 };
function ensureCtx() {
  if (au.ctx) return au.ctx;
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .5;
  const input = ctx.createGain(), out = ctx.createGain(); input.connect(an); an.connect(out); out.connect(ctx.destination);
  Object.assign(au, { ctx, an, input, out, freq: new Uint8Array(an.frequencyBinCount), time: new Uint8Array(an.fftSize) });
  return ctx;
}
function stopAll(msg) {
  if (au.demo) { clearInterval(au.demo.timer); try { au.demo.bus.disconnect(); } catch (_) {} au.demo = null; }
  if (au.el) { au.el.pause(); try { au.elSrc.disconnect(); } catch (_) {} URL.revokeObjectURL(au.el.src); au.el = null; }
  if (au.mic) { au.mic.getTracks().forEach(t => t.stop()); try { au.micSrc.disconnect(); } catch (_) {} au.mic = null; }
  au.mode = "none"; musicUI(msg || "Silence · idle motion only");
}
function startDemo() {
  stopAll(); const ctx = ensureCtx(); ctx.resume(); au.out.gain.value = 1;
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
  au.demo = { timer, bus }; au.mode = "demo"; musicUI("Demo beat · 122 BPM");
}
function startFile(f) {
  stopAll(); const ctx = ensureCtx(); ctx.resume().catch(() => {}); au.out.gain.value = 1;
  const el = new Audio(); el.src = URL.createObjectURL(f); el.loop = true; el.playsInline = true;
  const src = ctx.createMediaElementSource(el); src.connect(au.input);
  au.el = el; au.elSrc = src; au.mode = "file"; au.name = f.name.replace(/\.[^.]+$/, "");
  el.addEventListener("error", () => { if (au.el === el) stopAll(`Couldn't play "${f.name}". Try an MP3 or M4A.`); });
  ["play", "pause", "timeupdate", "loadedmetadata", "durationchange"].forEach(ev => el.addEventListener(ev, () => { if (au.el === el) transportUI(); }));
  musicUI(au.name + " · looping");
  el.play().catch(() => { if (au.el === el) { musicUI(au.name + " · tap Play to start"); transportUI(); } });
}
const fmt = t => !isFinite(t) ? "0:00" : Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
let seeking = false;
function transportUI() {
  const el = au.el, box = $("#transport");
  box.hidden = !(au.mode === "file" && el);
  if (box.hidden) return;
  const b = $("#t-play"); b.textContent = el.paused ? "Play" : "Pause"; b.setAttribute("aria-label", b.textContent);
  if (!seeking) $("#t-seek").value = el.duration ? Math.round(el.currentTime / el.duration * 1000) : 0;
  $("#t-time").textContent = fmt(el.currentTime) + " / " + fmt(el.duration);
}
$("#t-play").addEventListener("click", () => {
  const el = au.el; if (!el) return;
  if (el.paused) { au.ctx.resume().catch(() => {}); el.play().then(() => musicUI(au.name + " · looping")).catch(() => musicUI(`Couldn't start "${au.name}".`)); }
  else { el.pause(); musicUI(au.name + " · paused"); }
});
$("#t-seek").addEventListener("input", e => { seeking = true; const el = au.el; if (el && el.duration) { el.currentTime = e.target.value / 1000 * el.duration; $("#t-time").textContent = fmt(el.currentTime) + " / " + fmt(el.duration); } });
$("#t-seek").addEventListener("change", () => { seeking = false; });
// Tapping "Load a song" is a real tap, so unlock sound then; iPhone may refuse to start audio after the file picker closes
$("#m-file").addEventListener("click", () => { try { ensureCtx().resume().catch(() => {}); } catch (_) {} });
async function startMic() {
  stopAll();
  // iPhone Safari only starts sound processing from a direct tap, so the engine starts before the permission prompt
  const ctx = ensureCtx(); ctx.resume().catch(() => {});
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) {} }
    au.out.gain.value = 0; const src = ctx.createMediaStreamSource(stream); src.connect(au.input);
    au.mic = stream; au.micSrc = src; au.mode = "mic"; musicUI("Microphone · listening");
  } catch (err) { stopAll(err && err.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in Settings → Safari → Microphone." : "The microphone couldn't start."); }
}
function band(lo, hi, hz) { const f = au.freq; let s = 0, c = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.ceil(hi / hz) && i < f.length; i++) { s += f[i]; c++; } return c ? s / c / 255 : 0; }
function updateAudio(dt) {
  const hits = { kick: false, mid: false, hat: false }, dec = 2 + (1 - state.music.decay) * 14;
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

/* ---------- engine ---------- */
const RT = new Map();
function nodeOf(l) { return { id: l.id, form: l.form, char: l.char, hx: .5, hy: l.hy ?? .52, dir: -Math.PI / 2, hue: l.hue, level: l.level, listen: "mix", seed: l.seed, shape: l.shape, p: l.p, o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
function runtime(node) {
  let rt = RT.get(node.id); const sig = node.form + "|" + node.char;
  if (!rt || rt.sig !== sig) {
    rt = { sig, x: null, y: null, cx: node.hx * W, cy: node.hy * H, vx: 0, vy: 0, ang: node.dir, spin: 0, clock: node.seed * 10, hold: 1, hist: [], cs: {}, idleGap: node.seed * 1.2, p: node.p, R: null };
    const f = FORM[node.form]; rt.st = f.init ? f.init(node) : {};
    rt.layer = mk(Bc.width, Bc.height); rt.lx = rt.layer.getContext("2d"); RT.set(node.id, rt);
  }
  if (rt.layer.width !== Bc.width || rt.layer.height !== Bc.height) { rt.layer.width = Bc.width; rt.layer.height = Bc.height; }
  return rt;
}
function resize() {
  const r = cv.getBoundingClientRect(); DPR = Math.min(document.body.classList.contains("playing") ? 1.5 : 2, window.devicePixelRatio || 1);
  W = Math.max(50, r.width); H = Math.max(50, r.height);
  const w = Math.round(W * DPR), h = Math.round(H * DPR);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; Bc.width = w; Bc.height = h; RT.clear(); }
}
new ResizeObserver(resize).observe(cv);
function moodBias() { const b = {}; MOODS.forEach(m => { const s = state.moods[m.key]; if (!s.on) return; for (const k in m.bias) b[k] = (b[k] || 0) + m.bias[k] * s.op; }); return b; }
let gclock = 0, gtime = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; gtime += dt;
  const hits = updateAudio(dt), m = state.music, r = m.reaction, breath = .5 + .5 * Math.sin(gtime * .9), idle = 1 - r * .7, S0 = Math.min(W, H), bias = moodBias();
  gclock += dt * (.3 + idle * .25 * breath + A.rms * r * 1.2);
  const all = state.layers.filter(l => l.on).map(l => { const node = nodeOf(l); return { node, rt: runtime(node) }; });
  all.forEach(({ node, rt }) => {
    const p = {}; for (const k in node.p) p[k] = k === "magnetism" ? clamp(node.p[k] + (bias[k] || 0), -1, 1) : clamp(node.p[k] + (bias[k] || 0), 0, 1);
    const kb = FORM[node.form].kickBoost; if (kb) { const kk = clamp(A.kick * r * m.punch, 0, 1); kb.forEach(key => { p[key] += (1 - p[key]) * kk; }); }
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
    const f = FORM[node.form], lx = rt.lx, a = fadeAlpha(f.fade, rt.p.trails, dt);
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
  Bx.setTransform(1, 0, 0, 1, 0, 0); Bx.globalAlpha = 1; Bx.globalCompositeOperation = "source-over"; Bx.clearRect(0, 0, Bc.width, Bc.height);
  Bx.globalCompositeOperation = "lighter";
  all.forEach(({ node, rt }) => { Bx.globalAlpha = node.level; Bx.drawImage(rt.layer, 0, 0); });
  if (shared.lava.length) drawLava(shared.lava);
  Bx.globalAlpha = 1;
  F.setTransform(1, 0, 0, 1, 0, 0); F.globalCompositeOperation = "source-over"; F.globalAlpha = 1; F.clearRect(0, 0, cv.width, cv.height); F.drawImage(Bc, 0, 0);
  const M = { t: gtime, dt, energy: idle * (.3 + .25 * breath) + A.rms * r * 1.1, kick: A.kick * r * m.punch, bass: A.bass * r, hit: hits.kick && r > .05, hat: hits.hat && r > .05, chaos: clamp(.15 + (bias.chaos || 0), 0, 1) };
  if (!A.active && Math.random() < dt * .8) M.hit = true;
  MOODS.forEach(md => { const s = state.moods[md.key]; if (!s.on || s.op <= 0) return; s._st ||= {};
    F.save(); F.globalCompositeOperation = s.mode; F.globalAlpha = s.op; try { md.draw(F, Bc, s._st, M); } catch (err) { console.error(err); } F.restore(); });
  $("#beat").style.opacity = .18 + A.kick * .82;
}

/* ---------- UI ---------- */
const pct = v => Math.round(v * 100) + "%";
function slider(id, label, hint, min, max, step, val, fmt, onInput) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label><output>${fmt(val)}</output></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<div class="ctl-hint">${esc(hint)}</div>` : ""}`;
  const inp = row.querySelector("input"), out = row.querySelector("output"), paint = () => inp.style.setProperty("--p", ((inp.value - min) / (max - min) * 100) + "%"); paint();
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); paint(); onInput(v); save(); });
  return row;
}
function group(title, sub, open = true) { const d = document.createElement("details"); d.className = "grp"; d.open = open; d.innerHTML = `<summary><h3>${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ""}</h3></summary><div class="ctls"></div>`; return [d, d.querySelector(".ctls")]; }
function renderLayers() {
  const nav = $("#layers"); nav.innerHTML = "";
  state.layers.forEach((l, i) => { const b = document.createElement("button"); b.className = "layer-tab" + (l.on ? "" : " off"); b.setAttribute("aria-pressed", i === sel);
    b.style.setProperty("--c", `hsl(${l.hue} 95% 60%)`); b.innerHTML = `<i></i>${esc(FORM[l.form].name)}`; b.addEventListener("click", () => { sel = i; renderAll(); }); nav.append(b); });
  if (state.layers.length < 3) { const add = document.createElement("button"); add.className = "layer-tab add-tab"; add.textContent = "+ Add a visual";
    add.addEventListener("click", () => { const used = state.layers.map(l => l.form), next = VISUALS.map(v => v[0]).find(k => !used.includes(k)) || "graffiti"; state.layers.push(newLayer(next)); sel = state.layers.length - 1; save(); renderAll(); }); nav.append(add); }
}
function renderLayer() {
  const box = $("#layer-card"), l = state.layers[sel]; box.innerHTML = "";
  if (!l) return;
  const head = document.createElement("div"); head.className = "row spread";
  head.innerHTML = `<h3 style="margin:0">Visual ${sel + 1} of ${state.layers.length}</h3><div class="row"><button class="btn" id="l-hide">${l.on ? "Hide" : "Show"}</button><button class="btn" id="l-reset">Reset</button>${state.layers.length > 1 ? '<button class="btn danger" id="l-del">Remove</button>' : ""}</div>`;
  box.append(head);
  const chips = document.createElement("div"); chips.className = "chips";
  VISUALS.forEach(([key]) => { const c = document.createElement("button"); c.className = "chip"; c.textContent = FORM[key].name; c.setAttribute("aria-pressed", key === l.form);
    c.addEventListener("click", () => { if (key === l.form) return; Object.assign(l, newLayer(key), { id: l.id, on: l.on }); save(); renderAll(); }); chips.append(c); });
  box.append(chips);
  box.append(slider("l-hue", "Color", "", 0, 359, 1, l.hue, v => Math.round(v) + "°", v => { l.hue = v; renderLayers(); }));
  box.append(slider("l-level", "Opacity", "", 0, 1, .01, l.level, pct, v => { l.level = v; }));
  // the visual's own controls
  const f = FORM[l.form], [g1, c1] = group("Shape", f.name);
  (f.shape || []).forEach(sh => {
    if (sh.text) { const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label for="sh-${sh.key}">${esc(sh.label)}</label></div><textarea id="sh-${sh.key}" rows="3"></textarea>`;
      const ta = row.querySelector("textarea"); ta.value = l.shape[sh.key] ?? sh.def; ta.addEventListener("input", () => { l.shape[sh.key] = ta.value; save(); }); c1.append(row); return; }
    const mn = sh.min ?? 0, mx = sh.max ?? 1, steps = mn === 0 && mx === 1 ? 0 : mx - mn, v0 = l.shape[sh.key] ?? sh.def ?? .5;
    const fmt = v => { if (sh.cfmt) return sh.cfmt(v); if (!steps) return pct(v); const n = Math.round(lerp(mn, mx, v)); return sh.fmt ? sh.fmt(n) : String(n); };
    c1.append(slider("sh-" + sh.key, sh.label, "", 0, 1, steps ? 1 / steps : .01, v0, fmt, v => { l.shape[sh.key] = v; }));
  });
  box.append(g1);
  if (!FIXED.has(l.form)) { const [g2, c2] = group("Movement"); const row = document.createElement("div"); row.className = "ctl";
    row.innerHTML = `<select class="sel" id="l-char" aria-label="How it moves">${MOVES.map(k => `<option value="${k}"${k === l.char ? " selected" : ""}>${esc(CHAR[k].name)}</option>`).join("")}</select><div class="ctl-hint">${esc(CHAR[l.char].desc)}</div>`;
    row.querySelector("select").addEventListener("change", e => { l.char = e.target.value; save(); renderLayer(); }); c2.append(row); box.append(g2); }
  const [g3, c3] = group("Motion", "", false);
  MOTION.forEach(kn => c3.append(slider("p-" + kn.key, kn.label, kn.hint, 0, 1, .01, l.p[kn.key], pct, v => { l.p[kn.key] = v; })));
  box.append(g3);
  $("#l-hide").addEventListener("click", () => { l.on = !l.on; save(); renderAll(); });
  $("#l-reset").addEventListener("click", () => { Object.assign(l, newLayer(l.form), { id: l.id, on: l.on }); RT.delete(l.id); save(); renderAll(); });
  const del = $("#l-del"); if (del) del.addEventListener("click", () => { RT.delete(l.id); state.layers.splice(sel, 1); sel = Math.max(0, sel - 1); save(); renderAll(); });
}
function renderMoods() {
  const box = $("#moods"), ctl = $("#mood-ctl"); box.innerHTML = ""; ctl.innerHTML = "";
  MOODS.forEach(m => { const s = state.moods[m.key], c = document.createElement("button"); c.className = "chip"; c.textContent = m.name; c.setAttribute("aria-pressed", s.on);
    c.addEventListener("click", () => { s.on = !s.on; save(); renderMoods(); }); box.append(c);
    if (s.on) { ctl.append(slider("mo-" + m.key, m.name, "", 0, 1, .01, s.op, pct, v => { s.op = v; }));
      const sel2 = document.createElement("select"); sel2.className = "sel"; sel2.setAttribute("aria-label", m.name + " blend");
      sel2.innerHTML = BLENDS.map(([k, n]) => `<option value="${k}"${k === s.mode ? " selected" : ""}>${n}</option>`).join(""); sel2.addEventListener("change", e => { s.mode = e.target.value; save(); }); ctl.append(sel2); } });
}
function musicUI(text) {
  $("#now").textContent = text;
  transportUI();
  $("#m-demo").setAttribute("aria-pressed", au.mode === "demo"); $("#m-off").setAttribute("aria-pressed", au.mode === "none"); $("#m-file-l").setAttribute("aria-pressed", au.mode === "file"); $("#m-mic").setAttribute("aria-pressed", au.mode === "mic");
}
function renderAll() { sel = clamp(sel, 0, state.layers.length - 1); renderLayers(); renderLayer(); }
function rebuildMusic() {
  const box = $("#music-ctl"), m = state.music; box.innerHTML = "";
  box.append(slider("reaction", "Reaction", "0% = idle motion only", 0, 1, .01, m.reaction, pct, v => { m.reaction = v; }),
    slider("punch", "Punch", "How hard beats hit", 0, 1, .01, m.punch, pct, v => { m.punch = v; }),
    slider("decay", "Decay", "How long each hit rings", 0, 1, .01, m.decay, pct, v => { m.decay = v; }));
}
rebuildMusic();
$("#m-demo").addEventListener("click", () => au.mode === "demo" ? stopAll() : startDemo());
$("#m-off").addEventListener("click", () => stopAll());
$("#m-mic").addEventListener("click", () => au.mode === "mic" ? stopAll() : startMic());
$("#m-file").addEventListener("change", e => { const f = e.target.files && e.target.files[0]; if (f) startFile(f); e.target.value = ""; });

/* ---------- saved designs: the whole combo, every setting, on this device ---------- */
const DKEY = "glint.designs.v3";
const getDesigns = () => { try { const d = JSON.parse(localStorage.getItem(DKEY) || "[]"); return Array.isArray(d) ? d : []; } catch (_) { return []; } };
const putDesigns = d => { try { localStorage.setItem(DKEY, JSON.stringify(d)); return true; } catch (_) { return false; } };
const snapshot = () => JSON.parse(JSON.stringify({ layers: state.layers, moods: state.moods, music: state.music }, (k, v) => k === "_st" ? undefined : v));
let armed = null, msgT = 0;
function designMsg(t) { $("#design-msg").textContent = t; clearTimeout(msgT); msgT = setTimeout(() => { $("#design-msg").textContent = ""; }, 3000); }
function renderDesigns() {
  const box = $("#design-list"), list = getDesigns(); box.innerHTML = "";
  if (!list.length) { box.innerHTML = '<span class="desc">Nothing saved yet. Name your current combo and tap Save.</span>'; return; }
  list.forEach(d => { const w = document.createElement("span"); w.className = "design";
    w.innerHTML = `<button class="load">${esc(d.name)}</button><button class="x${armed === d.name ? " armed" : ""}" aria-label="Delete ${esc(d.name)}">${armed === d.name ? "Delete?" : "×"}</button>`;
    w.querySelector(".load").addEventListener("click", () => {
      const s = JSON.parse(JSON.stringify(d.design)); s.layers = s.layers.filter(l => VIS[l.form] || l.form === "doodle").map(l => Object.assign(l, { form: l.form === "doodle" ? "doodle2" : l.form, id: "L" + Date.now().toString(36) + (seq++) }));
      if (!s.layers.length) { designMsg("That design's visuals aren't available anymore."); return; }
      MOODS.forEach(m => { s.moods[m.key] ||= { on: false, op: .5, mode: m.mode }; });
      state = s; RT.clear(); sel = 0; $("#design-name").value = d.name; save(); renderAll(); renderMoods(); rebuildMusic(); designMsg(`Loaded "${d.name}".`); });
    w.querySelector(".x").addEventListener("click", () => {
      if (armed !== d.name) { armed = d.name; renderDesigns(); setTimeout(() => { if (armed === d.name) { armed = null; renderDesigns(); } }, 3000); return; }
      armed = null; putDesigns(getDesigns().filter(x => x.name !== d.name)); renderDesigns(); designMsg(`Deleted "${d.name}".`); });
    box.append(w); });
}
$("#save-form").addEventListener("submit", e => { e.preventDefault();
  const name = $("#design-name").value.trim(); if (!name) { designMsg("Give it a name first."); $("#design-name").focus(); return; }
  const list = getDesigns(), i = list.findIndex(d => d.name.toLowerCase() === name.toLowerCase()), entry = { name, savedAt: new Date().toISOString(), design: snapshot() };
  if (i >= 0) list[i] = entry; else list.unshift(entry);
  if (!putDesigns(list)) { designMsg("Couldn't save. This browser's storage may be full or blocked."); return; }
  renderDesigns(); designMsg(i >= 0 ? `Updated "${name}".` : `Saved "${name}".`); });

/* ---------- full-screen play ---------- */
let hintT = 0;
function setPlaying(on) {
  document.body.classList.toggle("playing", on); $("#exit-play").hidden = !on;
  if (on) { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); $("#exit-play").classList.remove("fade"); clearTimeout(hintT); hintT = setTimeout(() => $("#exit-play").classList.add("fade"), 2500); }
  else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  setTimeout(resize, 50);
}
$("#play").addEventListener("click", () => setPlaying(true));
$("#stage-box").addEventListener("click", () => { if (document.body.classList.contains("playing")) setPlaying(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("playing")) setPlaying(false); });
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("playing")) setPlaying(false); });

musicUI("Silence · idle motion only");
renderAll(); renderMoods(); renderDesigns(); resize(); requestAnimationFrame(frame);
