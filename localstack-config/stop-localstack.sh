#!/bin/bash

# LocalStack S3 Shutdown Script
# This script stops the LocalStack container

set -e

CONTAINER_NAME="localstack-s3"

echo "Stopping LocalStack S3..."

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" > /dev/null
    echo "Container stopped"
else
    echo "Container is not running"
fi

# Remove container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker rm "$CONTAINER_NAME" > /dev/null
    echo "Container removed"
fi

echo "LocalStack S3 stopped"
