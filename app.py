"""
Kerala Tourism Chatbot — Flask Backend (Vercel Root Entry)
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*")

# ── Knowledge Base ────────────────────────────────────────────────────────────

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
- Kannur: Beaches, Theyyam ritual performances

CUISINE:
- Kerala Sadya: Traditional feast on banana leaf with 20+ vegetarian dishes
- Fish curry (Meen curry): Spicy fish curry in coconut milk
- Appam with Stew: Lacy rice pancakes with coconut milk stew
- Puttu and Kadala curry: Steamed rice cylinders with black chickpea curry
- Karimeen Pollichathu: Pearl spot fish grilled in banana leaf
- Payasam: Sweet dessert with rice, milk, and jaggery

FESTIVALS:
- Onam (Aug-Sep): Harvest festival, Pookalam flower carpet, Vallam Kali boat race
- Thrissur Pooram (Apr-May): Grand elephant festival
- Vishu (April): Malayalam New Year
- Theyyam: Ritual dance form in North Kerala (November to May)

BACKWATERS:
- Alleppey backwaters are the most famous
- Kumarakom on Vembanad Lake
- Kollam to Alleppey: popular all-day houseboat route
- Houseboat (Kettuvallam) cruises in various sizes and price ranges

TRAVEL TIPS:
- Best time to visit: October to March
- Monsoon (June-September): Heavy rains, lush greenery, lower prices
- Main airport: Cochin International Airport (COK)
- Local transport: KSRTC buses, auto-rickshaws, ferry boats
- Language: Malayalam (English widely spoken)
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

SYSTEM_PROMPT = f"""You are a friendly Kerala Tourism Guide chatbot named KT (Kerala Tourism Bot).
You only answer questions related to Kerala — places, food, festivals, culture, travel tips.
If asked anything else, politely redirect to Kerala tourism.
Be warm, helpful, and conversational. Occasionally use Malayalam greetings like "Namaskaram" naturally.

Kerala Knowledge Base:
{KERALA_KNOWLEDGE}

Keep responses concise. Use bullet points for lists."""

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
            "reply": "Sorry, the chatbot is not configured. Please set OPENROUTER_API_KEY."
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
            model="google/gemini-2.0-flash-001",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        reply_text = response.choices[0].message.content
        if not reply_text:
            reply_text = "I'm sorry, I couldn't generate a response. Please try again! 🙏"
        return jsonify({"reply": reply_text})

    except Exception as e:
        print(f"OpenRouter API Error: {e}")
        return jsonify({"reply": "Sorry, I couldn't connect right now. Please try again! 🙏"}), 500


# ── Itinerary Planner Route ───────────────────────────────────────────────────

ITINERARY_SYSTEM_PROMPT = """You are an expert Kerala travel planner. Generate detailed, practical day-by-day itineraries.
IMPORTANT: Start your response DIRECTLY with "Day 1:" — no introduction, no preamble, no summary sentence before Day 1.
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

    data = request.get_json(force=True)
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
        if not plan_text:
            return jsonify({"plan": "Sorry, couldn't generate the itinerary right now. Please try again! 🙏"}), 500
        return jsonify({"plan": plan_text})

    except Exception as e:
        print(f"Itinerary API Error: {e}")
        return jsonify({"plan": "Sorry, couldn't generate the itinerary right now. Please try again! 🙏"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
