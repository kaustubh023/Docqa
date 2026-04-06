import os
import re

from django.conf import settings
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from .ai_pipeline import get_embeddings

load_dotenv(os.path.join(settings.BASE_DIR, ".env"))
CHROMA_DB_DIR = os.path.join(settings.BASE_DIR, "vector_db")


def _normalize_text(text):
    cleaned = (text or "").strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _small_talk_intent(question):
    """
    Detect only clear, short small-talk prompts so normal document QA flow is unaffected.
    """
    q = _normalize_text(question)
    if not q:
        return "empty"

    greetings = {
        "hi",
        "hello",
        "hey",
        "hii",
        "heyy",
        "good morning",
        "good afternoon",
        "good evening",
    }
    thanks = {"thanks", "thank you", "thx", "ty"}
    bye = {"bye", "goodbye", "see you", "see ya"}
    wellbeing = {"how are you", "how are you doing", "how r u"}
    capability = {
        "what can you do",
        "help",
        "what do you do",
        "who are you",
    }

    if q in greetings:
        return "greeting"
    if q in thanks:
        return "thanks"
    if q in bye:
        return "bye"
    if q in wellbeing:
        return "wellbeing"
    if q in capability:
        return "capability"
    return None


def _small_talk_reply(intent, filename=None):
    doc_label = f" **{filename}**" if filename else " your uploaded document"
    if intent == "empty":
        return "I am here. Ask me anything about your document whenever you are ready."
    if intent == "greeting":
        return f"Hi! I am here to help you with{doc_label}. Ask me anything from it."
    if intent == "thanks":
        return "You are welcome. I am ready for your next question."
    if intent == "bye":
        return "Bye! Come back anytime if you want help with your document."
    if intent == "wellbeing":
        return f"I am doing great, thanks. I am ready to answer questions from{doc_label}."
    if intent == "capability":
        return (
            f"I can answer questions, summarize, and explain content from{doc_label}. "
            "Try asking for a summary or key points."
        )
    return None


def get_small_talk_reply(question, filename=None):
    intent = _small_talk_intent(question)
    if not intent:
        return None
    return _small_talk_reply(intent, filename=filename)


def _search_docs(vectorstore, question, filename=None, document_id=None, user_id=None):
    """
    Search in descending precision:
    1) document_id (best isolation)
    2) source + user_id (compatibility)
    3) source only (legacy fallback)
    """
    if document_id:
        try:
            docs = vectorstore.similarity_search(
                question,
                k=5,
                filter={"document_id": str(document_id)},
            )
            if docs:
                return docs
        except Exception as error:
            print(f"Vector search warning (document_id filter): {error}")

    if filename and user_id:
        try:
            docs = vectorstore.similarity_search(
                question,
                k=5,
                filter={"$and": [{"source": filename}, {"user_id": str(user_id)}]},
            )
            if docs:
                return docs
        except Exception as error:
            print(f"Vector search warning (source+user filter): {error}")

    if filename:
        return vectorstore.similarity_search(
            question,
            k=5,
            filter={"source": filename},
        )

    return []


def ask_ai_question(question, filename=None, document_id=None, user_id=None, chat_history=None):
    try:
        chat_history = chat_history or []

        small_talk = get_small_talk_reply(question=question, filename=filename)
        if small_talk:
            return small_talk

        embeddings = get_embeddings()

        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR,
            embedding_function=embeddings,
        )

        docs = _search_docs(
            vectorstore=vectorstore,
            question=question,
            filename=filename,
            document_id=document_id,
            user_id=user_id,
        )

        context_text = "\n\n".join([doc.page_content for doc in docs])
        print(
            f"Searching document_id={document_id}, filename={filename}, "
            f"user_id={user_id} | Found: {len(docs)} chunks"
        )

        if not context_text:
            return "I couldn't find any relevant information in this document."

        recent_history = chat_history[-6:]
        history_text = "\n".join(
            [f"{item.get('sender', 'user')}: {item.get('text', '')}" for item in recent_history]
        ) or "No prior chat history."

        prompt = (
            "You are a document QA assistant. Answer only from the provided context. "
            "If the answer is not in context, say you cannot find it in the document.\n\n"
            f"Chat History:\n{history_text}\n\n"
            f"Context:\n{context_text}\n\n"
            f"Question: {question}"
        )

        try:
            llm = ChatGroq(model_name="llama-3.3-70b-versatile", temperature=0.3)
            return llm.invoke(prompt).content
        except Exception:
            llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)
            return llm.invoke(prompt).content

    except Exception as error:
        print(f"Router Error: {error}")
        return "An error occurred during retrieval."
