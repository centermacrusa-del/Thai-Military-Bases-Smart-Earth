import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  THAI_MILITARY_BASES,
  BRANCH_META,
  REGION_META,
  getNearestCambodiaBorder,
  haversineKm,
  PHNOM_PENH_COORD,
} from './src/data/bases.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Security headers for API & static responses
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Bounded in-memory TTL cache to respect upstream rate limits and cut latency
class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

const geocodeCache = new TtlCache<unknown[]>(150);
const osmScanCache = new TtlCache<{ sites: unknown[]; radiusKm: number }>(100);
const kartaViewCache = new TtlCache<unknown[]>(100);
const satelliteImgCache = new TtlCache<Buffer>(64);
const baseInfraCache = new TtlCache<unknown>(100);
const imageryHistoryCache = new TtlCache<unknown>(160);
const briefingCache = new TtlCache<{
  historyKm: string;
  terrainKm: string;
  regionalContextKm: string;
}>(120);

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeText(value: unknown, maxLen = 160): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseJsonSafe<T>(rawText: string, fallback: T): T {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!cleaned) return fallback;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('API_KEY_MISSING: GEMINI_API_KEY is not configured on the server.');
    (err as { status?: number }).status = 503;
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status: unknown }).status === 'number'
          ? (err as { status: number }).status
          : undefined;
      const isTransient = status === undefined || status >= 500;
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }
  throw lastError;
}

function handleGeminiApiError(
  err: unknown,
  res: express.Response,
  fallbackMessageKm: string
): void {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusCode =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : undefined;

  if (rawMessage.includes('API_KEY_MISSING')) {
    res.status(503).json({
      code: 'API_KEY_MISSING',
      error:
        'មិនទាន់បានកំណត់ Gemini API Key នៅលើម៉ាស៊ីនបម្រើទេ។ សូមពិនិត្យមើលនៅក្នុង Settings > Secrets។',
    });
    return;
  }

  if (
    statusCode === 403 ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('free tier is not available')
  ) {
    res.status(403).json({
      code: 'PERMISSION_DENIED',
      error:
        'គម្រោង Gemini API បច្ចុប្បន្នមិនគាំទ្រកម្រិតឥតគិតថ្លៃទេ។ សូមជ្រើសរើស API Key ដែលបានបើកការទូទាត់ (Billing) នៅក្នុង Settings > Secrets ដើម្បីប្រើមុខងារវិភាគ AI។',
    });
    return;
  }

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    (statusCode === 400 && /api[_ ]?key/i.test(rawMessage))
  ) {
    res.status(400).json({
      code: 'API_KEY_INVALID',
      error:
        'Gemini API Key មិនត្រឹមត្រូវ ឬមិនទាន់បានកំណត់។ សូមពិនិត្យមើលនៅក្នុង Settings > Secrets។',
    });
    return;
  }

  if (statusCode === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      code: 'RESOURCE_EXHAUSTED',
      error:
        'កូតាប្រើប្រាស់ Gemini API ពេញកំណត់ហើយ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ ឬជ្រើសរើស API Key ដែលមានកម្រិតខ្ពស់ជាងនៅក្នុង Settings > Secrets។',
    });
    return;
  }

  if (statusCode === 404 || rawMessage.includes('NOT_FOUND')) {
    res.status(502).json({
      code: 'MODEL_NOT_FOUND',
      error: 'ម៉ូដែល AI ដែលបានស្នើសុំមិនអាចប្រើប្រាស់បានទេនៅពេលនេះ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។',
    });
    return;
  }

  console.error('Gemini API error:', rawMessage);
  res.status(500).json({
    error: fallbackMessageKm,
  });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    catalogCount: THAI_MILITARY_BASES.length,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
});

// Condensed catalog context passed to Gemini so responses ground strictly to real coordinates
const CATALOG_SUMMARY = THAI_MILITARY_BASES.map((b) => {
  const border = getNearestCambodiaBorder(b.lat, b.lng);
  return {
    id: b.id,
    nameKm: b.nameKm,
    nameEn: b.nameEn,
    nameTh: b.nameTh,
    branch: b.branch,
    scale: b.scale,
    region: b.region,
    provinceEn: b.provinceEn,
    provinceKm: b.provinceKm,
    facilityTypeKm: b.facilityTypeKm,
    lat: b.lat,
    lng: b.lng,
    nearestCambodiaBorder: border.ref.nameKm,
    distanceToCambodiaBorderKm: Math.round(border.distanceKm),
    runwayOrPort: b.runwayOrPort || '',
    isFighterBase: Boolean(b.isFighterBase),
    aircraftTypes: b.aircraftTypes ?? [],
    keyUnitsKm: b.keyUnitsKm.slice(0, 3),
  };
});

