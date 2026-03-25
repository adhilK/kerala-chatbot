import os
import openai
from dotenv import load_dotenv
import traceback

load_dotenv()

key = os.getenv("XAI_API_KEY")
if not key:
    with open("err.log", "w") as f:
        f.write("No key found")
    exit(1)

client = openai.OpenAI(api_key=key, base_url="https://api.x.ai/v1")
try:
    print("Listing models...")
    models = client.models.list()
    with open("err.log", "w") as f:
        for m in models.data:
            f.write(str(m.id) + "\n")
except Exception as e:
    with open("err.log", "w") as f:
        f.write(traceback.format_exc())
