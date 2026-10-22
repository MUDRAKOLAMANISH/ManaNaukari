import React, { useState, useEffect, useMemo } from 'react';
import {
  Route, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle,
  Clock, Calendar, BookOpen, FileCode2, FileCheck2, Video, Briefcase,
  ChevronRight, ChevronDown, RefreshCw, Printer, AlertCircle, Play,
  CheckSquare, Square, Award, Layers, Target, GraduationCap, Zap, Users,
  Code2, Laptop, Globe, MessageSquare, ArrowUpRight, Cpu, Plus, X, RotateCcw
} from 'lucide-react';
import {
  CareerProfile,
  CareerRoadmapData,
  QualificationLevel,
  CurrentStatus,
  SkillProficiency,
  SkillItem,
  CareerRoleGoal,
  PreferredLocation,
  WorkArrangement,
  JobLevel,
  WeeklyHours,
  PreparationTimeline,
  BiggestChallenge,
  LearningStyle,
  TaskStatus,
  RoadmapTask
} from '../types/careerRoadmap.types';
import { careerRoadmapService } from '../services/careerRoadmapService';

interface CareerRoadmapPageProps {
  onNavigate: (path: string) => void;
}

const PROGRAMMING_SKILLS = ['Python', 'Java', 'JavaScript', 'C', 'C++', 'SQL'];
const WEB_SKILLS = ['HTML', 'CSS', 'React', 'Node.js', 'FastAPI', 'Full Stack Development'];
const AI_DATA_SKILLS = [
  'Generative AI', 'Prompt Engineering', 'AI Application Development',
  'RAG', 'AI Agents', 'Data Analytics', 'Power BI', 'Excel',
  'Pandas', 'NumPy', 'Machine Learning'
];
const OTHER_SKILLS = ['Communication', 'Problem Solving', 'Manual Testing', 'Technical Support', 'MS Office'];

const QUALIFICATIONS: QualificationLevel[] = [
  'Diploma', 'B.Tech / B.E.', 'B.Sc.', 'B.Com.', 'BCA', 'MCA', 'M.Tech', 'MBA', 'Other'
];

const CAREER_GOALS: CareerRoleGoal[] = [
  'AI Application Developer', 'Generative AI Engineer', 'Python Developer',
  'Java Developer', 'Software Engineer', 'Frontend Developer', 'Full Stack Developer',
  'Data Analyst', 'Business Analyst', 'Data Engineer', 'QA / Software Tester',
  'Technical Support Engineer', 'IT Help Desk', 'Business Operations / MIS Analyst',
  'HR / Talent Acquisition', 'Other'
];

const LOCATIONS: PreferredLocation[] = [
  'Anywhere in India', 'Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai',
  'Delhi NCR', 'Remote / Work From Home', 'Other'
];

