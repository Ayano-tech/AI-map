export interface Company {
  id: string;
  name: string;
  industry: string;
  employeeCount: string;
  code: string;
  createdAt: string;
  sheetId: string | null;
  sheetUrl: string | null;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "single" | "multi";
  options: string[];
  condition?: {
    dependsOn: string;
    values: string[];
  };
}

export interface SurveySection {
  id: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
}

export interface TestQuestion {
  chapter: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ChapterScore {
  score: number;
  max: number;
  rate: number;
}

export interface SurveyResponse {
  companyId: string;
  submittedAt: string;
  basic: Record<string, string>;
  surveyAnswers: Record<string, string | string[]>;
  testAnswers: Record<number, number>;
  testScore: number;
  chapterScores: Record<string, ChapterScore>;
}

export interface DiagnosticReport {
  executiveSummary: string;
  literacyMap: {
    byAge: Record<string, Record<string, number>>;
    strengths: string[];
    weaknesses: string[];
  };
  aiOpportunities: {
    quickWins: AIOpportunity[];
    humanInLoop: AIOpportunity[];
    notRecommended: AIOpportunity[];
  };
  promoterCandidates: PromoterCandidate[];
  roadmap: RoadmapPhase[];
}

export interface AIOpportunity {
  task: string;
  currentState: string;
  aiProposal: string;
  estimatedImpact: string;
  priority: "high" | "medium" | "low";
}

export interface PromoterCandidate {
  respondentIndex: number;
  score: number;
  reason: string;
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  goals: string[];
  actions: string[];
  metrics: string[];
  shinService: "研修" | "コンサルティング" | "受託開発";
}
