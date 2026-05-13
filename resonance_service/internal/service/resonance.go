package service

import (
	"context"
	"math"
	"regexp"
	"sort"
	"strings"

	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/resonance_service/internal/model"
	"github.com/mehdii000/SocialPlatform/resonance_service/internal/repository"
)

type ResonanceService struct {
	topicRepo     *repository.TopicRepo
	postTopicRepo *repository.PostTopicRepo
	interestRepo  *repository.InterestRepo
}

func NewResonanceService(
	topicRepo *repository.TopicRepo,
	postTopicRepo *repository.PostTopicRepo,
	interestRepo *repository.InterestRepo,
) *ResonanceService {
	return &ResonanceService{
		topicRepo:     topicRepo,
		postTopicRepo: postTopicRepo,
		interestRepo:  interestRepo,
	}
}

func (s *ResonanceService) ListTopics(ctx context.Context) ([]model.Topic, error) {
	return s.topicRepo.List(ctx)
}

func (s *ResonanceService) GetTopic(ctx context.Context, slug string, viewerID uuid.UUID) (*model.Topic, error) {
	t, err := s.topicRepo.GetBySlug(ctx, slug)
	if err != nil {
		return nil, model.WrapError("Failed to load topic", 500, err)
	}
	if t == nil {
		return nil, model.ErrTopicNotFound
	}

	if viewerID != uuid.Nil {
		interests, _ := s.interestRepo.GetByUser(ctx, viewerID)
		for _, i := range interests {
			if i.Slug == slug && i.Weight > 0 {
				t.IsFollowing = true
				break
			}
		}
	}

	return t, nil
}

func (s *ResonanceService) GetTrendingTopics(ctx context.Context) ([]model.TrendingTopic, error) {
	return s.topicRepo.GetTrending(ctx, 12)
}

func (s *ResonanceService) FollowTopic(ctx context.Context, userID uuid.UUID, slug string) error {
	t, err := s.topicRepo.GetBySlug(ctx, slug)
	if err != nil {
		return model.WrapError("Failed to find topic", 500, err)
	}
	if t == nil {
		return model.ErrTopicNotFound
	}
	if err := s.interestRepo.UpdateWeight(ctx, userID, t.ID, 0.5); err != nil {
		return model.WrapError("Failed to follow topic", 500, err)
	}
	return nil
}

func (s *ResonanceService) UnfollowTopic(ctx context.Context, userID uuid.UUID, slug string) error {
	return s.interestRepo.RemoveInterest(ctx, userID, slug)
}

func (s *ResonanceService) GetInterests(ctx context.Context, userID uuid.UUID) ([]model.UserInterest, error) {
	return s.interestRepo.GetByUser(ctx, userID)
}

func (s *ResonanceService) UpdateInterests(ctx context.Context, userID uuid.UUID, interests []model.InterestUpdate) ([]model.UserInterest, error) {
	if err := s.interestRepo.SetWeights(ctx, userID, interests); err != nil {
		return nil, model.WrapError("Failed to update interests", 500, err)
	}
	return s.interestRepo.GetByUser(ctx, userID)
}

func (s *ResonanceService) Engage(ctx context.Context, userID uuid.UUID, postID uuid.UUID, action string) error {
	tags, err := s.postTopicRepo.GetByPost(ctx, postID)
	if err != nil {
		return model.WrapError("Failed to load post topics", 500, err)
	}
	if len(tags) == 0 {
		return nil
	}

	delta := 0.1
	if action == "comment" {
		delta = 0.15
	} else if action == "create" {
		delta = 0.2
	}

	for _, tag := range tags {
		t, err := s.topicRepo.GetBySlug(ctx, tag.Slug)
		if err != nil || t == nil {
			continue
		}
		s.interestRepo.UpdateWeight(ctx, userID, t.ID, delta)
	}
	return nil
}

