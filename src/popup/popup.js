// =============================================================================
// IMPORTS
// =============================================================================
import { fetchNotionContent, fetchAvailablePages } from '../services/notion-api.js';
import { generateFlashcards } from '../services/flashcard-generator.js';
import { exportFlashcards } from '../services/apkg-exporter.js';
import { UIController } from '../components/ui-controller.js';
import { notionOAuth } from '../services/notion-oauth.js';
import { incrementGenerations, incrementAnkiExports, updateAccessiblePages } from '../services/supabase-client.js';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================
class PopupState {
  constructor() {
    this.availablePages = [];
    this.isLoading = false;
  }

  setPages(pages) {
    this.availablePages = pages;
  }

  getPages() {
    return this.availablePages;
  }

  setLoading(loading) {
    this.isLoading = loading;
  }

  isLoadingState() {
    return this.isLoading;
  }
}

// =============================================================================
// DOM ELEMENTS CACHE
// =============================================================================
class DOMElements {
  constructor() {
    // Settings menu
    this.settingsMenu = document.getElementById("settingsMenu");
    
    // Auth elements
    this.connectButton = document.getElementById("connectButton");
    this.logoutButton = document.getElementById("logoutButton");
    this.oauthControls = document.getElementById("oauthControls");
    
    // Page selection elements
    this.pageInputSection = document.getElementById("pageInputSection");
    this.notionPageDropdown = document.getElementById("notionPageDropdown");
    // this.refreshPagesButton = document.getElementById("refreshPagesButton");
    
    // Action buttons
    this.fetchButton = document.getElementById("fetchButton");
    this.exportButton = document.getElementById("exportButton");
    
    // Loading elements
    this.loadingContainer = document.getElementById("loadingContainer");
    this.loadingText = this.loadingContainer?.querySelector('.loading-text');
  }
}

// =============================================================================
// PAGE MANAGER - Handles page loading and dropdown
// =============================================================================
class PageManager {
  constructor(state, elements, uiController) {
    this.state = state;
    this.elements = elements;
    this.uiController = uiController;
  }

  async loadPages() {
    try {
      console.log('Loading available pages...');
      this.setDropdownLoading(true);
      
      const accessToken = await notionOAuth.getAccessToken();
      if (!accessToken) {
        throw new Error("No access token available. Please connect to Notion first.");
      }
      
      const pages = await fetchAvailablePages(accessToken);
      this.state.setPages(pages);
      this.populateDropdown();
      
      await this.updateAccessiblePagesCount(pages.length);
      
    } catch (error) {
      console.error('Error loading pages:', error);
      this.elements.notionPageDropdown.innerHTML = '<option value="">Error loading pages</option>';
      this.uiController.showError("Failed to load pages: " + error.message);
    } finally {
      this.setDropdownLoading(false);
    }
  }

  populateDropdown() {
    const pages = this.state.getPages();
    this.elements.notionPageDropdown.innerHTML = '<option value="">Select a page...</option>';
    
    if (pages.length === 0) {
      this.elements.notionPageDropdown.innerHTML = '<option value="">No pages found</option>';
      return;
    }
    
    pages.forEach((page, index) => {
      const option = document.createElement('option');
      option.value = page.id;
      option.textContent = page.title;
      option.dataset.url = page.url;

      if (index === 0) {
        option.selected = true;
      }
      this.elements.notionPageDropdown.appendChild(option);
    });

    this.updateFetchButtonState();
  }

  setDropdownLoading(loading) {
    this.elements.notionPageDropdown.disabled = loading;
    // this.elements.refreshPagesButton.disabled = loading;
    
    if (loading) {
      this.elements.notionPageDropdown.innerHTML = '<option value="">Loading pages...</option>';
    }
  }

  updateFetchButtonState() {
    const selectedPageId = this.elements.notionPageDropdown.value;
    const hasSelection = selectedPageId && selectedPageId.trim() !== "";
    
    this.elements.fetchButton.disabled = !hasSelection;
    this.elements.fetchButton.style.opacity = hasSelection ? "1" : "0.5";
  }

  async updateAccessiblePagesCount(count) {
    const { user_email } = await chrome.storage.local.get(['user_email']);
    
    if (user_email && count > 0) {
      console.log('📊 Updating accessible pages count...');
      const result = await updateAccessiblePages(user_email, count);
      console.log('📊 Update result:', result);
    }
  }

