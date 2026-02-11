#!/bin/bash

# OrgEDA AWS EC2 - Start All Services
# This script starts all AWS resources for the OrgEDA platform

set -e

echo "=========================================="
echo "OrgEDA - Starting All Services"
echo "=========================================="
echo ""

# Configuration
CLUSTER_ID="org-eda-cluster"
INSTANCE_IDS=("i-instance1" "i-instance2" "i-instance3" "i-instance4")
REGION="us-east-1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Start RDS
echo -e "${YELLOW}Starting RDS Aurora Cluster...${NC}"
aws rds start-db-cluster \
  --db-cluster-identifier $CLUSTER_ID \
  --region $REGION

echo -e "${GREEN}✓ RDS cluster starting${NC}"
echo ""

# Start EC2 Instances
echo -e "${YELLOW}Starting EC2 Instances...${NC}"
aws ec2 start-instances \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --region $REGION

echo -e "${GREEN}✓ EC2 instances starting${NC}"
echo ""

# Wait for instances to be running
echo -e "${YELLOW}Waiting for instances to be running (this may take 1-2 minutes)...${NC}"
aws ec2 wait instance-running \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --region $REGION

echo -e "${GREEN}✓ All instances are running${NC}"
echo ""

# Get instance IPs
echo -e "${YELLOW}Getting instance details...${NC}"
aws ec2 describe-instances \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress,State.Name]' \
  --region $REGION \
  --output table

echo ""
echo -e "${GREEN}=========================================="
echo "All services started successfully!"
echo "==========================================${NC}"
echo ""
echo "Access Points:"
echo "  Frontend:       http://<instance1-ip>"
echo "  Backend API:    http://<instance1-ip>:4000"
echo "  Hasura Console: http://<instance2-ip>:8080/console"
echo "  Temporal UI:    http://<instance3-ip>:8233"
echo ""
echo "Note: Services may take a few minutes to fully initialize."
echo ""
