export interface AIQuestion {
  id: string;
  questionText: string;
  hints: string[];
  expectedKeyPoints: string[];
  category: string;
  timeLimitSeconds: number;
}

export interface QuestionEvaluation {
  questionId: string;
  questionText: string;
  candidateAnswer: string;
  score: number;
  clarityScore: number;
  technicalAccuracy: number;
  communication: number;
  starStructureScore: number;
  strengths: string[];
  weaknesses: string[];
  improvedAnswer: string;
  feedbackSummary: string;
}

export interface InterviewFinalReport {
  overallScore: number;
  headline: string;
  readinessStatus: 'Ready' | 'Almost Ready' | 'Needs Practice';
  communicationRating: string;
  technicalRating: string;
  starMethodMastery: string;
  topStrengths: string[];
  keySkillGaps: string[];
  actionableTips: string[];
  recommendedStudyMaterials: string[];
  createdAt: string;
}

export interface PracticeSessionConfig {
  role: string;
  customRole?: string;
  experienceLevel: string;
  companyType: string;
  questionCount: number;
  languageMode: string;
}

// Fallback question generator when backend AI is unreachable
const FALLBACK_QUESTIONS: Record<string, AIQuestion[]> = {
  default: [
    {
      id: 'f1',
      questionText: 'Tell me about yourself, your educational background, and why you are interested in this role.',
      hints: ['Structure: Present -> Past -> Future', 'Highlight key technical skills & final year project', 'Keep it under 2 minutes'],
      expectedKeyPoints: ['Education', 'Key Skills', 'Projects', 'Career Goal', 'Company Alignment'],
      category: 'Self Introduction & HR',
      timeLimitSeconds: 120,
    },
    {
      id: 'f2',
      questionText: 'Explain your final year college project or a major project you built. What was your specific role and tech stack?',
      hints: ['Use STAR method: Situation, Task, Action, Result', 'Focus on problem solved and tech stack used', 'Mention challenges overcome'],
      expectedKeyPoints: ['Problem Statement', 'Tech Stack Used', 'Individual Contribution', 'Database / Architecture', 'Key Outcome'],
      category: 'Technical Project',
      timeLimitSeconds: 180,
    },
    {
      id: 'f3',
      questionText: 'What are your core technical strengths, and how do you handle debugging or learning a technology you are new to?',
      hints: ['Give a concrete example of learning something fast', 'Mention documentation, trial, and error', 'Show enthusiasm for continuous learning'],
      expectedKeyPoints: ['Primary Skills', 'Problem Solving Approach', 'Self Learning', 'Resourcefulness'],
      category: 'Behavioral & Technical',
      timeLimitSeconds: 150,
    },
  ],
  react: [
    {
      id: 'r1',
      questionText: 'Tell me about yourself and your experience working with React.js and modern frontend tools.',
      hints: ['Mention React basics, hooks, state management', 'Highlight projects built with React'],
      expectedKeyPoints: ['Components', 'JSX', 'State & Props', 'Projects'],
      category: 'Self Intro / React',
      timeLimitSeconds: 120,
    },
    {
      id: 'r2',
      questionText: 'What is the Virtual DOM in React, and how does React reconcile state changes efficiently compared to traditional DOM manipulation?',
      hints: ['Diffing algorithm', 'Batched updates', 'Minimal real DOM updates'],
      expectedKeyPoints: ['In-memory representation', 'Diffing algorithm', 'Performance improvement', 'Reconciliation'],
      category: 'React Core Concept',
      timeLimitSeconds: 150,
    },
    {
      id: 'r3',
      questionText: 'Explain the difference between useEffect, useState, and custom hooks. When would you use useMemo or useCallback?',
      hints: ['Side effects management', 'State persistence', 'Performance optimization'],
      expectedKeyPoints: ['Hook lifecycle', 'Dependency array', 'Memoization', 'Re-renders prevention'],
      category: 'React Hooks',
      timeLimitSeconds: 180,
    },
  ],
  python: [
    {
      id: 'p1',
      questionText: 'Tell me about yourself and why you chose Python for software development or data analysis.',
      hints: ['Mention ease of learning, rich library ecosystem', 'Highlight projects built using Python'],
      expectedKeyPoints: ['Education', 'Python Libraries', 'Projects', 'Role Interest'],
      category: 'Self Intro / Python',
      timeLimitSeconds: 120,
    },
    {
      id: 'p2',
      questionText: 'Explain the differences between List, Tuple, Set, and Dictionary in Python in terms of mutability and ordering.',
      hints: ['Mutable vs Immutable', 'Ordered vs Unordered', 'Hashability and Key types'],
      expectedKeyPoints: ['List (mutable, ordered)', 'Tuple (immutable, ordered)', 'Set (unique, unordered)', 'Dict (key-value pairs)'],
      category: 'Python Fundamentals',
      timeLimitSeconds: 150,
    },
    {
      id: 'p3',
      questionText: 'What are decorators in Python and how do list comprehensions work? Give a practical example.',
      hints: ['Higher order functions (@decorator)', 'Concise syntax for creating lists'],
      expectedKeyPoints: ['Function wrappers', 'Syntactic sugar', 'Performance & Readability', 'List comprehension syntax'],
      category: 'Advanced Python',
      timeLimitSeconds: 180,
    },
  ],
};

