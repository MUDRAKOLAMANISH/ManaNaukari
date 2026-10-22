import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initGmailAuth,
  googleGmailSignIn,
  googleGmailSignOut,
  getGmailAccessToken
} from '../services/gmailAuthService';
import {
  gmailApiService,
  GmailUserProfile,
  GmailMessageSummary
} from '../services/gmailApiService';
import {
  Mail,
  Send,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Sparkles,
  ShieldCheck,
  Loader2,
  FileText,
  UserCheck,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Trash2
} from 'lucide-react';

interface GmailPageProps {
  onNavigate: (path: string) => void;
}

export const GmailPage: React.FC<GmailPageProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<GmailUserProfile | null>(null);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Compose State
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('application_followup');

  // Confirmation Modal State (MANDATORY per Workspace Skill rules)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'compose' | 'inbox'>('compose');
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);
        loadGmailData(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        setMessages([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadGmailData = async (token: string) => {
    setLoadingMessages(true);
    try {
      const [prof, msgRes] = await Promise.allSettled([
        gmailApiService.getUserProfile(token),
        gmailApiService.listMessages(token, 8),
      ]);

      if (prof.status === 'fulfilled') {
        setProfile(prof.value);
      }
      if (msgRes.status === 'fulfilled') {
        setMessages(msgRes.value.messages);
      }
    } catch (err: any) {
      console.warn('[GmailPage] Error loading Gmail data:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const result = await googleGmailSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        await loadGmailData(result.accessToken);
        setStatusMessage({ type: 'success', text: `Successfully connected Gmail account (${result.user.email})!` });
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Google Sign-In failed. Please try again.' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await googleGmailSignOut();
    setUser(null);
    setAccessToken(null);
    setProfile(null);
    setMessages([]);
    setStatusMessage({ type: 'success', text: 'Disconnected Gmail session successfully.' });
  };

  const applyTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey === 'application_followup') {
      setSubject('Application Follow-up: Software Engineer Position - Mana Naukari');
      setEmailBody(`Hi Hiring Manager,

I submitted my application for the Software Engineer position via Mana Naukari recently and wanted to follow up on the status of my application.

I am very excited about the opportunity to contribute to your team with my software development skills.

Attached is my updated resume for your review. Please let me know if you require any additional information.

Thank you for your time and consideration!

Best regards,
${user?.displayName || 'Candidate'}`);
    } else if (templateKey === 'recruiter_invite') {
      setSubject('Interview Invitation: Candidate Screening - Mana Naukari');
      setEmailBody(`Dear Candidate,

Thank you for applying for the open requisition on Mana Naukari. We were impressed by your background and profile.

We would like to invite you for an initial technical screening conversation. Please reply with your availability over the next few business days.

Looking forward to connecting with you soon!

Best regards,
Recruitment Officer
Mana Naukari Hiring Team`);
    } else if (templateKey === 'support_inquiry') {
      setSubject('Support Inquiry - Mana Naukari Platform');
      setEmailBody(`Hi Mana Naukari Team,

I am writing regarding my candidate profile and application updates on the platform.

Could you please assist me with updating my verified details?

Thank you,
${user?.displayName || 'Mana Naukari User'}`);
    }
  };

  // Pre-flight validation before showing confirmation modal
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!recipient || !recipient.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid recipient email address.' });
      return;
    }
    if (!subject.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a subject for your email.' });
      return;
    }
    if (!emailBody.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the email body content.' });
      return;
    }

    // Skill Constraint: Open explicit confirmation dialog
    setShowConfirmModal(true);
  };

  // Execute email dispatch via Gmail API after explicit user confirmation
  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    const currentToken = accessToken || getGmailAccessToken();

    if (!currentToken) {
      setStatusMessage({ type: 'error', text: 'Gmail OAuth access token expired. Please re-authenticate.' });
      return;
    }

    setSendingEmail(true);
    try {
      await gmailApiService.sendEmail(currentToken, {
        to: recipient,
        subject,
        body: emailBody.replace(/\n/g, '<br/>'),
        senderName: user?.displayName || undefined,
      });

      setStatusMessage({ type: 'success', text: `Email sent successfully to ${recipient} via Gmail API!` });
      setRecipient('');
      setSubject('');
      setEmailBody('');

      // Refresh inbox/sent messages list
      setTimeout(() => loadGmailData(currentToken), 1000);
    } catch (err: any) {
      console.error('[Gmail Send Error]:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch email via Gmail API.' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display tracking-tight">
                  Gmail Workspace Integration Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Google Workspace API
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Send job application follow-ups, recruiter screening invites, and candidate communications directly through your official Gmail account.
              </p>
            </div>
          </div>

          {/* Connect / User Badge */}
          {user && accessToken ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Google User'} className="w-10 h-10 rounded-full border border-slate-300" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {(user.email?.[0] || 'G').toUpperCase()}
                </div>
              )}
              <div className="text-xs">
                <div className="font-bold text-slate-900 truncate max-w-[150px]">{user.displayName || 'Google Account'}</div>
                <div className="text-slate-500 truncate max-w-[150px]">{user.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Disconnect Gmail Account"
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="gsi-material-button hover:shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium leading-relaxed">{statusMessage.text}</span>
          </div>
        )}

        {/* 2. Main Work Area (Requires Google Sign-In) */}
        {!user || !accessToken ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 text-center space-y-5 max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Connect Your Google Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Sign in with Google to grant permission for sending and managing emails via the Gmail API. Your tokens are cached safely in client memory.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button hover:shadow-md transition-all cursor-pointer"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isAuthenticating ? 'Connecting...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Uses official Google OAuth 2.0 with minimal requested scopes.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Quick Navigation & Profile Telemetry */}
            <div className="lg:col-span-4 space-y-6">

              {/* Profile Card */}
              {profile && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                      Gmail Telemetry
                    </span>
                    <button
                      onClick={() => accessToken && loadGmailData(accessToken)}
                      disabled={loadingMessages}
                      className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                      title="Refresh Gmail metrics"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Total Messages</div>
                      <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                        {profile.messagesTotal.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Threads</div>
                      <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                        {profile.threadsTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1">
                    <div className="font-semibold text-slate-700">Active Gmail Address:</div>
                    <div className="font-mono bg-slate-100 p-2 rounded-xl text-slate-800 break-all">
                      {profile.emailAddress}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
                <button
                  onClick={() => setActiveTab('compose')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'compose'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Compose &amp; Send Email</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTab === 'inbox'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="w-4 h-4" />
                    <span>Recent Messages ({messages.length})</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Template Selector */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
                  Quick Email Templates
                </h3>
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('compose');
                      applyTemplate('application_followup');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-slate-900">1. Candidate Application Follow-Up</div>
                    <div className="text-[11px] text-slate-500">Inquire about submitted application status</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('compose');
                      applyTemplate('recruiter_invite');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-slate-900">2. Recruiter Screening Invite</div>
                    <div className="text-[11px] text-slate-500">Invite candidate for initial technical call</div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('compose');
                      applyTemplate('support_inquiry');
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-slate-900">3. Platform Support Request</div>
                    <div className="text-[11px] text-slate-500">Inquire about profile or job opening updates</div>
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Active Tab Content */}
            <div className="lg:col-span-8 space-y-6">

              {activeTab === 'compose' && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold font-display text-slate-900">
                        Compose Email via Gmail API
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Messages are dispatched directly through your connected Google Workspace account.
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Gmail API Ready
                    </span>
                  </div>

                  <form onSubmit={handleInitiateSend} className="space-y-4 text-xs sm:text-sm">
                    
                    {/* Recipient */}
                    <div>
                      <label htmlFor="gmail-to" className="block font-bold text-slate-700 mb-1.5">
                        Recipient Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="gmail-to"
                        type="email"
                        required
                        placeholder="hiring@company.com or candidate@mananaukari.com"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="gmail-subject" className="block font-bold text-slate-700 mb-1.5">
                        Subject Line <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="gmail-subject"
                        type="text"
                        required
                        placeholder="Application Follow-up: Software Engineer"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label htmlFor="gmail-body" className="block font-bold text-slate-700 mb-1.5">
                        Email Content <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="gmail-body"
                        rows={8}
                        required
                        placeholder="Type your email message..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                      />
                    </div>

                    {/* Send Button */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Requires explicit confirmation dialog before sending</span>
                      </div>

                      <button
                        type="submit"
                        disabled={sendingEmail}
                        className="px-6 py-3 font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending via Gmail...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Email</span>
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {activeTab === 'inbox' && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-bold font-display text-slate-900">
                        Recent Gmail Messages
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Fetched live from your connected Gmail mailbox via REST API.
                      </p>
                    </div>

                    <button
                      onClick={() => accessToken && loadGmailData(accessToken)}
                      disabled={loadingMessages}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                      <span>Refresh Inbox</span>
                    </button>
                  </div>

                  {loadingMessages ? (
                    <div className="p-12 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Loading Gmail messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                      <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">No recent messages found.</p>
                      <p className="text-[11px] text-slate-500">Send an email using the compose tab to test dispatch.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[300px]">
                              {msg.from}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                            </span>
                          </div>

                          <div className="font-semibold text-blue-900 truncate">{msg.subject}</div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {msg.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* MANDATORY SKILL COMPLIANCE: Explicit User Confirmation Dialog for Mutating Operations */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 font-display">Confirm Email Send</h3>
                <p className="text-xs text-slate-500">Google Workspace API Authorization</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to send this email message via your official Gmail account?
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
              <div><span className="font-bold text-slate-700">Recipient:</span> <span className="font-mono text-slate-900">{recipient}</span></div>
              <div><span className="font-bold text-slate-700">Subject:</span> <span className="text-slate-900">{subject}</span></div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm &amp; Send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Inspection Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 font-display truncate pr-4">
                {selectedMessage.subject}
              </h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div><span className="font-bold text-slate-600">From:</span> <span className="font-mono text-slate-900">{selectedMessage.from}</span></div>
              <div><span className="font-bold text-slate-600">To:</span> <span className="font-mono text-slate-900">{selectedMessage.to}</span></div>
              <div><span className="font-bold text-slate-600">Date:</span> <span className="text-slate-700">{selectedMessage.date}</span></div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
              {selectedMessage.body || selectedMessage.snippet}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
