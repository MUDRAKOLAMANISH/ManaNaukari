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
      {/* Sleek Modern Job & Upward Career Arrow Emblem Badge */}
      <div
        className={`${iconSizes[size]} relative rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-xs overflow-hidden border ${
          variant === 'dark'
            ? 'bg-slate-900 border-slate-700/80 shadow-slate-950/40'
            : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500/30 shadow-blue-500/20'
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background glow circle */}
          <circle cx="50" cy="50" r="44" fill="white" fillOpacity="0.12" />

          {/* Upward Growth Arrow (Indigo/White) */}
          <path
            d="M 22 68 L 42 46 L 56 58 L 78 30"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 62 28 L 80 28 L 80 46"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Modern Executive Briefcase Icon at bottom left */}
          <rect
            x="20"
            y="56"
            width="26"
            height="18"
            rx="4"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <path
            d="M 27 56 L 27 51 C 27 49 39 49 39 51 L 39 56"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="33" cy="65" r="2" fill="#0f172a" />
        </svg>
      </div>

      {/* Brand Text & Tagline */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className="flex items-center leading-none">
            <span
              className={`font-display font-black tracking-tight ${textSizes[size]} ${
                variant === 'dark' ? 'text-white' : 'text-blue-950'
              }`}
            >
              Mana
            </span>
            <span
              className={`font-display font-black tracking-tight ${textSizes[size]} text-blue-600 ml-1`}
            >
              Career
            </span>
          </div>
          {showTagline && (
            <span
              className={`font-bold tracking-tight ${taglineSizes[size]} ${
                variant === 'dark' ? 'text-slate-400' : 'text-slate-500'
              } mt-0.5`}
            >
              Your Career. Your Future.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
