# OrgEDA Platform - Project Documentation

## Executive Summary

OrgEDA is a comprehensive data analysis and management platform designed for organizations to upload, process, and analyze datasets with automated data cleaning workflows, real-time alerts, and collaborative project management capabilities.

---

## Project Overview

### Objectives
- Enable organizations to manage multiple projects and datasets
- Automate data cleaning and exploratory data analysis (EDA)
- Provide real-time inventory alerts and notifications
- Support multi-user collaboration with role-based access control
- Ensure scalability and reliability through distributed architecture

### Key Features
1. **Organization & Project Management** - Multi-tenant support with role-based access
2. **Dataset Management** - Upload, store, and version control datasets
3. **Automated Data Cleaning** - Temporal workflow-based data processing
4. **EDA Results** - Automated exploratory data analysis and insights
5. **Inventory Alerts** - Real-time email notifications for inventory issues
6. **Notes & Collaboration** - Team collaboration on projects
7. **Dashboard System** - Customizable dashboards with permission controls

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast development server and optimized builds)
- **Styling**: Tailwind CSS (utility-first CSS framework)
- **State Management**: Apollo Client (GraphQL client)
- **UI Components**: Custom components (Button, Card, Input)
- **Routing**: React Router
- **HTTP Client**: Apollo Client for GraphQL queries

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js (lightweight HTTP server)
- **Language**: TypeScript
- **Database**: PostgreSQL 15 (primary data store)
- **GraphQL**: Hasura (auto-generated GraphQL API)
- **Workflow Engine**: Temporal (distributed workflow orchestration)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **File Storage**: AWS S3 (cloud object storage)
- **Email Service**: SMTP (Gmail for alerts), Nodemailer

### Infrastructure
- **Cloud Provider**: AWS
- **Compute**: EC2 instances (4 instances for different services)
- **Database**: PostgreSQL (self-hosted on EC2)
- **Object Storage**: S3 (dataset storage)
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Systemd (service management)

### DevOps & Tools
- **API Testing**: Bruno (REST client)
- **Version Control**: Git & GitHub
- **CI/CD**: Manual deployment scripts
- **Monitoring**: Docker logs, systemd journalctl

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│              Instance 1: 52.45.229.108:3000                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (Express.js)                        │
│              Instance 1: 52.45.229.108:4000                 │
│  - Authentication & Authorization                           │
│  - Organization & Project Management                        │
│  - Dataset Upload & Processing                              │
│  - Workflow Orchestration                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────┐
│  PostgreSQL    │ │    Hasura     │ │    Temporal     │
│  Instance 1    │ │  Instance 2   │ │  Instance 3     │
│  Port: 5432    │ │  Port: 8080   │ │  Port: 7233     │
└────────────────┘ └───────────────┘ └─────────────────┘
                         │
                    ┌────▼──────────┐
                    │ Temporal UI    │
                    │ Port: 8080     │
                    └────────────────┘

┌──────────────────────────────────────┐
│   Temporal Worker (Instance 4)        │
│   - Data Cleaning Activities          │
│   - EDA Processing                    │
│   - Workflow Execution                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   AWS S3 Bucket                       │
│   - Dataset Storage                   │
│   - File Persistence                  │
└──────────────────────────────────────┘
```

### Instance Breakdown

| Instance | Role | Services | IP |
|----------|------|----------|-----|
| Instance 1 | Backend + Frontend | Express.js, Nginx, PostgreSQL | 52.45.229.108 |
| Instance 2 | GraphQL API | Hasura | 44.219.224.92 |
| Instance 3 | Workflow Server | Temporal Server, Temporal UI | 3.228.55.161 |
| Instance 4 | Worker | Temporal Worker | 34.236.179.246 |

---

## Implementation Details

### 1. Authentication & Authorization

**Implementation**:
- JWT-based authentication with 1-hour token expiration
- Role-based access control (SUPER_ADMIN, ADMIN, ANALYST, USER)
- Super-admin for system-level operations (create organizations)
- Organization admins for managing their organization
- Analysts and users for data analysis and viewing

**Key Files**:
- `backend/src/auth/controller.ts` - Login and token generation
- `backend/src/middleware/auth.ts` - JWT verification middleware
- `backend/src/manage/controller.ts` - Role-based permission checks

### 2. Data Management

**Organization Structure**:
```
Organization
├── Projects
│   ├── Datasets
│   │   ├── Cleaning Logs
│   │   └── EDA Results
│   ├── Project Members
│   └── Dashboards
└── Users (ADMIN, ANALYST, USER)
```

**Database Schema**:
- `organizations` - Organization records
- `users` - User accounts with roles
- `projects` - Project containers
- `datasets` - Dataset metadata and status
- `project_members` - User-project assignments
- `cleaning_logs` - Data cleaning operation logs
- `eda_results` - Exploratory data analysis results
- `dashboards` - Dashboard configurations
- `inventory_alerts` - Alert records

### 3. Workflow Processing (Temporal)

**Workflow Architecture**:
```
User Uploads Dataset
        ↓
