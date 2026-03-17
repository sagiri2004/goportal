package watermilladapter

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/google/uuid"
	"github.com/sagiri/goportal/notification/internal/domain"
)

type DeadLetterPublisher struct {
	publisher message.Publisher
	topic     string
}

func NewDeadLetterPublisher(publisher message.Publisher, topic string) *DeadLetterPublisher {
	return &DeadLetterPublisher{
		publisher: publisher,
		topic:     topic,
	}
}

func (p *DeadLetterPublisher) Publish(ctx context.Context, msg domain.InboundNotification) error {
	raw, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal dlq message: %w", err)
	}
	wmMsg := message.NewMessage(uuid.NewString(), raw)
	wmMsg.SetContext(ctx)
	return p.publisher.Publish(p.topic, wmMsg)
}
