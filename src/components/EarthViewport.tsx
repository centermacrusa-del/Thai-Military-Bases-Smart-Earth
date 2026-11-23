import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  Camera,
  Compass,
  Crosshair,
  Globe,
  Layers,
  Map as MapIcon,
  Minus,
  Navigation,
  Orbit,
  Plus,
  Radar,
  Ruler,
  Shield,
} from 'lucide-react';
import {
  type BasemapId,
  BRANCH_META,
  CAMBODIA_BORDER_REFS,
  createRadarWedgeGeoJSON,
  createRangeCircleGeoJSON,
  destinationPoint,
  formatDMS,
  type MilitaryBase,
  zoomToAltitudeKm,
} from '../data/bases';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export interface CameraCommand {
  lat: number;
  lng: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
  nonce: number;
}

export interface MeasurePoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface CustomSearchPin {
  lat: number;
  lng: number;
  label: string;
}

export interface RadarMapOverlayState {
  active: boolean;
  center: { lat: number; lng: number };
  radiusKm: number;
  sweepAngle: number;
  detectedIds: string[];
  recentPingIds: string[];
}

interface EarthViewportProps {
  bases: MilitaryBase[];
  selectedBase: MilitaryBase | null;
  highlightedIds: string[];
  onSelectBase: (base: MilitaryBase) => void;
  cameraCommand: CameraCommand | null;
  measureMode: boolean;
  measurePoints: MeasurePoint[];
  onAddMeasurePoint: (pt: { lat: number; lng: number }) => void;
  showRangeRings: boolean;
  showBorderRefs: boolean;
  onToggleBorderRefs: () => void;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
  customPin: CustomSearchPin | null;
  radarState: RadarMapOverlayState;
  onRelocateRadar: (pt: { lat: number; lng: number }) => void;
  streetDropMode: boolean;
  onToggleStreetDropMode: () => void;
  streetViewCoord: { lat: number; lng: number } | null;
  onPickStreetViewPoint: (pt: { lat: number; lng: number }) => void;
}

interface MarkerEntry {
  marker: maplibregl.Marker;
  el: HTMLButtonElement;
  base: MilitaryBase;
  hovered: boolean;
  isSmallCampStyle: boolean;
  lastRenderKey: string;
}

const BASEMAP_OPTIONS: { id: BasemapId; labelKm: string }[] = [
  { id: 'satellite-hybrid', labelKm: 'ផ្កាយរណប + ឈ្មោះ' },
  { id: 'satellite', labelKm: 'ផ្កាយរណបសុទ្ធ' },
  { id: 'topo', labelKm: 'ផែនទីភូមិសាស្ត្រ' },
  { id: 'dark', labelKm: 'ផែនទីងងឹត (រ៉ាដាច្បាស់)' },
];

function buildMasterStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      },
      'esri-reference': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
      },
      'esri-roads': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
      },
      'esri-topo': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Map data &copy; Esri & OpenStreetMap contributors',
      },
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#05080f' },
      },
      {
        id: 'layer-satellite',
        type: 'raster',
        source: 'esri-satellite',
        layout: { visibility: 'visible' },
      },
      {
        id: 'layer-topo',
        type: 'raster',
        source: 'esri-topo',
        layout: { visibility: 'none' },
      },
      {
        id: 'layer-dark',
        type: 'raster',
        source: 'carto-dark',
        layout: { visibility: 'none' },
      },
      {
        id: 'layer-roads',
        type: 'raster',
        source: 'esri-roads',
        paint: { 'raster-opacity': 0.52 },
        layout: { visibility: 'visible' },
      },
      {
        id: 'layer-reference',
        type: 'raster',
        source: 'esri-reference',
        paint: { 'raster-opacity': 0.9 },
        layout: { visibility: 'visible' },
      },
    ],
  };
}

function getBranchSvg(branch: MilitaryBase['branch'], size = 13): string {
  switch (branch) {
    case 'airforce':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;
    case 'navy':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
    case 'hq':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  }
}

