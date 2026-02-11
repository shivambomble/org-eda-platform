# OrgEDA Bruno Test Suite

This directory contains the Bruno API test collection for the OrgEDA Platform.

## Setup

1. Install [Bruno](https://www.usebruno.com/)
2. Open Bruno and import this collection (`bruno/OrgEDA`)
3. Select the `Local` environment

## Environment Variables

The `Local` environment includes:

- `API_URL`: http://localhost:4000
- `HASURA_URL`: http://localhost:8081/v1/graphql
- `ADMIN_EMAIL`: admin@acme.com
- `ANALYST_EMAIL`: analyst@acme.com
- `USER_EMAIL`: user@acme.com
- `PASSWORD`: password

## Test Collections

### 1. Auth

Tests authentication endpoints:

- **Login Admin**: Authenticates as admin and stores token
- **Login Analyst**: Authenticates as analyst and stores token
- **Login User**: Authenticates as user and stores token
- **Login Invalid Credentials**: Negative test for invalid credentials

### 2. Datasets

Tests dataset upload functionality:

- **Upload Dataset (Admin)**: Successful upload as admin
- **Upload Dataset (User)**: Negative test - should return 403

### 3. Workflows

Tests workflow trigger endpoints:

- **Trigger Transform (Admin)**: Successful transformation trigger
- **Trigger Transform (User - Forbidden)**: Negative test - should return 403

### 4. Dashboards

Tests GraphQL queries for dashboards:

- **Get Projects**: Fetch all projects (admin view)
- **Get Projects (Analyst - Limited)**: RBAC test - analyst sees only assigned projects
- **Get Dashboards**: Fetch dashboards with visibility rules

## Running Tests

### Sequential Execution

1. Run all **Auth** requests first to populate tokens
2. Run **Datasets** requests to upload test data
3. Update dataset IDs in **Workflows** requests
4. Run **Workflows** and **Dashboards** requests

### Expected Results

- **Admin**: Full access to all endpoints
- **Analyst**: Limited to assigned projects
- **User**: Read-only access, 403 on mutations

## Notes

- Replace `REPLACE_WITH_DATASET_ID` in workflow requests with actual dataset IDs from upload responses
- Ensure backend and Hasura are running on localhost
- Tokens are stored in environment variables after successful login
