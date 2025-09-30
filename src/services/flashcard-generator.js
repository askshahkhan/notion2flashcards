// Generate flashcards using GPT-4 via background script
export function generateFlashcards(text) {
  return new Promise((resolve, reject) => {
    console.log("Sending text to background script for flashcard generation");
    
    chrome.runtime.sendMessage(
      { action: "generateFlashcards", text: text },
      (response) => {
        console.log("Received response from background script:", response);
        
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          reject(new Error("Error communicating with background script: " + chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          const cards = response.flashcards;
          const costInfo = response.costInfo;
          console.log("Generated flashcards:", cards);
          
          if (!cards || !cards.length) {
            reject(new Error("No flashcards generated. The AI might not have found suitable content to create flashcards from."));
            return;
          }
          
          resolve({ flashcards: cards, costInfo: costInfo });
        } else {
          reject(new Error("OpenAI failed: " + (response?.error || "Unknown error")));
        }
      }
    );
  });
}