// XSS-safe DOM builder for hover popup content
function buildPopupContentNode(base: MilitaryBase, accent: string): HTMLDivElement {
  const meta = BRANCH_META[base.branch];
  const isOsm = base.source === 'osm';
  const isSmallCamp = base.scale === 'camp';
  const scaleLabel = isOsm
    ? 'បន្ទាយតូច (OSM ស្កេនផ្ទាល់)'
    : isSmallCamp
      ? 'បន្ទាយតូច / មណ្ឌលយោធា'
      : meta.labelKm;

  const root = document.createElement('div');
  root.style.minWidth = '170px';
  root.style.maxWidth = '245px';

  const typeEl = document.createElement('div');
  typeEl.style.fontSize = '10.5px';
  typeEl.style.color = accent;
  typeEl.style.fontWeight = '600';
  typeEl.style.marginBottom = '2px';
  typeEl.textContent = scaleLabel;

  const titleEl = document.createElement('div');
  titleEl.style.fontSize = '12.5px';
  titleEl.style.fontWeight = '600';
  titleEl.style.color = '#f8fafc';
  titleEl.style.lineHeight = '1.35';
  titleEl.textContent = base.nameKm;

  const subEl = document.createElement('div');
  subEl.style.fontSize = '11px';
  subEl.style.color = '#94a3b8';
  subEl.style.marginTop = '2px';
  subEl.textContent = `${base.provinceKm} · ${base.lat.toFixed(3)}°N, ${base.lng.toFixed(3)}°E`;

  root.appendChild(typeEl);
  root.appendChild(titleEl);
  root.appendChild(subEl);
  return root;
}

