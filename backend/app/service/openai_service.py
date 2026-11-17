from openai import AzureOpenAI
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings

import os
import json

load_dotenv()

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2025-01-01-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

def get_response(messages):

    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT"),
        messages=messages
    )

    return response.choices[0].message.content


def get_embeddings():
    embeddings = AzureOpenAIEmbeddings(
        azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version="2024-02-01"
    )

    return embeddings
