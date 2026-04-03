import os
import pandas as pd
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from django.conf import settings
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
PERSIST_DIRECTORY = os.path.join(settings.BASE_DIR, "vector_db")


def extract_text(file_path):
    """Extract text from supported file types."""
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    try:
        if ext == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"

        elif ext == ".docx":
            doc = DocxDocument(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"

        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()

        elif ext == ".csv":
            # Try common encodings so exported CSVs don't fail parsing.
            last_error = None
            for encoding in ("utf-8-sig", "utf-8", "latin-1"):
                try:
                    df = pd.read_csv(file_path, encoding=encoding, on_bad_lines="skip")
                    rows = []
                    for index, row in df.iterrows():
                        row_data = [
                            f"{col} is {val}" for col, val in row.items() if pd.notna(val)
                        ]
                        if row_data:
                            rows.append(f"Record {index + 1}: " + ", ".join(row_data))
                    text = "\n".join(rows)
                    break
                except Exception as csv_error:
                    last_error = csv_error
            if not text and last_error:
                print(f"CSV Extraction Error: {last_error}")
                return ""

    except Exception as error:
        print(f"General Extraction Error: {error}")
        return ""

    return text


def process_document(file_path, source_filename=None):
    """Chunk extracted text and index it in Chroma."""
    try:
        raw_text = extract_text(file_path)
        if not raw_text or not raw_text.strip():
            print(f"EXTRACTION FAILED: no text found in {file_path}")
            return False

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = text_splitter.split_text(raw_text)
        if not chunks:
            print(f"CHUNKING FAILED: no chunks generated for {file_path}")
            return False

        # Must match llm_router filter={"source": filename}
        source_name = source_filename or os.path.basename(file_path)
        docs = [Document(page_content=chunk, metadata={"source": source_name}) for chunk in chunks]

        Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=PERSIST_DIRECTORY,
        )
        print(f"Indexed {len(chunks)} chunks for source: {source_name}")
        return True
    except Exception as error:
        print(f"PIPELINE CRITICAL ERROR: {error}")
        return False
