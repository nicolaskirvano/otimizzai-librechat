# LocalStack Configuration and Setup

This directory contains scripts for running LocalStack S3 locally for integration testing.

## Overview

LocalStack provides a local AWS cloud stack for development and testing. This setup is specifically configured for S3 integration tests in LibreChat.

## Prerequisites

1. **Docker** must be installed and running:
   ```bash
   # macOS
   brew install --cask docker

   # Linux
   # Follow: https://docs.docker.com/engine/install/
   ```

2. **AWS CLI** (optional, for manual testing):
   ```bash
   # macOS
   brew install awscli

   # Linux
   pip install awscli
   ```

## Quick Start

```bash
# Navigate to the localstack-config directory
cd localstack-config

# Start LocalStack
./start-localstack.sh

# Run S3 integration tests (from packages/api)
cd ../packages/api
npm run test:s3-integration

# Stop LocalStack when done
cd ../../localstack-config
./stop-localstack.sh
```

## Scripts

- `start-localstack.sh` - Starts LocalStack container and creates test bucket
- `stop-localstack.sh` - Stops and removes LocalStack container

## Configuration

### Default Settings

| Setting | Default Value |
|---------|---------------|
| Port | 4566 |
| Region | us-east-1 |
| Test Bucket | test-bucket |
| Container Name | localstack-s3 |

### Customization

Override defaults with environment variables:

```bash
LOCALSTACK_PORT=4567 TEST_BUCKET=my-bucket ./start-localstack.sh
```

## Environment Variables for Tests

Set these environment variables to run S3 integration tests against LocalStack:

```bash
export AWS_REGION=us-east-1
export AWS_BUCKET_NAME=test-bucket
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_FORCE_PATH_STYLE=true
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

## Using with LibreChat Tests

### Run S3 Integration Tests

```bash
# From packages/api directory
cd packages/api

# Run all S3 integration tests
npm run test:s3-integration
```

### Manual Testing

```bash
# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# Upload a file
aws --endpoint-url=http://localhost:4566 s3 cp test.txt s3://test-bucket/test.txt

# Download a file
aws --endpoint-url=http://localhost:4566 s3 cp s3://test-bucket/test.txt downloaded.txt

# List bucket contents
aws --endpoint-url=http://localhost:4566 s3 ls s3://test-bucket/
```

## Directory Structure

```
localstack-config/
├── README.md              # This file
├── start-localstack.sh    # Start script
├── stop-localstack.sh     # Stop script
└── data/                  # LocalStack data (created automatically)
```

## Troubleshooting

### Container Won't Start

```bash
# Check Docker is running
docker info

# Check port availability
lsof -i :4566

# View container logs
docker logs localstack-s3
```

### Health Check Failed

```bash
# Manual health check
curl http://localhost:4566/_localstack/health

# Should return JSON with s3: "available"
```

### Permission Denied

```bash
# Make scripts executable
chmod +x start-localstack.sh stop-localstack.sh
```

## GitHub Actions Integration

Example workflow step:

```yaml
- name: Start LocalStack
  run: |
    cd localstack-config
    chmod +x start-localstack.sh
    ./start-localstack.sh

- name: Run S3 Integration Tests
  run: |
    cd packages/api
    npm run test:s3-integration
  env:
    AWS_REGION: us-east-1
    AWS_BUCKET_NAME: test-bucket
    AWS_ENDPOINT_URL: http://localhost:4566
    AWS_FORCE_PATH_STYLE: true
    AWS_ACCESS_KEY_ID: test
    AWS_SECRET_ACCESS_KEY: test

- name: Stop LocalStack
  if: always()
  run: |
    cd localstack-config
    ./stop-localstack.sh
```

## Security Note

This setup is designed for **local development and testing only**. LocalStack uses mock AWS credentials and should not be used in production environments.

## Support

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [LocalStack GitHub](https://github.com/localstack/localstack)
- [LibreChat Documentation](https://github.com/danny-avila/LibreChat)
