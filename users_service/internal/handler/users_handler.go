package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/users_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/users_service/internal/model"
	"github.com/mehdii000/SocialPlatform/users_service/internal/service"
)

type UsersHandler struct {
	svc      *service.UsersService
	logger   *slog.Logger
	validate *validator.Validate
}

func NewUsersHandler(svc *service.UsersService, logger *slog.Logger) *UsersHandler {
	return &UsersHandler{svc: svc, logger: logger, validate: validator.New()}
}

func (h *UsersHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	p, err := h.svc.GetProfile(r.Context(), userID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, p)
}

func (h *UsersHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req model.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	p, err := h.svc.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, p)
}

func (h *UsersHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		h.respondError(w, model.NewAppError("Missing username parameter", 400))
		return
	}

	p, err := h.svc.GetPublicProfile(r.Context(), username)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, p)
}

func (h *UsersHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		h.respondError(w, model.NewAppError("Failed to parse form", 400))
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		h.respondError(w, model.NewAppError("Image file is required", 400))
		return
	}
	defer file.Close()

	p, err := h.svc.UploadAvatar(r.Context(), userID, file, header)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, p)
}

func (h *UsersHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	profiles, err := h.svc.ListAll(r.Context())
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]interface{}{"users": profiles})
}

func (h *UsersHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		h.respondError(w, model.NewAppError("Missing search query parameter 'q'", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.Search(r.Context(), query, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID   string `json:"user_id"`
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	if err := h.svc.CreateUser(r.Context(), userID, req.Username); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusCreated, map[string]string{"message": "User created successfully"})
}

func (h *UsersHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserID(r.Context())

	followeeIDStr := chi.URLParam(r, "id")
	followeeID, err := uuid.Parse(followeeIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	if err := h.svc.Follow(r.Context(), followerID, followeeID); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Followed"})
}

func (h *UsersHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	followerID := middleware.GetUserID(r.Context())

	followeeIDStr := chi.URLParam(r, "id")
	followeeID, err := uuid.Parse(followeeIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	if err := h.svc.Unfollow(r.Context(), followerID, followeeID); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Unfollowed"})
}

func (h *UsersHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.GetFollowers(r.Context(), userID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	userIDStr := chi.URLParam(r, "id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.GetFollowing(r.Context(), userID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *UsersHandler) Health(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "users"})
}

func (h *UsersHandler) Ready(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "users"})
}

func (h *UsersHandler) respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *UsersHandler) respondError(w http.ResponseWriter, appErr *model.AppError) {
	h.respondJSON(w, appErr.HTTPStatus, appErr)
}

func (h *UsersHandler) handleError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		h.respondError(w, appErr)
		return
	}
	h.logger.Error("unexpected error", "error", err)
	h.respondError(w, model.NewAppError("Internal server error", 500))
}
