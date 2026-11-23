import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Eye,
  Film,
  Loader2,
  Maximize2,
  Minimize2,
  Move,
  Pause,
  Play,
  RotateCcw,
  SplitSquareHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { destinationPoint, formatDMS } from '../data/bases';

export interface StreetViewLocation {
  lat: number;
  lng: number;
  titleKm: string;
  subtitle?: string;
  heading?: number;
}

interface KartaFrame {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  lat: number;
  lng: number;
  heading: number;
  shotDate: string;
  width: number;
  height: number;
}

interface StreetViewStudioProps {
  location: StreetViewLocation;
  splitMode: boolean;
  onToggleSplitMode: () => void;
  onChangeLocation: (next: StreetViewLocation) => void;
  onFly3DLowPass: (lat: number, lng: number) => void;
  onClose: () => void;
}

type StreetMode = 'panorama' | 'kartaview';

// Public roadside viewpoints with crisp Google Street View coverage near key Thai sites
const QUICK_STREET_PRESETS: StreetViewLocation[] = [
  {
    titleKm: 'មហាវិថីរាជដំណើរ (មុខទីបញ្ជាការជើងគោក)',
    subtitle: 'Ratchadamnoen Nok Ave, Bangkok',
    lat: 13.7639,
    lng: 100.5091,
    heading: 250,
  },
  {
    titleKm: 'ផ្លូវវិភាវឌី (មុខមូលដ្ឋានទ័ពអាកាសដនមឿង)',
    subtitle: 'Vibhavadi Rangsit Rd, Don Mueang',
    lat: 13.9145,
    lng: 100.5985,
    heading: 95,
  },
  {
    titleKm: 'ផ្លូវច្រកចូលមូលដ្ឋានជើងទឹកសាត់តាហ៊ីប',
    subtitle: 'Sukhumvit Rd, Sattahip, Chonburi',
    lat: 12.6625,
    lng: 100.9062,
    heading: 215,
  },
  {
    titleKm: 'មុខបន្ទាយសុរនារី (យោធភូមិភាគទី២ កូរ៉ាត់)',
    subtitle: 'Fort Suranaree Gate, Nakhon Ratchasima',
    lat: 14.9665,
    lng: 102.0946,
    heading: 180,
  },
  {
    titleKm: 'ផ្លូវជាតិច្រកអារញ្ញប្រាថេត - ប៉ោយប៉ែត',
    subtitle: 'Highway 33, Aranyaprathet, Sa Kaeo',
    lat: 13.6634,
    lng: 102.5482,
    heading: 110,
  },
  {
    titleKm: 'ច្រកមុខទីបញ្ជាការកងទ័ពភូមិន្ទថៃ (ចែងវឌ្ឍនៈ)',
    subtitle: 'Chaeng Watthana Rd, Bangkok',
    lat: 13.8926,
    lng: 100.5685,
    heading: 160,
  },
];

const NUDGE_DIRS = [
  { id: 'center', labelKm: 'ចំណុចដើម', bearing: 0, distKm: 0 },
  { id: 'north', labelKm: 'ផ្លូវជើង +150m', bearing: 0, distKm: 0.15 },
  { id: 'east', labelKm: 'ផ្លូវកើត +150m', bearing: 90, distKm: 0.15 },
  { id: 'south', labelKm: 'ផ្លូវត្បូង +150m', bearing: 180, distKm: 0.15 },
  { id: 'west', labelKm: 'ផ្លូវលិច +150m', bearing: 270, distKm: 0.15 },
];

