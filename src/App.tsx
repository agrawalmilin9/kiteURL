/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  X,
  Link2,
  Layers,
  ArrowUpDown,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { StatsBanner } from './components/StatsBanner.tsx';
import { LinkCard } from './components/LinkCard.tsx';
import { CreateLinkModal } from './components/CreateLinkModal.tsx';
import { EditLinkModal } from './components/EditLinkModal.tsx';
import { QrCodeModal } from './components/QrCodeModal.tsx';
import { AnalyticsDrawer } from './components/AnalyticsDrawer.tsx';
import { PasscodeModal } from './components/PasscodeModal.tsx';
import { AnalyticsOverviewView } from './components/AnalyticsOverviewView.tsx';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';
import { apiFetch, AUTH_EVENT, setApiKey } from './api.ts';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { LinkItem, SystemOverview } from './types.ts';

function AppContent() {
  const { showToast } = useToast();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'links' | 'analytics'>('links');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'clicks' | 'alphabetical'>('newest');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [qrLink, setQrLink] = useState<LinkItem | null>(null);
  const [analyticsLink, setAnalyticsLink] = useState<LinkItem | null>(null);
  const [passcodeSlug, setPasscodeSlug] = useState<string | null>(null);

  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    const onAuth = () => setNeedsKey(true);
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  // Check URL params for passcode challenge
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const passCode = urlParams.get('passcode');
    if (passCode) {
      setPasscodeSlug(passCode);
    }
  }, []);

  const fetchData = async () => {
    // Visitors arriving from a protected short link only see the passcode box, not the dashboard.
    if (new URLSearchParams(window.location.search).get('passcode')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [linksRes, overviewRes] = await Promise.all([
        apiFetch('/api/v1/urls'),
        apiFetch('/api/v1/analytics/overview'),
      ]);

      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setLinks(linksData);
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Sort links
  const filteredLinks = useMemo(() => {
    return links
      .filter((link) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            link.slug.toLowerCase().includes(q) ||
            link.title?.toLowerCase().includes(q) ||
            link.original_url.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Status filter
        const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
        if (statusFilter === 'active' && (!link.is_active || isExpired)) return false;
        if (statusFilter === 'paused' && (link.is_active || isExpired)) return false;
        if (statusFilter === 'expired' && !isExpired) return false;

        // Tag filter
        if (selectedTag && (!link.tags || !link.tags.includes(selectedTag))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'clicks') return b.clicks_count - a.clicks_count;
        if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        // Default: newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [links, search, statusFilter, selectedTag, sortBy]);

  // Unique tags for filter chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    links.forEach((l) => l.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [links]);

  const handleToggleActive = async (link: LinkItem) => {
    const nextState = !link.is_active;
    try {
      const res = await apiFetch(`/api/v1/urls/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState }),
      });
      if (res.ok) {
        showToast(nextState ? `Resumed /r/${link.slug}` : `Paused /r/${link.slug}`);
        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, is_active: nextState } : l))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (link: LinkItem) => {
    if (!confirm(`Are you sure you want to permanently delete /r/${link.slug}?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/urls/${link.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted /r/${link.slug}`);
        setLinks((prev) => prev.filter((l) => l.id !== link.id));
        if (overview) {
          setOverview({
            ...overview,
            total_links: Math.max(overview.total_links - 1, 0),
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await apiFetch('/api/v1/export/csv');
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kiteurl-export.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exporting link data as CSV');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenCreate={() => setIsCreateOpen(true)}
        onExportCsv={handleExportCsv}
        totalLinks={links.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Summary Banner */}
        <StatsBanner overview={overview} loading={loading} />

        {currentTab === 'analytics' ? (
          <AnalyticsOverviewView
            overview={overview}
            links={links}
            onSelectLink={(link) => setAnalyticsLink(link)}
          />
        ) : (
          <div className="space-y-4">
            {/* Control Bar: Search, Status Tabs, Sort */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by title, custom slug, or destination..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-neutral-50/70 border border-neutral-200/80 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-900 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Right controls: Status Filter & Sort */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Pills */}
                  <div className="inline-flex p-0.5 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-600">
                    {(['all', 'active', 'paused', 'expired'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-md capitalize transition-all text-[11px] ${
                          statusFilter === status
                            ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                            : 'hover:text-neutral-900'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="text-[11px] font-medium bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-900"
                    >
                      <option value="newest">Newest First</option>
                      <option value="clicks">Most Clicks</option>
                      <option value="alphabetical">Alphabetical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tag Filter Chips (if any exist) */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[11px]">
                  <span className="text-neutral-400 font-medium mr-1 text-[10px]">Filter tag:</span>
                  {selectedTag && (
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 font-semibold hover:bg-neutral-300 transition-colors flex items-center gap-1"
                    >
                      <span>All</span>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  {allTags.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                      className={`px-2 py-0.5 rounded-full border transition-colors ${
                        selectedTag === t
                          ? 'bg-neutral-900 text-white border-neutral-900 font-medium'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Link List */}
            {loading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-neutral-500">Loading your shortlinks...</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-12 text-center shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1">No links found</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-4">
                  {search || statusFilter !== 'all' || selectedTag
                    ? 'No links matched your current filter criteria. Try clearing filters.'
                    : 'Create your first branded short link to start tracking real-time click analytics.'}
                </p>
                {search || statusFilter !== 'all' || selectedTag ? (
                  <button
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('all');
                      setSelectedTag(null);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Short Link</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onOpenAnalytics={(l) => setAnalyticsLink(l)}
                    onOpenQr={(l) => setQrLink(l)}
                    onOpenEdit={(l) => setEditingLink(l)}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200/60 py-6 text-center text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} KiteURL. Real-time link management platform.</p>
          <div className="flex items-center gap-4 text-[11px] text-neutral-500 font-mono">
            <span>Sub-ms In-Memory Caching</span>
            <span>•</span>
            <span>Atomic Click Telemetry</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ApiKeyModal
        isOpen={needsKey && !passcodeSlug}
        onSubmit={(key) => {
          setApiKey(key);
          setNeedsKey(false);
          fetchData();
        }}
      />

      <CreateLinkModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchData}
      />

      <EditLinkModal
        link={editingLink}
        isOpen={Boolean(editingLink)}
        onClose={() => setEditingLink(null)}
        onSuccess={fetchData}
      />

      <QrCodeModal
        link={qrLink}
        isOpen={Boolean(qrLink)}
        onClose={() => setQrLink(null)}
      />

      <AnalyticsDrawer
        link={analyticsLink}
        isOpen={Boolean(analyticsLink)}
        onClose={() => setAnalyticsLink(null)}
      />

      <PasscodeModal
        slug={passcodeSlug}
        onClose={() => {
          setPasscodeSlug(null);
          // Remove param from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
