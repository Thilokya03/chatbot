import os

from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from app.service.openai_service import get_embeddings

# Load environment variables
load_dotenv()


# Step 1: Load PDFs
def ingest_documents():
    loader = PyPDFDirectoryLoader("app/data")
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(documents)

    embeddings = get_embeddings()

    # Test embedding generation
    test_embedding = embeddings.embed_query("hello world")

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory="./chroma_db"
    )

    print("Knowledge base created successfully")