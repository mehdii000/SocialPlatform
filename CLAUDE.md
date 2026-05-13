# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
# Start everything (requires Docker)
docker compose up --build

# Start a single service after changes
docker compose up --build <service>   # e.g. auth-service, gateway, frontend

# Go vet a service (local Go 1.22+ required)
cd <service> && go vet ./...

# Frontend type-check
cd frontend && npx tsc --noEmit

# Frontend dev server (standalone)
cd frontend && bun run dev
```

No tests exist yet. Each Go service runs migrations on startup — no separate migration tool required.

## Architecture

The gateway is the only container with published ports (`80:8000`). Everything else communicates on the internal `backend` Docker network.

```
Browser → :80 → gateway (Go/chi)
                  ├─ /api/auth/*       → auth-service:8001   (auth_db)
                  ├─ /api/users/*      → users-service:8002  (social_db + MinIO)
                  ├─ /api/posts/*      → posts-service:8003  (social_db + MinIO)
                  ├─ /api/messages/*   → messages-service:8004 (social_db)
                  ├─ /api/media/*      → minio:9000
                  └─ /*               → frontend:3000
```

**Two databases**: `auth_db` (user credentials, refresh tokens) and `social_db` (profiles, posts, likes, comments, follows, conversations, messages). Services using `social_db` share the same database but each owns its own tables.

**Auth flow**: Gateway validates JWTs in-memory (HS256, 30s LRU cache) and injects `X-User-ID` header to upstream services. Refresh tokens stored as httpOnly cookies. Access tokens live in frontend memory only.

**MinIO**: Two public-read buckets — `avatars` and `post-images`. Services stream uploads directly (no disk buffering). The gateway proxies `/api/media/<bucket>/<file>` → MinIO.

## Service Patterns (Go)

Every Go service follows the same internal structure:

```
<service>/
  cmd/server/main.go           # Entry point: config → DB pool → migrations → router → serve
  internal/
    config/config.go           # env loading, fails fast on missing vars
    model/models.go            # Domain structs + AppError + typed error sentinels
    repository/repos.go        # Raw SQL via pgx/v5, pgxpool
    repository/migrations.go   # CREATE TABLE IF NOT EXISTS, run on startup
    service/<svc>.go           # Business logic, pure functions where possible
    handler/<svc>_handler.go   # Parse request → call service → respond JSON
    middleware/middleware.go    # Request ID, logging, user ID extraction from X-User-ID
  go.mod
  Dockerfile                   # Multi-stage: golang:1.22-alpine → scratch
```

**Invariants**:
- All list endpoints return `{"data": [...], "next_cursor": "..." | null, "total": N}` (except message history which returns a flat array for backward compat)
- Errors use `AppError{Code, Message, HTTPStatus}` — never leak raw DB errors to responses
- Every request gets a UUID (middleware), logged via `log/slog` with method/path/status/latency
- DB queries are parameterized; no string concatenation in SQL
- Services trust `X-User-ID` from the gateway — they do not re-validate JWTs (except messages_service WebSocket, which validates the token from query param directly)

## Frontend

React 18 + TypeScript (strict) + Vite + CSS Modules. No Tailwind. State management via `@tanstack/react-query` v5 for server state and `zustand` for auth state.

```
src/
  api/          # axios-free: raw fetch wrapper with auto-refresh on 401
  hooks/        # useAuth (zustand), useWebSocket (native WS), useFeed (infinite query)
  pages/        # One component per route (Login, Feed, Profile, Post, Messages)
  components/
    ui/         # Button, Input, Avatar, Skeleton, Modal (CSS Modules)
    features/   # PostCard, PostComposer, CommentThread, ProfileHeader, MessageThread
    layout/     # Layout wrapper + Header
  styles/       # variables.css (custom properties), reset.css, global.css
```

**Auth**: On load, attempt silent refresh via httpOnly cookie → validate token → store user ID in zustand. On 401, auto-refresh and retry once. Access token never touches localStorage.

**WebSocket**: Native WebSocket at `/api/messages/ws?token=<jwt>`. Reconnects on close with 3s backoff. Incoming messages update React Query cache directly.

## API Contract

REWRITE_NOTES.md is the authoritative reference for every route, request/response shape, and database schema. Preserving the external `/api/*` paths is mandatory.

## Recent Improvements (2026-05-13)

### Frontend

- **Avatar**: Fixed broken-image fallback — now shows initials when image fails to load.
- **PostComposer**: Fixed `ObjectURL` memory leak — revoke blob URLs on selection change and unmount.
- **CSS**: Hoisted `@keyframes spin` to `global.css`, removed duplicates from component modules.
- **useInfiniteScroll**: Stabilized `IntersectionObserver` via `useCallback` + `useRef` — no longer recreated every render.
- **Performance**: All event handlers memoized with `useCallback`; `ConversationList` filter uses `useMemo`.
- **Accessibility**: `aria-label` on all icon-only buttons; `role="dialog"` + `aria-modal` on Modal.
- **Types**: Replaced `any` types in feed cache mutations with `PaginatedResponse<Post>`.
- **Dead code**: Removed `/settings` nav, dead `typingUsers` state, unused `isFollowLoading` (now threaded to Button).
- **Pagination**: ProfilePage uses intersection observer (consistent with FeedPage). MessageThread has "Load older messages" cursor-based pagination.
- **Modal**: Body scroll lock via CSS class toggle instead of direct DOM mutation.

### Messages Service

- **WSMessage `from` field**: Now sends sender username (not UUID) — messages display correct sender in chat UI. Added `Username` field to `Client` struct, populated on WebSocket connect via `GetUsernameByID`.
- **Duplicate messages**: Removed server echo to sender (was combined with optimistic frontend add, causing duplicates).
- **Dependencies**: Added `users-service` healthcheck dependency in docker-compose for messages-service (prevents race on `profiles` table creation).
- **go.sum**: Generated for both `messages_service` and `gateway_service` via `go mod tidy`.
- **Dead code**: Removed `/socket.io/` route from gateway proxy. Removed unused `logger` param in `handleTyping`.
- **Type check**: Both services pass `go vet`. Frontend passes `tsc --noEmit`.

### Build Notes

- Run `bun install` in `frontend/` before first `tsc --noEmit`.
- Run `go mod tidy` in Go service directories if `go.sum` is missing.
- Local tsc invocation (from project root): `/home/mehdi/Coding/SocialPlatform/frontend/node_modules/.bin/tsc -p /home/mehdi/Coding/SocialPlatform/frontend/tsconfig.json --noEmit`
