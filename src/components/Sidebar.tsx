import React from 'react';
import { Compass, Wallet, Activity, ShieldCheck, HelpCircle, History } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
}

export default function Sidebar({ activeTab, setActiveTab, className = '' }: SidebarProps) {
  const [bh, setBh] = React.useState(19452192);
  const [gas, setGas] = React.useState(14);
  const [peers, setPeers] = React.useState(12);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setBh(prev => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setGas(() => Math.floor(Math.random() * 6) + 10);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setPeers(prev => Math.max(8, Math.min(16, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'campaigns', label: 'Campaigns', icon: Compass, desc: 'Discover & support initiatives' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, desc: 'Vault balance & activity' },
    { id: 'streams', label: 'Streams', icon: Activity, desc: 'Real-time payment flows' },
    { id: 'proofs', label: 'ZK Proofs', icon: ShieldCheck, desc: 'On-chain attestations' },
    { id: 'audit', label: 'Audit', icon: History, desc: 'Compliance ledger' },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col pt-16 z-30 transition-transform duration-300 md:translate-x-0 ${className}`}>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="text-xs font-mono font-medium tracking-[0.2em] text-indigo-400/80 uppercase pl-3">
            Navigation
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-300 cursor-pointer text-left group ${
                    isActive
                      ? 'bg-indigo-500/10 border-l-2 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'hover:bg-slate-900/50 text-slate-400 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'
                  }`} />
                  <div>
                    <div className="font-display font-semibold text-sm leading-none mb-1">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 group-hover:text-slate-400 leading-none">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Brand signature & Live Validator Heartbeat Monitor */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <div className="glass-card p-4 rounded-2xl text-xs space-y-3 bg-slate-900/40 relative overflow-hidden group">
            {/* Pulsing indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono font-bold uppercase text-[10px] tracking-wider text-emerald-400">
                  Sovereign Node
                </span>
              </div>
              <span className="font-mono text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                ACTIVE
              </span>
            </div>

            {/* Simulated Live telemetry details */}
            <div className="space-y-2 pt-1 font-mono text-[10px]">
              <div className="flex justify-between text-slate-400">
                <span>Block Height:</span>
                <span className="text-slate-200 font-bold transition-all duration-300">
                  #{bh.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>ZK Prover Gas:</span>
                <span className="text-amber-400 font-bold">
                  {gas} Gwei
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Peer Attesters:</span>
                <span className="text-slate-300">
                  {peers} Online
                </span>
              </div>

              {/* Progress verification ticker line */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-tight">
                  <span>Proving Cycle</span>
                  <span className="text-indigo-400">99.8% Solvency</span>
                </div>
                <div className="w-full bg-slate-950/80 rounded-full h-1 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300 animate-[pulse_2s_infinite]"
                    style={{ width: '82%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
