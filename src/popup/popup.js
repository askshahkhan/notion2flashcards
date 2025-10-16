import { fetchNotionContent } from '../services/notion-api.js';
import { generateFlashcards } from '../services/flashcard-generator.js';
import { exportFlashcards } from '../services/apkg-exporter.js';
import { UIController } from '../components/ui-controller.js';
import { notionOAuth } from '../services/notion-oauth.js';
import { USE_OAUTH } from '../../secrets.js';

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

// OAuth UI elements
const authIndicator = document.getElementById("authIndicator");
const authText = document.getElementById("authText");
const connectButton = document.getElementById("connectButton");
const logoutButton = document.getElementById("logoutButton");
const pageInputSection = document.getElementById("pageInputSection");
const notionPageUrlInput = document.getElementById("notionPageUrl");
const fetchButton = document.getElementById("fetchButton");

// Initialize OAuth state
async function initializeOAuthState() {
  console.log('Initializing OAuth state...');
  console.log('USE_OAUTH:', USE_OAUTH);
  
  if (!USE_OAUTH) {
    console.log('OAuth disabled, using fallback mode');
    // Hide OAuth UI and show fallback mode
    document.getElementById("authStatus").style.display = "none";
    document.getElementById("oauthControls").style.display = "none";
    pageInputSection.style.display = "none";
    fetchButton.disabled = false;
    fetchButton.style.opacity = "1";
    return;
  }

  console.log('OAuth enabled, checking authentication status...');
  const isAuthenticated = await notionOAuth.isAuthenticated();
  console.log('Is authenticated:', isAuthenticated);
  updateAuthUI(isAuthenticated);
}

// Update OAuth UI based on authentication status
function updateAuthUI(isAuthenticated) {
  console.log('Updating auth UI, isAuthenticated:', isAuthenticated);
  
  if (isAuthenticated) {
    authIndicator.className = "auth-indicator connected";
    authText.textContent = "Connected to Notion";
    connectButton.style.display = "none";
    logoutButton.style.display = "block";
    pageInputSection.style.display = "block";
    updateFetchButtonState();
  } else {
    authIndicator.className = "auth-indicator disconnected";
    authText.textContent = "Not connected to Notion";
    connectButton.style.display = "block";
    logoutButton.style.display = "none";
    pageInputSection.style.display = "none";
    fetchButton.disabled = true;
    fetchButton.style.opacity = "0.5";
  }
  
  console.log('Connect button display:', connectButton.style.display);
  console.log('Connect button disabled:', connectButton.disabled);
}

// Update fetch button state based on page URL input
function updateFetchButtonState() {
  const url = notionPageUrlInput.value.trim();
  const isValidUrl = notionOAuth.isValidNotionUrl(url);
  
  if (isValidUrl) {
    fetchButton.disabled = false;
    fetchButton.style.opacity = "1";
  } else {
    fetchButton.disabled = true;
    fetchButton.style.opacity = "0.5";
  }
}

// Event listeners for OAuth controls
connectButton.addEventListener("click", async () => {
  console.log("Connect button clicked!");
  try {
    connectButton.disabled = true;
    connectButton.textContent = "Connecting...";
    console.log("Starting OAuth flow...");
    
    await notionOAuth.authorize();
    console.log("OAuth flow completed successfully");
    updateAuthUI(true);
    
  } catch (error) {
    console.error("OAuth connection failed:", error);
    uiController.showError("Failed to connect to Notion: " + error.message);
  } finally {
    connectButton.disabled = false;
    connectButton.textContent = "Connect to Notion";
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await notionOAuth.logout();
    updateAuthUI(false);
    uiController.clearOutput();
    exportButton.disabled = true;
    exportButton.style.opacity = "0.5";
  } catch (error) {
    console.error("Logout failed:", error);
    uiController.showError("Failed to logout: " + error.message);
  }
});

// Event listener for page URL input
notionPageUrlInput.addEventListener("input", updateFetchButtonState);

// Initialize OAuth state on load
initializeOAuthState();

// --- Generate flashcards ---
document.getElementById("fetchButton").addEventListener("click", async () => {
  // Start loading animation (no text)
  showLoadingSpinner();
  
  uiController.clearOutput();
  uiController.updateStatus(""); // Clear any previous status
  try {
    let accessToken = null;
    let pageId = null;

    if (USE_OAUTH) {
      // OAuth mode: get token and page ID from user input
      accessToken = await notionOAuth.getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found. Please connect to Notion first.");
      }

      const pageUrl = notionPageUrlInput.value.trim();
      if (!pageUrl) {
        throw new Error("Please enter a Notion page URL.");
      }

      pageId = notionOAuth.extractPageIdFromUrl(pageUrl);
      console.log("Using OAuth token and page ID:", pageId);
    } else {
      // Fallback mode: use hardcoded credentials
      console.log("Using fallback hardcoded credentials");
    }

    // Fetch content from Notion
    const notionText = await fetchNotionContent(
      (status) => {
        // Don't show status during loading since we have the spinner
      },
      accessToken,
      pageId
    );
    
    if (!notionText.trim()) {
      uiController.showError("No text content found in Notion page. Please check if the page has content and the API key has access.");
      return;
    }
    
    // Keep showing spinner for flashcard generation (no need to update message)
    
    // Generate flashcards using the service
    const result = await generateFlashcards(notionText);
    const cards = result.flashcards || result; // Handle both old and new response formats
    const costInfo = result.costInfo;
    
    // Display flashcards
    uiController.displayFlashcards(cards, () => {
      // Enable the existing export button after flashcards are loaded
      const exportButton = document.getElementById("exportButton");
      exportButton.disabled = false;
      exportButton.style.opacity = "1";
      
      // Show cost information
      if (costInfo) {
        uiController.showCostInfo(costInfo);
      }
      
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