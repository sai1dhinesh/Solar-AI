import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SolarAnalysisResult {
  estimatedOutputKW: number;
  monthlySavings: number;
  paybackPeriodYears: number;
  roiPercentage: number;
  decision: {
    verdict: 'YES' | 'NO' | 'MAYBE';
    explanation: string;
  };
  environmentalImpact: {
    co2SavedKg: number;
    treesEquivalent: number;
  };
  policyImpact: {
    gridStabilityScore: number; // 0 to 100
    subsidyEligibility: string;
    communityBenefit: string;
  };
  scenarios: {
    budget: { cost: number; efficiency: number; payback: number };
    premium: { cost: number; efficiency: number; payback: number };
  };
  recommendations: string[];
}

export async function analyzeSolarPotential(params: {
  area: number;
  sunlightHours: number;
  tariff: number;
  location: string;
  efficiency?: number;
  degradationRate?: number;
  systemCost?: number;
  tilt?: number;
  orientation?: string;
  shadingFactor?: number;
}): Promise<SolarAnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an AI-powered geospatial decision platform for decentralized solar infrastructure.
      Analyze solar energy potential for a location with:
      - Rooftop/Ground Area: ${params.area} sq meters
      - Average Sunlight Hours: ${params.sunlightHours} hours/day
      - Local Electricity Tariff: $${params.tariff}/kWh
      - Location: ${params.location}
      - Roof Tilt: ${params.tilt || 20} degrees
      - Orientation: ${params.orientation || 'South'}
      - Shading Factor: ${params.shadingFactor || 0.1} (0 to 1)
      ${params.efficiency ? `- Panel Efficiency: ${params.efficiency}%` : ""}
      ${params.degradationRate ? `- Annual Degradation Rate: ${params.degradationRate}%` : ""}
      ${params.systemCost ? `- Estimated System Cost: $${params.systemCost}` : ""}
      
      Provide a detailed technical and financial decision report for government execution. Include a clear YES/NO verdict for installation.
      Consider Indian MNRE (Ministry of New and Renewable Energy) subsidy patterns if applicable.
      Also include a grid stability score (0-100) and community impact assessment.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          estimatedOutputKW: { type: Type.NUMBER },
          monthlySavings: { type: Type.NUMBER },
          paybackPeriodYears: { type: Type.NUMBER },
          roiPercentage: { type: Type.NUMBER },
          decision: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING, enum: ["YES", "NO", "MAYBE"] },
              explanation: { type: Type.STRING },
            },
            required: ["verdict", "explanation"],
          },
          environmentalImpact: {
            type: Type.OBJECT,
            properties: {
              co2SavedKg: { type: Type.NUMBER },
              treesEquivalent: { type: Type.NUMBER },
            },
            required: ["co2SavedKg", "treesEquivalent"],
          },
          policyImpact: {
            type: Type.OBJECT,
            properties: {
              gridStabilityScore: { type: Type.NUMBER },
              subsidyEligibility: { type: Type.STRING },
              communityBenefit: { type: Type.STRING },
            },
            required: ["gridStabilityScore", "subsidyEligibility", "communityBenefit"],
          },
          scenarios: {
            type: Type.OBJECT,
            properties: {
              budget: {
                type: Type.OBJECT,
                properties: { cost: { type: Type.NUMBER }, efficiency: { type: Type.NUMBER }, payback: { type: Type.NUMBER } },
                required: ["cost", "efficiency", "payback"],
              },
              premium: {
                type: Type.OBJECT,
                properties: { cost: { type: Type.NUMBER }, efficiency: { type: Type.NUMBER }, payback: { type: Type.NUMBER } },
                required: ["cost", "efficiency", "payback"],
              },
            },
            required: ["budget", "premium"],
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["estimatedOutputKW", "monthlySavings", "paybackPeriodYears", "roiPercentage", "decision", "environmentalImpact", "policyImpact", "scenarios", "recommendations"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
