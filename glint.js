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
  ["firework", fromCasting("firework")],
  ["booty", { char: "anchored", hue: 320, hy: .9, p: { roam: .08, energy: .8, tempo: .6 }, shape: {} }],
  ["liner", { char: "anchored", hue: 185, hy: .9, p: { roam: .08, energy: .8, tempo: .6 }, shape: {} }],
  ["jelly", { char: "anchored", hue: 95, hy: .88, p: { roam: .1, energy: .8, tempo: .6 }, shape: {} }],
  ["crew", { char: "anchored", hue: 300, hy: .9, p: { roam: .03, energy: .8, tempo: .6 }, shape: {} }]
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
  return { id: "L" + Date.now().toString(36) + (seq++), form, char: v.char, hue: v.hue, level: 1, on: true, hy: v.hy ?? .52, seed: Math.random(), shape: Object.assign({}, v.shape), links: JSON.parse(JSON.stringify(FORM[form].links || [])), p: Object.assign({}, PDEF, v.p) };
}
function fresh() { return { layers: [newLayer("cheshire")], moods: Object.fromEntries(MOODS.map(m => [m.key, { on: false, op: .5, mode: m.mode }])), music: { reaction: 1, punch: 1, decay: 1 } }; }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && Array.isArray(s.layers)) s.layers.forEach(l => { if (l.form === "doodle") l.form = "doodle2"; }); if (s && Array.isArray(s.layers) && s.layers.length && s.layers.every(l => VIS[l.form])) { MOODS.forEach(m => { s.moods[m.key] ||= { on: false, op: .5, mode: m.mode }; }); return s; } } catch (_) {} return fresh(); }
let saveT = 0; function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state, (k, v) => k === "_st" ? undefined : v)); } catch (_) {} }, 300); }
state = load();

/* ---------- audio ---------- */
const A = { bass: 0, mid: 0, treble: 0, rms: 0, kick: 0, midHit: 0, hat: 0, active: false };
const au = { ctx: null, an: null, input: null, out: null, mode: "none", el: null, elSrc: null, mic: null, micSrc: null, demo: null, freq: null, time: null };
let cal = null; // tap-to-sync session (see below)
const agc = { bass: .2, mid: .2, treble: .2, rms: .1 }, prevB = { bass: 0, mid: 0, treble: 0 }, since = { bass: 1, mid: 1, treble: 1 };
function ensureCtx() {
  if (au.ctx) return au.ctx;
  const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = .5;
  const input = ctx.createGain(), out = ctx.createGain(), delay = ctx.createDelay(1); input.connect(an); an.connect(delay); delay.connect(out); out.connect(ctx.destination);
  Object.assign(au, { ctx, an, input, out, delay, freq: new Uint8Array(an.frequencyBinCount), time: new Uint8Array(an.fftSize) });
  return ctx;
}
function stopAll(msg) {
  if (au.demo) { clearInterval(au.demo.timer); try { au.demo.bus.disconnect(); } catch (_) {} au.demo = null; }
  if (au.el) { au.el.pause(); try { au.elSrc.disconnect(); } catch (_) {} URL.revokeObjectURL(au.el.src); au.el = null; }
  if (au.mic) { au.mic.getTracks().forEach(t => t.stop()); try { au.micSrc.disconnect(); } catch (_) {} au.mic = null; }
  if (au.devTimer) { clearTimeout(au.devTimer); au.devTimer = 0; }
  if (cal) { clearInterval(cal.timer); try { cal.bus.disconnect(); } catch (_) {} cal = null; $("#cal").hidden = true; au.out.gain.setValueAtTime(1, au.ctx.currentTime); }
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
/* ---------- desktop: capture audio that's already playing on this computer ---------- */
const UA = navigator.userAgent, MOBILE = /iPhone|iPad|iPod|Android/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
const CHROMIUM = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some(b => /Chromium|Google Chrome|Microsoft Edge|Opera/.test(b.brand)));
const MAC = /Macintosh|Mac OS X/.test(UA), CAN_SHARE = !MOBILE && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
const NO_AUDIO = MAC
  ? "No sound came through. In the share window, pick a Chrome tab and leave “Also share tab audio” on. For apps like Spotify or Music, pick Entire screen and turn on “Share system audio” (needs Chrome 141+ and macOS 14.2+), or use Audio input with a loopback device."
  : "No sound came through. In the share window, pick a tab with “Also share tab audio” on, or pick Entire screen with “Share system audio” on.";
function captureHelp() {
  if (!CHROMIUM) return "Tab and screen audio work in Chrome or Edge. In this browser, use Audio input with a loopback device (such as BlackHole on a Mac) to capture apps.";
  return MAC ? "Tab or screen audio: pick a tab to hear a web player, or Entire screen to hear apps (macOS 14.2+). Audio input: a microphone, an audio interface, or a loopback device like BlackHole."
    : "Tab or screen audio: pick a tab to hear a web player, or Entire screen with system audio to hear every app. Audio input: a microphone, audio interface, or loopback device.";
}
function liveStream(stream, mode, text) {
  const ctx = ensureCtx(); au.out.gain.value = 0;   // never play captured sound back out (it would echo)
  const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())); src.connect(au.input);
  au.mic = stream; au.micSrc = src; au.mode = mode; musicUI(text);
  stream.getTracks().forEach(t => t.addEventListener("ended", () => { if (au.mic === stream) stopAll(mode === "screen" ? "Sharing stopped." : "The audio input disconnected."); }));
}
async function startScreen() {
  stopAll(); $("#dev-row").hidden = true; const ctx = ensureCtx(); ctx.resume().catch(() => {});
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, suppressLocalAudioPlayback: false }, systemAudio: "include", selfBrowserSurface: "exclude", surfaceSwitching: "include", preferCurrentTab: false });
  } catch (err) { stopAll(err && err.name === "NotAllowedError" ? "Sharing was canceled." : "Sharing couldn't start" + (err && err.name ? " (" + err.name + ")." : ".")); return; }
  if (!stream.getAudioTracks().length) { stream.getTracks().forEach(t => t.stop()); stopAll(NO_AUDIO); return; }
  if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) {} }
  const v = stream.getVideoTracks()[0], surf = v && v.getSettings ? v.getSettings().displaySurface : "";
  liveStream(stream, "screen", surf === "browser" ? "Listening to a tab" : surf === "window" ? "Listening to a window" : "Listening to your computer's sound");
}
const DEVKEY = "glint.input";
async function fillDevices() {
  const sel = $("#dev-sel");
  let list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput");
  if (list.length && !list.some(d => d.label)) {   // names stay hidden until the browser has asked once
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); } catch (_) { return false; }
    list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput");
  }
  let pref = ""; try { pref = localStorage.getItem(DEVKEY) || ""; } catch (_) {}
  sel.innerHTML = `<option value="">Choose an input…</option>` + list.map((d, i) => `<option value="${esc(d.deviceId)}"${d.deviceId === pref ? " selected" : ""}>${esc(d.label || "Input " + (i + 1))}${/blackhole|loopback|soundflower|vb-audio|cable|stereo mix/i.test(d.label) ? " · loopback" : ""}</option>`).join("");
  return list.length > 0;
}
async function startDevice(id) {
  stopAll(); const ctx = ensureCtx(); ctx.resume().catch(() => {});
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } } });
    if (ctx.state !== "running") { try { await ctx.resume(); } catch (_) {} }
    try { localStorage.setItem(DEVKEY, id); } catch (_) {}
    const t = stream.getAudioTracks()[0]; liveStream(stream, "device", "Listening to " + (t && t.label ? t.label : "your audio input"));
    $("#m-dev").setAttribute("aria-pressed", "true");
  } catch (err) { stopAll(err && err.name === "NotAllowedError" ? "Access to audio inputs was blocked. Allow it in the browser's site settings." : "That input couldn't start" + (err && err.name ? " (" + err.name + ")." : ".")); }
}
if (CAN_SHARE) {
  $("#capture").hidden = false; $("#cap-help").textContent = captureHelp();
  $("#m-screen").disabled = !CHROMIUM && !navigator.mediaDevices.getDisplayMedia;
  $("#m-screen").addEventListener("click", () => au.mode === "screen" ? stopAll() : startScreen());
  $("#m-dev").addEventListener("click", async () => {
    if (au.mode === "device") { stopAll(); $("#dev-row").hidden = true; return; }
    const row = $("#dev-row"); if (!row.hidden) { row.hidden = true; return; }
    const ok = await fillDevices(); row.hidden = false;
    if (!ok) { $("#dev-sel").innerHTML = `<option value="">No audio inputs found or access blocked</option>`; return; }
    const v = $("#dev-sel").value; if (v) startDevice(v);
  });
  $("#dev-sel").addEventListener("change", e => { if (e.target.value) startDevice(e.target.value); });
  navigator.mediaDevices.addEventListener && navigator.mediaDevices.addEventListener("devicechange", () => { if (!$("#dev-row").hidden) fillDevices(); });
}
function band(lo, hi, hz) { const f = au.freq; let s = 0, c = 0; for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.ceil(hi / hz) && i < f.length; i++) { s += f[i]; c++; } return c ? s / c / 255 : 0; }
function updateAudio(dt) {
  const hits = { kick: false, mid: false, hat: false }, dec = 2 + (1 - state.music.decay) * 14;
  A.kick *= Math.exp(-dec * dt); A.midHit *= Math.exp(-dec * dt); A.hat *= Math.exp(-dec * 1.6 * dt);
  const playing = au.mode !== "none" && !(au.mode === "file" && au.el && au.el.paused); A.active = playing;
  if (!playing) { A.bass *= .9; A.mid *= .9; A.treble *= .9; A.rms *= .9; A.raw = 0; return hits; }
  au.an.getByteFrequencyData(au.freq); au.an.getByteTimeDomainData(au.time);
  const hz = au.ctx.sampleRate / au.an.fftSize, raw = { bass: band(30, 140, hz), mid: band(250, 2500, hz), treble: band(5000, 12000, hz) };
  let sum = 0; for (let i = 0; i < au.time.length; i++) { const v = (au.time[i] - 128) / 128; sum += v * v; }
  const rms = Math.sqrt(sum / au.time.length), keep = Math.pow(.5, dt / 4);
  A.raw = rms;
  for (const key of ["bass", "mid", "treble"]) {
    agc[key] = Math.max(raw[key], agc[key] * keep, .04);
    const norm = clamp(raw[key] / agc[key], 0, 1), flux = norm - prevB[key]; since[key] += dt;
    if (flux > .11 && norm > .6 && since[key] > .11) { since[key] = 0; if (key === "bass") { A.kick = 1; hits.kick = true; } else if (key === "mid") { A.midHit = 1; hits.mid = true; } else { A.hat = 1; hits.hat = true; } }
    prevB[key] = norm; A[key] = lerp(A[key], Math.pow(norm, 1.4), .5);
  }
  agc.rms = Math.max(rms, agc.rms * keep, .02); A.rms = lerp(A.rms, clamp(rms / agc.rms, 0, 1), .4);
  return hits;
}

