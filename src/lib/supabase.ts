import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined);

const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('your-project-id')
);

const baseSupabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
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
          return {
            select: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }),
            insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ data: null, error: null }) }),
            delete: () => ({ eq: () => ({ data: null, error: null }) }),
          };
        };
      }
    });

// Custom JWT payload decoder using client-side base64 decryption (atob)
const decodeJwtPayload = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = decodeURIComponent(
        atob(payloadBase64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(payloadJson);
    }
  } catch (e) {
    console.error('Error decoding custom JWT:', e);
  }
  return null;
};

// Custom handlers for storing/reading custom customer user session (completely bypassing Supabase's mandatory auth email verification triggers)
const getCustomSession = () => {
  try {
    const saved = localStorage.getItem('amadiya_customer_user');
    const token = localStorage.getItem('amadiya_customer_token');
    
    if (saved && token) {
      const payload = decodeJwtPayload(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        const user = JSON.parse(saved);
        return {
          session: {
            user,
            access_token: token,
          },
          user,
        };
      } else {
        // Expired! Silently remove expired session items to force re-authentication
        localStorage.removeItem('amadiya_customer_user');
        localStorage.removeItem('amadiya_customer_token');
        console.warn('Session has expired (limit 3600s). Forcing logout.');
      }
    }
  } catch (e) {
    console.error('Error parsing custom user session from localStorage:', e);
  }
  return null;
};

// Listeners for custom authentication events
const customAuthListeners = new Set<(event: string, session: any) => void>();

const notifyCustomAuthChange = (event: string, session: any) => {
  customAuthListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
  // Also dispatch standard browser storage event to trigger crosscheck/renders
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('amadiya_auth_state_change', { detail: { event, session } }));
};

// Global listener to sync login/logout state correctly across components
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    const activeCustom = getCustomSession();
    notifyCustomAuthChange(activeCustom ? 'SIGNED_IN' : 'SIGNED_OUT', activeCustom?.session || null);
  });
  window.addEventListener('amadiya_auth_state_change', (e: any) => {
    const detail = e.detail;
    customAuthListeners.forEach((listener) => {
      try {
        listener(detail.event, detail.session);
      } catch (err) {}
    });
  });
}

// Custom wrapper for Supabase Auth object to bypass the unconfirmed email validations and fallback to local DB sessions
const customAuth = {
  async getSession() {
    const custom = getCustomSession();
    if (custom) {
      return { data: { session: custom.session }, error: null };
    }
    return { data: { session: null }, error: null };
  },

  async getUser() {
    const custom = getCustomSession();
    if (custom) {
      return { data: { user: custom.user }, error: null };
    }
    return { data: { user: null }, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    try {
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${origin}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('amadiya_customer_user', JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('amadiya_customer_token', data.token);
        }
        const custom = getCustomSession();
        notifyCustomAuthChange('SIGNED_IN', custom?.session || null);
        return { data: { user: data.user, session: custom?.session }, error: null };
      } else if (!response.ok) {
        return { data: { session: null, user: null }, error: new Error(data.error || 'Invalid credentials') };
      }
    } catch (err: any) {
      console.warn('Custom backend sign-in error:', err);
    }
    return { data: { session: null, user: null }, error: new Error('Invalid email or password.') };
  },

  async signUp({ email, password }: any) {
    const emailKey = email.toLowerCase().trim();
    if (emailKey === 'jasonlawrene23@gmail.com' || emailKey.endsWith('@ahsellresorts.com')) {
      try {
        const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3000';
        const response = await fetch(`${origin}/api/auth/signup-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          localStorage.setItem('amadiya_customer_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('amadiya_customer_token', data.token);
          }
          const custom = getCustomSession();
          notifyCustomAuthChange('SIGNED_IN', custom?.session || null);
          return { data: { user: data.user, session: custom?.session }, error: null };
        } else {
          return { data: { user: null }, error: new Error(data.error || 'Failed to register admin profile.') };
        }
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    }
    return { 
      data: { user: null }, 
      error: new Error('Amadiya Leisure requires confirming signups via custom 6-digit email OTP verify code.') 
    };
  },

  async signOut() {
    localStorage.removeItem('amadiya_customer_user');
    localStorage.removeItem('amadiya_customer_token');
    notifyCustomAuthChange('SIGNED_OUT', null);
    return { error: null };
  },

  onAuthStateChange(callback: any) {
    customAuthListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe() {
            customAuthListeners.delete(callback);
          },
        },
      },
    };
  },
};

export const supabase = new Proxy(baseSupabase as any, {
  get(target, prop) {
    if (prop === 'auth') {
      return customAuth;
    }
    return Reflect.get(target, prop);
  },
});
