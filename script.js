let chatSessions = JSON.parse(localStorage.getItem('utilityAIChats')) || [];
let currentSessionId = null;

const historyList = document.getElementById('history-list');
const outputArea = document.getElementById('ai-output');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('ai-send');

// Initialize
if (chatSessions.length === 0) {
    createNewSession();
} else {
    currentSessionId = chatSessions[0].id;
    loadSession(currentSessionId);
}
updateHistoryUI();

function createNewSession() {
    const newSession = {
        id: Date.now().toString(),
        title: "New Operation...",
        messages: []
    };
    chatSessions.unshift(newSession);
    currentSessionId = newSession.id;
    saveToLocal();
    updateHistoryUI();
    loadSession(currentSessionId);
}

function updateHistoryUI() {
    historyList.innerHTML = '';
    chatSessions.forEach((session) => {
        // Phase 1 Fix: Hide completely empty chats from the sidebar unless it is the active one
        if (session.messages.length === 0 && session.id !== currentSessionId) return;
        
        const li = document.createElement('li');
        li.className = 'history-item';
        if(session.id === currentSessionId) li.style.fontWeight = 'bold';
        li.innerText = session.title;
        li.onclick = () => { loadSession(session.id); updateHistoryUI(); };
        historyList.appendChild(li);
    });
}

function loadSession(id) {
    currentSessionId = id;
    const session = chatSessions.find(s => s.id === id);
    outputArea.innerHTML = '';
    if (session && session.messages.length > 0) {
        session.messages.forEach(msg => appendMessage(msg.role, msg.parts[0].text));
    } else {
        appendMessage('model', '⚡ Utility AI Online. Ready for a new operation.');
    }
    closeSidebar();
}

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg-bubble ${role === 'user' ? 'msg-user' : 'msg-ai'}`;
    div.innerText = text;
    outputArea.appendChild(div);
    outputArea.scrollTop = outputArea.scrollHeight;
}

function saveToLocal() {
    localStorage.setItem('utilityAIChats', JSON.stringify(chatSessions));
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Phase 1 Fix: Lock the button so they can't spam
    sendBtn.disabled = true;
    userInput.value = '';
    
    appendMessage('user', text);
    
    const session = chatSessions.find(s => s.id === currentSessionId);
    if (session.messages.length === 0) {
        session.title = text.substring(0, 20) + '...';
        updateHistoryUI();
    }
    
    session.messages.push({ role: 'user', parts: [{ text: text }] });
    saveToLocal();

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'msg-bubble msg-ai';
    loadingDiv.innerHTML = '<span class="spinner"></span> Processing tactical data...';
    outputArea.appendChild(loadingDiv);
    outputArea.scrollTop = outputArea.scrollHeight;

    try {
        const response = await fetch('/api/bouncer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: session.messages })
        });

        const data = await response.json();
        outputArea.removeChild(loadingDiv);

        if (data.error) {
            appendMessage('model', `System Error: ${data.error}`);
        } else {
            const aiText = data.candidates[0].content.parts[0].text;
            appendMessage('model', aiText);
            session.messages.push({ role: 'model', parts: [{ text: aiText }] });
            saveToLocal();
        }
    } catch (error) {
        outputArea.removeChild(loadingDiv);
        appendMessage('model', 'Connection to Vercel lost. Check your network.');
    } finally {
        // Unlock the button when finished
        sendBtn.disabled = false;
    }
}

// Event Listeners
document.getElementById('new-chat-btn').onclick = createNewSession;
document.getElementById('clear-history-btn').onclick = () => {
    chatSessions = [];
    localStorage.removeItem('utilityAIChats');
    createNewSession();
};

sendBtn.onclick = sendMessage;
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Mobile Sidebar Logic
const sidebar = document.getElementById('mobile-sidebar');
const overlay = document.getElementById('sidebar-overlay');
document.getElementById('mobile-menu-btn').onclick = () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
};
function closeSidebar() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}
if(overlay) overlay.onclick = closeSidebar;
