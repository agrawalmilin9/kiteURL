import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api.ts';
import { X, Lock, Clock, Tag } from 'lucide-react';
import { LinkItem } from '../types.ts';
import { useToast } from './Toast.tsx';

interface EditLinkModalProps {
  link: LinkItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditLinkModal: React.FC<EditLinkModalProps> = ({ link, isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (link) {
      setTitle(link.title || '');
      setOriginalUrl(link.original_url || '');
      setDescription(link.description || '');
      setIsActive(link.is_active);
      setExpiresAt(link.expires_at ? link.expires_at.substring(0, 16) : '');
      setTagsInput(link.tags ? link.tags.join(', ') : '');
      setChangePassword(false);
      setNewPassword('');
      setRemovePassword(false);
    }
  }, [link]);

  if (!isOpen || !link) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      const res = await apiFetch(`/api/v1/urls/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          original_url: originalUrl.trim(),
          description: description.trim(),
          is_active: isActive,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          password: changePassword && newPassword.trim() ? newPassword.trim() : undefined,
          remove_password: removePassword,
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update link');
      }

      showToast(`Updated link /r/${link.slug}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Edit Link Details</h2>
            <p className="text-xs text-neutral-500 font-mono">/r/{link.slug}</p>
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

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Link Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Destination URL
            </label>
            <input
              type="text"
              required
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 font-mono focus:outline-none focus:border-neutral-900"
            />
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
            <div>
              <span className="text-xs font-semibold text-neutral-800 block">Link Status</span>
              <span className="text-[11px] text-neutral-500">
                {isActive ? 'Active and accepting redirects' : 'Paused (traffic receives paused message)'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-neutral-900"></div>
            </label>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Expiration Date</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
              />
              {expiresAt && (
                <button
                  type="button"
                  onClick={() => setExpiresAt('')}
                  className="px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 bg-neutral-100 rounded-md shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Password Protection */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-xs font-semibold text-neutral-800">
                  {link.is_password_protected ? 'Protected Link' : 'Passcode Protection'}
                </span>
              </div>
              {link.is_password_protected ? (
                <button
                  type="button"
                  onClick={() => setRemovePassword(!removePassword)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                    removePassword ? 'bg-rose-100 text-rose-700' : 'bg-neutral-200/80 text-neutral-700 hover:bg-neutral-300'
                  }`}
                >
                  {removePassword ? 'Will Remove' : 'Remove Passcode'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  className="text-[11px] text-neutral-700 underline"
                >
                  {changePassword ? 'Cancel' : 'Add Passcode'}
                </button>
              )}
            </div>

            {changePassword && !removePassword && (
              <input
                type="password"
                placeholder="Enter new passcode"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-md font-mono focus:border-neutral-900 focus:outline-none"
              />
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tags</label>
            <input
              type="text"
              placeholder="launch, docs, campaign"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:border-neutral-900 focus:outline-none"
            />
          </div>

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
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
