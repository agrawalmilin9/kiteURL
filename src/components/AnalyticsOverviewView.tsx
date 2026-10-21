import React from 'react';
import {
  Zap,
  BarChart2,
  TrendingUp,
  Globe2,
  Laptop,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { SystemOverview, LinkItem } from '../types.ts';

interface AnalyticsOverviewViewProps {
  overview: SystemOverview | null;
  links: LinkItem[];
  onSelectLink: (link: LinkItem) => void;
}

export const AnalyticsOverviewView: React.FC<AnalyticsOverviewViewProps> = ({
  overview,
  links,
  onSelectLink,
}) => {
  const cacheStats = overview?.cache_performance;
  const hitRatio = cacheStats?.hit_ratio_percent ?? 0;
  const sortedLinks = [...links].sort((a, b) => b.clicks_count - a.clicks_count);
  const topLinks = sortedLinks.slice(0, 6);

  const totalClicks = overview?.total_clicks ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner: Infrastructure Performance */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-base font-bold text-neutral-900">High-Performance Routing Core</h2>
            </div>
            <p className="text-xs text-neutral-500">
              Low-latency URL resolution with in-memory caching and a local JSON file for storage.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
              <span className="text-neutral-500 mr-1.5">Resolution:</span>
              <span className="text-neutral-900 font-bold">&lt; 1ms</span>
            </div>
            <div className="px-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-200/60">
              <span className="text-neutral-500 mr-1.5">Cache Hit:</span>
              <span className="text-emerald-600 font-bold">{hitRatio}%</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="p-3.5 bg-neutral-50/70 rounded-xl border border-neutral-100">
            <div className="text-xs font-medium text-neutral-500 mb-1">Cache Queries</div>
            <div className="text-xl font-bold text-neutral-900 font-mono">
              {cacheStats?.total_queries ?? 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {cacheStats?.hits ?? 0} hits • {cacheStats?.misses ?? 0} file lookups
            </div>
          </div>

          <div className="p-3.5 bg-neutral-50/70 rounded-xl border border-neutral-100">
            <div className="text-xs font-medium text-neutral-500 mb-1">Total System Volume</div>
            <div className="text-xl font-bold text-neutral-900 font-mono">
              {totalClicks.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              +{overview?.clicks_last_24h ?? 24} in past 24 hours
            </div>
          </div>

          <div className="p-3.5 bg-neutral-50/70 rounded-xl border border-neutral-100">
            <div className="text-xs font-medium text-neutral-500 mb-1">Active Endpoints</div>
            <div className="text-xl font-bold text-neutral-900 font-mono">
              {overview?.active_links ?? 0}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {links.filter((l) => l.is_password_protected).length} password-protected
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Shortlinks Table */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Top Performing Links</h3>
            <p className="text-xs text-neutral-500">Ranked by overall visitor traffic</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 text-neutral-500 uppercase tracking-wider text-[10px]">
                <th className="pb-3 font-semibold">Short Link</th>
                <th className="pb-3 font-semibold">Destination</th>
                <th className="pb-3 font-semibold text-right">Clicks</th>
                <th className="pb-3 font-semibold text-right">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {topLinks.map((link) => {
                const origin = window.location.origin;
                return (
                  <tr key={link.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 font-medium text-neutral-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">/r/{link.slug}</span>
                        {link.title && (
                          <span className="text-neutral-400 text-[11px] font-normal truncate max-w-[140px]">
                            ({link.title})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-neutral-500 max-w-xs truncate">
                      <span className="truncate block font-mono text-[11px]">{link.original_url}</span>
                    </td>
                    <td className="py-3 text-right font-bold text-neutral-900 font-mono">
                      {link.clicks_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      {link.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onSelectLink(link)}
                        className="text-xs font-semibold text-neutral-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1"
                      >
                        <span>Analytics</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
