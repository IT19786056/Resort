import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { AdminLog } from '../../types';
import { 
  Search, 
  RefreshCw, 
  Calendar, 
  User, 
  Tag, 
  Database,
  FileSpreadsheet,
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

export const AdminLogsList = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbService.getAdminLogs();
      setLogs(data);
    } catch (err: any) {
      console.error('Error fetching admin logs:', err);
      setError(err.message || 'Failed to load transaction logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateString;
    }
  };

  const getLogBadgeColor = (action: string) => {
    switch (action) {
      case 'CONFIRM_BOOKING':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CANCEL_BOOKING':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'ADD_HOTEL':
      case 'ADD_ROOM':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'UPDATE_HOTEL':
      case 'UPDATE_ROOM':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'DELETE_HOTEL':
      case 'DELETE_ROOM':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getShortActionLabel = (action: string) => {
    return action.replace('_', ' ');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.adminEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.adminName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.targetName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.details?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const distinctActions = Array.from(new Set(logs.map(l => l.action))) as string[];

  return (
    <div className="space-y-6">
      {/* Top Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">
        <div className="flex-1 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-natural-muted" />
            <input 
              type="text"
              placeholder="Search by staff name, email, target details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-natural-accent rounded-2xl focus:outline-none focus:ring-1 focus:ring-natural-primary text-xs font-bold text-natural-dark placeholder-natural-muted tracking-tight transition-all shadow-sm"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full py-3.5 px-4 bg-white border border-natural-accent rounded-2xl focus:outline-none focus:ring-1 focus:ring-natural-primary text-xs font-bold text-natural-dark tracking-tight transition-all shadow-sm cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23898075' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 16px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="ALL">All Actions</option>
              {distinctActions.map(action => (
                <option key={action} value={action}>{getShortActionLabel(action)}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 transition-all rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-neutral-900/10 hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Logs Table / View Content */}
      {error ? (
        <div className="p-8 bg-red-50/50 border border-red-100 rounded-3xl flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <h4 className="font-serif italic text-lg text-red-900 font-bold">Error Loading Audit Logs</h4>
          <p className="text-xs text-red-700 max-w-md leading-relaxed">{error}</p>
          <button 
            onClick={fetchLogs} 
            className="mt-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold uppercase text-[9px] tracking-widest hover:bg-red-700 transition-colors shadow-md"
          >
            Retry Fetching
          </button>
        </div>
      ) : loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-natural-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-natural-muted animate-pulse">Retrieving audit logs...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 bg-white border border-natural-accent rounded-3xl flex flex-col items-center text-center gap-4 shadow-sm">
          <div className="p-4 bg-natural-bg rounded-2xl border border-natural-accent">
            <Activity className="w-8 h-8 text-natural-muted" />
          </div>
          <div>
            <h4 className="font-serif italic text-lg text-neutral-800 font-bold">No Audit Log Entries</h4>
            <p className="text-xs text-natural-muted max-w-sm mt-1 leading-relaxed">
              {searchTerm || actionFilter !== 'ALL' 
                ? 'Try adjusting your search query or filters to find specific transaction history.' 
                : 'No activities have been recorded on the system yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-natural-accent rounded-3xl overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-natural-accent bg-natural-bg/40">
                  <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Time</th>
                  <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Staff Member</th>
                  <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Action</th>
                  <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Target Name</th>
                  <th className="py-5 px-6 text-[10px] uppercase font-bold text-natural-muted tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-accent">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-natural-bg/10 transition-colors">
                    <td className="py-5 px-6 text-xs whitespace-nowrap font-mono text-natural-muted">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-natural-dark">{log.adminName || 'Amadiya Staff'}</span>
                        <span className="text-[10px] text-natural-muted font-mono">{log.adminEmail}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-[9px] uppercase font-bold tracking-widest rounded-full border ${getLogBadgeColor(log.action)}`}>
                        {getShortActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-xs font-bold text-natural-dark max-w-xs truncate">
                      {log.targetName || '-'}
                    </td>
                    <td className="py-5 px-6 text-xs text-natural-muted leading-relaxed">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-natural-accent">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-6 space-y-4 hover:bg-natural-bg/10 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-mono text-natural-muted">
                    {formatDate(log.createdAt)}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-[8px] uppercase font-bold tracking-widest rounded-full border ${getLogBadgeColor(log.action)}`}>
                    {getShortActionLabel(log.action)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-natural-dark leading-snug">
                    {log.details}
                  </h5>
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-natural-muted">
                    <span className="font-bold text-natural-primary">{log.adminName || 'Amadiya Staff'}</span>
                    <span>•</span>
                    <span className="font-mono">{log.adminEmail}</span>
                  </div>
                </div>

                {log.targetName && (
                  <div className="pt-2 border-t border-natural-accent flex gap-2 items-center text-[10px] text-natural-muted">
                    <Database className="w-3.5 h-3.5 text-natural-primary" />
                    <span>Target: <strong className="text-natural-dark">{log.targetName}</strong></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
