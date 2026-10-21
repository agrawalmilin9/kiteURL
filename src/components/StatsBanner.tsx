import React from 'react';
import { Link2, MousePointerClick, ShieldCheck, Zap } from 'lucide-react';
import { SystemOverview } from '../types.ts';

interface StatsBannerProps {
  overview: SystemOverview | null;
  loading: boolean;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ overview, loading }) => {
  const hitRatio = overview?.cache_performance?.hit_ratio_percent ?? 0;
  const totalClicks = overview?.total_clicks ?? 0;
  const activeLinks = overview?.active_links ?? 0;
  const totalLinks = overview?.total_links ?? 0;
  const activePercent = totalLinks > 0 ? Math.round((activeLinks / totalLinks) * 100) : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {/* Metric 1: Total Links */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 transition-all hover:border-neutral-300 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-medium text-neutral-600">Active Links</span>
          <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Link2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? '—' : activeLinks}
          </span>
          <span className="text-[11px] text-neutral-500 font-medium">of {totalLinks} created</span>
        </div>
      </div>

      {/* Metric 2: Total Clicks */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 transition-all hover:border-neutral-300 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-medium text-neutral-600">Total Engagements</span>
          <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
            <MousePointerClick className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? '—' : totalClicks.toLocaleString()}
          </span>
          {overview?.clicks_last_24h ? (
            <span className="text-[11px] text-emerald-600 font-semibold">
              +{overview.clicks_last_24h} today
            </span>
          ) : (
            <span className="text-[11px] text-neutral-400 font-medium">real-time</span>
          )}
        </div>
      </div>

      {/* Metric 3: Active Status Ratio */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 transition-all hover:border-neutral-300 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-medium text-neutral-600">Health & Availability</span>
          <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? '—' : `${activePercent}%`}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">operational</span>
        </div>
      </div>

      {/* Metric 4: In-memory cache hit ratio */}
      <div className="bg-white border border-neutral-200/90 rounded-xl p-4 transition-all hover:border-neutral-300 shadow-2xs">
        <div className="flex items-center justify-between text-neutral-500 mb-2">
          <span className="text-xs font-medium text-neutral-600">Cache Hit Rate</span>
          <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-neutral-900">
            {loading ? '—' : `${hitRatio}%`}
          </span>
          <span className="text-[11px] text-neutral-500 font-medium">in-memory</span>
        </div>
      </div>
    </div>
  );
};
