import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '../lib/utils';
import { HistoricalIrradianceChart } from './Charts';
import { Loader2, Search, X, Zap, Globe, Map as MapIcon, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  center: [number, number];
  zoom: number;
}

function ChangeView({ center, zoom }: MapViewProps) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface IrradiancePoint {
  date: string;
  value: number;
}

interface SolarZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  potential: 'High' | 'Medium' | 'Low';
  irradiance?: number; // kWh/m2/day
  area: number; // m2
  historicalData: IrradiancePoint[];
}

const MOCK_ZONES: SolarZone[] = [
  { 
    id: '1', 
    name: 'Downtown Hub', 
    lat: 34.0522, 
    lng: -118.2437, 
    potential: 'High', 
    irradiance: 6.5, 
    area: 5000,
    historicalData: [
      { date: '2025-01', value: 4.2 }, { date: '2025-02', value: 4.8 }, { date: '2025-03', value: 5.5 },
      { date: '2025-04', value: 6.2 }, { date: '2025-05', value: 6.8 }, { date: '2025-06', value: 7.2 },
      { date: '2025-07', value: 7.5 }, { date: '2025-08', value: 7.1 }, { date: '2025-09', value: 6.4 },
      { date: '2025-10', value: 5.6 }, { date: '2025-11', value: 4.9 }, { date: '2025-12', value: 4.3 },
    ]
  },
  { 
    id: '2', 
    name: 'Westside Park', 
    lat: 34.0622, 
    lng: -118.2537, 
    potential: 'Medium', 
    irradiance: 5.2, 
    area: 3200,
    historicalData: [
      { date: '2025-01', value: 3.5 }, { date: '2025-02', value: 3.9 }, { date: '2025-03', value: 4.4 },
      { date: '2025-04', value: 5.0 }, { date: '2025-05', value: 5.5 }, { date: '2025-06', value: 5.8 },
      { date: '2025-07', value: 6.0 }, { date: '2025-08', value: 5.7 }, { date: '2025-09', value: 5.2 },
      { date: '2025-10', value: 4.6 }, { date: '2025-11', value: 4.0 }, { date: '2025-12', value: 3.6 },
    ]
  },
  { 
    id: '3', 
    name: 'East Industrial', 
    lat: 34.0422, 
    lng: -118.2337, 
    potential: 'High', 
    irradiance: 6.8, 
    area: 8000,
    historicalData: [
      { date: '2025-01', value: 4.5 }, { date: '2025-02', value: 5.1 }, { date: '2025-03', value: 5.8 },
      { date: '2025-04', value: 6.5 }, { date: '2025-05', value: 7.1 }, { date: '2025-06', value: 7.5 },
      { date: '2025-07', value: 7.8 }, { date: '2025-08', value: 7.4 }, { date: '2025-09', value: 6.7 },
      { date: '2025-10', value: 5.9 }, { date: '2025-11', value: 5.2 }, { date: '2025-12', value: 4.6 },
    ]
  },
  { 
    id: '4', 
    name: 'North Residential', 
    lat: 34.0722, 
    lng: -118.2637, 
    potential: 'Low', 
    irradiance: 3.5, 
    area: 1500,
    historicalData: [
      { date: '2025-01', value: 2.2 }, { date: '2025-02', value: 2.6 }, { date: '2025-03', value: 3.1 },
      { date: '2025-04', value: 3.6 }, { date: '2025-05', value: 4.0 }, { date: '2025-06', value: 4.3 },
      { date: '2025-07', value: 4.5 }, { date: '2025-08', value: 4.2 }, { date: '2025-09', value: 3.8 },
      { date: '2025-10', value: 3.3 }, { date: '2025-11', value: 2.8 }, { date: '2025-12', value: 2.3 },
    ]
  },
];

interface SolarMapProps {
  onZoneSelect: (zone: SolarZone) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showHeatmap?: boolean;
}

