#!/bin/bash

# OrgEDA AWS EC2 - Check Status
# This script checks the status of all AWS resources

set -e

echo "=========================================="
echo "OrgEDA - Service Status"
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

# Check EC2 Instances
echo -e "${YELLOW}EC2 Instances:${NC}"
aws ec2 describe-instances \
  --instance-ids "${INSTANCE_IDS[@]}" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],State.Name,PublicIpAddress,InstanceType]' \
  --region $REGION \
  --output table

echo ""

# Check RDS Cluster
echo -e "${YELLOW}RDS Aurora Cluster:${NC}"
aws rds describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --query 'DBClusters[].[DBClusterIdentifier,Status,Engine,EngineVersion]' \
  --region $REGION \
  --output table

echo ""

# Check RDS Instance
echo -e "${YELLOW}RDS Aurora Instance:${NC}"
aws rds describe-db-instances \
  --db-instance-identifier org-eda-instance-1 \
  --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceStatus,DBInstanceClass,Engine]' \
  --region $REGION \
  --output table

echo ""

# Calculate estimated costs
echo -e "${YELLOW}Estimated Monthly Costs (8h/day):${NC}"
echo "  EC2 Instance 1 (Frontend + Backend):  $2.50"
echo "  EC2 Instance 2 (Hasura):              $2.50"
echo "  EC2 Instance 3 (Temporal Server):     $2.50"
echo "  EC2 Instance 4 (Temporal Worker):     $2.50"
echo "  RDS Aurora:                           $14.40"
echo "  S3 Storage:                           $3-4.00"
echo "  Data Transfer:                        $0.45"
echo "  ─────────────────────────────────────────"
echo "  TOTAL:                                $28.35"
echo ""

echo -e "${GREEN}=========================================="
echo "Status check complete"
echo "==========================================${NC}"
echo ""
