import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cpu, Binary, X, ExternalLink, KeyRound, AlertTriangle } from 'lucide-react';
import { VerifiableProof } from '../types';
import {
  addressToField,
  anchorProof,
  BackendError,
  getAdminToken,
  setAdminToken,
} from '../lib/backend';
import { ACTIVE_NETWORK } from '../lib/contracts';

// Stand-ins for real disbursement data until this modal is wired to an
// actual payroll run: the connected wallet proves membership in a
// single-recipient allowlist (itself) against a fixed demo budget. These are
// sent only to the ShieldFund backend, never directly to the proof server.
const DEMO_AMOUNT_STROOPS = '1';
const DEMO_BUDGET_CAP_STROOPS = '1000000000';

type Phase = 'idle' | 'auth' | 'scanning' | 'computing' | 'validated' | 'failed';

interface ManualVerificationModalProps {
  proof: VerifiableProof | null;
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: (proofId: string) => void;
  walletAddress: string | null;
}

export default function ManualVerificationModal({
  proof,
  isOpen,
  onClose,
  onVerificationComplete,
  walletAddress,
}: ManualVerificationModalProps) {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [stellarTxHash, setStellarTxHash] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<'idle' | 'checking' | 'anchored' | 'exists' | 'error'>('idle');
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError]   = useState<string | null>(null);
  const [runId, setRunId]           = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'beep' | 'success' | 'process') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'beep') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'process') {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'success') {
        const now = ctx.currentTime;
        const playTone = (freq: number, delay: number, duration: number) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + delay);
          gain.gain.setValueAtTime(0.05, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(now + delay); osc.stop(now + delay + duration);
        };
        playTone(523.25, 0, 0.4);
        playTone(659.25, 0.12, 0.5);
        playTone(783.99, 0.24, 0.6);
        playTone(1046.50, 0.36, 0.8);
      }
    } catch (_) {}
  };

  // Reset on open/close; ask for the admin token first if we don't have one.
  useEffect(() => {
    setLogMessages([]); setCurrentMessage(''); setStellarTxHash(null); setChainStatus('idle');
    setAuthError(null);
    if (!isOpen || !proof) { setPhase('idle'); return; }
    if (getAdminToken()) startRun();
    else setPhase('auth');
  }, [isOpen, proof]);

  const startRun = () => {
    setPhase('scanning');
    setRunId(n => n + 1);
  };

  const submitToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setAdminToken(tokenInput);
    setTokenInput('');
    setAuthError(null);
    setLogMessages([]);
    startRun();
  };

  // Real verification run: prove (+ bb verify) and anchor via the backend.
  // "validated" is only reached when the backend confirms the anchor.
  useEffect(() => {
    if (runId === 0 || !isOpen || !proof) return;

    let cancelled = false;
    const log = (msg: string) => {
      if (cancelled) return;
      setLogMessages(prev => [...prev, msg]);
      setCurrentMessage(msg);
    };
    const fail = (msg: string) => {
      if (cancelled) return;
      log(`► Error: ${msg}`);
      setChainStatus('error');
      setPhase('failed');
      playSound('beep');
    };

    const run = async () => {
      playSound('beep');
      if (!walletAddress) {
        fail('No wallet connected — connect Freighter to generate a proof.');
        return;
      }

      const recipientId = addressToField(walletAddress);
      log(`► Recipient id derived from wallet: ${recipientId.slice(0, 10)}…`);

      if (cancelled) return;
      setPhase('computing');
      setChainStatus('checking');
      playSound('process');
      log('► Backend: proving payroll_compliance (Noir → bb prove → bb verify)…');

      try {
        const result = await anchorProof({
          recipientId,
          amount: DEMO_AMOUNT_STROOPS,
          proofType: proof.type ?? 'payroll',
          allowlist: [recipientId],
          budgetCap: DEMO_BUDGET_CAP_STROOPS,
        });
        if (cancelled) return;
        const hash = result.proofHash.replace(/^0x/, '');
        log(`► proof_hash: ${hash.slice(0, 8)}…${hash.slice(-6)} ✓`);
        log(`► Stellar: anchored as proof #${result.proofId}, tx ${result.txHash.slice(0, 8)}…${result.txHash.slice(-6)} ✓`);
        setStellarTxHash(result.txHash);
        setChainStatus('anchored');
        setPhase('validated');
        playSound('success');
        onVerificationComplete(proof.id);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BackendError) {
          switch (err.kind) {
            case 'unauthorized':
              setAdminToken(null);
              setAuthError(err.message);
              setChainStatus('idle');
              setPhase('auth');
              return;
            case 'duplicate':
              log('► Stellar: proof already anchored on-chain ✓');
              setChainStatus('exists');
              setPhase('validated');
              playSound('success');
              onVerificationComplete(proof.id);
              return;
            default:
              fail(err.message);
              return;
          }
        }
        fail(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    run();
    return () => { cancelled = true; };
    // Re-run only when a new run is started; closing the modal cancels it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, isOpen]);

  if (!isOpen || !proof) return null;

  const particles = Array.from({ length: 12 });

  const explorerUrl = stellarTxHash
    ? `https://stellar.expert/explorer/${ACTIVE_NETWORK === 'TESTNET' ? 'testnet' : 'public'}/tx/${stellarTxHash}`
    : null;

  const handleAttestation = () => {
    if (explorerUrl) {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // Already anchored earlier (no new tx): download a JSON attestation
    const blob = new Blob([JSON.stringify({
      proofId: proof.id, proofTitle: proof.title, proofHash: proof.hash,
      proofType: proof.type, verifiedAt: new Date().toISOString(),
      verifier: 'shieldfund-proof-server (bb verify) via shieldfund-backend', network: ACTIVE_NETWORK,
      stellarTxHash: null, anchoredOnChain: chainStatus === 'exists',
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attestation_${proof.id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const attestationLabel = () => {
    if (phase !== 'validated') return 'DOWNLOAD ATTESTATION';
    if (explorerUrl) return 'VIEW ON STELLAR EXPERT';
    return 'DOWNLOAD ATTESTATION';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col my-8"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-start relative z-10 border-b border-slate-800 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  ZK Cryptographic Verifier
                </span>
              </div>
              <h3 className="font-display font-extrabold text-2xl text-slate-100">
                Manual Attestation Validation
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">

            {/* Left: Animation panel */}
            <div className="md:col-span-6 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 min-h-[300px] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,transparent_70%)] pointer-events-none" />

              <div className="relative w-48 h-48 flex items-center justify-center">
                {phase === 'validated' && particles.map((_, i) => {
                  const angle = (i * 360) / particles.length;
                  const rad   = (angle * Math.PI) / 180;
                  return (
                    <motion.div
                      key={i}
                      className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                      animate={{ x: Math.cos(rad) * 90, y: Math.sin(rad) * 90, opacity: 0, scale: [0.5, 1.2, 0] }}
                      transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.3, delay: i * 0.04 }}
                    />
                  );
                })}

                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-500/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute p-4 rounded-full border-2 border-indigo-500/30 w-[160px] h-[160px]"
                  animate={{
                    rotate: -360,
                    scale: phase === 'computing' ? [1, 1.05, 1] : 1,
                    borderColor: phase === 'validated' ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.3)',
                  }}
                  transition={{
                    rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
                  }}
                />

                {phase === 'scanning' && (
                  <motion.div
                    className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent z-20 left-0"
                    animate={{ y: [-75, 75, -75] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                  <motion.path d="M 15 50 Q 30 25 50 50" fill="none"
                    stroke={phase === 'validated' ? '#34d399' : '#6366f1'} strokeWidth="1"
                    strokeDasharray="4 4" animate={{ strokeDashoffset: [0, -20] }}
                    transition={{ repeat: Infinity, ease: 'linear', duration: 2 }} className="opacity-40"
                  />
                  <motion.path d="M 85 50 Q 70 75 50 50" fill="none"
                    stroke={phase === 'validated' ? '#34d399' : '#6366f1'} strokeWidth="1"
                    strokeDasharray="4 4" animate={{ strokeDashoffset: [0, 20] }}
                    transition={{ repeat: Infinity, ease: 'linear', duration: 2 }} className="opacity-40"
                  />
                </svg>

                <AnimatePresence mode="wait">
                  {phase === 'validated' ? (
                    <motion.div key="validated"
                      className="absolute w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)]"
                      initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                    >
                      <svg className="w-12 h-12 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <motion.path d="M20 6L9 17L4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }} />
                      </svg>
                    </motion.div>
                  ) : phase === 'failed' ? (
                    <motion.div key="failed"
                      className="absolute w-24 h-24 rounded-full bg-rose-500/10 border-2 border-rose-400 flex flex-col items-center justify-center"
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <AlertTriangle className="w-10 h-10 text-rose-400" />
                      <span className="font-mono text-[8px] text-rose-300 mt-1 font-bold">FAILED</span>
                    </motion.div>
                  ) : phase === 'auth' ? (
                    <motion.div key="auth"
                      className="absolute w-24 h-24 rounded-full bg-slate-900 border-2 border-amber-400/60 flex flex-col items-center justify-center"
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <KeyRound className="w-10 h-10 text-amber-400" />
                      <span className="font-mono text-[8px] text-amber-300 mt-1 font-bold">LOCKED</span>
                    </motion.div>
                  ) : phase === 'computing' ? (
                    <motion.div key="computing"
                      className="absolute w-24 h-24 rounded-full bg-indigo-600/15 border-2 border-indigo-400 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <Cpu className="w-10 h-10 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="font-mono text-[8px] text-indigo-300 mt-1 font-bold">COMPUTING</span>
                    </motion.div>
                  ) : (
                    <motion.div key="scanning"
                      className="absolute w-24 h-24 rounded-full bg-slate-900 border-2 border-indigo-500/40 flex flex-col items-center justify-center"
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <Binary className="w-10 h-10 text-indigo-400 animate-pulse" />
                      <span className="font-mono text-[8px] text-indigo-400 mt-1 font-bold">ANALYZING</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {phase === 'validated' && (
                  <motion.div
                    className="absolute -bottom-2 bg-emerald-500 text-slate-950 font-mono font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-[0_0_12px_rgba(52,211,153,0.4)] border border-emerald-300/30"
                    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                  >
                    SECURITY VALIDATED
                  </motion.div>
                )}
              </div>

              <div className="w-full text-center mt-5">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  CURRENT OPERATION
                </span>
                <p className="font-sans text-sm font-semibold text-slate-200 mt-1 truncate">
                  {phase === 'auth' ? 'Admin token required' : currentMessage || 'Preparing proof request...'}
                </p>
              </div>
            </div>

            {/* Right: Report + logs */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">

                {/* Proof parameters */}
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-3">
                  <h4 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-1.5 flex justify-between">
                    <span>Proof Parameters</span>
                    <span className="text-[10px] text-indigo-400 font-normal">UltraHonk · bb verify</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Proof Title:</span>
                      <span className="text-slate-200 font-medium truncate max-w-[140px]">{proof.title}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Hash ID:</span>
                      <span className="text-slate-300 font-mono text-[10px]">{proof.hash}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">System Model:</span>
                      <span className="text-slate-300 font-mono">Noir · UltraHonk</span>
                    </div>

                    {/* Chain anchor status */}
                    {chainStatus !== 'idle' && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-900">
                        <span className="text-slate-500">Stellar Anchor:</span>
                        <span className={`font-mono text-[10px] font-bold ${
                          chainStatus === 'anchored' ? 'text-emerald-400' :
                          chainStatus === 'exists'   ? 'text-indigo-400'  :
                          chainStatus === 'error'    ? 'text-rose-400'    :
                          'text-yellow-400 animate-pulse'
                        }`}>
                          {chainStatus === 'checking'  ? 'CHECKING...' :
                           chainStatus === 'anchored'  ? 'ANCHORED ✓'  :
                           chainStatus === 'exists'    ? 'ON-CHAIN ✓'  :
                           chainStatus === 'error'     ? 'ERROR'        : ''}
                        </span>
                      </div>
                    )}

                    {/* Stellar tx link */}
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View tx on Stellar Expert
                      </a>
                    )}
                  </div>
                </div>

                {/* Admin token prompt */}
                {phase === 'auth' && (
                  <form onSubmit={submitToken} className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                    <label htmlFor="admin-token" className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
                      Backend admin token
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Proofs are generated and anchored by the ShieldFund backend. The token is kept in memory for this tab only.
                    </p>
                    {authError && <p className="text-[11px] text-rose-400">{authError}</p>}
                    <div className="flex gap-2">
                      <input
                        id="admin-token"
                        type="password"
                        autoComplete="off"
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/60"
                      />
                      <button type="submit" className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer hover:bg-amber-400">
                        Start
                      </button>
                    </div>
                  </form>
                )}

                {/* Log terminal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
                    CRYPTOGRAPHIC LOG STREAM
                  </label>
                  <div className="h-40 w-full bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[10px] text-slate-400 overflow-y-auto space-y-1.5">
                    {logMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-start gap-1.5 ${
                          i === logMessages.length - 1 ? 'text-indigo-400 font-bold' : ''
                        } ${
                          msg.includes('Complete') || msg.includes('Validated') || msg.includes('✓')
                            ? 'text-emerald-400 font-bold' : ''
                        } ${
                          msg.startsWith('► Error') ? 'text-rose-400 font-bold' : ''
                        }`}
                      >
                        <span className="text-slate-600 shrink-0 select-none">[{100 + i * 8}]</span>
                        <span className="leading-relaxed">{msg}</span>
                      </motion.div>
                    ))}
                    {(phase === 'scanning' || phase === 'computing') && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <span className="w-1.5 h-3 bg-indigo-500 animate-pulse inline-block" />
                        <span className="italic">Waiting for backend…</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 py-3 rounded-2xl font-sans text-xs font-bold transition-all border border-slate-800 active:scale-95 cursor-pointer"
                >
                  {phase === 'validated' || phase === 'failed' ? 'CLOSE REPORT' : 'CANCEL'}
                </button>

                <button
                  type="button"
                  disabled={phase !== 'validated'}
                  onClick={handleAttestation}
                  className={`flex-1 py-3 rounded-2xl font-sans text-xs font-bold transition-all border text-center flex items-center justify-center gap-2 ${
                    phase === 'validated'
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400 shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer'
                      : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {explorerUrl
                    ? <ExternalLink className="w-4 h-4" />
                    : <Shield className="w-4 h-4" />
                  }
                  <span>{attestationLabel()}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
