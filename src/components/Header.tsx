import React, { useState, useEffect } from 'react';
import { Wallet, Bell, Menu, Cpu, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  title: string;
  theme?: 'noir' | 'light';
  onToggleTheme?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  walletAddress?: string | null;
  walletType?: string | null;
  onConnectWalletClick?: () => void;
}

export default function Header({ 
  onToggleSidebar, 
  title, 
  theme, 
  onToggleTheme, 
  onOpenNotifications, 
  unreadNotificationsCount = 0,
  walletAddress = null,
  walletType = null,
  onConnectWalletClick
}: HeaderProps) {
  const [syncStatus, setSyncStatus] = useState<'Connecting' | 'Live'>('Connecting');

  useEffect(() => {
    // Simulate brief initial blockchain connection check
    const timer = setTimeout(() => {
      setSyncStatus('Live');
    }, 1500);

    // Also support real network online/offline checks as an extra touch of realism
    const handleOnline = () => setSyncStatus('Live');
    const handleOffline = () => setSyncStatus('Connecting');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="fixed top-0 w-full z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-6 h-16">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="relative p-0.5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-emerald-500 to-indigo-600 shadow-lg shadow-indigo-500/10 shrink-0">
            <img 
              src="/src/assets/images/shield_logo_1782492391347.jpg" 
              alt="ShieldFund Logo" 
              className="w-11 h-11 rounded-[14px] object-cover border border-black/10"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col">
            <span className="brand-title-text font-display font-black text-2xl tracking-tighter leading-none bg-gradient-to-r from-slate-50 via-indigo-200 to-emerald-300 bg-clip-text text-transparent dark:from-white">
              Shield<span className="text-emerald-400 font-medium">Fund</span>
            </span>
            <span className="brand-title-sub font-mono text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">
              SOVEREIGN VAULT
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full select-none">
          <span className={`relative flex h-2 w-2`}>
            {syncStatus === 'Live' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </>
            )}
          </span>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
            {syncStatus === 'Live' ? (
              <span className="text-emerald-400">
                <span className="hidden sm:inline">NODE: </span>LIVE
              </span>
            ) : (
              <span className="text-amber-400">
                <span className="hidden sm:inline">SYNCING...</span>
                <span className="sm:hidden">SYNC</span>
              </span>
            )}
          </span>
        </div>

        {onConnectWalletClick && (
          <button
            onClick={onConnectWalletClick}
            className={`flex items-center gap-2 px-3.5 py-1.5 font-mono text-xs font-bold rounded-xl border transition-all duration-300 cursor-pointer focus:outline-none shrink-0 ${
              walletAddress
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title={walletAddress ? `Wallet Node Connected (${walletType})` : 'Connect Cryptographic Wallet Node'}
          >
            {walletAddress ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{walletAddress}</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        )}

        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 cursor-pointer focus:outline-none"
            title={theme === 'light' ? 'Switch to Noir Dark mode' : 'Switch to High Contrast Light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
          </button>
        )}

        <button 
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 cursor-pointer focus:outline-none"
          title="Recent Sovereignty Actions"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.6)] border border-slate-950 dark:border-slate-950">
              {unreadNotificationsCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-slate-600"></span>
          )}
        </button>
        
        <div className="w-8 h-8 rounded-full border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center">
          <img 
            alt="Profile" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQbnK3WuJF5IqyF9ltAoXKwTs6HyQIHkQyrkeHR6d9n5M4S4CVCWyJQA-dRNwZXkngopiVexhb5VyJN4YbudNfki5FTWG8tt0JgrM9w5jklqdjRigpo5Ea6TuCZsXBWhFEVufnUbqgsGk8aYG80La_NPcMSQoq2B3bWzYqzBloRJdXpnUulN8RZeDTNwM2W5l3mh9Zosw1bIIAUCWdQqKEt4v6WG27F0b_ZhhahnuFj1zTqJI8tBXUdh9Adcqe-STNCcE6yb08Ayk"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
