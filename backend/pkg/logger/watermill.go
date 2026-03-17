package logger

import "github.com/ThreeDotsLabs/watermill"

func NewWatermillLogger() watermill.LoggerAdapter {
	return watermill.NewStdLogger(false, false)
}
