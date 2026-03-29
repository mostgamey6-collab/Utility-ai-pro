exports.handler = async function(event, context) {
    // 1. Security Check: Only allow POST requests (no snooping!)
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // 2. Read what the user asked the AI on the frontend
        const body = JSON.parse(event.body);
        const userText = body.userInquiry;

        // 3. THE VAULT: Grab your secret key from Netlify's locked environment
        const API_KEY = process.env.GEMINI_API_KEY;

        // 4. Make the secure, hidden call to the Gemini Supercomputer
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userText }] }]
            })
        });

        const data = await response.json();

        // 5. Send the tactical advice back to the website safely
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Tactical Server Error. Bouncer down." })
        };
    }
};
