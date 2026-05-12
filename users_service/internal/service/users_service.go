package service

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/google/uuid"

	"github.com/mehdii000/SocialPlatform/users_service/internal/model"
	"github.com/mehdii000/SocialPlatform/users_service/internal/repository"
)

type UsersService struct {
	profileRepo *repository.ProfileRepo
	followRepo  *repository.FollowRepo
	storage     *repository.MinioStorage
}

func NewUsersService(profileRepo *repository.ProfileRepo, followRepo *repository.FollowRepo, storage *repository.MinioStorage) *UsersService {
	return &UsersService{
		profileRepo: profileRepo,
		followRepo:  followRepo,
		storage:     storage,
	}
}

func (s *UsersService) CreateUser(ctx context.Context, userID uuid.UUID, username string) error {
	return s.profileRepo.Create(ctx, userID, username)
}

func (s *UsersService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.Profile, error) {
	p, err := s.profileRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	if p == nil {
		return nil, model.ErrProfileNotFound
	}
	return p, nil
}

func (s *UsersService) GetPublicProfile(ctx context.Context, username string) (*model.PublicProfile, error) {
	p, err := s.profileRepo.GetByUsername(ctx, username)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	if p == nil {
		return nil, model.ErrProfileNotFound
	}
	return &model.PublicProfile{
		UserID:    p.UserID,
		Username:  p.Username,
		Bio:       p.Bio,
		AvatarURL: p.AvatarURL,
	}, nil
}

func (s *UsersService) UpdateProfile(ctx context.Context, userID uuid.UUID, req model.UpdateProfileRequest) (*model.Profile, error) {
	p, err := s.profileRepo.Update(ctx, userID, req.Bio, req.DisplayName)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	if p == nil {
		return nil, model.ErrProfileNotFound
	}
	return p, nil
}

func (s *UsersService) UploadAvatar(ctx context.Context, userID uuid.UUID, file multipart.File, header *multipart.FileHeader) (*model.Profile, error) {
	filename, err := s.storage.UploadAvatar(ctx, file, header)
	if err != nil {
		return nil, model.WrapError("Upload failed", 500, err)
	}

	if err := s.profileRepo.UpdateAvatar(ctx, userID, filename); err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}

	return s.GetProfile(ctx, userID)
}

func (s *UsersService) Search(ctx context.Context, query string, cursor string) (*model.SearchResult, error) {
	result, err := s.profileRepo.Search(ctx, query, cursor, 20)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	return result, nil
}

func (s *UsersService) ListAll(ctx context.Context) ([]model.Profile, error) {
	profiles, err := s.profileRepo.ListAll(ctx)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	return profiles, nil
}

func (s *UsersService) Follow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	if followerID == followeeID {
		return model.NewAppError("Cannot follow yourself", 400)
	}
	if err := s.followRepo.Follow(ctx, followerID, followeeID); err != nil {
		return model.WrapError("Database error", 500, err)
	}
	return nil
}

func (s *UsersService) Unfollow(ctx context.Context, followerID, followeeID uuid.UUID) error {
	if err := s.followRepo.Unfollow(ctx, followerID, followeeID); err != nil {
		return model.WrapError("Database error", 500, err)
	}
	return nil
}

func (s *UsersService) GetFollowers(ctx context.Context, userID uuid.UUID, cursor string) (*model.PaginatedFollows, error) {
	result, err := s.followRepo.GetFollowers(ctx, userID, cursor, 20)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	return result, nil
}

func (s *UsersService) GetFollowing(ctx context.Context, userID uuid.UUID, cursor string) (*model.PaginatedFollows, error) {
	result, err := s.followRepo.GetFollowing(ctx, userID, cursor, 20)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	return result, nil
}

func (s *UsersService) GetFollowerCounts(ctx context.Context, userID uuid.UUID) (followers, following int, err error) {
	followers, err = s.followRepo.CountFollowers(ctx, userID)
	if err != nil {
		return 0, 0, fmt.Errorf("count followers: %w", err)
	}
	following, err = s.followRepo.CountFollowing(ctx, userID)
	if err != nil {
		return 0, 0, fmt.Errorf("count following: %w", err)
	}
	return
}
