import { portfolioData } from "./content.js";

const STORAGE_KEYS = {
  notes: "varun-portfolio-notes",
  theme: "varun-portfolio-theme",
  wallpaper: "varun-portfolio-wallpaper",
  reactionBest: "varun-portfolio-reaction-best"
};

const apps = [
  { id: "launcher", title: "App Launcher", glyph: "OS", defaultSize: { w: 600, h: 480 }, desktop: false },
  { id: "about", title: "About", glyph: "A", defaultSize: { w: 540, h: 480 }, desktop: true },
  { id: "experience", title: "Certifications", glyph: "CT", defaultSize: { w: 640, h: 540 }, desktop: true },
  { id: "projects", title: "Projects", glyph: "PX", defaultSize: { w: 680, h: 520 }, desktop: true },
  { id: "skills", title: "Skills", glyph: "SK", defaultSize: { w: 520, h: 500 }, desktop: true },
  { id: "education", title: "Education", glyph: "BT", defaultSize: { w: 500, h: 440 }, desktop: false },
  { id: "resume", title: "Resume", glyph: "CV", defaultSize: { w: 480, h: 430 }, desktop: false },
  { id: "contact", title: "Contact", glyph: "@", defaultSize: { w: 520, h: 500 }, desktop: true },
  { id: "terminal", title: "Terminal", glyph: ">", defaultSize: { w: 620, h: 420 }, desktop: true },
  { id: "notes", title: "Notes", glyph: "N", defaultSize: { w: 460, h: 440 }, desktop: false },
  { id: "browser", title: "Browser", glyph: "WB", defaultSize: { w: 700, h: 500 }, desktop: false },
  { id: "settings", title: "Settings", glyph: "S", defaultSize: { w: 430, h: 460 }, desktop: false },
  { id: "arcade", title: "Arcade", glyph: "RX", defaultSize: { w: 420, h: 360 }, desktop: false }
];

const appMap = new Map(apps.map((app) => [app.id, app]));

const state = {
  windows: [],
  activeWindowId: null,
  maxZ: 20,
  notes: loadValue(STORAGE_KEYS.notes, portfolioData.notesSeed),
  themeId: loadValue(STORAGE_KEYS.theme, portfolioData.themes[0].id),
  wallpaperId: loadValue(STORAGE_KEYS.wallpaper, portfolioData.wallpapers[0].id),
  bootDone: false,
  controlCenterOpen: false,
  toasts: [],
  terminalHistory: [
    `Welcome to ${portfolioData.profile.name}'s portfolio shell.`,
    portfolioData.commands.help
  ],
  reaction: {
    status: "idle",
    best: Number(loadValue(STORAGE_KEYS.reactionBest, "0")) || 0,
    startedAt: 0,
    timeoutId: null,
    lastResult: 0
  }
};

const elements = {
  body: document.body,
  bootScreen: document.getElementById("boot-screen"),
  bootTitle: document.getElementById("boot-title"),
  bootCopy: document.getElementById("boot-copy"),
  bootProgressBar: document.getElementById("boot-progress-bar"),
  bootProgressLabel: document.getElementById("boot-progress-label"),
  skipBootButton: document.getElementById("skip-boot-button"),
  lockScreen: document.getElementById("lock-screen"),
  lockGreeting: document.getElementById("lock-greeting"),
  lockAvatar: document.getElementById("lock-avatar"),
  lockCopy: document.getElementById("lock-copy"),
  lockTime: document.getElementById("lock-time"),
  lockDate: document.getElementById("lock-date"),
  enterDesktopButton: document.getElementById("enter-desktop-button"),
  desktop: document.getElementById("desktop"),
  desktopIcons: document.getElementById("desktop-icons"),
  windowStage: document.getElementById("window-stage"),
  controlCenter: document.getElementById("control-center"),
  controlCenterButton: document.getElementById("control-center-button"),
  toastStack: document.getElementById("toast-stack"),
  brandName: document.getElementById("brand-name"),
  brandPill: document.getElementById("brand-pill"),
  statusLabel: document.getElementById("status-label"),
  desktopTime: document.getElementById("desktop-time"),
  desktopDay: document.getElementById("desktop-day"),
  topBarMenus: document.getElementById("top-bar-menus"),
  desktopWidgets: document.getElementById("desktop-widgets"),
  spotlightOverlay: document.getElementById("spotlight-overlay"),
  spotlightInput: document.getElementById("spotlight-input"),
  spotlightResults: document.getElementById("spotlight-results"),
  spotlightButton: document.getElementById("spotlight-button")
};

init();

function init() {
  if (!portfolioData.themes.some((theme) => theme.id === state.themeId)) {
    state.themeId = portfolioData.themes[0].id;
    saveValue(STORAGE_KEYS.theme, state.themeId);
  }

  if (!portfolioData.wallpapers.some((wallpaper) => wallpaper.id === state.wallpaperId)) {
    state.wallpaperId = portfolioData.wallpapers[0].id;
    saveValue(STORAGE_KEYS.wallpaper, state.wallpaperId);
  }

  document.title = portfolioData.meta.siteTitle;
  elements.brandName.textContent = `${portfolioData.profile.name} OS`;
  elements.lockGreeting.textContent = portfolioData.profile.name;
  if (portfolioData.profile.avatar) {
    elements.lockAvatar.innerHTML = `<img src="${portfolioData.profile.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />`;
    elements.lockAvatar.style.overflow = "hidden";
  } else {
    elements.lockAvatar.textContent = portfolioData.profile.name.slice(0, 1).toUpperCase();
  }
  elements.lockCopy.textContent = portfolioData.profile.tagline;
  elements.bootTitle.textContent = `Waking up ${portfolioData.profile.name}'s workspace`;
  applyTheme();
  applyWallpaper();
  renderDesktopIcons();
  renderControlCenter();
  renderDesktopWidgets();
  initSpotlight();
  renderToasts();
  bindEvents();
  updateClock();
  window.setInterval(updateClock, 1000);
  startBootSequence();
}

