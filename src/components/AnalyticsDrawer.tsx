import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api.ts';
import {
  X,
  MousePointerClick,
  Users,
  Clock,
  Zap,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  ArrowUpRight,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { LinkItem, LinkAnalytics } from '../types.ts';
import { useToast } from './Toast.tsx';

interface AnalyticsDrawerProps {
  link: LinkItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({ link, isOpen, onClose }) => {
  const { showToast } = useToast();
  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (!link) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/analytics/${link.slug}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch link analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && link) {
      fetchAnalytics();
    } else {
      setData(null);
    }
  }, [isOpen, link]);

  if (!isOpen || !link) return null;

  const origin = window.location.origin;
  const shortUrl = `${origin}/r/${link.slug}`;

  // Find max clicks in timeline for SVG scaling
  const maxClicks = Math.max(...(data?.timeline.map((t) => t.clicks) || [1]), 5);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-neutral-200/90 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-bold text-neutral-900 truncate">
                {link.title || link.slug}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                In-memory cache
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-neutral-900 underline flex items-center gap-1 truncate"
              >
                <span>/r/{link.slug}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              title="Refresh Analytics"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[11px] font-medium text-neutral-600">Total Engagements</span>
                <MousePointerClick className="w-3.5 h-3.5 text-neutral-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {data ? data.total_clicks.toLocaleString() : '—'}
              </div>
            </div>

            <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[11px] font-medium text-neutral-600">Unique Visitors</span>
                <Users className="w-3.5 h-3.5 text-neutral-500" />
              </div>
              <div className="text-xl font-bold text-neutral-900">
                {data ? data.unique_visitors.toLocaleString() : '—'}
              </div>
            </div>

            <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-neutral-500 mb-1">
                <span className="text-[11px] font-medium text-neutral-600">Today's Clicks</span>
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
              </div>
              <div className="text-xl font-bold text-emerald-600">
                {data ? `+${data.today_clicks}` : '—'}
              </div>
            </div>
          </div>

          {/* Interactive Clicks Timeline Chart */}
          <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Clicks Over Time (Last 7 Days)
                </h3>
                <p className="text-[11px] text-neutral-500">Daily clicks recorded by this server</p>
              </div>
            </div>

            {/* SVG Bar Chart */}
            <div className="pt-2">
              <div className="h-36 flex items-end gap-2.5 pt-4">
                {data?.timeline.map((item, idx) => {
                  const heightPercent = Math.max((item.clicks / maxClicks) * 100, 4);
                  return (
                    <div
                      key={item.date || idx}
                      className="flex-1 flex flex-col items-center gap-1.5 group/bar h-full justify-end"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded pointer-events-none font-mono">
                        {item.clicks}
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-neutral-900 group-hover/bar:bg-indigo-600 rounded-t-sm transition-all duration-300"
                      />

                      {/* Date label */}
                      <span className="text-[10px] text-neutral-500 font-medium truncate max-w-full">
                        {item.label.split(',')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown Grid: Top Referrers & Top Countries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Referrers */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Top Referrers
              </h3>
              <div className="space-y-2.5">
                {data?.top_referrers && data.top_referrers.length > 0 ? (
                  data.top_referrers.map((ref) => (
                    <div key={ref.referer} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-700 font-medium truncate max-w-[160px]">
                          {ref.referer}
                        </span>
                        <span className="text-neutral-500 text-[11px] font-mono">
                          {ref.count} ({ref.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${ref.percentage}%` }}
                          className="h-full bg-neutral-900 rounded-full"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 py-3 text-center">No referrers recorded yet</p>
                )}
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Top Locations
              </h3>
              <div className="space-y-2.5">
                <p className="text-xs text-neutral-400 py-3 text-center">
                  Location data is not collected (no GeoIP database is configured).
                </p>
              </div>
            </div>
          </div>

          {/* Devices & Browsers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Devices */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Device Distribution
              </h3>
              <div className="flex items-center gap-3">
                {data?.devices.map((d) => (
                  <div
                    key={d.device}
                    className="flex-1 bg-neutral-50 rounded-lg p-2.5 text-center border border-neutral-100"
                  >
                    <div className="flex justify-center text-neutral-600 mb-1">
                      {d.device === 'mobile' ? (
                        <Smartphone className="w-4 h-4" />
                      ) : d.device === 'tablet' ? (
                        <Tablet className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 capitalize block">
                      {d.device}
                    </span>
                    <span className="text-sm font-bold text-neutral-900 font-mono">
                      {d.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browsers */}
            <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Browser Types
              </h3>
              <div className="space-y-1.5">
                {data?.top_browsers.slice(0, 3).map((b) => (
                  <div key={b.browser} className="flex items-center justify-between text-xs">
                    <span className="text-neutral-700 font-medium">{b.browser}</span>
                    <span className="font-mono text-neutral-500 text-[11px]">
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Live Clicks Stream */}
          <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Recent Activity Stream</span>
              <span className="text-[10px] text-neutral-400 font-normal">Real-time log</span>
            </h3>

            <div className="divide-y divide-neutral-100 text-xs">
              {data?.recent_clicks && data.recent_clicks.length > 0 ? (
                data.recent_clicks.map((clk) => {
                  const clickDate = new Date(clk.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <div
                      key={clk.id}
                      className="py-2.5 flex items-center justify-between gap-2 hover:bg-neutral-50/50 px-1 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-neutral-800 font-medium truncate max-w-[120px]">
                          {clk.referer ? clk.referer.replace(/^https?:\/\//, '') : 'Direct'}
                        </span>
                        <span className="text-neutral-400 text-[11px]">•</span>
                        <span className="text-neutral-500 text-[11px] truncate">{clk.browser}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono shrink-0">
                        <span className="capitalize">{clk.device_type}</span>
                        <span>•</span>
                        <span>{clickDate}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-neutral-400 py-3 text-center">No clicks recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
