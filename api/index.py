"""
Kerala Tourism Chatbot — Vercel Serverless Entry Point
Self-contained Flask app for zero-config Vercel API routing.
Vercel automatically routes api/index.py to /api/* requests.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import openai

app = Flask(__name__)
CORS(app, origins="*")

# ── Knowledge Base (inline for Vercel serverless) ─────────────────────────────
KERALA_KNOWLEDGE = """
Kerala, known as "God's Own Country", is a state in South India.

TOP DESTINATIONS:
- Munnar: High-altitude hill station with tea plantations, Eravikulam National Park, Mattupetty Dam
- Alleppey (Alappuzha): Famous for backwaters, houseboat cruises, Nehru Trophy Boat Race
- Wayanad: Forested hills, wildlife sanctuaries, Chembra Peak, Soochipara Falls
- Kovalam: Beach destination with lighthouse beach, Hawa beach, Samudra beach
- Thekkady (Periyar): Periyar Wildlife Sanctuary, spice gardens, elephant rides
- Fort Kochi: Historical area with Chinese fishing nets, Dutch Palace, Jewish Synagogue
- Varkala: Cliff-top beach, Papanasam beach, Janardhana Swami Temple
- Thrissur: Cultural capital, Thrissur Pooram festival
- Kozhikode (Calicut): Calicut beach, Kappad beach where Vasco da Gama landed
- Kannur: Beaches, Cantonment area, famous for Theyyam ritual

CUISINE:
- Kerala Sadya: Traditional feast served on banana leaf with rice and 20+ vegetarian dishes
- Fish curry (Meen curry): Spicy fish curry cooked in coconut milk
- Appam and Stew: Lacy rice pancakes with coconut milk stew
- Puttu and Kadala curry: Steamed rice cylinders with black chickpea curry
- Karimeen Pollichathu: Pearl spot fish grilled in banana leaf
- Kerala Prawn curry: Prawns in spicy coconut gravy
- Payasam: Sweet dessert made with rice/vermicelli, milk, and jaggery
- Kappa and Meen: Tapioca with fish curry

FESTIVALS:
- Onam (August-September): Harvest festival, Pookalam flower carpet, Vallam Kali boat race
- Thrissur Pooram (April-May): Grand elephant festival at Vadakkumnathan Temple
- Vishu (April): Malayalam New Year
- Theyyam: Ritual dance form in North Kerala (November to May)
- Christmas: Celebrated grandly with unique Kerala traditions

BACKWATERS:
- Alleppey backwaters are the most famous
- Kumarakom on Vembanad Lake
- Kollam to Alleppey is a popular all-day houseboat route
- Houseboat (Kettuvallam) cruises available in various sizes and price ranges

WILDLIFE:
- Wayanad Wildlife Sanctuary: Elephants, tigers, leopards
- Periyar Tiger Reserve: Boat safaris on Periyar Lake
- Silent Valley National Park: Pristine rainforest
- Eravikulam National Park: Home to Nilgiri Tahr

TRAVEL TIPS:
- Best time to visit: October to March (post-monsoon)
- Monsoon (June-September): Heavy rains, lush greenery, lower prices
- International airport: Cochin (Kochi) is the main airport
- Local transport: KSRTC buses, auto-rickshaws, ferry boats
- Language: Malayalam (English widely spoken)
- Currency: Indian Rupee (INR)
- Dress modestly when visiting temples
"""

# ── OpenRouter Config ─────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = None
if OPENROUTER_API_KEY:
    client = openai.OpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )

SYSTEM_PROMPT = f"""You are a friendly and knowledgeable Kerala Tourism Guide chatbot named KT.
You only answer questions related to Kerala — its places, food, festivals, culture, travel tips, and traditions.
If asked about unrelated topics, politely redirect the user to ask about Kerala tourism.
Always be warm, helpful, and conversational. Occasionally use Malayalam greetings like "Namaskaram" naturally.

Kerala Knowledge Base:
{KERALA_KNOWLEDGE}

Keep responses concise but informative. Use bullet points for lists where appropriate."""

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "Kerala Tourism Chatbot API is running 🌴"})

@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        resp = jsonify()
        resp.headers.add("Access-Control-Allow-Origin", "*")
        resp.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        resp.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return resp

    if not client:
        return jsonify({
            "error": "OPENROUTER_API_KEY not configured",
            "reply": "Chatbot not configured. Please set OPENROUTER_API_KEY."
        }), 500

    data = request.get_json(force=True)
    user_message = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_message:
        return jsonify({"reply": "Please ask me something about Kerala!"}), 400
    if len(user_message) > 500:
        return jsonify({"reply": "Please keep your question under 500 characters."}), 400

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})

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
        return jsonify({"reply": "Sorry, I couldn't connect right now. Please try again! 🙏"}), 500

# ── Vercel WSGI Entry Point ───────────────────────────────────────────────────
# Vercel calls app directly (no if __name__ == "__main__" needed)
