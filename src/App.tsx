import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe,
  Loader2,
  MapPin,
  Radar,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import EarthViewport, {
  type CameraCommand,
  type CustomSearchPin,
  type MeasurePoint,
} from './components/EarthViewport';
import BaseInspector from './components/BaseInspector';
import SmartAISearchPanel, { type AISearchResult } from './components/SmartAISearchPanel';
import RadarScanPanel, { type RadarDetection } from './components/RadarScanPanel';
import RadarDetectionCard from './components/RadarDetectionCard';
import StreetViewStudio, { type StreetViewLocation } from './components/StreetViewStudio';
import ThermalOrdnanceScanner from './components/ThermalOrdnanceScanner';
import {
  bearingDegrees,
  bearingToCompassKm,
  BRANCH_META,
  type BranchType,
  getNearestCambodiaBorder,
  haversineKm,
  type MilitaryBase,
  RADAR_PRESETS,
  type RadarPreset,
  type RadarTargetFilter,
  REGION_META,
  type RegionType,
  THAI_MILITARY_BASES,
} from './data/bases';

type SidebarTab = 'radar' | 'catalog' | 'ai';
type SortMode = 'border' | 'name' | 'north';

interface GeocodePlace {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string;
}

function angleInSweepArc(prevDeg: number, nextDeg: number, targetDeg: number): boolean {
  const normPrev = ((prevDeg % 360) + 360) % 360;
  const normNext = ((nextDeg % 360) + 360) % 360;
  const normTarget = ((targetDeg % 360) + 360) % 360;

  if (normPrev <= normNext) {
    return normTarget >= normPrev && normTarget <= normNext;
  }
  // Wrapped past 360 -> 0
  return normTarget >= normPrev || normTarget <= normNext;
}

function angularLagBehindBeam(beamDeg: number, targetDeg: number): number {
  return (((beamDeg - targetDeg) % 360) + 360) % 360;
}

