import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, CheckCircle2, ArrowLeft, ShieldCheck, AlertCircle, MessageSquare, Video,
  HelpCircle, Check, ChevronDown, Mic, MicOff, Volume2, VolumeX, Clock, Play, RotateCcw,
  Send, Brain, Award, BookOpen, Star, FileText, Download, UserCheck, Zap, Layers, RefreshCw,
  ExternalLink, ChevronRight, X, Smartphone
} from 'lucide-react';
import {
  mockInterviewService,
  INTERVIEW_TOPICS,
  EXPERIENCE_LEVELS,
  INTERVIEW_MODES,
  MOCK_INTERVIEW_PRICE_INR,
  normalizeWhatsAppNumber,
} from '../services/mockInterviewService';
import {
  aiMockInterviewService,
  AIQuestion,
  QuestionEvaluation,
  InterviewFinalReport,
  PracticeSessionConfig,
} from '../services/aiMockInterviewService';
import { MockInterviewBooking } from '../types/database.types';

interface MockInterviewPageProps {
  onNavigate: (path: string) => void;
}

export const MockInterviewPage: React.FC<MockInterviewPageProps> = ({ onNavigate }) => {
  // Main View Tab: 'ai-practice' | 'book-human' | 'history'
  const [activeTab, setActiveTab] = useState<'ai-practice' | 'book-human' | 'history'>('ai-practice');

  // --- AI PRACTICE ROOM STATES ---
  const [sessionStage, setSessionStage] = useState<'config' | 'interview' | 'report'>('config');

  // Config Form
  const [selectedRole, setSelectedRole] = useState('Software Engineer');
  const [customRole, setCustomRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [companyType, setCompanyType] = useState('IT Service (TCS, Infosys, Wipro)');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [languageMode, setLanguageMode] = useState('English');

  // Active Session State
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [evaluations, setEvaluations] = useState<QuestionEvaluation[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<QuestionEvaluation | null>(null);
  const [finalReport, setFinalReport] = useState<InterviewFinalReport | null>(null);

  // Loaders & Interactivity
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Timer per question
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  // Speech-to-Text (STT)
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Past Practice Session History
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  // --- HUMAN MOCK INTERVIEW (₹99) BOOKING FORM STATES ---
  const [bookFullName, setBookFullName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookWhatsapp, setBookWhatsapp] = useState('');
  const [bookTopic, setBookTopic] = useState('Python');
  const [bookCustomTopic, setBookCustomTopic] = useState('');
  const [bookExpLevel, setBookExpLevel] = useState('Fresher');
  const [bookMode, setBookMode] = useState('Technical Interview');
  const [bookAvailability, setBookAvailability] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [bookAgreed, setBookAgreed] = useState(true);

  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submittedBooking, setSubmittedBooking] = useState<MockInterviewBooking | null>(null);
  const [bookingErrors, setBookingErrors] = useState<Record<string, string>>({});

  // Initialize Speech Recognition & History on Mount
  useEffect(() => {
    // Check Speech Recognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setCandidateAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('[STT] Speech recognition error:', err);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSttSupported(false);
      }
    }

    // Load History
    try {
      const historyStr = localStorage.getItem('mana_carrier_ai_interview_history') || localStorage.getItem('mana_naukari_ai_interview_history');
      if (historyStr) {
        setPastSessions(JSON.parse(historyStr));
      }
    } catch (e) {
      console.warn('Failed to parse practice history from localStorage', e);
    }
  }, []);

  // Timer countdown hook
  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // STT Control
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start speech recognition', err);
      }
    }
  };

  // TTS Control (Speak Question Aloud)
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any existing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = 'en-IN';

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Step 1: Start AI Interview Session
  const handleStartAISession = async () => {
    setLoadingQuestions(true);
    setEvaluations([]);
    setCurrentEvaluation(null);
    setCandidateAnswer('');
    setCurrentQuestionIndex(0);

    const config: PracticeSessionConfig = {
      role: selectedRole,
      customRole: selectedRole === 'Custom / Role-Based' ? customRole : undefined,
      experienceLevel,
      companyType,
      questionCount,
      languageMode,
    };

    const fetchedQuestions = await aiMockInterviewService.generateQuestions(config);
    setQuestions(fetchedQuestions);
    setLoadingQuestions(false);

    if (fetchedQuestions.length > 0) {
      setSessionStage('interview');
      setTimerSeconds(fetchedQuestions[0].timeLimitSeconds || 120);
      setTimerActive(true);
    }
  };

  // Submit Answer for Current Question
  const handleEvaluateAnswer = async () => {
    if (!candidateAnswer.trim() || evaluations[currentQuestionIndex]) return;

    setEvaluatingAnswer(true);
    setTimerActive(false);

    const currentQ = questions[currentQuestionIndex];
    const config: PracticeSessionConfig = {
      role: selectedRole,
      customRole: selectedRole === 'Custom / Role-Based' ? customRole : undefined,
      experienceLevel,
      companyType,
      questionCount,
      languageMode,
    };

    const evalResult = await aiMockInterviewService.evaluateAnswer(currentQ, candidateAnswer, config);

    const updated = [...evaluations];
    updated[currentQuestionIndex] = evalResult;
    setEvaluations(updated);
    setCurrentEvaluation(evalResult);
    setEvaluatingAnswer(false);
  };

  // Next Question or Finish Interview
  const handleNextQuestion = async () => {
    if (currentQuestionIndex + 1 < questions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setCandidateAnswer('');
      setCurrentEvaluation(null);
      setShowHint(false);
      setTimerSeconds(questions[nextIdx].timeLimitSeconds || 120);
      setTimerActive(true);
    } else {
      // Generate Final Report
      setGeneratingReport(true);
      setSessionStage('report');

      const config: PracticeSessionConfig = {
        role: selectedRole,
        customRole: selectedRole === 'Custom / Role-Based' ? customRole : undefined,
        experienceLevel,
        companyType,
        questionCount,
        languageMode,
      };

      const report = await aiMockInterviewService.generateFinalReport(evaluations, config);
      setFinalReport(report);
      setGeneratingReport(false);

      // Refresh history
      try {
        const historyStr = localStorage.getItem('mana_carrier_ai_interview_history') || localStorage.getItem('mana_naukari_ai_interview_history');
        if (historyStr) setPastSessions(JSON.parse(historyStr));
      } catch (e) {}
    }
  };

  // --- HUMAN MOCK INTERVIEW SUBMISSION LOGIC ---
  const validateBookingForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!bookFullName.trim() || bookFullName.trim().length < 2) {
      errs.fullName = 'Full Name is required (minimum 2 characters).';
    }
    if (!bookEmail.trim() || !bookEmail.trim().includes('@') || !bookEmail.trim().includes('.')) {
      errs.email = 'Please enter a valid email address.';
    }
    const digits = bookWhatsapp.replace(/[^\d]/g, '');
    if (!bookWhatsapp.trim() || digits.length < 10) {
      errs.whatsapp = 'Please enter a valid 10-digit WhatsApp or mobile number.';
    }
    if (bookTopic === 'Other' && !bookCustomTopic.trim()) {
      errs.customTopic = 'Please specify your custom interview topic.';
    }
    if (!bookAgreed) {
      errs.agreed = 'Please check the box agreeing to be contacted via WhatsApp and email.';
    }

    setBookingErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBookHumanInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!validateBookingForm()) return;

    setBookingSubmitting(true);

    try {
      const res = await mockInterviewService.createBooking({
        fullName: bookFullName,
        email: bookEmail,
        whatsappNumber: bookWhatsapp,
        interviewTopic: bookTopic,
        customTopic: bookCustomTopic,
        experienceLevel: bookExpLevel,
        interviewMode: bookMode,
        preferredAvailability: bookAvailability,
        additionalInformation: bookNotes,
        agreedToTerms: bookAgreed,
      });

      if (res.success && res.data) {
        setSubmittedBooking(res.data);
      } else {
        setBookingError(res.message || 'Failed to submit booking. Please try again.');
      }
    } catch (err: any) {
      console.error('[MockInterviewPage] Error submitting booking:', err);
      setBookingError(err?.message || 'An unexpected error occurred.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header / Nav Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700/80 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Back to Home</span>
          </button>

          {/* Main Mode Toggle Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80 text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('ai-practice')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ai-practice'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Practice Room (FREE)</span>
            </button>

            <button
              onClick={() => setActiveTab('book-human')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'book-human'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Video className="w-4 h-4 text-amber-300" />
              <span>Book 1-on-1 Human Interview (₹99)</span>
            </button>

            {pastSessions.length > 0 && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-slate-700 text-white font-extrabold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>My History ({pastSessions.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: AI PRACTICE ROOM */}
        {activeTab === 'ai-practice' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* HERO SECTION */}
            {sessionStage === 'config' && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 p-6 sm:p-10 shadow-2xl">
                {/* Background decorative glow */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Free Unlimited AI Mock Practice • Powered by Gemini 3.8</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight leading-tight">
                    Practice Real Job Interviews with <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">AI Interviewer</span>
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                    Master technical questions, behavioral rounds, and project presentations tailored for Indian freshers. Receive real-time speech/text evaluation, STAR method scores, and actionable feedback.
                  </p>

                  {/* Feature Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center space-y-1">
                      <Mic className="w-5 h-5 text-cyan-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-200">Voice & Text Input</div>
                      <div className="text-[10px] text-slate-400">Speak or Type</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center space-y-1">
                      <Star className="w-5 h-5 text-amber-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-200">STAR Method</div>
                      <div className="text-[10px] text-slate-400">Scoring & Hints</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center space-y-1">
                      <Brain className="w-5 h-5 text-indigo-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-200">Instant AI Feedback</div>
                      <div className="text-[10px] text-slate-400">Detailed Analysis</div>
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center space-y-1">
                      <FileText className="w-5 h-5 text-emerald-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-200">Report Summary</div>
                      <div className="text-[10px] text-slate-400">Print / Save PDF</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRACTICE SESSION CONFIGURATION FORM */}
            {sessionStage === 'config' && (
              <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-8">
                <div className="border-b border-slate-700/80 pb-4">
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <span>Customize Your AI Practice Session</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select your targeted role, level, and company domain to generate tailored questions.
                  </p>
                </div>

                {/* Role / Topic Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    1. Select Interview Role / Topic
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { name: 'Software Engineer', desc: 'General Coding & Tech' },
                      { name: 'React.js / Frontend', desc: 'React, Hooks, JS' },
                      { name: 'Python Developer', desc: 'Python, OOPs, Data' },
                      { name: 'Java & Spring Boot', desc: 'Java, Multithreading' },
                      { name: 'Data Analyst / SQL', desc: 'SQL, PowerBI, Excel' },
                      { name: 'HR & Behavioral', desc: 'Self Intro, Soft Skills' },
                      { name: 'Customer Support / BPO', desc: 'Communication, Voice' },
                      { name: 'Custom / Role-Based', desc: 'Enter custom title' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedRole(item.name)}
                        className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                          selectedRole === item.name
                            ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold ring-2 ring-indigo-500/50 shadow-md'
                            : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{item.name}</span>
                          {selectedRole === item.name && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  {selectedRole === 'Custom / Role-Based' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="e.g. Associate Cloud Engineer, Junior QA Tester, Business Analyst"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Experience Level & Company Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      2. Experience Level
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Fresher">Fresher (0 Years / Passing Out)</option>
                      <option value="Student / Intern">Student / Final Year Intern</option>
                      <option value="Junior (1–3 Years)">Junior Professional (1–3 Years)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      3. Target Company Type
                    </label>
                    <select
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="IT Service (TCS, Infosys, Wipro, Cognizant)">IT Service Giants (TCS, Infosys, Wipro, Cognizant)</option>
                      <option value="Product Startup / Tech Unicorn">Product Startup / Fast-Growing Tech Firm</option>
                      <option value="MNC Corporate">Global MNC Corporate</option>
                      <option value="Non-Tech Industry">Non-Tech / Core Engineering Industry</option>
                    </select>
                  </div>
                </div>

                {/* Question Length & Language Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      4. Question Count
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { count: 3, label: '3 Questions (Quick)' },
                        { count: 5, label: '5 Questions (Standard)' },
                        { count: 8, label: '8 Questions (Deep)' },
                      ].map((opt) => (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setQuestionCount(opt.count)}
                          className={`p-2.5 rounded-xl text-center border text-xs font-bold transition-all cursor-pointer ${
                            questionCount === opt.count
                              ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      5. Language Mode
                    </label>
                    <select
                      value={languageMode}
                      onChange={(e) => setLanguageMode(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="English">Clear Professional English</option>
                      <option value="Hinglish / Mix">Simple English + Hinglish Context</option>
                      <option value="Simple English">Simple Clear English (For Freshers)</option>
                    </select>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="pt-4 border-t border-slate-700/80">
                  <button
                    onClick={handleStartAISession}
                    disabled={loadingQuestions}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-3"
                  >
                    {loadingQuestions ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-white" />
                        <span>Generating Tailored AI Questions...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        <span>Start Free AI Practice Session Now</span>
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE INTERVIEW PRACTICE ROOM */}
            {sessionStage === 'interview' && questions.length > 0 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Stage Header */}
                <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black text-sm flex items-center justify-center">
                      {currentQuestionIndex + 1}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedRole} • {companyType}
                      </div>
                    </div>
                  </div>

                  {/* Timer & Speech Indicators */}
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formatTimer(timerSeconds)}</span>
                    </div>

                    <button
                      onClick={() => speakText(questions[currentQuestionIndex].questionText)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isSpeaking
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                      title="Read Question Aloud"
                    >
                      {isSpeaking ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{isSpeaking ? 'Speaking...' : 'Listen Question'}</span>
                    </button>
                  </div>
                </div>

                {/* QUESTION DISPLAY CARD */}
                <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
                  
                  {/* Category Tag */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold text-indigo-300 bg-indigo-950 border border-indigo-500/30">
                      {questions[currentQuestionIndex].category || 'Technical Question'}
                    </span>

                    <button
                      onClick={() => setShowHint(!showHint)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
                    </button>
                  </div>

                  {/* Main Question Text */}
                  <div className="text-lg sm:text-2xl font-black text-white leading-relaxed">
                    "{questions[currentQuestionIndex].questionText}"
                  </div>

                  {/* Hint Accordion */}
                  {showHint && questions[currentQuestionIndex].hints && (
                    <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4 text-xs space-y-2 animate-fade-in">
                      <div className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>Interviewer Hints:</span>
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-1 pl-1">
                        {questions[currentQuestionIndex].hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ANSWER INPUT AREA */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <span>Your Response (Type or Speak)</span>
                      </label>

                      {/* Mic STT Button */}
                      {sttSupported && (
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isListening
                              ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
                              : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
                          <span>{isListening ? 'Stop Mic (Listening...)' : 'Voice Input (Mic)'}</span>
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={5}
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      placeholder="Type your answer here or click 'Voice Input (Mic)' to speak... Speak clearly using the STAR method (Situation, Task, Action, Result)."
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Word count: {candidateAnswer.trim() ? candidateAnswer.trim().split(/\s+/).length : 0} words</span>
                      <span>Tip: Answers with 30+ words receive deeper evaluation.</span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-700/80">
                    <button
                      onClick={handleNextQuestion}
                      className="text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Skip Question →
                    </button>

                    <button
                      onClick={handleEvaluateAnswer}
                      disabled={!candidateAnswer.trim() || evaluatingAnswer || Boolean(evaluations[currentQuestionIndex])}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {evaluatingAnswer ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>AI is Analyzing Answer...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4" />
                          <span>Submit & Evaluate Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* PER-QUESTION EVALUATION RESULTS CARD */}
                {currentEvaluation && (
                  <div className="bg-slate-800/90 rounded-3xl border border-indigo-500/40 p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Evaluation Complete</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-white mt-0.5">
                          Question Score: <span className="text-cyan-300 font-black">{currentEvaluation.score}/100</span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-bold">
                          STAR Method: <strong className="text-amber-400">{currentEvaluation.starStructureScore}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Scores */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Clarity</div>
                        <div className="text-base font-black text-indigo-300">{currentEvaluation.clarityScore}%</div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Technical</div>
                        <div className="text-base font-black text-cyan-300">{currentEvaluation.technicalAccuracy}%</div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Communication</div>
                        <div className="text-base font-black text-emerald-300">{currentEvaluation.communication}%</div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">STAR Method</div>
                        <div className="text-base font-black text-amber-300">{currentEvaluation.starStructureScore}%</div>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                        <div className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>What You Did Well:</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          {currentEvaluation.strengths.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                        <div className="font-extrabold text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Key Gaps / Improvements:</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-300 space-y-1">
                          {currentEvaluation.weaknesses.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* How to Answer Better (Model STAR Answer) */}
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="font-extrabold text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <span>How to Answer Better (Model STAR Response):</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        {currentEvaluation.improvedAnswer}
                      </p>
                    </div>

                    {/* Proceed Button */}
                    <div className="pt-2 text-right">
                      <button
                        onClick={handleNextQuestion}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 hover:opacity-90 transition-all cursor-pointer"
                      >
                        {currentQuestionIndex + 1 < questions.length ? 'Next Question →' : 'Finish & Generate Final Report'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FINAL PERFORMANCE REPORT SCREEN */}
            {sessionStage === 'report' && (
              <div className="space-y-8 animate-fade-in">
                {generatingReport ? (
                  <div className="bg-slate-800/90 rounded-3xl p-12 text-center space-y-4 border border-slate-700">
                    <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                    <h3 className="text-xl font-extrabold text-white">Generating Diagnostic Interview Report...</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Analyzing technical accuracy, speech clarity, and STAR method alignment.
                    </p>
                  </div>
                ) : finalReport ? (
                  <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-10 shadow-2xl space-y-8">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-700/80 pb-6">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-emerald-300 bg-emerald-950 border border-emerald-500/30">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span>Interview Performance Report</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white">{finalReport.headline}</h2>
                        <p className="text-xs text-slate-400">
                          Session Role: <strong>{selectedRole}</strong> • Date: {new Date().toLocaleDateString('en-IN')}
                        </p>
                      </div>

                      {/* Print / Download Button */}
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        <span>Print / Save PDF Report</span>
                      </button>
                    </div>

                    {/* Overall Score & Readiness Badge */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl border border-indigo-500/30 text-center space-y-2">
                        <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Overall Score</div>
                        <div className="text-5xl font-black text-cyan-300">{finalReport.overallScore}/100</div>
                        <div className="text-xs font-bold text-indigo-300">
                          Status: <span className="text-emerald-400 font-extrabold">{finalReport.readinessStatus}</span>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-700/80 space-y-3 col-span-2">
                        <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Diagnostic Summary</h4>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Communication</span>
                            <strong className="text-emerald-300 text-sm font-bold">{finalReport.communicationRating}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Technical Depth</span>
                            <strong className="text-cyan-300 text-sm font-bold">{finalReport.technicalRating}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">STAR Method</span>
                            <strong className="text-amber-300 text-sm font-bold">{finalReport.starMethodMastery}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Skill Gaps */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                        <div className="font-extrabold text-emerald-400 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Top Candidate Strengths</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-300 space-y-1.5 leading-relaxed">
                          {finalReport.topStrengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-3">
                        <div className="font-extrabold text-amber-400 text-sm flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-400" />
                          <span>Key Skill Gaps to Address</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-300 space-y-1.5 leading-relaxed">
                          {finalReport.keySkillGaps.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Tips */}
                    <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 text-xs">
                      <div className="font-extrabold text-cyan-300 text-sm flex items-center gap-2">
                        <Zap className="w-5 h-5 text-cyan-400" />
                        <span>Actionable Preparation Tips</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {finalReport.actionableTips.map((tip, i) => (
                          <div key={i} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-slate-300 leading-relaxed">
                            <span className="font-bold text-white block mb-1">Tip #{i + 1}</span>
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Human Mock Interview Upsell Card */}
                    <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/60 border border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="space-y-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold text-amber-300 bg-amber-950 border border-amber-500/40">
                          RECOMMENDED NEXT STEP
                        </span>
                        <h3 className="text-xl font-black text-white">
                          Want 1-on-1 Guidance from an Expert Interviewer?
                        </h3>
                        <p className="text-xs text-slate-300 max-w-xl">
                          Book a 30-minute 1-on-1 live human mock interview session for only <strong>₹99</strong>. Get personalized feedback, detailed resume review, and salary negotiation tips.
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveTab('book-human')}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-xl shadow-amber-500/30 hover:opacity-90 transition-all cursor-pointer whitespace-nowrap"
                      >
                        Book Human Interview (₹99) →
                      </button>
                    </div>

                    {/* Restart Button */}
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => {
                          setSessionStage('config');
                          setFinalReport(null);
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Start Another Practice Session</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOK 1-ON-1 HUMAN MOCK INTERVIEW (₹99) */}
        {activeTab === 'book-human' && (
          <div className="space-y-8 animate-fade-in">
            {submittedBooking ? (
              <div className="bg-slate-800/90 rounded-3xl p-8 border border-emerald-500/40 text-center space-y-6 shadow-2xl">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-2xl font-black text-white">
                    Human Mock Interview Booking Submitted!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                    Thank you, <strong className="text-white">{submittedBooking.full_name}</strong>. Your session for <strong className="text-white">{submittedBooking.interview_topic}</strong> has been saved.
                  </p>
                </div>

                <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 text-left max-w-md mx-auto space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Topic:</span>
                    <span className="font-bold text-white">{submittedBooking.interview_topic}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Session Fee:</span>
                    <span className="font-black text-amber-400">₹{MOCK_INTERVIEW_PRICE_INR}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">WhatsApp:</span>
                    <span className="font-bold text-white">{submittedBooking.whatsapp_number}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={`https://wa.me/${submittedBooking.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                      `Hello ManaCarrier team, I submitted a booking for ₹99 Mock Interview on ${submittedBooking.interview_topic}. My Name: ${submittedBooking.full_name}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Chat on WhatsApp for Payment & Time Slot</span>
                  </a>

                  <button
                    onClick={() => setSubmittedBooking(null)}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Book Another Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-10 shadow-2xl space-y-8">
                <div className="border-b border-slate-700/80 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-amber-300 bg-amber-950 border border-amber-500/40">
                      <Video className="w-4 h-4 text-amber-400" />
                      <span>1-on-1 Live Google Meet Session</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mt-2">Book Expert Human Mock Interview (₹99)</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Practice 1-on-1 with senior recruiters and engineers from TCS, Infosys, & top tech firms.
                    </p>
                  </div>

                  <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 text-center">
                    <div className="text-[10px] text-amber-300 font-bold uppercase">Special Price</div>
                    <div className="text-3xl font-black text-amber-400">₹99</div>
                    <div className="text-[10px] text-slate-400">30 Min Live Session</div>
                  </div>
                </div>

                {bookingError && (
                  <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-4 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handleBookHumanInterview} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Full Name *</label>
                      <input
                        type="text"
                        value={bookFullName}
                        onChange={(e) => setBookFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {bookingErrors.fullName && <div className="text-[10px] text-red-400">{bookingErrors.fullName}</div>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Email Address *</label>
                      <input
                        type="email"
                        value={bookEmail}
                        onChange={(e) => setBookEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {bookingErrors.email && <div className="text-[10px] text-red-400">{bookingErrors.email}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">WhatsApp Mobile Number *</label>
                      <input
                        type="tel"
                        value={bookWhatsapp}
                        onChange={(e) => setBookWhatsapp(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {bookingErrors.whatsapp && <div className="text-[10px] text-red-400">{bookingErrors.whatsapp}</div>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Interview Topic / Skill *</label>
                      <select
                        value={bookTopic}
                        onChange={(e) => setBookTopic(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        {INTERVIEW_TOPICS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {bookTopic === 'Other' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Specify Custom Topic *</label>
                      <input
                        type="text"
                        value={bookCustomTopic}
                        onChange={(e) => setBookCustomTopic(e.target.value)}
                        placeholder="e.g. Cyber Security, DevOps, Flutter"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      {bookingErrors.customTopic && <div className="text-[10px] text-red-400">{bookingErrors.customTopic}</div>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Experience Level</label>
                      <select
                        value={bookExpLevel}
                        onChange={(e) => setBookExpLevel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        {EXPERIENCE_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-200">Interview Mode</label>
                      <select
                        value={bookMode}
                        onChange={(e) => setBookMode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        {INTERVIEW_MODES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-200">Preferred Date & Time / Notes</label>
                    <textarea
                      rows={3}
                      value={bookNotes}
                      onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="e.g. Available weekdays after 5 PM. Target company: TCS NQT drive."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="agreed"
                      checked={bookAgreed}
                      onChange={(e) => setBookAgreed(e.target.checked)}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="agreed" className="text-xs text-slate-300 cursor-pointer">
                      I agree to be contacted via WhatsApp and email for session scheduling.
                    </label>
                  </div>
                  {bookingErrors.agreed && <div className="text-[10px] text-red-400">{bookingErrors.agreed}</div>}

                  <button
                    type="submit"
                    disabled={bookingSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm shadow-xl shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {bookingSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Submitting Booking...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-5 h-5" />
                        <span>Confirm Booking for ₹99</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRACTICE HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-xl space-y-6">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>Your Past AI Interview Practice Sessions</span>
              </h2>

              {pastSessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No practice history found. Complete an AI interview to see your reports saved here.
                </div>
              ) : (
                <div className="space-y-4">
                  {pastSessions.map((s, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {s.config?.customRole || s.config?.role || 'Software Engineer'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.timestamp).toLocaleString('en-IN')} • {s.config?.experienceLevel}
                          </div>
                        </div>

                        <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black text-cyan-300">
                          Score: {s.report?.overallScore || 75}/100
                        </div>
                      </div>

                      {s.report?.headline && (
                        <div className="text-xs text-slate-300 italic">
                          "{s.report.headline}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
