const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const BG = "https://image.tmdb.org/t/p/w1280";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json; charset=utf-8"
};

const manifest = {
  id: "community.hallmark.christmas.movies",
  version: "2.0.0",
  name: "Hallmark Christmas Movies",
  description: "Phim Giáng Sinh Hallmark được tìm trực tiếp từ TMDB.",
  resources: ["catalog", "meta"],
  types: ["movie"],
  idPrefixes: ["tt", "tmdb:"],
  catalogs: [{
    type: "movie",
    id: "hallmark_christmas_latest",
    name: "🎄 Hallmark Christmas • Mới nhất",
    extra: [{ name: "skip", isRequired: false }]
  }]
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, ...extra } });

async function tmdb(path, key, params = {}) {
  const url = new URL(API + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`TMDB ${response.status} at ${path}`);
  return response.json();
}

const norm = value => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function isChristmasMovie(movie) {
  const text = norm(`${movie.title || ""} ${movie.original_title || ""} ${movie.overview || ""}`);
  const keywords = (movie.keywords?.keywords || movie.keywords?.results || []).map(x => norm(x.name));
  const holidaySignal = /\bchristmas\b|\bxmas\b|\byuletide\b|\bholiday\b/.test(text) ||
    keywords.some(k => /christmas|xmas|holiday/.test(k));
  const companies = (movie.production_companies || []).map(c => norm(c.name));
  const hallmarkCompany = companies.some(c => c.includes("hallmark") || c.includes("crown media"));
  return holidaySignal && hallmarkCompany;
}

function toMeta(movie) {
  const ids = movie.external_ids || {};
  return {
    id: ids.imdb_id || `tmdb:${movie.id}`,
    type: "movie",
    name: movie.title || movie.original_title,
    poster: movie.poster_path ? IMG + movie.poster_path : undefined,
    background: movie.backdrop_path ? BG + movie.backdrop_path : undefined,
    description: movie.overview || "",
    releaseInfo: (movie.release_date || "").slice(0, 4),
    imdbRating: movie.vote_average ? Number(movie.vote_average).toFixed(1) : undefined,
    genres: (movie.genres || []).map(g => g.name)
  };
}

async function discoverHallmark(key) {
  // Resolve Hallmark-related production companies dynamically; no external catalog is used.
  const companySearches = await Promise.all([
    tmdb("/search/company", key, { query: "Hallmark" }),
    tmdb("/search/company", key, { query: "Crown Media" })
  ]);
  const companyMap = new Map();
  for (const result of companySearches) {
    for (const company of result.results || []) {
      const name = norm(company.name);
      if ((name.includes("hallmark") || name.includes("crown media")) && (!company.origin_country || company.origin_country === "US")) {
        companyMap.set(company.id, company);
      }
    }
  }

  const jobs = [];
  for (const company of companyMap.values()) {
    jobs.push(tmdb("/discover/movie", key, {
      with_companies: company.id,
      sort_by: "primary_release_date.desc",
      include_adult: false,
      page: 1
    }));
    jobs.push(tmdb("/discover/movie", key, {
      with_companies: company.id,
      sort_by: "primary_release_date.desc",
      include_adult: false,
      page: 2
    }));
  }
  // Search results supplement discover because some Hallmark titles are tagged inconsistently.
  for (const query of ["Hallmark Christmas", "Hallmark Christmas movie", "Hallmark holiday movie"]) {
    jobs.push(tmdb("/search/movie", key, { query, include_adult: false, page: 1 }));
  }
  const responses = await Promise.all(jobs);
  const candidates = new Map();
  for (const response of responses) {
    for (const item of response.results || []) {
      if (item.id) candidates.set(item.id, item);
    }
  }

  const ids = [...candidates.keys()];
  const detailed = [];
  for (let i = 0; i < ids.length; i += 6) {
    const batch = await Promise.all(ids.slice(i, i + 6).map(id =>
      tmdb(`/movie/${id}`, key, { append_to_response: "keywords,external_ids" }).catch(() => null)
    ));
    for (const movie of batch) if (movie && isChristmasMovie(movie)) detailed.push(toMeta(movie));
  }
  const unique = new Map(detailed.map(m => [m.id, m]));
  return [...unique.values()].sort((a, b) =>
    (b.releaseInfo || "").localeCompare(a.releaseInfo || "") || a.name.localeCompare(b.name)
  );
}

async function getMeta(id, key) {
  let tmdbId = id;
  if (id.startsWith("tmdb:")) tmdbId = id.slice(5);
  else if (/^tt\d+$/.test(id)) {
    const found = await tmdb(`/find/${id}`, key, { external_source: "imdb_id" });
    tmdbId = found.movie_results?.[0]?.id;
    if (!tmdbId) return null;
  } else return null;
  const movie = await tmdb(`/movie/${tmdbId}`, key, { append_to_response: "keywords,external_ids" });
  return toMeta(movie);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/") return new Response("Hallmark Christmas addon v2.0.0 running", { headers: { ...CORS, "Content-Type": "text/plain" } });
    if (url.pathname === "/manifest.json") return json(manifest);
    if (!env.TMDB_API_KEY) return json({ error: "Thiếu Secret TMDB_API_KEY" }, 500);

    if (/^\/catalog\/movie\/hallmark_christmas_latest(?:\/.*)?\.json$/.test(url.pathname)) {
      try {
        const metas = await discoverHallmark(env.TMDB_API_KEY);
        const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
        return json({ metas: metas.slice(skip, skip + 100), source: "TMDB direct", matchedCount: metas.length }, 200, {
          "Cache-Control": "public, max-age=1800"
        });
      } catch (error) {
        return json({ metas: [], error: String(error.message || error), source: "TMDB direct" }, 502);
      }
    }

    const metaMatch = url.pathname.match(/^\/meta\/movie\/([^/]+)\.json$/);
    if (metaMatch) {
      try {
        const meta = await getMeta(decodeURIComponent(metaMatch[1]), env.TMDB_API_KEY);
        return meta ? json({ meta }) : json({ meta: null }, 404);
      } catch (error) {
        return json({ error: String(error.message || error) }, 502);
      }
    }
    return json({ error: "Not found" }, 404);
  }
};
