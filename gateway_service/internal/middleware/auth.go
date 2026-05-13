package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenCache struct {
	mu       sync.RWMutex
	entries  map[string]tokenCacheEntry
	maxAge   time.Duration
}

type tokenCacheEntry struct {
	userID    string
	expiresAt time.Time
}

func NewTokenCache(maxAge time.Duration) *TokenCache {
	c := &TokenCache{
		entries: make(map[string]tokenCacheEntry),
		maxAge:  maxAge,
	}
	go c.cleanup()
	return c
}

func (c *TokenCache) Get(token string) (string, bool) {
	c.mu.RLock()
	entry, ok := c.entries[token]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return "", false
	}
	return entry.userID, true
}

func (c *TokenCache) Set(token, userID string) {
	c.mu.Lock()
	c.entries[token] = tokenCacheEntry{userID: userID, expiresAt: time.Now().Add(c.maxAge)}
	c.mu.Unlock()
}

func (c *TokenCache) cleanup() {
	for {
		time.Sleep(c.maxAge)
		c.mu.Lock()
		now := time.Now()
		for k, v := range c.entries {
			if now.After(v.expiresAt) {
				delete(c.entries, k)
			}
		}
		c.mu.Unlock()
	}
}

type JWTAuth struct {
	secret     []byte
	cache      *TokenCache
	logger     *slog.Logger
	skipPaths  map[string]bool
	skipPrefixes []string
}

func NewJWTAuth(secret string, logger *slog.Logger) *JWTAuth {
	return &JWTAuth{
		secret:  []byte(secret),
		cache:   NewTokenCache(30 * time.Second),
		logger:  logger,
		skipPaths: map[string]bool{
			"POST /api/auth/signup":              true,
			"POST /api/auth/login":               true,
			"POST /api/auth/refresh":             true,
			"GET /api/users/profiles/getpublic":  true,
			"GET /api/users/getusers":            true,
			"GET /api/users/search":              true,
			"GET /api/messages/ws":               true,
		},
		skipPrefixes: []string{
			"/api/media/",
			"/api/posts/getposts/",
			"/health",
			"/socket.io/",
		},
	}
}

func (a *JWTAuth) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if a.shouldSkip(r) {
			next.ServeHTTP(w, r)
			return
		}

		token := extractToken(r)
		if token == "" {
			http.Error(w, `{"error":"Missing authorization header"}`, http.StatusUnauthorized)
			return
		}

		userID, err := a.validateToken(token)
		if err != nil {
			http.Error(w, `{"error":"Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		r.Header.Set("X-User-ID", userID)
		next.ServeHTTP(w, r)
	})
}

func (a *JWTAuth) shouldSkip(r *http.Request) bool {
	if !strings.HasPrefix(r.URL.Path, "/api/") {
		return true
	}
	key := r.Method + " " + r.URL.Path
	if a.skipPaths[key] {
		return true
	}
	for _, prefix := range a.skipPrefixes {
		if strings.HasPrefix(r.URL.Path, prefix) {
			return true
		}
	}
	return false
}

func extractToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return ""
	}
	return strings.TrimPrefix(auth, "Bearer ")
}

func (a *JWTAuth) validateToken(tokenString string) (string, error) {
	if userID, ok := a.cache.Get(tokenString); ok {
		return userID, nil
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return a.secret, nil
	})
	if err != nil || !token.Valid {
		return "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", jwt.ErrSignatureInvalid
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return "", err
	}

	a.cache.Set(tokenString, sub)
	return sub, nil
}

func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
