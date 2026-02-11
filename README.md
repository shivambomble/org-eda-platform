# OrgEDA Platform

Multi-tenant inventory analysis platform with role-based access control and real-time EDA capabilities.

## Quick Start

```bash
# Start all services
cd docker
docker-compose up -d

# Verify setup
./verify-setup.sh
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Hasura Console**: http://localhost:8081/console
- **Temporal UI**: http://localhost:8088

## Default Credentials

- Super Admin: `superadmin@orgeda.com` / `password123`

## Documentation

📚 **[Complete Documentation](./DOCUMENTATION.md)** - Full setup, API reference, and troubleshooting guide

### Quick Links
- [Dataset Processing Guide](./DATASET_PROCESSING_GUIDE.md)
- [Hasura Permissions Guide](./HASURA_PERMISSIONS_GUIDE.md)
- [SMTP Setup Guide](./SMTP_SETUP_GUIDE.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)

## Useful Scripts

- `verify-setup.sh` - Verify all services are running
- `apply-hasura-metadata.sh` - Apply Hasura permissions and metadata

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **GraphQL**: Hasura
- **Workflow Engine**: Temporal
- **API Testing**: Bruno

## Support

For detailed documentation, troubleshooting, and API reference, see [DOCUMENTATION.md](./DOCUMENTATION.md)