/* ---------- sync offset: line the visuals up with what you hear ----------
   Later (+): Glint holds its reading of the music back before the visuals use it. Works for every source.
   Earlier (-): Glint delays the sound it plays, so the visuals land first. Only possible for sound Glint
   plays itself (loaded songs, the demo beat); live sound can't be shown before it's heard. */
const OKEY = "glint.offset"; let offsetMs = 0; try { offsetMs = clamp(+localStorage.getItem(OKEY) || 0, -500, 500); } catch (_) {}
const V = Object.assign({}, A), offQ = [];
const ownsSound = () => au.mode === "file" || au.mode === "demo";
function applyOffset() { if (au.delay && au.ctx) au.delay.delayTime.setTargetAtTime(ownsSound() ? Math.max(0, -offsetMs) / 1000 : 0, au.ctx.currentTime, .03); offsetHint(); }
function offsetFeed(hits) {
  const later = Math.max(0, offsetMs), now = performance.now();
  if (!later) { offQ.length = 0; Object.assign(V, A); return hits; }
  offQ.push({ t: now, a: Object.assign({}, A), h: hits });
  const out = { kick: false, mid: false, hat: false }; let pick = null;
  while (offQ.length && offQ[0].t <= now - later) { const e = offQ.shift(); pick = e; if (e.h.kick) out.kick = true; if (e.h.mid) out.mid = true; if (e.h.hat) out.hat = true; }
  if (pick) Object.assign(V, pick.a);
  return out;
}
function offsetHint() {
  const el = document.getElementById("offset-note"); if (!el) return;
  el.textContent = offsetMs < 0 && !ownsSound() && au.mode !== "none"
    ? "Live sound can't be shown before Glint hears it, so Earlier only works for loaded songs and the demo beat."
    : "Visuals lagging behind the music? Drag left. Running ahead (common with Bluetooth headphones)? Drag right.";
}

/* ---------- tap to sync: measure the offset instead of guessing ----------
   Step 1: tap to thumps you can hear (screen dark) → when the sound reaches you.
   Step 2: sound off, tap to flashes → when a beat Glint detects reaches your eyes. The flash is driven by the same beat
   detector as the visuals, so its delay matches theirs. Offset = step 1 − step 2; your own tapping habit cancels out. */
const CAL_N = 12, CAL_SKIP = 2, CAL_P = .6;
function calStart() {
  stopAll(); if (document.activeElement) document.activeElement.blur(); const ctx = ensureCtx(); ctx.resume();
  const bus = ctx.createGain(); bus.gain.value = .7; bus.connect(au.input);
  cal = { step: 1, taps: [], res: [], bus, t0: ctx.currentTime + .4, n: 0, timer: 0, flashT: 0 };
  const thump = t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + .1); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(.0008, t + .3); o.connect(g).connect(bus); o.start(t); o.stop(t + .32); };
  cal.timer = setInterval(() => { while (cal && cal.t0 + cal.n * CAL_P < ctx.currentTime + .15) { thump(cal.t0 + cal.n * CAL_P); cal.n++; } }, 25);
  au.mode = "cal"; musicUI("Tap to sync"); applyOffset();
  $("#cal").hidden = false; calStep();
}
function calStep() {
  const one = cal.step === 1; cal.taps = [];
  au.out.gain.setValueAtTime(one ? 1 : 0, au.ctx.currentTime);
  $("#cal-step").textContent = cal.step === 3 ? "Done" : `Step ${cal.step} of 2`;
  $("#cal-say").textContent = one ? "Tap anywhere here on each thump you hear. Closing your eyes helps." : "Now the sound is off. Tap on each flash.";
  $("#cal-btns").hidden = true; $("#cal-dot").hidden = false; calPips();
}
function calPips() { const need = CAL_N - CAL_SKIP, have = Math.max(0, cal.taps.length - CAL_SKIP); $("#cal-pips").innerHTML = Array.from({ length: need }, (_, i) => `<i class="${i < have ? "on" : ""}"></i>`).join(""); }
function calTap(e) {
  if (!cal || cal.step > 2 || e.target.closest("button")) return; e.preventDefault();
  const ctx = au.ctx, t = ctx.currentTime - Math.max(0, performance.now() - e.timeStamp) / 1000 - cal.t0;
  if (t < 0) return;
  const d = $("#cal-dot"); d.classList.add("tap"); setTimeout(() => d.classList.remove("tap"), 120);
  cal.taps.push((t / CAL_P - Math.round(t / CAL_P)) * CAL_P); calPips();
  if (cal.taps.length < CAL_N) return;
  const xs = cal.taps.slice(CAL_SKIP).sort((a, b) => a - b), med = xs[xs.length >> 1], spread = xs.map(x => Math.abs(x - med)).sort((a, b) => a - b)[xs.length >> 1];
  if (spread > .07) { $("#cal-say").textContent = "Those taps were a bit uneven. Let's go again: " + (cal.step === 1 ? "tap on each thump." : "tap on each flash."); cal.taps = []; calPips(); return; }
  cal.res[cal.step - 1] = med;
  if (cal.step === 1) { cal.step = 2; calStep(); return; }
  cal.step = 3; au.out.gain.setValueAtTime(0, ctx.currentTime);
  cal.ms = clamp(Math.round((cal.res[0] - cal.res[1]) * 100) * 10, -500, 500);
  $("#cal-step").textContent = "Done"; $("#cal-dot").hidden = true; $("#cal-pips").innerHTML = "";
  $("#cal-say").textContent = cal.ms === 0 ? "You're in sync: 0 ms." : `Your sync offset: ${cal.ms > 0 ? "+" + cal.ms + " ms (visuals later)" : "−" + Math.abs(cal.ms) + " ms (visuals earlier)"}.`;
  $("#cal-btns").hidden = false;
}
function calFrame(raw) { if (!cal || cal.step !== 2) return; const d = $("#cal-dot");
  if (raw.kick) { d.classList.remove("fade"); d.classList.add("flash"); cal.flashT = performance.now(); }
  else if (cal.flashT && performance.now() - cal.flashT > 90) { d.classList.add("fade"); d.classList.remove("flash"); cal.flashT = 0; } }
