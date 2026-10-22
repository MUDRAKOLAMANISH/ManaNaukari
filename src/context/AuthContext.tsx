import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminProfile, AuthContextType } from '../types/auth.types';
import { candidateProfileService } from '../services/candidateProfileService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check admin privileges in public.admin_users table
  const verifyAdmin = async (userEmail?: string | null) => {
    if (!userEmail) {
      setAdminProfile(null);
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle();

      if (!error && data) {
        setAdminProfile(data as AdminProfile);
        setIsAdmin(true);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }
    } catch {
      setAdminProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial Session Retrieval
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user?.email) {
            await verifyAdmin(initialSession.user.email);
          }
        }
      } catch (err) {
        console.error('Failed to get Supabase auth session:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      console.log(`[Mana Naukari Auth] Event: ${event} | User: ${currentSession?.user?.email || 'None'}`);

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user?.email) {
        await verifyAdmin(currentSession.user.email);
      } else {
        setAdminProfile(null);
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. Sign In
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user?.email) {
        await verifyAdmin(data.user.email);

        // Synchronize candidate profile upon successful login
        const fullName = data.user.user_metadata?.full_name || 
          data.user.user_metadata?.display_name || 
          data.user.email.split('@')[0];

        try {
          await candidateProfileService.saveOrUpdateProfile({
            name: fullName,
            email: data.user.email,
            mobile: data.user.user_metadata?.phone || '',
            email_verified: Boolean(data.user.email_confirmed_at),
          });
        } catch (syncErr) {
          console.warn('[AuthContext] Profile sync note on login:', syncErr);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 2. Sign Up
  const signUp = async (email: string, password: string, name?: string): Promise<{ error: Error | null; data?: any }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name || '',
            display_name: name || '',
          },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user?.email) {
        try {
          await candidateProfileService.saveOrUpdateProfile({
            name: name || email.split('@')[0],
            email: data.user.email,
            mobile: '',
            email_verified: Boolean(data.user.email_confirmed_at),
          });
        } catch (syncErr) {
          console.warn('[AuthContext] Profile sync note on signup:', syncErr);
        }
      }

      return { error: null, data };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 3. Reset Password Email Link
  const resetPassword = async (email: string, redirectTo: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 4. Update Password (for active session / recovery token)
  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // 5. Sign Out
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setAdminProfile(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      adminProfile,
      isAdmin,
      loading,
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
    }),
    [user, session, adminProfile, isAdmin, loading]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
