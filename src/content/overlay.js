// Inject a floating top-right overlay that embeds the existing popup UI
(function () {
  const OVERLAY_ID = "anki-ai-overlay-root";
  if (document.getElementById(OVERLAY_ID)) return; // Avoid duplicates

  // Create host container
  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  host.style.position = "fixed";
  host.style.top = "12px";
  host.style.right = "12px";
  host.style.zIndex = "2147483647"; // max
  host.style.pointerEvents = "none"; // let page interactions pass through by default

  // Attach shadow root for style isolation
  const shadow = host.attachShadow({ mode: "open" });

  // Styles scoped to shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .container { pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, sans-serif; }
    .launcher {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px; height: 40px;
      border-radius: 9999px;
      background: #ffffff;
      color: #111827;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 14px rgba(0,0,0,0.12);
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.2s ease, background 0.2s ease;
      user-select: none;
    }
    .launcher:hover { background: #f9fafb; box-shadow: 0 6px 18px rgba(0,0,0,0.18); }
    .launcher:active { transform: translateY(1px); }

    .panel {
      margin-top: 8px;
      display: none;
      width: 420px; height: 600px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    }

    .panel.open { display: block; }
    .panel iframe { width: 100%; height: 100%; border: 0; }
    .badge { font-size: 12px; font-weight: 600; }
  `;

  const container = document.createElement("div");
  container.className = "container";

  // Launcher button (small floating button)
  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.title = "Open Notion Flashcards";

  // Use the extension's logo instead of an emoji
  const logoImg = document.createElement("img");
  logoImg.src = chrome.runtime.getURL("assets/logo_main.png");
  logoImg.alt = "Notion Flashcards";
  logoImg.style.width = "24px";
  logoImg.style.height = "24px";
  logoImg.style.borderRadius = "9999px";
  launcher.appendChild(logoImg);

  // Panel with iframe that loads the existing popup UI
  const panel = document.createElement("div");
  panel.className = "panel";

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("src/popup/popup.html");
  iframe.allow = "clipboard-write"; // allow copy/paste interactions inside
  panel.appendChild(iframe);

  // Toggle logic
  launcher.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("open");
  });

  // Close on outside click (optional)
  document.addEventListener("click", (e) => {
    // If click happens outside the host area, close the panel
    // Because host has pointer-events none, only clicks on shadow children are captured
    // so we listen on document and check composedPath for our elements
    const path = e.composedPath ? e.composedPath() : [];
    const inside = path.includes(launcher) || path.includes(panel) || path.includes(host) || path.includes(shadow);
    if (!inside) {
      panel.classList.remove("open");
    }
  }, true);

  container.appendChild(launcher);
  container.appendChild(panel);

  shadow.appendChild(style);
  shadow.appendChild(container);
  document.documentElement.appendChild(host);
})();