function calEnd(keep) {
  if (!cal) return; if (keep && cal.ms != null) { offsetMs = cal.ms; try { localStorage.setItem(OKEY, String(offsetMs)); } catch (_) {} }
  $("#cal-dot").classList.remove("flash", "fade"); stopAll(); rebuildMusic(); applyOffset();
}
$("#cal").addEventListener("pointerdown", calTap);
document.addEventListener("keydown", e => { if (cal && cal.step <= 2 && (e.code === "Space" || e.code === "Enter") && !e.repeat) calTap(e); if (cal && e.key === "Escape") calEnd(false); });
$("#cal-x").addEventListener("click", () => calEnd(false));
$("#cal-keep").addEventListener("click", () => calEnd(true));
$("#cal-again").addEventListener("click", () => { cal.step = 1; cal.res = []; cal.ms = null; calStep(); });


/* ---------- color: one color, a rainbow cycle, or a palette that cycles (Oct 18, 2026) ---------- */
// palettes are lists of hues: every visual tints its own glow from one hue, so a palette steps or glides through hues
const PRESET_PALS = [
  { id: "loop", name: "In the Loop", stops: [330, 15, 55, 130, 185, 220, 270] }, { id: "sunset", name: "Sunset", stops: [330, 350, 15, 35, 50] },
  { id: "ocean", name: "Ocean", stops: [165, 185, 205, 230] }, { id: "vapor", name: "Vaporwave", stops: [300, 275, 195, 175] },
  { id: "fire", name: "Fire", stops: [355, 15, 35, 52] }, { id: "ice", name: "Ice", stops: [180, 200, 225, 255] },
  { id: "candy", name: "Pink and gold", stops: [320, 340, 45] }, { id: "acid", name: "Acid", stops: [75, 100, 290, 310] }];
const PKEY = "glint.palettes"; let myPals = []; try { myPals = JSON.parse(localStorage.getItem(PKEY) || "[]").filter(x => x && Array.isArray(x.stops)); } catch (_) {}
function savePals() { try { localStorage.setItem(PKEY, JSON.stringify(myPals)); } catch (_) {} }
const allPals = () => PRESET_PALS.concat(myPals);
const colorOf = l => l.color || (l.color = { mode: "one", speed: .35, by: "time", pal: "loop", stops: PRESET_PALS[0].stops.slice(), flow: "glide" });
const CST = new Map();
const hueLerp = (a, b, u) => a + ((((b - a) % 360) + 540) % 360 - 180) * u;
function updateColors(dt, hits) {
  state.layers.forEach(l => { const c = l.color; if (!c || c.mode === "one") return;
    let s = CST.get(l.id); if (!s) { s = { ph: 0, tgt: 0 }; CST.set(l.id, s); }
    const sp = lerp(.04, 3, c.speed * c.speed);
    if (c.by === "beat") { if (hits.kick) s.tgt += 1; s.ph += (s.tgt - s.ph) * (1 - Math.exp(-dt * (c.flow === "jump" ? 30 : 9))); }
    else { s.ph += dt * sp * (c.by === "loud" ? .1 + 2.6 * V.rms : 1); s.tgt = s.ph; }
    if (s.ph > 2520) { s.ph -= 2520; s.tgt -= 2520; } }); // 2520 divides evenly by every palette length up to 10, and 12
}
function hueNow(l) { const c = l.color; if (!c || c.mode === "one") return l.hue; const s = CST.get(l.id), ph = s ? s.ph : 0;
  if (c.mode === "rainbow") return l.hue + ph * 30;
  const st = c.stops && c.stops.length ? c.stops : [l.hue], n = st.length, i = Math.floor(ph), u = ph - i, a = st[((i % n) + n) % n], b = st[(((i + 1) % n) + n) % n];
  return hueLerp(a, b, c.flow === "jump" && c.by !== "beat" ? (u < .9 ? 0 : (u - .9) / .1) : u); }
const swatchCSS = stops => stops.length > 1 ? `linear-gradient(90deg, ${stops.map(h => `hsl(${Math.round(h)} 95% 58%)`).join(", ")})` : `hsl(${stops[0]} 95% 58%)`;
function layerDot(l) { const c = l.color; if (!c || c.mode === "one") return `hsl(${l.hue} 95% 60%)`; if (c.mode === "rainbow") return "conic-gradient(hsl(0 95% 60%), hsl(60 95% 60%), hsl(120 95% 60%), hsl(180 95% 60%), hsl(240 95% 60%), hsl(300 95% 60%), hsl(360 95% 60%))"; return swatchCSS(c.stops); }
/* ---------- engine ---------- */
const RT = new Map();
function nodeOf(l) { return { id: l.id, form: l.form, char: l.char, hx: .5, hy: l.hy ?? .52, dir: -Math.PI / 2, hue: hueNow(l), level: l.level, listen: "mix", seed: l.seed, shape: l.shape, links: l.links || FORM[l.form].links || [], p: l.p, auto: l.auto, o1: { wave: "sine", rate: .6, depth: .16 }, o2: { on: true, wave: "sine", rate: .9, depth: .14, phase: .25 } }; }
/* ---------- automation: a slider that moves itself over time ----------
   l.auto[key] = { pat, sync, beats, secs, lo, hi } where key is "sh.<shape key>", "p.<motion key>" or "level".
   pat: sine (smooth back and forth) · tri (straight back and forth) · square (snap between the two) · sawup (rise, jump back) ·
        sawdown (fall, jump back) · drift (wandering) · ramp (rise from Low to High once, then hold).
   sync: true = the period is AUTO_BEATS[beats] beats of the song (TEMPO learns the beat gap from kicks); false = secs seconds. */
