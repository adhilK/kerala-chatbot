/**
 * Kerala Tourism Bot — script.js
 * Chat logic, API calls, typing animation, quick chip handling
 */

// ── Config ──────────────────────────────────────────────────────────────────

// Production backend — update this after each Vercel redeploy
const API_URL = "https://kerala-chatbot-83i8cn2t8-adhils-projects-e3c95620.vercel.app/chat";

// Itinerary endpoint — same host, different path
const ITINERARY_URL = API_URL.replace(/\/chat$/, "/itinerary");

const GREETING = "Namaskaram! 🙏 I am KT, your Kerala Tourism Guide.\n\nAsk me about Kerala's stunning places, delicious food, vibrant festivals, or travel tips. I'm here to help you plan the perfect Kerala trip!";

const FALLBACK_ERROR = "Sorry, I couldn't connect right now. Please check your connection and try again! 🙏";

// ── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE_HISTORY_KEY = "kt_conv_history";
const STORAGE_LOG_KEY     = "kt_chat_log";

// ── State ────────────────────────────────────────────────────────────────────

/** @type {Array<{role: "user"|"assistant", content: string}>} */
let conversationHistory = [];
let isLoading = false;

/**
 * chatLog stores every rendered message so we can re-draw on reload.
 * Each entry: { type, content, time, isError } | { type:'itinerary', ...itinData }
 * @type {Array}
 */
let chatLog = [];

// ── DOM References ────────────────────────────────────────────────────────────

const messagesArea = document.getElementById("messagesArea");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const charCount = document.getElementById("charCount");
const chipsContainer = document.getElementById("chipsContainer");

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  setupItineraryModal();

  // Restore previous session or show greeting on first load
  const restored = loadChatFromStorage();
  if (!restored) appendBotMessage(GREETING);

  userInput.focus();
});

// ── Event Listeners ───────────────────────────────────────────────────────────

function setupEventListeners() {
  // Send on button click
  sendBtn.addEventListener("click", handleSend);

  // Clear chat button
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearChat);

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

  // Quick reply chips (exclude the plan chip — handled separately)
  chipsContainer.querySelectorAll(".chip:not(.chip-plan)").forEach((chip) => {
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

  const time = getTime();
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `
    <div class="bubble user">${escapeHtml(text)}</div>
  `;

  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = time;

  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);

  messagesArea.appendChild(wrapper);
  scrollToBottom();

  // Persist
  chatLog.push({ type: "user", content: text, time });
  saveChatToStorage();
}

function appendBotMessage(text, isError = false, skipLog = false) {
  const time = getTime();
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.innerHTML = `
    <div class="msg-avatar">KT</div>
    <div class="bubble bot${isError ? " error" : ""}">${formatBotText(text)}</div>
  `;

  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = time;

  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);

  messagesArea.appendChild(wrapper);
  scrollToBottom();

  // Persist unless explicitly skipped (greeting is not saved)
  if (!skipLog) {
    chatLog.push({ type: "bot", content: text, time, isError });
    saveChatToStorage();
  }
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
  charCount.classList.toggle("warn", len >= 400 && len < 480);
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

// ══════════════════════════════════════════════════════════════════════════════
// ITINERARY PLANNER
// ══════════════════════════════════════════════════════════════════════════════

/** Selected transport (single) and style (multi) */
let selectedTransport = "Car";
let selectedStyles = new Set(["Adventure"]);

function setupItineraryModal() {
  const overlay = document.getElementById("itinOverlay");
  const closeBtn = document.getElementById("itinCloseBtn");
  const cancelBtn = document.getElementById("itinCancelBtn");
  const submitBtn = document.getElementById("itinSubmitBtn");
  const planChip = document.getElementById("chip-plan");

  // Open modal
  planChip.addEventListener("click", () => {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  });

  // Close helpers
  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Transport chip — single select
  document.querySelectorAll(".transport-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".transport-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      selectedTransport = chip.dataset.val;
    });
  });

  // Style chip — multi select (at least one always active)
  document.querySelectorAll(".style-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      const val = chip.dataset.val;
      if (chip.classList.contains("active")) {
        selectedStyles.add(val);
      } else {
        selectedStyles.delete(val);
        if (selectedStyles.size === 0) {
          chip.classList.add("active");
          selectedStyles.add(val);
        }
      }
    });
  });

  // Submit
  submitBtn.addEventListener("click", () => handleItinerarySubmit(closeModal));
}

