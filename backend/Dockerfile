# Build Stage
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build เป็น Binary ไฟล์เดียว เล็กและเร็ว
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o main .

# Run Stage
FROM alpine:latest
WORKDIR /app
# ติดตั้ง Timezone ไทย
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok

COPY --from=builder /app/main .
# ถ้ามีไฟล์ .env หรือ config ให้ copy มาด้วย หรือใช้ Docker ENV

EXPOSE 8080
CMD ["./main"]
