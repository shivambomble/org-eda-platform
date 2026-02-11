# Start Deployment Now

Follow these steps to deploy OrgEDA on AWS EC2.

---

## What You Need

1. AWS account
2. AWS CLI installed: `brew install awscli`
3. SSH key pair (we'll create it)
4. Terminal access

---

## Step-by-Step Deployment

### Phase 1: AWS Setup (30 minutes)

**Step 1: Configure AWS CLI**
```bash
aws configure
# Enter your AWS credentials and set region to us-east-1
```

**Step 2: Create SSH Key**
```bash
aws ec2 create-key-pair \
  --key-name org-eda-key \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > org-eda-key.pem

chmod 400 org-eda-key.pem
```

**Step 3: Create RDS Database**
```bash
aws rds create-db-cluster \
  --db-cluster-identifier org-eda-cluster \
  --engine aurora-postgresql \
  --engine-version 15.2 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --database-name active_check \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=1 \
  --storage-encrypted \
  --region us-east-1

aws rds create-db-instance \
  --db-instance-identifier org-eda-instance-1 \
  --db-instance-class db.serverless \
  --engine aurora-postgresql \
  --db-cluster-identifier org-eda-cluster \
  --region us-east-1
```

Get the endpoint:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[0].Endpoint' \
  --region us-east-1
```
**Save this endpoint** ← You'll need it

**Step 4: Create S3 Bucket**
```bash
BUCKET_NAME="org-eda-datasets-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1

aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```
**Save the bucket name** ← You'll need it

**Step 5: Create Security Group**
```bash
aws ec2 create-security-group \
  --group-name org-eda-sg \
  --description "OrgEDA security group" \
  --region us-east-1

# Add all ports
for PORT in 22 80 443 4000 8080 7233 8233; do
  aws ec2 authorize-security-group-ingress \
    --group-name org-eda-sg \
    --protocol tcp --port $PORT --cidr 0.0.0.0/0 \
    --region us-east-1
done
```

**Step 6: Launch 4 EC2 Instances**
```bash
# Instance 1: Frontend + Backend
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-frontend-backend}]' \
  --region us-east-1

# Instance 2: Hasura
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-hasura}]' \
  --region us-east-1

# Instance 3: Temporal Server
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-server}]' \
  --region us-east-1

# Instance 4: Temporal Worker
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-worker}]' \
  --region us-east-1
```

Get the IPs:
```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
  --region us-east-1 \
  --output table
```
**Save all 4 IPs** ← You'll need them

---

### Phase 2: Deploy Services (2 hours)

For detailed deployment instructions, see: **DEPLOYMENT_STEPS.md**

Quick summary:
1. SSH into Instance 1 → Deploy Frontend + Backend
2. SSH into Instance 2 → Deploy Hasura
3. SSH into Instance 3 → Deploy Temporal Server
4. SSH into Instance 4 → Deploy Temporal Worker
5. Run database migrations

---

### Phase 3: Verify (10 minutes)

```bash
./scripts/status.sh
```

Access your application:
- Frontend: `http://INSTANCE1_IP`
- Backend: `http://INSTANCE1_IP:4000`
- Hasura: `http://HASURA_IP:8080/console`
- Temporal: `http://TEMPORAL_SERVER_IP:8233`

---

## Daily Operations

### Start Services
```bash
./scripts/start-all.sh
```

### Stop Services
```bash
./scripts/stop-all.sh
```

### Check Status
```bash
./scripts/status.sh
```

---

## Cost

- **8 hours/day**: $28.35/month
- **24 hours/day**: $77.70/month

---

## Need Help?

- **Detailed steps**: See `DEPLOYMENT_STEPS.md`
- **Quick reference**: See `AWS_EC2_QUICK_REFERENCE.md`
- **Troubleshooting**: See `AWS_EC2_TROUBLESHOOTING.md`

---

## Total Time

- Phase 1 (AWS Setup): 30 minutes
- Phase 2 (Deploy Services): 2 hours
- Phase 3 (Verify): 10 minutes
- **Total**: 2.5-3 hours

---

Ready? Start with Phase 1 above! 🚀