const AUTO_PAT = [["sine", "Smooth"], ["tri", "Bounce"], ["square", "Snap"], ["sawup", "Rise"], ["sawdown", "Fall"], ["drift", "Drift"], ["ramp", "Ramp once"]];
const AUTO_BEATS = [1, 2, 4, 8, 16, 32, 64];
const TEMPO = { gap: .5, since: 9 };
function tempoLearn(dt, hits) {
  TEMPO.since += dt;
  if (au.mode === "demo") { TEMPO.gap = 60 / 122; return; }
  if (!V.active) { TEMPO.gap = .5; return; }
  if (hits.kick) { if (TEMPO.since > .22 && TEMPO.since < 2.2) TEMPO.gap = lerp(TEMPO.gap, TEMPO.since, .4); TEMPO.since = 0; }
}
const autoPeriod = a => Math.max(.05, a.sync ? AUTO_BEATS[clamp(a.beats | 0, 0, AUTO_BEATS.length - 1)] * TEMPO.gap : (a.secs || 6));
function autoStep(rt, key, a, dt, seed) {
  const st = rt.auto || (rt.auto = {}); let s = st[key]; if (!s || s.pat !== a.pat) s = st[key] = { pat: a.pat, ph: 0 };
  s.ph += dt / autoPeriod(a);
  const ph = s.ph, c = ph - Math.floor(ph); let u;
  switch (a.pat) {
    case "tri": u = c < .5 ? c * 2 : 2 - c * 2; break;
    case "square": u = c < .5 ? 0 : 1; break;
    case "sawup": u = c; break;
    case "sawdown": u = 1 - c; break;
    case "drift": u = clamp(.5 + .32 * Math.sin(ph * 6.2832) + .2 * Math.sin(ph * 10.166 + seed * 7) + .12 * Math.sin(ph * 16.45 + seed * 3), 0, 1); break;
    case "ramp": u = Math.min(1, ph); break;
    default: u = .5 - .5 * Math.cos(c * 6.2832);
  }
  return s.v = lerp(a.lo, a.hi, u);
}
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
  const rawHits = updateAudio(dt); calFrame(rawHits); const hits = offsetFeed(rawHits); tempoLearn(dt, hits); updateColors(dt, hits); const m = state.music, r = m.reaction, breath = .5 + .5 * Math.sin(gtime * .9), idle = 1 - r * .7, S0 = Math.min(W, H), bias = moodBias();
  gclock += dt * (.3 + idle * .25 * breath + V.rms * r * 1.2);
  const all = state.layers.filter(l => l.on).map(l => { const node = nodeOf(l); return { node, rt: runtime(node) }; });
  all.forEach(({ node, rt }) => {
    // automation: every automated slider gets this frame's value once, before anything reads it
    const au2 = node.auto || {}, av = rt.av = {}; for (const key in au2) av[key] = autoStep(rt, key, au2[key], dt, node.seed);
    const p = {}; for (const k in node.p) { const base = av["p." + k] ?? node.p[k]; p[k] = k === "magnetism" ? clamp(base + (bias[k] || 0), -1, 1) : clamp(base + (bias[k] || 0), 0, 1); }
    rt.lv = av.level ?? node.level;
    const kb = FORM[node.form].kickBoost; if (kb) { const kk = clamp(V.kick * r * m.punch, 0, 1); kb.forEach(key => { p[key] += (1 - p[key]) * kk; }); }
    rt.p = p;
    const R = { kick: V.kick * r * m.punch * 1.4 * (.5 + p.energy), bass: V.bass * r, mid: V.mid * r, treble: V.treble * r, rms: V.rms * r, hat: V.hat * r, raw: V.active ? V.raw || 0 : null, idle, breath };
    R.energy = (idle * (.3 + .25 * breath) + R.rms * 1.1 + R.kick * .45) * (.35 + 1.3 * p.energy);
    rt.R = R; rt.hue = node.hue;
    rt.clock += dt * (.3 + idle * .25 * breath + R.rms * 1.2 + R.kick * .5) * (.35 + 1.4 * p.tempo);
    rt.tUse = lerp(rt.clock + node.seed * 13, gclock, p.social);
    let beat = V.active ? (hits.kick && r > .05) : false;
    if (!V.active) { rt.idleGap -= dt * (.6 + .8 * p.tempo); if (rt.idleGap <= 0) { beat = true; rt.idleGap = 1.2 + Math.random() * 1.2; } }
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
    // music links: each frequency band pushes the slider it's linked to toward its maximum
    const mod = {}; (node.links || []).forEach(ln => { if (!ln.dst || !ln.amt) return; const v = { kick: V.kick, bass: V.bass, mid: V.mid, high: Math.max(V.treble, V.hat), loud: V.rms }[ln.src] || 0; mod[ln.dst] = (mod[ln.dst] || 0) + v * ln.amt * r; });
    const av = rt.av || {};
    const k = key => { const it = items.find(x => x.key === key), b = av["sh." + key] ?? (shp[key] != null ? shp[key] : (it && it.def != null ? it.def : .5)), md = mod[key]; return md ? b + (1 - b) * Math.min(1, md) : b; };
    const L = (key, lo, hi) => lerp(lo, hi, k(key));
    const I = key => { const it = items.find(x => x.key === key) || {}; return Math.round(lerp(it.min ?? 0, it.max ?? 1, k(key))); };
    try { f.draw({ g: lx, n: rt, node, p: rt.p, st: rt.st, R: rt.R, S: S0 * (.5 + rt.p.size), W, H, dt, t: rt.tUse, beat: rt.beat, all, frame: shared, level: node.level, k, L, I }); } catch (err) { console.error(err); }
    lx.globalAlpha = 1; lx.setLineDash([]);
  });
  Bx.setTransform(1, 0, 0, 1, 0, 0); Bx.globalAlpha = 1; Bx.globalCompositeOperation = "source-over"; Bx.clearRect(0, 0, Bc.width, Bc.height);
  Bx.globalCompositeOperation = "lighter";
  all.forEach(({ node, rt }) => { Bx.globalAlpha = rt.lv ?? node.level; Bx.drawImage(rt.layer, 0, 0); });
  if (shared.lava.length) drawLava(shared.lava);
  Bx.globalAlpha = 1;
  F.setTransform(1, 0, 0, 1, 0, 0); F.globalCompositeOperation = "source-over"; F.globalAlpha = 1; F.clearRect(0, 0, cv.width, cv.height); F.drawImage(Bc, 0, 0);
  const M = { t: gtime, dt, energy: idle * (.3 + .25 * breath) + V.rms * r * 1.1, kick: V.kick * r * m.punch, bass: V.bass * r, hit: hits.kick && r > .05, hat: hits.hat && r > .05, chaos: clamp(.15 + (bias.chaos || 0), 0, 1) };
  if (!V.active && Math.random() < dt * .8) M.hit = true;
  MOODS.forEach(md => { const s = state.moods[md.key]; if (!s.on || s.op <= 0) return; s._st ||= {};
    F.save(); F.globalCompositeOperation = s.mode; F.globalAlpha = s.op; try { md.draw(F, Bc, s._st, M); } catch (err) { console.error(err); } F.restore(); });
  if (fadeA > 0) { F.save(); F.globalCompositeOperation = "source-over"; F.globalAlpha = fadeA; F.drawImage(fadeC, 0, 0, cv.width, cv.height); F.restore(); fadeA = Math.max(0, fadeA - dt / 1.6); }
  // automated sliders on the selected visual's card glide along with their values
  if (LIVE.size) { const l = state.layers[sel], rt = l && RT.get(l.id); if (rt && rt.av) LIVE.forEach((fn, key) => { if (rt.av[key] != null) fn(rt.av[key]); }); }
  $("#beat").style.opacity = .18 + V.kick * .82;
  const live = au.mode === "mic" || au.mode === "screen" || au.mode === "device"; $("#meter").hidden = !live; if (live) $("#lvl").style.width = Math.min(100, (V.raw || 0) * 400) + "%";
}

/* ---------- UI ---------- */
const pct = v => Math.round(v * 100) + "%";
const LIVE = new Map(), openAuto = new Set();
/* auto = { l, key }: this slider can be automated (see autoStep). The wave button opens a panel under the slider;
   while automation is on, the handle glides on its own between Low and High and the track shows that band. */
