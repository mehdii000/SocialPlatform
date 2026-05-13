package model

import (
	"time"

	"github.com/google/uuid"
)

// Post and PaginatedPosts mirror posts_service types for cross-service queries.
type Post struct {
	ID            uuid.UUID `json:"id"`
	AuthorID      uuid.UUID `json:"user_id"`
	Username      string    `json:"username"`
	Content       string    `json:"content"`
	MediaURL      string    `json:"media_url,omitempty"`
	MediaType     int       `json:"media_type"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
	IsLiked       bool      `json:"is_liked"`
}

type PaginatedPosts struct {
	Data       []Post `json:"data"`
	NextCursor string `json:"next_cursor"`
	Total      int    `json:"total"`
}

type Topic struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	Slug        string     `json:"slug"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty"`
	PostCount   int        `json:"post_count"`
	IsFollowing bool       `json:"is_following"`
	CreatedAt   time.Time  `json:"created_at"`
}

type UserInterest struct {
	TopicID uuid.UUID `json:"topic_id"`
	Slug    string    `json:"slug"`
	Name    string    `json:"name"`
	Weight  float64   `json:"weight"`
}

type TrendingTopic struct {
	Topic
	PostVelocity       int     `json:"post_velocity"`
	EngagementVelocity int     `json:"engagement_velocity"`
	Score              float64 `json:"score"`
}

type GraphNode struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Size int    `json:"size"`
}

type GraphEdge struct {
	Source string  `json:"source"`
	Target string  `json:"target"`
	Weight float64 `json:"weight"`
}

type TopicListResponse struct {
	Data  []Topic `json:"data"`
	Total int     `json:"total"`
}

type TrendingTopicResponse struct {
	Data []TrendingTopic `json:"data"`
}

type ExtractRequest struct {
	PostID  string `json:"post_id" validate:"required"`
	Content string `json:"content" validate:"required,max=500"`
}

type ExtractResponse struct {
	Topics []TopicTag `json:"topics"`
}

type TopicTag struct {
	Slug      string  `json:"slug"`
	Name      string  `json:"name"`
	Relevance float64 `json:"relevance"`
}

type EngageRequest struct {
	PostID string `json:"post_id" validate:"required"`
	Action string `json:"action" validate:"required,oneof=like comment create"`
}

type UpdateInterestsRequest struct {
	Topics []InterestUpdate `json:"topics" validate:"required,min=1"`
}

type InterestUpdate struct {
	Slug   string  `json:"slug" validate:"required"`
	Weight float64 `json:"weight" validate:"min=0,max=5"`
}

type InterestResponse struct {
	Data []UserInterest `json:"data"`
}

type GraphResponse struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}
