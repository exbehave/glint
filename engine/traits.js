/* Traits kept from Casting (Oct 21, 2026). Same contract as every form. */
const tLoud = R => clamp(R.rms * 1.15, 0, 1);
/* ---- Möbius: a twisted band rotating through itself ---- */
const MOBIUS = { key: "mobius", name: "Möbius", fade: .45, init: () => ({ a: 0 }),
  shape: [{ key: "width", label: "Band width", def: .4 }, { key: "speed", label: "Speed", def: .4 }, { key: "rungs", label: "Rungs", def: .5 }, { key: "tilt", label: "Tilt", def: .5 }],
  draw(E) { const { g, n, R, S, st, dt, L, k } = E, loud = tLoud(R); st.a += dt * L("speed", .2, 1.5) * (.5 + loud + .5 * R.kick); const Rr = S * .24 * (1 + .05 * R.bass), w = S * L("width", .03, .12), tilt = L("tilt", .2, 1.1), N = 120, rails = [[], []], rung = [];
    for (let i = 0; i <= N; i++) { const u = i / N * TAU, tw = u / 2 + st.a; for (let s = 0; s < 2; s++) { const off = (s ? 1 : -1) * w, x = Math.cos(u) * (Rr + off * Math.cos(tw)), yy = off * Math.sin(tw), z = Math.sin(u) * (Rr + off * Math.cos(tw)), y = yy * Math.cos(tilt) - z * Math.sin(tilt), zz = yy * Math.sin(tilt) + z * Math.cos(tilt); rails[s].push([n.x + x, n.y + y, .5 + .5 * zz / Rr]); } if (i % Math.round(lerp(12, 3, k("rungs"))) === 0) rung.push(i); }
    g.lineCap = "round"; rung.forEach(i => { const a = rails[0][i], b = rails[1][i], d = (a[2] + b[2]) / 2; g.lineWidth = 1 + d; g.strokeStyle = hsl(n.hue + 30, 80, 65, .15 + .5 * d); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
    rails.forEach((pts, s) => { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], d = (p[2] + q[2]) / 2; g.lineWidth = S * .005 * (.4 + d); g.strokeStyle = hsl(n.hue + s * 25, 95, 55 + 25 * d, .3 + .7 * d); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); } }); } };

/* ---- Breathing grid: a lattice that bulges toward the center on bass ---- */
const GRID = { key: "grid", name: "Breathing grid", fade: .5, init: () => ({ b: 0 }),
  shape: [{ key: "cells", label: "Cells", min: 6, max: 24, def: .4 }, { key: "bulge", label: "Bulge", def: .6 }, { key: "dots", label: "Dots at crossings", def: .5 }, { key: "persp", label: "Perspective", def: .3 }],
  draw(E) { const { g, n, R, S, st, dt, W, H, L, I, k } = E, loud = tLoud(R); st.b = lerp(st.b, R.bass * .8 + R.kick * .5, dt * 8); const N = I("cells"), amp = k("bulge") * (.15 + .6 * st.b), persp = k("persp");
    const P = (i, j) => { let u = i / N * 2 - 1, v = j / N * 2 - 1; const d = Math.hypot(u, v), f = 1 + amp * Math.exp(-d * d * 2); u *= f; v *= f; const z = 1 + persp * (v + 1) * .6; return [n.x + u * W * .45 / z, n.y + v * H * .42 / z * (1 - persp * .3)]; };
    g.lineCap = "round"; g.lineWidth = S * .003; for (let i = 0; i <= N; i++) { const col = [], row = []; for (let j = 0; j <= N; j++) { col.push(P(i, j)); row.push(P(j, i)); } g.strokeStyle = hsl(n.hue, 85, 65, .55 + .3 * st.b); strokePath(g, col); strokePath(g, row); }
    if (k("dots") > .05) for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const [x, y] = P(i, j), d = Math.hypot(i / N * 2 - 1, j / N * 2 - 1); g.fillStyle = hsl(n.hue + 30, 90, 80, (.3 + .7 * st.b * Math.exp(-d * d * 2)) * k("dots")); g.beginPath(); g.arc(x, y, S * .004 * (1 + st.b), 0, TAU); g.fill(); }
    sprite(g, n.hue, n.x, n.y, S * .15 * (1 + st.b), .12 + .2 * st.b); } };

FORM.mobius = MOBIUS; FORM.grid = GRID;