export const aiMockInterviewService = {
  /**
   * Fetch generated interview questions from API (or fallback)
   */
  async generateQuestions(config: PracticeSessionConfig): Promise<AIQuestion[]> {
    try {
      const response = await fetch('/api/ai/mock-interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          return data.questions;
        }
      }
    } catch (err) {
      console.warn('[aiMockInterviewService] API call failed, using client fallback:', err);
    }

    // Client-side Fallback
    const lowerRole = (config.customRole || config.role).toLowerCase();
    let questions = FALLBACK_QUESTIONS.default;

    if (lowerRole.includes('react') || lowerRole.includes('frontend')) {
      questions = FALLBACK_QUESTIONS.react;
    } else if (lowerRole.includes('python')) {
      questions = FALLBACK_QUESTIONS.python;
    }

    // Slice to requested length
    return questions.slice(0, config.questionCount);
  },

  /**
   * Evaluate a candidate's answer for a single question
   */
  async evaluateAnswer(
    question: AIQuestion,
    candidateAnswer: string,
    config: PracticeSessionConfig
  ): Promise<QuestionEvaluation> {
    try {
      const response = await fetch('/api/ai/mock-interview/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.questionText,
          candidateAnswer,
          role: config.customRole || config.role,
          experienceLevel: config.experienceLevel,
          expectedKeyPoints: question.expectedKeyPoints,
          languageMode: config.languageMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.evaluation) {
          return {
            questionId: question.id,
            questionText: question.questionText,
            candidateAnswer,
            ...data.evaluation,
          };
        }
      }
    } catch (err) {
      console.warn('[aiMockInterviewService] Answer evaluation API failed, using client fallback:', err);
    }

    // Fallback evaluation algorithm
    const words = candidateAnswer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    let score = 70;
    if (wordCount < 15) score = 40;
    else if (wordCount > 40) score = 85;

    // Check key points mentioned
    const lowerAnswer = candidateAnswer.toLowerCase();
    const matchedKeyPoints = question.expectedKeyPoints.filter((kp) =>
      lowerAnswer.includes(kp.toLowerCase())
    );

    score += matchedKeyPoints.length * 5;
    if (score > 95) score = 95;

    return {
      questionId: question.id,
      questionText: question.questionText,
      candidateAnswer,
      score,
      clarityScore: wordCount > 20 ? 80 : 50,
      technicalAccuracy: matchedKeyPoints.length > 0 ? 85 : 60,
      communication: wordCount > 30 ? 82 : 58,
      starStructureScore: lowerAnswer.includes('result') || lowerAnswer.includes('project') || lowerAnswer.includes('built') ? 85 : 60,
      strengths: [
        'Good attempt at answering the core question promptly.',
        matchedKeyPoints.length > 0 ? `Successfully mentioned key concepts like ${matchedKeyPoints.join(', ')}.` : 'Maintained clear language.',
      ],
      weaknesses: [
        wordCount < 25 ? 'Answer is brief; elaborate more on specific examples and technical depth.' : 'Structure could be further aligned with the STAR method (Situation, Task, Action, Result).',
      ],
      improvedAnswer: `A strong candidate answer for ${config.role}: "In my previous project/academics, I encountered a requirement for this. (Situation & Task). I approached it by researching the core concepts and implementing clean, modular code. (Action). As a result, the application achieved smooth performance and met all functional specs. (Result)."`,
      feedbackSummary: `Solid attempt! To score higher in actual interviews, aim for at least 3-4 sentences detailing the 'Action' and 'Result' steps.`,
    };
  },

  /**
   * Generate final overall report after interview completion
   */
  async generateFinalReport(
    evaluations: QuestionEvaluation[],
    config: PracticeSessionConfig
  ): Promise<InterviewFinalReport> {
    try {
      const response = await fetch('/api/ai/mock-interview/final-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluations, config }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.report) {
          this.saveSessionReportToLocalStorage(data.report, config, evaluations);
          return data.report;
        }
      }
    } catch (err) {
      console.warn('[aiMockInterviewService] Final report API failed, using client fallback:', err);
    }

    // Fallback summary generator
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const avgScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length) : 75;

    const readiness: 'Ready' | 'Almost Ready' | 'Needs Practice' =
      avgScore >= 80 ? 'Ready' : avgScore >= 65 ? 'Almost Ready' : 'Needs Practice';

    const report: InterviewFinalReport = {
      overallScore: avgScore,
      headline: `Diagnostic Assessment for ${config.customRole || config.role} (${config.experienceLevel})`,
      readinessStatus: readiness,
      communicationRating: avgScore > 75 ? 'Strong & Clear' : 'Good (Needs minor structuring)',
      technicalRating: avgScore > 80 ? 'Proficient' : 'Intermediate (Revise core concepts)',
      starMethodMastery: avgScore > 70 ? '72% - Good Situation/Action linkage' : '55% - Add clear outcome metrics',
      topStrengths: [
        'Clear confidence in answering technical & personal questions.',
        'Good understanding of fundamental concepts for freshers.',
        'Maintained structured communication.',
      ],
      keySkillGaps: [
        'Elaborate more on practical project experience.',
        'Consistently include measurable outcomes in STAR responses.',
      ],
      actionableTips: [
        'Practice speaking answers out loud 2-3 times before actual interviews.',
        'Use the STAR method: explicitly state Situation, Task, Action, and Result.',
        'Review study materials on Mana Naukari for deep-dive technical questions.',
      ],
      recommendedStudyMaterials: [
        'Top 50 Technical Interview Questions for Freshers',
        'HR & Behavioral Interview Preparation Guide',
        'Resume & Project Presentation Secrets',
      ],
      createdAt: new Date().toISOString(),
    };

    this.saveSessionReportToLocalStorage(report, config, evaluations);
    return report;
  },

  /**
   * Save report locally for candidate reference
   */
  saveSessionReportToLocalStorage(
    report: InterviewFinalReport,
    config: PracticeSessionConfig,
    evaluations: QuestionEvaluation[]
  ) {
    try {
      const existingStr = localStorage.getItem('mana_naukari_ai_interview_history');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const newRecord = {
        id: 'session_' + Date.now(),
        config,
        report,
        evaluationsCount: evaluations.length,
        timestamp: new Date().toISOString(),
      };
      existing.unshift(newRecord);
      localStorage.setItem('mana_naukari_ai_interview_history', JSON.stringify(existing.slice(0, 10)));
    } catch (e) {
      console.warn('Could not save interview session history locally', e);
    }
  },
};
