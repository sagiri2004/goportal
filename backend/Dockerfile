FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/backend .

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /out/backend /usr/local/bin/backend
COPY configs /app/configs
COPY migrations /app/migrations

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/backend"]
