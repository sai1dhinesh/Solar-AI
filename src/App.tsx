import { useState } from 'react';
import { 
  Sun, 
  Map as MapIcon, 
  BarChart3, 
  Settings, 
  Zap, 
  Leaf, 
  DollarSign, 
  Info,
  Search,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingUp,
  Globe,
  FileText,
  Download,
  ShieldCheck,
  Zap as ZapIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SolarMap from './components/SolarMap';
import { EnergyOutputChart, SavingsChart } from './components/Charts';
import FeedbackForm from './components/FeedbackForm';
import { analyzeSolarPotential, type SolarAnalysisResult } from './services/gemini';
import { cn } from './lib/utils';
import { generatePDFReport } from './lib/pdfGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'analysis' | 'reports'>('map');
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SolarAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGovMode, setIsGovMode] = useState(false);

  // Custom parameters
  const [efficiency, setEfficiency] = useState<number>(20);
  const [degradation, setDegradation] = useState<number>(0.5);
  const [systemCost, setSystemCost] = useState<number>(15000);
  const [tilt, setTilt] = useState<number>(20);
  const [orientation, setOrientation] = useState<string>('South');
  const [shading, setShading] = useState<number>(0.1);

  const handleDownloadReport = () => {
    if (selectedZone && analysisResult) {
      generatePDFReport(selectedZone, analysisResult, {
        efficiency,
        degradation,
        systemCost,
        tilt,
        orientation,
        shading
      });
    }
  };

  const handleZoneSelect = async (zone: any) => {
    setSelectedZone(zone);
    setActiveTab('analysis');
    runAnalysis(zone);
  };

  const runAnalysis = async (zone: any) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeSolarPotential({
        area: zone.area,
        sunlightHours: zone.irradiance,
        tariff: 0.15, // Mock tariff
        location: `Lat: ${zone.lat}, Lng: ${zone.lng}`,
        efficiency,
        degradationRate: degradation,
        systemCost,
        tilt,
        orientation,
        shadingFactor: shading,
      });
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze solar potential. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Sun size={24} />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">SolarAI</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem 
            icon={<MapIcon size={20} />} 
            label="Potential Map" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
          />
          <SidebarItem 
            icon={<BarChart3 size={20} />} 
            label="Site Analysis" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')} 
          />
          <SidebarItem 
            icon={<Layers size={20} />} 
            label="Reports" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <Info size={16} />
              <span className="text-xs font-medium">System Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg mr-4">
              <button 
                onClick={() => setIsGovMode(false)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  !isGovMode ? "bg-white shadow-sm text-orange-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Consumer
              </button>
              <button 
                onClick={() => setIsGovMode(true)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  isGovMode ? "bg-white shadow-sm text-orange-600" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Gov/Enterprise
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search location, coordinates, or zones..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
            <div className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Solar" alt="Avatar" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Geospatial Solar Potential</h2>
                    <p className="text-slate-500">Interactive map showing high-irradiance zones and optimal installation sites.</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge color="orange">High Potential</Badge>
                    <Badge color="amber">Medium Potential</Badge>
                    <Badge color="slate">Low Potential</Badge>
                  </div>
                </div>
                
                <div className="flex-1 min-h-[500px] relative">
                  <SolarMap 
                    onZoneSelect={handleZoneSelect} 
                    searchQuery={searchQuery}
                    showHeatmap={showHeatmap}
                  />
                  <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                    <button 
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2",
                        showHeatmap ? "bg-orange-500 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Layers className="w-4 h-4" />
                      {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
                    </button>
                    {isGovMode && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white p-4 rounded-xl shadow-xl border border-slate-200 w-64"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">District Intelligence</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Total Ward Potential</p>
                            <p className="text-lg font-bold text-slate-900">45.2 MW</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Adoption Rate</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{ width: '12%' }} />
                              </div>
                              <span className="text-xs font-bold text-slate-700">12%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Site Viability Analysis</h2>
                    <p className="text-slate-500">
                      {selectedZone 
                        ? `Detailed breakdown for Zone ${selectedZone.id} (${selectedZone.area} m²)` 
                        : 'Select a zone on the map to begin analysis.'}
                    </p>
                  </div>
                  {selectedZone && (
                    <button 
                      onClick={() => runAnalysis(selectedZone)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
                    >
                      <Zap size={18} />
                      Run Analysis
                    </button>
                  )}
                </div>

                {selectedZone && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                      <Settings size={20} className="text-slate-500" />
                      Personalization Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Panel Efficiency (%)</label>
                        <input 
                          type="number" 
                          value={efficiency} 
                          onChange={(e) => setEfficiency(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Standard efficiency is 15-22%</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Annual Degradation (%)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={degradation} 
                          onChange={(e) => setDegradation(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Typical rate is 0.5% per year</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Estimated System Cost ($)</label>
                        <input 
                          type="number" 
                          value={systemCost} 
                          onChange={(e) => setSystemCost(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Total installation and hardware cost</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Roof Tilt (Degrees)</label>
                        <input 
                          type="number" 
                          value={tilt} 
                          onChange={(e) => setTilt(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">Optimal tilt for your latitude</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Orientation</label>
                        <select 
                          value={orientation} 
                          onChange={(e) => setOrientation(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        >
                          <option value="South">South</option>
                          <option value="East">East</option>
                          <option value="West">West</option>
                          <option value="North">North</option>
                        </select>
                        <p className="text-[10px] text-slate-400">Direction the roof faces</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Shading Factor (0-1)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          min="0"
                          max="1"
                          value={shading} 
                          onChange={(e) => setShading(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400">0 = No shade, 1 = Full shade</p>
                      </div>
                    </div>
                  </div>
                )}

                {!selectedZone ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <MapIcon size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No Site Selected</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">
                      Please go back to the map and click on a solar zone to view its detailed potential analysis.
                    </p>
                    <button 
                      onClick={() => setActiveTab('map')}
                      className="mt-6 px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Return to Map
                    </button>
                  </div>
                ) : isAnalyzing ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">AI Regression Model Running...</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">
                      Estimating energy output based on rooftop area, sunlight hours, and local tariffs.
                    </p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-900">Analysis Error</h3>
                    <p className="text-red-700 mt-2">{error}</p>
                  </div>
                ) : analysisResult ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats Cards */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Decision Verdict</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            "text-xl font-bold px-3 py-1 rounded-lg",
                            analysisResult.decision.verdict === 'YES' ? "bg-emerald-100 text-emerald-700" :
                            analysisResult.decision.verdict === 'NO' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {analysisResult.decision.verdict}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-tight mb-4">{analysisResult.decision.explanation}</p>
                        
                        <button 
                          onClick={handleDownloadReport}
                          className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                        >
                          <Download size={14} />
                          Download Policy Report
                        </button>
                      </div>
                      <StatCard 
                        icon={<Zap className="text-orange-500" />} 
                        label="Est. Annual Output" 
                        value={`${analysisResult.estimatedOutputKW.toLocaleString()} kW`} 
                        subtext="Predicted by AI Model"
                      />
                      <StatCard 
                        icon={<TrendingUp className="text-emerald-500" />} 
                        label="ROI / Payback" 
                        value={`${analysisResult.roiPercentage}% / ${analysisResult.paybackPeriodYears}y`} 
                        subtext="Financial Intelligence"
                      />
                      <StatCard 
                        icon={<DollarSign className="text-blue-500" />} 
                        label="Monthly Savings" 
                        value={`$${analysisResult.monthlySavings.toLocaleString()}`} 
                        subtext="Estimated Reduction"
                      />
                    </div>

                    {/* Policy & Grid Impact */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                          <ZapIcon size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grid Stability</p>
                          <p className="text-lg font-bold text-slate-900">{analysisResult.policyImpact.gridStabilityScore}/100</p>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full" 
                              style={{ width: `${analysisResult.policyImpact.gridStabilityScore}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subsidy Eligibility</p>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{analysisResult.policyImpact.subsidyEligibility}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">Policy Aligned</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                          <Globe size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Community Impact</p>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{analysisResult.policyImpact.communityBenefit}</p>
                          <p className="text-[10px] text-purple-600 font-medium">Social Benefit</p>
                        </div>
                      </div>
                    </div>

                    {/* Scenario Comparison */}
                    <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="font-display font-bold text-xl text-slate-900">Multi-Scenario Investment Comparison</h3>
                          <p className="text-sm text-slate-500">Compare standard budget hardware vs. high-performance premium systems.</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">MNRE Subsidy Applied</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={80} />
                          </div>
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="font-bold text-slate-900 text-lg">Budget Plan</h4>
                              <p className="text-xs text-slate-500">Standard Poly-crystalline panels</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">${analysisResult.scenarios.budget.cost.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Initial Investment</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">System Efficiency</span>
                              <span className="font-bold text-slate-900">{analysisResult.scenarios.budget.efficiency}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Payback Period</span>
                              <span className="font-bold text-slate-900">{analysisResult.scenarios.budget.payback} years</span>
                            </div>
                            <div className="pt-2">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                                <span>Performance Index</span>
                                <span>{analysisResult.scenarios.budget.efficiency}%</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-slate-400 h-full" style={{ width: `${analysisResult.scenarios.budget.efficiency * 4}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap size={80} className="text-orange-500" />
                          </div>
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="font-bold text-orange-900 text-lg">Premium Plan</h4>
                              <p className="text-xs text-orange-700/60">High-efficiency Mono-PERC panels</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-orange-900">${analysisResult.scenarios.premium.cost.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-orange-400 uppercase">Initial Investment</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-orange-700/60">System Efficiency</span>
                              <span className="font-bold text-orange-900">{analysisResult.scenarios.premium.efficiency}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-orange-700/60">Payback Period</span>
                              <span className="font-bold text-orange-900">{analysisResult.scenarios.premium.payback} years</span>
                            </div>
                            <div className="pt-2">
                              <div className="flex justify-between text-[10px] font-bold text-orange-400 uppercase mb-1">
                                <span>Performance Index</span>
                                <span>{analysisResult.scenarios.premium.efficiency}%</span>
                              </div>
                              <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-orange-500 h-full" style={{ width: `${analysisResult.scenarios.premium.efficiency * 4}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-orange-500" />
                        Energy Generation Forecast
                      </h3>
                      <EnergyOutputChart />
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-500" />
                        Savings Projection
                      </h3>
                      <SavingsChart />
                    </div>

                    {/* Recommendations */}
                    <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="font-display font-bold text-lg mb-4">AI Recommendations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Form */}
                    <div className="lg:col-span-3">
                      <FeedbackForm analysisId={selectedZone?.id} />
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-display font-bold text-slate-900">Community Impact Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <ReportCard 
                    title="Municipal Solar Adoption" 
                    date="April 2026" 
                    status="Published"
                    description="Comprehensive analysis of solar potential across public buildings in the downtown district."
                  />
                  <ReportCard 
                    title="Residential Viability Study" 
                    date="March 2026" 
                    status="Draft"
                    description="Estimating cost-benefits for low-income housing projects using rooftop installations."
                  />
                  <ReportCard 
                    title="Grid Impact Assessment" 
                    date="February 2026" 
                    status="Review"
                    description="Technical report on how decentralized solar generation affects local grid stability."
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
        active 
          ? "bg-orange-50 text-orange-600 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {icon}
      {label}
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-display font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-400 font-medium">{subtext}</div>
    </div>
  );
}

function ReportCard({ title, date, status, description }: { title: string, date: string, status: string, description: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-orange-200 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
          <Layers size={24} />
        </div>
        <span className={cn(
          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest",
          status === 'Published' ? "bg-emerald-100 text-emerald-700" : 
          status === 'Draft' ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"
        )}>
          {status}
        </span>
      </div>
      <h3 className="font-display font-bold text-lg text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{date}</p>
      <p className="text-sm text-slate-600 line-clamp-3 mb-6">{description}</p>
      <button className="w-full py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
        View Report
      </button>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode, color: 'orange' | 'amber' | 'slate' }) {
  const colors = {
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", colors[color])}>
      {children}
    </span>
  );
}
