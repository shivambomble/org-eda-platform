# OrgEDA Platform

A comprehensive multi-tenant data analysis and management platform with automated data cleaning workflows, real-time alerts, and collaborative project management capabilities.

## Overview

OrgEDA enables organizations to:
- Manage multiple projects and datasets
- Automate data cleaning and exploratory data analysis (EDA)
- Send real-time inventory alerts and notifications
- Collaborate with team members using role-based access control
- Scale reliably across distributed infrastructure

## Quick Start (Local Development)

```bash
# Start all services with Docker Compose
cd docker
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# Hasura Console: http://localhost:8081/console
# Temporal UI: http://localhost:8088
```

## Production Deployment

### Start All Services
```bash
./start-all-instances.sh
```

### Stop All Services
```bash
./stop-all-instances.sh
```

### Access Points (Production)

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://52.45.229.108 | Web application |
| Backend API | http://52.45.229.108:4000 | REST API |
| Hasura Console | http://44.219.224.92:8080/console | GraphQL API & Permissions |
| Temporal UI | http://3.228.55.161:8080 | Workflow Monitoring |

## Default Credentials

```
Email: superadmin@orgeda.com
Password: password123
```

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Apollo Client (GraphQL)
- **UI Components**: Custom React components

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15
- **GraphQL**: Hasura (auto-generated API)
- **Workflow Engine**: Temporal (distributed workflows)
- **Authentication**: JWT
- **File Storage**: AWS S3
- **Email**: SMTP (Gmail)

### Infrastructure
- **Cloud**: AWS EC2 (4 instances)
- **Containerization**: Docker & Docker Compose
- **Service Management**: Systemd
- **API Testing**: Bruno

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│              Instance 1: 52.45.229.108                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Backend (Express.js)                        │
│              Instance 1: 52.45.229.108:4000                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌────▼──────────┐ ┌──▼──────────────┐
│  PostgreSQL    │ │    Hasura     │ │    Temporal     │
│  Instance 1    │ │  Instance 2   │ │  Instance 3     │
└────────────────┘ └───────────────┘ └─────────────────┘
                         │
                    ┌────▼──────────┐
                    │ Temporal UI    │
                    │ Port: 8080     │
                    └────────────────┘

┌──────────────────────────────────────┐
│   Temporal Worker (Instance 4)        │
│   - Data Cleaning                     │
│   - EDA Processing                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   AWS S3 Bucket                       │
│   - Dataset Storage                   │
└──────────────────────────────────────┘
```

## Key Features

### 1. Organization & Project Management
- Multi-tenant support with isolated data
- Role-based access control (SUPER_ADMIN, ADMIN, ANALYST, USER)
- Organization admins manage users and projects
- Project-level member assignments

### 2. Dataset Management
- Upload datasets to projects
- Automatic S3 storage
- Dataset versioning and metadata
- Status tracking (UPLOADED, PROCESSING, READY, FAILED)

### 3. Automated Data Cleaning
- Temporal workflow-based processing
- Distributed worker architecture
- Automatic data validation and cleaning
- Processing logs and error tracking

### 4. Exploratory Data Analysis (EDA)
- Automated EDA on cleaned datasets
- Statistical insights and visualizations
- Results stored and queryable

### 5. Real-time Alerts
- Inventory alert system
- Email notifications via SMTP
- Alert status tracking (PENDING, ACKNOWLEDGED, RESOLVED)
- Customizable alert rules

### 6. Collaboration
- Project notes and comments
- Team member management
- Dashboard sharing and permissions
- Activity tracking

## Documentation

📚 **[Complete Project Documentation](./PROJECT_DOCUMENTATION.md)** - Comprehensive guide including:
- Detailed architecture and design
- Implementation details for each component
- Problems faced and solutions
- Deployment procedures
- Security considerations
- Performance optimization

## Deployment Scripts

### Start All Services
```bash
./start-all-instances.sh
```
Starts all 4 EC2 instances and their services:
- PostgreSQL on Instance 1
- Backend & Frontend on Instance 1
- Hasura on Instance 2
- Temporal Server & UI on Instance 3
- Temporal Worker on Instance 4

### Stop All Services
```bash
./stop-all-instances.sh
```
Gracefully stops all services and instances.

## Environment Configuration

### Backend (.env)
```
PORT=4000
DATABASE_URL=postgresql://postgres:password@host:5432/active_check
JWT_SECRET=your-secret-key-min-32-characters
HASURA_GRAPHQL_URL=http://hasura-host:8080/v1/graphql
HASURA_ADMIN_SECRET=your-hasura-secret
TEMPORAL_ADDRESS=temporal-host:7233
STORAGE_TYPE=s3
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Frontend (.env)
```
VITE_API_URL=http://backend-host:4000
VITE_HASURA_URL=http://hasura-host:8080/v1/graphql
```

