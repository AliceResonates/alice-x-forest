FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod ./
COPY . .
RUN go mod tidy && go build -o /heartbeat .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=builder /heartbeat /heartbeat
CMD ["/heartbeat"]
