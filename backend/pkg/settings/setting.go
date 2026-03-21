package setting

type ServerConfig struct {
	Port      int    `mapstructure:"port" yaml:"port"`
	Mode      string `mapstructure:"mode" yaml:"mode"`
	JwtSecret string `mapstructure:"jwt_secret" yaml:"jwt_secret"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr" yaml:"addr"`
	Address  string `mapstructure:"address" yaml:"address"`
	Password string `mapstructure:"password" yaml:"password"`
	DB       int    `mapstructure:"db" yaml:"db"`
}

type LiveKitConfig struct {
	URL       string `mapstructure:"url" yaml:"url"`
	APIKey    string `mapstructure:"api_key" yaml:"api_key"`
	APISecret string `mapstructure:"api_secret" yaml:"api_secret"`
}

type RabbitMQConfig struct {
	URL string `mapstructure:"url" yaml:"url"`
}

type LoggerSetting struct {
	LogLevel     string `mapstructure:"log_level" yaml:"log_level"`
	SlackHookURL string `mapstructure:"slack_hook_url" yaml:"slack_hook_url"`
}

type DatabaseConfig struct {
	Engine       string `mapstructure:"engine" yaml:"engine"`
	DSN          string `mapstructure:"dsn" yaml:"dsn"`
	MigrationDir string `mapstructure:"migration_dir" yaml:"migration_dir"`
}

type CronSetting struct {
	Enabled bool   `mapstructure:"enabled" yaml:"enabled"`
	Spec    string `mapstructure:"spec" yaml:"spec"`
}

type SlackSetting struct {
	WebhookURL string `mapstructure:"webhook_url" yaml:"webhook_url"`
}

type CloudinaryConfig struct {
	CloudName string `mapstructure:"cloud_name" yaml:"cloud_name"`
	APIKey    string `mapstructure:"api_key" yaml:"api_key"`
	APISecret string `mapstructure:"api_secret" yaml:"api_secret"`
	Folder    string `mapstructure:"folder" yaml:"folder"`
}

type Config struct {
	Server     ServerConfig     `mapstructure:"server" yaml:"server"`
	Redis      RedisConfig      `mapstructure:"redis" yaml:"redis"`
	RabbitMQ   RabbitMQConfig   `mapstructure:"rabbitmq" yaml:"rabbitmq"`
	LiveKit    LiveKitConfig    `mapstructure:"livekit" yaml:"livekit"`
	Logger     LoggerSetting    `mapstructure:"logger" yaml:"logger"`
	Database   DatabaseConfig   `mapstructure:"database" yaml:"database"`
	Cron       CronSetting      `mapstructure:"cron" yaml:"cron"`
	Slack      SlackSetting     `mapstructure:"slack" yaml:"slack"`
	Cloudinary CloudinaryConfig `mapstructure:"cloudinary" yaml:"cloudinary"`
}

var AppConfig Config
