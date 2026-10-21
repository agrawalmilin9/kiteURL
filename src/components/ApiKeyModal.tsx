import React, { useState } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSubmit }) => {
  const [key, setKey] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900 mb-1">Admin key required</h3>
        <p className="text-xs text-neutral-500 mb-5">
          Enter the API_KEY of this server to manage links and view analytics.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) onSubmit(key.trim());
          }}
          className="space-y-3"
        >
          <input
            type="password"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin API key"
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-all"
          >
            <span>Unlock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
