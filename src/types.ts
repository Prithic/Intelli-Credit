export interface FinancialData {
  revenue: number;
  debt: number;
  cashflow: number;
  profit: number;
  assets: number;
  liabilities: number;
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

export interface CreditAnalysis {
  structuredData: FinancialData;
  verificationLayer: VerificationDataPoint[];
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
  missingData: string[];
  requiredDocs: string[];
}
