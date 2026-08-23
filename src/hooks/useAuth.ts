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
  needsPasswordChange: boolean;
  loginWithPassword: (phone: string, pass: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPass: string) => Promise<{ error: Error | null }>;
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
  needsPasswordChange: false,

  loginWithPassword: async (phone: string, pass: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') };
    }
    
    set({ loading: true, error: null });
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    let { data, error } = await supabase.auth.signInWithPassword({
      phone: formattedPhone,
      password: pass,
    });

    // If login fails, and they are using the default password, try signing them up automatically
    if (error && pass === '123456') {
      const signUpRes = await supabase.auth.signUp({
        phone: formattedPhone,
        password: pass,
      });
      data = signUpRes.data;
      error = signUpRes.error;
    }
    
    if (!error && data.session) {
      const isDefault = pass === '123456';
      set({ needsPasswordChange: isDefault });
      if (isDefault) {
        localStorage.setItem('needsPasswordChange', 'true');
      } else {
        localStorage.removeItem('needsPasswordChange');
      }
    }

    set({ loading: false, error: error?.message || null });
    return { error };
  },

  updatePassword: async (newPass: string) => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.updateUser({ password: newPass });
    
    if (!error) {
      set({ needsPasswordChange: false });
      localStorage.removeItem('needsPasswordChange');
    }
    
    set({ loading: false, error: error?.message || null });
    return { error };
  },

  signOut: async () => {
    if (!isSupabaseConfigured()) return;
    
    set({ loading: true });
    await supabase.auth.signOut();
    localStorage.removeItem('needsPasswordChange');
    set({ session: null, user: null, employee: null, loading: false, needsPasswordChange: false });
  },

  initializeAuth: () => {
    if (get().initialized || !isSupabaseConfigured()) {
      set({ initialized: true });
      return;
    }

    const needsPasswordChange = localStorage.getItem('needsPasswordChange') === 'true';
    set({ needsPasswordChange });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user || null });
      if (session?.user) {
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

    // Listen for auth state changes
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
