"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Business, ScannedRecord, Transaction } from "./constants";
import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/client";
import { sampleBusiness, sampleTransactions, sampleScans } from "./sample";
import { uid } from "./utils";

interface DemoUser {
  id: string;
  name: string;
  email: string;
}

interface StoreState {
  user: DemoUser | null;
  supabaseUser: { id: string; email?: string } | null;
  business: Business | null;
  transactions: Transaction[];
  scans: ScannedRecord[];
  loading: boolean;
  useDemo: boolean;
  setUser: (u: DemoUser | null) => void;
  setBusiness: (b: Business | null) => void;
  addTransaction: (t: Omit<Transaction, "id" | "created_at" | "business_id">) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addScan: (s: Omit<ScannedRecord, "id" | "created_at" | "business_id"> & { business_id?: string }) => Promise<ScannedRecord>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<StoreState | null>(null);

const LS_USER = "ledgerly_user";
const LS_BIZ = "ledgerly_business";
const LS_TXN = "ledgerly_txns";
const LS_SCAN = "ledgerly_scans";

function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeLS(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<DemoUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email?: string } | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scans, setScans] = useState<ScannedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const useDemo = !isSupabaseConfigured();

  const setUser = useCallback((u: DemoUser | null) => {
    setUserState(u);
    if (u) writeLS(LS_USER, u);
    else localStorage.removeItem(LS_USER);
  }, []);

  const setBusiness = useCallback((b: Business | null) => {
    setBusinessState(b);
    if (b) writeLS(LS_BIZ, b);
    else localStorage.removeItem(LS_BIZ);
  }, []);

  const persistTxns = useCallback((txns: Transaction[]) => {
    setTransactions(txns);
    writeLS(LS_TXN, txns);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        const u = readLS<DemoUser>(LS_USER);
        const b = readLS<Business>(LS_BIZ);
        let txns = readLS<Transaction[]>(LS_TXN);
        let sc = readLS<ScannedRecord[]>(LS_SCAN);
        if (u && !txns) {
          txns = sampleTransactions(b?.id ?? "biz_demo");
          writeLS(LS_TXN, txns);
        }
        if (u && !sc) {
          sc = sampleScans(b?.id ?? "biz_demo");
          writeLS(LS_SCAN, sc);
        }
        setUserState(u);
        setBusinessState(b);
        setTransactions(txns ?? []);
        setScans(sc ?? []);
      } else {
        const supabase = getSupabaseBrowser()!;
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setSupabaseUser({ id: data.user.id, email: data.user.email ?? undefined });
          setUserState({
            id: data.user.id,
            email: data.user.email ?? "",
            name: (data.user.user_metadata?.full_name as string) || data.user.email?.split("@")[0] || "Business Owner",
          });
          const { data: biz } = await supabase
            .from("businesses")
            .select("*")
            .eq("owner_id", data.user.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (biz) {
            setBusinessState(biz as Business);
            const { data: txns } = await supabase
              .from("transactions")
              .select("*")
              .eq("business_id", (biz as Business).id)
              .order("transaction_date", { ascending: false })
              .limit(500);
            setTransactions((txns as Transaction[]) ?? []);
            const { data: sc } = await supabase
              .from("scanned_records")
              .select("*")
              .eq("business_id", (biz as Business).id)
              .order("created_at", { ascending: false })
              .limit(50);
            setScans((sc as ScannedRecord[]) ?? []);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTransaction: StoreState["addTransaction"] = useCallback(
    async (t) => {
      const bizId = business?.id ?? "biz_demo";
      if (!isSupabaseConfigured() || !business?.id || business.id === "biz_demo") {
        const full: Transaction = {
          ...t,
          id: uid("txn"),
          business_id: bizId,
          created_at: new Date().toISOString(),
        };
        const next = [full, ...transactions];
        persistTxns(next);
        return full;
      }
      const supabase = getSupabaseBrowser()!;
      // NOTE: id/created_at are omitted — Postgres generates UUIDs via gen_random_uuid().
      // Sending a text id like "txn_xxx" to a uuid column causes 400 Bad Request.
      const compatibilityInterested = t.payment_status === "interested";
      const payload = {
        business_id: business.id,
        type: t.type,
        description: t.description,
        amount: t.amount,
        category: t.category,
        transaction_date: t.transaction_date,
        payment_status: compatibilityInterested ? "pending" : t.payment_status,
        payment_method: t.payment_method ?? null,
        customer_or_vendor: t.customer_or_vendor ?? null,
        customer_phone: t.customer_phone ?? null,
        due_date: t.due_date ?? null,
        notes: compatibilityInterested ? `${t.notes ?? ""} [credyt:interested]`.trim() : t.notes ?? null,
        source: t.source,
      };
      let { data, error } = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .single();
      if (data && compatibilityInterested) data = { ...data, payment_status: "interested" };
      if (error) throw error;
      const next = [data as Transaction, ...transactions];
      setTransactions(next);
      return data as Transaction;
    },
    [business, transactions, persistTxns]
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Transaction>) => {
      if (!isSupabaseConfigured() || !business?.id || business.id === "biz_demo") {
        persistTxns(transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        return;
      }
      const supabase = getSupabaseBrowser()!;
      const { error } = await supabase.from("transactions").update(patch).eq("id", id);
      if (error) throw error;
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [business, transactions, persistTxns]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured() || !business?.id || business.id === "biz_demo") {
        persistTxns(transactions.filter((t) => t.id !== id));
        return;
      }
      const supabase = getSupabaseBrowser()!;
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    },
    [business, transactions, persistTxns]
  );

  const addScan: StoreState["addScan"] = useCallback(
    async (s) => {
      const local: ScannedRecord = {
        ...s,
        id: uid("scan"),
        business_id: s.business_id ?? business?.id ?? "biz_demo",
        created_at: new Date().toISOString(),
      } as ScannedRecord;
      const next = [local, ...scans];
      setScans(next);
      writeLS(LS_SCAN, next);
      if (isSupabaseConfigured() && business?.id && business.id !== "biz_demo") {
        try {
          const supabase = getSupabaseBrowser()!;
          // Omit id/created_at — uuid generated by Postgres
          await supabase.from("scanned_records").insert({
            business_id: business.id,
            image_url: s.image_url ?? null,
            status: s.status,
            extracted_data: s.extracted_data ?? null,
          });
        } catch {
          /* demo fallback already saved */
        }
      }
      return local;
    },
    [business, scans]
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowser()!;
      await supabase.auth.signOut();
    }
    localStorage.removeItem(LS_USER);
    setUserState(null);
    setSupabaseUser(null);
    // keep business/txns for demo? clear user only
  }, []);

  const value = useMemo<StoreState>(
    () => ({
      user,
      supabaseUser,
      business,
      transactions,
      scans,
      loading,
      useDemo,
      setUser,
      setBusiness,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addScan,
      refresh,
      logout,
    }),
    [user, supabaseUser, business, transactions, scans, loading, useDemo, setUser, setBusiness, addTransaction, updateTransaction, deleteTransaction, addScan, refresh, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
