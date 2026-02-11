# AWS EC2 Deployment Checklist

Complete this checklist to deploy OrgEDA on AWS EC2 instances.

---

## Pre-Deployment Setup (30 minutes)

### AWS Account Setup
- [ ] Create AWS account or use existing one
- [ ] Create IAM user with EC2, RDS, S3 permissions
- [ ] Generate AWS Access Key ID and Secret Access Key
- [ ] Install AWS CLI: `brew install awscli` (macOS) or `pip install awscli` (Linux)
- [ ] Configure AWS CLI: `aws configure`
  - Enter Access Key ID
  - Enter Secret Access Key
  - Set default region: `us-east-1`
  - Set default output format: `json`

### Create Key Pair
- [ ] Create EC2 key pair: `aws ec2 create-key-pair --key-name org-eda-key --region us-east-1 --query 'KeyMaterial' --output text > org-eda-key.pem`
- [ ] Set permissions: `chmod 400 org-eda-key.pem`
- [ ] Store key pair safely (you'll need it to SSH into instances)

### Prepare Repository
- [ ] Clone repository locally
- [ ] Ensure all code is committed to git
- [ ] Test backend build locally: `cd backend && npm install && npm run build`
- [ ] Test frontend build locally: `cd frontend && npm install && npm run build`

---

## Step 1: Create RDS Aurora Database (10 minutes)

### Create Database Cluster
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
```

- [ ] Cluster created successfully
- [ ] Note the cluster endpoint (you'll need it later)

### Create Database Instance
```bash
aws rds create-db-instance \
  --db-instance-identifier org-eda-instance-1 \
  --db-instance-class db.serverless \
  --engine aurora-postgresql \
  --db-cluster-identifier org-eda-cluster \
  --region us-east-1
```

- [ ] Instance created successfully
- [ ] Wait for instance to be available (5-10 minutes)

### Get Database Endpoint
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[0].Endpoint' \
  --region us-east-1
```

- [ ] Database endpoint noted: `_______________________`

---

## Step 2: Create S3 Bucket (5 minutes)

### Create Bucket
```bash
BUCKET_NAME="org-eda-datasets-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1
```

- [ ] Bucket created successfully
- [ ] Bucket name noted: `_______________________`

### Enable Versioning
```bash
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled
```

- [ ] Versioning enabled

### Enable Encryption
```bash
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

- [ ] Encryption enabled

---

## Step 3: Create Security Group (5 minutes)

### Create Security Group
```bash
aws ec2 create-security-group \
  --group-name org-eda-sg \
  --description "OrgEDA security group" \
  --region us-east-1
```

- [ ] Security group created
- [ ] Security group ID noted: `_______________________`

### Add Ingress Rules
```bash
# SSH
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 \
  --region us-east-1

# HTTP
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region us-east-1

# HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 \
  --region us-east-1

# Backend API
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 4000 --cidr 0.0.0.0/0 \
  --region us-east-1

# Hasura
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 8080 --cidr 0.0.0.0/0 \
  --region us-east-1

# Temporal Server
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 7233 --cidr 0.0.0.0/0 \
  --region us-east-1

# Temporal UI
aws ec2 authorize-security-group-ingress \
  --group-name org-eda-sg \
  --protocol tcp --port 8233 --cidr 0.0.0.0/0 \
  --region us-east-1
```

- [ ] All ingress rules added

---

## Step 4: Launch EC2 Instances (20 minutes)

### Launch Instance 1 (Frontend + Backend)
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-frontend-backend}]' \
  --region us-east-1
```

- [ ] Instance 1 launched
- [ ] Instance 1 ID noted: `_______________________`

### Launch Instance 2 (Hasura)
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-hasura}]' \
  --region us-east-1
```

- [ ] Instance 2 launched
- [ ] Instance 2 ID noted: `_______________________`

### Launch Instance 3 (Temporal Server)
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-server}]' \
  --region us-east-1
```

- [ ] Instance 3 launched
- [ ] Instance 3 ID noted: `_______________________`

### Launch Instance 4 (Temporal Worker)
```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-worker}]' \
  --region us-east-1
```

- [ ] Instance 4 launched
- [ ] Instance 4 ID noted: `_______________________`

### Get Instance IPs
```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
  --region us-east-1
```

