"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Citation, Terminal, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationType {
  video_id: string;
  chunk_number: number;
  source: string;
  text?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: CitationType[];
}

interface ChatInterfaceProps {
  sessionId: string;
  initialHistory: Message[];
}

const SUGGESTED_QUESTIONS = [
  "Why did Video A get more engagement than Video B?",
  "Compare the hooks in the first 5 seconds.",
  "What is the engagement rate of each video?",
  "Who is the creator of Video B?",
  "Suggest improvements for Video B."
];

export default function ChatInterface({ sessionId, initialHistory }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialHistory);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedCitationIndex, setExpandedCitationIndex] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync with initial history when session changes
  useEffect(() => {
    setMessages(initialHistory);
  }, [initialHistory, sessionId]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Send request via SSE
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // 1. Add User Message
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsStreaming(true);

    // Create placeholder for assistant streaming content
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // Fetch stream from FastAPI backend
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to streaming API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream reader not supported");

      let assistantText = "";
      let parsedCitations: CitationType[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // SSE formatting split ("data: ")
        const lines = chunk.split("\n\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "content") {
                assistantText += data.content;
                // Update active streaming message
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: assistantText,
                    };
                  }
                  return updated;
                });
              } else if (data.type === "citations") {
                parsedCitations = data.citations;
              } else if (data.type === "error") {
                assistantText += `\n[Error: ${data.content}]`;
              }
            } catch (e) {
              // Ignore partial parsing errors on boundary split
            }
          }
        }
      }

      // Finalize message by injecting parsed citations list
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: assistantText,
            citations: parsedCitations,
          };
        }
        return updated;
      });

    } catch (err: any) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: "Sorry, I encountered a communication error connecting to the analytical database.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const toggleCitation = (msgIndex: number, citIndex: number) => {
    const uniqueId = `${msgIndex}-${citIndex}`;
    if (expandedCitationIndex === uniqueId) {
      setExpandedCitationIndex(null);
    } else {
      setExpandedCitationIndex(uniqueId);
    }
  };

  // Strip sources list from raw text response to prevent double-displaying citations
  const cleanResponseContent = (content: string) => {
    const index = content.indexOf("Source:");
    if (index !== -1) {
      return content.substring(0, index).trim();
    }
    return content;
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[600px] shadow-2xl relative border border-zinc-800/60 overflow-hidden">
      {/* Interactive header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/40 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-1.5 leading-none">
              Movana Strategy Copilot
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1 block">Session RAG Active</span>
          </div>
        </div>
        <span className="text-[10px] bg-purple-950/50 text-purple-400 font-mono px-2 py-0.5 rounded border border-purple-900/30">
          ID: {sessionId.substring(0, 8)}...
        </span>
      </div>

      {/* Message workspace */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="h-12 w-12 rounded-2xl bg-purple-950/40 flex items-center justify-center border border-purple-800/30 mb-4 animate-bounce">
              <Sparkles className="h-6 w-6 text-purple-400" />
            </div>
            <h4 className="text-sm font-extrabold text-zinc-200">Ingestion Active! Ask me anything</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Analyze transcripts, check hook timings, calculate engagement, and outline video upgrades.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isAssistant = msg.role === "assistant";
            return (
              <div
                key={index}
                className={cn(
                  "flex gap-3 max-w-[85%] transition-all",
                  isAssistant ? "mr-auto" : "ml-auto flex-row-reverse"
                )}
              >
                {/* Avatar Icon */}
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border text-xs font-black",
                  isAssistant 
                    ? "bg-purple-950/60 border-purple-800/40 text-purple-300" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-300"
                )}>
                  {isAssistant ? "M" : "U"}
                </div>

                <div className="space-y-2">
                  {/* Speech Bubble */}
                  <div className={cn(
                    "rounded-2xl p-3.5 text-xs leading-relaxed border",
                    isAssistant
                      ? "bg-zinc-900/80 border-zinc-800 text-zinc-200"
                      : "bg-purple-600 border-purple-500 text-white font-medium shadow-md shadow-purple-900/20"
                  )}>
                    {isAssistant && msg.content === "" ? (
                      /* Typing Indicator */
                      <div className="flex items-center gap-1.5 py-1 px-2">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed font-sans prose prose-invert max-w-none">
                        {isAssistant ? cleanResponseContent(msg.content) : msg.content}
                      </p>
                    )}
                  </div>

                  {/* Render citations bottom drawer (Only Assistant & Only when loaded) */}
                  {isAssistant && msg.citations && msg.citations.length > 0 && (
                    <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-2.5 space-y-1.5 max-w-md shadow-inner">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-1">
                        <FileText className="h-3 w-3 text-purple-400" />
                        Sources & Transcript Citations
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cit, cIdx) => {
                          const isExpanded = expandedCitationIndex === `${index}-${cIdx}`;
                          return (
                            <div key={cIdx} className="w-full">
                              <button
                                onClick={() => toggleCitation(index, cIdx)}
                                className={cn(
                                  "w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all hover:bg-zinc-900 bg-zinc-900/60 cursor-pointer",
                                  cit.video_id === "A" 
                                    ? "border-red-950/30 text-red-300" 
                                    : "border-pink-950/30 text-pink-300"
                                )}
                              >
                                <span className="font-semibold flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    cit.video_id === "A" ? "bg-red-500" : "bg-pink-500"
                                  )} />
                                  Video {cit.video_id} - Chunk {cit.chunk_number}
                                </span>
                                <span className="text-[8px] text-zinc-500 flex items-center gap-0.5">
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </span>
                              </button>

                              {/* Click-to-expand transcript text block */}
                              {isExpanded && cit.text && (
                                <div className="mt-1 p-2 bg-zinc-950 border border-zinc-900 text-[10px] text-zinc-400 rounded-lg leading-relaxed font-mono select-text">
                                  {cit.text}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* Dynamic scroll anchor */}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts Ribbons */}
      {messages.length > 0 && !isStreaming && (
        <div className="p-3 border-t border-zinc-900 bg-zinc-950/10 flex gap-2 overflow-x-auto select-none no-scrollbar">
          {SUGGESTED_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleSendMessage(question)}
              className="shrink-0 text-[10px] font-semibold bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-purple-300 hover:border-purple-900/50 py-1.5 px-3 rounded-full transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="h-2.5 w-2.5 text-purple-400" />
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input controls */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/30">
        <div className="relative flex items-center">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isStreaming ? "Analyst streaming response..." : "Ask Movana (e.g. Compare hooks or explain engagement ratios)..."}
            rows={1}
            disabled={isStreaming}
            className="w-full bg-black/50 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all resize-none max-h-24 min-h-[42px]"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isStreaming}
            className={cn(
              "absolute right-2 p-2 rounded-lg transition-all cursor-pointer",
              inputValue.trim() && !isStreaming
                ? "bg-purple-600 text-white hover:bg-purple-500 shadow-md"
                : "text-zinc-600 bg-zinc-950/40 border border-zinc-900 cursor-not-allowed"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
