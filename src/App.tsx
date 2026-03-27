import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  Upload, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Loader2,
  Info,
  Search,
  FileWarning,
  Building2,
  Scale,
  Landmark,
  BadgeAlert,
  Globe,
  FileSearch,
  Briefcase,
  Download,
  FileDown,
  History,
  Fingerprint,
  Gavel,
  ShieldQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { CreditAnalysis } from './types';
import { GoogleGenAI, Type } from '@google/genai';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';

const searchCasesDeclaration = {
  name: "search_cases",
  description: "Search for legal cases and disputes involving a specific company or individual on the eCourts India portal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The name of the company or individual to search for.",
      },
    },
    required: ["query"],
  },
};

const getMcaInfoDeclaration = {
  name: "get_mca_info",
  description: "Retrieve information from the Ministry of Corporate Affairs (MCA) about a company.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      companyName: {
        type: Type.STRING,
        description: "The name of the company to search for.",
      },
    },
    required: ["companyName"],
  },
};

const callMcpTool = async (toolName: string, args: any) => {
  const apiKey = import.meta.env.VITE_ECOURTS_API_KEY;
  if (!apiKey) {
    console.warn("VITE_ECOURTS_API_KEY is not set.");
    return { error: "eCourts API key not configured" };
  }
  
  try {
    // Simulate the MCP server response since the actual eCourts MCP server 
    // is not publicly accessible from the browser (CORS/fictional endpoint).
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (toolName === "search_cases") {
      return {
        cases: [
          {
            caseNumber: "COM/2023/001",
            court: "High Court",
            status: "Pending",
            summary: `Commercial dispute involving ${args.query || 'the entity'}.`
          }
        ]
      };
    }
    
    return { error: "Unknown tool" };
  } catch (error) {
    console.error("Error calling MCP tool:", error);
    return { error: "eCourts API key not configured or endpoint unreachable" };
  }
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CreditAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const downloadPDF = async () => {
    const element = document.getElementById('cam-report');
    if (!element) return;
    
    try {
      setIsExporting(true);
      const imgData = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#0a0a0a',
        pixelRatio: 2
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('credit-appraisal-memo.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt']
    },
    multiple: false,
  } as any);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      const extractionPrompt = `
        Objective:
        You are a Senior Credit Officer at a leading Indian Bank. Your task is to perform a production-grade Corporate Credit Appraisal, replicating a professional bank workflow.
        
        1. Data Ingestion & Extraction:
        Extract and synthesize data from the provided document into four distinct pillars:
        - Structured Data: Financial figures (revenue, debt, cashflow, profit, assets, liabilities).
        - Unstructured Insights: Insights from Annual Reports, Board minutes, Rating reports, Shareholding patterns.
        - External Intelligence: Use 'get_mca_info' for MCA status. Use Google Search for News, and Sector trends. Use 'search_cases' for Legal disputes.
        - Primary Insights: Site visit observations, Management interviews.
        
        2. Mandatory Verification & Trust Engine:
        Independently validate every data point. Assign a status (Verified/Unverified/Mismatch) and confidence score.
        - Identity (PAN/Aadhaar): Match extracted names with official records (simulate).
        - Business (GST/MCA): Verify registration and filing status using 'get_mca_info'.
        - Legal (eCourts): Use \`search_cases\` for contextual matching.
        - Financial Consistency: Cross-check GST vs Bank vs Declared Revenue. Detect inflation or circular trading.
        - Banking Integrity: Detect tampering or anomalies in statements.
        - Credit History (CIBIL): Validate past repayment behavior (simulate).
        - Collateral: Validate ownership and encumbrances (simulate).
        
        3. Multi-Dimensional Risk Analysis (The Five Cs of Credit):
        Analyze the borrower across five dimensions:
        - Character: Integrity, reputation, promoter background, past ventures.
        - Capacity: Ability to repay, cashflow stability, debt service coverage.
        - Capital: Promoter's skin in the game, net worth, leverage.
        - Collateral: Quality, value, and enforceability of security.
        - Conditions: Industry trends, regulatory environment, economic factors.
        For each C, provide a score (0-100), key insights, red flags, and positive signals.
        
        4. Decision Engine:
        Output a final recommendation (Approve/Review/Reject), suggested loan amount, interest rate, and risk grade (e.g., AAA, BBB+, C). Provide detailed reasoning and confidence level.
        
        5. Credit Appraisal Memo (CAM) Generation:
        Generate a professional, bank-standard CAM report in a formal tone. The CAM report MUST be formatted as a clean, structured Markdown string that can be directly converted into a Word/PDF document.
        Use headings, bullet points, and sections clearly.
        Include the following structure based on the Five Cs of Credit:
        - 1. Executive Summary: Brief overview, loan purpose, final recommendation, key reasons.
        - 2. Company Profile: Name, Industry, Incorporation Year, Business model, Operational status.
        - 3. Character (Credibility & Intent): Promoter credibility, credit history, legal standing, behavioral risks.
        - 4. Capacity (Repayment Ability): Revenue/profit trends, cash flow, debt servicing, key ratios.
        - 5. Capital (Financial Strength): Net worth, assets vs liabilities, debt-to-equity.
        - 6. Collateral (Security): Available collateral, coverage adequacy. If not available, state "Unsecured Exposure".
        - 7. Conditions (External & Industry Factors): Industry outlook, market risks, economic conditions.
        - 8. Risk Analysis Summary: List key risks with evidence, contradictions, categorize risks (Critical/Moderate/Minor).
        - 9. Verification Summary: Present a table-like structured summary (Check performed, Source, Status, Key findings).
        - 10. Final Recommendation: Decision (APPROVE/REVIEW/REJECT), justification based on risk score, verification integrity, financial strength.
        
        Style Guidelines:
        - Use formal banking language.
        - Be precise and evidence-based.
        - Do NOT use casual tone.
        - Do NOT hallucinate missing data. If missing, state "Not available in provided documents".
        - Every major claim must be backed by data or verification.
        - Highlight any inconsistencies clearly.
        - Prioritize risk clarity over description.
        - Think like a banker approving a multi-crore loan.
        
        Return a JSON object matching the provided schema.
      `;

      const config = {
        tools: [
          { googleSearch: {} },
          { functionDeclarations: [searchCasesDeclaration, getMcaInfoDeclaration] }
        ],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                establishedYear: { type: Type.STRING },
                industry: { type: Type.STRING },
                registrationNumber: { type: Type.STRING },
                employees: { type: Type.STRING },
              },
              required: ["name", "establishedYear", "industry", "registrationNumber", "employees"],
            },
            structuredData: {
              type: Type.OBJECT,
              properties: {
                revenue: { type: Type.NUMBER },
                debt: { type: Type.NUMBER },
                cashflow: { type: Type.NUMBER },
                profit: { type: Type.NUMBER },
                assets: { type: Type.NUMBER },
                liabilities: { type: Type.NUMBER },
              },
              required: ["revenue", "debt", "cashflow", "profit", "assets", "liabilities"],
            },
            unstructuredInsights: {
              type: Type.OBJECT,
              properties: {
                boardMeetingNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                ratingAgencyReports: { type: Type.STRING },
                shareholdingPattern: { type: Type.STRING },
              },
              required: ["boardMeetingNotes", "ratingAgencyReports", "shareholdingPattern"],
            },
            externalIntelligence: {
              type: Type.OBJECT,
              properties: {
                mcaStatus: { type: Type.STRING },
                legalDisputes: { type: Type.ARRAY, items: { type: Type.STRING } },
                newsSectorTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["mcaStatus", "legalDisputes", "newsSectorTrends"],
            },
            primaryInsights: {
              type: Type.OBJECT,
              properties: {
                siteVisitObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
                managementInterviews: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["siteVisitObservations", "managementInterviews"],
            },
            verificationLayer: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  dataPoint: { type: Type.STRING },
                  status: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER },
                  source: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ["category", "dataPoint", "status", "confidenceScore", "source", "notes"],
              }
            },
            riskAnalysisDetails: {
              type: Type.OBJECT,
              properties: {
                financialRisk: { type: Type.STRING },
                legalRisk: { type: Type.STRING },
                behavioralRisk: { type: Type.STRING },
                industryRisk: { type: Type.STRING },
                managementRisk: { type: Type.STRING },
              },
              required: ["financialRisk", "legalRisk", "behavioralRisk", "industryRisk", "managementRisk"],
            },
            fiveCs: {
              type: Type.OBJECT,
              properties: {
                character: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["score", "insights", "redFlags", "positiveSignals"],
                },
                capacity: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["score", "insights", "redFlags", "positiveSignals"],
                },
                capital: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["score", "insights", "redFlags", "positiveSignals"],
                },
                collateral: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["score", "insights", "redFlags", "positiveSignals"],
                },
                conditions: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER },
                    insights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["score", "insights", "redFlags", "positiveSignals"],
                },
              },
              required: ["character", "capacity", "capital", "collateral", "conditions"],
            },
            camReport: {
              type: Type.OBJECT,
              properties: {
                executiveSummary: { type: Type.STRING },
                borrowerProfile: { type: Type.STRING },
                promoterAnalysis: { type: Type.STRING },
                financialEvaluation: { type: Type.STRING },
                bankingBehavior: { type: Type.STRING },
                legalComplianceFindings: { type: Type.STRING },
                industryAnalysis: { type: Type.STRING },
                collateralAssessment: { type: Type.STRING },
                verificationSummary: { type: Type.STRING },
                keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                finalRecommendation: { type: Type.STRING },
              },
              required: [
                "executiveSummary", "borrowerProfile", "promoterAnalysis", "financialEvaluation",
                "bankingBehavior", "legalComplianceFindings", "industryAnalysis", "collateralAssessment",
                "verificationSummary", "keyRisks", "finalRecommendation"
              ],
            },
            explanation: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            decisionConfidence: { type: Type.NUMBER },
            suggestedLoanAmount: { type: Type.STRING },
            suggestedInterestRate: { type: Type.STRING },
            riskGrade: { type: Type.STRING },
            missingData: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            requiredDocs: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: [
            "companyInfo", "structuredData", "unstructuredInsights", "externalIntelligence",
            "primaryInsights", "verificationLayer", "riskAnalysisDetails", "fiveCs", "camReport",
            "explanation", "recommendation", "decisionConfidence", "suggestedLoanAmount",
            "suggestedInterestRate", "riskGrade", "missingData", "requiredDocs"
          ],
        },
      };

      let currentContents: any[] = [];

      if (file.type === "application/pdf") {
        const base64Data = await fileToBase64(file);
        currentContents.push({
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf",
              },
            },
            {
              text: extractionPrompt,
            },
          ],
        });
      } else {
        const text = await fileToText(file);
        currentContents.push({
          role: "user",
          parts: [
            {
              text: `${extractionPrompt}\n\nDocument Text:\n${text.substring(0, 10000)}`,
            },
          ],
        });
      }

      let extractionResponse = await genAI.models.generateContent({
        model,
        contents: currentContents,
        config,
      });

      let iterations = 0;
      while (extractionResponse.functionCalls && extractionResponse.functionCalls.length > 0 && iterations < 3) {
        const call = extractionResponse.functionCalls[0];
        
        let toolResult;
        if (call.name === "search_cases") {
          toolResult = await callMcpTool(call.name, call.args);
        } else if (call.name === "get_mca_info") {
          try {
            const res = await fetch("/resource/4dbe5667-7b6b-41d7-82af-211562424d9a", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyName: call.args.companyName })
            });
            if (res.ok) {
              toolResult = await res.json();
            } else {
              const getRes = await fetch(`/resource/4dbe5667-7b6b-41d7-82af-211562424d9a?companyName=${encodeURIComponent(call.args.companyName as string)}`);
              if (getRes.ok) {
                toolResult = await getRes.json();
              } else {
                toolResult = { error: `Failed to fetch MCA info: ${getRes.status}` };
              }
            }
          } catch (e) {
            toolResult = { error: "Failed to fetch MCA info" };
          }
        } else {
          toolResult = { error: "Unknown tool" };
        }
        
        currentContents.push(extractionResponse.candidates![0].content);
        currentContents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: call.name,
              response: { result: toolResult }
            }
          }]
        });
        
        extractionResponse = await genAI.models.generateContent({
          model,
          contents: currentContents,
          config,
        });
        
        iterations++;
      }

      if (!extractionResponse.text) {
        throw new Error("Failed to extract data from document");
      }

      const parsedData = JSON.parse(extractionResponse.text);
      
      // Feature Calculations
      const debtToIncome = parsedData.structuredData.revenue > 0 ? parsedData.structuredData.debt / parsedData.structuredData.revenue : 1;
      const profitMargin = parsedData.structuredData.revenue > 0 ? parsedData.structuredData.profit / parsedData.structuredData.revenue : 0;
      const currentRatio = parsedData.structuredData.liabilities > 0 ? parsedData.structuredData.assets / parsedData.structuredData.liabilities : 1;

      // Risk Scoring (Rule-based + Verification Penalty)
      let riskScore = 50; // Base score
      if (debtToIncome > 0.5) riskScore += 15;
      if (debtToIncome > 0.8) riskScore += 15;
      if (profitMargin < 0.1) riskScore += 10;
      if (currentRatio < 1.2) riskScore += 10;
      if (parsedData.structuredData.cashflow < 0) riskScore += 15;
      
      // Penalize for unverified or mismatched data
      const unverifiedCount = parsedData.verificationLayer.filter((v: any) => v.status === 'Unverified').length;
      const mismatchCount = parsedData.verificationLayer.filter((v: any) => v.status === 'Mismatch').length;
      riskScore += (unverifiedCount * 5);
      riskScore += (mismatchCount * 15);
      
      riskScore = Math.min(Math.max(riskScore, 0), 100);

      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = "Low";
      if (riskScore > 30) riskLevel = "Medium";
      if (riskScore > 60) riskLevel = "High";
      if (riskScore > 85) riskLevel = "Critical";

      // Fraud Detection (Simple Anomaly Rules)
      const fraudFlags = [];
      if (parsedData.structuredData.revenue > 0 && parsedData.structuredData.profit > parsedData.structuredData.revenue) {
        fraudFlags.push("Profit exceeds revenue (Impossible state)");
      }
      if (parsedData.structuredData.debt > parsedData.structuredData.assets * 2) {
        fraudFlags.push("Extreme leverage detected");
      }
      if (parsedData.structuredData.cashflow === 0 && parsedData.structuredData.revenue > 1000000) {
        fraudFlags.push("Suspiciously zero cashflow for high revenue");
      }
      if (mismatchCount > 0) {
        fraudFlags.push(`${mismatchCount} data mismatch(es) detected during verification`);
      }

      setAnalysis({
        ...parsedData,
        ratios: {
          debtToIncome,
          profitMargin,
          currentRatio
        },
        riskScore,
        riskLevel,
        fraudFlags
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'Medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'High': return 'text-orange-500 bg-orange-50 border-orange-100';
      case 'Critical': return 'text-rose-500 bg-rose-50 border-rose-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const chartData = analysis ? [
    { name: 'Revenue', value: analysis.structuredData.revenue },
    { name: 'Debt', value: analysis.structuredData.debt },
    { name: 'Profit', value: analysis.structuredData.profit },
    { name: 'Cashflow', value: analysis.structuredData.cashflow },
  ] : [];

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-mono text-xs sm:text-sm selection:bg-amber-500/30">
      {/* Header */}
      <header className="bg-[#050505] border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black px-2 py-0.5 font-bold tracking-widest uppercase text-xs">
            INTELLI-CREDIT
          </div>
          <span className="text-zinc-500 uppercase tracking-widest text-xs">Terminal v2.4.1</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 uppercase">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> SECURE</span>
          <span>{new Date().toISOString().split('T')[0]}</span>
        </div>
      </header>

      <main className="p-2 sm:p-4 max-w-[1600px] mx-auto">
        {!analysis ? (
          <div className="border border-zinc-800 bg-[#0a0a0a] p-8 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-amber-500 mb-4 animate-pulse">
              <Upload className="w-12 h-12" />
            </div>
            <h2 className="text-xl text-zinc-100 uppercase tracking-widest mb-2">Initialize Data Ingestion</h2>
            <p className="text-zinc-500 mb-8 text-center max-w-md">
              Upload financial documents (PDF, Image) for automated extraction, verification, and risk analysis.
            </p>
            
            <div
              {...getRootProps()}
              className={`w-full max-w-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-amber-500 bg-amber-500/5' : 'border-zinc-800 hover:border-zinc-600 bg-black'
              }`}
            >
              <input {...getInputProps()} />
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-amber-500 uppercase tracking-widest animate-pulse">Processing & Verifying Data...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-zinc-600 mb-2" />
                  <p className="text-zinc-400 uppercase tracking-wider">Drag & drop files here, or click to select</p>
                  <p className="text-zinc-600 text-xs mt-2">Supported: PDF, JPEG, PNG</p>
                </div>
              )}
            </div>
            
            {file && !loading && (
              <button
                onClick={handleAnalyze}
                className="mt-6 border border-amber-500 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black px-8 py-3 uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                Execute Analysis
              </button>
            )}

            {error && (
              <div className="mt-6 border border-rose-900 bg-rose-950/30 text-rose-500 px-4 py-3 flex items-center gap-2 w-full max-w-2xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            
            {/* Top Row: Company Profile & Core Stats */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-4 gap-2">
              {/* Company Info Panel */}
              <div className="lg:col-span-2 border border-zinc-800 bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex justify-between">
                  <span>Company Profile</span>
                  <span className="text-cyan-400">ID: {analysis.companyInfo.registrationNumber}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl text-zinc-100 uppercase tracking-wider mb-1 truncate">
                  {analysis.companyInfo.name}
                </h1>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
                  <div className="flex justify-between border-b border-zinc-800/50 py-1">
                    <span className="text-zinc-500">ESTABLISHED</span>
                    <span className="text-amber-500">{analysis.companyInfo.establishedYear}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/50 py-1">
                    <span className="text-zinc-500">INDUSTRY</span>
                    <span className="text-amber-500 truncate ml-2 text-right">{analysis.companyInfo.industry}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/50 py-1">
                    <span className="text-zinc-500">EMPLOYEES</span>
                    <span className="text-amber-500">{analysis.companyInfo.employees}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/50 py-1">
                    <span className="text-zinc-500">STATUS</span>
                    <span className="text-emerald-500">ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Risk Score Panel */}
               <div className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col justify-between">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex justify-between">
                  <span>Risk Grade</span>
                  <span className="text-amber-500">{analysis.riskGrade}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div className={`text-5xl font-light ${
                    analysis.riskScore >= 70 ? 'text-emerald-500' :
                    analysis.riskScore >= 40 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {analysis.riskScore}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg uppercase tracking-widest ${
                      analysis.riskLevel === 'Low' ? 'text-emerald-500' :
                      analysis.riskLevel === 'Medium' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {analysis.riskLevel} RISK
                    </div>
                    <div className="text-zinc-500 text-xs">OUT OF 100</div>
                  </div>
                </div>
              </div>

              {/* Decision Panel */}
              <div className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col justify-between">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2">
                  Loan Recommendation
                </div>
                <div className="flex items-end justify-between">
                  <div className={`text-3xl font-light ${
                    analysis.recommendation.includes('Approve') ? 'text-emerald-500' :
                    analysis.recommendation.includes('Reject') ? 'text-rose-500' : 'text-amber-500'
                  }`}>
                    {analysis.suggestedLoanAmount}
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-xs uppercase">Rate: {analysis.suggestedInterestRate}</div>
                    <div className="text-zinc-500 text-xs uppercase tracking-tighter">Confidence: {analysis.decisionConfidence}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Cs Analysis Row */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-5 gap-2">
              {[
                { label: 'Character', data: analysis.fiveCs.character, icon: Fingerprint, color: 'text-blue-400' },
                { label: 'Capacity', data: analysis.fiveCs.capacity, icon: Activity, color: 'text-emerald-400' },
                { label: 'Capital', data: analysis.fiveCs.capital, icon: Landmark, color: 'text-amber-400' },
                { label: 'Collateral', data: analysis.fiveCs.collateral, icon: ShieldCheck, color: 'text-purple-400' },
                { label: 'Conditions', data: analysis.fiveCs.conditions, icon: Globe, color: 'text-cyan-400' },
              ].map((c, i) => (
                <div key={i} className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col">
                  <div className="text-[10px] uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <c.icon className={`w-3 h-3 ${c.color}`} />
                      <span>{c.label}</span>
                    </div>
                    <span className={c.color}>{c.data.score}%</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-40">
                    <div className="text-[10px] text-zinc-400 leading-tight mb-2 italic">
                      {c.data.insights[0]}
                    </div>
                    {c.data.positiveSignals.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[9px] text-emerald-500 uppercase mb-0.5">Signals</div>
                        <ul className="text-[9px] text-zinc-500 space-y-0.5">
                          {c.data.positiveSignals.slice(0, 2).map((s, j) => <li key={j} className="flex gap-1"><span>+</span>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {c.data.redFlags.length > 0 && (
                      <div>
                        <div className="text-[9px] text-rose-500 uppercase mb-0.5">Flags</div>
                        <ul className="text-[9px] text-zinc-500 space-y-0.5">
                          {c.data.redFlags.slice(0, 2).map((f, j) => <li key={j} className="flex gap-1"><span>!</span>{f}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Middle Row: Financials & Verification */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-2">
              
              {/* Financial Data */}
              <div className="lg:col-span-1 border border-zinc-800 bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex justify-between">
                  <span>Financial Metrics</span>
                  <span className="text-zinc-600">INR (₹)</span>
                </div>
                <div className="space-y-1">
                  {[
                    { label: 'Revenue', value: analysis.structuredData.revenue, color: 'text-emerald-400' },
                    { label: 'Profit', value: analysis.structuredData.profit, color: 'text-emerald-400' },
                    { label: 'Cashflow', value: analysis.structuredData.cashflow, color: 'text-cyan-400' },
                    { label: 'Assets', value: analysis.structuredData.assets, color: 'text-zinc-300' },
                    { label: 'Liabilities', value: analysis.structuredData.liabilities, color: 'text-amber-500' },
                    { label: 'Debt', value: analysis.structuredData.debt, color: 'text-rose-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-zinc-800/50 py-1.5 hover:bg-zinc-900/50">
                      <span className="text-zinc-400 uppercase text-xs">{item.label}</span>
                      <span className={`text-sm ${item.color}`}>
                        ₹{item.value.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mt-4 mb-2">
                  Key Ratios
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black border border-zinc-800 p-2">
                    <div className="text-zinc-500 text-[10px] uppercase mb-1">DTI</div>
                    <div className={`text-sm ${analysis.ratios.debtToIncome > 0.5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {(analysis.ratios.debtToIncome * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-black border border-zinc-800 p-2">
                    <div className="text-zinc-500 text-[10px] uppercase mb-1">Margin</div>
                    <div className={`text-sm ${analysis.ratios.profitMargin < 0.1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {(analysis.ratios.profitMargin * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-black border border-zinc-800 p-2">
                    <div className="text-zinc-500 text-[10px] uppercase mb-1">Current</div>
                    <div className={`text-sm ${analysis.ratios.currentRatio < 1 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {analysis.ratios.currentRatio.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Engine Table */}
              <div className="lg:col-span-2 border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex items-center gap-2">
                  <Search className="w-3 h-3 text-cyan-500" />
                  <span>Trust Engine Verification Log</span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="pb-2 font-normal uppercase">Category</th>
                        <th className="pb-2 font-normal uppercase">Data Point</th>
                        <th className="pb-2 font-normal uppercase">Source</th>
                        <th className="pb-2 font-normal uppercase">Status</th>
                        <th className="pb-2 font-normal uppercase text-right">Conf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {analysis.verificationLayer.map((item, index) => (
                        <tr key={index} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-2 text-zinc-400">{item.category}</td>
                          <td className="py-2 text-zinc-300">{item.dataPoint}</td>
                          <td className="py-2 text-zinc-500">{item.source}</td>
                          <td className="py-2">
                            <span className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                              item.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              item.status === 'Mismatch' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className={`py-2 text-right ${
                            item.confidenceScore >= 80 ? 'text-emerald-500' :
                            item.confidenceScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            {item.confidenceScore}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Intelligence Row: External, Unstructured, Primary */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-2">
              
              {/* External Intelligence */}
              <div className="lg:col-span-1 border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col max-h-80">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex items-center gap-2 shrink-0">
                  <Globe className="w-3 h-3 text-cyan-500" />
                  <span>External Intelligence (Live Web)</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">MCA Status</div>
                    <div className="text-xs text-zinc-300">{analysis.externalIntelligence.mcaStatus}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Legal Disputes (e-Courts)</div>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                      {analysis.externalIntelligence.legalDisputes.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">News & Sector Trends</div>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                      {analysis.externalIntelligence.newsSectorTrends.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Unstructured Insights */}
              <div className="lg:col-span-1 border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col max-h-80">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex items-center gap-2 shrink-0">
                  <FileSearch className="w-3 h-3 text-amber-500" />
                  <span>Unstructured Insights</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Rating Agency Reports</div>
                    <div className="text-xs text-zinc-300">{analysis.unstructuredInsights.ratingAgencyReports}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Shareholding Pattern</div>
                    <div className="text-xs text-zinc-300">{analysis.unstructuredInsights.shareholdingPattern}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Board Meeting Notes</div>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                      {analysis.unstructuredInsights.boardMeetingNotes.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Primary Insights */}
              <div className="lg:col-span-1 border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col max-h-80">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex items-center gap-2 shrink-0">
                  <Briefcase className="w-3 h-3 text-emerald-500" />
                  <span>Primary Insights (Due Diligence)</span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Site Visit Observations</div>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                      {analysis.primaryInsights.siteVisitObservations.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase mb-1">Management Interviews</div>
                    <ul className="list-disc list-inside text-xs text-zinc-300 space-y-0.5">
                      {analysis.primaryInsights.managementInterviews.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Risk Dimensions & Actions */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-2">
              
              {/* Risk Dimensions */}
              <div className="lg:col-span-2 border border-zinc-800 bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-3">
                  Risk Dimensions Analysis
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Financial Risk', value: analysis.riskAnalysisDetails.financialRisk, icon: TrendingDown },
                    { label: 'Legal Risk', value: analysis.riskAnalysisDetails.legalRisk, icon: Scale },
                    { label: 'Behavioral Risk', value: analysis.riskAnalysisDetails.behavioralRisk, icon: Activity },
                    { label: 'Industry Risk', value: analysis.riskAnalysisDetails.industryRisk, icon: Building2 },
                    { label: 'Management Risk', value: analysis.riskAnalysisDetails.managementRisk, icon: Users },
                  ].map((dim, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="mt-0.5 p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400">
                        <dim.icon className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500 uppercase mb-0.5">{dim.label}</div>
                        <div className="text-xs text-zinc-300 leading-relaxed">{dim.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Required & Recommendation */}
              <div className="lg:col-span-1 flex flex-col gap-2">
                <div className="border border-zinc-800 bg-[#0a0a0a] p-3 flex-1">
                  <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2 flex items-center gap-2">
                    <FileWarning className="w-3 h-3 text-amber-500" />
                    <span>Action Required</span>
                  </div>
                  
                  {analysis.missingData.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] text-rose-400 uppercase mb-1">Missing Critical Data</div>
                      <ul className="list-disc list-inside text-xs text-zinc-400 space-y-0.5">
                        {analysis.missingData.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {analysis.requiredDocs.length > 0 && (
                    <div>
                      <div className="text-[10px] text-amber-400 uppercase mb-1">Required Documents</div>
                      <ul className="list-disc list-inside text-xs text-zinc-400 space-y-0.5">
                        {analysis.requiredDocs.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {analysis.missingData.length === 0 && analysis.requiredDocs.length === 0 && (
                    <div className="text-xs text-emerald-500 flex items-center gap-2 mt-2">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>All required data present.</span>
                    </div>
                  )}
                </div>

                <div className={`border p-3 ${
                  analysis.recommendation.includes('Approve') ? 'border-emerald-900 bg-emerald-950/20' :
                  analysis.recommendation.includes('Reject') ? 'border-rose-900 bg-rose-950/20' :
                  'border-amber-900 bg-amber-950/20'
                }`}>
                  <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800/50 pb-1 mb-2">
                    Final Recommendation
                  </div>
                  <div className={`text-lg uppercase tracking-wider mb-2 ${
                    analysis.recommendation.includes('Approve') ? 'text-emerald-500' :
                    analysis.recommendation.includes('Reject') ? 'text-rose-500' :
                    'text-amber-500'
                  }`}>
                    {analysis.recommendation}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

            </div>

            {/* Fraud Flags */}
            {analysis.fraudFlags.length > 0 && (
              <div className="lg:col-span-12 border border-rose-900 bg-rose-950/10 p-3 mt-2">
                <div className="text-xs uppercase text-rose-500 border-b border-rose-900/50 pb-1 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Critical Risk Flags Detected</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {analysis.fraudFlags.map((flag, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/30 p-2 border border-rose-900/50">
                      <span className="text-rose-500 font-bold">!</span>
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAM Report Section */}
            <div id="cam-report" className="lg:col-span-12 border border-zinc-800 bg-[#0a0a0a] p-4">
              <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-2 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold tracking-widest">Credit Appraisal Memo (CAM)</span>
                </div>
                <button 
                  onClick={downloadPDF}
                  disabled={isExporting}
                  className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 px-3 py-1 text-[10px] transition-colors disabled:opacity-50"
                >
                  <Download className="w-3 h-3" /> {isExporting ? 'EXPORTING...' : 'EXPORT PDF'}
                </button>
              </div>

              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-amber-500 prose-headings:uppercase prose-headings:tracking-widest prose-a:text-cyan-400 prose-strong:text-zinc-200">
                <Markdown>{analysis.camMarkdown}</Markdown>
              </div>
            </div>

            <div className="lg:col-span-12 flex justify-end mt-4">
              <button
                onClick={() => setAnalysis(null)}
                className="border border-zinc-700 hover:border-zinc-500 bg-black text-zinc-400 hover:text-zinc-200 px-6 py-2 text-xs uppercase tracking-widest transition-colors"
              >
                [ Reset Terminal ]
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