function slider(id, label, hint, min, max, step, val, fmt, onInput, auto) {
  const row = document.createElement("div"); row.className = "ctl";
  row.innerHTML = `<div class="ctl-top"><label for="${id}">${esc(label)}</label><div class="ctl-r"><output>${fmt(val)}</output>${auto ? `<button type="button" class="auto-btn" title="Move this slider automatically" aria-label="Automate ${esc(label)}">∿</button>` : ""}</div></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}">${hint ? `<div class="ctl-hint">${esc(hint)}</div>` : ""}`;
  const inp = row.querySelector("input"), out = row.querySelector("output"), pc = v => ((v - min) / (max - min) * 100) + "%", paint = () => inp.style.setProperty("--p", pc(inp.value)); paint();
  inp.addEventListener("input", () => { const v = parseFloat(inp.value); out.textContent = fmt(v); paint(); onInput(v); save(); });
  if (!auto) return row;
  const btn = row.querySelector(".auto-btn"), get = () => auto.l.auto && auto.l.auto[auto.key];
  const paintAuto = () => { const a = get(); row.classList.toggle("auto", !!a); btn.setAttribute("aria-pressed", !!a);
    if (a) { inp.style.setProperty("--lo", pc(Math.min(a.lo, a.hi))); inp.style.setProperty("--hi", pc(Math.max(a.lo, a.hi))); } };
  const panel = () => { const old = row.querySelector(".auto-panel"); if (old) old.remove(); const a = get(); if (!a || !openAuto.has(auto.key)) return; row.append(autoPanel(a, auto, fmt, paintAuto, () => panel())); };
  btn.addEventListener("click", () => { if (!get()) { const v = parseFloat(inp.value); (auto.l.auto ||= {})[auto.key] = { pat: "sine", sync: true, beats: 3, secs: 6, lo: clamp(v - .3, min, max), hi: clamp(v + .3, min, max) }; openAuto.add(auto.key); save(); }
    else openAuto.has(auto.key) ? openAuto.delete(auto.key) : openAuto.add(auto.key); paintAuto(); panel(); });
  LIVE.set(auto.key, v => { if (!get()) return; inp.value = v; out.textContent = fmt(v); paint(); });
  paintAuto(); panel();
  return row;
}
function autoPanel(a, auto, fmt, paintAuto, rerender) {
  const p = document.createElement("div"); p.className = "auto-panel";
  const chips = (list, cur, on) => { const d = document.createElement("div"); d.className = "chips seg"; list.forEach(([v, n]) => { const c = document.createElement("button"); c.type = "button"; c.className = "chip"; c.textContent = n; c.setAttribute("aria-pressed", v === cur); c.addEventListener("click", () => { on(v); save(); rerender(); }); d.append(c); }); return d; };
  const line = (label, el) => { const d = document.createElement("div"); d.className = "auto-line"; d.innerHTML = `<span>${esc(label)}</span>`; d.append(el); return d; };
  p.append(line("Pattern", chips(AUTO_PAT, a.pat, v => { a.pat = v; })));
  p.append(line("Timing", chips([[true, "To the beat"], [false, "Seconds"]], a.sync, v => { a.sync = v; })));
  if (a.sync) p.append(line("Every", chips(AUTO_BEATS.map((b, i) => [i, b === 1 ? "1 beat" : b + " beats"]), a.beats, v => { a.beats = v; })));
  else p.append(slider("au-s-" + auto.key, "Every", "", .5, 60, .5, a.secs, v => v + " s", v => { a.secs = v; }));
  p.append(slider("au-lo-" + auto.key, "Low", "", 0, 1, .01, a.lo, fmt, v => { a.lo = v; paintAuto(); }));
  p.append(slider("au-hi-" + auto.key, "High", "", 0, 1, .01, a.hi, fmt, v => { a.hi = v; paintAuto(); }));
  const off = document.createElement("button"); off.type = "button"; off.className = "btn"; off.textContent = "Turn off"; off.style.justifySelf = "start";
  off.addEventListener("click", () => { delete auto.l.auto[auto.key]; openAuto.delete(auto.key); const rt = RT.get(auto.l.id); if (rt && rt.auto) delete rt.auto[auto.key]; save(); renderLayer(); });
  p.append(off);
  return p;
}
function group(title, sub, open = true) { const d = document.createElement("details"); d.className = "grp"; d.open = open; d.innerHTML = `<summary><h3>${esc(title)}${sub ? `<span>${esc(sub)}</span>` : ""}</h3></summary><div class="ctls"></div>`; return [d, d.querySelector(".ctls")]; }
function renderLayers() {
  const nav = $("#layers"); nav.innerHTML = "";
  state.layers.forEach((l, i) => { const b = document.createElement("button"); b.className = "layer-tab" + (l.on ? "" : " off"); b.setAttribute("aria-pressed", i === sel);
    b.style.setProperty("--c", layerDot(l)); b.innerHTML = `<i></i>${esc(FORM[l.form].name)}`; b.addEventListener("click", () => { sel = i; renderAll(); }); nav.append(b); });
  if (state.layers.length < 3) { const add = document.createElement("button"); add.className = "layer-tab add-tab"; add.textContent = "+ Add a trait";
    add.addEventListener("click", () => { const used = state.layers.map(l => l.form), next = VISUALS.map(v => v[0]).find(k => !used.includes(k)) || "graffiti"; state.layers.push(newLayer(next)); sel = state.layers.length - 1; save(); renderAll(); }); nav.append(add); }
}
const openGrp = {}, LINK_SRC = [["kick", "Kick drum"], ["bass", "Bass"], ["mid", "Mids and vocals"], ["high", "Highs and hi-hats"], ["loud", "Overall loudness"]];
function renderLayer() {
  const box = $("#layer-card"), l = state.layers[sel]; box.innerHTML = ""; LIVE.clear();
  if (!l) return;
  const head = document.createElement("div"); head.className = "row spread";
  head.innerHTML = `<h3 style="margin:0">Trait ${sel + 1} of ${state.layers.length}</h3><div class="row"><button class="btn" id="l-hide">${l.on ? "Hide" : "Show"}</button><button class="btn" id="l-reset">Reset</button>${state.layers.length > 1 ? '<button class="btn danger" id="l-del">Remove</button>' : ""}</div>`;
  box.append(head);
  const chips = document.createElement("div"); chips.className = "chips";
  VISUALS.forEach(([key]) => { const c = document.createElement("button"); c.className = "chip"; c.textContent = FORM[key].name; c.setAttribute("aria-pressed", key === l.form);
    c.addEventListener("click", () => { if (key === l.form) return; Object.assign(l, newLayer(key), { id: l.id, on: l.on }); save(); renderAll(); }); chips.append(c); });
  box.append(chips);
  renderColor(box, l);
  box.append(slider("l-level", "Opacity", "", 0, 1, .01, l.level, pct, v => { l.level = v; }, { l, key: "level" }));
  // the visual's own controls
  // a visual can split its controls into named groups (sh.grp); open/closed state survives re-renders
  const f = FORM[l.form], groups = new Map(), items = f.shape || [];
  const groupFor = name => { if (!groups.has(name)) { const gr = group(name, groups.size ? "" : f.name, openGrp[l.form + name] ?? groups.size === 0); gr[0].addEventListener("toggle", () => { openGrp[l.form + name] = gr[0].open; }); groups.set(name, gr); box.append(gr[0]); } return groups.get(name)[1]; };
  const isChoice = sh => !!(sh.fmt && !sh.slide);
  const pick = key => { const it = items.find(x => x.key === key) || {}; return Math.round(lerp(it.min ?? 0, it.max ?? 1, l.shape[key] ?? it.def ?? .5)); };
  items.forEach(sh => {
    if (sh.when && !sh.when(pick)) return;
    const c1 = groupFor(sh.grp || "Shape");
    if (sh.text) { const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label for="sh-${sh.key}">${esc(sh.label)}</label></div><textarea id="sh-${sh.key}" rows="3"></textarea>`;
      const ta = row.querySelector("textarea"); ta.value = l.shape[sh.key] ?? sh.def; ta.addEventListener("input", () => { l.shape[sh.key] = ta.value; save(); }); c1.append(row); return; }
    if (sh.button) { const bt = document.createElement("button"); bt.className = "btn"; bt.type = "button"; bt.textContent = sh.label; bt.style.justifySelf = "start";
      bt.addEventListener("click", () => { l.shape[sh.key] = Date.now(); }); c1.append(bt); return; }
    const mn = sh.min ?? 0, mx = sh.max ?? 1, steps = mn === 0 && mx === 1 && !sh.fmt ? 0 : mx - mn, v0 = l.shape[sh.key] ?? sh.def ?? .5;
    if (isChoice(sh)) { // a handful of named options: buttons, not a slider
      const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label>${esc(sh.label)}</label></div><div class="chips seg"></div>`;
      const cur = Math.round(lerp(mn, mx, v0)), box2 = row.querySelector(".chips");
      for (let i = mn; i <= mx; i++) { const c = document.createElement("button"); c.className = "chip"; c.type = "button"; c.textContent = sh.fmt(i); c.setAttribute("aria-pressed", i === cur);
        c.addEventListener("click", () => { l.shape[sh.key] = steps ? (i - mn) / steps : 0; save(); renderLayer(); }); box2.append(c); }
      c1.append(row); return; }
    const fmt = v => { if (sh.cfmt) return sh.cfmt(v); if (!steps) return pct(v); const n = Math.round(lerp(mn, mx, v)); return sh.fmt ? sh.fmt(n) : String(n); };
    c1.append(slider("sh-" + sh.key, sh.label, "", 0, 1, steps ? 1 / steps : .01, v0, fmt, v => { l.shape[sh.key] = v; }, { l, key: "sh." + sh.key }));
  });
  // music links: pick what each part of the sound pushes
  const targets = items.filter(sh => !sh.text && !sh.button && !isChoice(sh) && !(sh.min != null && sh.max != null && !(sh.min === 0 && sh.max === 1)));
  if (targets.length) { if (!l.links) l.links = JSON.parse(JSON.stringify(f.links || []));
    const [gm, cm] = group("Music links", "what each sound pushes", openGrp[l.form + "Music links"] ?? false); gm.addEventListener("toggle", () => { openGrp[l.form + "Music links"] = gm.open; });
    LINK_SRC.forEach(([src, name]) => { let ln = l.links.find(x => x.src === src); const row = document.createElement("div"); row.className = "ctl";
      row.innerHTML = `<div class="ctl-top"><label for="ln-${src}">${esc(name)}</label></div><select class="sel" id="ln-${src}">${['<option value="">Nothing</option>'].concat(targets.map(t2 => `<option value="${t2.key}"${ln && ln.dst === t2.key ? " selected" : ""}>${esc(t2.label)}</option>`)).join("")}</select>`;
      row.querySelector("select").addEventListener("change", e => { if (!ln) { ln = { src, dst: "", amt: .5 }; l.links.push(ln); } ln.dst = e.target.value; save(); renderLayer(); });
      cm.append(row); if (ln && ln.dst) cm.append(slider("lna-" + src, "Amount", "", 0, 1, .01, ln.amt, pct, v => { ln.amt = v; })); });
    box.append(gm); }
  if (!FIXED.has(l.form)) { const [g2, c2] = group("Movement"); const row = document.createElement("div"); row.className = "ctl";
    row.innerHTML = `<select class="sel" id="l-char" aria-label="How it moves">${MOVES.map(k => `<option value="${k}"${k === l.char ? " selected" : ""}>${esc(CHAR[k].name)}</option>`).join("")}</select><div class="ctl-hint">${esc(CHAR[l.char].desc)}</div>`;
    row.querySelector("select").addEventListener("change", e => { l.char = e.target.value; save(); renderLayer(); }); c2.append(row); box.append(g2); }
  const [g3, c3] = group("Motion", "", false);
  MOTION.forEach(kn => c3.append(slider("p-" + kn.key, kn.label, kn.hint, 0, 1, .01, l.p[kn.key], pct, v => { l.p[kn.key] = v; }, { l, key: "p." + kn.key })));
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
  $("#now").textContent = text; if (typeof applyOffset === "function") applyOffset();
  transportUI();
  $("#m-demo").setAttribute("aria-pressed", au.mode === "demo"); $("#m-off").setAttribute("aria-pressed", au.mode === "none"); $("#m-file-l").setAttribute("aria-pressed", au.mode === "file"); $("#m-mic").setAttribute("aria-pressed", au.mode === "mic"); if (CAN_SHARE) { $("#m-screen").setAttribute("aria-pressed", au.mode === "screen"); $("#m-dev").setAttribute("aria-pressed", au.mode === "device"); }
}
/* ---------- the Color fold: one color, rainbow, or palette, plus a palette maker ---------- */
function seg(label, opts, cur, onPick) { const row = document.createElement("div"); row.className = "ctl"; row.innerHTML = `<div class="ctl-top"><label>${esc(label)}</label></div><div class="chips seg"></div>`;
  opts.forEach(([v, name]) => { const c = document.createElement("button"); c.type = "button"; c.className = "chip"; c.textContent = name; c.setAttribute("aria-pressed", v === cur); c.addEventListener("click", () => onPick(v)); row.lastChild.append(c); }); return row; }
