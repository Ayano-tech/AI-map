export interface Company {
  id: string;
  name: string;
  industry: string;
  employeeCount: string;
  code: string;
  createdAt: string;
  sheetId: string | null;
  sheetUrl: string | null;
  annualRevenueRange: string;
  itInvestmentLevel: string;
  currentItTools: string[];
  hasDxPerson: string;
  aiInitiativeStatus: string;
  isDemo: boolean;
  // 他社比較用の集計サマリー（診断レポート生成時に更新）
  responseCount?: number;
  avgTestScore?: number;
  avgUsageScore?: number;
  promoterPct?: number;
  knowledgePct?: number;
  selfStylePct?: number;
  notStartedPct?: number;
  summaryUpdatedAt?: string | null;
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

export interface WorkflowMetrics {
  repetition_score: number;
  tool_fragmentation: number;
  manual_transfer_freq: number;
  communication_volume: number;
  recurring_mail_flag: number;
  knowledge_accessibility: number;
  info_sharing_gap: number;
  peak_overload: number;
  ai_anxiety_level: number;
}

export interface SurveyResponse {
  companyId: string;
  submittedAt: string;
  basic: Record<string, string>;
  surveyAnswers: Record<string, string | string[]>;
  testAnswers: Record<number, number>;
  testScore: number;
  chapterScores: Record<string, ChapterScore>;
  workflowMetrics: WorkflowMetrics;
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