export default function StreetViewStudio({
  location,
  splitMode,
  onToggleSplitMode,
  onChangeLocation,
  onFly3DLowPass,
  onClose,
}: StreetViewStudioProps) {
  const studioRef = useRef<HTMLDivElement | null>(null);
  const imageStageRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<StreetMode>('panorama');
  const [heading, setHeading] = useState(location.heading ?? 0);
  const [nudgeId, setNudgeId] = useState('center');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // KartaView HD street frames state
  const [frames, setFrames] = useState<KartaFrame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [framesError, setFramesError] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlayingDrive, setIsPlayingDrive] = useState(false);
  const [frameImgFallback, setFrameImgFallback] = useState<'primary' | 'thumb' | 'broken'>('primary');

  // Ultra-smooth GPU zoom & pan for HD street frames
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Compute active nudged road coordinate
  const activeCoord = (() => {
    const nudge = NUDGE_DIRS.find((n) => n.id === nudgeId);
    if (!nudge || nudge.distKm === 0) {
      return { lat: location.lat, lng: location.lng };
    }
    const [nLng, nLat] = destinationPoint(location.lat, location.lng, nudge.distKm, nudge.bearing);
    return { lat: nLat, lng: nLng };
  })();

  // Reset states when base location changes
  useEffect(() => {
    setNudgeId('center');
    setHeading(location.heading ?? 0);
    setIframeLoaded(false);
    setFrameIndex(0);
    setIsPlayingDrive(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setFrameImgFallback('primary');
  }, [location.lat, location.lng, location.heading]);

  // Reset fallback state when active frame changes
  useEffect(() => {
    setFrameImgFallback('primary');
  }, [frameIndex, frames]);

  // Safety timeout so iframe loader never hangs indefinitely if embed is slow
  useEffect(() => {
    if (mode !== 'panorama' || iframeLoaded) return;
    const timer = window.setTimeout(() => setIframeLoaded(true), 7000);
    return () => window.clearTimeout(timer);
  }, [mode, iframeLoaded, activeCoord.lat, activeCoord.lng, heading]);

  // Pause drive-by playback when leaving KartaView mode
  useEffect(() => {
    if (mode !== 'kartaview') {
      setIsPlayingDrive(false);
    }
  }, [mode]);

  // Fetch KartaView HD street frames whenever user switches to HD Drive-By mode or changes location
  useEffect(() => {
    if (mode !== 'kartaview') return;
    const controller = new AbortController();

    const loadFrames = async () => {
      setLoadingFrames(true);
      setFramesError(null);
      try {
        const res = await fetch(
          `/api/streetview/kartaview?lat=${activeCoord.lat.toFixed(5)}&lng=${activeCoord.lng.toFixed(
            5
          )}&radius=500`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) {
          throw new Error(data.error || 'មិនអាចទាញយករូបភាពផ្លូវ HD បានទេ។');
        }
        const list = Array.isArray(data.frames) ? (data.frames as KartaFrame[]) : [];
        setFrames(list);
        setFrameIndex(0);
        if (list.length === 0) {
          setFramesError(
            'មិនទាន់មានរូបភាព KartaView នៅតាមផ្លូវជិតទីតាំងនេះទេ។ សូមប្រើ Street View 360° ផ្ទាល់ ឬជ្រើសរើសផ្លូវជិតទីក្រុង។'
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setFrames([]);
          setFramesError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការទាញយករូបភាពផ្លូវ។');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingFrames(false);
      }
    };

    loadFrames();
    return () => {
      controller.abort();
    };
  }, [mode, activeCoord.lat, activeCoord.lng]);

  // Smooth drive-by slideshow timer
  useEffect(() => {
    if (!isPlayingDrive || frames.length <= 1) return;
    const id = window.setInterval(() => {
      if (!document.hidden) {
        setFrameIndex((i) => (i + 1) % frames.length);
      }
    }, 950);
    return () => window.clearInterval(id);
  }, [isPlayingDrive, frames.length]);

  // Native non-passive wheel listener for GPU zoom without passive event console warnings
  useEffect(() => {
    const el = imageStageRef.current;
    if (!el || mode !== 'kartaview') return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomScale((z) => {
        const next = Math.max(1, Math.min(4, z + (e.deltaY < 0 ? 0.25 : -0.25)));
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mode, frames.length]);

  // Keyboard shortcuts for KartaView frame navigation
  useEffect(() => {
    if (mode !== 'kartaview' || frames.length <= 1) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFrameIndex((i) => (i - 1 + frames.length) % frames.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFrameIndex((i) => (i + 1) % frames.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlayingDrive((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, frames.length]);

  // Track browser fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && studioRef.current) {
        await studioRef.current.requestFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen restricted in some embedded contexts
    }
  };

  // Public Google Street View interactive 360° panorama embed (no API key required)
  const streetEmbedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${activeCoord.lat.toFixed(
    6
  )},${activeCoord.lng.toFixed(6)}&cbp=12,${Math.round(heading)},0,0,0&hl=km&output=svembed`;

  const externalStreetUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeCoord.lat.toFixed(
    6
  )},${activeCoord.lng.toFixed(6)}&heading=${Math.round(heading)}&pitch=0&fov=80`;

  const currentFrame = frames[frameIndex] ?? null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomScale <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: panOffset.x,
      origY: panOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    const maxPan = (zoomScale - 1) * 320;
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, dragStateRef.current.origX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragStateRef.current.origY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
  };

  return (
    <section
      ref={studioRef}
      className={`${
        splitMode
          ? 'relative w-full h-[52%] lg:h-full lg:w-[54%] border-b lg:border-b-0 lg:border-r border-slate-800'
          : 'absolute inset-0 z-30'
      } flex flex-col bg-[#05080F] overflow-hidden`}
    >
      {/* Clean Studio Top Control Strip */}
      <div className="shrink-0 px-4 py-2.5 bg-[#090E17]/95 border-b border-slate-800/90 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-50 truncate">
                {location.titleKm}
              </h2>
              <span className="hidden sm:inline font-mono-tabular text-[10.5px] text-cyan-300 shrink-0">
                UHD 4K
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-tabular truncate">
              {formatDMS(activeCoord.lat, true)} · {formatDMS(activeCoord.lng, false)}
              {location.subtitle ? ` · ${location.subtitle}` : ''}
            </div>
          </div>
        </div>

        {/* Mode Switcher + Viewport Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#05080F] border border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (mode !== 'panorama') {
                  setIframeLoaded(false);
                  setMode('panorama');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                mode === 'panorama'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>Street View 360°</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('kartaview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                mode === 'kartaview'
                  ? 'bg-cyan-500/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span>HD Drive-By</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleSplitMode}
            title={splitMode ? 'ពង្រីកពេញអេក្រង់ Street View' : 'បង្ហាញជាប់ជាមួយផែនទី 3D'}
            aria-label={splitMode ? 'ពង្រីកពេញអេក្រង់ Street View' : 'បង្ហាញជាប់ជាមួយផែនទី 3D'}
            className={`p-1.5 rounded-lg border transition-colors ${
              splitMode
                ? 'bg-cyan-500/18 border-cyan-500/45 text-cyan-300'
                : 'bg-[#101724] border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <SplitSquareHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'ចាកចេញពីពេញអេក្រង់' : 'ពេញអេក្រង់ 4K'}
            aria-label={isFullscreen ? 'ចាកចេញពីពេញអេក្រង់' : 'ពេញអេក្រង់ 4K'}
            className="hidden sm:flex p-1.5 rounded-lg bg-[#101724] border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="បិទ Street View"
            className="p-1.5 rounded-lg bg-[#101724] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main High-Definition Street Stage */}
      <div className="relative flex-1 min-h-0 bg-[#04070D] overflow-hidden">
        {mode === 'panorama' ? (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-[#05080F]">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <p className="text-xs text-slate-300">កំពុងផ្ទុក Street View 360° កម្រិតច្បាស់...</p>
              </div>
            )}

            <iframe
              key={`${activeCoord.lat.toFixed(5)}-${activeCoord.lng.toFixed(5)}-${Math.round(heading)}`}
              title={`Street View — ${location.titleKm}`}
              src={streetEmbedUrl}
              onLoad={() => setIframeLoaded(true)}
              allow="accelerometer; gyroscope; fullscreen"
              allowFullScreen
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0 bg-[#05080F]"
            />

            {/* Floating Bottom-Left Camera Heading & Roadside Gate Nudge Strip */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#070B13]/90 border border-slate-800 backdrop-blur-md shadow-xl">
                <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoaded(false);
                    setHeading((h) => (h + 315) % 360);
                  }}
                  className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors"
                >
                  -45°
                </button>
                <span className="font-mono-tabular text-[11px] text-cyan-200 px-1.5 min-w-[38px] text-center">
                  {String(Math.round(heading) % 360).padStart(3, '0')}°
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoaded(false);
                    setHeading((h) => (h + 45) % 360);
                  }}
                  className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-200 transition-colors"
                >
                  +45°
                </button>

                <span className="h-4 w-px bg-slate-800 mx-1 hidden sm:inline-block" />

                <div className="hidden sm:flex items-center gap-1">
                  {NUDGE_DIRS.map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => {
                        setIframeLoaded(false);
                        setNudgeId(dir.id);
                      }}
                      className={`px-2 py-1 rounded-md text-[10.5px] transition-colors whitespace-nowrap ${
                        nudgeId === dir.id
                          ? 'bg-cyan-500/20 text-cyan-200 font-medium'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      {dir.labelKm}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onFly3DLowPass(activeCoord.lat, activeCoord.lng)}
                  className="px-3 py-1.5 rounded-xl bg-[#070B13]/90 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-200 backdrop-blur-md shadow-xl transition-colors whitespace-nowrap"
                >
                  ហោះមើល 3D ពីលើផ្លូវ
                </button>
                <a
                  href={externalStreetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-semibold shadow-xl transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>បើក 4K ពេញ</span>
                </a>
              </div>
            </div>
          </>
        ) : (
          /* Mode 2: KartaView Open HD Street Drive-By Viewer with 60fps GPU Zoom & Pan */
          <div className="relative w-full h-full flex flex-col bg-[#04070D]">
            {loadingFrames ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-slate-300">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <p className="text-xs">កំពុងទាញយករូបភាពផ្លូវ HD ជុំវិញទីតាំងនេះ...</p>
              </div>
            ) : framesError || !currentFrame ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <Camera className="w-8 h-8 text-slate-500" />
                <p className="max-w-md text-xs text-slate-300 leading-relaxed">
                  {framesError || 'មិនមានរូបភាពផ្លូវ HD នៅចំណុចនេះទេ។'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoaded(false);
                    setMode('panorama');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors"
                >
                  ត្រឡប់ទៅ Street View 360° ផ្ទាល់
                </button>
              </div>
            ) : (
              <>
                <div
                  ref={imageStageRef}
                  className={`relative flex-1 overflow-hidden select-none flex items-center justify-center bg-black ${
                    zoomScale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                  }`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {frameImgFallback === 'broken' ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs p-6 text-center">
                      <Camera className="w-7 h-7 text-slate-600" />
                      <span>មិនអាចផ្ទុករូបភាពផ្លូវនេះបានទេ សូមប្តូរទៅរូបភាពបន្ទាប់។</span>
                    </div>
                  ) : (
                    <img
                      src={frameImgFallback === 'thumb' ? currentFrame.thumbUrl : currentFrame.imageUrl}
                      alt={`HD Street Frame ${frameIndex + 1} — ${location.titleKm}`}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onError={() => {
                        if (frameImgFallback === 'primary' && currentFrame.thumbUrl !== currentFrame.imageUrl) {
                          setFrameImgFallback('thumb');
                        } else {
                          setFrameImgFallback('broken');
                        }
                      }}
                      className="max-w-full max-h-full object-contain will-change-transform transition-transform duration-150 ease-out"
                      style={{
                        transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                      }}
                    />
                  )}

                  {/* Top-Right HD Zoom & Reset Controls */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#070B13]/85 border border-slate-800 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setZoomScale((z) => Math.min(4, z + 0.5))}
                      title="ពង្រីករូបភាព"
                      aria-label="ពង្រីករូបភាព"
                      className="p-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="font-mono-tabular text-[11px] text-cyan-300 px-1.5">
                      {zoomScale.toFixed(1)}×
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomScale((z) => {
                          const next = Math.max(1, z - 0.5);
                          if (next === 1) setPanOffset({ x: 0, y: 0 });
                          return next;
                        })
                      }
                      title="បង្រួមរូបភាព"
                      aria-label="បង្រួមរូបភាព"
                      className="p-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    {zoomScale > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setZoomScale(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                        title="កំណត់ដើមវិញ"
                        aria-label="កំណត់ការពង្រីកដើមវិញ"
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Frame Navigation Arrows */}
                  {frames.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFrameIndex((i) => (i - 1 + frames.length) % frames.length)}
                        aria-label="រូបភាពមុន"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-[#070B13]/80 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrameIndex((i) => (i + 1) % frames.length)}
                        aria-label="រូបភាពបន្ទាប់"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-[#070B13]/80 hover:bg-slate-800 border border-slate-700 text-white transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Bottom Playback & Frame Telemetry Bar */}
                <div className="shrink-0 px-4 py-2.5 bg-[#090E17] border-t border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsPlayingDrive((p) => !p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      {isPlayingDrive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>ផ្អាកដំណើរ</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>បើកមើលតាមផ្លូវ</span>
                        </>
                      )}
                    </button>
                    <span className="font-mono-tabular text-xs text-slate-300">
                      {frameIndex + 1} / {frames.length}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 font-mono-tabular">
                    <span>
                      {currentFrame.lat.toFixed(5)}, {currentFrame.lng.toFixed(5)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>ទិស {Math.round(currentFrame.heading)}°</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Move className="w-3 h-3" /> អូសដើម្បីរំកិលពេលពង្រីក
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Quick Roadside Viewpoints Strip */}
      <div className="shrink-0 px-3.5 py-2 bg-[#070B13] border-t border-slate-800/90 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
          ផ្លូវច្បាស់ៗនៅប្រទេសថៃ:
        </span>
        {QUICK_STREET_PRESETS.map((preset) => {
          const isCurrent =
            Math.abs(preset.lat - location.lat) < 0.001 &&
            Math.abs(preset.lng - location.lng) < 0.001;
          return (
            <button
              key={preset.titleKm}
              type="button"
              onClick={() => onChangeLocation(preset)}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                isCurrent
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/45 font-medium'
                  : 'bg-[#0E1522] text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              {preset.titleKm}
            </button>
          );
        })}
      </div>
    </section>
  );
}
