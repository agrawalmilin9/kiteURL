import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check } from 'lucide-react';
import { LinkItem } from '../types.ts';
import { useToast } from './Toast.tsx';

interface QrCodeModalProps {
  link: LinkItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ link, isOpen, onClose }) => {
  const { showToast } = useToast();
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (link && isOpen) {
      const url = `${window.location.origin}/r/${link.slug}`;
      QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [link, isOpen]);

  if (!isOpen || !link) return null;

  const shortUrl = `${window.location.origin}/r/${link.slug}`;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${link.slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded QR code for /r/${link.slug}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    showToast('Shortlink copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xl max-w-sm w-full overflow-hidden text-center p-6">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
          <h2 className="text-sm font-bold text-neutral-900">QR Code</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Image Box */}
        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 inline-block mb-3">
          {dataUrl ? (
            <img src={dataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg shadow-2xs" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-neutral-400">
              Generating...
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="font-semibold text-neutral-900 text-sm truncate">{link.title || link.slug}</p>
          <p className="text-xs font-mono text-neutral-500 truncate mt-0.5">{shortUrl}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-neutral-100 hover:bg-neutral-200/70 text-neutral-800 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Link</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