- [ ] Instance 1 IP noted: `_______________________`
- [ ] Instance 2 IP noted: `_______________________`
- [ ] Instance 3 IP noted: `_______________________`
- [ ] Instance 4 IP noted: `_______________________`

---

## Step 5: Deploy Frontend + Backend (30 minutes)

### SSH into Instance 1
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
```

- [ ] Connected to Instance 1

### Install Dependencies
```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs nginx git
```

- [ ] Dependencies installed

### Deploy Backend
```bash
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend
npm install
npm run build
```

- [ ] Backend cloned and built

### Create Backend Environment File
```bash
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@rds-endpoint:5432/active_check
JWT_SECRET=your-super-secret-key-min-32-characters
S3_BUCKET=org-eda-datasets-xxxxx
STORAGE_TYPE=s3
HASURA_GRAPHQL_URL=http://hasura-ip:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-secret
TEMPORAL_ADDRESS=temporal-server-ip:7233
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
PORT=4000
EOF
```

- [ ] Backend .env created with correct values

### Create Backend Systemd Service
```bash
sudo tee /etc/systemd/system/org-eda-backend.service << EOF
[Unit]
Description=OrgEDA Backend
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/org-eda-platform/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable org-eda-backend
sudo systemctl start org-eda-backend
```

- [ ] Backend service created and started

### Deploy Frontend
```bash
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

- [ ] Frontend built and deployed

### Create Frontend Environment File
```bash
cat > .env << EOF
VITE_API_URL=http://instance1-ip:4000
VITE_HASURA_URL=http://hasura-ip:8080/v1/graphql
EOF
```

- [ ] Frontend .env created

### Rebuild Frontend with Environment
```bash
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

- [ ] Frontend rebuilt and redeployed

### Create Nginx Config
```bash
sudo tee /etc/nginx/conf.d/frontend.conf << EOF
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo systemctl enable nginx
sudo systemctl start nginx
```

- [ ] Nginx configured and started

### Verify Backend and Frontend
```bash
curl http://localhost:4000/health
curl http://localhost/
```

- [ ] Backend health check passed
- [ ] Frontend accessible

---

## Step 6: Deploy Hasura (15 minutes)

### SSH into Instance 2
```bash
ssh -i org-eda-key.pem ec2-user@hasura-ip
```

- [ ] Connected to Instance 2

### Install Docker
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

- [ ] Docker installed and running

### Run Hasura Container
```bash
docker run -d \
  --name hasura \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL="postgresql://postgres:YourSecurePassword123!@rds-endpoint:5432/active_check" \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_ADMIN_SECRET="your-hasura-secret" \
  -e HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"your-jwt-secret-min-32-chars"}' \
  hasura/graphql-engine:latest
```

- [ ] Hasura container running

### Verify Hasura
```bash
curl http://localhost:8080/healthz
```

- [ ] Hasura health check passed
- [ ] Access console at: `http://hasura-ip:8080/console`

---

## Step 7: Deploy Temporal Server (15 minutes)

### SSH into Instance 3
```bash
ssh -i org-eda-key.pem ec2-user@temporal-server-ip
```

- [ ] Connected to Instance 3

### Install Docker
```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

- [ ] Docker installed and running

### Run Temporal Server Container
```bash
docker run -d \
  --name temporal \
  -p 7233:7233 \
  -p 8233:8233 \
  -e DB=postgresql \
  -e DB_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PWD=YourSecurePassword123! \
  -e POSTGRES_SEEDS=rds-endpoint \
  temporalio/auto-setup:latest
```

- [ ] Temporal server container running

### Verify Temporal Server
```bash
curl http://localhost:7233
```

- [ ] Temporal server accessible
- [ ] Access UI at: `http://temporal-server-ip:8233`

---

## Step 8: Deploy Temporal Worker (15 minutes)

### SSH into Instance 4
```bash
ssh -i org-eda-key.pem ec2-user@temporal-worker-ip
```

- [ ] Connected to Instance 4

### Install Dependencies
```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git
```

- [ ] Dependencies installed

### Deploy Worker
```bash
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend
npm install
npm run build
```

- [ ] Worker code cloned and built

### Create Worker Environment File
```bash
cat > .env << EOF
TEMPORAL_ADDRESS=temporal-server-ip:7233
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@rds-endpoint:5432/active_check
EOF
```

