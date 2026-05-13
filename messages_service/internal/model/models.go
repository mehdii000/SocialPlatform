package model

import (
	"time"

	"github.com/google/uuid"
)

type Conversation struct {
	ID          uuid.UUID  `json:"id"`
	Participant string     `json:"from"`
	AvatarURL   string     `json:"avatar,omitempty"`
	LastMessage string     `json:"msg,omitempty"`
	LastTime    *time.Time `json:"timestamp"`
}

type Message struct {
	ID             uuid.UUID `json:"id"`
	ConversationID uuid.UUID `json:"conversation_id,omitempty"`
	SenderID       uuid.UUID `json:"-"`
	SenderUsername string    `json:"from"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"timestamp"`
}

type WSMessage struct {
	Type           string    `json:"type"`
	ID             uuid.UUID `json:"id,omitempty"`
	ConversationID string    `json:"conversation_id,omitempty"`
	SenderID       string    `json:"sender_id,omitempty"`
	From           string    `json:"from,omitempty"`
	Content        string    `json:"content,omitempty"`
	CreatedAt      string    `json:"created_at,omitempty"`
}

type CreateConversationRequest struct {
	ParticipantID string `json:"participant_id"`
}
