"""
Kerala Tourism Chatbot — Flask Backend
Serves the /chat API endpoint, builds system prompt, calls OpenRouter API.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from knowledge_base import KERALA_KNOWLEDGE_BASE

load_dotenv()

app = Flask(__name__)
CORS(app)  # Allow all origins (frontend is on a different domain)

# Configure OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = None
if OPENROUTER_API_KEY:
    client = openai.OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )

# ── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = f"""
You are a friendly and knowledgeable Kerala Tourism Guide chatbot.
Your name is KT (Kerala Tourism Bot).
You only answer questions related to Kerala — its places, food, festivals, culture, travel tips, and traditions.
If asked about unrelated topics, politely redirect the user to ask about Kerala tourism.
Always be warm, helpful, and use a conversational tone.
Occasionally use Malayalam greetings like "Namaskaram" or "Nanni" naturally and appropriately.

Kerala Knowledge Base:
{KERALA_KNOWLEDGE_BASE}

Maintain conversation history and refer back to previous messages when relevant.
Keep responses concise but informative. Use bullet points for lists where appropriate.
Format your responses neatly. Do not use excessive markdown — plain bullet points are fine.
"""

# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "Kerala Tourism Chatbot API is running 🌴"})


@app.route("/chat", methods=["POST"])
def chat():
    """
    POST /chat
    Body: { "message": "...", "history": [{role, content}, ...] }
    Returns: { "reply": "..." }
    """
    if not client:
        return jsonify({
            "error": "OPENROUTER_API_KEY not configured",
            "reply": "Sorry, the chatbot is not configured yet. Please set the OPENROUTER_API_KEY."
        }), 500

    data = request.get_json(force=True)
    user_message = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Empty message", "reply": "Please ask me something about Kerala!"}), 400

    if len(user_message) > 500:
        return jsonify({"error": "Message too long", "reply": "Please keep your question under 500 characters."}), 400

    try:
        # Build chat history for multi-turn conversation
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            messages.append({"role": role, "content": content})

        # Append the current user message
        messages.append({"role": "user", "content": user_message})

        # Call OpenRouter API (using a free tier model)
        response = client.chat.completions.create(
            model="arcee-ai/trinity-large-preview:free",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        reply_text = response.choices[0].message.content

        return jsonify({"reply": reply_text})

    except Exception as e:
        print(f"OpenRouter API Error: {e}")
        return jsonify({
            "reply": "Sorry, I couldn't connect right now. Please try again in a moment! 🙏"
        }), 500


# ── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
