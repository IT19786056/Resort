import React, { useState, useEffect } from 'react';
import { auth, type User } from '../lib/auth';
import { dbService } from '../services/db';
import { AdminProfile } from '../types';
import { AdminLogin } from './admin/AdminLogin';
import { AdminDashboard } from './admin/AdminDashboard';

import { LoadingPlane } from './ui/LoadingPlane';

export const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check
    auth.getUser().then(({ data: { user } }) => {
      handleUser(user);
    });

    const { data: { subscription } } = auth.onAuthStateChange(async (_event, session) => {
      handleUser(session?.user ?? null);
    });

    async function handleUser(u: User | null) {
      setLoading(true);
      setUser(u);
      if (u) {
        // Fetch profile from admins table
        let p = await dbService.getAdminProfile(u.id);
        
        // If profile missing but it's the master admin, auto-create it
        if (!p && u.email === 'jasonlawrene23@gmail.com') {
          console.log('Admin profile missing, recreating...');
          const newProfile = {
            email: u.email!,
            role: 'admin' as const,
            displayName: u.user_metadata?.full_name || 'Jason (Master Admin)',
            createdAt: new Date().toISOString()
          };
          await dbService.saveAdminProfile(u.id, newProfile);
          p = { id: u.id, ...newProfile };
        }
        
        setProfile(p);
        if (p) {
          dbService.setAdminContext({
            id: p.id,
            email: p.email,
            displayName: p.displayName,
            role: p.role,
          });
        } else {
          dbService.setAdminContext(null);
        }
      } else {
        setProfile(null);
        dbService.setAdminContext(null);
      }
      setLoading(false);
    }

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <LoadingPlane label="Securing Access" />;
  }

  // Only allow if profile exists in admins table
  if (!user || !profile) {
    return <AdminLogin />;
  }

  // Intercept first-time temporary password logins
  if (profile.requiresPasswordChange) {
    return (
      <ChangePasswordForm 
        profile={profile} 
        onComplete={() => {
          setProfile({
            ...profile,
            requiresPasswordChange: false
          });
        }} 
      />
    );
  }

  return <AdminDashboard profile={profile} />;
};

const ChangePasswordForm = ({ profile, onComplete }: { profile: AdminProfile; onComplete: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await dbService.changeAdminPassword({
        email: profile.email,
        currentPassword,
        newPassword
      });
      if (res.success) {
        onComplete();
      } else {
        setError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while changing your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[40px] shadow-xl max-w-md w-full border border-natural-accent">
        <div className="w-20 h-20 bg-natural-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-natural-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="text-center mb-10">
          <h1 className="font-serif text-2xl font-bold text-natural-dark italic mb-2">Secure Your Account</h1>
          <p className="text-natural-muted text-xs leading-relaxed max-w-xs mx-auto">
            This is your first sign-in using a temporary password. Please configure a custom secure password to continue.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-bold uppercase mb-8 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Current Temporary Password</label>
            <input
              type="password"
              required
              className="w-full bg-natural-bg rounded-full py-4 px-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-xs text-natural-dark"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current temporary password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">New Secure Password</label>
            <input
              type="password"
              required
              className="w-full bg-natural-bg rounded-full py-4 px-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-xs text-natural-dark"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Choose a new secure password"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-natural-muted ml-4">Confirm New Password</label>
            <input
              type="password"
              required
              className="w-full bg-natural-bg rounded-full py-4 px-6 outline-none focus:ring-2 focus:ring-natural-primary/20 transition-all font-medium text-xs text-natural-dark"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
          >
            {loading ? 'Securing Account...' : 'Update Password & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};
