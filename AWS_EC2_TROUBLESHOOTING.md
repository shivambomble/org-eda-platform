# AWS EC2 Deployment - Troubleshooting Guide

Common issues and solutions for OrgEDA EC2 deployment.

---

## Connection Issues

### Cannot SSH into EC2 Instance

**Problem**: `Permission denied (publickey)` or `Connection refused`

**Solutions**:

1. Check key pair permissions:
```bash
chmod 400 org-eda-key.pem
```

2. Verify instance is running:
```bash
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[].Instances[].State.Name'
```

3. Check security group allows SSH (port 22):
```bash
aws ec2 describe-security-groups \
  --group-names org-eda-sg \
  --query 'SecurityGroups[].IpPermissions[]'
```

4. Verify public IP is assigned:
```bash
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[].Instances[].PublicIpAddress'
```

5. Try with verbose output:
```bash
ssh -vvv -i org-eda-key.pem ec2-user@instance-ip
```

---

### Cannot Connect to RDS Database

**Problem**: `psql: could not translate host name "rds-endpoint" to address`

**Solutions**:

1. Verify RDS cluster is running:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Status'
```

2. Get correct endpoint:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Endpoint'
```

3. Check security group allows port 5432:
```bash
aws ec2 describe-security-groups \
  --group-names org-eda-sg \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`5432`]'
```

4. Test connection from EC2 instance:
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
psql -h rds-endpoint -U postgres -d active_check -c "SELECT 1"
```

---

## Backend Issues

### Backend Service Not Starting

**Problem**: `systemctl status org-eda-backend` shows failed

**Solutions**:

1. Check service logs:
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
sudo journalctl -u org-eda-backend -n 50
```

2. Check if port 4000 is in use:
```bash
sudo lsof -i :4000
```

3. Verify environment variables:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env
```

4. Check Node.js is installed:
```bash
node --version
npm --version
```

5. Manually run backend to see errors:
```bash
cd /home/ec2-user/org-eda-platform/backend
node dist/server.js
```

---

### Backend Health Check Fails

**Problem**: `curl http://instance1-ip:4000/health` returns error

**Solutions**:

1. Check if backend is running:
```bash
sudo systemctl status org-eda-backend
```

2. Check if port 4000 is listening:
```bash
sudo netstat -tlnp | grep 4000
```

3. Check security group allows port 4000:
```bash
aws ec2 describe-security-groups \
  --group-names org-eda-sg \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`4000`]'
```

4. Check backend logs:
```bash
sudo journalctl -u org-eda-backend -f
```

---

### Backend Cannot Connect to Database

**Problem**: Backend logs show database connection error

**Solutions**:

1. Verify DATABASE_URL in .env:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env | grep DATABASE_URL
```

2. Test database connection:
```bash
psql -h rds-endpoint -U postgres -d active_check -c "SELECT 1"
```

3. Check RDS is running:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Status'
```

4. Verify credentials are correct:
```bash
psql -h rds-endpoint -U postgres -d active_check
# Enter password when prompted
```

---

### Backend Cannot Connect to Hasura

**Problem**: Backend logs show Hasura connection error

**Solutions**:

1. Verify HASURA_GRAPHQL_URL in .env:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env | grep HASURA
```

2. Test Hasura connection:
```bash
curl http://hasura-ip:8080/healthz
```

3. Check Hasura is running:
```bash
ssh -i org-eda-key.pem ec2-user@hasura-ip
docker ps | grep hasura
```

4. Check Hasura logs:
```bash
docker logs hasura
```

---

### Backend Cannot Connect to Temporal

**Problem**: Backend logs show Temporal connection error

**Solutions**:

1. Verify TEMPORAL_ADDRESS in .env:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env | grep TEMPORAL
```

2. Test Temporal connection:
```bash
curl http://temporal-server-ip:7233
```

3. Check Temporal server is running:
```bash
ssh -i org-eda-key.pem ec2-user@temporal-server-ip
docker ps | grep temporal
```

4. Check Temporal logs:
```bash
docker logs temporal
```

---

## Frontend Issues

### Frontend Not Loading

**Problem**: `http://instance1-ip` shows blank page or 404

**Solutions**:

