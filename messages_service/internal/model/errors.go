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
	ErrUnauthorized = NewAppError("Unauthorized", 401)
)
