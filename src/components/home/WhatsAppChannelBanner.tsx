import React from 'react';
import { MessageSquare, ArrowRight, ShieldCheck, Sparkles, Bell } from 'lucide-react';
import { OFFICIAL_LINKS } from '../../constants/links';

export const WhatsAppChannelBanner: React.FC = () => {
  const handleJoinClick = () => {
    window.open(OFFICIAL_LINKS.WHATSAPP_CHANNEL, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-8 sm:p-10 shadow-lg shadow-emerald-700/10">
      {/* Background Decorative Rings */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 pointer-events-none blur-xl" />
      <div className="absolute left-1/2 -top-12 w-48 h-48 rounded-full bg-emerald-400/20 pointer-events-none blur-2xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-3 text-center lg:text-left max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/40 border border-emerald-400/30 text-emerald-100 text-xs font-semibold backdrop-blur-xs">
            <Bell className="w-3.5 h-3.5" />
            <span>Instant Mobile Alerts · Zero Missed Drives</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight text-white">
            Join the Official Mana Naukari WhatsApp Community
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
            Join the official Mana Naukari WhatsApp Community for daily job updates, freshers openings, verified internships, and off-campus drives.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1 text-xs text-emerald-100 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Verified direct corporate links only</span>
            </div>
            <span className="text-emerald-300/60 hidden sm:inline">·</span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Free instant alerts</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={handleJoinClick}
            className="inline-flex items-center gap-2.5 px-7 py-4 text-sm font-extrabold text-emerald-950 bg-white hover:bg-emerald-50 active:bg-emerald-100 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group"
          >
            <MessageSquare className="w-5 h-5 text-emerald-600 fill-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Join WhatsApp Channel</span>
            <ArrowRight className="w-4 h-4 text-emerald-800 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};
