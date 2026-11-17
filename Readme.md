# Anuradhapura Knowledge Chatbot

A FastAPI chatbot that uses Azure OpenAI for conversational responses and a Chroma vector store for answering questions from the included Anuradhapura PDF documents.

## Features

- General-purpose chat endpoint
- Knowledge-base chat grounded in the ingested PDF documents
- PDF ingestion and knowledge-base rebuild endpoint
- In-memory chat history for general and knowledge-base conversations

## Project structure

```text
backend/
├── app/
│   ├── data/                 # Source PDF documents
│   ├── service/              # Azure OpenAI integration
│   ├── ingest.py             # PDF loading and vector-store ingestion
│   ├── main.py               # FastAPI application and routes
│   └── models.py             # Request and chat-history models
└── requirements.txt
chroma_db/                    # Persisted Chroma database
frontend/                     # Frontend placeholder
```

## Prerequisites

- Python 3.10 or later
- An Azure OpenAI resource with chat and embedding deployments

## Setup

From the project root, create and activate a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your-chat-deployment-name
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=your-embedding-deployment-name
```

Do not commit `.env` or expose the API key.

## Run the API

Run these commands from the `backend` directory:

```powershell
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Interactive API documentation is available at:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## API endpoints

### Health check

```http
POST /
```

Returns an API status message.

### General chat

```http
POST /chat
Content-Type: application/json

{
  "content": "Hello"
}
```

### Knowledge-base chat

```http
POST /chat/knowledge
Content-Type: application/json

{
  "content": "What was the significance of Anuradhapura?"
}
```

The response contains a `reply` generated from the retrieved document context.

### Chat history

```http
GET /chat-history?type=chat
GET /chat-history?type=knowledge
```

The `type` query parameter must be `chat` or `knowledge`.

### Rebuild the knowledge base

```http
POST /rebuild-knowledge-base
```

This reloads the PDFs in `backend/app/data`, splits them into chunks, creates embeddings, and rebuilds the Chroma knowledge base. Run this after adding or changing source PDFs.

## Frontend

The `frontend` directory currently contains a placeholder text file. A web UI still needs to be added; until then, use the Swagger UI or call the API directly with a REST client.

## Notes

- Chat history is stored in memory and is reset whenever the API process restarts.
- Knowledge-base answers are limited to the retrieved PDF context.
- Keep Azure OpenAI credentials in environment variables rather than source files.