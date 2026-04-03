import os
from django.conf import settings
from dotenv import load_dotenv

# IMPORTANT: Use ONLY langchain_chroma
from langchain_chroma import Chroma 
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_community.chat_models import ChatOllama

load_dotenv(os.path.join(settings.BASE_DIR, '.env'))
CHROMA_DB_DIR = os.path.join(settings.BASE_DIR, 'vector_db')

def ask_ai_question(question, filename, chat_history=None):
    try:
        chat_history = chat_history or []
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Consistent Reader
        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR, 
            embedding_function=embeddings
        )
        
        docs = vectorstore.similarity_search(
            question, 
            k=5, 
            filter={"source": filename}
        )
        
        context_text = "\n\n".join([doc.page_content for doc in docs])
        print(f"🔍 Searching: {filename} | Found: {len(docs)} chunks")

        if not context_text:
            return "I couldn't find any relevant information in this document."

        prompt = f"Context: {context_text}\nQuestion: {question}"

        # Logic for Groq/Gemini goes here...
        try:
            llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
            return llm.invoke(prompt).content
        except:
            llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)
            return llm.invoke(prompt).content

    except Exception as e:
        print(f"Router Error: {e}")
        return "An error occurred during retrieval."