package apperr

import (
	"errors"
	"fmt"
	"net/http"
)

type errDef struct {
	HTTPCode int
	Message  string
}

var registry = map[string]errDef{
	// Generic
	"INVALID_JSON":   {http.StatusBadRequest, "Invalid JSON payload"},
	"MISSING_FIELDS": {http.StatusBadRequest, "Missing required fields"},
	"INTERNAL_ERROR": {http.StatusInternalServerError, "Internal server error"},
	"DB_ERROR":       {http.StatusInternalServerError, "Database error"},

	// Auth / User
	"USER_NOT_FOUND":  {http.StatusUnauthorized, "User not found"},
	"BAD_CREDENTIALS": {http.StatusUnauthorized, "Invalid username or password"},
	"TOKEN_FAILED":    {http.StatusInternalServerError, "Failed to generate token"},
	"USERNAME_EXISTS": {http.StatusConflict, "Username already exists"},
}

type AppError struct {
	HTTPCode int
	Code     string
	Message  string
	Err      error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Err }

func E(code string, cause error) *AppError {
	def, ok := registry[code]
	if !ok {
		def = errDef{http.StatusInternalServerError, "An unexpected error occurred"}
	}
	return &AppError{HTTPCode: def.HTTPCode, Code: code, Message: def.Message, Err: cause}
}

func From(err error) (*AppError, bool) {
	var ae *AppError
	if errors.As(err, &ae) {
		return ae, true
	}
	return nil, false
}
