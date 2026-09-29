import React, { useState } from 'react';
import { 
  Share2, Copy, Check, MessageCircle, Send, Linkedin, Mail, X 
} from 'lucide-react';
import { getAbsoluteJobUrl } from '../../utils/jobUrlUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  company: string;
  jobUrlPath: string;
  onCopiedToast?: (message: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  company,
  jobUrlPath,
  onCopiedToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullUrl = getAbsoluteJobUrl(jobUrlPath);
  const shareText = `Hiring Alert: ${jobTitle} at ${company} on Mana Naukari. Apply now:`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      if (onCopiedToast) {
        onCopiedToast('Job link copied successfully.');
      }
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      if (onCopiedToast) {
        onCopiedToast('Job link copied successfully.');
      }
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Direct Social Share URLs
  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800 text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-slate-700 hover:bg-slate-800 text-white',
      url: `mailto:?subject=${encodeURIComponent(`Job Opportunity: ${jobTitle} at ${company}`)}&body=${encodeURIComponent(`${shareText}\n\n${fullUrl}`)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">
                Share this Job Opening
              </h3>
              <p className="text-xs text-slate-500">Spread the opportunity with friends and colleagues</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Job Mini Preview */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs space-y-1">
          <div className="font-bold text-slate-900 text-sm line-clamp-1">{jobTitle}</div>
          <div className="text-slate-600 font-medium">{company}</div>
        </div>

        {/* Share buttons grid */}
        <div className="grid grid-cols-4 gap-2.5">
          {shareLinks.map((platform) => {
            const Icon = platform.icon;
            return (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200/60 group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${platform.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">{platform.name}</span>
              </a>
            );
          })}
        </div>

        {/* Copy Link Input Bar */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Or copy direct job link:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-white" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
