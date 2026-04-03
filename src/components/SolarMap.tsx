import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '../lib/utils';
import { HistoricalIrradianceChart } from './Charts';
import { Loader2 } from 'lucide-react';

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
  irradiance: number; // kWh/m2/day
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
  showHeatmap?: boolean;
}

export default function SolarMap({ onZoneSelect, searchQuery = '', showHeatmap = false }: SolarMapProps) {
  const [center, setCenter] = useState<[number, number]>([34.0522, -118.2437]);
  const [zoom, setZoom] = useState(13);
  const [customMarker, setCustomMarker] = useState<[number, number] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Filter zones based on search query
  const filteredZones = MOCK_ZONES.filter(zone => 
    zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    zone.id.includes(searchQuery)
  );

  // Global Search Logic using Nominatim
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) return;

    const timer = setTimeout(async () => {
      // 1. Check if it's a coordinate search
      const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
      const match = searchQuery.match(coordRegex);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[3]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setCenter([lat, lng]);
          setZoom(15);
          return;
        }
      }

      // 2. Check if it's a mock zone search
      if (filteredZones.length === 1) {
        setCenter([filteredZones[0].lat, filteredZones[0].lng]);
        setZoom(14);
        return;
      }

      // 3. Global Geocoding Search
      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setCenter([parseFloat(lat), parseFloat(lon)]);
          setZoom(14);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 1000); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMapClick = (lat: number, lng: number) => {
    setCustomMarker([lat, lng]);
    onZoneSelect({
      id: 'custom',
      name: 'Custom Location',
      lat,
      lng,
      potential: 'Medium',
      irradiance: 5.0,
      area: 200,
      historicalData: MOCK_ZONES[1].historicalData
    });
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
          <Circle
            center={center}
            radius={5000}
            pathOptions={{
              fillColor: '#f59e0b',
              color: 'transparent',
              fillOpacity: 0.1,
            }}
          />
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
            />
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
