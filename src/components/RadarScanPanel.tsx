import { Crosshair, Loader2, Pause, Play, Radar, RotateCcw, Satellite } from 'lucide-react';
import {
  type BaseScale,
  bearingToCompassKm,
  BRANCH_META,
  type MilitaryBase,
  RADAR_PRESETS,
  type RadarPreset,
} from '../data/bases';

export interface RadarDetection {
  base: MilitaryBase;
  distanceKm: number;
  bearingDeg: number;
  detected: boolean;
  recentlyPinged: boolean;
}

interface RadarScanPanelProps {
  radarCenter: { lat: number; lng: number };
  radarRadiusKm: number;
  onChangeRadius: (km: number) => void;
  sweepAngle: number;
  isScanning: boolean;
  onToggleScanning: () => void;
  onResetSweep: () => void;
  scaleFilter: BaseScale | 'all';
  onChangeScaleFilter: (scale: BaseScale | 'all') => void;
  activePresetId: string;
  onApplyPreset: (preset: RadarPreset) => void;
  detections: RadarDetection[];
  selectedBaseId: string | null;
  onSelectBase: (base: MilitaryBase) => void;
  onRunOsmScan: () => void;
  osmScanning: boolean;
  osmCount: number;
  osmError: string | null;
}

const RADIUS_OPTIONS = [
  { km: 80, label: '80 km' },
  { km: 150, label: '150 km' },
  { km: 300, label: '300 km' },
  { km: 820, label: '820 km' },
];

