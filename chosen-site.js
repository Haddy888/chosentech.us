/* Chosen Technology public site behavior (HO-01 / HO-02 / lead shell from HO-04).
   Set WEBHOOK_URL before launch. Do not put an HMAC secret in this file.
   Signature must be added by your API, not the browser. */
(function () {
  var WEBHOOK_URL = "";
  var SOURCE = "chosentech-web-preview";

  var menuBtn = document.querySelector("[data-menu]");
  var nav = document.querySelector("[data-nav]");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var buttons = group.querySelectorAll("[role='tab']");
    var panels = group.querySelectorAll("[role='tabpanel']");
    buttons.forEach(function (btn, index) {
      btn.addEventListener("click", function () { activate(index); });
      btn.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
        if (next !== index) {
          event.preventDefault();
          buttons[next].focus();
          activate(next);
        }
      });
    });
    function activate(index) {
      buttons.forEach(function (btn, i) {
        var on = i === index;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel, i) {
        panel.hidden = i !== index;
      });
    }
  });

  document.querySelectorAll("[data-service-link]").forEach(function (link) {
    link.addEventListener("click", function () {
      var service = link.getAttribute("data-service-link");
      try { sessionStorage.setItem("ct-service", service); } catch (e) {}
    });
  });

  var serviceField = document.querySelector("[name='service_interest']");
  if (serviceField) {
    var params = new URLSearchParams(window.location.search);
    var preset = params.get("service");
    try { preset = preset || sessionStorage.getItem("ct-service"); } catch (e) {}
    if (preset) {
      Array.prototype.forEach.call(serviceField.options, function (opt) {
        if (opt.value === preset) serviceField.value = preset;
      });
    }
  }

  function queueFor(service) {
    var map = {
      "Managed IT Services": "queue:managed-it-sales",
      "Cybersecurity": "queue:secops-advisory",
      "Business Cellular & MDM": "queue:mobility-desk",
      "Nationwide Field Services": "queue:field-dispatch",
      "Cloud & Backup": "queue:managed-it-sales",
      "Complete Vendor Consolidation": "queue:managed-it-sales"
    };
    return map[service] || "queue:general-intake";
  }

  function utm() {
    var params = new URLSearchParams(window.location.search);
    return {
      page_url: window.location.href,
      utm_source: params.get("utm_source") || "direct",
      utm_medium: params.get("utm_medium") || "web",
      utm_campaign: params.get("utm_campaign") || ""
    };
  }

  function eventId() {
    return "evt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  async function postPayload(payload, statusEl) {
    if (!WEBHOOK_URL) {
      statusEl.className = "ok";
      statusEl.textContent = "Preview only: request captured in this browser. Set WEBHOOK_URL in chosen-site.js before launch. Nothing was sent to a CRM.";
      console.info("Chosen Technology payload (not delivered)", payload);
      return;
    }
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 5000);
    try {
      var res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!res.ok) throw new Error("Webhook returned " + res.status);
      statusEl.className = "ok";
      statusEl.textContent = "Request received. A specialist will follow up during business hours.";
    } catch (err) {
      statusEl.className = "err";
      statusEl.textContent = "We could not reach the intake service. Call 1 (833) 246-7363 or email info@chosentech.us.";
    } finally {
      clearTimeout(timer);
    }
  }

  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var statusEl = form.querySelector("[data-status]");
      if (form.company_website && form.company_website.value) return;
      var data = new FormData(form);
      var service = data.get("service_interest") || "";
      var payload = {
        event: "lead.created",
        event_id: eventId(),
        timestamp: new Date().toISOString(),
        source: SOURCE,
        routing_queue: queueFor(service),
        lead: {
          full_name: data.get("full_name"),
          email: data.get("email"),
          phone: data.get("phone") || "",
          company: data.get("company") || "",
          service_interest: service,
          device_tier: data.get("device_tier") || "",
          metro_area: data.get("metro_area") || "",
          request_gartner_briefing: data.get("gartner_briefing") === "yes",
          message: data.get("message")
        },
        telemetry: utm()
      };
      postPayload(payload, statusEl);
      form.reset();
    });
  });

  var applyDialog = document.querySelector("#apply-dialog");
  document.querySelectorAll("[data-apply]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!applyDialog) return;
      var role = btn.getAttribute("data-apply") || "";
      var roleField = applyDialog.querySelector("[name='target_position']");
      if (roleField && role) roleField.value = role;
      if (typeof applyDialog.showModal === "function") applyDialog.showModal();
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dialog = btn.closest("dialog");
      if (dialog) dialog.close();
    });
  });

  document.querySelectorAll("[data-apply-form]").forEach(function (form) {
    var fileInput = form.querySelector("input[type='file']");
    var fileNote = form.querySelector("[data-file-note]");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var okType = /\.(pdf|docx)$/i.test(file.name);
        var okSize = file.size <= 5242880;
        if (!okType || !okSize) {
          fileInput.value = "";
          if (fileNote) {
            fileNote.className = "err";
            fileNote.textContent = "Use a PDF or DOCX file, 5 MB or smaller. The file was not accepted.";
          }
          return;
        }
        if (fileNote) {
          fileNote.className = "form-note";
          fileNote.textContent = file.name + " selected (" + Math.ceil(file.size / 1024) + " KB). Scanning happens on the server after launch — this preview does not upload the file.";
        }
      });
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var statusEl = form.querySelector("[data-status]");
      if (form.company_website && form.company_website.value) return;
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!file) {
        statusEl.className = "err";
        statusEl.textContent = "Attach a PDF or DOCX resume, 5 MB or smaller.";
        return;
      }
      var data = new FormData(form);
      var payload = {
        event: "application.submitted",
        event_id: eventId(),
        timestamp: new Date().toISOString(),
        source: SOURCE,
        application: {
          full_name: data.get("full_name"),
          email: data.get("email"),
          phone: data.get("phone"),
          target_position: data.get("target_position"),
          metro_area: data.get("metro_area") || "",
          portfolio_url: data.get("portfolio_url") || "",
          resume_filename: file.name.replace(/[\\/\0]/g, ""),
          resume_bytes: file.size,
          resume_type: file.type || "unknown"
        },
        telemetry: utm(),
        scan_status: "NOT_UPLOADED_PREVIEW"
      };
      postPayload(payload, statusEl);
    });
  });

  var assistant = document.querySelector("[data-assistant]");
  var dismiss = document.querySelector("[data-dismiss-assistant]");
  if (assistant && dismiss) {
    try {
      if (sessionStorage.getItem("ct-assistant-off") === "1") assistant.hidden = true;
    } catch (e) {}
    dismiss.addEventListener("click", function () {
      assistant.hidden = true;
      try { sessionStorage.setItem("ct-assistant-off", "1"); } catch (e) {}
    });
  }
})();
