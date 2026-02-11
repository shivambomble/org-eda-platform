-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ANALYST', 'USER')),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- Datasets
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    s3_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'TRANSFORMING', 'TRANSFORMED')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleaning Logs
CREATE TABLE cleaning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EDA Results
CREATE TABLE eda_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboards
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Permissions
CREATE TABLE dashboard_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('VIEW', 'EDIT', 'ADMIN')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dashboard_id, user_id)
);

-- Inventory Alerts
CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'QUALITY_ISSUE', 'CUSTOM')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    inventory_manager_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Seed Data: Organization
INSERT INTO organizations (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Acme Corp');

-- Seed Data: Users (Password is 'password')
INSERT INTO users (id, email, password_hash, role, org_id) VALUES 
('22222222-2222-2222-2222-222222222222', 'admin@acme.com', '$2a$10$gY4oVyJBuFeyjooImMPdC.OUsAAYRDKi98u7o7OucDJv0ArgVqw3e', 'ADMIN', '11111111-1111-1111-1111-111111111111'),
('33333333-3333-3333-3333-333333333333', 'analyst@acme.com', '$2a$10$gY4oVyJBuFeyjooImMPdC.OUsAAYRDKi98u7o7OucDJv0ArgVqw3e', 'ANALYST', '11111111-1111-1111-1111-111111111111'),
('44444444-4444-4444-4444-444444444444', 'user@acme.com', '$2a$10$gY4oVyJBuFeyjooImMPdC.OUsAAYRDKi98u7o7OucDJv0ArgVqw3e', 'USER', '11111111-1111-1111-1111-111111111111');

-- Seed Data: Projects
INSERT INTO projects (id, name, org_id) VALUES
('55555555-5555-5555-5555-555555555555', 'Project Alpha', '11111111-1111-1111-1111-111111111111'),
('66666666-6666-6666-6666-666666666666', 'Project Beta', '11111111-1111-1111-1111-111111111111');

-- Seed Data: Project Members
INSERT INTO project_members (user_id, project_id) VALUES
('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'), -- Analyst assigned to Alpha only
('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555'), -- User assigned to Alpha
('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666'); -- User assigned to Beta

-- Seed Data: Dashboards
INSERT INTO dashboards (id, name, org_id, project_id, config, is_public) VALUES
('77777777-7777-7777-7777-777777777777', 'Sales Overview', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '{"layout": "grid"}', false),
('88888888-8888-8888-8888-888888888888', 'Public Stats', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '{"layout": "list"}', true);
