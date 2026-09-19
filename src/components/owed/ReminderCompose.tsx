"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge, Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MessageInputs, ReminderLanguage } from "@/lib/collections";
import { buildReminderMessage, clampStage } from "@/lib/collections";

export function LanguageToggle({
  language,
  onChange,
  className,
}: {
  language: ReminderLanguage;
  onChange: (l: ReminderLanguage) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-fit gap-1 rounded-full bg-gray-100 p-1 text-[13px] font-bold", className)}>
      {(["english", "pidgin"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn("rounded-full px-3 py-1", language === l ? "bg-white shadow" : "text-gray-500")}
        >
          {l === "english" ? "English" : "Pidgin"}
        </button>
      ))}
    </div>
  );
}

export function StagePill({ stage }: { stage: number }) {
  const s = clampStage(stage);
  const labels = ["Friendly", "Firm", "Final"] as const;
  const tones = ["green", "amber", "red"] as const;
  return <Badge tone={tones[s - 1]}>Stage {s} · {labels[s - 1]}</Badge>;
}

export function ComposeMessage({
  inputs,
  value,
  onValueChange,
  language,
  onLanguageChange,
  showReset = true,
}: {
  inputs: MessageInputs;
  value: string;
  onValueChange: (v: string) => void;
  language: ReminderLanguage;
  onLanguageChange: (l: ReminderLanguage) => void;
  showReset?: boolean;
}) {
  const [forceReset, setForceReset] = useState(0);
  const defaultText = buildReminderMessage(inputs);
  const current = value || defaultText;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <StagePill stage={inputs.stage} />
        <LanguageToggle language={language} onChange={onLanguageChange} />
      </div>
      <Textarea
        value={current}
        onChange={(e) => onValueChange(e.target.value)}
        rows={5}
        className="text-[15px]"
      />
      {showReset && (
        <button
          type="button"
          onClick={() => {
            onValueChange(defaultText);
            setForceReset((x) => x + 1);
          }}
          className="flex items-center gap-1 self-end text-[13px] font-bold text-[#167C5A]"
        >
          <RotateCcw size={14} /> Reset to template
        </button>
      )}
      <span className="sr-only" data-force={forceReset}>.</span>
    </div>
  );
}

export function Sheet({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-xl md:max-w-sm md:rounded-2xl md:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 md:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-[#0F5132]">{title}</h3>
          <button onClick={onClose} className="rounded-full px-2 py-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="mt-3">{children}</div>
        {footer && <div className="mt-4 flex flex-col gap-2">{footer}</div>}
      </div>
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

export function ConfirmButtons({ onCancel, onConfirm, confirmLabel = "Confirm", danger = false }: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  );
}