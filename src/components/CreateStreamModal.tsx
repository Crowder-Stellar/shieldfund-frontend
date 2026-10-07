import React, { useState } from 'react';
import { X, Activity, DollarSign, UserCheck, AlertTriangle } from 'lucide-react';
import { NewStreamInput } from '../types';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves once the stream exists (on-chain in live mode); rejects with a displayable error. */
  onSubmit: (input: NewStreamInput) => Promise<void>;
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function CreateStreamModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateStreamModalProps) {
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const close = () => {
    if (isSubmitting) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipient || !flowRate || !endDate) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        recipient: recipient.trim(),
        flowRateMonthly: parseFloat(flowRate),
        endDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the stream.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setTitle('');
    setRecipient('');
    setFlowRate('');
    setEndDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden group">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-bold text-xl text-slate-100">Create Capital Stream</h3>
          </div>
          <button
            onClick={close}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Stream/Vesting Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Q3 Operational Stream"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Recipient Wallet Address (ZK-Shielded)
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                required
                placeholder="G... Stellar address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Flow Rate (USDC per Month)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="number"
                required
                min="1"
                placeholder="e.g., 5000"
                value={flowRate}
                onChange={(e) => setFlowRate(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Stream End Date
            </label>
            <input
              type="date"
              required
              min={tomorrow()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl font-sans text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-wait text-white py-3 rounded-2xl font-sans text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer border border-indigo-500/30"
            >
              {isSubmitting ? 'WAITING FOR SIGNATURE…' : 'START STREAM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
