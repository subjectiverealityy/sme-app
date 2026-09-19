"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Never run the SW in `next dev` — it would serve stale assets on every edit.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (isStandalone()) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* no-op — the app works fine without offline support */
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  async function install() {
    const target = deferred;
    if (!target) return;
    setDismissed(true);
    try {
      await target.prompt();
      await target.userChoice;
    } catch {
      /* prompt already shown / not supported */
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Install Credyt"
      className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 md:inset-x-auto md:bottom-6 md:right-6 md:w-[340px]"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-white p-3.5 shadow-xl shadow-black/5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg">
          📒
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-ink">Install Credyt</span>
          <span className="block text-[12px] text-gray-500">Use it offline, from your home screen.</span>
        </span>
        <button
          onClick={install}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-bold text-white transition hover:bg-primary-dark"
        >
          <Download size={15} /> Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}