# Chatbot Platform

A multi-user chatbot workspace powered by Azure OpenAI and Cosmos DB. Users can run general-purpose and document-grounded chatbots, manage conversations, and integrate bots into external applications with per-chatbot API keys.

## Features

- A default general-purpose chatbot is provisioned automatically when a user logs in.
- Users can create up to 10 chatbots, including knowledge-base chatbots.
- Multiple conversations are stored per chatbot and titled automatically.
- Knowledge-base chatbots accept PDF, DOCX, and TXT uploads up to 10 MB.
- Chatbot API keys and usage summaries are available from the API Access page.
- Chatbot owners can delete their chatbots and update their profile and password.

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
# Optional: create this admin account automatically when the API starts
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-random-password
ADMIN_NAME=Administrator
```

Do not commit `.env` or expose the API key.

When `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, the API creates the admin user
once at startup. If the email already belongs to a user, that user is promoted
to the `admin` role without changing their password.

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

### Chat from the workspace or an integration

```http
POST /chat
Content-Type: application/json
x-api-key: <chatbot-api-key>

{
  "chatbot_id": "cb_example",
  "message": "What does this document say?",
  "conversation_id": "conv_example"
}
```

`conversation_id` is optional for API-key integrations. The response contains a `reply`.

### Upload a knowledge-base document

Send a `multipart/form-data` request to `POST /knowledge-bases/upload` with `chatbot_id` and `file` fields. Authenticate with the signed-in session cookie or the chatbot's `x-api-key`. Supported file types are PDF, DOCX, and TXT (maximum 10 MB).

### Chat history

```http
GET /chat-history?type=chat
GET /chat-history?type=knowledge
```

The `type` query parameter must be `chat` or `knowledge`.

## Frontend

The React/Vite dashboard provides chat history, chatbot creation and management, API access and usage details, profile and password settings, and drag-and-drop document uploads. Start it from the `frontend` directory with `npm install` and `npm run dev`. Set `VITE_API_URL` if the backend is hosted at a different origin.

## Notes

- Conversations and chatbot configuration are stored in Cosmos DB.
- Knowledge-base document text is chunked and embedded for retrieval.
- Keep Azure OpenAI credentials in environment variables rather than source files.