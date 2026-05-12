# SocialPlatform Rewrite — Complete API & Schema Map

> Auto-generated during Step 0 exploration. This is the single source of truth for what must be preserved.
> Do not modify without updating the corresponding implementation.

---

## 1. External API Contract (frontend-facing — MUST PRESERVE)

Every route below is what the frontend actually calls. The nginx gateway strips `/api/<service>/` and rewrites to `/public/` internally.
The new Go gateway must expose these exact paths.

### 1a. Auth (`/api/auth/*`)

| Method | Path | Auth | Request | Response (200) | Error Responses |
|--------|------|------|---------|----------------|-----------------|
| POST | `/api/auth/signup` | None | `{"username":"...", "email":"...", "password":"..."}` | `{"message":"User created successfully"}` (201) | 400 `{"error":"..."}`, 429 `{"error":"ratelimit exceeded.","message":"..."}` |
| POST | `/api/auth/login` | None | `{"email":"...", "password":"..."}` | `{"jwt_token":"...", "refresh_token":"..."}` | 400, 401 `{"error":"Invalid credentials"}`, 429 |
| POST | `/api/auth/refresh` | Bearer refresh_token | `{}` (empty body) | `{"access_token":"..."}` | 401 |
| POST | `/api/auth/validate` | Bearer access_token | `{}` (empty body) | `{"username":"..."}` | 401 |

Rate limits:
- `/api/auth/signup`: 10 per hour per IP
- `/api/auth/login`: 10 per minute per IP
- Others: no limit

### 1b. Users (`/api/users/*`)

| Method | Path | Auth | Request | Response (200) | Errors |
|--------|------|------|---------|----------------|--------|
| GET | `/api/users/profiles/get` | Bearer | — | `UserProfile` | 404 `{"msg":"User not found"}` |
| PUT | `/api/users/profiles/update` | Bearer | `{"bio":"..."}` | `UserProfile` | 400, 404 |
| GET | `/api/users/profiles/getpublic?username=X` | None | — | `PublicProfile` | 400, 404 `{"msg":"User not found"}` |
| POST | `/api/users/changeprofilepic` | Bearer | `FormData{image: File}` | `{"message":"Profile picture updated", "profile_picture_url":"..."}` | 400, 500 |
| GET | `/api/users/getusers` | None | — | `{"users": [UserProfile, ...]}` | 500 |
| GET | `/api/users/search?q=X` | Bearer | — | `{"results": [UserProfile, ...]}` | 400, 500 |
| POST | `/internal/createuser` | None (internal) | `{"username":"...", "email":"..."}` | `{"message":"User created successfully"}` (201) | 400, 500 |

**UserProfile shape:**
```json
{
  "id": 123,
  "username": "mehdi",
  "email": "mehdi@example.com",
  "bio": "Placeholder bio...",
  "profile_picture_url": "uuid.jpg",
  "account_status": "new",
  "created_at": "2025-01-01T00:00:00+00:00"
}
```

**PublicProfile shape:**
```json
{
  "id": 123,
  "username": "mehdi",
  "bio": "...",
  "profile_picture_url": "uuid.jpg"
}
```

### 1c. Posts (`/api/posts/*`)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| POST | `/api/posts/createpost` | Bearer | `FormData{text: string, image?: File, video?: File}` | `{"message":"Post created", "post_id":123}` (201) | 400, 500 |
| GET | `/api/posts/getposts` | Bearer | — | `[Post, ...]` | 500 |
| GET | `/api/posts/getposts/:userId` | Bearer (optional) | — | `[Post, ...]` | 500 |
| GET | `/api/posts/get/:postId` | Bearer | — | `Post` | 404 `{"error":"Post not found"}` |
| POST | `/api/posts/like` | Bearer | `{"post_id":123}` | `{"message":"Post liked successfully"}` (201) or `{"message":"Post unliked successfully"}` (200) | 400, 500 |
| POST | `/api/posts/delete` | Bearer | `{"post_id":123}` | `{"message":"Post deleted successfully"}` | 400, 403 `{"error":"Post not found or you don't have permission to delete it"}`, 500 |

**Post shape:**
```json
{
  "id": 456,
  "user_id": 123,
  "username": "mehdi",
  "content": "hello world",
  "media_url": "uuid.jpg",
  "media_type": 1,
  "likes_count": 5,
  "comments_count": 2,
  "created_at": "2025-01-01T00:00:00+00:00",
  "is_liked": true
}
```
- `media_type`: 0 = text only, 1 = image, 2 = video
- `is_liked`: boolean relative to the requesting user

### 1d. Messages (`/api/messages/*`)

