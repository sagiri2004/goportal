package scripts

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/models"
	"github.com/sagiri2004/goportal/pkg/notification"
)

func PublishWatermillSmokeEvent(ctx context.Context) error {
	if global.Publisher == nil {
		return fmt.Errorf("watermill publisher is not initialized")
	}

	event := models.ChatMessageCreatedEvent{
		EventID:    uuid.NewString(),
		EventType:  "CHAT_MESSAGE_CREATED",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		ChannelID:  "test-channel",
		AuthorID:   "test-user",
		MessageID:  uuid.NewString(),
		Content: models.MessageContentEnvelope{
			Type:     "text/plain",
			Payload:  json.RawMessage(`"watermill smoke test"`),
			Encoding: "utf-8",
		},
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal smoke event: %w", err)
	}

	msg := message.NewMessage(event.EventID, payload)
	msg.SetContext(ctx)
	return global.Publisher.Publish(notification.NewMessageTopic, msg)
}

func PublishNotificationDeliveryReceipt(
	ctx context.Context,
	eventID, userID, deliveryType string,
) error {
	if global.Publisher == nil {
		return fmt.Errorf("watermill publisher is not initialized")
	}
	if eventID == "" || userID == "" || deliveryType == "" {
		return fmt.Errorf("eventID, userID and deliveryType are required")
	}

	receipt := models.NotificationDeliveryEvent{
		EventID:      eventID,
		UserID:       userID,
		DeliveryType: deliveryType,
		DeliveredAt:  time.Now().Unix(),
	}
	payload, err := json.Marshal(receipt)
	if err != nil {
		return fmt.Errorf("marshal delivery receipt: %w", err)
	}

	msg := message.NewMessage(uuid.NewString(), payload)
	msg.SetContext(ctx)
	return global.Publisher.Publish(notification.DeliveryReceiptTopic, msg)
}
