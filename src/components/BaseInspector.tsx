import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Orbit,
  Radar,
  Ruler,
  Sparkles,
  X,
} from 'lucide-react';
import {
  bearingDegrees,
  bearingToCompassKm,
  BRANCH_META,
  formatDMS,
  getNearestCambodiaBorder,
  haversineKm,
  type MilitaryBase,
  PHNOM_PENH_COORD,
  REGION_META,
  SCALE_META,
} from '../data/bases';

interface BriefingData {
  historyKm: string;
  terrainKm: string;
  regionalContextKm: string;
}

interface BaseInspectorProps {
  base: MilitaryBase;
  onClose: () => void;
  onFly3D: (base: MilitaryBase) => void;
  onFlyTopDown: (base: MilitaryBase) => void;
  isOrbiting: boolean;
  onToggleOrbit: () => void;
  showRangeRings: boolean;
  onToggleRangeRings: () => void;
  onStartMeasureFromBase: (base: MilitaryBase) => void;
  onOpenStreetView: (base: MilitaryBase) => void;
}

const briefingClientCache = new Map<string, BriefingData>();

export default function BaseInspector({
  base,
  onClose,
  onFly3D,
  onFlyTopDown,
  isOrbiting,
  onToggleOrbit,
  showRangeRings,
  onToggleRangeRings,
  onStartMeasureFromBase,
  onOpenStreetView,
}: BaseInspectorProps) {
  const [copied, setCopied] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(
    () => briefingClientCache.get(base.id) ?? null
  );
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBriefing(briefingClientCache.get(base.id) ?? null);
    setBriefingError(null);
    setLoadingBriefing(false);
    setCopied(false);

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [base.id]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const branchMeta = BRANCH_META[base.branch];
  const regionMeta = REGION_META[base.region];
  const scaleMeta = SCALE_META[base.scale];
  const border = getNearestCambodiaBorder(base.lat, base.lng);
  const distPP = haversineKm(base.lat, base.lng, PHNOM_PENH_COORD.lat, PHNOM_PENH_COORD.lng);
  const bearingFromPP = bearingDegrees(PHNOM_PENH_COORD.lat, PHNOM_PENH_COORD.lng, base.lat, base.lng);

  const handleCopyCoords = async () => {
    const text = `${base.lat.toFixed(5)}, ${base.lng.toFixed(5)}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Fallback for sandboxed iframe environments where Clipboard API is restricted
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
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleGenerateBriefing = async () => {
    const targetId = base.id;
    const cached = briefingClientCache.get(targetId);
    if (cached) {
      setBriefing(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingBriefing(true);
    setBriefingError(null);
    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseId: targetId }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) {
        throw new Error(data.error || 'មិនអាចទាញយកទិន្នន័យវិភាគបានទេ។');
      }
      briefingClientCache.set(targetId, data);
      setBriefing(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setBriefingError(err instanceof Error ? err.message : 'មានបញ្ហាបណ្តាញ។');
    } finally {
      if (!controller.signal.aborted) {
        setLoadingBriefing(false);
      }
    }
  };

  const googleEarthUrl = `https://earth.google.com/web/@${base.lat},${base.lng},1500a,3500d,35y,0h,45t,0r`;

  return (
    <aside className="fixed lg:static inset-y-0 right-0 top-[52px] lg:top-0 z-30 w-full sm:w-[390px] lg:w-[380px] shrink-0 bg-[#0B1019] border-l border-slate-800/90 flex flex-col h-[calc(100%-52px)] lg:h-full overflow-hidden shadow-2xl lg:shadow-none">
      {/* Header */}
      <div className="px-5 pt-4 pb-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-400">
            <span className={`font-medium ${base.source === 'osm' ? 'text-amber-400' : branchMeta.textClass}`}>
              {base.source === 'osm' ? 'OSM Live' : scaleMeta.shortKm}
            </span>
            <span aria-hidden="true">·</span>
            <span>{branchMeta.shortKm}</span>
            <span aria-hidden="true">·</span>
            <span>{regionMeta.labelKm}</span>
          </div>
          <h2 className="mt-1.5 text-[17px] font-semibold text-slate-50 leading-snug">
            {base.nameKm}
          </h2>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {base.nameEn} · {base.nameTh}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="បិទផ្ទាំងព័ត៌មាន"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Primary 4K Street View Launch Action */}
        <button
          type="button"
          onClick={() => onOpenStreetView(base)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
        >
          <Camera className="w-4 h-4 shrink-0" />
          <span>បើក Street View 4K 360° នៅទីតាំងនេះ</span>
        </button>

        {/* 3D Camera & Spatial Action Toolbar */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleOrbit}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              isOrbiting
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-[#121A27] border border-slate-800 text-slate-200 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            <Orbit className="w-3.5 h-3.5 shrink-0" />
            <span>{isOrbiting ? 'បញ្ឈប់ការវិល' : 'ហោះវិលជុំ 360°'}</span>
          </button>

          <button
            type="button"
            onClick={() => onFly3D(base)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#121A27] border border-slate-800 text-slate-200 hover:border-cyan-500/50 hover:text-white transition-colors whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>មើលជិត 3D</span>
          </button>

          <button
            type="button"
            onClick={onToggleRangeRings}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              showRangeRings
                ? 'bg-cyan-500/15 border border-cyan-500/50 text-cyan-300'
                : 'bg-[#121A27] border border-slate-800 text-slate-200 hover:border-slate-700'
            }`}
          >
            <Radar className="w-3.5 h-3.5 shrink-0" />
            <span>រង្វង់ចម្ងាយ 50-300km</span>
          </button>

          <button
            type="button"
            onClick={() => onStartMeasureFromBase(base)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#121A27] border border-slate-800 text-slate-200 hover:border-cyan-500/50 hover:text-white transition-colors whitespace-nowrap"
          >
            <Ruler className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>វាស់ចម្ងាយពីទីនេះ</span>
          </button>
        </div>

        {/* Geodetic Coordinates & Distance Metrics */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300">កូអរដោណេ និងចម្ងាយភូមិសាស្ត្រ</h3>
            <button
              type="button"
              onClick={handleCopyCoords}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'បានចម្លង' : 'ចម្លងកូអរដោណេ'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-slate-800/80 text-xs">
            <div>
              <div className="text-[11px] text-slate-400">រយៈទទឹង / រយៈបណ្តោយ</div>
              <div className="mt-0.5 font-mono-tabular text-slate-100">
                {base.lat.toFixed(4)}, {base.lng.toFixed(4)}
              </div>
              <div className="text-[10.5px] font-mono-tabular text-slate-500 mt-0.5">
                {formatDMS(base.lat, true)} · {formatDMS(base.lng, false)}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">ខេត្ត / កម្ពស់ដី</div>
              <div className="mt-0.5 text-slate-100">{base.provinceKm}</div>
              <div className="text-[10.5px] font-mono-tabular text-slate-500 mt-0.5">
                {base.provinceEn} · {base.elevationM} m MSL
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">ជិតព្រំដែនកម្ពុជា</div>
              <div className="mt-0.5 font-mono-tabular text-cyan-300 font-medium">
                {Math.round(border.distanceKm)} km
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">ពី {border.ref.nameKm}</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400">ចម្ងាយពីភ្នំពេញ</div>
              <div className="mt-0.5 font-mono-tabular text-slate-100 font-medium">
                {Math.round(distPP)} km
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 font-mono-tabular">
                ទិស {Math.round(bearingFromPP)}° ({bearingToCompassKm(bearingFromPP)})
              </div>
            </div>
          </div>
        </section>

        {/* Public Overview */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-300">ព័ត៌មានសង្ខេប និងរចនាសម្ព័ន្ធ</h3>
          <p className="text-[13px] leading-relaxed text-slate-300">{base.summaryKm}</p>

          <dl className="space-y-2 pt-2 text-xs">
            <div className="flex justify-between gap-3 py-1.5 border-b border-slate-800/60">
              <dt className="text-slate-400 shrink-0">អង្គភាពគ្រប់គ្រង</dt>
              <dd className="text-slate-200 text-right">{base.commandKm}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5 border-b border-slate-800/60">
              <dt className="text-slate-400 shrink-0">ប្រភេទមូលដ្ឋាន</dt>
              <dd className="text-slate-200 text-right">{base.facilityTypeKm}</dd>
            </div>
            {base.runwayOrPort && (
              <div className="flex justify-between gap-3 py-1.5 border-b border-slate-800/60">
                <dt className="text-slate-400 shrink-0">ហេដ្ឋារចនាសម្ព័ន្ធ</dt>
                <dd className="text-slate-200 text-right font-mono-tabular">{base.runwayOrPort}</dd>
              </div>
            )}
          </dl>

          {base.keyUnitsKm.length > 0 && (
            <div className="pt-1">
              <div className="text-[11px] text-slate-400 mb-1.5">អង្គភាពសំខាន់ៗប្រចាំការ</div>
              <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                {base.keyUnitsKm.map((unit) => (
                  <li key={unit}>{unit}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* AI Deep Geographic Briefing */}
        <section className="pt-2 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200">
              {base.source === 'osm' ? 'ប្រភពទិន្នន័យរ៉ាដាផ្ទាល់' : 'ការវិភាគភូមិសាស្ត្រឆ្លាតវៃ AI'}
            </h3>
            <button
              type="button"
              onClick={() => onFlyTopDown(base)}
              className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors"
            >
              មើលត្រង់ពីលើ 90°
            </button>
          </div>

          {base.source === 'osm' ? (
            <p className="text-xs leading-relaxed text-slate-400">
              ទីតាំងនេះត្រូវបានរកឃើញដោយការស្កេនរ៉ាដាផ្ទាល់ពីទិន្នន័យផែនទីសាធារណៈ OpenStreetMap។
              អ្នកអាចប្រើប៊ូតុង <span className="text-slate-200">មើលជិត 3D</span> ឬ{' '}
              <span className="text-slate-200">មើលត្រង់ពីលើ 90°</span> ដើម្បីពិនិត្យរូបភាពផ្កាយរណបជាក់ស្តែង។
            </p>
          ) : (
            !briefing &&
            !loadingBriefing && (
              <button
                type="button"
                onClick={handleGenerateBriefing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>វិភាគភូមិសាស្ត្រ និងប្រវត្តិលម្អិតដោយ AI</span>
              </button>
            )
          )}

          {loadingBriefing && (
            <div className="flex items-center gap-2.5 py-4 text-xs text-cyan-300">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>កំពុងវិភាគភូមិសាស្ត្រ សណ្ឋានដី និងប្រវត្តិមូលដ្ឋាន...</span>
            </div>
          )}

          {briefingError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200">
              {briefingError}
            </div>
          )}

          {briefing && (
            <div className="space-y-3.5 text-[13px] leading-relaxed text-slate-300">
              <div>
                <div className="text-[11px] font-semibold text-cyan-400 mb-1">ប្រវត្តិ និងតួនាទី</div>
                <p>{briefing.historyKm}</p>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-cyan-400 mb-1">
                  សណ្ឋានដី និងហេដ្ឋារចនាសម្ព័ន្ធជុំវិញ
                </div>
                <p>{briefing.terrainKm}</p>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-cyan-400 mb-1">
                  ទីតាំងភូមិសាស្ត្រក្នុងតំបន់
                </div>
                <p>{briefing.regionalContextKm}</p>
              </div>
            </div>
          )}
        </section>

        {/* External Reference Link */}
        <div className="pt-2 border-t border-slate-800/80">
          <a
            href={googleEarthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>បើកកូអរដោណេនេះក្នុង Google Earth Web</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
