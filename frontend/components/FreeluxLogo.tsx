interface FreeluxLogoProps {
  variant?: "full" | "icon";
  size?: number;
  className?: string;
}

export function FreeluxLogo({ variant = "full", size = 32, className = "" }: FreeluxLogoProps) {
  const icon = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polyline points="2,7  16,14.5 30,7"  stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="2,13 16,20.5 30,13" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="2,19 16,26.5 30,19" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  if (variant === "icon") return <span className={className}>{icon}</span>;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
      <span style={{ lineHeight: 1 }}>
        <span className="block text-white font-black uppercase tracking-[.16em]" style={{ fontSize: size * 0.4 }}>FREELUX</span>
        <span className="block font-semibold uppercase tracking-[.32em] text-[#e55c00]" style={{ fontSize: size * 0.25 }}>STEEL</span>
      </span>
    </span>
  );
}
