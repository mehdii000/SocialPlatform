package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/mehdii000/SocialPlatform/resonance_service/internal/model"
)

type TopicRepo struct {
	pool *pgxpool.Pool
}

func NewTopicRepo(pool *pgxpool.Pool) *TopicRepo {
	return &TopicRepo{pool: pool}
}

func (r *TopicRepo) List(ctx context.Context) ([]model.Topic, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, slug, description, parent_id, post_count, created_at
		 FROM topics ORDER BY name ASC`)
	if err != nil {
		return nil, fmt.Errorf("list topics: %w", err)
	}
	defer rows.Close()

	topics := make([]model.Topic, 0)
	for rows.Next() {
		var t model.Topic
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.ParentID, &t.PostCount, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan topic: %w", err)
		}
		topics = append(topics, t)
	}
	return topics, nil
}

func (r *TopicRepo) GetBySlug(ctx context.Context, slug string) (*model.Topic, error) {
	t := &model.Topic{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, description, parent_id, post_count, created_at
		 FROM topics WHERE slug = $1`,
		slug,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.ParentID, &t.PostCount, &t.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get topic by slug: %w", err)
	}
	return t, nil
}

func (r *TopicRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Topic, error) {
	t := &model.Topic{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, description, parent_id, post_count, created_at
		 FROM topics WHERE id = $1`,
		id,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.ParentID, &t.PostCount, &t.CreatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get topic by id: %w", err)
	}
	return t, nil
}

func (r *TopicRepo) GetTrending(ctx context.Context, limit int) ([]model.TrendingTopic, error) {
	rows, err := r.pool.Query(ctx,
		`WITH recent_posts AS (
			SELECT pt.topic_id, COUNT(*) as post_count,
				COALESCE(SUM(l.like_count), 0) as engagement
			FROM post_topics pt
			JOIN posts p ON pt.post_id = p.id AND p.created_at > NOW() - INTERVAL '3 days'
			LEFT JOIN LATERAL (SELECT COUNT(*) as like_count FROM likes WHERE post_id = p.id) l ON true
			GROUP BY pt.topic_id
		)
		SELECT t.id, t.name, t.slug, t.description, t.parent_id, t.post_count, t.created_at,
			COALESCE(rp.post_count, 0) as post_velocity,
			COALESCE(rp.engagement, 0) as engagement_velocity,
			COALESCE(rp.engagement, 0) * 0.7 + COALESCE(rp.post_count, 0) * 0.3 as score
		FROM topics t
		LEFT JOIN recent_posts rp ON t.id = rp.topic_id
		ORDER BY score DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("get trending topics: %w", err)
	}
	defer rows.Close()

	trending := make([]model.TrendingTopic, 0)
	for rows.Next() {
		var tt model.TrendingTopic
		if err := rows.Scan(&tt.ID, &tt.Name, &tt.Slug, &tt.Description, &tt.ParentID, &tt.PostCount, &tt.CreatedAt,
			&tt.PostVelocity, &tt.EngagementVelocity, &tt.Score); err != nil {
			return nil, fmt.Errorf("scan trending topic: %w", err)
		}
		trending = append(trending, tt)
	}
	return trending, nil
}

func (r *TopicRepo) IncrementPostCount(ctx context.Context, topicID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE topics SET post_count = post_count + 1 WHERE id = $1`, topicID)
	if err != nil {
		return fmt.Errorf("increment post count: %w", err)
	}
	return nil
}

func (r *TopicRepo) SearchByText(ctx context.Context, text string) ([]model.Topic, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, slug, description, parent_id, post_count, created_at,
			similarity(name, $1) as sim
		 FROM topics
		 WHERE similarity(name, $1) > 0.15 OR similarity(description, $1) > 0.15
		 ORDER BY sim DESC
		 LIMIT 10`, text)
	if err != nil {
		return nil, fmt.Errorf("search topics: %w", err)
	}
	defer rows.Close()

	topics := make([]model.Topic, 0)
	for rows.Next() {
		var t model.Topic
		var sim float64
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Description, &t.ParentID, &t.PostCount, &t.CreatedAt, &sim); err != nil {
			return nil, fmt.Errorf("scan topic: %w", err)
		}
		topics = append(topics, t)
	}
	return topics, nil
}

type PostTopicRepo struct {
	pool *pgxpool.Pool
}

func NewPostTopicRepo(pool *pgxpool.Pool) *PostTopicRepo {
	return &PostTopicRepo{pool: pool}
}

