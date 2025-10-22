// OAuth-only version - no fallback to hardcoded credentials

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
async function fetchBlocksRecursive(blockId, allText = [], onProgress = null, accessToken) {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

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
        "Authorization": `Bearer ${accessToken}`,
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
        await fetchBlocksRecursive(block.id, allText, onProgress, accessToken);
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  console.log(`Total blocks processed: ${count}, Total text segments: ${allText.length}`);
  return allText;
}

// Fetch available pages from Notion using search API
export async function fetchAvailablePages(accessToken) {
  if (!accessToken) {
    throw new Error("Access token is required. Please connect to Notion first.");
  }
  
  console.log("Fetching available pages from Notion...");
  
  const searchUrl = "https://api.notion.com/v1/search";
  
  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filter: {
        value: "page",
        property: "object"
      },
      page_size: 100 // Maximum allowed by Notion API
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Notion search API error:", errorData);
    throw new Error(`Notion search API request failed: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log("Notion search API response:", data);
  
  // Extract page information and format for dropdown
  const pages = data.results.map(page => ({
    id: page.id,
    title: page.properties?.title?.title?.[0]?.plain_text || 
           page.properties?.Name?.title?.[0]?.plain_text || 
           'Untitled Page',
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time
  })).sort((a, b) => new Date(b.last_edited_time) - new Date(a.last_edited_time)); // Sort by most recent first
  
  console.log("Extracted pages:", pages);
  return pages;
}

// Main function to fetch all content from Notion page
export async function fetchNotionContent(onProgress = null, accessToken, pageId) {
  if (!accessToken) {
    throw new Error("Access token is required. Please connect to Notion first.");
  }
  
  if (!pageId) {
    throw new Error("Page ID is required. Please select a page.");
  }
  
  console.log("Starting Notion fetch for page ID:", pageId);
  const allText = await fetchBlocksRecursive(pageId, [], onProgress, accessToken);
  const notionText = allText.join("\n\n");
  
  console.log("Extracted text length:", notionText.length);
  console.log("First 200 chars of text:", notionText.substring(0, 200));
  
  if (!notionText.trim()) {
    throw new Error("No text content found in Notion page. Please check if the page has content and you have access.");
  }
  
  return notionText;
}