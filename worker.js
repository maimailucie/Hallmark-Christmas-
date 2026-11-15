const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json; charset=utf-8"
};

// Curated Hallmark Christmas movie titles, grouped by premiere year.
// Sources include Hallmark's movie pages and published Hallmark Christmas checklists.
const TITLES = {
  2026: [
    "Save the Date for Christmas", "Barking All the Way", "Hearts All Aglow", "Noelle Nomads",
    "Snow Globe Town", "Christmas in Canterbury", "An Angel in My Stocking", "A Grand Biltmore Christmas",
    "The Snowflake Effect", "Eight Nights for Love", "Miles to Christmas", "Holiday Ever After: A Disney World Wish Come True",
    "The Most Wonderful Secret", "Return to Santa", "The Christmas Eve Feast", "Christmas Delivered",
    "Double Booked for the Holidays", "Christmas in Blue Dog Valley", "Our Holiday Playbook", "Mistletoe and Mimosas",
    "The Nights Before Christmas", "My Christmas Cowboy", "A Season of Promises", "Holiday Unplugged",
    "Merry Memories", "A Danish Christmas", "Adopting St. Nick", "Who's Coming for Christmas?",
    "What If Christmas", "Forgotten Holiday", "Winter Wonderlanes", "Mr. & Mrs. Christmas",
    "Holiday Touchdown: A Bears Love Story", "'Tis the Season for Setups"
  ],
  2025: [
    "A Royal Montana Christmas", "A Christmas Angel Match", "Merry Christmas, Ted Cooper!", "Christmas on Duty",
    "A Newport Christmas", "Christmas Above the Clouds", "A Keller Christmas Vacation", "Three Wisest Men",
    "Tidings for the Season", "Holiday Touchdown: A Bills Love Story", "Melt My Heart This Christmas", "We Met in December",
    "The Snow Must Go On", "The More the Merrier", "An Alpine Holiday", "A Grand Ole Opry Christmas",
    "The Christmas Cup", "Christmas at the Catnip Café", "She's Making a List", "Single on the 25th",
    "A Suite Holiday Romance", "Oy to the World", "A Make or Break Holiday", "The Christmas Baby"
  ],
  2024: [
    "A '90s Christmas", "A Carol for Two", "A Dance in the Snow", "A Novel Noel", "A Reason for the Season",
    "A Very Vermont Christmas", "All I Need for Christmas", "An Ice Palace Romance", "Believe in Christmas",
    "Christmas on Call", "Christmas Under the Lights", "Falling Like Snowflakes", "'Twas the Date Before Christmas",
    "Holiday Crashers", "Scouting for Christmas", "The Christmas Charade", "The 5-Year Christmas Party",
    "Our Holiday Story", "Holiday Mismatch", "Trivia at St. Nick's", "Santa Tell Me", "'Tis the Season to Be Irish",
    "Christmas with the Singhs", "Jingle Bell Run", "Confessions of a Christmas Letter", "Three Wiser Men and a Boy",
    "To Have and to Holiday", "Debbie Macomber's Joyful Mrs. Miracle", "Deck the Walls", "Holiday Touchdown: A Chiefs Love Story",
    "The Finnish Line", "The Christmas Quest", "Private Princess Christmas", "Sugarplummed", "Leah's Perfect Gift",
    "Hanukkah on the Rocks", "The Santa Class", "Following Yonder Star", "Happy Howlidays", "This Time Each Year",
    "My Sweet Austrian Holiday", "Five Gold Rings", "A Novel Noel", "Trading Up Christmas", "Unwrapping Christmas: Tina's Miracle",
    "Unwrapping Christmas: Mia's Prince", "Unwrapping Christmas: Lily's Destiny", "Unwrapping Christmas: Olivia's Reunion",
    "Season's Greetings from Cherry Lane", "Happy Holidays from Cherry Lane", "Deck the Halls on Cherry Lane"
  ],
  2023: [
    "Checkin' It Twice", "Where Are You, Christmas?", "Under the Christmas Sky", "Christmas by Design", "Mystic Christmas",
    "Joyeux Noel", "Flipping for Christmas", "Never Been Chris'd", "The Santa Summit", "Everything Christmas",
    "Christmas Island", "A Heidelberg Holiday", "Navigating Christmas", "A Merry Scottish Christmas", "Holiday Hotline",
    "Catch Me If You Claus", "Letters to Santa", "Holiday Road", "Christmas in Notting Hill", "Haul Out the Holly: Lit Up",
    "Our Christmas Mural", "A Biltmore Christmas", "My Norwegian Holiday", "A Not So Royal Christmas", "Christmas with a Kiss",
    "Magic in Mistletoe", "Christmas on Cherry Lane", "Round and Round", "The Secret Gift of Christmas", "Sealed with a List",
    "Friends & Family Christmas", "Ms. Christmas Comes to Town", "My Christmas Guide", "Mystery on Mistletoe Lane",
    "A World Record Christmas", "A Season for Family", "Time for Her to Come Home for Christmas", "To All a Good Night",
    "Heaven Down Here", "Miracle in Bethlehem, PA", "Rescuing Christmas", "An Ice Palace Romance"
  ],
  2022: [
    "Noel Next Door", "We Wish You a Married Christmas", "A Kismet Christmas", "A Cozy Christmas Inn", "Jolly Good Christmas",
    "Ghosts of Christmas Always", "A Magical Christmas Village", "Lights, Camera, Christmas!", "All Saints Christmas",
    "In Merry Measure", "The Royal Nanny", "Christmas at the Golden Dragon", "Inventing the Christmas Prince",
    "Three Wise Men and a Baby", "When I Think of Christmas", "My Southern Family Christmas", "#Xmas",
    "A Royal Corgi Christmas", "A Tale of Two Christmases", "Haul Out the Holly", "A Christmas Cookie Catastrophe",
    "A Holiday Spectacular", "A Big Fat Family Christmas", "A Fabled Holiday", "Undercover Holiday",
    "The Most Colorful Time of the Year", "Christmas Class Reunion", "The Holiday Sitter", "Holiday Heritage",
    "'Twas the Night Before Christmas", "Hanukkah on Rye", "We Need a Little Christmas", "Christmas Bedtime Stories",
    "A Maple Valley Christmas", "Our Italian Christmas Memories", "Long Lost Christmas", "Time for Him to Come Home for Christmas"
  ]
};

