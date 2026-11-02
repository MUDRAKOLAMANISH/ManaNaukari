import React, { useState } from 'react';
import { getCompanyBrandInfo } from '../../utils/companyLogos';

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  companyName,
  logoUrl,
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);
  const brand = getCompanyBrandInfo(companyName, logoUrl);

  const sizeClasses = {
    xs: 'w-5 h-5 rounded-md text-[9px]',
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-14 h-14 rounded-2xl text-base',
    xl: 'w-18 h-18 rounded-3xl text-lg',
  };

  const activeSrc = !hasError && (logoUrl || brand.svgIcon);

  if (activeSrc) {
    return (
      <div
        className={`${sizeClasses[size]} border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs transition-all duration-300 group-hover:scale-105 group-hover:border-blue-300 ${className}`}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <img
          src={activeSrc}
          alt={`${companyName} logo`}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} border border-slate-200/80 flex items-center justify-center shrink-0 font-display font-extrabold shadow-2xs select-none transition-all duration-300 group-hover:scale-105 ${className}`}
      style={{
        backgroundColor: brand.bgColor,
        color: brand.primaryColor,
      }}
    >
      <span>{brand.shortName}</span>
    </div>
  );
};
