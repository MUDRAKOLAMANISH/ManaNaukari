import React, { useState } from 'react';
import {
  Sparkles, Globe, Monitor, Smartphone, Cpu, Code2, Rocket, Zap,
  CheckCircle2, ArrowRight, MessageSquare, ShieldCheck, Clock,
  HelpCircle, Star, Users, Check, X, Layers, Layout, Palette, Send, ExternalLink,
  AlertCircle
} from 'lucide-react';
import { websiteDevelopmentService } from '../services/websiteDevelopmentService';

interface AiWebsiteDevelopmentPageProps {
  onNavigate: (path: string) => void;
}

interface PricingTier {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  delivery: string;
  popular?: boolean;
  description: string;
  features: string[];
  ctaText: string;
  badge?: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter AI Website',
    price: '₹499',
    originalPrice: '₹1,499',
    delivery: '24–48 Hours',
    description: 'Perfect for students, freshers, and quick personal or project landing pages.',
    features: [
      'Responsive 1-Page AI-Designed Website',
      'Hero section, about, skills/features & contact',
      'Mobile-first & tablet optimized',
      'Contact form connected to WhatsApp / Email',
      'Free lifetime hosting on Vercel or GitHub Pages',
      'Source code pushed to your GitHub repository',
      '1 round of free revisions',
    ],
    ctaText: 'Build Starter Site',
  },
  {
    id: 'pro',
    name: 'Pro Business & Tech Site',
    price: '₹999',
    originalPrice: '₹2,999',
    delivery: '48–72 Hours',
    popular: true,
    badge: 'MOST POPULAR',
    description: 'Ideal for job seekers, freelancers, creators, and growing small businesses.',
    features: [
      'Everything in Starter AI Website',
      'Up to 4 custom pages / sections (Home, Services, Portfolio, Contact)',
      'AI-enhanced copy & domain-specific SEO meta tags',
      'Interactive showcase cards with live demo links',
      'Custom domain connection assistance (.com, .in, .tech)',
      'Smooth scroll animations & dark/light theme polish',
      '2 rounds of free revisions',
    ],
    ctaText: 'Build Pro Site',
  },
  {
    id: 'elite',
    name: 'Elite Custom Brand & App',
    price: '₹1,999',
    originalPrice: '₹5,999',
    delivery: '3–4 Days',
    badge: 'PREMIUM EXPERIENCE',
    description: 'A complete custom web platform for startups, agencies, creators & local businesses.',
    features: [
      'Everything in Pro Business & Tech Site',
      'Multi-page application with custom workflow',
      'Advanced lead capture, booking form or catalog',
      'Custom branding, avatar styling & UI icon suite',
      '1-on-1 strategy call via Google Meet',
      '30 days of post-launch maintenance & tweaks',
      'Priority fast-track developer support',
    ],
    ctaText: 'Get Elite Site',
  },
];

const USE_CASES = [
  {
    title: 'Students & Freshers',
    description: 'Showcase college final-year projects, academic research, hackathon wins, and personal skills to recruiters.',
    icon: GraduationIcon,
    bg: 'from-blue-500/10 to-cyan-500/10',
    border: 'border-blue-200/80',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Job Seekers & Engineers',
    description: 'Stand out in technical interviews with an interactive portfolio displaying live GitHub links and code previews.',
    icon: Code2,
    bg: 'from-purple-500/10 to-indigo-500/10',
    border: 'border-purple-200/80',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Freelancers & Creators',
    description: 'Display your design, writing, video, or consulting portfolio and convert visitors into paying clients.',
    icon: Palette,
    bg: 'from-violet-500/10 to-fuchsia-500/10',
    border: 'border-violet-200/80',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Small Businesses & Shops',
    description: 'Launch a professional online presence with service listings, product catalogs, and direct WhatsApp booking.',
    icon: Globe,
    bg: 'from-emerald-500/10 to-teal-500/10',
    border: 'border-emerald-200/80',
    iconColor: 'text-emerald-600',
  },
];

function GraduationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}