1. Check Nginx is running:
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
sudo systemctl status nginx
```

2. Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

3. Verify frontend files are deployed:
```bash
ls -la /usr/share/nginx/html/
```

4. Check Nginx config:
```bash
sudo nginx -t
```

5. Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

### Frontend Cannot Connect to Backend

**Problem**: Frontend shows API errors in browser console

**Solutions**:

1. Check VITE_API_URL in frontend .env:
```bash
cat /home/ec2-user/org-eda-platform/frontend/.env
```

2. Verify backend is running:
```bash
curl http://instance1-ip:4000/health
```

3. Check browser console for CORS errors
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

4. Verify Nginx proxy config:
```bash
sudo cat /etc/nginx/conf.d/frontend.conf
```

5. Test API directly:
```bash
curl http://instance1-ip:4000/api/projects
```

---

### Frontend Cannot Connect to Hasura

**Problem**: GraphQL queries fail in frontend

**Solutions**:

1. Check VITE_HASURA_URL in frontend .env:
```bash
cat /home/ec2-user/org-eda-platform/frontend/.env
```

2. Test Hasura directly:
```bash
curl http://hasura-ip:8080/healthz
```

3. Check browser console for CORS errors

4. Verify Hasura is accessible from frontend instance:
```bash
ssh -i org-eda-key.pem ec2-user@instance1-ip
curl http://hasura-ip:8080/healthz
```

---

## Hasura Issues

### Hasura Container Not Starting

**Problem**: `docker ps` doesn't show hasura container

**Solutions**:

1. Check Docker is running:
```bash
ssh -i org-eda-key.pem ec2-user@hasura-ip
sudo systemctl status docker
```

2. Check container logs:
```bash
docker logs hasura
```

3. Try running container manually:
```bash
docker run -it \
  -p 8080:8080 \
  -e HASURA_GRAPHQL_DATABASE_URL="postgresql://postgres:password@rds-endpoint:5432/active_check" \
  -e HASURA_GRAPHQL_ADMIN_SECRET="your-secret" \
  hasura/graphql-engine:latest
```

4. Check if port 8080 is in use:
```bash
sudo lsof -i :8080
```

---

### Hasura Cannot Connect to Database

**Problem**: Hasura console shows database connection error

**Solutions**:

1. Verify database URL in container:
```bash
docker inspect hasura | grep HASURA_GRAPHQL_DATABASE_URL
```

2. Test database connection from container:
```bash
docker exec hasura psql -h rds-endpoint -U postgres -d active_check -c "SELECT 1"
```

3. Check RDS is running:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Status'
```

4. Verify credentials are correct

---

### Hasura Console Not Accessible

**Problem**: `http://hasura-ip:8080/console` shows error

**Solutions**:

1. Check Hasura is running:
```bash
docker ps | grep hasura
```

2. Check port 8080 is open:
```bash
sudo lsof -i :8080
```

3. Check security group allows port 8080:
```bash
aws ec2 describe-security-groups \
  --group-names org-eda-sg \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`8080`]'
```

4. Test from instance:
```bash
curl http://localhost:8080/healthz
```

---

## Temporal Issues

### Temporal Server Container Not Starting

**Problem**: `docker ps` doesn't show temporal container

**Solutions**:

1. Check Docker is running:
```bash
ssh -i org-eda-key.pem ec2-user@temporal-server-ip
sudo systemctl status docker
```

2. Check container logs:
```bash
docker logs temporal
```

3. Check if ports 7233 and 8233 are in use:
```bash
sudo lsof -i :7233
sudo lsof -i :8233
```

4. Try running container manually:
```bash
docker run -it \
  -p 7233:7233 \
  -p 8233:8233 \
  -e DB=postgresql \
  -e DB_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PWD=password \
  -e POSTGRES_SEEDS=rds-endpoint \
  temporalio/auto-setup:latest
```

---

### Temporal Server Cannot Connect to Database

**Problem**: Temporal logs show database connection error

**Solutions**:

1. Verify database URL in container:
```bash
docker inspect temporal | grep POSTGRES
```

2. Test database connection from container:
```bash
docker exec temporal psql -h rds-endpoint -U postgres -d active_check -c "SELECT 1"
```

3. Check RDS is running:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Status'
```

---

### Temporal UI Not Accessible

**Problem**: `http://temporal-server-ip:8233` shows error

