import React, { useState, useEffect, useRef } from 'react';
import { Shield, ChevronRight, FileText, Lock, Hourglass } from 'lucide-react';
import * as d3 from 'd3';
import { VerifiableProof } from '../types';
import ManualVerificationModal from './ManualVerificationModal';
import EmptyState from './EmptyState';

interface D3DonutChartProps {
  verified: number;
  pending: number;
}

function D3DonutChart({ verified, pending }: D3DonutChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    const data = [
      { status: 'Verified', count: verified, color: '#10b981' },
      { status: 'Pending', count: pending, color: '#f59e0b' }
    ];

    const total = verified + pending;
    if (total === 0) return;

    const width = 100;
    const height = 100;
    const margin = 4;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie<any>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.6)
      .outerRadius(radius)
      .cornerRadius(3);

    const arcHover = d3.arc<any>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 1.05)
      .cornerRadius(3);

    const arcs = svg.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', '1.5px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease-in-out')
      .on('mouseover', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arcHover);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('d', arc);
      });

    // Add center text
    const percent = Math.round((verified / total) * 100);
    const isLight = document.body.classList.contains('theme-light');
    
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '4px')
      .style('font-family', '"JetBrains Mono", monospace')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', isLight ? '#0f172a' : '#f1f5f9')
      .text(`${percent}%`);

  }, [verified, pending]);

  return (
    <div className="flex items-center gap-4 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
      <div className="relative w-[100px] h-[100px] flex items-center justify-center shrink-0">
        <svg ref={svgRef}></svg>
      </div>
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          <span className="font-mono text-[10px] font-bold text-slate-300 uppercase leading-none truncate">
            Verified ({verified})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          <span className="font-mono text-[10px] font-bold text-slate-300 uppercase leading-none truncate">
            Pending ({pending})
          </span>
        </div>
      </div>
    </div>
  );
}


interface ProofsTabProps {
  proofs: VerifiableProof[];
  onAddProof: (proof: VerifiableProof) => void;
  onVerifyProof?: (id: string) => void;
  walletAddress?: string | null;
}