async function handleItinerarySubmit(closeModal) {
  const fromCity = document.getElementById("itinFrom").value;
  const toCity = document.getElementById("itinTo").value;
  const days = Math.min(7, Math.max(1, parseInt(document.getElementById("itinDays").value, 10) || 3));
  const travelers = Math.max(1, parseInt(document.getElementById("itinTravelers").value, 10) || 2);

  // Validate: from ≠ to
  if (fromCity === toCity) {
    const toEl = document.getElementById("itinTo");
    toEl.style.borderColor = "#e74c3c";
    toEl.style.boxShadow = "0 0 0 3px rgba(231,76,60,.15)";
    setTimeout(() => { toEl.style.borderColor = ""; toEl.style.boxShadow = ""; }, 2000);
    return;
  }

  closeModal();

  const styleList = [...selectedStyles].join(", ");
  const summaryMsg = `Plan my ${days}-day trip from ${fromCity} to ${toCity} for ${travelers} traveler${travelers > 1 ? "s" : ""} — ${styleList}, by ${selectedTransport}.`;
  appendUserMessage(summaryMsg);

  setLoading(true);
  const typingEl = showTypingIndicator();

  try {
    const res = await fetch(ITINERARY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromCity,
        to: toCity,
        days: days,
        style: [...selectedStyles],
        transport: selectedTransport,
        travelers: travelers
      })
    });

    removeTypingIndicator(typingEl);

    const data = await res.json();
    const planText = data.plan || "Sorry, couldn't generate an itinerary right now. Please try again!";

    renderItineraryCard({ from: fromCity, to: toCity, days, transport: selectedTransport, travelers, styleList, planText });

  } catch (err) {
    console.error("Itinerary API error:", err);
    removeTypingIndicator(typingEl);
    appendBotMessage("Sorry, I couldn't generate the itinerary right now. Please try again! 🙏", true);
  } finally {
    setLoading(false);
  }
}

// ── Itinerary Card Renderer ───────────────────────────────────────────────────

function renderItineraryCard({ from, to, days, transport, travelers, styleList, planText }) {
  const parsedDays = parsePlanText(planText);

  const card = document.createElement("div");
  card.className = "itin-card";

  // Card header
  card.innerHTML = `
    <div class="itin-card-header">
      <div class="itin-card-route">🗺️ ${escapeHtml(from)} → ${escapeHtml(to)}</div>
      <div class="itin-card-meta">
        <span class="itin-meta-tag">📅 ${days} Day${days > 1 ? "s" : ""}</span>
        <span class="itin-meta-tag">👥 ${travelers} Traveler${travelers > 1 ? "s" : ""}</span>
        <span class="itin-meta-tag">${transport === "Car" ? "🚗" : transport === "Bus" ? "🚌" : transport === "Train" ? "🚂" : "✨"} ${escapeHtml(transport)}</span>
        <span class="itin-meta-tag">🎯 ${escapeHtml(styleList)}</span>
      </div>
    </div>
  `;

  // Slot definitions
  const SLOTS = [
    { key: "Morning", cls: "morning", emoji: "🌅" },
    { key: "Afternoon", cls: "afternoon", emoji: "☀️" },
    { key: "Evening", cls: "evening", emoji: "🌙" },
    { key: "Stay", cls: "stay", emoji: "🏨" },
    { key: "Tip", cls: "tip", emoji: "💡" },
  ];

  parsedDays.forEach((day, idx) => {
    const dayEl = document.createElement("div");
    // Day 1 open by default
    dayEl.className = "itin-day" + (idx === 0 ? " open" : "");

    let slotsHtml = "";
    SLOTS.forEach(({ key, cls, emoji }) => {
      if (day[key]) {
        slotsHtml += `
          <div class="itin-slot ${cls}">
            <span class="itin-slot-label">${emoji} ${key}</span>
            <span class="itin-slot-content">${formatBotText(day[key])}</span>
          </div>`;
      }
    });

    if (!slotsHtml) {
      // Fallback: show raw text
      slotsHtml = `<div class="itin-slot"><span class="itin-slot-content">${formatBotText(day.raw || "")}</span></div>`;
    }

    dayEl.innerHTML = `
      <div class="itin-day-header">
        <div class="itin-day-title">
          <span class="itin-day-badge">Day ${idx + 1}</span>
          <span class="itin-day-name">${escapeHtml(day.title || "")}</span>
        </div>
        <span class="itin-day-chevron">▼</span>
      </div>
      <div class="itin-day-body">${slotsHtml}</div>
    `;

    dayEl.querySelector(".itin-day-header").addEventListener("click", () => {
      dayEl.classList.toggle("open");
    });

    card.appendChild(dayEl);
  });

  // Wrap like a bot message
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.innerHTML = `<div class="msg-avatar">KT</div>`;
  row.appendChild(card);

  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = getTime();

  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);

  messagesArea.appendChild(wrapper);
  scrollToBottom();

  // Persist itinerary
  chatLog.push({ type: "itinerary", from, to, days, transport, travelers, styleList, planText, time: getTime() });
  saveChatToStorage();
}

