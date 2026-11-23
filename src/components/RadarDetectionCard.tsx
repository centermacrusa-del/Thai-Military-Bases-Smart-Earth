import { useEffect, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Image as ImageIcon,
  Radar,
  Satellite,
  X,
} from 'lucide-react';
import {
  bearingToCompassKm,
  BRANCH_META,
  getPublicArsenalProfile,
  getSatelliteExportUrl,
  getSatelliteTileUrl,
  type MilitaryBase,
} from '../data/bases';
import type { RadarDetection } from './RadarScanPanel';

interface RadarDetectionCardProps {
  detection: RadarDetection;
  currentIndex: number;
  totalDetected: number;
  onPrev: () => void;
  onNext: () => void;
  onInspectBase: (base: MilitaryBase) => void;
  onOpenStreetView: (base: MilitaryBase) => void;
  onOpenThermalScan: (base: MilitaryBase) => void;
  onDismiss: () => void;
}

type PhotoSource = 'satellite' | 'street';

// Cache KartaView street thumbnails per base ID to avoid repeated requests during radar sweeps
const streetThumbCache = new Map<string, string | null>();

export default function RadarDetectionCard({
  detection,
  currentIndex,
  totalDetected,
  onPrev,
  onNext,
  onInspectBase,
  onOpenStreetView,
  onOpenThermalScan,
  onDismiss,
}: RadarDetectionCardProps) {
  const { base, distanceKm, bearingDeg } = detection;
  const arsenal = getPublicArsenalProfile(base);
  const [photoSource, setPhotoSource] = useState<PhotoSource>('satellite');
  const [useTileFallback, setUseTileFallback] = useState(false);
  const [streetPhotoUrl, setStreetPhotoUrl] = useState<string | null>(
    () => streetThumbCache.get(base.id) ?? null
  );

  // Reset image mode & fetch nearby real KartaView street photo in background (debounced + cached)
  useEffect(() => {
    setPhotoSource('satellite');
    setUseTileFallback(false);

    if (streetThumbCache.has(base.id)) {
      setStreetPhotoUrl(streetThumbCache.get(base.id) ?? null);
      return;
    }

    setStreetPhotoUrl(null);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/streetview/kartaview?lat=${base.lat.toFixed(5)}&lng=${base.lng.toFixed(5)}&radius=500`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          streetThumbCache.set(base.id, null);
          return;
        }
        const data = (await res.json()) as { frames?: Array<{ imageUrl?: string; thumbUrl?: string }> };
        if (controller.signal.aborted) return;
        const firstUrl = data.frames?.[0]?.thumbUrl || data.frames?.[0]?.imageUrl || null;
        streetThumbCache.set(base.id, firstUrl);
        setStreetPhotoUrl(firstUrl);
      } catch {
        // Silent fallback — satellite imagery is always displayed cleanly
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [base.id, base.lat, base.lng]);

  const satExportUrl = getSatelliteExportUrl(base.lat, base.lng, {
    halfHeightKm: base.scale === 'camp' ? 0.42 : 0.82,
    width: 480,
    height: 270,
  });
  const satTileUrl = getSatelliteTileUrl(base.lat, base.lng, base.scale === 'camp' ? 15 : 14);
  const activeImgSrc =
    photoSource === 'street' && streetPhotoUrl
      ? streetPhotoUrl
      : useTileFallback
        ? satTileUrl
        : satExportUrl;

  const branchMeta = BRANCH_META[base.branch];
  const badgeColor =
    base.source === 'osm'
      ? '#F59E0B'
      : base.isFighterBase
        ? BRANCH_META.airforce.color
        : base.scale === 'camp'
          ? '#34D399'
          : branchMeta.color;

  return (
    <aside
      aria-label="រូបភាពទីតាំងដែលរ៉ាដាចាប់បាន"
      className="absolute bottom-14 left-3 z-20 w-[calc(100%-24px)] max-w-[324px] rounded-xl bg-[#090F1A]/94 border border-emerald-500/35 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Top Acquisition Header */}
      <div className="px-3 py-2 bg-[#070C15]/90 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-300 truncate">
            រ៉ាដាចាប់បានទីតាំង
          </span>
          <span className="font-mono-tabular text-[10px] text-slate-400 shrink-0">
            ({currentIndex + 1}/{totalDetected})
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {totalDetected > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                aria-label="ទីតាំងមុន"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="ទីតាំងបន្ទាប់"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="បិទផ្ទាំងរូបភាពរ៉ាដា"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real Satellite / Street HD Visual Frame */}
      <div className="relative aspect-[16/9] w-full bg-[#05080F] overflow-hidden group">
        <img
          key={activeImgSrc}
          src={activeImgSrc}
          alt={`រូបភាពទីតាំង ${base.nameKm}`}
          referrerPolicy="no-referrer"
          onError={() => {
            if (photoSource === 'street') {
              setPhotoSource('satellite');
            } else if (!useTileFallback) {
              setUseTileFallback(true);
            }
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Subtle Optical Targeting Corners & Center Crosshair (Satellite Mode) */}
        {photoSource === 'satellite' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400/75" />
            <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400/75" />
            <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400/75" />
            <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400/75" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border border-emerald-400/80 bg-emerald-400/10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Scrim with Distance/Bearing & Source Toggle */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05080F]/95 via-[#05080F]/55 to-transparent px-2.5 pt-5 pb-2 flex items-end justify-between gap-2">
          <div className="font-mono-tabular text-[10.5px] text-slate-200 flex items-center gap-1.5">
            <span
              className="w-2 h-2 inline-block shrink-0"
              style={{
                backgroundColor: badgeColor,
                transform: base.scale === 'camp' ? 'rotate(45deg)' : undefined,
                borderRadius: base.scale === 'camp' ? '1px' : '9999px',
              }}
            />
            <span className="text-cyan-300 font-semibold">{Math.round(distanceKm)} km</span>
            <span className="text-slate-400">
              {String(Math.round(bearingDeg)).padStart(3, '0')}° {bearingToCompassKm(bearingDeg)}
            </span>
          </div>

          {/* Satellite vs Street HD Toggle when KartaView imagery is available */}
          {streetPhotoUrl ? (
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#070B13]/90 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setPhotoSource('satellite')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  photoSource === 'satellite'
                    ? 'bg-emerald-500/25 text-emerald-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Satellite className="w-2.5 h-2.5" />
                <span>ផ្កាយរណប</span>
              </button>
              <button
                type="button"
                onClick={() => setPhotoSource('street')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  photoSource === 'street'
                    ? 'bg-cyan-500/25 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-2.5 h-2.5" />
                <span>ផ្លូវ HD</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-300/90 bg-[#070B13]/80 border border-slate-700/70 px-1.5 py-0.5 rounded">
              ផ្កាយរណបជាក់ស្តែង
            </span>
          )}
        </div>
      </div>

      {/* Base Metadata & Instant Actions */}
      <div className="p-3 space-y-2.5">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold text-slate-50 leading-snug line-clamp-1">
              {base.nameKm}
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 border ${
                arsenal.density === 'high'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : arsenal.density === 'medium'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
              }`}
            >
              អាវុធ៖ {arsenal.densityShortKm}
            </span>
          </div>
          {base.aircraftTypes && base.aircraftTypes.length > 0 && (
            <div className="text-[11px] font-medium text-sky-300 font-mono-tabular truncate mt-0.5">
              {base.aircraftTypes.join(' · ')}
            </div>
          )}
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            {base.provinceKm} · {base.runwayOrPort || base.facilityTypeKm}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onOpenThermalScan(base)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/45 text-orange-200 text-[10.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5 shrink-0 text-orange-400" />
            <span>កំដៅ FLIR</span>
          </button>
          <button
            type="button"
            onClick={() => onInspectBase(base)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/28 border border-emerald-500/40 text-emerald-200 text-[10.5px] font-medium transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span>មើល 3D</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenStreetView(base)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>4K View</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
