import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, ArrowDownLeft, ArrowUpRight, PlusCircle, Play, Pause, Trash2, Check, ExternalLink, Copy, Sparkles, Bell, Wallet } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onClearLogs?: () => void;
  onMarkAllAsRead?: () => void;
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onMarkAllAsRead
}: NotificationsPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleCopyHash = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateVerification = (id: string) => {
    setVerifyingId(id);
    setTimeout(() => {
      setVerifyingId(null);
    }, 1800);
  };

  const getActionIcon = (action: string, severity: string) => {
    switch (action) {
      case 'CAMPAIGN_LAUNCH':
        return <PlusCircle className="w-4 h-4 text-indigo-400" />;
      case 'STREAM_CREATE':
        return <Play className="w-4 h-4 text-emerald-400" />;
      case 'STREAM_TOGGLE':
        return <Pause className="w-4 h-4 text-amber-400" />;
      case 'PROOF_VERIFY':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'DEPOSIT':
        return <ArrowDownLeft className="w-4 h-4 text-teal-400" />;
      case 'DISBURSE':
        return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      case 'WALLET_CONNECT':
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'WALLET_DISCONNECT':
        return <Wallet className="w-4 h-4 text-slate-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'critical':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      default:
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Right Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-slate-950 border-l border-slate-800/80 shadow-2xl z-50 flex flex-col focus:outline-none"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <Bell className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-100 dark:text-slate-900 flex items-center gap-2">
                    Recent Sovereignty Actions
                  </h3>
                  <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                    Safe Vault Ledger Feed
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header actions */}
            {logs.length > 0 && (
              <div className="px-6 py-2 bg-slate-900/40 border-b border-slate-800/40 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">
                  {logs.length} Total actions logged
                </span>
                <div className="flex items-center gap-3">
                  {onMarkAllAsRead && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="font-mono text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors uppercase"
                    >
                      Clear Badge
                    </button>
                  )}
                  {onClearLogs && (
                    <button
                      onClick={onClearLogs}
                      className="font-mono text-[10px] text-slate-500 hover:text-rose-400 font-bold transition-colors flex items-center gap-1 uppercase"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Feed
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="w-12 h-12 rounded-full border border-dashed border-slate-800 flex items-center justify-center text-slate-600">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">No recent actions</p>
                    <p className="text-xs text-slate-500 mt-1">
                      New blockchain state transitions will appear here in real time.
                    </p>
                  </div>
                </div>
              ) : (
                logs.map((log) => {
                  const isVerifying = verifyingId === log.id;
                  return (
                    <motion.div
                      layout
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/10 space-y-3 relative overflow-hidden group hover:border-slate-700 transition-colors"
                    >
                      {/* Action Icon and Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 border rounded-lg shrink-0 ${getSeverityBg(log.severity)}`}>
                            {getActionIcon(log.action, log.severity)}
                          </div>
                          <div>
                            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-slate-400">
                              {log.action.replace('_', ' ')}
                            </span>
                            <div className="font-mono text-[9px] text-slate-500 mt-0.5">
                              {log.timestamp}
                            </div>
                          </div>
                        </div>
                        <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase ${
                          log.severity === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {log.severity}
                        </span>
                      </div>

                      {/* Details Description */}
                      <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                        {log.details}
                      </p>

                      {/* Transaction Hash & Cryptographic Mocking */}
                      <div className="pt-2 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] text-slate-500 uppercase">Actor:</span>
                          <span className="font-mono text-[9px] text-slate-300 font-bold">
                            {log.actor}
                          </span>
                        </div>

                        {log.txHash && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyHash(log.id, log.txHash || '')}
                              className="font-mono text-[9px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 cursor-pointer"
                              title="Copy transaction hash to clipboard"
                            >
                              <span className="opacity-80">Tx: {log.txHash}</span>
                              {copiedId === log.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Interactive Proof Verification Tool (specifically for proving milestones inside notification panel) */}
                      {log.action === 'PROOF_VERIFY' && (
                        <div className="pt-1.5">
                          <button
                            onClick={() => handleSimulateVerification(log.id)}
                            disabled={isVerifying}
                            className={`w-full font-mono text-[9px] font-bold py-1.5 px-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer ${
                              isVerifying 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {isVerifying ? (
                              <>
                                <Sparkles className="w-3 h-3 animate-spin text-emerald-400" />
                                Re-verifying SNARK Proof...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                                Validate Cryptographic Proof (Local Node)
                              </>
                            )}
                          </button>
                          {isVerifying && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[8px] text-slate-400 space-y-1"
                            >
                              <div className="flex justify-between">
                                <span className="text-emerald-500">✔ Proving Key Match</span>
                                <span className="text-slate-600">100% OK</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-emerald-500">✔ Witness Assigned</span>
                                <span className="text-slate-600">R1CS Constraint Solved</span>
                              </div>
                              <div className="text-[7px] text-indigo-400 truncate mt-0.5">
                                [A = 0x2af6, B = 0x89ee, C = 0xbc11]
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 text-center">
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                End-to-End Cryptographically Shielded
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
