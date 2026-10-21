import React, { useState } from 'react';
import {
  Copy,
  Check,
  QrCode,
  BarChart2,
  ExternalLink,
  Lock,
  Clock,
  Pause,
  Play,
  Trash2,
  Edit2,
  Tag,
  Globe,
} from 'lucide-react';
import { LinkItem } from '../types.ts';
import { useToast } from './Toast.tsx';

interface LinkCardProps {
  link: LinkItem;
  onOpenAnalytics: (link: LinkItem) => void;
  onOpenQr: (link: LinkItem) => void;
  onOpenEdit: (link: LinkItem) => void;
  onToggleActive: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  link,
  onOpenAnalytics,
  onOpenQr,
  onOpenEdit,
  onToggleActive,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const origin = window.location.origin;
  const shortUrl = `${origin}/r/${link.slug}`;

  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    showToast(`Copied /r/${link.slug} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(link.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`group bg-white rounded-xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-xs ${
        !link.is_active || isExpired
          ? 'border-neutral-200 bg-neutral-50/50'
          : 'border-neutral-200/90 hover:border-neutral-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Section: Info */}
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-neutral-100 border border-neutral-200/60 flex items-center justify-center text-neutral-600 shrink-0">
            <Globe className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            {/* Title & Status */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-neutral-900 text-sm truncate max-w-sm">
                {link.title || link.slug}
              </h3>

              {/* Status Badge */}
              {isExpired ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Expired
                </span>
              ) : !link.is_active ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Paused
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              )}

              {/* Password indicator */}
              {link.is_password_protected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60" title="Password Protected">
                  <Lock className="w-2.5 h-2.5" />
                  Protected
                </span>
              )}

              {/* Expiry indicator */}
              {link.expires_at && !isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80" title={`Expires on ${new Date(link.expires_at).toLocaleString()}`}>
                  <Clock className="w-2.5 h-2.5" />
                  Expiring
                </span>
              )}
            </div>

            {/* Short URL with copy */}
            <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
              <button
                onClick={handleCopy}
                className="font-mono font-medium text-neutral-900 hover:text-indigo-600 transition-colors flex items-center gap-1.5 bg-neutral-100/80 hover:bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200/70"
                title="Click to copy shortlink"
              >
                <span>/r/{link.slug}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-neutral-400 group-hover:text-neutral-600" />
                )}
              </button>

              <span className="text-neutral-300">•</span>

              <a
                href={link.original_url}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-500 hover:text-neutral-800 transition-colors truncate max-w-xs flex items-center gap-1"
                title={link.original_url}
              >
                <span className="truncate">{link.original_url.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
              </a>
            </div>

            {/* Tags and Metadata */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-neutral-500">
              <span>Created {formattedDate}</span>
              {link.tags && link.tags.length > 0 && (
                <>
                  <span className="text-neutral-300">•</span>
                  <div className="flex items-center gap-1">
                    {link.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {link.utm_campaign && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                    utm: {link.utm_campaign}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Clicks & Action Buttons */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
          {/* Clicks count button that opens analytics */}
          <button
            onClick={() => onOpenAnalytics(link)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-neutral-700 text-xs font-semibold transition-all"
            title="View Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5 text-neutral-500" />
            <span>{link.clicks_count.toLocaleString()}</span>
            <span className="text-[10px] text-neutral-500 font-normal">clicks</span>
          </button>

          {/* Action icon buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenQr(link)}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              title="Show QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleActive(link)}
              className={`p-1.5 rounded-md transition-colors ${
                link.is_active
                  ? 'text-neutral-500 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={link.is_active ? 'Pause Link' : 'Resume Link'}
            >
              {link.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onOpenEdit(link)}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              title="Edit Link"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(link)}
              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              title="Delete Link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
