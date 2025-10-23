import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../secrets.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateFlashcards") {
        (async () => {
            try {
                console.log("Received text length:", request.text ? request.text.length : 0);
                console.log("First 200 chars:", request.text ? request.text.substring(0, 200) : "No text");
                
                if (!request.text || request.text.trim().length < 10) {
                    throw new Error("Text content is too short or empty. Please ensure the Notion page has sufficient content.");
                }

                console.log("Calling Supabase Edge Function...");
                
                // Call Supabase Edge Function instead of OpenAI directly
                const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-flashcards`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        text: request.text
                    })
                });

                console.log("Response status:", response.status);
                console.log("Response ok:", response.ok);

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error("Edge Function Error Response:", errorData);
                    throw new Error(`Edge Function request failed: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                console.log("Edge Function response:", data);

                if (!data.success) {
                    throw new Error(data.error || "Unknown error from Edge Function");
                }

                const flashcards = data.flashcards;
                const costInfo = data.costInfo;

                if (costInfo) {
                    const formatted = `$${costInfo.totalCost.toFixed(4)} (${costInfo.totalTokens} tokens)`;
                    console.log("💰 API Cost:", formatted);
                }

                console.log("Sending response with flashcards:", flashcards);
                sendResponse({ 
                    success: true, 
                    flashcards,
                    costInfo: costInfo 
                });

            } catch (err) {
                console.error("Background script error:", err);
                sendResponse({ 
                    success: false, 
                    error: err.message,
                    details: err.toString()
                });
            }
        })();

        return true; // important for async sendResponse
    }
});