function applyMarkerVisualState(
  entry: MarkerEntry,
  opts: {
    isSelected: boolean;
    isHighlighted: boolean;
    radarActive: boolean;
    isRadarDetected: boolean;
    isRecentPing: boolean;
  }
) {
  const { base, el, hovered } = entry;
  const meta = BRANCH_META[base.branch];
  const isSmallCamp = base.scale === 'camp';
  const isOsm = base.source === 'osm';
  const accent = isOsm ? '#F59E0B' : isSmallCamp && opts.radarActive ? '#34D399' : meta.color;
  const dimInRadar = opts.radarActive && !opts.isRadarDetected && !opts.isSelected;
  const useDiamond = isSmallCamp && !opts.isSelected;

  const renderKey = `${opts.isSelected ? 1 : 0}|${opts.isHighlighted ? 1 : 0}|${opts.radarActive ? 1 : 0}|${
    opts.isRadarDetected ? 1 : 0
  }|${opts.isRecentPing ? 1 : 0}|${hovered ? 1 : 0}`;
  if (entry.lastRenderKey === renderKey) return;
  entry.lastRenderKey = renderKey;
  entry.isSmallCampStyle = useDiamond;

  if (useDiamond) {
    const dimSize = opts.isRecentPing ? '20px' : opts.isRadarDetected ? '16px' : '14px';
    el.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${dimSize};
      height: ${dimSize};
      border-radius: 3px;
      transform: rotate(45deg) scale(${hovered ? '1.22' : '1'});
      background: ${opts.isRecentPing ? accent : opts.isRadarDetected ? 'rgba(6, 18, 28, 0.92)' : 'rgba(7, 11, 20, 0.72)'};
      border: ${opts.isRecentPing ? '2px solid #ffffff' : `1.6px solid ${accent}`};
      opacity: ${dimInRadar ? '0.32' : '1'};
      box-shadow: ${
        opts.isRecentPing
          ? `0 0 0 7px ${accent}48, 0 0 14px ${accent}`
          : opts.isRadarDetected
            ? `0 0 0 3px ${accent}28, 0 2px 8px rgba(0,0,0,0.6)`
            : '0 2px 6px rgba(0,0,0,0.5)'
      };
      cursor: pointer;
      transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease;
    `;
    el.innerHTML = `<span style="width:5px;height:5px;border-radius:9999px;background:${
      opts.isRecentPing ? '#05080f' : accent
    };pointer-events:none;"></span>`;
  } else {
    const sizePx = opts.isSelected ? '34px' : opts.isHighlighted || opts.isRecentPing ? '28px' : '24px';
    el.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${sizePx};
      height: ${sizePx};
      border-radius: ${base.branch === 'hq' ? '6px' : '9999px'};
      transform: scale(${hovered ? '1.16' : '1'});
      background: ${opts.isSelected ? accent : 'rgba(7, 11, 20, 0.9)'};
      color: ${opts.isSelected ? '#05080f' : accent};
      border: ${opts.isSelected ? '2.5px solid #ffffff' : opts.isRecentPing ? '2px solid #67e8f9' : `1.5px solid ${accent}`};
      opacity: ${dimInRadar ? '0.34' : '1'};
      box-shadow: ${
        opts.isSelected
          ? `0 0 0 6px ${accent}42, 0 6px 18px rgba(0,0,0,0.65)`
          : opts.isRecentPing
            ? '0 0 0 6px rgba(34,211,238,0.38), 0 4px 12px rgba(0,0,0,0.6)'
            : '0 3px 10px rgba(0,0,0,0.55)'
      };
      cursor: pointer;
      transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease;
    `;
    el.innerHTML = getBranchSvg(base.branch, opts.isSelected ? 15 : 12);
  }
}

export default function EarthViewport({
  bases,
  selectedBase,
  highlightedIds,
  onSelectBase,
  cameraCommand,
  measureMode,
  measurePoints,
  onAddMeasurePoint,
  showRangeRings,
  showBorderRefs,
  onToggleBorderRefs,
  isOrbiting,
  onToggleOrbit,
  customPin,
  radarState,
  onRelocateRadar,
  streetDropMode,
  onToggleStreetDropMode,
  streetViewCoord,
  onPickStreetViewPoint,
}: EarthViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const borderMarkersRef = useRef<maplibregl.Marker[]>([]);
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  const customMarkerRef = useRef<maplibregl.Marker | null>(null);
  const radarOriginMarkerRef = useRef<maplibregl.Marker | null>(null);
  const streetMarkerRef = useRef<maplibregl.Marker | null>(null);
  const orbitFrameRef = useRef<number | null>(null);
  const lastMouseTelemetryRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>('satellite-hybrid');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [isGlobe, setIsGlobe] = useState(true);
  const [telemetry, setTelemetry] = useState({
    cursorLat: 13.7563,
    cursorLng: 100.5018,
    zoom: 5.2,
    pitch: 24,
    bearing: 0,
    altitudeKm: 1850,
  });

  // Refs to keep map event listeners fresh
  const measureModeRef = useRef(measureMode);
  measureModeRef.current = measureMode;
  const streetDropModeRef = useRef(streetDropMode);
  streetDropModeRef.current = streetDropMode;
  const streetActiveRef = useRef(Boolean(streetViewCoord));
  streetActiveRef.current = Boolean(streetViewCoord);
  const radarActiveRef = useRef(radarState.active);
  radarActiveRef.current = radarState.active;
  const onAddMeasurePointRef = useRef(onAddMeasurePoint);
  onAddMeasurePointRef.current = onAddMeasurePoint;
  const onPickStreetViewPointRef = useRef(onPickStreetViewPoint);
  onPickStreetViewPointRef.current = onPickStreetViewPoint;
  const onRelocateRadarRef = useRef(onRelocateRadar);
  onRelocateRadarRef.current = onRelocateRadar;
  const onSelectBaseRef = useRef(onSelectBase);
  onSelectBaseRef.current = onSelectBase;
  const isOrbitingRef = useRef(isOrbiting);
  isOrbitingRef.current = isOrbiting;
  const onToggleOrbitRef = useRef(onToggleOrbit);
  onToggleOrbitRef.current = onToggleOrbit;

  // Close layer menu on outside click or Escape
  useEffect(() => {
    if (!layerMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (layerMenuWrapRef.current && !layerMenuWrapRef.current.contains(e.target as Node)) {
        setLayerMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayerMenuOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [layerMenuOpen]);

  // Initialize MapLibre 3D Globe
  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildMasterStyle(),
        center: [101.25, 13.45],
        zoom: 5.2,
        pitch: 24,
        bearing: 0,
        maxPitch: 75,
        attributionControl: false,
      });
    } catch (err) {
      console.error('MapLibre init error:', err);
      setWebglError('កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ WebGL សម្រាប់ផែនទី 3D ទេ។');
      return;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    hoverPopupRef.current = new maplibregl.Popup({
      offset: 16,
      closeButton: false,
      closeOnClick: false,
    });

    const canvas = map.getCanvas();
    const handleContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError('ការបង្ហាញ WebGL 3D ត្រូវបានផ្អាកបណ្តោះអាសន្ន។ សូមផ្ទុកទំព័រឡើងវិញ។');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        // Fallback smoothly to mercator if globe projection unavailable
      }

      // 1. Live Geodesic Radar Concentric Rings Source & Layers
      map.addSource('radar-rings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'radar-rings-fill',
        type: 'fill',
        source: 'radar-rings',
        paint: {
          'fill-color': '#10B981',
          'fill-opacity': 0.04,
        },
      });

      map.addLayer({
        id: 'radar-rings-line',
        type: 'line',
        source: 'radar-rings',
        paint: {
          'line-color': '#34D399',
          'line-width': 1.2,
          'line-dasharray': [3, 3],
          'line-opacity': 0.65,
        },
      });

      // 2. Live Rotating Radar Sweep Wedge Source & Layer
      map.addSource('radar-wedge', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'radar-wedge-fill',
        type: 'fill',
        source: 'radar-wedge',
        paint: {
          'fill-color': '#10B981',
          'fill-opacity': 0.2,
        },
      });

      // 3. Leading Radar Sweep Beam Line
      map.addSource('radar-beam', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'radar-beam-glow',
        type: 'line',
        source: 'radar-beam',
        paint: {
          'line-color': '#22D3EE',
          'line-width': 5,
          'line-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'radar-beam-core',
        type: 'line',
        source: 'radar-beam',
        paint: {
          'line-color': '#67E8F9',
          'line-width': 2,
          'line-opacity': 0.95,
        },
      });

      // 4. Selected Base Geodesic Range Rings
      map.addSource('range-rings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'range-rings-fill',
        type: 'fill',
        source: 'range-rings',
        paint: {
          'fill-color': '#06B6D4',
          'fill-opacity': 0.05,
        },
      });

      map.addLayer({
        id: 'range-rings-line',
        type: 'line',
        source: 'range-rings',
        paint: {
          'line-color': '#22D3EE',
          'line-width': 1.4,
          'line-dasharray': [4, 3],
          'line-opacity': 0.85,
        },
      });

      // 5. Measure Path GeoJSON
      map.addSource('measure-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'measure-line-glow',
        type: 'line',
        source: 'measure-line',
        paint: {
          'line-color': '#06B6D4',
          'line-width': 6,
          'line-opacity': 0.25,
        },
      });

      map.addLayer({
        id: 'measure-line-core',
        type: 'line',
        source: 'measure-line',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 2.2,
          'line-dasharray': [2, 1.5],
        },
      });

      setMapReady(true);
    });

    const updateCameraTelemetry = () => {
      const center = map.getCenter();
      const z = map.getZoom();
      setTelemetry((prev) => ({
        ...prev,
        zoom: z,
        pitch: Math.round(map.getPitch()),
        bearing: Math.round(((map.getBearing() % 360) + 360) % 360),
        altitudeKm: zoomToAltitudeKm(z, center.lat),
      }));
    };

    map.on('move', updateCameraTelemetry);
    map.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      const now = performance.now();
      if (now - lastMouseTelemetryRef.current < 60) return;
      lastMouseTelemetryRef.current = now;
      setTelemetry((prev) => ({
        ...prev,
        cursorLat: e.lngLat.lat,
        cursorLng: e.lngLat.lng,
      }));
    });

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      if (measureModeRef.current) {
        onAddMeasurePointRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (streetDropModeRef.current || streetActiveRef.current) {
        onPickStreetViewPointRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      if (radarActiveRef.current) {
        onRelocateRadarRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    map.on('dragstart', () => {
      if (isOrbitingRef.current) {
        onToggleOrbitRef.current();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      resizeObserver.disconnect();
      if (orbitFrameRef.current) cancelAnimationFrame(orbitFrameRef.current);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      borderMarkersRef.current.forEach((m) => m.remove());
      borderMarkersRef.current = [];
      measureMarkersRef.current.forEach((m) => m.remove());
      measureMarkersRef.current = [];
      customMarkerRef.current?.remove();
      customMarkerRef.current = null;
      radarOriginMarkerRef.current?.remove();
      radarOriginMarkerRef.current = null;
      streetMarkerRef.current?.remove();
      streetMarkerRef.current = null;
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch basemap visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const setVis = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVis('layer-satellite', basemap === 'satellite-hybrid' || basemap === 'satellite');
    setVis('layer-roads', basemap === 'satellite-hybrid');
    setVis('layer-reference', basemap === 'satellite-hybrid');
    setVis('layer-topo', basemap === 'topo');
    setVis('layer-dark', basemap === 'dark');
  }, [basemap, mapReady]);

  // Toggle 3D Globe vs Flat 2D
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    try {
      map.setProjection({ type: isGlobe ? 'globe' : 'mercator' });
    } catch {
      // Ignore
    }
  }, [isGlobe, mapReady]);

  // Execute external camera flyTo commands with bounds protection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !cameraCommand) return;
    if (
      !Number.isFinite(cameraCommand.lat) ||
      !Number.isFinite(cameraCommand.lng) ||
      !Number.isFinite(cameraCommand.zoom)
    ) {
      return;
    }

    map.flyTo({
      center: [cameraCommand.lng, cameraCommand.lat],
      zoom: Math.max(2, Math.min(18.5, cameraCommand.zoom)),
      pitch: Math.max(0, Math.min(75, cameraCommand.pitch ?? 45)),
      bearing: cameraCommand.bearing ?? 0,
      duration: 1350,
      essential: true,
    });
  }, [cameraCommand, mapReady]);

  // 3D Orbit animation loop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!isOrbiting) {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const animateOrbit = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      if (mapRef.current && !document.hidden) {
        const nextBearing = (mapRef.current.getBearing() + dt * 14) % 360;
        mapRef.current.setBearing(nextBearing);
      }
      orbitFrameRef.current = requestAnimationFrame(animateOrbit);
    };

    orbitFrameRef.current = requestAnimationFrame(animateOrbit);

    return () => {
      if (orbitFrameRef.current) {
        cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
  }, [isOrbiting, mapReady]);

  // Update Geodesic Radar Concentric Rings & Origin Marker (when center/radius/active changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const ringSrc = map.getSource('radar-rings') as maplibregl.GeoJSONSource | undefined;
    if (ringSrc) {
      if (!radarState.active) {
        ringSrc.setData({ type: 'FeatureCollection', features: [] });
      } else {
        const { lng, lat } = radarState.center;
        const r = radarState.radiusKm;
        ringSrc.setData({
          type: 'FeatureCollection',
          features: [
            createRangeCircleGeoJSON(lng, lat, r * 0.25, 64),
            createRangeCircleGeoJSON(lng, lat, r * 0.5, 64),
            createRangeCircleGeoJSON(lng, lat, r * 0.75, 64),
            createRangeCircleGeoJSON(lng, lat, r, 80),
          ],
        });
      }
    }

    if (radarOriginMarkerRef.current) {
      radarOriginMarkerRef.current.remove();
      radarOriginMarkerRef.current = null;
    }

    if (radarState.active) {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        border: 2px solid #22D3EE;
        background: rgba(6, 182, 212, 0.3);
        box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.16);
        pointer-events: none;
      `;
      radarOriginMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([radarState.center.lng, radarState.center.lat])
        .addTo(map);
    }
  }, [radarState.active, radarState.center.lat, radarState.center.lng, radarState.radiusKm, mapReady]);

  // Update Rotating Radar Sweep Wedge & Leading Beam on the 3D Earth Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const wedgeSrc = map.getSource('radar-wedge') as maplibregl.GeoJSONSource | undefined;
    const beamSrc = map.getSource('radar-beam') as maplibregl.GeoJSONSource | undefined;

    if (!radarState.active) {
      wedgeSrc?.setData({ type: 'FeatureCollection', features: [] });
      beamSrc?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const { lng, lat } = radarState.center;
    const r = radarState.radiusKm;
    const tip = destinationPoint(lat, lng, r, radarState.sweepAngle);

    wedgeSrc?.setData({
      type: 'FeatureCollection',
      features: [createRadarWedgeGeoJSON(lng, lat, r, radarState.sweepAngle, 36, 16)],
    });

    beamSrc?.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[lng, lat], tip],
          },
        },
      ],
    });
  }, [
    radarState.active,
    radarState.center.lat,
    radarState.center.lng,
    radarState.radiusKm,
    radarState.sweepAngle,
    mapReady,
  ]);

  // Step 1: Persistent Marker Lifecycle (diff only when visible `bases` list changes — zero 24Hz DOM churn!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const nextIds = new Set(bases.map((b) => b.id));

    // Remove markers no longer in `bases`
    for (const [id, entry] of markersRef.current.entries()) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add newly visible markers
    for (const base of bases) {
      if (markersRef.current.has(base.id)) {
        const existing = markersRef.current.get(base.id)!;
        existing.base = base;
        continue;
      }

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', base.nameKm);

      const entry: MarkerEntry = {
        marker: new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([base.lng, base.lat])
          .addTo(map),
        el,
        base,
        hovered: false,
        isSmallCampStyle: base.scale === 'camp',
        lastRenderKey: '',
      };

      el.addEventListener('mouseenter', () => {
        entry.hovered = true;
        el.style.transform = entry.isSmallCampStyle ? 'rotate(45deg) scale(1.22)' : 'scale(1.16)';
        const current = entry.base;
        const accent =
          current.source === 'osm'
            ? '#F59E0B'
            : current.scale === 'camp' && radarActiveRef.current
              ? '#34D399'
              : BRANCH_META[current.branch].color;
        hoverPopupRef.current
          ?.setLngLat([current.lng, current.lat])
          .setDOMContent(buildPopupContentNode(current, accent))
          .addTo(map);
      });

      el.addEventListener('mouseleave', () => {
        entry.hovered = false;
        el.style.transform = entry.isSmallCampStyle ? 'rotate(45deg) scale(1)' : 'scale(1)';
        hoverPopupRef.current?.remove();
      });

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (measureModeRef.current) {
          onAddMeasurePointRef.current({ lat: entry.base.lat, lng: entry.base.lng });
          return;
        }
        hoverPopupRef.current?.remove();
        onSelectBaseRef.current(entry.base);
      });

      markersRef.current.set(base.id, entry);
    }
  }, [bases, mapReady]);

  // Step 2: Fast In-Place Marker Visual Styling (selection, AI highlights, radar detection & pings)
  useEffect(() => {
    if (!mapReady) return;

    const highlightSet = new Set(highlightedIds);
    const detectedSet = new Set(radarState.detectedIds);
    const recentPingSet = new Set(radarState.recentPingIds);

    for (const [id, entry] of markersRef.current.entries()) {
      applyMarkerVisualState(entry, {
        isSelected: selectedBase?.id === id,
        isHighlighted: highlightSet.has(id),
        radarActive: radarState.active,
        isRadarDetected: radarState.active && detectedSet.has(id),
        isRecentPing: radarState.active && recentPingSet.has(id),
      });
    }
  }, [
    bases,
    selectedBase?.id,
    highlightedIds,
    radarState.active,
    radarState.detectedIds,
    radarState.recentPingIds,
    mapReady,
  ]);

  // Render Cambodia-Thailand border reference markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    borderMarkersRef.current.forEach((m) => m.remove());
    borderMarkersRef.current = [];

    if (!showBorderRefs) return;

    CAMBODIA_BORDER_REFS.forEach((refPt) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(251, 191, 36, 0.55);
        color: #fde68a;
        font-size: 10.5px;
        font-weight: 500;
        white-space: nowrap;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      `;
      el.textContent = refPt.nameKm;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (measureModeRef.current) {
          onAddMeasurePointRef.current({ lat: refPt.lat, lng: refPt.lng });
        } else if (radarActiveRef.current) {
          onRelocateRadarRef.current({ lat: refPt.lat, lng: refPt.lng });
        } else {
          map.flyTo({ center: [refPt.lng, refPt.lat], zoom: 11, pitch: 40, duration: 1200 });
        }
      });

      const m = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([refPt.lng, refPt.lat])
        .addTo(map);
      borderMarkersRef.current.push(m);
    });
  }, [showBorderRefs, mapReady]);

  // Update geodesic range rings for selected base
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource('range-rings') as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    if (!selectedBase || !showRangeRings) {
      src.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    src.setData({
      type: 'FeatureCollection',
      features: [
        createRangeCircleGeoJSON(selectedBase.lng, selectedBase.lat, 50),
        createRangeCircleGeoJSON(selectedBase.lng, selectedBase.lat, 150),
        createRangeCircleGeoJSON(selectedBase.lng, selectedBase.lat, 300),
      ],
    });
  }, [selectedBase, showRangeRings, mapReady]);

  // Update measurement path & pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    measureMarkersRef.current.forEach((m) => m.remove());
    measureMarkersRef.current = [];

    const src = map.getSource('measure-line') as maplibregl.GeoJSONSource | undefined;
    if (src) {
      if (measurePoints.length >= 2) {
        src.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: measurePoints.map((p) => [p.lng, p.lat]),
              },
            },
          ],
        });
      } else {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    measurePoints.forEach((pt, idx) => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: #06B6D4;
        color: #041019;
        border: 2px solid #ffffff;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.6);
      `;
      el.textContent = String(idx + 1);
      const m = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);
      measureMarkersRef.current.push(m);
    });
  }, [measurePoints, mapReady]);

  // Render custom geocoded search pin (XSS-safe DOM nodes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (customMarkerRef.current) {
      customMarkerRef.current.remove();
      customMarkerRef.current = null;
    }

    if (!customPin) return;

    const el = document.createElement('div');
    el.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
    `;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `
      padding: 3px 8px;
      border-radius: 6px;
      background: #0d131f;
      border: 1px solid #38bdf8;
      color: #e0f2fe;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    `;
    labelEl.textContent = customPin.label;

    const dotEl = document.createElement('div');
    dotEl.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 9999px;
      background: #38bdf8;
      border: 2px solid #fff;
      box-shadow: 0 0 0 5px rgba(56,189,248,0.3);
    `;

    el.appendChild(labelEl);
    el.appendChild(dotEl);

    customMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([customPin.lng, customPin.lat])
      .addTo(map);
  }, [customPin, mapReady]);

  // Render active Street View camera pin on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (streetMarkerRef.current) {
      streetMarkerRef.current.remove();
      streetMarkerRef.current = null;
    }

    if (!streetViewCoord) return;

    const el = document.createElement('div');
    el.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #06B6D4;
      color: #041019;
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 0 8px rgba(6, 182, 212, 0.28), 0 4px 14px rgba(0, 0, 0, 0.65);
      pointer-events: none;
    `;
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

    streetMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([streetViewCoord.lng, streetViewCoord.lat])
      .addTo(map);
  }, [streetViewCoord?.lat, streetViewCoord?.lng, mapReady]);

  const handleZoomIn = () => mapRef.current?.zoomIn({ duration: 250 });
  const handleZoomOut = () => mapRef.current?.zoomOut({ duration: 250 });
  const handleResetNorth = () => {
    mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  };
  const handleToggle3DTilt = () => {
    const map = mapRef.current;
    if (!map) return;
    const nextPitch = map.getPitch() > 20 ? 0 : 58;
    map.easeTo({ pitch: nextPitch, duration: 550 });
  };

  if (webglError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#07090E] text-slate-300 p-8 text-center">
        <div className="max-w-md border border-slate-800 bg-[#0D131F] rounded-xl p-6 space-y-3">
          <Globe className="w-8 h-8 text-cyan-400 mx-auto" />
          <p className="text-sm font-medium">{webglError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            ផ្ទុកឡើងវិញ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex-1 h-full w-full overflow-hidden bg-[#05080F] ${
        measureMode || radarState.active || streetDropMode || Boolean(streetViewCoord)
          ? 'cursor-crosshair'
          : ''
      }`}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* Active Mode Banner (Measure / Street View Drop / Radar Sweep HUD) */}
      {measureMode ? (
        <div className="pointer-events-none absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0B111C]/92 border border-cyan-500/50 text-xs text-cyan-100 shadow-lg max-w-[90%]">
          <Ruler className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">ចុចលើផែនទី ឬបន្ទាយណាមួយ ដើម្បីវាស់ចម្ងាយ និងទិសដៅ</span>
        </div>
      ) : streetDropMode || streetViewCoord ? (
        <div className="pointer-events-none absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0B111C]/92 border border-cyan-500/50 text-xs text-cyan-100 shadow-lg backdrop-blur-md max-w-[90%]">
          <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">ចុចលើផ្លូវ ឬទីតាំងណាមួយលើផែនទី ដើម្បីបើក Street View 4K ភ្លាមៗ</span>
        </div>
      ) : radarState.active ? (
        <div className="pointer-events-none absolute top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-[#071018]/90 border border-emerald-500/40 text-xs text-slate-100 shadow-lg backdrop-blur-md">
          <Radar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap">
            រ៉ាដាកំពុងស្កេនរង្វង់ <span className="font-mono-tabular text-emerald-300">{radarState.radiusKm} km</span>
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono-tabular text-cyan-300 whitespace-nowrap">
            {String(Math.round(radarState.sweepAngle) % 360).padStart(3, '0')}°
          </span>
        </div>
      ) : null}

      {/* Bottom-Left Live Instrument Coordinate & Altitude Readout */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-4 px-3.5 py-2 rounded-lg bg-[#070B13]/85 border border-slate-800/90 backdrop-blur-md text-[11px] text-slate-300 font-mono-tabular shadow-lg">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-100">
            {formatDMS(telemetry.cursorLat, true)} · {formatDMS(telemetry.cursorLng, false)}
          </span>
        </div>
        <span className="text-slate-600" aria-hidden="true">
          |
        </span>
        <div>
          <span className="text-slate-400 mr-1">កម្ពស់</span>
          <span className="text-slate-100">
            {telemetry.altitudeKm >= 10
              ? `${telemetry.altitudeKm.toFixed(0)} km`
              : `${(telemetry.altitudeKm * 1000).toFixed(0)} m`}
          </span>
        </div>
        <span className="text-slate-600 hidden md:inline" aria-hidden="true">
          |
        </span>
        <div className="hidden md:block">
          <span className="text-slate-400 mr-1">ផ្អៀង</span>
          <span className="text-slate-100">{telemetry.pitch}°</span>
        </div>
      </div>

      {/* Bottom-Right Google Earth Control Stack */}
      <div ref={layerMenuWrapRef} className="absolute bottom-8 right-3 z-20 flex flex-col items-end gap-2">
        {layerMenuOpen && (
          <div className="w-56 rounded-xl bg-[#0B111C]/95 border border-slate-800 p-2 shadow-2xl backdrop-blur-md">
            <div className="px-2 py-1 text-[11px] font-medium text-slate-400">
              ស្រទាប់ផែនទីផ្កាយរណប
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {BASEMAP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setBasemap(opt.id);
                    setLayerMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                    basemap === opt.id
                      ? 'bg-cyan-500/15 text-cyan-300 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  {opt.labelKm}
                </button>
              ))}
            </div>
            <div className="my-2 border-t border-slate-800" />
            <button
              type="button"
              onClick={onToggleBorderRefs}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                showBorderRefs
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                ចំណុចព្រំដែនកម្ពុជា-ថៃ
              </span>
              <span className="font-mono-tabular text-[10px]">{showBorderRefs ? 'បើក' : 'បិទ'}</span>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-1.5 bg-[#0B111C]/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={onToggleStreetDropMode}
            title="ដាក់កាមេរ៉ា Street View 4K លើផ្លូវ"
            aria-label="ដាក់កាមេរ៉ា Street View 4K លើផ្លូវ"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              streetDropMode || Boolean(streetViewCoord)
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsGlobe((v) => !v)}
            title={isGlobe ? 'ប្តូរទៅផែនទីរាប 2D' : 'ប្តូរទៅភពផែនដី 3D Globe'}
            aria-label={isGlobe ? 'ប្តូរទៅផែនទីរាប 2D' : 'ប្តូរទៅភពផែនដី 3D Globe'}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isGlobe
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isGlobe ? <Globe className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleToggle3DTilt}
            title="ផ្អៀងកាមេរ៉ា 3D / មើលពីលើ 2D"
            aria-label="ផ្អៀងកាមេរ៉ា 3D ឬមើលពីលើ 2D"
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-mono-tabular font-semibold transition-colors ${
              telemetry.pitch > 20
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            3D
          </button>

          {selectedBase && (
            <button
              type="button"
              onClick={onToggleOrbit}
              title="ហោះវិលជុំ 360°"
              aria-label="ហោះវិលជុំ 360°"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                isOrbiting
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Orbit className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleResetNorth}
            title="តម្រង់ទិសខាងជើង"
            aria-label="តម្រង់ទិសខាងជើង"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Compass
              className="w-4 h-4 transition-transform duration-150"
              style={{ transform: `rotate(${-telemetry.bearing}deg)` }}
            />
          </button>

          <div className="h-px bg-slate-800 my-0.5" />

          <button
            type="button"
            onClick={handleZoomIn}
            title="ពង្រីក"
            aria-label="ពង្រីកផែនទី"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="បង្រួម"
            aria-label="បង្រួមផែនទី"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="h-px bg-slate-800 my-0.5" />

          <button
            type="button"
            onClick={() => setLayerMenuOpen((v) => !v)}
            title="ជ្រើសរើសស្រទាប់ផែនទី"
            aria-label="ជ្រើសរើសស្រទាប់ផែនទី"
            aria-expanded={layerMenuOpen}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              layerMenuOpen
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Top-Right Map Legend */}
      <div className="hidden xl:flex items-center gap-3.5 absolute top-3 right-3 z-10 px-3.5 py-2 rounded-lg bg-[#070B13]/82 border border-slate-800/85 backdrop-blur-md text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="w-2.5 h-2.5 inline-block shrink-0 bg-emerald-400"
            style={{ transform: 'rotate(45deg)', borderRadius: '1px' }}
          />
          <span>បន្ទាយតូច</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-emerald-500" />
          <span>ជើងគោក</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-sky-400" />
          <span>អាកាស</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-blue-400" />
          <span>ជើងទឹក</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0 bg-amber-400" />
          <span>កំពូល / OSM</span>
        </div>
        <span className="text-slate-700" aria-hidden="true">
          |
        </span>
        <div className="flex items-center gap-1 text-slate-400">
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span className="font-mono-tabular">{bases.length} ទីតាំង</span>
        </div>
      </div>
    </div>
  );
}
