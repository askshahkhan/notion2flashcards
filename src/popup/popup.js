const NOTION_API_KEY = "";
const NOTION_PAGE_ID = "";

const output = document.getElementById("output");
const statusDiv = document.getElementById("status");
let latestCards = []; // store generated flashcards

// --- Extract text from Notion block ---
function extractTextFromBlock(block) {
  const blockType = block.type;
  const blockObj = block[blockType] || {};
  let textSegments = [];

  if (blockObj.rich_text) {
    blockObj.rich_text.forEach(rt => textSegments.push(rt.plain_text || ""));
  } else if (blockObj.title) {
    textSegments.push(blockObj.title);
  }

  return textSegments.join("").trim();
}

// --- Recursively fetch Notion page blocks ---
async function fetchBlocksRecursive(blockId, allText = []) {
  let url = `https://api.notion.com/v1/blocks/${blockId}/children`;
  let hasMore = true;
  let startCursor = null;
  let count = 0;

  while (hasMore) {
    const query = startCursor ? `?start_cursor=${startCursor}` : "";
    const response = await fetch(url + query, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    for (const block of data.results) {
      count++;
      statusDiv.textContent = `Fetching Notion content… ${count} blocks`;
      const text = extractTextFromBlock(block);
      if (text) allText.push(text);
      if (block.has_children) {
        await fetchBlocksRecursive(block.id, allText);
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return allText;
}

// --- Generate flashcards ---
document.getElementById("fetchButton").addEventListener("click", async () => {
  output.innerHTML = "";
  latestCards = [];
  statusDiv.textContent = "Fetching Notion content…";

  try {
    const allText = await fetchBlocksRecursive(NOTION_PAGE_ID);
    const notionText = allText.join("\n\n");

    statusDiv.textContent = "Generating flashcards with GPT-4…";

    chrome.runtime.sendMessage(
      { action: "generateFlashcards", text: notionText },
      (response) => {
        if (response.success) {
          const cards = response.flashcards;
          latestCards = cards; // store for potential later use

          if (!cards.length) {
            output.textContent = "No flashcards generated.";
            statusDiv.textContent = "";
            return;
          }

          output.innerHTML = "";
          let index = 0;

          // Gradually append flashcards
          const interval = setInterval(() => {
            if (index < cards.length) {
              const card = cards[index];
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

              output.appendChild(cardDiv);
              index++;
              statusDiv.textContent = `Loaded ${index} / ${cards.length} flashcards…`;
            } else {
              clearInterval(interval);
              statusDiv.textContent = ""; // remove final message
            }
          }, 150);

        } else {
          output.textContent = "OpenAI failed: " + response.error;
          statusDiv.textContent = "";
        }
      }
    );

  } catch (err) {
    console.error(err);
    output.innerHTML = "Failed to fetch Notion page text.";
    statusDiv.textContent = "";
  }
});