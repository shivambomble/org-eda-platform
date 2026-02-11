-- Add idempotency and state management support to datasets table
-- This migration adds columns to track workflow executions and support new status states

-- Add workflow_id column to track which workflow processed the dataset
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS workflow_id TEXT;

-- Add new status values for better state tracking
-- Note: The CHECK constraint already includes these in the original schema,
-- but we're adding them here for clarity if the original schema needs updating

-- Update the status CHECK constraint to include new states
-- First, we need to drop the old constraint and add a new one
ALTER TABLE datasets 
DROP CONSTRAINT IF EXISTS datasets_status_check;

ALTER TABLE datasets 
ADD CONSTRAINT datasets_status_check 
CHECK (status IN (
    'UPLOADED',           -- Initial state after upload
    'PROCESSING',         -- Generic processing state
    'CLEANING',           -- Currently being cleaned
    'READY',              -- Cleaned and ready for transformation
    'TRANSFORMING',       -- Currently being transformed
    'TRANSFORMED',        -- Transformation complete, ready for EDA
    'EDA_RUNNING',        -- EDA analysis in progress
    'EDA_COMPLETE',       -- EDA analysis complete
    'EDA_FAILED',         -- EDA analysis failed
    'TRANSFORM_FAILED',   -- Transformation failed
    'FAILED'              -- Generic failure state
));

-- Create index on workflow_id for faster idempotency checks
CREATE INDEX IF NOT EXISTS idx_datasets_workflow_id ON datasets(workflow_id);

-- Create index on status for faster state queries
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);

-- Create index on project_id and status for common queries
CREATE INDEX IF NOT EXISTS idx_datasets_project_status ON datasets(project_id, status);

-- Add comment to document the workflow_id column
COMMENT ON COLUMN datasets.workflow_id IS 'Temporal workflow ID that processed this dataset for idempotency tracking';
