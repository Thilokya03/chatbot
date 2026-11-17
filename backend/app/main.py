from fastapi import FastAPI
import json
from app.models import ChatRequest
from app.service.openai_service import get_response
from app.models import ChatHistory
from app.ingest import ingest_documents
from app.service.openai_service import get_embeddings
from langchain_chroma import Chroma

app = FastAPI()

chat_history = ChatHistory()
knowledge_history = ChatHistory()

retriever = None

try:
    vector_store = Chroma(
        persist_directory="./chroma_db",
        embedding_function=get_embeddings()
    )

    retriever = vector_store.as_retriever()
except Exception:
    pass


@app.post("/")
def root():

    return {
        "message": "API Running"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    chat_history .append_chat(
        "user",
        request.content
    )

    reply = get_response(
        chat_history.get_history()
    )

    chat_history .append_chat(
        "assistant",
        reply
    )

    return {
        "reply": reply
    }


@app.get("/chat-history")
async def get_chat_history(type:str):
    if type=="knowledge":
        return knowledge_history.get_history()

    elif type=="chat":
        return chat_history.get_history()

    return {"error": "Invalid type"}


@app.post("/rebuild-knowledge-base")
def rebuild_knowledge_base():

    global retriever

    ingest_documents()

    vector_store = Chroma(
        persist_directory="./chroma_db",
        embedding_function=get_embeddings()
    )

    retriever = vector_store.as_retriever()

    return {
        "message": "Knowledge base rebuilt"
    }


@app.post("/chat/knowledge")
def chat_knowledge(request: ChatRequest):

    docs = retriever.invoke(request.content)

    context = "\n\n".join(
        doc.page_content
        for doc in docs
    )

    knowledge_history.append_chat(
        "user",
        request.content
    )

    messages = [
        {
            "role": "system",
            "content": f"""
            You are an assistant for the Anuradhapura knowledge base.
            Answer only from the provided context.

            If the answer is not in the context, reply:
            'I could not find that information in the knowledge base.'

            Context:
            {context}

            """
        }
    ]

    messages.extend(
        knowledge_history.get_history()
    )

    reply = get_response(messages)

    knowledge_history.append_chat(
        "assistant",
        reply
    )

    return {
        "reply": reply
    }
    
