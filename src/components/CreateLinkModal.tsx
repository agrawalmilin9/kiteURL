import React, { useState } from 'react';
import { apiFetch } from '../api.ts';
import { X, Lock, Clock, Sparkles, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { useToast } from './Toast.tsx';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced fields
  const [expiresAt, setExpiresAt] = useState('');
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrl.trim()) {
      setError('Please provide a destination URL');
      return;
    }

    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      const res = await apiFetch('/api/v1/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_url: originalUrl.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          custom_slug: customSlug.trim() || undefined,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          password: enablePassword && password.trim() ? password.trim() : undefined,
          utm_source: utmSource.trim() || undefined,
          utm_medium: utmMedium.trim() || undefined,
          utm_campaign: utmCampaign.trim() || undefined,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create link');
      }

      showToast(`Shortlink created: /r/${data.slug}`);
      onSuccess();
      onClose();
      // Reset form
      setOriginalUrl('');
      setTitle('');
      setCustomSlug('');
      setDescription('');
      setExpiresAt('');
      setEnablePassword(false);
      setPassword('');
      setUtmSource('');
      setUtmMedium('');
      setUtmCampaign('');
      setTagsInput('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const domain = window.location.host;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-bold text-neutral-900">Create Short Link</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Destination URL */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Destination URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="https://example.com/my-long-landing-page"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
            />
          </div>

          {/* Title & Custom Slug Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Link Title <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Product Launch 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Custom Slug <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="launch"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Live Slug Preview */}
          <div className="text-[11px] text-neutral-500 bg-neutral-50 px-3 py-2 rounded-lg border border-neutral-200/60 font-mono flex items-center justify-between">
            <span className="truncate">
              Preview: <span className="text-neutral-900 font-semibold">{domain}/r/{customSlug || 'xyz123'}</span>
            </span>
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1 transition-colors"
            >
              <span>Campaign & Security Options</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Advanced Section */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              {/* UTM Campaign Builder */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                  UTM Campaign Parameters
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Source (e.g. twitter)"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Medium (e.g. social)"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Campaign (e.g. launch)"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Protection */}
              <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-neutral-800">Passcode Protection</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-neutral-900"></div>
                  </label>
                </div>
                {enablePassword && (
                  <input
                    type="password"
                    placeholder="Enter passcode required to redirect"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none font-mono"
                  />
                )}
              </div>

              {/* Expiry Date */}
              <div className="p-3 bg-neutral-50/70 rounded-xl border border-neutral-200/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-neutral-800">Automatic Expiration</span>
                </div>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none text-neutral-700"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Tags <span className="text-neutral-400 font-normal">(Comma separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="marketing, internal, beta"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Short Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
