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

def ask_ai_question(question, filename):
    try:
        # --- 1. RETRIEVE KNOWLEDGE ---
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vectorstore = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
        
        docs = vectorstore.similarity_search(question, k=4, filter={"filename": filename})
        context_text = "\n\n".join([doc.page_content for doc in docs])
        
        if not context_text:
            return "I couldn't find any relevant information in this document to answer your question."

        # --- 2. THE CHATGPT-STYLE PROMPT ---
        prompt = f"""
        You are a highly intelligent and conversational AI assistant. 
        Your task is to answer the user's question using ONLY the provided document context below. 
        
        RULES:
        1. Do NOT just copy and paste the context. Synthesize the information into a natural, thoughtful response.
        2. If the user asks for a summary, provide a structured, easy-to-read overview with bullet points.
        3. If the answer is not in the context, politely say: "I couldn't find the exact details for that in the document."
        
        Context extracted from document:
        {context_text}
        
        User's Question: {question}
        
        Your Conversational Answer:
        """

        # --- 3. THE UNBREAKABLE ROUTER ---
        
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