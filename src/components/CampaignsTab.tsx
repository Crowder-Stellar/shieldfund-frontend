import React, { useState } from 'react';
import { Compass, Search, PlusCircle } from 'lucide-react';
import { Campaign } from '../types';
import EmptyState from './EmptyState';

interface CampaignsTabProps {
  campaigns: Campaign[];
  onOpenLaunchCampaign: () => void;
}

export default function CampaignsTab({ campaigns, onOpenLaunchCampaign }: CampaignsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title Header and Search Bar block */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-slate-100 tracking-tight mb-1">
              Campaigns
            </h2>
            <p className="text-slate-400 font-sans text-sm md:text-base leading-relaxed">
              Discover and support privacy-preserving initiatives.
            </p>
          </div>
          
          {/* Search/Filter Bar */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
              <Search className="w-5 h-5 stroke-slate-500" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all font-sans text-sm text-slate-100 placeholder:text-slate-500"
              placeholder="Search projects..."
            />
          </div>
        </div>
      </section>

      {/* Bento Grid of Campaigns */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Launch Campaign Action Card */}
        <div
          onClick={onOpenLaunchCampaign}
          className="group relative overflow-hidden glass-card rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 cursor-pointer border border-slate-800 bg-slate-900/40 hover:border-indigo-500/30 transition-all duration-300 min-h-[320px]"
        >
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative z-10 w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
            <PlusCircle className="w-8 h-8 text-indigo-400" />
          </div>
          
          <h3 className="relative z-10 font-display font-bold text-lg text-slate-200 leading-tight">
            Launch Campaign
          </h3>
          <p className="relative z-10 text-slate-400 font-sans text-sm max-w-[200px] leading-relaxed">
            Create your own ZK-verified fund for a privacy project.
          </p>
        </div>

        {/* Campaign Cards */}
        {filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((campaign) => {
            const progressPercent = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
            return (
              <div
                key={campaign.id}
                className="glass-card rounded-3xl overflow-hidden flex flex-col border border-slate-800 bg-slate-900/40 group hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="h-48 w-full relative overflow-hidden bg-slate-900">
                  <img
                    alt={campaign.title}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700"
                    src={campaign.image}
                    referrerPolicy="no-referrer"
                  />
                  {campaign.zkVerified && (
                    <div className="absolute top-4 left-4 bg-slate-950/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-800/80 shadow-lg">
                      <div className="zk-verify-dot"></div>
                      <span className="text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest leading-none">
                        ZK-Verified
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-6 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-lg text-slate-100 leading-tight">
                      {campaign.title}
                    </h3>
                    <p className="text-slate-400 text-sm font-sans line-clamp-2 leading-relaxed">
                      {campaign.description}
                    </p>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-slate-500 font-mono text-[9px] uppercase tracking-widest leading-none">
                          RAISED
                        </p>
                        <p className="text-slate-100 font-extrabold text-lg leading-none">
                          {campaign.raised >= 1000 ? `${(campaign.raised / 1000).toFixed(0)}k` : campaign.raised}{' '}
                          <span className="text-xs font-normal text-slate-400">USDC</span>
                        </p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className="text-slate-500 font-mono text-[9px] uppercase tracking-widest leading-none">
                          GOAL
                        </p>
                        <p className="text-slate-400 font-bold text-sm leading-none">
                          {campaign.goal >= 1000 ? `${(campaign.goal / 1000).toFixed(0)}k` : campaign.goal}{' '}
                          <span className="text-xs font-normal text-slate-500">USDC</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                          className="h-full bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-end text-[10px] font-mono font-medium text-slate-500">
                        {progressPercent}% Funded
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="md:col-span-2 lg:col-span-2 flex items-center justify-center py-4">
            <EmptyState
              type="campaigns"
              title={searchTerm ? "No Matching Campaigns" : "No Active Campaigns"}
              description={
                searchTerm
                  ? `We couldn't find any initiatives matching "${searchTerm}". Try resetting your query or starting a brand new ZK-verified fund.`
                  : "All privacy crowdfunding initiatives have finished or none have been launched yet. Initiate a campaign to begin onboarding contributors."
              }
              actionText={searchTerm ? "Clear Search Filter" : "Launch First Campaign"}
              onAction={searchTerm ? () => setSearchTerm('') : onOpenLaunchCampaign}
            />
          </div>
        )}
      </section>
    </div>
  );
}
