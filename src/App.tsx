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
  Zap as ZapIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SolarMap from './components/SolarMap';
import { EnergyOutputChart, SavingsChart } from './components/Charts';
import FeedbackForm from './components/FeedbackForm';
import { analyzeSolarPotential, detectRooftops, type SolarAnalysisResult, type RooftopDetectionResult } from './services/gemini';
import { cn } from './lib/utils';
import { generatePDFReport } from './lib/pdfGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'analysis' | 'reports' | 'settings'>('map');
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SolarAnalysisResult | null>(null);
  const [rooftopData, setRooftopData] = useState<RooftopDetectionResult | null>(null);
  const [isDetectingRooftops, setIsDetectingRooftops] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGovMode, setIsGovMode] = useState(false);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Mode Indicator
  const [mode, setMode] = useState<'viewing' | 'selected' | 'ready' | 'no-data'>('viewing');

  // Settings State
  const [mapProvider, setMapProvider] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'INR' | 'GBP'>('USD');
  const [defaultZoom, setDefaultZoom] = useState<number>(13);
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(false); // Default to false for pro flow
  const [orgName, setOrgName] = useState<string>('SolarPotential AI');
  const [contactEmail, setContactEmail] = useState<string>('support@solarpotential.ai');
  const [includeVerdict, setIncludeVerdict] = useState<boolean>(true);
  const [includePolicyImpact, setIncludePolicyImpact] = useState<boolean>(true);
  const [includeFinancialScenarios, setIncludeFinancialScenarios] = useState<boolean>(true);
  const [subsidyRate, setSubsidyRate] = useState<number>(30);

  // Custom parameters
  const [efficiency, setEfficiency] = useState<number>(20);
  const [degradation, setDegradation] = useState<number>(0.5);
  const [systemCost, setSystemCost] = useState<number>(15000);
  const [tilt, setTilt] = useState<number>(20);
  const [orientation, setOrientation] = useState<string>('South');
  const [shading, setShading] = useState<number>(0.1);

  const formatCurrency = (amount: number) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      INR: '₹',
      GBP: '£'
    };
    return `${symbols[currency] || '$'}${amount.toLocaleString()}`;
  };

  const handleDownloadReport = () => {
    if (selectedZone && analysisResult) {
      generatePDFReport(selectedZone, analysisResult, {
        efficiency,
        degradation,
        systemCost,
        tilt,
        orientation,
        shading
      }, {
        orgName,
        includeVerdict,
        includePolicyImpact,
        includeFinancialScenarios
      });
    }
  };

  const handleZoneSelect = async (zone: any) => {
    setSelectedZone(zone);
    if (zone) {
      setMode('selected');
      if (autoAnalyze) {
        setMode('ready');
        setActiveTab('analysis');
        runAnalysis(zone);
      }
    } else {
      setMode('viewing');
    }
  };

  const runAnalysis = async (zone: any) => {
    if (!zone) return;
    setMode('ready');
    setIsAnalyzing(true);
    setIsDetectingRooftops(true);
    setError(null);
    setRooftopData(null);
    
    try {
      // 1. Detect Rooftops from Satellite Imagery
      // Using Yandex Static Maps as a free satellite imagery source for demo
      const satImageUrl = `https://static-maps.yandex.ru/1.x/?ll=${zone.lng},${zone.lat}&z=19&l=sat&size=600,450`;
      const rooftopResult = await detectRooftops(satImageUrl, zone.name || `Lat: ${zone.lat}, Lng: ${zone.lng}`);
      setRooftopData(rooftopResult);

      // 2. Run Main Solar Analysis (using detected area if available)
      const analysisArea = rooftopResult.totalSuitableAreaSqM > 0 ? rooftopResult.totalSuitableAreaSqM : zone.area;

      const result = await analyzeSolarPotential({
        area: analysisArea,
        sunlightHours: zone.irradiance,
        lat: zone.lat,
        lng: zone.lng,
        tariff: currency === 'INR' ? 7.5 : 0.15, // Dynamic tariff based on currency
        location: zone.name || `Lat: ${zone.lat}, Lng: ${zone.lng}`,
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
      setIsDetectingRooftops(false);
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
          <h1 className="font-display font-bold text-xl tracking-tight text-slate-900">SolarPotential AI</h1>
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
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setActiveTab('map');
                  }
                }}
                className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === 'settings' ? "bg-orange-50 text-orange-600" : "text-slate-500 hover:bg-slate-50"
              )}
            >
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
                className="h-full flex flex-col gap-6 relative"
              >
                {/* Mode Indicator Overlay */}
                <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    mode === 'viewing' ? "bg-emerald-500" :
                    mode === 'selected' ? "bg-amber-500" :
                    mode === 'ready' ? "bg-blue-500" : "bg-slate-400"
                  )} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    {mode === 'viewing' ? "🟢 Viewing Mode" :
                     mode === 'selected' ? "🟡 Selected Location" :
                     mode === 'ready' ? "🔵 Analysis Ready" : "🔴 No Data"}
                  </span>
                </div>

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
                  <div className={cn(
                    "transition-all duration-500 ease-in-out",
                    isFullscreenMap ? "fixed inset-0 z-50 bg-white p-4" : "h-full"
                  )}>
                    {isFullscreenMap && (
                      <div className="absolute top-8 right-8 z-[2000]">
                        <button 
                          onClick={() => setIsFullscreenMap(false)}
                          className="bg-white p-2 rounded-full shadow-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight className="rotate-180" />
                        </button>
                      </div>
                    )}
                    <SolarMap 
                      onZoneSelect={(zone) => {
                        handleZoneSelect(zone);
                        if (isFullscreenMap) setIsFullscreenMap(false);
                      }} 
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      showHeatmap={showHeatmap}
                    />
                  </div>
                  <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <button 
                      onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                      className="px-4 py-2 bg-white text-slate-700 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      {isFullscreenMap ? "Exit Fullscreen" : "Expand Map"}
                    </button>
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
                  </div>

                  {/* Analysis CTA Overlay */}
                  <AnimatePresence>
                    {selectedZone && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000]"
                      >
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl flex items-center gap-6 min-w-[400px]">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 text-sm">{selectedZone.name}</h4>
                            <p className="text-xs text-slate-500">{selectedZone.area} m² • {selectedZone.potential} Potential</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedZone(null)}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              <X size={20} />
                            </button>
                            <button 
                              onClick={() => {
                                setActiveTab('analysis');
                                runAnalysis(selectedZone);
                              }}
                              className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
                            >
                              <Zap size={16} />
                              Analyze This Location
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isDetectingRooftops ? "AI Computer Vision Model Detecting Rooftops..." : "AI Regression Model Running..."}
                    </h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">
                      {isDetectingRooftops 
                        ? "Analyzing satellite imagery to identify suitable installation spots and estimate area."
                        : "Estimating energy output based on rooftop area, sunlight hours, and local tariffs."}
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
                    {/* Confidence & Data Source */}
                    <div className="lg:col-span-3 flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={14} className="text-orange-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trust & Transparency Score</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-white">{analysisResult.confidenceScore}%</span>
                            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-1000",
                                  analysisResult.confidenceScore > 80 ? "bg-emerald-400" :
                                  analysisResult.confidenceScore > 60 ? "bg-amber-400" : "bg-red-400"
                                )} 
                                style={{ width: `${analysisResult.confidenceScore}%` }} 
                              />
                            </div>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-slate-800" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verified Data Sources</span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.dataSources.map((source, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700">{source}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right max-w-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Primary AI Assumptions</span>
                        <p className="text-[10px] text-slate-400 italic leading-tight">
                          "{analysisResult.assumptions[0]}" and {analysisResult.assumptions.length - 1} other critical factors considered.
                        </p>
                      </div>
                    </div>

                    {/* Rooftop Detection Results */}
                    {rooftopData && (
                      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-display font-bold text-lg flex items-center gap-2">
                            <Globe size={20} className="text-blue-500" />
                            AI Rooftop Detection Analysis
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detection Confidence</span>
                              <span className="text-sm font-bold text-blue-600">{rooftopData.confidenceScore}%</span>
                            </div>
                            <Badge color="blue">{rooftopData.detectedRooftops.length} Rooftops Detected</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative group">
                              <img 
                                src={`https://static-maps.yandex.ru/1.x/?ll=${selectedZone.lng},${selectedZone.lat}&z=19&l=sat&size=600,450`}
                                alt="Satellite View"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                <p className="text-white text-xs font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                  AI Analysis Overlay Active
                                </p>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                              <p className="text-[10px] text-blue-700 font-bold uppercase mb-1 flex items-center gap-1">
                                <Info size={10} />
                                Image Analysis Summary
                              </p>
                              <p className="text-xs text-slate-600 italic leading-relaxed">
                                {rooftopData.imageAnalysisSummary}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rooftopData.dataSources.map((source, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-medium">Source: {source}</span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-[10px] text-blue-700 font-bold uppercase mb-1">Total Suitable Area</p>
                                <p className="text-xl font-bold text-blue-900">{rooftopData.totalSuitableAreaSqM} m²</p>
                              </div>
                              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Avg. Suitability</p>
                                <p className="text-xl font-bold text-emerald-900">High</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                              {rooftopData.detectedRooftops.map((roof) => (
                                <div key={roof.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-bold text-slate-900">Rooftop {roof.id}</p>
                                    <p className="text-[10px] text-slate-500">{roof.areaSqM} m² • {roof.orientation} • {roof.estimatedTilt}°</p>
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded",
                                    roof.suitability === 'High' ? "bg-emerald-100 text-emerald-700" :
                                    roof.suitability === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                  )}>
                                    {roof.suitability}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Key Detection Assumptions</p>
                              <ul className="space-y-1">
                                {rooftopData.assumptions.map((asmp, i) => (
                                  <li key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                    {asmp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats Cards */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Decision Verdict</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn(
                            "text-xs font-bold px-3 py-1 rounded-lg",
                            analysisResult.decision.verdict === 'HIGHLY RECOMMENDED' ? "bg-emerald-100 text-emerald-700" :
                            analysisResult.decision.verdict === 'NOT RECOMMENDED' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
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
                          Download Boardroom Report
                        </button>
                      </div>
                      <StatCard 
                        icon={<Zap className="text-orange-500" />} 
                        label="Est. Annual Output" 
                        value={`${analysisResult.estimatedOutputKW.toLocaleString()} kW`} 
                        subtext={`Rec: ${analysisResult.technicalAnalysis.systemSizeRecommendationKW}kW System`}
                      />
                      <StatCard 
                        icon={<TrendingUp className="text-emerald-500" />} 
                        label="ROI / Payback" 
                        value={`${analysisResult.roiPercentage}% / ${analysisResult.paybackPeriodYears}y`} 
                        subtext={`Lifetime: ${formatCurrency(analysisResult.financialAnalysis.lifetimeSavings)}`}
                      />
                      <StatCard 
                        icon={<DollarSign className="text-blue-500" />} 
                        label="Monthly Savings" 
                        value={formatCurrency(analysisResult.monthlySavings)} 
                        subtext={`Maint: ${formatCurrency(analysisResult.financialAnalysis.maintenanceCostEst)}/yr`}
                      />
                    </div>

                    {/* Technical, Financial, Risk Layers */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Technical Layer */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Zap size={14} className="text-orange-500" />
                          Technical Layer
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Peak Generation Months</p>
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.technicalAnalysis.peakGenerationMonths.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold">{m}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Efficiency Loss Factors</p>
                            <ul className="space-y-1">
                              {analysisResult.technicalAnalysis.efficiencyLossFactors.map(f => (
                                <li key={f} className="text-[10px] text-slate-600 flex items-center gap-1">
                                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Financial Layer */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <DollarSign size={14} className="text-emerald-500" />
                          Financial Layer
                        </h4>
                        <div className="space-y-4">
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Incentive Breakdown</p>
                            <p className="text-[11px] text-emerald-600 leading-tight">{analysisResult.financialAnalysis.incentiveBreakdown}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-slate-500">Est. Lifetime Savings</span>
                            <span className="text-sm font-bold text-slate-900">{formatCurrency(analysisResult.financialAnalysis.lifetimeSavings)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Layer */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <AlertCircle size={14} className="text-red-500" />
                          Risk Layer
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Shading Risk</span>
                            <span className={cn(
                              "font-bold",
                              analysisResult.riskAnalysis.shadingRisk === 'Low' ? "text-emerald-600" :
                              analysisResult.riskAnalysis.shadingRisk === 'Medium' ? "text-amber-600" : "text-red-600"
                            )}>{analysisResult.riskAnalysis.shadingRisk}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Weather Variability</span>
                            <span className={cn(
                              "font-bold",
                              analysisResult.riskAnalysis.weatherVariability === 'Low' ? "text-emerald-600" :
                              analysisResult.riskAnalysis.weatherVariability === 'Medium' ? "text-amber-600" : "text-red-600"
                            )}>{analysisResult.riskAnalysis.weatherVariability}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Policy Dependency</span>
                            <span className={cn(
                              "font-bold",
                              analysisResult.riskAnalysis.policyRisk === 'Low' ? "text-emerald-600" :
                              analysisResult.riskAnalysis.policyRisk === 'Medium' ? "text-amber-600" : "text-red-600"
                            )}>{analysisResult.riskAnalysis.policyRisk}</span>
                          </div>
                          <div className="pt-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Mitigation</p>
                            <p className="text-[10px] text-slate-500 leading-tight italic">{analysisResult.riskAnalysis.mitigationStrategies[0]}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendations Engine */}
                    <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ZapIcon size={120} className="text-orange-500" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ShieldCheck size={14} />
                          AI Strategic Recommendations
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {analysisResult.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                              <div className="w-5 h-5 bg-orange-500/20 rounded flex items-center justify-center text-orange-500 shrink-0 mt-0.5">
                                <span className="text-[10px] font-bold">{i + 1}</span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </div>
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
                              <p className="text-2xl font-bold text-slate-900">{formatCurrency(analysisResult.scenarios.budget.cost)}</p>
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
                              <p className="text-2xl font-bold text-orange-900">{formatCurrency(analysisResult.scenarios.premium.cost)}</p>
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
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-bold text-slate-900">Community Impact Reports</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                    <Loader2 size={16} className="text-orange-500" />
                    Fetch Latest Reports
                  </button>
                </div>
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

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">Platform Settings</h2>
                  <p className="text-slate-500">Configure geospatial parameters, financial defaults, and reporting preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Map Configuration */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <MapIcon size={18} className="text-blue-500" />
                      Map Configuration
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Map Provider</label>
                        <select 
                          value={mapProvider}
                          onChange={(e) => setMapProvider(e.target.value as any)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        >
                          <option value="osm">OpenStreetMap (Standard)</option>
                          <option value="satellite">Satellite Imagery (Mock)</option>
                          <option value="terrain">Terrain View (Mock)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Default Zoom Level</label>
                        <input 
                          type="range" 
                          min="1" 
                          max="20" 
                          value={defaultZoom}
                          onChange={(e) => setDefaultZoom(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>Global</span>
                          <span>Street Level ({defaultZoom})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Defaults */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <DollarSign size={18} className="text-emerald-500" />
                      Financial Intelligence Defaults
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Preferred Currency</label>
                        <select 
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value as any)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="INR">INR (₹)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Policy Subsidy Rate (%)</label>
                        <input 
                          type="number" 
                          value={subsidyRate}
                          onChange={(e) => setSubsidyRate(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reporting Preferences */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <FileText size={18} className="text-purple-500" />
                      Reporting Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Organization Name</label>
                        <input 
                          type="text" 
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Contact Email</label>
                        <input 
                          type="email" 
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Include AI Verdict in PDF</span>
                        <button 
                          onClick={() => setIncludeVerdict(!includeVerdict)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            includeVerdict ? "bg-orange-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            includeVerdict ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Include Policy Impact</span>
                        <button 
                          onClick={() => setIncludePolicyImpact(!includePolicyImpact)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            includePolicyImpact ? "bg-orange-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            includePolicyImpact ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Include Financial Scenarios</span>
                        <button 
                          onClick={() => setIncludeFinancialScenarios(!includeFinancialScenarios)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            includeFinancialScenarios ? "bg-orange-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            includeFinancialScenarios ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* System & AI */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Zap size={18} className="text-orange-500" />
                      System & AI Behavior
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">Auto-Run Analysis</span>
                          <span className="text-[10px] text-slate-400">Analyze site immediately on click</span>
                        </div>
                        <button 
                          onClick={() => setAutoAnalyze(!autoAnalyze)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            autoAnalyze ? "bg-orange-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            autoAnalyze ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-1">
                          <ShieldCheck size={14} />
                          <span className="text-xs font-bold uppercase tracking-wider">AI Model Status</span>
                        </div>
                        <p className="text-[11px] text-blue-600 leading-tight">
                          Gemini 3 Flash is currently active. Decision intelligence is optimized for policy impact and technical viability.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => setActiveTab('map')}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  >
                    Save & Apply Changes
                  </button>
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

function Badge({ children, color }: { children: React.ReactNode, color: 'orange' | 'amber' | 'slate' | 'blue' }) {
  const colors = {
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200"
  };
  
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", colors[color])}>
      {children}
    </span>
  );
}
