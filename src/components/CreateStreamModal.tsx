import React, { useState } from 'react';
import { X, Activity, DollarSign, UserCheck } from 'lucide-react';
import { Stream } from '../types';

interface CreateStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stream: Stream) => void;
}

export default function CreateStreamModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateStreamModalProps) {
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !recipient || !flowRate) return;

    // Check key formatting, display standard format
    let formattedKey = recipient.trim();
    if (formattedKey.length > 10) {
      formattedKey = `${formattedKey.substring(0, 6)}...${formattedKey.substring(formattedKey.length - 4)}`;
    }

    const newStream: Stream = {
      id: 's_' + Date.now(),
      title,
      recipient: formattedKey,
      accumulatedValue: 0.0,
      flowRateAmount: parseFloat(flowRate),
      endDate: endDate || 'Dec 31, 2026',
      status: 'ACTIVE',
    };

    onSubmit(newStream);
    // Reset state
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
            onClick={onClose}
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
                placeholder="0x71C...4f2E or similar public key"
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
              Stream Expiration Date (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Dec 31, 2026"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl font-sans text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-sans text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer border border-indigo-500/30"
            >
              START STREAM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
