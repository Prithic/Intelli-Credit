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
        Extract company profile information and financial figures from the provided document. If a figure is not found, estimate it based on context or return 0. If text info is not found, return "Unknown".
        
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
        - companyInfo: name, establishedYear, industry, registrationNumber, employees
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
          required: ["companyInfo", "structuredData", "verificationLayer", "riskAnalysisDetails", "missingData", "requiredDocs"],
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
      const companyInfo = parsedData.companyInfo;
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
        companyInfo,
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
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2">
                  System Risk Score
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

              {/* Confidence Panel */}
              <div className="border border-zinc-800 bg-[#0a0a0a] p-3 flex flex-col justify-between">
                <div className="text-xs uppercase text-zinc-500 border-b border-zinc-800 pb-1 mb-2">
                  Decision Confidence
                </div>
                <div className="flex items-end justify-between">
                  <div className={`text-5xl font-light ${
                    analysis.decisionConfidence >= 80 ? 'text-emerald-500' :
                    analysis.decisionConfidence >= 50 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {analysis.decisionConfidence}%
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-xs uppercase">Verification</div>
                    <div className="text-zinc-500 text-xs">DATA INTEGRITY</div>
                  </div>
                </div>
              </div>
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
