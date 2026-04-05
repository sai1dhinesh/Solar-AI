import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface SolarAnalysisResult {
  estimatedOutputKW: number;
  monthlySavings: number;
  roiPercentage: number;
  paybackPeriodYears: number;
  confidenceScore: number; // 0-100
  dataSources: string[];
  assumptions: string[];
  technicalAnalysis: {
    peakGenerationMonths: string[];
    efficiencyLossFactors: string[];
    systemSizeRecommendationKW: number;
  };
  financialAnalysis: {
    lifetimeSavings: number;
    incentiveBreakdown: string;
    maintenanceCostEst: number;
  };
  riskAnalysis: {
    shadingRisk: 'Low' | 'Medium' | 'High';
    weatherVariability: 'Low' | 'Medium' | 'High';
    policyRisk: 'Low' | 'Medium' | 'High';
    mitigationStrategies: string[];
  };
  environmentalImpact: {
    co2SavedKg: number;
    treesEquivalent: number;
  };
  policyImpact: {
    gridStabilityScore: number;
    subsidyEligibility: string;
    communityBenefit: string;
  };
  decision: {
    verdict: 'HIGHLY RECOMMENDED' | 'VIABLE WITH CONDITIONS' | 'NOT RECOMMENDED';
    explanation: string;
  };
  recommendations: string[];
  scenarios: {
    budget: { cost: number; efficiency: number; payback: number };
    premium: { cost: number; efficiency: number; payback: number };
  };
}

export interface RooftopDetectionResult {
  detectedRooftops: {
    id: string;
    areaSqM: number;
    suitability: 'High' | 'Medium' | 'Low';
    orientation: string;
    estimatedTilt: number;
    notes: string;
  }[];
  totalSuitableAreaSqM: number;
  imageAnalysisSummary: string;
  confidenceScore: number;
  dataSources: string[];
  assumptions: string[];
}

export async function detectRooftops(imageUrl: string, location: string): Promise<RooftopDetectionResult> {
  try {
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const blob = await imageResponse.blob();
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        {
          text: `Analyze this satellite imagery for the location: ${location}.
          Your task is to detect suitable rooftops for solar panel installation.
          For each suitable rooftop identified in the image:
          1. Estimate its area in square meters.
          2. Assess its suitability (High, Medium, Low) based on size, shading (if visible), and orientation.
          3. Determine its orientation (e.g., South, South-West).
          4. Estimate its tilt in degrees.
          
          Provide a summary of the analysis and a list of detected rooftops.
          
          Your response MUST be a valid JSON object matching this structure:
          {
            "detectedRooftops": [
              {
                "id": "string",
                "areaSqM": number,
                "suitability": "High" | "Medium" | "Low",
                "orientation": "string",
                "estimatedTilt": number,
                "notes": "string"
              }
            ],
            "totalSuitableAreaSqM": number,
            "imageAnalysisSummary": "string",
            "confidenceScore": number,
            "dataSources": string[],
            "assumptions": string[]
          }`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedRooftops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  areaSqM: { type: Type.NUMBER },
                  suitability: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  orientation: { type: Type.STRING },
                  estimatedTilt: { type: Type.NUMBER },
                  notes: { type: Type.STRING }
                },
                required: ["id", "areaSqM", "suitability", "orientation", "estimatedTilt", "notes"]
              }
            },
            totalSuitableAreaSqM: { type: Type.NUMBER },
            imageAnalysisSummary: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            dataSources: { type: Type.ARRAY, items: { type: Type.STRING } },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["detectedRooftops", "totalSuitableAreaSqM", "imageAnalysisSummary", "confidenceScore", "dataSources", "assumptions"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Rooftop detection failed:", error);
    return {
      detectedRooftops: [],
      totalSuitableAreaSqM: 0,
      imageAnalysisSummary: "Rooftop detection unavailable for this location.",
      confidenceScore: 0,
      dataSources: ["System Error"],
      assumptions: ["Detection failed"]
    };
  }
}

