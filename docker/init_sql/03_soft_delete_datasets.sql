-- Add soft delete support to datasets table
ALTER TABLE datasets ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for soft delete queries (for performance)
CREATE INDEX idx_datasets_deleted_at ON datasets(deleted_at);
CREATE INDEX idx_datasets_project_deleted ON datasets(project_id, deleted_at);
