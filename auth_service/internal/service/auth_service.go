package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/mehdii000/SocialPlatform/auth_service/internal/model"
	"github.com/mehdii000/SocialPlatform/auth_service/internal/repository"
)

const (
	accessTokenTTL  = 15 * time.Minute
	refreshTokenTTL = 7 * 24 * time.Hour
	bcryptCost      = 12
)

type UsersClient interface {
	CreateUser(ctx context.Context, userID uuid.UUID, username string) error
}

type AuthService struct {
	userRepo    *repository.UserRepo
	tokenRepo   *repository.TokenRepo
	jwtSecret   []byte
	usersClient UsersClient
}

func NewAuthService(userRepo *repository.UserRepo, tokenRepo *repository.TokenRepo, jwtSecret string, usersClient UsersClient) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		tokenRepo:   tokenRepo,
		jwtSecret:   []byte(jwtSecret),
		usersClient: usersClient,
	}
}

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (uuid.UUID, error) {
	taken, err := s.userRepo.IsUsernameTaken(ctx, req.Username)
	if err != nil {
		return uuid.Nil, model.WrapError("Database error", 500, err)
	}
	if taken {
		return uuid.Nil, model.ErrUsernameTaken
	}

	taken, err = s.userRepo.IsEmailTaken(ctx, req.Email)
	if err != nil {
		return uuid.Nil, model.WrapError("Database error", 500, err)
	}
	if taken {
		return uuid.Nil, model.ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return uuid.Nil, model.WrapError("Internal error", 500, err)
	}

	user, err := s.userRepo.Create(ctx, req.Username, req.Email, string(hash))
	if err != nil {
		return uuid.Nil, model.WrapError("Failed to create user", 500, err)
	}

	if s.usersClient != nil {
		if err := s.usersClient.CreateUser(ctx, user.ID, user.Username); err != nil {
			s.userRepo.Delete(ctx, user.ID)
			return uuid.Nil, model.WrapError("Failed to create user profile", 500, err)
		}
	}

	return user.ID, nil
}

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.TokenResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	if user == nil {
		return nil, model.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, model.ErrInvalidCredentials
	}

	return s.generateTokens(user.ID)
}

func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (*model.TokenResponse, error) {
	tokenHash := hashToken(rawRefreshToken)

	stored, err := s.tokenRepo.GetByHash(ctx, tokenHash)
	if err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}
	if stored == nil {
		return nil, model.ErrInvalidToken
	}

	if err := s.tokenRepo.DeleteByHash(ctx, tokenHash); err != nil {
		return nil, model.WrapError("Database error", 500, err)
	}

	return s.generateTokens(stored.UserID)
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	tokenHash := hashToken(rawRefreshToken)
	return s.tokenRepo.DeleteByHash(ctx, tokenHash)
}

func (s *AuthService) GetUsername(ctx context.Context, userID uuid.UUID) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", model.WrapError("Database error", 500, err)
	}
	if user == nil {
		return "", model.ErrInvalidCredentials
	}
	return user.Username, nil
}

func (s *AuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, model.ErrInvalidToken
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return uuid.Nil, model.ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil, model.ErrInvalidToken
	}

	sub, err := claims.GetSubject()
	if err != nil {
		return uuid.Nil, model.ErrInvalidToken
	}

	userID, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, model.ErrInvalidToken
	}

	return userID, nil
}

func (s *AuthService) generateTokens(userID uuid.UUID) (*model.TokenResponse, error) {
	accessToken, err := s.generateAccessToken(userID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(userID)
	if err != nil {
		return nil, err
	}

	return &model.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *AuthService) generateAccessToken(userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID.String(),
		"iat": now.Unix(),
		"exp": now.Add(accessTokenTTL).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) generateRefreshToken(userID uuid.UUID) (string, error) {
	raw := uuid.New().String()
	tokenHash := hashToken(raw)
	expiresAt := time.Now().Add(refreshTokenTTL)

	if _, err := s.tokenRepo.Create(context.Background(), userID, tokenHash, expiresAt); err != nil {
		return "", model.WrapError("Failed to store refresh token", 500, err)
	}

	return raw, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
