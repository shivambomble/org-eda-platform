#!/bin/bash

# OrgEDA AWS EC2 - Stop All Services
# This script stops all AWS resources for the OrgEDA platform

set -e

echo "=========================================="
echo "OrgEDA - Stopping All Services"
echo "=========================================="
echo ""

# Configuration
CLUSTER_ID="org-eda-cluster"
INSTANCE_IDS=("i-instance1" "i-instance2" "i-instance3" "i-instance4")
REGION="us-east-1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Confirm before stopping
echo -e "${RED}WARNING: This will stop all OrgEDA services.${NC}"
echo "This includes:"
echo "  - 4 EC2 instances"
echo "  - RDS Aurora cluster"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""

# Stop EC2 Instances
echo -e "${YELLOW}Stopping EC2 Instances...${NC}"
aws ec2 stop-instances \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --region $REGION

echo -e "${GREEN}✓ EC2 instances stopping${NC}"
echo ""

# Wait for instances to stop
echo -e "${YELLOW}Waiting for instances to stop (this may take 1-2 minutes)...${NC}"
aws ec2 wait instance-stopped \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --region $REGION

echo -e "${GREEN}✓ All instances stopped${NC}"
echo ""

# Stop RDS
echo -e "${YELLOW}Stopping RDS Aurora Cluster...${NC}"
aws rds stop-db-cluster \
  --db-cluster-identifier $CLUSTER_ID \
  --region $REGION

echo -e "${GREEN}✓ RDS cluster stopping${NC}"
echo ""

# Get instance status
echo -e "${YELLOW}Final status:${NC}"
aws ec2 describe-instances \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],State.Name]' \
  --region $REGION \
  --output table

echo ""
echo -e "${GREEN}=========================================="
echo "All services stopped successfully!"
echo "==========================================${NC}"
echo ""
echo "Cost Savings:"
echo "  - EC2 instances: $0.00/hour (stopped)"
echo "  - RDS cluster: $0.00/hour (stopped)"
echo "  - S3 storage: Still charges (data storage)"
echo ""
echo "To restart services, run: ./start-all.sh"
echo ""
