exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { systemInstruction, userInquiry, imageData, chatHistory } = body;
        const API_KEY = process.env.GEMINI_API_KEY;

        let formattedContents = [];

        // 1. Rebuild the chat history safely
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                // Clean out HTML tags before sending to Google
                let cleanText = msg.content ? msg.content.replace(/<[^>]*>?/gm, '') : "";
                formattedContents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: cleanText }]
                });
            });
        }

        // 2. The Hack: Staple the System Persona directly to the user's prompt so Google can't reject it
        let finalPrompt = userInquiry;
        if (formattedContents.length === 0) {
            finalPrompt = `SYSTEM INSTRUCTION: ${systemInstruction}\n\nUSER PROMPT: ${userInquiry}`;
        }

        let currentMessageParts = [{ text: finalPrompt }];

        // 3. Inject the Image if it exists
        if (imageData) {
            currentMessageParts.push({
                inlineData: { mimeType: "image/jpeg", data: imageData }
            });
        }

        formattedContents.push({
            role: "user",
            parts: currentMessageParts
        });

        // 4. Send the payload
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: formattedContents })
        });

        const data = await response.json();

        // IF GOOGLE REJECTS IT, PASS THE EXACT ERROR BACK TO THE IPAD!
        if (data.error) {
            return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };
        }

        return { statusCode: 200, body: JSON.stringify(data) };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Fatal Server Error' }) };
    }
};
