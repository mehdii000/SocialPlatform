package service

import (
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Client struct {
	UserID uuid.UUID
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *Hub
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 30 * time.Second
	maxMessageSize = 4096
)

func (c *Client) ReadPump(mh *MessageHandler, logger *slog.Logger) {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSIncoming
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		mh.HandleMessage(c, msg, logger)
	}
}

func (c *Client) WritePump(logger *slog.Logger) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type WSIncoming struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversation_id"`
	Content        string `json:"content"`
}

type Hub struct {
	Clients    map[uuid.UUID]*Client
	Broadcast  chan *OutgoingMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

type OutgoingMessage struct {
	TargetUserID uuid.UUID
	Data         []byte
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[uuid.UUID]*Client),
		Broadcast:  make(chan *OutgoingMessage, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run(logger *slog.Logger) {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			// Close existing connection for same user if exists
			if old, ok := h.Clients[client.UserID]; ok {
				close(old.Send)
				old.Conn.Close()
			}
			h.Clients[client.UserID] = client
			h.mu.Unlock()
			logger.Info("client connected", "user_id", client.UserID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if c, ok := h.Clients[client.UserID]; ok && c == client {
				delete(h.Clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			logger.Info("client disconnected", "user_id", client.UserID)

		case msg := <-h.Broadcast:
			h.mu.RLock()
			client, ok := h.Clients[msg.TargetUserID]
			h.mu.RUnlock()
			if ok {
				select {
				case client.Send <- msg.Data:
				default:
					h.mu.Lock()
					delete(h.Clients, msg.TargetUserID)
					close(client.Send)
					h.mu.Unlock()
				}
			}
		}
	}
}

func (h *Hub) SendToUser(userID uuid.UUID, data []byte) {
	h.Broadcast <- &OutgoingMessage{TargetUserID: userID, Data: data}
}

func (h *Hub) IsOnline(userID uuid.UUID) bool {
	h.mu.RLock()
	_, ok := h.Clients[userID]
	h.mu.RUnlock()
	return ok
}
