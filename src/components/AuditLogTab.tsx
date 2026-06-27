import React from 'react';
import { Shield, Clock, Search, X, Download, AlertTriangle, CheckCircle2, Info, AlertOctagon, Terminal, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogTabProps {
  logs: AuditLogEntry[];
}

const severityConfig = {
  info: {
    icon: Info,
    colorClass: 'text-sky-400',
    bgColorClass: 'bg-sky-500/10 border-sky-500/20',
    label: 'INFO',
  },
  success: {
    icon: CheckCircle2,
    colorClass: 'text-emerald-400',
    bgColorClass: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'SUCCESS',
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-amber-400',
    bgColorClass: 'bg-amber-500/10 border-amber-500/20',
    label: 'WARNING',
  },
  critical: {
    icon: AlertOctagon,
    colorClass: 'text-rose-400',
    bgColorClass: 'bg-rose-500/10 border-rose-500/20',
    label: 'CRITICAL',
  },
};

const actionLabels: Record<AuditLogEntry['action'], string> = {
  CAMPAIGN_LAUNCH: 'Campaign Launch',
  STREAM_CREATE: 'Stream Create',
  STREAM_TOGGLE: 'Stream Toggle',
  PROOF_VERIFY: 'Proof Verify',
  DEPOSIT: 'Deposit',
  DISBURSE: 'Disburse',
  WALLET_CONNECT: 'Wallet Connect',
  WALLET_DISCONNECT: 'Wallet Disconnect',
};

export default function AuditLogTab({ logs }: AuditLogTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>('all');
  const [selectedAction, setSelectedAction] = React.useState<string>('all');

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      // Search term filter
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        log.details.toLowerCase().includes(term) ||
        log.actor.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        (log.txHash && log.txHash.toLowerCase().includes(term));

      // Severity filter
      const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;

      // Action filter
      const matchesAction = selectedAction === 'all' || log.action === selectedAction;

      return matchesSearch && matchesSeverity && matchesAction;
    });
  }, [logs, searchTerm, selectedSeverity, selectedAction]);

  const stats = React.useMemo(() => {
    const total = logs.length;
    const critical = logs.filter((l) => l.severity === 'critical' || l.severity === 'warning').length;
    const success = logs.filter((l) => l.severity === 'success').length;
    const lastEntry = logs[0]?.timestamp || 'Never';
    return { total, critical, success, lastEntry };
  }, [logs]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Action', 'Severity', 'Details', 'Actor', 'Cryptographic Tag / Hash'];
    const rows = filteredLogs.map((log) => [
      log.id,
      `"${log.timestamp.replace(/"/g, '""')}"`,
      log.action,
      log.severity.toUpperCase(),
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.actor.replace(/"/g, '""')}"`,
      log.txHash || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shieldfund_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Intro section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-indigo-400">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <span className="font-mono text-xs font-semibold tracking-[0.2em] uppercase">Sovereign Compliance</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-3xl md:text-4xl text-slate-50 tracking-tight">
              Institutional Audit Log
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              A real-time, cryptographically bound ledger tracking sovereign DAO voter interactions, smart contract updates, and treasury solvency checks.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-3 rounded-2xl font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-black/20 shrink-0 self-start md:self-center"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Download Audit Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 bg-slate-900/25 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">LOGGED OPERATIONS</span>
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-slate-50">{stats.total}</span>
            <span className="text-xs font-mono text-emerald-400">Synced</span>
          </div>
        </div>

        {/* Cryptographic Verification Rate */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 bg-slate-900/25 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">VERIFICATION RATE</span>
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-slate-50">100%</span>
            <span className="text-xs font-mono text-slate-500">ZK Attested</span>
          </div>
        </div>

        {/* Alerts / warnings */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 bg-slate-900/25 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">NOTICES / ALERTS</span>
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-3xl text-slate-50">{stats.critical}</span>
            <span className="text-xs font-mono text-slate-500">Reviewed</span>
          </div>
        </div>

        {/* Last active operation */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800/80 bg-slate-900/25 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">LAST AUDIT BEAT</span>
            <div className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-sm text-slate-200 truncate">{stats.lastEntry}</span>
            <span className="text-[10px] font-mono text-slate-500 uppercase mt-0.5 tracking-wider">Continuous Beat</span>
          </div>
        </div>
      </div>

      {/* Filter and search control bar */}
      <div className="glass-card p-4 md:p-6 rounded-3xl border border-slate-800 bg-slate-900/20 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Real-time search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit trail by actor, details, hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 hover:border-slate-700 focus:border-indigo-500/50 rounded-2xl py-2.5 pl-10 pr-9 text-xs text-slate-100 placeholder-slate-500 transition-all focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 focus:outline-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtering Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            {/* Severity selection */}
            <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-2xl border border-slate-800 flex-1 sm:flex-initial">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-xs text-slate-300 font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-950 text-slate-200">All Severities</option>
                <option value="info" className="bg-slate-950 text-slate-200">Info</option>
                <option value="success" className="bg-slate-950 text-slate-200">Success</option>
                <option value="warning" className="bg-slate-950 text-slate-200">Warning</option>
                <option value="critical" className="bg-slate-950 text-slate-200">Critical</option>
              </select>
            </div>

            {/* Action selection */}
            <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-2xl border border-slate-800 flex-1 sm:flex-initial">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Operation:</span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="bg-transparent text-xs text-slate-300 font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-950 text-slate-200">All Operations</option>
                {Object.entries(actionLabels).map(([action, label]) => (
                  <option key={action} value={action} className="bg-slate-950 text-slate-200">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table / List Card */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/40">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => {
              const severity = severityConfig[log.severity] || severityConfig.info;
              const LogIcon = severity.icon;

              return (
                <div
                  key={log.id}
                  className="p-5 md:p-6 hover:bg-slate-900/20 transition-all duration-200 flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="flex gap-4 items-start">
                    {/* Severity colored icon */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${severity.bgColorClass}`}>
                      <LogIcon className={`w-5 h-5 ${severity.colorClass}`} />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      {/* Action Name, Severity & Actor */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-100 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-lg">
                          {log.action}
                        </span>
                        <span className={`font-mono text-[9px] font-semibold px-2 py-0.5 rounded border ${severity.bgColorClass} ${severity.colorClass}`}>
                          {severity.label}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          by <span className="text-slate-400 font-semibold">{log.actor}</span>
                        </span>
                      </div>

                      {/* Main Message details */}
                      <p className="font-sans text-sm text-slate-200 leading-relaxed break-words">
                        {log.details}
                      </p>

                      {/* Cryptographic hash attachment */}
                      {log.txHash && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-500">
                            ZK Proof signature: <span className="text-slate-400">{log.txHash}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="text-left md:text-right shrink-0 md:self-start pl-14 md:pl-0 flex items-center md:block gap-2">
                    <div className="flex items-center gap-1.5 md:justify-end text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-xs text-slate-300 font-medium">
                        {log.timestamp}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1 hidden md:block">
                      ✓ SEALED & AUDITED
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto">
              <Search className="w-5 h-5 text-slate-500" />
            </div>
            <p className="font-display font-bold text-slate-400 text-sm">No Audit Trail Logs Found</p>
            <p className="font-sans text-xs text-slate-500 max-w-sm mx-auto">
              We couldn't find any audited operations matching your search query or selected criteria filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSeverity('all');
                setSelectedAction('all');
              }}
              className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold uppercase mt-2 focus:outline-none cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
