"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";
import { formatNaira } from "@/lib/utils";

const SHOPS = ["Fashion", "Food vendors", "Retail shops", "Salons", "Catering", "Freelancers", "POS agents", "Boutiques"];

const TESTIMONIALS = [
  { name: "Adaeze", biz: "Fashion Hub, Lekki", text: "I record sales in seconds after closing shop. For the first time I actually know my profit." },
  { name: "Ibrahim", biz: "Food vendor, Abuja", text: "The scan feature turned my paper notebook into clean records. My bank statement finally makes sense." },
  { name: "Funmi", biz: "Salon, Ikeja", text: "I ask 'where did I spend most?' and Ledgerly just tells me. No accounting grammar." },
];

const FAQS = [
  { q: "Do I need accounting knowledge?", a: "No. Ledgerly uses plain words — Money in, Money out, Profit, Money you're owed. If you can use WhatsApp, you can use Ledgerly." },
  { q: "Does it work on my phone?", a: "Yes, it's mobile-first. Record transactions, scan receipts with your camera, and check reports — all from your phone." },
  { q: "What about my paper records?", a: "Snap a photo on the Scan page. Ledgerly reads it and fills the form for you. You always confirm before saving." },
  { q: "Is my data private?", a: "Yes. Every business only sees its own records, enforced at the database level with Row Level Security." },
];

