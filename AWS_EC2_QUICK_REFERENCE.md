# AWS EC2 Deployment - Quick Reference

Fast lookup guide for common tasks.

---

## Configuration Values

Replace these in all commands:

```
rds-endpoint          = Your RDS cluster endpoint
instance1-ip          = Frontend + Backend instance IP
hasura-ip             = Hasura instance IP
temporal-server-ip    = Temporal Server instance IP
temporal-worker-ip    = Temporal Worker instance IP
org-eda-key.pem       = Your SSH key file
YourSecurePassword123! = Your RDS password
your-hasura-secret    = Your Hasura admin secret
your-jwt-secret       = Your JWT secret (min 32 chars)
org-eda-datasets-xxxxx = Your S3 bucket name
```

---

## Essential Commands

### SSH into Instances

```bash
# Frontend + Backend
ssh -i org-eda-key.pem ec2-user@instance1-ip

# Hasura
ssh -i org-eda-key.pem ec2-user@hasura-ip

# Temporal Server
ssh -i org-eda-key.pem ec2-user@temporal-server-ip

# Temporal Worker
ssh -i org-eda-key.pem ec2-user@temporal-worker-ip
```

### Check Service Status

```bash
# Backend
sudo systemctl status org-eda-backend

# Worker
sudo systemctl status org-eda-worker

# Nginx
sudo systemctl status nginx

# Docker (Hasura/Temporal)
docker ps
```

### View Logs

```bash
# Backend logs
sudo journalctl -u org-eda-backend -f

# Worker logs
sudo journalctl -u org-eda-worker -f

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Hasura logs
docker logs -f hasura

# Temporal logs
docker logs -f temporal
```

### Restart Services

```bash
# Backend
sudo systemctl restart org-eda-backend

# Worker
sudo systemctl restart org-eda-worker

# Nginx
sudo systemctl restart nginx

# Hasura
docker restart hasura

# Temporal
docker restart temporal
```

### Start/Stop All Services

```bash
# Start all
./scripts/start-all.sh

# Stop all
./scripts/stop-all.sh

# Check status
./scripts/status.sh
```

---

## Access Points

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | `http://instance1-ip` | Main application |
| Backend API | `http://instance1-ip:4000` | REST API |
| Backend Health | `http://instance1-ip:4000/health` | Health check |
| Hasura Console | `http://hasura-ip:8080/console` | GraphQL IDE |
| Hasura Health | `http://hasura-ip:8080/healthz` | Health check |
| Temporal UI | `http://temporal-server-ip:8233` | Workflow monitoring |
| Temporal Server | `temporal-server-ip:7233` | gRPC endpoint |

---

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/active_check
JWT_SECRET=your-secret-key-min-32-characters
S3_BUCKET=org-eda-datasets-xxxxx
STORAGE_TYPE=s3
HASURA_GRAPHQL_URL=http://hasura-ip:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-secret
TEMPORAL_ADDRESS=temporal-server-ip:7233
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
PORT=4000
```

### Frontend (.env)

```
VITE_API_URL=http://instance1-ip:4000
VITE_HASURA_URL=http://hasura-ip:8080/v1/graphql
```

### Hasura (Docker env)

```
HASURA_GRAPHQL_DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/active_check
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_ADMIN_SECRET=your-hasura-secret
HASURA_GRAPHQL_JWT_SECRET={"type":"HS256","key":"your-jwt-secret"}
```

### Temporal Server (Docker env)

```
DB=postgresql
DB_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PWD=password
POSTGRES_SEEDS=rds-endpoint
```

### Temporal Worker (.env)

```
TEMPORAL_ADDRESS=temporal-server-ip:7233
DATABASE_URL=postgresql://postgres:password@rds-endpoint:5432/active_check
```

---

## Database Commands

### Connect to Database

```bash
psql -h rds-endpoint \
     -U postgres \
     -d active_check
