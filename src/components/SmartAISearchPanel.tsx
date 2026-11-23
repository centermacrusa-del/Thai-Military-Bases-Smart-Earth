import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Compass, Loader2, MapPin, RotateCcw, Sparkles } from 'lucide-react';
import {
  BRANCH_META,
  getNearestCambodiaBorder,
  type MilitaryBase,
  THAI_MILITARY_BASES,
} from '../data/bases';

export interface AISearchResult {
  query: string;
  answerKm: string;
  highlightsKm: string[];
  matchedIds: string[];
  cameraTarget: {
    lat: number;
    lng: number;
    zoom: number;
    pitch: number;
  } | null;
}

interface SmartAISearchPanelProps {
  result: AISearchResult | null;
  onResult: (res: AISearchResult | null) => void;
  onSelectBase: (base: MilitaryBase) => void;
  onFlyToTarget: (target: { lat: number; lng: number; zoom: number; pitch?: number }) => void;
}

const PRESET_QUERIES = [
  'មូលដ្ឋានទ័ពអាកាសដែលនៅជិតព្រំដែនកម្ពុជាជាងគេ',
  'មូលដ្ឋានទ័ពជើងទឹកទាំងអស់នៅឈូងសមុទ្រថៃ និងសមុទ្រអាន់ដាម៉ាន់',
  'បន្ទាយតូចៗ និងបន្ទាយព្រំដែននៅភូមិភាគឦសាន (យោធភូមិភាគទី២)',
  'តំបន់ប្រមូលផ្តុំបន្ទាយយោធានៅខេត្តលពបុរី និងកណ្តាល',
  'មូលដ្ឋានយន្តហោះចម្បាំង F-16 និង Gripen របស់ថៃ',
];

export default function SmartAISearchPanel({
  result,
  onResult,
  onSelectBase,
  onFlyToTarget,
}: SmartAISearchPanelProps) {
  const [query, setQuery] = useState(result?.query ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setQuery(trimmed);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) {
        throw new Error(data.error || 'មិនអាចដំណើរការស្វែងរក AI បានទេ។');
      }

      const payload: AISearchResult = {
        query: trimmed,
        answerKm: data.answerKm || '',
        highlightsKm: data.highlightsKm || [],
        matchedIds: data.matchedIds || [],
        cameraTarget: data.cameraTarget || null,
      };
      onResult(payload);

      if (payload.cameraTarget) {
        onFlyToTarget(payload.cameraTarget);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការភ្ជាប់បណ្តាញ។');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const matchedBases = result
    ? result.matchedIds
        .map((id) => THAI_MILITARY_BASES.find((b) => b.id === id))
        .filter((b): b is MilitaryBase => Boolean(b))
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">ស្វែងរក និងវិភាគភូមិសាស្ត្រ AI</h2>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            សួរជាភាសាខ្មែរ ឬអង់គ្លេស ដើម្បីឲ្យផែនទី 3D ហោះទៅបង្ហាញទីតាំងមូលដ្ឋានដោយស្វ័យប្រវត្តិ។
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && query.trim()) runSearch(query);
              }
            }}
            rows={2}
            placeholder="ឧ. រកបន្ទាយទាហាននៅជិតព្រំដែនសុរិន្ទ្រ ឬមូលដ្ឋានទ័ពអាកាស..."
            className="w-full rounded-lg bg-[#070B13] border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/70 resize-none leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>កំពុងវិភាគ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ស្វែងរកឆ្លាតវៃ</span>
                </>
              )}
            </button>
            {result && (
              <button
                type="button"
                onClick={() => {
                  onResult(null);
                  setQuery('');
                  setError(null);
                }}
                title="សម្អាតលទ្ធផល"
                className="p-2 rounded-lg bg-[#121A27] border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200">
            {error}
          </div>
        )}

        {!result && !loading && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-medium text-slate-400">សំណួរគំរូរហ័ស</div>
            <div className="space-y-1.5">
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => runSearch(q)}
                  className="w-full text-left flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg bg-[#0F1522] hover:bg-[#151F31] border border-slate-800/80 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                >
                  <span className="leading-relaxed">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-400">លទ្ធផលវិភាគភូមិសាស្ត្រ</span>
                {result.cameraTarget && (
                  <button
                    type="button"
                    onClick={() => onFlyToTarget(result.cameraTarget!)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    <Compass className="w-3 h-3" />
                    <span>ហោះមើលតំបន់នេះ</span>
                  </button>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-slate-200">{result.answerKm}</p>

              {result.highlightsKm.length > 0 && (
                <ul className="space-y-1.5 pt-1 text-xs text-slate-300 list-disc pl-4">
                  {result.highlightsKm.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {matchedBases.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="text-[11px] font-medium text-slate-400">
                  ទីតាំងដែលពាក់ព័ន្ធ ({matchedBases.length})
                </div>
                <div className="divide-y divide-slate-800/70 border border-slate-800/80 rounded-lg overflow-hidden bg-[#0D131F]">
                  {matchedBases.map((base) => {
                    const meta = BRANCH_META[base.branch];
                    const border = getNearestCambodiaBorder(base.lat, base.lng);
                    return (
                      <button
                        key={base.id}
                        type="button"
                        onClick={() => onSelectBase(base)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-800/50 transition-colors flex items-start gap-2.5"
                      >
                        <span
                          className="w-2 h-2 mt-1.5 shrink-0"
                          style={{
                            backgroundColor: base.scale === 'camp' ? '#34D399' : meta.color,
                            transform: base.scale === 'camp' ? 'rotate(45deg)' : undefined,
                            borderRadius:
                              base.scale === 'camp' || base.branch === 'hq' ? '2px' : '9999px',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {base.nameKm}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{base.provinceKm}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular text-cyan-300/90">
                              {Math.round(border.distanceKm)} km ពីព្រំដែន
                            </span>
                          </div>
                        </div>
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-1" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
