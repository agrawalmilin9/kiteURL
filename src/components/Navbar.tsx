import React from 'react';
import { Plus, Download, Zap, BarChart3, Layers } from 'lucide-react';

interface NavbarProps {
  currentTab: 'links' | 'analytics';
  onTabChange: (tab: 'links' | 'analytics') => void;
  onOpenCreate: () => void;
  onExportCsv: () => void;
  totalLinks: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenCreate,
  onExportCsv,
  totalLinks,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-semibold text-base shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 fill-current stroke-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 12l10 10 3-7 7-3-10-10z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold tracking-tight text-neutral-900 text-base">KiteURL</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Fast-Path Ready
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-600">
            <button
              onClick={() => onTabChange('links')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentTab === 'links'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Links</span>
              {totalLinks > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200/60 text-neutral-700">
                  {totalLinks}
                </span>
              )}
            </button>
            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentTab === 'analytics'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onExportCsv}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 rounded-lg transition-all shadow-2xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 rounded-lg transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Link</span>
          </button>
        </div>
      </div>
    </header>
  );
};
