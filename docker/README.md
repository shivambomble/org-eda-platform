# OrgEDA Platform - Docker Compose

This directory contains the Docker Compose configuration for running the entire OrgEDA platform locally.

## Services

### Infrastructure

- **postgres**: PostgreSQL database (port 5435)
- **graphql-engine**: Hasura GraphQL Engine (port 8081)
- **temporal-server**: Temporal workflow server (ports 7233, 8233)
- **temporal**: Temporal admin tools

### Application

- **backend**: Node.js API server (port 4000)
- **temporal-worker**: Temporal workflow worker
- **frontend**: React app served via Nginx (port 3000)

## Quick Start

### 1. Build and Start All Services

```bash
cd docker
docker-compose up --build
```

### 2. Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Hasura Console**: http://localhost:8081/console
- **Temporal UI**: http://localhost:8233

### 3. Stop Services

```bash
docker-compose down
```

### 4. Clean Up (Remove Volumes)

```bash
docker-compose down -v
```

## Development Workflow

### Rebuild Specific Service

```bash
docker-compose up --build backend
docker-compose up --build frontend
docker-compose up --build temporal-worker
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f temporal-worker
```

### Execute Commands in Container

```bash
# Backend shell
docker-compose exec backend sh

# Run migrations
docker-compose exec backend npm run migrate
```

## Environment Variables

Services use environment variables defined in `docker-compose.yml`. Key variables:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: JWT signing key
- `HASURA_ADMIN_SECRET`: Hasura admin secret
- `TEMPORAL_ADDRESS`: Temporal server address

## Network

All services run on the `org-eda-network` bridge network, allowing inter-service communication using service names as hostnames.

## Volumes

- `db_data`: Persistent PostgreSQL data

## Notes

- The backend service is configured for hot-reload in development
- Frontend is built and served via Nginx for production-like environment
- Temporal worker runs independently and connects to Temporal server
- Initial database schema is loaded from `init_sql/01_init.sql`
