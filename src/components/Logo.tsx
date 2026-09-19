export function Logo({ size = 40, showWordmark = true, inverse = false }: { size?: number; showWordmark?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-[24%] bg-[#29224e] shadow-[0_4px_0_#160f4b]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path d="M18.3 7.1A7.2 7.2 0 1 0 17.7 17" stroke="#70D7C0" strokeWidth="2.7" strokeLinecap="round" />
          <path d="M8.1 9.4c2.4-.1 5.5.7 6.7 2.7 1.1 1.8.3 3.9-1.9 4.8" stroke="#70D7C0" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="18.5" cy="6.4" r="1.55" fill="#70D7C0" />
        </svg>
      </div>
      {showWordmark && (
        <span className={`text-[24px] font-extrabold tracking-tight ${inverse ? "text-white" : "text-[#18122f]"}`}>
          Cred<span className="text-[#11b7ab]">yt</span>
        </span>
      )}
    </div>
  );
}
