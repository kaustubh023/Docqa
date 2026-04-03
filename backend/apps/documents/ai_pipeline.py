import os
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from django.conf import settings

# This tells ChromaDB to save its data inside your backend folder
CHROMA_DB_DIR = os.path.join(settings.BASE_DIR, 'chroma_db')

def process_document(file_path):
    """
    Reads a file, chunks it, and saves it to ChromaDB.
    """
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        # 1. Choose the right reader based on your allowed file types
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        elif ext in ['.docx', '.doc']:
            loader = Docx2txtLoader(file_path)
        elif ext == '.txt':
            loader = TextLoader(file_path, encoding='utf-8')
        else:
            raise ValueError(f"Unsupported file type: {ext}")
            
        # Extract the text
        print(f"Reading {file_path}...")
        documents = loader.load()
        
        # --- NEW CODE: Inject the clean filename into the metadata ---
        clean_filename = os.path.basename(file_path)
        for doc in documents:
            doc.metadata['filename'] = clean_filename
        # -------------------------------------------------------------
        
        # 2. Chop the text into smaller, digestible chunks (1000 characters each)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, 
            chunk_overlap=100 # Overlap prevents sentences from getting cut in half
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Split into {len(chunks)} chunks.")
        
        # 3. Convert to numbers and save to ChromaDB
        # We are using a fast, free local model here!
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        print("Saving to ChromaDB...")
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=CHROMA_DB_DIR
        )
        print("Processing complete!")
        return True
        
    except Exception as e:
        print(f"Error processing document: {e}")
        return False