const navToggle = document.querySelector("[data-menu-toggle]");
const navLinks = document.querySelector("[data-nav-links]");
const enquiryToggles = document.querySelectorAll("[data-enquiry-toggle]");
const enquiryPanel = document.querySelector("[data-enquiry-panel]");
const enquiryClose = document.querySelector("[data-enquiry-close]");
const form = document.querySelector("[data-enquiry-form]");
const thankYou = document.querySelector("[data-thank-you]");
const cards = document.querySelectorAll("[data-tags]");
const cursor = document.querySelector(".cursor");
const typingTargets = document.querySelectorAll("[data-type-text]");
const darkCursorZones = document.querySelectorAll("footer, .dark-band");

document.addEventListener("contextmenu", (event) => event.preventDefault());

document.querySelectorAll("img").forEach((image) => {
  image.setAttribute("draggable", "false");
  image.addEventListener("dragstart", (event) => event.preventDefault());
});

if (cursor) {
  document.addEventListener("mousemove", (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.add("visible");
  });

  document.querySelectorAll("a, button, input, select, textarea, summary").forEach((element) => {
    element.addEventListener("mouseenter", () => cursor.classList.add("link-hover"));
    element.addEventListener("mouseleave", () => cursor.classList.remove("link-hover"));
  });

  darkCursorZones.forEach((zone) => {
    zone.addEventListener("mouseenter", () => cursor.classList.add("on-dark"));
    zone.addEventListener("mouseleave", () => cursor.classList.remove("on-dark"));
  });
}

function typeText(element, text, speed = 48) {
  return new Promise((resolve) => {
    let index = 0;
    const cursorType = element.dataset.typeCursor;
    const linger = Number(element.dataset.typeLinger) || 0;
    element.textContent = "";
    element.classList.add("typing");
    if (cursorType === "pilcrow") element.classList.add("typing-pilcrow");

    function tick() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index += 1;
        const pause = text.charAt(index - 1) === "," ? 120 : speed + Math.floor(Math.random() * 22);
        window.setTimeout(tick, pause);
      } else {
        window.setTimeout(() => {
          element.classList.remove("typing", "typing-pilcrow");
          resolve();
        }, linger);
      }
    }

    tick();
  });
}

async function runTyping() {
  await new Promise((resolve) => window.setTimeout(resolve, 760));
  for (const element of typingTargets) {
    await typeText(element, element.dataset.typeText || "", Number(element.dataset.typeSpeed) || 48);
  }
}

if (typingTargets.length) {
  runTyping();
}

const sequentialGroups = document.querySelectorAll("main section, .page-header, .article-body, footer");

sequentialGroups.forEach((group) => {
  const elements = group.querySelectorAll(
    "h1, h2, h3, p, details, iframe, select, .button, .project-card, .portfolio-card, .editorial-card, .service-item, .shop-card, .about-image, .sitemap-list a"
  );
  let delayIndex = 0;

  elements.forEach((element) => {
    if (element.closest(".hero") || element.matches("[data-type-text]") || element.closest("[data-type-text]")) return;
    if (!element.classList.contains("reveal")) element.classList.add("reveal");
    element.style.setProperty("--arrival-delay", `${Math.min(delayIndex * 70, 420)}ms`);
    delayIndex += 1;
  });
});

const revealTargets = document.querySelectorAll(".reveal");

if (revealTargets.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealTargets.forEach((target) => observer.observe(target));
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
    navToggle.setAttribute("aria-expanded", navLinks.classList.contains("active") ? "true" : "false");
  });
}

// ---- GA4: enquiry + booking behaviour events ----
function track(name, params) {
  if (typeof gtag === "function") gtag("event", name, params || {});
}

let enquiryOpenedAt = null;
let budgetTracked = false;

// private portfolio copy (studiorjl.com/portfolio/) — the link Rebekah sends to
// employers. every view fires employer_portfolio_view so she can see when it is
// opened; /portfolio/property/ stays excluded (property pitch clients, not employers).
if (/^\/portfolio(\/|$)/.test(location.pathname) && !/^\/portfolio\/property(\/|$)/.test(location.pathname)) {
  track("employer_portfolio_view", { entry_referrer: document.referrer || "(direct)" });
}

function enquirySeconds() {
  return enquiryOpenedAt ? Math.round((Date.now() - enquiryOpenedAt) / 1000) : 0;
}

function stopEnquiryTimer() {
  const seconds = enquirySeconds();
  enquiryOpenedAt = null;
  return seconds;
}

function closeEnquiryPanel(method) {
  if (!enquiryPanel.classList.contains("active")) return;
  enquiryPanel.classList.remove("active");
  document.querySelectorAll("[data-enquiry-bloom]").forEach((element) => element.classList.remove("bloomed"));
  if (enquiryOpenedAt) {
    track("enquiry_panel_close", { close_method: method, enquiry_panel_seconds: stopEnquiryTimer() });
  }
}