// Smart AI Geospatial Search & Camera Pilot
app.post('/api/ai/smart-search', async (req, res) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query || query.length > 500) {
      res.status(400).json({ error: 'សូមបញ្ចូលពាក្យគន្លឹះ ឬសំណួរស្វែងរកឲ្យបានត្រឹមត្រូវ។' });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a neutral, factual geographic & historical geospatial analyst inside a 3D Earth mapping application displaying publicly documented Royal Thai Armed Forces installations.
Always respond in clear, natural, accurate Khmer (ភាសាខ្មែរ).
You have access to the exact verified catalog of ${THAI_MILITARY_BASES.length} publicly known Thai military bases and smaller regional camps below (scale: "major" for major strategic bases/HQ, "camp" for smaller camps/military circles/border posts).
When the user asks a geographic, comparative, or search question:
1. Identify the exact matching base IDs from the catalog in "matchedIds" (sorted by relevance or distance if requested).
2. Provide a concise, objective geographic answer in Khmer in "answerKm" (2-4 sentences).
3. Provide 2-4 crisp factual bullet points in "highlightsKm" (Khmer).
4. Compute an optimal 3D Earth camera focus point in "cameraTarget" (lat, lng, zoom between 5.5 and 13.5, pitch between 25 and 60) that frames the matching base(s).
Stay strictly factual, encyclopedic, and geographic. Never invent coordinates outside the catalog or well-known public Thai geography.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Catalog (JSON):\n${JSON.stringify(CATALOG_SUMMARY)}\n\nUser Query:\n${query}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answerKm: {
                type: Type.STRING,
                description: 'Concise factual geospatial answer in Khmer.',
              },
              highlightsKm: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 4 concise geographic bullet insights in Khmer.',
              },
              matchedIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exact base IDs from the catalog that match the query.',
              },
              cameraTarget: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                  zoom: { type: Type.NUMBER },
                  pitch: { type: Type.NUMBER },
                },
                required: ['lat', 'lng', 'zoom', 'pitch'],
              },
            },
            required: ['answerKm', 'highlightsKm', 'matchedIds', 'cameraTarget'],
          },
        },
      })
    );

    const parsed = parseJsonSafe<{
      answerKm?: unknown;
      highlightsKm?: unknown;
      matchedIds?: unknown;
      cameraTarget?: { lat?: unknown; lng?: unknown; zoom?: unknown; pitch?: unknown } | null;
    }>(response.text ?? '{}', {});

    const validIdSet = new Set(THAI_MILITARY_BASES.map((b) => b.id));
    const safeMatchedIds = Array.isArray(parsed.matchedIds)
      ? Array.from(
          new Set(
            parsed.matchedIds.filter((id: unknown): id is string => typeof id === 'string' && validIdSet.has(id))
          )
        )
      : [];

    const rawCam = parsed.cameraTarget;
    const safeCameraTarget =
      rawCam &&
      typeof rawCam.lat === 'number' &&
      typeof rawCam.lng === 'number' &&
      isValidCoord(rawCam.lat, rawCam.lng)
        ? {
            lat: rawCam.lat,
            lng: rawCam.lng,
            zoom: clamp(typeof rawCam.zoom === 'number' && Number.isFinite(rawCam.zoom) ? rawCam.zoom : 7.5, 4.5, 15.5),
            pitch: clamp(typeof rawCam.pitch === 'number' && Number.isFinite(rawCam.pitch) ? rawCam.pitch : 42, 0, 70),
          }
        : null;

    res.json({
      answerKm: typeof parsed.answerKm === 'string' ? parsed.answerKm : '',
      highlightsKm: Array.isArray(parsed.highlightsKm)
        ? parsed.highlightsKm.filter((x): x is string => typeof x === 'string').slice(0, 5)
        : [],
      matchedIds: safeMatchedIds,
      cameraTarget: safeCameraTarget,
    });
  } catch (err: unknown) {
    handleGeminiApiError(err, res, 'មិនអាចភ្ជាប់ទៅសេវាកម្មវិភាគ AI បានទេនៅពេលនេះ។');
  }
});

