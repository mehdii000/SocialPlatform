package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/posts_service/internal/middleware"
	"github.com/mehdii000/SocialPlatform/posts_service/internal/model"
	"github.com/mehdii000/SocialPlatform/posts_service/internal/service"
)

type PostsHandler struct {
	svc      *service.PostsService
	logger   *slog.Logger
	validate *validator.Validate
}

func NewPostsHandler(svc *service.PostsService, logger *slog.Logger) *PostsHandler {
	return &PostsHandler{svc: svc, logger: logger, validate: validator.New()}
}

func (h *PostsHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if err := r.ParseMultipartForm(50 << 20); err != nil {
		h.respondError(w, model.NewAppError("Failed to parse form", 400))
		return
	}

	content := r.FormValue("text")
	imageFile, imageHeader, _ := r.FormFile("image")

	if content == "" && imageFile == nil {
		h.respondError(w, model.ErrEmptyPost)
		return
	}

	if imageFile != nil {
		defer imageFile.Close()
	}

	post, err := h.svc.CreatePost(r.Context(), userID, content, imageFile, imageHeader)
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.respondJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Post created",
		"post_id": post.ID,
	})
}

func (h *PostsHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	viewerID := middleware.GetUserID(r.Context())
	cursor := r.URL.Query().Get("cursor")

	result, err := h.svc.GetAllPosts(r.Context(), viewerID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *PostsHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	viewerID := middleware.GetUserID(r.Context())
	cursor := r.URL.Query().Get("cursor")

	result, err := h.svc.GetFeed(r.Context(), viewerID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *PostsHandler) GetPost(w http.ResponseWriter, r *http.Request) {
	viewerID := middleware.GetUserID(r.Context())

	postIDStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid post ID", 400))
		return
	}

	post, err := h.svc.GetPost(r.Context(), postID, viewerID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, post)
}

func (h *PostsHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		PostID string `json:"post_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	postID, err := uuid.Parse(req.PostID)
	if err != nil {
		h.respondError(w, model.ErrMissingPostID)
		return
	}

	if err := h.svc.DeletePost(r.Context(), postID, userID); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Post deleted successfully"})
}

func (h *PostsHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		PostID string `json:"post_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	postID, err := uuid.Parse(req.PostID)
	if err != nil {
		h.respondError(w, model.ErrMissingPostID)
		return
	}

	resp, err := h.svc.ToggleLike(r.Context(), userID, postID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	status := http.StatusOK
	if resp.Message == "Post liked successfully" {
		status = http.StatusCreated
	}
	h.respondJSON(w, status, resp)
}

func (h *PostsHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	postIDStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid post ID", 400))
		return
	}

	var req model.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	if err := h.validate.Struct(req); err != nil {
		h.respondError(w, model.NewAppError("Comment content is required (max 280 chars)", 400))
		return
	}

	comment, err := h.svc.CreateComment(r.Context(), postID, userID, req.Content)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusCreated, comment)
}

func (h *PostsHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	postIDStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(postIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid post ID", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.GetComments(r.Context(), postID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *PostsHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	commentIDStr := chi.URLParam(r, "commentId")
	commentID, err := uuid.Parse(commentIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid comment ID", 400))
		return
	}

	if err := h.svc.DeleteComment(r.Context(), commentID, userID); err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, map[string]string{"message": "Comment deleted"})
}

func (h *PostsHandler) GetPostsByUser(w http.ResponseWriter, r *http.Request) {
	viewerID := middleware.GetUserID(r.Context())

	userIDStr := chi.URLParam(r, "userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid user ID", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	result, err := h.svc.GetPostsByUser(r.Context(), userID, viewerID, cursor)
	if err != nil {
		h.handleError(w, err)
		return
	}
	h.respondJSON(w, http.StatusOK, result)
}

func (h *PostsHandler) Health(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "posts"})
}

func (h *PostsHandler) Ready(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "posts"})
}

func (h *PostsHandler) respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *PostsHandler) respondError(w http.ResponseWriter, appErr *model.AppError) {
	h.respondJSON(w, appErr.HTTPStatus, appErr)
}

func (h *PostsHandler) handleError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		h.respondError(w, appErr)
		return
	}
	h.logger.Error("unexpected error", "error", err)
	h.respondError(w, model.NewAppError("Internal server error", 500))
}