export async function analyzeSolarPotential(params: {
  area: number;
  sunlightHours?: number;
  tariff: number;
  location: string;
  lat?: number;
  lng?: number;
  efficiency?: number;
  degradationRate?: number;
  systemCost?: number;
  tilt?: number;
  orientation?: string;
  shadingFactor?: number;
}): Promise<SolarAnalysisResult> {
  let fetchedIrradiance = params.sunlightHours;
  let dataSource = "AI Estimation";

  // Attempt to fetch real-world irradiance data from NASA POWER API
  if (!fetchedIrradiance && params.lat && params.lng) {
    try {
      const response = await fetch(
        `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${params.lng}&latitude=${params.lat}&format=JSON`
      );
      const data = await response.json();
      // NASA returns annual average in 'ALLSKY_SFC_SW_DWN' -> 'annual'
      const annualAvg = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.annual;
      if (annualAvg) {
        fetchedIrradiance = annualAvg;
        dataSource = "NASA POWER API (Climatology)";
      }
    } catch (e) {
      console.error("NASA API failed, falling back to AI estimation:", e);
    }
  }

  // Final fallback if still undefined
  const finalIrradiance = fetchedIrradiance || 5.5; // 5.5 is a solid global average fallback

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as an AI-powered geospatial decision platform for decentralized solar infrastructure.
      Analyze solar energy potential for a location with:
      - Rooftop/Ground Area: ${params.area} sq meters
      - Grounded Solar Irradiance: ${finalIrradiance} kWh/m²/day (Source: ${dataSource})
      - Local Electricity Tariff: $${params.tariff}/kWh
      - Location: ${params.location}
      - Roof Tilt: ${params.tilt || 20} degrees
      - Orientation: ${params.orientation || 'South'}
      - Shading Factor: ${params.shadingFactor || 0.1} (0 to 1)
      ${params.efficiency ? `- Panel Efficiency: ${params.efficiency}%` : ""}
      ${params.degradationRate ? `- Annual Degradation Rate: ${params.degradationRate}%` : ""}
      ${params.systemCost ? `- Estimated System Cost: $${params.systemCost}` : ""}
      
      Provide a detailed technical, financial, and risk-based decision report for government/enterprise execution.
      Include a clear verdict: HIGHLY RECOMMENDED, VIABLE WITH CONDITIONS, or NOT RECOMMENDED.
      
      Your response MUST be a valid JSON object matching this structure:
      {
        "estimatedOutputKW": number,
        "monthlySavings": number,
        "roiPercentage": number,
        "paybackPeriodYears": number,
        "confidenceScore": number (0-100),
        "dataSources": string[],
        "assumptions": string[],
        "technicalAnalysis": {
          "peakGenerationMonths": string[],
          "efficiencyLossFactors": string[],
          "systemSizeRecommendationKW": number
        },
        "financialAnalysis": {
          "lifetimeSavings": number,
          "incentiveBreakdown": string,
          "maintenanceCostEst": number
        },
        "riskAnalysis": {
          "shadingRisk": "Low" | "Medium" | "High",
          "weatherVariability": "Low" | "Medium" | "High",
          "policyRisk": "Low" | "Medium" | "High",
          "mitigationStrategies": string[]
        },
        "environmentalImpact": { "co2SavedKg": number, "treesEquivalent": number },
        "policyImpact": { "gridStabilityScore": number, "subsidyEligibility": string, "communityBenefit": string },
        "decision": { "verdict": string, "explanation": string },
        "recommendations": string[],
        "scenarios": {
          "budget": { "cost": number, "efficiency": number, "payback": number },
          "premium": { "cost": number, "efficiency": number, "payback": number }
        }
      }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          estimatedOutputKW: { type: Type.NUMBER },
          monthlySavings: { type: Type.NUMBER },
          roiPercentage: { type: Type.NUMBER },
          paybackPeriodYears: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          dataSources: { type: Type.ARRAY, items: { type: Type.STRING } },
          assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          technicalAnalysis: {
            type: Type.OBJECT,
            properties: {
              peakGenerationMonths: { type: Type.ARRAY, items: { type: Type.STRING } },
              efficiencyLossFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
              systemSizeRecommendationKW: { type: Type.NUMBER }
            },
            required: ["peakGenerationMonths", "efficiencyLossFactors", "systemSizeRecommendationKW"]
          },
          financialAnalysis: {
            type: Type.OBJECT,
            properties: {
              lifetimeSavings: { type: Type.NUMBER },
              incentiveBreakdown: { type: Type.STRING },
              maintenanceCostEst: { type: Type.NUMBER }
            },
            required: ["lifetimeSavings", "incentiveBreakdown", "maintenanceCostEst"]
          },
          riskAnalysis: {
            type: Type.OBJECT,
            properties: {
              shadingRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              weatherVariability: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              policyRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              mitigationStrategies: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["shadingRisk", "weatherVariability", "policyRisk", "mitigationStrategies"]
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
          decision: {
            type: Type.OBJECT,
            properties: {
              verdict: { type: Type.STRING, enum: ["HIGHLY RECOMMENDED", "VIABLE WITH CONDITIONS", "NOT RECOMMENDED"] },
              explanation: { type: Type.STRING },
            },
            required: ["verdict", "explanation"],
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
        required: [
          "estimatedOutputKW", "monthlySavings", "roiPercentage", "paybackPeriodYears", 
          "confidenceScore", "dataSources", "assumptions", "technicalAnalysis", 
          "financialAnalysis", "riskAnalysis", "environmentalImpact", "policyImpact", 
          "decision", "scenarios", "recommendations"
        ],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