// Deep Geographic & Historical Public Briefing for a Selected Installation
app.post('/api/ai/briefing', async (req, res) => {
  try {
    const baseId = typeof req.body?.baseId === 'string' ? req.body.baseId.trim() : '';
    const base = THAI_MILITARY_BASES.find((b) => b.id === baseId);
    if (!base) {
      res.status(404).json({ error: 'រកមិនឃើញទីតាំងមូលដ្ឋាននេះទេ។' });
      return;
    }

    const cached = briefingCache.get(base.id);
    if (cached) {
      res.json(cached);
      return;
    }

    const border = getNearestCambodiaBorder(base.lat, base.lng);
    const distPhnomPenh = Math.round(
      haversineKm(base.lat, base.lng, PHNOM_PENH_COORD.lat, PHNOM_PENH_COORD.lng)
    );

    const ai = getGeminiClient();

    const prompt = `Provide a structured, neutral, encyclopedic public geographic and historical briefing in Khmer for this publicly documented Thai military installation:
- Name (Khmer): ${base.nameKm}
- Name (English): ${base.nameEn}
- Name (Thai): ${base.nameTh}
- Branch: ${BRANCH_META[base.branch].labelEn}
- Scale: ${base.scale}
- Region: ${REGION_META[base.region].labelEn}
- Province: ${base.provinceEn}
- Coordinates: ${base.lat}, ${base.lng} (Elevation ~${base.elevationM} m)
- Established: ${base.established}
- Facility Type: ${base.facilityTypeKm}
- Infrastructure: ${base.runwayOrPort || 'Ground installation'}
- Nearest Cambodia Border Point: ${border.ref.nameEn} (~${Math.round(border.distanceKm)} km)
- Distance to Phnom Penh: ~${distPhnomPenh} km

Return structured JSON in natural Khmer covering:
1. historyKm: 2-3 sentences on public historical establishment and institutional role.
2. terrainKm: 2-3 sentences on surrounding topography, rivers/coastline, highways, or airfield geography.
3. regionalContextKm: 2-3 sentences on its geographic placement within Thailand and proximity to major regional hubs.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a factual encyclopedic geographer writing in clear, formal Khmer. Share only publicly known geographic, historical, and topographical information.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              historyKm: { type: Type.STRING },
              terrainKm: { type: Type.STRING },
              regionalContextKm: { type: Type.STRING },
            },
            required: ['historyKm', 'terrainKm', 'regionalContextKm'],
          },
        },
      })
    );

    const parsed = parseJsonSafe<{
      historyKm?: unknown;
      terrainKm?: unknown;
      regionalContextKm?: unknown;
    }>(response.text ?? '{}', {});

    const result = {
      historyKm: typeof parsed.historyKm === 'string' ? parsed.historyKm : '',
      terrainKm: typeof parsed.terrainKm === 'string' ? parsed.terrainKm : '',
      regionalContextKm: typeof parsed.regionalContextKm === 'string' ? parsed.regionalContextKm : '',
    };

    if (result.historyKm || result.terrainKm || result.regionalContextKm) {
      briefingCache.set(base.id, result, 60 * 60 * 1000);
    }

    res.json(result);
  } catch (err: unknown) {
    handleGeminiApiError(err, res, 'មិនអាចបង្កើតរបាយការណ៍វិភាគភូមិសាស្ត្របានទេ។');
  }
});

// OpenStreetMap Nominatim Geocoding Proxy (for any Thai city/landmark/place)
app.get('/api/geocode', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q || q.length > 200) {
      res.status(400).json({ results: [], error: 'ពាក្យស្វែងរកមិនត្រឹមត្រូវ។' });
      return;
    }

    const cacheKey = q.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      res.json({ results: cached });
      return;
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'th,kh');
    url.searchParams.set('addressdetails', '1');

    const upstream = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          'User-Agent': 'ThaiGeoEarthExplorer/1.0 (educational-geospatial-app)',
          'Accept-Language': 'km,en,th',
        },
      },
      8000
    );

    if (!upstream.ok) {
      res.status(502).json({ results: [], error: 'សេវាស្វែងរកទីតាំងកំពុងមមាញឹក សូមសាកល្បងម្តងទៀត។' });
      return;
    }

    const data = (await upstream.json()) as Array<{
      place_id: number;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;

    const results = (Array.isArray(data) ? data : [])
      .map((item) => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!isValidCoord(lat, lng)) return null;
        return {
          id: String(item.place_id),
          displayName: sanitizeText(item.display_name, 180),
          lat,
          lng,
          type: sanitizeText(item.type ?? 'place', 40),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    geocodeCache.set(cacheKey, results, 10 * 60 * 1000);
    res.json({ results });
  } catch (err) {
    console.warn('Geocode error:', err instanceof Error ? err.message : err);
    res.status(504).json({ results: [], error: 'ការស្វែងរកទីតាំងប្រើពេលយូរពេក។ សូមសាកល្បងម្តងទៀត។' });
  }
});

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// Live OpenStreetMap Overpass Radar Deep Scan for smaller mapped military barracks/camps in Thailand
app.get('/api/radar/osm-scan', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const rawRadiusKm = Number(req.query.radiusKm);

    if (!isValidCoord(lat, lng) || !Number.isFinite(rawRadiusKm)) {
      res.status(400).json({ sites: [], error: 'កូអរដោណេ ឬចម្ងាយរ៉ាដាមិនត្រឹមត្រូវ។' });
      return;
    }

    // Clamp Overpass query radius to keep response fast and reliable (max 120 km)
    const radiusKm = Math.round(clamp(rawRadiusKm, 10, 120));
    const cacheKey = `${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}`;
    const cached = osmScanCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const radiusM = radiusKm * 1000;
    const overpassQuery = `[out:json][timeout:12];
(
  node["military"~"barracks|base|checkpoint|training_area|naval_base|airfield|office"](around:${radiusM},${lat},${lng});
  way["military"~"barracks|base|checkpoint|training_area|naval_base|airfield"](around:${radiusM},${lat},${lng});
  way["landuse"="military"]["name"](around:${radiusM},${lat},${lng});
);
out center 45;`;

    let upstream: Response | null = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const resp = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              'User-Agent': 'ThaiGeoEarthExplorer/1.0 (educational-geospatial-radar)',
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
          },
          10500
        );
        if (resp.ok) {
          upstream = resp;
          break;
        }
      } catch {
        // Try next mirror endpoint
      }
    }

    if (!upstream) {
      res.status(502).json({
        sites: [],
        error: 'ម៉ាស៊ីនបម្រើ OpenStreetMap កំពុងមមាញឹក សូមសាកល្បងម្តងទៀត ឬបន្ថយរង្វង់រ៉ាដា។',
      });
      return;
    }

    const payload = (await upstream.json()) as {
      elements?: Array<{
        id: number;
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }>;
    };

    const seen = new Set<string>();
    const sites = [];

    for (const el of payload.elements ?? []) {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (typeof pLat !== 'number' || typeof pLng !== 'number' || !isValidCoord(pLat, pLng)) continue;

      // Rough Thailand geographic bounding box filter
      if (pLat < 5.5 || pLat > 20.6 || pLng < 97.3 || pLng > 105.7) continue;

      const tags = el.tags ?? {};
      const nameTh = sanitizeText(tags['name:th'] || tags.name || '', 120);
      const nameEn = sanitizeText(tags['name:en'] || tags.name || tags.military || 'Military Facility', 120);
      if (!nameTh && !tags.name) continue;

      // Deduplicate by ~500m grid + name
      const dedupeKey = `${Math.round(pLat * 200)}:${Math.round(pLng * 200)}:${nameEn.toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const milType = sanitizeText(tags.military || 'barracks', 40);
      let branch: 'army' | 'airforce' | 'navy' | 'hq' = 'army';
      if (milType === 'airfield' || /air force|กองบิน|อากาศ/i.test(`${nameEn} ${nameTh}`)) {
        branch = 'airforce';
      } else if (milType === 'naval_base' || /navy|naval|marine|ทัพเรือ|นาวิก/i.test(`${nameEn} ${nameTh}`)) {
        branch = 'navy';
      }

      const province = sanitizeText(tags['addr:province'] || '', 60);

      sites.push({
        id: `osm-${el.type}-${el.id}`,
        nameKm: nameTh || nameEn,
        nameEn,
        nameTh: nameTh || nameEn,
        branch,
        scale: 'camp' as const,
        region:
          pLat > 16.5
            ? ('north' as const)
            : pLat < 11.2
              ? ('south' as const)
              : pLng > 101.8 && pLat > 14.1
                ? ('northeast' as const)
                : pLng > 100.85 && pLat <= 14.3
                  ? ('east' as const)
                  : ('central' as const),
        provinceKm: province || 'OpenStreetMap',
        provinceEn: province || 'Thailand (OSM)',
        commandKm: `ទិន្នន័យស្កេនផ្ទាល់ OSM (${milType})`,
        lat: pLat,
        lng: pLng,
        elevationM: 45,
        established: 'OSM',
        facilityTypeKm: `បន្ទាយ/ទីតាំងយោធាតូច (${milType})`,
        summaryKm: `ទីតាំងយោធាតូចដែលរកឃើញដោយការស្កេនរ៉ាដាផ្ទាល់ពីទិន្នន័យផែនទីសាធារណៈ OpenStreetMap (${nameEn})។`,
        keyUnitsKm: [milType],
        source: 'osm' as const,
      });

      if (sites.length >= 35) break;
    }

    const result = { sites, radiusKm };
    osmScanCache.set(cacheKey, result, 5 * 60 * 1000);
    res.json(result);
  } catch (err) {
    console.warn('OSM radar scan fallback:', err instanceof Error ? err.message : err);
    res.status(504).json({
      sites: [],
      error: 'ការស្កេន OpenStreetMap ប្រើពេលយូរពេក។ សូមបន្ថយរង្វង់រ៉ាដា ឬសាកល្បងម្តងទៀត។',
    });
  }
});

