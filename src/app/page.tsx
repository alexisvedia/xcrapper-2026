"use client";

import { useAppStore } from "@/store";
import {
  Sidebar,
  InboxView,
  QueueView,
  ConfigView,
  PublishedView,
  Toast,
} from "@/components";
import { useEffect } from "react";
import { motion } from "motion/react";

export default function Home() {
  const {
    currentView,
    approveTweet,
    rejectTweet,
    setEditingTweetId,
    tweets,
    isLoading,
    isInitialized,
    initializeApp,
  } = useAppStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const pendingTweets = tweets.filter((t) => t.status === "pending");
      const firstPendingTweet = pendingTweets[0];

      if (!firstPendingTweet) return;

      switch (e.key.toLowerCase()) {
        case "a":
          approveTweet(firstPendingTweet.id);
          break;
        case "r":
          rejectTweet(firstPendingTweet.id, "Rechazado con atajo de teclado");
          break;
        case "e":
          setEditingTweetId(firstPendingTweet.id);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tweets, approveTweet, rejectTweet, setEditingTweetId]);

  const renderView = () => {
    switch (currentView) {
      case "inbox":
        return <InboxView />;
      case "queue":
        return <QueueView />;
      case "published":
        return <PublishedView />;
      case "config":
        return <ConfigView />;
      default:
        return <InboxView />;
    }
  };

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[var(--bg-void)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.05)_0%,transparent_70%)]" />
        <div className="flex flex-col items-center gap-8 relative z-10">
          <div className="relative group">
            {/* Animated Glow Backlight */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-[var(--accent-cyan)] blur-3xl rounded-full"
            />

            {/* The SVG Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                scale: { duration: 0.8, ease: "easeOut" },
                opacity: { duration: 0.8 },
                rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
              }}
              className="relative w-32 h-32"
            >
              <svg
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_0_15px_rgba(0,242,254,0.5)]"
              >
                <defs>
                  <linearGradient
                    id="grad1"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: "#00f2fe", stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: "#4facfe", stopOpacity: 1 }}
                    />
                  </linearGradient>
                </defs>
                <path
                  d="M120 120L256 256M392 120L256 256M256 256L120 392M256 256L392 392"
                  stroke="url(#grad1)"
                  strokeWidth="60"
                  strokeLinecap="round"
                />
                <path
                  d="M350 150C380 180 400 220 400 256C400 292 380 332 350 362"
                  stroke="url(#grad1)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M162 150C132 180 112 220 112 256C112 292 132 332 162 362"
                  stroke="url(#grad1)"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <motion.path
                  d="M256 160L352 256L256 352L160 256L256 160Z"
                  fill="url(#grad1)"
                  animate={{ opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </svg>
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="text-[var(--text-primary)] font-mono text-lg tracking-[0.2em] uppercase"
            >
              XCrapper
            </motion.p>
            <p className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest">
              Initializing neural links...
            </p>
          </div>

          {/* Progress bar-like element */}
          <div className="w-48 h-1 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--bg-hover)]">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-50"
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-[var(--bg-void)]">
      <Sidebar />
      {renderView()}
      <Toast />
    </main>
  );
}
