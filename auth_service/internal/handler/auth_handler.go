package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"

	"github.com/mehdii000/SocialPlatform/auth_service/internal/model"
	"github.com/mehdii000/SocialPlatform/auth_service/internal/service"
)

type AuthHandler struct {
	svc      *service.AuthService
	logger   *slog.Logger
	validate *validator.Validate
}

func NewAuthHandler(svc *service.AuthService, logger *slog.Logger) *AuthHandler {
	return &AuthHandler{svc: svc, logger: logger, validate: validator.New()}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.respondValidationErrors(w, err)
		return
	}

	_, err := h.svc.Register(r.Context(), req)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	h.respondJSON(w, http.StatusCreated, map[string]string{"message": "User created successfully"})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.respondValidationErrors(w, err)
		return
	}

	resp, err := h.svc.Login(r.Context(), req)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	h.setRefreshCookie(w, resp.RefreshToken)
	resp.RefreshToken = ""

	h.respondJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	refreshToken := h.getRefreshFromCookie(r)
	if refreshToken == "" {
		h.respondError(w, model.ErrInvalidToken)
		return
	}

	resp, err := h.svc.Refresh(r.Context(), refreshToken)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	h.setRefreshCookie(w, resp.RefreshToken)

	h.respondJSON(w, http.StatusOK, model.RefreshResponse{AccessToken: resp.AccessToken})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	refreshToken := h.getRefreshFromCookie(r)
	if refreshToken != "" {
		_ = h.svc.Logout(r.Context(), refreshToken)
	}

	h.clearRefreshCookie(w)
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Logged out"})
}

func (h *AuthHandler) Validate(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		h.respondError(w, model.NewAppError("Missing authorization header", 401))
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		h.respondError(w, model.NewAppError("Invalid authorization header", 401))
		return
	}

	userID, err := h.svc.ValidateToken(tokenString)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	username, err := h.svc.GetUsername(r.Context(), userID)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	h.respondJSON(w, http.StatusOK, model.ValidateResponse{UserID: userID.String(), Username: username})
}

func (h *AuthHandler) Health(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "auth"})
}

func (h *AuthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "auth"})
}

func (h *AuthHandler) respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		h.logger.Error("failed to encode response", "error", err)
	}
}

func (h *AuthHandler) respondError(w http.ResponseWriter, appErr *model.AppError) {
	h.logger.Error("request error",
		"code", appErr.Code,
		"message", appErr.Message,
		"status", appErr.HTTPStatus,
	)
	h.respondJSON(w, appErr.HTTPStatus, appErr)
}

func (h *AuthHandler) respondValidationErrors(w http.ResponseWriter, err error) {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		h.respondError(w, model.NewAppError("Validation failed", 400))
		return
	}

	msgs := make([]string, 0, len(validationErrors))
	for _, e := range validationErrors {
		msgs = append(msgs, e.Field()+" "+e.Tag())
	}

	h.respondJSON(w, http.StatusBadRequest, map[string]interface{}{
		"error":   "Validation failed",
		"details": msgs,
	})
}

func (h *AuthHandler) handleServiceError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		h.respondError(w, appErr)
		return
	}
	h.logger.Error("unexpected error", "error", err)
	h.respondError(w, model.NewAppError("Internal server error", 500))
}

func (h *AuthHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
	})
}

func (h *AuthHandler) getRefreshFromCookie(r *http.Request) string {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (h *AuthHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		MaxAge:   -1,
	})
}
