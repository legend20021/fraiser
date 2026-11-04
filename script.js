const splashScreen = document.querySelector("#splash-screen");
const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");
const primarySectionLinks = [...primaryNavigation.querySelectorAll('a[href^="#"]:not(.header-contact)')];
const primarySections = primarySectionLinks.map((link) => ({
  link,
  section: document.querySelector(link.getAttribute("href")),
}));
const mobileNavigationQuery = window.matchMedia("(max-width: 760px)");
const searchToggle = document.querySelector(".search-toggle");
const searchPanel = document.querySelector("#site-search");
const searchInput = document.querySelector("#search-input");
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const whatsappShortcut = document.querySelector(".whatsapp-float");
const whatsappPrompt = document.querySelector("#whatsapp-prompt");
const whatsappPromptClose = document.querySelector(".whatsapp-prompt__close");
const splashCacheKey = "fraiser-splash-last-shown";
const dialogReturnFocus = new WeakMap();

let splashTimeout;
let searchCloseTimeout;
let whatsappPromptTimeout;
let activeNavigationFrame;

function updateCurrentSection() {
  const activationLine = document.querySelector(".site-header").getBoundingClientRect().height + 24;
  let activeLink = primarySectionLinks[0];

  for (const { link, section } of primarySections) {
    if (section && section.getBoundingClientRect().top <= activationLine) {
      activeLink = link;
    } else {
      break;
    }
  }

  for (const link of primarySectionLinks) {
    if (link === activeLink) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function scheduleCurrentSectionUpdate() {
  if (activeNavigationFrame) return;

  activeNavigationFrame = window.requestAnimationFrame(() => {
    activeNavigationFrame = undefined;
    updateCurrentSection();
  });
}

function dismissSplash() {
  if (!splashScreen || !splashScreen.isConnected || splashScreen.classList.contains("is-dismissing")) return;
  window.clearTimeout(splashTimeout);
  splashScreen.classList.add("is-dismissing");
  window.setTimeout(() => splashScreen.remove(), 500);
}

if (splashScreen) {
  if (document.documentElement.classList.contains("splash-not-due")) {
    splashScreen.remove();
  } else {
    try {
      window.localStorage.setItem(splashCacheKey, String(Date.now()));
    } catch (error) {
      console.error("No se pudo guardar la fecha de bienvenida de FRAISER en el almacenamiento del navegador.", error);
    }

    splashTimeout = window.setTimeout(dismissSplash, 1850);
  }
}

function setMenuOpen(isOpen) {
  const expanded = mobileNavigationQuery.matches && isOpen;
  const hidden = mobileNavigationQuery.matches && !expanded;

  menuToggle.setAttribute("aria-expanded", String(expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Cerrar menú" : "Abrir menú");
  menuToggle.querySelector(".menu-toggle-label").textContent = expanded ? "Cerrar" : "Menú";
  primaryNavigation.classList.toggle("is-open", expanded);
  primaryNavigation.setAttribute("aria-hidden", String(hidden));
  primaryNavigation.inert = hidden;
}

setMenuOpen(false);
updateCurrentSection();

window.addEventListener("scroll", scheduleCurrentSectionUpdate, { passive: true });
window.addEventListener("resize", scheduleCurrentSectionUpdate);

menuToggle.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileNavigationQuery.addEventListener("change", () => setMenuOpen(false));

primaryNavigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.querySelectorAll(".service-guide a").forEach((link) => {
  link.addEventListener("click", () => {
    const target = document.querySelector(link.getAttribute("href"));
    if (target instanceof HTMLDetailsElement) target.open = true;
  });
});

function setSearchOpen(isOpen) {
  window.clearTimeout(searchCloseTimeout);
  searchToggle.setAttribute("aria-expanded", String(isOpen));
  searchToggle.setAttribute("aria-label", isOpen ? "Cerrar búsqueda" : "Abrir búsqueda");

  if (isOpen) {
    searchPanel.hidden = false;
    searchPanel.inert = false;
    searchPanel.removeAttribute("aria-hidden");
    window.requestAnimationFrame(() => {
      if (searchToggle.getAttribute("aria-expanded") === "true") {
        searchPanel.classList.add("is-open");
        searchInput.focus();
      }
    });
    setMenuOpen(false);
    return;
  }

  searchPanel.classList.remove("is-open");
  searchPanel.inert = true;
  searchPanel.setAttribute("aria-hidden", "true");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    searchPanel.hidden = true;
    return;
  }

  searchCloseTimeout = window.setTimeout(() => {
    if (searchToggle.getAttribute("aria-expanded") !== "true") searchPanel.hidden = true;
  }, 340);
}

searchToggle.addEventListener("click", () => {
  setSearchOpen(searchToggle.getAttribute("aria-expanded") !== "true");
});

function getSearchReturnTarget() {
  return mobileNavigationQuery.matches ? menuToggle : searchToggle;
}

function openLegalDialog(dialog, trigger) {
  if (dialog.open) return;

  dialogReturnFocus.set(dialog, trigger);
  dialog.showModal();
  dialog.querySelector(".legal-dialog-close").focus();
}

function closeLegalDialog(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;

  dialog.classList.add("is-closing");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dialog.close();
    return;
  }

  const closeAnimation = dialog.animate(
    [
      { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
      { opacity: 0, transform: "translate(-50%, calc(-50% + 0.6rem)) scale(0.99)" },
    ],
    { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  );
  closeAnimation.addEventListener("finish", () => {
    if (dialog.open) dialog.close();
  }, { once: true });
}

document.querySelectorAll(".legal-dialog").forEach((dialog) => {
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeLegalDialog(dialog);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeLegalDialog(dialog);
  });

  dialog.addEventListener("close", () => {
    dialog.classList.remove("is-closing");
    const trigger = dialogReturnFocus.get(dialog);
    const fallback = getSearchReturnTarget();
    const focusTarget = trigger?.isConnected && !trigger.closest("[hidden], [inert]")
      ? trigger
      : fallback;
    focusTarget.focus();
  });
});

document.querySelectorAll("[data-open-legal]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const dialog = document.getElementById(trigger.dataset.openLegal);
    if (!(dialog instanceof HTMLDialogElement)) {
      console.error(`No se encontró el aviso legal solicitado: ${trigger.dataset.openLegal}`);
      return;
    }
    openLegalDialog(dialog, trigger);
  });
});