Backend Triggers Workflow
        ↓
Temporal Server Queues Task
        ↓
Temporal Worker Picks Up Task
        ↓
Activity: Download from S3
        ↓
Activity: Clean Data
        ↓
Activity: Perform EDA
        ↓
Activity: Upload Results
        ↓
Update Dataset Status to READY
```

**Key Components**:
- `backend/src/temporal/workflows.ts` - Workflow definitions
- `backend/src/temporal/activities.ts` - Activity implementations
- `backend/src/temporal/worker.ts` - Worker process
- `backend/src/temporal/client.ts` - Workflow client

### 4. File Storage (S3)

**Implementation**:
- Datasets stored in S3 with path format: `s3://bucket/projects/{projectId}/datasets/{filename}`
- Automatic download from S3 during workflow processing
- AWS SDK v3 for S3 operations
- Environment-based configuration (S3 vs filesystem)

**Key File**:
- `backend/src/lib/storage.ts` - S3 download and file operations

### 5. Email Alerts (SMTP)

**Implementation**:
- Gmail SMTP for sending inventory alerts
- Nodemailer for email transport
- Alert triggers on inventory issues (low stock, out of stock, etc.)
- Configurable recipient emails

**Configuration**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=shibostats@gmail.com
SMTP_PASSWORD=<app-password>
SMTP_FROM_EMAIL=shibostats@gmail.com
```

---

## Problems Faced & Solutions

### Problem 1: S3 Download Not Implemented
**Issue**: Workflows failed with "S3 download not implemented yet" error when processing datasets from S3.

**Root Cause**: The `storage.ts` file only threw an error for S3 paths without implementing actual download logic.

**Solution**:
- Implemented S3 download using AWS SDK `GetObjectCommand`
- Added S3 client initialization with AWS credentials from environment variables
- Updated storage.ts to handle both `file://` (filesystem) and `s3://` (S3) paths
- Added proper error handling and logging

**Code Changes**:
```typescript
// Added S3 client initialization
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Implemented S3 download
const command = new GetObjectCommand({
  Bucket: bucketName,
  Key: objectKey,
});
const response = await s3Client.send(command);
```

### Problem 2: Temporal Worker Connection Issues
**Issue**: Worker couldn't connect to Temporal server due to incorrect IP configuration.

**Root Cause**: Backend .env was using Public IPs (Elastic IPs) for inter-instance communication instead of Private IPs.

**Solution**:
- Clarified IP usage: Private IPs (172.31.x.x) for inter-instance communication, Public IPs for external access
- Updated Instance 4 worker .env to use Private IP of Temporal server (172.31.17.250:7233)
- Updated Instance 1 backend .env to use Private IPs for database and Temporal connections
- Restarted services after configuration changes

**Configuration**:
```
# Backend .env (Instance 1)
TEMPORAL_ADDRESS=172.31.17.250:7233  # Private IP
HASURA_GRAPHQL_URL=http://172.31.x.x:8080/v1/graphql  # Private IP

# Worker .env (Instance 4)
TEMPORAL_ADDRESS=172.31.17.250:7233  # Private IP
DATABASE_URL=postgresql://postgres:password@org-eda-cluster.rds.amazonaws.com:5432/active_check
```

### Problem 3: SMTP Email Configuration Not Working
**Issue**: Backend logs showed "SMTP not configured. Emails will be logged to console only."

**Root Cause**: SMTP config was added to .env but backend service wasn't restarted to load new environment variables.

**Solution**:
- Added SMTP configuration to backend .env
- Restarted org-eda-backend service to load new configuration
- Verified alerts now send actual emails instead of just logging

**Configuration Added**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=shibostats@gmail.com
SMTP_PASSWORD=<app-password>
SMTP_FROM_EMAIL=shibostats@gmail.com
```

### Problem 4: PostgreSQL Container Not Running After Instance Restart
**Issue**: After stopping and restarting EC2 instances, Docker containers didn't auto-start.

**Root Cause**: Docker containers don't automatically restart when instances are stopped/restarted unless configured with restart policies.

**Solution**:
- Manually restart containers after instance restart
- Created automation scripts (start-all-instances.sh, stop-all-instances.sh) to handle container lifecycle
- Added sleep delays between container starts to ensure dependencies are ready

**Script Implementation**:
```bash
# Start PostgreSQL first
docker start postgres
sleep 5

# Then start dependent services
docker start hasura
sudo systemctl start org-eda-backend
```

### Problem 5: Temporal UI Not Accessible
**Issue**: Temporal UI port 8233 was listening but not responding to requests.

**Root Cause**: The `temporalio/auto-setup:latest` image doesn't include the UI server by default.

**Solution**:
- Ran separate Temporal UI container using `temporalio/ui:latest` image
- Configured UI container with `--network host` to allow connection to Temporal server
- Set `TEMPORAL_ADDRESS=localhost:7233` for UI to reach the server
- Added port 8080 to security group for external access

**Container Configuration**:
```bash
docker run -d \
  --name temporal-ui \
  --network host \
  -e TEMPORAL_ADDRESS=localhost:7233 \
  temporalio/ui:latest
