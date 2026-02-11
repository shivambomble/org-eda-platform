# OrgEDA AWS EC2 Management Scripts

Helper scripts for managing OrgEDA deployment on AWS EC2.

---

## Scripts

### start-all.sh

Starts all AWS resources (EC2 instances and RDS cluster).

```bash
./start-all.sh
```

**What it does:**
- Starts RDS Aurora cluster
- Starts all 4 EC2 instances
- Waits for instances to be running
- Displays instance details and access points

**Prerequisites:**
- AWS CLI configured
- AWS credentials with EC2 and RDS permissions

---

### stop-all.sh

Stops all AWS resources to minimize costs.

```bash
./stop-all.sh
```

**What it does:**
- Stops all 4 EC2 instances
- Stops RDS Aurora cluster
- Displays final status
- Shows cost savings

**Prerequisites:**
- AWS CLI configured
- AWS credentials with EC2 and RDS permissions

**Note:** Requires confirmation before stopping

---

### status.sh

Checks the status of all AWS resources.

```bash
./status.sh
```

**What it does:**
- Shows EC2 instance status and IPs
- Shows RDS cluster status
- Shows RDS instance status
- Displays estimated monthly costs

**Prerequisites:**
- AWS CLI configured
- AWS credentials with EC2 and RDS permissions

---

## Setup

### 1. Configure AWS CLI

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

### 2. Update Script Configuration

Edit the scripts and update these values:

```bash
CLUSTER_ID="org-eda-cluster"
INSTANCE_IDS=("i-instance1" "i-instance2" "i-instance3" "i-instance4")
REGION="us-east-1"
```

Replace with your actual:
- RDS cluster identifier
- EC2 instance IDs
- AWS region

### 3. Make Scripts Executable

```bash
chmod +x start-all.sh stop-all.sh status.sh
```

---

## Usage Examples

### Start Services for the Day

```bash
./start-all.sh
# Wait for services to initialize (2-3 minutes)
./status.sh
```

### Check Current Status

```bash
./status.sh
```

### Stop Services at End of Day

```bash
./stop-all.sh
```

### Automated Start/Stop (macOS/Linux)

Create a cron job to automatically start/stop services:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Start at 9 AM on weekdays
0 9 * * 1-5 /path/to/org-eda-platform/scripts/start-all.sh

# Stop at 6 PM on weekdays
0 18 * * 1-5 /path/to/org-eda-platform/scripts/stop-all.sh
```

---

## Troubleshooting

### AWS CLI Not Found

Install AWS CLI:

```bash
# macOS
brew install awscli

# Linux
pip install awscli

# Windows
# Download from https://aws.amazon.com/cli/
```

### Permission Denied

Make scripts executable:

```bash
chmod +x *.sh
```

### AWS Credentials Not Configured

Configure AWS CLI:

```bash
aws configure
```

### Instance IDs Not Found

Update instance IDs in scripts:

```bash
# Get your instance IDs
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].InstanceId'
```

---

## Cost Savings

By using these scripts to stop services when not in use:

```
Running 24/7:     $77.70/month
Running 8h/day:   $28.35/month
Running 4h/day:   $14.18/month
```

**Savings by stopping services:**
- Stop at end of day: ~$49/month saved
- Stop on weekends: ~$22/month saved
- Stop when not needed: ~$63/month saved

---

## Advanced Usage

### Get Instance IPs

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
  --output table
```

### Get RDS Endpoint

```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[0].Endpoint'
```

### Monitor Costs

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Support

For detailed deployment instructions, see:
- `AWS_EC2_ONLY_DEPLOYMENT.md` - Complete deployment guide
- `AWS_EC2_DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `AWS_EC2_TROUBLESHOOTING.md` - Troubleshooting guide
- `AWS_EC2_QUICK_REFERENCE.md` - Quick reference

---

**Last Updated**: February 11, 2026

