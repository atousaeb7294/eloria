type EloriaWovenThreadsProps = {
  placement?: "hero" | "showcase";
};

export function EloriaWovenThreads({ placement = "showcase" }: EloriaWovenThreadsProps) {
  return (
    <div
      aria-hidden="true"
      className={`eloria-woven-threads eloria-woven-threads-${placement} pointer-events-none absolute inset-0 overflow-hidden`}
    >
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" className="size-full" fill="none">
        <defs>
          <linearGradient id={`woven-gold-${placement}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8e6b2c" stopOpacity="0" />
            <stop offset=".38" stopColor="#e3c675" stopOpacity=".48" />
            <stop offset=".64" stopColor="#fff0ba" stopOpacity=".78" />
            <stop offset="1" stopColor="#a67b2e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`woven-emerald-${placement}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a8b68" stopOpacity="0" />
            <stop offset=".42" stopColor="#55a988" stopOpacity=".34" />
            <stop offset=".68" stopColor="#c4a95d" stopOpacity=".44" />
            <stop offset="1" stopColor="#0a4f39" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="eloria-thread-braid eloria-thread-braid-a" stroke={`url(#woven-gold-${placement})`} strokeLinecap="round">
          <path pathLength="1" d="M-40 172C210 160 235 424 482 417C722 410 720 195 968 203C1192 210 1230 472 1480 445" strokeWidth="2.1" />
          <path pathLength="1" d="M-35 193C198 204 251 383 480 396C714 409 747 231 969 224C1208 216 1234 427 1482 468" strokeWidth=".9" opacity=".65" />
        </g>

        <g className="eloria-thread-braid eloria-thread-braid-b" stroke={`url(#woven-emerald-${placement})`} strokeLinecap="round">
          <path pathLength="1" d="M-35 692C208 712 255 493 491 505C727 518 731 739 974 721C1206 704 1242 513 1480 536" strokeWidth="1.8" />
          <path pathLength="1" d="M-42 668C193 650 262 536 492 529C720 522 759 698 977 696C1210 693 1264 550 1484 560" strokeWidth=".85" opacity=".7" />
        </g>

        <g className="eloria-thread-knot" transform="translate(720 455)" stroke="#e2c474">
          <path pathLength="1" d="M-74 0C-54-53 0-53 0 0C0 53 54 53 74 0C54-53 0-53 0 0C0 53-54 53-74 0Z" strokeWidth="1.4" />
          <circle r="7" fill="#0b4b36" fillOpacity=".74" strokeWidth="1" />
          <circle r="2.2" fill="#f4d98c" stroke="none" />
        </g>
      </svg>
    </div>
  );
}
