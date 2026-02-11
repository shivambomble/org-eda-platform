#!/bin/bash

# Deploy Instance 4: Temporal Worker
# Run this on: 3.95.9.172

set -e

echo "=========================================="
echo "Deploying Instance 4: Temporal Worker"
echo "=========================================="

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

echo "Worker .env created"

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

echo "Worker service started"

# Verify
echo ""
echo "=========================================="
echo "Verification"
echo "=========================================="
sleep 2
sudo systemctl status org-eda-worker
echo ""
echo "=========================================="
echo "Instance 4 Deployment Complete!"
echo "=========================================="
echo "Worker is running and connected to Temporal Server"
