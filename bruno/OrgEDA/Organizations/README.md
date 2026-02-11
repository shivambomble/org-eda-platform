# Organization Management API

## Overview
These endpoints allow super-admin to create organizations and assign organization admins.

## Workflow

### 1. Create Organization
**Endpoint:** `POST /api/orgs`
- **Auth:** Super-admin token (user with no org_id)
- **Body:** `{ "name": "Organization Name" }`
- **Response:** Returns organization with ID

### 2. Create Organization Admin
**Endpoint:** `POST /api/orgs/admins`
- **Auth:** Super-admin token
- **Body:** `{ "orgId": "...", "email": "admin@org.com", "password": "..." }`
- **Response:** Returns admin user with ADMIN role

## Setup Steps

1. **Get Super-Admin Token**
   - Login as super-admin (user with no org_id)
   - Save the token as `super_admin_token` in environment

2. **Create Organization**
   - Call "Create Organization" request
   - Save the returned `organization.id`

3. **Create Organization Admin**
   - Use the organization ID from step 2
   - Call "Create Organization Admin" request
   - Save the returned `user.id` and token

4. **Org Admin Can Now:**
   - Create projects in their organization
   - Add members (ANALYST, USER) to their organization
   - Manage project members

## Notes
- Super-admin is identified by having `org_id = null`
- Organization admins have `role = 'ADMIN'` and belong to their organization
- Only super-admin can create organizations and org admins
- Org admins can only manage users/projects within their organization
