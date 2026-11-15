# Hallmark Christmas Movies v1.0.0

Cloudflare Worker, Stremio/Nuvio-compatible catalog. One movie catalog: `Hallmark Christmas • Mới nhất`.

- Curated 2026 Hallmark Countdown to Christmas movie schedule, newest premiere first.
- TMDB metadata requested in Vietnamese (`vi-VN`).
- Uses IMDb ID when TMDB supplies it; otherwise `tmdb:<id>`.
- Catalog + metadata only. No stream resource; other installed providers may supply playback if they support the ID.

## Deploy
1. Create/open a Cloudflare Worker and paste `worker.js`.
2. Settings -> Variables and Secrets -> add Secret `TMDB_API_KEY` (TMDB v3 API key).
3. Deploy.
4. Install `https://YOUR-WORKER.workers.dev/manifest.json` in Nuvio.

Titles are resolved against TMDB by title and 2026 release year. Unmatched titles are omitted to avoid false matches. Schedule based on Hallmark's 2026 Countdown schedule; update the `TITLES` array as new titles/dates are announced.
