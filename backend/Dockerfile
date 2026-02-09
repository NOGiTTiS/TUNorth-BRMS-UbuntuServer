# Build Stage
FROM golang:1.23-alpine AS builder

# Set working directory
WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
# -o main: naming the output binary "main"
RUN go build -o main .

# Run Stage
FROM alpine:latest

WORKDIR /root/

# Install tzdata for TimeZone support
RUN apk add --no-cache tzdata

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy .env file if used (optional, but in production we use ENV vars)
# COPY .env .

# Expose port (Render sets PORT env var, but good for documentation)
EXPOSE $PORT

# Command to run the executable
CMD ["./main"]
