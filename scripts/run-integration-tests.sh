#!/bin/bash

# Script to run integration tests with Docker
# This orchestrates the full test workflow:
# 1. Start hardhat node
# 2. Deploy test contracts
# 3. Run integration tests
# 4. Cleanup

set -e

echo "🚀 Starting Integration Tests..."

# Start hardhat node and deploy contracts
echo "📦 Starting hardhat node via docker-compose..."
docker-compose up -d hardhat-node

# Wait for node to be ready
echo "⏳ Waiting for hardhat node to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while ! docker-compose exec -T hardhat-node wget -q -O - http://localhost:8545 > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Hardhat node failed to start after $MAX_RETRIES attempts"
    docker-compose down -v
    exit 1
  fi
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES..."
  sleep 1
done

echo "✅ Hardhat node is ready"

# Deploy contracts
echo "🔨 Deploying test contracts..."
docker-compose up --build hardhat-deploy

# Run integration tests locally
echo "🧪 Running integration tests..."
pnpm test:integration

# Cleanup
echo "🧹 Cleaning up..."
docker-compose down -v

echo "✅ Integration tests completed successfully!"