interface KartaApiPhoto {
  id?: string | number;
  lat?: string | number;
  lng?: string | number;
  heading?: string | number;
  shotDate?: string;
  imageProcUrl?: string;
  imageLthUrl?: string;
  imageThUrl?: string;
  fileurlProc?: string;
  fileurlLTh?: string;
  fileurl?: string;
  sequenceId?: string | number;
  sequenceIndex?: string | number;
  width?: string | number;
  height?: string | number;
}

async function queryKartaViewPoint(
  lat: number,
  lng: number,
  radiusM: number,
  itemsPerPage: number
): Promise<KartaApiPhoto[]> {
  const url = new URL('https://api.kartaview.org/2.0/photo/');
  url.searchParams.set('lat', lat.toFixed(6));
  url.searchParams.set('lng', lng.toFixed(6));
  url.searchParams.set('radius', String(Math.round(clamp(radiusM, 50, 500))));
  url.searchParams.set('itemsPerPage', String(itemsPerPage));
  url.searchParams.set('page', '1');

  const upstream = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        'User-Agent': 'ThaiGeoEarthExplorer/1.0',
        Accept: 'application/json',
      },
    },
    9000
  );

  if (!upstream.ok) {
    const err = new Error(`KartaView upstream HTTP ${upstream.status}`);
    (err as { status?: number }).status = upstream.status;
    throw err;
  }

  const json = (await upstream.json()) as {
    result?: { data?: KartaApiPhoto[] };
  };
  return Array.isArray(json.result?.data) ? json.result.data : [];
}