if (enquiryToggles.length && enquiryPanel) {
  enquiryToggles.forEach((enquiryToggle) => enquiryToggle.addEventListener("click", () => {
    enquiryPanel.classList.add("active");
    if (enquiryToggle.hasAttribute("data-enquiry-bloom")) enquiryToggle.classList.add("bloomed");
    navLinks?.classList.remove("active");
    if (!enquiryOpenedAt) {
      enquiryOpenedAt = Date.now();
      budgetTracked = false;
      track("enquiry_panel_open");
    }
  }));
}

// budget "range" field — first interaction per panel open
document.querySelectorAll('[data-enquiry-form] input[name="range"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked || budgetTracked) return;
    budgetTracked = true;
    track("enquiry_budget_selected", { budget_option_selected: input.value });
  });
});

if (enquiryClose && enquiryPanel) {
  enquiryClose.addEventListener("click", () => closeEnquiryPanel("close_button"));
}

document.addEventListener("click", (event) => {
  if (!enquiryPanel) return;
  const clickedToggle = [...enquiryToggles].some((enquiryToggle) => enquiryToggle.contains(event.target));
  if (enquiryPanel.contains(event.target) || clickedToggle) return;
  closeEnquiryPanel("outside_click");
});

if (form && thankYou) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      company: data.get("company"),
      email: data.get("email"),
      phone: data.get("phone"),
      location: data.get("location"),
      services: data.getAll("service[]"),
      range: data.get("range"),
      website: data.get("website"),
      message: data.get("message")
    };

    try {
      const response = await fetch(
        "https://rjl-publisher-insights-agent-a07f3048.base44.app/functions/submitEnquiry",
        {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "Content-Type": "application/json", Accept: "application/json" }
        }
      );
      const result = await response.json().catch(() => ({}));
      const submitParams = {
        submit_status: response.ok && result.ok ? "success" : "error",
        budget_option_selected: data.get("range") || "not selected",
        enquiry_panel_seconds: stopEnquiryTimer()
      };
      track("enquiry_form_submit", submitParams);
      if (response.ok && result.ok) {
        form.hidden = true;
        thankYou.classList.add("visible");
      } else {
        window.alert("hmm — something went sideways. please try again, or write to hello@studiorjl.com.");
      }
    } catch (error) {
      track("enquiry_form_submit", {
        submit_status: "error",
        budget_option_selected: data.get("range") || "not selected",
        enquiry_panel_seconds: stopEnquiryTimer()
      });
      window.alert("hmm — something went sideways. please try again, or write to hello@studiorjl.com.");
    }
  });
}

const filterPanel = document.querySelector("[data-filter-panel]");
if (filterPanel) {
  const filterLabel = filterPanel.querySelector("[data-filter-label]");
  const filterInputs = [...filterPanel.querySelectorAll(".service-options input")];
  const applyFilter = () => {
    const selected = filterInputs.filter((input) => input.checked);
    if (filterLabel) {
      if (!selected.length) filterLabel.textContent = "all projects";
      else if (selected.length === 1) filterLabel.textContent = selected[0].dataset.label || selected[0].value;
      else filterLabel.textContent = `${selected.length} selected`;
    }
    const values = selected.map((input) => input.value);
    cards.forEach((card) => {
      const tags = card.dataset.tags.split(" ");
      card.hidden = values.length > 0 && !values.some((value) => tags.includes(value));
    });
  };
  filterInputs.forEach((input) => {
    input.addEventListener("change", () => {
      applyFilter();
      if (input.checked && filterInputs.filter((i) => i.checked).length === filterInputs.length) {
        filterInputs.forEach((i) => (i.checked = false));
        applyFilter();
      }
    });
  });
}


// ---- GA4: bookings page behaviour ----
const bookingFrame = document.querySelector(".booking-frame");
if (bookingFrame) {
  const loadedAt = Date.now();
  let calendarSeen = false;
  let dwellSent = false;

  if ("IntersectionObserver" in window) {
    const calendarObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !calendarSeen) {
            calendarSeen = true;
            track("bookings_calendar_view", {
              seconds_since_page_load: Math.round((Date.now() - loadedAt) / 1000)
            });
            calendarObserver.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    calendarObserver.observe(bookingFrame);
  }

  const sendDwell = () => {
    if (dwellSent) return;
    dwellSent = true;
    track("bookings_page_leave", {
      bookings_page_seconds: Math.round((Date.now() - loadedAt) / 1000),
      saw_calendar: calendarSeen
    });
  };
  window.addEventListener("pagehide", sendDwell);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendDwell();
  });
}
