import React from 'react';
import { Shield, Clock, PlusCircle, ArrowUpRight, TrendingUp, DollarSign, HelpCircle, Search, X, Download, ChevronDown, ChevronUp, Cpu, Server, ExternalLink } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TreasuryData } from '../types';

interface TreasuryTabProps {
  treasuryData: TreasuryData;
  transactions: Transaction[];
  onOpenDeposit: () => void;
  onOpenDisburse: () => void;
}

function InfoTooltip({ content }: { content: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block ml-1.5 align-middle z-30">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-slate-500 hover:text-indigo-400 transition-colors focus:outline-none cursor-help"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-950 border border-slate-800 text-slate-300 font-sans text-[11px] leading-relaxed p-3 rounded-xl shadow-xl backdrop-blur-md pointer-events-none"
          >
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950"></div>
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-800 p-2.5 rounded-xl shadow-xl backdrop-blur-md">
        <p className="font-mono text-[9px] text-slate-400 uppercase tracking-wider">{payload[0].payload.date}</p>
        <p className="font-display font-bold text-sm text-indigo-400 mt-0.5">
          {payload[0].value.toLocaleString()} USDC
        </p>
      </div>
    );
  }
  return null;
};

const categoryStyles: Record<'Operational' | 'Investment' | 'Grant' | 'Other', string> = {
  Operational: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Investment: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Grant: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function TreasuryTab({
  treasuryData,
  transactions,
  onOpenDeposit,
  onOpenDisburse,
}: TreasuryTabProps) {
  const [txSearchTerm, setTxSearchTerm] = React.useState('');
  const [expandedTxId, setExpandedTxId] = React.useState<string | null>(null);

  const toggleTxExpand = (id: string) => {
    setExpandedTxId((prev) => (prev === id ? null : id));
  };

  const filteredTransactions = React.useMemo(() => {
    if (!txSearchTerm.trim()) return transactions;
    const term = txSearchTerm.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.title.toLowerCase().includes(term) ||
        tx.senderReceiver.toLowerCase().includes(term) ||
        tx.txHash.toLowerCase().includes(term) ||
        (tx.category && tx.category.toLowerCase().includes(term))
    );
  }, [transactions, txSearchTerm]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Title', 'Type', 'Category', 'Transaction Hash', 'Sender/Receiver', 'Amount (USDC)', 'Time/Date'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      `"${tx.title.replace(/"/g, '""')}"`,
      tx.type,
      tx.category || 'Other',
      tx.txHash,
      `"${tx.senderReceiver.replace(/"/g, '""')}"`,
      tx.amount,
      `"${tx.time.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `treasury_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate deterministic 30-day history ending with current balance
  const chartData = React.useMemo(() => {
    const data = [];
    const days = 30;
    
    for (let i = 0; i < days; i++) {
      const ratio = i / (days - 1);
      // Let's define some historical milestones of the last 30 days
      // E.g. start at 120k, adapt smoothly to the current balance
      const baseTrend = 120000 + ratio * (treasuryData.vaultBalance - 120000);
      
      // Let's add a nice financial activity curve
      const fluctuation = Math.sin(i * 0.4) * 6000 + Math.cos(i * 0.8) * 3000;
      
      // Interpolate the fluctuation so that it tapers to 0 at the end (so we hit exactly the current balance!)
      const tapering = 1 - Math.pow(ratio, 2); 
      const balanceVal = Math.round(baseTrend + fluctuation * tapering);
      
      const finalBalance = i === days - 1 ? treasuryData.vaultBalance : balanceVal;
      
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - (days - 1 - i));
      const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      data.push({
        date: dateLabel,
        balance: finalBalance,
      });
    }
    return data;
  }, [treasuryData.vaultBalance]);

  const categoryData = React.useMemo(() => {
    const sums: Record<string, number> = {
      Operational: 0,
      Investment: 0,
      Grant: 0,
      Other: 0,
    };
    
    transactions.forEach((tx) => {
      const cat = tx.category || 'Other';
      if (sums[cat] !== undefined) {
        sums[cat] += tx.amount;
      } else {
        sums['Other'] += tx.amount;
      }
    });

    return [
      { name: 'Operational', value: sums.Operational, color: '#f59e0b' }, // Amber
      { name: 'Investment', value: sums.Investment, color: '#0ea5e9' },  // Sky
      { name: 'Grant', value: sums.Grant, color: '#a855f7' },            // Purple
      { name: 'Other', value: sums.Other, color: '#64748b' },            // Slate/Other
    ].filter(item => item.value > 0);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="font-display font-bold text-3xl md:text-4xl text-slate-100 tracking-tight mb-1">
          Treasury Vault
        </h2>
        <p className="text-slate-400 font-sans text-sm md:text-base leading-relaxed">
          Secure institutional-grade asset management powered by ZK-proofs.
        </p>
      </div>

      {/* Main Balance Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Vault Balance Card with Integrated Recharts Mini Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[260px] relative overflow-hidden group border border-slate-800 bg-slate-900/40">
          {/* Subtle decorative glow */}
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl transition-opacity group-hover:bg-indigo-500/15"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Balance display */}
            <div className="md:col-span-5 space-y-4">
              <div>
                <div className="font-mono text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase mb-2 flex items-center">
                  <span>TOTAL VAULT BALANCE</span>
                  <InfoTooltip content="Verifiable zero-knowledge proofs guarantee total vault balance solvency publicly, ensuring institutional backing and credibility without exposing individual counterparty balances." />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-extrabold text-4xl md:text-5xl text-slate-50 tracking-tight">
                    {treasuryData.vaultBalance.toLocaleString()}
                  </span>
                  <span className="font-display font-medium text-xl md:text-2xl text-slate-500">
                    USDC
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                30-Day performance reflects active zero-knowledge stream disbursements and multi-sig inflows.
              </p>
            </div>

            {/* Right Mini-Chart visualization */}
            <div className="md:col-span-7 h-36 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    hide 
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#818cf8" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
                <span>30 Days Ago</span>
                <span className="text-indigo-400 font-semibold">Active Ledger Trend</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-6 relative z-10 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-mono text-xs text-emerald-400 font-medium">Secured by zk-SNARKs</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-xs">Last Audit: {treasuryData.lastAuditTime}</span>
            </div>
          </div>
        </div>

        {/* Small Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-6">
          <button
            onClick={onOpenDeposit}
            className="w-full h-full glass-card rounded-3xl p-5 flex flex-col justify-center items-center gap-3 bg-slate-900/40 border border-slate-800 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all duration-300 group cursor-pointer active:scale-[0.98]"
          >
            <PlusCircle className="w-10 h-10 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
            <span className="font-display font-semibold text-base text-slate-200">Deposit</span>
          </button>
          
          <button
            onClick={onOpenDisburse}
            className="w-full h-full glass-card rounded-3xl p-5 flex flex-col justify-center items-center gap-3 bg-slate-900/40 border border-slate-800 hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all duration-300 group cursor-pointer active:scale-[0.98]"
          >
            <ArrowUpRight className="w-10 h-10 text-indigo-500 group-hover:scale-110 transition-transform duration-300" />
            <span className="font-display font-semibold text-base text-slate-200">Disburse</span>
          </button>
        </div>
      </div>

      {/* ZK Summary & Asset Allocation Card */}
      <section className="glass-card rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/40">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-mono text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
            Attestation & Asset Allocation
          </h4>
          <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
            Live Category Distribution
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/80">
          {/* Total Raised */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex justify-between items-start">
              <div className="text-sm font-sans text-slate-400 flex items-center">
                <span>Total Raised</span>
                <InfoTooltip content="Inflows are securely validated via ZK compliance registries, confirming clean sources of capital to satisfy AML requirements while protecting investor anonymity." />
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-slate-100">
                {treasuryData.totalRaised.toLocaleString()}{' '}
                <span className="text-slate-500 font-normal text-lg md:text-xl">USDC</span>
              </div>
              <div className="pl-4 mt-2 font-mono text-xs text-emerald-400 font-medium relative zk-pulse">
                Proof Verified: Inflow_Registry_v4
              </div>
            </div>
          </div>

          {/* Total Disbursed */}
          <div className="p-6 md:p-8 space-y-4">
            <div className="flex justify-between items-start">
              <div className="text-sm font-sans text-slate-400 flex items-center">
                <span>Total Disbursed</span>
                <InfoTooltip content="Outflow stream proofs guarantee real-time payouts to project creators, satisfying strict smart-contract performance benchmarks with cryptographic validation." />
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-display font-bold text-slate-100">
                {treasuryData.totalDisbursed.toLocaleString()}{' '}
                <span className="text-slate-500 font-normal text-lg md:text-xl">USDC</span>
              </div>
              <div className="pl-4 mt-2 font-mono text-xs text-emerald-400 font-medium relative zk-pulse">
                Proof Verified: Outflow_Stream_v2
              </div>
            </div>
          </div>

          {/* Category Distribution Pie Chart */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="text-sm font-sans text-slate-400 flex items-center">
                <span>Asset Allocation</span>
                <InfoTooltip content="Real-time distribution of capital volume across core Operational, Investment, and Grant channels computed from current transaction ledgers." />
              </div>
              <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
              <div className="sm:col-span-6 h-28 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value.toLocaleString()} USDC`, 'Volume']}
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '10px',
                        color: '#f8fafc'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono font-bold text-slate-100 leading-none">
                    {categoryData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight mt-0.5">
                    Vol
                  </span>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="sm:col-span-6 space-y-1.5">
                {categoryData.map((item) => {
                  const totalVolume = categoryData.reduce((acc, curr) => acc + curr.value, 0);
                  const percent = totalVolume > 0 ? Math.round((item.value / totalVolume) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          className="w-1.5 h-1.5 rounded-full shrink-0" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-mono text-[9px] font-semibold text-slate-400 truncate uppercase">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] font-bold text-slate-300 shrink-0">
                        {percent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <h4 className="font-display font-semibold text-lg text-slate-200 shrink-0">
            Recent Activity
          </h4>
          
          <div className="flex items-center gap-3 w-full sm:w-auto max-w-md">
            {/* Elegant Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={txSearchTerm}
                onChange={(e) => setTxSearchTerm(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-800/80 focus:border-indigo-500/50 hover:border-slate-700/80 rounded-2xl py-2 pl-10 pr-9 text-xs text-slate-100 placeholder-slate-500 transition-all font-sans focus:outline-none"
              />
              {txSearchTerm && (
                <button
                  type="button"
                  onClick={() => setTxSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 focus:outline-none"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0 focus:outline-none"
              title="Export filtered transactions to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            
            <button className="text-indigo-400 hover:text-indigo-300 font-mono text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0">
              View All Ledger
            </button>
          </div>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/40">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx, idx) => {
              const isExpanded = expandedTxId === tx.id;
              // Deterministic stable mock data based on tx.id to maintain fidelity
              const mockGas = tx.type === 'Inflow' ? '0.0008 ETH' : '0.0014 ETH';
              const mockGasUsd = tx.type === 'Inflow' ? '~$2.40' : '~$4.20';
              const mockNetworkFee = tx.type === 'Inflow' ? '0.0001 ETH' : '0.0002 ETH';
              const mockBlock = 18450000 + Math.abs(tx.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 50000;
              const mockMethod = tx.type === 'Inflow' ? 'depositZK(bytes32,uint256)' : 'disburseSovereign(address,uint256)';
              const mockConfirmationTime = tx.type === 'Inflow' ? '12s (1 block)' : '24s (2 blocks)';

              return (
                <div
                  key={tx.id}
                  className={`border-b border-slate-800/80 last:border-0 hover:bg-slate-900/10 transition-colors duration-200`}
                >
                  {/* Summary Header of Transaction */}
                  <div
                    onClick={() => toggleTxExpand(tx.id)}
                    className="flex items-center justify-between p-4 md:p-5 cursor-pointer select-none"
                    title="Click to toggle expanded transaction audit details"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          tx.type === 'Inflow'
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-indigo-500/10 border border-indigo-500/20'
                        }`}
                      >
                        {tx.type === 'Inflow' ? (
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <DollarSign className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-sans font-medium text-sm md:text-base text-slate-200 truncate">
                            {tx.title}
                          </span>
                          <span className={`inline-flex items-center text-[9px] md:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wider uppercase leading-none shrink-0 ${categoryStyles[tx.category] || categoryStyles.Other}`}>
                            {tx.category || 'Other'}
                          </span>
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-1 truncate">
                          Tx: {tx.txHash} • {tx.senderReceiver}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0 pl-2">
                      <div className="text-right">
                        <div
                          className={`font-sans font-bold text-sm md:text-base ${
                            tx.type === 'Inflow' ? 'text-emerald-400' : 'text-slate-200'
                          }`}
                        >
                          {tx.type === 'Inflow' ? '+' : '-'}{tx.amount.toLocaleString()} USDC
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-1">
                          {tx.time}
                        </div>
                      </div>
                      {/* Interactive toggle indicator */}
                      <div className="w-8 h-8 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 border border-slate-800/80 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Audit Metadata */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-slate-950/25 border-t border-slate-800/40"
                      >
                        <div className="px-5 pb-5 pt-4 font-sans text-xs text-slate-300 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1 bg-slate-950/45 p-2.5 rounded-xl border border-slate-900">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                                Gas Cost
                              </span>
                              <div className="font-mono text-slate-200 flex items-center gap-1.5 font-medium">
                                <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>{mockGas} <span className="text-slate-500">({mockGasUsd})</span></span>
                              </div>
                            </div>
                            <div className="space-y-1 bg-slate-950/45 p-2.5 rounded-xl border border-slate-900">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                                Network Fee
                              </span>
                              <div className="font-mono text-slate-200 flex items-center gap-1.5 font-medium">
                                <Server className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{mockNetworkFee}</span>
                              </div>
                            </div>
                            <div className="space-y-1 bg-slate-950/45 p-2.5 rounded-xl border border-slate-900">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                                Block Number
                              </span>
                              <div className="font-mono text-slate-200 font-medium pt-0.5">
                                #{mockBlock.toLocaleString()}
                              </div>
                            </div>
                            <div className="space-y-1 bg-slate-950/45 p-2.5 rounded-xl border border-slate-900">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                                Confirmation
                              </span>
                              <div className="font-mono text-emerald-400 font-medium pt-0.5">
                                {mockConfirmationTime}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/40">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                              <div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block sm:inline mr-1.5">
                                  Smart Contract:
                                </span>
                                <span className="font-mono text-indigo-300 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 text-[11px]">
                                  {mockMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block sm:inline mr-1.5">
                                  Attestation:
                                </span>
                                <span className="font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 text-[11px] font-bold">
                                  ✓ ZK Verified Checksum
                                </span>
                              </div>
                            </div>

                            <a
                              href={`https://etherscan.io/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-mono text-[10px] font-semibold uppercase tracking-wider self-start sm:self-auto cursor-pointer border border-indigo-500/20 hover:border-indigo-400/30 bg-indigo-500/5 px-3 py-1.5 rounded-xl"
                            >
                              <span>View Explorer</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="font-display font-bold text-slate-400 text-sm">No Matching Transactions</p>
              <p className="font-sans text-xs text-slate-500">
                We couldn't find any activities matching "{txSearchTerm}".
              </p>
              <button
                type="button"
                onClick={() => setTxSearchTerm('')}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 font-semibold uppercase mt-2 focus:outline-none cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
