package serializers

type APIResponse struct {
	Success bool        `json:"success"`
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func Success(code, message string, data interface{}) APIResponse {
	return APIResponse{
		Success: true,
		Code:    code,
		Message: message,
		Data:    data,
	}
}

func Error(code, message string) APIResponse {
	return APIResponse{
		Success: false,
		Code:    code,
		Message: message,
	}
}
