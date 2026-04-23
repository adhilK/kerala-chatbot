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


@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    """
    POST /chat
    Body: { "message": "...", "history": [{role, content}, ...] }
    Returns: { "reply": "..." }
    """
    if request.method == "OPTIONS":
        # Handle explicitly for Serverless environments that strip headers
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

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
            model="google/gemini-2.0-flash-001",
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


# ── Itinerary Planner Route ───────────────────────────────────────────────────

ITINERARY_SYSTEM_PROMPT = """You are an expert Kerala travel planner. Generate detailed, practical day-by-day itineraries.
Always use EXACTLY this format for every day — do not deviate:

Day N: [Catchy Day Title]
Morning: [2-3 specific activities with real place names, timings, entry fees if any]
Afternoon: [2-3 specific activities with real place names, what to expect]
Evening: [Activity + specific local food recommendation with dish/restaurant name]
Stay: [Accommodation area with price range in INR]
Tip: [One practical local tip - weather, transport, cultural etiquette, bargaining, etc.]

Be specific. Use real Kerala place names, actual costs in INR, real distances/timings.
Include travel logistics on Day 1 (how to get from origin to destination, duration, options).
"""

@app.route("/itinerary", methods=["POST", "OPTIONS"])
def itinerary():
    if request.method == "OPTIONS":
        resp = jsonify()
        resp.headers.add("Access-Control-Allow-Origin", "*")
        resp.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        resp.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return resp

    if not client:
        return jsonify({
            "error": "OPENROUTER_API_KEY not configured",
            "plan": "Chatbot not configured. Please set OPENROUTER_API_KEY."
        }), 500

    data        = request.get_json(force=True)
    from_city   = data.get("from", "Kochi")
    to_city     = data.get("to", "Munnar")
    days        = min(int(data.get("days", 3)), 7)
    style       = ", ".join(data.get("style", ["Relaxation"]))
    transport   = data.get("transport", "Car")
    travelers   = data.get("travelers", 2)

    user_prompt = (
        f"Plan a detailed {days}-day trip from {from_city} to {to_city} "
        f"for {travelers} traveler(s). Travel style: {style}. "
        f"Preferred transport: {transport}.\n\n"
        f"Include realistic travel time from {from_city} to {to_city} on Day 1. "
        f"Cover specific places, food, costs in INR, and local tips. "
        f"Format strictly as Day 1, Day 2, ... with Morning / Afternoon / Evening / Stay / Tip sections."
    )

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[
                {"role": "system", "content": ITINERARY_SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        plan_text = response.choices[0].message.content
        return jsonify({"plan": plan_text})

    except Exception as e:
        print(f"Itinerary API Error: {e}")
        return jsonify({"plan": "Sorry, couldn't generate the itinerary right now. Please try again! 🙏"}), 500


# ── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