function bindEvents() {
  elements.skipBootButton.addEventListener("click", finishBootSequence);
  elements.enterDesktopButton.addEventListener("click", enterDesktop);
  elements.controlCenterButton.addEventListener("click", toggleControlCenter);
  elements.brandPill.addEventListener("click", () => openWindow("launcher"));
  
  if (elements.spotlightButton) {
    elements.spotlightButton.addEventListener("click", toggleSpotlight);
  }

  document.querySelectorAll("[data-open-app]").forEach((button) => {
    button.addEventListener("click", () => openWindow(button.dataset.openApp));
  });

  document.addEventListener("keydown", (event) => {
    if (elements.desktop.classList.contains("hidden")) {
      if (event.key === "Enter" && !elements.lockScreen.classList.contains("hidden")) {
        enterDesktop();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      toggleSpotlight();
      return;
    }

    if (event.key === "Escape") {
      if (state.controlCenterOpen) {
        state.controlCenterOpen = false;
        renderControlCenter();
      } else if (!elements.spotlightOverlay.classList.contains("hidden")) {
        toggleSpotlight();
      }
    }
  });

  document.addEventListener("click", (event) => {
    if (
      state.controlCenterOpen &&
      !elements.controlCenter.contains(event.target) &&
      event.target !== elements.controlCenterButton
    ) {
      state.controlCenterOpen = false;
      renderControlCenter();
    }
  });

  window.addEventListener("resize", () => {
    clampWindowsToViewport();
    renderWindows();
  });
}

function startBootSequence() {
  let progress = 0;
  let lineIndex = 0;
  elements.bootCopy.textContent = portfolioData.bootLines[0];

  const intervalId = window.setInterval(() => {
    progress = Math.min(100, progress + Math.round(Math.random() * 12 + 6));
    lineIndex = Math.min(
      portfolioData.bootLines.length - 1,
      Math.floor((progress / 100) * portfolioData.bootLines.length)
    );

    elements.bootProgressBar.style.width = `${progress}%`;
    elements.bootProgressLabel.textContent = `${progress}%`;
    elements.bootCopy.textContent = portfolioData.bootLines[lineIndex];

    if (progress >= 100) {
      window.clearInterval(intervalId);
      window.setTimeout(finishBootSequence, 450);
    }
  }, 260);
}

function finishBootSequence() {
  if (state.bootDone) {
    return;
  }

  state.bootDone = true;
  elements.bootScreen.classList.add("hidden");
  elements.lockScreen.classList.remove("hidden");
  pushToast("System ready. Unlock to continue.");
}

function enterDesktop() {
  elements.lockScreen.classList.add("hidden");
  elements.desktop.classList.remove("hidden");
  state.controlCenterOpen = false;
  renderControlCenter();
  pushToast("Desktop unlocked.");
}

function updateClock() {
  const now = new Date();
  const timeText = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  const dateText = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  const dayText = now.toLocaleDateString([], { weekday: "short" });

  elements.lockTime.textContent = timeText;
  elements.lockDate.textContent = dateText;
  elements.desktopTime.textContent = timeText;
  elements.desktopDay.textContent = dayText;

  const widgetTime = document.getElementById("widget-time");
  if (widgetTime) widgetTime.textContent = timeText;
  const widgetDate = document.getElementById("widget-date");
  if (widgetDate) widgetDate.textContent = dateText;
  
  const cpuFill = document.getElementById("cpu-fill");
  if (cpuFill) cpuFill.style.width = `${Math.floor(Math.random() * 40) + 10}%`;
  const ramFill = document.getElementById("ram-fill");
  if (ramFill) ramFill.style.width = `${Math.floor(Math.random() * 15) + 40}%`;
}

function renderDesktopIcons() {
  const desktopApps = apps;
  elements.desktopIcons.innerHTML = desktopApps
    .map(
      (app) => `
        <button class="desktop-icon" data-app-id="${app.id}" type="button">
          <span class="app-tile app-${app.id}">${app.glyph}</span>
          <span class="desktop-icon-label">${app.title}</span>
        </button>
      `
    )
    .join("");

  elements.desktopIcons.querySelectorAll(".desktop-icon").forEach((button) => {
    button.addEventListener("click", () => openWindow(button.dataset.appId));
    button.addEventListener("click", () => {
      elements.statusLabel.textContent = `${appMap.get(button.dataset.appId).title} selected`;
    });
  });
}



function openWindow(appId) {
  const app = appMap.get(appId);
  if (!app) {
    return;
  }

  const existingWindow = state.windows.find((windowItem) => windowItem.id === appId);
  if (existingWindow) {
    existingWindow.minimized = false;
    focusWindow(appId);
    renderWindows();
    return;
  }

  const rect = createInitialRect(app.defaultSize);
  state.windows.push({
    id: appId,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    z: ++state.maxZ,
    minimized: false,
    maximized: false,
    previousRect: null
  });
  state.activeWindowId = appId;
  renderWindows();
}

function createInitialRect(defaultSize) {
  const offsetIndex = state.windows.length;
  const safeWidth = Math.min(defaultSize.w, window.innerWidth - 32);
  const safeHeight = Math.min(defaultSize.h, window.innerHeight - 150);

  if (window.innerWidth < 860) {
    return {
      x: 12,
      y: 72,
      w: window.innerWidth - 24,
      h: Math.max(320, window.innerHeight - 168)
    };
  }

  return {
    x: 82 + (offsetIndex * 28) % 220,
    y: 92 + (offsetIndex * 24) % 160,
    w: safeWidth,
    h: safeHeight
  };
}

function renderWindows() {
  const visibleWindows = state.windows
    .filter((windowItem) => !windowItem.minimized)
    .sort((left, right) => left.z - right.z);

  elements.windowStage.innerHTML = visibleWindows
    .map((windowItem) => {
      const app = appMap.get(windowItem.id);
      const isActive = state.activeWindowId === windowItem.id;
      const style = windowStyle(windowItem);

      return `
        <article
          class="window ${isActive ? "is-active" : ""} ${windowItem.maximized || window.innerWidth < 860 ? "is-maximized" : ""}"
          data-window-id="${windowItem.id}"
          style="${style}"
        >
          <header class="window-header" data-drag-handle="${windowItem.id}">
            <div class="window-controls">
              <button class="window-control danger" data-window-action="close" data-window-id="${windowItem.id}" type="button"></button>
              <button class="window-control warn" data-window-action="minimize" data-window-id="${windowItem.id}" type="button"></button>
              <button class="window-control ok" data-window-action="maximize" data-window-id="${windowItem.id}" type="button"></button>
            </div>
            <div class="window-title-wrap">
              <span class="app-tile mini app-${windowItem.id}">${app.glyph}</span>
              <div>
                <p class="window-title">${app.title}</p>
                <p class="window-subtitle">${windowSubtitle(windowItem.id)}</p>
              </div>
            </div>
          </header>
          <div class="window-body">${renderWindowBody(windowItem.id)}</div>
          <div class="resize-handle" data-resize-handle="${windowItem.id}"></div>
        </article>
      `;
    })
    .join("");

  wireWindowActions();
  wireWindowSpecificContent();
  syncWindowLayers();
  renderTopBarMenus();
}

function windowStyle(windowItem) {
  if (window.innerWidth < 860 || windowItem.maximized) {
    return `left: 12px; top: 72px; width: calc(100vw - 24px); height: calc(100vh - 154px); z-index: ${windowItem.z}`;
  }

  return `left: ${windowItem.x}px; top: ${windowItem.y}px; width: ${windowItem.w}px; height: ${windowItem.h}px; z-index: ${windowItem.z}`;
}

function windowSubtitle(appId) {
  switch (appId) {
    case "launcher":
      return "All Applications";
    case "about":
      return portfolioData.profile.role;
    case "experience":
      return "Credentials and learning path";
    case "projects":
      return "Case studies and showcase builds";
    case "terminal":
      return "Command palette";
    case "settings":
      return "Theme and wallpaper controls";
    default:
      return "Portfolio app";
  }
}

function renderWindowBody(appId) {
  switch (appId) {
    case "launcher":
      return renderLauncherApp();
    case "about":
      return renderAboutApp();
    case "experience":
      return renderExperienceApp();
    case "projects":
      return renderProjectsApp();
    case "skills":
      return renderSkillsApp();
    case "education":
      return renderEducationApp();
    case "resume":
      return renderResumeApp();
    case "contact":
      return renderContactApp();
    case "terminal":
      return renderTerminalApp();
    case "notes":
      return renderNotesApp();
    case "browser":
      return renderBrowserApp();
    case "settings":
      return renderSettingsApp();
    case "arcade":
      return renderArcadeApp();
    default:
      return "<p>App not found.</p>";
  }
}

function renderLauncherApp() {
  return `
    <section class="pane hero-pane" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 24px;">
      <div class="hero-copy">
        <div class="eyebrow" style="margin-bottom: 8px;">System</div>
        <h2>App Launcher</h2>
        <p class="muted-copy">Select an application to launch.</p>
      </div>
    </section>
    <section class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 24px; padding: 24px;">
      ${apps
        .filter((app) => app.id !== "launcher")
        .map(
          (app) => `
            <button class="stat-card glass-card launcher-item" data-open-app="${app.id}" type="button" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 1px solid rgba(255, 255, 255, 0.05); transition: transform 0.2s, border-color 0.2s;">
              <span class="app-tile app-${app.id}" style="width: 56px; height: 56px; font-size: 1.2rem;">${app.glyph}</span>
              <span class="stat-label" style="text-align: center; color: var(--text);">${app.title}</span>
            </button>
          `
        )
        .join("")}
    </section>
  `;
}

function renderAboutApp() {
  return `
    <section class="pane hero-pane">
      <div class="hero-copy">
        <div class="eyebrow">Profile Snapshot</div>
        <h2>${portfolioData.profile.name}</h2>
        <p class="hero-role">${portfolioData.profile.role}</p>
        <p class="hero-tagline">${portfolioData.profile.tagline}</p>
        <p class="muted-copy">${portfolioData.profile.intro}</p>
      </div>
      <div class="hero-card glass-card">
        <div class="hero-orb" style="${portfolioData.profile.avatar ? 'overflow:hidden;' : ''}">
          ${portfolioData.profile.avatar ? `<img src="${portfolioData.profile.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />` : portfolioData.profile.name.slice(0, 1)}
        </div>
        <p class="hero-card-title">Status</p>
        <p class="hero-card-copy">${portfolioData.meta.availability}</p>
        <p class="muted-copy">${portfolioData.profile.shortBio}</p>
        <a class="ghost-button" href="${portfolioData.meta.linkedIn}" target="_blank" rel="noreferrer">
          Open LinkedIn
        </a>
      </div>
    </section>

    <section class="stats-grid">
      ${portfolioData.stats
        .map(
          (stat) => `
            <article class="stat-card glass-card">
              <span class="stat-value">${stat.value}</span>
              <span class="stat-label">${stat.label}</span>
            </article>
          `
        )
        .join("")}
    </section>

    <section class="two-column-grid">
      <article class="content-card glass-card">
        <p class="section-label">About</p>
        ${portfolioData.about.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      </article>
      <article class="content-card glass-card">
        <p class="section-label">Quick Notes</p>
        <ul class="fact-list">
          ${portfolioData.quickFacts.map((fact) => `<li>${fact}</li>`).join("")}
        </ul>
      </article>
    </section>
  `;
}

function renderExperienceApp() {
  return `
    <section class="stack">
      <article class="content-card glass-card">
        <p class="section-label">Learning Path</p>
        <h3>Cybersecurity certifications and hands-on growth</h3>
        <p>${portfolioData.profile.intro}</p>
        <div class="tech-row">
          <span class="tech-pill">Cybersecurity</span>
          <span class="tech-pill">Ethical Hacking</span>
          <span class="tech-pill">Linux</span>
          <span class="tech-pill">SQL</span>
          <span class="tech-pill">Python Automation</span>
        </div>
      </article>

      ${portfolioData.experiences
        .map(
          (item) => `
            <article class="timeline-card glass-card">
              <div class="timeline-header">
                <div>
                  <h3>${item.title}</h3>
                  <p class="muted-copy">${item.company}</p>
                </div>
                <span class="chip">${item.period}</span>
              </div>
              <p>${item.summary}</p>
              <ul class="fact-list">
                ${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
              </ul>
            </article>
          `
        )
        .join("")}

      <section class="cert-grid">
        ${portfolioData.certifications
          .map(
            (certification) => `
              <article class="cert-card glass-card">
                <p class="section-label">${certification.issuer}</p>
                <h3>${certification.name}</h3>
                <p class="muted-copy">Issued ${certification.issued}</p>
                <p class="credential-id">Credential ID: ${certification.id}</p>
              </article>
            `
          )
          .join("")}
      </section>
    </section>
  `;
}

function renderProjectsApp() {
  return `
    <section class="project-grid">
      ${portfolioData.projects
        .map(
          (project) => `
            <article class="project-card glass-card">
              <div class="project-topline">
                <p class="section-label">${project.result}</p>
                <span class="chip">${project.duration}</span>
              </div>
              <h3>${project.name}</h3>
              <p class="muted-copy">${project.affiliation}</p>
              <p>${project.blurb}</p>
              <p class="project-role">${project.role}</p>
              <ul class="fact-list">
                ${project.highlights.map((item) => `<li>${item}</li>`).join("")}
              </ul>
              <div class="project-footer">
                ${
                  project.link
                    ? `<a class="ghost-button small" href="${project.link}" target="_blank" rel="noreferrer">${project.label}</a>`
                    : `<span class="chip subtle">${project.label}</span>`
                }
              </div>
              <div class="tech-row">
                ${project.tech.map((tech) => `<span class="tech-pill">${tech}</span>`).join("")}
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderSkillsApp() {
  return `
    <section class="stack">
      <article class="content-card glass-card">
        <p class="section-label">Skill Focus</p>
        <h3>Security fundamentals first, then practical depth</h3>
        <p>
          Your certifications point to a strong early foundation in cybersecurity, networking, Linux, SQL,
          detection and response, and Python-based automation. This window turns that pathway into a cleaner
          recruiter-facing snapshot.
        </p>
      </article>

      <section class="skills-grid">
      ${Object.entries(portfolioData.skills)
        .map(
          ([category, items]) => `
            <article class="skill-card glass-card">
              <h3>${category}</h3>
              <div class="skill-list">
                ${items.map((item) => `<span class="tech-pill">${item}</span>`).join("")}
              </div>
            </article>
          `
        )
        .join("")}
      </section>
    </section>
  `;
}

function renderEducationApp() {
  return `
    <section class="stack">
      ${portfolioData.education
        .map(
          (item) => `
            <article class="content-card glass-card">
              <div class="timeline-header">
                <div>
                  <h3>${item.title}</h3>
                  <p class="muted-copy">${item.school}</p>
                </div>
                <span class="chip">${item.period}</span>
              </div>
              <ul class="fact-list">
                ${item.notes.map((note) => `<li>${note}</li>`).join("")}
              </ul>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderResumeApp() {
  const emailAction = portfolioData.meta.email
    ? `<a class="ghost-button" href="mailto:${portfolioData.meta.email}">Email me</a>`
    : `<button class="ghost-button" data-toast="Add your email in content.js to enable direct outreach." type="button">Enable email</button>`;

  return `
    <section class="stack">
      <article class="content-card glass-card">
        <p class="section-label">Resume Snapshot</p>
        <h3>Cybersecurity learner profile</h3>
        <p>
          The resume window now reflects your current cybersecurity direction. A starter text resume is included
          so the portfolio stays complete until you replace it with your final PDF.
        </p>
        <div class="button-row">
          <a class="primary-button inline-button" href="${portfolioData.meta.resumeFile}" download>
            Download starter resume
          </a>
          ${emailAction}
        </div>
      </article>
      <article class="content-card glass-card">
        <p class="section-label">Current Highlights</p>
        <ul class="fact-list">
          <li>BTech Computer Science student focused on cybersecurity and ethical hacking.</li>
          <li>11 certifications across Google Cybersecurity and TryHackMe.</li>
          <li>Hands-on project work across IoT systems, AI concepts, and web implementation.</li>
        </ul>
      </article>
    </section>
  `;
}

function renderContactApp() {
  const directLink = portfolioData.meta.email
    ? `mailto:${portfolioData.meta.email}`
    : portfolioData.meta.linkedIn;

  const directLabel = portfolioData.meta.email ? "Send email" : "Message on LinkedIn";

  return `
    <section class="stack">
      <article class="contact-card glass-card">
        <div>
          <p class="section-label">Reach Out</p>
          <h3>Let's build something sharp.</h3>
          <p>
            This form currently routes through the browser as a lightweight client-side setup. Add your email in
            <code>content.js</code> for a direct mail flow.
          </p>
        </div>
        <a class="primary-button inline-button" href="${directLink}" target="_blank" rel="noreferrer">
          ${directLabel}
        </a>
      </article>

      <form class="contact-form glass-card" id="contact-form">
        <label>
          <span>Name</span>
          <input class="field-input" id="contact-name" name="name" placeholder="Your name" />
        </label>
        <label>
          <span>Email</span>
          <input class="field-input" id="contact-email" name="email" placeholder="your@email.com" />
        </label>
        <label>
          <span>Message</span>
          <textarea class="field-textarea" id="contact-message" name="message" placeholder="What would you like to build together?"></textarea>
        </label>
        <button class="primary-button inline-button" type="submit">Open draft message</button>
      </form>
    </section>
  `;
}

function renderTerminalApp() {
  return `
    <section class="terminal-shell">
      <div class="terminal-history" id="terminal-history">
        ${state.terminalHistory.map((line) => `<p class="terminal-line">${escapeHtml(line)}</p>`).join("")}
      </div>
      <form class="terminal-form" id="terminal-form">
        <label class="terminal-prompt" for="terminal-input">${portfolioData.profile.name.toLowerCase()}@portfolio:~$</label>
        <input class="terminal-input" id="terminal-input" autocomplete="off" spellcheck="false" />
      </form>
    </section>
  `;
}

function renderNotesApp() {
  return `
    <section class="notes-shell">
      <label class="notes-label" for="notes-area">Scratchpad</label>
      <textarea class="notes-area" id="notes-area">${escapeHtml(state.notes)}</textarea>
      <p class="muted-copy">Notes are saved locally in this browser.</p>
    </section>
  `;
}

function renderBrowserApp() {
  return `
    <section class="browser-shell">
      <div class="browser-bar">
        <span class="chip subtle">Bookmarks</span>
        <span class="browser-address">portfolio://connections</span>
      </div>
      <div class="bookmark-grid">
        ${portfolioData.browserBookmarks
          .map(
            (bookmark) => `
              <article class="bookmark-card glass-card">
                <h3>${bookmark.title}</h3>
                <p>${bookmark.description}</p>
                ${
                  bookmark.url
                    ? `<a class="ghost-button" href="${bookmark.url}" target="_blank" rel="noreferrer">Open link</a>`
                    : `<button class="ghost-button" data-toast="Add this URL in content.js." type="button">Add URL</button>`
                }
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderSettingsApp() {
  return `
    <section class="stack">
      <article class="content-card glass-card">
        <p class="section-label">Accent themes</p>
        <div class="swatch-grid">
          ${portfolioData.themes
            .map(
              (theme) => `
                <button class="swatch-card ${theme.id === state.themeId ? "is-selected" : ""}" data-theme-id="${theme.id}" type="button">
                  <span class="swatch-preview" style="--swatch-a: ${theme.accent}; --swatch-b: ${theme.accentStrong}; --swatch-c: ${theme.accentAlt};"></span>
                  <span>${theme.label}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </article>
      <article class="content-card glass-card">
        <p class="section-label">Wallpapers</p>
        <div class="swatch-grid">
          ${portfolioData.wallpapers
            .map(
              (wallpaper) => `
                <button class="swatch-card ${wallpaper.id === state.wallpaperId ? "is-selected" : ""}" data-wallpaper-id="${wallpaper.id}" type="button">
                  <span class="wallpaper-preview wallpaper-preview-${wallpaper.id}"></span>
                  <strong>${wallpaper.label}</strong>
                  <span class="muted-mini">${wallpaper.description}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderArcadeApp() {
  const lastReactionText =
    typeof state.reaction.lastResult === "number" && state.reaction.lastResult > 0
      ? `${state.reaction.lastResult} ms`
      : state.reaction.lastResult || "No result yet";
  const reactionCopy =
    state.reaction.status === "waiting"
      ? "Wait for the target..."
      : state.reaction.status === "ready"
        ? "Click now."
        : state.reaction.status === "result"
          ? `Last reaction: ${lastReactionText}`
          : "Test your reaction speed.";

  return `
    <section class="arcade-shell">
      <div class="arcade-stage ${state.reaction.status}" id="arcade-stage">
        <p class="arcade-label">Reaction Test</p>
        <h3>${reactionCopy}</h3>
        <p class="muted-copy">
          Best: ${state.reaction.best ? `${state.reaction.best} ms` : "No score yet"}
        </p>
      </div>
      <div class="button-row">
        <button class="primary-button inline-button" id="reaction-start-button" type="button">
          Start round
        </button>
        <button class="ghost-button" id="reaction-target-button" type="button">
          Click target
        </button>
      </div>
    </section>
  `;
}

function wireWindowActions() {
  elements.windowStage.querySelectorAll("[data-window-action]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const { windowAction, windowId } = button.dataset;
      if (windowAction === "close") {
        closeWindow(windowId);
      } else if (windowAction === "minimize") {
        minimizeWindow(windowId);
      } else if (windowAction === "maximize") {
        toggleMaximize(windowId);
      }
    });
  });

  elements.windowStage.querySelectorAll(".window").forEach((windowElement) => {
    const windowId = windowElement.dataset.windowId;
    windowElement.addEventListener("pointerdown", () => focusWindow(windowId));

    const header = windowElement.querySelector(".window-header");
    header.addEventListener("dblclick", () => toggleMaximize(windowId));
    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".window-controls") || window.innerWidth < 860) {
        return;
      }
      startDrag(windowId, event);
    });

    const handle = windowElement.querySelector(".resize-handle");
    handle.addEventListener("pointerdown", (event) => {
      if (window.innerWidth < 860) {
        return;
      }
      startResize(windowId, event);
    });
  });
}

function startDrag(windowId, event) {
  const windowItem = getWindow(windowId);
  if (!windowItem || windowItem.maximized) {
    return;
  }

  focusWindow(windowId);
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = windowItem.x;
  const originY = windowItem.y;

  const onMove = (moveEvent) => {
    windowItem.x = clamp(originX + moveEvent.clientX - startX, 16, window.innerWidth - windowItem.w - 16);
    windowItem.y = clamp(originY + moveEvent.clientY - startY, 64, window.innerHeight - windowItem.h - 104);
    updateWindowPosition(windowId);
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function startResize(windowId, event) {
  const windowItem = getWindow(windowId);
  if (!windowItem || windowItem.maximized) {
    return;
  }

  const startX = event.clientX;
  const startY = event.clientY;
  const originW = windowItem.w;
  const originH = windowItem.h;

  const onMove = (moveEvent) => {
    windowItem.w = clamp(originW + moveEvent.clientX - startX, 360, window.innerWidth - windowItem.x - 16);
    windowItem.h = clamp(originH + moveEvent.clientY - startY, 260, window.innerHeight - windowItem.y - 104);
    updateWindowPosition(windowId);
  };

  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function updateWindowPosition(windowId) {
  const windowItem = getWindow(windowId);
  const windowElement = elements.windowStage.querySelector(`[data-window-id="${windowId}"]`);

  if (!windowItem || !windowElement || windowItem.maximized || window.innerWidth < 860) {
    return;
  }

  windowElement.style.left = `${windowItem.x}px`;
  windowElement.style.top = `${windowItem.y}px`;
  windowElement.style.width = `${windowItem.w}px`;
  windowElement.style.height = `${windowItem.h}px`;
}

function focusWindow(windowId) {
  const windowItem = getWindow(windowId);
  if (!windowItem) {
    return;
  }

  state.activeWindowId = windowId;
  windowItem.z = ++state.maxZ;
  syncWindowLayers();
}

function syncWindowLayers() {
  elements.windowStage.querySelectorAll(".window").forEach((windowElement) => {
    const windowItem = getWindow(windowElement.dataset.windowId);
    if (!windowItem) {
      return;
    }
    windowElement.style.zIndex = String(windowItem.z);
    windowElement.classList.toggle("is-active", state.activeWindowId === windowItem.id);
  });
}

function closeWindow(windowId) {
  state.windows = state.windows.filter((windowItem) => windowItem.id !== windowId);
  if (state.activeWindowId === windowId) {
    state.activeWindowId = state.windows[state.windows.length - 1]?.id || null;
  }
  renderWindows();
}

function minimizeWindow(windowId) {
  const windowItem = getWindow(windowId);
  if (!windowItem) {
    return;
  }
  windowItem.minimized = true;
  if (state.activeWindowId === windowId) {
    state.activeWindowId = state.windows.find((item) => !item.minimized)?.id || null;
  }
  renderWindows();
}

function toggleMaximize(windowId) {
  const windowItem = getWindow(windowId);
  if (!windowItem) {
    return;
  }

  if (windowItem.maximized) {
    if (windowItem.previousRect) {
      windowItem.x = windowItem.previousRect.x;
      windowItem.y = windowItem.previousRect.y;
      windowItem.w = windowItem.previousRect.w;
      windowItem.h = windowItem.previousRect.h;
    }
    windowItem.maximized = false;
    windowItem.previousRect = null;
  } else {
    windowItem.previousRect = {
      x: windowItem.x,
      y: windowItem.y,
      w: windowItem.w,
      h: windowItem.h
    };
    windowItem.maximized = true;
  }

  renderWindows();
}

function clampWindowsToViewport() {
  state.windows.forEach((windowItem) => {
    if (windowItem.maximized || window.innerWidth < 860) {
      return;
    }
    windowItem.w = Math.min(windowItem.w, window.innerWidth - 24);
    windowItem.h = Math.min(windowItem.h, window.innerHeight - 150);
    windowItem.x = clamp(windowItem.x, 12, Math.max(12, window.innerWidth - windowItem.w - 12));
    windowItem.y = clamp(windowItem.y, 64, Math.max(64, window.innerHeight - windowItem.h - 104));
  });
}

function wireWindowSpecificContent() {
  const terminalForm = document.getElementById("terminal-form");
  const terminalInput = document.getElementById("terminal-input");
  if (terminalForm && terminalInput) {
    terminalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const command = terminalInput.value.trim().toLowerCase();
      if (!command) {
        return;
      }
      runTerminalCommand(command);
      terminalInput.value = "";
      renderWindows();
      window.setTimeout(() => {
        const input = document.getElementById("terminal-input");
        if (input) {
          input.focus();
        }
      }, 0);
    });
    window.setTimeout(() => terminalInput.focus(), 0);
  }

  const notesArea = document.getElementById("notes-area");
  if (notesArea) {
    notesArea.addEventListener("input", () => {
      state.notes = notesArea.value;
      saveValue(STORAGE_KEYS.notes, state.notes);
    });
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = document.getElementById("contact-name").value.trim();
      const email = document.getElementById("contact-email").value.trim();
      const message = document.getElementById("contact-message").value.trim();
      const subject = encodeURIComponent(`Portfolio inquiry from ${name || "a visitor"}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);

      if (portfolioData.meta.email) {
        window.location.href = `mailto:${portfolioData.meta.email}?subject=${subject}&body=${body}`;
      } else {
        window.open(portfolioData.meta.linkedIn, "_blank", "noopener,noreferrer");
        pushToast("LinkedIn opened. Add your email in content.js to route this form directly.");
      }
    });
  }

  document.querySelectorAll("[data-theme-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.themeId = button.dataset.themeId;
      saveValue(STORAGE_KEYS.theme, state.themeId);
      applyTheme();
      renderSettingsSurfaces();
      const theme = portfolioData.themes.find((item) => item.id === button.dataset.themeId);
      pushToast(`Theme switched to ${theme?.label || "selected palette"}.`);
    });
  });

  document.querySelectorAll("[data-wallpaper-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.wallpaperId = button.dataset.wallpaperId;
      saveValue(STORAGE_KEYS.wallpaper, state.wallpaperId);
      applyWallpaper();
      renderSettingsSurfaces();
      const wallpaper = portfolioData.wallpapers.find((item) => item.id === button.dataset.wallpaperId);
      pushToast(`Wallpaper switched to ${wallpaper?.label || "selected scene"}.`);
    });
  });

  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => {
      pushToast(button.dataset.toast);
    });
  });

  elements.windowStage.querySelectorAll(".launcher-item").forEach((button) => {
    button.onclick = (e) => {
      e.preventDefault();
      openWindow(button.dataset.openApp);
    };
  });

  const reactionStartButton = document.getElementById("reaction-start-button");
  const reactionTargetButton = document.getElementById("reaction-target-button");
  if (reactionStartButton && reactionTargetButton) {
    reactionStartButton.addEventListener("click", startReactionRound);
    reactionTargetButton.addEventListener("click", handleReactionClick);
  }

  const openSettingsButton = document.getElementById("open-settings-button");
  if (openSettingsButton) {
    openSettingsButton.addEventListener("click", () => openWindow("settings"));
  }
}

function runTerminalCommand(command) {
  state.terminalHistory.push(`${portfolioData.profile.name.toLowerCase()}@portfolio:~$ ${command}`);

  if (command === "clear") {
    state.terminalHistory = [];
    return;
  }

  if (command === "linkedin") {
    state.terminalHistory.push(portfolioData.commands.linkedin);
    window.open(portfolioData.meta.linkedIn, "_blank", "noopener,noreferrer");
    return;
  }

  if (command === "resume") {
    state.terminalHistory.push(portfolioData.commands.resume);
    return;
  }

  if (command === "certs") {
    state.terminalHistory.push(portfolioData.commands.certs);
    return;
  }

  if (command === "theme") {
    state.terminalHistory.push(portfolioData.commands.theme);
    return;
  }

  const response = portfolioData.commands[command];
  if (response) {
    state.terminalHistory.push(response);
  } else {
    state.terminalHistory.push("Command not found. Try: help");
  }
}

function startReactionRound() {
  if (state.reaction.timeoutId) {
    window.clearTimeout(state.reaction.timeoutId);
  }

  state.reaction.status = "waiting";
  state.reaction.lastResult = 0;
  renderWindows();

  state.reaction.timeoutId = window.setTimeout(() => {
    state.reaction.status = "ready";
    state.reaction.startedAt = performance.now();
    renderWindows();
  }, Math.random() * 2200 + 900);
}

function handleReactionClick() {
  if (state.reaction.status === "waiting") {
    window.clearTimeout(state.reaction.timeoutId);
    state.reaction.timeoutId = null;
    state.reaction.status = "result";
    state.reaction.lastResult = "Too soon";
    renderWindows();
    pushToast("Too soon. Wait for the target.");
    return;
  }

  if (state.reaction.status !== "ready") {
    return;
  }

  const result = Math.round(performance.now() - state.reaction.startedAt);
  state.reaction.status = "result";
  state.reaction.lastResult = result;
  state.reaction.timeoutId = null;

  if (!state.reaction.best || result < state.reaction.best) {
    state.reaction.best = result;
    saveValue(STORAGE_KEYS.reactionBest, String(result));
  }

  renderWindows();
}

function toggleControlCenter() {
  state.controlCenterOpen = !state.controlCenterOpen;
  renderControlCenter();
}

function renderControlCenter() {
  elements.controlCenter.classList.toggle("hidden", !state.controlCenterOpen);
  elements.controlCenter.innerHTML = `
    <div class="control-card">
      <div class="control-card-header">
        <div>
          <p class="section-label">Control Center</p>
          <h3>Visual tuning</h3>
        </div>
        <button class="ghost-button small" id="open-settings-button" type="button">Open Settings</button>
      </div>
      <div class="quick-swatch-row">
        ${portfolioData.themes
          .map(
            (theme) => `
              <button class="quick-swatch ${theme.id === state.themeId ? "is-selected" : ""}" data-theme-id="${theme.id}" type="button" title="${theme.label}">
                <span style="background: linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong}, ${theme.accentAlt});"></span>
              </button>
            `
          )
          .join("")}
      </div>
      <div class="control-wallpapers">
        ${portfolioData.wallpapers
          .map(
            (wallpaper) => `
              <button class="wallpaper-row ${wallpaper.id === state.wallpaperId ? "is-selected" : ""}" data-wallpaper-id="${wallpaper.id}" type="button">
                <span class="wallpaper-preview wallpaper-preview-${wallpaper.id}"></span>
                <span>
                  <strong>${wallpaper.label}</strong>
                  <small>${wallpaper.description}</small>
                </span>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  wireWindowSpecificContent();
}

function renderSettingsSurfaces() {
  renderControlCenter();
  renderWindows();
}

function applyTheme() {
  const theme = portfolioData.themes.find((item) => item.id === state.themeId) || portfolioData.themes[0];
  elements.body.style.setProperty("--accent", theme.accent);
  elements.body.style.setProperty("--accent-strong", theme.accentStrong);
  elements.body.style.setProperty("--accent-alt", theme.accentAlt);
  elements.body.style.setProperty("--bg", theme.bgBase);
  elements.body.style.setProperty("--text", theme.textMain);
  elements.body.style.setProperty("--muted", theme.textMuted);
  elements.body.style.setProperty("--window-bg", theme.windowBg);
  elements.body.style.setProperty("--card-bg", theme.cardBg);
  elements.body.style.setProperty("--glass-blur", theme.glassBlur);
  elements.body.style.setProperty("--radius-window", theme.radiusWindow);
  elements.body.style.setProperty("--radius-card", theme.radiusCard);
  elements.body.style.setProperty("--border-light", theme.borderLight);
  elements.body.style.setProperty("--shadow-active", theme.shadowActive);
  elements.body.className = `theme-${theme.id}`;
}

function applyWallpaper() {
  elements.body.dataset.wallpaper = state.wallpaperId;
}

function pushToast(message) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.toasts.push({ id, message });
  renderToasts();
  window.setTimeout(() => {
    state.toasts = state.toasts.filter((toast) => toast.id !== id);
    renderToasts();
  }, 2600);
}

function renderToasts() {
  elements.toastStack.innerHTML = state.toasts
    .map((toast) => `<div class="toast">${toast.message}</div>`)
    .join("");
}

function getWindow(windowId) {
  return state.windows.find((windowItem) => windowItem.id === windowId);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loadValue(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

/* --- Transformational Additions --- */
function toggleSpotlight() {
  const isHidden = elements.spotlightOverlay.classList.contains("hidden");
  if (isHidden) {
    elements.spotlightOverlay.classList.remove("hidden");
    elements.spotlightInput.value = "";
    renderSpotlightResults("");
    elements.spotlightInput.focus();
  } else {
    elements.spotlightOverlay.classList.add("hidden");
    elements.spotlightInput.blur();
  }
}

function initSpotlight() {
  if(!elements.spotlightOverlay) return;
  elements.spotlightOverlay.addEventListener("mousedown", (e) => {
    if (e.target === elements.spotlightOverlay) {
      toggleSpotlight();
    }
  });

  elements.spotlightInput.addEventListener("input", (e) => {
    renderSpotlightResults(e.target.value.toLowerCase());
  });
}

function renderSpotlightResults(query) {
  if (!query) {
    elements.spotlightResults.innerHTML = `
      <div class="spotlight-result-item" style="opacity: 0.5; cursor: default;">
        <div class="spotlight-result-details"><p>Start typing to search apps...</p></div>
      </div>`;
    return;
  }
  
  const matches = apps.filter(app => app.title.toLowerCase().includes(query) || app.id.includes(query));
  
  if (matches.length === 0) {
    elements.spotlightResults.innerHTML = `
      <div class="spotlight-result-item" style="opacity: 0.5; cursor: default;">
        <div class="spotlight-result-details"><p>No results found for "${escapeHtml(query)}"</p></div>
      </div>`;
    return;
  }

  elements.spotlightResults.innerHTML = matches.map(app => `
    <div class="spotlight-result-item" data-spotlight-app="${app.id}">
      <div class="spotlight-result-icon">${app.glyph}</div>
      <div class="spotlight-result-details">
        <h4>${app.title}</h4>
        <p>Application</p>
      </div>
    </div>
  `).join("");

  elements.spotlightResults.querySelectorAll(".spotlight-result-item[data-spotlight-app]").forEach(item => {
    item.addEventListener("click", () => {
      openWindow(item.dataset.spotlightApp);
      toggleSpotlight();
    });
  });
}

function renderDesktopWidgets() {
  if (!elements.desktopWidgets) return;
  elements.desktopWidgets.innerHTML = `
    <div class="glass-card widget-clock" style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);">
      <div class="widget-time" id="widget-time">00:00</div>
      <div class="widget-date" id="widget-date">Loading...</div>
    </div>
    <div class="glass-card widget-stats" style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);">
      <div class="stat-row">
        <span>CPU Load</span>
        <span style="color: var(--accent);">Active</span>
      </div>
      <div class="stat-bar-bg"><div class="stat-bar-fill" id="cpu-fill" style="width: 20%;"></div></div>
      <div class="stat-row">
        <span>Memory Allocation</span>
        <span style="color: var(--accent);">Stable</span>
      </div>
      <div class="stat-bar-bg"><div class="stat-bar-fill" id="ram-fill" style="width: 45%;"></div></div>
    </div>
  `;
}

function renderTopBarMenus() {
  if (!elements.topBarMenus) return;
  const activeApp = state.activeWindowId ? apps.find(a => a.id === state.activeWindowId) : null;
  let menus = [];

  if (!activeApp) {
    menus = ["System", "View", "Widgets", "Help"];
  } else {
    menus = [activeApp.title, "Edit", "View", "Window"];
    if (activeApp.id === "terminal") menus.push("Run");
    if (activeApp.id === "settings") menus.push("Appearance");
  }

  elements.topBarMenus.innerHTML = menus.map((menu, i) => `
    <button class="top-chip top-menu-btn" type="button" style="font-weight: ${i === 0 && activeApp ? 'bold' : 'normal'}; color: var(--text);">
      ${menu}
    </button>
  `).join("");

  elements.topBarMenus.querySelectorAll(".top-menu-btn").forEach(btn => {
    btn.addEventListener("click", () => pushToast(`${btn.textContent.trim()} options`));
  });
}