// Open KartaView HD Street-Level Imagery Proxy (Zero API Key)
app.get('/api/streetview/kartaview', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    // KartaView API v2 enforces radius in [1, 500] meters
    const radius = Math.round(clamp(Number(req.query.radius) || 500, 100, 500));

    if (!isValidCoord(lat, lng)) {
      res.status(400).json({ frames: [], error: 'កូអរដោណេមិនត្រឹមត្រូវ។' });
      return;
    }

    const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
    const cached = kartaViewCache.get(cacheKey);
    if (cached) {
      res.json({ frames: cached });
      return;
    }

    let rawItems = await queryKartaViewPoint(lat, lng, radius, 24);

    // If center lies inside a restricted base perimeter, probe 4 nearby roadside points (~700m out)
    if (rawItems.length === 0) {
      const degLat = 0.0063;
      const degLng = 0.0063 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
      const offsets: [number, number][] = [
        [lat + degLat, lng],
        [lat - degLat, lng],
        [lat, lng + degLng],
        [lat, lng - degLng],
      ];
      const settled = await Promise.allSettled(
        offsets.map(([oLat, oLng]) => queryKartaViewPoint(oLat, oLng, 500, 8))
      );
      const merged: KartaApiPhoto[] = [];
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          merged.push(...s.value);
        }
      }
      rawItems = merged;
    }

    const seenIds = new Set<string>();
    const frames = rawItems
      .map((item) => {
        // Prefer fast cdn.kartaview.org URLs over legacy storage*.openstreetcam.org URLs
        const imageUrl =
          item.imageProcUrl ||
          item.imageLthUrl ||
          item.imageThUrl ||
          item.fileurlProc ||
          item.fileurlLTh ||
          '';
        const thumbUrl = item.imageLthUrl || item.imageThUrl || item.fileurlLTh || imageUrl;
        const pLat = Number(item.lat);
        const pLng = Number(item.lng);
        if (
          !imageUrl ||
          imageUrl.includes('{{') ||
          !/^https?:\/\//i.test(imageUrl) ||
          !isValidCoord(pLat, pLng)
        ) {
          return null;
        }
        const id = String(item.id ?? `${pLat}-${pLng}`);
        if (seenIds.has(id)) return null;
        seenIds.add(id);
        return {
          id,
          imageUrl,
          thumbUrl: /^https?:\/\//i.test(thumbUrl) && !thumbUrl.includes('{{') ? thumbUrl : imageUrl,
          lat: pLat,
          lng: pLng,
          heading: Number(item.heading) || 0,
          shotDate: sanitizeText(item.shotDate || '', 40),
          sequenceId: String(item.sequenceId ?? ''),
          sequenceIndex: Number(item.sequenceIndex) || 0,
          width: Number(item.width) || 1920,
          height: Number(item.height) || 1080,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .slice(0, 24);

    kartaViewCache.set(cacheKey, frames, 5 * 60 * 1000);
    res.json({ frames });
  } catch (err) {
    console.warn('KartaView proxy fallback:', err instanceof Error ? err.message : err);
    res.status(502).json({ frames: [], error: 'មិនអាចទាញយករូបភាពផ្លូវ HD ពី KartaView បានទេនៅពេលនេះ។' });
  }
});

