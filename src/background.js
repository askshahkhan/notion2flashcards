import { OPENAI_API_KEY } from '../secrets.js';
import { CostCalculator } from './utils/cost-calculator.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateFlashcards") {
        (async () => {
            try {
                console.log("Received text length:", request.text ? request.text.length : 0);
                console.log("First 200 chars:", request.text ? request.text.substring(0, 200) : "No text");
                
                if (!request.text || request.text.trim().length < 10) {
                    throw new Error("Text content is too short or empty. Please ensure the Notion page has sufficient content.");
                }
                
                const prompt = `
You are an expert at creating study flashcards.
Given the following text, generate concise flashcards.
Output ONLY a JSON list in this format:
[{"question": "...", "answer": "..."}]

Text:
${request.text}
                `;

                console.log("Making API request...");
                
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "You are a helpful assistant that generates study flashcards. Always respond with valid JSON ONLY. Make sure it is in correct format or else parsing will not work." },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1500,
                        temperature: 0.7
                    })
                });

                console.log("Response status:", response.status);
                console.log("Response ok:", response.ok);

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error("API Error Response:", errorData);
                    throw new Error(`API request failed: ${response.status} - ${errorData}`);
                }

                const data = await response.json();
                console.log("Full API response:", JSON.stringify(data, null, 2));

                // Calculate cost if usage data is available
                let costInfo = null;
                if (data.usage) {
                    costInfo = CostCalculator.calculateCost('gpt-3.5-turbo', data.usage);
                    if (costInfo) {
                        const formatted = CostCalculator.formatCostDisplay(costInfo);
                        console.log("💰 API Cost:", formatted.detailed);
                    }
                }

                // Check if the response has the expected structure
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    console.error("Unexpected API response structure:", data);
                    throw new Error("Invalid API response structure - no choices found");
                }

                const rawText = data.choices[0].message.content;
                console.log("Raw content from API:", rawText);

                if (!rawText || rawText.trim() === "") {
                    console.error("Empty content from API");
                    throw new Error("Empty response from API - no content generated");
                }

                // Try to parse JSON
                let flashcards;
                try {
                    // Clean the response in case there's extra text
                    const jsonMatch = rawText.match(/\[.*\]/s);
                    const jsonString = jsonMatch ? jsonMatch[0] : rawText;
                    
                    flashcards = JSON.parse(jsonString);
                    console.log("Parsed flashcards:", flashcards);
                } catch (err) {
                    console.error("Failed to parse JSON from OpenAI:", rawText);
                    console.error("Parse error:", err.message);
                    
                    // Fallback: create a single flashcard with the raw response
                    flashcards = [{
                        question: "Generated content (parsing failed)",
                        answer: rawText
                    }];
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