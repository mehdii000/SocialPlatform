# CLAUDE.md

Guidance for Claude Code when working in this repo. Keep this file current when making structural changes.

## Build & Run

```bash
docker compose up --build                          # Start everything
docker compose up --build <service>                # Single service rebuild
cd <service> && go vet ./...                       # Go vet (requires Go 1.22+)
cd frontend && bun install && bun run tsc --noEmit # Frontend type-check
cd frontend && bun run dev                         # Frontend dev server (standalone)

# Seed database with placeholder data (50 users, 300 posts, etc.)
docker compose up db -d                            # Start DB first (port 5432 exposed)
cd resonance_service
AUTH_DB_URL="postgres://user:password@localhost:5432/auth_db?sslmode=disable" \
RESONANCE_DB_URL="postgres://user:password@localhost:5432/social_db?sslmode=disable" \
go run ./cmd/seed                                  # Idempotent — skips if >10 profiles exist
```

No tests exist. Go services run migrations on startup (`repository/migrations.go`).

## Architecture

```
Browser :80 → gateway (Go/chi)
  ├─ /api/auth/*       → auth-service:8001    auth_db
  ├─ /api/users/*      → users-service:8002   social_db + MinIO
  ├─ /api/posts/*      → posts-service:8003   social_db + MinIO
  ├─ /api/messages/*   → messages-service:8004 social_db
  ├─ /api/resonance/*  → resonance-service:8005 social_db (topics, interests, smart feed)
  ├─ /api/media/*      → minio:9000 (proxy)
  └─ /*                → frontend:80 (SPA)
```

- **auth_db**: `users` table (credentials, refresh tokens)
- **social_db**: `profiles`, `posts`, `likes`, `comments`, `follows`, `conversations`, `messages`, `topics`, `post_topics`, `user_interests`
- **Auth**: Gateway validates JWT (HS256, 30s LRU cache), injects `X-User-ID`. Refresh token = httpOnly cookie. Access token = frontend memory only (never localStorage).
- **MinIO**: buckets `avatars`, `post-images` (public-read). Services stream uploads directly.

## Go Service Patterns

Every service follows identical structure:
```
<service>/
  cmd/server/main.go           # config → DB → migrations → router → serve
  internal/
    config/config.go           # env loading, fails fast on missing
    model/models.go            # Domain structs, AppError, error sentinels
    repository/repos.go        # Raw SQL via pgx/v5 + pgxpool
    repository/migrations.go   # CREATE TABLE IF NOT EXISTS
    service/<svc>.go           # Business logic
    handler/<svc>_handler.go   # HTTP handlers
    middleware/middleware.go    # Request ID, logging
  go.mod / go.sum
  Dockerfile                   # Multi-stage: golang:1.22-alpine → scratch
```

Invariants:
- List endpoints return `{"data":[], "next_cursor":"..."|null, "total":N}` (except message history: flat array)
- Errors: `AppError{Code, Message, HTTPStatus}` — never leak raw DB errors
- Every request gets UUID via middleware, logged with method/path/status/latency
- DB queries parameterized, no string concatenation
- Services trust `X-User-ID` from gateway (except messages WS which validates JWT from query param)

### Messages Service Specifics

- `Client` struct: `UserID`, `Username` (populated on connect via `GetUsernameByID`), `Conn`, `Send`, `Hub`
- WebSocket protocol: JSON `{"type":"message"|"typing", ...}`. Client→Server: `{"type":"message","conversation_id":"<uuid>","content":"text"}`. Server→Client: includes `from` (username), `id`, `content`, `created_at`.
- Hub: 1 connection per user (new connection closes old). Messages routed by user ID.
- Conversations: 1-on-1 only with `participant_a`/`participant_b` columns, unique on `(LEAST(a,b), GREATEST(a,b))`.
- Cursor pagination on messages: pass message UUID as cursor, fetches DESC then reverses to ASC. Limit 50.
- `GetUsernameByID` added to repo (queries `profiles` table). Called once on WebSocket connect.
- Messages service depends on users-service (via docker-compose) — needs `profiles` table to exist.

### Gateway Specifics

- `proxy.go`: path prefix matching → strip prefix → reverse proxy to backend. `/socket.io/*` route removed (dead code).
- JWT middleware: skips `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`, `/api/users/profiles/getpublic`, `/api/users/getusers`, `/api/users/search`, `/api/messages/ws`, `/api/resonance/topics` (exact GET), `/api/resonance/topics` (prefix), `/api/media/*`, `/health`, `/socket.io/*`.
- Rate limiter: `POST /api/auth/signup` 10/hr, `POST /api/auth/login` 10/min. Map iteration non-deterministic but only 2 keys so safe.

### Resonance Service Specifics (Interest-Based Discovery Engine)

