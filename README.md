# Hallmark Christmas Movies addon v2.0.0

This version searches TMDB directly. It no longer fetches XmasDB.

## Cloudflare
- Keep the existing Worker name and `TMDB_API_KEY` Secret.
- Replace the deployed Worker code with `worker.js`.
- Deploy the Worker.
- Keep using `https://YOUR-WORKER.workers.dev/manifest.json` in Nuvio.

## Important limitation
TMDB is a community metadata database and does not provide a guaranteed complete Hallmark Christmas collection. This addon dynamically searches Hallmark/Crown Media production-company records and supplements them with TMDB movie search. It filters candidates by Christmas/holiday signals and Hallmark/Crown Media production company credits. The resulting count depends on TMDB's current metadata coverage.
