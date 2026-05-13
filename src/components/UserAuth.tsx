import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { dbService } from '../services/db';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, LogIn, UserPlus, Shield } from 'lucide-react';

interface UserAuthProps {
  onClose: () => void;
  onSuccess?: () => void;
  onStaffLogin?: () => void;
}

export const UserAuth = ({ onClose, onSuccess, onStaffLogin }: UserAuthProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName,
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          // Create profile in our database (customers table)
          await dbService.saveCustomerProfile(data.user.id, {
            email: email,
            displayName: displayName,
            createdAt: new Date().toISOString()
          });
        }
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message || 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-natural-dark/40 backdrop-blur-sm" 
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-natural-bg transition-colors z-10"
        >
          <X className="w-5 h-5 text-natural-muted" />
        </button>

        <div className="p-10 pt-16">
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl font-bold text-natural-dark italic mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-natural-muted text-sm px-4">
              {isLogin 
                ? 'Sign in to access your bookings and exclusive resort offers.' 
                : 'Join Ahsell Resorts for a seamless holiday planning experience.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-bold uppercase tracking-wider">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Full Name</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                <input 
                  type="email" 
                  required
                  className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
                  placeholder="name@example.com"
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
                  minLength={6}
                  className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-natural-primary/20 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />
              )}
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-natural-muted">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-natural-primary font-bold hover:underline"
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          {onStaffLogin && (
            <div className="mt-6 pt-6 border-t border-natural-bg">
              <button 
                onClick={onStaffLogin}
                className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-natural-muted hover:text-natural-primary transition-colors py-2"
              >
                <Shield className="w-3 h-3" />
                Staff users click here to login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