- **Purpose**: Auto-topic extraction from post content (TF-IDF), user interest profiling via engagement, ranked "For You" feed, topic exploration, and interest graph visualization.
- **Tables added to social_db**: `topics` (32 seeded), `post_topics` (many-to-many post→topic), `user_interests` (user→topic weights with decay).
- **pg_trgm extension**: Enables trigram similarity for keyword→topic matching.
- **TF-IDF extraction**: tokenize → remove 150 stop words → suffix stemming → frequency ranking → pg_trgm similarity match against `topics` table. Called via `POST /extract` or auto-triggered after post creation.
- **Interest weights**: Like +0.10, Comment +0.15, Create +0.20. Daily decay ×0.97 applied on read if `last_engaged_at > 24h ago`. Managed via `POST /interests/engage`.
- **"For You" feed**: `score = recency*0.3 + interest_relevance*0.5 + engagement*0.2`. Every 4th slot is a "serendipity" post from a non-interest topic. Cursor paginated.
- **Topic graph**: `GET /graph` returns nodes (topics scaled by post_count) + edges (co-occurrence on same posts). Frontend renders Canvas force-directed graph.
- **Seed data**: `cmd/seed/main.go` — connects to both `auth_db` and `social_db`. Generates 50 users, 300 posts (topic-templated content), 200 follows, 1500 likes, 400 comments, 900 post-topic assignments, 500 interest records. Idempotent.

## Frontend

React 18 + TypeScript (strict) + Vite + CSS Modules. No Tailwind.

### Stack
- `@tanstack/react-query` v5 — server state (infinite queries for feed/comments)
- `zustand` — auth state (`useAuthStore`)
- `react-router-dom` v6 — routing
- `lucide-react` — icons
- `date-fns` — date formatting
- Native WebSocket — messages real-time

### File Map

```
src/
  main.tsx                    # Entry, StrictMode
  App.tsx                     # Router + QueryClientProvider
  types/index.ts              # All TS interfaces (UserProfile, Post, Message, WSMessage, etc.)
  utils/format.ts             # relativeTime, formatDate, formatCount
  utils/logger.ts             # Conditional console.log wrapper

  styles/
    variables.css             # Design tokens (see Design System below)
    reset.css                 # CSS reset
    global.css                # Body styles, scrollbar, keyframes (spin, fadeInUp, scaleIn)

  api/
    client.ts                 # Fetch wrapper: Bearer token, auto-refresh on 401, retry once
    auth.ts                   # login, register, logout, validateToken, silentRefresh
    posts.ts                  # feed, single post, create (multipart), like, delete, comments CRUD, user posts
    messages.ts               # conversations, history (cursor), createConversation
    users.ts                  # profile CRUD, avatar upload, search, follow/unfollow, followers/following

  hooks/
    useAuth.ts                # Zustand store: userId, isAuthenticated, isLoading, initialize(), clearAuth()
    useFeed.ts                # useInfiniteQuery for feed + useInfiniteScroll (IntersectionObserver via useCallback+useRef)
    useWebSocket.ts           # Native WS connect with JWT, auto-reconnect 3s, exposes sendMessage()

  components/
    ui/
      Button.tsx              # variant (primary/secondary/ghost/danger), size (sm/md/lg), loading
      Input.tsx               # forwardRef, label, error display, auto id from label
      Avatar.tsx              # img with initials fallback (useState toggle on error)
      Skeleton.tsx            # Generic skeleton + PostSkeleton composed variant
      Modal.tsx               # Portal-less, Escape key, body scroll lock via CSS class, role=dialog

    features/
      auth/LoginForm.tsx      # Email + password + error display
      auth/RegisterForm.tsx   # Username + email + password + success message
      posts/PostCard.tsx      # Feed card: optimistic like toggle, delete dropdown (own posts), nav to detail
      posts/PostComposer.tsx  # Text + image upload, ObjectURL revoke on cleanup, 500 char limit
      posts/CommentThread.tsx # Infinite query comments, inline compose, optimistic submit, delete own
      users/ProfileHeader.tsx # Avatar, display name, bio, stats, follow/unfollow (with loading), edit/message
      messages/MessageThread.tsx     # Message bubbles, date separators, scroll-to-bottom, Enter to send, load older
      messages/ConversationList.tsx  # Search filter, active highlight, avatar + last message preview

    layout/
      Layout.tsx              # Auth guard wrapper + Outlet
      Header.tsx              # Fixed nav: logo, home/search/messages icons, user dropdown, search bar

  pages/
    LoginPage.tsx             # Tab switch login/register, redirect if authed
    FeedPage.tsx              # PostComposer + infinite scroll PostCard list + empty/error/skeleton states
    ProfilePage.tsx           # ProfileHeader + tabbed posts (infinite scroll), follow/unfollow, new chat nav
    PostPage.tsx              # Single post detail + CommentThread
    MessagesPage.tsx          # Two-panel: ConversationList + MessageThread, WS real-time, new chat from profile
```

