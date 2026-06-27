import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  type: 'campaigns' | 'streams' | 'proofs';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({ type, title, description, actionText, onAction }: EmptyStateProps) {
  // Render type-specific dynamic SVG vector illustrations
  const renderIllustration = () => {
    switch (type) {
      case 'campaigns':
        return (
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Pulsing radar rings */}
            <motion.div
              className="absolute w-32 h-32 rounded-full border border-indigo-500/10"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-24 h-24 rounded-full border border-dashed border-indigo-500/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* Floating constellation nodes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <motion.circle
                cx="30" cy="30" r="2" fill="#818cf8"
                animate={{ y: [-2, 2, -2], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
              <motion.circle
                cx="75" cy="40" r="3" fill="#818cf8"
                animate={{ y: [3, -3, 3], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              />
              <motion.circle
                cx="45" cy="75" r="2" fill="#818cf8"
                animate={{ x: [-2, 2, -2] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <path d="M 30 30 L 50 50 L 75 40 M 50 50 L 45 75" stroke="rgba(99,102,241,0.15)" strokeWidth="1" strokeDasharray="2 2" />
            </svg>

            {/* Central glowing launcher rocket / star shield */}
            <motion.div
              className="absolute w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5"
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </motion.div>
          </div>
        );

      case 'streams':
        return (
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Glowing signal wave vector */}
            <motion.div
              className="absolute w-28 h-28 rounded-full border border-indigo-500/10"
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Dynamic waveform pathway */}
              <motion.path
                d="M 15 50 Q 32.5 30 50 50 T 85 50"
                fill="none"
                stroke="url(#gradient-wave)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 6"
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ repeat: Infinity, ease: 'linear', duration: 3 }}
              />
              <defs>
                <linearGradient id="gradient-wave" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>

            {/* Central emitter node */}
            <motion.div
              className="absolute w-14 h-14 rounded-full bg-slate-900 border-2 border-indigo-500/30 flex items-center justify-center shadow-xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-500 animate-pulse" />
            </motion.div>
          </div>
        );

      case 'proofs':
        return (
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Floating cryptographic key blocks */}
            <motion.div
              className="absolute w-28 h-28 rounded-2xl border border-dashed border-slate-800"
              animate={{ rotate: -45 }}
            />
            
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Zero-knowledge binary grid particles */}
              <motion.text
                x="25" y="30" fill="rgba(99,102,241,0.25)" fontSize="10" fontFamily="monospace"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                0
              </motion.text>
              <motion.text
                x="70" y="25" fill="rgba(99,102,241,0.25)" fontSize="10" fontFamily="monospace"
                animate={{ opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                1
              </motion.text>
              <motion.text
                x="20" y="75" fill="rgba(99,102,241,0.25)" fontSize="10" fontFamily="monospace"
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              >
                1
              </motion.text>
              <motion.text
                x="75" y="75" fill="rgba(99,102,241,0.25)" fontSize="10" fontFamily="monospace"
                animate={{ opacity: [0.9, 0.3, 0.9] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
              >
                0
              </motion.text>
            </svg>

            {/* Central Shield keyhole */}
            <motion.div
              className="absolute w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-6 h-8 border-2 border-indigo-400/50 rounded-t-full flex items-end justify-center pb-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
              </div>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center p-8 md:p-12 glass-card rounded-3xl border border-slate-800 bg-slate-900/10 max-w-xl mx-auto space-y-6"
    >
      {/* Dynamic Graphic */}
      {renderIllustration()}

      {/* Typography */}
      <div className="space-y-2">
        <h4 className="font-display font-extrabold text-xl text-slate-200 tracking-tight">
          {title}
        </h4>
        <p className="font-sans text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      {/* CTA Button */}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-display font-semibold py-2.5 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 flex items-center gap-2 cursor-pointer border border-indigo-500/30"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
