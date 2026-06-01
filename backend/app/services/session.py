import threading
from typing import Dict, Any, Optional, List
from app.models import VideoMetadata, MessageResponse, Citation

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_session(
        self,
        session_id: str,
        video_a: VideoMetadata,
        video_b: VideoMetadata,
        video_a_transcript: str,
        video_b_transcript: str
    ):
        with self._lock:
            self._sessions[session_id] = {
                "session_id": session_id,
                "video_a": video_a,
                "video_b": video_b,
                "video_a_transcript": video_a_transcript,
                "video_b_transcript": video_b_transcript,
                "history": []
            }

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._sessions.get(session_id)

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        citations: Optional[List[Citation]] = None
    ):
        with self._lock:
            if session_id in self._sessions:
                # Store message in standard dict format that maps perfectly to MessageResponse
                self._sessions[session_id]["history"].append({
                    "role": role,
                    "content": content,
                    "citations": [c.model_dump() for c in citations] if citations else []
                })

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            if session_id in self._sessions:
                return self._sessions[session_id]["history"]
            return []

    def get_all_sessions(self) -> List[str]:
        with self._lock:
            return list(self._sessions.keys())

# Global singleton session manager
session_manager = SessionManager()
