from pydantic import BaseModel, Field
from typing import List, Optional

class AnalyzeRequest(BaseModel):
    youtube_url: str = Field(..., description="The direct URL of the YouTube video to compare.")
    instagram_url: str = Field(..., description="The direct URL of the Instagram Reel to compare.")

class VideoMetadata(BaseModel):
    title: str = Field(..., description="Title of the video.")
    creator: str = Field(..., description="Uploader or creator of the channel.")
    views: int = Field(0, description="Total views count.")
    likes: int = Field(0, description="Total likes count.")
    comments: int = Field(0, description="Total comments count.")
    engagement_rate: float = Field(0.0, description="Calculated engagement rate: ((likes + comments) / views) * 100")
    upload_date: Optional[str] = Field(None, description="Date of upload.")
    duration: Optional[int] = Field(None, description="Duration in seconds.")
    hashtags: List[str] = Field(default_factory=list, description="List of hashtags associated with the post.")
    follower_count: Optional[int] = Field(None, description="Followers count of the creator channel if available.")
    thumbnail: Optional[str] = Field(None, description="URL of the video thumbnail.")
    url: str = Field(..., description="Source URL of the video.")

class AnalysisResponse(BaseModel):
    session_id: str = Field(..., description="The unique session ID identifying this comparison.")
    video_a: VideoMetadata = Field(..., description="Metadata for Video A (YouTube).")
    video_b: VideoMetadata = Field(..., description="Metadata for Video B (Instagram Reel).")

class ChatRequest(BaseModel):
    session_id: str = Field(..., description="The session ID associated with the comparison.")
    message: str = Field(..., description="The user's query.")

class Citation(BaseModel):
    video_id: str = Field(..., description="'A' or 'B'")
    chunk_number: int = Field(..., description="Number of the transcript chunk.")
    source: str = Field(..., description="Source identifier.")
    text: Optional[str] = Field(None, description="Extracted chunk text.")

class MessageResponse(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="The content of the message.")
    citations: Optional[List[Citation]] = Field(default=None, description="Citations used to formulate this response.")

class SessionResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier.")
    video_a: VideoMetadata = Field(..., description="Metadata for Video A.")
    video_b: VideoMetadata = Field(..., description="Metadata for Video B.")
    history: List[MessageResponse] = Field(default_factory=list, description="Chat conversation history.")
