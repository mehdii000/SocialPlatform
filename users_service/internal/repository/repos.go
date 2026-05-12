package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/users_service/internal/model"
)

type ProfileRepo struct {
	pool *pgxpool.Pool
}

func NewProfileRepo(pool *pgxpool.Pool) *ProfileRepo {
	return &ProfileRepo{pool: pool}
}

func (r *ProfileRepo) Create(ctx context.Context, userID uuid.UUID, username string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO profiles (user_id, username) VALUES ($1, $2)`,
		userID, username,
	)
	return err
}

func (r *ProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.Profile, error) {
	p := &model.Profile{}
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, username, display_name, bio, avatar_url, created_at, updated_at
		 FROM profiles WHERE user_id = $1`,
		userID,
	).Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProfileRepo) GetByUsername(ctx context.Context, username string) (*model.Profile, error) {
	p := &model.Profile{}
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, username, display_name, bio, avatar_url, created_at, updated_at
		 FROM profiles WHERE username = $1`,
		username,
	).Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProfileRepo) Update(ctx context.Context, userID uuid.UUID, bio, displayName string) (*model.Profile, error) {
	p := &model.Profile{}
	err := r.pool.QueryRow(ctx,
		`UPDATE profiles SET bio = $2, display_name = $3, updated_at = NOW()
		 WHERE user_id = $1
		 RETURNING user_id, username, display_name, bio, avatar_url, created_at, updated_at`,
		userID, bio, displayName,
	).Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProfileRepo) UpdateAvatar(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE profiles SET avatar_url = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, avatarURL,
	)
	return err
}

func (r *ProfileRepo) Search(ctx context.Context, query string, cursor string, limit int) (*model.SearchResult, error) {
	var rows pgx.Rows
	var err error

	q := "%" + query + "%"

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT user_id, username, display_name, bio, avatar_url, created_at, updated_at
			 FROM profiles WHERE username ILIKE $1 OR display_name ILIKE $1
			 ORDER BY username ASC LIMIT $2`,
			q, limit+1,
		)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT user_id, username, display_name, bio, avatar_url, created_at, updated_at
			 FROM profiles WHERE (username ILIKE $1 OR display_name ILIKE $1) AND username > $2
			 ORDER BY username ASC LIMIT $3`,
			q, cursor, limit+1,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profiles := make([]model.Profile, 0)
	for rows.Next() {
		var p model.Profile
		if err := rows.Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}

	hasMore := len(profiles) > limit
	if hasMore {
		profiles = profiles[:limit]
	}

	nextCursor := ""
	if hasMore && len(profiles) > 0 {
		nextCursor = profiles[len(profiles)-1].Username
	}

	return &model.SearchResult{
		Data:       profiles,
		NextCursor: nextCursor,
		Total:      len(profiles),
	}, nil
}

func (r *ProfileRepo) ListAll(ctx context.Context) ([]model.Profile, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT user_id, username, display_name, bio, avatar_url, created_at, updated_at
		 FROM profiles ORDER BY created_at DESC LIMIT 100`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	profiles := make([]model.Profile, 0)
	for rows.Next() {
		var p model.Profile
		if err := rows.Scan(&p.UserID, &p.Username, &p.DisplayName, &p.Bio, &p.AvatarURL, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		profiles = append(profiles, p)
	}
	return profiles, nil
}

type FollowRepo struct {
	pool *pgxpool.Pool
}

func NewFollowRepo(pool *pgxpool.Pool) *FollowRepo {
	return &FollowRepo{pool: pool}
}

func (r *FollowRepo) Follow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		followerID, followeeID,
	)
	return err
}

func (r *FollowRepo) Unfollow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`,
		followerID, followeeID,
	)
	return err
}

func (r *FollowRepo) IsFollowing(ctx context.Context, followerID, followeeID uuid.UUID) (bool, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND followee_id = $2`,
		followerID, followeeID,
	).Scan(&count)
	return count > 0, err
}

func (r *FollowRepo) GetFollowers(ctx context.Context, userID uuid.UUID, cursor string, limit int) (*model.PaginatedFollows, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT p.user_id, p.username, p.avatar_url FROM follows f
			 JOIN profiles p ON p.user_id = f.follower_id
			 WHERE f.followee_id = $1
			 ORDER BY p.username ASC LIMIT $2`,
			userID, limit+1,
		)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT p.user_id, p.username, p.avatar_url FROM follows f
			 JOIN profiles p ON p.user_id = f.follower_id
			 WHERE f.followee_id = $1 AND p.username > $2
			 ORDER BY p.username ASC LIMIT $3`,
			userID, cursor, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get followers: %w", err)
	}
	defer rows.Close()

	followers := make([]model.FollowInfo, 0)
	for rows.Next() {
		var f model.FollowInfo
		if err := rows.Scan(&f.UserID, &f.Username, &f.AvatarURL); err != nil {
			return nil, err
		}
		followers = append(followers, f)
	}

	hasMore := len(followers) > limit
	if hasMore {
		followers = followers[:limit]
	}

	nextCursor := ""
	if hasMore && len(followers) > 0 {
		nextCursor = followers[len(followers)-1].Username
	}

	return &model.PaginatedFollows{
		Data:       followers,
		NextCursor: nextCursor,
		Total:      len(followers),
	}, nil
}

func (r *FollowRepo) GetFollowing(ctx context.Context, userID uuid.UUID, cursor string, limit int) (*model.PaginatedFollows, error) {
	var rows pgx.Rows
	var err error

	if cursor == "" {
		rows, err = r.pool.Query(ctx,
			`SELECT p.user_id, p.username, p.avatar_url FROM follows f
			 JOIN profiles p ON p.user_id = f.followee_id
			 WHERE f.follower_id = $1
			 ORDER BY p.username ASC LIMIT $2`,
			userID, limit+1,
		)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT p.user_id, p.username, p.avatar_url FROM follows f
			 JOIN profiles p ON p.user_id = f.followee_id
			 WHERE f.follower_id = $1 AND p.username > $2
			 ORDER BY p.username ASC LIMIT $3`,
			userID, cursor, limit+1,
		)
	}
	if err != nil {
		return nil, fmt.Errorf("get following: %w", err)
	}
	defer rows.Close()

	following := make([]model.FollowInfo, 0)
	for rows.Next() {
		var f model.FollowInfo
		if err := rows.Scan(&f.UserID, &f.Username, &f.AvatarURL); err != nil {
			return nil, err
		}
		following = append(following, f)
	}

	hasMore := len(following) > limit
	if hasMore {
		following = following[:limit]
	}

	nextCursor := ""
	if hasMore && len(following) > 0 {
		nextCursor = following[len(following)-1].Username
	}

	return &model.PaginatedFollows{
		Data:       following,
		NextCursor: nextCursor,
		Total:      len(following),
	}, nil
}

func (r *FollowRepo) CountFollowers(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM follows WHERE followee_id = $1`, userID,
	).Scan(&count)
	return count, err
}

func (r *FollowRepo) CountFollowing(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM follows WHERE follower_id = $1`, userID,
	).Scan(&count)
	return count, err
}
