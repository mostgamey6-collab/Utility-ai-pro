export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const { systemInstruction, userInquiry, imageData, chatHistory } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        let formattedContents = [];

        // 1. Rebuild the chat history safely
        if (chatHistory && chatHistory.length > 0) {
            chatHistory.forEach(msg => {
                let cleanText = msg.content ? msg.content.replace(/<[^>]*>?/gm, '') : "";
                formattedContents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: cleanText }]
                });
            });
        }

        // 2. The Hack: Staple the System Persona directly to the user's prompt
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

                // 4. Send the payload to Google
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: formattedContents,
                tools: [{ googleSearch: {} }]
            })
        });

        const data = await response.json();

        // 5. Vercel's method of sending data back to the iPad
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message || 'Fatal Server Error' });
    }
}
