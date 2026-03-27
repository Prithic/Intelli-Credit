import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  Upload, 
  TrendingUp, 
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
  BadgeAlert
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

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CreditAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        You are an AI-powered Credit Appraisal & Verification System that performs independent data verification before risk analysis, replicating real-world banking due diligence.
        
        1. Data Extraction Layer:
        Extract financial figures from the provided document. If a figure is not found, estimate it based on context or return 0.
        
        2. Data Verification & Trust Engine (SIMULATED):
        For every extracted data point, SIMULATE independent verification using external authoritative sources based on the document's realism, consistency, and formatting.
        - Identity Verification (KYC): Validate PAN, Aadhaar (simulate). Match name, DOB.
        - Business Verification: Verify GST registration & filings, MCA records (simulate).
        - Legal Verification: Query eCourts India (simulate). Perform fuzzy + contextual matching.
        - Financial Validation: Cross-check financial statements with GST data.
        - Banking Data Integrity Check: Detect tampering or anomalies in bank statements.
        - Credit Bureau Validation: Validate credit history using TransUnion CIBIL (simulate).
        - Collateral Verification: Validate ownership & encumbrances.
        
        3. Risk Analysis Layer:
        Perform multi-dimensional risk analysis (Financial, Legal, Behavioral, Industry, Management) ONLY AFTER verification.
        
        Return a JSON object matching the provided schema exactly. Include:
        - structuredData: revenue, debt, cashflow, profit, assets, liabilities
        - verificationLayer: Array of verification points (category, dataPoint, status: 'Verified' | 'Unverified' | 'Mismatch', confidenceScore: 0-100, source, notes)
        - riskAnalysisDetails: financialRisk, legalRisk, behavioralRisk, industryRisk, managementRisk
        - missingData: Array of missing critical data points
        - requiredDocs: Array of additional documents required to proceed
      `;

      const config = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
            missingData: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            requiredDocs: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["structuredData", "verificationLayer", "riskAnalysisDetails", "missingData", "requiredDocs"],
        },
      };

      let extractionResponse;

      if (file.type === "application/pdf") {
        const base64Data = await fileToBase64(file);
        extractionResponse = await genAI.models.generateContent({
          model,
          contents: {
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
          },
          config,
        });
      } else {
        const text = await fileToText(file);
        extractionResponse = await genAI.models.generateContent({
          model,
          contents: `
            ${extractionPrompt}
            
            Document Text:
            ${text.substring(0, 10000)}
          `,
          config,
        });
      }

      if (!extractionResponse.text) {
        throw new Error("Failed to extract data from document");
      }

      const parsedData = JSON.parse(extractionResponse.text);
      const structuredData = parsedData.structuredData;
      const verificationLayer = parsedData.verificationLayer;
      const riskAnalysisDetails = parsedData.riskAnalysisDetails;
      const missingData = parsedData.missingData;
      const requiredDocs = parsedData.requiredDocs;

      // Feature Calculations
      const debtToIncome = structuredData.revenue > 0 ? structuredData.debt / structuredData.revenue : 1;
      const profitMargin = structuredData.revenue > 0 ? structuredData.profit / structuredData.revenue : 0;
      const currentRatio = structuredData.liabilities > 0 ? structuredData.assets / structuredData.liabilities : 1;

      // Risk Scoring (Rule-based + Verification Penalty)
      let riskScore = 50; // Base score
      if (debtToIncome > 0.5) riskScore += 15;
      if (debtToIncome > 0.8) riskScore += 15;
      if (profitMargin < 0.1) riskScore += 10;
      if (currentRatio < 1.2) riskScore += 10;
      if (structuredData.cashflow < 0) riskScore += 15;
      
      // Penalize for unverified or mismatched data
      const unverifiedCount = verificationLayer.filter((v: any) => v.status === 'Unverified').length;
      const mismatchCount = verificationLayer.filter((v: any) => v.status === 'Mismatch').length;
      riskScore += (unverifiedCount * 5);
      riskScore += (mismatchCount * 15);
      
      riskScore = Math.min(Math.max(riskScore, 0), 100);

      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = "Low";
      if (riskScore > 30) riskLevel = "Medium";
      if (riskScore > 60) riskLevel = "High";
      if (riskScore > 85) riskLevel = "Critical";

      // Calculate overall decision confidence based on verification scores
      const avgConfidence = verificationLayer.length > 0 
        ? verificationLayer.reduce((acc: number, curr: any) => acc + curr.confidenceScore, 0) / verificationLayer.length 
        : 50;
      const decisionConfidence = Math.round(avgConfidence - (mismatchCount * 10));

      // Fraud Detection (Simple Anomaly Rules)
      const fraudFlags = [];
      if (structuredData.revenue > 0 && structuredData.profit > structuredData.revenue) {
        fraudFlags.push("Profit exceeds revenue (Impossible state)");
      }
      if (structuredData.debt > structuredData.assets * 2) {
        fraudFlags.push("Extreme leverage detected");
      }
      if (structuredData.cashflow === 0 && structuredData.revenue > 1000000) {
        fraudFlags.push("Suspiciously zero cashflow for high revenue");
      }
      if (mismatchCount > 0) {
        fraudFlags.push(`${mismatchCount} data mismatch(es) detected during verification`);
      }

      // Explanation Generation
      const explanationPrompt = `
        As a senior credit analyst, explain the credit risk for a business with the following data:
        - Revenue: ${structuredData.revenue}
        - Debt: ${structuredData.debt}
        - Profit: ${structuredData.profit}
        - Risk Score: ${riskScore}/100 (${riskLevel})
        - Decision Confidence: ${decisionConfidence}%
        - Unverified Points: ${unverifiedCount}
        - Mismatches: ${mismatchCount}
        - Fraud Flags: ${fraudFlags.join(", ") || "None"}
        
        Provide a concise, professional explanation and a final recommendation (Approve/Deny/Review).
        Format the response as a JSON object with 'explanation' and 'recommendation' keys.
      `;

      const explanationResponse = await genAI.models.generateContent({
        model,
        contents: explanationPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              recommendation: { type: Type.STRING },
            },
            required: ["explanation", "recommendation"],
          },
        },
      });

      if (!explanationResponse.text) {
        throw new Error("Failed to generate explanation");
      }

      const { explanation, recommendation } = JSON.parse(explanationResponse.text);

      setAnalysis({
        structuredData,
        verificationLayer,
        riskAnalysisDetails,
        ratios: {
          debtToIncome,
          profitMargin,
          currentRatio,
        },
        riskScore,
        riskLevel,
        fraudFlags,
        explanation,
        recommendation,
        decisionConfidence,
        missingData,
        requiredDocs
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Intelli-Credit</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase tracking-wider">v1.0 Beta</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Controls */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Document Upload
              </h2>
              
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center",
                  isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50",
                  file ? "border-indigo-200 bg-indigo-50/30" : ""
                )}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
                    <FileText className={cn("w-6 h-6", file ? "text-indigo-600" : "text-slate-400")} />
                  </div>
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900">Click or drag to upload</p>
                      <p className="text-xs text-slate-500">PDF, CSV, or JSON</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className={cn(
                  "w-full mt-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50",
                  !file || loading 
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Run Risk Analysis
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-rose-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </section>

            <section className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-2">System Status</h3>
                <p className="text-2xl font-light leading-tight">AI Engine is active and ready for processing.</p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {i === 1 ? 'OCR' : i === 2 ? 'ML' : 'NLP'}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">All modules online</span>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />
            </section>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {analysis ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Score</p>
                      <div className="flex items-end justify-between">
                        <h4 className="text-4xl font-bold text-slate-900">{analysis.riskScore}</h4>
                        <span className={cn("text-xs font-bold px-2 py-1 rounded-full border", getRiskColor(analysis.riskLevel))}>
                          {analysis.riskLevel}
                        </span>
                      </div>
                      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", 
                            analysis.riskScore < 30 ? "bg-emerald-500" : 
                            analysis.riskScore < 60 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${analysis.riskScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recommendation</p>
                      <div className="flex items-center gap-2 mt-2">
                        {analysis.recommendation.toLowerCase().includes('approve') ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : analysis.recommendation.toLowerCase().includes('deny') ? (
                          <XCircle className="w-6 h-6 text-rose-500" />
                        ) : (
                          <Info className="w-6 h-6 text-amber-500" />
                        )}
                        <h4 className="text-xl font-bold text-slate-900">{analysis.recommendation}</h4>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Decision Confidence</p>
                      <div className="flex items-end justify-between mt-2">
                        <h4 className="text-4xl font-bold text-slate-900">{analysis.decisionConfidence}%</h4>
                        <ShieldCheck className={cn("w-6 h-6", analysis.decisionConfidence > 80 ? "text-emerald-500" : analysis.decisionConfidence > 50 ? "text-amber-500" : "text-rose-500")} />
                      </div>
                      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", 
                            analysis.decisionConfidence > 80 ? "bg-emerald-500" : 
                            analysis.decisionConfidence > 50 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${analysis.decisionConfidence}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fraud Detection</p>
                      <div className="flex items-center gap-2 mt-2">
                        {analysis.fraudFlags.length > 0 ? (
                          <>
                            <ShieldAlert className="w-6 h-6 text-rose-500" />
                            <h4 className="text-xl font-bold text-slate-900">{analysis.fraudFlags.length} Flags</h4>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            <h4 className="text-xl font-bold text-slate-900">Clear</h4>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Verification & Trust Engine Layer */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Search className="w-4 h-4 text-indigo-600" />
                        Data Verification & Trust Engine
                      </h3>
                      <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wider">Independent Validation</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-white border-b border-slate-200 uppercase">
                          <tr>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Data Point</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Confidence</th>
                            <th className="px-6 py-4 font-medium">Source</th>
                            <th className="px-6 py-4 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {analysis.verificationLayer.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{item.category}</td>
                              <td className="px-6 py-4 text-slate-600">{item.dataPoint}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                  item.status === 'Verified' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  item.status === 'Mismatch' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-amber-50 text-amber-700 border-amber-200"
                                )}>
                                  {item.status === 'Verified' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {item.status === 'Mismatch' && <XCircle className="w-3.5 h-3.5" />}
                                  {item.status === 'Unverified' && <AlertTriangle className="w-3.5 h-3.5" />}
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full", item.confidenceScore > 80 ? "bg-emerald-500" : item.confidenceScore > 50 ? "bg-amber-500" : "bg-rose-500")}
                                      style={{ width: `${item.confidenceScore}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-slate-600">{item.confidenceScore}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-xs">{item.source}</td>
                              <td className="px-6 py-4 text-slate-600 text-xs max-w-xs truncate" title={item.notes}>{item.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Multi-Dimensional Risk Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Scale className="w-4 h-4 text-indigo-600" />
                        Risk Dimensions
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Financial Risk', value: analysis.riskAnalysisDetails.financialRisk, icon: Landmark },
                          { label: 'Legal Risk', value: analysis.riskAnalysisDetails.legalRisk, icon: Scale },
                          { label: 'Behavioral Risk', value: analysis.riskAnalysisDetails.behavioralRisk, icon: TrendingUp },
                          { label: 'Industry Risk', value: analysis.riskAnalysisDetails.industryRisk, icon: Building2 },
                          { label: 'Management Risk', value: analysis.riskAnalysisDetails.managementRisk, icon: ShieldCheck },
                        ].map((risk, i) => {
                          const Icon = risk.icon;
                          const isHigh = risk.value.toLowerCase().includes('high') || risk.value.toLowerCase().includes('critical');
                          const isLow = risk.value.toLowerCase().includes('low');
                          return (
                            <div key={i} className="flex items-start gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                              <div className={cn("p-2 rounded-lg", isHigh ? "bg-rose-100 text-rose-600" : isLow ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{risk.label}</h4>
                                <p className="text-sm text-slate-600 mt-1">{risk.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-600" />
                          Financial Overview
                        </h3>
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                              <Tooltip 
                                cursor={{ fill: '#F8FAFC' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#94A3B8'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Missing Data & Required Docs */}
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileWarning className="w-4 h-4 text-indigo-600" />
                          Action Required
                        </h3>
                        
                        {analysis.missingData.length > 0 || analysis.requiredDocs.length > 0 ? (
                          <div className="space-y-4">
                            {analysis.missingData.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Missing Critical Data</p>
                                <ul className="space-y-1">
                                  {analysis.missingData.map((item, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <span className="text-rose-500 mt-0.5">•</span> {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {analysis.requiredDocs.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Required Documents</p>
                                <ul className="space-y-1">
                                  {analysis.requiredDocs.map((item, i) => (
                                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                      <span className="text-amber-500 mt-0.5">•</span> {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">All critical data and documents present.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        AI Analysis Explanation
                      </h3>
                      <p className="text-slate-600 leading-relaxed text-lg italic font-serif">
                        "{analysis.explanation}"
                      </p>
                      
                      {analysis.fraudFlags.length > 0 && (
                        <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl">
                          <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Anomaly Alerts</p>
                          <ul className="space-y-2">
                            {analysis.fraudFlags.map((flag, i) => (
                              <li key={i} className="text-sm text-rose-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                      <ShieldCheck className="w-32 h-32 text-slate-900" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <BarChart3 className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No Analysis Data</h3>
                  <p className="text-slate-500 max-w-sm">Upload a financial document to generate a comprehensive credit risk report.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">© 2026 Intelli-Credit. AI-Powered Financial Intelligence.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
