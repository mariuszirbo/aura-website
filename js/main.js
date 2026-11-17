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

  function revealOnScroll() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("motion");
    var singles = [
      ".problem h2", ".punch", ".center-head",
      ".how .eyebrow", ".how h2", ".how .note", ".how .shot",
      ".band-navy .eyebrow", ".band-navy h2", ".band-navy .lead",
      ".audit .eyebrow", ".audit h2", ".audit-example", ".audit .shot",
      ".ai-intro > div:first-child",
      ".contact .split > div",
      ".org-card", ".sell", ".reseller-cta",
      ".quote .eyebrow", ".quote h2", ".quote-lead", ".quote .wrap > [data-mail-panel]"
    ];
    var groups = [
      ".problem-grid", ".product-grid", ".steps", ".study-grid", ".verdicts",
      ".stat-row", ".audit-log", ".ai-points", ".role-grid",
      ".mini-grid", ".sell-grid", ".status-row", ".partner-grid", ".boundary",
      ".boundary-light .chips", ".boundary-dark .chips"
    ];
    var nodes = [];
    function addNode(el, index) {
      el.classList.add("rise");
      if (index > 0 && index < 8) el.classList.add("d" + index);
      nodes.push(el);
    }
    singles.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) { addNode(el, 0); });
    });
    groups.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (group) {
        Array.prototype.forEach.call(group.children, function (child, index) {
          if (child.nodeType === 1) addNode(child, index);
        });
      });
    });
    function shown(el) {
      var rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.9 && rect.bottom > 32;
    }
    var pending = [];
    nodes.forEach(function (el) {
      if (shown(el)) el.classList.add("is-in");
      else pending.push(el);
    });
    var thread = document.querySelector(".ai-thread");
    if (thread && shown(thread)) thread.classList.add("ai-play");
    if (!pending.length && (!thread || thread.classList.contains("ai-play"))) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target.classList.contains("ai-thread")) entry.target.classList.add("ai-play");
        else entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
    pending.forEach(function (el) { observer.observe(el); });
    if (thread && !thread.classList.contains("ai-play")) observer.observe(thread);
  }

  revealOnScroll();

  window.__auraMail = 2;
})();
