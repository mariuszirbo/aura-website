(function () {
  const CONTACT_EMAIL = "sales@auralab.ro";

  document.querySelectorAll("a[data-keep-hash]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (!location.hash) return;
      event.preventDefault();
      const url = new URL(link.getAttribute("href"), location.origin);
      url.hash = location.hash;
      location.href = url.href;
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
  if (!form || !thanks) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = new FormData(form);
    const whoInput = form.querySelector('input[name="who"]:checked');
    const who = whoInput && whoInput.nextElementSibling ? whoInput.nextElementSibling.textContent.trim() : "";
    const role = form.querySelector('[name="role"] option:checked');
    const lines = ["who", "name", "organisation", "email", "role", "message"].map(function (name) {
      const field = form.querySelector('[name="' + name + '"]');
      const labelEl = field && field.closest("label") ? field.closest("label").querySelector("span") : null;
      const label = name === "who" ? (labelEl ? "" : "Audience") : (labelEl ? labelEl.textContent.trim() : name);
      if (name === "who") {
        const whoLabel = form.getAttribute("data-who-label") || "Audience";
        return whoLabel + ": " + who;
      }
      const value = name === "role" ? (role ? role.textContent.trim() : "") : (data.get(name) || "—");
      return label + ": " + value;
    });
    thanks.querySelector("pre").textContent = lines.join("\n");
    form.hidden = true;
    thanks.hidden = false;
    const subject = form.getAttribute("data-mail-subject") || "A.U.R.A.";
    if (!/^[A-Za-z0-9._%+-]+@auralab\.ro$/.test(CONTACT_EMAIL)) return;
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  });

  thanks.querySelector("[data-edit]").addEventListener("click", function () {
    thanks.hidden = true;
    form.hidden = false;
  });
})();
