import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movana | AI-RAG Video Comparison & Ingestion Marketing analytics Copilot",
  description: "Ingest YouTube and Instagram Reel transcripts, analyze hooks and metrics, and chat with local vector-database conversational RAG.",
  keywords: ["RAG Chatbot", "FastAPI RAG", "YouTube Comparison", "Instagram Reels analytics", "LangChain ChromaDB", "Gemini 2.5 Flash"],
  authors: [{ name: "Movana AI Solutions" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        {children}
      </body>
    </html>
  );
}
