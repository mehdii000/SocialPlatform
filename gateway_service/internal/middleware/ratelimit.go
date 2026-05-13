package middleware

import (
	"net/http"
	"strings"
	"sync"

	"golang.org/x/time/rate"
)

type rateConfig struct {
	limit rate.Limit
	burst int
}

type IPRateLimiter struct {
	mu       sync.Mutex
	limiters map[string]map[string]*rate.Limiter
	configs  map[string]rateConfig
}

func NewIPRateLimiter() *IPRateLimiter {
	return &IPRateLimiter{
		limiters: make(map[string]map[string]*rate.Limiter),
		configs: map[string]rateConfig{
			"POST /api/auth/signup": {limit: rate.Limit(10.0 / 3600.0), burst: 10},
			"POST /api/auth/login":  {limit: rate.Limit(10.0 / 60.0), burst: 10},
		},
	}
}

func (l *IPRateLimiter) getLimiter(ip, key string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.limiters[ip] == nil {
		l.limiters[ip] = make(map[string]*rate.Limiter)
	}

	lim, exists := l.limiters[ip][key]
	if !exists {
		cfg, ok := l.configs[key]
		if !ok {
			cfg = rateConfig{limit: rate.Limit(100), burst: 200}
		}
		lim = rate.NewLimiter(cfg.limit, cfg.burst)
		l.limiters[ip][key] = lim
	}
	return lim
}

func RateLimit(limiter *IPRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Method + " " + r.URL.Path

			matchedKey := key
			if _, ok := limiter.configs[key]; !ok {
				for configKey := range limiter.configs {
					if strings.HasPrefix(key, configKey) {
						matchedKey = configKey
						break
					}
				}
			}

			ip := r.RemoteAddr
			l := limiter.getLimiter(ip, matchedKey)
			if !l.Allow() {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"error":"ratelimit exceeded.","message":"Try again later"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