// Same-origin high-resolution satellite snapshot proxy so client HTML5 Canvas FLIR analysis runs without CORS tainting
app.get('/api/scanner/satellite-image', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const halfHeightKm = clamp(Number(req.query.halfHeightKm) || 0.55, 0.18, 2.2);
    const width = Math.round(clamp(Number(req.query.width) || 640, 240, 800));
    const height = Math.round(clamp(Number(req.query.height) || 380, 180, 520));

    if (!isValidCoord(lat, lng)) {
      res.status(400).json({ error: 'កូអរដោណេមិនត្រឹមត្រូវ។' });
      return;
    }

    const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${halfHeightKm.toFixed(2)}:${width}x${height}`;
    const cached = satelliteImgCache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.send(cached);
      return;
    }

    const aspect = width / height;
    const dLat = halfHeightKm / 111.32;
    const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const dLng = (halfHeightKm * aspect) / (111.32 * cosLat);
    const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat]
      .map((n) => n.toFixed(6))
      .join(',');

    const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${width},${height}&imageSR=3857&format=jpg&f=image`;

    const upstream = await fetchWithTimeout(
      esriUrl,
      {
        headers: {
          'User-Agent': 'ThaiGeoEarthExplorer/1.0',
          Accept: 'image/jpeg,image/*,*/*;q=0.8',
        },
      },
      12000
    );

    if (!upstream.ok) {
      throw new Error(`Esri satellite export HTTP ${upstream.status}`);
    }

    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length < 512) {
      throw new Error('Empty satellite image buffer');
    }

    satelliteImgCache.set(cacheKey, buf, 15 * 60 * 1000);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.send(buf);
  } catch (err) {
    console.warn('Satellite proxy fallback:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'មិនអាចទាញយករូបភាពផ្កាយរណបសម្រាប់វិភាគកំដៅបានទេ។' });
  }
});

