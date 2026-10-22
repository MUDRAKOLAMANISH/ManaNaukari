export type QualificationLevel =
  | 'Diploma'
  | 'B.Tech / B.E.'
  | 'B.Sc.'
  | 'B.Com.'
  | 'BCA'
  | 'MCA'
  | 'M.Tech'
  | 'MBA'
  | 'Other';

export type CurrentStatus =
  | 'Student'
  | 'Recent graduate'
  | 'Working professional'
  | 'Career switcher';

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced';

export interface SkillItem {
  name: string;
  level: SkillProficiency;
}

export type CareerRoleGoal =
  | 'AI Application Developer'
  | 'Generative AI Engineer'
  | 'Python Developer'
  | 'Java Developer'
  | 'Software Engineer'
  | 'Frontend Developer'
  | 'Full Stack Developer'
  | 'Data Analyst'
  | 'Business Analyst'
  | 'Data Engineer'
  | 'QA / Software Tester'
  | 'Technical Support Engineer'
  | 'IT Help Desk'
  | 'Business Operations / MIS Analyst'
  | 'HR / Talent Acquisition'
  | 'Other';

export type PreferredLocation =
  | 'Anywhere in India'
  | 'Hyderabad'
  | 'Bengaluru'
  | 'Chennai'
  | 'Pune'
  | 'Mumbai'
  | 'Delhi NCR'
  | 'Remote / Work From Home'
  | 'Other';

export type WorkArrangement = 'On-site' | 'Hybrid' | 'Remote' | 'Any';

export type JobLevel = 'Internship' | 'Entry-level / Fresher' | 'Experienced';

export type WeeklyHours = '3–5 hours' | '6–10 hours' | '11–20 hours' | '20+ hours';

export type PreparationTimeline =
  | '30 days'
  | '60 days'
  | '90 days'
  | '6 months'
  | 'Flexible';

export type BiggestChallenge =
  | 'Lack of technical skills'
  | 'Lack of projects'
  | 'Weak interview confidence'
  | 'Resume not getting shortlisted'
  | 'Not finding relevant jobs'
  | 'Confusion about career direction'
  | 'Other';

export type LearningStyle =
  | 'Step-by-step roadmap'
  | 'Project-based learning'
  | 'Interview-focused learning'
  | 'Balanced approach';

export interface CareerProfile {
  id?: string;
  education: {
    qualification: QualificationLevel;
    branch: string;
    graduationYear: string;
    currentStatus: CurrentStatus;
  };
  skills: SkillItem[];
  noSkillsYet: boolean;
  careerGoal: {
    primaryRole: CareerRoleGoal;
    customRole?: string;
    preferredLocation: PreferredLocation;
    workArrangement: WorkArrangement;
    targetJobLevel: JobLevel;
    weeklyHours: WeeklyHours;
    targetTimeline: PreparationTimeline;
  };
  preferences: {
    biggestChallenge: BiggestChallenge;
    learningStyle: LearningStyle;
    additionalGoals?: string;
  };
  createdAt?: string;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface RoadmapTask {
  id: string;
  phaseId: string;
  title: string;
  description: string;
  estimatedHours: number;
  status: TaskStatus;
  timeframe?: string;
  outcome?: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  duration: string;
  objectives: string[];
  topicsToStudy: string[];
  practicalExercises: string[];
  expectedOutcome: string;
  tasks: RoadmapTask[];
}

export interface ProjectRecommendation {
  id: string;
  name: string;
  problem: string;
  requiredSkills: string[];
  coreFeatures: string[];
  techStack: string[];
  deliverable: string;
  interviewTip: string;
}

export interface InterviewPrep {
  technicalTopics: string[];
  commonQuestions: string[];
  codingExercises: string[];
  hrPrepTips: string[];
  weeklyMockTip: string;
}

export interface ResumePortfolioPlan {
  resumeHighlights: string[];
  portfolioMustHaves: string[];
  githubTips: string[];
  honestDescriptionTips: string[];
}

export interface JobSearchStrategy {
  whenToStart: string;
  targetJobTitles: string[];
  applicationPriorities: string[];
  tailoringTips: string[];
  trackingTips: string[];
}

export interface WeeklySchedule {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface LearningResource {
  title: string;
  type: 'official_doc' | 'free_tutorial' | 'interactive_platform' | 'github_repo';
  url: string;
  description: string;
  isFree: boolean;
}

export interface ManaServiceConnection {
  title: string;
  description: string;
  route: string;
  badgeText: string;
  ctaText: string;
  priceTag?: string;
}

export interface CareerRoadmapData {
  id: string;
  createdAt: string;
  updatedAt: string;
  targetRole: string;
  targetTimeline: string;
  weeklyHours: string;
  readinessScore: number;
  readinessAssessment: string;
  existingSkillsSummary: string[];
  topSkillGaps: string[];
  recommendedNextAction: string;
  phases: RoadmapPhase[];
  projects: ProjectRecommendation[];
  interviewPrep: InterviewPrep;
  resumePortfolioPlan: ResumePortfolioPlan;
  jobSearchStrategy: JobSearchStrategy;
  weeklySchedule: WeeklySchedule;
  learningResources: LearningResource[];
  manaServicesConnections: ManaServiceConnection[];
}
