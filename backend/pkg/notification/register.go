package notification

import (
	"errors"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/sagiri2004/goportal/pkg/containers"
)

const NewMessageTopic = "chat.message.created"
const DeliveryReceiptTopic = "notification_delivery_topic"

func RegisterHandlers(router *message.Router, subscriber message.Subscriber) error {
	if router == nil {
		return errors.New("watermill router is nil")
	}
	if subscriber == nil {
		return errors.New("watermill subscriber is nil")
	}

	handler := NewHandler(containers.NotificationService())

	router.AddNoPublisherHandler(
		"notification_new_message_consumer",
		NewMessageTopic,
		subscriber,
		handler.HandleNewMessage,
	)
	router.AddNoPublisherHandler(
		"notification_delivery_receipt_consumer",
		DeliveryReceiptTopic,
		subscriber,
		handler.HandleDeliveryReceipt,
	)
	return nil
}
