package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/messages_service/internal/model"
)

type MessageRepo struct {
	pool *pgxpool.Pool
}

func NewMessageRepo(pool *pgxpool.Pool) *MessageRepo {
	return &MessageRepo{pool: pool}
}

func (r *MessageRepo) CreateConversation(ctx context.Context, userA, userB uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	var a, b = userA, userB
	if a.String() > b.String() {
		a, b = b, a
	}

	err := r.pool.QueryRow(ctx,
		`INSERT INTO conversations (participant_a, participant_b)
		 VALUES ($1, $2)
		 ON CONFLICT (LEAST(participant_a, participant_b), GREATEST(participant_a, participant_b))
		 DO UPDATE SET id = conversations.id
		 RETURNING id`,
		a, b,
	).Scan(&id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("create conversation: %w", err)
	}
	return id, nil
}

func (r *MessageRepo) GetConversations(ctx context.Context, userID uuid.UUID) ([]model.Conversation, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT c.id,
			CASE WHEN c.participant_a = $1 THEN p_b.username ELSE p_a.username END,
			CASE WHEN c.participant_a = $1 THEN p_b.avatar_url ELSE p_a.avatar_url END,
			m.content,
			m.created_at
		 FROM conversations c
		 JOIN profiles p_a ON c.participant_a = p_a.user_id
		 JOIN profiles p_b ON c.participant_b = p_b.user_id
		 LEFT JOIN LATERAL (
			SELECT content, created_at FROM messages
			WHERE conversation_id = c.id
			ORDER BY created_at DESC LIMIT 1
		 ) m ON true
		 WHERE c.participant_a = $1 OR c.participant_b = $1
		 ORDER BY m.created_at DESC NULLS LAST`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get conversations: %w", err)
	}
	defer rows.Close()

	convos := make([]model.Conversation, 0)
	for rows.Next() {
		var c model.Conversation
		var lastMsg *string
		var lastTime *time.Time
		if err := rows.Scan(&c.ID, &c.Participant, &c.AvatarURL, &lastMsg, &lastTime); err != nil {
			return nil, fmt.Errorf("scan conversation: %w", err)
		}
		if lastMsg != nil {
			c.LastMessage = *lastMsg
		}
		if lastTime != nil {
			c.LastTime = lastTime
		}
		convos = append(convos, c)
	}
	return convos, nil
}

func (r *MessageRepo) GetMessages(ctx context.Context, conversationID uuid.UUID, cursor string, limit int) ([]model.Message, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT m.id, m.conversation_id, u.username, m.content, m.created_at
			 FROM messages m
			 JOIN profiles u ON m.sender_id = u.user_id
			 WHERE m.conversation_id = $1
			 ORDER BY m.created_at DESC
			 LIMIT $2`,
			conversationID, limit,
		)
	} else {
		cursorUUID, parseErr := uuid.Parse(cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx,
			`SELECT m.id, m.conversation_id, u.username, m.content, m.created_at
			 FROM messages m
			 JOIN profiles u ON m.sender_id = u.user_id
			 WHERE m.conversation_id = $1 AND m.created_at < (
				SELECT created_at FROM messages WHERE id = $2
			 )
			 ORDER BY m.created_at DESC
			 LIMIT $3`,
			conversationID, cursorUUID, limit,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}
	defer rows.Close()

	msgs := make([]model.Message, 0)
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderUsername, &m.Content, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		msgs = append(msgs, m)
	}

	// Reverse to get ASC order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}

	return msgs, nil
}

func (r *MessageRepo) SaveMessage(ctx context.Context, conversationID, senderID uuid.UUID, content string) (*model.Message, error) {
	m := &model.Message{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO messages (conversation_id, sender_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, conversation_id, sender_id, content, created_at`,
		conversationID, senderID, content,
	).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("save message: %w", err)
	}
	return m, nil
}

func (r *MessageRepo) GetParticipantIDs(ctx context.Context, conversationID uuid.UUID) (uuid.UUID, uuid.UUID, error) {
	var a, b uuid.UUID
	err := r.pool.QueryRow(ctx,
		`SELECT participant_a, participant_b FROM conversations WHERE id = $1`,
		conversationID,
	).Scan(&a, &b)
	return a, b, err
}

