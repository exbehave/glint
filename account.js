/* account.js — usernames instead of emails (shared by the Studio, the Theater, the remote, and In the Loop).
   A username "sam" is the auth email sam@glint.haus behind the scenes; nobody ever sees or types the email part.
   New members get a temporary password from the admin and are asked to set their own the first time they sign in
   (user_metadata.must_change). There is no self-serve "forgot password": the admin resets it from the Members card. */
(function () {
  const DOMAIN = "glint.haus", FN = "glint-accounts";
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Typed sign-in name → auth email. A full email still works (older accounts).
  const email = u => { u = String(u || "").trim().toLowerCase(); return !u || u.includes("@") ? u : u + "@" + DOMAIN; };
  // What to call a signed-in user.
  const name = user => !user ? "" : (user.user_metadata && user.user_metadata.username) || (user.email || "").replace(/@.*$/, "") || "you";
  const mustChange = user => !!(user && user.user_metadata && user.user_metadata.must_change);

  let gateEl = null;
  /* Covers the page until the person sets a password of their own (first sign-in, or after an admin reset). */
  function gate(sb, user, done) {
    if (!sb || !user || !mustChange(user)) { if (gateEl) { gateEl.remove(); gateEl = null; } return; }
    if (gateEl) return;
    gateEl = document.createElement("div"); gateEl.className = "acct-veil"; gateEl.innerHTML =
      `<form class="acct-box card"><h3>Set your password</h3><p class="desc">Hi ${esc(name(user))}. You signed in with a temporary password — pick one of your own to use from now on (8 characters or more).</p>` +
      `<input class="name-in" type="text" value="${esc(name(user))}" autocomplete="username" hidden aria-hidden="true">` +
      `<input class="name-in" id="acct-new" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required>` +
      `<input class="name-in" id="acct-new2" type="password" placeholder="Same again" autocomplete="new-password" minlength="8" required>` +
      `<div class="row spread"><span class="now" id="acct-msg" aria-live="polite"></span><button class="btn" type="submit" id="acct-go">Save password</button></div></form>`;
    document.body.append(gateEl); setTimeout(() => $("#acct-new").focus(), 50);
    gateEl.querySelector("form").addEventListener("submit", async e => {
      e.preventDefault(); const p1 = $("#acct-new").value, p2 = $("#acct-new2").value, msg = $("#acct-msg");
      if (p1.length < 8) { msg.textContent = "At least 8 characters."; return; }
      if (p1 !== p2) { msg.textContent = "Those don't match."; return; }
      $("#acct-go").disabled = true; msg.textContent = "Saving…";
      const { error } = await sb.auth.updateUser({ password: p1, data: { must_change: false } });
      if (error) { $("#acct-go").disabled = false; msg.textContent = "Couldn't save: " + error.message; return; }
      if (gateEl) { gateEl.remove(); gateEl = null; } if (done) done();
    });
  }

  /* A small "Change password" link that unfolds into a form; returns the element to drop into a card. */
  function changeLink(sb) {
    const w = document.createElement("div"); w.className = "acct-change";
    w.innerHTML = `<button class="link-btn" type="button" id="acct-open">Change password</button>` +
      `<form class="sync-form" id="acct-form" hidden><input class="name-in" id="acct-c1" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required>` +
      `<input class="name-in" id="acct-c2" type="password" placeholder="Same again" autocomplete="new-password" minlength="8" required>` +
      `<div class="row spread"><span class="now" id="acct-cmsg" aria-live="polite"></span><button class="btn" type="submit">Save</button></div></form>`;
    w.querySelector("#acct-open").addEventListener("click", () => { const f = w.querySelector("#acct-form"); f.hidden = !f.hidden; if (!f.hidden) w.querySelector("#acct-c1").focus(); });
    w.querySelector("#acct-form").addEventListener("submit", async e => {
      e.preventDefault(); const p1 = w.querySelector("#acct-c1").value, p2 = w.querySelector("#acct-c2").value, msg = w.querySelector("#acct-cmsg");
      if (p1.length < 8) { msg.textContent = "At least 8 characters."; return; }
      if (p1 !== p2) { msg.textContent = "Those don't match."; return; }
      msg.textContent = "Saving…";
      const { error } = await sb.auth.updateUser({ password: p1, data: { must_change: false } });
      msg.textContent = error ? "Couldn't save: " + error.message : "Password changed.";
      if (!error) { w.querySelector("#acct-c1").value = w.querySelector("#acct-c2").value = ""; setTimeout(() => { w.querySelector("#acct-form").hidden = true; msg.textContent = ""; }, 1500); }
    });
    return w;
  }

  /* Calls the glint-accounts function as the signed-in admin. */
  async function call(sb, body) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error("Sign in first.");
    const r = await fetch(sb.supabaseUrl + "/functions/v1/" + FN, { method: "POST", headers: { "Content-Type": "application/json", apikey: sb.supabaseKey, Authorization: "Bearer " + session.access_token }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ error: "No reply." }));
    if (!r.ok || j.error) throw new Error(j.error || ("Error " + r.status));
    return j;
  }

  /* The admin's Members card: list, add, new password, remove. `mount` is the element to fill. */
  function members(sb, mount, me) {
    let users = [], note = "";
    const say = m => { note = m; draw(); };
    const draw = () => {
      mount.innerHTML = `<h3>Members <span class="now">${users.length ? users.length + " account" + (users.length === 1 ? "" : "s") : ""}</span></h3>` +
        `<p class="desc">Everyone signs in with a username and a password — no emails. New members get a temporary password to hand them; they pick their own the first time they sign in. The same account works in In the Loop.</p>` +
        `<form class="row" id="mem-add"><input class="name-in" id="mem-name" placeholder="New username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="24" aria-label="New username"><button class="btn" type="submit">Add member</button></form>` +
        `<div class="mem-list" id="mem-list">${users.map(u => `<div class="mem" data-id="${u.id}"><span class="mem-name">${esc(u.username)}${u.role === "admin" ? ` <span class="now">admin</span>` : ""}${u.must_change ? ` <span class="now">· temp password</span>` : ""}</span>` +
          `<span class="row"><button class="btn mem-reset" type="button" title="Give them a new temporary password">New password</button>${u.id !== (me && me.id) ? `<button class="btn mem-rm" type="button" title="Remove this account">×</button>` : ""}</span></div>`).join("")}</div>` +
        `<div class="now" id="mem-msg" aria-live="polite">${note}</div>`;
      mount.querySelector("#mem-add").addEventListener("submit", async e => {
        e.preventDefault(); const u = mount.querySelector("#mem-name").value.trim(); if (!u) return;
        say("Adding " + u + "…");
        try { const r = await call(sb, { action: "create", username: u }); await load(); say(`Added ${esc(r.username)}. Temporary password: ${esc(r.password)} — send it to them; they'll set their own when they sign in.`); }
        catch (err) { say(err.message); }
      });
      mount.querySelectorAll(".mem").forEach(el => {
        const id = el.dataset.id, u = users.find(x => x.id === id);
        el.querySelector(".mem-reset").addEventListener("click", async () => {
          if (!confirm(`Give ${u.username} a new temporary password? Their current one stops working.`)) return;
          say("Resetting…");
          try { const r = await call(sb, { action: "reset", id }); await load(); say(`New temporary password for ${esc(r.username)}: ${esc(r.password)}${id === (me && me.id) ? " — you'll be asked to set your own next time you sign in." : " — send it to them."}`); }
          catch (err) { say(err.message); }
        });
        const rm = el.querySelector(".mem-rm"); if (rm) rm.addEventListener("click", async () => {
          if (!confirm(`Remove ${u.username}? Their account and anything synced to it are deleted. This can't be undone.`)) return;
          say("Removing…");
          try { await call(sb, { action: "remove", id }); await load(); say(`Removed ${esc(u.username)}.`); } catch (err) { say(err.message); }
        });
      });
    };
    const load = async () => { try { users = (await call(sb, { action: "list" })).users || []; } catch (err) { note = err.message; } draw(); };
    draw(); load();
    return { reload: load };
  }

  window.GlintAccount = { DOMAIN, email, name, mustChange, gate, changeLink, members };
})();
