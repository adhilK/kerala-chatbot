# 🌴 Kerala Tourism Guide Chatbot

> **IBM Internship Project** | Kerala-focused AI chatbot powered by OpenRouter

A browser-based chatbot that answers queries about Kerala's places, food, festivals, backwaters, and travel tips. Built with a Flask backend (deployed on Vercel) and a pure HTML/CSS/JS frontend.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/kerala-chatbot.git
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
```bash
cd docs
# Open index.html directly in your browser, OR use VS Code Live Server
```

> ⚠️ Make sure `API_URL` in `docs/script.js` is set to `http://localhost:5000/chat` for local development.

---

## 🏗️ Project Structure

```
kerala-chatbot/
├── docs/                   # Chat UI (formerly frontend folder)
│   ├── index.html          
│   ├── style.css           # Kerala green theme + responsive
│   └── script.js           # Chat logic, API calls, typing animation
├── backend/
│   ├── app.py              # Flask server + OpenRouter API integration
│   ├── knowledge_base.py   # Kerala tourism facts (injected into system prompt)
│   ├── requirements.txt
│   └── .env.example        # Environment variables template
├── vercel.json             # Vercel deployment config
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
| Quick reply chips (5 topics) | ✅ |
| Typing animation indicator | ✅ |
| Mobile responsive (375px+) | ✅ |
| Error handling & fallback | ✅ |
| Input character limit (500) | ✅ |
| Smooth scroll to latest | ✅ |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML + CSS + Vanilla JavaScript |
| Backend | Python (Flask) |
| AI API | OpenRouter (Google Gemini 2.0 Flash Lite Free) via OpenAI SDK |
| Deployment | GitHub Pages (frontend) + Vercel (backend) |

---

## 🔑 Environment Variables

```env
# backend/.env  — NEVER commit this file
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

---

## 📋 License

MIT — IBM Internship Project
