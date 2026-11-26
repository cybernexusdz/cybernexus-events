"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell,
  CheckCheck,
  Ticket,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const router = useRouter();
  const { data: session } = useSession();

  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [session?.user?.id]);

  // Initial fetch and subtle 45-second polling
  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Mark as read immediately in state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      // Call API
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif.id }),
      }).catch(console.error);
    }

    setIsOpen(false);

    // Contextual routing: if relates to seat confirmation or ticket, go to /my-tickets
    const lower = `${notif.title} ${notif.message}`.toLowerCase();
    if (lower.includes("ticket") || lower.includes("seat") || lower.includes("waitlist") || lower.includes("promoted")) {
      router.push("/my-tickets");
    } else if (lower.includes("certificate")) {
      router.push("/my-tickets");
    }
  };

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={cn(
          "relative h-9 w-9 rounded-lg border border-border/80 bg-card/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all focus:outline-none",
          isOpen && "border-primary text-primary shadow-[0_0_12px_var(--glow-color)]"
        )}
      >
        <Bell className="h-4 w-4" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-mono font-bold text-primary-foreground shadow-[0_0_8px_var(--glow-color)] animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-0 shadow-2xl z-50 animate-in fade-in zoom-in-95 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <Badge variant="cyber" className="text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  All caught up
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1 focus:outline-none disabled:opacity-50"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No notifications yet</p>
                <p className="text-[11px] text-muted-foreground">
                  You'll be notified immediately when a waitlist spot opens up or an event updates.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const lower = `${item.title} ${item.message}`.toLowerCase();
                const isTicketRelated =
                  lower.includes("seat") || lower.includes("ticket") || lower.includes("waitlist");
                const isCertRelated = lower.includes("certificate");

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={cn(
                      "p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-left hover:bg-muted/40",
                      !item.isRead && "bg-primary/5 border-l-2 border-primary"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        isTicketRelated
                          ? "bg-emerald-500/10 text-emerald-400"
                          : isCertRelated
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {isTicketRelated ? (
                        <Ticket className="h-4 w-4" />
                      ) : isCertRelated ? (
                        <Award className="h-4 w-4" />
                      ) : (
                        <Bell className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-semibold truncate",
                            item.isRead ? "text-foreground/80" : "text-foreground font-bold"
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-border/60 text-center bg-card">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                onClick={() => setIsOpen(false)}
              >
                <Link href="/my-tickets">
                  <span>Go to My Tickets</span>
                  <ExternalLink className="h-3 w-3 ml-1.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
