import React from "react";
import { cn } from "@/lib/utils";
import { LuNotebookTabs } from "react-icons/lu";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-[#29224e] text-white hover:bg-[#3b3267] active:scale-[0.99]",
    secondary: "bg-[#d9f5ed] text-[#272047] hover:bg-[#c3eee2]",
    outline: "border border-[#11b7ab] text-[#272047] bg-white hover:bg-[#d9f5ed]",
    ghost: "text-[#272047] hover:bg-[#d9f5ed]",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[16px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }) {
  const { label, hint, error, className, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[14px] font-medium text-[#17221D]">{label}</span>}
      <input
        className={cn(
          "min-h-[48px] w-full rounded-xl border bg-white px-4 py-3 text-[16px] text-[#17221D] placeholder:text-gray-400",
          error ? "border-red-500" : "border-gray-200 focus:border-[#11b7ab]",
          className
        )}
        {...rest}
      />
      {hint && !error && <span className="mt-1 block text-[13px] text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-[13px] text-red-600">{error}</span>}
    </label>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  const { label, error, className, children, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[14px] font-medium text-[#17221D]">{label}</span>}
      <select
        className={cn(
          "min-h-[48px] w-full rounded-xl border bg-white px-4 py-3 text-[16px]",
          error ? "border-red-500" : "border-gray-200 focus:border-[#11b7ab]",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-[13px] text-red-600">{error}</span>}
    </label>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label, className, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[14px] font-medium">{label}</span>}
      <textarea
        className={cn("min-h-[96px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px]", className)}
        {...rest}
      />
    </label>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)]", className)}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" }) {
  const map = {
    neutral: "bg-gray-100 text-gray-700",
    green: "bg-[#d9f5ed] text-[#272047]",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold", map[tone])}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#d9f5ed] text-[#0F5132]"><LuNotebookTabs size={24} /></div>
      <h3 className="text-[17px] font-bold text-[#272047]">{title}</h3>
      <p className="mt-1 max-w-[260px] text-[14px] text-gray-600">{body}</p>
      {action && <div className="mt-4 w-full max-w-[260px]">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}
