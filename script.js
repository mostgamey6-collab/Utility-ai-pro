// --- PART 1: UI & MENU LOGIC ---
const menuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('mobile-sidebar');
const overlay = document.getElementById('sidebar-overlay'); 
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const aiOutput = document.getElementById('ai-output');
const aiInput = document.getElementById('ai-input');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('image-upload');
const aiSendBtn = document.getElementById('ai-send');
const intensitySlider = document.getElementById('intensity');
const intensityLabel = document.getElementById('intensity-label');

// --- PART 2: THE LOCAL DATABASE (SESSIONS) ---
let chatSessions = JSON.parse(localStorage.getItem('utilityAI_sessions')) || [];
let currentSessionId = null; 
let selectedImageBase64 = null;

function loadSession(sessionId) {
    currentSessionId = sessionId;
    const session = chatSessions.find(s => s.id === sessionId);
    aiOutput.innerHTML = '';
    
    if (session && session.messages.length > 0) {
        session.messages.forEach(msg => {
            const bubbleClass = msg.role === 'user' ? 'msg-user' : 'msg-ai';
            aiOutput.innerHTML += `<div class="msg-bubble ${bubbleClass}">${msg.content}</div>`;
        });
    } else {
        aiOutput.innerHTML = `<div class="msg-bubble msg-ai">⚡ Utility AI Online. Ready for a new operation.</div>`;
    }
    
    aiOutput.scrollTop = aiOutput.scrollHeight;
    if(window.innerWidth <= 768) { sidebar.classList.remove('active'); overlay.classList.remove('active'); }
}

function updateHistoryUI() {
    historyList.innerHTML = '';
    chatSessions.forEach((session) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        if(session.id === currentSessionId) li.style.fontWeight = 'bold';
        li.innerText = session.title;
        li.onclick = () => { loadSession(session.id); updateHistoryUI(); };
        historyList.appendChild(li);
    });
}

function startNewChat() {
    currentSessionId = Date.now().toString(); 
    chatSessions.unshift({ id: currentSessionId, title: "New Operation...", messages: [] });
    if (chatSessions.length > 15) chatSessions.pop(); 
    saveDatabase(); loadSession(currentSessionId); updateHistoryUI();
}

function saveDatabase() { localStorage.setItem('utilityAI_sessions', JSON.stringify(chatSessions)); }

if (chatSessions.length === 0) startNewChat();
else { loadSession(chatSessions[0].id); updateHistoryUI(); }

// --- PART 3: EVENT LISTENERS ---
menuBtn.addEventListener('click', () => { sidebar.classList.add('active'); overlay.classList.add('active'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
newChatBtn.addEventListener('click', startNewChat);

clearHistoryBtn.addEventListener('click', () => {
    if(confirm("Erase all classified intel? This cannot be undone.")) {
        chatSessions = []; localStorage.removeItem('utilityAI_sessions'); startNewChat();
    }
});

attachBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        selectedImageBase64 = event.target.result.split(',')[1];
        attachBtn.style.color = "#22c55e"; 
    };
    reader.readAsDataURL(file);
});

intensitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    let labelTxt = val < 33 ? " (Brief)" : val < 66 ? " (Normal)" : " (In-Depth)";
    intensityLabel.innerText = `${val}%${labelTxt}`;
});

// --- PART 4: THE AI ENGINE ---
aiSendBtn.addEventListener('click', sendInquiry);
aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendInquiry(); });

async function sendInquiry() {
    const userText = aiInput.value.trim();
    if (!userText && !selectedImageBase64) return; 

    aiSendBtn.disabled = true;

    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session.messages.length === 0 && userText) {
        session.title = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
        updateHistoryUI();
    }

    let userDisplayHtml = userText;
    if (selectedImageBase64) userDisplayHtml = `📸 [Image Attached] <br>` + userText;
    
    const pastMemoryToPropagate = [...session.messages]; 
    session.messages.push({ role: 'user', content: userDisplayHtml });
    saveDatabase();

    aiOutput.innerHTML += `<div class="msg-bubble msg-user">${userDisplayHtml}</div>`;
    aiInput.value = ''; 
    
    const loaderId = 'loader-' + Date.now();
    aiOutput.innerHTML += `<div id="${loaderId}" class="msg-bubble msg-ai"><div class="spinner"></div> Analyzing Intel...</div>`;
    aiOutput.scrollTop = aiOutput.scrollHeight;

    const sliderVal = intensitySlider.value;
    let detailInstruction = sliderVal < 33 ? "CRITICAL: Be extremely brief. Direct answers only." : sliderVal < 66 ? "Provide a standard, balanced response." : "Be highly detailed and analytical.";
    const persona = `You are Utility AI, an elite Call of Duty: Mobile expert and coach. Answer exactly what the user asks. ${detailInstruction}`;

    try {
        const response = await fetch('/api/bouncer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: persona,
                userInquiry: userText || "Analyze this image.",
                imageData: selectedImageBase64,
                chatHistory: pastMemoryToPropagate 
            })
        });

        // THE RADAR FIX: Look directly at the error data!
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Server connection failed.");
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanHTML = marked.parse(rawText);

        const loaderEl = document.getElementById(loaderId);
        if(loaderEl) loaderEl.outerHTML = `<div class="msg-bubble msg-ai">${cleanHTML}</div>`;
        aiOutput.scrollTop = aiOutput.scrollHeight;

        session.messages.push({ role: 'model', content: cleanHTML });
        saveDatabase();

    } catch (error) {
        // Now it prints the exact reason it crashed!
        const loaderEl = document.getElementById(loaderId);
        if(loaderEl) loaderEl.outerHTML = `<div class="msg-bubble msg-ai" style="color: red;"><strong>System Error:</strong> ${error.message}</div>`;
    } finally {
        aiSendBtn.disabled = false;
        selectedImageBase64 = null;
        attachBtn.style.color = "var(--icon-color)"; 
    }
}
