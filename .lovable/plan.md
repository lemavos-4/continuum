# Offline-First Continuum — Implementation Plan

Goal: ship a real offline-first experience in one delivery. App opens without internet, reads from IndexedDB, lets users create/edit/delete notes, entities, graph edges, activities and time-tracking sessions offline, and syncs automatically when connection returns using pure Last-Write-Wins on `updatedAt` (with soft-delete tombstones).

---

## 1. Frontend — Service Worker (installable + offline shell)

- Add `vite-plugin-pwa` with `generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions.enabled: false`.
- Single registration wrapper `src/lib/pwa-register.ts` that refuses to register in dev, in iframes, on `*.lovableproject.com`, `*.lovable.app` preview hosts, or when `?sw=off` is set; unregisters stale `/sw.js` in those contexts.
- Runtime caching:
  - HTML navigations → `NetworkFirst` (offline fallback to cached `index.html`).
  - Hashed JS/CSS/fonts → `CacheFirst`.
  - Wallpaper + already-fetched vault images (B2/signed URLs and `/api/account/wallpaper`) → `CacheFirst` with size cap.
  - `/api/**` requests → `NetworkFirst` with timeout; on failure, the request layer falls back to IndexedDB (handled in app code, not in the SW).
- Update `manifest.json` if needed (icons exist).

## 2. Frontend — IndexedDB layer (`src/lib/offline/`)

- `db.ts` — open IndexedDB `continuum-offline` v1 via a tiny wrapper (no external dep, ~150 lines). Stores:
  - `notes` (keyPath `id`, indexes: `updatedAt`, `folderId`, `deleted`)
  - `folders`
  - `entities` (indexes: `updatedAt`, `deleted`)
  - `edges` (graph entity↔entity links, keyPath `id`; index `updatedAt`)
  - `activities`
  - `time_sessions`
  - `wallpapers` (key: `current`, value: Blob + meta)
  - `sync_queue` (keyPath `id` autoinc; indexes: `status`, `createdAt`)
  - `metadata` (kv: `lastSyncAt`, `serverUserId`, etc.)
- All records carry `{ id, createdAt, updatedAt, version, deleted? }`. Tombstones stay in store with `deleted: true` and participate in LWW.

## 3. Frontend — Repository abstraction

- `src/lib/offline/repo.ts` exposes `notesRepo`, `entitiesRepo`, `edgesRepo`, `activitiesRepo`, `timeRepo`, `foldersRepo`, `wallpaperRepo`.
- Read path: always read IndexedDB first → return immediately → in background, if online, refresh from API and merge by LWW.
- Write path: mutate IndexedDB (bump `updatedAt = Date.now()`, increment `version`), enqueue `{ op, entity, id, payload, baseVersion, createdAt, retryCount, status }` into `sync_queue`. UI returns instantly.
- Delete = soft delete: set `deleted: true`, bump `updatedAt`, enqueue `DELETE`.
- Optimistic IDs: when offline-created, generate `local-<uuid>`; on sync, server returns real id and repo rewrites references (notes ↔ entities, edges).

## 4. Frontend — Sync Manager (`src/lib/offline/sync.ts`)

- Detects `navigator.onLine` + `online`/`offline` events + a heartbeat ping on `/api/auth/me`.
- On reconnect (and on app start when online): drain `sync_queue` in FIFO, max 4 concurrent per entity type.
  - Outbound: call existing `notesApi`/`entitiesApi`/etc. with operation payload.
  - On 409/last-write-loss: re-fetch server record and apply pure LWW by `updatedAt` (tie → server wins).
  - On 5xx/network: increment `retryCount`, exponential backoff (`min(60s, 2^n s)`), keep in queue.
- Inbound pull: after queue drain, call list endpoints (notes, entities, graph data, activities summary, time-tracking summary) and merge each row via LWW into IndexedDB.
- Per-entity LWW resolver in one shared helper.
- Tombstones older than 30 days + already acknowledged by server are garbage-collected.

