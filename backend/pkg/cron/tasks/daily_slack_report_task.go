package tasks

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"goportal/global"
	customlogger "goportal/pkg/logger"
	"goportal/pkg/models"
)

type DailySlackReportTask struct {
	spec string
}

func NewDailySlackReportTask(spec string) *DailySlackReportTask {
	return &DailySlackReportTask{spec: spec}
}

func (t *DailySlackReportTask) Name() string {
	return "daily_slack_report"
}

func (t *DailySlackReportTask) Spec() string {
	return t.spec
}

func (t *DailySlackReportTask) Run(ctx context.Context) error {
	var count int64
	if err := global.DB.WithContext(ctx).Model(&models.User{}).Count(&count).Error; err != nil {
		return err
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	message := fmt.Sprintf(
		"*Daily Report* (%s)\n- users: %d\n- goroutines: %d\n- alloc: %.2f MB",
		time.Now().Format(time.RFC3339),
		count,
		runtime.NumGoroutine(),
		float64(m.Alloc)/1024.0/1024.0,
	)

	webhook := global.Config.Slack.WebhookURL
	if webhook == "" {
		webhook = global.Config.Logger.SlackHookURL
	}
	return customlogger.SendSlack(webhook, message)
}

