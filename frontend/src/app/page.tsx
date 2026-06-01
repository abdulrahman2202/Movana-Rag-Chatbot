"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sparkles, ArrowLeft, RefreshCw, BarChart2, Share2 } from "lucide-react";
import UrlForm from "@/components/UrlForm";
import VideoCard, { VideoMetadata } from "@/components/VideoCard";
import ChatInterface from "@/components/ChatInterface";

// Initialize Query Client
const queryClient = new QueryClient();

function MainDashboard() {
  const [session, setSession] = useState<{
    id: string;
    videoA: VideoMetadata;
    videoB: VideoMetadata;
    history: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submit URLs to FastAPI for real parsing & RAG ingestion
  const handleAnalyzeUrls = async (youtubeUrl: string, instagramUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/analyze-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtube_url: youtubeUrl, instagram_url: instagramUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Database analysis failed.");
      }

      const data = await response.json();
      setSession({
        id: data.session_id,
        videoA: data.video_a,
        videoB: data.video_b,
        history: [],
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected network warning occurred during scraping. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Instantly load mock comparative benchmarks
  const handleTriggerDemo = () => {
    setIsLoading(true);
    setError(null);

    // Simulate small parser delay
    setTimeout(() => {
      // YouTube Video A Metadata
      const likesA = 28400;
      const commentsA = 1420;
      const viewsA = 425000;
      const erA = ((likesA + commentsA) / viewsA) * 100;
      const videoA: VideoMetadata = {
        title: "Ultimate Next.js 15 App Router Tutorial for Modern SaaS Apps",
        creator: "TechCraft Academy",
        views: viewsA,
        likes: likesA,
        comments: commentsA,
        engagement_rate: parseFloat(erA.toFixed(2)),
        upload_date: "2026-02-15",
        duration: 720,
        hashtags: ["nextjs", "react", "programming", "webdev", "tailwindcss"],
        follower_count: 890000,
        thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=500&auto=format&fit=crop&q=60",
        url: "https://youtube.com/watch?v=demo123",
      };

      // Instagram Video B Metadata
      const likesB = 145000;
      const commentsB = 4800;
      const viewsB = 1850000;
      const erB = ((likesB + commentsB) / viewsB) * 100;
      const videoB: VideoMetadata = {
        title: "Why Next.js App Router is a game changer in 2026! 🚀🔥 #shorts",
        creator: "DevByteShorts",
        views: viewsB,
        likes: likesB,
        comments: commentsB,
        engagement_rate: parseFloat(erB.toFixed(2)),
        upload_date: "2026-03-01",
        duration: 58,
        hashtags: ["programming", "nextjs", "coding", "webdevelopment", "career"],
        follower_count: 230000,
        thumbnail: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=500&auto=format&fit=crop&q=60",
        url: "https://instagram.com/reel/demo456",
      };

      setSession({
        id: "demo-session-uuid",
        videoA,
        videoB,
        history: [
          {
            role: "assistant",
            content: "Hello! I am Movana, your strategy co-pilot. I have successfully analyzed both benchmark video formats!\n\nI have chunked their content transcripts, loaded metrics side-by-side, and stored indices in our local ChromaDB. You can ask me any analytics question (like comparing hook structures, engagement formulas, creator bios, or suggested upgrades!).",
          }
        ],
      });
      setIsLoading(false);
    }, 800);
  };

  const handleReset = () => {
    setSession(null);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Top Main Navigation Header */}
      <header className="flex flex-col items-center mb-10 text-center">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-3xl font-black tracking-tight text-white font-sans bg-clip-text">
            Movana
          </span>
        </div>
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mt-1">
          Full-Stack AI-RAG Video analytics Engine
        </p>
      </header>

      {/* Primary Ingestion Form Workspace */}
      {!session ? (
        <UrlForm
          onSubmit={handleAnalyzeUrls}
          onDemoTrigger={handleTriggerDemo}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        /* Results Comparison and Chat Dashboard */
        <div className="space-y-6 animate-fade-in">
          {/* Dashboard Control Banner */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-zinc-800/40">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-900"
                title="Back to input URL"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Comparison Active</span>
                <span className="text-sm font-extrabold text-zinc-200 block truncate max-w-xs md:max-w-md">
                  YouTube vs Instagram Reel Comparison
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Analyze New Videos
              </button>
            </div>
          </div>

          {/* Top Section: Video Cards Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VideoCard video={session.videoA} type="A" />
            <VideoCard video={session.videoB} type="B" />
          </div>

          {/* Bottom Section: Chatbot Interface */}
          <div className="w-full">
            <ChatInterface sessionId={session.id} initialHistory={session.history} />
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="text-center mt-12 py-6 border-t border-zinc-900 text-[10px] text-zinc-600 font-medium">
        &copy; {new Date().getFullYear()} Movana. Built with Next.js 15, FastAPI, LangChain, ChromaDB, and Google Gemini 2.5 Flash. By Abdul Rahman
      </footer>
    </div>
  );
}

export default function page() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
}