const manifest = {
  id: "community.hallmark.christmas.movies",
  version: "1.2.0",
  name: "Hallmark Christmas Movies",
  description: "Thư viện phim Giáng Sinh Hallmark tuyển chọn từ nhiều năm. Metadata TMDB; không cung cấp nguồn phát.",
  resources: ["catalog", "meta"],
  types: ["movie"],
  idPrefixes: ["tt", "tmdb:"],
  catalogs: [{
    type: "movie",
    id: "hallmark_christmas_latest",
    name: "🎄 Hallmark Christmas • Tất cả năm",
    extra: [{ name: "skip", isRequired: false }]
  }]
};

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { ...CORS, ...headers }
});

async function tmdb(path, key, params = {}, language = "vi-VN") {
  const url = new URL(API + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", language);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  return res.json();
}

function makeMeta(movie, external = {}) {
  return {
    id: external.imdb_id || `tmdb:${movie.id}`,
    type: "movie",
    name: movie.title || movie.original_title,
    poster: movie.poster_path ? IMG + "w500" + movie.poster_path : undefined,
    background: movie.backdrop_path ? IMG + "w1280" + movie.backdrop_path : undefined,
    description: movie.overview || "",
    releaseInfo: (movie.release_date || "").slice(0, 4),
    imdbRating: movie.vote_average ? movie.vote_average.toFixed(1) : undefined,
    genres: movie.genres?.map(g => g.name)
  };
}

const normalize = s => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

async function resolveTitle(title, year, key) {
  const found = await tmdb("/search/movie", key, { query: title, year, include_adult: false });
  const wanted = normalize(title);
  const matches = (found.results || []).filter(m => {
    const actual = normalize(m.title || m.original_title);
    return (m.release_date || "").startsWith(String(year)) &&
      (actual === wanted || actual.includes(wanted) || wanted.includes(actual));
  });
  if (!matches.length) return null;
  matches.sort((a, b) => {
    const score = x => (normalize(x.title) === wanted ? 100 : 0) + (x.poster_path ? 10 : 0) + Math.min(x.vote_count || 0, 1000) / 100;
    return score(b) - score(a);
  });
  const details = await tmdb(`/movie/${matches[0].id}`, key, { append_to_response: "external_ids" });
  let result = makeMeta(details, details.external_ids || {});
  if (!result.description) {
    const english = await tmdb(`/movie/${matches[0].id}`, key, { append_to_response: "external_ids" }, "en-US");
    result.description = english.overview || "";
    if (!result.poster) result.poster = english.poster_path ? IMG + "w500" + english.poster_path : undefined;
    if (!result.background) result.background = english.backdrop_path ? IMG + "w1280" + english.backdrop_path : undefined;
  }
  return result;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      try { out[i] = await fn(items[i]); } catch { out[i] = null; }
    }
  });
  await Promise.all(workers);
  return out;
}

async function getCatalog(key, skip) {
  const entries = Object.entries(TITLES)
    .flatMap(([year, titles]) => titles.map(title => ({ title, year: Number(year) })))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const results = await mapLimit(entries, 5, item => resolveTitle(item.title, item.year, key));
  const unique = new Map();
  for (const item of results.filter(Boolean)) unique.set(item.id, item);
  return [...unique.values()].slice(skip, skip + 100);
}

async function getMeta(id, key) {
  if (id.startsWith("tmdb:")) {
    const details = await tmdb(`/movie/${id.slice(5)}`, key, { append_to_response: "external_ids" });
    return makeMeta(details, details.external_ids || {});
  }
  if (/^tt\d+$/.test(id)) {
    const found = await tmdb(`/find/${id}`, key, { external_source: "imdb_id" });
    const movie = found.movie_results?.[0];
    if (!movie) return null;
    const details = await tmdb(`/movie/${movie.id}`, key, { append_to_response: "external_ids" });
    return makeMeta(details, { ...(details.external_ids || {}), imdb_id: id });
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/") return new Response("Hallmark Christmas addon running", {
      headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" }
    });
    if (url.pathname === "/manifest.json") return json(manifest);
    if (!env.TMDB_API_KEY) return json({ error: "Thiếu Secret TMDB_API_KEY" }, 500);

    const catalogMatch = url.pathname.match(/^\/catalog\/movie\/hallmark_christmas_latest(?:\/.*)?\.json$/);
    if (catalogMatch) {
      try {
        const skip = Math.max(0, Number(url.searchParams.get("skip") || 0));
        const metas = await getCatalog(env.TMDB_API_KEY, skip);
        return json({ metas }, 200, { "Cache-Control": "public, max-age=900" });
      } catch (error) {
        return json({ metas: [], error: String(error.message || error) }, 502);
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
