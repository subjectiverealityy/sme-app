"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/client";
import { uid } from "./utils";

export interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMsg[];
  updatedAt: string;
}

const LS_PREFIX = "ledgerly_chats_";

function lsKey(owner: string) {
  return `${LS_PREFIX}${owner}`;
}

function readLS(owner: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(lsKey(owner));
    const arr = raw ? (JSON.parse(raw) as ChatSession[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeLS(owner: string, sessions: ChatSession[]) {
  try {
    localStorage.setItem(lsKey(owner), JSON.stringify(sessions.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

function toSession(row: { id: string; title: string; messages: unknown; updated_at?: string; created_at?: string }): ChatSession {
  return {
    id: row.id,
    title: row.title || "New chat",
    messages: Array.isArray(row.messages) ? (row.messages as ChatMsg[]) : [],
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

/**
 * Chat history hook.
 * LocalStorage is the offline-safe store; Supabase `ai_chats` is best-effort sync
 * (works after running supabase/migration_ai_chats.sql, silently skips otherwise).
 */
export function useAiChats(ownerKey: string, businessId: string | null) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ownerRef = useRef(ownerKey);
  ownerRef.current = ownerKey;

  // Load: Supabase first (if available), else localStorage
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      let rows: ChatSession[] | null = null;
      if (isSupabaseConfigured() && businessId && businessId !== "biz_demo") {
        try {
          const supabase = getSupabaseBrowser()!;
          const { data, error } = await supabase
            .from("ai_chats")
            .select("id,title,messages,updated_at,created_at")
            .eq("business_id", businessId)
            .order("updated_at", { ascending: false })
            .limit(50);
          if (!error && data) rows = data.map(toSession);
        } catch {
          rows = null;
        }
      }
      if (cancelled) return;
      const finalRows = rows ?? readLS(ownerKey);
      setSessions(finalRows);
      if (rows) writeLS(ownerKey, rows);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerKey, businessId]);

  const persist = useCallback(
    (next: ChatSession[]) => {
      setSessions(next);
      writeLS(ownerRef.current, next);
      // best-effort Supabase sync
      if (isSupabaseConfigured() && businessId && businessId !== "biz_demo") {
        try {
          const supabase = getSupabaseBrowser()!;
          for (const s of next.slice(0, 50)) {
            void supabase.from("ai_chats").upsert({
              id: s.id,
              business_id: businessId,
              title: s.title,
              messages: s.messages,
              updated_at: new Date().toISOString(),
            });
          }
        } catch {
          /* offline / table missing — LS copy remains */
        }
      }
    },
    [businessId]
  );

  const newSession = useCallback((): ChatSession => {
    const s: ChatSession = { id: uid("chat"), title: "New chat", messages: [], updatedAt: new Date().toISOString() };
    persist([s, ...sessions]);
    return s;
  }, [persist, sessions]);

  const updateSession = useCallback(
    (id: string, patch: Partial<ChatSession>) => {
      persist(sessions.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s)));
    },
    [persist, sessions]
  );

  const deleteSession = useCallback(
    (id: string) => {
      persist(sessions.filter((s) => s.id !== id));
      if (isSupabaseConfigured() && businessId && businessId !== "biz_demo") {
        try {
          const supabase = getSupabaseBrowser()!;
          void supabase.from("ai_chats").delete().eq("id", id);
        } catch {
          /* ignore */
        }
      }
    },
    [persist, sessions, businessId]
  );

  return { sessions, loaded, newSession, updateSession, deleteSession, persist };
}
