// --- PART 1: THE WAITLIST, TRANSITION & MEMORY ---
const form = document.querySelector("form");
const button = document.querySelector("button[type='submit']");
const waitlistSection = document.getElementById("waitlist-section");
const chatSection = document.getElementById("chat-section");

// THE MEMORY CHECK: If they already logged in before, skip the waitlist entirely!
if (localStorage.getItem('utilityAI_access') === 'granted') {
    waitlistSection.style.display = "none";
    chatSection.style.display = "flex"; // Changed to flex to match your new CSS
}

form.addEventListener("submit", async (e) => {
  e.preventDefault(); 
  button.disabled = true;
  button.innerText = "Authenticating...";

  const data = new FormData(form);
  
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      // THE MEMORY SAVE: Lock their VIP pass into the browser
      localStorage.setItem('utilityAI_access', 'granted');
      
      waitlistSection.style.display = "none";
      chatSection.style.display = "flex"; 
    } else {
      button.innerText = "Error. Try again.";
      button.disabled = false;
    }
  } catch (error) {
    button.innerText = "Network Error";
    button.disabled = false;
  }
});

// --- PART 2: THE SECURE AI TERMINAL ENGINE ---
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send');
const aiOutput = document.getElementById('ai-output');

const persona = "You are Utility AI, an elite Call of Duty: Mobile coach. You specialize in sniper loadouts. Give precise gunsmith attachments. Keep responses highly tactical but add a touch of dry humor and mild sarcasm. Do not insult the player directly. Use bullet points for loadouts.";

aiSendBtn.addEventListener('click', async () => {
    const userText = aiInput.value;
    if (!userText) return;

    aiOutput.innerHTML += `<div class="msg-bubble msg-user">${userText}</div>`;
    aiInput.value = ''; 
    
    const loaderId = 'loader-' + Date.now();
    aiOutput.innerHTML += `<div id="${loaderId}" class="msg-bubble msg-ai"><div class="spinner"></div> Analyzing...</div>`;
    
    document.getElementById(loaderId).scrollIntoView({ behavior: 'smooth' });

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
        if(loaderEl) {
            loaderEl.outerHTML = `<div class="msg-bubble msg-ai" style="color: red;">Connection to tactical server lost.</div>`;
        }
    }
});