  getSelectedPageId() {
    return this.elements.notionPageDropdown.value;
  }
}

// =============================================================================
// AUTH MANAGER - Handles OAuth authentication
// =============================================================================
class AuthManager {
  constructor(elements, uiController, pageManager) {
    this.elements = elements;
    this.uiController = uiController;
    this.pageManager = pageManager;
  }

  async initialize() {
    console.log('Initializing OAuth state...');
    
    const isAuthenticated = await notionOAuth.isAuthenticated();
    console.log('Is authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      await notionOAuth.saveUserInfoIfNeeded();
    }
    
    this.updateUI(isAuthenticated);
  }

  updateUI(isAuthenticated) {
    console.log('Updating auth UI, isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      this.showAuthenticatedState();
    } else {
      this.showUnauthenticatedState();
    }
  }

  showAuthenticatedState() {
    this.elements.oauthControls.style.display = "none";
    this.elements.settingsMenu.style.display = "block";
    this.elements.pageInputSection.style.display = "block";
    
    this.pageManager.loadPages();
    this.pageManager.updateFetchButtonState();
  }

  showUnauthenticatedState() {
    this.elements.oauthControls.style.display = "block";
    this.elements.settingsMenu.style.display = "none";
    this.elements.pageInputSection.style.display = "none";
    this.elements.fetchButton.disabled = true;
    this.elements.fetchButton.style.opacity = "0.5";
  }

  async connect() {
    try {
      this.elements.connectButton.disabled = true;
      this.elements.connectButton.textContent = "Connecting...";
      
      await notionOAuth.authorize();
      console.log("OAuth flow completed successfully");
      
      this.updateUI(true);
      
    } catch (error) {
      console.error("OAuth connection failed:", error);
      this.uiController.showError("Failed to connect to Notion: " + error.message);
    } finally {
      this.elements.connectButton.disabled = false;
      this.elements.connectButton.textContent = "Connect to Notion";
    }
  }

  async logout() {
    try {
      await notionOAuth.logout();
      this.updateUI(false);
      this.uiController.clearOutput();
      this.elements.exportButton.disabled = true;
      this.elements.exportButton.style.opacity = "0.5";
    } catch (error) {
      console.error("Logout failed:", error);
      this.uiController.showError("Failed to logout: " + error.message);
    }
  }
}

// =============================================================================
// LOADING MANAGER - Handles loading states
// =============================================================================
class LoadingManager {
  constructor(elements) {
    this.elements = elements;
  }

  show() {
    this.elements.loadingContainer.style.display = 'flex';
    this.elements.fetchButton.disabled = true;
    this.elements.fetchButton.style.opacity = '0.6';
    
    if (this.elements.loadingText) {
      this.elements.loadingText.style.display = 'none';
    }
    
    this.expandPanelIfInOverlay();
  }

  hide() {
    this.elements.loadingContainer.style.display = 'none';
    this.elements.fetchButton.disabled = false;
    this.elements.fetchButton.style.opacity = '1';
    
    if (this.elements.loadingText) {
      this.elements.loadingText.style.display = 'block';
    }
  }

  expandPanelIfInOverlay() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: "expandPanel" }, "*");
    }
  }
}

// =============================================================================
// FLASHCARD GENERATOR - Handles flashcard generation
// =============================================================================
class FlashcardGenerator {
  constructor(uiController, loadingManager) {
    this.uiController = uiController;
    this.loadingManager = loadingManager;
  }

  async generate(pageId) {
    this.loadingManager.show();
    this.uiController.clearOutput();
    this.uiController.updateStatus("");
    
    try {
      const accessToken = await this.getAccessToken();
      this.validatePageId(pageId);
      
      const notionText = await this.fetchContent(accessToken, pageId);
      const { cards, costInfo } = await this.generateCards(notionText);
      
      this.displayCards(cards, costInfo);
      await this.trackGeneration(costInfo);
      
    } catch (error) {
      console.error(error);
      this.uiController.showError(error.message || "Failed to generate flashcards.");
    } finally {
      this.loadingManager.hide();
    }
  }

