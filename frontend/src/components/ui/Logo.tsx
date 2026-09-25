import type { SVGProps } from 'react';

interface LogoProps {
  iconOnly?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function LogoIcon({ className = '', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      {...props}
    >
      <defs>
        {/* Primary Ribbon Gradient */}
        <linearGradient id="ss-ribbon-grad" x1="4" y1="8" x2="44" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Inner Card Shimmer */}
        <linearGradient id="ss-chip-grad" x1="16" y1="18" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Ambient Glow Filter */}
        <filter id="ss-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Background Rounded Shield / Vault Shape */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="#0D0F21"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="1.5"
      />

      {/* Stylized Modern "S" Currency Flow Ribbon */}
      <g filter="url(#ss-glow)">
        <path
          d="M33 14C33 11.2386 30.7614 9 28 9H17C13.6863 9 11 11.6863 11 15C11 18.3137 13.6863 21 17 21H31C34.3137 21 37 23.6863 37 27C37 30.3137 34.3137 33 31 33H19C16.2386 33 14 30.7614 14 28"
          stroke="url(#ss-ribbon-grad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Miniature Floating Smart Card Silhouette in center loop */}
        <rect
          x="19"
          y="18.5"
          width="13"
          height="9"
          rx="2"
          fill="#1E1B4B"
          stroke="#06B6D4"
          strokeWidth="1.2"
        />
        {/* Tiny Gold EMV Microchip dot */}
        <circle cx="22.5" cy="23" r="1.2" fill="url(#ss-chip-grad)" />

        {/* Ascending Metric Spark Lines (Top Right) */}
        <rect x="30" y="11" width="2" height="4" rx="1" fill="#06B6D4" />
        <rect x="33" y="9" width="2" height="6" rx="1" fill="#7C3AED" />
        <rect x="36" y="7" width="2" height="8" rx="1" fill="#EC4899" />
      </g>
    </svg>
  );
}

export function Logo({ iconOnly = false, size = 'md', className = '' }: LogoProps) {
  const iconSizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  const textSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <LogoIcon className={`${iconSizeClasses} flex-shrink-0 transition-transform duration-300 hover:scale-105`} />
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-extrabold tracking-tight ${textSizeClasses}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
            <span className="text-white">Spend</span>
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Sense
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.22em] text-slate-400 uppercase mt-0.5 font-inter">
            Enterprise
          </span>
        </div>
      )}
    </div>
  );
}