function useCountUp(target: number, start: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 text-[#17221D] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#167C5A]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="13" height="3" rx="1.5" fill="white" />
              <rect x="3" y="9" width="9" height="3" rx="1.5" fill="white" opacity="0.9" />
              <rect x="3" y="14" width="11" height="3" rx="1.5" fill="white" opacity="0.9" />
              <circle cx="18.5" cy="16.5" r="3.5" fill="#0F5132" stroke="white" strokeWidth="1.2" />
            </svg>
          </span>
          <span className="text-xl font-extrabold">Ledger<span className="text-[#167C5A]">ly</span></span>
        </Link>
        <nav className="hidden items-center gap-6 text-[14px] font-semibold text-gray-600 md:flex">
          <a href="#demo" className="hover:text-[#0F5132]">Live demo</a>
          <a href="#features" className="hover:text-[#0F5132]">Features</a>
          <a href="#ai" className="hover:text-[#0F5132]">Ask AI</a>
          <a href="#stories" className="hover:text-[#0F5132]">Stories</a>
          <a href="#faq" className="hover:text-[#0F5132]">FAQ</a>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {loggedIn ? (
            <Link href="/dashboard" className="rounded-xl bg-[#167C5A] px-4 py-2.5 text-[14px] font-bold text-white hover:bg-[#0F5132]">
              Open dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-600 hover:text-[#0F5132]">
                Log in
              </Link>
              <Link href="/signup" className="rounded-xl bg-[#167C5A] px-4 py-2.5 text-[14px] font-bold text-white hover:bg-[#0F5132]">
                Get started free
              </Link>
            </>
          )}
        </div>
        <button className="rounded-lg px-3 py-2 font-bold md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          ☰
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-[15px] font-semibold">
            {[["Live demo", "#demo"], ["Features", "#features"], ["Ask AI", "#ai"], ["Stories", "#stories"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-[#DDF5EA]">{l}</a>
            ))}
            {loggedIn ? (
              <Link href="/dashboard" className="mt-1 rounded-xl bg-[#167C5A] px-4 py-3 text-center font-bold text-white">Open dashboard →</Link>
            ) : (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Link href="/login" className="rounded-xl border border-gray-200 px-4 py-3 text-center font-bold">Log in</Link>
                <Link href="/signup" className="rounded-xl bg-[#167C5A] px-4 py-3 text-center font-bold text-white">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  // Interactive playground: today's sales vs spending
  const [sales, setSales] = useState(45000);
  const [spend, setSpend] = useState(15000);
  const profit = sales - spend;

  return (
    <section className="relative overflow-hidden bg-white text-[#17221D]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#DDF5EA] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-[#DDF5EA]/70 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-14 pt-12 md:grid-cols-2 md:pt-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#DDF5EA] px-3 py-1.5 text-[12px] font-bold tracking-wide text-[#0F5132]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#167C5A]" /> BUILT FOR NIGERIAN SMALL BUSINESSES
          </span>
          <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] text-[#0F5132] md:text-[52px]">
            Your business money, finally <span className="text-[#167C5A]">clear.</span>
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-600 md:text-[17px]">
            Record sales in seconds, scan paper records, and ask “how much did I make?” — no accounting headache.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href={loggedIn ? "/dashboard" : "/signup"} className="rounded-2xl bg-[#167C5A] px-6 py-3.5 text-center text-[16px] font-extrabold text-white shadow-lg transition hover:scale-[1.02] hover:bg-[#0F5132]">
              {loggedIn ? "Continue to dashboard →" : "Create free account →"}
            </Link>
            <a href="#demo" className="rounded-2xl border border-[#167C5A]/30 bg-white px-6 py-3.5 text-center text-[16px] font-bold text-[#0F5132] transition hover:bg-[#DDF5EA]">
              ▶ Try the live demo
            </a>
          </div>
          <div className="mt-5 flex items-center gap-3 text-[13px] text-gray-500">
            <div className="flex -space-x-2">
              {["AO", "IM", "FK"].map((i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#DDF5EA] text-[11px] font-extrabold text-[#0F5132]">{i}</span>
              ))}
            </div>
            Loved by shops, vendors & freelancers
          </div>
        </div>

        {/* Interactive playground card */}
        <div className="animate-pop-in rounded-3xl border border-gray-100 bg-white p-5 text-[#17221D] shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold uppercase tracking-wide text-gray-400">Today&apos;s playground ✦ drag me</p>
            <span className="rounded-full bg-[#DDF5EA] px-2.5 py-1 text-[12px] font-bold text-[#0F5132]">LIVE</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[14px] font-bold"><span>💰 Sales</span><span className="text-[#167C5A]">{formatNaira(sales)}</span></div>
            <input type="range" min={5000} max={200000} step={1000} value={sales} onChange={(e) => setSales(Number(e.target.value))} className="mt-1 w-full accent-[#167C5A]" />
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[14px] font-bold"><span>🧾 Spending</span><span className="text-red-600">{formatNaira(spend)}</span></div>
            <input type="range" min={0} max={150000} step={1000} value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="mt-1 w-full accent-red-500" />
          </div>
          <div className={`mt-4 rounded-2xl p-4 text-white transition ${profit >= 0 ? "bg-[#0F5132]" : "bg-red-600"}`}>
            <p className="text-[13px] opacity-80">Your profit right now</p>
            <p className="text-[30px] font-extrabold">{formatNaira(profit)}</p>
            <p className="text-[13px] opacity-85">{profit >= 0 ? "🎉 You made money today. Ledgerly shows this instantly." : "⚠️ Spending passed sales — time to cut back."}</p>
          </div>
          <Link href="/signup" className="mt-3 block rounded-2xl bg-[#167C5A] py-3 text-center font-bold text-white hover:bg-[#0F5132]">
            Get this for my business →
          </Link>
        </div>
      </div>
      {/* marquee */}
      <div className="relative border-t border-gray-100 bg-[#DDF5EA]/50 py-3">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 gap-8 pr-8 text-[14px] font-bold text-[#0F5132]/80">
            {[...SHOPS, ...SHOPS].map((s, i) => (
              <span key={i} className="whitespace-nowrap">✦ {s}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setStart(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const a = useCountUp(30, start);
  const b = useCountUp(500, start);
  const c = useCountUp(100, start);
  const items = [
    [`${a}s`, "to record a sale"],
    [`₦${b}k+`, "tracked by demo shops"],
    [`${c}%`, "no accounting jargon"],
  ];
  return (
    <section ref={ref} className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 px-4 py-8">
      {items.map(([v, l]) => (
        <div key={l} className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-[22px] font-extrabold text-[#0F5132] md:text-[30px]">{v}</p>
          <p className="text-[12px] text-gray-500 md:text-[14px]">{l}</p>
        </div>
      ))}
    </section>
  );
}

function FeatureTabs() {
  const [tab, setTab] = useState<"record" | "scan" | "ask">("record");
  const content = {
    record: { icon: "⚡", title: "Record in seconds", body: "Two big buttons: Money in, Money out. Friendly questions, not ledger codes. Works great one-handed at the shop.", points: ["What did you sell? → done", "Paid / Pending / Credit tracking", "Money you're owed at a glance"] },
    scan: { icon: "📷", title: "Scan paper records", body: "Snap receipts or notebook pages. Ledgerly reads them into editable transactions — you always confirm first.", points: ["Camera + gallery upload", "Editable confirmation form", "Scan history with status"] },
    ask: { icon: "✨", title: "Ask about your business", body: "Chat with your own data. Real figures calculated from your records, explained in plain language.", points: ["How much did I make?", "Where did I spend most?", "Compare this vs last month"] },
  }[tab];
  return (
    <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10">
      <h2 className="text-center text-[26px] font-extrabold text-[#0F5132] md:text-[34px]">Everything, minus the headache</h2>
      <div className="mx-auto mt-5 flex max-w-md gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
        {(["record", "scan", "ask"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-xl px-3 py-2.5 text-[14px] font-bold transition ${tab === t ? "bg-[#167C5A] text-white shadow" : "text-gray-500 hover:text-[#0F5132]"}`}>
            {t === "record" ? "⚡ Record" : t === "scan" ? "📷 Scan" : "✨ Ask AI"}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-pop-in mx-auto mt-4 max-w-2xl rounded-3xl bg-white p-6 shadow-sm md:p-8">
        <p className="text-4xl">{content.icon}</p>
        <h3 className="mt-2 text-[22px] font-extrabold">{content.title}</h3>
        <p className="mt-1 text-[15px] text-gray-600">{content.body}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {content.points.map((p) => (
            <li key={p} className="flex items-center gap-2 rounded-xl bg-[#F8FAF9] px-3 py-2.5 text-[14px] font-medium">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DDF5EA] text-[13px] font-bold text-[#0F5132]">✓</span>{p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    ["1", "Create account", "30 seconds. Just name, email, password."],
    ["2", "Add your business", "Shop name, type, phone — that's it."],
    ["3", "Record first sale", "Money in → what did you sell? → saved 🎉"],
  ];
  return (
    <section className="bg-white py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <h2 className="text-center text-[24px] font-extrabold text-[#0F5132] md:text-[30px]">From download to dashboard in 2 minutes</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {steps.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl bg-[#F8FAF9] p-5 transition hover:-translate-y-1 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#167C5A] text-lg font-extrabold text-white">{n}</span>
              <p className="mt-3 font-extrabold">{t}</p>
              <p className="text-[14px] text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AI_QA: Record<string, string> = {
  "How much did I make this month?": "You made ₦165,000 this month from 3 sales. Your profit is ₦50,000 after ₦115,000 spending.",
  "Where did I spend the most money?": "You spent the most on inventory — ₦80,000 this month. Next is salaries at ₦50,000.",
  "How much am I owed?": "You're owed ₦100,000 — ₦25,000 pending from Chidi and ₦75,000 credit from Funmi.",
};

function AiDemo() {
  const [active, setActive] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState("");
  const ask = (q: string) => {
    setActive(q);
    setTyping(true);
    setShown("");
    const full = AI_QA[q];
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setShown(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timer);
        setTyping(false);
      }
    }, 30);
  };
  return (
    <section id="ai" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-10">
      <div className="grid gap-6 overflow-hidden rounded-3xl border border-[#167C5A]/15 bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
        <div>
          <span className="rounded-full bg-[#DDF5EA] px-3 py-1 text-[12px] font-bold text-[#0F5132]">✨ ASK LEDGERLY — LIVE PREVIEW</span>
          <h2 className="mt-3 text-[26px] font-extrabold leading-tight text-[#0F5132] md:text-[32px]">Ask in plain English. Get real numbers.</h2>
          <p className="mt-2 text-[14px] text-gray-600">Tap a question to see how Ledgerly answers from actual records — never made-up figures.</p>
          <div className="mt-4 flex flex-col gap-2">
            {Object.keys(AI_QA).map((q) => (
              <button key={q} onClick={() => ask(q)} className={`rounded-2xl border px-4 py-3 text-left text-[14px] font-semibold transition ${active === q ? "border-[#167C5A] bg-[#DDF5EA] text-[#0F5132]" : "border-gray-100 bg-[#F8FAF9] hover:border-[#167C5A]/40"}`}>
                “{q}”
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-[220px] flex-col rounded-2xl bg-white p-4 text-[#17221D]">
          {!active && <p className="m-auto text-center text-[14px] text-gray-400">👆 Tap a question to see the magic</p>}
          {active && (
            <>
              <p className="self-end rounded-2xl bg-[#167C5A] px-4 py-2.5 text-[14px] font-medium text-white">{active}</p>
              <p className="mt-2 self-start rounded-2xl bg-[#F8FAF9] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm">
                {shown}
                {typing && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[#167C5A]" />}
              </p>
            </>
          )}
          <Link href="/signup" className="mt-auto pt-4 text-center text-[14px] font-bold text-[#167C5A]">Try with my own data →</Link>
        </div>
      </div>
    </section>
  );
}

function DemoStrip() {
  const txns = useMemo(
    () => [
      { icon: "💰", d: "Ankara sales", t: "Today", a: "₦45,000", in: true },
      { icon: "🧾", d: "Transportation", t: "Today", a: "₦15,000", in: false },
      { icon: "💰", d: "Catering order", t: "Yesterday", a: "₦120,000", in: true },
      { icon: "🧾", d: "Staff salary", t: "Yesterday", a: "₦50,000", in: false },
    ],
    []
  );
  return (
    <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="animate-float rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
          <p className="text-[13px] font-bold text-gray-400">GOOD MORNING, ADA ☀️</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#DDF5EA] p-3"><p className="text-[11px] font-bold text-[#0F5132]">Money In</p><p className="font-extrabold text-[#0F5132]">₦165k</p></div>
            <div className="rounded-2xl bg-gray-50 p-3"><p className="text-[11px] font-bold text-gray-500">Money Out</p><p className="font-extrabold">₦115k</p></div>
            <div className="rounded-2xl bg-[#0F5132] p-3 text-white"><p className="text-[11px] font-bold opacity-80">Profit</p><p className="font-extrabold">₦50k</p></div>
          </div>
          <div className="mt-3 flex h-24 items-end gap-1.5">
            {[40, 70, 45, 90, 60, 100, 75].map((h, i) => (
              <div key={i} className="flex flex-1 items-end justify-center gap-0.5">
                <div className="w-2.5 rounded-t bg-[#167C5A]" style={{ height: `${h}%` }} />
                <div className="w-2.5 rounded-t bg-red-200" style={{ height: `${Math.max(10, h - 30)}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="animate-float-delay rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
          <p className="font-extrabold">Recent transactions</p>
          <div className="mt-2 flex flex-col gap-2">
            {txns.map((t) => (
              <div key={t.d} className="flex items-center gap-3 rounded-2xl bg-[#F8FAF9] p-3 transition hover:scale-[1.01]">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">{t.icon}</span>
                <span className="flex-1"><span className="block text-[14px] font-bold">{t.d}</span><span className="text-[12px] text-gray-500">{t.t}</span></span>
                <span className={`font-extrabold ${t.in ? "text-[#167C5A]" : ""}`}>{t.in ? "+" : "−"}{t.a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);
  const s = TESTIMONIALS[i];
  return (
    <section id="stories" className="bg-white py-12">
      <div className="mx-auto w-full max-w-3xl px-4 text-center">
        <h2 className="text-[24px] font-extrabold text-[#0F5132] md:text-[30px]">Shop owners are keeping better records</h2>
        <div key={i} className="animate-pop-in mt-6 rounded-3xl bg-[#F8FAF9] p-6 md:p-8">
          <p className="text-[17px] leading-relaxed">“{s.text}”</p>
          <p className="mt-3 font-extrabold text-[#0F5132]">{s.name} <span className="font-normal text-gray-500">· {s.biz}</span></p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {TESTIMONIALS.map((_, d) => (
            <button key={d} onClick={() => setI(d)} aria-label={`Story ${d + 1}`} className={`h-2.5 rounded-full transition ${d === i ? "w-8 bg-[#167C5A]" : "w-2.5 bg-gray-200"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-10">
      <h2 className="text-center text-[24px] font-extrabold text-[#0F5132]">Questions? Answered.</h2>
      <div className="mt-4 flex flex-col gap-2">
        {FAQS.map((f, idx) => (
          <div key={f.q} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button onClick={() => setOpen(open === idx ? null : idx)} className="flex w-full items-center justify-between px-4 py-4 text-left font-bold">
              {f.q}<span className={`transition ${open === idx ? "rotate-45" : ""}`}>＋</span>
            </button>
            {open === idx && <p className="animate-fade-up px-4 pb-4 text-[14px] text-gray-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useStore();
  return (
    <div className="min-h-screen bg-white">
      <LandingNav loggedIn={!!user} />
      <Hero loggedIn={!!user} />
      <Stats />
      <DemoStrip />
      <FeatureTabs />
      <Steps />
      <AiDemo />
      <Stories />
      <Faq />
      <section className="px-4 pb-10">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#167C5A] p-8 text-center text-white md:p-12">
          <div className="animate-blob pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-[26px] font-extrabold md:text-[36px]">Start tonight. Know your profit tomorrow.</h2>
          <p className="mx-auto mt-2 max-w-md text-white/85">Join small businesses swapping paper notebooks for Ledgerly.</p>
          <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row">
            <Link href={user ? "/dashboard" : "/signup"} className="flex-1 rounded-2xl bg-white px-6 py-3.5 text-center font-extrabold text-[#0F5132]">
              {user ? "Open dashboard →" : "Get started free →"}
            </Link>
            {!user && (
              <Link href="/login" className="flex-1 rounded-2xl border border-white/40 px-6 py-3.5 text-center font-bold">
                Log in
              </Link>
            )}
          </div>
        </div>
      </section>
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 md:flex-row">
          <Logo />
          <p className="text-[13px] text-gray-500">Simple records. Smarter business. · Made for Nigerian SMEs 🇳🇬</p>
          <div className="flex gap-4 text-[14px] font-semibold text-gray-600">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
