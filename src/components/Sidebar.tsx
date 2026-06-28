import React from 'react';
import { Compass, Wallet, Activity, ShieldCheck, History } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  className?: string;
}

export default function Sidebar({ activeTab, setActiveTab, className = '' }: SidebarProps) {
  const [bh, setBh] = React.useState(19452192);

  React.useEffect(() => {
    const timer = setInterval(() => setBh(prev => prev + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { id: 'campaigns', label: 'Campaigns', icon: Compass },
    { id: 'treasury',  label: 'Treasury',  icon: Wallet },
    { id: 'streams',   label: 'Streams',   icon: Activity },
    { id: 'proofs',    label: 'ZK Proofs', icon: ShieldCheck },
    { id: 'audit',     label: 'Audit',     icon: History },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-full w-56 bg-slate-950 border-r border-slate-800/80 flex flex-col pt-16 z-30 transition-transform duration-300 md:translate-x-0 ${className}`}>
      <div className="px-4 py-6 flex-1 flex flex-col justify-between">
        {/* Nav */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-left group ${
                  isActive
                    ? 'bg-indigo-500/10 border-l-2 border-indigo-500 text-white'
                    : 'hover:bg-slate-900/50 text-slate-400 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-display font-medium text-sm leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Compact node status strip */}
        <div className="border-t border-slate-800/60 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Testnet
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              #{bh.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 mx-1">
            <div className="w-full bg-slate-900 rounded-full h-0.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full animate-[pulse_2s_infinite]"
                style={{ width: '82%' }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
