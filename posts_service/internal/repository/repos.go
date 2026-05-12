package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/posts_service/internal/model"
)

type PostRepo struct {
	pool *pgxpool.Pool
}

func NewPostRepo(pool *pgxpool.Pool) *PostRepo {
	return &PostRepo{pool: pool}
}

func (r *PostRepo) Create(ctx context.Context, authorID uuid.UUID, content, imageURL string) (*model.Post, error) {
	p := &model.Post{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO posts (author_id, content, image_url)
		 VALUES ($1, $2, $3)
		 RETURNING id, author_id, content, image_url, created_at`,
		authorID, content, imageURL,
	).Scan(&p.ID, &p.AuthorID, &p.Content, &p.ImageURL, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create post: %w", err)
	}
	return p, nil
}

func (r *PostRepo) GetByID(ctx context.Context, postID, viewerID uuid.UUID) (*model.Post, error) {
	p := &model.Post{}
	var imageURL *string
	err := r.pool.QueryRow(ctx,
		`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
			(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
			EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2) as is_liked
		 FROM posts p
		 JOIN profiles u ON p.author_id = u.user_id
		 WHERE p.id = $1`,
		postID, viewerID,
	).Scan(&p.ID, &p.AuthorID, &p.Username, &p.Content, &imageURL, &p.CreatedAt,
		&p.LikesCount, &p.CommentsCount, &p.IsLiked)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get post: %w", err)
	}
	if imageURL != nil {
		p.ImageURL = *imageURL
	}
	return p, nil
}

func (r *PostRepo) Delete(ctx context.Context, postID, authorID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM posts WHERE id = $1 AND author_id = $2`,
		postID, authorID,
	)
	if err != nil {
		return false, fmt.Errorf("delete post: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}

func (r *PostRepo) GetFeed(ctx context.Context, viewerID uuid.UUID, cursor string, limit int) (*model.PaginatedPosts, error) {
	var rows pgx.Rows
	var err error

	// Get all posts (for now — spec says feed = followed + own)
	// In production, join with follows table
	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 ORDER BY p.created_at DESC
			 LIMIT $2`,
			viewerID, limit+1,
		)
	} else {
		ts, parseErr := time.Parse(time.RFC3339Nano, cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 WHERE p.created_at < $2
			 ORDER BY p.created_at DESC
			 LIMIT $3`,
			viewerID, ts, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get feed: %w", err)
	}
	defer rows.Close()

	return scanPosts(rows, limit)
}

func (r *PostRepo) GetAllPosts(ctx context.Context, viewerID uuid.UUID, cursor string, limit int) (*model.PaginatedPosts, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 ORDER BY p.created_at DESC
			 LIMIT $2`,
			viewerID, limit+1,
		)
	} else {
		ts, parseErr := time.Parse(time.RFC3339Nano, cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 WHERE p.created_at < $2
			 ORDER BY p.created_at DESC
			 LIMIT $3`,
			viewerID, ts, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get all posts: %w", err)
	}
	defer rows.Close()

	return scanPosts(rows, limit)
}

func (r *PostRepo) GetPostsByUser(ctx context.Context, authorID, viewerID uuid.UUID, cursor string, limit int) (*model.PaginatedPosts, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 WHERE p.author_id = $2
			 ORDER BY p.created_at DESC
			 LIMIT $3`,
			viewerID, authorID, limit+1,
		)
	} else {
		ts, parseErr := time.Parse(time.RFC3339Nano, cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx,
			`SELECT p.id, p.author_id, u.username, p.content, p.image_url, p.created_at,
				(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
				(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
				EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
			 FROM posts p
			 JOIN profiles u ON p.author_id = u.user_id
			 WHERE p.author_id = $2 AND p.created_at < $3
			 ORDER BY p.created_at DESC
			 LIMIT $4`,
			viewerID, authorID, ts, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get posts by user: %w", err)
	}
	defer rows.Close()

	return scanPosts(rows, limit)
}

func scanPosts(rows pgx.Rows, limit int) (*model.PaginatedPosts, error) {
	posts := make([]model.Post, 0)
	for rows.Next() {
		var p model.Post
		var imageURL *string
		if err := rows.Scan(&p.ID, &p.AuthorID, &p.Username, &p.Content, &imageURL, &p.CreatedAt,
			&p.LikesCount, &p.CommentsCount, &p.IsLiked); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		if imageURL != nil {
			p.ImageURL = *imageURL
		}
		posts = append(posts, p)
	}

	hasMore := len(posts) > limit
	if hasMore {
		posts = posts[:limit]
	}

	nextCursor := ""
	if hasMore && len(posts) > 0 {
		nextCursor = posts[len(posts)-1].CreatedAt.Format(time.RFC3339Nano)
	}

	return &model.PaginatedPosts{
		Data:       posts,
		NextCursor: nextCursor,
		Total:      len(posts),
	}, nil
}

type LikeRepo struct {
	pool *pgxpool.Pool
}

func NewLikeRepo(pool *pgxpool.Pool) *LikeRepo {
	return &LikeRepo{pool: pool}
}

func (r *LikeRepo) Toggle(ctx context.Context, userID, postID uuid.UUID) (liked bool, likesCount int, err error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var existingID uuid.UUID
	err = tx.QueryRow(ctx,
		`SELECT id FROM likes WHERE user_id = $1 AND post_id = $2 FOR UPDATE`,
		userID, postID,
	).Scan(&existingID)

	if err == pgx.ErrNoRows {
		_, err = tx.Exec(ctx, `INSERT INTO likes (user_id, post_id) VALUES ($1, $2)`, userID, postID)
		if err != nil {
			return false, 0, fmt.Errorf("insert like: %w", err)
		}
		liked = true
	} else if err != nil {
		return false, 0, fmt.Errorf("check like: %w", err)
	} else {
		_, err = tx.Exec(ctx, `DELETE FROM likes WHERE user_id = $1 AND post_id = $2`, userID, postID)
		if err != nil {
			return false, 0, fmt.Errorf("delete like: %w", err)
		}
		liked = false
	}

	err = tx.QueryRow(ctx, `SELECT COUNT(*) FROM likes WHERE post_id = $1`, postID).Scan(&likesCount)
	if err != nil {
		return false, 0, fmt.Errorf("count likes: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, 0, fmt.Errorf("commit tx: %w", err)
	}

	return liked, likesCount, nil
}

type CommentRepo struct {
	pool *pgxpool.Pool
}

func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

func (r *CommentRepo) Create(ctx context.Context, postID, authorID uuid.UUID, content string) (*model.Comment, error) {
	c := &model.Comment{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO comments (post_id, author_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, post_id, author_id, content, created_at`,
		postID, authorID, content,
	).Scan(&c.ID, &c.PostID, &c.AuthorID, &c.Content, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create comment: %w", err)
	}
	return c, nil
}

func (r *CommentRepo) GetByPost(ctx context.Context, postID uuid.UUID, cursor string, limit int) (*model.PaginatedComments, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT c.id, c.post_id, c.author_id, u.username, c.content, c.created_at
			 FROM comments c
			 JOIN profiles u ON c.author_id = u.user_id
			 WHERE c.post_id = $1
			 ORDER BY c.created_at ASC
			 LIMIT $2`,
			postID, limit+1,
		)
	} else {
		ts, parseErr := time.Parse(time.RFC3339Nano, cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx,
			`SELECT c.id, c.post_id, c.author_id, u.username, c.content, c.created_at
			 FROM comments c
			 JOIN profiles u ON c.author_id = u.user_id
			 WHERE c.post_id = $1 AND c.created_at > $2
			 ORDER BY c.created_at ASC
			 LIMIT $3`,
			postID, ts, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get comments: %w", err)
	}
	defer rows.Close()

	comments := make([]model.Comment, 0)
	for rows.Next() {
		var c model.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.AuthorID, &c.Username, &c.Content, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		comments = append(comments, c)
	}

	hasMore := len(comments) > limit
	if hasMore {
		comments = comments[:limit]
	}

	nextCursor := ""
	if hasMore && len(comments) > 0 {
		nextCursor = comments[len(comments)-1].CreatedAt.Format(time.RFC3339Nano)
	}

	return &model.PaginatedComments{
		Data:       comments,
		NextCursor: nextCursor,
		Total:      len(comments),
	}, nil
}

func (r *CommentRepo) Delete(ctx context.Context, commentID, authorID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM comments WHERE id = $1 AND author_id = $2`,
		commentID, authorID,
	)
	if err != nil {
		return false, fmt.Errorf("delete comment: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}
