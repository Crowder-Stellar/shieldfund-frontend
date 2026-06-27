import React, { useState, useEffect } from 'react';
import { Activity, PlusCircle, Play, Pause, Settings, CheckCircle2, Circle } from 'lucide-react';
import { Stream, MilestoneVesting } from '../types';
import EmptyState from './EmptyState';

interface StreamsTabProps {
  streams: Stream[];
  vestingList: MilestoneVesting[];
  onOpenCreateStream: () => void;
  onToggleStream: (id: string) => void;
}

export default function StreamsTab({
  streams,
  vestingList,
  onOpenCreateStream,
  onToggleStream,
}: StreamsTabProps) {
  // We want to support real-time ticking for active streams!
  const [accumulatedValues, setAccumulatedValues] = useState<{ [key: string]: number }>({});
  
  // Initialize values
  useEffect(() => {
    const initial: { [key: string]: number } = {};
    streams.forEach((s) => {
      initial[s.id] = s.accumulatedValue;
    });
    setAccumulatedValues(initial);
  }, [streams]);

  // Ticking effect
  useEffect(() => {
    const activeStreams = streams.filter((s) => s.status === 'ACTIVE');
    if (activeStreams.length === 0) return;

    const intervalMs = 50;
    const intervalSec = intervalMs / 1000;

    const timer = setInterval(() => {
      setAccumulatedValues((prev) => {
        const next = { ...prev };
        activeStreams.forEach((s) => {
          const ratePerSecond = s.flowRateAmount / (30 * 24 * 60 * 60);
          const increment = ratePerSecond * intervalSec;
          next[s.id] = (next[s.id] || s.accumulatedValue) + increment;
        });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [streams]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-xs font-semibold text-indigo-400 tracking-[0.2em] uppercase">
            FINANCIAL PROTOCOL
          </p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-slate-100 tracking-tight">
            Streams &amp; Vesting
          </h2>
        </div>
        
        <button
          onClick={onOpenCreateStream}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-display font-semibold py-2.5 px-5 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-indigo-500/30"
        >
          <PlusCircle className="w-5 h-5 text-white" />
          Create New Stream
        </button>
      </div>

      {/* Active Streams Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-slate-200 flex items-center gap-2">
            Active Streams
            <span className="text-slate-400 text-sm font-normal">({streams.length})</span>
          </h3>
          
          <span className="text-xs text-emerald-400 font-mono tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE UPDATE
          </span>
        </div>

        <div className="space-y-4">
          {streams.length > 0 ? (
            streams.map((stream) => {
              const currentVal = accumulatedValues[stream.id] || stream.accumulatedValue;
              return (
                <div
                  key={stream.id}
                  className="glass-card rounded-3xl p-6 relative overflow-hidden group border border-slate-800 bg-slate-900/40"
                >
                  {/* Stream Info */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-display font-bold text-xl text-slate-100">
                          {stream.title}
                        </h4>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full border font-mono font-bold tracking-wider ${
                            stream.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {stream.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Recipient:</span>
                        <button
                          onClick={() => handleCopy(stream.recipient)}
                          className="font-mono text-xs bg-slate-800 hover:bg-slate-750 px-2 py-0.5 rounded text-indigo-400 hover:text-indigo-300 active:scale-95 transition-all"
                          title="Click to copy address"
                        >
                          {stream.recipient}
                        </button>
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                      </div>
                    </div>

                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="font-mono text-[10px] font-semibold tracking-wider text-slate-500 mb-1">
                        ACCUMULATED VALUE
                      </p>
                      <div className="flex items-baseline md:justify-end gap-1.5">
                        <span className="font-display font-extrabold text-2xl md:text-3xl text-slate-100 tracking-tight tabular-nums">
                          {currentVal.toLocaleString(undefined, {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}
                        </span>
                        <span className="font-display font-semibold text-sm text-slate-500">
                          USDC
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stream Visualizer progress */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
                    <div
                      className={`h-full bg-indigo-500 shimmer shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ${
                        stream.status === 'ACTIVE' ? 'w-2/3' : 'w-1/2 opacity-50'
                      }`}
                    ></div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                    <div className="flex gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-500">FLOW RATE</span>
                        <span className="text-xs md:text-sm font-sans font-medium text-slate-200">
                          {stream.flowRateAmount.toLocaleString()} USDC / Month
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-500">END DATE</span>
                        <span className="text-xs md:text-sm font-sans font-medium text-slate-200">
                          {stream.endDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggleStream(stream.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer active:scale-95"
                        title={stream.status === 'ACTIVE' ? 'Pause Stream' : 'Resume Stream'}
                      >
                        {stream.status === 'ACTIVE' ? (
                          <Pause className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                      <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer active:scale-95">
                        <Settings className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              type="streams"
              title="No Active Capital Streams"
              description="No real-time continuous payout streams are currently open. Create a stream to automatically disperse funds second-by-second to verified contributors."
              actionText="Create Your First Stream"
              onAction={onOpenCreateStream}
            />
          )}
        </div>
      </section>

      {/* Milestone Vesting */}
      <section className="space-y-4">
        <h3 className="font-display font-semibold text-lg text-slate-200">
          Milestone Vesting
        </h3>
        
        {vestingList.map((vesting) => (
          <div key={vesting.id} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Milestone Card */}
            <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[200px] border border-slate-800 bg-slate-900/40">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-lg text-slate-100">
                    {vesting.title}
                  </h4>
                  <p className="text-xs md:text-sm text-slate-400 font-sans">
                    {vesting.description}
                  </p>
                </div>
                <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-xl border border-indigo-500/20 font-mono text-xs shrink-0">
                  {vesting.metCount}/{vesting.totalCount} Met
                </span>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between text-xs mb-2 font-mono text-slate-400">
                  <span>Vesting Progress</span>
                  <span className="text-emerald-400 font-semibold">{vesting.progressPercent}%</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full flex gap-1 p-0.5 border border-slate-700/50">
                  {vesting.milestones.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className={`h-full flex-1 rounded-full transition-all duration-500 ${
                        m.status === 'met' ? 'bg-emerald-400 cyber-mint-glow' : 'bg-slate-900'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Milestone Details/Status */}
            <div className="glass-card rounded-3xl p-6 flex flex-col gap-3 justify-center border border-slate-800 bg-slate-900/40">
              {vesting.milestones.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 px-4 gap-2 rounded-2xl border transition-all ${
                    m.status === 'met'
                      ? 'bg-slate-800/40 border-slate-800'
                      : 'border-dashed border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {m.status === 'met' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-sans font-medium ${
                        m.status === 'met' ? 'text-slate-200' : 'text-slate-400'
                      }`}
                    >
                      {m.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-medium uppercase tracking-wider self-start sm:self-auto pl-8 sm:pl-0">
                    {m.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Stats Bento Footer */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8">
        <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/40">
          <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
            TOTAL FLOWING
          </p>
          <p className="text-lg md:text-xl font-display font-bold text-slate-100">
            12.5k <span className="text-xs text-slate-500 font-normal">USDC</span>
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/40">
          <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
            ACTIVE RECIPIENTS
          </p>
          <p className="text-lg md:text-xl font-display font-bold text-slate-100">
            4 <span className="text-xs text-slate-500 font-normal">WALLETS</span>
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/40">
          <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
            VESTED TVL
          </p>
          <p className="text-lg md:text-xl font-display font-bold text-slate-100">
            1.2M <span className="text-xs text-slate-500 font-normal">USDC</span>
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/40">
          <p className="text-[10px] font-mono text-slate-500 mb-1 uppercase tracking-wider">
            NETWORK FEE
          </p>
          <p className="text-lg md:text-xl font-display font-bold text-slate-100">
            0.05 <span className="text-xs text-slate-500 font-normal">ETH</span>
          </p>
        </div>
      </section>
    </div>
  );
}
