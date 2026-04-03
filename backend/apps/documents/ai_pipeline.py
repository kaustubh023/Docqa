import os
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document as DocxDocument

# LATEST LANGCHAIN IMPORTS
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document 

# Setup Embeddings
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
persist_directory = "vector_db"

def extract_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    try:
        if ext == '.pdf':
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        elif ext == '.docx':
            doc = DocxDocument(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext == '.csv':
            df = pd.read_csv(file_path)
            rows = []
            for index, row in df.iterrows():
                row_data = [f"{col} is {val}" for col, val in row.items()]
                rows.append(f"Record {index + 1}: " + ", ".join(row_data))
            text = "\n".join(rows)
    except Exception as e:
        print(f"Extraction Error: {e}")
        return ""
    return text

def process_document(file_path):
    try:
        raw_text = extract_text(file_path)
        if not raw_text.strip():
            return False

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(raw_text)
        docs = [Document(page_content=t, metadata={"source": os.path.basename(file_path)}) for t in chunks]

        vector_db = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=persist_directory
        )
        vector_db.persist()
        return True
    except Exception as e:
        print(f"PIPELINE ERROR: {e}")
        return False