export default function SolarMap({ onZoneSelect, searchQuery = '', onSearchChange, showHeatmap = false }: SolarMapProps) {
  const [center, setCenter] = useState<[number, number]>([34.0522, -118.2437]);
  const [zoom, setZoom] = useState(13);
  const [customMarker, setCustomMarker] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync local search with prop
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Filter zones based on search query
  const filteredZones = MOCK_ZONES.filter(zone => 
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.id.includes(searchQuery)
  );

  // Refactored Search Logic
  const performSearch = async (query: string, shouldSelect: boolean = false) => {
    if (!query || query.length < 3) return;

    // 1. Check if it's a coordinate search
    const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
    const match = query.match(coordRegex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[3]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setCenter([lat, lng]);
        setZoom(15);
        setCustomMarker([lat, lng]);
        if (shouldSelect) {
          onZoneSelect({
            id: 'coords',
            name: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
            potential: 'Medium',
            irradiance: undefined,
            area: 250,
            historicalData: MOCK_ZONES[1].historicalData
          });
        }
        return;
      }
    }

    // 2. Check if it's a mock zone search
    const zoneMatch = MOCK_ZONES.find(z => z.name.toLowerCase() === query.toLowerCase());
    if (zoneMatch) {
      setCenter([zoneMatch.lat, zoneMatch.lng]);
      setZoom(14);
      if (shouldSelect) onZoneSelect(zoneMatch);
      return;
    }

    // 3. Global Geocoding Search
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setCenter([newLat, newLng]);
        setZoom(14);
        setCustomMarker([newLat, newLng]);
        if (shouldSelect) {
          onZoneSelect({
            id: 'search-result',
            name: display_name.split(',')[0],
            lat: newLat,
            lng: newLng,
            potential: 'Medium',
            irradiance: undefined,
            area: 300,
            historicalData: MOCK_ZONES[1].historicalData
          });
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search for panning/zooming only
  useEffect(() => {
    if (!localSearch || localSearch.length < 3) return;
    const timer = setTimeout(() => {
      performSearch(localSearch, false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(localSearch, true);
    setShowSuggestions(false);
  };

  // Autocomplete Logic
  useEffect(() => {
    if (!localSearch || localSearch.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const localMatches = MOCK_ZONES.filter(z => 
        z.name.toLowerCase().includes(localSearch.toLowerCase())
      ).map(z => ({
        type: 'zone',
        label: z.name,
        data: z
      }));

      // Check for coordinates
      const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
      const match = localSearch.match(coordRegex);
      const coordMatches = match ? [{
        type: 'coords',
        label: `Coordinates: ${match[1]}, ${match[3]}`,
        lat: parseFloat(match[1]),
        lng: parseFloat(match[3])
      }] : [];

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(localSearch)}&limit=5`);
        const data = await response.json();
        const globalMatches = data.map((item: any) => ({
          type: 'global',
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));

        setSuggestions([...localMatches, ...coordMatches, ...globalMatches]);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([...localMatches, ...coordMatches]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch]);

  const handleSelectSuggestion = (suggestion: any) => {
    setShowSuggestions(false);
    setLocalSearch(suggestion.label);
    onSearchChange?.(suggestion.label);

    if (suggestion.type === 'zone') {
      setCenter([suggestion.data.lat, suggestion.data.lng]);
      setZoom(14);
      onZoneSelect(suggestion.data);
    } else {
      setCenter([suggestion.lat, suggestion.lng]);
      setZoom(14);
      setCustomMarker([suggestion.lat, suggestion.lng]);
      onZoneSelect({
        id: suggestion.type === 'coords' ? 'coords' : 'search-result',
        name: suggestion.label.split(',')[0],
        lat: suggestion.lat,
        lng: suggestion.lng,
        potential: 'Medium',
        irradiance: undefined,
        area: 300,
        historicalData: MOCK_ZONES[1].historicalData
      });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCustomMarker([lat, lng]);
    onZoneSelect({
      id: 'custom',
      name: 'Custom Location',
      lat,
      lng,
      potential: 'Medium',
      irradiance: undefined,
      area: 200,
      historicalData: MOCK_ZONES[1].historicalData
    });
  };

  const handleClearMarkers = () => {
    setCustomMarker(null);
    onZoneSelect(null as any);
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setCenter([latitude, longitude]);
        setZoom(15);
        setCustomMarker([latitude, longitude]);
        onZoneSelect({
          id: 'my-location',
          name: 'My Current Location',
          lat: latitude,
          lng: longitude,
          potential: 'Medium',
          irradiance: undefined,
          area: 200,
          historicalData: MOCK_ZONES[1].historicalData
        });
      }, (error) => {
        console.error('Geolocation error:', error);
      });
    }
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} zoom={zoom} />
        <MapEvents onMapClick={handleMapClick} />
        
        {showHeatmap && (
          <>
            <Circle
              center={center}
              radius={8000}
              pathOptions={{
                fillColor: '#f59e0b',
                color: 'transparent',
                fillOpacity: 0.05,
              }}
            />
            <Circle
              center={center}
              radius={5000}
              pathOptions={{
                fillColor: '#f59e0b',
                color: 'transparent',
                fillOpacity: 0.1,
              }}
            />
            <Circle
              center={center}
              radius={2000}
              pathOptions={{
                fillColor: '#f59e0b',
                color: 'transparent',
                fillOpacity: 0.15,
              }}
            />
          </>
        )}

        {customMarker && (
          <Marker position={customMarker}>
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-slate-900">Custom Analysis Point</h3>
                <p className="text-xs text-slate-500">Click "Analyze Site" to generate report</p>
              </div>
            </Popup>
          </Marker>
        )}

        {filteredZones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={[zone.lat, zone.lng]}
              radius={300}
              pathOptions={{
                fillColor: zone.potential === 'High' ? '#f59e0b' : zone.potential === 'Medium' ? '#fbbf24' : '#fcd34d',
                color: zone.potential === 'High' ? '#d97706' : zone.potential === 'Medium' ? '#b45309' : '#92400e',
                weight: 1,
                fillOpacity: 0.4,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="p-1">
                  <p className="text-[10px] font-bold text-slate-900">{zone.name}</p>
                  <p className="text-[10px] text-slate-500">{zone.irradiance} kWh/m² • {zone.potential}</p>
                </div>
              </Tooltip>
            </Circle>
            <Marker position={[zone.lat, zone.lng]} eventHandlers={{ click: () => onZoneSelect(zone) }}>
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <h3 className="font-bold text-slate-900">{zone.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">Zone ID: {zone.id}</p>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-slate-600 flex justify-between">
                      <span>Potential:</span>
                      <span className={cn(
                        "font-semibold",
                        zone.potential === 'High' ? 'text-orange-600' : 
                        zone.potential === 'Medium' ? 'text-amber-600' : 'text-slate-600'
                      )}>{zone.potential}</span>
                    </p>
                    <p className="text-sm text-slate-600 flex justify-between">
                      <span>Irradiance:</span>
                      <span className="font-medium">{zone.irradiance} kWh/m²</span>
                    </p>
                  </div>

                  <div className="mb-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Historical Trends</h4>
                    <HistoricalIrradianceChart data={zone.historicalData} />
                  </div>

                  <button 
                    onClick={() => onZoneSelect(zone)}
                    className="w-full bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition-all shadow-sm active:scale-95"
                  >
                    Analyze Site Potential
                  </button>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-lg pointer-events-none">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Solar Potential</h4>
        <div className="space-y-1.5">
          <LegendItem color="#f59e0b" label="High (> 6.0 kWh/m²)" />
          <LegendItem color="#fbbf24" label="Medium (4.5 - 6.0)" />
          <LegendItem color="#fcd34d" label="Low (< 4.5)" />
        </div>
      </div>

      {/* Global Search Loading State */}
      {isSearching && (
        <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
          <span className="text-xs font-medium text-slate-600">Searching global database...</span>
        </div>
      )}

      <SearchOverlay 
        value={localSearch} 
        onChange={(val) => {
          setLocalSearch(val);
          onSearchChange?.(val);
          setShowSuggestions(true);
        }} 
        isSearching={isSearching}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        onSelectSuggestion={handleSelectSuggestion}
        onCloseSuggestions={() => setShowSuggestions(false)}
        onOpenSuggestions={() => setShowSuggestions(true)}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Map Controls */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
        <button 
          onClick={handleLocateMe}
          className="p-3 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all group"
          title="Locate Me"
        >
          <Navigation size={20} className="group-hover:text-orange-500 transition-colors" />
        </button>
        {customMarker && (
          <button 
            onClick={handleClearMarkers}
            className="p-3 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 hover:bg-slate-50 transition-all group"
            title="Clear Markers"
          >
            <X size={20} className="group-hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}

function SearchOverlay({ 
  value, 
  onChange, 
  isSearching, 
  suggestions, 
  showSuggestions, 
  onSelectSuggestion,
  onCloseSuggestions,
  onOpenSuggestions,
  onSearchSubmit
}: { 
  value: string, 
  onChange: (val: string) => void, 
  isSearching: boolean,
  suggestions: any[],
  showSuggestions: boolean,
  onSelectSuggestion: (s: any) => void,
  onCloseSuggestions: () => void,
  onOpenSuggestions: () => void,
  onSearchSubmit: () => void
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
      <div className="relative group">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-xl -m-1 opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative bg-white shadow-2xl border border-slate-200 rounded-xl flex items-center p-1">
          <div className="pl-3 pr-2 text-slate-400">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Search className="w-4 h-4" />}
          </div>
          <input 
            type="text"
            placeholder="Search address, coordinates, or zones..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => value.length >= 3 && onOpenSuggestions()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
                onSearchSubmit();
              }
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm py-2 pr-4 text-slate-700 placeholder:text-slate-400"
          />
          {value && (
            <div className="flex items-center">
              <button 
                onClick={() => {
                  onChange('');
                  onCloseSuggestions();
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button 
                className="px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                onClick={onSearchSubmit}
              >
                Search
              </button>
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[1001]"
            >
              <div className="max-h-64 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSelectSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 border-b border-slate-100 last:border-0"
                  >
                    <div className={cn(
                      "mt-0.5 p-1 rounded",
                      s.type === 'zone' ? "bg-orange-100 text-orange-600" :
                      s.type === 'coords' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {s.type === 'zone' ? <Zap size={12} /> : 
                       s.type === 'coords' ? <Globe size={12} /> : <MapIcon size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.label}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {s.type === 'zone' ? 'Solar Zone' : s.type === 'coords' ? 'Coordinates' : 'Global Location'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
    </div>
  );
}
