import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number): string {
  const n = Number(amount) || 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return iso;
  }
}

export function toISODate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function greetingForHour(h = new Date().getHours()): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getDateRange(preset: "week" | "month" | "last-month" | "year" | "all", now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);
  if (preset === "week") {
    const day = start.getDay();
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "last-month") {
    start.setMonth(now.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (preset === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(2000);
  }
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
