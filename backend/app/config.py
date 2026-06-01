import os
from dotenv import load_dotenv

# Load environmental configurations
load_dotenv()

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
ENV = os.getenv("ENV", "development")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CHROMADB_DIR = os.getenv("CHROMADB_DIR", "./chroma_db")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "tiny")

# Ensure critical environment variables exist
if not GEMINI_API_KEY and ENV == "production":
    raise ValueError("GEMINI_API_KEY is required in production environment.")
