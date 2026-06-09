import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { AdminProfile } from '../../types';
import { Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { SectionLabel, Input, Modal } from './Shared';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

interface UsersListProps {
  onUpdate: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onProcessing?: (msg: string) => void;
}

export const UsersList = ({ onUpdate, onSuccess, onError, onProcessing }: UsersListProps) => {
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await dbService.getAdmins();
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (confirm('Are you sure you want to delete this user? This will remove their admin access.')) {
      onProcessing?.('Deleting user...');
      try {
        await dbService.deleteAdmin(id);
        onSuccess?.('User deleted successfully');
        fetchUsers();
        onUpdate();
      } catch (e: any) {
        onError?.(e.message || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="font-serif text-2xl italic text-natural-dark">System Administrators</h3>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-natural-primary text-white px-6 py-3 rounded-full flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg"
        >
          <UserPlus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center italic text-natural-muted">Loading users...</div>
      ) : (
        <div className="bg-white rounded-[32px] overflow-hidden border border-natural-accent">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-natural-accent bg-natural-bg/50">
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-natural-muted font-bold">User</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-natural-muted font-bold">Role</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-natural-muted font-bold">Joined</th>
                  <th className="px-8 py-6 text-[10px] uppercase tracking-widest text-natural-muted font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-accent">
                {users.map((user) => (
                  <tr key={user.id} className="group hover:bg-natural-bg/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-natural-accent flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-natural-muted" />
                        </div>
                        <p className="font-bold text-natural-dark">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        <Shield className="w-3 h-3" /> {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm text-natural-muted">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser?.id}
                        className="p-2 text-natural-muted hover:text-red-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddForm && (
        <AddUserForm 
          onClose={() => { setShowAddForm(false); setError(''); }}
          onSuccess={(msg: string) => { 
            onSuccess?.(msg || 'User added successfully');
            setShowAddForm(false); 
            fetchUsers(); 
            onUpdate(); 
          }}
          onProcessing={onProcessing}
          onError={onError}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
};

const AddUserForm = ({ onClose, onSuccess, onProcessing, onError, error, setError }: any) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    onProcessing?.('Requesting invitation OTP...');
    try {
      await dbService.sendAdminOtp(email);
      setOtpSent(true);
      onSuccess('Onboarding verification code dispatched successfully. Check email!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not send verification OTP.');
      onError?.(err.message || 'Could not send verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter a valid OTP verification code.');
      return;
    }
    setLoading(true);
    setError('');
    onProcessing?.('Asserting OTP authenticity...');
    try {
      const res = await dbService.verifyAdminOtp({ email, otp: otpCode, role });
      if (res.success && res.tempPassword) {
        setTempPassword(res.tempPassword);
      } else {
        throw new Error(res.message || 'Invalid temporary password response');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failure.');
      onError?.(err.message || 'Verification failure.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (tempPassword) {
    return (
      <Modal onClose={() => { onClose(); onSuccess('User added successfully'); }} title="Onboarding Complete">
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-serif italic text-xl font-bold text-natural-dark">Admin Access Granted</h3>
            <p className="text-xs text-natural-muted mt-2 max-w-sm mx-auto leading-relaxed">
              Verify code has been authenticated. We have set up a placeholder staff profile with the following temporary password.
            </p>
          </div>

          <div className="bg-natural-bg p-5 rounded-2xl border border-natural-accent flex flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-natural-muted">Temporary Password</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-natural-primary select-all px-3 py-1 bg-white rounded-lg border border-natural-accent">{tempPassword}</span>
              <button 
                type="button"
                onClick={handleCopy}
                className="p-2 text-natural-muted hover:text-natural-primary transition-colors hover:bg-natural-bg rounded-lg"
                title="Copy Password"
              >
                {copied ? (
                  <span className="text-[10px] font-bold text-green-600 uppercase">Copied!</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 00-2 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2 text-left bg-amber-50 p-4 border border-amber-100 rounded-2xl text-[10px] text-amber-800 leading-relaxed font-bold uppercase tracking-wide">
            ⚠️ NOTICE: Please share this temporary password with the user. The system will force them to choose a secure custom password upon their very first sign-in.
          </div>

          <button 
            type="button"
            onClick={() => { onClose(); onSuccess('User created'); }}
            className="w-full bg-natural-primary text-white py-4 rounded-full font-bold uppercase tracking-widest hover:bg-natural-dark transition-all shadow-lg"
          >
            Fulfill and Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Add New Administrator">
      <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold uppercase">
            {error}
          </div>
        )}
        
        <Input 
          label="Email Address" 
          type="email" 
          value={email} 
          onChange={setEmail} 
          required 
          disabled={otpSent}
        />
        
        {otpSent && (
          <div className="space-y-2">
            <Input 
              label="Verification OTP code (sent to user email)" 
              type="text" 
              value={otpCode} 
              onChange={setOtpCode} 
              required 
              placeholder="6-digit OTP code"
              maxLength={6}
            />
            <div className="text-right">
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-[9px] font-bold uppercase tracking-wider text-natural-primary hover:underline"
              >
                Resend OTP Invite
              </button>
            </div>
          </div>
        )}
        
        <div>
          <SectionLabel label="Assign Role" />
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              disabled={otpSent}
              onClick={() => setRole('staff')}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${role === 'staff' ? 'border-natural-primary bg-natural-primary/5' : 'border-natural-accent hover:border-natural-muted'} ${otpSent ? 'opacity-80' : ''}`}
            >
              <p className="font-bold text-sm text-natural-dark">Staff</p>
              <p className="text-[10px] text-natural-muted uppercase mt-1">Can manage resorts and bookings</p>
            </button>
            <button 
              type="button"
              disabled={otpSent}
              onClick={() => setRole('admin')}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${role === 'admin' ? 'border-natural-primary bg-natural-primary/5' : 'border-natural-accent hover:border-natural-muted'} ${otpSent ? 'opacity-80' : ''}`}
            >
              <p className="font-bold text-sm text-natural-dark">Admin</p>
              <p className="text-[10px] text-natural-muted uppercase mt-1">Can manage users & all settings</p>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest shadow-xl hover:bg-natural-dark transition-all disabled:opacity-50 animate-pulse-subtle"
        >
          {loading ? 'Processing...' : otpSent ? 'Verify Code & Create Account' : 'Send Invite OTP'}
        </button>
      </form>
    </Modal>
  );
};
