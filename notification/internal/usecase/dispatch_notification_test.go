package usecase

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/sagiri/goportal/notification/internal/domain"
)

type mockPresence struct {
	serverID string
}

func (m *mockPresence) SetUserServer(context.Context, string, string) error { return nil }
func (m *mockPresence) DeleteUser(context.Context, string) error            { return nil }
func (m *mockPresence) GetServerByUser(context.Context, string) (string, error) {
	return m.serverID, nil
}

type mockSocket struct {
	sent bool
}

func (m *mockSocket) SendToUser(string, domain.OutboundNotification) error {
	m.sent = true
	return nil
}
func (m *mockSocket) RegisterUser(context.Context, string) error   { return nil }
func (m *mockSocket) UnregisterUser(context.Context, string) error { return nil }

type mockRemote struct {
	sent bool
}

func (m *mockRemote) PublishToServer(context.Context, string, domain.OutboundNotification) error {
	m.sent = true
	return nil
}

type mockDLQ struct {
	sent bool
}

func (m *mockDLQ) Publish(context.Context, domain.InboundNotification) error {
	m.sent = true
	return nil
}

type mockReceipt struct {
	sent bool
}

func (m *mockReceipt) Publish(context.Context, domain.DeliveryReceiptEvent) error {
	m.sent = true
	return nil
}

func TestDispatchNotification_HandleInbound(t *testing.T) {
	payload := json.RawMessage(`{"title":"hello"}`)
	in := domain.InboundNotification{
		UserID:         "u1",
		MessagePayload: payload,
		Priority:       "NORMAL",
	}

	t.Run("send local socket", func(t *testing.T) {
		p := &mockPresence{serverID: "s1"}
		s := &mockSocket{}
		r := &mockRemote{}
		d := &mockDLQ{}
		rc := &mockReceipt{}

		u := NewDispatchNotification("s1", p, s, r, d, rc)
		if err := u.HandleInbound(context.Background(), in); err != nil {
			t.Fatalf("expected nil err, got %v", err)
		}
		if !s.sent {
			t.Fatalf("expected local send")
		}
	})

	t.Run("send remote server", func(t *testing.T) {
		p := &mockPresence{serverID: "s2"}
		s := &mockSocket{}
		r := &mockRemote{}
		d := &mockDLQ{}
		rc := &mockReceipt{}

		u := NewDispatchNotification("s1", p, s, r, d, rc)
		if err := u.HandleInbound(context.Background(), in); err != nil {
			t.Fatalf("expected nil err, got %v", err)
		}
		if !r.sent {
			t.Fatalf("expected remote publish")
		}
	})

	t.Run("offline goes dlq", func(t *testing.T) {
		p := &mockPresence{serverID: ""}
		s := &mockSocket{}
		r := &mockRemote{}
		d := &mockDLQ{}
		rc := &mockReceipt{}

		u := NewDispatchNotification("s1", p, s, r, d, rc)
		if err := u.HandleInbound(context.Background(), in); err != nil {
			t.Fatalf("expected nil err, got %v", err)
		}
		if !d.sent {
			t.Fatalf("expected dlq publish")
		}
	})
}
