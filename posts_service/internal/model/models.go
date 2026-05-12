package model

import (
	"time"

	"github.com/google/uuid"
)

type Post struct {
	ID            uuid.UUID `json:"id"`
	AuthorID      uuid.UUID `json:"user_id"`
	Username      string    `json:"username"`
	Content       string    `json:"content"`
	ImageURL      string    `json:"media_url"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
	IsLiked       bool      `json:"is_liked"`
}

type Comment struct {
	ID        uuid.UUID `json:"id"`
	PostID    uuid.UUID `json:"post_id"`
	AuthorID  uuid.UUID `json:"author_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type CreatePostRequest struct {
	Content string `json:"content" validate:"max=500"`
}

type CreateCommentRequest struct {
	Content string `json:"content" validate:"required,max=280"`
}

type PaginatedPosts struct {
	Data       []Post `json:"data"`
	NextCursor string `json:"next_cursor"`
	Total      int    `json:"total"`
}

type PaginatedComments struct {
	Data       []Comment `json:"data"`
	NextCursor string    `json:"next_cursor"`
	Total      int       `json:"total"`
}

type LikeResponse struct {
	Message    string `json:"message"`
	LikesCount int    `json:"likes_count"`
}
