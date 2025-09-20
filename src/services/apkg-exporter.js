// Generate APKG file and trigger download
export function generateAPKGFile(flashcards, deckName = "Notion Flashcards") {
  try {
    console.log(`Generating APKG file with ${flashcards.length} flashcards`);
    
    // Create a simple APKG-like structure (JSON format for now)
    const apkgData = {
      deckName: deckName,
      cards: flashcards,
      metadata: {
        created: new Date().toISOString(),
        version: "1.0",
        totalCards: flashcards.length,
        exportedFrom: "Notion Flashcard Generator"
      }
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(apkgData, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `notion-flashcards-${timestamp}.json`;
    
    // Create and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    console.log(`APKG file "${filename}" generated successfully`);
    return { success: true, filename: filename };
    
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