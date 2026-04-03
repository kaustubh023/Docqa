import os
import requests
from dotenv import load_dotenv

# 1. Load the environment variables
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)
api_key = os.getenv("GOOGLE_API_KEY")

print("--- AI NETWORK TEST ---")
if not api_key:
    print("❌ ERROR: Could not find GOOGLE_API_KEY in .env file.")
    exit()

print(f"✅ Key Found: {api_key[:5]}... (Length: {len(api_key)})")

# 2. Try to say "Hello" directly to Google's servers
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
payload = {"contents": [{"parts": [{"text": "Say the word 'Hello' and nothing else."}]}]}

try:
    print("🚀 Sending request to Google...")
    response = requests.post(url, json=payload, timeout=10)
    
    if response.status_code == 200:
        answer = response.json()['candidates'][0]['content']['parts'][0]['text']
        print(f"🎉 SUCCESS! Google replied: {answer}")
    else:
        print(f"⚠️ API ERROR: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"💀 CRITICAL NETWORK BLOCK: {e}")