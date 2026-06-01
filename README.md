# Movana - Full-Stack AI-RAG Video Comparison Dashboard

Movana is a state-of-the-art full-stack RAG (Retrieval-Augmented Generation) application designed to extract, analyze, and strategically compare a YouTube video and an Instagram Reel. 

The system extracts video statistics, processes transcripts (with smart local CPU speech-to-text fallbacks), chunks and indexes content inside a local vector database, and deploys a LangChain RAG pipeline via Google Gemini 2.5 Flash to power a high-performance streaming analytics chat interface.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS (v4), Lucide Icons, and React Query.
- **Backend**: FastAPI (Python 3.12) & Uvicorn.
- **AI Framework**: LangChain (LCEL) with in-memory `ConversationBufferMemory`.
- **Vector Database**: Local, embedded, free **ChromaDB**.
- **Embeddings**: HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (run locally for free).
- **LLM**: Google Gemini 2.5 Flash (supporting massive context and sub-second stream speeds).
- **Transcribers**: `youtube-transcript-api` (YouTube native captions) & `yt-dlp` + `faster-whisper` (Instagram Reels audio transcription).

---

## 🏗️ Folder Structure

```
Movana/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── extractor.py    # yt-dlp metadata extraction & faster-whisper transcribing
│   │   │   ├── rag.py          # ChromaDB chunking, HuggingFace embeddings, Gemini streaming RAG
│   │   │   └── session.py      # Thread-safe cache of compared video states & histories
│   │   ├── config.py           # Dotenv environment configuration loading
│   │   ├── main.py             # FastAPI routing and SSE endpoints
│   │   └── models.py           # Pydantic schema validation structures
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Premium dark theme and layout animations
│   │   │   ├── layout.tsx      # Master HTML body and metadata setup
│   │   │   └── page.tsx        # Dashboard orchestrator layout
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx # Streaming SSE chat panel with expandable citation bulbs
│   │   │   ├── UrlForm.tsx     # Ingestion inputs and mock demo trigger
│   │   │   └── VideoCard.tsx   # Side-by-side analytical cards with ER meters
│   │   └── lib/
│   │       └── utils.ts        # Dynamic Tailwind compilation utils
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Run)

### 1. Run the Backend API
Navigate to the `backend/` folder:
```bash
cd backend
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies (CPU-optimized PyTorch is pre-configured)
pip install -r requirements.txt

# Setup your Gemini API Key in .env
cp .env.example .env
# Edit .env and enter GEMINI_API_KEY=AIzaSy...

# Start dev server
python app/main.py
```
*The backend API will start on http://localhost:8000.*

### 2. Run the Frontend Dashboard
Open a new terminal and navigate to the `frontend/` folder:
```bash
cd frontend
# Install package dependencies
npm install

