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

  createFlashcardElement(card) {
    const cardDiv = document.createElement("div");
    cardDiv.className = "flashcard";
    cardDiv.style.position = "relative"; // needed for buttons

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

    // --- Delete button ---
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✖";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      cardDiv.remove();
      this.latestCards = this.latestCards.filter(c => c !== card);
      this.updateStatus(`${this.latestCards.length} cards remaining`);
    });
    cardDiv.appendChild(deleteBtn);

    // --- Edit button ---
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "✎"; // pencil icon
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.enableCardEditing(cardDiv, card, qDiv, aDiv);
    });
    cardDiv.appendChild(editBtn);

    return cardDiv;
  }

  enableCardEditing(cardDiv, card, qDiv, aDiv) {
    // Hide original text
    qDiv.style.display = "none";
    aDiv.style.display = "none";

    // Create input fields
    const qInput = document.createElement("input");
    qInput.type = "text";
    qInput.value = card.question;
    qInput.className = "edit-input";

    const aInput = document.createElement("textarea");
    aInput.value = card.answer;
    aInput.className = "edit-input";

    cardDiv.insertBefore(qInput, qDiv);
    cardDiv.insertBefore(aInput, aDiv);

    // Save button
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "save-btn";
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Update card data
      card.question = qInput.value;
      card.answer = aInput.value;

      // Update UI
      qDiv.textContent = card.question;
      aDiv.textContent = card.answer;

      // Remove inputs and save button
      qInput.remove();
      aInput.remove();
      saveBtn.remove();

      // Show original text again
      qDiv.style.display = "block";
      aDiv.style.display = "block";
    });

    cardDiv.appendChild(saveBtn);
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