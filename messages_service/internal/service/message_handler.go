package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/messages_service/internal/model"
	"github.com/mehdii000/SocialPlatform/messages_service/internal/repository"
)

type MessageHandler struct {
	repo *repository.MessageRepo
	hub  *Hub
}

func NewMessageHandler(repo *repository.MessageRepo, hub *Hub) *MessageHandler {
	return &MessageHandler{repo: repo, hub: hub}
}

func (mh *MessageHandler) HandleMessage(client *Client, msg WSIncoming, logger *slog.Logger) {
	switch msg.Type {
	case "message":
		mh.handleChatMessage(client, msg, logger)
	case "typing":
		mh.handleTyping(client, msg, logger)
	}
}

func (mh *MessageHandler) handleChatMessage(client *Client, msg WSIncoming, logger *slog.Logger) {
	convID, err := uuid.Parse(msg.ConversationID)
	if err != nil {
		return
	}

	saved, err := mh.repo.SaveMessage(context.Background(), convID, client.UserID, msg.Content)
	if err != nil {
		logger.Error("failed to save message", "error", err)
		return
	}

	participantA, participantB, err := mh.repo.GetParticipantIDs(context.Background(), convID)
	if err != nil {
		logger.Error("failed to get participants", "error", err)
		return
	}

	var recipientID uuid.UUID
	if participantA == client.UserID {
		recipientID = participantB
	} else {
		recipientID = participantA
	}

	outgoing := model.WSMessage{
		Type:           "message",
		ID:             saved.ID,
		ConversationID: msg.ConversationID,
		SenderID:       client.UserID.String(),
		Content:        msg.Content,
		CreatedAt:      saved.CreatedAt.Format(time.RFC3339),
	}

	data, _ := json.Marshal(outgoing)

	mh.hub.SendToUser(recipientID, data)
	mh.hub.SendToUser(client.UserID, data)
}

func (mh *MessageHandler) handleTyping(client *Client, msg WSIncoming, logger *slog.Logger) {
	convID, err := uuid.Parse(msg.ConversationID)
	if err != nil {
		return
	}

	participantA, participantB, err := mh.repo.GetParticipantIDs(context.Background(), convID)
	if err != nil {
		return
	}

	var recipientID uuid.UUID
	if participantA == client.UserID {
		recipientID = participantB
	} else {
		recipientID = participantA
	}

	outgoing := model.WSMessage{
		Type:           "typing",
		ConversationID: msg.ConversationID,
		SenderID:       client.UserID.String(),
	}

	data, _ := json.Marshal(outgoing)
	mh.hub.SendToUser(recipientID, data)
}
