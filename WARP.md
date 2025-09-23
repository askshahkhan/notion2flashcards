# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Chrome (MV3) extension that generates study flashcards from Notion pages using OpenAI, displays them in a popup/overlay UI, and can export them to an Anki package (APKG) using a Python helper script.

Common commands
- Python dependencies (for APKG export):
  - macOS/Linux: pip install -r requirements.txt
- Generate an APKG from saved flashcards JSON (see APKG_README.md for context):
  - python generate_apkg.py flashcards.json output.apkg

Development workflow
- Secrets setup (required before using the extension): create a secrets.js file at the repository root that exports the following values used by the extension code:
  ```js path=null start=null
  // repo-root/secrets.js
  export const NOTION_API_KEY = "{{NOTION_API_KEY}}";
  export const NOTION_PAGE_ID = "{{NOTION_PAGE_ID}}"; // e.g. a Notion page UUID (hyphens allowed)
  export const OPENAI_API_KEY  = "{{OPENAI_API_KEY}}";
  ```
  - These values are imported in src/services/notion-api.js and src/background.js. Do not commit real secrets.
- Load the extension for local development:
  - In Chrome, navigate to chrome://extensions, enable Developer mode, then "Load unpacked" and select this repository folder. The popup is defined at src/popup/popup.html and a floating overlay is injected via src/content/overlay.js.
- Exporting to Anki:
  - Current in-browser export produces a JSON file (see src/services/apkg-exporter.js). To create a real .apkg file, use the Python script above.

High-level architecture
- Manifest and entry points
  - manifest.json (MV3):
    - background.service_worker: src/background.js (type: module)
    - content_scripts: src/content/overlay.js (injects a top-right launcher and embeds the popup UI in an iframe)
    - action.default_popup: src/popup/popup.html
    - host permissions: Notion and OpenAI APIs
- Background service (OpenAI proxy)
  - src/background.js
    - Listens for messages { action: "generateFlashcards", text }
    - Calls OpenAI Chat Completions API with a JSON-only instruction, parses result into an array of { question, answer }
    - Returns flashcards back to the sender; includes defensive parsing and error logging
- UI layer
  - src/popup/*: popup.html + popup.js + popup.css
    - popup.js coordinates the flow: fetch Notion text -> request card generation via background -> display cards -> enable export
  - src/content/overlay.js
    - Injects a floating launcher; toggles a panel that iframes the popup UI so the tool can be used on any page
  - src/components/ui-controller.js
    - Minimal controller for DOM updates, card rendering, editing/deleting individual cards, and export button lifecycle
- Services
  - src/services/notion-api.js
    - Recursively fetches Notion page blocks using NOTION_API_KEY and NOTION_PAGE_ID, extracts human-readable text from rich_text/title fields, builds a single text blob for AI input
  - src/services/flashcard-generator.js
    - Sends the Notion text to the background service for OpenAI processing and resolves with parsed flashcards
  - src/services/apkg-exporter.js
    - Validates the flashcards and triggers a client-side download of a JSON "APKG-like" payload. Real APKG generation is handled by the Python script
- APKG tooling (Python)
  - generate_apkg.py
    - Uses genanki to create a deck and notes from [{question, answer}] JSON and writes a real .apkg file
  - requirements.txt: genanki pinned version

Important references from repository docs
- APKG_README.md
  - pip install -r requirements.txt
  - python generate_apkg.py flashcards.json output.apkg
  - Notes on future improvements (e.g., direct APKG generation or Anki Connect integration)

Notes for future automation
- There is no Node/packager setup (no package.json). There is no configured linter or test runner in this repo at present. If you add them later, update this file with the exact commands (build, lint, test, run single test) so Warp can use them.
