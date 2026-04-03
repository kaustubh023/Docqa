import os
from django.conf import settings
from dotenv import load_dotenv

# Explicitly load the .env file
env_path = os.path.join(settings.BASE_DIR, '.env')
load_dotenv(env_path)

# LangChain Imports
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_community.chat_models import ChatOllama

CHROMA_DB_DIR = os.path.join(settings.BASE_DIR, 'chroma_db')

# --- NEW: Added chat_history parameter with safe default ---
def ask_ai_question(question, filename, chat_history=None):
    try:
        chat_history = chat_history or []
        # --- 1. RETRIEVE KNOWLEDGE ---
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
        
        docs = vectorstore.similarity_search(question, k=4, filter={"filename": filename})
        context_text = "\n\n".join([doc.page_content for doc in docs])
        
        if not context_text:
            return "I couldn't find any relevant information in this document to answer your question."

        # --- 2. FORMAT THE CHAT HISTORY ---
        # We only take the last 6 messages so the prompt doesn't get too massive and crash
        history_text = ""
        recent_history = chat_history[-6:] if len(chat_history) > 6 else chat_history
        
        for msg in recent_history:
            # Map the sender correctly to standard AI terminology
            role = "User" if msg.get("sender") == "user" else "AI"
            history_text += f"{role}: {msg.get('text')}\n"

        # --- 3. THE CHATGPT-STYLE PROMPT (Now with Memory!) ---
        prompt = f"""
        You are a highly intelligent and conversational AI assistant. 
        Your task is to answer the user's question using the provided document context below. 
        
        RULES:
        1. Do NOT just copy and paste the context. Synthesize the information into a natural, thoughtful response.
        2. Pay close attention to the "Previous Conversation History" so you can answer follow-up questions properly (e.g., if the user says "explain that more").
        3. If the answer is not in the context, politely say: "I couldn't find the exact details for that in the document."
        
        Context extracted from document:
        {context_text}
        
        Previous Conversation History:
        {history_text}
        
        User's New Question: {question}
        
        Your Conversational Answer:
        """

        # --- 4. THE UNBREAKABLE ROUTER ---
        
        # Attempt 1: Groq (Llama 3.3 - Lightning Fast)
        try:
            print("🚀 Attempting to use Groq (Llama 3.3)...")
            llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
            response = llm.invoke(prompt)
            return response.content
        except Exception as e:
            print(f"⚠️ Groq failed: {e}")

        # Attempt 2: Google Gemini (Universal Pro Model)
        try:
            print("🤖 Attempting to use Gemini Pro...")
            llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3)
            response = llm.invoke(prompt)
            return response.content
        except Exception as e:
            print(f"⚠️ Gemini failed: {e}")

        # Attempt 3: Local Fallback
        try:
            print("💻 Attempting to use Local Ollama...")
            llm = ChatOllama(model="llama3", temperature=0.3) 
            response = llm.invoke(prompt)
            return response.content
        except Exception as e:
            print(f"⚠️ Ollama failed: {e}")

        return "System Error: All AI providers are currently unavailable."

    except Exception as e:
        print(f"Critical Pipeline Error: {e}")
        return "An error occurred while searching the document database."
