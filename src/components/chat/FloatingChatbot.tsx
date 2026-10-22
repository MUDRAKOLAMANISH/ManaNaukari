import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, X, Send, Sparkles, Bot, User,
  FileText, HelpCircle, ChevronDown, RotateCcw, AlertCircle, ExternalLink
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
  'Is Mana Naukari free for candidates?',
  'How does the ATS Resume Review service work?',
  'How can recruiters post jobs?',
  'What internship domains are available?',
];

interface FloatingChatbotProps {
  onNavigate?: (path: string) => void;
}

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! Welcome to Mana Naukari AI Assistant. I can help answer questions regarding our verified job listings, internships, ATS resume reviews, recruiter services, and career guidance using our verified knowledge base. What can I help you with today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
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
      // Build lightweight conversation history
      const history = messages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          content: m.text,
        }));

      console.log('[FloatingChatbot] Asking RAG knowledge assistant:', query);
      const data = await queryChatbotRag(query, history);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'I could not find this information in the Mana Naukari Knowledge Base.',
        citations: (data.citations || []).map((c) => ({
          source: c.source,
          type: 'document' as const,
          snippet: c.snippet,
        })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[FloatingChatbot] Send message error:', err);
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'I could not find this information in the Mana Naukari Knowledge Base.',
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
        text: 'Chat history cleared. How can I assist you with Mana Naukari services, jobs, or resume reviews?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      
      {/* 1. Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mana Naukari AI Assistant"
          className="w-[calc(100vw-2.5rem)] sm:w-[420px] h-[550px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3.5 animate-scaleUp"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight font-display">
                    Mana Naukari AI
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>RAG Online</span>
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/90 font-medium">
                  Verified knowledge base &amp; career guidance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Reset Conversation"
                aria-label="Reset Conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Close Chat"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* RAG Policy Notice */}
          <div className="bg-blue-50/80 border-b border-blue-100/80 px-4 py-1.5 flex items-center gap-1.5 text-[11px] text-blue-800">
            <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="truncate">Answers strictly verified from our Knowledge Base &amp; FAQs</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white font-medium rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs">{msg.text}</p>

                  {/* Source Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-display">
                        Verified Sources:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((c, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-semibold truncate max-w-[200px]"
                            title={c.snippet}
                          >
                            {c.type === 'document' ? (
                              <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                            ) : (
                              <HelpCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                            )}
                            <span className="truncate">{c.source}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white text-slate-600 border border-slate-200/80 rounded-2xl rounded-bl-xs px-4 py-2.5 shadow-2xs flex items-center gap-2">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Searching RAG knowledge base...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions (Shown if only welcome message or user asks) */}
          {messages.length <= 3 && !isLoading && (
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 font-display">
                Suggested:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-[10px] text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200/80">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about jobs, internships, ATS resume reviews..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>Powered by Gemini &amp; Mana Naukari RAG</span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('/contact');
                  }}
                  className="text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <span>Need human support?</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Small, Clean Floating Action Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white shadow-md transition-all cursor-pointer ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900 rotate-90'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
          }`}
          aria-label={isOpen ? 'Close AI Chat' : 'Ask AI Assistant'}
          title={isOpen ? 'Close AI Chat' : 'Ask AI Assistant'}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <>
              <Bot className="w-5 h-5 text-white" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-white" />
            </>
          )}
        </button>
      </div>

    </div>
  );
};
