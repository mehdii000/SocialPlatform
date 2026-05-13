package handler

import (
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

type ProxyHandler struct {
	authProxy     *httputil.ReverseProxy
	usersProxy    *httputil.ReverseProxy
	postsProxy    *httputil.ReverseProxy
	messagesProxy *httputil.ReverseProxy
	minioProxy    *httputil.ReverseProxy
	frontendProxy *httputil.ReverseProxy
	logger        *slog.Logger
}

func NewProxyHandler(cfg ProxyConfig, logger *slog.Logger) *ProxyHandler {
	return &ProxyHandler{
		authProxy:     newSingleHostProxy(cfg.AuthURL),
		usersProxy:    newSingleHostProxy(cfg.UsersURL),
		postsProxy:    newSingleHostProxy(cfg.PostsURL),
		messagesProxy: newSingleHostProxy(cfg.MessagesURL),
		minioProxy:    newSingleHostProxy(cfg.MinioURL),
		frontendProxy: newSingleHostProxy(cfg.FrontendURL),
		logger:        logger,
	}
}

type ProxyConfig struct {
	AuthURL     string
	UsersURL    string
	PostsURL    string
	MessagesURL string
	MinioURL    string
	FrontendURL string
}

func newSingleHostProxy(targetURL string) *httputil.ReverseProxy {
	target, _ := url.Parse(targetURL)
	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.Host = target.Host
	}
	return proxy
}

func (h *ProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	switch {
	case strings.HasPrefix(path, "/api/auth/"):
		r.URL.Path = "/" + strings.TrimPrefix(path, "/api/auth/")
		h.authProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/api/users/"):
		r.URL.Path = "/" + strings.TrimPrefix(path, "/api/users/")
		h.usersProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/api/posts/"):
		r.URL.Path = "/" + strings.TrimPrefix(path, "/api/posts/")
		h.postsProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/api/messages/"):
		r.URL.Path = "/" + strings.TrimPrefix(path, "/api/messages/")
		h.messagesProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/socket.io/"):
		h.messagesProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/api/media/posts/"):
		r.URL.Path = "/post-images/" + strings.TrimPrefix(path, "/api/media/posts/")
		h.minioProxy.ServeHTTP(w, r)
		return

	case strings.HasPrefix(path, "/api/media/profiles/"):
		r.URL.Path = "/avatars/" + strings.TrimPrefix(path, "/api/media/profiles/")
		h.minioProxy.ServeHTTP(w, r)
		return

	case path == "/health":
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"gateway"}`))
		return

	default:
		h.frontendProxy.ServeHTTP(w, r)
		return
	}
}