- [ ] Worker .env created

### Create Worker Systemd Service
```bash
sudo tee /etc/systemd/system/org-eda-worker.service << EOF
[Unit]
Description=OrgEDA Temporal Worker
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/org-eda-platform/backend
ExecStart=/usr/bin/node dist/temporal/worker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable org-eda-worker
sudo systemctl start org-eda-worker
```

- [ ] Worker service created and started

### Verify Worker
```bash
sudo systemctl status org-eda-worker
```

- [ ] Worker service running

---

## Step 9: Run Database Migrations (5 minutes)

### Connect to RDS and Run Migrations
```bash
psql -h rds-endpoint \
     -U postgres \
     -d active_check \
     -f docker/init_sql/01_init.sql

psql -h rds-endpoint \
     -U postgres \
     -d active_check \
     -f docker/init_sql/02_add_idempotency_support.sql
```

- [ ] Migration 1 completed
- [ ] Migration 2 completed

---

## Step 10: Verify All Services (10 minutes)

### Test Frontend
```bash
curl http://instance1-ip
```

- [ ] Frontend accessible

### Test Backend API
```bash
curl http://instance1-ip:4000/health
```

- [ ] Backend health check passed

### Test Hasura
```bash
curl http://hasura-ip:8080/healthz
```

- [ ] Hasura accessible

### Test Temporal Server
```bash
curl http://temporal-server-ip:8233
```

- [ ] Temporal UI accessible

### Test Temporal Worker
```bash
ssh -i org-eda-key.pem ec2-user@temporal-worker-ip
sudo systemctl status org-eda-worker
```

- [ ] Worker service running

---

## Post-Deployment

### Create Start/Stop Scripts

Save these scripts locally for easy management:

**start-all.sh**
```bash
#!/bin/bash
echo "Starting RDS..."
aws rds start-db-cluster --db-cluster-identifier org-eda-cluster --region us-east-1

echo "Starting EC2 instances..."
aws ec2 start-instances \
  --instance-ids i-instance1 i-instance2 i-instance3 i-instance4 \
  --region us-east-1

echo "Waiting for services to start..."
sleep 60

echo "All services started!"
```

**stop-all.sh**
```bash
#!/bin/bash
echo "Stopping EC2 instances..."
aws ec2 stop-instances \
  --instance-ids i-instance1 i-instance2 i-instance3 i-instance4 \
  --region us-east-1

echo "Stopping RDS..."
aws rds stop-db-cluster --db-cluster-identifier org-eda-cluster --region us-east-1

echo "All services stopped!"
```

- [ ] Start/stop scripts created

### Monitor Costs
- [ ] Set up AWS billing alerts
- [ ] Monitor daily costs in AWS Console
- [ ] Review usage patterns

### Backup Strategy
- [ ] Enable RDS automated backups
- [ ] Enable S3 versioning (already done)
- [ ] Test restore process

---

## Troubleshooting

### Backend Not Starting
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
sudo systemctl status org-eda-backend
sudo journalctl -u org-eda-backend -n 50
```

### Hasura Connection Issues
```bash
ssh -i org-eda-key.pem ec2-user@hasura-ip
docker logs hasura
```

### Temporal Worker Not Connecting
```bash
ssh -i org-eda-key.pem ec2-user@temporal-worker-ip
sudo systemctl status org-eda-worker
sudo journalctl -u org-eda-worker -n 50
```

### Database Connection Issues
```bash
psql -h rds-endpoint -U postgres -d active_check
```

---

## Summary

| Step | Time | Status |
|------|------|--------|
| Pre-Deployment | 30 min | [ ] |
| RDS Setup | 10 min | [ ] |
| S3 Setup | 5 min | [ ] |
| Security Group | 5 min | [ ] |
| EC2 Instances | 20 min | [ ] |
| Frontend + Backend | 30 min | [ ] |
| Hasura | 15 min | [ ] |
| Temporal Server | 15 min | [ ] |
| Temporal Worker | 15 min | [ ] |
| Migrations | 5 min | [ ] |
| Verification | 10 min | [ ] |
| **TOTAL** | **2-3 hours** | [ ] |

---

**Cost**: $28.35/month (8h/day) or $77.70/month (24h/day)
**Status**: Ready to Deploy
**Last Updated**: February 11, 2026

