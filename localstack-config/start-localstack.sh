#!/bin/bash

# LocalStack S3 Startup Script
# This script starts LocalStack for S3 integration testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CONTAINER_NAME="localstack-s3"
LOCALSTACK_PORT="${LOCALSTACK_PORT:-4566}"
LOCALSTACK_IMAGE="localstack/localstack:4.3"
TEST_BUCKET="${TEST_BUCKET:-test-bucket}"

echo "Starting LocalStack S3..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first:"
    echo "  macOS: brew install --cask docker"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if container is already running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "LocalStack is already running"
    # Ensure bucket exists
    curl -s -X PUT "http://localhost:${LOCALSTACK_PORT}/${TEST_BUCKET}" > /dev/null
    echo ""
    echo "Usage:"
    echo "  AWS endpoint: http://localhost:${LOCALSTACK_PORT}"
    echo "  Test bucket: ${TEST_BUCKET}"
    echo "  Stop: ./stop-localstack.sh"
    exit 0
fi

# Remove stopped container if exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing stopped LocalStack container..."
    docker rm "$CONTAINER_NAME" > /dev/null
fi

# Create data directory
mkdir -p data

# Start LocalStack container
echo "Starting LocalStack container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "${LOCALSTACK_PORT}:4566" \
    -e SERVICES=s3 \
    -e DEBUG=0 \
    -e AWS_DEFAULT_REGION=us-east-1 \
    -v "${SCRIPT_DIR}/data:/var/lib/localstack" \
    -v /var/run/docker.sock:/var/run/docker.sock \
    "$LOCALSTACK_IMAGE"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "http://localhost:${LOCALSTACK_PORT}/_localstack/health" | grep -q '"s3": "available"'; then
        echo "LocalStack S3 is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "LocalStack failed to start within timeout"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# Create test bucket using curl (works without AWS CLI)
echo "Creating test bucket: ${TEST_BUCKET}..."
curl -s -X PUT "http://localhost:${LOCALSTACK_PORT}/${TEST_BUCKET}" > /dev/null
echo "Bucket created: ${TEST_BUCKET}"

echo ""
echo "LocalStack S3 ready!"
echo ""
echo "Usage:"
echo "  AWS endpoint: http://localhost:${LOCALSTACK_PORT}"
echo "  Test bucket: ${TEST_BUCKET}"
echo "  Region: us-east-1"
echo ""
echo "Environment variables for tests:"
echo "  export AWS_REGION=us-east-1"
echo "  export AWS_BUCKET_NAME=${TEST_BUCKET}"
echo "  export AWS_ENDPOINT_URL=http://localhost:${LOCALSTACK_PORT}"
echo "  export AWS_FORCE_PATH_STYLE=true"
echo "  export AWS_ACCESS_KEY_ID=test"
echo "  export AWS_SECRET_ACCESS_KEY=test"
echo ""
echo "Stop: ./stop-localstack.sh"
