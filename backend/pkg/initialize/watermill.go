package initialize

import (
	"github.com/ThreeDotsLabs/watermill"
	"github.com/ThreeDotsLabs/watermill/message"
	"github.com/ThreeDotsLabs/watermill/pubsub/gochannel"
	"github.com/sagiri2004/goportal/global"
	pkgglobal "github.com/sagiri2004/goportal/pkg/global"
)

func InitWatermill() error {
	logger := watermill.NewStdLogger(false, false)
	pubsub := gochannel.NewGoChannel(gochannel.Config{}, logger)
	router, err := message.NewRouter(message.RouterConfig{}, logger)
	if err != nil {
		_ = pubsub.Close()
		return err
	}

	global.Publisher = pubsub
	pkgglobal.Publisher = pubsub
	global.Subscriber = pubsub
	global.WMRouter = router
	return nil
}