func (r *PostTopicRepo) Add(ctx context.Context, postID, topicID uuid.UUID, relevance float64, isAuto bool) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO post_topics (post_id, topic_id, relevance, is_auto)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (post_id, topic_id) DO UPDATE SET relevance = EXCLUDED.relevance`,
		postID, topicID, relevance, isAuto)
	if err != nil {
		return fmt.Errorf("add post topic: %w", err)
	}
	return nil
}

func (r *PostTopicRepo) GetByPost(ctx context.Context, postID uuid.UUID) ([]model.TopicTag, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT t.slug, t.name, pt.relevance
		 FROM post_topics pt
		 JOIN topics t ON pt.topic_id = t.id
		 WHERE pt.post_id = $1
		 ORDER BY pt.relevance DESC`, postID)
	if err != nil {
		return nil, fmt.Errorf("get post topics: %w", err)
	}
	defer rows.Close()

	tags := make([]model.TopicTag, 0)
	for rows.Next() {
		var tag model.TopicTag
		if err := rows.Scan(&tag.Slug, &tag.Name, &tag.Relevance); err != nil {
			return nil, fmt.Errorf("scan topic tag: %w", err)
		}
		tags = append(tags, tag)
	}
	return tags, nil
}

func (r *PostTopicRepo) GetByPostIDs(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID][]model.TopicTag, error) {
	result := make(map[uuid.UUID][]model.TopicTag)
	for _, pid := range postIDs {
		result[pid] = make([]model.TopicTag, 0)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT pt.post_id, t.slug, t.name, pt.relevance
		 FROM post_topics pt
		 JOIN topics t ON pt.topic_id = t.id
		 WHERE pt.post_id = ANY($1)
		 ORDER BY pt.relevance DESC`, postIDs)
	if err != nil {
		return nil, fmt.Errorf("get post topics batch: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var postID uuid.UUID
		var tag model.TopicTag
		if err := rows.Scan(&postID, &tag.Slug, &tag.Name, &tag.Relevance); err != nil {
			return nil, fmt.Errorf("scan topic tag: %w", err)
		}
		result[postID] = append(result[postID], tag)
	}
	return result, nil
}

func (r *PostTopicRepo) GetFeedByInterests(ctx context.Context, topicIDs []uuid.UUID, viewerID uuid.UUID, cursor string, sort string, limit int) (*model.PaginatedPosts, error) {
	topicIDStrings := make([]string, len(topicIDs))
	for i, id := range topicIDs {
		topicIDStrings[i] = id.String()
	}

	var rows pgx.Rows
	var err error
	baseQuery := `SELECT DISTINCT p.id, p.author_id, u.username, p.content, p.media_url, p.media_type, p.created_at,
		(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
		(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
		EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
		FROM posts p
		JOIN profiles u ON p.author_id = u.user_id
		JOIN post_topics pt ON p.id = pt.post_id
		WHERE pt.topic_id = ANY($2::uuid[])`

	orderClause := ` ORDER BY p.created_at DESC`
	if sort == "top" {
		orderClause = ` ORDER BY ((SELECT COUNT(*) FROM likes WHERE post_id = p.id) + (SELECT COUNT(*) FROM comments WHERE post_id = p.id) * 2) DESC, p.created_at DESC`
	}

	if cursor == "" {
		rows, err = r.pool.Query(ctx, baseQuery+orderClause+` LIMIT $3`,
			viewerID, topicIDs, limit+1)
	} else {
		ts, parseErr := time.Parse(time.RFC3339Nano, cursor)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor: %w", parseErr)
		}
		rows, err = r.pool.Query(ctx, baseQuery+` AND p.created_at < $3`+orderClause+` LIMIT $4`,
			viewerID, topicIDs, ts, limit+1)
	}
	if err != nil {
		return nil, fmt.Errorf("get feed by interests: %w", err)
	}
	defer rows.Close()

	return scanPosts(rows, limit)
}

func (r *PostTopicRepo) SerendipityPosts(ctx context.Context, excludeTopicIDs []uuid.UUID, viewerID uuid.UUID, limit int) ([]model.Post, error) {
	if len(excludeTopicIDs) == 0 {
		return nil, nil
	}

	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT p.id, p.author_id, u.username, p.content, p.media_url, p.media_type, p.created_at,
			(SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
			EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
		 FROM posts p
		 JOIN profiles u ON p.author_id = u.user_id
		 JOIN post_topics pt ON p.id = pt.post_id
		 WHERE pt.topic_id NOT IN (SELECT UNNEST($2::uuid[]))
		 ORDER BY p.created_at DESC
		 LIMIT $3`,
		viewerID, excludeTopicIDs, limit)
	if err != nil {
		return nil, fmt.Errorf("get serendipity posts: %w", err)
	}
	defer rows.Close()

	posts := make([]model.Post, 0)
	for rows.Next() {
		var p model.Post
		var mediaURL *string
		if err := rows.Scan(&p.ID, &p.AuthorID, &p.Username, &p.Content, &mediaURL, &p.MediaType, &p.CreatedAt,
			&p.LikesCount, &p.CommentsCount, &p.IsLiked); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		if mediaURL != nil {
			p.MediaURL = *mediaURL
		}
		posts = append(posts, p)
	}
	return posts, nil
}

type InterestRepo struct {
	pool *pgxpool.Pool
}

func NewInterestRepo(pool *pgxpool.Pool) *InterestRepo {
	return &InterestRepo{pool: pool}
}

func (r *InterestRepo) GetByUser(ctx context.Context, userID uuid.UUID) ([]model.UserInterest, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT ui.topic_id, t.slug, t.name,
			CASE WHEN NOW() - ui.last_engaged_at > INTERVAL '24 hours'
				THEN ui.weight * 0.97
				ELSE ui.weight
			END as effective_weight
		 FROM user_interests ui
		 JOIN topics t ON ui.topic_id = t.id
		 WHERE ui.user_id = $1
		 ORDER BY effective_weight DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("get user interests: %w", err)
	}
	defer rows.Close()

	interests := make([]model.UserInterest, 0)
	for rows.Next() {
		var i model.UserInterest
		if err := rows.Scan(&i.TopicID, &i.Slug, &i.Name, &i.Weight); err != nil {
			return nil, fmt.Errorf("scan interest: %w", err)
		}
		interests = append(interests, i)
	}
	return interests, nil
}

func (r *InterestRepo) UpdateWeight(ctx context.Context, userID, topicID uuid.UUID, delta float64) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO user_interests (user_id, topic_id, weight, last_engaged_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (user_id, topic_id)
		 DO UPDATE SET weight = LEAST(5.0, user_interests.weight + $3),
		 	last_engaged_at = NOW()`,
		userID, topicID, delta)
	if err != nil {
		return fmt.Errorf("update interest weight: %w", err)
	}
	return nil
}

func (r *InterestRepo) SetWeights(ctx context.Context, userID uuid.UUID, interests []model.InterestUpdate) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, interest := range interests {
		var topicID uuid.UUID
		err := tx.QueryRow(ctx, `SELECT id FROM topics WHERE slug = $1`, interest.Slug).Scan(&topicID)
		if err == pgx.ErrNoRows {
			continue
		}
		if err != nil {
			return fmt.Errorf("find topic %s: %w", interest.Slug, err)
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO user_interests (user_id, topic_id, weight, last_engaged_at)
			 VALUES ($1, $2, $3, NOW())
			 ON CONFLICT (user_id, topic_id)
			 DO UPDATE SET weight = $3, last_engaged_at = NOW()`,
			userID, topicID, interest.Weight)
		if err != nil {
			return fmt.Errorf("set interest %s: %w", interest.Slug, err)
		}
	}

	return tx.Commit(ctx)
}

