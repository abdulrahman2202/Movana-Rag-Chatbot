# Build standard lightweight Python 3.12 FastAPI image
FROM python:3.12-slim

# Install system dependencies (ffmpeg is mandatory for yt-dlp to extract Reels audio for Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working environment
WORKDIR /workspace

# Copy requirements file first to exploit Docker build cache
COPY requirements.txt .

# Install python dependencies (CPU-optimized torch included)
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Expose API runtime port
EXPOSE 8000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV ENV=production

# Run FastAPI production webserver
CMD ["python", "app/main.py"]
