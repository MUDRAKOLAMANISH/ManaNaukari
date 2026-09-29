import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AdminProfile, AuthContextType } from '../types/auth.types';

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
        // Fallback for primary setup or demo admin credentials
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;
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
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

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
