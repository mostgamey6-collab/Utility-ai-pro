// --- PART 1: LOGIN MEMORY & TRANSITION ---
const form = document.querySelector("form");
const waitlistSection = document.getElementById("waitlist-section");
const appLayout = document.getElementById("app-layout"); 

if (localStorage.getItem('utilityAI_access') === 'granted') {
    waitlistSection.style.display = "none";
    appLayout.style.display = "flex"; 
}

if (form) {
    const button = form.querySelector("button[type='submit']");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); 
      button.disabled = true;
      button.innerText = "Authenticating...";
      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          localStorage.setItem('utilityAI_access', 'granted');
          waitlistSection.style.display = "none";
          appLayout.style.display = "flex"; 
        } else {
          button.innerText = "Error. Try again.";
          button.disabled = false;
        }
      } catch (error) {
        button.innerText = "Network Error";
        button.disabled = false;
      }
    });
}

// --- PART 1.5: THE BLUR MENU LOGIC ---
const menuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('mobile-sidebar');
const overlay = document.getElementById('sidebar-overlay'); // The new frosted glass

// Open menu AND fade in blur
menuBtn.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});

// Tap the blur to close everything smoothly
overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// --- PART 2: THE SECURE AI TERMINAL ---
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send');
const aiOutput = document.getElementById('ai-output');
const intensitySlider = document.getElementById('intensity');
const intensityLabel = document.getElementById('intensity-label');
const shareBtn = document.getElementById('share-chat-btn');

intensitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val == 1) intensityLabel.innerText = "Brief";
    else if (val == 2) intensityLabel.innerText = "Normal";
    else intensityLabel.innerText = "In-Depth";
});

shareBtn.addEventListener('click', () => {
    const allAiMessages = document.querySelectorAll('.msg-ai');
    if (allAiMessages.length > 1) {
        const lastMsg = allAiMessages[allAiMessages.length - 1].innerText;
        navigator.clipboard.writeText("Utility AI Loadout:\n\n" + lastMsg);
        alert("Tactical Intel copied to clipboard! Ready to share.");
    } else {
        alert("No intel to share yet. Ask for a loadout first!");
    }
});

aiSendBtn.addEventListener('click', sendInquiry);
aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendInquiry(); });

async function sendInquiry() {
    const userText = aiInput.value;
    if (!userText) return;

    aiOutput.innerHTML += `<div class="msg-bubble msg-user">${userText}</div>`;
    aiInput.value = ''; 
    
    const loaderId = 'loader-' + Date.now();
    aiOutput.innerHTML += `<div id="${loaderId}" class="msg-bubble msg-ai"><div class="spinner"></div> Analyzing...</div>`;
    document.getElementById(loaderId).scrollIntoView({ behavior: 'smooth' });

    let detailInstruction = "Give a standard, balanced response.";
    if (intensitySlider.value == 1) detailInstruction = "Be extremely brief. Only give the raw attachments, no extra talking or explanations.";
    if (intensitySlider.value == 3) detailInstruction = "Be highly detailed. Explain exactly why you chose each attachment and how it affects recoil, ADS speed, and movement.";

    const persona = `You are Utility AI, an elite Call of Duty: Mobile coach. You specialize in sniper loadouts. Give precise gunsmith attachments. Keep responses highly tactical but add a touch of dry humor. Do not insult the player directly. ${detailInstruction}`;

    try {
        const response = await fetch(`/.netlify/functions/bouncer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userInquiry: `System Instruction: ${persona}\n\nUser Inquiry: ${userText}`
            })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanHTML = marked.parse(rawText);

        const aiMsgId = 'msg-' + Date.now();
        const loaderEl = document.getElementById(loaderId);
        loaderEl.outerHTML = `<div id="${aiMsgId}" class="msg-bubble msg-ai">${cleanHTML}</div>`;
        document.getElementById(aiMsgId).scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        const loaderEl = document.getElementById(loaderId);
        if(loaderEl) loaderEl.outerHTML = `<div class="msg-bubble msg-ai" style="color: red;">Connection to tactical server lost.</div>`;
    }
}
