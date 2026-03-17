package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/sagiri/goportal/notification/internal/domain"
	"github.com/sagiri/goportal/notification/internal/ports"
)

type DispatchNotification struct {
	serverID   string
	presence   ports.PresenceRepository
	sockets    ports.SocketManager
	remotePub  ports.DistributedPublisher
	dlqPub     ports.DeadLetterPublisher
	receiptPub ports.DeliveryReceiptPublisher
}

func debugLogDispatch(hypothesisID, location, message string, data map[string]any) {
	// #region agent log
	entry := map[string]any{
		"sessionId":    "6670b5",
		"runId":        "pre-fix",
		"hypothesisId": hypothesisID,
		"location":     location,
		"message":      message,
		"data":         data,
		"timestamp":    time.Now().UnixMilli(),
	}
	if b, err := json.Marshal(entry); err == nil {
		if f, err := os.OpenFile("/home/sagiri/Code/goportal/.cursor/debug-6670b5.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644); err == nil {
			_, _ = f.Write(append(b, '\n'))
			_ = f.Close()
		}
	}
	// #endregion
}

func NewDispatchNotification(
	serverID string,
	presence ports.PresenceRepository,
	sockets ports.SocketManager,
	remotePub ports.DistributedPublisher,
	dlqPub ports.DeadLetterPublisher,
	receiptPub ports.DeliveryReceiptPublisher,
) *DispatchNotification {
	return &DispatchNotification{
		serverID:   serverID,
		presence:   presence,
		sockets:    sockets,
		remotePub:  remotePub,
		dlqPub:     dlqPub,
		receiptPub: receiptPub,
	}
}

func (u *DispatchNotification) publishReceipt(
	ctx context.Context,
	userID, eventID string,
	deliveryType domain.DeliveryType,
	err error,
) {
	if u.receiptPub == nil || eventID == "" {
		return
	}
	receipt := domain.DeliveryReceiptEvent{
		EventID:      eventID,
		UserID:       userID,
		ServerID:     u.serverID,
		DeliveryType: deliveryType,
		DeliveredAt:  time.Now().Unix(),
	}
	if err != nil {
		receipt.ErrorMessage = err.Error()
	}
	if pubErr := u.receiptPub.Publish(ctx, receipt); pubErr != nil {
		log.Printf("[notification] publish receipt failed event_id=%s user_id=%s type=%s err=%v", eventID, userID, deliveryType, pubErr)
		return
	}
	log.Printf("[notification] published receipt event_id=%s user_id=%s type=%s", eventID, userID, deliveryType)
}

func (u *DispatchNotification) HandleInbound(ctx context.Context, in domain.InboundNotification) error {
	debugLogDispatch("H3", "notification/internal/usecase/dispatch_notification.go:63", "handle_inbound_entry", map[string]any{
		"user_id":       in.UserID,
		"event_id":      in.EventID,
		"priority":      in.Priority,
		"payload_bytes": len(in.MessagePayload),
	})

	if in.UserID == "" {
		return errors.New("inbound notification missing user_id")
	}
	log.Printf("[notification] inbound received event_id=%s user_id=%s payload_bytes=%d", in.EventID, in.UserID, len(in.MessagePayload))
	if len(in.MessagePayload) == 0 {
		return errors.New("inbound notification missing message_payload")
	}

	out := domain.OutboundNotification{
		Type:      "POPUP",
		UserID:    in.UserID,
		Payload:   in.MessagePayload,
		Priority:  in.Priority,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		EventID:   in.EventID,
	}

	serverID, err := u.presence.GetServerByUser(ctx, in.UserID)
	if err != nil {
		return fmt.Errorf("lookup presence: %w", err)
	}
	log.Printf("[notification] presence resolved event_id=%s user_id=%s target_server=%s node=%s", in.EventID, in.UserID, serverID, u.serverID)
	debugLogDispatch("H4", "notification/internal/usecase/dispatch_notification.go:87", "presence_lookup_result", map[string]any{
		"user_id":                   in.UserID,
		"resolved_server_id":        serverID,
		"current_notification_node": u.serverID,
	})
	if serverID == "" {
		offlineErr := errors.New("user offline, routed to dlq")
		u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeFailed, offlineErr)
		if u.dlqPub == nil {
			return nil
		}
		return u.dlqPub.Publish(ctx, in)
	}

	if serverID == u.serverID {
		if err := u.sockets.SendToUser(in.UserID, out); err != nil {
			log.Printf("[notification] local send failed event_id=%s user_id=%s err=%v", in.EventID, in.UserID, err)
			u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeFailed, err)
			return err
		}
		log.Printf("[notification] local send success event_id=%s user_id=%s", in.EventID, in.UserID)
		u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeToServer, nil)
		u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeToClient, nil)
		return nil
	}
	if err := u.remotePub.PublishToServer(ctx, serverID, out); err != nil {
		log.Printf("[notification] remote publish failed event_id=%s user_id=%s target_server=%s err=%v", in.EventID, in.UserID, serverID, err)
		u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeFailed, err)
		return err
	}
	log.Printf("[notification] remote publish success event_id=%s user_id=%s target_server=%s", in.EventID, in.UserID, serverID)
	u.publishReceipt(ctx, in.UserID, in.EventID, domain.DeliveryTypeToServer, nil)
	return nil
}