function hueSlider(id, label, val, onInput) { const r = slider(id, label, "", 0, 359, 1, Math.round(val), v => Math.round(v) + "°", onInput); r.querySelector("input").classList.add("hue"); return r; }
function renderColor(box, l) {
  const c = colorOf(l), MODES = [["one", "One color"], ["rainbow", "Rainbow"], ["palette", "Palette"]], again = () => { save(); renderLayers(); renderLayer(); };
  const [gc, cc] = group("Color", MODES.find(m => m[0] === c.mode)[1], openGrp.color ?? true); gc.addEventListener("toggle", () => { openGrp.color = gc.open; });
  cc.append(seg("Color", MODES, c.mode, v => { c.mode = v; again(); }));
  if (c.mode === "one" || c.mode === "rainbow") cc.append(hueSlider("l-hue", c.mode === "one" ? "Hue" : "Starting hue", l.hue, v => { l.hue = v; renderLayers(); }));
  if (c.mode === "palette") {
    const list = document.createElement("div"); list.className = "chips pals";
    allPals().forEach(p => { const b = document.createElement("button"); b.type = "button"; b.className = "chip pal-chip"; b.setAttribute("aria-pressed", c.pal === p.id);
      b.innerHTML = `<span class="sw" style="background:${swatchCSS(p.stops)}"></span>${esc(p.name)}`; b.addEventListener("click", () => { c.pal = p.id; c.stops = p.stops.slice(); again(); }); list.append(b); });
    const nb = document.createElement("button"); nb.type = "button"; nb.className = "chip"; nb.textContent = "+ New palette";
    nb.addEventListener("click", () => { const base = allPals().find(p => p.id === c.pal) || PRESET_PALS[0], p = { id: "my" + Date.now().toString(36), name: "My palette " + (myPals.length + 1), stops: base.stops.slice(0, 4) }; myPals.push(p); savePals(); c.pal = p.id; c.stops = p.stops.slice(); again(); });
    list.append(nb); const lr = document.createElement("div"); lr.className = "ctl"; lr.innerHTML = `<div class="ctl-top"><label>Palette</label></div>`; lr.append(list); cc.append(lr);
    const mine = myPals.find(p => p.id === c.pal);
    if (mine) { // the palette maker: name it, set each color, add or remove colors
      const ed = document.createElement("div"); ed.className = "pal-edit";
      const nm = document.createElement("input"); nm.className = "name-in"; nm.value = mine.name; nm.maxLength = 30; nm.setAttribute("aria-label", "Palette name");
      nm.addEventListener("change", () => { mine.name = nm.value.trim() || mine.name; savePals(); renderLayer(); }); ed.append(nm);
      const sync = () => { savePals(); state.layers.forEach(x => { if (x.color && x.color.pal === mine.id) x.color.stops = mine.stops.slice(); }); save(); renderLayers(); ed.querySelectorAll(".sw-live").forEach(el => { el.style.background = swatchCSS(mine.stops); }); };
      const bar = document.createElement("div"); bar.className = "sw-live"; bar.style.background = swatchCSS(mine.stops); ed.append(bar);
      mine.stops.forEach((h, i) => { const r = hueSlider("st-" + i, "Color " + (i + 1), h, v => { mine.stops[i] = v; sync(); });
        if (mine.stops.length > 2) { const x = document.createElement("button"); x.type = "button"; x.className = "x-btn"; x.textContent = "×"; x.setAttribute("aria-label", "Remove color " + (i + 1)); x.addEventListener("click", () => { mine.stops.splice(i, 1); sync(); renderLayer(); }); r.querySelector(".ctl-top").append(x); }
        ed.append(r); });
      const row = document.createElement("div"); row.className = "row";
      const add = document.createElement("button"); add.type = "button"; add.className = "btn"; add.textContent = "Add a color"; add.disabled = mine.stops.length >= 10;
      add.addEventListener("click", () => { const lst = mine.stops[mine.stops.length - 1]; mine.stops.push((lst + 40) % 360); sync(); renderLayer(); });
      const del = document.createElement("button"); del.type = "button"; del.className = "btn danger"; del.textContent = "Delete palette";
      del.addEventListener("click", () => { myPals = myPals.filter(p => p !== mine); savePals(); c.pal = "loop"; c.stops = PRESET_PALS[0].stops.slice(); again(); });
      row.append(add, del); ed.append(row); cc.append(ed);
    } else { const cp = document.createElement("button"); cp.type = "button"; cp.className = "btn"; cp.textContent = "Copy this palette to edit"; cp.style.justifySelf = "start";
      cp.addEventListener("click", () => { const base = allPals().find(p => p.id === c.pal) || PRESET_PALS[0], p = { id: "my" + Date.now().toString(36), name: base.name + " (mine)", stops: base.stops.slice() }; myPals.push(p); savePals(); c.pal = p.id; c.stops = p.stops.slice(); again(); }); cc.append(cp); }
  }
  if (c.mode !== "one") {
    cc.append(seg("Moves with", [["time", "Time"], ["beat", "Every beat"], ["loud", "Loudness"]], c.by, v => { c.by = v; again(); }));
    if (c.by !== "beat") cc.append(slider("c-speed", "Speed", "", 0, 1, .01, c.speed, pct, v => { c.speed = v; }));
    cc.append(seg("Change", [["glide", "Smooth"], ["jump", "Snap"]], c.flow, v => { c.flow = v; again(); }));
  }
  box.append(gc);
}
function renderAll() { sel = clamp(sel, 0, state.layers.length - 1); renderLayers(); renderLayer(); }
function rebuildMusic() {
  const box = $("#music-ctl"), m = state.music; box.innerHTML = "";
  const off = slider("offset", "Sync offset", "", -500, 500, 10, offsetMs, v => v === 0 ? "0 ms" : v < 0 ? "−" + Math.abs(v) + " ms · earlier" : "+" + v + " ms · later", v => { offsetMs = v; try { localStorage.setItem(OKEY, String(v)); } catch (_) {} applyOffset(); });
  const note = document.createElement("div"); note.className = "ctl-hint"; note.id = "offset-note"; off.append(note);
  const zero = document.createElement("button"); zero.className = "btn"; zero.type = "button"; zero.textContent = "Reset to 0"; zero.style.justifySelf = "start";
  zero.addEventListener("click", () => { offsetMs = 0; try { localStorage.setItem(OKEY, "0"); } catch (_) {} rebuildMusic(); applyOffset(); });
  const tap = document.createElement("button"); tap.className = "btn"; tap.type = "button"; tap.textContent = "Tap to sync"; tap.addEventListener("click", calStart);
  const btns = document.createElement("div"); btns.className = "offset-btns"; btns.append(tap, zero); off.append(btns);
  box.append(off); setTimeout(offsetHint, 0);
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
function applyDesign(d) {
  const s = JSON.parse(JSON.stringify(d.design)); s.layers = (s.layers || []).filter(l => VIS[l.form] || l.form === "doodle").map(l => Object.assign(l, { form: l.form === "doodle" ? "doodle2" : l.form, id: "L" + Date.now().toString(36) + (seq++) }));
  if (!s.layers.length) return false;
  s.moods ||= {}; MOODS.forEach(m => { s.moods[m.key] ||= { on: false, op: .5, mode: m.mode }; }); s.music ||= { reaction: 1, punch: 1, decay: 1 };
  state = s; RT.clear(); sel = 0; renderAll(); renderMoods(); rebuildMusic(); return true;
}
// every change to the saved list goes through here so it also reaches the cloud
function commitDesigns(list) { if (!putDesigns(list)) return false; if (typeof pushSoon === "function") pushSoon(); return true; }
function designMsg(t) { $("#design-msg").textContent = t; clearTimeout(msgT); msgT = setTimeout(() => { $("#design-msg").textContent = ""; }, 3000); }
function renderDesigns() {
  const box = $("#design-list"), list = getDesigns(); box.innerHTML = "";
  if (!list.length) { box.innerHTML = '<span class="desc">Nothing saved yet. Name your current combo and tap Save.</span>'; return; }
  list.forEach(d => { const w = document.createElement("span"); w.className = "design";
    w.innerHTML = `<button class="load">${esc(d.name)}</button><button class="x${armed === d.name ? " armed" : ""}" aria-label="Delete ${esc(d.name)}">${armed === d.name ? "Delete?" : "×"}</button>`;
    w.querySelector(".load").addEventListener("click", () => {
      if (!applyDesign(d)) { designMsg("That design's visuals aren't available anymore."); return; }
      $("#design-name").value = d.name; save(); designMsg(`Loaded "${d.name}".`); });
    w.querySelector(".x").addEventListener("click", () => {
      if (armed !== d.name) { armed = d.name; renderDesigns(); setTimeout(() => { if (armed === d.name) { armed = null; renderDesigns(); } }, 3000); return; }
      armed = null; commitDesigns(getDesigns().filter(x => x.name !== d.name)); renderDesigns(); designMsg(`Deleted "${d.name}".`); });
    box.append(w); });
}
$("#save-form").addEventListener("submit", e => { e.preventDefault();
  const name = $("#design-name").value.trim(); if (!name) { designMsg("Give it a name first."); $("#design-name").focus(); return; }
  const list = getDesigns(), i = list.findIndex(d => d.name.toLowerCase() === name.toLowerCase()), entry = { name, savedAt: new Date().toISOString(), design: snapshot() };
  if (i >= 0) list[i] = entry; else list.unshift(entry);
  if (!commitDesigns(list)) { designMsg("Couldn't save. This browser's storage may be full or blocked."); return; }
  renderDesigns(); designMsg(i >= 0 ? `Updated "${name}".` : `Saved "${name}".`); });

/* ---------- full-screen play ---------- */
let hintT = 0;
function setPlaying(on) {
  if (!on) stopCycle();
  document.body.classList.toggle("playing", on); $("#exit-play").hidden = !on;
  if (on) { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); $("#exit-play").classList.remove("fade"); clearTimeout(hintT); hintT = setTimeout(() => $("#exit-play").classList.add("fade"), 2500); }
  else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  setTimeout(resize, 50);
}
$("#play").addEventListener("click", () => setPlaying(true));
$("#stage-box").addEventListener("click", () => { if (document.body.classList.contains("playing")) setPlaying(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("playing")) setPlaying(false); });

