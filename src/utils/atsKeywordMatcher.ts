/**
 * Deterministic ATS Keyword & Heuristics Matcher
 * Used as a reliable fallback whenever AI service is unavailable, unconfigured, or times out.
 * Compares: Skills, Experience, Education, Keywords.
 */

import { AtsMatchResult } from '../types/ats.types';
import { normalizeSkills } from './skillUtils';

interface KeywordMatchInput {
  resumeText: string;
  resumeFileName?: string;
  jobId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  skillsRequired?: unknown;
  experienceRequired?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
}

// Common technical and functional skill dictionary for robust matching
const COMMON_SKILLS_DICTIONARY = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
  'React', 'React.js', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Django', 'Flask',
  'Spring Boot', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind CSS', 'Bootstrap', 'Git', 'GitHub', 'GitLab',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Google Cloud', 'Linux', 'Bash', 'CI/CD',
  'Jenkins', 'Microservices', 'Unit Testing', 'Jest', 'Mocha', 'Cypress', 'Selenium',
  'Agile', 'Scrum', 'Jira', 'Data Structures', 'Algorithms', 'OOP', 'System Design',
  'Machine Learning', 'Deep Learning', 'NLP', 'Data Science', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch',
  'Power BI', 'Tableau', 'Excel', 'Problem Solving', 'Communication', 'Teamwork', 'Leadership'
];

// Common stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers',
  'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if',
  'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
  'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t',
  'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
  'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
  'yourselves', 'job', 'work', 'role', 'apply', 'experience', 'years', 'requirements', 'responsibilities'
]);

/**
 * Perform deterministic keyword and heuristics matching
 */
export function calculateFallbackAtsMatch(input: KeywordMatchInput): AtsMatchResult {
  const resumeTextLower = input.resumeText.toLowerCase();
  const jobDescLower = input.jobDescription.toLowerCase();

  // 1. Compile Required Skills list
  let explicitSkills = normalizeSkills(input.skillsRequired);
  
  // If no explicit skills provided, discover skills from dictionary mentioned in job description
  if (explicitSkills.length === 0) {
    explicitSkills = COMMON_SKILLS_DICTIONARY.filter((skill) =>
      jobDescLower.includes(skill.toLowerCase())
    );
  }

  // Fallback to title words if still empty
  if (explicitSkills.length === 0) {
    explicitSkills = input.jobTitle
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()));
  }

  // Ensure unique canonical skills
  const targetSkills = Array.from(new Set(explicitSkills));

  // 2. Identify Matched vs Missing Skills
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  targetSkills.forEach((skill) => {
    const skillPattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    if (skillPattern.test(resumeTextLower) || resumeTextLower.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  // Calculate Skills Score
  const totalSkillsCount = Math.max(1, targetSkills.length);
  const skillsScore = Math.min(100, Math.round((matchedSkills.length / totalSkillsCount) * 100));

  // 3. Experience Match Heuristics
  let experienceScore = 75; // baseline for fresher / standard
  const expLower = (input.experienceRequired || 'fresher').toLowerCase();
  
  const isFresherJob = expLower.includes('fresher') || expLower.includes('0-') || expLower.includes('intern');
  const resumeMentionsFresher = resumeTextLower.includes('fresher') || resumeTextLower.includes('student') || resumeTextLower.includes('intern');
  const resumeMentionsExp = /\b\d+\+?\s*(years?|yrs?)\b/i.test(input.resumeText);

  if (isFresherJob) {
    if (resumeMentionsFresher || resumeTextLower.includes('project') || resumeTextLower.includes('academic')) {
      experienceScore = 90;
    } else {
      experienceScore = 80;
    }
  } else if (resumeMentionsExp) {
    experienceScore = 85;
  } else {
    experienceScore = 65;
  }

  // 4. Education Match Heuristics
  let educationScore = 70;
  const educationKeywords = [
    'b.tech', 'btech', 'b.e', 'm.tech', 'mtech', 'bca', 'mca', 'b.sc', 'bsc', 'm.sc',
    'bachelor', 'master', 'degree', 'computer science', 'information technology',
    'electronics', 'engineering', 'university', 'institute', 'college', 'cgpa', 'gpa'
  ];

  const matchedEducationTerms = educationKeywords.filter((term) =>
    resumeTextLower.includes(term)
  );

  if (matchedEducationTerms.length >= 3) {
    educationScore = 95;
  } else if (matchedEducationTerms.length >= 1) {
    educationScore = 85;
  } else {
    educationScore = 60;
  }

  // 5. Keyword Density & Relevance Match
  const jobTokens = jobDescLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));

  const uniqueJobKeywords = Array.from(new Set(jobTokens));
  let matchedKeywordCount = 0;

  uniqueJobKeywords.forEach((kw) => {
    if (resumeTextLower.includes(kw)) {
      matchedKeywordCount++;
    }
  });

  const keywordRatio = uniqueJobKeywords.length > 0 ? (matchedKeywordCount / uniqueJobKeywords.length) : 0.7;
  const keywordScore = Math.min(100, Math.max(50, Math.round(keywordRatio * 100)));

  // 6. Overall Match Percentage (Weighted: Skills 45%, Exp 25%, Edu 15%, Keywords 15%)
  const rawOverall = (skillsScore * 0.45) + (experienceScore * 0.25) + (educationScore * 0.15) + (keywordScore * 0.15);
  const matchPercentage = Math.min(99, Math.max(30, Math.round(rawOverall)));

  // 7. Dynamic Recommendations
  const recommendations: string[] = [];

  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 3).join(', ');
    recommendations.push(
      `Incorporate key competencies into your resume: highlight projects or coursework involving ${topMissing}.`
    );
  }

  if (keywordScore < 70) {
    recommendations.push(
      `Align your resume terminology with this job post by mentioning specific tools and methodologies specified in the description.`
    );
  }

  recommendations.push(
    `Use quantifiable metrics (e.g., 'improved performance by 25%', 'handled 500+ requests') to demonstrate concrete results.`
  );

  recommendations.push(
    `Verify that your resume uses clean headings (Skills, Projects, Education) for optimal parsing by applicant tracking systems.`
  );

  // 8. Strengths
  const strengths: string[] = [];
  if (matchedSkills.length > 0) {
    strengths.push(`Strong overlap with core required skills: ${matchedSkills.slice(0, 4).join(', ')}.`);
  }
  if (educationScore >= 80) {
    strengths.push('Educational background meets or aligns with the degree prerequisites.');
  }
  if (experienceScore >= 80) {
    strengths.push('Experience level is suitable for this career opening.');
  }

  const summary = `Resume shows a ${matchPercentage}% alignment with ${input.company}'s requirements for ${input.jobTitle}. ${
    matchedSkills.length > 0 ? `Matches ${matchedSkills.length} key required skills.` : ''
  } ${missingSkills.length > 0 ? `${missingSkills.length} desirable skills could be added.` : ''}`;

  return {
    job_id: input.jobId,
    job_title: input.jobTitle,
    company: input.company,
    candidate_name: input.candidateName,
    candidate_email: input.candidateEmail,
    candidate_phone: input.candidatePhone,
    resume_file_name: input.resumeFileName,
    match_percentage: matchPercentage,
    skills_score: skillsScore,
    experience_score: experienceScore,
    education_score: educationScore,
    keyword_score: keywordScore,
    matched_skills: matchedSkills,
    missing_skills: missingSkills,
    recommendations,
    strengths,
    summary,
    analysis_source: 'fallback_keywords',
    created_at: new Date().toISOString(),
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
