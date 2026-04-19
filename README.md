# 🌴 Kerala Tourism Guide Chatbot

> **IBM Internship Project** | Kerala-focused AI chatbot powered by OpenRouter

A browser-based chatbot that answers queries about Kerala's places, food, festivals, backwaters, and travel tips — and now generates personalised day-by-day trip itineraries. Built with a Flask backend (deployed on Vercel) and a pure HTML/CSS/JS frontend.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/adhilK/kerala-chatbot.git
cd kerala-chatbot
```

### 2. Set up the Backend
```bash
cd backend
pip install -r requirements.txt

# Copy the env template and add your OpenRouter API key
cp .env.example .env
# Edit .env → OPENROUTER_API_KEY=your_actual_key_here

python app.py   # Runs on http://localhost:5000
```

Get a free OpenRouter API key at: https://openrouter.ai/

### 3. Run the Frontend

> ⚠️ Use **VS Code Live Server** — do NOT open `index.html` directly as a `file://` URL. Browsers block API calls from `file://` origins (CORS).

- Right-click `docs/index.html` → **Open with Live Server**
- It will open at `http://127.0.0.1:5500`
- For local dev, set `API_URL` in `docs/script.js` to `http://localhost:5000/chat`

---

## 🏗️ Project Structure

```
kerala-chatbot/
├── docs/                       # Frontend — served via GitHub Pages
│   ├── index.html              # Chat UI + Itinerary modal
│   ├── style.css               # Kerala green theme + responsive + modal styles
│   └── script.js               # Chat logic, itinerary form, accordion card renderer
├── backend/
│   ├── app.py                  # Flask server — /chat + /itinerary routes
│   ├── knowledge_base.py       # Kerala tourism facts (injected into system prompt)
│   ├── requirements.txt
│   └── .env.example            # Environment variables template
├── app.py                      # Root Flask entry point (used by Vercel)
├── vercel.json                 # Vercel deployment config
├── .gitignore
└── README.md
```

---

## 🌐 Deployment

### Backend → Vercel
1. Push the repo to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set environment variable: `OPENROUTER_API_KEY=your_key`
4. Deploy — Vercel auto-detects `vercel.json`

> To force a redeploy manually: `npx vercel path/to/kerala-chatbot --prod`

### Frontend → GitHub Pages
1. Go to repo **Settings → Pages**
2. Set source to `main` branch, `/docs` folder
3. Update `API_URL` in `script.js` to your Vercel backend URL

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Kerala-specific AI responses | ✅ |
| Multi-turn conversation memory | ✅ |
| Quick reply chips (6 topics) | ✅ |
| **🗓️ Itinerary Planner** | ✅ **New** |
| Typing animation indicator | ✅ |
| Mobile responsive (375px+) | ✅ |
| Error handling & fallback | ✅ |
| Input character limit (500) | ✅ |
| Smooth scroll to latest | ✅ |

---

## 🗓️ Itinerary Planner — Feature Details

Triggered by the **🗓️ Plan My Trip** chip (first chip in the bar).

### User Flow
1. Click **🗓️ Plan My Trip** → modal form slides up
2. Fill in trip details:
   - **Starting City** (Kochi, TVM, Kozhikode, Thrissur, Kannur, Kollam, Palakkad)
   - **Destination** (Munnar, Alleppey, Wayanad, Thekkady, Varkala, Kovalam, Fort Kochi, etc.)
   - **Number of Days** (1–7)
   - **Travelers** count
   - **Transport mode** (Car / Bus / Train / Any)
   - **Travel Style** — multi-select (Adventure, Relaxation, Culture, Food, Nature, Family)
3. Click **✨ Generate Itinerary** → form closes, summary appears as a user message
4. KT responds with an **accordion card** — one expandable section per day

### Itinerary Card Structure
Each day card shows:
- 🌅 **Morning** — 2–3 activities with real place names & timings
- ☀️ **Afternoon** — activities with entry fees / what to expect
- 🌙 **Evening** — activity + local food recommendation
- 🏨 **Stay** — accommodation area with INR price range
- 💡 **Tip** — one practical local tip per day

Day 1 is expanded by default; all others are collapsible.

### Backend
- **Endpoint:** `POST /itinerary`
- **Model:** `meta-llama/llama-3.1-8b-instruct:free` via OpenRouter
- **Max tokens:** 2000 (4× the regular chat limit)
- **Prompt:** Structured system prompt enforcing strict day/slot formatting so the frontend can parse and render it cleanly

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML + CSS + Vanilla JavaScript |
| Backend | Python (Flask) |
| AI API | OpenRouter (`meta-llama/llama-3.1-8b-instruct:free`) via OpenAI SDK |
| Deployment | GitHub Pages (frontend) + Vercel (backend) |

---

## 🔑 Environment Variables

```env
# backend/.env  — NEVER commit this file
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

---

## 📋 License

IBM Internship Project
