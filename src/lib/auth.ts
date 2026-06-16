// Client-side auth for Amadiya Leisure.
//
// Auth is fully self-hosted: it talks to this app's own /api/auth/* endpoints
// (backed by Railway Postgres) and keeps the session in localStorage. There is
// no third-party auth provider — this module is the single source of truth.

// Minimal shape of the logged-in user returned by /api/auth/*. Kept permissive
// because the backend owns the exact payload.
export interface User {
  id: string;
  email?: string;
  displayName?: string;
  user_metadata?: Record<string, any>;
  [key: string]: any;
}

// Decode a JWT payload client-side (base64url) — used only to read expiry.
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
    console.error('Error decoding JWT:', e);
  }
  return null;
};

// Read the current session from localStorage, dropping it if the token expired.
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
    console.error('Error parsing user session from localStorage:', e);
  }
  return null;
};

// Listeners for auth events
const authListeners = new Set<(event: string, session: any) => void>();

const notifyAuthChange = (event: string, session: any) => {
  authListeners.forEach((listener) => {
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
    const activeSession = getCustomSession();
    notifyAuthChange(activeSession ? 'SIGNED_IN' : 'SIGNED_OUT', activeSession?.session || null);
  });
  window.addEventListener('amadiya_auth_state_change', (e: any) => {
    const detail = e.detail;
    authListeners.forEach((listener) => {
      try {
        listener(detail.event, detail.session);
      } catch (err) {}
    });
  });
}

// The app's auth client. Same method surface the components already use
// (getSession / getUser / signInWithPassword / signUp / signOut /
// onAuthStateChange), implemented against /api/auth/* + localStorage.
export const auth = {
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
        notifyAuthChange('SIGNED_IN', custom?.session || null);
        return { data: { user: data.user, session: custom?.session }, error: null };
      } else if (!response.ok) {
        return { data: { session: null, user: null }, error: new Error(data.error || 'Invalid credentials') };
      }
    } catch (err: any) {
      console.warn('Sign-in error:', err);
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
          notifyAuthChange('SIGNED_IN', custom?.session || null);
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
    notifyAuthChange('SIGNED_OUT', null);
    return { error: null };
  },

  onAuthStateChange(callback: any) {
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
};
