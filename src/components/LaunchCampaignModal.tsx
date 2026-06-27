import React, { useState } from 'react';
import { X, Globe, DollarSign, Image } from 'lucide-react';
import { Campaign } from '../types';

interface LaunchCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (campaign: Campaign) => void;
}

export default function LaunchCampaignModal({
  isOpen,
  onClose,
  onSubmit,
}: LaunchCampaignModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !goal) return;

    const fallbackImages = [
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1644024312954-4625a31b411a?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=600&auto=format&fit=crop',
    ];
    const image = imageUrl.trim() || fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

    const newCampaign: Campaign = {
      id: 'c_' + Date.now(),
      title,
      description,
      raised: 0,
      goal: parseFloat(goal),
      image,
      zkVerified: true,
    };

    onSubmit(newCampaign);
    // Reset state
    setTitle('');
    setDescription('');
    setGoal('');
    setImageUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden group">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display font-bold text-xl text-slate-100">Launch ZK Campaign</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Campaign Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Privacy Shield SDK v2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Campaign Goal (USDC)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="number"
                required
                min="100"
                placeholder="e.g., 50000"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Short Description
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain the purpose of this ZK-verified fundraising project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
            ></textarea>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase flex items-center justify-between">
              <span>Cover Image URL (Optional)</span>
              <span className="text-[10px] text-slate-500 font-normal">Unsplash recommended</span>
            </label>
            <div className="relative">
              <Image className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl font-sans text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-sans text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer border border-indigo-500/30"
            >
              LAUNCH CAMPAIGN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