## API Testing

Use Bruno to test API endpoints:
```bash
cd bruno/OrgEDA
# Open in Bruno IDE
```

Available test collections:
- **Auth** - Login endpoints
- **Organizations** - Create org and org admins
- **Dashboards** - Dashboard management
- **Datasets** - Dataset operations
- **Workflows** - Trigger data processing

## Database

### Initialization
Database is automatically initialized with:
- Schema creation
- Idempotency support for workflows
- Seed data (sample organization and users)

### Migrations
Located in `docker/init_sql/`:
- `01_init.sql` - Initial schema
- `02_add_idempotency_support.sql` - Workflow idempotency

## Workflow Processing

### Data Cleaning Workflow
1. User uploads dataset
2. Backend triggers `cleanDatasetWorkflow`
3. Temporal server queues the workflow
4. Worker picks up the task
5. Activities execute:
   - Download dataset from S3
   - Validate and clean data
   - Perform EDA
   - Upload results
6. Dataset status updates to READY

### Monitoring Workflows
Access Temporal UI at `http://3.228.55.161:8080` to:
- View workflow executions
- Monitor task queues
- Check worker status
- Debug failed workflows

## Troubleshooting

### Services Not Starting
```bash
# Check service status
sudo systemctl status org-eda-backend
sudo systemctl status org-eda-worker

# View logs
sudo journalctl -u org-eda-backend -f
sudo journalctl -u org-eda-worker -f
```

### Docker Container Issues
```bash
# Check running containers
docker ps

# View container logs
docker logs postgres
docker logs hasura
docker logs temporal

# Restart container
docker restart postgres
```

### Database Connection Issues
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check database connectivity
psql -h localhost -U postgres -d active_check
```

### Workflow Failures
1. Check Temporal UI for error details
2. Review worker logs: `sudo journalctl -u org-eda-worker -f`
3. Verify S3 credentials and bucket access
4. Check dataset format and size

## Performance Optimization

### Current Optimizations
- GraphQL query optimization via Hasura
- Distributed workflow processing
- S3 for scalable storage
- Connection pooling ready

### Recommended Enhancements
- Add Redis caching layer
- Implement database connection pooling
- Add CDN for frontend assets
- Enable workflow result caching
- Add monitoring (CloudWatch, Datadog)

## Security

### Implemented
- JWT authentication with expiration
- Role-based access control
- Password hashing (bcryptjs)
- Environment variable management
- AWS security groups

### Recommendations
- Enable HTTPS/TLS
- Implement rate limiting
- Add request validation
- Enable database encryption
- Use AWS Secrets Manager
- Enable VPC security

## Support & Documentation

For detailed information, see:
- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Complete technical documentation
- **[Backend README](./backend/README.md)** - Backend setup and development
- **[Frontend README](./frontend/README.md)** - Frontend setup and development
- **[Docker README](./docker/README.md)** - Docker configuration

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - All rights reserved

## Contact

**Project Lead**: [Your Name]
**Mentor**: [Mentor Name]
**Manager**: [Manager Name]
