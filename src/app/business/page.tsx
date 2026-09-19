"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BusinessPage() {
  const { business, setBusiness } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({
    name: business?.name ?? "",
    category: business?.category ?? "Other",
    phone: business?.phone ?? "",
    location: business?.location ?? "",
    description: business?.description ?? "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const next = { ...business, ...form, id: business?.id ?? "biz_demo", owner_id: business?.owner_id ?? "demo-user", created_at: business?.created_at ?? new Date().toISOString() };
      if (isSupabaseConfigured() && business?.id && business.id !== "biz_demo") {
        const supabase = getSupabaseBrowser()!;
        const { error } = await supabase.from("businesses").update(form).eq("id", business.id);
        if (error) throw error;
      }
      setBusiness(next as typeof business & {});
      setMsg("Business profile saved ✓");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!business) {
    return (
      <div className="py-6">
        <p className="font-bold">No business yet.</p>
        <Button className="mt-3" onClick={() => router.push("/onboarding")}>Set up business</Button>
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">Business profile 🏪</h1>
      <Card className="mt-3 flex flex-col gap-4">
        <Input label="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {msg && <p className="rounded-xl bg-[#DDF5EA] px-4 py-2 text-[14px] text-[#0F5132]">{msg}</p>}
        <Button disabled={loading} onClick={save}>{loading ? "Saving…" : "Save changes"}</Button>
      </Card>
    </div>
  );
}
