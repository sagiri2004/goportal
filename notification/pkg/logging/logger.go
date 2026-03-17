package logging

import (
	"log"
	"os"
)

func New() *log.Logger {
	return log.New(os.Stdout, "[notification] ", log.LstdFlags|log.Lmicroseconds)
}