```

### Problem 6: Role-Based Access Control Architecture
**Issue**: Super-admin and org-admin both had `role = 'ADMIN'`, making it hard to distinguish permission levels.

**Root Cause**: Insufficient role granularity in the database schema.

**Solution**:
- Added new `SUPER_ADMIN` role to the database constraint
- Updated auth controller to map `SUPER_ADMIN` to `super_admin` Hasura role
- Updated permission checks to explicitly check `role === 'SUPER_ADMIN'` instead of checking `org_id`
- Created clear separation: SUPER_ADMIN (system-level), ADMIN (org-level), ANALYST/USER (data-level)

**Database Changes**:
```sql
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'USER'));
```

---

## Deployment

### Infrastructure Setup
1. **4 EC2 instances** on AWS (Amazon Linux 2023)
2. **PostgreSQL 15** for data persistence
3. **Docker** for containerization
4. **Systemd** for service management
5. **AWS S3** for dataset storage

### Deployment Process
1. SSH into each instance
2. Install dependencies (Node.js, Docker, Git)
3. Clone repository
4. Build backend and frontend
5. Configure environment variables
6. Start services via systemd or Docker
7. Run database migrations

### Automation Scripts
- `start-all-instances.sh` - Start all instances and services
- `stop-all-instances.sh` - Stop all services and instances
- Uses SSH for reliable service management
- Includes proper startup sequencing and delays

---

## Performance & Scalability

### Current Architecture
- **Horizontal Scaling**: Can add more Temporal workers for parallel processing
- **Database**: PostgreSQL handles concurrent connections
- **Storage**: S3 provides unlimited scalability
- **API**: Hasura auto-generates optimized GraphQL queries

### Optimization Opportunities
1. Add caching layer (Redis) for frequently accessed data
2. Implement database connection pooling
3. Add CDN for frontend assets
4. Implement workflow result caching
5. Add monitoring and alerting (CloudWatch, Datadog)

---

## Security Considerations

### Implemented
- JWT authentication with expiration
- Role-based access control
- Password hashing with bcryptjs
- Environment variable management for secrets
- HTTPS-ready infrastructure

### Recommendations
1. Enable HTTPS/TLS for all communications
2. Implement rate limiting on API endpoints
3. Add request validation and sanitization
4. Enable database encryption at rest
5. Implement audit logging for sensitive operations
6. Use AWS Secrets Manager for credential management
7. Enable VPC security groups and network ACLs

---

## Testing

### Manual Testing
- Bruno API collection for endpoint testing
- Login workflows (Super-admin, Org-admin, Analyst, User)
- Organization and project creation
- Dataset upload and processing
- Workflow execution and monitoring
- Email alert delivery

### Test Coverage
- Temporal workflow tests in `backend/src/temporal/__tests__/`
- Activity tests for data processing
- Workflow execution tests

---

## Future Enhancements

1. **Advanced Analytics**: Machine learning models for data insights
2. **Real-time Collaboration**: WebSocket support for live updates
3. **Data Versioning**: Track dataset changes over time
4. **Custom Workflows**: Allow users to define custom processing workflows
5. **API Rate Limiting**: Prevent abuse and ensure fair usage
6. **Advanced Permissions**: Granular permission controls per resource
7. **Audit Logging**: Complete audit trail of all operations
8. **Mobile App**: Native mobile application for on-the-go access

---

## Conclusion

OrgEDA successfully demonstrates a production-ready distributed system with:
- Multi-tenant architecture supporting organizations and projects
- Automated data processing using Temporal workflows
- Real-time notifications and alerts
- Scalable cloud infrastructure on AWS
- Comprehensive role-based access control
- Reliable deployment and management automation

The platform is ready for deployment and can handle enterprise-scale data analysis workloads.

---

## Team & Contact

**Project Lead**: [Your Name]
**Mentor**: [Mentor Name]
**Manager**: [Manager Name]

**Repository**: [GitHub URL]
**Documentation**: This file
**Deployment Scripts**: `start-all-instances.sh`, `stop-all-instances.sh`

---

## Appendix

### Key Files Reference
- Frontend: `org-eda-platform/frontend/src/`
- Backend: `org-eda-platform/backend/src/`
- Database: `org-eda-platform/docker/init_sql/`
- Workflows: `org-eda-platform/backend/src/temporal/`
- API Tests: `org-eda-platform/bruno/`

### Environment Variables
See `.env.example` files in backend and frontend directories for complete configuration options.

### Useful Commands
```bash
# Start all services
./start-all-instances.sh

# Stop all services
./stop-all-instances.sh

# View backend logs
sudo journalctl -u org-eda-backend -f

# View worker logs
sudo journalctl -u org-eda-worker -f

# Check Docker containers
docker ps

# View Temporal UI
http://3.228.55.161:8080
```