// Real OpenStreetMap military & aviation structure scanner inside a base perimeter
app.get('/api/scanner/infrastructure', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusM = Math.round(clamp(Number(req.query.radiusM) || 1500, 400, 2600));

    if (!isValidCoord(lat, lng)) {
      res.status(400).json({ structures: [], error: 'កូអរដោណេមិនត្រឹមត្រូវ។' });
      return;
    }

    const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusM}`;
    const cached = baseInfraCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const query = `
      [out:json][timeout:14];
      (
        nwr["aeroway"~"^(hangar|apron|helipad|runway)$"](around:${radiusM},${lat},${lng});
        nwr["military"~"^(bunker|ammunition|depot|barracks|range|checkpoint|trench|radar|airfield|naval_base)$"](around:${radiusM},${lat},${lng});
        nwr["building"~"^(bunker|hangar|military)$"](around:${radiusM},${lat},${lng});
        nwr["man_made"~"^(storage_tank|silo|radar)$"](around:${radiusM},${lat},${lng});
      );
      out center 60;
    `;

    const mirrors = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    interface OverpassInfraElement {
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }
    interface OverpassInfraResponse {
      elements?: OverpassInfraElement[];
    }

    let data: OverpassInfraResponse | null = null;

    for (const mirror of mirrors) {
      try {
        const upstream = await fetchWithTimeout(
          mirror,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'ThaiGeoEarthExplorer/1.0',
            },
            body: `data=${encodeURIComponent(query)}`,
          },
          13000
        );
        if (!upstream.ok) continue;
        data = (await upstream.json()) as OverpassInfraResponse;
        break;
      } catch {
        continue;
      }
    }

    const elements = data?.elements ?? [];
    const seen = new Set<string>();
    const counts = {
      hangar: 0,
      bunker: 0,
      fuel: 0,
      helipad: 0,
      barracks: 0,
      radar: 0,
    };

    const structures: Array<{
      id: string;
      category: keyof typeof counts;
      categoryKm: string;
      name: string;
      lat: number;
      lng: number;
      distanceM: number;
    }> = [];

    for (const el of elements) {
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;
      if (!isValidCoord(pLat, pLng)) continue;

      const tags = el.tags ?? {};
      const dedupeKey = `${pLat.toFixed(4)}:${pLng.toFixed(4)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      let category: keyof typeof counts = 'barracks';
      let categoryKm = 'អគារបន្ទាយ / ទីលានហ្វឹកហាត់';

      if (tags.aeroway === 'hangar' || tags.aeroway === 'apron' || tags.building === 'hangar') {
        category = 'hangar';
        categoryKm = tags.aeroway === 'apron' ? 'ទីលានចតយន្តហោះ (Apron)' : 'ឃ្លាំងយន្តហោះ (Hangar)';
      } else if (
        tags.military === 'bunker' ||
        tags.military === 'ammunition' ||
        tags.military === 'depot' ||
        tags.building === 'bunker'
      ) {
        category = 'bunker';
        categoryKm =
          tags.military === 'ammunition'
            ? 'ឃ្លាំងគ្រាប់រំសេវ (OSM)'
            : 'លេណដ្ឋាន / ឃ្លាំងស្តុក (Bunker)';
      } else if (tags.man_made === 'storage_tank' || tags.man_made === 'silo') {
        category = 'fuel';
        categoryKm = 'ធុងប្រេង / ស្តុកសម្ភារៈ';
      } else if (tags.aeroway === 'helipad') {
        category = 'helipad';
        categoryKm = 'ទីលានឧទ្ធម្ភាគចក្រ (Helipad)';
      } else if (tags.military === 'radar' || tags.man_made === 'radar') {
        category = 'radar';
        categoryKm = 'ស្ថានីយរ៉ាដា / ទំនាក់ទំនង';
      } else if (tags.aeroway === 'runway') {
        category = 'hangar';
        categoryKm = 'ផ្លូវរត់យន្តហោះ (Runway)';
      }

      counts[category] += 1;
      const rawName = sanitizeText(tags['name:en'] || tags.name || tags.ref || '', 80);
      const distanceM = Math.round(haversineKm(lat, lng, pLat, pLng) * 1000);

      structures.push({
        id: `${el.type}-${el.id}`,
        category,
        categoryKm,
        name: rawName || categoryKm,
        lat: pLat,
        lng: pLng,
        distanceM,
      });

      if (structures.length >= 40) break;
    }

    structures.sort((a, b) => a.distanceM - b.distanceM);

    const payload = {
      structures,
      counts,
      total: structures.length,
      radiusM,
      degraded: data === null,
    };

    if (data !== null) {
      baseInfraCache.set(cacheKey, payload, 10 * 60 * 1000);
    }
    res.json(payload);
  } catch (err) {
    console.warn('Base infrastructure scan fallback:', err instanceof Error ? err.message : err);
    res.json({
      structures: [],
      counts: { hangar: 0, bunker: 0, fuel: 0, helipad: 0, barracks: 0, radar: 0 },
      total: 0,
      radiusM: 1500,
      degraded: true,
    });
  }
});

interface WaybackRelease {
  releaseId: number;
  date: string;
  year: string;
  title: string;
  tileTemplate: string;
}

let cachedWaybackReleases: { items: WaybackRelease[]; expiresAt: number } | null = null;

async function getWaybackReleases(): Promise<WaybackRelease[]> {
  if (cachedWaybackReleases && Date.now() < cachedWaybackReleases.expiresAt) {
    return cachedWaybackReleases.items;
  }

  const upstream = await fetchWithTimeout(
    'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',
    {
      headers: {
        'User-Agent': 'ThaiGeoEarthExplorer/1.0',
        Accept: 'application/json',
      },
    },
    10000
  );

  if (!upstream.ok) {
    throw new Error(`Wayback config HTTP ${upstream.status}`);
  }

  const raw = (await upstream.json()) as Record<
    string,
    { itemTitle?: string; itemURL?: string }
  >;

  const releases: WaybackRelease[] = [];
  for (const [key, entry] of Object.entries(raw)) {
    const releaseId = Number(key);
    if (!Number.isFinite(releaseId) || !entry?.itemURL) continue;
    const title = sanitizeText(entry.itemTitle || '', 120);
    const match = title.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) continue;
    const date = match[1];
    releases.push({
      releaseId,
      date,
      year: date.slice(0, 4),
      title,
      tileTemplate: entry.itemURL,
    });
  }

  // Sort newest first for chained tilemap walking
  releases.sort((a, b) => b.date.localeCompare(a.date));
  cachedWaybackReleases = {
    items: releases,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
  };
  return releases;
}

