package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/messages_service/internal/model"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/repository"
)

type MessagesHandler struct {
	repo   *repository.MessageRepo
	logger *slog.Logger
}

func NewMessagesHandler(repo *repository.MessageRepo, logger *slog.Logger) *MessagesHandler {
	return &MessagesHandler{repo: repo, logger: logger}
}

func (h *MessagesHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, model.ErrUnauthorized)
		return
	}

	convos, err := h.repo.GetConversations(r.Context(), userID)
	if err != nil {
		h.handleError(w, err)
		return
	}
	if convos == nil {
		convos = []model.Conversation{}
	}
	h.respondJSON(w, http.StatusOK, convos)
}

func (h *MessagesHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	convIDStr := r.URL.Query().Get("conv_id")
	if convIDStr == "" {
		h.respondError(w, model.NewAppError("Missing conv_id parameter", 400))
		return
	}

	convID, err := uuid.Parse(convIDStr)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid conv_id", 400))
		return
	}

	cursor := r.URL.Query().Get("cursor")
	msgs, err := h.repo.GetMessages(r.Context(), convID, cursor, 50)
	if err != nil {
		h.handleError(w, err)
		return
	}
	if msgs == nil {
		msgs = []model.Message{}
	}
	h.respondJSON(w, http.StatusOK, msgs)
}

func (h *MessagesHandler) CreateConversation(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Header.Get("X-User-ID")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.respondError(w, model.ErrUnauthorized)
		return
	}

	var req model.CreateConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, model.NewAppError("Request body must be JSON", 400))
		return
	}

	participantID, err := uuid.Parse(req.ParticipantID)
	if err != nil {
		h.respondError(w, model.NewAppError("Invalid participant_id", 400))
		return
	}

	convID, err := h.repo.CreateConversation(r.Context(), userID, participantID)
	if err != nil {
		h.handleError(w, err)
		return
	}

	h.respondJSON(w, http.StatusCreated, map[string]interface{}{
		"conversation_id": convID,
	})
}

func (h *MessagesHandler) Health(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "messages"})
}

func (h *MessagesHandler) Ready(w http.ResponseWriter, r *http.Request) {
	h.respondJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "messages"})
}

func (h *MessagesHandler) respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func (h *MessagesHandler) respondError(w http.ResponseWriter, appErr *model.AppError) {
	h.respondJSON(w, appErr.HTTPStatus, appErr)
}

func (h *MessagesHandler) handleError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		h.respondError(w, appErr)
		return
	}
	h.logger.Error("unexpected error", "error", err)
	h.respondError(w, model.NewAppError("Internal server error", 500))
}