export default function ProofsTab({ proofs, onAddProof, onVerifyProof, walletAddress }: ProofsTabProps) {
  const [viewMode, setViewMode] = useState<'public' | 'private'>('public');
  const [selectedProof, setSelectedProof] = useState<VerifiableProof | null>(null);
  
  // Proof compilation simulation
  const [progress, setProgress] = useState(74);
  const [isCompiling, setIsCompiling] = useState(false);
  const [provingKey, setProvingKey] = useState('0x8a...4f21');

  // ZK-Proof status queue statistics
  const totalProofs = proofs.length;
  const verifiedProofs = proofs.filter((p) => p.status === 'VERIFIED').length;
  const pendingProofs = proofs.filter((p) => p.status === 'PENDING').length;
  const verifiedPercent = totalProofs > 0 ? Math.round((verifiedProofs / totalProofs) * 100) : 0;
  const pendingPercent = totalProofs > 0 ? Math.round((pendingProofs / totalProofs) * 100) : 0;

  useEffect(() => {
    if (!isCompiling) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompiling(false);
          
          // Add a new proof to the list when compilation completes!
          const newProof: VerifiableProof = {
            id: 'p_new_' + Date.now(),
            title: `Aggregate Disbursement Proof - Jun 2026`,
            hash: `0x${Math.random().toString(16).substr(2, 6)}...${Math.random().toString(16).substr(2, 4)}`,
            date: new Date().toLocaleDateString('en-GB'),
            complexity: 3,
            status: 'VERIFIED',
            type: 'operational'
          };
          onAddProof(newProof);
          return 100;
        }
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isCompiling, onAddProof]);

  const handleInitializeProof = () => {
    setProgress(0);
    setIsCompiling(true);
    setProvingKey(`0x${Math.random().toString(16).substr(2, 6)}...${Math.random().toString(16).substr(2, 4)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-slate-100 tracking-tight mb-1">
            Privacy Proofs
          </h2>
          <p className="text-slate-400 font-sans text-sm md:text-base leading-relaxed max-w-xl">
            Cryptographically verify treasury actions without exposing sensitive transactional metadata.
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl self-start">
          <button
            onClick={() => setViewMode('public')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'public'
                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PUBLIC AGGREGATE
          </button>
          <button
            onClick={() => setViewMode('private')}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'private'
                ? 'bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PRIVATE DETAIL
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Noir Prover Card */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 md:p-8 flex flex-col justify-between min-h-[320px] relative overflow-hidden group border border-slate-800 bg-slate-900/40">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-700"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 zk-verify-dot"></span>
                <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider uppercase">
                  {isCompiling ? 'ZK COMPILING ACTIVE' : 'NOIR PROVER ACTIVE'}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-500 font-medium">
                PROVING_KEY: {provingKey}
              </span>
            </div>
            
            <h3 className="font-display font-bold text-xl md:text-2xl text-slate-100">
              Generate Aggregate Proof
            </h3>
            
            <p className="text-slate-400 text-sm md:text-base font-sans leading-relaxed">
              Bundling 14 pending treasury transfers into a single zero-knowledge proof for February disbursement.
            </p>
          </div>

          <div className="space-y-4 mt-8 relative z-10">
            <div className="flex justify-between items-end mb-1">
              <span className="font-mono text-xs font-semibold text-slate-400 uppercase">
                ZK-COMPILATION
              </span>
              <span className="font-mono text-sm font-extrabold text-emerald-400">
                {Math.round(progress)}%
              </span>
            </div>
            
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800/85">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border border-slate-750 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-200 shadow-md">
                  Z
                </div>
                <div className="w-8 h-8 rounded-full border border-slate-750 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-200 shadow-md">
                  K
                </div>
              </div>
              
              <button
                onClick={handleInitializeProof}
                disabled={isCompiling}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl font-sans text-xs font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/20 cursor-pointer border border-indigo-500/30"
              >
                {isCompiling ? 'COMPILING PROOF...' : 'INITIALIZE PROOF'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="lg:col-span-4 glass-card rounded-3xl p-6 flex flex-col justify-between border border-slate-800 bg-slate-900/40">
          <div>
            <h4 className="font-mono text-xs font-semibold text-slate-400 mb-4 uppercase tracking-widest">
              Trust Metrics
            </h4>
            
            <div className="space-y-6">
              <div>
                <p className="text-slate-500 text-xs font-medium mb-1">
                  Total Verified Value
                </p>
                <p className="font-display font-extrabold text-3xl text-emerald-400 leading-none">
                  $1.2M
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium mb-1">
                  Active Verifiers
                </p>
                <p className="font-display font-bold text-3xl text-slate-100 leading-none">
                  42
                </p>
              </div>
              
              <div className="pt-4 border-t border-slate-800/60">
                <p className="text-slate-500 text-xs font-medium mb-2.5">
                  Verification Ratio
                </p>
                <D3DonutChart verified={verifiedProofs} pending={pendingProofs} />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                L2 SECURED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ZK-Proof Queue Status Bar */}
      <div className="glass-card rounded-3xl p-5 md:p-6 border border-slate-800 bg-slate-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-display font-bold text-base text-slate-200">
              Proof Validation Queue
            </h4>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Cryptographic integrity ratio of deployed zero-knowledge circuits. Click any proof below to verify it manually.
            </p>
          </div>
          
          <div className="flex items-center gap-4 font-mono text-[11px] font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Verified ({verifiedProofs})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-slate-300">Pending ({pendingProofs})</span>
            </div>
          </div>
        </div>

        {/* Stacked Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            {verifiedPercent > 0 && (
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                style={{ width: `${verifiedPercent}%` }}
              ></div>
            )}
            {pendingPercent > 0 && (
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                style={{ width: `${pendingPercent}%` }}
              ></div>
            )}
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>Verified: {verifiedPercent}%</span>
            <span>Total Proofs: {totalProofs}</span>
            <span>Pending: {pendingPercent}%</span>
          </div>
        </div>
      </div>

      {/* Proofs List Section */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-slate-200">
          Recent Verifiable Proofs
        </h3>

        <div className="space-y-3">
          {proofs.length > 0 ? (
            proofs.map((proof) => (
              <div
                key={proof.id}
                onClick={() => setSelectedProof(proof)}
                className="glass-card hover:bg-slate-900/30 transition-all duration-200 rounded-2xl p-4 md:p-5 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 group cursor-pointer border border-slate-800 bg-slate-900/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    {proof.type === 'payroll' ? (
                      <FileText className="w-5 h-5 text-indigo-400" />
                    ) : proof.type === 'operational' ? (
                      <Lock className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Hourglass className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  
                  <div>
                    <h5 className="font-sans font-bold text-sm md:text-base text-slate-200">
                      {proof.title}
                    </h5>
                    <p className="font-mono text-xs text-slate-400 mt-1">
                      Hash: {proof.hash} {proof.status === 'VERIFIED' ? `• ${proof.date}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                  {/* Complexity indicator */}
                  <div className="hidden lg:block text-right">
                    <p className="font-mono text-[9px] font-semibold text-slate-500 mb-1 uppercase">
                      COMPLEXITY
                    </p>
                    <div className="flex gap-1 justify-end">
                      <div className="w-3.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      <div
                        className={`w-3.5 h-1.5 rounded-full ${
                          proof.complexity >= 2 ? 'bg-indigo-500' : 'bg-slate-800'
                        }`}
                      ></div>
                      <div
                        className={`w-3.5 h-1.5 rounded-full ${
                          proof.complexity >= 3 ? 'bg-indigo-500' : 'bg-slate-800'
                        }`}
                      ></div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full border font-mono text-[9px] font-bold ${
                      proof.status === 'VERIFIED'
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-slate-800 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {proof.status}
                  </span>
                  
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors duration-200" />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              type="proofs"
              title="No Verifiable Proofs Found"
              description="Zero-knowledge verification proofs are generated when transactions compile. Wait for current compilation runs or trigger manual proof compilation above."
            />
          )}
        </div>
      </div>

      <ManualVerificationModal
        proof={selectedProof}
        isOpen={selectedProof !== null}
        onClose={() => setSelectedProof(null)}
        onVerificationComplete={(id) => { if (onVerifyProof) onVerifyProof(id); }}
        walletAddress={walletAddress ?? null}
      />
    </div>
  );
}
