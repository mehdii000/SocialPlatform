package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/resonance_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/model"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/service"
)

type ResonanceHandler struct {
	svc      *service.ResonanceService
	logger   *slog.Logger
	validate *validator.Validate
}

func NewResonanceHandler(svc *service.ResonanceService, logger *slog.Logger) *ResonanceHandler {
	return &ResonanceHandler{svc: svc, logger: logger, validate: validator.New()}
}

func (h *ResonanceHandler) Health(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "resonance"})
}

func (h *ResonanceHandler) Ready(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "resonance"})
}

func (h *ResonanceHandler) ListTopics(w http.ResponseWriter, r *http.Request) {
	topics, err := h.svc.ListTopics(r.Context())
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.TopicListResponse{Data: topics, Total: len(topics)})
}

func (h *ResonanceHandler) GetTopic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		h.respondError(w, model.ErrInvalidTopicID)
		return
	}
	viewerID := middleware.GetUserID(r.Context())
	topic, err := h.svc.GetTopic(r.Context(), slug, viewerID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, topic)
}

func (h *ResonanceHandler) GetTrendingTopics(w http.ResponseWriter, r *http.Request) {
	topics, err := h.svc.GetTrendingTopics(r.Context())
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.TrendingTopicResponse{Data: topics})
}

func (h *ResonanceHandler) FollowTopic(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}
	slug := chi.URLParam(r, "slug")
	if err := h.svc.FollowTopic(r.Context(), userID, slug); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Topic followed"})
}

func (h *ResonanceHandler) UnfollowTopic(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}
	slug := chi.URLParam(r, "slug")
	if err := h.svc.UnfollowTopic(r.Context(), userID, slug); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Topic unfollowed"})
}

func (h *ResonanceHandler) GetForYouFeed(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}
	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.GetFeedByInterests(r.Context(), userID, cursor, 10)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *ResonanceHandler) GetTopicPosts(w http.ResponseWriter, r *http.Request) {
	viewerID := middleware.GetUserID(r.Context())
	slug := chi.URLParam(r, "slug")
	cursor := r.URL.Query().Get("cursor")
	sort := r.URL.Query().Get("sort")
	if sort != "top" {
		sort = "recent"
	}

	result, err := h.svc.GetTopicPosts(r.Context(), slug, viewerID, cursor, sort, 10)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *ResonanceHandler) GetInterests(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}
	interests, err := h.svc.GetInterests(r.Context(), userID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.InterestResponse{Data: interests})
}

func (h *ResonanceHandler) UpdateInterests(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}

	var req model.UpdateInterestsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.ErrInvalidRequest)
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, model.NewAppError("Invalid request: each topic must have slug and weight", 400))
		return
	}

	interests, err := h.svc.UpdateInterests(r.Context(), userID, req.Topics)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.InterestResponse{Data: interests})
}

func (h *ResonanceHandler) ExtractTopics(w http.ResponseWriter, r *http.Request) {
	var req model.ExtractRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.ErrInvalidRequest)
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, model.NewAppError("Invalid request: post_id and content are required", 400))
		return
	}

	postID, err := uuid.Parse(req.PostID)
	if err != nil {
		h.respondError(w, model.ErrInvalidPostID)
		return
	}

	tags, err := h.svc.ExtractTopics(r.Context(), postID, req.Content)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.ExtractResponse{Topics: tags})
}

func (h *ResonanceHandler) GetPostTopics(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "postID")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		h.respondError(w, model.ErrInvalidPostID)
		return
	}
	tags, err := h.svc.GetPostTopics(r.Context(), postID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, model.ExtractResponse{Topics: tags})
}

func (h *ResonanceHandler) Engage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		h.respondError(w, model.ErrMissingAuth)
		return
	}

	var req model.EngageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.ErrInvalidRequest)
		return
	}
	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, model.ErrInvalidAction)
		return
	}

	postID, err := uuid.Parse(req.PostID)
	if err != nil {
		h.respondError(w, model.ErrInvalidPostID)
		return
	}

	if err := h.svc.Engage(r.Context(), userID, postID, req.Action); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Engagement recorded"})
}

func (h *ResonanceHandler) GetGraph(w http.ResponseWriter, r *http.Request) {
	graph, err := h.svc.GetGraph(r.Context())
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, graph)
}

func (h *ResonanceHandler) respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *ResonanceHandler) respondError(w http.ResponseWriter, appErr *model.AppError) {
	h.respondJSON(w, appErr.HTTPStatus, appErr)
}

func (h *ResonanceHandler) handleError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		h.respondError(w, appErr)
		return
	}
	h.logger.Error("unexpected error", "error", err)
	h.respondError(w, model.NewAppError("Internal server error", 500))
}