export const CareerRoadmapPage: React.FC<CareerRoadmapPageProps> = ({ onNavigate }) => {
  // Views: 'landing' | 'form' | 'dashboard'
  const [view, setView] = useState<'landing' | 'form' | 'dashboard'>('landing');

  // Active form step (1 to 4)
  const [formStep, setFormStep] = useState<number>(1);

  // Form State
  const [qualification, setQualification] = useState<QualificationLevel>('B.Tech / B.E.');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [graduationYear, setGraduationYear] = useState('2025');
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>('Recent graduate');

  // Skills State
  const [selectedSkills, setSelectedSkills] = useState<SkillItem[]>([
    { name: 'Python', level: 'Beginner' },
    { name: 'SQL', level: 'Beginner' },
  ]);
  const [noSkillsYet, setNoSkillsYet] = useState(false);
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Career Goal State
  const [primaryRole, setPrimaryRole] = useState<CareerRoleGoal>('Python Developer');
  const [customRole, setCustomRole] = useState('');
  const [preferredLocation, setPreferredLocation] = useState<PreferredLocation>('Anywhere in India');
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>('Any');
  const [targetJobLevel, setTargetJobLevel] = useState<JobLevel>('Entry-level / Fresher');
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>('6–10 hours');
  const [targetTimeline, setTargetTimeline] = useState<PreparationTimeline>('90 days');

  // Preferences State
  const [biggestChallenge, setBiggestChallenge] = useState<BiggestChallenge>('Lack of projects');
  const [learningStyle, setLearningStyle] = useState<LearningStyle>('Step-by-step roadmap');
  const [additionalGoals, setAdditionalGoals] = useState('');

  // Loaded/Generated Roadmap
  const [roadmapData, setRoadmapData] = useState<CareerRoadmapData | null>(null);
  const [profileData, setProfileData] = useState<CareerProfile | null>(null);

  // Loading & Action State
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ p1: true, p2: true });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // On initial mount, load saved roadmap if present
  useEffect(() => {
    let isMounted = true;
    careerRoadmapService.getSavedRoadmap().then(({ profile, roadmap }) => {
      if (isMounted && roadmap) {
        setRoadmapData(roadmap);
        setProfileData(profile);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Compute Task Completion Stats
  const taskStats = useMemo(() => {
    if (!roadmapData || !roadmapData.phases) return { total: 0, completed: 0, percentage: 0 };
    let total = 0;
    let completed = 0;
    roadmapData.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        total += 1;
        if (task.status === 'completed') completed += 1;
      });
    });
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [roadmapData]);

  // Skill Selection Handlers
  const toggleSkill = (skillName: string) => {
    if (noSkillsYet) setNoSkillsYet(false);
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.name === skillName);
      if (exists) {
        return prev.filter((s) => s.name !== skillName);
      }
      return [...prev, { name: skillName, level: 'Beginner' }];
    });
  };

  const updateSkillLevel = (skillName: string, level: SkillProficiency) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.name === skillName ? { ...s, level } : s))
    );
  };

  const handleAddCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const clean = customSkillInput.trim();
    if (!selectedSkills.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
      setSelectedSkills((prev) => [...prev, { name: clean, level: 'Beginner' }]);
      if (noSkillsYet) setNoSkillsYet(false);
    }
    setCustomSkillInput('');
  };

  const handleNoSkillsToggle = () => {
    setNoSkillsYet(!noSkillsYet);
    if (!noSkillsYet) {
      setSelectedSkills([]);
    }
  };

  // Step Navigation Validation
  const handleNextStep = () => {
    setFormError(null);
    if (formStep === 1) {
      if (!branch.trim()) {
        setFormError('Please enter your branch or specialization.');
        return;
      }
      setFormStep(2);
    } else if (formStep === 2) {
      setFormStep(3);
    } else if (formStep === 3) {
      if (primaryRole === 'Other' && !customRole.trim()) {
        setFormError('Please specify your custom target role.');
        return;
      }
      setFormStep(4);
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    if (formStep > 1) setFormStep(formStep - 1);
  };

  // Submit & Generate Roadmap
  const handleGenerateRoadmap = async () => {
    setFormError(null);
    setIsGenerating(true);

    const profile: CareerProfile = {
      education: {
        qualification,
        branch,
        graduationYear,
        currentStatus,
      },
      skills: noSkillsYet ? [] : selectedSkills,
      noSkillsYet,
      careerGoal: {
        primaryRole,
        customRole,
        preferredLocation,
        workArrangement,
        targetJobLevel,
        weeklyHours,
        targetTimeline,
      },
      preferences: {
        biggestChallenge,
        learningStyle,
        additionalGoals,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      const generated = await careerRoadmapService.generateRoadmap(profile);
      setProfileData(profile);
      setRoadmapData(generated);
      await careerRoadmapService.saveRoadmap(profile, generated);
      setView('dashboard');
    } catch (err: any) {
      console.error('[CareerRoadmapPage] Generation error:', err);
      setFormError('Unable to generate roadmap right now. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Task Status Toggle
  const handleToggleTaskStatus = async (taskId: string, currentStatus: TaskStatus) => {
    if (!roadmapData) return;
    let nextStatus: TaskStatus = 'in_progress';
    if (currentStatus === 'not_started') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress') nextStatus = 'completed';
    else if (currentStatus === 'completed') nextStatus = 'not_started';

    const updated = await careerRoadmapService.updateTaskStatus(roadmapData, taskId, nextStatus);
    setRoadmapData(updated);
  };

  const handleResetProgress = async () => {
    if (!roadmapData) return;
    const reset = await careerRoadmapService.resetProgress(roadmapData);
    setRoadmapData(reset);
    setShowResetConfirm(false);
  };

  const togglePhaseExpand = (phaseId: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  return (
    <div className="space-y-12 pb-20 font-sans text-slate-900 animate-fadeIn">

      {/* ========================================================
          1. LANDING VIEW
          ======================================================== */}
      {view === 'landing' && !roadmapData && (
        <div className="space-y-16">
          
          {/* Hero Banner */}
          <section className="relative pt-6 sm:pt-10 max-w-5xl mx-auto text-center space-y-6 overflow-hidden">
            {/* Ambient Lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-gradient-to-r from-blue-600/15 via-violet-600/15 to-cyan-500/15 blur-3xl pointer-events-none rounded-full -z-10" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-4 h-4 text-violet-600 animate-pulse" />
              <span>AI-Powered Career Guidance &amp; Learning Plan</span>
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ml-1">
                100% Free
              </span>
            </div>

            <div className="space-y-4 max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display text-slate-900 tracking-tight leading-[1.14]">
                Your Career. Your Roadmap.{' '}
                <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                  Your Next Opportunity.
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Tell us where you are today. We'll help you plan the next steps toward your dream career with step-by-step phases, project recommendations, and interview prep.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => { setFormStep(1); setView('form'); }}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 group"
              >
                <Route className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Build My Career Roadmap</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#career-paths"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-2xl border border-slate-200/80 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Explore Career Paths</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* 3 Core Value Benefits Cards */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
              <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Personalized Learning Plan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Clear, achievable phases structured specifically around your current skills, graduation status, and target timeline.
                </p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Projects &amp; Interview Prep</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real portfolio project ideas with core features, technical questions, coding exercises, and STAR method tips.
                </p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 font-display">Job Application Guidance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Know exactly when to start applying, which job titles to search for, and how to tailor your resume for off-campus drives.
                </p>
              </div>
            </div>
          </section>

          {/* Quick Career Paths Grid Section */}
          <section id="career-paths" className="max-w-5xl mx-auto space-y-6 pt-4">
            <div className="text-center space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/80">
                Popular In-Demand Tech Roles
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Which Career Path Are You Targetting?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
                Select a role below to launch the personalized AI Roadmap generator for your background.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { role: 'Python Developer' as CareerRoleGoal, tag: 'High Off-Campus Demand', icon: Code2, bg: 'border-blue-200 hover:border-blue-400 bg-gradient-to-br from-blue-50/50 to-white' },
                { role: 'AI Application Developer' as CareerRoleGoal, tag: 'Modern AI & LLM Tech', icon: Cpu, bg: 'border-violet-200 hover:border-violet-400 bg-gradient-to-br from-violet-50/50 to-white' },
                { role: 'Data Analyst' as CareerRoleGoal, tag: 'SQL + Excel + Power BI', icon: Layers, bg: 'border-cyan-200 hover:border-cyan-400 bg-gradient-to-br from-cyan-50/50 to-white' },
                { role: 'Java Developer' as CareerRoleGoal, tag: 'Enterprise & MNC Hiring', icon: Laptop, bg: 'border-amber-200 hover:border-amber-400 bg-gradient-to-br from-amber-50/50 to-white' },
                { role: 'Full Stack Developer' as CareerRoleGoal, tag: 'React + Node / Python', icon: Globe, bg: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-emerald-50/50 to-white' },
                { role: 'QA / Software Tester' as CareerRoleGoal, tag: 'Manual & Automation', icon: ShieldCheck, bg: 'border-slate-200 hover:border-slate-400 bg-gradient-to-br from-slate-50/50 to-white' },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.role}
                    onClick={() => {
                      setPrimaryRole(item.role);
                      setFormStep(1);
                      setView('form');
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md space-y-3 relative group ${item.bg}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs group-hover:scale-105 transition-transform">
                        <IconComponent className="w-5 h-5 text-indigo-600" />
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                        {item.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.role}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Build step-by-step plan, projects &amp; interview prep.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 pt-1">
                      <span>Start Roadmap</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Quick Resume Saved Roadmap Banner (if already present in landing) */}
      {view === 'landing' && roadmapData && (
        <section className="max-w-4xl mx-auto p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl border border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-400 text-slate-950">
              <CheckCircle2 className="w-3 h-3" />
              <span>Active Roadmap Saved</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              Target Role: <span className="text-amber-300">{roadmapData.targetRole}</span> ({taskStats.percentage}% Completed)
            </h3>
            <p className="text-xs text-slate-300">
              {roadmapData.recommendedNextAction}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setView('dashboard')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>Open My Roadmap Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setFormStep(1); setView('form'); }}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            >
              New Role
            </button>
          </div>
        </section>
      )}

      {/* ========================================================
          2. MULTI-STEP CAREER PROFILE FORM
          ======================================================== */}
      {view === 'form' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-scaleUp">
          
          {/* Form Header Progress Bar */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider text-indigo-200 uppercase">
                  Career Profile Setup
                </span>
              </div>
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-indigo-200 border border-white/10">
                Step {formStep} of 4
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              {formStep === 1 && 'Step 1: Your Educational Background'}
              {formStep === 2 && 'Step 2: Your Current Technical Skills'}
              {formStep === 3 && 'Step 3: Target Career Goal & Preferences'}
              {formStep === 4 && 'Step 4: Personal Preferences & Challenges'}
            </h2>

            {/* Visual Step Dots Indicator */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-2">
              {[1, 2, 3, 4].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    formStep >= stepNum ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form Content Body */}
          <div className="p-6 sm:p-8 space-y-6">

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: EDUCATION */}
            {formStep === 1 && (
              <div className="space-y-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Highest Educational Qualification <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUALIFICATIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQualification(q)}
                        className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                          qualification === q
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Branch / Specialization <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CSE, ECE, Mechanical, IT, Finance"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Graduation Year <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium"
                    >
                      {['2027', '2026', '2025', '2024', '2023', '2022', '2021', 'Earlier'].map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Current Career Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { status: 'Student' as CurrentStatus, desc: 'Currently studying in college / final year' },
                      { status: 'Recent graduate' as CurrentStatus, desc: 'Passed out recently & seeking off-campus job' },
                      { status: 'Working professional' as CurrentStatus, desc: 'Currently working & looking for career growth' },
                      { status: 'Career switcher' as CurrentStatus, desc: 'Switching from non-tech or different field' },
                    ].map((item) => (
                      <div
                        key={item.status}
                        onClick={() => setCurrentStatus(item.status)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          currentStatus === item.status
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-slate-900">{item.status}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SKILLS */}
            {formStep === 2 && (
              <div className="space-y-5 text-xs">
                
                {/* No skills yet banner toggle */}
                <div
                  onClick={handleNoSkillsToggle}
                  className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    noSkillsYet
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold">I have no professional skills yet</div>
                      <div className="text-[11px] font-normal text-slate-500">
                        Don't worry! We will build your roadmap starting from scratch fundamentals.
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={noSkillsYet}
                    onChange={() => {}}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>

                {!noSkillsYet && (
                  <>
                    <div className="space-y-4">
                      <p className="text-slate-600 font-medium">
                        Select skills you already know or have practiced in college / projects:
                      </p>

                      {/* Programming */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Programming Languages
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PROGRAMMING_SKILLS.map((skill) => {
                            const selected = selectedSkills.some((s) => s.name === skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {selected ? `✓ ${skill}` : `+ ${skill}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Web Dev */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Web Development
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {WEB_SKILLS.map((skill) => {
                            const selected = selectedSkills.some((s) => s.name === skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {selected ? `✓ ${skill}` : `+ ${skill}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI & Data */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          AI, LLM &amp; Data Analytics
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {AI_DATA_SKILLS.map((skill) => {
                            const selected = selectedSkills.some((s) => s.name === skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {selected ? `✓ ${skill}` : `+ ${skill}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Other */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Other Tools &amp; Soft Skills
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {OTHER_SKILLS.map((skill) => {
                            const selected = selectedSkills.some((s) => s.name === skill);
                            return (
                              <button
                                key={skill}
                                type="button"
                                onClick={() => toggleSkill(skill)}
                                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {selected ? `✓ ${skill}` : `+ ${skill}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom skill adder */}
                      <div className="pt-1">
                        <label className="block font-bold text-slate-700 mb-1">
                          Add Custom Skill (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. Django, Kubernetes, Figma"
                            value={customSkillInput}
                            onChange={(e) => setCustomSkillInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSkill(); } }}
                            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSkill}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Selected Skills Level Specifier */}
                      {selectedSkills.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="font-bold text-slate-900 text-xs">
                            Specify Proficiency Level for Selected Skills:
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {selectedSkills.map((s) => (
                              <div
                                key={s.name}
                                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80"
                              >
                                <span className="font-bold text-slate-800">{s.name}</span>
                                <div className="flex gap-1">
                                  {(['Beginner', 'Intermediate', 'Advanced'] as SkillProficiency[]).map((lvl) => (
                                    <button
                                      key={lvl}
                                      type="button"
                                      onClick={() => updateSkillLevel(s.name, lvl)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                        s.level === lvl
                                          ? 'bg-blue-600 text-white shadow-2xs'
                                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {lvl}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: CAREER GOAL & TIMELINE */}
            {formStep === 3 && (
              <div className="space-y-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Primary Target Role Goal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={primaryRole}
                    onChange={(e) => setPrimaryRole(e.target.value as CareerRoleGoal)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-bold text-slate-900"
                  >
                    {CAREER_GOALS.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {primaryRole === 'Other' && (
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Specify Custom Target Role <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cybersecurity Analyst, Cloud Engineer, Product Manager"
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Preferred Work Location
                    </label>
                    <select
                      value={preferredLocation}
                      onChange={(e) => setPreferredLocation(e.target.value as PreferredLocation)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Preferred Work Arrangement
                    </label>
                    <select
                      value={workArrangement}
                      onChange={(e) => setWorkArrangement(e.target.value as WorkArrangement)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium"
                    >
                      <option value="Any">Any Arrangement</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote / Work From Home</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Weekly Learning Time Available
                    </label>
                    <select
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(e.target.value as WeeklyHours)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium"
                    >
                      <option value="3–5 hours">3–5 hours / week (Light)</option>
                      <option value="6–10 hours">6–10 hours / week (Balanced)</option>
                      <option value="11–20 hours">11–20 hours / week (Intensive)</option>
                      <option value="20+ hours">20+ hours / week (Full-time Prep)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">
                      Target Preparation Timeline
                    </label>
                    <select
                      value={targetTimeline}
                      onChange={(e) => setTargetTimeline(e.target.value as PreparationTimeline)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium"
                    >
                      <option value="30 days">30 days (Fast Track)</option>
                      <option value="60 days">60 days (Standard)</option>
                      <option value="90 days">90 days (Recommended)</option>
                      <option value="6 months">6 months (Deep Mastery)</option>
                      <option value="Flexible">Flexible / Self-Paced</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PREFERENCES & CHALLENGES */}
            {formStep === 4 && (
              <div className="space-y-5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    What is your biggest career challenge right now? <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      'Lack of technical skills',
                      'Lack of projects',
                      'Weak interview confidence',
                      'Resume not getting shortlisted',
                      'Not finding relevant jobs',
                      'Confusion about career direction',
                      'Other',
                    ].map((ch) => (
                      <div
                        key={ch}
                        onClick={() => setBiggestChallenge(ch as BiggestChallenge)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          biggestChallenge === ch
                            ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{ch}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          biggestChallenge === ch ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {biggestChallenge === ch && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Preferred Learning Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { style: 'Step-by-step roadmap' as LearningStyle, desc: 'Structured weekly milestones & checklists' },
                      { style: 'Project-based learning' as LearningStyle, desc: 'Build real portfolio apps first' },
                      { style: 'Interview-focused learning' as LearningStyle, desc: 'Prioritize Q&A & live coding' },
                      { style: 'Balanced approach' as LearningStyle, desc: 'Mix of theory, projects & interviews' },
                    ].map((item) => (
                      <div
                        key={item.style}
                        onClick={() => setLearningStyle(item.style)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          learningStyle === item.style
                            ? 'bg-blue-50 border-blue-500 font-bold text-blue-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>{item.style}</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Tell us more about your career goals (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. I want to crack an off-campus drive at TCS or an AI startup within 3 months..."
                    value={additionalGoals}
                    onChange={(e) => setAdditionalGoals(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Form Footer Action Controls */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView('landing')}
                  className="px-5 py-2.5 rounded-xl text-slate-500 font-bold hover:text-slate-800 cursor-pointer text-xs"
                >
                  Cancel
                </button>
              )}

              {formStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-1.5 text-xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateRoadmap}
                  disabled={isGenerating}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 text-xs"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating AI Roadmap...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate My Roadmap</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          3. INTERACTIVE ROADMAP DASHBOARD VIEW
          ======================================================== */}
      {view === 'dashboard' && roadmapData && (
        <div className="space-y-10 max-w-6xl mx-auto">

          {/* Dashboard Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5 text-blue-400" />
                    Target Role: {roadmapData.targetRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {roadmapData.targetTimeline} ({roadmapData.weeklyHours}/wk)
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
                  Your Personal Career Action Plan
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {roadmapData.readinessAssessment}
                </p>
              </div>

              {/* Progress & Readiness Score Gauge */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
                
                {/* Score Circle */}
                <div className="text-center px-2 border-r border-white/15">
                  <div className="text-3xl font-extrabold text-amber-300 font-mono">
                    {roadmapData.readinessScore}%
                  </div>
                  <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                    Initial Readiness
                  </div>
                </div>

                {/* Checklist Progress */}
                <div className="space-y-1.5 min-w-[140px]">
                  <div className="flex items-center justify-between text-xs text-slate-200 font-bold">
                    <span>Task Progress</span>
                    <span className="text-cyan-300 font-mono">{taskStats.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${taskStats.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 text-right">
                    {taskStats.completed} of {taskStats.total} Tasks Completed
                  </div>
                </div>

              </div>

            </div>

            {/* Header Control Buttons */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-semibold">{roadmapData.recommendedNextAction}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  onClick={() => { setFormStep(1); setView('form'); }}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Modify &amp; Regenerate</span>
                </button>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 font-medium transition-colors cursor-pointer"
                  title="Reset all tasks to not started"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Reset Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl border border-slate-200">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="font-bold text-lg text-slate-900">Reset Roadmap Progress?</h3>
                <p className="text-xs text-slate-600">
                  This will set all checklist tasks back to 'Not Started'. This action cannot be undone.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: LEARNING PHASES & CHECKLIST */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>1. Learning Phases &amp; Action Checklist</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click task status chips to update your roadmap progress in real time.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {roadmapData.phases.map((phase, pIdx) => {
                const isExpanded = expandedPhases[phase.id] !== false;
                const phaseCompletedTasks = phase.tasks.filter((t) => t.status === 'completed').length;
                const phaseTotal = phase.tasks.length;
                const isPhaseDone = phaseTotal > 0 && phaseCompletedTasks === phaseTotal;

                return (
                  <div
                    key={phase.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Phase Card Header Bar */}
                    <div
                      onClick={() => togglePhaseExpand(phase.id)}
                      className="p-4 sm:p-5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200/80 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isPhaseDone ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {isPhaseDone ? <CheckCircle2 className="w-4 h-4" /> : `0${pIdx + 1}`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900">
                              {phase.title}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                              {phase.duration}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Outcome: {phase.expectedOutcome}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-slate-600 font-mono">
                          {phaseCompletedTasks}/{phaseTotal} Tasks
                        </span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Phase Body Content */}
                    {isExpanded && (
                      <div className="p-5 space-y-5">
                        
                        {/* Phase Objectives & Topics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-blue-600" />
                              <span>Key Objectives:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                              {phase.objectives.map((obj, i) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                              <span>Core Topics to Study:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                              {phase.topicsToStudy.map((top, i) => (
                                <li key={i}>{top}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Checklist Tasks List */}
                        <div className="space-y-3">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Phase Action Tasks:
                          </div>

                          <div className="space-y-2">
                            {phase.tasks.map((task) => (
                              <div
                                key={task.id}
                                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : task.status === 'in_progress'
                                    ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-400/20'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-xs ${
                                      task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'
                                    }`}>
                                      {task.title}
                                    </span>
                                    {task.timeframe && (
                                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                                        {task.timeframe}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600">
                                    {task.description}
                                  </p>
                                </div>

                                {/* Status Toggle Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                                    task.status === 'completed'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : task.status === 'in_progress'
                                      ? 'bg-amber-500 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {task.status === 'completed' && <CheckSquare className="w-3.5 h-3.5" />}
                                  {task.status === 'in_progress' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                                  {task.status === 'not_started' && <Square className="w-3.5 h-3.5" />}
                                  <span>
                                    {task.status === 'completed' && 'Completed'}
                                    {task.status === 'in_progress' && 'In Progress'}
                                    {task.status === 'not_started' && 'Mark Started'}
                                  </span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: PRACTICAL PORTFOLIO PROJECTS */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-violet-600" />
                <span>2. Recommended Portfolio Projects</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Build these real-world projects to prove your technical abilities to recruiters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {roadmapData.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-slate-900 font-display">
                        {proj.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                        Portfolio Ready
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="font-bold text-slate-800">Problem Solved:</div>
                      <p className="text-slate-600">{proj.problem}</p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="font-bold text-slate-800">Core Features:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        {proj.coreFeatures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Stack:</span>
                      {proj.techStack.map((tech) => (
                        <span key={tech} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
                    <div className="font-bold text-indigo-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Interview Explanation Tip:</span>
                    </div>
                    <p className="text-indigo-800 leading-snug">{proj.interviewTip}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: INTERVIEW PREPARATION */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                  <Video className="w-5 h-5 text-amber-500" />
                  <span>3. Role Technical &amp; Interview Preparation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revise these core topics to answer technical questions with confidence.
                </p>
              </div>

              <button
                onClick={() => onNavigate('/mock-interview')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Practice Mock Interview (₹99)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>Technical Topics to Revise:</span>
                </div>
                <ul className="space-y-1 text-slate-600">
                  {roadmapData.interviewPrep.technicalTopics.map((top, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{top}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>HR &amp; Behavioral STAR Method Tips:</span>
                </div>
                <ul className="space-y-1 text-slate-600">
                  {roadmapData.interviewPrep.hrPrepTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 4: RESUME & PORTFOLIO STRATEGY */}
          <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-blue-400" />
                  <span>4. Resume, GitHub &amp; Portfolio Strategy</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  How to present your technical projects honestly and pass ATS resume parsers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/resume-review')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  Free ATS Scan
                </button>
                <button
                  onClick={() => onNavigate('/portfolio-service')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  Portfolio Service (₹499)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Resume Formatting Highlights:</span>
                </div>
                <ul className="space-y-1 text-slate-200">
                  {roadmapData.resumePortfolioPlan.resumeHighlights.map((hl, i) => (
                    <li key={i}>• {hl}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>GitHub &amp; Portfolio Essentials:</span>
                </div>
                <ul className="space-y-1 text-slate-200">
                  {roadmapData.resumePortfolioPlan.githubTips.map((gt, i) => (
                    <li key={i}>• {gt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 5: WEEKLY SCHEDULE & FREE RESOURCES */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Weekly Schedule */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-base text-slate-900 font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Weekly Schedule ({roadmapData.weeklyHours})</span>
              </h3>

              <div className="space-y-2 text-xs">
                {Object.entries(roadmapData.weeklySchedule).map(([day, task]) => (
                  <div key={day} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-900 capitalize w-24 shrink-0">{day}:</span>
                    <span className="text-slate-600 text-right">{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Free Verified Resources */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-base text-slate-900 font-display flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Free Verified Learning Documentation</span>
              </h3>

              <div className="space-y-2 text-xs">
                {roadmapData.learningResources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 hover:border-blue-300 block transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {res.title}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{res.description}</p>
                  </a>
                ))}
              </div>
            </div>

          </section>

          {/* SECTION 6: CONNECT TO MANA NAUKARI SERVICES GRID */}
          <section className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                Integrated Career Support
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-display">
                Mana Naukari Accelerated Career Services
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {roadmapData.manaServicesConnections.map((srv, i) => (
                <div
                  key={i}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {srv.badgeText}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{srv.title}</h4>
                    <p className="text-slate-500 leading-relaxed text-[11px]">{srv.description}</p>
                  </div>

                  <button
                    onClick={() => onNavigate(srv.route)}
                    className="w-full py-2 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>{srv.ctaText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}

    </div>
  );
};
