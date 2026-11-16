(function () {
  const CONTACT_EMAIL = "";
  const dicts = AURA_I18N;
  const params = new URLSearchParams(location.search);
  const saved = localStorage.getItem("aura-lang");
  const browser = (navigator.language || "").toLowerCase();
  let lang = params.get("lang") || saved || (browser.startsWith("ro") ? "ro" : "en");
  if (!dicts[lang]) lang = "en";

  function withLang(href, code) {
    const parts = href.split("#");
    const path = parts[0];
    const hash = parts[1] ? "#" + parts[1] : "";
    const join = path + (path.includes("?") ? "&" : "?") + "lang=" + code;
    return join + hash;
  }

  function apply(code) {
    lang = dicts[code] ? code : "en";
    const t = dicts[lang];
    document.documentElement.lang = lang;
    document.title = t["meta.title"];
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t["meta.description"]);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const value = t[el.getAttribute("data-i18n")];
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      const value = t[el.getAttribute("data-i18n-placeholder")];
      if (value != null) el.setAttribute("placeholder", value);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      const value = t[el.getAttribute("data-i18n-alt")];
      if (value != null) el.alt = value;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      const value = t[el.getAttribute("data-i18n-aria")];
      if (value != null) el.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      const on = btn.getAttribute("data-lang") === lang;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-lang-href]").forEach(function (a) {
      a.href = withLang(a.getAttribute("data-lang-href"), lang);
    });
    localStorage.setItem("aura-lang", lang);
    const url = new URL(location.href);
    if (url.searchParams.get("lang") !== lang) {
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
    }
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      apply(btn.getAttribute("data-lang"));
    });
  });

  document.querySelectorAll(".mnav-panel a").forEach(function (link) {
    link.addEventListener("click", function () {
      document.querySelectorAll(".mnav").forEach(function (menu) {
        menu.open = false;
      });
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      document.querySelectorAll(".mnav").forEach(function (menu) {
        menu.open = false;
      });
    }
  });

  const form = document.querySelector("#contact-form");
  const thanks = document.querySelector("#contact-thanks");
  if (form && thanks) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const t = dicts[lang];
      const data = new FormData(form);
      const who = data.get("who") === "reseller" ? t["form.reseller"] : t["form.lab"];
      const role = form.querySelector('[name="role"] option:checked');
      const lines = [
        t["form.who"] + ": " + who,
        t["form.name"] + ": " + data.get("name"),
        t["form.org"] + ": " + data.get("organisation"),
        t["form.email"] + ": " + data.get("email"),
        t["form.role"] + ": " + (role ? role.textContent : data.get("role")),
        t["form.message"] + ": " + (data.get("message") || "—")
      ];
      thanks.querySelector("pre").textContent = lines.join("\n");
      form.hidden = true;
      thanks.hidden = false;
      const mail = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(t["form.subject"]) + "&body=" + encodeURIComponent(lines.join("\n"));
      window.location.href = mail;
    });
    thanks.querySelector("[data-edit]").addEventListener("click", function () {
      thanks.hidden = true;
      form.hidden = false;
    });
  }

  apply(lang);
})();
