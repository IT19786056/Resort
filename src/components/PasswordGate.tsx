import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'amadiya_demo_gate';
const SESSION_MS = 60 * 60 * 1000; // 1 hour

interface GateSession {
  token: string;
  issuedAt: number;
}

function readSession(): GateSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s: GateSession = JSON.parse(raw);
    if (!s.token || !s.issuedAt) return null;
    if (Date.now() - s.issuedAt > SESSION_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/demo-auth?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

async function submitPassword(password: string): Promise<{ session: GateSession | null; rateLimited: boolean; errorMsg: string }> {
  try {
    const res = await fetch('/api/demo-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok) return { session: { token: data.token, issuedAt: data.issuedAt }, rateLimited: false, errorMsg: '' };
    if (res.status === 429) return { session: null, rateLimited: true, errorMsg: data.error || 'Too many attempts.' };
    return { session: null, rateLimited: false, errorMsg: data.error || 'Incorrect password.' };
  } catch {
    return { session: null, rateLimited: false, errorMsg: 'Connection error. Please try again.' };
  }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'locked' | 'open'>('checking');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const session = readSession();
      if (!session) return setStatus('locked');
      const valid = await verifyToken(session.token);
      if (!valid) localStorage.removeItem(STORAGE_KEY);
      setStatus(valid ? 'open' : 'locked');
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { session, errorMsg } = await submitPassword(password);
      if (!session) {
        setError(errorMsg);
        setPassword('');
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setStatus('open');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-natural-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'open') return <>{children}</>;

  return (
    <div className="min-h-screen bg-natural-primary flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="text-center mb-10 space-y-5">
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto border border-white/20">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-3xl italic text-white tracking-wide">Amadiya Leisure</h1>
            <p className="text-white/40 text-xs uppercase tracking-[0.3em] mt-2 font-light">Preview Access</p>
          </div>
        </div>

        {/* Gate card */}
        <div className="bg-white/[0.07] backdrop-blur-sm rounded-[28px] p-8 border border-white/[0.12]">
          <p className="text-white/50 text-sm text-center leading-relaxed mb-7 font-light">
            This preview is password protected.<br />Enter the access password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Access password"
                autoComplete="current-password"
                spellCheck={false}
                autoFocus
                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/25 rounded-2xl px-5 py-4 pr-12 text-sm focus:outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  key="err"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-300/90 text-xs px-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-white text-natural-primary font-bold uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-natural-cream active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-natural-primary/20 border-t-natural-primary rounded-full animate-spin inline-block" />
                  Verifying...
                </>
              ) : 'Enter Site'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/15 text-[11px] mt-6 tracking-wide">
          Session valid for 1 hour
        </p>
      </motion.div>
    </div>
  );
}
