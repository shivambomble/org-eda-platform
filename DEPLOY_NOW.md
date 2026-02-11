# Deploy OrgEDA - Your Instances Are Ready

Your AWS infrastructure is ready. Now deploy the services on each instance.

---

## Your Configuration

```
RDS Endpoint:        org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com
S3 Bucket:           org-eda-datasets-1770789556

Instance 1 (Frontend + Backend):  18.207.167.68
Instance 2 (Hasura):              98.88.71.220
Instance 3 (Temporal Server):     100.25.213.183
Instance 4 (Temporal Worker):     3.95.9.172

SSH Key:             org-eda-key.pem
```

---

## Deployment Steps

### Step 1: Deploy Instance 1 (Frontend + Backend)

SSH into the instance:
```bash
ssh -i org-eda-key.pem ec2-user@18.207.167.68
```

Copy and paste this entire script:
```bash
#!/bin/bash
set -e

echo "Deploying Instance 1: Frontend + Backend"

# Update system
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs nginx git

# Clone repository
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend

# Install and build backend
npm install
npm run build

# Create backend .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com:5432/active_check
JWT_SECRET=your-super-secret-key-min-32-characters-long-here-12345
S3_BUCKET=org-eda-datasets-1770789556
STORAGE_TYPE=s3
HASURA_GRAPHQL_URL=http://98.88.71.220:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-secret-key-here
TEMPORAL_ADDRESS=100.25.213.183:7233
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
PORT=4000
EOF

# Create backend systemd service
sudo tee /etc/systemd/system/org-eda-backend.service << 'EOF'
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

# Build and deploy frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/

# Create frontend .env
cat > .env << 'EOF'
VITE_API_URL=http://18.207.167.68:4000
VITE_HASURA_URL=http://98.88.71.220:8080/v1/graphql
EOF

# Rebuild frontend
npm run build
sudo cp -r dist/* /usr/share/nginx/html/

# Configure Nginx
sudo tee /etc/nginx/conf.d/frontend.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo systemctl enable nginx
sudo systemctl start nginx

echo "Instance 1 Deployment Complete!"
echo "Frontend: http://18.207.167.68"
echo "Backend: http://18.207.167.68:4000"
```

**Wait for it to complete** (5-10 minutes)

---

### Step 2: Deploy Instance 2 (Hasura)

SSH into the instance:
```bash
ssh -i org-eda-key.pem ec2-user@98.88.71.220
```

Copy and paste this entire script:
```bash
#!/bin/bash
set -e

echo "Deploying Instance 2: Hasura"

# Update system and install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Run Hasura container
docker run -d \
  --name hasura \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL="postgresql://postgres:YourSecurePassword123!@org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com:5432/active_check" \
  -e HASURA_GRAPHQL_ENABLE_CONSOLE=true \
  -e HASURA_GRAPHQL_ADMIN_SECRET="your-hasura-secret-key-here" \
  -e HASURA_GRAPHQL_JWT_SECRET='{"type":"HS256","key":"your-jwt-secret-min-32-characters-long-here-12345"}' \
  hasura/graphql-engine:latest

sleep 5

echo "Instance 2 Deployment Complete!"
echo "Hasura Console: http://98.88.71.220:8080/console"
```

**Wait for it to complete** (2-3 minutes)

---

### Step 3: Deploy Instance 3 (Temporal Server)

SSH into the instance:
```bash
ssh -i org-eda-key.pem ec2-user@100.25.213.183
```

Copy and paste this entire script:
```bash
#!/bin/bash
set -e

echo "Deploying Instance 3: Temporal Server"

# Update system and install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

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

sleep 10

echo "Instance 3 Deployment Complete!"
echo "Temporal UI: http://100.25.213.183:8233"
```

**Wait for it to complete** (3-5 minutes)

---

### Step 4: Deploy Instance 4 (Temporal Worker)

SSH into the instance:
```bash
ssh -i org-eda-key.pem ec2-user@3.95.9.172
```

Copy and paste this entire script:
```bash
#!/bin/bash
set -e

echo "Deploying Instance 4: Temporal Worker"

# Update system
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git

# Clone repository
git clone https://github.com/your-repo/org-eda-platform.git
cd org-eda-platform/backend

# Install and build
npm install
npm run build

# Create worker .env
cat > .env << 'EOF'
TEMPORAL_ADDRESS=100.25.213.183:7233
DATABASE_URL=postgresql://postgres:YourSecurePassword123!@org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com:5432/active_check
EOF

# Create worker systemd service
sudo tee /etc/systemd/system/org-eda-worker.service << 'EOF'
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

sleep 2

echo "Instance 4 Deployment Complete!"
echo "Worker is running and connected to Temporal Server"
```

**Wait for it to complete** (5-10 minutes)

---

### Step 5: Run Database Migrations

From your local machine:

```bash
psql -h org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d active_check \
     -f org-eda-platform/docker/init_sql/01_init.sql

psql -h org-eda-cluster.cluster-crzef8io4ayc.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d active_check \
     -f org-eda-platform/docker/init_sql/02_add_idempotency_support.sql
```

When prompted for password, enter: `YourSecurePassword123!`

---

## Verify Everything

### Test Frontend
```bash
curl http://18.207.167.68
```

### Test Backend
```bash
curl http://18.207.167.68:4000/health
```

### Test Hasura
```bash
curl http://98.88.71.220:8080/healthz
```

### Test Temporal
```bash
curl http://100.25.213.183:8233
```

---

## Access Your Application

| Service | URL |
|---------|-----|
| Frontend | http://18.207.167.68 |
| Backend API | http://18.207.167.68:4000 |
| Hasura Console | http://98.88.71.220:8080/console |
| Temporal UI | http://100.25.213.183:8233 |

---

## Important Notes

1. **Replace credentials** in the scripts:
   - `your-aws-access-key` → Your actual AWS access key
   - `your-aws-secret-key` → Your actual AWS secret key
   - `your-repo` → Your GitHub repository URL

2. **Database password** is: `YourSecurePassword123!`

3. **Hasura admin secret** is: `your-hasura-secret-key-here`

4. **JWT secret** is: `your-jwt-secret-min-32-characters-long-here-12345`

---

## Troubleshooting

If something fails:

1. Check logs on the instance:
```bash
# Backend logs
sudo journalctl -u org-eda-backend -f

# Worker logs
sudo journalctl -u org-eda-worker -f

# Hasura logs
docker logs -f hasura

# Temporal logs
docker logs -f temporal
```

2. Check if services are running:
```bash
sudo systemctl status org-eda-backend
sudo systemctl status org-eda-worker
docker ps
```

---

## Total Time

- Instance 1: 10 minutes
- Instance 2: 3 minutes
- Instance 3: 5 minutes
- Instance 4: 10 minutes
- Migrations: 2 minutes
- **Total: ~30 minutes**

---

**Start with Instance 1!** 🚀

