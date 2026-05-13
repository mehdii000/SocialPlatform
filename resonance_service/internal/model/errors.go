package model

type AppError struct {
	Code       string `json:"code,omitempty"`
	Message    string `json:"error"`
	HTTPStatus int    `json:"-"`
	Internal   error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Internal != nil {
		return e.Message + ": " + e.Internal.Error()
	}
	return e.Message
}

func NewAppError(message string, status int) *AppError {
	return &AppError{Message: message, HTTPStatus: status}
}

func WrapError(message string, status int, err error) *AppError {
	return &AppError{Message: message, HTTPStatus: status, Internal: err}
}

var (
	ErrTopicNotFound     = NewAppError("Topic not found", 404)
	ErrInvalidTopicID    = NewAppError("Invalid topic slug", 400)
	ErrMissingPostID     = NewAppError("Post ID is required", 400)
	ErrInvalidPostID     = NewAppError("Invalid post ID", 400)
	ErrForbidden         = NewAppError("You don't have permission to perform this action", 403)
	ErrMissingAuth       = NewAppError("Authentication required", 401)
	ErrInvalidAction     = NewAppError("Invalid action. Must be one of: like, comment, create", 400)
	ErrInvalidRequest    = NewAppError("Request body must be JSON", 400)
)
