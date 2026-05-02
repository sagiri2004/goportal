package domain

import "encoding/json"

type GameRoomRealtimeEvent struct {
	EventID       string          `json:"event_id"`
	EventType     string          `json:"event_type"`
	OccurredAt    string          `json:"occurred_at"`
	GameID        string          `json:"game_id"`
	RoomID        string          `json:"room_id"`
	ActorUserID   string          `json:"actor_user_id"`
	MemberUserIDs []string        `json:"member_user_ids"`
	ChannelID     *string         `json:"channel_id,omitempty"`
	RoomStatus    string          `json:"room_status"`
	StateVersion  int64           `json:"state_version"`
	State         json.RawMessage `json:"state,omitempty"`
}

type OutboundEnvelope struct {
	Type      string          `json:"type"`
	EventID   string          `json:"event_id,omitempty"`
	Timestamp string          `json:"timestamp,omitempty"`
	Payload   json.RawMessage `json:"payload"`
}
