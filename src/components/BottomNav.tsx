"use client";

import { useAppStore } from "@/store";
import { ViewType } from "@/types";
import { Inbox, ListOrdered, CheckCircle, Settings } from "lucide-react";
import { motion } from "motion/react";

const navItems: { id: ViewType; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "queue", label: "Cola", icon: ListOrdered },
  { id: "published", label: "Publicados", icon: CheckCircle },
  { id: "config", label: "Config", icon: Settings },
];

export function BottomNav() {
  const { currentView, setCurrentView, tweets, queue } = useAppStore();

  const pendingCount = tweets.filter((t) => t.status === "pending").length;
  const queueCount = queue.length;

  const getCounts = (id: ViewType): number => {
    switch (id) {
      case "inbox":
        return pendingCount;
      case "queue":
        return queueCount;
      default:
        return 0;
    }
  };

  const formatCount = (count: number): string => {
    if (count > 99) return "99+";
    return String(count);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-lg border-t border-[var(--border)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const count = getCounts(item.id);

          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[64px] py-1"
            >
              {/* Active indicator line */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--accent)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon container with badge */}
              <div className="relative">
                <div
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${
                    isActive ? "bg-[var(--accent-dim)]" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  />
                </div>

                {/* Badge */}
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold font-mono rounded-full bg-[var(--accent)] text-[var(--bg-root)]"
                  >
                    {formatCount(count)}
                  </motion.span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium mt-0.5 transition-colors duration-200 ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
