"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { BUSINESS_CATEGORIES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setBusiness } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(BUSINESS_CATEGORIES[0]);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function finish() {
    setErr("");
    if (!name.trim()) return setErr("Please enter your business name.");
    if (!phone.trim()) return setErr("Please enter a phone number so customers can reach you.");
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowser()!;
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const owner = auth.user?.id;
        if (!owner) {
          throw new Error("You're not logged in yet. Please log in (or confirm your email), then try again.");
        }
        const { data, error } = await supabase
          .from("businesses")
          .insert({
            owner_id: owner,
            name: name.trim(),
            category,
            phone: phone.trim(),
            location: location.trim(),
            description: desc.trim() || null,
          })
          .select()
          .single();
        if (error) throw error;
        setBusiness(data);
      } else {
        const biz = {
          id: uid("biz"),
          owner_id: user?.id ?? "demo-user",
          name: name.trim(),
          category,
          phone: phone.trim(),
          location: location.trim(),
          description: desc.trim(),
          created_at: new Date().toISOString(),
        };
        setBusiness(biz);
      }
      router.replace("/first-transaction");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Could not save business. Try again.";
      console.error("Business save failed:", e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-6 animate-fade-up">
      <Logo />
      <div className="mt-6 flex gap-2">
        {[0, 1].map((i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-[#167C5A]" : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="mt-2 text-[13px] font-semibold text-gray-500">Step {step + 1} of 2</p>

      {step === 0 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-extrabold text-[#0F5132]">Tell us about your business 🏪</h1>
          <div className="mt-4 flex flex-col gap-4">
            <Input label="Business name" placeholder="e.g. Ada's Fashion Hub" value={name} onChange={(e) => setName(e.target.value)} />
            <Select label="What type of business?" value={category} onChange={(e) => setCategory(e.target.value)}>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Button onClick={() => (name.trim() ? setStep(1) : setErr("Please enter your business name."))}>Continue</Button>
            {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-3">
          <h1 className="text-[24px] font-extrabold text-[#0F5132]">How can customers find you?</h1>
          <div className="mt-4 flex flex-col gap-4">
            <Input label="Phone number" placeholder="0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Business location" placeholder="e.g. Lekki, Lagos" value={location} onChange={(e) => setLocation(e.target.value)} />
            <Textarea label="Short description (optional)" placeholder="What do you sell?" value={desc} onChange={(e) => setDesc(e.target.value)} />
            {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
            <Button disabled={loading} onClick={finish}>{loading ? "Saving…" : "Finish setup 🎉"}</Button>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
          </div>
        </div>
      )}
    </div>
  );
}
