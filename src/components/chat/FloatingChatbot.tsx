import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Sparkles, Bot, User,
  FileText, HelpCircle, RotateCcw, ExternalLink, ShieldCheck,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { queryChatbotRag } from '../../services/knowledgeService';

interface Citation {
  source: string;
  type: 'document' | 'faq';
  snippet: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Is ManaCarrier free for candidates?',
  'How does the ATS Resume Review service work?',
  'How can recruiters post jobs on ManaCarrier?',
  'What internship categories are available?',
];

const EXACT_FALLBACK = "I couldn't find a clear answer to this question in the ManaCarrier knowledge base. Please try rephrasing your question or contact the ManaCarrier team at manishmudrakola8@gmail.com.";

interface FloatingChatbotProps {
  onNavigate?: (path: string) => void;
}

/**
 * Lightweight, safe Markdown renderer for assistant messages.
 * Handles headings, bold/italic, bullet/numbered lists, and clickable links.
 */

const FormattedMarkdown: React.FC<{ content: string; onNavigate?: (path: string) => void }> = ({ content, onNavigate }) => {
  if (!content) return null;

  // Split content by line breaks
  const lines = content.split('\n');

  return (
    <div className="space-y-2.5 text-slate-800 text-sm sm:text-base leading-relaxed font-sans">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="text-base sm:text-lg font-bold text-slate-900 font-display pt-2 pb-1 border-b border-slate-100">
              {renderFormattedInline(trimmed.slice(4), onNavigate)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lIdx} className="text-lg sm:text-xl font-extrabold text-slate-900 font-display pt-2.5 pb-1">
              {renderFormattedInline(trimmed.slice(3), onNavigate)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={lIdx} className="text-xl sm:text-2xl font-extrabold text-slate-950 font-display pt-3 pb-1">
              {renderFormattedInline(trimmed.slice(2), onNavigate)}
            </h2>
          );
        }

        // Bullet lists (* item or - item)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          return (
            <div key={lIdx} className="flex items-start gap-2.5 pl-2 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
              <div className="flex-1 font-sans">{renderFormattedInline(trimmed.slice(2), onNavigate)}</div>
            </div>
          );
        }

        // Numbered lists (e.g. 1. item)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
              <span className="font-bold text-blue-700 text-xs sm:text-sm shrink-0 min-w-[20px]">{numMatch[1]}.</span>
              <div className="flex-1 font-sans">{renderFormattedInline(numMatch[2], onNavigate)}</div>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={lIdx} className="my-1">
            {renderFormattedInline(trimmed, onNavigate)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Helper to render bold (**text**), code (`code`), and hyperlinks ([Text](url)) inline safely.
 */
function renderFormattedInline(text: string, onNavigate?: (path: string) => void): React.ReactNode[] {
  // Regex to match markdown links: [label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(renderBoldAndItalic(text.slice(lastIdx, match.index), `text-${lastIdx}`));
    }

    const label = match[1];
    const rawUrl = match[2];
    const isInternalRoute = rawUrl.startsWith('/') && !rawUrl.startsWith('//');

    parts.push(
      isInternalRoute && onNavigate ? (
        <button
          key={`link-${match.index}`}
          onClick={() => onNavigate(rawUrl)}
          className="text-blue-600 font-bold underline hover:text-blue-800 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
        >
          <span>{label}</span>
        </button>
      ) : (
        <a
          key={`link-${match.index}`}
          href={rawUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 font-bold underline hover:text-blue-800 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 inline shrink-0" />
        </a>
      )
    );

    lastIdx = linkRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(renderBoldAndItalic(text.slice(lastIdx), `text-${lastIdx}`));
  }

  return parts;
}

/**
 * Helper for **bold** and `code` inline formatting
 */
function renderBoldAndItalic(text: string, keyPrefix: string): React.ReactNode {
  // Split on **bold**
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <React.Fragment key={keyPrefix}>
      {segments.map((seg, i) => {
        if (seg.startsWith('**') && seg.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        return seg;
      })}
    </React.Fragment>
  );
}

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! Welcome to **ManaCarrier AI Assistant**.\n\nI can help answer questions regarding verified job listings, internships, ATS resume reviews, recruiter services, and career guidance using our verified knowledge base. What can I help you with today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Lightweight conversation history
      const history = messages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.text,
        }));

      console.log('[ManaCarrier AI] Querying knowledge base:', query);
      const data = await queryChatbotRag(query, history);

      const responseText = data.answer || EXACT_FALLBACK;
      const isRefusal = responseText.includes(EXACT_FALLBACK) || responseText.includes("couldn't find a clear answer");

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        citations: isRefusal
          ? []
          : (data.citations || []).map((c) => ({
              source: c.source,
              type: 'document' as const,
              snippet: c.snippet,
            })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[ManaCarrier AI] Error fetching answer:', err);
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: EXACT_FALLBACK,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with ManaCarrier services, jobs, or resume reviews?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      
      {/* 1. Chat Window with Framer Motion AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="ManaCarrier AI Assistant"
            className="w-[calc(100vw-2rem)] sm:w-[480px] md:w-[520px] h-[610px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3.5"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-4 sm:p-4.5 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight font-display">
                      ManaCarrier AI Assistant
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>RAG Knowledge Active</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-100/90 font-medium">
                    Verified job information &amp; career guidance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  title="Reset Conversation"
                  aria-label="Reset Conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                  title="Close Chat"
                  aria-label="Close Chat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* RAG Verification Policy Bar */}
            <div className="bg-blue-50/90 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-[11px] text-blue-900 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Answers strictly verified against the ManaCarrier Knowledge Base</span>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-blue-200/60">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[86%] sm:max-w-[84%] rounded-2xl px-4 py-3 shadow-2xs ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white font-medium rounded-br-xs text-sm sm:text-base'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{msg.text}</p>
                    ) : (
                      <FormattedMarkdown content={msg.text} onNavigate={onNavigate} />
                    )}

                    {/* Source Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-display">
                          Retrieved Sources &amp; Evidence:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-semibold truncate max-w-[240px]"
                              title={c.snippet}
                            >
                              <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">{c.source}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1.5 text-right font-medium ${
                        msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 border border-slate-300/80">
                      <User className="w-4.5 h-4.5" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Animated Typing Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 justify-start"
                >
                  <div className="w-8 h-8 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200/60">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="bg-white text-slate-700 border border-slate-200/90 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs flex items-center gap-2.5">
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Searching ManaCarrier knowledge base...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions Pill bar */}
            {messages.length <= 3 && !isLoading && (
              <div className="px-3.5 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 shrink-0 font-display uppercase tracking-wider">
                  Suggested:
                </span>
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-xs text-slate-700 font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Footer */}
            <div className="p-3.5 bg-white border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about ManaCarrier jobs, internships, ATS resume reviews..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1 font-medium">
                <span>Powered by Gemini &amp; ManaCarrier RAG</span>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('/contact');
                    }}
                    className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Contact Support</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Action Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all cursor-pointer ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900 rotate-90'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
          }`}
          aria-label={isOpen ? 'Close AI Chat' : 'Ask ManaCarrier AI Assistant'}
          title={isOpen ? 'Close AI Chat' : 'Ask ManaCarrier AI Assistant'}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <>
              <Bot className="w-6 h-6 text-white" />
              <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};
