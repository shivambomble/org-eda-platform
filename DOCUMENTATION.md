# OrgEDA Platform - Complete Documentation

## Overview
OrgEDA is a multi-tenant inventory analysis platform with role-based access control, real-time EDA (Exploratory Data Analysis), and collaborative features.

## Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **GraphQL**: Hasura
- **Workflow Engine**: Temporal
- **API Testing**: Bruno

### Key Features
- Multi-organization support with data isolation
- Role-based access control (ADMIN, ANALYST, USER)
- Real-time inventory analytics and dashboards
- Dataset upload and automated EDA processing
- Inventory alerts and notifications
- Project-based collaboration
- Search functionality across inventory data

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL client (optional)

### Setup

1. **Start Services**
```bash
cd org-eda-platform/docker
docker-compose up -d
```

2. **Verify Services**
```bash
./verify-setup.sh
```

3. **Access Applications**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Hasura Console: http://localhost:8081/console
- Temporal UI: http://localhost:8088

### Default Credentials
- Super Admin: `superadmin@orgeda.com` / `password123`

---

## User Roles & Permissions

### ADMIN
- Full access to organization data
- Create/manage projects
- Add/remove users (ANALYST, USER)
- Upload datasets
- Trigger data transformations
- View all dashboards

### ANALYST
- View assigned projects only
- Upload datasets
- View dashboards
- Search inventory
- Create alerts

### USER
- View assigned projects only
- View dashboards (read-only)
- Search inventory
- View alerts

---

## Organization Management

### Creating Organizations (Super-Admin Only)

1. **Login as Super-Admin**
```bash
# Via Bruno API
POST http://localhost:4000/auth/login
{
  "email": "superadmin@orgeda.com",
  "password": "password123"
}
```

2. **Create Organization**
```bash
POST http://localhost:4000/api/orgs
Authorization: Bearer <super_admin_token>
{
  "name": "Acme Corporation"
}
```

3. **Create Organization Admin**
```bash
POST http://localhost:4000/api/orgs/admins
Authorization: Bearer <super_admin_token>
{
  "orgId": "<org_id>",
  "email": "admin@acme.com",
  "password": "SecurePassword123"
}
```

---

## Dataset Processing

### Upload Dataset
```bash
POST http://localhost:4000/api/projects/:projectId/datasets
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <inventory.csv>
```

### Trigger EDA Analysis
```bash
POST http://localhost:4000/api/datasets/:datasetId/transform
Authorization: Bearer <token>
```

### Expected CSV Format
```csv
product_id,name,category,quantity,unit_price,supplier,reorder_level
P001,Widget A,Electronics,150,29.99,TechSupply,50
P002,Widget B,Hardware,75,15.50,BuildMart,30
```

---

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Organizations (Super-Admin)
- `POST /api/orgs` - Create organization
- `POST /api/orgs/admins` - Create org admin

### Projects
- `GET /api/projects` - List projects (filtered by org/role)
- `POST /api/orgs/:orgId/projects` - Create project (ADMIN)

### Users (ADMIN)
- `GET /api/users` - List users in organization
- `POST /api/users` - Create user (ANALYST/USER)
- `PUT /api/users/:userId/role` - Update user role
- `DELETE /api/users/:userId` - Delete user
- `POST /api/users/:userId/reset-password` - Reset password

### Datasets
- `POST /api/projects/:projectId/datasets` - Upload dataset
- `POST /api/datasets/:datasetId/transform` - Trigger EDA
- `GET /api/projects/:projectId/datasets/search` - Search inventory

### Alerts
- `POST /api/alerts` - Create inventory alert
- `GET /api/alerts` - List alerts

---

## Hasura Permissions

### Admin Role
- No explicit permissions (bypasses GraphQL layer)
- Uses backend API for all operations

### Analyst Role
- Can view projects they're assigned to
- Can view datasets in assigned projects
- Can view EDA results for assigned projects

### User Role
- Same as Analyst but read-only
- Cannot upload datasets or trigger transformations

---

## Troubleshooting

### Services Not Starting
```bash
cd org-eda-platform/docker
docker-compose down
docker-compose up -d
docker-compose logs -f
```

### Database Connection Issues
```bash
docker-compose exec postgres psql -U postgres -d active_check -c "SELECT 1;"
```

### Hasura Metadata Issues
```bash
cd org-eda-platform
./apply-hasura-metadata.sh
```

### Frontend Not Loading
```bash
# Check if backend is running
curl http://localhost:4000/health

# Rebuild frontend
cd org-eda-platform/frontend
npm install
docker-compose restart frontend
```

---

## Environment Variables

### Backend (.env)
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgrespassword@postgres:5432/active_check
JWT_SECRET=mysecretkeymustbeatleast32characterslong
HASURA_GRAPHQL_URL=http://graphql-engine:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecretkey
TEMPORAL_ADDRESS=temporal-server:7233
STORAGE_TYPE=filesystem
STORAGE_PATH=/app/storage

# SMTP Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@orgeda.com
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
VITE_HASURA_URL=http://localhost:8081/v1/graphql
```

---

## Deployment Checklist

- [ ] Update environment variables for production
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure SMTP for email notifications
- [ ] Set up backup strategy
- [ ] Configure monitoring and logging
- [ ] Review and update CORS settings
- [ ] Change default passwords
- [ ] Set up CI/CD pipeline
- [ ] Configure domain and DNS
- [ ] Test all user roles and permissions
- [ ] Load test with production data volume

---

## Support & Maintenance

### Useful Scripts
- `verify-setup.sh` - Verify all services are running
- `apply-hasura-metadata.sh` - Apply Hasura permissions
- `test-login.sh` - Test authentication

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f graphql-engine
```

### Database Access
```bash
docker-compose exec postgres psql -U postgres -d active_check
```

---

## License
Proprietary - All rights reserved