### Design System (variables.css)

**Playful Modern** — light mode, rounded, soft shadows.

- **bg**: `#faf9f6` (warm white), **surface**: `#ffffff`, **text**: `#1d1a18`
- **accent**: `#ff6b6b` (coral), **accent-secondary**: `#5b7fff` (periwinkle), **danger**: `#e5534b`
- **border**: `#e8e4de` 1px, **border-strong**: `#d4cfc8`
- **radius**: `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-xl: 20px`, `--radius-full: 99px`
- **shadows**: `--shadow-sm/md/lg/xl` (soft, layered, no hard edges)
- **fonts**: Fredoka (display, `--font-display`), Inter (body, `--font-body`), JetBrains Mono (mono, `--font-mono`)
- **transition-spring**: `250ms cubic-bezier(0.34, 1.56, 0.64, 1)` — used for modal open, dropdowns
- **keyframes**: `spin` (global.css), `fadeInUp`, `scaleIn` — used for card entrance, modal/dropdown open

### Key Patterns

- **Auth**: `useAuthStore.initialize()` on app load → silent refresh via httpOnly cookie → validate → store userId in zustand. `client.ts` stores accessToken as module-level mutable variable (not React state, not localStorage). On 401, `refreshAccessToken()` retries once.
- **Optimistic updates**: PostCard like toggle (rollback on error), MessagesPage send (server echo removed, only optimistic add), ProfilePage follow/unfollow.
- **Infinite scroll**: `useInfiniteScroll` returns useCallback-wrapped ref callback with useRef-held observer. Stable across renders.
- **Cache mutations**: `handlePostDeleted` removes post from feed cache via `queryClient.setQueryData` with typed `PaginatedResponse<Post>`.
- **Error handling**: Every API call wrapped in try/catch. UI shows error states with retry buttons.
- **A11y**: aria-label on all icon-only buttons, role=dialog + aria-modal on Modal.
- **WebSocket**: `useWebSocket` hook manages lifecycle. MessagesPage handles new messages by appending to state + refetching conversations. `from` field now carries username (fixed from UUID).

### Known Limitations
- No tests
- Settings page doesn't exist (edit profile nav goes to own profile page)
- No typing indicator wired (backend handler exists, frontend never sends)
- Flavors table exists in DB but UI never exposes it
- Follow system: followers/following list modal exists, but no dedicated standalone page
- Profile tabs only show Posts tab (followers/following tabs not implemented)
- Message pagination: "Load older" button at top of thread
- Resonance "For You" feed shows all topic-matched posts (not limited to followed users)
- `extractTopics` on post creation is fire-and-forget — no retry if resonance service is down
- Topic graph edges only computed from 500 most recent posts (performance cap)

## Recent Changes (2026-05-13)

### Bug Fixes
- Avatar broken-image → invisible: `useState` toggle on img error → shows initials fallback
- PostComposer ObjectURL leak: `revokeObjectURL` on new image, remove, and unmount cleanup
- Spin keyframes: hoisted to `global.css`, removed from 3 module files
- useInfiniteScroll observer churn: `useCallback` + `useRef` stabilizes across renders
- Messages WS from field: was UUID, now username (added `Username` to Client, `GetUsernameByID` to repo, `From` to WSMessage)
- Messages duplicates: removed server echo to sender (was combined with optimistic add)
- Profiles table race: added `users-service` healthcheck dep to messages-service in docker-compose
- go.sum: generated for both messages_service and gateway_service

### Perf / Quality
- All event handlers memoized with `useCallback` (PostCard, CommentThread, MessageThread, Header, ProfilePage, MessagesPage)
- ConversationList filter uses `useMemo`
- `any` types replaced with `PaginatedResponse<Post>` in FeedPage cache
- `/socket.io/` dead route removed from gateway proxy
- `/settings` dead nav → own profile, dead `typingUsers` removed, `isFollowLoading` threaded to Button
- Modal body scroll lock: CSS class toggle instead of direct DOM style mutation
- ProfilePage pagination: intersection observer (consistent with FeedPage)

### Resonance Feature (2026-05-13)

Interest-based content discovery engine. New microservice + new frontend pages. See "Resonance Service Specifics" above for backend details.

