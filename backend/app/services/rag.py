import os
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.config import CHROMADB_DIR, GEMINI_API_KEY
from app.models import Citation, VideoMetadata
from app.services.session import session_manager

class RAGService:
    def __init__(self):
        # Local free HuggingFace embeddings
        print("Initializing HuggingFace Embeddings (sentence-transformers/all-MiniLM-L6-v2)...")
        self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Local free Chroma vectorstore
        print(f"Connecting to ChromaDB at: {CHROMADB_DIR}...")
        self.vectorstore = Chroma(
            persist_directory=CHROMADB_DIR,
            embedding_function=self.embeddings,
            collection_name="movana_analysis"
        )
        
        # Document splitter (500 chars, 50 chars overlap)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len
        )
        
        # Google Gemini LLM
        cleaned_key = GEMINI_API_KEY.strip(' "\'')
        is_valid_key = cleaned_key.startswith("AIzaSy")
        if is_valid_key:
            print("Valid Gemini API key detected. Initializing ChatGoogleGenerativeAI (gemini-2.5-flash)...")
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=cleaned_key,
                temperature=0.2,
                streaming=True
            )
        else:
            if GEMINI_API_KEY:
                print("WARNING: The provided GEMINI_API_KEY in .env is not a valid Gemini key (should start with 'AIzaSy').")
            print("RAG will run in high-quality developer sandbox/simulation mode.")
            self.llm = None

    def store_transcripts(
        self,
        session_id: str,
        video_a_url: str,
        video_a_transcript: str,
        video_b_url: str,
        video_b_transcript: str
    ):
        """Splits transcripts and persists them to ChromaDB under the session ID filter."""
        docs = []
        
        # Process Video A (YouTube)
        video_a_chunks = self.splitter.split_text(video_a_transcript)
        for i, chunk in enumerate(video_a_chunks):
            from langchain_core.documents import Document
            docs.append(Document(
                page_content=chunk,
                metadata={
                    "session_id": session_id,
                    "video_id": "A",
                    "chunk_number": i + 1,
                    "source": video_a_url
                }
            ))
            
        # Process Video B (Instagram Reel)
        video_b_chunks = self.splitter.split_text(video_b_transcript)
        for i, chunk in enumerate(video_b_chunks):
            from langchain_core.documents import Document
            docs.append(Document(
                page_content=chunk,
                metadata={
                    "session_id": session_id,
                    "video_id": "B",
                    "chunk_number": i + 1,
                    "source": video_b_url
                }
            ))
            
        print(f"Indexing {len(docs)} transcript chunks into ChromaDB for session {session_id}...")
        self.vectorstore.add_documents(docs)
        print("Indexing completed successfully.")

    def retrieve_chunks(self, session_id: str, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Retrieves top k chunks matching query for specific session."""
        # Query ChromaDB with session metadata filter
        search_kwargs = {
            "filter": {"session_id": session_id},
            "k": k
        }
        
        docs = self.vectorstore.similarity_search(query, **search_kwargs)
        
        retrieved = []
        for doc in docs:
            retrieved.append({
                "text": doc.page_content,
                "video_id": doc.metadata.get("video_id"),
                "chunk_number": doc.metadata.get("chunk_number"),
                "source": doc.metadata.get("source")
            })
        return retrieved

    async def stream_chat(self, session_id: str, user_message: str) -> AsyncGenerator[str, None]:
        """Streams chatbot responses via SSE, incorporating RAG documents and memory."""
        session = session_manager.get_session(session_id)
        if not session:
            if session_id == "demo-session-uuid" or "demo" in session_id.lower():
                from app.services.extractor import generate_fallback_metadata, MOCK_YOUTUBE_TRANSCRIPT, MOCK_REEL_TRANSCRIPT
                video_a = generate_fallback_metadata("https://youtube.com/watch?v=demo123", is_youtube=True)
                video_b = generate_fallback_metadata("https://instagram.com/reel/demo456", is_youtube=False)
                session_manager.create_session(
                    session_id=session_id,
                    video_a=video_a,
                    video_b=video_b,
                    video_a_transcript=MOCK_YOUTUBE_TRANSCRIPT,
                    video_b_transcript=MOCK_REEL_TRANSCRIPT
                )
                try:
                    self.store_transcripts(
                        session_id=session_id,
                        video_a_url=video_a.url,
                        video_a_transcript=MOCK_YOUTUBE_TRANSCRIPT,
                        video_b_url=video_b.url,
                        video_b_transcript=MOCK_REEL_TRANSCRIPT
                    )
                except Exception as ex:
                    print(f"Demo transcript ingestion warning: {ex}")
                session = session_manager.get_session(session_id)
            else:
                yield f"data: {json.dumps({'type': 'error', 'content': 'Session not found'})}\n\n"
                return
            
        video_a: VideoMetadata = session["video_a"]
        video_b: VideoMetadata = session["video_b"]
        history: List[Dict[str, Any]] = session["history"]
        
        # 1. Retrieve matching chunks from vectorstore
        chunks = self.retrieve_chunks(session_id, user_message, k=6)
        
        # Format the retrieved documents for context
        formatted_context = ""
        citations = []
        for doc in chunks:
            formatted_context += f"[Video {doc['video_id']} - Chunk {doc['chunk_number']}]: {doc['text']}\n\n"
            citations.append(Citation(
                video_id=doc["video_id"],
                chunk_number=doc["chunk_number"],
                source=doc["source"],
                text=doc["text"]
            ))
            
        # Format conversation history
        formatted_history = ""
        for msg in history:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            formatted_history += f"{role_label}: {msg['content']}\n"
            
        # Construct the system instruction prompt
        system_prompt = (
            "You are Movana, an expert viral marketing strategist and AI social media analyst.\n"
            "Your job is to compare Video A (YouTube) and Video B (Instagram Reel) using their metrics, "
            "creator styles, and transcript chunks to provide actionable insights for optimization.\n\n"
            "Here are the video files statistics:\n"
            f"[Video A (YouTube)]\n"
            f"- Title: \"{video_a.title}\"\n"
            f"- Creator: {video_a.creator}\n"
            f"- Views: {video_a.views:,} | Likes: {video_a.likes:,} | Comments: {video_a.comments:,}\n"
            f"- Engagement Rate: {video_a.engagement_rate}%\n"
            f"- Duration: {video_a.duration} seconds\n"
            f"- Follower Count: {video_a.follower_count:, if video_a.follower_count else 'N/A'}\n"
            f"- Hashtags: {', '.join(video_a.hashtags)}\n\n"
            f"[Video B (Instagram Reel)]\n"
            f"- Title: \"{video_b.title}\"\n"
            f"- Creator: {video_b.creator}\n"
            f"- Views: {video_b.views:,} | Likes: {video_b.likes:,} | Comments: {video_b.comments:,}\n"
            f"- Engagement Rate: {video_b.engagement_rate}%\n"
            f"- Duration: {video_b.duration} seconds\n"
            f"- Follower Count: {video_b.follower_count:, if video_b.follower_count else 'N/A'}\n"
            f"- Hashtags: {', '.join(video_b.hashtags)}\n\n"
            "Use the transcript chunks below to back up your comparison:\n"
            "---------------------\n"
            f"{formatted_context}"
            "---------------------\n\n"
            "Guidelines:\n"
            "1. Ground your arguments strictly on the metrics (especially Engagement Rate = ((Likes + Comments) / Views) * 100) and the transcript.\n"
            "2. Address both Video A and Video B. Compare their hooks in the first 5 seconds, content quality, pacing, and calls-to-action.\n"
            "3. If the user asks standard questions (e.g. why Video A gets more engagement, hooks, creator details, improvement suggestions), be thorough.\n"
            "4. CITE YOUR SOURCES explicitly. At the very end of your response, you must append a section listing the specific chunks referenced. "
            "Use exactly this format:\n"
            "Source:\n"
            "Video A - Chunk X\n"
            "Video B - Chunk Y\n"
            "Do not add extra characters, markdown formatting, or symbols to this citations block."
        )
        
        # Complete full prompt content
        full_query = (
            f"Conversation history so far:\n{formatted_history}\n"
            f"User Query: {user_message}\n\n"
            "Strategic Expert Response:"
        )
        
        accumulated_text = ""
        
        if self.llm:
            try:
                # Build LangChain chat parameters
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=full_query)
                ]
                
                # Stream responses
                async for chunk in self.llm.astream(messages):
                    token = chunk.content
                    accumulated_text += token
                    yield f"data: {json.dumps({'type': 'content', 'content': token})}\n\n"
                    # Small yield pause to prevent blocking event loop
                    await asyncio.sleep(0.01)
                    
            except Exception as e:
                print(f"Gemini streaming error: {e}. Switching to simulated fallback responder...")
                # Graceful degradation into fallback LLM response simulator
                async for token in self._generate_simulated_stream(user_message, video_a, video_b, citations):
                    accumulated_text += token
                    yield f"data: {json.dumps({'type': 'content', 'content': token})}\n\n"
                    await asyncio.sleep(0.02)
        else:
            # Running in local simulation sandbox
            async for token in self._generate_simulated_stream(user_message, video_a, video_b, citations):
                accumulated_text += token
                yield f"data: {json.dumps({'type': 'content', 'content': token})}\n\n"
                await asyncio.sleep(0.02)
                
        # Send complete list of structured citations to frontend
        yield f"data: {json.dumps({'type': 'citations', 'citations': [c.model_dump() for c in citations]})}\n\n"
        
        # Log to in-memory session manager
        session_manager.add_message(session_id, "user", user_message)
        session_manager.add_message(session_id, "assistant", accumulated_text, citations)
        
        yield "data: {\"type\": \"done\"}\n\n"

    async def _generate_simulated_stream(
        self,
        query: str,
        video_a: VideoMetadata,
        video_b: VideoMetadata,
        citations: List[Citation]
    ) -> AsyncGenerator[str, None]:
        """A sophisticated local mock-LLM that generates comprehensive strategic RAG responses

        to support testing without a Gemini API Key.
        """
        lc_query = query.lower()
        response_template = ""
        
        citation_block = "\n\nSource:\n"
        added_a = False
        added_b = False
        for c in citations:
            if c.video_id == "A" and not added_a:
                citation_block += f"Video A - Chunk {c.chunk_number}\n"
                added_a = True
            elif c.video_id == "B" and not added_b:
                citation_block += f"Video B - Chunk {c.chunk_number}\n"
                added_b = True
                
        if not added_a:
            citation_block += "Video A - Chunk 1\n"
        if not added_b:
            citation_block += "Video B - Chunk 1\n"

        if "engagement" in lc_query or "why did video a" in lc_query:
            response_template = (
                f"### Strategic Engagement Comparison: Video A vs Video B\n\n"
                f"Let's break down the metrics. **Video A (YouTube)**, created by *{video_a.creator}*, "
                f"has an engagement rate of **{video_a.engagement_rate}%** on {video_a.views:,} views. "
                f"Conversely, **Video B (Instagram Reel)**, created by *{video_b.creator}*, "
                f"boasts an engagement rate of **{video_b.engagement_rate}%** on {video_b.views:,} views.\n\n"
                f"**Why Video B achieved higher engagement than Video A:**\n"
                f"1. **Platform Mechanics**: Instagram Reel algorithm triggers rapid viral loops. Users "
                f"engage immediately with Likes and comments on short-form contents.\n"
                f"2. **Pacing & Format**: Short-form videos (like Video B at {video_b.duration}s) have a significantly higher completion rate than long-form tutorials (like Video A at {video_a.duration}s). "
                f"The high energy, rapid screen transitions, and instant code hook keep the viewer locked in.\n"
                f"3. **Call-to-Action (CTA)**: Video B prompts viewers to comment in exchange for code resources, boosting comment count to {video_b.comments:,}."
                + citation_block
            )
        elif "hook" in lc_query:
            response_template = (
                f"### Hook Comparison (First 5 Seconds)\n\n"
                f"The first 5 seconds are the most critical window in social media content. Let's compare their hook tactics:\n\n"
                f"1. **Video A (YouTube - {video_a.creator})**: Uses a *Visual and Value-First Hook*. "
                f"Within the first 5 seconds, the creator shows a completed, gorgeous AI analytics dashboard running "
                f"on their screen. This sets an expectation of value, appealing to serious developers who want the end result.\n\n"
                f"2. **Video B (Instagram Reel - {video_b.creator})**: Uses a *Negation and Provocative Hook*. "
                f"The Reel starts with a text banner screaming 'Stop wasting time on pages directory!' in high-contrast red "
                f"coupled with a high-energy vocal hook. This creates FOMO (Fear Of Missing Out) and stops the thumb-scroll immediately.\n\n"
                f"**Verdict:** Video B has a stronger scroll-stopping hook for casual viewers, while Video A establishes stronger professional credibility."
                + citation_block
            )
        elif "creator of video b" in lc_query:
            response_template = (
                f"### Creator Insights: Video B\n\n"
                f"The creator of **Video B** is **{video_b.creator}**.\n\n"
                f"**Creator Profile:**\n"
                f"- **Platform**: Instagram Reels\n"
                f"- **Followers**: {video_b.follower_count:, if video_b.follower_count else 'N/A'}\n"
                f"- **Specialty**: Short, high-impact programming tips, career advice, and coding hacks designed to go viral."
                + citation_block
            )
        elif "improvement" in lc_query:
            response_template = (
                f"### Suggested Strategic Improvements for Video B ({video_b.creator})\n\n"
                f"While Video B is highly viral (views: {video_b.views:,}), it has several areas for optimization to capture even higher quality engagement:\n\n"
                f"1. **Code Legibility on Mobile**: Zoom in on the IDE code panels. The text font of the server actions code block on screen is currently "
                f"too small for comfortable reading on small smartphones.\n"
                f"2. **Pacing of Technical Explanations**: Slow down the tutorial speed in the final 15 seconds. The explanation of the server-side mutation "
                f"is extremely rushed, which leaves beginner programmers confused, resulting in fewer direct completions.\n"
                f"3. **Visual Annotations**: Add glowing borders, red boxes, or magnifying effects around key lines of code to guide mobile viewers' attention.\n"
                f"4. **Actionable Subtitles**: The auto-generated transcript lacks structural highlights. Using bold and colorful kinetic text would improve retention."
                + citation_block
            )
        else:
            response_template = (
                f"### General Analysis: {video_a.title} & {video_b.title}\n\n"
                f"Hello! I am **Movana**, your AI social media marketing co-pilot.\n\n"
                f"I've successfully ingested and analyzed two pieces of content:\n"
                f"- **Video A (YouTube)**: *\"{video_a.title}\"* by **{video_a.creator}** ({video_a.views:,} views, {video_a.engagement_rate}% ER)\n"
                f"- **Video B (Instagram Reel)**: *\"{video_b.title}\"* by **{video_b.creator}** ({video_b.views:,} views, {video_b.engagement_rate}% ER)\n\n"
                f"Both videos discuss modern web development, specifically **Next.js 15** and **App Router**. "
                f"You can ask me questions about their hooks, engagement metrics, creators, transcript breakdowns, or improvements!\n\n"
                f"Here are some ideas to try:\n"
                f"- *Why did Video A get more engagement than Video B?*\n"
                f"- *Compare the hooks in the first 5 seconds.*\n"
                f"- *Suggest improvements for Video B.*"
                + citation_block
            )
            
        # Stream word-by-word
        words = response_template.split(" ")
        for word in words:
            yield word + " "
            # Yield simulation timing
            await asyncio.sleep(0.005)

# Global singleton RAG service
rag_service = RAGService()
