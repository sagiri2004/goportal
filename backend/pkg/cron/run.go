package cron

import (
	"github.com/sagiri2004/goportal/global"
	"github.com/sagiri2004/goportal/pkg/cron/tasks"
	"go.uber.org/zap"
)

func StartCron() {
	scheduler := NewScheduler(global.Logger)
	for _, task := range generateTasks() {
		if err := scheduler.Register(task); err != nil && global.Logger != nil {
			global.Logger.Error("register cron task failed", zap.Error(err))
		}
	}
	scheduler.Start()
}

func generateTasks() []Task {
	spec := global.Config.Cron.Spec
	if spec == "" {
		spec = "0 1 * * *"
	}
	return []Task{
		tasks.NewDailySlackReportTask(spec),
	}
}
