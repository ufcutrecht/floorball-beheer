/* Inloggen bij Supabase voor de beheer-app. Gedeeld door alle pagina's.
   FBAuth.signIn(email, wachtwoord), FBAuth.signOut(), FBAuth.api(pad, opties),
   FBAuth.token(), FBAuth.user(), FBAuth.onChange(fn) (fn(true|false) bij in- of uitloggen). */
window.FBAuth = (function () {
  "use strict";
  var CFG = window.FB_CONFIG || {};
  var BASE = (CFG.supabaseUrl || "").replace(/\/$/, ""), KEY = CFG.supabaseKey || "";
  var AKEY = "ufc-beheer-auth";
  var listeners = [];
  var auth = null;
  try { auth = JSON.parse(localStorage.getItem(AKEY) || "null"); } catch (e) { auth = null; }

  function store() { try { auth ? localStorage.setItem(AKEY, JSON.stringify(auth)) : localStorage.removeItem(AKEY); } catch (e) {} }
  function emit() { listeners.forEach(function (fn) { try { fn(!!auth); } catch (e) {} }); }

  async function grant(type, body) {
    var r = await fetch(BASE + "/auth/v1/token?grant_type=" + type, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: KEY }, body: JSON.stringify(body)
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw Object.assign(new Error(j.error_description || j.msg || "inloggen mislukt"), { status: r.status });
    auth = { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, email: (j.user && j.user.email) || (auth && auth.email) || "" };
    store();
  }
  function signOut() {
    if (auth && auth.access) fetch(BASE + "/auth/v1/logout", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + auth.access } }).catch(function () {});
    auth = null; store(); emit();
  }
  async function token() {
    if (!auth) throw new Error("Je bent niet ingelogd.");
    if (Date.now() > auth.exp - 60000) {
      try { await grant("refresh_token", { refresh_token: auth.refresh }); }
      catch (e) { if (e.status === 400 || e.status === 401) signOut(); throw e; }
    }
    return auth.access;
  }
  async function api(path, opt) {
    opt = opt || {};
    var h = { apikey: KEY, Authorization: "Bearer " + (await token()) };
    for (var k in (opt.headers || {})) h[k] = opt.headers[k];
    var r = await fetch(BASE + path, { method: opt.method || "GET", headers: h, body: opt.body });
    if (r.status === 401) { signOut(); throw Object.assign(new Error("Je bent uitgelogd. Log opnieuw in."), { status: 401 }); }
    if (!r.ok) { var t = await r.text().catch(function () { return ""; }); throw Object.assign(new Error(t || ("fout " + r.status)), { status: r.status }); }
    var tx = await r.text(); return tx ? JSON.parse(tx) : null;
  }

  /* Inlogvak: elk element met data-login krijgt een formulier, of "Ingelogd als … / Uitloggen". */
  function mountLogin(box) {
    box.innerHTML =
      '<form class="login" novalidate>' +
      '<div class="field"><label for="fb-email">E-mailadres</label><input type="email" id="fb-email" autocomplete="username" required></div>' +
      '<div class="field"><label for="fb-pw">Wachtwoord</label><input type="password" id="fb-pw" autocomplete="current-password" required></div>' +
      '<div class="btns"><button type="submit" class="primary">Inloggen</button></div></form>' +
      '<div class="btns hidden fb-in"><span class="muted fb-who"></span><button type="button" class="ghost small fb-out">Uitloggen</button></div>' +
      '<p class="status fb-st" role="status"></p>';
    var form = box.querySelector("form"), inBox = box.querySelector(".fb-in"), st = box.querySelector(".fb-st");
    function show() {
      form.classList.toggle("hidden", !!auth); inBox.classList.toggle("hidden", !auth);
      box.querySelector(".fb-who").textContent = auth ? "Ingelogd als " + (auth.email || "") : "";
    }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!BASE) { st.textContent = "Supabase is niet ingesteld."; st.className = "status err"; return; }
      var b = form.querySelector("button"); b.disabled = true; st.textContent = "Inloggen…"; st.className = "status";
      try {
        await grant("password", { email: box.querySelector("#fb-email").value.trim(), password: box.querySelector("#fb-pw").value });
        box.querySelector("#fb-pw").value = ""; st.textContent = ""; emit();
      } catch (err) {
        st.textContent = err.status === 400 ? "E-mailadres of wachtwoord klopt niet." : "Inloggen mislukt. Controleer je verbinding."; st.className = "status err";
      }
      b.disabled = false;
    });
    box.querySelector(".fb-out").addEventListener("click", signOut);
    listeners.push(show); show();
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-login]"), mountLogin);
    if (auth) token().then(emit, function () { if (auth) emit(); });   // offline: blijf ingelogd
  });

  return {
    base: BASE, key: KEY, api: api, token: token, signOut: signOut,
    signIn: function (email, pw) { return grant("password", { email: email, password: pw }).then(emit); },
    user: function () { return auth ? { email: auth.email } : null; },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
