"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Business, ScannedRecord, Transaction, DebtPayment, DebtReminder, DebtReply, ReminderStatus } from "./constants";
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
  debtPayments: DebtPayment[];
  debtReminders: DebtReminder[];
  debtReplies: DebtReply[];
  loading: boolean;
  useDemo: boolean;
  setUser: (u: DemoUser | null) => void;
  setBusiness: (b: Business | null) => void;
  addTransaction: (t: Omit<Transaction, "id" | "created_at" | "business_id">) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addScan: (s: Omit<ScannedRecord, "id" | "created_at" | "business_id"> & { business_id?: string }) => Promise<ScannedRecord>;
  addPayment: (input: { transaction_id: string; amount: number; method?: string; notes?: string }) => Promise<DebtPayment>;
  logReminder: (input: Omit<DebtReminder, "id" | "business_id" | "created_at" | "sent_at" | "status"> & { status?: ReminderStatus }) => Promise<DebtReminder>;
  saveReply: (r: Omit<DebtReply, "id" | "business_id" | "created_at">) => Promise<DebtReply>;
  setReplyStatus: (id: string, status: DebtReply["status"]) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<StoreState | null>(null);

const LS_USER = "ledgerly_user";
const LS_BIZ = "ledgerly_business";
const LS_TXN = "ledgerly_txns";
const LS_SCAN = "ledgerly_scans";
const LS_PAYMENTS = "ledgerly_payments";
const LS_REMINDERS = "ledgerly_reminders";
const LS_REPLIES = "ledgerly_replies";

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

