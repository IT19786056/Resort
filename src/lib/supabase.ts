import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project-id')
);

if (!isConfigured) {
  console.warn('⚠️ Supabase credentials missing or using placeholders.');
  console.warn('To enable authentication and real database storage, please set these secrets:');
  console.warn('1. VITE_SUPABASE_URL (Your Supabase Project URL)');
  console.warn('2. VITE_SUPABASE_ANON_KEY (Your Supabase Anon/Public Key)');
  console.warn('3. DATABASE_URL (Your Supabase PostgreSQL Connection String)');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getSession: async () => ({ data: { session: null } }),
            getUser: async () => ({ data: { user: null } }),
            signInWithPassword: async () => ({ error: new Error('Supabase not configured') }),
            signUp: async () => ({ error: new Error('Supabase not configured') }),
            signOut: async () => ({ error: new Error('Supabase not configured') }),
          };
        }
        return () => {
          console.error(`Supabase attempted to access "${String(prop)}" but it is not configured.`);
          return {
            select: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }),
            insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ data: null, error: null }) }),
            delete: () => ({ eq: () => ({ data: null, error: null }) }),
          };
        };
      }
    });
