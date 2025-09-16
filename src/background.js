const OPENAI_API_KEY = ""

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generateFlashcards") {
        (async () => {
            try {
                const prompt = `
You are an expert at creating study flashcards.
Given the following text, generate concise flashcards.
Output ONLY a JSON list in this format:
[{"question": "...", "answer": "..."}]

Text:
${request.text}
                `;

                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4",
                        messages: [
                            { role: "system", content: "You are a helpful assistant." },
                            { role: "user", content: prompt }
                        ],
                        max_tokens: 1000
                    })
                });

                const data = await response.json();
                const rawText = data.choices?.[0]?.message?.content || "[]";

                // Try to parse JSON
                let flashcards;
                try {
                    flashcards = JSON.parse(rawText);
                } catch (err) {
                    flashcards = [];
                    console.error("Failed to parse JSON from OpenAI:", rawText);
                }

                sendResponse({ success: true, flashcards });

            } catch (err) {
                console.error(err);
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true; // important for async sendResponse
    }
});