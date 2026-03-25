/**
 * Kerala Tourism Bot — script.js
 * Chat logic, API calls, typing animation, quick chip handling
 */

// ── Config ──────────────────────────────────────────────────────────────────

// Change to your Vercel backend URL when deployed, e.g.:
// const API_URL = "https://kerala-chatbot-backend.vercel.app/chat";
const API_URL = "http://localhost:5000/chat";

const GREETING = "Namaskaram! 🙏 I am KT, your Kerala Tourism Guide.\n\nAsk me about Kerala's stunning places, delicious food, vibrant festivals, or travel tips. I'm here to help you plan the perfect Kerala trip!";

const FALLBACK_ERROR = "Sorry, I couldn't connect right now. Please check your connection and try again! 🙏";

// ── State ────────────────────────────────────────────────────────────────────

/** @type {Array<{role: "user"|"assistant", content: string}>} */
let conversationHistory = [];
let isLoading = false;

// ── DOM References ────────────────────────────────────────────────────────────

const messagesArea  = document.getElementById("messagesArea");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const charCount     = document.getElementById("charCount");
const chipsContainer= document.getElementById("chipsContainer");

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  appendBotMessage(GREETING);
  setupEventListeners();
  userInput.focus();
});

// ── Event Listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  // Send on button click
  sendBtn.addEventListener("click", handleSend);

  // Send on Enter (Shift+Enter = newline)
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea + char count
  userInput.addEventListener("input", () => {
    autoResize(userInput);
    updateCharCount();
  });

  // Quick reply chips
  chipsContainer.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const msg = chip.dataset.msg;
      if (msg && !isLoading) {
        sendMessage(msg);
      }
    });
  });
}

// ── Send Handling ─────────────────────────────────────────────────────────────

function handleSend() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;
  sendMessage(text);
}

async function sendMessage(text) {
  if (isLoading) return;

  // Guard: max 500 chars
  if (text.length > 500) {
    appendBotMessage("⚠️ Please keep your message under 500 characters.", true);
    return;
  }

  // Show user message, clear input
  appendUserMessage(text);
  userInput.value = "";
  autoResize(userInput);
  updateCharCount();

  // Show typing indicator
  setLoading(true);
  const typingEl = showTypingIndicator();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: conversationHistory.slice(0, -1) // exclude latest user msg (already sent)
      }),
    });

    removeTypingIndicator(typingEl);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      appendBotMessage(errData.reply || FALLBACK_ERROR, true);
      return;
    }

    const data = await response.json();
    const reply = data.reply || FALLBACK_ERROR;

    // Update history with assistant reply
    conversationHistory.push({ role: "assistant", content: reply });

    appendBotMessage(reply);

  } catch (err) {
    console.error("Chat API error:", err);
    removeTypingIndicator(typingEl);
    appendBotMessage(FALLBACK_ERROR, true);
    // Remove the last user message from history on error
    conversationHistory.pop();
  } finally {
    setLoading(false);
  }
}

// ── Message Rendering ─────────────────────────────────────────────────────────

function appendUserMessage(text) {
  // Add to history
  conversationHistory.push({ role: "user", content: text });

  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `
    <div class="bubble user">${escapeHtml(text)}</div>
  `;

  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = getTime();

  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);

  messagesArea.appendChild(wrapper);
  scrollToBottom();
}

function appendBotMessage(text, isError = false) {
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.innerHTML = `
    <div class="msg-avatar">KT</div>
    <div class="bubble bot${isError ? " error" : ""}">${formatBotText(text)}</div>
  `;

  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = getTime();

  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);

  messagesArea.appendChild(wrapper);
  scrollToBottom();
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function showTypingIndicator() {
  const el = document.createElement("div");
  el.className = "typing-indicator";
  el.id = "typingIndicator";
  el.innerHTML = `
    <div class="msg-avatar">KT</div>
    <div class="typing-bubble">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  `;
  messagesArea.appendChild(el);
  scrollToBottom();
  return el;
}

function removeTypingIndicator(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ── UI State ──────────────────────────────────────────────────────────────────

function setLoading(loading) {
  isLoading = loading;
  sendBtn.disabled = loading;
  userInput.disabled = loading;
  if (loading) {
    userInput.placeholder = "KT is typing…";
  } else {
    userInput.placeholder = "Ask about Kerala...";
    userInput.focus();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: "smooth" });
  });
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function updateCharCount() {
  const len = userInput.value.length;
  charCount.textContent = `${len} / 500`;
  charCount.classList.toggle("warn",  len >= 400 && len < 480);
  charCount.classList.toggle("limit", len >= 480);
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Sanitize user text to prevent XSS
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Light markdown rendering for bot messages:
 * - **bold** → <strong>
 * - bullet lines starting with - or • → proper bullets
 * - newlines → <br>
 */
function formatBotText(text) {
  // Escape first time for safety
  let html = escapeHtml(text);
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Bullet lines starting with - or •
  html = html.replace(/^[-•]\s+(.+)/gm, '<span class="bullet">• $1</span>');
  // Newlines
  html = html.replace(/\n/g, "<br>");
  return html;
}
