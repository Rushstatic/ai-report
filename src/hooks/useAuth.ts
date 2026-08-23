import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Employee = Database['public']['Tables']['employees']['Row'];

interface AuthState {
  session: Session | null;
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  signInWithOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  employee: null,
  loading: false,
  initialized: false,
  error: null,

  signInWithOtp: async (phone: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') };
    }
    
    set({ loading: true, error: null });
    // Default to +91 (India) if no country code is provided, customize as needed
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    set({ loading: false, error: error?.message || null });
    return { error };
  },

  verifyOtp: async (phone: string, token: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') };
    }

    set({ loading: true, error: null });
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });
    
    set({ loading: false, error: error?.message || null });
    return { error };
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, employee: null, loading: false });
  },

  initializeAuth: () => {
    if (get().initialized || !isSupabaseConfigured()) {
      set({ initialized: true });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user || null });
      if (session?.user) {
        // Fetch the corresponding employee profile from the database
        supabase
          .from('employees')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => set({ employee: data }))
          .finally(() => set({ initialized: true }));
      } else {
        set({ initialized: true });
      }
    });

    // Listen for auth state changes (e.g. login, logout)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user || null });
      if (session?.user) {
        supabase
          .from('employees')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => set({ employee: data }));
      } else {
        set({ employee: null });
      }
    });
  }
}));

// Auto-initialize the auth listener when the hook is first imported
useAuth.getState().initializeAuth();
