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
      <div className="flex items-center justify-end h-14 px-4">
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