  async getAccessToken() {
    const token = await notionOAuth.getAccessToken();
    if (!token) {
      throw new Error("No access token found. Please connect to Notion first.");
    }
    return token;
  }

  validatePageId(pageId) {
    if (!pageId || pageId.trim() === "") {
      throw new Error("Please select a Notion page from the dropdown.");
    }
  }

  async fetchContent(accessToken, pageId) {
    console.log("Fetching content for page:", pageId);
    
    const text = await fetchNotionContent(null, accessToken, pageId);
    
    if (!text.trim()) {
      throw new Error("No text content found in Notion page. Please check if the page has content and you have access.");
    }
    
    return text;
  }

  async generateCards(text) {
    const result = await generateFlashcards(text);
    return {
      cards: result.flashcards || result,
      costInfo: result.costInfo
    };
  }

  displayCards(cards, costInfo) {
    this.uiController.displayFlashcards(cards, () => {
      // Enable export button after flashcards are loaded
      const exportButton = document.getElementById("exportButton");
      exportButton.disabled = false;
      exportButton.style.opacity = "1";
      
      // Show cost information
      if (costInfo) {
        this.uiController.showCostInfo(costInfo);
      }
    });
  }

  async trackGeneration(costInfo) {
    const { user_email } = await chrome.storage.local.get(['user_email']);
    
    if (user_email) {
      const cost = costInfo?.totalCost || 0;
      console.log('📊 Tracking generation:', { user_email, cost });
      await incrementGenerations(user_email, cost);
    }
  }
}

// =============================================================================
// EXPORT MANAGER - Handles APKG export
// =============================================================================
class ExportManager {
  constructor(uiController) {
    this.uiController = uiController;
  }

  async export(button) {
    console.log("Export to Anki clicked");
    
    const cards = this.uiController.getCards();
    if (!cards || cards.length === 0) {
      alert("No flashcards to export!");
      return;
    }
    
    const originalText = this.uiController.showExportProgress(button);
    
    try {
      const result = await exportFlashcards(cards, "Notion Flashcards");
      
      if (result.success) {
        this.uiController.showExportSuccess(button, originalText, result.filename);
        await this.trackExport();
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error("Error exporting flashcards:", error);
      this.uiController.showExportError(button, originalText, error.message);
    }
  }

  async trackExport() {
    const { user_email } = await chrome.storage.local.get(['user_email']);
    
    if (user_email) {
      console.log('📦 Tracking Anki export for user:', user_email);
      await incrementAnkiExports(user_email);
    }
  }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================
class PopupApp {
  constructor() {
    this.state = new PopupState();
    this.elements = new DOMElements();
    this.uiController = new UIController();
    this.loadingManager = new LoadingManager(this.elements);
    this.pageManager = new PageManager(this.state, this.elements, this.uiController);
    this.authManager = new AuthManager(this.elements, this.uiController, this.pageManager);
    this.flashcardGenerator = new FlashcardGenerator(this.uiController, this.loadingManager);
    this.exportManager = new ExportManager(this.uiController);
  }

  initialize() {
    this.setupInitialState();
    this.attachEventListeners();
    this.authManager.initialize();
  }

  setupInitialState() {
    // Initialize export button as disabled
    this.elements.exportButton.disabled = true;
    this.elements.exportButton.style.opacity = "0.5";
  }

  attachEventListeners() {
    // Auth events
    this.elements.connectButton.addEventListener("click", () => {
      this.authManager.connect();
    });

    this.elements.logoutButton.addEventListener("click", () => {
      this.authManager.logout();
    });

    // Page selection events
    this.elements.notionPageDropdown.addEventListener("change", () => {
      this.pageManager.updateFetchButtonState();
    });

    // this.elements.refreshPagesButton.addEventListener("click", () => {
    //   this.pageManager.loadPages();
    // });

    // Flashcard generation
    this.elements.fetchButton.addEventListener("click", () => {
      const pageId = this.pageManager.getSelectedPageId();
      this.flashcardGenerator.generate(pageId);
    });

    // Export
    this.elements.exportButton.addEventListener("click", () => {
      this.exportManager.export(this.elements.exportButton);
    });
  }
}

// =============================================================================
// START APPLICATION
// =============================================================================
const app = new PopupApp();
app.initialize();