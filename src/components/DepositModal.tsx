import React, { useState, useEffect } from 'react';
import { X, PlusCircle, DollarSign, Wallet, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { ACTIVE_NETWORK } from '../lib/contracts';

type TxStatus = 'idle' | 'processing' | 'confirmed' | 'failed';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    donor: string,
    category: 'Operational' | 'Investment' | 'Grant' | 'Other',
  ) => Promise<string>;
}

export default function DepositModal({ isOpen, onClose, onSubmit }: DepositModalProps) {
  const [amount, setAmount]     = useState('');
  const [donor, setDonor]       = useState('');
  const [category, setCategory] = useState<'Operational' | 'Investment' | 'Grant' | 'Other'>('Investment');

  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash]     = useState<string | null>(null);
  const [txError, setTxError]   = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Auto-close countdown after confirmed
  useEffect(() => {
    if (txStatus !== 'confirmed') return;
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown(n => {
        if (n <= 1) {
          clearInterval(iv);
          handleClose();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [txStatus]);

  if (!isOpen) return null;

  const resetForm = () => {
    setAmount(''); setDonor(''); setCategory('Investment');
    setTxStatus('idle'); setTxHash(null); setTxError(null);
  };

  const handleClose = () => {
    if (txStatus === 'processing') return; // block while signing
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    setTxStatus('processing');
    setTxError(null);
    try {
      const hash = await onSubmit(parseFloat(amount), donor.trim() || 'Private Donor', category);
      setTxHash(hash);
      setTxStatus('confirmed');
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Transaction failed.');
      setTxStatus('failed');
    }
  };

  const explorerUrl = txHash && !txHash.startsWith('pending_')
    ? `https://stellar.expert/explorer/${ACTIVE_NETWORK === 'TESTNET' ? 'testnet' : 'public'}/tx/${txHash}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-display font-bold text-xl text-slate-100">Deposit to Treasury</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={txStatus === 'processing'}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Status overlay ───────────────────────────────────── */}
        {txStatus !== 'idle' ? (
          <div className="relative z-10 flex flex-col items-center text-center gap-5 py-4">

            {txStatus === 'processing' && (
              <>
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg text-slate-100">Processing Transaction</p>
                  <p className="font-mono text-xs text-indigo-400 animate-pulse mt-1">
                    {parseFloat(amount).toLocaleString()} USDC
                  </p>
                </div>
                <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2 font-mono text-[11px]">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    Awaiting Freighter signature...
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    Confirming on Stellar {ACTIVE_NETWORK === 'TESTNET' ? 'Testnet' : 'Mainnet'}...
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Check the Freighter extension popup to sign.
                </p>
              </>
            )}

            {txStatus === 'confirmed' && (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg text-slate-100">Deposit Confirmed</p>
                  <p className="font-mono text-xs text-emerald-400 mt-1">
                    {parseFloat(amount).toLocaleString()} USDC added to vault
                  </p>
                </div>
                {txHash && (
                  <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
                    <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                      Transaction
                    </p>
                    <p className="font-mono text-xs text-slate-300 break-all">
                      {txHash.startsWith('pending_') ? '(Demo mode)' : txHash}
                    </p>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View on Stellar Expert
                      </a>
                    )}
                  </div>
                )}
                <button
                  onClick={handleClose}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-2xl font-sans text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  CLOSE ({countdown}s)
                </button>
              </>
            )}

            {txStatus === 'failed' && (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-rose-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-lg text-slate-100">Transaction Failed</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    {txError ?? 'An unknown error occurred.'}
                  </p>
                </div>
                <div className="w-full flex gap-3">
                  <button
                    onClick={() => setTxStatus('idle')}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-sans text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    TRY AGAIN
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl font-sans text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-700"
                  >
                    CLOSE
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Normal form ──────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Deposit Amount (USDC)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g., 25000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
                Sender Name / Entity (Optional)
              </label>
              <div className="relative">
                <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g., Institutional Partner"
                  value={donor}
                  onChange={e => setDonor(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as typeof category)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-sm transition-all cursor-pointer appearance-none"
                style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748b' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path d='M19 9l-7 7-7-7' stroke-linecap='round' stroke-linejoin='round'></path></svg>\")", backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
              >
                <option value="Operational" className="bg-slate-950">Operational</option>
                <option value="Investment" className="bg-slate-950">Investment</option>
                <option value="Grant" className="bg-slate-950">Grant</option>
                <option value="Other" className="bg-slate-950">Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl font-sans text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-2xl font-sans text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer border border-emerald-500/30"
              >
                SUBMIT DEPOSIT
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
