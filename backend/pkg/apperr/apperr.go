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
	"INVALID_ACTION": {http.StatusBadRequest, "Invalid action"},
	"INTERNAL_ERROR": {http.StatusInternalServerError, "Internal server error"},
	"DB_ERROR":       {http.StatusInternalServerError, "Database error"},
	"UNAUTHORIZED":   {http.StatusUnauthorized, "Unauthorized"},

	// Auth / User
	"USER_NOT_FOUND":           {http.StatusUnauthorized, "User not found"},
	"BAD_CREDENTIALS":          {http.StatusUnauthorized, "Invalid username or password"},
	"TOKEN_FAILED":             {http.StatusInternalServerError, "Failed to generate token"},
	"USERNAME_EXISTS":          {http.StatusConflict, "Username already exists"},
	"CANNOT_FRIEND_SELF":       {http.StatusBadRequest, "You cannot send a friend request to yourself"},
	"CANNOT_BLOCK_SELF":        {http.StatusBadRequest, "You cannot block yourself"},
	"FRIEND_REQUEST_EXISTS":    {http.StatusConflict, "Friend request already exists"},
	"FRIEND_REQUEST_NOT_FOUND": {http.StatusNotFound, "Friend request not found"},
	"ALREADY_FRIENDS":          {http.StatusConflict, "Users are already friends"},
	"RELATIONSHIP_BLOCKED":     {http.StatusForbidden, "Relationship is blocked"},
	"USER_ALREADY_BLOCKED":     {http.StatusConflict, "User is already blocked"},
	"SERVER_NOT_FOUND":         {http.StatusNotFound, "Server not found"},
	"SERVER_MEMBER_NOT_FOUND":  {http.StatusNotFound, "Server member not found"},
	"SERVER_MEMBER_EXISTS":     {http.StatusConflict, "User is already a server member"},
	"NOT_SERVER_MEMBER":        {http.StatusForbidden, "You are not a member of this server"},
	"SERVER_OWNER_REQUIRED":    {http.StatusForbidden, "Only server owner can perform this action"},
	"SERVER_NOT_PUBLIC":        {http.StatusForbidden, "Server is not public"},
	"CANNOT_KICK_OWNER":        {http.StatusBadRequest, "You cannot kick the server owner"},
	"CANNOT_LEAVE_OWNED_SERVER": {
		http.StatusBadRequest,
		"Server owner cannot leave the server",
	},
	"ROLE_NOT_FOUND":                {http.StatusNotFound, "Role not found"},
	"PERMISSION_INVALID":            {http.StatusBadRequest, "Invalid permission value"},
	"DEFAULT_ROLE_DELETE_FORBIDDEN": {http.StatusBadRequest, "Cannot delete @everyone role"},
	"ROLE_ASSIGN_FORBIDDEN":         {http.StatusForbidden, "You are not allowed to update member roles"},
	"INSUFFICIENT_PERMISSION":       {http.StatusForbidden, "Insufficient server permissions"},
	"INVITE_NOT_FOUND":              {http.StatusNotFound, "Invite not found"},
	"INVITE_EXPIRED":                {http.StatusBadRequest, "Invite expired"},
	"INVITE_EXHAUSTED":              {http.StatusBadRequest, "Invite max uses reached"},
	"DEFAULT_ROLE_NOT_FOUND":        {http.StatusBadRequest, "Default server role is not configured"},
	"JOIN_REQUEST_NOT_FOUND":        {http.StatusNotFound, "Join request not found"},
	"JOIN_REQUEST_ALREADY_REVIEWED": {http.StatusBadRequest, "Join request already reviewed"},
	"CHANNEL_NOT_FOUND":             {http.StatusNotFound, "Channel not found"},
	"CHANNEL_TYPE_INVALID":          {http.StatusBadRequest, "Invalid channel type"},
	"CHANNEL_PARENT_INVALID": {
		http.StatusBadRequest,
		"Invalid channel parent, parent must be a category in the same server",
	},
	"CHANNEL_ACCESS_DENIED":      {http.StatusForbidden, "You do not have access to this channel"},
	"INVALID_POSITION":           {http.StatusBadRequest, "Invalid channel position"},
	"INVALID_NOTIFICATION_LEVEL": {http.StatusBadRequest, "Invalid notification level"},
	"MESSAGE_NOT_FOUND":          {http.StatusNotFound, "Message not found"},
	"REACTION_NOT_FOUND":         {http.StatusNotFound, "Reaction not found"},
	"MESSAGE_FORBIDDEN":          {http.StatusForbidden, "You are not allowed to modify this message"},
	"INVALID_MEDIA_TYPE":         {http.StatusBadRequest, "Invalid media type"},
	"FILE_TOO_LARGE":             {http.StatusBadRequest, "File is too large"},
	"FILE_TYPE_NOT_ALLOWED":      {http.StatusBadRequest, "File type is not allowed"},
	"UPLOAD_FAILED":              {http.StatusInternalServerError, "Failed to upload file"},
	"LIVEKIT_NOT_CONFIGURED":     {http.StatusInternalServerError, "LiveKit is not configured"},
	"LIVEKIT_TOKEN_FAILED":       {http.StatusInternalServerError, "Failed to generate LiveKit token"},
	"LIVEKIT_REQUEST_FAILED":     {http.StatusBadGateway, "LiveKit request failed"},
	"LIVEKIT_ROOM_NOT_FOUND":     {http.StatusNotFound, "LiveKit room not found"},
	"LIVEKIT_EGRESS_FAILED":      {http.StatusBadGateway, "LiveKit egress request failed"},
	"LIVEKIT_WEBHOOK_INVALID":    {http.StatusUnauthorized, "Invalid LiveKit webhook signature"},
	"VOICE_CHANNEL_REQUIRED":     {http.StatusBadRequest, "Channel must be a voice channel"},
	"RECORDING_NOT_FOUND":        {http.StatusNotFound, "Recording not found"},
	"RECORDING_ALREADY_ACTIVE":   {http.StatusConflict, "Recording or stream is already active"},
	"INVALID_RTMP_URL":           {http.StatusBadRequest, "Invalid RTMP URL"},
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
