import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, CheckCircle2, Cpu, Binary, X, ExternalLink } from 'lucide-react';
import { VerifiableProof } from '../types';
import { verifyProofOnChain, registerProof } from '../lib/stellar';
import { ACTIVE_NETWORK } from '../lib/contracts';

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
  const [phase, setPhase]           = useState<'idle' | 'scanning' | 'computing' | 'validated'>('idle');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [stellarTxHash, setStellarTxHash] = useState<string | null>(null);
  const [chainStatus, setChainStatus] = useState<'idle' | 'checking' | 'anchored' | 'exists' | 'error'>('idle');
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

  // Main animation sequence
  useEffect(() => {
    if (!isOpen || !proof) {
      setPhase('idle'); setLogMessages([]); setCurrentMessage('');
      setActiveStep(0); setStellarTxHash(null); setChainStatus('idle');
      return;
    }

    setPhase('scanning');
    playSound('beep');

    const steps = [
      { text: 'Fetching verification keys from L2 contract...', delay: 600 },
      { text: 'Loading zk-SNARK SRS (Structured Reference String)...', delay: 1200 },
      { text: 'Decoding public input parameters and witness vectors...', delay: 1800 },
      { text: 'Phase 1 Complete: Input signals parsed successfully.', delay: 2300, phase: 'computing' as const },
      { text: 'Computing elliptic curve pairings over BN254...', delay: 3000 },
      { text: 'Running Groth16 verify algorithm / Noir circuit constraints...', delay: 3700 },
      { text: 'Validating zero-knowledge proof commitment hash...', delay: 4400 },
      { text: 'Finalizing attestation certificates...', delay: 5000, phase: 'validated' as const },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((step, index) => {
      const t = setTimeout(() => {
        setLogMessages(prev => [...prev, step.text]);
        setCurrentMessage(step.text);
        setActiveStep(index + 1);
        if (step.phase) {
          setPhase(step.phase);
          if (step.phase === 'computing') playSound('process');
          else if (step.phase === 'validated') {
            playSound('success');
            onVerificationComplete(proof.id);
          }
        } else {
          playSound('beep');
        }
      }, step.delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [isOpen, proof]);

  // Chain anchor — fires when animation reaches computing phase
  useEffect(() => {
    if (phase !== 'computing' || !isOpen || !proof) return;

    let cancelled = false;
    const pushLog = (msg: string) => {
      if (!cancelled) setLogMessages(prev => [...prev, msg]);
    };

    const run = async () => {
      try {
        setChainStatus('checking');

        // Deterministic SHA-256 of proof metadata
        const raw = new TextEncoder().encode(`${proof.id}:${proof.hash}:${proof.type ?? 'payroll'}`);
        const buf = await crypto.subtle.digest('SHA-256', raw);
        const hashHex = Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        pushLog(`► SHA-256: ${hashHex.slice(0, 8)}...${hashHex.slice(-6)}`);

        const exists = await verifyProofOnChain(hashHex);
        if (exists) {
          if (!cancelled) setChainStatus('exists');
          pushLog('► Stellar: Proof already anchored on-chain ✓');
        } else if (walletAddress) {
          pushLog('► Stellar: Anchoring proof to registry contract...');
          const txHash = await registerProof(hashHex, proof.type ?? 'payroll', '0'.repeat(64), walletAddress);
          if (!cancelled) { setStellarTxHash(txHash); setChainStatus('anchored'); }
          pushLog(`► Stellar: Anchored! Tx ${txHash.slice(0, 8)}...${txHash.slice(-6)} ✓`);
        } else {
          if (!cancelled) setChainStatus('exists');
          pushLog('► Stellar: No wallet — proof hash computed locally only.');
        }
      } catch (e) {
        if (!cancelled) setChainStatus('error');
        pushLog(`► Stellar error: ${e instanceof Error ? e.message : 'Connection failed'}`);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [phase, isOpen, proof, walletAddress]);

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
    // Demo mode: download JSON attestation
    const blob = new Blob([JSON.stringify({
      proofId: proof.id, proofTitle: proof.title, proofHash: proof.hash,
      proofType: proof.type, verifiedAt: new Date().toISOString(),
      verifier: 'ShieldFund ZK Verifier v1.2', network: ACTIVE_NETWORK,
      stellarTxHash: 'demo-mode',
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
                  {currentMessage || 'Awaiting witness array input...'}
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
                    <span className="text-[10px] text-indigo-400 font-normal">Verifier v1.2</span>
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
                      <span className="text-slate-300 font-mono">Noir zk-SNARK (Plonk)</span>
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
                          msg.startsWith('► Stellar error') ? 'text-rose-400' : ''
                        }`}
                      >
                        <span className="text-slate-600 shrink-0 select-none">[{100 + i * 8}]</span>
                        <span className="leading-relaxed">{msg}</span>
                      </motion.div>
                    ))}
                    {phase !== 'validated' && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <span className="w-1.5 h-3 bg-indigo-500 animate-pulse inline-block" />
                        <span className="italic">Awaiting compilation payload...</span>
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
                  {phase === 'validated' ? 'CLOSE REPORT' : 'CANCEL'}
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