function polarToSvg(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function buildSvgWedgePath(cx: number, cy: number, r: number, beamDeg: number, spreadDeg = 42): string {
  const startDeg = beamDeg - spreadDeg;
  const [x1, y1] = polarToSvg(cx, cy, r, startDeg);
  const [x2, y2] = polarToSvg(cx, cy, r, beamDeg);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(
    2
  )} ${y2.toFixed(2)} Z`;
}

export default function RadarScanPanel({
  radarCenter,
  radarRadiusKm,
  onChangeRadius,
  sweepAngle,
  isScanning,
  onToggleScanning,
  onResetSweep,
  scaleFilter,
  onChangeScaleFilter,
  activePresetId,
  onApplyPreset,
  detections,
  selectedBaseId,
  onSelectBase,
  onRunOsmScan,
  osmScanning,
  osmCount,
  osmError,
}: RadarScanPanelProps) {
  const lockedDetections = detections.filter((d) => d.detected);
  const smallCampCount = lockedDetections.filter((d) => d.base.scale === 'camp').length;

  const size = 196;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 82;
  const [beamX, beamY] = polarToSvg(cx, cy, maxR, sweepAngle);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Radar Scope & Primary Controls */}
      <div className="px-3.5 pt-3 pb-3 border-b border-slate-800/80 space-y-3">
        {/* Synced PPI Radar Scope + Live Numeric Readout */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="rounded-full bg-[#050910] border border-slate-800"
              aria-label="អេក្រង់រ៉ាដាចាប់ទីតាំងបន្ទាយ"
            >
              <defs>
                <radialGradient id="ppiGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.01" />
                </radialGradient>
              </defs>

              <circle cx={cx} cy={cy} r={maxR} fill="url(#ppiGlow)" />

              {/* Concentric Calibrated Rings */}
              {[0.25, 0.5, 0.75, 1].map((frac) => (
                <circle
                  key={frac}
                  cx={cx}
                  cy={cy}
                  r={maxR * frac}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth={frac === 1 ? 1.2 : 0.8}
                  strokeDasharray={frac === 1 ? undefined : '2 3'}
                />
              ))}

              {/* Crosshair Axes */}
              <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#1E293B" strokeWidth="0.8" />
              <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#1E293B" strokeWidth="0.8" />

              {/* Cardinal Labels */}
              <text x={cx} y={11} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
                N
              </text>
              <text x={size - 7} y={cy + 3} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
                E
              </text>
              <text x={cx} y={size - 4} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
                S
              </text>
              <text x={7} y={cy + 3} textAnchor="middle" fill="#64748B" fontSize="8" fontFamily="monospace">
                W
              </text>

              {/* Rotating Sweep Wedge & Leading Beam */}
              <path
                d={buildSvgWedgePath(cx, cy, maxR, sweepAngle, 42)}
                fill="#10B981"
                fillOpacity={isScanning ? 0.16 : 0.08}
              />
              <line
                x1={cx}
                y1={cy}
                x2={beamX}
                y2={beamY}
                stroke="#22D3EE"
                strokeWidth="1.5"
                strokeOpacity={isScanning ? 0.95 : 0.5}
              />

              {/* Radar Origin Dot */}
              <circle cx={cx} cy={cy} r="2.5" fill="#22D3EE" />

              {/* Live Polar Target Blips */}
              {detections.map((item) => {
                const ratio = Math.min(0.97, item.distanceKm / Math.max(1, radarRadiusKm));
                const [bx, by] = polarToSvg(cx, cy, maxR * ratio, item.bearingDeg);
                const isSelected = selectedBaseId === item.base.id;
                const color =
                  item.base.source === 'osm'
                    ? '#F59E0B'
                    : item.base.scale === 'camp'
                      ? '#34D399'
                      : BRANCH_META[item.base.branch].color;

                return (
                  <g
                    key={item.base.id}
                    className="cursor-pointer"
                    onClick={() => onSelectBase(item.base)}
                  >
                    <title>{`${item.base.nameKm} (${Math.round(item.distanceKm)} km)`}</title>
                    {(item.recentlyPinged || isSelected) && (
                      <circle
                        cx={bx}
                        cy={by}
                        r={isSelected ? 6.5 : 5.5}
                        fill="none"
                        stroke={isSelected ? '#FFFFFF' : color}
                        strokeWidth="1.1"
                        strokeOpacity={isSelected ? 0.95 : 0.75}
                      />
                    )}
                    <circle
                      cx={bx}
                      cy={by}
                      r={isSelected ? 3.2 : item.base.scale === 'camp' ? 2.3 : 2.7}
                      fill={color}
                      fillOpacity={item.detected ? 0.95 : 0.22}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Live Readout Column */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="text-[10.5px] text-slate-400">មុំស្កេនរ៉ាដា</div>
              <div className="font-mono-tabular text-xl font-semibold text-cyan-300 leading-tight">
                {String(Math.round(sweepAngle) % 360).padStart(3, '0')}°
              </div>
            </div>

            <div>
              <div className="text-[10.5px] text-slate-400">ចាប់បានសរុប / បន្ទាយតូច</div>
              <div className="font-mono-tabular text-base font-semibold text-slate-100 leading-tight">
                {lockedDetections.length}
                <span className="text-slate-500 text-xs font-normal mx-1">/</span>
                <span className="text-emerald-400">{smallCampCount}</span>
              </div>
            </div>

            <div>
              <div className="text-[10.5px] text-slate-400">មជ្ឈមណ្ឌលរ៉ាដា</div>
              <div className="font-mono-tabular text-[11px] text-slate-300 truncate">
                {radarCenter.lat.toFixed(2)}°N, {radarCenter.lng.toFixed(2)}°E
              </div>
            </div>
          </div>
        </div>

        {/* Sweep Start/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleScanning}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              isScanning
                ? 'bg-emerald-500/18 border border-emerald-500/45 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isScanning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isScanning ? 'ផ្អាកស្កេនរ៉ាដា' : 'ចាប់ផ្ដើមស្កេនរ៉ាដា'}</span>
          </button>

          <button
            type="button"
            onClick={onResetSweep}
            title="ស្កេនសាជាថ្មី"
            className="px-2.5 py-2 rounded-lg bg-[#121A27] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target Scale Segmented Filter */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#070B13] border border-slate-800/80">
          {(
            [
              { id: 'camp', label: 'បន្ទាយតូចៗ' },
              { id: 'all', label: 'ទាំងអស់' },
              { id: 'major', label: 'មូលដ្ឋានធំ' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeScaleFilter(tab.id)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                scaleFilter === tab.id
                  ? 'bg-[#162336] text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sector Preset & Scan Radius */}
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="តំបន់ស្កេនរ៉ាដា"
            value={activePresetId}
            onChange={(e) => {
              const found = RADAR_PRESETS.find((p) => p.id === e.target.value);
              if (found) onApplyPreset(found);
            }}
            className="rounded-lg bg-[#070B13] border border-slate-800 px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500/70"
          >
            {RADAR_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.labelKm}
              </option>
            ))}
            <option value="custom">ចំណុចកំណត់ផ្ទាល់លើផែនទី</option>
          </select>

          <div className="grid grid-cols-4 gap-1">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.km}
                type="button"
                onClick={() => onChangeRadius(opt.km)}
                className={`py-1 rounded-md font-mono-tabular text-[10px] transition-colors ${
                  radarRadiusKm === opt.km
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/45'
                    : 'bg-[#070B13] text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {opt.km}
              </button>
            ))}
          </div>
        </div>

        {/* Live OpenStreetMap Deep Scan Action */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onRunOsmScan}
            disabled={osmScanning}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#101826] hover:bg-[#152236] border border-slate-700/80 hover:border-amber-500/50 text-[11.5px] font-medium text-slate-200 transition-colors disabled:opacity-60"
          >
            {osmScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>កំពុងស្កេនរកបន្ទាយតូចពី OpenStreetMap...</span>
              </>
            ) : (
              <>
                <Satellite className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  ស្កេនបន្ទាយតូចផ្ទាល់ OSM (រង្វង់ {Math.min(radarRadiusKm, 120)} km)
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-[10.5px] text-slate-500 px-0.5">
            <span className="flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-cyan-400/80" />
              ចុចលើផែនទីដើម្បីប្តូរចំណុចរ៉ាដា
            </span>
            {osmCount > 0 && (
              <span className="font-mono-tabular text-amber-400">+{osmCount} OSM</span>
            )}
          </div>

          {osmError && (
            <div className="px-2.5 py-1.5 rounded-md bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-200">
              {osmError}
            </div>
          )}
        </div>
      </div>

      {/* Live Detected Targets Feed */}
      <div className="px-3.5 py-2 border-b border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 bg-[#090E17]">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <Radar className="w-3.5 h-3.5 text-emerald-400" />
          បញ្ជីគោលដៅដែលរ៉ាដាចាប់បាន
        </span>
        <span className="font-mono-tabular">
          {lockedDetections.length}/{detections.length} ក្នុង {radarRadiusKm} km
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {lockedDetections.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-400 space-y-1.5">
            <p>
              {detections.length === 0
                ? 'មិនមានបន្ទាយក្នុងរង្វង់រ៉ាដានេះទេ។ សូមពង្រីករង្វង់ ឬចុចស្កេន OSM។'
                : 'កាំរស្មីរ៉ាដាកំពុងស្កេនចាប់ទីតាំង...'}
            </p>
          </div>
        ) : (
          lockedDetections.map(({ base, distanceKm, bearingDeg, recentlyPinged }) => {
            const isSelected = selectedBaseId === base.id;
            const dotColor =
              base.source === 'osm'
                ? '#F59E0B'
                : base.scale === 'camp'
                  ? '#34D399'
                  : BRANCH_META[base.branch].color;

            return (
              <button
                key={base.id}
                type="button"
                onClick={() => onSelectBase(base)}
                className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-cyan-500/14'
                    : recentlyPinged
                      ? 'bg-emerald-500/8 hover:bg-emerald-500/12'
                      : 'hover:bg-slate-800/45'
                }`}
              >
                <span
                  className="w-2 h-2 mt-1.5 shrink-0"
                  style={{
                    backgroundColor: dotColor,
                    transform: base.scale === 'camp' ? 'rotate(45deg)' : undefined,
                    borderRadius: base.scale === 'camp' ? '1px' : '9999px',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium text-slate-100 leading-snug truncate">
                    {base.nameKm}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className={base.source === 'osm' ? 'text-amber-400' : 'text-emerald-400'}>
                      {base.source === 'osm'
                        ? 'OSM'
                        : base.scale === 'camp'
                          ? 'បន្ទាយតូច'
                          : BRANCH_META[base.branch].shortKm}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{base.provinceKm}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono-tabular">
                  <div className="text-[11.5px] font-medium text-cyan-300">
                    {distanceKm.toFixed(0)} km
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {String(Math.round(bearingDeg)).padStart(3, '0')}° {bearingToCompassKm(bearingDeg)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
