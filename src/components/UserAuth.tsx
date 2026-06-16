import React, { useState, useEffect } from 'react';
import { auth } from '../lib/auth';
import { dbService } from '../services/db';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, LogIn, UserPlus, Shield, Key, Check, Phone } from 'lucide-react';
import { PhoneInputField } from './PhoneInputField';

interface UserAuthProps {
  onClose: () => void;
  onSuccess?: () => void;
  onStaffLogin?: () => void;
  initialEmail?: string;
  initialDisplayName?: string;
  initialPhone?: string;
  isModalMode?: 'login' | 'signup' | 'booking-signup';
  onVerifySuccess?: (credentials: { email: string; displayName: string; userId: string }) => void;
}

export const UserAuth = ({ 
  onClose, 
  onSuccess, 
  onStaffLogin,
  initialEmail = '',
  initialDisplayName = '',
  initialPhone = '',
  isModalMode = 'login',
  onVerifySuccess
}: UserAuthProps) => {
  const [isLogin, setIsLogin] = useState(isModalMode !== 'booking-signup' && isModalMode !== 'signup');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  // OTP state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      if (isLogin) {
        // Standard user password login
        const { error: loginErr } = await auth.signInWithPassword({
          email,
          password,
        });
        if (loginErr) throw loginErr;
        
        const { data: { user } } = await auth.getUser();
        if (user && !user.user_metadata?.role) {
          await dbService.saveCustomerProfile(user.id, {
            email: email,
            displayName: user.user_metadata?.full_name || displayName || email.split('@')[0],
            phone: user.user_metadata?.phone || phone || null,
            photoURL: user.user_metadata?.avatar_url || null,
            createdAt: new Date().toISOString()
          }).catch(err => console.warn('Silently failed to sync customer table:', err));
        }

        onSuccess?.();
        onClose();
      } else {
        // Sign up with OTP verification flow
        if (!showOtpInput) {
          const response = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, displayName, password, phone }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP verification code.');
          }

          setShowOtpInput(true);
          setResendCooldown(30);
          setInfoMessage(`A 6-digit confirmation code has been sent to ${email}. Code expires in 5 minutes.`);
        } else {
          await handleVerifyOtpAndRegister();
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setError(err.message || 'Authentication process failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async () => {
    if (!otpCode || otpCode.length < 4) {
      throw new Error('Please enter the verification code sent to your email.');
    }

    const verifyRes = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: otpCode }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      throw new Error(verifyData.error || 'Failed to verify verification code.');
    }

    const finalUser = verifyData.user;
    if (finalUser) {
      // Set the customer session in local storage and dispatch event to synchronize all components
      localStorage.setItem('amadiya_customer_user', JSON.stringify(finalUser));
      if (verifyData.token) {
        localStorage.setItem('amadiya_customer_token', verifyData.token);
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('amadiya_auth_state_change', {
        detail: {
          event: 'SIGNED_IN',
          session: {
            user: finalUser,
            access_token: verifyData.token
          }
        }
      }));
    }

    const finalUserId = finalUser?.id || 'cust_' + Math.random().toString(36).substring(2, 9);

    // Save profile record in customer database
    await dbService.saveCustomerProfile(finalUserId, {
      email,
      displayName,
      phone: finalUser?.user_metadata?.phone || phone || null,
      photoURL: null,
      createdAt: new Date().toISOString()
    }).catch(err => console.warn('Silently failed to sync customer table:', err));

    // Complete the verification callbacks
    if (onVerifySuccess) {
      onVerifySuccess({ email, displayName, userId: finalUserId });
    } else {
      onSuccess?.();
    }
    
    onClose();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }
      setResendCooldown(30);
      setInfoMessage(`A fresh verification code has been dispatched to ${email}.`);
    } catch (err: any) {
      setError(err.message || 'Resend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md bg-natural-cream rounded-[32px] shadow-2xl overflow-hidden modal-container border border-[#EAE5E0]"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full hover:bg-natural-bg transition-colors z-10"
        >
          <X className="w-5 h-5 text-natural-muted" />
        </button>

        <div className="p-10 pt-16">
          <div className="text-center mb-6">
            <h2 className="font-serif text-3xl font-bold text-natural-dark italic mb-2">
              {showOtpInput 
                ? 'Check Your Inbox' 
                : isLogin 
                  ? 'Welcome Back' 
                  : isModalMode === 'booking-signup' 
                    ? 'Complete Your Booking'
                    : 'Create Account'}
            </h2>
            <p className="text-natural-muted text-sm px-4">
              {showOtpInput
                ? 'We sent a 6-digit confirmation code to complete booking registration.'
                : isLogin 
                  ? 'Sign in to access your bookings and exclusive resort offers.' 
                  : isModalMode === 'booking-signup'
                    ? 'Set a custom account password to verify and instantly finalize your booking.'
                    : 'Join Amadiya Leisure for a seamless holiday planning experience.'}
            </p>
          </div>

          {infoMessage && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-xs font-semibold leading-relaxed">
              {infoMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold leading-normal">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {showOtpInput ? (
              /* OTP Code Screen */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">6-Digit Verification Code</label>
                  <div className="relative">
                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-mono font-bold text-lg tracking-[0.25em] text-center text-natural-dark"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-natural-primary hover:underline disabled:text-natural-muted disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Did not get email? Resend Code'}
                  </button>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all flex items-center justify-center gap-3 shadow-xl shadow-natural-primary/20 disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Verify & Log In
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Standard forms */
              <>
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
                      <input 
                        type="text" 
                        required
                        disabled={isModalMode === 'booking-signup'}
                        className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium disabled:opacity-75 disabled:bg-natural-bg/50"
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
                      disabled={isModalMode === 'booking-signup'}
                      className="w-full bg-natural-bg rounded-full py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium disabled:opacity-75 disabled:bg-natural-bg/50"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4 font-mono">Phone Number</label>
                    <div className="relative">
                      <PhoneInputField 
                        id="user-auth-phone-input"
                        disabled={isModalMode === 'booking-signup'}
                        required
                        value={phone}
                        onChange={(val) => setPhone(val)}
                      />
                    </div>
                  </div>
                )}

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
                  {isLogin 
                    ? 'Sign In' 
                    : isModalMode === 'booking-signup' 
                      ? 'Create Account & Proceed' 
                      : 'Send Verification Code'}
                </button>
              </>
            )}
          </form>

          {!showOtpInput && isModalMode !== 'booking-signup' && (
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
          )}

          {onStaffLogin && !showOtpInput && (
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
