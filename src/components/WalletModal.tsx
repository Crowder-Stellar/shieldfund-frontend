import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Wallet, Check, Copy, Star, Shield,
  ExternalLink, RefreshCw, Cpu,
} from 'lucide-react';
import { connectFreighter, isFreighterInstalled } from '../lib/stellar';
import { ACTIVE_NETWORK, activeConfig } from '../lib/contracts';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedAddress: string | null;
  connectedType: string | null;
  onConnect: (address: string, type: string) => void;
  onDisconnect: () => void;
}

type ConnectPhase = 'select' | 'connecting' | 'error';

export default function WalletModal({
  isOpen,
  onClose,
  connectedAddress,
  connectedType,
  onConnect,
  onDisconnect,
}: WalletModalProps) {
  const [phase, setPhase] = useState<ConnectPhase>('select');
  const [connectLogs, setConnectLogs] = useState<string[]>([]);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Reset phase on open / close
  useEffect(() => {
    if (!isOpen) {
      setPhase('select');
      setConnectLogs([]);
      setConnectError(null);
    }
  }, [isOpen]);

  // Fetch live XLM balance from Horizon when connected
  useEffect(() => {
    if (!connectedAddress) { setXlmBalance(null); return; }
    const { horizonUrl } = activeConfig();
    fetch(`${horizonUrl}/accounts/${connectedAddress}`)
      .then(r => r.json())
      .then((data: { balances?: Array<{ asset_type: string; balance: string }> }) => {
        const b = data.balances?.find(b => b.asset_type === 'native');
        setXlmBalance(b ? parseFloat(b.balance).toFixed(2) : '—');
      })
      .catch(() => setXlmBalance('—'));
  }, [connectedAddress]);

  // Keep terminal log view scrolled to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [connectLogs]);

  const pushLog = (msg: string) =>
    setConnectLogs(prev => [...prev, msg]);

  const handleConnect = async () => {
    setPhase('connecting');
    setConnectLogs([]);
    setConnectError(null);

    try {
      pushLog('Checking Freighter extension...');
      await new Promise(r => setTimeout(r, 250));

      const installed = await isFreighterInstalled();
      if (!installed) {
        throw new Error(
          'Freighter is not installed. Get it at freighter.app'
        );
      }

      pushLog('Extension detected — requesting account access...');
      await new Promise(r => setTimeout(r, 150));

      // connectFreighter: requestAccess → getAddress (may open Freighter popup)
      const address = await connectFreighter();

      pushLog('Stellar keypair authenticated.');
      pushLog(`Address: ${address.slice(0, 8)}...${address.slice(-6)}`);
      pushLog(`Network: Stellar ${ACTIVE_NETWORK === 'TESTNET' ? 'Testnet' : 'Mainnet'}`);
      pushLog('Session established — loading vault data...');

      await new Promise(r => setTimeout(r, 600));

      onConnect(address, 'freighter');
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Connection failed. Please try again.';
      setConnectError(msg);
      pushLog(`Error: ${msg}`);
      setPhase('error');
    }
  };

  const handleCopy = () => {
    if (!connectedAddress) return;
    navigator.clipboard.writeText(connectedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const short = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const networkLabel =
    ACTIVE_NETWORK === 'TESTNET' ? 'Testnet' : 'Mainnet';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 cursor-pointer"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-lg bg-slate-950/95 dark:bg-white border border-slate-800/80 dark:border-slate-200 shadow-2xl rounded-3xl overflow-hidden pointer-events-auto flex flex-col"
            >
              {/* ── Header ─────────────────────────────────────── */}
              <div className="p-6 border-b border-slate-800/50 dark:border-slate-200/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 dark:bg-indigo-50 border border-indigo-500/20 dark:border-indigo-100 rounded-xl">
                    <Wallet className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-slate-100 dark:text-slate-900">
                      {connectedAddress ? 'Stellar Wallet' : 'Connect Wallet'}
                    </h3>
                    <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                      {connectedAddress
                        ? `${networkLabel} · Active Session`
                        : `Stellar ${networkLabel} · Freighter`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-800 hover:bg-slate-800/50 dark:hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Connected state ─────────────────────────────── */}
              {connectedAddress ? (
                <div className="p-6 space-y-5">
                  {/* Address card */}
                  <div className="glass-card p-5 rounded-2xl bg-slate-900/30 dark:bg-slate-50 border border-slate-800/50 dark:border-slate-200/60 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.03] rounded-full blur-2xl" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                          <Star className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Freighter · Connected
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-sm font-bold text-slate-200 dark:text-slate-800">
                              {short(connectedAddress)}
                            </span>
                            <button
                              onClick={handleCopy}
                              title="Copy full address"
                              className="text-slate-500 hover:text-white dark:hover:text-slate-800 transition-colors p-1 rounded cursor-pointer"
                            >
                              {copied
                                ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400 dark:text-indigo-600 bg-indigo-500/10 dark:bg-indigo-50 border border-indigo-500/20 px-2 py-1 rounded-lg font-bold">
                        {networkLabel}
                      </span>
                    </div>
                  </div>

                  {/* Balance cards */}
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="glass-card p-4 rounded-xl bg-slate-900/10 dark:bg-slate-50/50 border border-slate-900 dark:border-slate-200 text-center space-y-1">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase">
                        XLM Balance
                      </span>
                      <p className="text-sm font-bold text-slate-200 dark:text-slate-800">
                        {xlmBalance === null ? '…' : `${xlmBalance} XLM`}
                      </p>
                      <p className="text-[9px] text-slate-500">Native Stellar</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl bg-slate-900/10 dark:bg-slate-50/50 border border-slate-900 dark:border-slate-200 text-center space-y-1">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase">
                        Vault Access
                      </span>
                      <p className="text-sm font-bold text-emerald-400">AUTHORIZED</p>
                      <p className="text-[9px] text-slate-500">ZK-Anchored</p>
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/20 dark:bg-slate-50 border border-slate-800/40 dark:border-slate-100 text-xs">
                    <Cpu className="w-4 h-4 text-indigo-400 dark:text-indigo-600 shrink-0" />
                    <p className="text-slate-400 dark:text-slate-600 leading-relaxed">
                      Freighter signs every transaction locally. Private keys never leave your device.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 font-mono text-xs font-bold py-3 px-4 rounded-xl border border-slate-800 dark:border-slate-200 bg-slate-900 dark:bg-slate-50 text-slate-300 dark:text-slate-700 hover:text-white dark:hover:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer text-center"
                    >
                      Keep Connected
                    </button>
                    <button
                      onClick={() => { onDisconnect(); onClose(); }}
                      className="flex-1 font-mono text-xs font-bold py-3 px-4 rounded-xl bg-rose-500/10 dark:bg-rose-50 hover:bg-rose-500/20 text-rose-400 dark:text-rose-600 border border-rose-500/20 transition-all cursor-pointer text-center"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

              ) : phase === 'connecting' || phase === 'error' ? (
                /* ── Connecting / error phase ─────────────────── */
                <div className="p-6 space-y-6 text-center">
                  {/* Spinner */}
                  <div className="relative w-20 h-20 mx-auto mt-4">
                    <div
                      className={`absolute inset-0 border border-dashed ${
                        phase === 'error' ? 'border-rose-500/30' : 'border-indigo-500/30'
                      } rounded-full animate-[spin_8s_linear_infinite]`}
                    />
                    <div
                      className={`absolute inset-2 border ${
                        phase === 'error' ? 'border-rose-400/20' : 'border-emerald-400/20'
                      } rounded-full animate-[spin_4s_linear_infinite_reverse]`}
                    />
                    <div
                      className={`absolute inset-4 rounded-full border flex items-center justify-center ${
                        phase === 'error'
                          ? 'bg-rose-500/5 border-rose-500/20'
                          : 'bg-indigo-500/5 border-indigo-500/20'
                      }`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          phase === 'error' ? 'text-rose-400' : 'text-indigo-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display font-black text-slate-200 dark:text-slate-800">
                      {phase === 'error' ? 'Connection Failed' : 'Connecting to Freighter...'}
                    </h4>
                    <p
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                        phase === 'error'
                          ? 'text-rose-400'
                          : 'text-indigo-400 animate-pulse'
                      }`}
                    >
                      {phase === 'error'
                        ? 'See error below'
                        : 'Check the Freighter popup in your browser'}
                    </p>
                  </div>

                  {/* Terminal log */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 font-mono text-left text-[10px] space-y-1.5 h-44 overflow-y-auto custom-scrollbar shadow-inner">
                    {connectLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-600 select-none">&gt;</span>
                        <span
                          className={
                            log.startsWith('Error:')
                              ? 'text-rose-400 font-black'
                              : log.startsWith('Session established')
                              ? 'text-emerald-400 font-black'
                              : i === connectLogs.length - 1
                              ? 'text-indigo-400 font-black'
                              : 'text-slate-400'
                          }
                        >
                          {log}
                        </span>
                      </div>
                    ))}
                    {phase === 'connecting' && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-[9px] animate-pulse">
                        <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce" />
                        <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce delay-100" />
                        <span className="h-1 w-1 bg-slate-500 rounded-full animate-bounce delay-200" />
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>

                  {/* Error actions */}
                  {phase === 'error' && (
                    <div className="space-y-2">
                      {connectError?.includes('freighter.app') && (
                        <a
                          href="https://freighter.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full font-mono text-xs font-bold py-3 px-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Get Freighter Wallet
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setPhase('select');
                          setConnectLogs([]);
                          setConnectError(null);
                        }}
                        className="flex items-center justify-center gap-2 w-full font-mono text-xs font-bold py-3 px-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

              ) : (
                /* ── Select phase (default) ────────────────────── */
                <div className="p-6 space-y-5">
                  <p className="text-xs text-slate-400 dark:text-slate-600 font-sans font-medium leading-relaxed">
                    Connect your Freighter wallet to authorize on-chain deposits, create
                    payment streams, and anchor ZK proofs on the Stellar network.
                  </p>

                  {/* Freighter button */}
                  <button
                    onClick={handleConnect}
                    className="w-full text-left glass-card p-4 rounded-2xl border border-slate-800 dark:border-slate-200/80 bg-slate-900/10 hover:bg-slate-900/40 dark:hover:bg-slate-50 hover:border-indigo-500/40 dark:hover:border-slate-300 transition-all duration-300 flex items-center justify-between gap-4 group cursor-pointer relative overflow-hidden"
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-indigo-500/[0.04] to-transparent pointer-events-none" />

                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-100 border border-slate-800 dark:border-slate-200 group-hover:border-indigo-500/40 flex items-center justify-center transition-colors">
                        <Star className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-slate-200 dark:text-slate-800 text-sm">
                            Freighter
                          </span>
                          <span className="font-mono text-[8px] font-black tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                            Stellar Native
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5 leading-tight block">
                          Official Stellar browser wallet — by SDF
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 relative z-10 text-lg leading-none">
                      →
                    </span>
                  </button>

                  {/* Footer links */}
                  <div className="pt-1 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        Non-custodial · Stellar {networkLabel} · Soroban-ready
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 justify-center">
                      <span>Don't have Freighter?</span>
                      <a
                        href="https://freighter.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors"
                      >
                        freighter.app&nbsp;
                        <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
