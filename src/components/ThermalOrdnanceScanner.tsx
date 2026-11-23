import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crosshair,
  Eye,
  Flame,
  Info,
  Layers,
  Loader2,
  MapPin,
  Radar,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  BRANCH_META,
  formatDMS,
  getNearestCambodiaBorder,
  getPublicArsenalProfile,
  type MilitaryBase,
} from '../data/bases';

export type ThermalPalette = 'ironbow' | 'inferno' | 'whitehot' | 'optical';

interface ThermalHotspot {
  id: string;
  x: number; // 0..CANVAS_W
  y: number; // 0..CANVAS_H
  xPct: number;
  yPct: number;
  intensity: number; // 0..100 relative surface radiance index
  areaScore: number;
}

interface OsmStructure {
  id: string;
  category: 'hangar' | 'bunker' | 'fuel' | 'helipad' | 'barracks' | 'radar';
  categoryKm: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
}

interface InfraResponse {
  structures: OsmStructure[];
  counts: {
    hangar: number;
    bunker: number;
    fuel: number;
    helipad: number;
    barracks: number;
    radar: number;
  };
  total: number;
  radiusM: number;
  degraded?: boolean;
}

interface ThermalOrdnanceScannerProps {
  base: MilitaryBase;
  allBases: MilitaryBase[];
  onChangeBase: (base: MilitaryBase) => void;
  onClose: () => void;
  onFlyToBase: (base: MilitaryBase) => void;
}

const CANVAS_W = 640;
const CANVAS_H = 380;

const ZOOM_PRESETS = [
  { id: 'close', label: 'ជិតខ្លាំង (350m)', halfHeightKm: 0.35, radiusM: 900 },
  { id: 'medium', label: 'មធ្យម (650m)', halfHeightKm: 0.65, radiusM: 1500 },
  { id: 'wide', label: 'ទូលាយ (1.3km)', halfHeightKm: 1.3, radiusM: 2400 },
] as const;

const PALETTE_OPTIONS: Array<{ id: ThermalPalette; label: string }> = [
  { id: 'ironbow', label: 'FLIR Ironbow' },
  { id: 'inferno', label: 'កំដៅ Inferno' },
  { id: 'whitehot', label: 'White-Hot' },
  { id: 'optical', label: 'ផ្កាយរណបដើម' },
];

type RgbStop = [number, number, number, number]; // [t 0..1, r, g, b]

const IRONBOW_STOPS: RgbStop[] = [
  [0.0, 7, 5, 28],
  [0.2, 34, 14, 108],
  [0.42, 134, 24, 126],
  [0.64, 224, 82, 34],
  [0.84, 252, 198, 38],
  [1.0, 255, 255, 244],
];

const INFERNO_STOPS: RgbStop[] = [
  [0.0, 4, 4, 12],
  [0.25, 78, 12, 66],
  [0.52, 192, 42, 36],
  [0.78, 248, 152, 28],
  [1.0, 255, 252, 232],
];

function buildLut(stops: RgbStop[]): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s0 = stops[0];
    let s1 = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) {
        s0 = stops[k];
        s1 = stops[k + 1];
        break;
      }
    }
    const span = Math.max(0.0001, s1[0] - s0[0]);
    const frac = (t - s0[0]) / span;
    lut[i * 3] = Math.round(s0[1] + (s1[1] - s0[1]) * frac);
    lut[i * 3 + 1] = Math.round(s0[2] + (s1[2] - s0[2]) * frac);
    lut[i * 3 + 2] = Math.round(s0[3] + (s1[3] - s0[3]) * frac);
  }
  return lut;
}

const IRONBOW_LUT = buildLut(IRONBOW_STOPS);
const INFERNO_LUT = buildLut(INFERNO_STOPS);

function computeThermalSignal(r: number, g: number, b: number): number {
  // Base perceptual luminance
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  // Suppress lush vegetation (green channel significantly exceeds red & blue) so trees appear thermally cooler
  const vegExcess = Math.max(0, g - Math.max(r, b) * 0.92);
  // Highlight bright metallic / concrete / hangar roof / aircraft fuselage reflectance
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const neutrality = 1 - (maxC - minC) / 255; // concrete, metal roofs, aircraft tend to be neutral/bright
  const metallicBoost = lum > 135 ? (lum - 135) * 0.45 * neutrality : 0;
  const raw = lum * 0.92 + metallicBoost - vegExcess * 1.15;
  return Math.max(0, Math.min(255, Math.round(raw)));
}