function matchesTargetFilter(base: MilitaryBase, filter: RadarTargetFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'fighter') return Boolean(base.isFighterBase);
  return base.scale === filter;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('radar');

  // Catalog search & filters
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<BranchType | 'all'>('all');
  const [scaleFilterCatalog, setScaleFilterCatalog] = useState<RadarTargetFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('border');

  // Radar scanner state (default active, sweeping all of Thailand focusing on F-16 & fighter jet bases)
  const [radarActive, setRadarActive] = useState(true);
  const [radarScanning, setRadarScanning] = useState(true);
  const [activePresetId, setActivePresetId] = useState<string>('all-thailand');
  const [radarCenter, setRadarCenter] = useState({ lat: 13.45, lng: 101.25 });
  const [radarRadiusKm, setRadarRadiusKm] = useState(820);
  const [radarScaleFilter, setRadarScaleFilter] = useState<RadarTargetFilter>('fighter');
  const [sweepAngle, setSweepAngle] = useState(0);
  const [detectedIds, setDetectedIds] = useState<string[]>([]);
  const [radarCardTargetId, setRadarCardTargetId] = useState<string | null>(null);
  const [radarCardDismissed, setRadarCardDismissed] = useState(false);
  const lastRadarCardAutoSwitchRef = useRef(0);

  // Live OpenStreetMap discovered small camps
  const [osmSites, setOsmSites] = useState<MilitaryBase[]>([]);
  const [osmScanning, setOsmScanning] = useState(false);
  const [osmError, setOsmError] = useState<string | null>(null);

  // Selection, AI, camera, measurement
  const [selectedBase, setSelectedBase] = useState<MilitaryBase | null>(null);
  const [aiResult, setAiResult] = useState<AISearchResult | null>(null);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);

  const [showRangeRings, setShowRangeRings] = useState(false);
  const [showBorderRefs, setShowBorderRefs] = useState(true);
  const [isOrbiting, setIsOrbiting] = useState(false);

  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);

  // Street View 4K Studio state
  const [streetViewLocation, setStreetViewLocation] = useState<StreetViewLocation | null>(null);
  const [streetSplitMode, setStreetSplitMode] = useState(true);
  const [streetDropMode, setStreetDropMode] = useState(false);

  // FLIR Thermal & Public Arsenal Infrastructure Scanner modal state
  const [thermalScanBase, setThermalScanBase] = useState<MilitaryBase | null>(null);

  // OpenStreetMap Nominatim geocoding for any Thai location
  const [geocodeResults, setGeocodeResults] = useState<GeocodePlace[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [customPin, setCustomPin] = useState<CustomSearchPin | null>(null);

  const osmAbortRef = useRef<AbortController | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      osmAbortRef.current?.abort();
      geocodeAbortRef.current?.abort();
    };
  }, []);

  // Global Escape key handler to cleanly exit active tool modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (measureMode) {
        setMeasureMode(false);
        setMeasurePoints([]);
      } else if (streetDropMode) {
        setStreetDropMode(false);
      } else if (streetViewLocation && !document.fullscreenElement) {
        setStreetViewLocation(null);
      } else if (selectedBase) {
        setSelectedBase(null);
        setIsOrbiting(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [measureMode, streetDropMode, streetViewLocation, selectedBase]);

  // Combine verified catalog installations + any live OSM discovered small camps
  const allBases = useMemo(() => {
    if (osmSites.length === 0) return THAI_MILITARY_BASES;
    return [...THAI_MILITARY_BASES, ...osmSites];
  }, [osmSites]);

  // Compute all candidate installations inside current radar radius & scale filter
  const radarCandidates = useMemo(() => {
    return allBases
      .filter((b) => matchesTargetFilter(b, radarScaleFilter))
      .map((base) => {
        const distanceKm = haversineKm(radarCenter.lat, radarCenter.lng, base.lat, base.lng);
        const bearingDeg = bearingDegrees(radarCenter.lat, radarCenter.lng, base.lat, base.lng);
        return { base, distanceKm, bearingDeg };
      })
      .filter((item) => item.distanceKm <= radarRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [allBases, radarCenter.lat, radarCenter.lng, radarRadiusKm, radarScaleFilter]);

  const radarCandidatesRef = useRef(radarCandidates);
  radarCandidatesRef.current = radarCandidates;
  const sweepAngleRef = useRef(sweepAngle);
  sweepAngleRef.current = sweepAngle;

  // Smooth Radar Sweep Animation Loop (pauses automatically when tab is hidden)
  useEffect(() => {
    if (!radarActive || !radarScanning) return;

    let rafId = 0;
    let lastFrameTime = performance.now();
    let lastEmitTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      if (!document.hidden) {
        const prev = sweepAngleRef.current;
        const next = (prev + dt * 54) % 360;
        sweepAngleRef.current = next;

        // Check newly swept installations
        const newlyHit: string[] = [];
        for (const item of radarCandidatesRef.current) {
          if (angleInSweepArc(prev, next, item.bearingDeg)) {
            newlyHit.push(item.base.id);
          }
        }

        if (newlyHit.length > 0) {
          const hitId = newlyHit[newlyHit.length - 1];
          setDetectedIds((existing) => {
            const existingSet = new Set(existing);
            let changed = false;
            for (const id of newlyHit) {
              if (!existingSet.has(id)) {
                existingSet.add(id);
                changed = true;
              }
            }
            return changed ? Array.from(existingSet) : existing;
          });

          // Smoothly update live visual capture card (max ~1 switch per 2.2s so user can see each base clearly)
          if (now - lastRadarCardAutoSwitchRef.current >= 2200) {
            lastRadarCardAutoSwitchRef.current = now;
            setRadarCardTargetId(hitId);
          }
        }

        // Throttle React state updates to ~24 fps for silky smooth WebGL rendering
        if (now - lastEmitTime >= 42) {
          lastEmitTime = now;
          setSweepAngle(next);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [radarActive, radarScanning]);

  // Build radar detections list with live ping state
  const radarDetections: RadarDetection[] = useMemo(() => {
    const detectedSet = new Set(detectedIds);
    return radarCandidates.map((item) => {
      const detected = detectedSet.has(item.base.id);
      const lag = angularLagBehindBeam(sweepAngle, item.bearingDeg);
      const recentlyPinged = detected && lag <= 32;
      return {
        ...item,
        detected,
        recentlyPinged,
      };
    });
  }, [radarCandidates, detectedIds, sweepAngle]);

  // Stabilize recentPingIds array reference so map marker styling only re-runs when ping membership actually changes
  const recentPingKey = useMemo(
    () =>
      radarDetections
        .filter((d) => d.recentlyPinged)
        .map((d) => d.base.id)
        .join(','),
    [radarDetections]
  );

  const recentPingIds = useMemo(
    () => (recentPingKey ? recentPingKey.split(',') : []),
    [recentPingKey]
  );

  // Ordered list of locked radar detections for the floating target image card
  const lockedRadarDetections = useMemo(
    () => radarDetections.filter((d) => d.detected),
    [radarDetections]
  );

  const activeRadarCardIndex = useMemo(() => {
    if (lockedRadarDetections.length === 0) return -1;
    if (radarCardTargetId) {
      const idx = lockedRadarDetections.findIndex((d) => d.base.id === radarCardTargetId);
      if (idx !== -1) return idx;
    }
    return 0;
  }, [lockedRadarDetections, radarCardTargetId]);

  const activeRadarCardDetection =
    activeRadarCardIndex >= 0 ? lockedRadarDetections[activeRadarCardIndex] : null;

  const issueCamera = (cmd: Omit<CameraCommand, 'nonce'>) => {
    setIsOrbiting(false);
    setCameraCommand({ ...cmd, nonce: Date.now() + Math.random() });
  };

  const handleResetThailandView = () => {
    setSelectedBase(null);
    setCustomPin(null);
    issueCamera({
      lat: 13.45,
      lng: 101.25,
      zoom: 5.2,
      pitch: 24,
      bearing: 0,
    });
  };

  const handleApplyRadarPreset = (preset: RadarPreset) => {
    setMeasureMode(false);
    setMeasurePoints([]);
    setStreetViewLocation(null);
    setStreetDropMode(false);
    setActivePresetId(preset.id);
    setRadarCenter({ lat: preset.lat, lng: preset.lng });
    setRadarRadiusKm(preset.radiusKm);
    setDetectedIds([]);
    setRadarCardTargetId(null);
    setRadarCardDismissed(false);
    lastRadarCardAutoSwitchRef.current = 0;
    setSweepAngle(0);
    sweepAngleRef.current = 0;
    setRadarActive(true);
    setRadarScanning(true);
    issueCamera({
      lat: preset.lat,
      lng: preset.lng,
      zoom: preset.zoom,
      pitch: 26,
      bearing: 0,
    });
  };

  const handleRelocateRadar = (pt: { lat: number; lng: number }) => {
    setActivePresetId('custom');
    setRadarCenter(pt);
    setDetectedIds([]);
    setRadarCardTargetId(null);
    setRadarCardDismissed(false);
    lastRadarCardAutoSwitchRef.current = 0;
    setSweepAngle(0);
    sweepAngleRef.current = 0;
    setRadarScanning(true);
    if (radarRadiusKm > 350) {
      setRadarRadiusKm(150);
    }
  };

  const handleResetSweep = () => {
    setDetectedIds([]);
    setRadarCardTargetId(null);
    setRadarCardDismissed(false);
    lastRadarCardAutoSwitchRef.current = 0;
    setSweepAngle(0);
    sweepAngleRef.current = 0;
    setRadarScanning(true);
  };

  const handleRunOsmScan = async () => {
    osmAbortRef.current?.abort();
    const controller = new AbortController();
    osmAbortRef.current = controller;

    setOsmScanning(true);
    setOsmError(null);
    try {
      const scanRadius = Math.min(radarRadiusKm, 120);
      const res = await fetch(
        `/api/radar/osm-scan?lat=${radarCenter.lat.toFixed(5)}&lng=${radarCenter.lng.toFixed(
          5
        )}&radiusKm=${scanRadius}`,
        { signal: controller.signal }
      );
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) {
        throw new Error(data.error || 'មិនអាចស្កេនទិន្នន័យ OpenStreetMap បានទេ។');
      }
      const discovered = Array.isArray(data.sites) ? (data.sites as MilitaryBase[]) : [];
      setOsmSites((prev) => {
        const byId = new Map(prev.map((s) => [s.id, s]));
        for (const site of discovered) {
          byId.set(site.id, site);
        }
        return Array.from(byId.values());
      });
      if (discovered.length === 0) {
        setOsmError('រកមិនឃើញបន្ទាយតូចបន្ថែមក្នុងរង្វង់នេះពី OpenStreetMap ទេ។ សូមចុចលើខេត្តផ្សេងទៀត។');
      } else {
        // Ensure OSM small camps are visible even if user was viewing 'major' or 'fighter' only
        if (radarScaleFilter === 'major' || radarScaleFilter === 'fighter') {
          setRadarScaleFilter('all');
        }
        setRadarScanning(true);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setOsmError(err instanceof Error ? err.message : 'មានបញ្ហាបណ្តាញពេលស្កេន OSM។');
    } finally {
      if (!controller.signal.aborted) {
        setOsmScanning(false);
      }
    }
  };

  const handleSelectBase = (base: MilitaryBase) => {
    setSelectedBase(base);
    setCustomPin(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    issueCamera({
      lat: base.lat,
      lng: base.lng,
      zoom: base.scale === 'camp' ? 14.2 : 13.4,
      pitch: 55,
      bearing: -15,
    });
  };

  const handleFly3D = (base: MilitaryBase) => {
    issueCamera({
      lat: base.lat,
      lng: base.lng,
      zoom: 14.8,
      pitch: 62,
      bearing: 25,
    });
  };

  const handleFlyTopDown = (base: MilitaryBase) => {
    issueCamera({
      lat: base.lat,
      lng: base.lng,
      zoom: 15.0,
      pitch: 0,
      bearing: 0,
    });
  };

  const handleOpenStreetViewForBase = (base: MilitaryBase) => {
    setMeasureMode(false);
    setMeasurePoints([]);
    setStreetDropMode(false);
    setStreetViewLocation({
      lat: base.lat,
      lng: base.lng,
      titleKm: base.nameKm,
      subtitle: `${base.provinceKm} · ${base.nameEn}`,
      heading: 0,
    });
    setStreetSplitMode(true);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setSidebarOpen(false);
    }
    issueCamera({
      lat: base.lat,
      lng: base.lng,
      zoom: 16.0,
      pitch: 58,
      bearing: 0,
    });
  };

  const handleOpenStreetViewQuick = () => {
    setMeasureMode(false);
    setMeasurePoints([]);
    setStreetDropMode(false);
    if (selectedBase) {
      handleOpenStreetViewForBase(selectedBase);
      return;
    }
    const defaultView: StreetViewLocation = {
      titleKm: 'មហាវិថីរាជដំណើរ (មុខទីបញ្ជាការជើងគោក)',
      subtitle: 'Ratchadamnoen Nok Ave, Bangkok',
      lat: 13.7639,
      lng: 100.5091,
      heading: 250,
    };
    setStreetViewLocation(defaultView);
    setStreetSplitMode(true);
    setSidebarOpen(false);
    issueCamera({
      lat: defaultView.lat,
      lng: defaultView.lng,
      zoom: 16.2,
      pitch: 60,
      bearing: -20,
    });
  };

  const handlePickStreetViewPoint = (pt: { lat: number; lng: number }) => {
    setStreetDropMode(false);
    setStreetViewLocation({
      lat: pt.lat,
      lng: pt.lng,
      titleKm: 'ទីតាំង Street View 4K លើផ្លូវ',
      subtitle: `${pt.lat.toFixed(5)}°N, ${pt.lng.toFixed(5)}°E`,
      heading: 0,
    });
    setStreetSplitMode(true);
    issueCamera({
      lat: pt.lat,
      lng: pt.lng,
      zoom: 16.5,
      pitch: 60,
      bearing: 0,
    });
  };

  const handleFly3DLowPass = (lat: number, lng: number) => {
    setStreetSplitMode(true);
    issueCamera({
      lat,
      lng,
      zoom: 17.6,
      pitch: 70,
      bearing: 32,
    });
  };

  const handleStartMeasureFromBase = (base: MilitaryBase) => {
    setStreetViewLocation(null);
    setStreetDropMode(false);
    setRadarActive(false);
    setMeasureMode(true);
    setMeasurePoints([
      {
        id: `pt-${Date.now()}`,
        lat: base.lat,
        lng: base.lng,
        label: base.nameKm,
      },
    ]);
  };

  const handleAddMeasurePoint = (pt: { lat: number; lng: number }) => {
    setMeasurePoints((prev) => [
      ...prev,
      {
        id: `pt-${Date.now()}-${prev.length}`,
        lat: pt.lat,
        lng: pt.lng,
      },
    ]);
  };

  const handlePlaceGeocodeSearch = async () => {
    const q = searchText.trim();
    if (!q) return;

    geocodeAbortRef.current?.abort();
    const controller = new AbortController();
    geocodeAbortRef.current = controller;

    setGeocoding(true);
    setGeocodeMessage(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setGeocodeResults([]);
        setGeocodeMessage(data.error || 'មិនអាចស្វែងរកទីតាំងបានទេនៅពេលនេះ។');
        return;
      }
      const list = Array.isArray(data.results) ? (data.results as GeocodePlace[]) : [];
      setGeocodeResults(list);
      if (list.length === 0) {
        setGeocodeMessage('រកមិនឃើញទីតាំងដែលត្រូវនឹងពាក្យស្វែងរកនេះទេ។');
      }
    } catch {
      if (controller.signal.aborted) return;
      setGeocodeResults([]);
      setGeocodeMessage('មានបញ្ហាបណ្តាញពេលស្វែងរកទីតាំង។');
    } finally {
      if (!controller.signal.aborted) {
        setGeocoding(false);
      }
    }
  };

  const handleJumpToGeocode = (place: GeocodePlace) => {
    setSelectedBase(null);
    setCustomPin({ lat: place.lat, lng: place.lng, label: place.displayName.split(',')[0] });
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    issueCamera({ lat: place.lat, lng: place.lng, zoom: 12.5, pitch: 48, bearing: 0 });
  };

  // Filtered and sorted military bases for Catalog tab
  const filteredCatalogBases = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = allBases.filter((b) => {
      if (branchFilter !== 'all' && b.branch !== branchFilter) return false;
      if (!matchesTargetFilter(b, scaleFilterCatalog)) return false;
      if (regionFilter !== 'all' && b.region !== regionFilter) return false;
      if (!q) return true;
      return (
        b.nameKm.toLowerCase().includes(q) ||
        b.nameEn.toLowerCase().includes(q) ||
        b.nameTh.toLowerCase().includes(q) ||
        b.provinceKm.toLowerCase().includes(q) ||
        b.provinceEn.toLowerCase().includes(q) ||
        b.commandKm.toLowerCase().includes(q) ||
        b.summaryKm.toLowerCase().includes(q) ||
        (b.aircraftTypes ?? []).some((a) => a.toLowerCase().includes(q)) ||
        b.keyUnitsKm.some((u) => u.toLowerCase().includes(q)) ||
        (b.runwayOrPort ?? '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'border') {
        return (
          getNearestCambodiaBorder(a.lat, a.lng).distanceKm -
          getNearestCambodiaBorder(b.lat, b.lng).distanceKm
        );
      }
      if (sortMode === 'north') {
        return b.lat - a.lat;
      }
      return a.nameKm.localeCompare(b.nameKm);
    });
  }, [allBases, searchText, branchFilter, scaleFilterCatalog, regionFilter, sortMode]);

  // Bases shown on the map: never hide AI-matched or currently selected bases behind stale Catalog filters
  const displayedMapBases = useMemo(() => {
    let baseList: MilitaryBase[];
    if (radarActive) {
      baseList = allBases.filter((b) => matchesTargetFilter(b, radarScaleFilter));
    } else if (sidebarTab === 'ai') {
      baseList = allBases;
    } else {
      baseList = filteredCatalogBases;
    }

    const presentIds = new Set(baseList.map((b) => b.id));
    const extras: MilitaryBase[] = [];

    if (selectedBase && !presentIds.has(selectedBase.id)) {
      extras.push(selectedBase);
      presentIds.add(selectedBase.id);
    }
    if (aiResult?.matchedIds.length) {
      for (const id of aiResult.matchedIds) {
        if (!presentIds.has(id)) {
          const found = allBases.find((b) => b.id === id);
          if (found) {
            extras.push(found);
            presentIds.add(id);
          }
        }
      }
    }

    return extras.length > 0 ? [...baseList, ...extras] : baseList;
  }, [radarActive, sidebarTab, allBases, radarScaleFilter, filteredCatalogBases, selectedBase, aiResult]);

  // Compute total geodesic distance & last segment bearing for Measure Tool
  const measureStats = useMemo(() => {
    if (measurePoints.length < 2) {
      return { totalKm: 0, totalNm: 0, lastBearing: null as number | null };
    }
    let totalKm = 0;
    for (let i = 1; i < measurePoints.length; i++) {
      totalKm += haversineKm(
        measurePoints[i - 1].lat,
        measurePoints[i - 1].lng,
        measurePoints[i].lat,
        measurePoints[i].lng
      );
    }
    const lastA = measurePoints[measurePoints.length - 2];
    const lastB = measurePoints[measurePoints.length - 1];
    const lastBearing = bearingDegrees(lastA.lat, lastA.lng, lastB.lat, lastB.lng);
    return {
      totalKm,
      totalNm: totalKm * 0.539957,
      lastBearing,
    };
  }, [measurePoints]);

  const countsSummary = useMemo(() => {
    let major = 0;
    let camp = 0;
    let fighter = 0;
    for (const b of allBases) {
      if (b.scale === 'camp') camp += 1;
      else major += 1;
      if (b.isFighterBase) fighter += 1;
    }
    return { total: allBases.length, major, camp, fighter };
  }, [allBases]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#07090E] text-slate-100 overflow-hidden">
      {/* Top Bar Contract: 3 zones (Brand wordmark — 4 concise single-line nav controls — 1 primary CTA) */}
      <header className="h-[52px] shrink-0 px-4 lg:px-6 bg-[#090D16] border-b border-slate-800/90 flex items-center justify-between gap-4 lg:gap-8 z-40">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={handleResetThailandView}
          className="text-[14px] sm:text-[15px] font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 hover:text-cyan-300 transition-colors"
        >
          រ៉ាដាភូមិសាស្ត្រយោធាថៃ 3D
        </button>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => {
              setMeasureMode(false);
              setMeasurePoints([]);
              setStreetViewLocation(null);
              setStreetDropMode(false);
              setRadarActive(true);
              setSidebarTab('radar');
              setSidebarOpen(true);
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              sidebarOpen && sidebarTab === 'radar' && !measureMode && !streetViewLocation
                ? 'text-emerald-300 border-b border-emerald-400'
                : 'hover:text-slate-100'
            }`}
          >
            រ៉ាដាស្កេន
          </button>

          <button
            type="button"
            onClick={() => {
              setMeasureMode(false);
              setMeasurePoints([]);
              setStreetViewLocation(null);
              setStreetDropMode(false);
              setRadarActive(false);
              setSidebarTab('catalog');
              setSidebarOpen(true);
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              sidebarOpen && sidebarTab === 'catalog' && !measureMode && !streetViewLocation
                ? 'text-cyan-300 border-b border-cyan-400'
                : 'hover:text-slate-100'
            }`}
          >
            បញ្ជីបន្ទាយ
          </button>

          <button
            type="button"
            onClick={() => {
              const target =
                selectedBase ??
                activeRadarCardDetection?.base ??
                THAI_MILITARY_BASES.find((b) => b.id === 'rtaf-korat-wing1') ??
                THAI_MILITARY_BASES[0];
              setThermalScanBase(target);
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors flex items-center gap-1 ${
              thermalScanBase
                ? 'text-orange-300 border-b border-orange-400'
                : 'text-orange-300/90 hover:text-orange-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>ស្កេនកំដៅ FLIR</span>
          </button>

          <button
            type="button"
            onClick={handleOpenStreetViewQuick}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              streetViewLocation || streetDropMode
                ? 'text-cyan-300 border-b border-cyan-400'
                : 'hover:text-slate-100'
            }`}
          >
            Street View 4K
          </button>

          <button
            type="button"
            onClick={() => {
              setStreetViewLocation(null);
              setStreetDropMode(false);
              setMeasureMode((v) => {
                if (v) setMeasurePoints([]);
                return !v;
              });
            }}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
              measureMode ? 'text-cyan-300 border-b border-cyan-400' : 'hover:text-slate-100'
            }`}
          >
            វាស់ចម្ងាយ
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleApplyRadarPreset(RADAR_PRESETS[0]);
              setSidebarTab('radar');
              setSidebarOpen(true);
            }}
            className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            ស្កេនទូទាំងប្រទេសថៃ
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Left Explorer & Radar Sidebar */}
        {sidebarOpen && (
          <aside className="fixed lg:static inset-y-0 left-0 top-[52px] lg:top-0 z-30 w-[336px] sm:w-[368px] max-w-[92vw] shrink-0 bg-[#0B1019] border-r border-slate-800/90 flex flex-col h-[calc(100%-52px)] lg:h-full shadow-2xl lg:shadow-none">
            {/* Segmented Mode Switcher inside Sidebar */}
            <div className="px-3.5 pt-3 pb-2.5 border-b border-slate-800/80 flex items-center gap-2">
              <div className="flex-1 grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#070B13] border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('radar');
                    setRadarActive(true);
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap ${
                    sidebarTab === 'radar'
                      ? 'bg-emerald-500/20 text-emerald-200 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radar className="w-3 h-3 shrink-0" />
                  <span>រ៉ាដា</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('catalog');
                    setRadarActive(false);
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap ${
                    sidebarTab === 'catalog'
                      ? 'bg-[#152033] text-slate-50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  បញ្ជី ({countsSummary.total})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarTab('ai');
                    setRadarActive(false);
                  }}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11.5px] font-medium transition-colors whitespace-nowrap ${
                    sidebarTab === 'ai'
                      ? 'bg-cyan-500/20 text-cyan-200 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>AI</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="បង្រួមបន្ទះខាងឆ្វេង"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile-only quick tools strip (since desktop header nav hides on < md) */}
            <div className="md:hidden px-3.5 py-2 border-b border-slate-800/70 grid grid-cols-3 gap-1.5 bg-[#080C15]">
              <button
                type="button"
                onClick={() => {
                  const target =
                    selectedBase ??
                    activeRadarCardDetection?.base ??
                    THAI_MILITARY_BASES.find((b) => b.id === 'rtaf-korat-wing1') ??
                    THAI_MILITARY_BASES[0];
                  setThermalScanBase(target);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] font-medium bg-orange-500/18 text-orange-200 border border-orange-500/40 transition-colors"
              >
                <Flame className="w-3 h-3 text-orange-400 shrink-0" />
                <span>កំដៅ FLIR</span>
              </button>
              <button
                type="button"
                onClick={handleOpenStreetViewQuick}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] font-medium transition-colors ${
                  streetViewLocation || streetDropMode
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'bg-[#101724] text-slate-300 border border-slate-800'
                }`}
              >
                <Camera className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>4K View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStreetViewLocation(null);
                  setStreetDropMode(false);
                  setSidebarOpen(false);
                  setMeasureMode((v) => {
                    if (v) setMeasurePoints([]);
                    return !v;
                  });
                }}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] font-medium transition-colors ${
                  measureMode
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'bg-[#101724] text-slate-300 border border-slate-800'
                }`}
              >
                <Ruler className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>វាស់ចម្ងាយ</span>
              </button>
            </div>

            {sidebarTab === 'radar' ? (
              <RadarScanPanel
                radarCenter={radarCenter}
                radarRadiusKm={radarRadiusKm}
                onChangeRadius={(km) => {
                  setRadarRadiusKm(km);
                  setDetectedIds([]);
                  setRadarCardTargetId(null);
                  setRadarCardDismissed(false);
                  lastRadarCardAutoSwitchRef.current = 0;
                  setSweepAngle(0);
                  sweepAngleRef.current = 0;
                  setRadarScanning(true);
                }}
                sweepAngle={sweepAngle}
                isScanning={radarScanning}
                onToggleScanning={() => setRadarScanning((v) => !v)}
                onResetSweep={handleResetSweep}
                scaleFilter={radarScaleFilter}
                onChangeScaleFilter={(s) => {
                  setRadarScaleFilter(s);
                  setDetectedIds([]);
                  setRadarCardTargetId(null);
                  setRadarCardDismissed(false);
                  lastRadarCardAutoSwitchRef.current = 0;
                  setSweepAngle(0);
                  sweepAngleRef.current = 0;
                  setRadarScanning(true);
                }}
                activePresetId={activePresetId}
                onApplyPreset={handleApplyRadarPreset}
                detections={radarDetections}
                selectedBaseId={selectedBase?.id ?? null}
                onSelectBase={handleSelectBase}
                onRunOsmScan={handleRunOsmScan}
                osmScanning={osmScanning}
                osmCount={osmSites.length}
                osmError={osmError}
              />
            ) : sidebarTab === 'ai' ? (
              <SmartAISearchPanel
                result={aiResult}
                onResult={setAiResult}
                onSelectBase={handleSelectBase}
                onFlyToTarget={(target) =>
                  issueCamera({
                    lat: target.lat,
                    lng: target.lng,
                    zoom: target.zoom,
                    pitch: target.pitch ?? 45,
                    bearing: 0,
                  })
                }
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search + Filter Controls */}
                <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => {
                        setSearchText(e.target.value);
                        setGeocodeMessage(null);
                        if (!e.target.value.trim()) setGeocodeResults([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePlaceGeocodeSearch();
                      }}
                      placeholder="ស្វែងរកឈ្មោះបន្ទាយ F-16 យន្តហោះ ឬខេត្ត..."
                      className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#070B13] border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70"
                    />
                    {searchText && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setGeocodeResults([]);
                          setGeocodeMessage(null);
                        }}
                        aria-label="សម្អាតពាក្យស្វែងរក"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Scale Filter: All, Fighter Jets, Small Camps, Major Bases */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#070B13] border border-slate-800/80">
                    {(
                      [
                        { id: 'all', label: `ទាំងអស់ (${countsSummary.total})` },
                        { id: 'fighter', label: `យន្តហោះចម្បាំង (${countsSummary.fighter})` },
                        { id: 'camp', label: `បន្ទាយតូច (${countsSummary.camp})` },
                        { id: 'major', label: `មូលដ្ឋានធំ (${countsSummary.major})` },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setScaleFilterCatalog(item.id)}
                        className={`px-2 py-1 rounded-md text-[10.5px] font-medium transition-colors whitespace-nowrap ${
                          scaleFilterCatalog === item.id
                            ? item.id === 'fighter'
                              ? 'bg-sky-500/20 text-sky-200'
                              : 'bg-[#162336] text-cyan-200'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Branch Filter Buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    {(
                      [
                        { id: 'all', label: 'គ្រប់ប្រភេទទ័ព' },
                        { id: 'army', label: 'ជើងគោក' },
                        { id: 'airforce', label: 'អាកាស' },
                        { id: 'navy', label: 'ជើងទឹក' },
                        { id: 'hq', label: 'កំពូល' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBranchFilter(item.id)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          branchFilter === item.id
                            ? 'bg-cyan-500/18 text-cyan-200 border border-cyan-500/40'
                            : 'bg-[#101724] text-slate-400 border border-transparent hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Region & Sort Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="តម្រងតាមភូមិភាគ"
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value as RegionType | 'all')}
                      className="rounded-lg bg-[#070B13] border border-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500/70"
                    >
                      <option value="all">គ្រប់ភូមិភាគ</option>
                      {(['central', 'northeast', 'east', 'north', 'south'] as const).map((r) => (
                        <option key={r} value={r}>
                          {REGION_META[r].labelKm}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="តម្រៀបតាម"
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="rounded-lg bg-[#070B13] border border-slate-800 px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500/70"
                    >
                      <option value="border">ជិតព្រំដែនកម្ពុជា</option>
                      <option value="north">ពីជើងទៅត្បូង</option>
                      <option value="name">តាមលំដាប់ឈ្មោះ</option>
                    </select>
                  </div>

                  {searchText.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={handlePlaceGeocodeSearch}
                      disabled={geocoding}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#101826] hover:bg-[#162033] border border-slate-800 text-[11px] text-slate-300 transition-colors"
                    >
                      <span className="truncate">ស្វែងរកទីតាំងទូទៅលើផែនទី: "{searchText}"</span>
                      {geocoding ? (
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400 shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                      )}
                    </button>
                  )}

                  {geocodeMessage && (
                    <div className="px-2.5 py-1.5 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                      {geocodeMessage}
                    </div>
                  )}

                  {geocodeResults.length > 0 && (
                    <div className="rounded-lg bg-[#070B13] border border-slate-800 divide-y divide-slate-800/70">
                      {geocodeResults.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() => handleJumpToGeocode(place)}
                          className="w-full text-left px-2.5 py-2 hover:bg-slate-800/50 transition-colors flex items-start gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-[11.5px] text-slate-200 truncate">
                              {place.displayName}
                            </div>
                            <div className="text-[10px] font-mono-tabular text-slate-500">
                              {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scrollable Base List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                  {filteredCatalogBases.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        មិនមានមូលដ្ឋានដែលត្រូវនឹងតម្រងស្វែងរកនេះទេ។
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setBranchFilter('all');
                          setScaleFilterCatalog('all');
                          setRegionFilter('all');
                          setGeocodeResults([]);
                          setGeocodeMessage(null);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        បង្ហាញមូលដ្ឋានទាំងអស់វិញ
                      </button>
                    </div>
                  ) : (
                    filteredCatalogBases.map((base) => {
                      const meta = BRANCH_META[base.branch];
                      const border = getNearestCambodiaBorder(base.lat, base.lng);
                      const isSelected = selectedBase?.id === base.id;
                      const isHighlighted = aiResult?.matchedIds.includes(base.id) ?? false;

                      return (
                        <button
                          key={base.id}
                          type="button"
                          onClick={() => handleSelectBase(base)}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                            isSelected
                              ? 'bg-cyan-500/12'
                              : isHighlighted
                                ? 'bg-cyan-950/25 hover:bg-cyan-950/40'
                                : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 mt-1.5 shrink-0"
                            style={{
                              backgroundColor: base.source === 'osm' ? '#F59E0B' : meta.color,
                              transform: base.scale === 'camp' ? 'rotate(45deg)' : undefined,
                              borderRadius:
                                base.scale === 'camp' || base.branch === 'hq' ? '2px' : '9999px',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-medium text-slate-100 leading-snug">
                              {base.nameKm}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {base.nameEn}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span
                                className={
                                  base.aircraftTypes?.length
                                    ? 'text-sky-400 font-medium truncate max-w-[125px]'
                                    : base.scale === 'camp'
                                      ? 'text-emerald-400 shrink-0'
                                      : `${meta.textClass} shrink-0`
                                }
                              >
                                {base.aircraftTypes?.[0] ??
                                  (base.scale === 'camp' ? 'បន្ទាយតូច' : meta.shortKm)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{base.provinceKm}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular text-slate-300 shrink-0">
                                {Math.round(border.distanceKm)} km
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Floating Re-open Sidebar Buttons when Collapsed */}
        {!sidebarOpen && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSidebarTab('radar');
                setRadarActive(true);
                setSidebarOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B111C]/92 border border-emerald-500/40 text-xs font-medium text-emerald-200 hover:border-emerald-400 shadow-xl backdrop-blur-md transition-colors whitespace-nowrap"
            >
              <Radar className="w-3.5 h-3.5 text-emerald-400" />
              <span>រ៉ាដាស្កេន</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarTab('catalog');
                setRadarActive(false);
                setSidebarOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B111C]/92 border border-slate-800 text-xs font-medium text-slate-200 hover:text-white hover:border-cyan-500/50 shadow-xl backdrop-blur-md transition-colors whitespace-nowrap"
            >
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>បញ្ជី ({countsSummary.total})</span>
            </button>
          </div>
        )}

        {/* Center 3D Google Earth + Split/Full Street View 4K Stage */}
        <main className="relative flex-1 flex flex-col lg:flex-row min-w-0 h-full overflow-hidden">
          {streetViewLocation && (
            <StreetViewStudio
              location={streetViewLocation}
              splitMode={streetSplitMode}
              onToggleSplitMode={() => setStreetSplitMode((v) => !v)}
              onChangeLocation={(next) => {
                setStreetViewLocation(next);
                issueCamera({
                  lat: next.lat,
                  lng: next.lng,
                  zoom: 16.2,
                  pitch: 58,
                  bearing: 0,
                });
              }}
              onFly3DLowPass={handleFly3DLowPass}
              onClose={() => {
                setStreetViewLocation(null);
                setStreetDropMode(false);
              }}
            />
          )}

          <EarthViewport
            bases={displayedMapBases}
            selectedBase={selectedBase}
            highlightedIds={aiResult?.matchedIds ?? []}
            onSelectBase={handleSelectBase}
            cameraCommand={cameraCommand}
            measureMode={measureMode}
            measurePoints={measurePoints}
            onAddMeasurePoint={handleAddMeasurePoint}
            showRangeRings={showRangeRings}
            showBorderRefs={showBorderRefs}
            onToggleBorderRefs={() => setShowBorderRefs((v) => !v)}
            isOrbiting={isOrbiting}
            onToggleOrbit={() => setIsOrbiting((v) => !v)}
            customPin={customPin}
            radarState={{
              active: radarActive && !streetViewLocation,
              center: radarCenter,
              radiusKm: radarRadiusKm,
              sweepAngle,
              detectedIds,
              recentPingIds,
            }}
            onRelocateRadar={handleRelocateRadar}
            streetDropMode={streetDropMode}
            onToggleStreetDropMode={() => {
              if (streetViewLocation) {
                setStreetViewLocation(null);
                setStreetDropMode(false);
              } else {
                setMeasureMode(false);
                setMeasurePoints([]);
                setStreetDropMode((v) => !v);
              }
            }}
            streetViewCoord={
              streetViewLocation
                ? { lat: streetViewLocation.lat, lng: streetViewLocation.lng }
                : null
            }
            onPickStreetViewPoint={handlePickStreetViewPoint}
          />

          {/* Live Radar Target Acquisition Image Card (displays real aerial/street photo when radar detects a base) */}
          {radarActive &&
            !measureMode &&
            !streetViewLocation &&
            activeRadarCardDetection &&
            (!radarCardDismissed ? (
              <RadarDetectionCard
                detection={activeRadarCardDetection}
                currentIndex={activeRadarCardIndex}
                totalDetected={lockedRadarDetections.length}
                onPrev={() => {
                  const len = lockedRadarDetections.length;
                  if (len <= 1) return;
                  const nextIdx = (activeRadarCardIndex - 1 + len) % len;
                  lastRadarCardAutoSwitchRef.current = performance.now() + 4000;
                  setRadarCardTargetId(lockedRadarDetections[nextIdx].base.id);
                }}
                onNext={() => {
                  const len = lockedRadarDetections.length;
                  if (len <= 1) return;
                  const nextIdx = (activeRadarCardIndex + 1) % len;
                  lastRadarCardAutoSwitchRef.current = performance.now() + 4000;
                  setRadarCardTargetId(lockedRadarDetections[nextIdx].base.id);
                }}
                onInspectBase={handleSelectBase}
                onOpenStreetView={handleOpenStreetViewForBase}
                onOpenThermalScan={(b) => setThermalScanBase(b)}
                onDismiss={() => setRadarCardDismissed(true)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setRadarCardDismissed(false)}
                className="absolute bottom-14 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#090F1A]/92 border border-emerald-500/40 text-xs font-medium text-emerald-200 hover:border-emerald-400 shadow-xl backdrop-blur-md transition-colors"
              >
                <Radar className="w-3.5 h-3.5 text-emerald-400" />
                <span>បង្ហាញរូបភាពរ៉ាដា ({lockedRadarDetections.length})</span>
              </button>
            ))}

          {/* Active Geodesic Measurement HUD Panel */}
          {measureMode && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-md rounded-xl bg-[#0B111C]/95 border border-cyan-500/40 px-4 py-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <Ruler className="w-4 h-4 shrink-0" />
                  <span>ឧបករណ៍វាស់ចម្ងាយផ្លូវអាកាស</span>
                </div>
                <div className="flex items-center gap-1">
                  {measurePoints.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMeasurePoints((prev) => prev.slice(0, -1))}
                        title="លុបចំណុចចុងក្រោយ"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>ថយក្រោយ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeasurePoints([])}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>សម្អាត</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMeasureMode(false);
                      setMeasurePoints([]);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100 transition-colors"
                  >
                    បិទ
                  </button>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-3 pt-2.5 border-t border-slate-800/90 text-xs">
                <div>
                  <div className="text-[10.5px] text-slate-400">ចម្ងាយសរុប</div>
                  <div className="font-mono-tabular text-sm font-semibold text-slate-50 mt-0.5">
                    {measureStats.totalKm.toFixed(1)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">km</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-slate-400">ម៉ាយសមុទ្រ</div>
                  <div className="font-mono-tabular text-sm font-semibold text-slate-50 mt-0.5">
                    {measureStats.totalNm.toFixed(1)}{' '}
                    <span className="text-[10px] font-normal text-slate-400">nm</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-slate-400">ទិសដៅចុងក្រោយ</div>
                  <div className="font-mono-tabular text-sm font-semibold text-cyan-300 mt-0.5">
                    {measureStats.lastBearing !== null
                      ? `${Math.round(measureStats.lastBearing)}° ${bearingToCompassKm(
                          measureStats.lastBearing
                        )}`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Installation Inspector Drawer */}
        {selectedBase && (
          <BaseInspector
            base={selectedBase}
            onClose={() => {
              setSelectedBase(null);
              setIsOrbiting(false);
            }}
            onFly3D={handleFly3D}
            onFlyTopDown={handleFlyTopDown}
            isOrbiting={isOrbiting}
            onToggleOrbit={() => setIsOrbiting((v) => !v)}
            showRangeRings={showRangeRings}
            onToggleRangeRings={() => setShowRangeRings((v) => !v)}
            onStartMeasureFromBase={handleStartMeasureFromBase}
            onOpenStreetView={handleOpenStreetViewForBase}
            onOpenThermalScan={(b) => setThermalScanBase(b)}
          />
        )}
      </div>

      {/* FLIR Thermal Optical & Public Arsenal Infrastructure Scanner Modal */}
      {thermalScanBase && (
        <ThermalOrdnanceScanner
          base={thermalScanBase}
          allBases={allBases}
          onChangeBase={(nextBase) => {
            setThermalScanBase(nextBase);
            setSelectedBase(nextBase);
          }}
          onFlyToBase={handleSelectBase}
          onClose={() => setThermalScanBase(null)}
        />
      )}
    </div>
  );
}