/* ---------- cycle through saved designs in full screen ---------- */
const CKEY = "glint.cycle"; let cycleSecs = 18; try { cycleSecs = clamp(+localStorage.getItem(CKEY) || 18, 5, 120); } catch (_) {}
const fadeC = mk(1, 1); let fadeA = 0, cyc = null;
function showName(n) { const el = $("#cycle-name"); el.textContent = n; el.classList.add("show"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2600); }
function cycleStep(dir) {
  if (!cyc) return;
  for (let tries = 0; tries < cyc.list.length; tries++) {
    cyc.i = (cyc.i + dir + cyc.list.length) % cyc.list.length;
    fadeC.width = cv.width; fadeC.height = cv.height; fadeC.getContext("2d").drawImage(cv, 0, 0);
    if (applyDesign(cyc.list[cyc.i])) { fadeA = 1; showName(cyc.list[cyc.i].name); return; }
  }
}
function restartTimer() { clearInterval(cyc.timer); cyc.timer = setInterval(() => cycleStep(1), cycleSecs * 1000); }
function startCycle() {
  const list = getDesigns();
  if (list.length < 2) { designMsg("Save at least two designs to cycle through them."); $("#designs-card").scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
  cyc = { list, i: -1, pre: snapshot(), timer: 0 };
  cycleStep(1); restartTimer(); setPlaying(true);
}
function stopCycle() {
  if (!cyc) return; clearInterval(cyc.timer); const pre = cyc.pre; cyc = null; fadeA = 0;
  $("#cycle-name").classList.remove("show"); applyDesign({ design: pre });
}
$("#cycle").addEventListener("click", startCycle);
document.addEventListener("keydown", e => { if (!cyc) return; if (e.key === "ArrowRight") { cycleStep(1); restartTimer(); } if (e.key === "ArrowLeft") { cycleStep(-1); restartTimer(); } });
$("#cycle-ctl").append(slider("cycle-secs", "Cycle every", "Full-screen cycling through your saved designs", 5, 60, 1, cycleSecs, v => Math.round(v) + " s", v => { cycleSecs = v; try { localStorage.setItem(CKEY, String(v)); } catch (_) {} if (cyc) restartTimer(); }));

/* ---------- cloud sync: saved designs follow your account (same sign-in as In the Loop) ---------- */
const SUPA_URL = "https://lwbbkwftkxjmrpyalrwu.supabase.co", SUPA_KEY = "sb_publishable_j4FskQJtwZnxNBZXH61QJQ_U62I-eaY";
const SYNC_ROW = "glint:designs", DIRTY = "glint.sync.dirty", MERGED = "glint.sync.merged";
const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
let sb = null, user = null, syncing = false, pushT = 0, lastPull = 0;
try { if (window.supabase && SUPA_URL) sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true } }); } catch (_) {}
function syncUI(msg) {
  $("#sync").hidden = !sb;
  $("#sync-msg").textContent = msg || (user ? "Synced to " + (user.email || "your account") : "Saved on this device only");
  $("#designs-where").textContent = user ? "synced across your devices" : "saved on this device";
  $("#sync-toggle").textContent = user ? "Sign out" : "Sync across devices";
  if (user) $("#sync-form").hidden = true;
}
function mergeLists(a, b) {
  const map = new Map();
  [...a, ...b].forEach(d => { const k = d.name.toLowerCase(), cur = map.get(k); if (!cur || String(d.savedAt) > String(cur.savedAt)) map.set(k, d); });
  return [...map.values()].sort((x, y) => String(y.savedAt).localeCompare(String(x.savedAt)));
}
async function pullCloud() { const { data, error } = await sb.from("kv").select("value").eq("key", SYNC_ROW).maybeSingle(); if (error) throw error; return data && data.value ? JSON.parse(data.value) : null; }
async function pushCloud(list) { const { error } = await sb.from("kv").upsert({ user_id: user.id, key: SYNC_ROW, value: JSON.stringify(list), updated_at: new Date().toISOString() }); if (error) throw error; }
async function syncNow() {
  if (!sb || !user || syncing) return; syncing = true; syncUI("Syncing…");
  try {
    const cloud = await pullCloud(), local = getDesigns(), firstHere = lsGet(MERGED) !== user.id, dirty = lsGet(DIRTY) === "1";
    // first sign-in on this device: combine both; unsent changes here: this device wins; otherwise the cloud is the truth
    const merged = !cloud ? local : firstHere ? mergeLists(local, cloud) : dirty ? local : cloud;
    putDesigns(merged);
    if (!cloud || JSON.stringify(cloud) !== JSON.stringify(merged)) await pushCloud(merged);
    lsSet(MERGED, user.id); lsSet(DIRTY, null); lastPull = Date.now(); renderDesigns(); syncUI();
  } catch (_) { syncUI("Couldn't reach the cloud. Designs are still saved here."); }
  syncing = false;
}
function pushSoon() {
  if (!sb || !user) return; lsSet(DIRTY, "1"); clearTimeout(pushT);
  pushT = setTimeout(async () => { try { await pushCloud(getDesigns()); lsSet(DIRTY, null); syncUI(); } catch (_) { syncUI("Saved here; will sync when the connection is back."); } }, 600);
}
if (sb) {
  syncUI();
  const onUser = async () => { await loadRole(); await pullLineup(); };
  sb.auth.getSession().then(({ data }) => { user = data && data.session ? data.session.user : null; syncUI(); if (user) syncNow(); onUser(); });
  sb.auth.onAuthStateChange((ev, session) => { const was = user && user.id; user = session ? session.user : null; syncUI(); if (user && user.id !== was) syncNow(); if ((user && user.id) !== was) onUser(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && user && Date.now() - lastPull > 10000) { syncNow(); pullLineup(); } });
  $("#sync-toggle").addEventListener("click", async () => {
    if (user) { await sb.auth.signOut(); user = null; syncUI("Signed out. Designs stay saved on this device."); return; }
    const f = $("#sync-form"); f.hidden = !f.hidden; if (!f.hidden) $("#sync-email").focus();
  });
  $("#sync-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#sync-email").value.trim(), password = $("#sync-pass").value;
    if (!email || !password) { syncUI("Enter your email and password."); return; }
    $("#sync-go").disabled = true; syncUI("Signing in…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    $("#sync-go").disabled = false;
    if (error) { syncUI(/invalid/i.test(error.message) ? "That email and password don't match. Use your In the Loop sign-in." : "Couldn't sign in: " + error.message); return; }
    $("#sync-pass").value = "";
  });
}
/* ---------- the Lineup: published personas, shared with every member ----------
   Table glint_lineup (name, design, thumb, position). Everyone signed in can read it; only an admin (glint_roles) can post or remove.
   A persona is a saved design plus a thumbnail captured from the stage at posting time. */
