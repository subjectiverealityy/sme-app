"use client";

import { useEffect, useState } from "react";
import { LuWifiOff, LuWifi } from "react-icons/lu";

const LS_QUEUE = "credyt_offline_queue";

interface QueuedOp {
  type: "addTransaction" | "addPayment" | "updateTransaction" | "deleteTransaction" | "logReminder" | "saveReply" | "setReplyStatus" | "addScan";
  payload: unknown;
  timestamp: string;
}

function readQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(LS_QUEUE);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedOp[]) {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => typeof window !== "undefined" && navigator.onLine);
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      setPendingCount(readQueue().length);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueChange = (e: CustomEvent<number>) => {
      setPendingCount(e.detail);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("credyt:queue-changed", handleQueueChange as EventListener);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("credyt:queue-changed", handleQueueChange as EventListener);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 top-4 z-40 transition-all duration-300 md:inset-x-auto md:top-6 md:right-6 md:w-[360px] ${isOnline ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
    >
      <div className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg">
        {isOnline ? (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <LuWifi size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold text-emerald-900">Back online</span>
              {pendingCount > 0 && (
                <span className="block text-[12px] text-emerald-700">Syncing {pendingCount} pending change{pendingCount > 1 ? "s" : ""}…</span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <LuWifiOff size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-extrabold text-amber-900">You&apos;re offline</span>
              <span className="block text-[12px] text-amber-700">
                {pendingCount > 0
                  ? `{pendingCount} change${pendingCount > 1 ? "s" : ""} queued — will sync when online`
                  : "Changes you make will sync when you&apos;re back online"}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function enqueueOp(op: Omit<QueuedOp, "timestamp">) {
  const queue = readQueue();
  queue.push({ ...op, timestamp: new Date().toISOString() });
  writeQueue(queue);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("credyt:queue-changed", { detail: queue.length }));
  }
}

export async function flushQueue(flushFn: (op: QueuedOp) => Promise<void>) {
  const queue = readQueue();
  if (queue.length === 0) return;
  const remaining: QueuedOp[] = [];
  for (const op of queue) {
    try {
      await flushFn(op);
    } catch {
      remaining.push(op);
    }
  }
  writeQueue(remaining);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("credyt:queue-changed", { detail: remaining.length }));
  }
}