| Method | Path | Auth | Request | Response | Errors |
|--------|------|------|---------|----------|--------|
| GET | `/api/messages/getconvo?username=X` | JWT via socket auth | — | `[Conversation, ...]` | 400 `{"error":"Username required"}` |
| GET | `/api/messages/history?conv_id=X` | JWT via socket auth | — | `[Message, ...]` | — |

**Conversation shape:**
```json
{
  "id": 789,
  "from": "otheruser",
  "avatar": "uuid.jpg",
  "msg": "last message text",
  "timestamp": "2025-01-01T00:00:00+00:00"
}
```

**Message shape:**
```json
{
  "id": 999,
  "from": "mehdi",
  "content": "hey",
  "timestamp": "2025-01-01T00:00:00+00:00"
}
```

### 1e. WebSocket / Socket.IO (`/socket.io/*`)

| Event | Direction | Payload | Notes |
|-------|-----------|---------|-------|
| `connect` | Client→Server | Auth via `Authorization: Bearer <jwt>` header | Server calls `POST http://auth-service:5000/public/validate` to verify. Returns `False` to reject. |
| `disconnect` | Client→Server | — | Cleans up user SID maps |
| `private_message` | Client→Server | `{"to":"recipient_username", "message":"text"}` | Server resolves users, finds/creates 1-on-1 conversation, saves message, emits to recipient if online |
| `new_msg` | Server→Client | `{"from":"sender_username", "to":"recipient_username", "msg":"text", "timestamp":"ISO8601"}` | Sent to recipient's socket room |

Frontend uses `socket.io-client` v4.8. Connection: `io(HOST_URL, { extraHeaders: { Authorization: Bearer ${jwtToken} }, reconnection: true })`.

### 1f. Media Proxy (`/api/media/*`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/media/posts/:filename` | Proxied to MinIO `posts` bucket |
| GET | `/api/media/profiles/:filename` | Proxied to MinIO `profiles` bucket |

These go directly to MinIO (public-read buckets). The gateway acts as a reverse proxy.

### 1g. Health

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Returns 200 OK |

---

## 2. Database Schemas (complete)

### 2a. `auth_db`

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE signup (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL
);
```

Note: no `created_at` column on this table in the current schema. The init-db.sql only creates the databases — tables are created by each service's `db_init()`.

### 2b. `social_db`

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    bio TEXT DEFAULT 'Placeholder bio, probably change me later.',
    profile_picture_url TEXT,
    account_status VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flavors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Seeded with: (1, 'General', 'general', 'Default flavor for all sorts of posts.')

CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flavor_id INTEGER NOT NULL DEFAULT 1 REFERENCES flavors(id) ON DELETE SET DEFAULT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type SMALLINT NOT NULL DEFAULT 0 CHECK (media_type IN (0, 1, 2)),
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK ((media_type = 0 AND media_url IS NULL) OR (media_type IN (1, 2) AND media_url IS NOT NULL))
);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_flavor_id ON posts(flavor_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE is_deleted = FALSE;

CREATE TABLE likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, user_id)
);
CREATE INDEX idx_likes_post_id ON likes(post_id);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- updated_at trigger (used by both posts and comments)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE conversations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_participants (
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

## 3. Environment Variables (all referenced)

| Variable | Services | Purpose |
|----------|----------|---------|
| `JWT_SECRET_KEY` | auth, users, posts | Shared JWT signing secret |
| `DB_HOST` | all | PostgreSQL hostname |
| `DB_USER` | all | PostgreSQL user |
| `DB_PASSWORD` | all | PostgreSQL password |
| `DATABASE_URL` | all (docker-compose) | Full PG connection string (overrides individual vars in Docker) |
| `MINIO_ROOT_USER` | users, posts | MinIO access key |
| `MINIO_ROOT_PASSWORD` | users, posts | MinIO secret key |
| `VITE_HOST_URL` | frontend | API base URL (default: `http://localhost`) |
| `DEBUG` | all Python | Flask debug mode |
| `API_VERSION` | all | Version string (unused in code) |
| `HOST_URL` | docker-compose | Host URL passed to frontend build |

## 4. Inter-Service Calls

| Caller | Target | Method | Path | When |
|--------|--------|--------|------|------|
| auth-service | users-service | POST | `/internal/createuser` | During signup — creates mirrored user row in social_db. If this fails, signup is aborted. |
| auth-service | users-service | GET | `/public/health` | During auth health check |
| messages-service | auth-service | POST | `/public/validate` | On every WebSocket connect — validates the JWT token from the Authorization header |

