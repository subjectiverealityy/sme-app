"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export default function BusinessPage() {
  const { business, setBusiness } = useStore();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Other",
    phone: "",
    location: "",
    description: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync form once business loads
  useEffect(() => {
    if (business && !editing) {
      setForm({
        name: business.name ?? "",
        category: business.category ?? "Other",
        phone: business.phone ?? "",
        location: business.location ?? "",
        description: business.description ?? "",
      });
    }
  }, [business, editing]);

  async function save() {
    if (!form.name.trim()) {
      setMsg("Business name can't be empty.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      if (isSupabaseConfigured() && business?.id && business.id !== "biz_demo") {
        const supabase = getSupabaseBrowser()!;
        const { error } = await supabase
          .from("businesses")
          .update({
            name: form.name.trim(),
            category: form.category,
            phone: form.phone.trim(),
            location: form.location.trim(),
            description: form.description.trim() || null,
          })
          .eq("id", business.id);
        if (error) throw error;
      }
      setBusiness({ ...business, ...form } as typeof business & {});
      setMsg("Business profile saved ✓");
      setEditing(false);
    } catch (e: unknown) {
      const m =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Save failed.";
      setMsg(m);
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    if (!business) return;
    setForm({
      name: business.name ?? "",
      category: business.category ?? "Other",
      phone: business.phone ?? "",
      location: business.location ?? "",
      description: business.description ?? "",
    });
    setMsg("");
    setEditing(false);
  }

  if (!business) {
    return (
      <div className="py-6">
        <p className="font-bold">No business yet.</p>
        <Button className="mt-3" onClick={() => router.push("/onboarding")}>Set up business</Button>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Business name", business.name],
    ["Category", business.category],
    ["Phone", business.phone || "—"],
    ["Location", business.location || "—"],
    ["Description", business.description || "—"],
  ];

  return (
    <div className="py-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0F5132]">Business profile 🏪</h1>
        {!editing ? (
          <button
            onClick={() => { setMsg(""); setEditing(true); }}
            aria-label="Edit business profile"
            className="flex items-center gap-1.5 rounded-full bg-[#DDF5EA] px-4 py-2.5 text-[14px] font-bold text-[#0F5132] transition hover:bg-[#c8ecdc]"
          >
            <Pencil size={16} /> Edit
          </button>
        ) : (
          <button
            onClick={cancel}
            aria-label="Cancel editing"
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-bold text-gray-600"
          >
            <X size={16} /> Cancel
          </button>
        )}
      </div>

      {!editing ? (
        <Card className="mt-3">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#167C5A] text-xl font-extrabold text-white">
              {(business.name || "B").charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-[18px] font-extrabold">{business.name}</p>
              <p className="text-[13px] text-gray-500">{business.category}</p>
            </div>
          </div>
          <dl className="mt-2">
            {rows.slice(2).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-gray-50 py-3 text-[14px] last:border-0">
                <dt className="text-gray-500">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          {msg && <p className="mt-2 rounded-xl bg-[#DDF5EA] px-4 py-2 text-[14px] text-[#0F5132]">{msg}</p>}
        </Card>
      ) : (
        <Card className="mt-3 flex flex-col gap-4">
          <Input label="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {msg && <p className="rounded-xl bg-red-50 px-4 py-2 text-[14px] text-red-700">{msg}</p>}
          <Button disabled={loading} onClick={save}>
            <span className="flex items-center gap-2"><Save size={17} /> {loading ? "Saving…" : "Save changes"}</span>
          </Button>
        </Card>
      )}
    </div>
  );
}