let role = null, lineup = [], lineupArmed = null, lineupMsgT = 0;
function lineupMsg(t) { $("#lineup-msg").textContent = t; clearTimeout(lineupMsgT); lineupMsgT = setTimeout(() => { $("#lineup-msg").textContent = ""; }, 3000); }
function thumbnail() { const c = mk(320, 200), g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 320, 200); const s = Math.max(320 / cv.width, 200 / cv.height), w = cv.width * s, h = cv.height * s; g.drawImage(cv, (320 - w) / 2, (200 - h) / 2, w, h); return c.toDataURL("image/jpeg", .72); }
async function loadRole() { role = null; if (!sb || !user) return; try { const { data } = await sb.from("glint_roles").select("role").eq("user_id", user.id).maybeSingle(); role = data ? data.role : "member"; } catch (_) { role = "member"; } $("#post-design").hidden = role !== "admin"; }
async function pullLineup() {
  if (!sb || !user) { lineup = []; renderLineup(); return; }
  try { const { data, error } = await sb.from("glint_lineup").select("id,name,design,thumb,position,posted_at").order("position").order("posted_at", { ascending: false }); if (error) throw error; lineup = data || []; }
  catch (_) { lineupMsg("Couldn't load the Lineup right now."); }
  renderLineup();
}
function renderLineup() {
  const card = $("#lineup-card"), box = $("#lineup-list"); card.hidden = !user; box.innerHTML = "";
  $("#lineup-sub").textContent = lineup.length ? `${lineup.length} persona${lineup.length === 1 ? "" : "s"}` : "what's showing";
  if (!lineup.length) { box.innerHTML = `<span class="desc">${role === "admin" ? "Nothing posted yet. Name a combo and tap Post to the Lineup." : "Nothing on the Lineup yet."}</span>`; return; }
  lineup.forEach(p => { const w = document.createElement("div"); w.className = "persona";
    w.innerHTML = `<button class="load" aria-label="Load ${esc(p.name)}">${p.thumb ? `<img src="${p.thumb}" alt="">` : '<i></i>'}<span>${esc(p.name)}</span></button>${role === "admin" ? `<button class="x${lineupArmed === p.id ? " armed" : ""}" aria-label="Remove ${esc(p.name)} from the Lineup">${lineupArmed === p.id ? "Remove?" : "×"}</button>` : ""}`;
    w.querySelector(".load").addEventListener("click", () => { if (!applyDesign(p)) { lineupMsg("That persona's visuals aren't available anymore."); return; } $("#design-name").value = p.name; save(); lineupMsg(`Loaded "${p.name}".`); });
    const x = w.querySelector(".x"); if (x) x.addEventListener("click", async () => {
      if (lineupArmed !== p.id) { lineupArmed = p.id; renderLineup(); setTimeout(() => { if (lineupArmed === p.id) { lineupArmed = null; renderLineup(); } }, 3000); return; }
      lineupArmed = null; const { error } = await sb.from("glint_lineup").delete().eq("id", p.id); if (error) { lineupMsg("Couldn't remove it: " + error.message); return; }
      lineup = lineup.filter(q => q.id !== p.id); renderLineup(); lineupMsg(`Took "${p.name}" off the Lineup.`); });
    box.append(w); });
}
$("#post-design").addEventListener("click", async () => {
  const name = $("#design-name").value.trim(); if (!name) { designMsg("Give it a name first."); $("#design-name").focus(); return; }
  if (!sb || !user || role !== "admin") { designMsg("Sign in as the admin to post."); return; }
  $("#save-form").requestSubmit(); // save it under that name too
  const existing = lineup.find(p => p.name.toLowerCase() === name.toLowerCase()), row = { name, design: snapshot(), thumb: thumbnail(), posted_by: user.id, posted_at: new Date().toISOString() };
  const q = existing ? sb.from("glint_lineup").update(row).eq("id", existing.id) : sb.from("glint_lineup").insert(row);
  const { error } = await q; if (error) { lineupMsg("Couldn't post it: " + error.message); return; }
  await pullLineup(); lineupMsg(existing ? `Updated "${name}" on the Lineup.` : `"${name}" is on the Lineup.`);
});
$("#lineup-play").addEventListener("click", () => {
  if (lineup.length < 2) { lineupMsg("Post at least two personas to play the Lineup."); return; }
  cyc = { list: lineup, i: -1, pre: snapshot(), timer: 0 }; cycleStep(1); restartTimer(); setPlaying(true);
});
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("playing")) setPlaying(false); });

musicUI("Silence · idle motion only");
renderAll(); renderMoods(); renderDesigns(); resize(); requestAnimationFrame(frame);