function latLngToTileXY(lat: number, lng: number, zoom: number): { row: number; col: number } {
  const n = Math.pow(2, zoom);
  const col = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const row = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { row, col };
}

// Public Historical Satellite Imagery Timeline via Esri World Imagery Wayback (Zero API Key)
app.get('/api/imagery/history', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const zoom = Math.round(clamp(Number(req.query.zoom) || 15, 14, 16));

    if (!isValidCoord(lat, lng)) {
      res.status(400).json({ snapshots: [], error: 'កូអរដោណេមិនត្រឹមត្រូវ។' });
      return;
    }

    const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${zoom}`;
    const cached = imageryHistoryCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const allReleasesNewestFirst = await getWaybackReleases();
    const idxById = new Map<number, number>(
      allReleasesNewestFirst.map((rel, idx) => [rel.releaseId, idx])
    );

    const { row, col } = latLngToTileXY(lat, lng, zoom);
    const localChanges: WaybackRelease[] = [];
    const seenIds = new Set<number>();

    // Walk Esri Wayback's local-change tilemap chain to find genuine historical captures at this base
    let cursor = 0;
    let steps = 0;
    while (cursor < allReleasesNewestFirst.length && localChanges.length < 16 && steps < 20) {
      steps += 1;
      const candidate = allReleasesNewestFirst[cursor];
      try {
        const tmUrl = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tilemap/${candidate.releaseId}/${zoom}/${row}/${col}`;
        const tmRes = await fetchWithTimeout(
          tmUrl,
          {
            headers: {
              'User-Agent': 'ThaiGeoEarthExplorer/1.0',
              Accept: 'application/json',
            },
          },
          4500
        );
        if (!tmRes.ok) break;
        const tmJson = (await tmRes.json()) as {
          data?: number[];
          select?: number[];
        };
        if (!Array.isArray(tmJson.data) || tmJson.data[0] !== 1) break;

        const actualId =
          Array.isArray(tmJson.select) && typeof tmJson.select[0] === 'number'
            ? tmJson.select[0]
            : candidate.releaseId;

        const actualIdx = idxById.get(actualId);
        if (actualIdx === undefined) break;

        const matched = allReleasesNewestFirst[actualIdx];
        if (!seenIds.has(matched.releaseId)) {
          seenIds.add(matched.releaseId);
          localChanges.push(matched);
        }
        cursor = actualIdx + 1;
      } catch {
        break;
      }
    }

    // Fallback: if tilemap chain returned < 2 snapshots, sample 1 release per year (2014 -> latest)
    let chronological: WaybackRelease[];
    if (localChanges.length >= 2) {
      chronological = localChanges.reverse();
    } else {
      const byYear = new Map<string, WaybackRelease>();
      for (const rel of allReleasesNewestFirst) {
        if (!byYear.has(rel.year)) {
          byYear.set(rel.year, rel);
        }
      }
      chronological = Array.from(byYear.values()).sort((a, b) => a.date.localeCompare(b.date));
    }

    const payload = {
      zoom,
      snapshots: chronological,
      localChangeFiltered: localChanges.length >= 2,
      source: 'Esri World Imagery Wayback',
    };

    imageryHistoryCache.set(cacheKey, payload, 30 * 60 * 1000);
    res.json(payload);
  } catch (err) {
    console.warn('Historical imagery lookup fallback:', err instanceof Error ? err.message : err);
    res.status(502).json({
      snapshots: [],
      error: 'មិនអាចទាញយកប្រវត្តិរូបភាពផ្កាយរណបបានទេនៅពេលនេះ។',
    });
  }
});

// Explicit 404 JSON for unknown /api routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'រកមិនឃើញចំណុចភ្ជាប់ API នេះទេ។' });
});

// Clean JSON error middleware (e.g., malformed JSON payloads)
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'ទម្រង់ទិន្នន័យ JSON មិនត្រឹមត្រូវ។' });
      return;
    }
    next(err);
  }
);

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
