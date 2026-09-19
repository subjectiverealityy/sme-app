export function Logo({ size = 40, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-2xl bg-[#167C5A]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="13" height="3" rx="1.5" fill="#DDF5EA" />
          <rect x="3" y="9" width="9" height="3" rx="1.5" fill="#DDF5EA" opacity="0.9" />
          <rect x="3" y="14" width="11" height="3" rx="1.5" fill="#DDF5EA" opacity="0.9" />
          <rect x="3" y="19" width="7" height="2.4" rx="1.2" fill="#DDF5EA" opacity="0.85" />
          <circle cx="18.5" cy="16.5" r="3.5" fill="#0F5132" stroke="#DDF5EA" strokeWidth="1.2" />
        </svg>
      </div>
      {showWordmark && (
        <span className="text-[24px] font-extrabold tracking-tight text-[#17221D]">
          Ledger<span className="text-[#167C5A]">ly</span>
        </span>
      )}
    </div>
  );
}
