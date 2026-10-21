import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface PasscodeModalProps {
  slug: string | null;
  onClose: () => void;
}

export const PasscodeModal: React.FC<PasscodeModalProps> = ({ slug, onClose }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!slug) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/urls/${slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Incorrect passcode');
      }

      if (data.target_url) {
        // Redirect to verified destination
        window.location.href = data.target_url;
      }
    } catch (err: any) {
      setError(err.message || 'Passcode verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-base font-bold text-neutral-900 mb-1">Protected Link</h2>
        <p className="text-xs text-neutral-500 mb-4">
          This short link (<span className="font-mono text-neutral-800">/r/{slug}</span>) requires a passcode to redirect.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-2.5 mb-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            required
            placeholder="Enter passcode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 font-mono text-center tracking-widest"
          />

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-all shadow-xs disabled:opacity-50"
          >
            <span>{loading ? 'Verifying...' : 'Unlock & Proceed'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          onClick={onClose}
          className="mt-3 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
