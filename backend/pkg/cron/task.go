package cron

import (
	"context"

	"go.uber.org/zap"
	cronv3 "github.com/robfig/cron/v3"
)

// Task defines the behavior of a scheduled unit of work.
type Task interface {
	Name() string
	Spec() string
	Run(ctx context.Context) error
}

type Scheduler struct {
	cron   *cronv3.Cron
	logger *zap.Logger
}

func NewScheduler(logger *zap.Logger) *Scheduler {
	return &Scheduler{
		cron: cronv3.New(),
		logger: logger,
	}
}

func (s *Scheduler) Register(task Task) error {
	_, err := s.cron.AddFunc(task.Spec(), func() {
		if s.logger != nil {
			s.logger.Info("cron task started", zap.String("task", task.Name()))
		}
		if err := task.Run(context.Background()); err != nil && s.logger != nil {
			s.logger.Error("cron task failed", zap.String("task", task.Name()), zap.Error(err))
		}
	})
	return err
}

func (s *Scheduler) Start() {
	s.cron.Start()
}