document.querySelectorAll("[data-close-legal]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest(".legal-dialog");
    if (dialog instanceof HTMLDialogElement) closeLegalDialog(dialog);
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  if (!event.target.closest(".site-header") && mobileNavigationQuery.matches) {
    setMenuOpen(false);
  }

  if (!event.target.closest("#site-search, .search-toggle") && !searchPanel.hidden) {
    setSearchOpen(false);
  }

  const link = event.target.closest('a[href^="#"]');
  if (!link || link.hash.length < 2 || event.defaultPrevented) return;

  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (target instanceof HTMLDialogElement) {
    event.preventDefault();
    openLegalDialog(target, getSearchReturnTarget());
    return;
  }

  setSearchOpen(false);
  setMenuOpen(false);
  if (target instanceof HTMLDetailsElement) target.open = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const activeDialog = document.querySelector(".legal-dialog[open]");
  if (activeDialog instanceof HTMLDialogElement) {
    event.preventDefault();
    closeLegalDialog(activeDialog);
    return;
  }

  const searchWasOpen = !searchPanel.hidden;
  setSearchOpen(false);
  if (searchWasOpen) getSearchReturnTarget().focus();
  if (menuToggle.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const subject = encodeURIComponent(`Consulta desde la web de FRAISER: ${formData.get("name")}`);
  const body = encodeURIComponent(
    `Nombre: ${formData.get("name")}\nCorreo: ${formData.get("email")}\n\nMensaje:\n${formData.get("message")}`,
  );
  formStatus.textContent = "Abriendo tu aplicación de correo. El mensaje no se envía desde esta página.";
  window.location.href = `mailto:fraiserinnovation@gmail.com?subject=${subject}&body=${body}`;
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());

function scheduleWhatsAppPrompt() {
  if (document.visibilityState !== "visible" || !whatsappPrompt.hidden || whatsappPromptTimeout) return;

  const delay = 60_000 + Math.random() * 30_000;
  whatsappPromptTimeout = window.setTimeout(() => {
    whatsappPromptTimeout = undefined;
    if (document.visibilityState !== "visible") return;
    whatsappPrompt.classList.remove("is-dismissing");
    whatsappPrompt.hidden = false;
    window.requestAnimationFrame(() => {
      whatsappPrompt.classList.add("is-visible");
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        whatsappShortcut.classList.add("is-alerting");
        window.setTimeout(() => whatsappShortcut.classList.remove("is-alerting"), 480);
        if (typeof navigator.vibrate === "function") navigator.vibrate(70);
      }
    });
  }, delay);
}

function dismissWhatsAppPrompt(returnFocus = false) {
  if (whatsappPrompt.hidden || whatsappPrompt.classList.contains("is-dismissing")) return;

  whatsappPrompt.classList.add("is-dismissing");
  whatsappPrompt.classList.remove("is-visible");
  window.setTimeout(() => {
    whatsappPrompt.hidden = true;
    scheduleWhatsAppPrompt();
  }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);

  if (returnFocus) whatsappShortcut.focus();
}

whatsappPromptClose.addEventListener("click", () => dismissWhatsAppPrompt(true));
whatsappPrompt.querySelector(".whatsapp-prompt__link").addEventListener("click", () => dismissWhatsAppPrompt());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    window.clearTimeout(whatsappPromptTimeout);
    whatsappPromptTimeout = undefined;
    return;
  }

  scheduleWhatsAppPrompt();
});
scheduleWhatsAppPrompt();

if (whatsappShortcut) {
  whatsappShortcut.addEventListener("click", () => dismissWhatsAppPrompt());
}

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealTargets = document.querySelectorAll([
    ".about-grid > *",
    ".section-heading > *",
    ".visual-notes-heading",
    ".visual-note-grid",
    ".references-heading",
    ".reference-register",
    ".reference-note",
    ".reading-heading > *",
    ".editorial-plate",
    ".article-entry",
    ".contact-copy",
    ".contact-form",
  ].join(", "));

  if (revealTargets.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    revealTargets.forEach((target) => {
      target.setAttribute("data-reveal", "");
      revealObserver.observe(target);
    });
    document.documentElement.classList.add("motion-ready");
  }
}
