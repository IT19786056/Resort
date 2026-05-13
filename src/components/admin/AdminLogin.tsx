import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { dbService } from '../../services/db';
import { motion } from 'motion/react';
import { Building2, Mail, Lock, LogIn } from 'lucide-react';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Special check for master admin on registration
        if (email !== 'jasonlawrene23@gmail.com' && !email.endsWith('@ahsellresorts.com')) {
          throw new Error('Only authorized staff emails can register here.');
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          await dbService.saveAdminProfile(data.user.id, {
            email: email,
            role: 'admin',
            displayName: email.split('@')[0],
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Authentication failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white p-12 rounded-[40px] shadow-xl max-w-md w-full"
      >
        <div className="w-20 h-20 bg-natural-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Building2 className="w-10 h-10 text-natural-primary" />
        </div>
        
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-natural-dark italic mb-2">Staff Portal</h1>
          <p className="text-natural-muted text-sm leading-relaxed mb-6">
            {isLogin ? 'Access restricted to authorized personnel.' : 'Create your secure staff credentials.'}
          </p>
          
          <div className="bg-natural-bg/50 p-4 rounded-2xl border border-natural-accent text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-natural-muted mb-2">Internal Staff Access</p>
            <div className="space-y-1">
              <p className="text-xs text-natural-dark"><span className="font-bold">Email:</span> jasonlawrene23@gmail.com</p>
              <p className="text-xs text-natural-dark"><span className="font-bold">Password:</span> Jason@123</p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-bold uppercase mb-8 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Staff Email</label>
            <div className="relative">
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
              <input 
                type="email" 
                required
                className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
                placeholder="email@ahsellresorts.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Password</label>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
              <input 
                type="password" 
                required
                className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-natural-primary/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-[10px] font-bold uppercase tracking-widest text-natural-muted hover:text-natural-primary transition-colors py-2"
            >
              {isLogin ? 'Need to create staff account?' : 'Already have an account? Sign In'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
