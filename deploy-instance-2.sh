#!/bin/bash

# Deploy Instance 2: Hasura
# Run this on: 98.88.71.220

set -e

echo "=========================================="
echo "Deploying Instance 2: Hasura"
echo "=========================================="

# Update system and install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

echo "Docker installed"

# Run Hasura container
docker run -d \
  --name hasura \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL="postgresql://postgres:YourSecurePassword123!@org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com:5432/active_check" \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_ADMIN_SECRET="your-hasura-secret-key-here" \
  -e HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"your-jwt-secret-min-32-characters-long-here-12345"}' \
  hasura/graphql-engine:latest

echo "Hasura container started"

# Wait for Hasura to start
sleep 5

# Verify
echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
curl http://localhost:8080/healthz
echo ""
echo "=========================================="
echo "Instance 2 Deployment Complete!"
echo "=========================================="
echo "Hasura Console: http://98.88.71.220:8080/console"
echo "Admin Secret: your-hasura-secret-key-here"