function detectHotspotClusters(thermalMap: Uint8Array, width: number, height: number): ThermalHotspot[] {
  const cellW = 20;
  const cellH = 20;
  const cols = Math.floor(width / cellW);
  const rows = Math.floor(height / cellH);

  // Compute global mean & top percentile threshold
  let sum = 0;
  for (let i = 0; i < thermalMap.length; i += 4) {
    sum += thermalMap[i];
  }
  const mean = sum / (thermalMap.length / 4);
  const threshold = Math.max(150, Math.min(225, mean + 58));

  const candidates: Array<{ cx: number; cy: number; peak: number; hotCount: number }> = [];

  for (let gy = 1; gy < rows - 1; gy++) {
    for (let gx = 1; gx < cols - 1; gx++) {
      let peak = 0;
      let hotCount = 0;
      let weightedX = 0;
      let weightedY = 0;
      let weightSum = 0;

      const y0 = gy * cellH;
      const x0 = gx * cellW;
      for (let y = y0; y < y0 + cellH; y += 2) {
        const rowOffset = y * width;
        for (let x = x0; x < x0 + cellW; x += 2) {
          const val = thermalMap[rowOffset + x];
          if (val >= threshold) {
            hotCount++;
            const w = val - threshold + 1;
            weightedX += x * w;
            weightedY += y * w;
            weightSum += w;
          }
          if (val > peak) peak = val;
        }
      }

      if (hotCount >= 4 && weightSum > 0) {
        candidates.push({
          cx: weightedX / weightSum,
          cy: weightedY / weightSum,
          peak,
          hotCount,
        });
      }
    }
  }

  candidates.sort((a, b) => b.peak * 1.5 + b.hotCount - (a.peak * 1.5 + a.hotCount));

  // Non-maximum suppression so target markers stay crisp and separated
  const chosen: ThermalHotspot[] = [];
  for (const cand of candidates) {
    const tooClose = chosen.some((c) => Math.hypot(c.x - cand.cx, c.y - cand.cy) < 58);
    if (tooClose) continue;
    const intensity = Math.min(99, Math.max(62, Math.round((cand.peak / 255) * 100)));
    chosen.push({
      id: `HS-${String(chosen.length + 1).padStart(2, '0')}`,
      x: Math.round(cand.cx),
      y: Math.round(cand.cy),
      xPct: (cand.cx / width) * 100,
      yPct: (cand.cy / height) * 100,
      intensity,
      areaScore: cand.hotCount,
    });
    if (chosen.length >= 6) break;
  }

  return chosen;
}

