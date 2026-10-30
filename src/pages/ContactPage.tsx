import React, { useState } from 'react';
import { contactMessagesService } from '../services/supabaseService';
import { Mail, MapPin, Phone, CheckCircle2, AlertCircle, Loader2, Send, ShieldCheck } from 'lucide-react';
import { OFFICIAL_LINKS } from '../constants/links';

interface ContactPageProps {
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-spam hidden field
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // 1. Bot Honeypot Check
    if (honeypot.trim() !== '') {
      // Bot caught! Simulate fake success without making DB request
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSuccess(true);
        setName('');
        setEmail('');
        setMessage('');
      }, 800);
      return;
    }

    // 2. Client Input Validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError('Please fill out all required fields.');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (trimmedMessage.length < 5) {
      setError('Your message is too short. Please enter at least 5 characters.');
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError('Your message exceeds the 2000 character limit. Please shorten your message.');
      return;
    }

    // 3. Client Rate Limiting (30s cooldown)
    const lastSubmit = sessionStorage.getItem('manacarrier_last_contact_ts');
    const now = Date.now();
    if (lastSubmit && now - parseInt(lastSubmit, 10) < 30000) {
      const waitSecs = Math.ceil((30000 - (now - parseInt(lastSubmit, 10))) / 1000);
      setError(`Please wait ${waitSecs} seconds before submitting another contact message.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: sendErr } = await contactMessagesService.create({
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
      });

      if (sendErr) {
        throw new Error(sendErr.message || 'Failed to record your message in our database.');
      }

      sessionStorage.setItem('manacarrier_last_contact_ts', String(now));
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      console.error('[ContactPage] Submission error:', err);
      setError(
        err?.message ||
          'We encountered an issue submitting your inquiry. Please check your internet connection or email us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-16 px-4 sm:px-6">
      
      {/* Page Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Official Candidate &amp; Employer Support</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
          Contact ManaCarrier
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Have an inquiry, need career guidance, want to report a broken link, or represent a corporate hiring team? Send us a message.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Contact Info Card */}
        <div className="md:col-span-2 space-y-6 bg-slate-900 text-slate-300 p-8 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white font-display">
              Get in Touch
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our support and verification team responds to candidate queries and recruiter verifications within 24–48 hours.
            </p>

            <div className="space-y-4 text-xs pt-2">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Hyderabad, Telangana, India</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <a
                  href={`mailto:${OFFICIAL_LINKS.SUPPORT_EMAIL}`}
                  className="hover:text-blue-300 transition-colors underline underline-offset-2"
                >
                  <span>{OFFICIAL_LINKS.SUPPORT_EMAIL}</span>
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>+91 91219 90000</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500">
            ManaCarrier Verification &amp; Support Cell.
          </div>
        </div>

        {/* Contact Form Column */}
        <div className="md:col-span-3 bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm">
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Message Sent Successfully!</strong>
                <span>Thank you. Your message has been received and our team will get in touch with you shortly.</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot Field (Hidden for real human users) */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="website_url_hp"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Iyer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="priya@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Message &amp; Inquiry <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder="How can we assist you or what would you like to inquire about?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
              <div className="text-[11px] text-slate-400 text-right mt-1">
                {message.length} / 2000 characters
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Message...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
