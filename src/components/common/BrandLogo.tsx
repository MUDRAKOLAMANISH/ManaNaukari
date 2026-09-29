import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  iconOnly?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
  showTagline = false,
  iconOnly = false,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const taglineSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Stylized MN Monogram Emblem Badge */}
      <div
        className={`${iconSizes[size]} relative rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden border ${
          variant === 'dark'
            ? 'bg-slate-900 border-slate-700/80 shadow-slate-950/40'
            : 'bg-white border-blue-100 shadow-blue-500/10'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-0.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular badge border */}
          <circle cx="50" cy="50" r="47" stroke="#0284c7" strokeWidth="4" fill="none" />

          {/* Letter M in Blue */}
          <path
            d="M 22 74 L 22 36 L 36 56 L 46 36 L 46 74"
            stroke="#0284c7"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Letter N in Orange with Arrow */}
          <path
            d="M 52 74 L 52 38 L 74 68 L 74 24"
            stroke="#f97316"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrow Head on top of N */}
          <path
            d="M 66 28 L 74 18 L 82 28 Z"
            fill="#f97316"
          />

          {/* Graduation Cap on top of M */}
          <path
            d="M 24 24 L 34 18 L 44 24 L 34 30 Z"
            fill="#0369a1"
          />
          {/* Cap Tassel */}
          <path
            d="M 24 24 L 21 29"
            stroke="#eab308"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Center Briefcase */}
          <rect
            x="40"
            y="54"
            width="20"
            height="15"
            rx="3"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <path
            d="M 46 54 L 46 50 C 46 48 54 48 54 50 L 54 54"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Briefcase Clasp */}
          <circle cx="50" cy="61" r="1.5" fill="#f8fafc" />

          {/* Bottom Tricolor Wave (Saffron, White, Green) */}
          <path
            d="M 18 84 Q 50 78 82 84"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 18 88 Q 50 82 82 88"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Brand Text & Tagline */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className="flex items-center leading-none">
            <span
              className={`font-display font-black tracking-tight ${textSizes[size]} ${
                variant === 'dark' ? 'text-white' : 'text-blue-900'
              }`}
            >
              Mana
            </span>
            <span
              className={`font-display font-black tracking-tight ${textSizes[size]} text-orange-500 ml-1`}
            >
              Naukari
            </span>
          </div>
          {showTagline && (
            <span
              className={`font-semibold tracking-tight ${taglineSizes[size]} ${
                variant === 'dark' ? 'text-slate-400' : 'text-slate-500'
              } mt-0.5`}
            >
              Your Career Starts Here
            </span>
          )}
        </div>
      )}
    </div>
  );
};
