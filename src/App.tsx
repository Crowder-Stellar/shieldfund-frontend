import React, { useState, useEffect } from 'react';
import { Compass, Wallet, Activity, ShieldCheck, History, FlaskConical, Radio } from 'lucide-react';
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

// Demo Data & Types
import {
  demoCampaigns,
  demoVesting,
  demoStreams,
  demoProofs,
  demoTransactions,
  demoTreasury,
  demoAuditLogs,
} from './demoData';
import { Campaign, MilestoneVesting, NewStreamInput, Stream, VerifiableProof, Transaction, TreasuryData, AuditLogEntry } from './types';
import shieldLogo from './assets/images/shield-logo.jpg';

// Chain integration
import {
  fetchVaultStats,
  fetchStreams,
  fetchProofs,
  deposit as chainDeposit,
  disburse as chainDisburse,
  createStream as chainCreateStream,
  toggleStream as chainToggleStream,
} from './lib/stellar';
import { fetchCampaigns, type BackendCampaign } from './lib/backend';
import { activeContracts, ACTIVE_NETWORK, STROOPS_PER_USDC } from './lib/contracts';

const EMPTY_TREASURY: TreasuryData = { vaultBalance: 0, totalRaised: 0, totalDisbursed: 0, lastAuditTime: '—' };

/**
 * 'loading' until the first read finishes; 'live' when the dashboard shows
 * real contract/backend data; 'demo' when it falls back to sample data
 * (contracts not configured or Stellar unreachable) — always labelled in the UI.
 */
type DataMode = 'loading' | 'live' | 'demo';

