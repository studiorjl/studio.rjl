const navToggle = document.querySelector("[data-menu-toggle]");
const navLinks = document.querySelector("[data-nav-links]");
const enquiryToggle = document.querySelector("[data-enquiry-toggle]");
const enquiryPanel = document.querySelector("[data-enquiry-panel]");
const enquiryClose = document.querySelector("[data-enquiry-close]");
const form = document.querySelector("[data-enquiry-form]");
const thankYou = document.querySelector("[data-thank-you]");
const filter = document.querySelector("[data-filter]");
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
    element.textContent = "";
    element.classList.add("typing");

    function tick() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index += 1;
        const pause = text.charAt(index - 1) === "," ? 120 : speed + Math.floor(Math.random() * 22);
        window.setTimeout(tick, pause);
      } else {
        element.classList.remove("typing");
        resolve();
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
    "h1, h2, h3, p, details, iframe, select, .button, .project-card, .portfolio-card, .service-item, .shop-card, .about-image, .sitemap-list a"
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

if (enquiryToggle && enquiryPanel) {
  enquiryToggle.addEventListener("click", () => {
    enquiryPanel.classList.add("active");
    navLinks?.classList.remove("active");
  });
}

if (enquiryClose && enquiryPanel) {
  enquiryClose.addEventListener("click", () => {
    enquiryPanel.classList.remove("active");
  });
}

document.addEventListener("click", (event) => {
  if (!enquiryPanel || !enquiryToggle) return;
  if (enquiryPanel.contains(event.target) || enquiryToggle.contains(event.target)) return;
  enquiryPanel.classList.remove("active");
});

if (form && thankYou) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      form.hidden = true;
      thankYou.classList.add("visible");
    } else {
      window.alert("Something went wrong. Please try again.");
    }
  });
}

if (filter) {
  filter.addEventListener("change", () => {
    const value = filter.value;
    cards.forEach((card) => {
      card.hidden = value !== "all" && !card.dataset.tags.split(" ").includes(value);
    });
  });
}