## 5. Nginx Gateway Route Map (current)

```
/                     → frontend:8080
/api/auth/*           → auth-service:5000/public/*       (strip /api/auth, prepend /public)
/api/users/*          → users-service:5000/public/*      (strip /api/users, prepend /public)
/api/posts/*          → posts-service:5000/public/*      (strip /api/posts, prepend /public)
/api/messages/*       → messages-service:5000/public/*   (strip /api/messages, prepend /public)
/api/media/posts/*    → minio:9000/posts/*               (rewrite path)
/api/media/profiles/* → minio:9000/profiles/*            (rewrite path)
/socket.io/*          → messages-service:5000            (WebSocket upgrade, no buffering)
/health               → 200 OK (nginx-level)
```

## 6. Frontend Code Structure

### Pages & Routes
| Route | Component | Auth required |
|-------|-----------|---------------|
| `/` | `Index` (auth landing) | No (redirects to /main if authed) |
| `/main` | `Main` (feed) | Yes |
| `/explore` | `Explore` (media gallery) | Yes |
| `/messages` | `Messages` (chat) | Yes |
| `/profiles/:username` | `Profile` (public) | No |
| `/posts/:postId` | `PostView` (detail) | Yes |
| `*` | `NotFound` | No |

### Current stack (to be replaced)
- React 18 + TypeScript
- Vite 5 (dev on port 8080)
- Tailwind CSS + shadcn/ui (Radix primitives)
- `react-router-dom` v6
- `@tanstack/react-query` v5 (used only for QueryClientProvider, actual data fetching via useEffect + useState)
- `socket.io-client` v4.8
- `react-hook-form` + `zod` (forms)
- `date-fns`, `lucide-react`, `framer-motion`

### Auth flow (current)
1. Access token → `localStorage.jwt_token`, refresh token → `localStorage.refresh_token`
2. `authenticatedFetch()` wrapper: adds Bearer header, on 401 → refresh → retry
3. `isAuthenticated()` checks `!!localStorage.jwt_token`
4. Login: POST `/api/auth/login` → store tokens → validate token → navigate to /main
5. Signup: POST `/api/auth/signup` → shows success toast (NO auto-login)
6. Logout: clearTokens() → navigate to /

### Missing features (in frontend)
- No comment creation/display (placeholder in PostView)
- Flavors are hardcoded UI (no API integration)
- No infinite scroll (fetches all posts at once)
- No actual follow system (no follow/unfollow UI)
- No pagination anywhere

## 7. Key Design Decisions / Divergences from Spec

### Things that MUST change (spec overrides original)
1. **IDs**: spec says UUID, original uses BIGINT/SERIAL. → Use UUIDs per spec.
2. **Auth DB table name**: spec says `users`, original uses `signup`. → Use `users` per spec.
3. **Social DB profile table**: spec says `profiles`, original uses `users` (shared with other services). → Use `profiles` per spec.
4. **WebSocket**: spec says gorilla/websocket, original uses Socket.IO. → Use gorilla/websocket per spec.
5. **Frontend CSS**: spec says CSS Modules + hand-rolled design, original uses Tailwind + shadcn. → Use CSS Modules per spec.
6. **Token storage**: spec says httpOnly cookie for refresh, memory for access. Original uses localStorage for both. → Use httpOnly cookie per spec.
7. **JWT TTL**: spec says 15min access / 7d refresh. Original: 60min / 30d. → Use spec values (more secure).
8. **Frontend API base URL env**: spec says `VITE_API_BASE_URL`, original uses `VITE_HOST_URL`. → Align with spec.

### Things to PRESERVE (original overrides spec where they conflict)
1. **External API paths**: all `/api/*` paths the frontend calls MUST remain.
2. **Request/response shapes**: exact JSON shapes, field names, status codes.
3. **Rate limits**: 10/hr signup, 10/min login.
4. **Flavors feature**: exists in original (posts have flavor_id), not mentioned in spec. → Keep it but can simplify (just the General default).
5. **Inter-service call pattern**: auth-service creates user in social_db via users-service during signup. Must preserve this flow.

### Notes
- The `flavors` table is minimally used (only "General" is seeded, no UI exposes flavor selection). We can collapse this in the rewrite — keeping the `flavor_id` column with a default but not building a full flavors feature.
- Comments table exists in DB but the frontend has no comment creation UI. The rewrite should implement this properly.
- Follow system (follows table) doesn't exist in current DB but the spec requires it. We'll add it fresh.
- The current code has a `GenericPyService.Dockerfile` with hardcoded DB credentials in docker-compose (`user:mehdi`). This must be cleaned.
