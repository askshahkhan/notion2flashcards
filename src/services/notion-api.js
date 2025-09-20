import { NOTION_API_KEY, NOTION_PAGE_ID } from '../../secrets.js';

// Extract text from Notion block
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

// Recursively fetch Notion page blocks
async function fetchBlocksRecursive(blockId, allText = [], onProgress = null) {
  let url = `https://api.notion.com/v1/blocks/${blockId}/children`;
  let hasMore = true;
  let startCursor = null;
  let count = 0;

  while (hasMore) {
    const query = startCursor ? `?start_cursor=${startCursor}` : "";
    console.log(`Fetching Notion blocks from: ${url}${query}`);
    
    const response = await fetch(url + query, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      }
    });

    console.log("Notion API response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Notion API error:", errorData);
      throw new Error(`Notion API request failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("Notion API response data:", data);
    
    if (!data.results) {
      console.error("Unexpected Notion API response structure:", data);
      throw new Error("Invalid Notion API response structure");
    }
    
    for (const block of data.results) {
      count++;
      if (onProgress) {
        onProgress(`Fetching Notion content… ${count} blocks`);
      }
      
      const text = extractTextFromBlock(block);
      if (text) {
        allText.push(text);
        console.log(`Extracted text from block ${block.type}:`, text.substring(0, 100));
      }
      
      if (block.has_children) {
        await fetchBlocksRecursive(block.id, allText, onProgress);
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log(`Total blocks processed: ${count}, Total text segments: ${allText.length}`);
  return allText;
}

// Main function to fetch all content from Notion page
export async function fetchNotionContent(onProgress = null) {
  console.log("Starting Notion fetch for page ID:", NOTION_PAGE_ID);
  const allText = await fetchBlocksRecursive(NOTION_PAGE_ID, [], onProgress);
  const notionText = allText.join("\n\n");
  
  console.log("Extracted text length:", notionText.length);
  console.log("First 200 chars of text:", notionText.substring(0, 200));
  
  if (!notionText.trim()) {
    throw new Error("No text content found in Notion page. Please check if the page has content and the API key has access.");
  }
  
  return notionText;
}