func (r *InterestRepo) RemoveInterest(ctx context.Context, userID uuid.UUID, slug string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM user_interests WHERE user_id = $1 AND topic_id = (SELECT id FROM topics WHERE slug = $2)`,
		userID, slug)
	if err != nil {
		return fmt.Errorf("remove interest: %w", err)
	}
	return nil
}

func (r *TopicRepo) GetGraphEdges(ctx context.Context) ([]model.GraphEdge, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t1.slug, t2.slug, COUNT(*)::float8 as weight
		FROM post_topics pt1
		JOIN post_topics pt2 ON pt1.post_id = pt2.post_id AND pt1.topic_id < pt2.topic_id
		JOIN topics t1 ON pt1.topic_id = t1.id
		JOIN topics t2 ON pt2.topic_id = t2.id
		WHERE pt1.post_id IN (SELECT id FROM posts ORDER BY created_at DESC LIMIT 500)
		GROUP BY t1.slug, t2.slug
		HAVING COUNT(*) >= 2
		ORDER BY weight DESC
		LIMIT 100`)
	if err != nil {
		return nil, fmt.Errorf("get graph edges: %w", err)
	}
	defer rows.Close()

	edges := make([]model.GraphEdge, 0)
	for rows.Next() {
		var e model.GraphEdge
		if err := rows.Scan(&e.Source, &e.Target, &e.Weight); err != nil {
			continue
		}
		edges = append(edges, e)
	}
	return edges, nil
}

func scanPosts(rows pgx.Rows, limit int) (*model.PaginatedPosts, error) {
	posts := make([]model.Post, 0)
	for rows.Next() {
		var p model.Post
		var mediaURL *string
		if err := rows.Scan(&p.ID, &p.AuthorID, &p.Username, &p.Content, &mediaURL, &p.MediaType, &p.CreatedAt,
			&p.LikesCount, &p.CommentsCount, &p.IsLiked); err != nil {
			return nil, fmt.Errorf("scan post: %w", err)
		}
		if mediaURL != nil {
			p.MediaURL = *mediaURL
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
