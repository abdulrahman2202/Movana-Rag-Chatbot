"use client";

import React, { useState } from "react";
import { Youtube, Instagram, Sparkles, AlertCircle, ArrowRight } from "lucide-react";

interface UrlFormProps {
  onSubmit: (youtubeUrl: string, instagramUrl: string) => Promise<void>;
  onDemoTrigger: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function UrlForm({ onSubmit, onDemoTrigger, isLoading, error }: UrlFormProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!youtubeUrl.trim()) {
      setValidationError("YouTube URL is required.");
      return;
    }
    if (!instagramUrl.trim()) {
      setValidationError("Instagram Reel URL is required.");
      return;
    }

    if (!youtubeUrl.includes("youtube.com") && !youtubeUrl.includes("youtu.be")) {
      setValidationError("Please enter a valid YouTube URL (youtube.com or youtu.be).");
      return;
    }

    if (!instagramUrl.includes("instagram.com")) {
      setValidationError("Please enter a valid Instagram Reel URL (instagram.com).");
      return;
    }

    onSubmit(youtubeUrl, instagramUrl);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glowing background highlights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-purple-600 opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-indigo-600 opacity-20 blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
            Compare YouTube vs Instagram Reel
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Extract transcripts, analyze key engagement metrics, and chat with AI about both videos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* YouTube input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 tracking-wider uppercase block">
              Video A: YouTube URL
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Youtube className="h-5 w-5 text-red-500 group-focus-within:text-purple-400 transition-colors" />
              </div>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Instagram input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 tracking-wider uppercase block">
              Video B: Instagram Reel URL
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Instagram className="h-5 w-5 text-pink-500 group-focus-within:text-purple-400 transition-colors" />
              </div>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="w-full pl-10 pr-4 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Errors section */}
          {(validationError || error) && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{validationError || error}</p>
            </div>
          )}

          {/* Submit and Demo buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-900/40 disabled:to-indigo-900/40 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 glowing-btn disabled:animation-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  <span>Extracting & Chunking RAG...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                  <span>Analyze & Compare Content</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onDemoTrigger}
              disabled={isLoading}
              className="py-3 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-gray-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span>Load Quick Demo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
