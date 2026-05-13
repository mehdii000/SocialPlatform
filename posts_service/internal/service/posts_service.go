package service

import (
	"context"
	"mime/multipart"

	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/posts_service/internal/model"
	"github.com/mehdii000/SocialPlatform/posts_service/internal/repository"
)

type PostsService struct {
	postRepo    *repository.PostRepo
	likeRepo    *repository.LikeRepo
	commentRepo *repository.CommentRepo
	storage     *repository.MinioStorage
}

func NewPostsService(postRepo *repository.PostRepo, likeRepo *repository.LikeRepo, commentRepo *repository.CommentRepo, storage *repository.MinioStorage) *PostsService {
	return &PostsService{
		postRepo:    postRepo,
		likeRepo:    likeRepo,
		commentRepo: commentRepo,
		storage:     storage,
	}
}

func (s *PostsService) CreatePost(ctx context.Context, authorID uuid.UUID, content string, imageFile multipart.File, imageHeader *multipart.FileHeader) (*model.Post, error) {
	var mediaURL string
	mediaType := 0
	if imageFile != nil {
		filename, err := s.storage.UploadImage(ctx, imageFile, imageHeader)
		if err != nil {
			return nil, model.WrapError("File upload failed", 500, err)
		}
		mediaURL = filename
		mediaType = 1
	}

	post, err := s.postRepo.Create(ctx, authorID, content, mediaURL, mediaType)
	if err != nil {
		return nil, model.WrapError("Database saving failed", 500, err)
	}
	return post, nil
}

func (s *PostsService) GetPost(ctx context.Context, postID, viewerID uuid.UUID) (*model.Post, error) {
	post, err := s.postRepo.GetByID(ctx, postID, viewerID)
	if err != nil {
		return nil, model.WrapError("Could not retrieve post", 500, err)
	}
	if post == nil {
		return nil, model.ErrPostNotFound
	}
	return post, nil
}

func (s *PostsService) DeletePost(ctx context.Context, postID, authorID uuid.UUID) error {
	deleted, err := s.postRepo.Delete(ctx, postID, authorID)
	if err != nil {
		return model.WrapError("Failed to delete post", 500, err)
	}
	if !deleted {
		return model.ErrForbidden
	}
	return nil
}

func (s *PostsService) ToggleLike(ctx context.Context, userID, postID uuid.UUID) (*model.LikeResponse, error) {
	liked, count, err := s.likeRepo.Toggle(ctx, userID, postID)
	if err != nil {
		return nil, model.WrapError("Failed to process like/unlike", 500, err)
	}

	msg := "Post unliked successfully"
	if liked {
		msg = "Post liked successfully"
	}
	return &model.LikeResponse{Message: msg, LikesCount: count}, nil
}

func (s *PostsService) GetFeed(ctx context.Context, viewerID uuid.UUID, cursor string) (*model.PaginatedPosts, error) {
	result, err := s.postRepo.GetFeed(ctx, viewerID, cursor, 10)
	if err != nil {
		return nil, model.WrapError("Could not retrieve posts", 500, err)
	}
	return result, nil
}

func (s *PostsService) GetAllPosts(ctx context.Context, viewerID uuid.UUID, cursor string) (*model.PaginatedPosts, error) {
	result, err := s.postRepo.GetAllPosts(ctx, viewerID, cursor, 10)
	if err != nil {
		return nil, model.WrapError("Could not retrieve posts", 500, err)
	}
	return result, nil
}

func (s *PostsService) GetPostsByUser(ctx context.Context, authorID, viewerID uuid.UUID, cursor string) (*model.PaginatedPosts, error) {
	result, err := s.postRepo.GetPostsByUser(ctx, authorID, viewerID, cursor, 10)
	if err != nil {
		return nil, model.WrapError("Could not retrieve posts", 500, err)
	}
	return result, nil
}

func (s *PostsService) CreateComment(ctx context.Context, postID, authorID uuid.UUID, content string) (*model.Comment, error) {
	comment, err := s.commentRepo.Create(ctx, postID, authorID, content)
	if err != nil {
		return nil, model.WrapError("Failed to create comment", 500, err)
	}
	return comment, nil
}

func (s *PostsService) GetComments(ctx context.Context, postID uuid.UUID, cursor string) (*model.PaginatedComments, error) {
	result, err := s.commentRepo.GetByPost(ctx, postID, cursor, 20)
	if err != nil {
		return nil, model.WrapError("Could not retrieve comments", 500, err)
	}
	return result, nil
}

func (s *PostsService) DeleteComment(ctx context.Context, commentID, authorID uuid.UUID) error {
	deleted, err := s.commentRepo.Delete(ctx, commentID, authorID)
	if err != nil {
		return model.WrapError("Failed to delete comment", 500, err)
	}
	if !deleted {
		return model.ErrForbidden
	}
	return nil
}
