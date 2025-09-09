import 'dotenv/config';
import { Client as NotionClient } from "@notionhq/client";
import OpenAI from "openai";
import pkg from "file-saver"; // FIXED
const { saveAs } = pkg;
import { default as AnkiExport } from "anki-apkg-export";

// --- Load environment variables (Node.js only; for Chrome extension, use chrome.storage or manifest secrets) ---
const notionToken = process.env.NOTION_TOKEN;
const notionPageId = process.env.PAGE_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;

// --- Initialize clients ---
const notion = new NotionClient({ auth: notionToken });
const openai = new OpenAI({ apiKey: openaiApiKey });

// --- Notion text extraction ---
async function extractTextFromBlock(block) {
  const type = block.type;
  const blockObj = block[type] || {};

  let textSegments = [];

  if (blockObj.rich_text) {
    blockObj.rich_text.forEach(rt => {
      textSegments.push(rt.plain_text || "");
    });
  } else if (blockObj.title) {
    textSegments.push(blockObj.title);
  }

  return textSegments.join("").trim();
}

async function getPageText(pageId) {
  let allText = [];

  async function fetchBlocks(blockId) {
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const blocks = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: startCursor,
      });

      for (const block of blocks.results) {
        const text = await extractTextFromBlock(block);
        if (text) allText.push(text);

        if (block.has_children) {
          await fetchBlocks(block.id);
        }
      }

      hasMore = blocks.has_more;
      startCursor = blocks.next_cursor;
    }
  }

  await fetchBlocks(pageId);
  return allText.join("\n");
}

// --- OpenAI flashcard generation ---
async function generateFlashcards(text) {
  const prompt = `
You are an expert at creating study flashcards.
Given the following text, generate concise flashcards.
Output only a JSON list in this format:
[{"question": "...", "answer": "..."}]

Text:
${text}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o", // Or gpt-4 if your plan supports
    messages: [
      { role: "system", content: "You are an expert at creating study flashcards." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const content = completion.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch (err) {
    console.warn("Could not parse JSON. Raw content:", content);
    return [];
  }
}

// --- Convert to Anki .apkg format ---
async function exportToAnkiApkg(flashcards, filename = "anki_flashcards.apkg") {
  const deck = new AnkiExport("Generated Flashcards");

  flashcards.forEach(fc => {
    if (fc.question && fc.answer) {
      deck.addCard(fc.question, fc.answer);
    }
  });

  const zip = await deck.save();
  const blob = new Blob([zip], { type: "application/apkg" });

  // If in Chrome extension: trigger download
  saveAs(blob, filename);

  console.log(`Exported ${flashcards.length} flashcards to ${filename}`);
}

// --- Main ---
async function main() {
  console.log("Fetching all text from Notion page...");
  const pageText = await getPageText(notionPageId);
  console.log(`Extracted ${pageText.length} characters of text.`);

  console.log("Generating flashcards via OpenAI GPT-4...");
  const flashcards = await generateFlashcards(pageText);

  if (flashcards.length > 0) {
    console.log(`Generated ${flashcards.length} flashcards. Exporting to Anki .apkg...`);
    await exportToAnkiApkg(flashcards);
  } else {
    console.log("No flashcards generated.");
  }
}

main().catch(console.error);