/**
 * Parses LLM output into an array of day objects.
 * Expected format: "Day N: Title\nMorning: ...\nAfternoon: ...\n..."
 */
function parsePlanText(text) {
  const days = [];

  // Split on "Day N:" boundaries (case-insensitive)
  const chunks = text.split(/(?=\bDay\s+\d+\s*:)/i).filter(s => s.trim());

  chunks.forEach(chunk => {
    const titleMatch = chunk.match(/^Day\s+\d+\s*:\s*(.+)/i);
    const title = titleMatch ? titleMatch[1].split("\n")[0].trim() : "";

    const extract = (label) => {
      const re = new RegExp(
        `\\b${label}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:Morning|Afternoon|Evening|Stay|Tip)\\s*:|$)`,
        "i"
      );
      const m = chunk.match(re);
      return m ? m[1].trim() : "";
    };

    const obj = {
      title,
      Morning: extract("Morning"),
      Afternoon: extract("Afternoon"),
      Evening: extract("Evening"),
      Stay: extract("Stay"),
      Tip: extract("Tip"),
      raw: chunk
    };

    days.push(obj);
  });

  // If parsing totally failed, show everything as one block
  if (days.length === 0) {
    days.push({ title: "Your Itinerary", Morning: text, Afternoon: "", Evening: "", Stay: "", Tip: "", raw: text });
  }

  return days;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE PERSISTENCE
// ══════════════════════════════════════════════════════════════════════════════

/** Save current conversation to localStorage. */
function saveChatToStorage() {
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(conversationHistory));
    localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(chatLog));
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

/**
 * Load and re-render previous session from localStorage.
 * Returns true if anything was restored.
 */
function loadChatFromStorage() {
  try {
    const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
    const savedLog = localStorage.getItem(STORAGE_LOG_KEY);
    if (!savedLog) return false;

    const log = JSON.parse(savedLog);
    if (!log || log.length === 0) return false;

    conversationHistory = JSON.parse(savedHistory) || [];

    // Re-render each entry without re-saving (restore mode)
    const snapshot = [...log];
    chatLog = [];
    snapshot.forEach(entry => {
      if (entry.type === "user") {
        _renderUserBubble(entry.content, entry.time);
        chatLog.push(entry);
      } else if (entry.type === "bot") {
        _renderBotBubble(entry.content, entry.time, entry.isError);
        chatLog.push(entry);
      } else if (entry.type === "itinerary") {
        // renderItineraryCard pushes to chatLog internally, so skip manual push
        renderItineraryCard(entry);
        // Pop the duplicate that renderItineraryCard just pushed, use original
        chatLog.pop();
        chatLog.push(entry);
      }
    });
    scrollToBottom();
    return true;
  } catch (e) {
    console.warn("localStorage load failed:", e);
    return false;
  }
}

/** Render a user bubble without touching state (used during restore). */
function _renderUserBubble(text, time) {
  const row = document.createElement("div");
  row.className = "msg-row user";
  row.innerHTML = `<div class="bubble user">${escapeHtml(text)}</div>`;
  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = time || "";
  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);
  messagesArea.appendChild(wrapper);
}

/** Render a bot bubble without touching state (used during restore). */
function _renderBotBubble(text, time, isError = false) {
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.innerHTML = `
    <div class="msg-avatar">KT</div>
    <div class="bubble bot${isError ? " error" : ""}">\${formatBotText(text)}</div>
  `;
  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.textContent = time || "";
  const wrapper = document.createElement("div");
  wrapper.appendChild(row);
  wrapper.appendChild(ts);
  messagesArea.appendChild(wrapper);
}

/** Clear all chat — DOM, state, and storage. Shows fresh greeting. */
function clearChat() {
  if (!confirm("Clear chat history? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_HISTORY_KEY);
  localStorage.removeItem(STORAGE_LOG_KEY);
  conversationHistory = [];
  chatLog = [];
  messagesArea.innerHTML = "";
  appendBotMessage(GREETING, false, true); // skipLog = true
}
