#!/bin/bash

# Deploy Instance 3: Temporal Server
# Run this on: 100.25.213.183

set -e

echo "=========================================="
echo "Deploying Instance 3: Temporal Server"
echo "=========================================="

# Update system and install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

echo "Docker installed"

# Run Temporal Server container
docker run -d \
  --name temporal \
  -p 7233:7233 \
  -p 8233:8233 \
  -e DB=postgresql \
  -e DB_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PWD=YourSecurePassword123! \
  -e POSTGRES_SEEDS=org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com \
  temporalio/auto-setup:latest

echo "Temporal Server container started"

# Wait for Temporal to start
sleep 10

# Verify
echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
curl http://localhost:7233
echo ""
echo "=========================================="
echo "Instance 3 Deployment Complete!"
echo "=========================================="
echo "Temporal UI: http://100.25.213.183:8233"
echo "Temporal Server: 100.25.213.183:7233"
