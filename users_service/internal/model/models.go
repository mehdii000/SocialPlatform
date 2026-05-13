package model

import (
	"time"

	"github.com/google/uuid"
)

type Profile struct {
	UserID      uuid.UUID  `json:"user_id"`
	Username    string     `json:"username"`
	DisplayName string     `json:"display_name,omitempty"`
	Bio         string     `json:"bio,omitempty"`
	AvatarURL   string     `json:"avatar_url,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type PublicProfile struct {
	UserID         uuid.UUID `json:"user_id"`
	Username       string    `json:"username"`
	Bio            string    `json:"bio,omitempty"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	IsFollowing    bool      `json:"is_following"`
	FollowersCount int       `json:"followers_count"`
	FollowingCount int       `json:"following_count"`
}

type UpdateProfileRequest struct {
	Bio         string `json:"bio,omitempty"`
	DisplayName string `json:"display_name,omitempty"`
}

type FollowInfo struct {
	UserID    uuid.UUID `json:"user_id"`
	Username  string    `json:"username"`
	AvatarURL string    `json:"avatar_url,omitempty"`
}

type PaginatedFollows struct {
	Data       []FollowInfo `json:"data"`
	NextCursor string       `json:"next_cursor"`
	Total      int          `json:"total"`
}

type SearchResult struct {
	Data       []Profile `json:"data"`
	NextCursor string    `json:"next_cursor"`
	Total      int       `json:"total"`
}
