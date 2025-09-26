import { fetchNotionContent } from '../services/notion-api.js';
import { generateFlashcards } from '../services/flashcard-generator.js';
import { exportFlashcards } from '../services/apkg-exporter.js';
import { UIController } from '../components/ui-controller.js';

// Initialize UI controller
const uiController = new UIController();

// Loading state management
function showLoadingSpinner() {
  const loadingContainer = document.getElementById('loadingContainer');
  const fetchButton = document.getElementById('fetchButton');
  
  loadingContainer.style.display = 'flex';
  fetchButton.disabled = true;
  fetchButton.style.opacity = '0.6';
  
  // Hide the loading text
  const loadingText = loadingContainer.querySelector('.loading-text');
  if (loadingText) {
    loadingText.style.display = 'none';
  }
  
  // Expand the overlay panel to show the loading spinner
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ action: "expandPanel" }, "*");
  }
}

function hideLoadingSpinner() {
  const loadingContainer = document.getElementById('loadingContainer');
  const fetchButton = document.getElementById('fetchButton');
  
  loadingContainer.style.display = 'none';
  fetchButton.disabled = false;
  fetchButton.style.opacity = '1';
  
  // Show the loading text again for next time (optional)
  const loadingText = loadingContainer.querySelector('.loading-text');
  if (loadingText) {
    loadingText.style.display = 'block';
  }
}

// Initialize export button as disabled
const exportButton = document.getElementById("exportButton");
exportButton.disabled = true;
exportButton.style.opacity = "0.5";

// Add event listener for export button
exportButton.addEventListener("click", async () => {
  await handleExportToAnki(exportButton);
});

// --- Generate flashcards ---
document.getElementById("fetchButton").addEventListener("click", async () => {
  // Start loading animation (no text)
  showLoadingSpinner();
  
  uiController.clearOutput();
  uiController.updateStatus(""); // Clear any previous status
  try {
    // Fetch content from Notion
    const notionText = await fetchNotionContent((status) => {
      // Don't show status during loading since we have the spinner
    });
    
    if (!notionText.trim()) {
      uiController.showError("No text content found in Notion page. Please check if the page has content and the API key has access.");
      return;
    }
    
    // Keep showing spinner for flashcard generation (no need to update message)
    
    // Generate flashcards using the service
    const cards = await generateFlashcards(notionText);
    
    // Display flashcards
    uiController.displayFlashcards(cards, () => {
      // Enable the existing export button after flashcards are loaded
      const exportButton = document.getElementById("exportButton");
      exportButton.disabled = false;
      exportButton.style.opacity = "1";
      
      // Panel expansion is already handled by showLoadingSpinner
    });
  } catch (err) {
    console.error(err);
    uiController.showError(err.message || "Failed to generate flashcards.");
  } finally {
    // Always stop loading animation
    hideLoadingSpinner();
  }
});

// --- Handle APKG export ---
async function handleExportToAnki(button) {
  console.log("Export to Anki clicked");
  
  const cards = uiController.getCards();
  if (!cards || cards.length === 0) {
    alert("No flashcards to export!");
    return;
  }
  
  const originalText = uiController.showExportProgress(button);
  
  try {
    // Export flashcards using the service
    const result = await exportFlashcards(cards, "Notion Flashcards");
    
    if (result.success) {
      uiController.showExportSuccess(button, originalText, result.filename);
    } else {
      throw new Error(result.error);
    }
    
  } catch (err) {
    console.error("Error exporting flashcards:", err);
    uiController.showExportError(button, originalText, err.message);
  }
}