// Generate APKG file and trigger download using genanki-js
export async function generateAPKGFile(flashcards, deckName = "Notion Flashcards") {
  try {
    console.log(`Generating APKG file with ${flashcards.length} flashcards`);

    // Guard: required globals from vendored libs
    if (typeof Model === 'undefined' || typeof Deck === 'undefined' || typeof Package === 'undefined') {
      throw new Error("genanki-js is not loaded. Make sure genanki.js is included in popup.html");
    }

    // Ensure SQL.js is initialized (required by genanki-js)
    if (!window.SQL) {
      if (typeof initSqlJs === 'function') {
        const locate = (filename) => {
          // Ensure the wasm path resolves within the extension package
          return chrome?.runtime?.getURL ? chrome.runtime.getURL('vendor/sql/sql-wasm.wasm') : '../../vendor/sql/sql-wasm.wasm';
        };
        const cfg = window.config || { locateFile: locate };
        console.log('Initializing SQL.js...');
        window.SQL = await initSqlJs(cfg);
      } else {
        throw new Error("sql.js is not loaded. Make sure sql-wasm.js is included in popup.html");
      }
    }

    // Define a simple Front/Back model
    const model = new Model({
      name: "Basic",
      id: String(Date.now() - 1000),
      flds: [
        { name: "Front" },
        { name: "Back" }
      ],
      req: [
        [0, "all", [0]],
        [1, "all", [1]]
      ],
      tmpls: [
        {
          name: "Card 1",
          qfmt: "{{Front}}",
          afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
        }
      ]
    });

    // Create deck and add notes
    const deckId = Date.now();
    const deck = new Deck(deckId, deckName);
    flashcards.forEach((card) => {
      const note = model.note([card.question, card.answer]);
      deck.addNote(note);
    });

    // Package and write to file
    const pkg = new Package();
    pkg.addDeck(deck);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `notion-flashcards-${timestamp}.apkg`;

    // This triggers a download via FileSaver
    pkg.writeToFile(filename);

    console.log(`APKG file "${filename}" generated successfully`);
    return { success: true, filename };

  } catch (error) {
    console.error("Error generating APKG file:", error);
    return { success: false, error: error.message };
  }
}

// Validate flashcards before export
export function validateFlashcards(flashcards) {
  if (!flashcards || !Array.isArray(flashcards)) {
    return { valid: false, error: "Flashcards must be an array" };
  }
  
  if (flashcards.length === 0) {
    return { valid: false, error: "No flashcards to export" };
  }
  
  // Check if each flashcard has required fields
  for (let i = 0; i < flashcards.length; i++) {
    const card = flashcards[i];
    if (!card.question || !card.answer) {
      return { 
        valid: false, 
        error: `Flashcard ${i + 1} is missing question or answer` 
      };
    }
  }
  
  return { valid: true };
}

// Export flashcards with validation
export function exportFlashcards(flashcards, deckName = "Notion Flashcards") {
  // Validate first
  const validation = validateFlashcards(flashcards);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // Generate and download
  return generateAPKGFile(flashcards, deckName);
}
