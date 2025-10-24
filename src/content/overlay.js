// Inject a floating top-right overlay that embeds the existing popup UI
(function () {
  const OVERLAY_ID = "anki-ai-overlay-root";
  if (document.getElementById(OVERLAY_ID)) return; // Avoid duplicates

  // Check if current page is a Notion page
  function isNotionPage() {
    return window.location.hostname.includes('notion.so') || 
           window.location.hostname.includes('notion.site');
  }

  // Extract page ID from current Notion page URL
  function getCurrentNotionPageId() {
    if (!isNotionPage()) return null;
    
    try {
      const url = window.location.href;
      const patterns = [
        /notion\.so\/[^\/]*-([a-f0-9]{32})/,  // https://www.notion.so/Page-Title-267ad5f651558081a9fdfa77fd4da2c5
        /notion\.so\/([a-f0-9]{32})/,         // https://notion.so/267ad5f651558081a9fdfa77fd4da2c5
        /notion\.so\/[^\/]*\/([a-f0-9]{32})/, // https://www.notion.so/workspace/267ad5f651558081a9fdfa77fd4da2c5
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting page ID from current URL:', error);
      return null;
    }
  }

  // Get current page info
  function getCurrentPageInfo() {
    return {
      isNotionPage: isNotionPage(),
      currentUrl: window.location.href,
      pageId: getCurrentNotionPageId()
    };
  }

  // Create host container
  const host = document.createElement("div");
  host.id = OVERLAY_ID;
  host.style.position = "fixed";
  host.style.top = "30px";
  host.style.right = "8px";
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
    .launcher.hidden { display: none; }

    .panel {
      margin-top: 25px;
      display: none;
      width: 350px; height: 350px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 40px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
      transition: height 0.3s ease;
    }

    .panel.expanded {
      height: 600px;
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
    // Hide launcher when panel opens
    if (panel.classList.contains("open")) {
      launcher.classList.add("hidden");
    }
  });

  // Listen for messages from iframe to expand panel
  window.addEventListener("message", (e) => {
    if (e.data && e.data.action === "expandPanel") {
      panel.classList.add("expanded");
    }
    
    // Handle requests for current page info
    if (e.data && e.data.action === "getCurrentPageInfo") {
      const pageInfo = getCurrentPageInfo();
      e.source.postMessage({
        action: "currentPageInfo",
        data: pageInfo
      }, "*");
    }
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
      panel.classList.remove("expanded");
      // Show launcher when panel closes
      launcher.classList.remove("hidden");
    }
  }, true);

  container.appendChild(launcher);
  container.appendChild(panel);

  shadow.appendChild(style);
  shadow.appendChild(container);
  document.documentElement.appendChild(host);
})();