export const AiWebsiteDevelopmentPage: React.FC<AiWebsiteDevelopmentPageProps> = ({ onNavigate }) => {
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [websiteType, setWebsiteType] = useState('Student / Fresher Project Site');
  const [websiteIdea, setWebsiteIdea] = useState('');
  
  // Extended Fields for Detailed Requirement Capture
  const [requiredFeatures, setRequiredFeatures] = useState('Contact Form, Mobile Responsive, Dark Mode, SEO Meta Tags');
  const [numberOfPages, setNumberOfPages] = useState('1 Page (Landing)');
  const [budgetRange, setBudgetRange] = useState('₹499 (Starter Plan)');
  const [preferredDeliveryTime, setPreferredDeliveryTime] = useState('24–48 Hours');
  const [referenceWebsiteUrl, setReferenceWebsiteUrl] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenOrderModal = (tier?: PricingTier) => {
    setSelectedTier(tier || PRICING_TIERS[0]);
    if (tier) {
      if (tier.id === 'starter') {
        setBudgetRange('₹499 (Starter Plan)');
        setNumberOfPages('1 Page (Landing)');
        setPreferredDeliveryTime('24–48 Hours');
      } else if (tier.id === 'pro') {
        setBudgetRange('₹999 (Pro Tech Plan)');
        setNumberOfPages('2–4 Pages');
        setPreferredDeliveryTime('48–72 Hours');
      } else if (tier.id === 'elite') {
        setBudgetRange('₹1,999 (Elite Custom Brand)');
        setNumberOfPages('5–10 Pages');
        setPreferredDeliveryTime('3–4 Days');
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!clientName.trim()) {
      setErrorMessage('Please enter your Full Name.');
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setErrorMessage('Please enter a valid Email address.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid WhatsApp Mobile Number (minimum 10 digits).');
      return;
    }
    if (!websiteIdea.trim()) {
      setErrorMessage('Please enter a brief description of your website idea.');
      return;
    }

    setIsSubmitting(true);

    try {
      const planName = selectedTier ? selectedTier.name : 'AI Website Development';
      const result = await websiteDevelopmentService.saveLead({
        customerName: clientName,
        email: clientEmail,
        whatsappNumber: clientPhone,
        websiteType: `${websiteType} (${planName})`,
        websiteIdea: websiteIdea,
        requiredFeatures,
        numberOfPages,
        budgetRange,
        preferredDeliveryTime,
        referenceWebsiteUrl,
        additionalRequirements,
      });

      setIsSubmitting(false);

      if (result.success) {
        setIsSuccess(true);

        const planPrice = selectedTier ? selectedTier.price : '₹499';
        const text = encodeURIComponent(
          `Hi Mana Naukari AI Dev Team!\nI would like to order the *${planName}* package (${planPrice}).\n\nName: ${clientName}\nEmail: ${clientEmail}\nWhatsApp: ${clientPhone}\nWebsite Category: ${websiteType}\nPages: ${numberOfPages}\nBudget: ${budgetRange}\nIdea: ${websiteIdea}\nReference: ${referenceWebsiteUrl || 'None'}\n\nPlease review my enquiry!`
        );
        window.open(`https://wa.me/91${clientPhone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
      } else {
        setErrorMessage(result.message || 'Failed to submit enquiry. Please try again.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Error saving enquiry. Please check your connection and retry.');
    }
  };

  const scrollToProcess = () => {
    const el = document.getElementById('ai-process-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-16 animate-fadeIn pb-20 font-sans">
      
      {/* 1. Hero Section */}
      <section className="relative pt-6 sm:pt-10 max-w-6xl mx-auto overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-cyan-400/20 blur-3xl pointer-events-none rounded-full -z-10" />

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-violet-600 animate-pulse" />
            <span>AI-Powered Website Development Service</span>
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ml-1">
              From ₹499
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-slate-900 tracking-tight leading-[1.14]">
              Your Idea. Your Website.{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                Powered by AI.
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              We build personalized websites for students, job seekers, freelancers, creators, and small businesses using modern web technologies and AI-powered development tools.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleOpenOrderModal(PRICING_TIERS[0])}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Rocket className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span>Build My Website (From ₹499)</span>
            </button>

            <button
              onClick={scrollToProcess}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-2xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Explore Our Process</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Key Value Highlights Bar */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">24–48 Hrs</div>
                <div className="text-[10px] text-slate-500">Fast AI Delivery</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">100% Owned</div>
                <div className="text-[10px] text-slate-500">GitHub Source Code</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
              <Globe className="w-4 h-4 text-violet-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">Free Hosting</div>
                <div className="text-[10px] text-slate-500">Vercel / GitHub</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-900">SEO Optimized</div>
                <div className="text-[10px] text-slate-500">Mobile Responsive</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Mockup Illustration */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-8 shadow-2xl overflow-hidden">
          {/* Top Bar Mockup Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-slate-500">https://yourname.mananaukari.app</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                <CheckCircle2 className="w-3 h-3" /> Live Preview
              </span>
            </div>
          </div>

          {/* Website Canvas Area */}
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Desktop View Card */}
            <div className="lg:col-span-8 space-y-4 bg-slate-950 p-6 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200 font-mono">Desktop Responsive Layout</span>
                </div>
                <span className="text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50 font-mono">Next.js + Tailwind</span>
              </div>

              {/* Sample Mini Hero */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-slate-800 space-y-3">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                  Full Stack Engineer &amp; AI Developer
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Hi, I'm Rahul — Building Scalable Web Apps
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Specialized in React, Python, PostgreSQL and Generative AI. Explored 12+ real-world projects with 99% test coverage.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-lg">View Projects</span>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-800 text-slate-300 rounded-lg border border-slate-700">Download CV</span>
                </div>
              </div>

              {/* Sample Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  <div className="text-[11px] font-bold text-white">AI Job Tracker</div>
                  <div className="text-[9px] text-slate-400">React • Supabase</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <div className="text-[11px] font-bold text-white">Resume Matcher</div>
                  <div className="text-[9px] text-slate-400">Python • Gemini</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                  <div className="text-[11px] font-bold text-white">E-Commerce App</div>
                  <div className="text-[9px] text-slate-400">Node • Tailwind</div>
                </div>
              </div>
            </div>

            {/* Mobile View Card */}
            <div className="lg:col-span-4 bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200 font-mono">Mobile First View</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">100% Mobile Ready</span>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                  MN
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">Interactive WhatsApp Direct Form</div>
                  <div className="text-[10px] text-slate-400">Clients click to message you instantly on WhatsApp without friction.</div>
                </div>
                <div className="w-full py-2 bg-emerald-600 text-white rounded-xl text-center text-[10px] font-bold flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Contact on WhatsApp
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Who Is This Service For? (Use Cases Grid) */}
      <section className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
            Tailored Websites for Every Purpose
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Whether you need to impress recruiters in interviews or acquire new clients for your business, we build the exact website you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {USE_CASES.map((uc, i) => {
            const IconComp = uc.icon;
            return (
              <div
                key={i}
                className={`p-6 rounded-2xl bg-gradient-to-b ${uc.bg} bg-white border ${uc.border} space-y-3 hover:shadow-md transition-all`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center ${uc.iconColor} shadow-2xs`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 font-display">
                  {uc.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {uc.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. How It Works (Step-by-step Process) */}
      <section id="ai-process-section" className="max-w-6xl mx-auto space-y-8 pt-4">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>4-STEP AI DEVELOPMENT PROCESS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
            How We Build Your Website with AI Speed
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center font-mono">
              01
            </div>
            <h4 className="font-bold text-sm text-slate-900">Share Your Idea &amp; Content</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fill out our simple enquiry form or WhatsApp us your resume, project links, or business details.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center font-mono">
              02
            </div>
            <h4 className="font-bold text-sm text-slate-900">AI Wireframing &amp; Design</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our AI design tools generate modern color palettes, typography layout, and content structures tailored to your domain.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono">
              03
            </div>
            <h4 className="font-bold text-sm text-slate-900">Live Preview &amp; Revisions</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We send you a live link to test on mobile and desktop. Request free text, image, or section tweaks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-3 relative shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center font-mono">
              04
            </div>
            <h4 className="font-bold text-sm text-slate-900">Deployment &amp; Code Handoff</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              We publish your site to Vercel/GitHub with SSL security and hand over full repository ownership to you!
            </p>
          </div>
        </div>
      </section>

      {/* 5. Pricing Plans */}
      <section id="pricing-plans" className="max-w-6xl mx-auto space-y-8 pt-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
            Transparent Pricing Plans
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Choose the package that fits your goals. Zero hidden costs or monthly recurring fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                tier.popular
                  ? 'bg-slate-900 text-white shadow-xl ring-2 ring-indigo-500'
                  : 'bg-white text-slate-900 border border-slate-200/80 shadow-xs'
              }`}
            >
              {tier.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    tier.popular
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xs'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  }`}
                >
                  {tier.badge}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold font-display">{tier.name}</h3>
                  <p className={`text-xs mt-1 ${tier.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    {tier.description}
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-display">{tier.price}</span>
                  {tier.originalPrice && (
                    <span className={`text-xs line-through ${tier.popular ? 'text-slate-500' : 'text-slate-400'}`}>
                      {tier.originalPrice}
                    </span>
                  )}
                  <span className={`text-[11px] ml-auto font-medium ${tier.popular ? 'text-indigo-400' : 'text-slate-500'}`}>
                    ⚡ Delivery: {tier.delivery}
                  </span>
                </div>

                <div className="border-t border-slate-200/20 pt-4 space-y-2.5">
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.popular ? 'text-indigo-400' : 'text-emerald-600'}`} />
                      <span className={tier.popular ? 'text-slate-300' : 'text-slate-600'}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleOpenOrderModal(tier)}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    tier.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <span>{tier.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Order / Enquiry Modal - Opens directly in the middle of the screen */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn font-sans">
          {/* Dark Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setSelectedTier(null)}
          />

          {/* Centered Modal Card */}
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-slate-100 max-h-[88vh] overflow-y-auto z-10 my-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                  BUILD MY WEBSITE ENQUIRY
                </span>
                <h3 className="font-bold text-lg sm:text-xl text-slate-900 font-display mt-1">
                  {selectedTier.name} ({selectedTier.price})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTier(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xl text-slate-900">Enquiry Submitted &amp; Saved!</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your details have been registered in our system and routed to WhatsApp. Our AI lead engineer will connect with you shortly with preliminary website blueprints.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setSelectedTier(null);
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Close Confirmation
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@gmail.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      WhatsApp Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Website Category
                    </label>
                    <select
                      value={websiteType}
                      onChange={(e) => setWebsiteType(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="Student / Fresher Project Site">Student / Fresher Project Site</option>
                      <option value="Personal Developer Portfolio">Personal Developer Portfolio</option>
                      <option value="Freelancer / Creator Showcase">Freelancer / Creator Showcase</option>
                      <option value="Small Business / Shop Website">Small Business / Shop Website</option>
                      <option value="Startup Landing Page">Startup Landing Page</option>
                      <option value="Custom Web Application">Custom Web Application</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Number of Pages
                    </label>
                    <select
                      value={numberOfPages}
                      onChange={(e) => setNumberOfPages(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="1 Page (Landing)">1 Page (Landing)</option>
                      <option value="2–4 Pages">2–4 Pages</option>
                      <option value="5–10 Pages">5–10 Pages</option>
                      <option value="10+ Pages">10+ Pages</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Budget Range
                    </label>
                    <select
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="₹499 (Starter Plan)">₹499 (Starter Plan)</option>
                      <option value="₹999 (Pro Tech Plan)">₹999 (Pro Tech Plan)</option>
                      <option value="₹1,999 (Elite Custom Brand)">₹1,999 (Elite Custom Brand)</option>
                      <option value="₹2,500 - ₹5,000">₹2,500 – ₹5,000</option>
                      <option value="₹5,000+">₹5,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Preferred Delivery
                    </label>
                    <select
                      value={preferredDeliveryTime}
                      onChange={(e) => setPreferredDeliveryTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                    >
                      <option value="24–48 Hours">24–48 Hours</option>
                      <option value="48–72 Hours">48–72 Hours</option>
                      <option value="3–4 Days">3–4 Days</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Website Idea / Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe your website idea (e.g., college final year project showcase, freelancer portfolio with live demo links)..."
                    value={websiteIdea}
                    onChange={(e) => setWebsiteIdea(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Reference Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com or any site design you like"
                    value={referenceWebsiteUrl}
                    onChange={(e) => setReferenceWebsiteUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Required Features / Additional Requirements
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Contact Form, Dark Mode, GitHub Repo Link, Custom Domain, WhatsApp Button"
                    value={requiredFeatures}
                    onChange={(e) => setRequiredFeatures(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Saving &amp; Preparing Blueprint...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Enquiry &amp; Open WhatsApp</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    🔒 Zero risk. You review initial AI wireframes and design samples before paying.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. Section: Frequently Asked Questions (FAQs) */}
      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-8 sm:p-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-lg text-slate-900 font-display">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-600">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">How long does website delivery take?</h5>
            <p>Starter AI websites are delivered in 24 to 48 hours. Pro business sites take 48 to 72 hours with custom domain connection.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Are there any monthly hosting fees?</h5>
            <p>No! We set up free global CDN hosting on Vercel or GitHub Pages with free automated SSL HTTPS certificates, costing ₹0 per month.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Do I get full source code ownership?</h5>
            <p>Yes, 100%! We push the clean React / Next.js / HTML source code directly to your GitHub repository so you hold full control.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-1.5">
            <h5 className="font-bold text-slate-900">Can I connect my own custom domain?</h5>
            <p>Yes. We assist you in linking custom domains like <code className="bg-slate-100 px-1 rounded text-slate-800">yourname.com</code> or <code className="bg-slate-100 px-1 rounded text-slate-800">yourbrand.in</code> smoothly.</p>
          </div>
        </div>
      </section>

    </div>
  );
};
