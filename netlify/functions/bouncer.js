exports.handler = async function(event, context) {
    // Security check: Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body);
        const { systemInstruction, userInquiry, imageData, chatHistory } = body;
        const API_KEY = process.env.GEMINI_API_KEY;

        let formattedContents = [];

        // 1. MEMORY INJECTION: Load the past conversation context
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                // Strip out any HTML tags (like our camera icon) before sending to AI
                let cleanText = msg.content.replace(/<[^>]*>?/gm, '');
                formattedContents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: cleanText }]
                });
            });
        }

        // 2. Build the current message
        let currentMessageParts = [{ text: userInquiry }];

        // 3. VISION INJECTION: Attach the Image if the user uploaded one
        if (imageData) {
            currentMessageParts.push({
                inlineData: {
                    mimeType: "image/jpeg", // Gemini accepts jpeg/png/webp natively here
                    data: imageData
                }
            });
        }

        // Add the current message to the end of the history array
        formattedContents.push({
            role: "user",
            parts: currentMessageParts
        });

        // 4. Send the massive data package to Google Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: formattedContents
            })
        });

        const data = await response.json();

        // If Gemini rejects the image or crashes, catch the error
        if (data.error) {
            return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
        }

        // Send the AI's response back to your iPad
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server connection lost.' })
        };
    }
};