# Start the dev web server
npm run dev
```
*Open http://localhost:3000 in your browser to view the application.*

---

## 🐳 Docker Deployment Guide

To spin up the entire production-ready environment in one go, simply run:
```bash
docker-compose up --build
```
Ensure you have created a `.env` file in the root directory (or have it in your system variables) containing `GEMINI_API_KEY`.
- **Frontend Dashboard**: Hosted on http://localhost:3000
- **Backend API**: Hosted on http://localhost:8000

---

## 📊 Architectural Decisions

### 1. Why ChromaDB?
ChromaDB is selected because it is a **lightweight, open-source, and local embedded vector database**.
- **No infrastructure overhead**: Running as an in-process library within FastAPI, ChromaDB does not require spinning up external servers or paying high cloud bills during development.
- **Session-isolation efficiency**: Rather than creating dynamic database stores, we utilize a unified ChromaDB collection and implement filter queries (`search_kwargs={"filter": {"session_id": session_id}}`). This isolates users' comparisons and provides 100% data privacy.
- **Fast Local Search**: Coupled with memory-mapped storage and HuggingFace sentence-transformers, it queries chunks in under 5 milliseconds.

### 2. Why LangChain?
LangChain provides clean, production-grade abstraction patterns:
- **LCEL (LangChain Expression Language)**: Allows composing and piping text inputs, context retrieval, history buffers, and LLM calls efficiently.
- **Memory Integration**: Ingests memory seamlessly via `ConversationBufferMemory` bindings, maintaining context across ongoing conversations.
- **First-class Streaming**: Emits standard text chunk iterations natively via `astream`, powering our real-time SSE streaming API seamlessly.

### 3. Why Google Gemini 2.5 Flash?
Gemini 2.5 Flash is selected because it is currently the industry standard for high-performance, cost-effective multimodal LLMs:
- **Massive Context Support**: Supports up to 1 million input tokens, meaning it can ingest hours of video transcript contexts easily.
- **Unrivaled Speed**: Inference latency is incredibly low, providing instant sub-second streaming answers to the client interface.
- **Extensive Free Tier**: Offers a generous free tier (15 Requests per Minute), permitting developers to test, prototype, and demonstrate systems for free.

---

## 💸 Cost Estimates for 1,000 Creators/Day

We assume each creator submits **1 YouTube URL (~20,000 transcript tokens)** and **1 Instagram Reel URL (~2,000 transcript tokens)**, creating **1,000 daily comparison sessions**.

### A. Embeddings & Storage Costs
- **Model**: HuggingFace `sentence-transformers/all-MiniLM-L6-v2` is hosted **locally inside our Python backend container for free**.
- **Vector database**: ChromaDB is hosted **locally inside our container using persistent volume disk mounts for free**.
- **Embedding Cost**: **$0.00**
- **Storage Cost**: **$0.00**

### B. LLM Processing Costs (Gemini 2.5 Flash API Paid Tier)
- **Input Pricing**: $0.075 per 1,000,000 tokens
- **Output Pricing**: $0.300 per 1,000,000 tokens

Let's assume a typical conversation has **5 message turns**.
- Each prompt fetches the top **6 transcript chunks** (average context + system instruction = **4,000 input tokens**).
- Over 5 turns, total input tokens per session: `5 * 4,000 = 20,000 tokens`.
- For 1,000 sessions/day: `1,000 * 20,000 = 20,000,000 input tokens`.
  - **Input Cost**: `20,000,000 * ($0.075 / 1,000,000) = $1.50`
- Each response generates an average of **300 output tokens**.
- Over 5 turns, total output tokens per session: `5 * 300 = 1,500 tokens`.
- For 1,000 sessions/day: `1,000 * 1,500 = 1,500,000 output tokens`.
  - **Output Cost**: `1,500,000 * ($0.30 / 1,000,000) = $0.45`

### 💸 Total LLM Operating Cost: $1.95 / Day (or ~$58.50 / Month)

---

## 📈 Horizontal Scaling Strategy

To scale Movana to support millions of creators daily, we recommend transitioning from our local prototype to a distributed microservice architecture:

```
                  ┌──────────────┐
                  │  Nginx/ALB   │
                  └──────┬───────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌──────────────┐                  ┌──────────────┐
│  FastAPI #1  │                  │  FastAPI #2  │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       ├─────────────────────────────────┼────────────────────────┐
       ▼                                 ▼                        ▼
┌──────────────┐                  ┌──────────────┐         ┌──────────────┐
│  Qdrant/     │                  │  Redis Cache │         │ Celery Tasks │
│  Pinecone    │                  │  (Metadata)  │         │ (Whisper/DL) │
└──────────────┘                  └──────────────┘         └──────┬───────┘
                                                                  │
                                                        ┌─────────┴─────────┐
                                                        ▼                   ▼
                                                 ┌─────────────┐     ┌─────────────┐
                                                 │ Whisper GPU │     │ Whisper GPU │
                                                 └─────────────┘     └─────────────┘
```

1. **Decouple CPU-Intensive Transcription**:
   - Downloading audio and transcribing via Whisper is CPU-heavy and blocks FastAPI async routes.
   - **Strategy**: Offload transcription tasks to a task queue (e.g. **Celery with Redis/RabbitMQ**). Workers equipped with **NVIDIA GPUs (using CUDA and Whisper-large-v3)** will process transcriptions asynchronously, updating a shared database on completion.
2. **Horizontal Vector Database Scaling**:
   - Local ChromaDB stores vectors on a shared local volume, which cannot scale across multiple API nodes.
   - **Strategy**: Replace local ChromaDB with a managed cloud vector database like **Qdrant Cloud, Pinecone, or Milvus**. These handle billions of vectors with automatic indexing, shading, and horizontal replicas.
3. **Implement Metadata Caching**:
   - Ingesting popular viral videos repeatedly wastes network requests and triggers API limits on `yt-dlp`.
   - **Strategy**: Implement an in-memory **Redis Cache** database. If a YouTube/Reel URL is requested and was analyzed in the last 24 hours, serve the cached metadata and vectors instantly.
4. **API Worker Clustering**:
   - Deploy multiple FastAPI container replicas behind an **Nginx Load Balancer or AWS Application Load Balancer (ALB)** to distribute API calls horizontally across different virtual machines.
