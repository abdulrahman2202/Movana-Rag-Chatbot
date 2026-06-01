"use client";

import React from "react";
import { Youtube, Instagram, Eye, Heart, MessageSquare, Percent, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoMetadata {
  title: string;
  creator: string;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
  upload_date?: string;
  duration?: number;
  hashtags: string[];
  follower_count?: number;
  thumbnail?: string;
  url: string;
}

interface VideoCardProps {
  video: VideoMetadata;
  type: "A" | "B"; // A = YouTube, B = Instagram Reel
}

export default function VideoCard({ video, type }: VideoCardProps) {
  const isYoutube = type === "A";
  
  // Format numbers nicely (e.g. 1.2M, 45K)
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Engagement rating rating color
  const getERColor = (er: number) => {
    if (er > 8) return "text-emerald-400 stroke-emerald-400";
    if (er > 4) return "text-purple-400 stroke-purple-400";
    return "text-indigo-400 stroke-indigo-400";
  };

  // SVG parameters for radial progress circle
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  // Cap visual representation at 15% for safety
  const displayER = Math.min(video.engagement_rate, 15);
  const strokeDashoffset = circumference - (displayER / 15) * circumference;

  return (
    <div className={cn(
      "glass-panel rounded-2xl p-5 shadow-xl glass-card-hover overflow-hidden relative border",
      isYoutube ? "border-red-950/20" : "border-pink-950/20"
    )}>
      {/* Decorative backdrop glow */}
      <div className={cn(
        "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20",
        isYoutube ? "bg-red-500" : "bg-pink-500"
      )} />

      {/* Header platform icon & tag */}
      <div className="flex justify-between items-center mb-4">
        <span className={cn(
          "text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider",
          isYoutube ? "bg-red-950/40 text-red-400" : "bg-pink-950/40 text-pink-400"
        )}>
          Video {type} ({isYoutube ? "YouTube" : "Instagram Reel"})
        </span>
        {isYoutube ? (
          <Youtube className="h-5 w-5 text-red-500" />
        ) : (
          <Instagram className="h-5 w-5 text-pink-500" />
        )}
      </div>

      {/* Main card body grid */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Thumbnail area */}
        <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden relative shrink-0 bg-black/40 border border-zinc-800">
          {video.thumbnail ? (
            <img 
              src={video.thumbnail} 
              alt={video.title} 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              {isYoutube && <Youtube className="h-8 w-8 text-zinc-800" />}
            </div>
          )}
          {video.duration ? (
            <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-zinc-300 font-semibold px-1 rounded flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(video.duration)}
            </span>
          ) : null}
        </div>

        {/* Video metadata titles */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            by <span className="text-zinc-200 font-bold">{video.creator}</span>
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500 font-semibold">
            {video.upload_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {video.upload_date}
              </span>
            )}
            {video.follower_count ? (
              <span>
                {formatNumber(video.follower_count)} followers
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grid of basic analytical metrics */}
      <div className="grid grid-cols-3 gap-3 border-t border-zinc-800/80 pt-4 mt-4">
        {/* Views */}
        <div className="bg-black/30 rounded-xl p-2.5 text-center border border-zinc-900">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">Views</span>
          <div className="flex items-center justify-center gap-1 text-zinc-100">
            <Eye className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-sm font-extrabold">{formatNumber(video.views)}</span>
          </div>
        </div>

        {/* Likes */}
        <div className="bg-black/30 rounded-xl p-2.5 text-center border border-zinc-900">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">Likes</span>
          <div className="flex items-center justify-center gap-1 text-zinc-100">
            <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <span className="text-sm font-extrabold">{formatNumber(video.likes)}</span>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-black/30 rounded-xl p-2.5 text-center border border-zinc-900">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">Comments</span>
          <div className="flex items-center justify-center gap-1 text-zinc-100">
            <MessageSquare className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="text-sm font-extrabold">{formatNumber(video.comments)}</span>
          </div>
        </div>
      </div>

      {/* Engagement Rate circular visualization */}
      <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Engagement Rate</span>
          <span className="text-xs text-zinc-400">
            Formula: <code className="text-purple-300 font-mono">((Likes + Comments) / Views) * 100</code>
          </span>
        </div>

        <div className="relative flex items-center gap-3 bg-purple-950/10 border border-purple-900/10 py-1.5 px-3 rounded-2xl shrink-0">
          {/* Radial circular indicator */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 radial-progress-ring">
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-zinc-800"
                strokeWidth="4"
                fill="transparent"
                style={{ r: radius }}
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                className={cn("transition-all duration-1000 ease-out", getERColor(video.engagement_rate))}
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ r: radius }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-purple-300 opacity-60" />
            </div>
          </div>

          <div className="text-right">
            <span className={cn("text-lg font-black block tracking-tight leading-none", getERColor(video.engagement_rate).split(" ")[0])}>
              {video.engagement_rate.toFixed(2)}%
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">Score</span>
          </div>
        </div>
      </div>

      {/* Hashtags display */}
      {video.hashtags && video.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-zinc-800/40">
          {video.hashtags.map((tag) => (
            <span 
              key={tag} 
              className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded-md hover:text-purple-300 hover:border-purple-900/30 transition-all cursor-default"
            >
              #{tag.replace("#", "")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