**Solutions**:

1. Check Temporal is running:
```bash
docker ps | grep temporal
```

2. Check port 8233 is open:
```bash
sudo lsof -i :8233
```

3. Check security group allows port 8233:
```bash
aws ec2 describe-security-groups \
  --group-names org-eda-sg \
  --query 'SecurityGroups[].IpPermissions[?FromPort==`8233`]'
```

4. Test from instance:
```bash
curl http://localhost:8233
```

---

## Temporal Worker Issues

### Worker Service Not Starting

**Problem**: `systemctl status org-eda-worker` shows failed

**Solutions**:

1. Check service logs:
```bash
ssh -i org-eda-key.pem ec2-user@temporal-worker-ip
sudo journalctl -u org-eda-worker -n 50
```

2. Verify environment variables:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env
```

3. Check Node.js is installed:
```bash
node --version
```

4. Manually run worker to see errors:
```bash
cd /home/ec2-user/org-eda-platform/backend
node dist/temporal/worker.js
```

---

### Worker Cannot Connect to Temporal Server

**Problem**: Worker logs show connection error

**Solutions**:

1. Verify TEMPORAL_ADDRESS in .env:
```bash
cat /home/ec2-user/org-eda-platform/backend/.env | grep TEMPORAL
```

2. Test Temporal connection:
```bash
curl http://temporal-server-ip:7233
```

3. Check Temporal server is running:
```bash
ssh -i org-eda-key.pem ec2-user@temporal-server-ip
docker ps | grep temporal
```

4. Check network connectivity:
```bash
telnet temporal-server-ip 7233
```

---

## Database Issues

### Migrations Failed

**Problem**: Database tables not created

**Solutions**:

1. Check if migrations ran:
```bash
psql -h rds-endpoint -U postgres -d active_check -c "\dt"
```

2. Run migrations manually:
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

3. Check migration files exist:
```bash
ls -la docker/init_sql/
```

---

### RDS Cluster Not Starting

**Problem**: `aws rds start-db-cluster` fails

**Solutions**:

1. Check cluster status:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].Status'
```

2. Check for errors:
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier org-eda-cluster \
  --query 'DBClusters[].StatusBeingModified'
```

3. Wait a few minutes and try again (cluster may be in transition)

4. Check AWS service health:
   - Visit https://status.aws.amazon.com/

---

## Performance Issues

### Services Running Slowly

**Problem**: High latency or slow responses

**Solutions**:

1. Check instance CPU usage:
```bash
ssh -i org-eda-key.pem ec2-user@instance-ip
top
```

2. Check memory usage:
```bash
free -h
```

3. Check disk space:
```bash
df -h
```

4. Check network connectivity:
```bash
ping -c 5 8.8.8.8
```

5. Consider upgrading instance type (t3.small, t3.medium)

---

### High AWS Costs

**Problem**: Monthly bill higher than expected

**Solutions**:

1. Check data transfer costs:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-02-28 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

2. Stop unused instances:
```bash
./stop-all.sh
```

3. Review S3 storage:
```bash
aws s3 ls s3://org-eda-datasets-xxxxx --recursive --summarize
```

4. Set up billing alerts in AWS Console

---

## Getting Help

### Collect Debug Information

When reporting issues, collect:

```bash
# Instance info
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[].Instances[]'

# Service logs
sudo journalctl -u org-eda-backend -n 100
sudo journalctl -u org-eda-worker -n 100

# Docker logs
docker logs hasura
docker logs temporal

# System info
uname -a
node --version
npm --version
docker --version
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Connection refused` | Service not running | Check `systemctl status` |
| `Permission denied` | Wrong SSH key | Verify key permissions |
| `Database connection failed` | RDS not running | Start RDS cluster |
| `CORS error` | Frontend/Backend mismatch | Check environment URLs |
| `Port already in use` | Service conflict | Kill process or restart |
| `Out of memory` | Instance too small | Upgrade instance type |

---

## Quick Restart All Services

If everything is broken, try a full restart:

```bash
# Stop all
./stop-all.sh

# Wait 2 minutes
sleep 120

# Start all
./start-all.sh

# Wait 3 minutes for services to initialize
sleep 180

# Check status
./status.sh
```

---

**Last Updated**: February 11, 2026

