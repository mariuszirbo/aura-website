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

  function fieldLabel(field) {
    if (field.name === "who") {
      const whoText = field.form.querySelector("[data-who-label-text]");
      if (whoText) return whoText.textContent.trim();
      return field.form.getAttribute("data-who-label") || "Audience";
    }
    if (field.type === "hidden" && field.hasAttribute("aria-labelledby")) {
      const named = document.getElementById(field.getAttribute("aria-labelledby"));
      if (named) return named.textContent.trim();
    }
    const legend = field.closest("fieldset") && field.closest("fieldset").querySelector("legend");
    if (legend) return legend.textContent.trim();
    const labelEl = field.closest("label") && field.closest("label").querySelector("span");
    return labelEl ? labelEl.textContent.trim() : field.name;
  }

  function fieldValue(form, field) {
    if (field.type === "radio" || field.type === "checkbox") {
      const checked = form.querySelector('[name="' + field.name + '"]:checked');
      if (!checked) return "—";
      const text = checked.nextElementSibling ? checked.nextElementSibling.textContent.trim() : "";
      return text || checked.value || "—";
    }
    if (field.tagName === "SELECT") {
      const option = field.options[field.selectedIndex];
      return option ? option.textContent.trim() : "—";
    }
    const value = (field.value || "").trim();
    return value || "—";
  }

  function fieldLines(form) {
    const lines = [];
    const seen = {};
    form.querySelectorAll("[name]").forEach(function (field) {
      if (field.name === "hp_field") return;
      if (seen[field.name]) return;
      if ((field.type === "radio" || field.type === "checkbox") && !field.checked) return;
      seen[field.name] = true;
      lines.push(fieldLabel(field) + ": " + fieldValue(form, field));
    });
    return lines;
  }

  function subjectOf(form) {
    const subjectNode = form.querySelector("[data-mail-subject-text]");
    return subjectNode ? subjectNode.textContent.trim() : (form.getAttribute("data-mail-subject") || "A.U.R.A.");
  }

  function showThanks(thanks, sent, email, confirmed) {
    const title = thanks.querySelector("[data-thanks-title]");
    const body = thanks.querySelector("[data-thanks-body]");
    const titleKey = sent ? "[data-thanks-sent-title]" : "[data-thanks-draft-title]";
    const bodyKey = sent ? (confirmed ? "[data-thanks-sent-body]" : "[data-thanks-sent-nomail]") : "[data-thanks-draft-body]";
    const titleSrc = thanks.querySelector(titleKey);
    const bodySrc = thanks.querySelector(bodyKey);
    if (title && titleSrc) title.textContent = titleSrc.textContent.trim();
    if (body && bodySrc) body.textContent = bodySrc.textContent.trim().replace("{{email}}", email || "");
    thanks.classList.toggle("is-sent", !!sent);
    thanks.classList.remove("is-in");
    void thanks.offsetWidth;
    thanks.classList.add("is-in");
  }

  function openDraft(form, thanks, lines) {
    showThanks(thanks, false, "", false);
    form.hidden = true;
    thanks.hidden = false;
    const subject = subjectOf(form);
    if (!/^[A-Za-z0-9._%+-]+@auralab\.ro$/.test(CONTACT_EMAIL)) return;
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function sendForm(form, thanks) {
    if (form.dataset.sending === "1") return;
    form.dataset.sending = "1";
    if (form.id === "estimate-form") updateEstimate();
    const lines = fieldLines(form);
    thanks.querySelector("pre").textContent = lines.join("\n");
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    const emailField = form.querySelector('[name="email"]');
    const nameField = form.querySelector('[name="name"]');
    const trap = form.querySelector('[name="hp_field"]');
    const email = emailField ? emailField.value.trim() : "";
    const payload = {
      name: nameField ? nameField.value : "",
      email: email,
      subject: subjectOf(form),
      text: lines.join("\n"),
      lang: document.documentElement.lang === "ro" ? "ro" : "en",
      hp_field: trap ? trap.value : ""
    };
    form.classList.add("is-sending");
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error("send");
      return response.json();
    }).then(function (data) {
      form.classList.remove("is-sending");
      showThanks(thanks, true, email, !!(data && data.confirmed));
      form.hidden = true;
      thanks.hidden = false;
    }).catch(function () {
      form.classList.remove("is-sending");
      openDraft(form, thanks, lines);
    });
  }

  document.querySelectorAll("[data-mail-panel]").forEach(function (panel) {
    const form = panel.querySelector("form");
    const thanks = panel.querySelector(".thanks");
    if (!form || !thanks) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendForm(form, thanks);
    });
    const edit = thanks.querySelector("[data-edit]");
    if (edit) {
      edit.addEventListener("click", function () {
        thanks.hidden = true;
        thanks.classList.remove("is-sent", "is-in");
        form.hidden = false;
        form.classList.remove("is-sending");
        const button = form.querySelector('[type="submit"]');
        if (button) button.disabled = false;
        delete form.dataset.sending;
      });
    }
  });

  const calc = document.querySelector("#estimate-form");
  function updateEstimate() {
    if (!calc) return;
    const months = Number(calc.querySelector('[name="months"]').value);
    const users = Number(calc.querySelector('[name="users"]').value);
    const reports = Number(calc.querySelector('[name="reports"]').value);
    const rateUserInput = calc.querySelector('[name="rateUser"]');
    const rateReportInput = calc.querySelector('[name="rateReport"]');
    const currency = (calc.querySelector('[name="currency"]:checked') || {}).value || "EUR";
    const userBlank = rateUserInput.value.trim() === "";
    const reportBlank = rateReportInput.value.trim() === "";
    const totalNode = document.querySelector("#calc-total");
    const monthNode = document.querySelector("#calc-month");
    const totalInput = calc.querySelector('[name="total"]');
    const monthInput = calc.querySelector('[name="perMonth"]');
    const emptyText = (calc.querySelector("[data-calc-empty]") || {}).textContent || "—";
    let total = null;
    if (!userBlank || !reportBlank) {
      const rateUser = userBlank ? 0 : Number(rateUserInput.value);
      const rateReport = reportBlank ? 0 : Number(rateReportInput.value);
      if ([months, users, reports, rateUser, rateReport].every(function (n) { return Number.isFinite(n) && n >= 0; }) && months > 0) {
        total = users * months * rateUser + reports * rateReport;
      }
    }
    const lang = document.documentElement.lang === "ro" ? "ro-RO" : "en-GB";
    const shown = total === null ? emptyText.trim() : new Intl.NumberFormat(lang, { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);
    const perMonth = total === null || !months ? "—" : new Intl.NumberFormat(lang, { style: "currency", currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total / months);
    if (totalNode) totalNode.textContent = shown;
    if (monthNode) monthNode.textContent = perMonth;
    if (totalInput) totalInput.value = shown;
    if (monthInput) monthInput.value = perMonth;
  }
  if (calc) {
    calc.addEventListener("input", updateEstimate);
    calc.addEventListener("change", updateEstimate);
    updateEstimate();
  }
  window.__auraMail = 2;
})();