func (s *ResonanceService) GetFeedByInterests(ctx context.Context, viewerID uuid.UUID, cursor string, limit int) (*model.PaginatedPosts, error) {
	interests, err := s.interestRepo.GetByUser(ctx, viewerID)
	if err != nil {
		return nil, model.WrapError("Failed to load interests", 500, err)
	}

	// If no interests, fall back to recent posts
	if len(interests) == 0 {
		return s.postTopicRepo.GetFeedByInterests(ctx, []uuid.UUID{uuid.Nil}, viewerID, cursor, "recent", limit)
	}

	topicIDs := make([]uuid.UUID, 0, min(20, len(interests)))
	for i := range interests {
		if i >= 20 {
			break
		}
		topicIDs = append(topicIDs, interests[i].TopicID)
	}

	result, err := s.postTopicRepo.GetFeedByInterests(ctx, topicIDs, viewerID, cursor, "recent", limit)
	if err != nil {
		return nil, err
	}

	// Interleave serendipity posts (every 4th slot)
	serendipityPosts, _ := s.postTopicRepo.SerendipityPosts(ctx, topicIDs, viewerID, max(1, limit/4))
	if len(serendipityPosts) > 0 && len(result.Data) > 0 {
		interleaved := make([]model.Post, 0, len(result.Data)+len(serendipityPosts))
		spIdx := 0
		for i, post := range result.Data {
			interleaved = append(interleaved, post)
			if (i+1)%4 == 0 && spIdx < len(serendipityPosts) {
				interleaved = append(interleaved, serendipityPosts[spIdx])
				spIdx++
			}
		}
		result.Data = interleaved
		result.Total = len(interleaved)
	}

	return result, nil
}

func (s *ResonanceService) GetTopicPosts(ctx context.Context, topicSlug string, viewerID uuid.UUID, cursor string, sort string, limit int) (*model.PaginatedPosts, error) {
	t, err := s.topicRepo.GetBySlug(ctx, topicSlug)
	if err != nil {
		return nil, model.WrapError("Failed to load topic", 500, err)
	}
	if t == nil {
		return nil, model.ErrTopicNotFound
	}

	return s.postTopicRepo.GetFeedByInterests(ctx, []uuid.UUID{t.ID}, viewerID, cursor, sort, limit)
}

// ExtractTopics runs TF-IDF-based keyword extraction and matches against known topics.
func (s *ResonanceService) ExtractTopics(ctx context.Context, postID uuid.UUID, content string) ([]model.TopicTag, error) {
	keywords := extractKeywords(content)
	if len(keywords) == 0 {
		return nil, nil
	}

	tags := make([]model.TopicTag, 0)
	matchCount := 0

	for _, kw := range keywords {
		if matchCount >= 5 {
			break
		}
		matches, err := s.topicRepo.SearchByText(ctx, kw)
		if err != nil {
			continue
		}
		seen := map[string]bool{}
		for _, t := range tags {
			seen[t.Slug] = true
		}
		for _, m := range matches {
			if seen[m.Slug] {
				continue
			}
			relevance := 0.6
			if strings.Contains(strings.ToLower(content), strings.ToLower(m.Name)) {
				relevance = 0.9
			}
			tag := model.TopicTag{Slug: m.Slug, Name: m.Name, Relevance: relevance}
			tags = append(tags, tag)
			seen[m.Slug] = true
			matchCount++

			s.postTopicRepo.Add(ctx, postID, m.ID, relevance, true)
			s.topicRepo.IncrementPostCount(ctx, m.ID)
		}
	}

	// Fallback: assign General topic if nothing matched
	if len(tags) == 0 {
		general, err := s.topicRepo.GetBySlug(ctx, "general")
		if err == nil && general != nil {
			tags = append(tags, model.TopicTag{Slug: "general", Name: "General", Relevance: 0.1})
			s.postTopicRepo.Add(ctx, postID, general.ID, 0.1, true)
			s.topicRepo.IncrementPostCount(ctx, general.ID)
		}
	}

	return tags, nil
}

func (s *ResonanceService) GetPostTopics(ctx context.Context, postID uuid.UUID) ([]model.TopicTag, error) {
	return s.postTopicRepo.GetByPost(ctx, postID)
}

