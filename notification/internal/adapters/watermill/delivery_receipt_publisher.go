package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri/goportal/notification/internal/domain"
)

type DeliveryReceiptPublisher struct {
	publisher message.Publisher
	topic     string
}

func NewDeliveryReceiptPublisher(publisher message.Publisher, topic string) *DeliveryReceiptPublisher {
	return &DeliveryReceiptPublisher{
		publisher: publisher,
		topic:     topic,
	}
}

func (p *DeliveryReceiptPublisher) Publish(ctx context.Context, receipt domain.DeliveryReceiptEvent) error {
	raw, err := json.Marshal(receipt)
	if err != nil {
		return fmt.Errorf("marshal delivery receipt: %w", err)
	}
	msg := message.NewMessage(uuid.NewString(), raw)
	msg.SetContext(ctx)
	return p.publisher.Publish(p.topic, msg)
}
