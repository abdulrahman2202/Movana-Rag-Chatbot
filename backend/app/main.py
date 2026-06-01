import uuid
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from app.models import AnalyzeRequest, AnalysisResponse, ChatRequest, SessionResponse
from app.services.extractor import extract_metadata, extract_transcript
from app.services.rag import rag_service
from app.services.session import session_manager
from app.config import HOST, PORT

# Initialize FastAPI Application
app = FastAPI(
    title="Movana Backend API",
    description="Full-stack AI-RAG comparison API for YouTube videos and Instagram Reels.",
    version="1.0.0"
)

# Enable CORS for Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Facilitates Vercel + Local testing out-of-the-box
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-videos", response_model=AnalysisResponse)
async def analyze_videos(request: AnalyzeRequest):
    """Processes URL extraction, metadata rendering, transcribing, and vector stores initialization."""
    youtube_url = request.youtube_url.strip()
    instagram_url = request.instagram_url.strip()
    
    if not youtube_url or not instagram_url:
        raise HTTPException(
            status_code=400,
            detail="Both YouTube URL and Instagram Reel URL are required."
        )
        
    print(f"Request received. Analyzing YouTube URL: {youtube_url} and Reel URL: {instagram_url}")
    
    try:
        # 1. Fetch metadata (using yt-dlp with graceful fallbacks)
        print("Extracting metadata for Video A...")
        video_a = extract_metadata(youtube_url, is_youtube=True)
        print("Extracting metadata for Video B...")
        video_b = extract_metadata(instagram_url, is_youtube=False)
        
        # 2. Extract and transcribe transcripts
        session_id = str(uuid.uuid4())
        print(f"Assigned Session ID: {session_id}. Extrapolating transcripts...")
        
        video_a_transcript = extract_transcript(youtube_url, is_youtube=True, session_id=session_id)
        video_b_transcript = extract_transcript(instagram_url, is_youtube=False, session_id=session_id)
        
        # 3. Store analytical details in session cache
        print("Caching data in Session Manager...")
        session_manager.create_session(
            session_id=session_id,
            video_a=video_a,
            video_b=video_b,
            video_a_transcript=video_a_transcript,
            video_b_transcript=video_b_transcript
        )
        
        # 4. Chunk transcripts and store them inside local ChromaDB
        print("Feeding transcripts to ChromaDB RAG Vector Store...")
        rag_service.store_transcripts(
            session_id=session_id,
            video_a_url=youtube_url,
            video_a_transcript=video_a_transcript,
            video_b_url=instagram_url,
            video_b_transcript=video_b_transcript
        )
        
        print("Video analysis pipeline completed successfully.")
        return AnalysisResponse(
            session_id=session_id,
            video_a=video_a,
            video_b=video_b
        )
        
    except Exception as e:
        print(f"CRITICAL ERROR in analyze_videos: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze video files: {str(e)}"
        )

@app.post("/chat")
async def chat(request: ChatRequest):
    """Channels RAG-based conversations via Server-Sent Events (SSE)."""
    session_id = request.session_id.strip()
    message = request.message.strip()
    
    if not session_id or not message:
        raise HTTPException(
            status_code=400,
            detail="session_id and message are required."
        )
        
    print(f"New query received for Session {session_id}: {message}")
    
    async def event_generator():
        try:
            async for chunk in rag_service.stream_chat(session_id, message):
                yield chunk
        except Exception as e:
            print(f"Streaming error on /chat: {e}")
            yield f"data: {{\"type\": \"error\", \"content\": \"Streaming error occurred: {str(e)}\"}}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/session/{id}", response_model=SessionResponse)
async def get_session(id: str):
    """Retrieves metadata cache and conversational log history for a specific comparison session."""
    session = session_manager.get_session(id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session with ID '{id}' was not found."
        )
        
    return SessionResponse(
        session_id=session["session_id"],
        video_a=session["video_a"],
        video_b=session["video_b"],
        history=session["history"]
    )

@app.get("/health")
async def health():
    """Simple API health-check target for container deployments (Vercel, Render, Railway)."""
    return {"status": "ok", "app": "Movana Backend API"}

if __name__ == "__main__":
    print(f"Starting Movana FastAPI server on http://{HOST}:{PORT}...")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
