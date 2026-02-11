#!/bin/bash

# Deploy Instance 1: Frontend + Backend
# Run this on: 18.207.167.68

set -e

echo "=========================================="
echo "Deploying Instance 1: Frontend + Backend"
echo "=========================================="

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

echo "Backend .env created"

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

echo "Backend service started"

# Build and deploy frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/

echo "Frontend built"

# Create frontend .env
cat > .env << 'EOF'
VITE_API_URL=http://18.207.167.68:4000
VITE_HASURA_URL=http://98.88.71.220:8080/v1/graphql
EOF

# Rebuild frontend with env
npm run build
sudo cp -r dist/* /usr/share/nginx/html/

echo "Frontend deployed"

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

echo "Nginx configured and started"

# Verify
echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
sleep 2
curl http://localhost:4000/health
echo ""
curl http://localhost/
echo ""
echo "=========================================="
echo "Instance 1 Deployment Complete!"
echo "=========================================="
echo "Frontend: http://18.207.167.68"
echo "Backend: http://18.207.167.68:4000"