```

### Run Migrations

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

### List Tables

```bash
psql -h rds-endpoint \
     -U postgres \
     -d active_check \
     -c "\dt"
```

### Backup Database

```bash
pg_dump -h rds-endpoint \
        -U postgres \
        -d active_check \
        > backup.sql
```

### Restore Database

```bash
psql -h rds-endpoint \
     -U postgres \
     -d active_check \
     < backup.sql
```

---

## AWS CLI Commands

### RDS

```bash
# Start cluster
aws rds start-db-cluster --db-cluster-identifier org-eda-cluster

# Stop cluster
aws rds stop-db-cluster --db-cluster-identifier org-eda-cluster

# Describe cluster
aws rds describe-db-clusters --db-cluster-identifier org-eda-cluster

# Get endpoint
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[0].Endpoint'
```

### EC2

```bash
# Start instances
aws ec2 start-instances --instance-ids i-xxxxx i-yyyyy i-zzzzz

# Stop instances
aws ec2 stop-instances --instance-ids i-xxxxx i-yyyyy i-zzzzz

# Describe instances
aws ec2 describe-instances --instance-ids i-xxxxx

# Get instance IPs
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=org-eda-*" \
  --query 'Reservations[].Instances[].[Tags[?Key==`Name`].Value|[0],PublicIpAddress]'
```

### S3

```bash
# List buckets
aws s3 ls

# List bucket contents
aws s3 ls s3://org-eda-datasets-xxxxx

# Upload file
aws s3 cp file.csv s3://org-eda-datasets-xxxxx/

# Download file
aws s3 cp s3://org-eda-datasets-xxxxx/file.csv .

# Sync directory
aws s3 sync ./local-dir s3://org-eda-datasets-xxxxx/
```

---

## Deployment Checklist

Quick checklist for deployment:

- [ ] AWS account configured
- [ ] SSH key created and secured
- [ ] RDS cluster created
- [ ] S3 bucket created
- [ ] Security group created
- [ ] 4 EC2 instances launched
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] Hasura running
- [ ] Temporal Server running
- [ ] Temporal Worker running
- [ ] Database migrations completed
- [ ] All services verified
- [ ] Start/stop scripts created
- [ ] Billing alerts set up

---

## Cost Breakdown

```
EC2 Instance 1 (Frontend + Backend):  $2.50/month (8h/day)
EC2 Instance 2 (Hasura):              $2.50/month (8h/day)
EC2 Instance 3 (Temporal Server):     $2.50/month (8h/day)
EC2 Instance 4 (Temporal Worker):     $2.50/month (8h/day)
RDS Aurora:                           $14.40/month (8h/day)
S3 Storage:                           $3-4.00/month
Data Transfer:                        $0.45/month
─────────────────────────────────────────────────
TOTAL (8h/day):                       $28.35/month
TOTAL (24h/day):                      $77.70/month
```

---

## Troubleshooting Quick Links

| Issue | Command |
|-------|---------|
| Backend not starting | `sudo journalctl -u org-eda-backend -n 50` |
| Worker not starting | `sudo journalctl -u org-eda-worker -n 50` |
| Hasura not running | `docker logs hasura` |
| Temporal not running | `docker logs temporal` |
| Database connection failed | `psql -h rds-endpoint -U postgres -d active_check` |
| Port in use | `sudo lsof -i :PORT` |
| Check all services | `./scripts/status.sh` |

---

## Useful Links

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Temporal Documentation](https://docs.temporal.io/)
- [Hasura Documentation](https://hasura.io/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

## Support

For issues not covered here, see:
- `AWS_EC2_DEPLOYMENT_CHECKLIST.md` - Step-by-step deployment
- `AWS_EC2_TROUBLESHOOTING.md` - Detailed troubleshooting
- `AWS_EC2_ONLY_DEPLOYMENT.md` - Complete deployment guide

---

**Last Updated**: February 11, 2026