**New frontend files:**
- `api/resonance.ts` — 11 API functions (topics, feed/for-you, interests, extract, engage, graph)
- `hooks/useForYouFeed.ts` — infinite query for ranked "For You" feed
- `pages/ExplorePage.tsx` + `.module.css` — trending topics, recommendations, all-topics tag cloud, interest graph
- `pages/TopicPage.tsx` + `.module.css` — topic detail, follow/unfollow, Recent/Top sort tabs, infinite posts
- `components/ui/TopicTag.tsx` + `.module.css` — clickable topic pill chip
- `components/features/topics/TrendingTopics.tsx` + `.module.css` — ranked trending topic list
- `components/features/topics/TopicGraph.tsx` + `.module.css` — Canvas force-directed topic graph
- `components/features/users/FollowList.tsx` + `.module.css` — followers/following list modal

**Modified frontend files:**
- `App.tsx` — added `/explore` and `/topics/:slug` routes
- `types/index.ts` — added Topic, TopicTag, UserInterest, TrendingTopic, GraphNode, GraphEdge, GraphData, FollowInfo
- `FeedPage.tsx` — Following/For You tab switcher, two query modes
- `PostCard.tsx` — topic tags row, engage('like') fire-and-forget after like
- `PostComposer.tsx` — auto-extract topics + engage('create') after post creation
- `CommentThread.tsx` — engage('comment') after comment creation
- `Header.tsx` — Explore nav link (compass icon)
- `ProfilePage.tsx` — uses `profile.is_following` + `followers_count`/`following_count` from API (no O(n) scan), cache invalidation on follow/unfollow, click handlers for followers/following modal

**Backend user following improvements:**
- `PublicProfile` now includes `is_following`, `followers_count`, `following_count` — computed server-side via viewerID param
- `GetPublicProfile` handler reads `X-User-ID` for authenticated viewer context

**Gateway JWT changes:**
- Added `GET /api/resonance/topics` to `skipPaths` (exact) and `/api/resonance/topics` to `skipPrefixes` (covers `/topics/:slug` public view)
- Auth-protected resonance endpoints check `X-User-ID` in handler, return 401 if nil

### Full Redesign — "Playful Modern"
- Light mode: warm white bg, white cards, soft shadows, rounded corners
- Fredoka (display) + Inter (body) + JetBrains Mono (mono)
- Coral accent `#ff6b6b`, pill buttons, spring animations
- Every CSS file rewritten (design tokens, UI components, feature components, layout, all 5 pages)

## API Contract

REWRITE_NOTES.md is the authoritative reference. Preserve all `/api/*` paths. Key endpoints:

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/signup` | None | Rate limited 10/hr |
| POST | `/api/auth/login` | None | Rate limited 10/min, returns jwt_token + refresh_token cookie |
| POST | `/api/auth/refresh` | httpOnly cookie | Returns new access_token |
| POST | `/api/auth/validate` | Bearer | Returns username |
| GET | `/api/users/profiles/get` | Bearer | Own profile |
| PUT | `/api/users/profiles/update` | Bearer | Update bio etc |
| GET | `/api/users/profiles/getpublic?username=X` | None | Public profile |
| GET | `/api/posts/getposts` | Bearer | Feed (paginated) |
| POST | `/api/posts/createpost` | Bearer | FormData: text + optional image |
| POST | `/api/posts/like` | Bearer | Toggle like |
| GET | `/api/messages/getconvo` | Bearer | List conversations |
| GET | `/api/messages/history?conv_id=X&cursor=Y` | Bearer | Messages with cursor pagination |
| WS | `/api/messages/ws?token=<jwt>` | Query param | Native WebSocket upgrade |
| GET | `/api/resonance/topics` | None | List all topics |
| GET | `/api/resonance/topics/trending` | Bearer | Trending topics ranked by post + engagement velocity |
| GET | `/api/resonance/topics/:slug` | None | Topic detail with post_count |
| GET | `/api/resonance/topics/:slug/posts?cursor=X&sort=recent\|top` | Bearer | Posts in topic (paginated, sortable) |
| POST | `/api/resonance/topics/:slug/follow` | Bearer | Follow a topic (adds interest weight 0.5) |
| DELETE | `/api/resonance/topics/:slug/follow` | Bearer | Unfollow a topic |
| GET | `/api/resonance/feed/for-you?cursor=X` | Bearer | Ranked "For You" feed with serendipity interleave |
| GET | `/api/resonance/interests` | Bearer | User's interest profile (topics + weights) |
| PUT | `/api/resonance/interests` | Bearer | Manually set interest weights |
| POST | `/api/resonance/interests/engage` | Bearer | Record engagement (like/comment/create) for interest update |
| POST | `/api/resonance/extract` | Bearer | TF-IDF extract topics from post content |
| GET | `/api/resonance/posts/:postID/topics` | Bearer | Get topic tags for a post |
| GET | `/api/resonance/graph` | Bearer | Topic graph data (nodes + edges for Canvas viz) |
| GET | `/health` | None | Health check |
