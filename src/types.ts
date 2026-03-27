export interface FinancialData {
  revenue: number;
  debt: number;
  cashflow: number;
  profit: number;
  assets: number;
  liabilities: number;
}

export interface CompanyInfo {
  name: string;
  establishedYear: string | number;
  industry: string;
  registrationNumber: string;
  employees: string | number;
}

export interface UnstructuredInsights {
  boardMeetingNotes: string[];
  ratingAgencyReports: string;
  shareholdingPattern: string;
}

export interface ExternalIntelligence {
  mcaStatus: string;
  legalDisputes: string[];
  newsSectorTrends: string[];
}

export interface PrimaryInsights {
  siteVisitObservations: string[];
  managementInterviews: string[];
}

export interface VerificationDataPoint {
  category: string;
  dataPoint: string;
  status: 'Verified' | 'Unverified' | 'Mismatch';
  confidenceScore: number;
  source: string;
  notes: string;
}

export interface RiskAnalysisDetails {
  financialRisk: string;
  legalRisk: string;
  behavioralRisk: string;
  industryRisk: string;
  managementRisk: string;
}

export interface FiveCsAnalysis {
  character: {
    score: number;
    insights: string[];
    redFlags: string[];
    positiveSignals: string[];
  };
  capacity: {
    score: number;
    insights: string[];
    redFlags: string[];
    positiveSignals: string[];
  };
  capital: {
    score: number;
    insights: string[];
    redFlags: string[];
    positiveSignals: string[];
  };
  collateral: {
    score: number;
    insights: string[];
    redFlags: string[];
    positiveSignals: string[];
  };
  conditions: {
    score: number;
    insights: string[];
    redFlags: string[];
    positiveSignals: string[];
  };
}

export interface CAMReport {
  executiveSummary: string;
  borrowerProfile: string;
  promoterAnalysis: string;
  financialEvaluation: string;
  bankingBehavior: string;
  legalComplianceFindings: string;
  industryAnalysis: string;
  collateralAssessment: string;
  verificationSummary: string;
  keyRisks: string[];
  finalRecommendation: string;
}

export interface CreditAnalysis {
  companyInfo: CompanyInfo;
  structuredData: FinancialData;
  unstructuredInsights: UnstructuredInsights;
  externalIntelligence: ExternalIntelligence;
  primaryInsights: PrimaryInsights;
  verificationLayer: VerificationDataPoint[];
  fiveCs: FiveCsAnalysis;
  camMarkdown: string;
  riskAnalysisDetails: RiskAnalysisDetails;
  ratios: {
    debtToIncome: number;
    profitMargin: number;
    currentRatio: number;
  };
  riskScore: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  fraudFlags: string[];
  explanation: string;
  recommendation: string;
  decisionConfidence: number;
  suggestedLoanAmount: string;
  suggestedInterestRate: string;
  riskGrade: string;
  missingData: string[];
  requiredDocs: string[];
}