function debtPaidInFull(transactionId: string, txns: Transaction[], payments: DebtPayment[]): boolean {
  const txn = txns.find((t) => t.id === transactionId);
  if (!txn) return true;
  const total = payments
    .filter((p) => p.transaction_id === transactionId)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return total >= Number(txn.amount);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<DemoUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email?: string } | null>(null);
  const [business, setBusinessState] = useState<Business | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scans, setScans] = useState<ScannedRecord[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [debtReminders, setDebtReminders] = useState<DebtReminder[]>([]);
  const [debtReplies, setDebtReplies] = useState<DebtReply[]>([]);
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
        setDebtPayments(readLS<DebtPayment[]>(LS_PAYMENTS) ?? []);
        setDebtReminders(readLS<DebtReminder[]>(LS_REMINDERS) ?? []);
        setDebtReplies(readLS<DebtReply[]>(LS_REPLIES) ?? []);
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
          const { data: payments } = await supabase
            .from("debt_payments")
            .select("*")
            .eq("business_id", (biz as Business).id)
            .order("paid_at", { ascending: false })
            .limit(2000);
          setDebtPayments((payments as DebtPayment[]) ?? []);
          const { data: reminders } = await supabase
            .from("debt_reminders")
            .select("*")
            .eq("business_id", (biz as Business).id)
            .order("sent_at", { ascending: false })
            .limit(2000);
          setDebtReminders((reminders as DebtReminder[]) ?? []);
          const { data: replies } = await supabase
            .from("debt_replies")
            .select("*")
            .eq("business_id", (biz as Business).id)
            .order("created_at", { ascending: false })
            .limit(500);
          setDebtReplies((replies as DebtReply[]) ?? []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- standard data-fetching pattern
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching pattern
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

  const addPayment: StoreState["addPayment"] = useCallback(
    async ({ transaction_id, amount, method, notes }) => {
      const bizId = (business?.id ?? "biz_demo") as string;
      const record: DebtPayment = {
        id: uid("pay"),
        business_id: bizId,
        transaction_id,
        amount: Math.round(Number(amount) || 0),
        method,
        notes,
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const isLive = isSupabaseConfigured() && business?.id && business.id !== "biz_demo";
      if (isLive) {
        const supabase = getSupabaseBrowser()!;
        const { data, error } = await supabase
          .from("debt_payments")
          .insert({
            business_id: business!.id,
            transaction_id,
            amount: record.amount,
            method: method ?? null,
            notes: notes ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        record.id = (data as DebtPayment).id;
      }
      const next = [record, ...debtPayments];
      setDebtPayments(next);
      const settled = debtPaidInFull(transaction_id, transactions, next);
      if (settled) {
        if (isLive) {
          const updateSupabase = getSupabaseBrowser()!;
          await updateSupabase
            .from("transactions")
            .update({ payment_status: "paid" })
            .eq("id", transaction_id);
        }
        persistTxns(
          transactions.map((t) => (t.id === transaction_id ? { ...t, payment_status: "paid" } : t))
        );
      }
      writeLS(LS_PAYMENTS, next);
      return record;
    },
    [business, transactions, debtPayments, persistTxns]
  );

  const logReminder: StoreState["logReminder"] = useCallback(
    async (input) => {
      const now = new Date().toISOString();
      const record: DebtReminder = {
        ...input,
        status: input.status ?? "sent",
        sent_at: now,
        id: uid("rem"),
        business_id: (business?.id ?? "biz_demo") as string,
        created_at: now,
      };
      const isLive = isSupabaseConfigured() && business?.id && business.id !== "biz_demo";
      if (isLive) {
        const supabase = getSupabaseBrowser()!;
        const { data, error } = await supabase
          .from("debt_reminders")
          .insert({
            business_id: business!.id,
            transaction_id: record.transaction_id,
            debtor_name: record.debtor_name,
            debtor_phone: record.debtor_phone,
            stage: record.stage,
            language: record.language,
            message: record.message,
            status: record.status,
          })
          .select()
          .single();
        if (error) throw error;
        record.id = (data as DebtReminder).id;
      }
      const next = [record, ...debtReminders];
      setDebtReminders(next);
      writeLS(LS_REMINDERS, next);
      return record;
    },
    [business, debtReminders]
  );

  const saveReply: StoreState["saveReply"] = useCallback(
    async (r) => {
      const now = new Date().toISOString();
      const record: DebtReply = {
        ...r,
        id: uid("rep"),
        business_id: (business?.id ?? "biz_demo") as string,
        created_at: now,
      };
      const isLive = isSupabaseConfigured() && business?.id && business.id !== "biz_demo";
      if (isLive) {
        const supabase = getSupabaseBrowser()!;
        const { data, error } = await supabase
          .from("debt_replies")
          .insert({
            business_id: business!.id,
            transaction_id: record.transaction_id,
            raw_text: record.raw_text,
            raw_file_type: record.raw_file_type ?? null,
            intent: record.intent,
            promised_date: record.promised_date,
            amount_mentioned: record.amount_mentioned,
            confidence: record.confidence,
            quote: record.quote,
            status: record.status,
          })
          .select()
          .single();
        if (error) throw error;
        record.id = (data as DebtReply).id;
      }
      const next = [record, ...debtReplies];
      setDebtReplies(next);
      writeLS(LS_REPLIES, next);
      return record;
    },
    [business, debtReplies]
  );

  const setReplyStatus: StoreState["setReplyStatus"] = useCallback(
    async (id, status) => {
      if (isSupabaseConfigured() && business?.id && business.id !== "biz_demo") {
        const supabase = getSupabaseBrowser()!;
        await supabase.from("debt_replies").update({ status }).eq("id", id);
      }
      const next = debtReplies.map((r) => (r.id === id ? { ...r, status } : r));
      setDebtReplies(next);
      writeLS(LS_REPLIES, next);
    },
    [business, debtReplies]
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
      debtPayments,
      debtReminders,
      debtReplies,
      loading,
      useDemo,
      setUser,
      setBusiness,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addPayment,
      logReminder,
      saveReply,
      setReplyStatus,
      addScan,
      refresh,
      logout,
    }),
    [user, supabaseUser, business, transactions, scans, debtPayments, debtReminders, debtReplies, loading, useDemo, setUser, setBusiness, addTransaction, updateTransaction, deleteTransaction, addPayment, logReminder, saveReply, setReplyStatus, addScan, refresh, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
