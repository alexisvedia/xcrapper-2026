"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { Power, Send } from "lucide-react";
import { motion } from "motion/react";

export function MobileHeader() {
  const {
    isScrapingActive,
    setScrapingActive,
    lastScrapeTime,
    isAutoPublishing,
    autoPublishCountdown,
    nextPublishTime,
    setAutoPublishCountdown,
  } = useAppStore();

  const [lastScrapeText, setLastScrapeText] = useState("Nunca");

  useEffect(() => {
    const updateLastScrape = () => {
      if (!lastScrapeTime) {
        setLastScrapeText("Nunca");
        return;
      }
      const diff = Date.now() - lastScrapeTime.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setLastScrapeText("Ahora");
      else if (mins < 60) setLastScrapeText(`${mins}m`);
      else setLastScrapeText(`${Math.floor(mins / 60)}h`);
    };

    updateLastScrape();
    const interval = setInterval(updateLastScrape, 60000);
    return () => clearInterval(interval);
  }, [lastScrapeTime]);

  useEffect(() => {
    if (!isAutoPublishing) return;

    const interval = setInterval(() => {
      if (nextPublishTime) {
        const secondsLeft = Math.max(
          0,
          Math.floor((nextPublishTime.getTime() - Date.now()) / 1000)
        );
        setAutoPublishCountdown(secondsLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPublishing, nextPublishTime, setAutoPublishCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-b border-[var(--border)]"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center p-1.5">
            <svg
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_6px_rgba(0,242,254,0.3)]"
            >
              <defs>
                <linearGradient
                  id="mobile-header-grad"
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
                stroke="url(#mobile-header-grad)"
                strokeWidth="60"
                strokeLinecap="round"
              />
              <path
                d="M350 150C380 180 400 220 400 256C400 292 380 332 350 362"
                stroke="url(#mobile-header-grad)"
                strokeWidth="20"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M162 150C132 180 112 220 112 256C112 292 132 332 162 362"
                stroke="url(#mobile-header-grad)"
                strokeWidth="20"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">XCrapper</span>
        </div>

        {/* System Controls */}
        <div className="flex items-center gap-2">
          {/* Scraping Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setScrapingActive(!isScrapingActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
              isScrapingActive
                ? "bg-[var(--green-dim)] border-[var(--green)]"
                : "bg-[var(--bg-secondary)] border-[var(--border)]"
            }`}
          >
            <Power
              className={`w-3.5 h-3.5 ${
                isScrapingActive
                  ? "text-[var(--green)]"
                  : "text-[var(--text-muted)]"
              }`}
            />
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isScrapingActive
                    ? "bg-[var(--green)] animate-pulse"
                    : "bg-[var(--text-muted)]"
                }`}
              />
              <span
                className={`text-[10px] font-mono uppercase ${
                  isScrapingActive
                    ? "text-[var(--green)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {lastScrapeText}
              </span>
            </div>
          </motion.button>

          {/* Auto-Publish Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 ${
              isAutoPublishing
                ? "bg-[var(--green-dim)] border-[var(--green)]"
                : "bg-[var(--bg-secondary)] border-[var(--border)]"
            }`}
          >
            <Send
              className={`w-3.5 h-3.5 ${
                isAutoPublishing
                  ? "text-[var(--green)]"
                  : "text-[var(--text-muted)]"
              }`}
            />
            {isAutoPublishing ? (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                <span className="text-[10px] font-mono text-[var(--green)]">
                  {formatCountdown(autoPublishCountdown)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                Off
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
