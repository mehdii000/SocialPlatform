FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /service ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache curl ca-certificates
COPY --from=builder /service /service
EXPOSE 8005
ENTRYPOINT ["/service"]
