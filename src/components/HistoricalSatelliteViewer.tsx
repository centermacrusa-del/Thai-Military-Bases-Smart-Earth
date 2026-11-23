import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  History,
  Loader2,
  Pause,
  Play,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface HistoricalSnapshot {
  releaseId: number;
  date: string;
  year: string;
  title: string;
  tileTemplate: string;
}

interface TileMosaicLayerProps {
  lat: number;
  lng: number;
  zoom: number;
  tileTemplate: string;
  altLabel: string;
}

function resolveTileUrl(template: string, zoom: number, row: number, col: number): string {
  return template
    .replace('{level}', String(zoom))
    .replace('{row}', String(row))
    .replace('{col}', String(col));
}

function getFractionalTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const txFloat = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const tyFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const col = Math.floor(txFloat);
  const row = Math.floor(tyFloat);
  return {
    col,
    row,
    fracX: txFloat - col,
    fracY: tyFloat - row,
    maxTile: n,
  };
}

// Sub-pixel centered 3x3 Web Mercator tile mosaic so the military base stays dead-center at any zoom
export function HistoricalTileMosaic({
  lat,
  lng,
  zoom,
  tileTemplate,
  altLabel,
}: TileMosaicLayerProps) {
  const { col, row, fracX, fracY, maxTile } = useMemo(
    () => getFractionalTile(lat, lng, zoom),
    [lat, lng, zoom]
  );

  const tiles = useMemo(() => {
    const out: Array<{ key: string; dx: number; dy: number; url: string }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = ((col + dx) % maxTile + maxTile) % maxTile;
        const r = Math.max(0, Math.min(maxTile - 1, row + dy));
        out.push({
          key: `${zoom}-${r}-${c}`,
          dx: dx + 1,
          dy: dy + 1,
          url: resolveTileUrl(tileTemplate, zoom, r, c),
        });
      }
    }
    return out;
  }, [col, row, zoom, maxTile, tileTemplate]);

  // Center of the base inside the 768x768 grid sits at (256 + fracX*256, 256 + fracY*256)
  const offsetX = 256 + fracX * 256;
  const offsetY = 256 + fracY * 256;

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#05080F] pointer-events-none"
      aria-label={altLabel}
    >
      <div
        className="absolute w-[768px] h-[768px]"
        style={{
          left: `calc(50% - ${offsetX.toFixed(1)}px)`,
          top: `calc(50% - ${offsetY.toFixed(1)}px)`,
        }}
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            className="absolute w-[256px] h-[256px] block select-none"
            style={{
              left: `${t.dx * 256}px`,
              top: `${t.dy * 256}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface HistoricalViewportProps {
  lat: number;
  lng: number;
  zoom: number;
  activeSnapshot: HistoricalSnapshot;
  latestSnapshot: HistoricalSnapshot | null;
  compareMode: boolean;
  compareSplitPct: number;
  onChangeCompareSplit: (pct: number) => void;
  baseNameKm: string;
}

export function HistoricalSatelliteViewport({
  lat,
  lng,
  zoom,
  activeSnapshot,
  latestSnapshot,
  compareMode,
  compareSplitPct,
  onChangeCompareSplit,
  baseNameKm,
}: HistoricalViewportProps) {
  const showCompare =
    compareMode &&
    latestSnapshot !== null &&
    latestSnapshot.releaseId !== activeSnapshot.releaseId;

  const handlePointerSlide = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!showCompare) return;
    if (e.buttons !== 1 && e.type === 'pointermove') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    onChangeCompareSplit(pct);
  };

  return (
    <div
      onPointerDown={handlePointerSlide}
      onPointerMove={handlePointerSlide}
      className={`absolute inset-0 overflow-hidden select-none ${
        showCompare ? 'cursor-ew-resize' : ''
      }`}
    >
      {/* Base Historical Layer (Left side in compare mode, full frame otherwise) */}
      <HistoricalTileMosaic
        lat={lat}
        lng={lng}
        zoom={zoom}
        tileTemplate={activeSnapshot.tileTemplate}
        altLabel={`រូបភាពផ្កាយរណបប្រវត្តិ ${baseNameKm} (${activeSnapshot.date})`}
      />

      {/* Optional Split-Screen Latest Layer (Right side) for Before/After comparison */}
      {showCompare && latestSnapshot && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ clipPath: `inset(0 0 0 ${compareSplitPct.toFixed(1)}%)` }}
          >
            <HistoricalTileMosaic
              lat={lat}
              lng={lng}
              zoom={zoom}
              tileTemplate={latestSnapshot.tileTemplate}
              altLabel={`រូបភាពផ្កាយរណបថ្មីបំផុត ${baseNameKm} (${latestSnapshot.date})`}
            />
          </div>

          {/* Vertical Wipe Divider */}
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)] z-10"
            style={{ left: `${compareSplitPct.toFixed(1)}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#070B13] border border-cyan-300 flex items-center justify-center shadow">
              <Columns2 className="w-2.5 h-2.5 text-cyan-200" />
            </div>
          </div>

          {/* Top Left / Right Date Badges for Comparison */}
          <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded bg-[#05080F]/85 border border-amber-400/50 font-mono-tabular text-[10px] text-amber-200 z-10">
            មុន: {activeSnapshot.date}
          </div>
          <div className="pointer-events-none absolute top-2 right-2 px-2 py-0.5 rounded bg-[#05080F]/85 border border-cyan-400/50 font-mono-tabular text-[10px] text-cyan-200 z-10">
            ថ្មី: {latestSnapshot.date}
          </div>
        </>
      )}

      {/* Single-Date Timestamp Badge */}
      {!showCompare && (
        <div className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded bg-[#05080F]/85 border border-amber-400/50 font-mono-tabular text-[10.5px] font-medium text-amber-200 z-10 flex items-center gap-1.5">
          <History className="w-3 h-3 text-amber-300" />
          <span>{activeSnapshot.date}</span>
        </div>
      )}

      {/* Subtle Center Target Reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border border-amber-300/75 bg-amber-400/10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
        </div>
      </div>
    </div>
  );
}

interface HistorySliderControlsProps {
  lat: number;
  lng: number;
  snapshots: HistoricalSnapshot[];
  loading: boolean;
  error: string | null;
  activeIndex: number;
  isHistoryActive: boolean;
  zoom: number;
  compareMode: boolean;
  onActivateAndSelectIndex: (idx: number) => void;
  onToggleZoom: () => void;
  onToggleCompare: () => void;
  onRetry: () => void;
}

export function HistorySliderControls({
  lat,
  lng,
  snapshots,
  loading,
  error,
  activeIndex,
  isHistoryActive,
  zoom,
  compareMode,
  onActivateAndSelectIndex,
  onToggleZoom,
  onToggleCompare,
  onRetry,
}: HistorySliderControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Stop playback when switching bases or leaving history mode
  useEffect(() => {
    if (!isHistoryActive) setIsPlaying(false);
  }, [isHistoryActive, lat, lng]);

  // Auto time-lapse playback through historical snapshots
  useEffect(() => {
    if (!isPlaying || snapshots.length < 2) return;
    const timer = window.setInterval(() => {
      onActivateAndSelectIndex((activeIndex + 1) % snapshots.length);
    }, 1450);
    return () => window.clearInterval(timer);
  }, [isPlaying, activeIndex, snapshots.length, onActivateAndSelectIndex]);

  // Preload adjacent snapshot center tiles so scrubbing the slider feels instantaneous
  useEffect(() => {
    if (!isHistoryActive || snapshots.length < 2) return;
    const { col, row } = getFractionalTile(lat, lng, zoom);
    const neighborIndices = [activeIndex - 1, activeIndex + 1].filter(
      (i) => i >= 0 && i < snapshots.length
    );
    for (const i of neighborIndices) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = resolveTileUrl(snapshots[i].tileTemplate, zoom, row, col);
    }
  }, [isHistoryActive, activeIndex, snapshots, lat, lng, zoom]);

  const current = snapshots[activeIndex] ?? null;
  const earliest = snapshots[0] ?? null;
  const latest = snapshots[snapshots.length - 1] ?? null;
  const canCompare =
    isHistoryActive &&
    current !== null &&
    latest !== null &&
    current.releaseId !== latest.releaseId;

  return (
    <div className="px-3 py-2.5 bg-[#080D17] border-t border-slate-800/90 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <History className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-200 truncate">
            ប្រវត្តិរូបភាពផ្កាយរណប (History Slider)
          </span>
        </div>

        {loading ? (
          <span className="flex items-center gap-1 text-[10.5px] text-slate-400 shrink-0">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>កំពុងទាញ...</span>
          </span>
        ) : current ? (
          <span className="font-mono-tabular text-[10.5px] text-amber-300 shrink-0">
            {current.date}{' '}
            <span className="text-slate-500">
              ({activeIndex + 1}/{snapshots.length})
            </span>
          </span>
        ) : null}
      </div>

      {error && !loading && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-md px-2.5 py-1.5">
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="text-[10.5px] text-cyan-300 hover:text-cyan-200 font-medium shrink-0"
          >
            សាកម្តងទៀត
          </button>
        </div>
      )}

      {!loading && snapshots.length > 0 && (
        <>
          {/* Timeline Playback + Range Slider */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!isHistoryActive) {
                  onActivateAndSelectIndex(0);
                  setIsPlaying(true);
                } else {
                  setIsPlaying((v) => !v);
                }
              }}
              disabled={snapshots.length < 2}
              title={isPlaying ? 'ផ្អាកការលេងប្រវត្តិ' : 'លេងប្រវត្តិផ្កាយរណបស្វ័យប្រវត្តិ'}
              aria-label={isPlaying ? 'ផ្អាកការលេងប្រវត្តិ' : 'លេងប្រវត្តិផ្កាយរណបស្វ័យប្រវត្តិ'}
              className={`p-1.5 rounded-md border transition-colors shrink-0 disabled:opacity-40 ${
                isPlaying
                  ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                  : 'bg-[#0F1726] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onActivateAndSelectIndex(Math.max(0, activeIndex - 1));
              }}
              disabled={activeIndex <= 0}
              aria-label="រូបភាពប្រវត្តិមុន"
              className="p-1 rounded-md bg-[#0F1726] border border-slate-800 text-slate-300 hover:text-white disabled:opacity-35 transition-colors shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1 flex flex-col">
              <input
                type="range"
                aria-label="គ្រាប់រំកិលប្រវត្តិរូបភាពផ្កាយរណប"
                min={0}
                max={Math.max(0, snapshots.length - 1)}
                step={1}
                value={activeIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  onActivateAndSelectIndex(Number(e.target.value));
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-amber-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onActivateAndSelectIndex(Math.min(snapshots.length - 1, activeIndex + 1));
              }}
              disabled={activeIndex >= snapshots.length - 1}
              aria-label="រូបភាពប្រវត្តិបន្ទាប់"
              className="p-1 rounded-md bg-[#0F1726] border border-slate-800 text-slate-300 hover:text-white disabled:opacity-35 transition-colors shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Year Span Labels + Compare & Zoom Controls */}
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="font-mono-tabular text-slate-400 flex items-center gap-1.5">
              <span>{earliest?.year}</span>
              <span className="text-slate-600">—</span>
              <span>{latest?.year}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">Wayback</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleCompare}
                disabled={!canCompare}
                title="ប្រៀបធៀបរូបភាពប្រវត្តិជាមួយរូបភាពថ្មីបំផុត"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors disabled:opacity-35 ${
                  compareMode && canCompare
                    ? 'bg-cyan-500/20 border-cyan-400/55 text-cyan-200'
                    : 'bg-[#0F1726] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Columns2 className="w-2.5 h-2.5" />
                <span>ប្រៀបធៀប</span>
              </button>

              <button
                type="button"
                onClick={onToggleZoom}
                title={zoom >= 16 ? 'ពង្រួមមើលទូលាយ (Z15)' : 'ពង្រីកមើលជិត (Z16)'}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0F1726] border border-slate-800 text-slate-300 hover:text-white font-mono-tabular text-[10px] transition-colors"
              >
                {zoom >= 16 ? <ZoomOut className="w-2.5 h-2.5" /> : <ZoomIn className="w-2.5 h-2.5" />}
                <span>Z{zoom}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
