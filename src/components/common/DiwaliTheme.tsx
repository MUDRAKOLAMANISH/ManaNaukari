import React, { useEffect } from 'react';

interface DiwaliThemeProps {
  currentPath?: string;
}

/**
 * DiwaliTheme Component (Cleaned & Deactivated)
 * Returns null unconditionally to enforce a professional year-round design system.
 * Cleans up any legacy festival theme session keys from storage.
 */
export const DiwaliTheme: React.FC<DiwaliThemeProps> = () => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('diwali_banner_dismissed');
        localStorage.removeItem('diwali_theme_active');
      }
    } catch {
      // Ignore storage cleanup warnings
    }
  }, []);

  return null;
};
