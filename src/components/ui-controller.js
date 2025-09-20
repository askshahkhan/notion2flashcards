export class UIController {
  constructor() {
    this.output = document.getElementById("output");
    this.statusDiv = document.getElementById("status");
    this.fetchButton = document.getElementById("fetchButton");
    this.latestCards = []; // Store flashcards for export
  }

  // Update status message
  updateStatus(message, color = '') {
    this.statusDiv.textContent = message;
    this.statusDiv.style.color = color;
  }

  // Clear the output area
  clearOutput() {
    this.output.innerHTML = "";
    this.latestCards = [];
  }

  // Show error message
  showError(message) {
    this.output.textContent = message;
    this.updateStatus("");
  }

  // Store cards for later export
  setCards(cards) {
    this.latestCards = cards;
  }

  // Get stored cards
  getCards() {
    return this.latestCards;
  }

  // Create a single flashcard element
  createFlashcardElement(card) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "flashcard";

    const qDiv = document.createElement("div");
    qDiv.className = "question";
    qDiv.textContent = card.question;

    const aDiv = document.createElement("div");
    aDiv.className = "answer";
    aDiv.textContent = card.answer;

    cardDiv.appendChild(qDiv);
    cardDiv.appendChild(aDiv);

    // Toggle answer visibility
    cardDiv.addEventListener("click", () => {
      cardDiv.classList.toggle("revealed");
    });

    return cardDiv;
  }

  // Display flashcards with animation
  displayFlashcards(cards, onComplete = null) {
    this.clearOutput();
    this.setCards(cards);
    let index = 0;

    // Gradually append flashcards
    const interval = setInterval(() => {
      if (index < cards.length) {
        const card = cards[index];
        const cardDiv = this.createFlashcardElement(card);
        this.output.appendChild(cardDiv);
        index++;
        this.updateStatus(`Loaded ${index} / ${cards.length} flashcards…`);
      } else {
        clearInterval(interval);
        this.updateStatus(""); // remove final message
        
        if (onComplete) {
          onComplete();
        }
      }
    }, 150);
  }

  // Add the export button
  addExportButton(onExportClick) {
    // Check if button already exists to avoid duplicates
    if (document.getElementById("secondaryButton")) {
      return;
    }

    const secondaryButton = document.createElement("button");
    secondaryButton.id = "secondaryButton";
    secondaryButton.textContent = "Export to Anki";
    secondaryButton.className = "secondary-button";
    
    // Add click handler
    secondaryButton.addEventListener("click", async () => {
      await onExportClick(secondaryButton);
    });
    
    // Insert the button after the main button
    this.fetchButton.parentNode.insertBefore(secondaryButton, this.fetchButton.nextSibling);
  }

  // Show export progress
  showExportProgress(button) {
    const originalText = button.textContent;
    button.textContent = "Generating APKG...";
    button.disabled = true;
    return originalText;
  }

  // Show export success
  showExportSuccess(button, originalText, filename) {
    this.updateStatus(`APKG file "${filename}" downloaded!`, "#2eaadc");
    
    // Reset button after 3 seconds
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
      this.updateStatus("");
    }, 3000);
  }

  // Show export error
  showExportError(button, originalText, error) {
    alert("Error generating APKG: " + error);
    button.textContent = originalText;
    button.disabled = false;
  }
}