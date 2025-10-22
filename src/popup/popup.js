import { fetchNotionContent, fetchAvailablePages } from '../services/notion-api.js';
import { generateFlashcards } from '../services/flashcard-generator.js';
import { exportFlashcards } from '../services/apkg-exporter.js';
import { UIController } from '../components/ui-controller.js';
import { notionOAuth } from '../services/notion-oauth.js';
import { incrementGenerations, incrementAnkiExports, updateAccessiblePages } from '../services/supabase-client.js';

// Initialize UI controller
const uiController = new UIController();

// Available pages from Notion
let availablePages = [];

// Load available pages from Notion
async function loadAvailablePages() {
  try {
    console.log('Loading available pages...');
    notionPageDropdown.disabled = true;
    notionPageDropdown.innerHTML = '<option value="">Loading pages...</option>';
    refreshPagesButton.disabled = true;
    
    const accessToken = await notionOAuth.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token available. Please connect to Notion first.");
    }
    
    availablePages = await fetchAvailablePages(accessToken);
    populateDropdown();
    
    // Update accessible pages count in Supabase
    const { user_email } = await chrome.storage.local.get(['user_email']);
    if (user_email && availablePages.length > 0) {
      console.log('📊 Calling updateAccessiblePages...');
      const result = await updateAccessiblePages(user_email, availablePages.length);
      console.log('📊 Update result:', result);
    } else {
      console.log('❌ Not updating - user_email:', user_email, 'pages:', availablePages.length);
    }
    
  } catch (error) {
    console.error('Error loading pages:', error);
    notionPageDropdown.innerHTML = '<option value="">Error loading pages</option>';
    uiController.showError("Failed to load pages: " + error.message);
  } finally {
    notionPageDropdown.disabled = false;
    refreshPagesButton.disabled = false;
  }
}

// Populate the dropdown with available pages
function populateDropdown() {
  notionPageDropdown.innerHTML = '<option value="">Select a page...</option>';
  
  if (availablePages.length === 0) {
    notionPageDropdown.innerHTML = '<option value="">No pages found</option>';
    return;
  }
  
  availablePages.forEach(page => {
    const option = document.createElement('option');
    option.value = page.id;
    option.textContent = page.title;
    option.dataset.url = page.url;
    notionPageDropdown.appendChild(option);
  });
  
  updateFetchButtonState();
}

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
  
  // Show the loading text again for next time
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
const notionPageDropdown = document.getElementById("notionPageDropdown");
const refreshPagesButton = document.getElementById("refreshPagesButton");
const fetchButton = document.getElementById("fetchButton");

// Initialize OAuth state
async function initializeOAuthState() {
  console.log('Initializing OAuth state...');
  
  const isAuthenticated = await notionOAuth.isAuthenticated();
  console.log('Is authenticated:', isAuthenticated);
  
  if (isAuthenticated) {
    console.log('Saving user info to Supabase...');
    await notionOAuth.saveUserInfoIfNeeded();
    console.log('User info saved to Supabase');
  }
  
  updateAuthUI(isAuthenticated);
}

// Update OAuth UI based on authentication status
function updateAuthUI(isAuthenticated) {
  console.log('Updating auth UI, isAuthenticated:', isAuthenticated);

  authText.style.display = "none";
  
  if (isAuthenticated) {
    authIndicator.className = "auth-indicator connected";
    authText.textContent = "Connected to Notion";
    connectButton.style.display = "none";
    logoutButton.style.display = "inline-block";
    
    // Show page selection section and load available pages
    pageInputSection.style.display = "block";
    loadAvailablePages();
    
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

// Update fetch button state based on page selection
function updateFetchButtonState() {
  const selectedPageId = notionPageDropdown.value;
  
  if (selectedPageId && selectedPageId.trim() !== "") {
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

// Event listener for page dropdown selection
notionPageDropdown.addEventListener("change", updateFetchButtonState);

// Event listener for refresh pages button
refreshPagesButton.addEventListener("click", () => {
  loadAvailablePages();
});

// Initialize OAuth state on load
initializeOAuthState();

// --- Generate flashcards ---
document.getElementById("fetchButton").addEventListener("click", async () => {
  // Start loading animation
  showLoadingSpinner();
  
  uiController.clearOutput();
  uiController.updateStatus("");
  
  try {
    // Get OAuth token
    const accessToken = await notionOAuth.getAccessToken();
    if (!accessToken) {
      throw new Error("No access token found. Please connect to Notion first.");
    }

    // Get selected page ID from dropdown
    const pageId = notionPageDropdown.value;
    if (!pageId || pageId.trim() === "") {
      throw new Error("Please select a Notion page from the dropdown.");
    }
    
    console.log("Using selected page ID:", pageId);

    // Fetch content from Notion
    const notionText = await fetchNotionContent(
      (status) => {
        // Status updates during fetch (optional)
      },
      accessToken,
      pageId
    );
    
    if (!notionText.trim()) {
      uiController.showError("No text content found in Notion page. Please check if the page has content and you have access.");
      return;
    }
    
    // Generate flashcards using the service
    const result = await generateFlashcards(notionText);
    const cards = result.flashcards || result;
    const costInfo = result.costInfo;
    
    // Display flashcards
    uiController.displayFlashcards(cards, () => {
      // Enable export button after flashcards are loaded
      exportButton.disabled = false;
      exportButton.style.opacity = "1";
      
      // Show cost information
      if (costInfo) {
        uiController.showCostInfo(costInfo);
      }
    });

    // Track generation in Supabase
    const { user_email } = await chrome.storage.local.get(['user_email']);
    if (user_email) {
      console.log('🔍 INCREMENT GENERATIONS for user email:', user_email);
      const cost = costInfo?.totalCost || 0;
      console.log('💰 Generation cost:', cost);
      await incrementGenerations(user_email, cost);
    }
    
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

      // Track the Anki export in Supabase
      const { user_email } = await chrome.storage.local.get(['user_email']);
      if (user_email) {
        console.log('📦 Tracking Anki export for user:', user_email);
        await incrementAnkiExports(user_email);
      }
    } else {
      throw new Error(result.error);
    }
    
  } catch (err) {
    console.error("Error exporting flashcards:", err);
    uiController.showExportError(button, originalText, err.message);
  }
}