func (s *ResonanceService) GetGraph(ctx context.Context) (*model.GraphResponse, error) {
	topics, err := s.topicRepo.List(ctx)
	if err != nil {
		return nil, model.WrapError("Failed to load topics", 500, err)
	}

	nodes := make([]model.GraphNode, 0, len(topics))
	for _, t := range topics {
		nodes = append(nodes, model.GraphNode{
			ID:   t.Slug,
			Name: t.Name,
			Size: t.PostCount,
		})
	}

	edges, _ := s.topicRepo.GetGraphEdges(ctx)
	if edges == nil {
		edges = make([]model.GraphEdge, 0)
	}

	return &model.GraphResponse{Nodes: nodes, Edges: edges}, nil
}

// --- TF-IDF keyword extraction ---

var stopWords = map[string]bool{
	"a": true, "about": true, "above": true, "after": true, "again": true, "against": true, "all": true,
	"am": true, "an": true, "and": true, "any": true, "are": true, "as": true, "at": true,
	"be": true, "because": true, "been": true, "before": true, "being": true, "below": true, "between": true,
	"both": true, "but": true, "by": true, "can": true, "did": true, "do": true, "does": true,
	"doing": true, "down": true, "during": true, "each": true, "few": true, "for": true, "from": true,
	"further": true, "had": true, "has": true, "have": true, "having": true, "he": true, "her": true,
	"here": true, "hers": true, "herself": true, "him": true, "himself": true, "his": true, "how": true,
	"i": true, "if": true, "in": true, "into": true, "is": true, "it": true, "its": true,
	"itself": true, "just": true, "me": true, "more": true, "most": true, "my": true, "myself": true,
	"no": true, "not": true, "now": true, "of": true, "off": true, "on": true, "once": true,
	"only": true, "or": true, "other": true, "our": true, "ours": true, "ourselves": true, "out": true,
	"over": true, "own": true, "same": true, "she": true, "should": true, "so": true, "some": true,
	"such": true, "than": true, "that": true, "the": true, "their": true, "theirs": true, "them": true,
	"themselves": true, "then": true, "there": true, "these": true, "they": true, "this": true, "those": true,
	"through": true, "to": true, "too": true, "under": true, "until": true, "up": true, "very": true,
	"was": true, "we": true, "were": true, "what": true, "when": true, "where": true, "which": true,
	"while": true, "who": true, "whom": true, "why": true, "will": true, "with": true, "would": true,
	"you": true, "your": true, "yours": true, "yourself": true, "yourselves": true,
	"also": true, "get": true, "got": true, "like": true, "make": true, "one": true, "see": true,
	"think": true, "well": true, "back": true, "even": true, "much": true, "really": true, "still": true,
	"way": true, "going": true, "know": true, "look": true, "need": true, "though": true, "want": true,
}

var nonWord = regexp.MustCompile(`[^a-z0-9]+`)

func extractKeywords(text string) []string {
	text = strings.ToLower(text)
	text = nonWord.ReplaceAllString(text, " ")
	words := strings.Fields(text)

	freq := map[string]int{}
	for _, w := range words {
		if len(w) < 3 {
			continue
		}
		if stopWords[w] {
			continue
		}
		w = stem(w)
		freq[w]++
	}

	type kv struct {
		word string
		freq int
	}
	kvs := make([]kv, 0, len(freq))
	for w, f := range freq {
		kvs = append(kvs, kv{w, f})
	}
	sort.Slice(kvs, func(i, j int) bool { return kvs[i].freq > kvs[j].freq })

	limit := int(math.Min(10, float64(len(kvs))))
	keywords := make([]string, 0, limit)
	for i := 0; i < limit; i++ {
		if kvs[i].freq >= 2 {
			keywords = append(keywords, kvs[i].word)
		}
	}
	return keywords
}

func stem(w string) string {
	for _, suffix := range []string{"ing", "tion", "ment", "ness", "able", "ible", "ful", "less", "ous", "ive", "ize", "ise", "ify", "ed", "er", "est", "es", "s", "ly", "al", "ic", "ish", "y"} {
		if strings.HasSuffix(w, suffix) && len(w)-len(suffix) >= 3 {
			return w[:len(w)-len(suffix)]
		}
	}
	return w
}