function campaignFromBackend(c: BackendCampaign): Campaign {
  const meta = c.metadata ?? {};
  const image = typeof meta.image === 'string' && meta.image.startsWith('https://') ? meta.image : shieldLogo;
  return {
    id: c.id,
    title: c.title,
    description: typeof meta.description === 'string' ? meta.description : '',
    raised: 0,
    goal: Number(BigInt(c.goal)) / Number(STROOPS_PER_USDC),
    image,
    zkVerified: false,
  };
}

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

  // Stateful Data — starts empty; filled by live reads or, failing that, demo data
  const [dataMode, setDataMode] = useState<DataMode>('loading');
  const [demoReason, setDemoReason] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [vestingList, setVestingList] = useState<MilestoneVesting[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [proofs, setProofs] = useState<VerifiableProof[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [treasuryData, setTreasuryData] = useState<TreasuryData>(EMPTY_TREASURY);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Wallet Connection State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isChainLoading, setIsChainLoading] = useState(false);

  // Helpers
  const actor = (addr: string | null) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Demo Mode';

  const enterDemoMode = (reason: string) => {
    setDataMode('demo');
    setDemoReason(reason);
    setCampaigns(demoCampaigns);
    setVestingList(demoVesting);
    setStreams(demoStreams);
    setProofs(demoProofs);
    setTransactions(demoTransactions);
    setTreasuryData(demoTreasury);
    setAuditLogs(demoAuditLogs);
    setUnreadCount(demoAuditLogs.length);
  };

  // Read live state from the Soroban contracts (simulation — no wallet needed)
  // and campaign metadata from the backend. Falls back to clearly-labelled
  // demo data if contracts aren't configured or the chain reads fail.
  const loadLiveData = async () => {
    const ids = activeContracts();
    if (!ids.TREASURY_VAULT || !ids.STREAMING || !ids.PROOF_REGISTRY) {
      enterDemoMode('Contract IDs are not configured.');
      return;
    }
    setIsChainLoading(true);
    try {
      const [vaultStats, chainStreams, chainProofs, backendCampaigns] = await Promise.allSettled([
        fetchVaultStats(),
        fetchStreams(),
        fetchProofs(),
        fetchCampaigns(),
      ]);
      if (
        vaultStats.status !== 'fulfilled' ||
        chainStreams.status !== 'fulfilled' ||
        chainProofs.status !== 'fulfilled'
      ) {
        const reasons = [vaultStats, chainStreams, chainProofs]
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
        console.warn('[ShieldFund] Live chain read failed — showing demo data:', reasons.join(' | '));
        enterDemoMode(`Could not read contracts on Stellar ${ACTIVE_NETWORK}.`);
        return;
      }

      setDataMode('live');
      setDemoReason('');
      setTreasuryData(vaultStats.value);
      setStreams(chainStreams.value);
      setProofs(chainProofs.value);
      if (backendCampaigns.status === 'fulfilled') {
        setCampaigns(backendCampaigns.value.map(campaignFromBackend));
      } else {
        console.warn('[ShieldFund] Backend campaigns unavailable.', backendCampaigns.reason);
        setCampaigns([]);
      }
      // No on-chain source for these yet — show nothing rather than samples.
      setVestingList([]);
      setTransactions([]);
      setAuditLogs([]);
      setUnreadCount(0);
    } finally {
      setIsChainLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

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

  const [streamActionError, setStreamActionError] = useState<string | null>(null);
  const [pendingStreamId, setPendingStreamId] = useState<string | null>(null);

  const logStreamAction = (entry: Pick<AuditLogEntry, 'action' | 'details' | 'severity' | 'txHash'>) => {
    setAuditLogs((prev) => [{
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: actor(walletAddress),
      ...entry,
    }, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  // Re-read streams from the contract after a write, so the UI shows chain state.
  const refreshStreams = async () => {
    try {
      setStreams(await fetchStreams());
    } catch (err) {
      console.warn('[ShieldFund] Could not refresh streams after write.', err);
    }
  };

  const requireLiveWallet = (what: string): string => {
    if (!walletAddress) throw new Error(`Connect a Freighter wallet to ${what}.`);
    return walletAddress;
  };

  const handleCreateStream = async (input: NewStreamInput): Promise<void> => {
    const details = `Stream "${input.title}" for ${input.recipient}. Flow: ${input.flowRateMonthly} USDC/month until ${input.endDate}.`;

    if (dataMode === 'live') {
      // Live: the stream only exists once create_stream succeeds on-chain.
      const signer = requireLiveWallet('create a stream');
      if (!/^G[A-Z2-7]{55}$/.test(input.recipient)) {
        throw new Error('Recipient must be a Stellar G... address.');
      }
      const txHash = await chainCreateStream(input.recipient, input.flowRateMonthly, input.endDate, signer);
      logStreamAction({ action: 'STREAM_CREATE', details, severity: 'info', txHash });
      await refreshStreams();
      return;
    }

    // Demo mode: local only — nothing is sent to Stellar.
    const short = input.recipient.length > 10
      ? `${input.recipient.slice(0, 6)}...${input.recipient.slice(-4)}`
      : input.recipient;
    setStreams((prev) => [{
      id: 's_' + Date.now(),
      title: input.title,
      recipient: short,
      accumulatedValue: 0,
      flowRateAmount: input.flowRateMonthly,
      endDate: new Date(input.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'ACTIVE',
    }, ...prev]);
    logStreamAction({ action: 'STREAM_CREATE', details, severity: 'info' });
  };

  const handleToggleStream = async (id: string) => {
    const stream = streams.find((s) => s.id === id);
    if (!stream || pendingStreamId) return;
    const nextStatus = stream.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const details = `Stream "${stream.title}" ${nextStatus === 'PAUSED' ? 'paused' : 'resumed'}.`;
    setStreamActionError(null);

    if (dataMode === 'live') {
      // On-chain stream ids are rendered as `s<id>` by fetchStreams.
      const chainId = Number(id.replace(/^s/, ''));
      setPendingStreamId(id);
      try {
        const signer = requireLiveWallet('pause or resume a stream');
        if (!Number.isInteger(chainId)) throw new Error(`"${stream.title}" is not an on-chain stream.`);
        const txHash = await chainToggleStream(chainId, signer);
        logStreamAction({ action: 'STREAM_TOGGLE', details, severity: nextStatus === 'PAUSED' ? 'warning' : 'success', txHash });
        await refreshStreams();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transaction failed';
        setStreamActionError(`Could not ${nextStatus === 'PAUSED' ? 'pause' : 'resume'} "${stream.title}": ${message}`);
        logStreamAction({ action: 'STREAM_TOGGLE', details: `Failed: ${details} ${message}`, severity: 'critical' });
      } finally {
        setPendingStreamId(null);
      }
      return;
    }

    // Demo mode: local only.
    setStreams((prev) => prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s)));
    logStreamAction({ action: 'STREAM_TOGGLE', details, severity: nextStatus === 'PAUSED' ? 'warning' : 'success' });
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
    if (dataMode === 'live' && !walletAddress) {
      throw new Error('Connect a Freighter wallet to deposit.');
    }
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

    if (walletAddress && dataMode === 'live') {
      // Throws on user rejection or chain failure — modal catches and shows error
      const realHash = await chainDeposit(amount, walletAddress);
      const shortHash = `${realHash.slice(0, 6)}...${realHash.slice(-4)}`;
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, txHash: shortHash } : tx));
      setAuditLogs(prev => prev.map(l => l.id === logId ? { ...l, txHash: shortHash } : l));
      return realHash;
    }

    // Demo mode only: simulated — nothing is sent to Stellar
    await new Promise(r => setTimeout(r, 1000));
    return pendingHash;
  };

  const handleDisburse = async (
    amount: number,
    recipient: string,
    reason: string,
    category: 'Operational' | 'Investment' | 'Grant' | 'Other' = 'Operational',
  ): Promise<string> => {
    const isValidStellarAddr = /^G[A-Z2-7]{55}$/.test(recipient);
    if (dataMode === 'live' && !walletAddress) {
      throw new Error('Connect a Freighter wallet to disburse.');
    }
    if (dataMode === 'live' && !isValidStellarAddr) {
      throw new Error('Recipient must be a Stellar G... address.');
    }
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

    if (walletAddress && dataMode === 'live' && isValidStellarAddr) {
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
            pendingStreamId={pendingStreamId}
            actionError={streamActionError}
            onDismissError={() => setStreamActionError(null)}
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
                className="fixed left-0 top-0 h-full w-56 z-50 md:hidden"
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
        <div className="flex-1 md:pl-56 min-w-0 flex flex-col">
          {/* Primary Content Panel - beautifully responsive */}
          <main className="flex-1 pt-24 px-4 md:px-8 pb-32 md:pb-12 max-w-[1200px] mx-auto w-full institutional-gradient">
            <DataModeBanner mode={dataMode} reason={demoReason} loading={isChainLoading} />
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

          // Refresh live data now that a wallet is connected
          if (dataMode === 'live') await loadLiveData();
        }}
        onDisconnect={() => {
          const short = actor(walletAddress);
          setWalletAddress(null);
          setWalletType(null);

          const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
            action: 'WALLET_DISCONNECT' as const,
            details: `Freighter session closed for ${short}.`,
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

function DataModeBanner({ mode, reason, loading }: { mode: DataMode; reason: string; loading: boolean }) {
  if (mode === 'loading') {
    return (
      <div role="status" className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-400">
        Loading live data from Stellar {ACTIVE_NETWORK}…
      </div>
    );
  }
  if (mode === 'live') {
    return (
      <div role="status" className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
        <Radio className="h-3 w-3" />
        Live · Stellar {ACTIVE_NETWORK}{loading ? ' · refreshing' : ''}
      </div>
    );
  }
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="text-xs text-amber-200">
        <p className="font-mono font-bold uppercase tracking-widest text-amber-400">Demo mode — sample data</p>
        <p className="mt-1">
          {reason} Balances, campaigns, streams, proofs and transactions shown here are not real, and deposits or
          disbursements are simulated — nothing is sent to Stellar.
        </p>
      </div>
    </div>
  );
}
