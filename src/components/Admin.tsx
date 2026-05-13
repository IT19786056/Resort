import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dbService } from '../services/db';
import { AdminProfile } from '../types';
import { AdminLogin } from './admin/AdminLogin';
import { AdminDashboard } from './admin/AdminDashboard';
import { User } from '@supabase/supabase-js';

import { LoadingPlane } from './ui/LoadingPlane';

export const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      handleUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleUser(session?.user ?? null);
    });

    async function handleUser(u: User | null) {
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
      } else {
        setProfile(null);
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

  return <AdminDashboard profile={profile} />;
};
