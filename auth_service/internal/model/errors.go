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

func NewAppErrorWithCode(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, HTTPStatus: status}
}

func WrapError(message string, status int, err error) *AppError {
	return &AppError{Message: message, HTTPStatus: status, Internal: err}
}

var (
	ErrInvalidCredentials = NewAppError("Invalid credentials", 401)
	ErrEmailTaken         = NewAppError("Email already taken", 400)
	ErrUsernameTaken      = NewAppError("Username already taken", 400)
	ErrUserNotFound       = NewAppError("User not found", 404)
	ErrInvalidToken       = NewAppError("Invalid or expired token", 401)
	ErrMissingFields      = NewAppError("Missing required fields", 400)
)