export default function ThermalOrdnanceScanner({
  base,
  allBases,
  onChangeBase,
  onClose,
  onFlyToBase,
}: ThermalOrdnanceScannerProps) {
  const [palette, setPalette] = useState<ThermalPalette>('ironbow');
  const [zoomPresetId, setZoomPresetId] = useState<'close' | 'medium' | 'wide'>('medium');
  const [showHotspots, setShowHotspots] = useState(true);
  const [showOsmPins, setShowOsmPins] = useState(true);

  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0); // 0..100 animated sweep
  const [hotspots, setHotspots] = useState<ThermalHotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  const [infraLoading, setInfraLoading] = useState(false);
  const [infra, setInfra] = useState<InfraResponse | null>(null);

  const [probe, setProbe] = useState<{
    xPct: number;
    yPct: number;
    index: number;
    lat: number;
    lng: number;
  } | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<{
    label: string;
    lat: number;
    lng: number;
    xPct?: number;
    yPct?: number;
    intensity?: number;
  } | null>(null);
  const [copiedCoordKey, setCopiedCoordKey] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const thermalMapRef = useRef<Uint8Array | null>(null);
  const [scanNonce, setScanNonce] = useState(0);

  const zoomConfig = ZOOM_PRESETS.find((z) => z.id === zoomPresetId) ?? ZOOM_PRESETS[1];
  const arsenal = useMemo(() => getPublicArsenalProfile(base), [base]);
  const border = useMemo(() => getNearestCambodiaBorder(base.lat, base.lng), [base.lat, base.lng]);

  // Compute exact geographic bbox matching /api/scanner/satellite-image
  const frameBbox = useMemo(() => {
    const aspect = CANVAS_W / CANVAS_H;
    const dLat = zoomConfig.halfHeightKm / 111.32;
    const cosLat = Math.max(0.2, Math.cos((base.lat * Math.PI) / 180));
    const dLng = (zoomConfig.halfHeightKm * aspect) / (111.32 * cosLat);
    return {
      minLng: base.lng - dLng,
      maxLng: base.lng + dLng,
      minLat: base.lat - dLat,
      maxLat: base.lat + dLat,
    };
  }, [base.lat, base.lng, zoomConfig.halfHeightKm]);

  // Paint selected palette onto canvas from cached pixel buffer
  const renderPaletteToCanvas = useCallback(
    (activePalette: ThermalPalette) => {
      const canvas = canvasRef.current;
      const orig = originalImageDataRef.current;
      const thermal = thermalMapRef.current;
      if (!canvas || !orig || !thermal) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (activePalette === 'optical') {
        ctx.putImageData(orig, 0, 0);
        return;
      }

      const out = ctx.createImageData(CANVAS_W, CANVAS_H);
      const dst = out.data;
      const lut =
        activePalette === 'ironbow'
          ? IRONBOW_LUT
          : activePalette === 'inferno'
            ? INFERNO_LUT
            : null;

      for (let i = 0; i < thermal.length; i++) {
        const t = thermal[i];
        const px = i * 4;
        if (lut) {
          dst[px] = lut[t * 3];
          dst[px + 1] = lut[t * 3 + 1];
          dst[px + 2] = lut[t * 3 + 2];
        } else {
          // High-contrast White-Hot FLIR
          const stretched = Math.max(0, Math.min(255, Math.round((t - 24) * 1.18)));
          dst[px] = stretched;
          dst[px + 1] = stretched;
          dst[px + 2] = stretched;
        }
        dst[px + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
    },
    []
  );

  // Load real satellite snapshot from same-origin proxy & extract thermal radiance map
  useEffect(() => {
    let cancelled = false;
    setImgLoading(true);
    setImgError(null);
    setHotspots([]);
    setSelectedHotspotId(null);
    setPinnedPoint(null);
    setScanProgress(0);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    const url = `/api/scanner/satellite-image?lat=${base.lat.toFixed(5)}&lng=${base.lng.toFixed(
      5
    )}&halfHeightKm=${zoomConfig.halfHeightKm}&width=${CANVAS_W}&height=${CANVAS_H}`;

    img.onload = () => {
      if (cancelled) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_W;
      offscreen.height = CANVAS_H;
      const octx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!octx) {
        setImgError('កម្មវិធីរុករកមិនគាំទ្រការវិភាគរូបភាព Canvas ទេ។');
        setImgLoading(false);
        return;
      }
      octx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
      const imgData = octx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      const src = imgData.data;
      const thermal = new Uint8Array(CANVAS_W * CANVAS_H);

      for (let i = 0; i < thermal.length; i++) {
        const px = i * 4;
        thermal[i] = computeThermalSignal(src[px], src[px + 1], src[px + 2]);
      }

      originalImageDataRef.current = imgData;
      thermalMapRef.current = thermal;
      renderPaletteToCanvas(palette);

      const detected = detectHotspotClusters(thermal, CANVAS_W, CANVAS_H);
      setHotspots(detected);
      setImgLoading(false);
    };

    img.onerror = () => {
      if (cancelled) return;
      setImgError('មិនអាចទាញយករូបភាពផ្កាយរណបសម្រាប់ស្កេនកំដៅបានទេ។ សូមសាកល្បងម្តងទៀត។');
      setImgLoading(false);
    };

    img.src = url;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.id, base.lat, base.lng, zoomConfig.halfHeightKm, scanNonce]);

  // Re-render immediately when user switches FLIR palette
  useEffect(() => {
    renderPaletteToCanvas(palette);
  }, [palette, renderPaletteToCanvas]);

  // Smooth animated FLIR scanline sweep when image finishes loading
  useEffect(() => {
    if (imgLoading || imgError) return;
    let rafId = 0;
    const start = performance.now();
    const duration = 1200;

    const step = (now: number) => {
      const pct = Math.min(100, ((now - start) / duration) * 100);
      setScanProgress(pct);
      if (pct < 100) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [imgLoading, imgError, scanNonce]);

  // Fetch real OpenStreetMap structures inside base perimeter
  useEffect(() => {
    const controller = new AbortController();
    setInfraLoading(true);
    setInfra(null);

    fetch(
      `/api/scanner/infrastructure?lat=${base.lat.toFixed(5)}&lng=${base.lng.toFixed(
        5
      )}&radiusM=${zoomConfig.radiusM}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data: InfraResponse) => {
        if (!controller.signal.aborted) {
          setInfra(data);
        }
      })
      .catch(() => {
        // Keep clean empty state on abort/failure
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setInfraLoading(false);
        }
      });

    return () => controller.abort();
  }, [base.id, base.lat, base.lng, zoomConfig.radiusM, scanNonce]);

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const copyCoordinates = useCallback(async (lat: number, lng: number, key: string) => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopiedCoordKey(key);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedCoordKey(null), 1800);
    }
  }, []);

  // Attach exact geographic coordinates (lat, lng) to each detected thermal hotspot
  const enrichedHotspots = useMemo(() => {
    return hotspots.map((hs) => ({
      ...hs,
      lat: frameBbox.maxLat - (hs.yPct / 100) * (frameBbox.maxLat - frameBbox.minLat),
      lng: frameBbox.minLng + (hs.xPct / 100) * (frameBbox.maxLng - frameBbox.minLng),
    }));
  }, [hotspots, frameBbox]);

  // Project OSM structures that fall inside the current satellite viewport
  const visibleOsmPins = useMemo(() => {
    if (!infra?.structures.length) return [];
    const { minLng, maxLng, minLat, maxLat } = frameBbox;
    return infra.structures
      .map((s) => {
        const xPct = ((s.lng - minLng) / (maxLng - minLng)) * 100;
        const yPct = ((maxLat - s.lat) / (maxLat - minLat)) * 100;
        return { ...s, xPct, yPct };
      })
      .filter((p) => p.xPct >= 3 && p.xPct <= 97 && p.yPct >= 4 && p.yPct <= 96)
      .slice(0, 18);
  }, [infra, frameBbox]);

  const activeCoordTarget = useMemo(() => {
    if (pinnedPoint) {
      return {
        label: pinnedPoint.label,
        lat: pinnedPoint.lat,
        lng: pinnedPoint.lng,
        intensity: pinnedPoint.intensity,
        isCustom: true,
      };
    }
    if (selectedHotspotId) {
      const hs = enrichedHotspots.find((h) => h.id === selectedHotspotId);
      if (hs) {
        return {
          label: `ចំណុចកំដៅ ${hs.id}`,
          lat: hs.lat,
          lng: hs.lng,
          intensity: hs.intensity,
          isCustom: true,
        };
      }
    }
    return {
      label: 'កូអរដោណេមជ្ឈមណ្ឌលបន្ទាយ',
      lat: base.lat,
      lng: base.lng,
      intensity: undefined as number | undefined,
      isCustom: false,
    };
  }, [pinnedPoint, selectedHotspotId, enrichedHotspots, base.lat, base.lng]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const thermal = thermalMapRef.current;
    if (!thermal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const px = Math.min(CANVAS_W - 1, Math.floor(relX * CANVAS_W));
    const py = Math.min(CANVAS_H - 1, Math.floor(relY * CANVAS_H));
    const val = thermal[py * CANVAS_W + px] ?? 0;
    const index = Math.round((val / 255) * 100);
    const lat = frameBbox.maxLat - relY * (frameBbox.maxLat - frameBbox.minLat);
    const lng = frameBbox.minLng + relX * (frameBbox.maxLng - frameBbox.minLng);
    setProbe({
      xPct: relX * 100,
      yPct: relY * 100,
      index,
      lat,
      lng,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const thermal = thermalMapRef.current;
    if (!thermal || imgLoading || imgError) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const px = Math.min(CANVAS_W - 1, Math.floor(relX * CANVAS_W));
    const py = Math.min(CANVAS_H - 1, Math.floor(relY * CANVAS_H));
    const val = thermal[py * CANVAS_W + px] ?? 0;
    const index = Math.round((val / 255) * 100);
    const lat = frameBbox.maxLat - relY * (frameBbox.maxLat - frameBbox.minLat);
    const lng = frameBbox.minLng + relX * (frameBbox.maxLng - frameBbox.minLng);
    setSelectedHotspotId(null);
    setPinnedPoint({
      label: 'ចំណុចកំដៅដែលបានចុចលើរូបភាព',
      lat,
      lng,
      xPct: relX * 100,
      yPct: relY * 100,
      intensity: index,
    });
  };

  const densityStyles =
    arsenal.density === 'high'
      ? {
          box: 'bg-rose-950/35 border-rose-500/45',
          badge: 'bg-rose-500/20 text-rose-200 border border-rose-500/45',
          bar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
          text: 'text-rose-300',
        }
      : arsenal.density === 'medium'
        ? {
            box: 'bg-amber-950/30 border-amber-500/40',
            badge: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
            bar: 'bg-gradient-to-r from-emerald-500 to-amber-400',
            text: 'text-amber-300',
          }
        : {
            box: 'bg-emerald-950/30 border-emerald-500/40',
            badge: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
            bar: 'bg-emerald-400',
            text: 'text-emerald-300',
          };

  // Sort base selector so fighter/high-density bases appear easily near top
  const selectableBases = useMemo(() => {
    return [...allBases].sort((a, b) => {
      if (Boolean(b.isFighterBase) !== Boolean(a.isFighterBase)) {
        return b.isFighterBase ? 1 : -1;
      }
      if (a.scale !== b.scale) return a.scale === 'major' ? -1 : 1;
      return a.nameKm.localeCompare(b.nameKm);
    });
  }, [allBases]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ស្កេនកំដៅ FLIR និងវិភាគសព្វាវុធក្នុងបន្ទាយ"
      className="fixed inset-0 z-50 bg-[#04070D]/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5"
    >
      <div className="w-full max-w-[1140px] max-h-[94vh] rounded-2xl bg-[#0A101A] border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Studio Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#070B13] border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/40 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-[15px] font-semibold text-slate-50 truncate">
                ស្កេនកំដៅ FLIR និងវិភាគកម្រិតអាវុធក្នុងបន្ទាយ
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {base.nameKm} · {base.provinceKm} ({base.lat.toFixed(4)}°N, {base.lng.toFixed(4)}°E)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setScanNonce((n) => n + 1)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121C2C] hover:bg-[#19263B] border border-slate-700/80 text-xs text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
              <span>ស្កេនម្តងទៀត</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onFlyToBase(base);
                onClose();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-xs text-cyan-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ហោះមើល 3D</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="បិទផ្ទាំងស្កេនកំដៅ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.38fr_1fr] overflow-y-auto lg:overflow-hidden">
          {/* LEFT: Live Interactive FLIR Optical-Thermal Satellite Viewport */}
          <div className="p-4 sm:p-5 flex flex-col gap-3.5 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#070B12] lg:overflow-y-auto">
            {/* Palette & Zoom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0C1320] border border-slate-800">
                {PALETTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPalette(opt.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                      palette === opt.id
                        ? opt.id === 'optical'
                          ? 'bg-cyan-500/20 text-cyan-200'
                          : 'bg-orange-500/25 text-orange-200'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0C1320] border border-slate-800">
                {ZOOM_PRESETS.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setZoomPresetId(z.id)}
                    className={`px-2 py-1 rounded-md text-[10.5px] font-medium transition-colors whitespace-nowrap ${
                      zoomPresetId === z.id
                        ? 'bg-[#1A273D] text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Canvas Frame */}
            <div
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setProbe(null)}
              onClick={handleCanvasClick}
              className="relative w-full aspect-[640/380] rounded-xl overflow-hidden border border-slate-700/80 bg-[#04070D] select-none cursor-crosshair"
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="w-full h-full object-cover block"
              />

              {/* Loading Overlay */}
              {imgLoading && (
                <div className="absolute inset-0 bg-[#05080F]/88 flex flex-col items-center justify-center gap-2 text-xs text-orange-200">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                  <span>កំពុងទាញរូបភាពផ្កាយរណប និងបំប្លែងស្រទាប់កំដៅ FLIR...</span>
                </div>
              )}

              {/* Error Overlay */}
              {imgError && !imgLoading && (
                <div className="absolute inset-0 bg-[#05080F]/92 flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-rose-200">
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                  <p>{imgError}</p>
                  <button
                    type="button"
                    onClick={() => setScanNonce((n) => n + 1)}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs"
                  >
                    ព្យាយាមម្តងទៀត
                  </button>
                </div>
              )}

              {/* Animated Horizontal FLIR Scan Sweep Bar */}
              {!imgLoading && !imgError && scanProgress < 100 && (
                <div
                  className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_18px_rgba(251,191,36,0.9)]"
                  style={{ top: `${scanProgress}%` }}
                />
              )}

              {/* HUD Corner Reticles */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-orange-400/75" />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-orange-400/75" />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-orange-400/75" />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-orange-400/75" />
              </div>

              {/* Optical FLIR High-Radiance Cluster Boxes */}
              {!imgLoading &&
                !imgError &&
                showHotspots &&
                scanProgress >= 95 &&
                enrichedHotspots.map((hs) => {
                  const isSel = selectedHotspotId === hs.id && !pinnedPoint;
                  return (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPinnedPoint(null);
                        setSelectedHotspotId(isSel ? null : hs.id);
                      }}
                      style={{ left: `${hs.xPct}%`, top: `${hs.yPct}%` }}
                      title={`${hs.id} — កម្រិតចំណាំងកំដៅផ្ទៃ ${hs.intensity}/100 (${hs.lat.toFixed(5)}, ${hs.lng.toFixed(5)})`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded border transition-transform ${
                        isSel
                          ? 'border-white bg-amber-400/25 scale-110 z-20 ring-2 ring-orange-400/60'
                          : 'border-amber-300/85 bg-amber-400/10 hover:scale-110 z-10'
                      }`}
                    >
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-[#05080F]/90 border border-amber-400/60 font-mono-tabular text-[9px] text-amber-200 whitespace-nowrap">
                        {hs.id} · {hs.intensity}
                      </span>
                    </button>
                  );
                })}

              {/* Custom Pinned Click Marker on Thermal Canvas */}
              {!imgLoading &&
                !imgError &&
                pinnedPoint?.xPct !== undefined &&
                pinnedPoint?.yPct !== undefined && (
                  <div
                    style={{ left: `${pinnedPoint.xPct}%`, top: `${pinnedPoint.yPct}%` }}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-300 bg-cyan-400/20 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.8)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                )}

              {/* Real Geolocated OpenStreetMap Military Structures Overlay */}
              {!imgLoading &&
                !imgError &&
                showOsmPins &&
                visibleOsmPins.map((pin) => (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHotspotId(null);
                      setPinnedPoint({
                        label: `${pin.name} (OSM)`,
                        lat: pin.lat,
                        lng: pin.lng,
                        xPct: pin.xPct,
                        yPct: pin.yPct,
                      });
                    }}
                    style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
                    title={`${pin.name} (${pin.categoryKm} · ${pin.distanceM}m)`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group p-1"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 border border-[#05080F] shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                    <div className="hidden group-hover:block absolute bottom-4 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[#05080F]/95 border border-cyan-500/50 text-[10px] text-cyan-100 whitespace-nowrap z-30 shadow-lg">
                      {pin.name} ({pin.distanceM}m)
                    </div>
                  </button>
                ))}

              {/* Top-left HUD Telemetry */}
              <div className="pointer-events-none absolute top-3 left-3.5 px-2 py-1 rounded bg-[#05080F]/82 border border-slate-700/70 font-mono-tabular text-[10px] text-slate-200 flex items-center gap-2">
                <span className="text-orange-300 font-semibold uppercase">{palette}</span>
                <span className="text-slate-500">|</span>
                <span>
                  {base.lat.toFixed(4)}°N, {base.lng.toFixed(4)}°E
                </span>
              </div>

              {/* Live Cursor Thermal Probe Readout */}
              {probe && (
                <div className="pointer-events-none absolute top-3 right-3.5 px-2.5 py-1 rounded bg-[#05080F]/88 border border-orange-500/50 font-mono-tabular text-[10px] text-amber-200">
                  សន្ទស្សន៍កំដៅផ្ទៃ: <span className="font-bold text-white">{probe.index}/100</span> ·{' '}
                  {probe.lat.toFixed(4)}, {probe.lng.toFixed(4)}
                </div>
              )}

              {/* Bottom FLIR Colorbar Legend */}
              <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#05080F]/85 border border-slate-800/90 text-[10px] text-slate-300">
                  <span>ត្រជាក់</span>
                  <div
                    className="w-24 sm:w-36 h-2 rounded-sm"
                    style={{
                      background:
                        palette === 'inferno'
                          ? 'linear-gradient(90deg, #04040C, #4E0C42, #C02A24, #F8981C, #FFFCE8)'
                          : palette === 'whitehot'
                            ? 'linear-gradient(90deg, #09090B, #71717A, #FAFAFA)'
                            : 'linear-gradient(90deg, #07051C, #220E6C, #86187E, #E05222, #FCC626, #FFFFF4)',
                    }}
                  />
                  <span className="text-amber-300 font-medium">ចំណាំងខ្ពស់</span>
                </div>

                <div className="px-2 py-1 rounded bg-[#05080F]/85 border border-slate-800/90 font-mono-tabular text-[10px] text-slate-300">
                  ចំណុចកំដៅផ្ទៃ: <span className="text-amber-300 font-semibold">{hotspots.length}</span> · OSM:{' '}
                  <span className="text-cyan-300 font-semibold">{visibleOsmPins.length}</span>
                </div>
              </div>
            </div>

            {/* Thermal Location Coordinates Bar + One-Click Copy (Directly Below FLIR Image) */}
            <div className="p-3 rounded-xl bg-[#0B1220] border border-orange-500/35 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="font-medium text-orange-200 truncate">
                      {activeCoordTarget.label}
                    </span>
                    {activeCoordTarget.intensity !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 font-mono-tabular text-[10px] text-amber-200">
                        កំដៅផ្ទៃ {activeCoordTarget.intensity}/100
                      </span>
                    )}
                    {activeCoordTarget.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          setPinnedPoint(null);
                          setSelectedHotspotId(null);
                        }}
                        className="text-[10.5px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        ត្រឡប់ទៅមជ្ឈមណ្ឌលបន្ទាយ
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyCoordinates(activeCoordTarget.lat, activeCoordTarget.lng, 'main')
                    }
                    title="ចុចដើម្បីចម្លងលេខកូអរដោណេ"
                    className="mt-1 text-left group flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5"
                  >
                    <span className="font-mono-tabular text-sm sm:text-[15px] font-semibold text-cyan-300 group-hover:text-cyan-200 tracking-tight">
                      {activeCoordTarget.lat.toFixed(6)}, {activeCoordTarget.lng.toFixed(6)}
                    </span>
                    <span className="font-mono-tabular text-[11px] text-slate-400">
                      ({formatDMS(activeCoordTarget.lat, true)} · {formatDMS(activeCoordTarget.lng, false)})
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copyCoordinates(activeCoordTarget.lat, activeCoordTarget.lng, 'main')
                  }
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    copiedCoordKey === 'main'
                      ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-200'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  {copiedCoordKey === 'main' ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>បានចម្លងកូអរដោណេ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>ចម្លងលេខកូអរដោណេ</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Clickable Thermal Hotspot Coordinate Chips (HS-01..HS-06) */}
              {enrichedHotspots.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[10.5px] text-slate-400">
                    ចុចលើចំណុចកំដៅខាងក្រោម ឬចុចផ្ទាល់លើរូបភាព ដើម្បីមើល និងចម្លងកូអរដោណេជាក់លាក់៖
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {enrichedHotspots.map((hs) => {
                      const isSel = selectedHotspotId === hs.id && !pinnedPoint;
                      const isCopied = copiedCoordKey === hs.id;
                      return (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => {
                            setPinnedPoint(null);
                            setSelectedHotspotId(hs.id);
                            copyCoordinates(hs.lat, hs.lng, hs.id);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono-tabular text-[10.5px] transition-colors ${
                            isCopied
                              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                              : isSel
                                ? 'bg-orange-500/25 border-orange-400/70 text-orange-100'
                                : 'bg-[#070B13] border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-200'
                          }`}
                        >
                          <span className="font-semibold text-amber-300">{hs.id}</span>
                          <span>
                            {hs.lat.toFixed(5)}, {hs.lng.toFixed(5)}
                          </span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-300 shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Layer Toggle Checkboxes */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowHotspots((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    showHotspots
                      ? 'bg-amber-500/15 border-amber-500/45 text-amber-200'
                      : 'bg-[#0C1320] border-slate-800 text-slate-400'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>ចំណុចចំណាំងកំដៅ ({hotspots.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOsmPins((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                    showOsmPins
                      ? 'bg-cyan-500/15 border-cyan-500/45 text-cyan-200'
                      : 'bg-[#0C1320] border-slate-800 text-slate-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>រចនាសម្ព័ន្ធ OSM ({visibleOsmPins.length})</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                ចុចលើចំណុចណាមួយលើរូបភាព ដើម្បីចាប់កូអរដោណេ
              </span>
            </div>

            {/* Scientific Transparency Notice */}
            <div className="p-3 rounded-xl bg-[#0D1524] border border-slate-800/90 flex items-start gap-2.5 text-[11.5px] leading-relaxed text-slate-300">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-100">កំណត់សម្គាល់បច្ចេកទេស៖</strong>{' '}
                ផ្កាយរណបស៊ីវិលសាធារណៈមិនអាចផ្សាយបន្តផ្ទាល់កំដៅអាវុធ ឬមើលធ្លុះដំបូលឃ្លាំងតាមពេលវេលាជាក់ស្តែងបានទេ។
                ផ្ទាំងនេះបំប្លែងរូបភាពផ្កាយរណបជាក់ស្តែងទៅជា{' '}
                <span className="text-orange-300">តម្រងក្លែងបន្លំកំដៅ FLIR</span>{' '}
                ដើម្បីបង្ហាញផ្ទៃលោហៈ ឃ្លាំង ទីលានចត និងយានយន្ត រួមផ្សំជាមួយការស្កេនរចនាសម្ព័ន្ធ{' '}
                <span className="text-cyan-300">OpenStreetMap ផ្ទាល់</span>{' '}
                និងកម្រិតគ្រឿងសព្វាវុធតាមឯកសារសាធារណៈ។
              </p>
            </div>
          </div>

          {/* RIGHT: Ordnance Density Verdict + Live OSM Structures + Base Switcher */}
          <div className="p-4 sm:p-5 flex flex-col gap-4 bg-[#0B111C] lg:overflow-y-auto">
            {/* Base Selector Dropdown */}
            <div className="space-y-1.5">
              <label
                htmlFor="thermal-base-select"
                className="block text-[11px] font-medium text-slate-400"
              >
                ប្តូរបន្ទាយដើម្បីស្កេនកំដៅ និងប្រៀបធៀបកម្រិតអាវុធ
              </label>
              <select
                id="thermal-base-select"
                value={base.id}
                onChange={(e) => {
                  const found = allBases.find((b) => b.id === e.target.value);
                  if (found) onChangeBase(found);
                }}
                className="w-full rounded-lg bg-[#070B13] border border-slate-700/90 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-orange-400"
              >
                {selectableBases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.isFighterBase ? '✈ ' : ''}
                    {b.nameKm} ({b.provinceKm})
                  </option>
                ))}
              </select>
            </div>

            {/* Verdict Card: ច្រើន / មធ្យម / តិច */}
            <section className={`p-3.5 rounded-xl border space-y-3 ${densityStyles.box}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-300">
                    កម្រិតអាវុធ និងគ្រឿងបរិក្ខារ (ទិន្នន័យសាធារណៈ)
                  </div>
                  <div className={`mt-1 text-base font-bold ${densityStyles.text}`}>
                    {arsenal.densityLabelKm}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${densityStyles.badge}`}
                >
                  {arsenal.densityShortKm}
                </span>
              </div>

              {/* Scale Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-900/90 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${densityStyles.bar}`}
                    style={{ width: `${arsenal.estimatedScaleScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono-tabular text-slate-400">
                  <span>តិច (បន្ទាយមូលដ្ឋាន)</span>
                  <span>មធ្យម</span>
                  <span>ច្រើន (ស្នូលយុទ្ធសាស្ត្រ)</span>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed text-slate-300">{arsenal.noteKm}</p>

              {/* Documented Public Weapon Systems */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-semibold text-slate-200">
                  ប្រភេទអាវុធ និងយុទ្ធោបករណ៍សំខាន់ៗ (តាមឯកសារសាធារណៈ)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {arsenal.documentedSystems.map((sys) => (
                    <span
                      key={sys}
                      className="px-2 py-1 rounded-md bg-[#070B13]/90 border border-slate-700/80 text-[11px] text-sky-200 font-mono-tabular"
                    >
                      {sys}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-[11.5px] text-slate-300 list-disc pl-4 pt-0.5">
                  {arsenal.primaryCategoriesKm.map((cat) => (
                    <li key={cat}>{cat}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Real OpenStreetMap Infrastructure Scan inside Base */}
            <section className="p-3.5 rounded-xl bg-[#070B13] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Radar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>រចនាសម្ព័ន្ធផ្ទុកអាវុធ/យានយន្ត (OSM ផ្ទាល់)</span>
                </div>
                <span className="font-mono-tabular text-[11px] text-cyan-300">
                  {infraLoading ? 'កំពុងស្កេន...' : `${infra?.total ?? 0} ទីតាំង`}
                </span>
              </div>

              {infraLoading ? (
                <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>កំពុងស្កេនឃ្លាំងយន្តហោះ លេណដ្ឋាន និងស្តុកក្នុងរង្វង់ {zoomConfig.radiusM}m...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-2 rounded-lg bg-[#0C1320] border border-slate-800/80">
                      <div className="font-mono-tabular text-sm font-semibold text-sky-300">
                        {infra?.counts.hangar ?? 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">ឃ្លាំង/ទីលាន</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C1320] border border-slate-800/80">
                      <div className="font-mono-tabular text-sm font-semibold text-orange-300">
                        {(infra?.counts.bunker ?? 0) + (infra?.counts.fuel ?? 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">លេណដ្ឋាន/ប្រេង</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#0C1320] border border-slate-800/80">
                      <div className="font-mono-tabular text-sm font-semibold text-emerald-300">
                        {(infra?.counts.helipad ?? 0) +
                          (infra?.counts.barracks ?? 0) +
                          (infra?.counts.radar ?? 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">អគារ/រ៉ាដា/Heli</div>
                    </div>
                  </div>

                  {infra && infra.structures.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/70 rounded-lg border border-slate-800/80 bg-[#0A101B]">
                      {infra.structures.slice(0, 12).map((s) => (
                        <div
                          key={s.id}
                          className="px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <div className="text-slate-200 truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{s.categoryKm}</div>
                          </div>
                          <span className="font-mono-tabular text-[10.5px] text-cyan-300 shrink-0">
                            {s.distanceM} m
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      {infra?.degraded
                        ? 'ម៉ាស៊ីនមេ OpenStreetMap មមាញឹកបណ្តោះអាសន្ន។ សូមចុចស្កេនម្តងទៀត ឬពិនិត្យចំណុចកំដៅផ្ទៃលើរូបភាព FLIR។'
                        : 'ពុំទាន់មានទិន្នន័យស្លាកឃ្លាំង/លេណដ្ឋានលម្អិតក្នុង OpenStreetMap សម្រាប់បរិវេណនេះទេ។ សូមពិនិត្យផ្ទាល់លើរូបភាព FLIR ខាងឆ្វេង។'}
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Quick Base Geodetic Context */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="p-2.5 rounded-lg bg-[#070B13] border border-slate-800">
                <div className="text-slate-400 text-[10px]">ប្រភេទទ័ព</div>
                <div className={`mt-0.5 font-medium ${BRANCH_META[base.branch].textClass}`}>
                  {BRANCH_META[base.branch].labelKm}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070B13] border border-slate-800">
                <div className="text-slate-400 text-[10px]">ចម្ងាយពីព្រំដែនកម្ពុជា</div>
                <div className="mt-0.5 font-mono-tabular text-cyan-300 font-medium">
                  {Math.round(border.distanceKm)} km ({border.ref.nameKm})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
