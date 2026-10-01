import React, { useState, useEffect } from 'react';
import {
  Share2, Copy, Check, Send, Linkedin, Twitter, Facebook,
  MessageCircle, X, ExternalLink, Settings, Sparkles, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  ShareableJob,
  generateJobSocialMessage,
  copyJobMessageToClipboard,
  openWhatsAppShare,
  openTelegramShare,
  postToTelegramBotApi,
  openLinkedInShare,
  openTwitterShare,
  openFacebookShare,
  getAutoSharePreference,
  setAutoSharePreference,
  getTelegramConfig,
  saveTelegramConfig,
  TelegramConfig,
  getManaNaukariJobUrl,
} from '../../utils/socialShare';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ShareableJob | null;
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  job,
  onToast,
}) => {
  const [formattedMessage, setFormattedMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoShare, setAutoShare] = useState(true);
  const [isPostingTelegram, setIsPostingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [showTelegramSettings, setShowTelegramSettings] = useState(false);
  const [telegramConfig, setTelegramConfigState] = useState<TelegramConfig>({
    botToken: '',
    channelId: '',
    autoPostOnPublish: false,
  });

  // Hydrate state when modal opens or job changes
  useEffect(() => {
    if (job) {
      setFormattedMessage(generateJobSocialMessage(job));
    }
    setAutoShare(getAutoSharePreference());
    const config = getTelegramConfig();
    setTelegramConfigState(config);
    setTelegramStatus(null);
    setCopied(false);
  }, [isOpen, job]);

  if (!isOpen || !job) return null;

  const jobUrl = getManaNaukariJobUrl(job.id);

  const handleCopyMessage = async () => {
    const success = await copyJobMessageToClipboard(formattedMessage);
    if (success) {
      setCopied(true);
      if (onToast) onToast('Formatted job message copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleWhatsApp = () => {
    openWhatsAppShare(job, formattedMessage);
    if (onToast) onToast('Message copied! Opening WhatsApp...', 'success');
  };

  const handleTelegramShareLink = () => {
    openTelegramShare(job, formattedMessage);
    if (onToast) onToast('Opening Telegram share dialog...', 'success');
  };

  const handleTelegramBotPost = async () => {
    if (!telegramConfig.botToken || !telegramConfig.channelId) {
      setShowTelegramSettings(true);
      setTelegramStatus({
        text: 'Please configure your Telegram Bot Token & Channel Username below.',
        type: 'error',
      });
      return;
    }

    setIsPostingTelegram(true);
    setTelegramStatus(null);

    const result = await postToTelegramBotApi(job, formattedMessage, telegramConfig);
    setIsPostingTelegram(false);

    if (result.success) {
      setTelegramStatus({ text: result.message, type: 'success' });
      if (onToast) onToast('Job broadcasted to Telegram channel!', 'success');
    } else {
      setTelegramStatus({ text: result.message, type: 'error' });
      if (onToast) onToast(`Telegram error: ${result.message}`, 'error');
    }
  };

  const handleLinkedIn = () => {
    openLinkedInShare(job);
    if (onToast) onToast('Opening LinkedIn share window...', 'success');
  };

  const handleTwitter = () => {
    openTwitterShare(job);
    if (onToast) onToast('Opening Twitter / X share window...', 'success');
  };

  const handleFacebook = () => {
    openFacebookShare(job);
    if (onToast) onToast('Opening Facebook share window...', 'success');
  };

  const handleAutoShareToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoShare(checked);
    setAutoSharePreference(checked);
  };

  const handleSaveTelegramConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveTelegramConfig(telegramConfig);
    setShowTelegramSettings(false);
    setTelegramStatus({ text: 'Telegram settings saved successfully!', type: 'success' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl space-y-5 animate-scaleUp border border-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                Auto Job Social Sharing
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Broadcast this verified job opening across WhatsApp, Telegram, LinkedIn, X & Facebook
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telegram Status Banner */}
        {telegramStatus && (
          <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-fadeIn ${
            telegramStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {telegramStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{telegramStatus.text}</span>
          </div>
        )}

        {/* Quick Job Summary Badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-extrabold text-slate-900 text-sm block">
              {job.title}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[11px] mt-0.5">
              <span className="font-semibold text-blue-600">{job.company}</span>
              <span>•</span>
              <span>{job.location || 'Pan India'}</span>
              <span>•</span>
              <span>{job.experience || 'Fresher'}</span>
              <span>•</span>
              <span className="font-medium text-emerald-600">{job.salary || 'Best in Industry'}</span>
            </div>
          </div>

          <a
            href={jobUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
          >
            <span>View Job Page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Generated Message Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Generated Social Broadcast Message:
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingMessage(!isEditingMessage)}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {isEditingMessage ? 'Done Editing' : 'Edit Text'}
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEditingMessage ? (
            <textarea
              rows={8}
              value={formattedMessage}
              onChange={(e) => setFormattedMessage(e.target.value)}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition-all"
            />
          ) : (
            <div className="p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl max-h-48 overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed select-all">
              {formattedMessage}
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Instant Broadcast Channels:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Share to WhatsApp Button */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4f] text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer group"
            >
              <MessageCircle className="w-4 h-4 fill-white shrink-0 group-hover:scale-110 transition-transform" />
              <span>Share to WhatsApp</span>
              <span className="text-[10px] font-medium opacity-85 ml-auto bg-black/15 px-2 py-0.5 rounded-lg">
                wa.me
              </span>
            </button>

            {/* 2. Share to Telegram (Bot API & Direct) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTelegramBotPost}
                disabled={isPostingTelegram}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#229ED9] hover:bg-[#1e8ec3] active:bg-[#1a7eb0] disabled:opacity-60 text-white font-bold text-xs rounded-2xl shadow-xs transition-all cursor-pointer group"
              >
                {isPostingTelegram ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Posting to Channel...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Post to Telegram Channel</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTelegramShareLink}
                className="p-3 bg-sky-50 hover:bg-sky-100 text-[#229ED9] border border-sky-200 rounded-2xl transition-colors cursor-pointer"
                title="Open Telegram share dialog for personal chats/groups"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowTelegramSettings(!showTelegramSettings)}
                className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                  showTelegramSettings
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title="Configure Telegram Bot Token & Channel ID"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Additional Social Sharing Buttons */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* LinkedIn */}
            <button
              type="button"
              onClick={handleLinkedIn}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0077B5] hover:bg-[#00669c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Linkedin className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>LinkedIn</span>
            </button>

            {/* Twitter / X */}
            <button
              type="button"
              onClick={handleTwitter}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Twitter className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Twitter / X</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={handleFacebook}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1877F2] hover:bg-[#1466d1] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* Telegram Configuration Settings Drawer */}
        {showTelegramSettings && (
          <form onSubmit={handleSaveTelegramConfig} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-blue-600" />
                Telegram Bot Channel Integration Settings
              </span>
              <button
                type="button"
                onClick={() => setShowTelegramSettings(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Create a bot via <strong>@BotFather</strong> on Telegram, obtain your Bot Token, and add the bot as an <strong>Administrator</strong> in your Telegram channel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfigState({ ...telegramConfig, botToken: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Channel Username or Chat ID
                </label>
                <input
                  type="text"
                  placeholder="@mananaukari_jobs or -100xxxxxxxxxx"
                  value={telegramConfig.channelId}
                  onChange={(e) => setTelegramConfigState({ ...telegramConfig, channelId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Credentials saved securely in your browser session.
              </span>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* Footer & Auto-Share Preference Toggle */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={autoShare}
              onChange={handleAutoShareToggle}
              className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-800">
              Auto Share After Publishing
            </span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
