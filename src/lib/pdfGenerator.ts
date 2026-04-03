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
  doc.text('SolarAI: Policy Impact Report', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${timestamp}`, 20, 32);
  doc.text('Government Execution Level Analysis', 140, 32);

  // Executive Summary
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Executive Summary', 20, 55);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const verdictColor = result.decision.verdict === 'YES' ? [16, 185, 129] : result.decision.verdict === 'NO' ? [239, 68, 68] : [245, 158, 11];
  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.text(`Installation Verdict: ${result.decision.verdict}`, 20, 65);
  
  doc.setTextColor(71, 85, 105); // Slate-600
  const splitExplanation = doc.splitTextToSize(result.decision.explanation, 170);
  doc.text(splitExplanation, 20, 72);

  // Site Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Site & Configuration Details', 20, 100);

  (doc as any).autoTable({
    startY: 105,
    head: [['Parameter', 'Value']],
    body: [
      ['Site Name', zone.name || 'Custom Site'],
      ['Location', `Lat: ${zone.lat.toFixed(4)}, Lng: ${zone.lng.toFixed(4)}`],
      ['Available Area', `${zone.area} sq. meters`],
      ['Avg. Irradiance', `${zone.irradiance} kWh/m2/day`],
      ['Panel Efficiency', `${params.efficiency}%`],
      ['System Cost', `$${params.systemCost.toLocaleString()}`],
      ['Roof Tilt / Orientation', `${params.tilt} deg / ${params.orientation}`],
      ['Shading Factor', `${params.shading}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: 20, right: 20 }
  });

  // Financial & Technical Impact
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Technical & Financial Intelligence', 20, currentY);

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Metric', 'Value', 'Assessment']],
    body: [
      ['Est. Annual Output', `${result.estimatedOutputKW.toLocaleString()} kW`, 'Technical Viability'],
      ['Monthly Savings', `$${result.monthlySavings.toLocaleString()}`, 'Economic Benefit'],
      ['ROI Percentage', `${result.roiPercentage}%`, 'Investment Strength'],
      ['Payback Period', `${result.paybackPeriodYears} years`, 'Capital Recovery'],
      ['Grid Stability Score', `${result.policyImpact.gridStabilityScore}/100`, 'Infrastructure Impact'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    margin: { left: 20, right: 20 }
  });

  // Environmental & Policy
  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Environmental & Policy Alignment', 20, nextY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`CO2 Reduction: ${result.environmentalImpact.co2SavedKg.toLocaleString()} kg/year`, 20, nextY + 10);
  doc.text(`Ecological Equivalent: ${result.environmentalImpact.treesEquivalent} trees planted`, 20, nextY + 17);
  doc.text(`Subsidy Eligibility: ${result.policyImpact.subsidyEligibility}`, 20, nextY + 24);
  
  const splitCommunity = doc.splitTextToSize(`Community Benefit: ${result.policyImpact.communityBenefit}`, 170);
  doc.text(splitCommunity, 20, nextY + 31);

  // Recommendations
  const finalY = nextY + 50;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Strategic Recommendations', 20, finalY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  result.recommendations.forEach((rec, index) => {
    const splitRec = doc.splitTextToSize(`${index + 1}. ${rec}`, 170);
    doc.text(splitRec, 20, finalY + 10 + (index * 12));
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Confidential - SolarAI Geospatial Decision Platform', 20, 285);
    doc.text(`Page ${i} of ${pageCount}`, 180, 285);
  }

  doc.save(`SolarAI_Policy_Report_${zone.id || 'Custom'}.pdf`);
};
