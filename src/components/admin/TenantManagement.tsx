import React, { useState, useEffect } from 'react';
import { Hotel, Tenant, AdminSummary } from '../../types';
import {
  Globe, Plus, Edit, Trash2, Users2, RefreshCw,
  AlertCircle, Shield, Building2, CheckCircle2, XCircle,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Modal, Input, SectionLabel } from './Shared';

interface TenantManagementProps {
  hotels: Hotel[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onProcessing: (msg: string) => void;
}

const emptyForm = () => ({
  domain: '', hotelId: '', name: '',
  logoUrl: '', markLogoUrl: '',
  primaryColor: '', accentColor: '',
  phone: '', email: '', emailFrom: '',
  bankName: '', accountName: '', accountNumber: '', branch: '', swift: '',
  isActive: true,
});

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-violet-50 text-violet-700 border-violet-100',
  admin: 'bg-blue-50 text-blue-700 border-blue-100',
  staff: 'bg-slate-50 text-slate-700 border-slate-100',
};

const SELECT_CLS =
  'w-full bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-sm appearance-none cursor-pointer';

export const TenantManagement = ({
  hotels, onSuccess, onError, onProcessing,
}: TenantManagementProps) => {
  const [subTab, setSubTab] = useState<'tenants' | 'admins'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [admins, setAdmins] = useState<AdminSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; domain: string } | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminSummary | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [adminForm, setAdminForm] = useState({ hotelId: '', role: '' });
  const [saving, setSaving] = useState(false);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('resort_customer_token');
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
      },
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        authFetch('/api/superadmin/tenants'),
        authFetch('/api/superadmin/admins'),
      ]);
      if (tRes.ok) setTenants(await tRes.json());
      if (aRes.ok) setAdmins(await aRes.json());
    } catch {
      onError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const f = (field: keyof ReturnType<typeof emptyForm>, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingTenant(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditingTenant(t);
    setForm({
      domain: t.domain,
      hotelId: t.hotelId,
      name: t.name,
      logoUrl: t.logoUrl || '',
      markLogoUrl: t.markLogoUrl || '',
      primaryColor: t.primaryColor || '',
      accentColor: t.accentColor || '',
      phone: t.phone || '',
      email: t.email || '',
      emailFrom: t.emailFrom || '',
      bankName: t.bankDetails?.bankName || '',
      accountName: t.bankDetails?.accountName || '',
      accountNumber: t.bankDetails?.accountNumber || '',
      branch: t.bankDetails?.branch || '',
      swift: t.bankDetails?.swift || '',
      isActive: t.isActive,
    });
    setShowForm(true);
  };

  const handleSaveTenant = async () => {
    if (!form.domain.trim() || !form.hotelId || !form.name.trim()) {
      onError('Domain, hotel, and brand name are required.');
      return;
    }
    setSaving(true);
    onProcessing('Saving tenant…');
    const bankDetails: Record<string, string> = {};
    if (form.bankName) bankDetails.bankName = form.bankName;
    if (form.accountName) bankDetails.accountName = form.accountName;
    if (form.accountNumber) bankDetails.accountNumber = form.accountNumber;
    if (form.branch) bankDetails.branch = form.branch;
    if (form.swift) bankDetails.swift = form.swift;

    const body = {
      domain: form.domain.trim().toLowerCase(),
      hotelId: form.hotelId,
      name: form.name,
      logoUrl: form.logoUrl || null,
      markLogoUrl: form.markLogoUrl || null,
      primaryColor: form.primaryColor || null,
      accentColor: form.accentColor || null,
      phone: form.phone || null,
      email: form.email || null,
      emailFrom: form.emailFrom || null,
      bankDetails: Object.keys(bankDetails).length ? bankDetails : null,
      isActive: form.isActive,
    };
    try {
      const res = editingTenant
        ? await authFetch(`/api/superadmin/tenants/${editingTenant.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await authFetch('/api/superadmin/tenants', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError((data as any).error || 'Failed to save tenant.');
        return;
      }
      onSuccess(editingTenant ? 'Tenant updated.' : 'Tenant created.');
      setShowForm(false);
      await loadData();
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    onProcessing('Deleting tenant…');
    try {
      const res = await authFetch(`/api/superadmin/tenants/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.status !== 204 && !res.ok) {
        const data = await res.json().catch(() => ({}));
        onError((data as any).error || 'Failed to delete.');
        return;
      }
      onSuccess(`Tenant "${deleteTarget.domain}" deleted.`);
      setDeleteTarget(null);
      await loadData();
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdmin = async () => {
    if (!editingAdmin) return;
    setSaving(true);
    onProcessing('Updating admin…');
    try {
      const res = await authFetch(`/api/superadmin/admins/${editingAdmin.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hotelId: adminForm.hotelId || null, role: adminForm.role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError((data as any).error || 'Failed to update admin.');
        return;
      }
      onSuccess('Admin updated.');
      setEditingAdmin(null);
      await loadData();
    } catch {
      onError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const TabButton = ({ id, icon, label }: { id: 'tenants' | 'admins'; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setSubTab(id)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all ${
        subTab === id
          ? 'bg-natural-primary text-white shadow-lg shadow-natural-primary/20'
          : 'text-natural-muted hover:bg-natural-accent hover:text-natural-dark'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const ColorField = ({ label, field }: { label: string; field: 'primaryColor' | 'accentColor' }) => (
    <div className="space-y-2">
      <SectionLabel label={label} />
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={form[field] || '#3a5a40'}
          onChange={e => f(field, e.target.value)}
          className="w-10 h-10 rounded-xl border border-natural-accent cursor-pointer bg-white p-0.5"
        />
        <input
          type="text"
          value={form[field]}
          onChange={e => f(field, e.target.value)}
          placeholder="#3a5a40"
          className="flex-1 bg-white border border-natural-accent rounded-2xl p-4 outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary transition-all font-medium text-natural-dark text-sm font-mono"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-natural-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-natural-muted animate-pulse">Loading tenant data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-3 flex-wrap">
        <TabButton id="tenants" icon={<Globe className="w-4 h-4" />} label="Domains" />
        <TabButton id="admins" icon={<Users2 className="w-4 h-4" />} label="Admins" />
        <button
          onClick={loadData}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 text-natural-muted hover:text-natural-dark hover:bg-natural-accent rounded-full transition-all font-bold uppercase text-[10px] tracking-widest"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── TENANTS TAB ────────────────────────────────────────────────────── */}
      {subTab === 'tenants' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-natural-muted">
              {tenants.length} domain{tenants.length !== 1 ? 's' : ''} configured
            </p>
            <button
              onClick={openCreate}
              className="bg-natural-primary text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg shadow-natural-primary/20"
            >
              <Plus className="w-4 h-4" /> Add Domain
            </button>
          </div>

          {tenants.length === 0 ? (
            <div className="p-16 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4 shadow-sm">
              <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
                <Globe className="w-8 h-8 text-natural-muted" />
              </div>
              <div>
                <h4 className="font-serif italic text-lg text-neutral-800 font-bold">No Domains Configured</h4>
                <p className="text-xs text-natural-muted max-w-sm mt-1 leading-relaxed">
                  Add a domain to map it to a hotel with custom branding.
                </p>
              </div>
              <button
                onClick={openCreate}
                className="bg-natural-primary text-white px-6 py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all shadow-lg"
              >
                <Plus className="w-4 h-4 inline mr-2" />Add First Domain
              </button>
            </div>
          ) : (
            <div className="bg-white border border-natural-accent rounded-3xl overflow-hidden shadow-sm">
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-natural-accent bg-natural-bg/40">
                      {['Domain', 'Hotel', 'Brand Name', 'Status', 'Actions'].map(h => (
                        <th key={h} className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-accent">
                    {tenants.map(t => (
                      <tr key={t.id} className="hover:bg-natural-bg/10 transition-colors">
                        <td className="py-5 px-6 font-mono text-sm text-natural-dark font-bold">{t.domain}</td>
                        <td className="py-5 px-6 text-sm text-natural-dark">{t.hotelName || '—'}</td>
                        <td className="py-5 px-6 text-sm text-natural-dark">{t.name}</td>
                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                            t.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {t.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(t)}
                              className="p-2 text-natural-muted hover:text-natural-primary hover:bg-natural-bg rounded-xl transition-all"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: t.id, domain: t.domain })}
                              className="p-2 text-natural-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="lg:hidden divide-y divide-natural-accent">
                {tenants.map(t => (
                  <div key={t.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-natural-dark">{t.domain}</p>
                        <p className="text-xs text-natural-muted mt-0.5">{t.name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                        t.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-natural-muted">
                      <Building2 className="w-3.5 h-3.5" /> {t.hotelName || t.hotelId}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEdit(t)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-natural-accent text-xs font-bold text-natural-dark hover:bg-natural-bg transition-all">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget({ id: t.id, domain: t.domain })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-100 text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADMINS TAB ─────────────────────────────────────────────────────── */}
      {subTab === 'admins' && (
        <div className="space-y-5">
          <p className="text-sm text-natural-muted">{admins.length} account{admins.length !== 1 ? 's' : ''}</p>
          {admins.length === 0 ? (
            <div className="p-16 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4 shadow-sm">
              <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
                <Users2 className="w-8 h-8 text-natural-muted" />
              </div>
              <h4 className="font-serif italic text-lg text-neutral-800 font-bold">No Accounts Found</h4>
            </div>
          ) : (
            <div className="bg-white border border-natural-accent rounded-3xl overflow-hidden shadow-sm">
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-natural-accent bg-natural-bg/40">
                      {['Account', 'Role', 'Property Scope', 'Actions'].map(h => (
                        <th key={h} className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-accent">
                    {admins.map(a => (
                      <tr key={a.id} className="hover:bg-natural-bg/10 transition-colors">
                        <td className="py-5 px-6">
                          <p className="text-sm font-bold text-natural-dark">{a.displayName || '—'}</p>
                          <p className="text-[10px] font-mono text-natural-muted">{a.email}</p>
                        </td>
                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${ROLE_BADGE[a.role] || ROLE_BADGE.staff}`}>
                            {a.role === 'superadmin' && <Shield className="w-3 h-3" />}
                            {a.role}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-sm text-natural-dark">
                          {a.hotelName || <span className="text-natural-muted text-xs">All Properties</span>}
                        </td>
                        <td className="py-5 px-6">
                          <button
                            onClick={() => { setEditingAdmin(a); setAdminForm({ hotelId: a.hotelId || '', role: a.role }); }}
                            className="p-2 text-natural-muted hover:text-natural-primary hover:bg-natural-bg rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="lg:hidden divide-y divide-natural-accent">
                {admins.map(a => (
                  <div key={a.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-natural-dark">{a.displayName || a.email}</p>
                        <p className="text-[10px] font-mono text-natural-muted">{a.email}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${ROLE_BADGE[a.role] || ROLE_BADGE.staff}`}>
                        {a.role}
                      </span>
                    </div>
                    <p className="text-xs text-natural-muted flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {a.hotelName || 'All Properties'}
                    </p>
                    <button
                      onClick={() => { setEditingAdmin(a); setAdminForm({ hotelId: a.hotelId || '', role: a.role }); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-natural-accent text-xs font-bold text-natural-dark hover:bg-natural-bg transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Account
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TENANT FORM MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <Modal title={editingTenant ? 'Edit Domain Tenant' : 'Add Domain Tenant'} onClose={() => setShowForm(false)}>
            <div className="space-y-5">
              {/* Basic */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Domain *"
                  value={form.domain}
                  onChange={(v: string) => f('domain', v)}
                  placeholder="heritageahungalla.com"
                />
                <div className="space-y-2">
                  <SectionLabel label="Hotel *" />
                  <select
                    value={form.hotelId}
                    onChange={e => f('hotelId', e.target.value)}
                    className={SELECT_CLS}
                  >
                    <option value="">Select hotel…</option>
                    {hotels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Input
                label="Brand Name *"
                value={form.name}
                onChange={(v: string) => f('name', v)}
                placeholder="Heritage Ahungalla"
              />

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => f('isActive', !form.isActive)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-natural-primary' : 'bg-natural-accent'}`}
                  style={{ minWidth: 40, height: 22 }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200 ${form.isActive ? 'translate-x-4.5' : 'translate-x-0'}`}
                    style={{ width: 18, height: 18, transform: form.isActive ? 'translateX(18px)' : 'translateX(0)' }} />
                </button>
                <span className="text-xs font-bold text-natural-dark uppercase tracking-widest">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <hr className="border-natural-accent" />

              {/* Branding */}
              <SectionLabel label="Branding" />
              <Input label="Logo URL" value={form.logoUrl} onChange={(v: string) => f('logoUrl', v)} placeholder="https://…/logo.png" />
              <Input label="Mark / Icon URL" value={form.markLogoUrl} onChange={(v: string) => f('markLogoUrl', v)} placeholder="https://…/mark.png" />
              <div className="grid sm:grid-cols-2 gap-4">
                <ColorField label="Primary Color" field="primaryColor" />
                <ColorField label="Accent Color" field="accentColor" />
              </div>

              <hr className="border-natural-accent" />

              {/* Contact */}
              <SectionLabel label="Contact" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Phone" value={form.phone} onChange={(v: string) => f('phone', v)} placeholder="+94 11 234 5678" />
                <Input label="Contact Email" type="email" value={form.email} onChange={(v: string) => f('email', v)} placeholder="info@hotel.com" />
              </div>
              <Input
                label="Email From"
                value={form.emailFrom}
                onChange={(v: string) => f('emailFrom', v)}
                placeholder="Heritage Ahungalla <no-reply@heritageahungalla.com>"
              />

              <hr className="border-natural-accent" />

              {/* Bank details */}
              <SectionLabel label="Bank Details" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Bank Name" value={form.bankName} onChange={(v: string) => f('bankName', v)} />
                <Input label="Account Name" value={form.accountName} onChange={(v: string) => f('accountName', v)} />
                <Input label="Account Number" value={form.accountNumber} onChange={(v: string) => f('accountNumber', v)} />
                <Input label="Branch" value={form.branch} onChange={(v: string) => f('branch', v)} />
                <Input label="SWIFT / BIC" value={form.swift} onChange={(v: string) => f('swift', v)} />
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTenant}
                  disabled={saving}
                  className="flex-1 bg-natural-primary text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all disabled:opacity-50 shadow-lg shadow-natural-primary/20"
                >
                  {saving ? 'Saving…' : editingTenant ? 'Update Tenant' : 'Create Tenant'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <Modal title="Delete Tenant?" onClose={() => setDeleteTarget(null)}>
            <div className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 leading-relaxed">
                  Deleting <strong className="font-mono">{deleteTarget.domain}</strong> will remove all branding
                  config for that domain. The hotel and its rooms are not affected.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTenant}
                  disabled={saving}
                  className="flex-1 bg-red-500 text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── ADMIN EDIT MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingAdmin && (
          <Modal title="Edit Admin Account" onClose={() => setEditingAdmin(null)}>
            <div className="space-y-5">
              <div className="p-4 bg-natural-bg rounded-2xl">
                <p className="text-xs font-bold text-natural-dark">{editingAdmin.displayName || '—'}</p>
                <p className="text-[10px] font-mono text-natural-muted">{editingAdmin.email}</p>
              </div>

              <div className="space-y-2">
                <SectionLabel label="Role" />
                <select
                  value={adminForm.role}
                  onChange={e => setAdminForm(p => ({ ...p, role: e.target.value }))}
                  className={SELECT_CLS}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <SectionLabel label="Property Scope" />
                <select
                  value={adminForm.hotelId}
                  onChange={e => setAdminForm(p => ({ ...p, hotelId: e.target.value }))}
                  className={SELECT_CLS}
                >
                  <option value="">All Properties (unscoped)</option>
                  {hotels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-natural-muted px-1">
                  Super Admins always see all properties regardless of this setting.
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 border border-natural-accent text-natural-dark py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-bg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAdmin}
                  disabled={saving}
                  className="flex-1 bg-natural-primary text-white py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-natural-dark transition-all disabled:opacity-50 shadow-lg shadow-natural-primary/20"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};