## 5. Frontend — App wiring

- `src/lib/api.ts` axios interceptor: when offline (or request throws network error) and the route maps to a known repo read, return the cached repo data; for writes, the page never calls `*Api` directly anymore — it calls the repo, which enqueues.
- Refactor page data flows to repos:
  - `Notes.tsx`, `NoteEditor.tsx` → `notesRepo` (+ `foldersRepo`, `wallpaperRepo`).
  - `Entities.tsx`, `EntityDetail.tsx` → `entitiesRepo`.
  - `KnowledgeGraph.tsx` → `entitiesRepo` + `edgesRepo`.
  - `Activities.tsx` → `activitiesRepo`.
  - `TimeTrackingDetail.tsx` + timers in entity views → `timeRepo` (start/stop/pause/resume produce queued ops; active timer state lives in IndexedDB so timers keep ticking offline).
- Wallpaper: `note-wallpaper.ts` already uses preferences; extend to cache the binary in `wallpapers` store so it shows offline; upload/remove enqueue when offline.
- Insights/Dashboard/Search remain online-only (read-through cache from last response); they degrade gracefully with a "Needs connection" empty state when offline and no cache.

## 6. Frontend — UI affordances

- Top-bar status pill (English, discreet): `Online` / `Offline` / `Syncing…` / `Sync failed` with pending count.
- Profile/Settings: "Sync now" button → triggers `syncManager.flush()`, shows toast "X changes synced" or "Failed: retrying".
- Forms never block; toasts say "Saved locally — will sync when online" only on the first offline write per session.

## 7. Backend — minimal changes for LWW + tombstones

Java/Spring (existing). For each entity (`Note`, `Entity`, `EntityLink`/edge, `Activity`, `TimeSession`):

- Add fields `updatedAt` (already present on most), `version` (long), `deleted` (boolean, default false).
- `DELETE /api/<entity>/{id}` becomes a soft delete: set `deleted=true`, bump `updatedAt`.
- `PUT /api/<entity>/{id}` accepts an optional `clientUpdatedAt`; if `clientUpdatedAt < currentUpdatedAt` → return current server record with `200` (LWW: server wins). Otherwise apply update, return new record. No 409s, no merge UI.
- List endpoints accept `?since=<isoTimestamp>` and return only records with `updatedAt > since`, **including** tombstones. Existing callers without `since` keep current behavior.
- New `GET /api/sync/snapshot?since=...` aggregates notes/entities/edges/activities/time-sessions deltas in one call (perf for cold reconnect).

## 8. Tests / validation

- Unit: LWW resolver, queue ordering, tombstone GC, id-remap.
- Integration: Playwright via shell — load app, go offline (`page.context.set_offline(true)`), create + edit + delete a note, reload, verify presence; go online, verify server reflects state.
- Manual scenarios documented in `docs/offline.md`.

---

## Technical details

- New deps (frontend): `vite-plugin-pwa`, `workbox-window` (peer of plugin). No `idb` library — hand-rolled wrapper to keep bundle small.
- Backend deps: none.
- Auth: tokens stay in `sessionStorage`/`localStorage` as today. SW never touches auth headers (axios attaches them in JS).
- Wallpaper bin cached in IndexedDB Blob; served via `URL.createObjectURL` when offline.
- Estimated diff: ~25 new frontend files, ~12 edited pages, ~6 edited backend services/controllers, ~3 migrations of Mongo documents (additive — no destructive change).

---

## Out of scope (explicitly)

- Real-time multi-device sync (still poll/push on reconnect).
- CRDT or merge UI — pure LWW per requirements.
- Offline-capable Insights/Dashboard analytics (server-computed).
- Offline auth (login still requires network the first time; subsequent app opens work as long as the token is valid).

Confirm and I'll start implementing in this order: backend tombstone/since → IndexedDB + repos → sync manager → page refactors → SW + PWA register → UI status + Sync now → wallpaper cache → tests.
