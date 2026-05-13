import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { AdminProfile } from '../../types';
import { Trash2, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { SectionLabel, Input, Modal } from './Shared';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

interface UsersListProps {
  onUpdate: () => void;
}

export const UsersList = ({ onUpdate }: UsersListProps) => {
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
      await dbService.deleteAdmin(id);
      fetchUsers();
      onUpdate();
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
          <table className="w-full text-left">
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
      )}

      {showAddForm && (
        <AddUserForm 
          onClose={() => { setShowAddForm(false); setError(''); }}
          onSuccess={() => { setShowAddForm(false); fetchUsers(); onUpdate(); }}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
};

const AddUserForm = ({ onClose, onSuccess, error, setError }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('Failed to create user');

      // Add admin profile in our database
      await dbService.saveAdminProfile(data.user.id, {
        email,
        role,
        displayName: email.split('@')[0],
        createdAt: new Date().toISOString()
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add New Administrator">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold uppercase">
            {error}
          </div>
        )}
        <Input label="Email Address" type="email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
        
        <div>
          <SectionLabel label="Assign Role" />
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={() => setRole('staff')}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${role === 'staff' ? 'border-natural-primary bg-natural-primary/5' : 'border-natural-accent hover:border-natural-muted'}`}
            >
              <p className="font-bold text-sm text-natural-dark">Staff</p>
              <p className="text-[10px] text-natural-muted uppercase mt-1">Can manage resorts and bookings</p>
            </button>
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${role === 'admin' ? 'border-natural-primary bg-natural-primary/5' : 'border-natural-accent hover:border-natural-muted'}`}
            >
              <p className="font-bold text-sm text-natural-dark">Admin</p>
              <p className="text-[10px] text-natural-muted uppercase mt-1">Can manage users & all settings</p>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-natural-primary text-white py-5 rounded-full font-bold uppercase tracking-widest shadow-xl hover:bg-natural-dark transition-all disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </Modal>
  );
};
