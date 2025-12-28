"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { ViewType } from "@/types";
import {
  Inbox,
  ListOrdered,
  CheckCircle,
  Settings,
  Power,
  Send,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { motion } from "motion/react";

const navItems: { id: ViewType; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "queue", label: "Cola", icon: ListOrdered },
  { id: "published", label: "Publicados", icon: CheckCircle },
  { id: "config", label: "Config", icon: Settings },
];

export function Sidebar() {
  const {
    currentView,
    setCurrentView,
    tweets,
    queue,
    isScrapingActive,
    setScrapingActive,
    lastScrapeTime,
    isAutoPublishing,
    autoPublishCountdown,
  } = useAppStore();

  const [lastScrapeText, setLastScrapeText] = useState("Nunca");
  const [collapsed, setCollapsed] = useState(false);

  const pendingCount = tweets.filter((t) => t.status === "pending").length;
  const queueCount = queue.length;
  const publishedCount = tweets.filter((t) => t.status === "published").length;

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const getCounts = (id: ViewType) => {
    switch (id) {
      case "inbox":
        return pendingCount;
      case "queue":
        return queueCount;
      case "published":
        return publishedCount;
      default:
        return 0;
    }
  };

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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isAutoPublishing) return;

    const interval = setInterval(() => {
      const { nextPublishTime, setAutoPublishCountdown } =
        useAppStore.getState();
      if (nextPublishTime) {
        const secondsLeft = Math.max(
          0,
          Math.floor((nextPublishTime.getTime() - Date.now()) / 1000)
        );
        setAutoPublishCountdown(secondsLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPublishing]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className={`p-4 border-b border-[var(--border)] ${
          collapsed ? "px-3" : "p-6"
        }`}
      >
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0 p-2">
            <svg
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_8px_rgba(0,242,254,0.3)]"
            >
              <defs>
                <linearGradient
                  id="sidebar-grad"
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
                stroke="url(#sidebar-grad)"
                strokeWidth="60"
                strokeLinecap="round"
              />
              <path
                d="M350 150C380 180 400 220 400 256C400 292 380 332 350 362"
                stroke="url(#sidebar-grad)"
                strokeWidth="20"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d="M162 150C132 180 112 220 112 256C112 292 132 332 162 362"
                stroke="url(#sidebar-grad)"
                strokeWidth="20"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
          {!collapsed && (
            <h1 className="text-lg font-semibold tracking-tight">XCrapper</h1>
          )}
        </div>
      </div>

      {/* System Status */}
      {!collapsed ? (
        <button
          onClick={() => setScrapingActive(!isScrapingActive)}
          className="w-[calc(100%-2rem)] px-4 py-3 mx-4 mt-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-all duration-200 text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
              Scraping
            </span>
            <div className="flex items-center gap-2">
              <Power
                className={`w-3.5 h-3.5 transition-colors ${
                  isScrapingActive
                    ? "text-[var(--green)]"
                    : "text-[var(--text-muted)]"
                }`}
              />
              <div
                className={`w-2 h-2 rounded-full ${
                  isScrapingActive
                    ? "bg-[var(--green)] animate-pulse"
                    : "bg-[var(--text-muted)]"
                }`}
              />
              <span
                className={`text-xs font-mono ${
                  isScrapingActive
                    ? "text-[var(--green)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {isScrapingActive ? "Activo" : "Pausado"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <div className="w-3 h-3 flex items-center justify-center">
                <svg
                  viewBox="0 0 512 512"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full opacity-60"
                >
                  <path
                    d="M120 120L256 256M392 120L256 256M256 256L120 392M256 256L392 392"
                    stroke="currentColor"
                    strokeWidth="60"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span>Último: {lastScrapeText}</span>
            </div>
          </div>
        </button>
      ) : (
        <button
          onClick={() => setScrapingActive(!isScrapingActive)}
          className="w-10 h-10 mx-auto mt-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent)] flex items-center justify-center"
          title={isScrapingActive ? "Scraping activo" : "Scraping pausado"}
        >
          <Power
            className={`w-4 h-4 ${
              isScrapingActive
                ? "text-[var(--green)]"
                : "text-[var(--text-muted)]"
            }`}
          />
        </button>
      )}

      {/* Auto-Publish Status */}
      {!collapsed ? (
        <div
          className={`w-[calc(100%-2rem)] px-4 py-3 mx-4 mt-2 rounded-lg border transition-all duration-200 ${
            isAutoPublishing
              ? "bg-[var(--green-dim)] border-[var(--green)]"
              : "bg-[var(--bg-secondary)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
              Publicación
            </span>
            <div className="flex items-center gap-2">
              <Send
                className={`w-3.5 h-3.5 ${
                  isAutoPublishing
                    ? "text-[var(--green)]"
                    : "text-[var(--text-muted)]"
                }`}
              />
              <span
                className={`text-xs font-mono ${
                  isAutoPublishing
                    ? "text-[var(--green)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {isAutoPublishing ? "Auto" : "Manual"}
              </span>
            </div>
          </div>
          {isAutoPublishing ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-[var(--green)] font-mono">
                Próximo: {formatCountdown(autoPublishCountdown)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Cola: {queueCount} tweets</span>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`w-10 h-10 mx-auto mt-2 rounded-lg border flex items-center justify-center ${
            isAutoPublishing
              ? "bg-[var(--green-dim)] border-[var(--green)]"
              : "bg-[var(--bg-secondary)] border-[var(--border)]"
          }`}
          title={
            isAutoPublishing
              ? `Auto-publicación: ${formatCountdown(autoPublishCountdown)}`
              : "Publicación manual"
          }
        >
          <Send
            className={`w-4 h-4 ${
              isAutoPublishing
                ? "text-[var(--green)]"
                : "text-[var(--text-muted)]"
            }`}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-1 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && (
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider px-3 mb-3">
            Navegación
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const count = getCounts(item.id);

          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              whileTap={{ scale: 0.98 }}
              title={collapsed ? item.label : undefined}
              className={`
                w-full flex items-center ${
                  collapsed ? "justify-center" : "justify-between"
                }
                ${collapsed ? "p-3" : "px-3 py-2.5"} rounded-lg
                font-medium text-sm transition-all duration-200 relative
                ${
                  isActive
                    ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                }
              `}
            >
              <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
                <Icon className="w-5 h-5" />
                {!collapsed && <span>{item.label}</span>}
              </div>
              {count > 0 && !collapsed && (
                <span
                  className={`
                  px-2 py-0.5 rounded text-xs font-mono font-semibold
                  ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--bg-root)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                  }
                `}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Collapse Button - Desktop only */}
      <div className="hidden md:block p-4 border-t border-[var(--border)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <aside
      className={`hidden md:flex h-screen bg-[var(--bg-primary)] border-r border-[var(--border)] flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {sidebarContent}
    </aside>
  );
}
