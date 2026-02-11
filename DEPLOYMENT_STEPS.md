# OrgEDA - AWS EC2 Deployment Steps

Follow these steps to deploy OrgEDA on AWS EC2.

---

## Prerequisites

Before starting, you need:
- AWS account
- AWS CLI installed (`brew install awscli`)
- SSH key pair created
- Basic terminal knowledge

---

## Step 1: Configure AWS CLI (5 minutes)

```bash
aws configure
```

Enter:
- AWS Access Key ID: `your-access-key`
- AWS Secret Access Key: `your-secret-key`
- Default region: `us-east-1`
- Default output format: `json`

**Verify it works:**
```bash
aws ec2 describe-instances --region us-east-1
```

---

## Step 2: Create SSH Key Pair (2 minutes)

```bash
aws ec2 create-key-pair \
  --key-name org-eda-key \
  --region us-east-1 \
  --query 'KeyMaterial' \
  --output text > org-eda-key.pem

chmod 400 org-eda-key.pem
```

**Verify:**
```bash
ls -la org-eda-key.pem
```

---

## Step 3: Create RDS Database (10 minutes)

### Create Cluster

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

### Create Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier org-eda-instance-1 \
  --db-instance-class db.serverless \
  --engine aurora-postgresql \
  --db-cluster-identifier org-eda-cluster \
  --region us-east-1
```

### Get Endpoint

```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[0].Endpoint' \
  --region us-east-1
```

**Save this endpoint** - you'll need it later.

---

## Step 4: Create S3 Bucket (5 minutes)

```bash
BUCKET_NAME="org-eda-datasets-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
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

**Save the bucket name** - you'll need it later.

---

## Step 5: Create Security Group (5 minutes)

```bash
aws ec2 create-security-group \
  --group-name org-eda-sg \
  --description "OrgEDA security group" \
  --region us-east-1

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

---

## Step 6: Launch EC2 Instances (20 minutes)

### Instance 1: Frontend + Backend

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-frontend-backend}]' \
  --region us-east-1
```

### Instance 2: Hasura

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-hasura}]' \
  --region us-east-1
```

### Instance 3: Temporal Server

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-server}]' \
  --region us-east-1
```

### Instance 4: Temporal Worker

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name org-eda-key \
  --security-groups org-eda-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=org-eda-temporal-worker}]' \
  --region us-east-1
```

### Get Instance IPs

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
  --region us-east-1 \
  --output table
```

**Save all 4 IPs** - you'll need them for the next steps.

---

## Step 7: Deploy Frontend + Backend (30 minutes)

### SSH into Instance 1

```bash
ssh -i org-eda-key.pem ec2-user@INSTANCE1_IP
```

### Install Dependencies

```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs nginx git
```

### Clone and Build Backend

```bash
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend
npm install
npm run build
```

### Create Backend .env

```bash
cat > .env << EOF
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@RDS_ENDPOINT:5432/active_check
JWT_SECRET=your-super-secret-key-min-32-characters-long-here
S3_BUCKET=BUCKET_NAME
STORAGE_TYPE=s3
HASURA_GRAPHQL_URL=http://HASURA_IP:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-secret
TEMPORAL_ADDRESS=TEMPORAL_SERVER_IP:7233
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
PORT=4000
EOF
```

Replace:
- `RDS_ENDPOINT` - from Step 3
- `BUCKET_NAME` - from Step 4
- `HASURA_IP` - Instance 2 IP
- `TEMPORAL_SERVER_IP` - Instance 3 IP
- AWS credentials

### Create Backend Service

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

### Build and Deploy Frontend

```bash
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

### Create Frontend .env

```bash
cat > .env << EOF
VITE_API_URL=http://INSTANCE1_IP:4000
VITE_HASURA_URL=http://HASURA_IP:8080/v1/graphql
EOF
```

### Rebuild Frontend

```bash
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

### Configure Nginx

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

### Verify

```bash
curl http://localhost:4000/health
curl http://localhost/
```

---

## Step 8: Deploy Hasura (15 minutes)

### SSH into Instance 2

```bash
ssh -i org-eda-key.pem ec2-user@HASURA_IP
```

### Install Docker

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

### Run Hasura

```bash
docker run -d \
  --name hasura \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL="postgresql://postgres:YourSecurePassword123!@RDS_ENDPOINT:5432/active_check" \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_ADMIN_SECRET="your-hasura-secret" \
  -e HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"your-jwt-secret-min-32-chars"}' \
  hasura/graphql-engine:latest
```

### Verify

```bash
curl http://localhost:8080/healthz
```

Access console: `http://HASURA_IP:8080/console`

---

## Step 9: Deploy Temporal Server (15 minutes)

### SSH into Instance 3

```bash
ssh -i org-eda-key.pem ec2-user@TEMPORAL_SERVER_IP
```

### Install Docker

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

### Run Temporal Server

```bash
docker run -d \
  --name temporal \
  -p 7233:7233 \
  -p 8233:8233 \
  -e DB=postgresql \
  -e DB_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PWD=YourSecurePassword123! \
  -e POSTGRES_SEEDS=RDS_ENDPOINT \
  temporalio/auto-setup:latest
```

### Verify

```bash
curl http://localhost:7233
```

Access UI: `http://TEMPORAL_SERVER_IP:8233`

---

## Step 10: Deploy Temporal Worker (15 minutes)

### SSH into Instance 4

```bash
ssh -i org-eda-key.pem ec2-user@TEMPORAL_WORKER_IP
```

### Install Dependencies

```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git
```

### Clone and Build

```bash
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend
npm install
npm run build
```

### Create Worker .env

```bash
cat > .env << EOF
TEMPORAL_ADDRESS=TEMPORAL_SERVER_IP:7233
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@RDS_ENDPOINT:5432/active_check
EOF
```

### Create Worker Service

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

### Verify

```bash
sudo systemctl status org-eda-worker
```

---

## Step 11: Run Database Migrations (5 minutes)

From your local machine:

```bash
psql -h RDS_ENDPOINT \
     -U postgres \
     -d active_check \
     -f org-eda-platform/docker/init_sql/01_init.sql

psql -h RDS_ENDPOINT \
     -U postgres \
     -d active_check \
     -f org-eda-platform/docker/init_sql/02_add_idempotency_support.sql
```

---

## Step 12: Verify Everything (10 minutes)

### Check All Services

```bash
./scripts/status.sh
```

### Test Frontend

```bash
curl http://INSTANCE1_IP
```

### Test Backend

```bash
curl http://INSTANCE1_IP:4000/health
```

### Test Hasura

```bash
curl http://HASURA_IP:8080/healthz
```

### Test Temporal

```bash
curl http://TEMPORAL_SERVER_IP:8233
```

---

## Access Your Application

After deployment:

| Service | URL |
|---------|-----|
| Frontend | `http://INSTANCE1_IP` |
| Backend API | `http://INSTANCE1_IP:4000` |
| Hasura Console | `http://HASURA_IP:8080/console` |
| Temporal UI | `http://TEMPORAL_SERVER_IP:8233` |

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

## Troubleshooting

If something breaks:

1. Check status: `./scripts/status.sh`
2. Read: `AWS_EC2_TROUBLESHOOTING.md`
3. Find your issue and follow solution

---

## Cost

```
Monthly (8h/day):   $28.35
Monthly (24h/day):  $77.70
```

---

**Total Setup Time**: 2-3 hours

Good luck! 🚀

