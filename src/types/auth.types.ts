import { User, Session } from '@supabase/supabase-js';
import { AdminRole } from './database.types';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  adminProfile: AdminProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null; data?: any }>;
  resetPassword: (email: string, redirectTo: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
