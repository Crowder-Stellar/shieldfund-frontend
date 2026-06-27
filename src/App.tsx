import React, { useState, useEffect } from 'react';
import { Compass, Wallet, Activity, ShieldCheck, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Subcomponents
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TreasuryTab from './components/TreasuryTab';
import CampaignsTab from './components/CampaignsTab';
import StreamsTab from './components/StreamsTab';
import ProofsTab from './components/ProofsTab';
import AuditLogTab from './components/AuditLogTab';
import NotificationsPanel from './components/NotificationsPanel';
import WalletModal from './components/WalletModal';

// Modals
import LaunchCampaignModal from './components/LaunchCampaignModal';
import CreateStreamModal from './components/CreateStreamModal';
import DepositModal from './components/DepositModal';
import DisburseModal from './components/DisburseModal';

// Initial Data & Types
import {
  initialCampaigns,
  initialVesting,
  initialStreams,
  initialProofs,
  initialTransactions,
  initialTreasury,
  initialAuditLogs,
} from './initialData';
import { Campaign, Stream, VerifiableProof, Transaction, TreasuryData, AuditLogEntry } from './types';

// Chain integration
import {
  fetchVaultStats,
  fetchStreams,
  fetchProofs,
  deposit as chainDeposit,
  disburse as chainDisburse,
} from './lib/stellar';
import { activeContracts, ACTIVE_NETWORK } from './lib/contracts';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('shieldfund_active_tab') || 'treasury';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'noir' | 'light'>(() => {
    return (localStorage.getItem('shieldfund_theme') as 'noir' | 'light') || 'noir';
  });

  useEffect(() => {
    localStorage.setItem('shieldfund_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
    localStorage.setItem('shieldfund_theme', theme);
  }, [theme]);

  // Stateful Data
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [vestingList, setVestingList] = useState(initialVesting);
  const [streams, setStreams] = useState<Stream[]>(initialStreams);
  const [proofs, setProofs] = useState<VerifiableProof[]>(initialProofs);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [treasuryData, setTreasuryData] = useState<TreasuryData>(initialTreasury);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);

  // Wallet Connection State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isChainLoading, setIsChainLoading] = useState(false);

  // Helpers
  const actor = (addr: string | null) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Demo Mode';

  // Fetch live data from Soroban contracts after wallet connect.
  // Silently falls back to demo data when contract IDs are not yet set.
  const loadChainData = async (address: string) => {
    if (!activeContracts().TREASURY_VAULT) return;
    setIsChainLoading(true);
    try {
      const [vaultStats, chainStreams, chainProofs] = await Promise.allSettled([
        fetchVaultStats(),
        fetchStreams(),
        fetchProofs(),
      ]);
      if (vaultStats.status === 'fulfilled') setTreasuryData(vaultStats.value);
      if (chainStreams.status === 'fulfilled' && chainStreams.value.length > 0) {
        setStreams(chainStreams.value);
      }
      if (chainProofs.status === 'fulfilled' && chainProofs.value.length > 0) {
        setProofs(chainProofs.value);
      }
    } catch (err) {
      console.warn('[ShieldFund] Chain read failed, keeping demo data.', err);
    } finally {
      setIsChainLoading(false);
    }
  };

  // Modal Control
  const [isLaunchCampaignOpen, setIsLaunchCampaignOpen] = useState(false);
  const [isCreateStreamOpen, setIsCreateStreamOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isDisburseOpen, setIsDisburseOpen] = useState(false);

  // Handlers
  const handleLaunchCampaign = (newCampaign: Campaign) => {
    setCampaigns((prev) => [newCampaign, ...prev]);
    const newLog: AuditLogEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      action: 'CAMPAIGN_LAUNCH',
      details: `Campaign "${newCampaign.title}" launched. Goal: ${newCampaign.goal.toLocaleString()} USDC.`,
      actor: actor(walletAddress),
      severity: 'info',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const handleCreateStream = (newStream: Stream) => {
    setStreams((prev) => [newStream, ...prev]);
    const newLog: AuditLogEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      action: 'STREAM_CREATE',
      details: `Stream "${newStream.title}" created for ${newStream.recipient}. Flow: ${newStream.flowRateAmount} USDC/month.`,
      actor: actor(walletAddress),
      severity: 'info',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const handleToggleStream = (id: string) => {
    setStreams((prev) => {
      const stream = prev.find((s) => s.id === id);
      if (stream) {
        const nextStatus = stream.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        const newLog: AuditLogEntry = {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          action: 'STREAM_TOGGLE',
          details: `Stream "${stream.title}" ${nextStatus === 'PAUSED' ? 'paused' : 'resumed'}.`,
          actor: actor(walletAddress),
          severity: nextStatus === 'PAUSED' ? 'warning' : 'success',
        };
        setAuditLogs((prevLogs) => [newLog, ...prevLogs]);
        setUnreadCount((prev) => prev + 1);
      }
      return prev.map((s) => (s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : s));
    });
  };

  const handleAddProof = (newProof: VerifiableProof) => {
    setProofs((prev) => [newProof, ...prev]);
  };

  const handleVerifyProof = (proofId: string) => {
    setProofs((prev) => {
      const proof = prev.find((p) => p.id === proofId);
      if (proof) {
        const newLog: AuditLogEntry = {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          action: 'PROOF_VERIFY',
          details: `ZK proof validated: "${proof.title}" — hash anchored on Stellar ${ACTIVE_NETWORK}.`,
          actor: actor(walletAddress),
          txHash: proof.hash,
          severity: 'success',
        };
        setAuditLogs((prevLogs) => [newLog, ...prevLogs]);
        setUnreadCount((prev) => prev + 1);
      }
      return prev.map((p) => (p.id === proofId ? { ...p, status: 'VERIFIED', date: new Date().toLocaleDateString('en-GB') } : p));
    });
  };

  const handleDeposit = async (
    amount: number,
    donor: string,
    category: 'Operational' | 'Investment' | 'Grant' | 'Other' = 'Investment',
  ): Promise<string> => {
    const txId        = 't_' + Date.now();
    const logId       = 'log_' + (Date.now() + 1);
    const pendingHash = `pending_${Date.now().toString(16)}`;

    // Optimistic balance update — shows instantly in TreasuryTab while tx processes
    const newTx: Transaction = {
      id: txId, type: 'Inflow', title: 'Inflow: USDC Deposit',
      txHash: pendingHash, senderReceiver: donor, amount, time: 'Just now', category,
    };
    setTransactions(prev => [newTx, ...prev]);
    setTreasuryData(prev => ({
      ...prev, vaultBalance: prev.vaultBalance + amount,
      totalRaised: prev.totalRaised + amount, lastAuditTime: 'Just now',
    }));
    const newLog: AuditLogEntry = {
      id: logId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      action: 'DEPOSIT',
      details: `Deposit of ${amount.toLocaleString()} USDC into vault (Category: ${category}).`,
      actor: actor(walletAddress), txHash: pendingHash, severity: 'success',
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setUnreadCount(prev => prev + 1);

    if (walletAddress && activeContracts().TREASURY_VAULT) {
      // Throws on user rejection or chain failure — modal catches and shows error
      const realHash = await chainDeposit(amount, walletAddress);
      const shortHash = `${realHash.slice(0, 6)}...${realHash.slice(-4)}`;
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, txHash: shortHash } : tx));
      setAuditLogs(prev => prev.map(l => l.id === logId ? { ...l, txHash: shortHash } : l));
      return realHash;
    }

    // Demo mode: short artificial delay so the modal lifecycle is visible
    await new Promise(r => setTimeout(r, 1000));
    return pendingHash;
  };

  const handleDisburse = async (
    amount: number,
    recipient: string,
    reason: string,
    category: 'Operational' | 'Investment' | 'Grant' | 'Other' = 'Operational',
  ): Promise<string> => {
    const txId        = 't_' + Date.now();
    const logId       = 'log_' + (Date.now() + 1);
    const pendingHash = `pending_${Date.now().toString(16)}`;

    const newTx: Transaction = {
      id: txId, type: 'Outflow', title: `Outflow: ${reason}`,
      txHash: pendingHash, senderReceiver: recipient, amount, time: 'Just now', category,
    };
    setTransactions(prev => [newTx, ...prev]);
    setTreasuryData(prev => ({
      ...prev, vaultBalance: prev.vaultBalance - amount,
      totalDisbursed: prev.totalDisbursed + amount, lastAuditTime: 'Just now',
    }));
    const newLog: AuditLogEntry = {
      id: logId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      action: 'DISBURSE',
      details: `Disbursement of ${amount.toLocaleString()} USDC to ${recipient} — "${reason}".`,
      actor: actor(walletAddress), txHash: pendingHash, severity: 'success',
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setUnreadCount(prev => prev + 1);

    const isValidStellarAddr = /^G[A-Z2-7]{55}$/.test(recipient);
    if (walletAddress && activeContracts().TREASURY_VAULT && isValidStellarAddr) {
      const realHash = await chainDisburse(recipient, amount, '0'.repeat(64), walletAddress);
      const shortHash = `${realHash.slice(0, 6)}...${realHash.slice(-4)}`;
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, txHash: shortHash } : tx));
      setAuditLogs(prev => prev.map(l => l.id === logId ? { ...l, txHash: shortHash } : l));
      return realHash;
    }

    await new Promise(r => setTimeout(r, 1000));
    return pendingHash;
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'campaigns':
        return (
          <CampaignsTab
            campaigns={campaigns}
            onOpenLaunchCampaign={() => setIsLaunchCampaignOpen(true)}
          />
        );
      case 'treasury':
        return (
          <TreasuryTab
            treasuryData={treasuryData}
            transactions={transactions}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenDisburse={() => setIsDisburseOpen(true)}
          />
        );
      case 'streams':
        return (
          <StreamsTab
            streams={streams}
            vestingList={vestingList}
            onOpenCreateStream={() => setIsCreateStreamOpen(true)}
            onToggleStream={handleToggleStream}
          />
        );
      case 'proofs':
        return (
          <ProofsTab
            proofs={proofs}
            onAddProof={handleAddProof}
            onVerifyProof={handleVerifyProof}
            walletAddress={walletAddress}
          />
        );
      case 'audit':
        return <AuditLogTab logs={auditLogs} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-hidden">
      {/* Background Cyber Grid & Ambient Orbs */}
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] dark:bg-emerald-500/[0.03] blur-[100px] pointer-events-none z-0" />

      {/* Top Header Bar */}
      <Header 
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        title="ShieldFund" 
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'noir' ? 'light' : 'noir')}
        onOpenNotifications={() => {
          setIsNotificationsOpen(true);
          setUnreadCount(0);
        }}
        unreadNotificationsCount={unreadCount}
        walletAddress={walletAddress}
        walletType={walletType}
        onConnectWalletClick={() => setIsWalletModalOpen(true)}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-row">
        {/* Desktop Persistent Sidebar Menu */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Mobile Sidebar Overlay menu */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-45 md:hidden"
              />
              {/* Sidebar container */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 h-full w-64 z-50 md:hidden"
              >
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsSidebarOpen(false);
                  }}
                  className="translate-x-0"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Content wrapper to handle sidebar width spacing */}
        <div className="flex-1 md:pl-64 min-w-0 flex flex-col">
          {/* Primary Content Panel - beautifully responsive */}
          <main className="flex-1 pt-24 px-4 md:px-8 pb-32 md:pb-12 max-w-[1200px] mx-auto w-full institutional-gradient">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                {renderActiveTab()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Floating Action Button (for launching campaign when in campaigns tab on mobile) */}
      {activeTab === 'campaigns' && (
        <button
          onClick={() => setIsLaunchCampaignOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-[0_8px_24px_rgba(99,102,241,0.4)] flex items-center justify-center hover:scale-105 hover:bg-indigo-500 active:scale-95 transition-all duration-200 z-40 md:hidden border border-indigo-500/30 cursor-pointer"
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Bottom Navigation Bar for Mobile screens */}
      <nav className="fixed bottom-0 left-0 w-full z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 h-20 flex justify-around items-center px-4 md:hidden pb-safe">
        {/* Campaigns navigation block */}
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90 duration-200 ${
            activeTab === 'campaigns'
              ? 'text-white bg-indigo-500/10 rounded-2xl px-4 py-2'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5 shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Campaigns</span>
        </button>

        {/* Treasury navigation block */}
        <button
          onClick={() => setActiveTab('treasury')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90 duration-200 ${
            activeTab === 'treasury'
              ? 'text-white bg-indigo-500/10 rounded-2xl px-4 py-2'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-5 h-5 shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Treasury</span>
        </button>

        {/* Streams navigation block */}
        <button
          onClick={() => setActiveTab('streams')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90 duration-200 ${
            activeTab === 'streams'
              ? 'text-white bg-indigo-500/10 rounded-2xl px-4 py-2'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5 shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Streams</span>
        </button>

        {/* Proofs navigation block */}
        <button
          onClick={() => setActiveTab('proofs')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90 duration-200 ${
            activeTab === 'proofs'
              ? 'text-white bg-indigo-500/10 rounded-2xl px-4 py-2'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Proofs</span>
        </button>

        {/* Audit navigation block */}
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90 duration-200 ${
            activeTab === 'audit'
              ? 'text-white bg-indigo-500/10 rounded-2xl px-4 py-2'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-5 h-5 shrink-0" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Audit</span>
        </button>
      </nav>

      {/* Modals Mounting */}
      <LaunchCampaignModal
        isOpen={isLaunchCampaignOpen}
        onClose={() => setIsLaunchCampaignOpen(false)}
        onSubmit={handleLaunchCampaign}
      />
      <CreateStreamModal
        isOpen={isCreateStreamOpen}
        onClose={() => setIsCreateStreamOpen(false)}
        onSubmit={handleCreateStream}
      />
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSubmit={handleDeposit}
      />
      <DisburseModal
        isOpen={isDisburseOpen}
        onClose={() => setIsDisburseOpen(false)}
        onSubmit={handleDisburse}
        maxAmount={treasuryData.vaultBalance}
      />

      {/* Notifications Drawer */}
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        logs={auditLogs}
        onClearLogs={() => setAuditLogs([])}
        onMarkAllAsRead={() => setUnreadCount(0)}
      />

      {/* Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        connectedAddress={walletAddress}
        connectedType={walletType}
        onConnect={async (address, _type) => {
          setWalletAddress(address);
          setWalletType('freighter');
          const short = actor(address);

          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            action: 'WALLET_CONNECT' as const,
            details: `Freighter connected on Stellar ${ACTIVE_NETWORK}. Address: ${address}`,
            actor: short,
            severity: 'success' as const,
          };
          setAuditLogs((prev) => [newLog, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Load real chain data — silently skips if contracts aren't deployed yet
          await loadChainData(address);
        }}
        onDisconnect={() => {
          const short = actor(walletAddress);
          setWalletAddress(null);
          setWalletType(null);

          // Revert to demo data so the UI stays useful while disconnected
          setTreasuryData(initialTreasury);
          setStreams(initialStreams);
          setProofs(initialProofs);

          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            action: 'WALLET_DISCONNECT' as const,
            details: `Freighter session closed for ${short}. Reverted to demo data.`,
            actor: short,
            severity: 'info' as const,
          };
          setAuditLogs((prev) => [newLog, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }}
      />
    </div>
  );
}
