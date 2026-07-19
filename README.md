# Köchel

A self-hosted classical music library manager and streaming server, modeled around **composer → work → movement → recording** rather than artist/album/track — because that's how classical music actually works. Compare recordings of the same work side by side, browse by composer and catalogue number, and stream from your own library on your own hardware.

Named after Ludwig von Köchel, who catalogued Mozart's works.

## Features

- **A data model built for classical music** — composers, works, movements, catalogue numbers (K., Op., BWV…), ensembles, performers, and recordings, not a repurposed pop-music schema.
- **Compare recordings** of the same work side by side instead of picking one "album."
- **Web player** — composer browsing, work detail, search, and a full Now Playing view with movement-level navigation and a slowly-turning record motif.
- **Native iOS app** (SwiftUI, not a WebView) — the same browsing/search/Now Playing experience, background audio with lock-screen and Control Center integration, and offline downloads.
- **Browser-based import** — drag a folder in, and it scans embedded tags, suggests composer/work matches against your library and [Open Opus](https://openopus.org), and lets you correct anything before committing it into your catalogue.
- **Self-hosted** — your library, your server, no subscriptions or external dependencies at runtime.

## Quick start

1. Copy `.env.example` to `.env` and set a real `POSTGRES_PASSWORD`.
2. `docker compose up -d --build` — builds the API and web images, starts Postgres, and runs migrations automatically on boot.
3. Seed a small synthetic demo library (tiny sine-tone WAV files, no real audio — just enough to validate every relationship in the schema):
   ```
   docker compose run --rm app python -m scripts.seed
   ```
4. Open **http://localhost:3000** for the web player. Interactive API docs: http://localhost:8000/docs.

## Importing your real library

Set `MUSIC_LIBRARY_PATH` in `.env` to the host path where you want your music library to live before `docker compose up` — it's mounted **read-write** at `/music` inside the container. Upload (below) is the only thing that writes into it; scanning and streaming are read-only.

Open **http://localhost:3000/import** (linked from the header of the main app):
1. **Upload an album** — pick a folder (or a batch of files) from your laptop and upload it. Uses the browser's folder picker so an album's subfolder structure is preserved on the server; files land under `MUSIC_LIBRARY_PATH` on disk. Only recognized audio extensions are accepted, and a file is never overwritten if something already exists at that path.
2. **Scan library** (runs automatically on page load, and again after each upload/commit) — walks the mounted folder, reads embedded ID3/FLAC/Vorbis tags as a first-pass hint, and groups files by directory (skipping anything already imported).
3. Click a group to review it. Search-as-you-type against your existing library **and** [Open Opus](https://openopus.org) suggests composer/work matches — Open Opus is only ever a helper for suggestions, never a source of truth; picking a suggestion just pre-fills editable fields you commit into your own tables. Fill in catalogue numbers, movements, ensemble, performers, and map each file to the movement(s) it covers.
4. **Commit** — creates (or reuses existing) Composer/Work/Movements/Ensemble/People rows and writes the Recording + Tracks.

If you'd rather place files directly on the server yourself (e.g. it's the same machine, or you're copying over the network some other way), that still works exactly as before — just drop them under `MUSIC_LIBRARY_PATH` and hit Scan.

MusicBrainz enrichment is intentionally out of scope for now.

## Deploying to a server

`docker-compose.yml`'s three services (`postgres`, `app`, `web`) all run `restart: unless-stopped`, so a plain `docker compose up -d --build` on any Docker host is a full deployment — no separate deploy tooling. On the server:

```
git clone https://github.com/XWBarton/kochel.git
cd kochel
cp .env.example .env   # set POSTGRES_PASSWORD, MUSIC_LIBRARY_PATH, and WEB_PORT/APP_PORT if the defaults collide with anything else already running
docker compose up -d --build
```

To ship a new version later: `git pull && docker compose up -d --build`.

## Backend development (without Docker)

```
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp ../.env.example .env   # then point DATABASE_URL at a local Postgres
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

### Running tests

The test suite **drops and recreates the entire schema before every test**. `conftest.py` refuses to run unless `DATABASE_URL` points at a database whose name ends in `_test` — this is a hard guard, not a convention, after an early test run was accidentally pointed at the dev database and wiped the seeded demo library.

One-time setup — create the test database (the app container's entrypoint runs migrations before anything else, including before `conftest.py`'s own auto-create logic gets a chance to run, so it must exist first when going through Docker):
```
docker compose exec postgres createdb -U kochel kochel_test
```

Then, via Docker (matches how CI/manual verification runs it):
```
docker compose run --rm \
  -e DATABASE_URL=postgresql+asyncpg://kochel:<password>@postgres:5432/kochel_test \
  -e MUSIC_LIBRARY_ROOT=/tmp/testlib \
  app sh -c "pip install -q -r requirements-dev.txt && pytest -q"
```

Locally, point `DATABASE_URL` in `backend/.env` at `.../kochel_test` (a separate database on the same Postgres instance) before running `.venv/bin/pytest`.

## Web app development (without Docker)

```
cd web
npm install
npm run dev
```
Vite's dev server proxies `/api` to `http://localhost:8000` (see `vite.config.ts`) — run the backend separately (Docker or the venv instructions above) first. `npm run build` typechecks and produces the production bundle that the `web` Docker image serves via nginx (which also reverse-proxies `/api/` to the `app` service, matching the dev proxy).

## iOS app development

Requires Xcode and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) — the `.xcodeproj` is generated from `ios/project.yml`, not committed.

```
cd ios
xcodegen generate
open Köchel.xcodeproj
```

Build and run on a Simulator (⌘R). The app defaults to `http://localhost:8000`, which resolves to your Mac's Docker stack automatically when running in Simulator — no configuration needed. For a physical device, point it at your Mac's LAN IP (Settings screen inside the app; stored via `AppSettings`/UserDefaults).

`NSAllowsArbitraryLoads` is enabled in `Info.plist` since a self-hosted server on a home network typically has no TLS certificate — fine for this use case, but a production deployment behind an HTTPS reverse proxy wouldn't need it.

`ios/KochelUITests/` is a one-off visual-verification harness (not a CI suite) — it taps through the real navigation flow against a live backend and drops screenshots to `/tmp/ios_screenshots/` for inspection, since the Simulator has no built-in way to do this from the command line otherwise.

## Project layout

- `backend/app/models/` — the relational schema (composers, works, movements, recordings, performers, tracks)
- `backend/app/api/` — REST endpoints (`composers.py`, `works.py`, `browse.py`, `stream.py`, `import_.py`, `search.py`)
- `backend/app/ingest/` — filesystem scanner + tag extraction (mutagen)
- `backend/app/integrations/openopus.py` — Open Opus reference-data client
- `web/src/pages/` — the web player screens (Composer Browse/Detail, Work Detail, Compare Recordings, Search, Now Playing, Settings)
- `web/src/pages/Import/` — the correction UI (upload, scan, review, commit), matching the rest of the app's design system
- `web/src/playback/` — the audio-backed playback engine shared across the whole web app (`PlaybackContext`); session (work/recording/movement/elapsed) is persisted to `localStorage` and restored paused on reload
- `web/src/settings/SettingsContext.tsx` — accent color and Now Playing panel theme, persisted to `localStorage`
- `web/src/styles/tokens.css` — the web design system (fonts, ink/paper/accent colors, hairline/label utilities)
- `ios/Kochel/Views/` — the iOS screens (Library Home, Work Detail, Compare Recordings, Search, Downloads, Now Playing)
- `ios/Kochel/Playback/PlaybackController.swift` — the AVPlayer-backed playback engine with lock-screen/Control Center integration
- `ios/Kochel/Downloads/DownloadManager.swift` — offline downloads (URLSession + local file storage)
- `ios/Kochel/DesignSystem/` — the iOS design system (bundled Abril Fatface/EB Garamond fonts, colors, the Sunburst motif)

Full design rationale is in the plans this was built from.
