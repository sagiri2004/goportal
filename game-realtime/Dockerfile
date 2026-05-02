FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/game-realtime ./cmd/game-realtime-server

FROM alpine:3.20
RUN adduser -D appuser
USER appuser
WORKDIR /home/appuser
COPY --from=builder /bin/game-realtime /usr/local/bin/game-realtime
EXPOSE 8091
ENTRYPOINT ["game-realtime"]
