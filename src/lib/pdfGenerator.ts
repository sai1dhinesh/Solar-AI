import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { type SolarAnalysisResult } from '../services/gemini';

export const generatePDFReport = (
  zone: any,
  result: SolarAnalysisResult,
  params: {
    efficiency: number;
    degradation: number;
    systemCost: number;
    tilt: number;
    orientation: string;
    shading: number;
  },
  config: {
    orgName: string;
    includeVerdict: boolean;
    includePolicyImpact: boolean;
    includeFinancialScenarios: boolean;
  }
) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();

  // Header
  doc.setFillColor(245, 158, 11); // Orange-500
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${config.orgName}: Policy Impact Report`, 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${timestamp}`, 20, 32);
  doc.text('Government Execution Level Analysis', 140, 32);

  // Executive Summary
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Executive Summary & AI Verdict', 20, 55);
  
  let currentY = 65;

  // Confidence Score Badge
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(150, 48, 40, 12, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('AI CONFIDENCE', 155, 53);
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(`${result.confidenceScore}%`, 155, 58);

  if (config.includeVerdict) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const verdictColor = result.decision.verdict === 'HIGHLY RECOMMENDED' ? [16, 185, 129] : result.decision.verdict === 'NOT RECOMMENDED' ? [239, 68, 68] : [245, 158, 11];
    doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
    doc.text(`Verdict: ${result.decision.verdict}`, 20, currentY);
    currentY += 7;
  }
  
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitExplanation = doc.splitTextToSize(result.decision.explanation, 170);
  doc.text(splitExplanation, 20, currentY);
  currentY += (splitExplanation.length * 5) + 10;

  // Data Sources & Assumptions
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Data Sources: ${result.dataSources.join(', ')}`, 20, currentY);
  currentY += 5;
  doc.text(`Key Assumption: ${result.assumptions[0]}`, 20, currentY);
  currentY += 15;

  // 3-Layer Analysis
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Multi-Layer Strategic Analysis', 20, currentY);
  currentY += 8;

  // Technical Layer
  doc.setFontSize(11);
  doc.text('A. Technical Layer', 25, currentY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`- Recommended System Size: ${result.technicalAnalysis.systemSizeRecommendationKW} kW`, 30, currentY + 6);
  doc.text(`- Peak Generation: ${result.technicalAnalysis.peakGenerationMonths.join(', ')}`, 30, currentY + 11);
  doc.text(`- Efficiency Loss Factors: ${result.technicalAnalysis.efficiencyLossFactors.join(', ')}`, 30, currentY + 16);
  currentY += 25;

  // Financial Layer
  if (config.includeFinancialScenarios) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('B. Financial Layer', 25, currentY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`- Lifetime Savings: $${result.financialAnalysis.lifetimeSavings.toLocaleString()}`, 30, currentY + 6);
    doc.text(`- Maintenance Est: $${result.financialAnalysis.maintenanceCostEst.toLocaleString()}/year`, 30, currentY + 11);
    const splitIncentive = doc.splitTextToSize(`- Incentives: ${result.financialAnalysis.incentiveBreakdown}`, 160);
    doc.text(splitIncentive, 30, currentY + 16);
    currentY += (splitIncentive.length * 5) + 20;
  }

  // Risk Layer
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('C. Risk & Mitigation Layer', 25, currentY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`- Shading Risk: ${result.riskAnalysis.shadingRisk}`, 30, currentY + 6);
  doc.text(`- Weather Variability: ${result.riskAnalysis.weatherVariability}`, 30, currentY + 11);
  doc.text(`- Policy Risk: ${result.riskAnalysis.policyRisk}`, 30, currentY + 16);
  const splitMitigation = doc.splitTextToSize(`- Mitigation: ${result.riskAnalysis.mitigationStrategies[0]}`, 160);
  doc.text(splitMitigation, 30, currentY + 21);
  currentY += (splitMitigation.length * 5) + 25;

  // Site Details Table
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Site Configuration Details', 20, currentY);

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Parameter', 'Value']],
    body: [
      ['Site Name', zone.name || 'Custom Site'],
      ['Location', `Lat: ${zone.lat.toFixed(4)}, Lng: ${zone.lng.toFixed(4)}`],
      ['Available Area', `${zone.area} sq. meters`],
      ['Avg. Irradiance', `${zone.irradiance || 'N/A'} kWh/m2/day`],
      ['Panel Efficiency', `${params.efficiency}%`],
      ['System Cost', `$${params.systemCost.toLocaleString()}`],
      ['Roof Tilt / Orientation', `${params.tilt} deg / ${params.orientation}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 20, right: 20 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Environmental & Policy
  if (config.includePolicyImpact) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('4. Environmental & Policy Alignment', 20, currentY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`CO2 Reduction: ${result.environmentalImpact.co2SavedKg.toLocaleString()} kg/year`, 20, currentY + 10);
    doc.text(`Ecological Equivalent: ${result.environmentalImpact.treesEquivalent} trees planted`, 20, currentY + 17);
    doc.text(`Subsidy Eligibility: ${result.policyImpact.subsidyEligibility}`, 20, currentY + 24);
    
    const splitCommunity = doc.splitTextToSize(`Community Benefit: ${result.policyImpact.communityBenefit}`, 170);
    doc.text(splitCommunity, 20, currentY + 31);
    currentY += 50;
  }

  // Recommendations
  if (currentY > 220) {
    doc.addPage();
    currentY = 30;
  }
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Strategic Recommendations', 20, currentY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  result.recommendations.forEach((rec, index) => {
    const splitRec = doc.splitTextToSize(`${index + 1}. ${rec}`, 170);
    doc.text(splitRec, 20, currentY + 10 + (index * 12));
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Confidential - ${config.orgName} Geospatial Decision Platform`, 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
  }

  doc.save(`${config.orgName.replace(/\s+/g, '_')}_Policy_Report_${zone.id || 'Custom'}.pdf`);
};
