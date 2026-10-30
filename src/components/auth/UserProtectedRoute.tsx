import React from 'react';

interface UserProtectedRouteProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

/**
 * UserProtectedRoute now passes through all public visitors directly.
 * Public job-seeker login is removed—ManaCarrier is 100% open to all visitors.
 */
export const UserProtectedRoute: React.FC<UserProtectedRouteProps> = ({ children }) => {
  return <>{children}</>;
};
