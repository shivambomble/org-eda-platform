import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { uploadFile } from '../lib/storage';
import path from 'path';
import { createTemporalClient } from '../temporal/client';
import { cleanDatasetWorkflow } from '../temporal/workflows';

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export const uploadDataset = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ message: 'Invalid file type. Only CSV/Excel allowed.' });
  }

  // Access Control: Admin of Org OR Analyst assigned to Project
  // 1. Check Project exists and get Org ID
  try {
    const projectRes = await query('SELECT org_id FROM projects WHERE id = $1', [projectId]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const projectOrgId = projectRes.rows[0].org_id;

    // 2. Validate Permissions
    const { role, org_id, id: userId } = req.user!;
    let isAllowed = false;

    if (role === 'ADMIN' && org_id === projectOrgId) {
      isAllowed = true;
    } else if (role === 'ANALYST') {
      // Check assignment
      const assignRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (assignRes.rows.length > 0) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    // 3. Upload to storage (filesystem or S3)
    const key = `projects/${projectId}/datasets/${Date.now()}_${file.originalname}`;
    const storagePath = await uploadFile(file, key);

    // 4. Save Metadata
    const insertRes = await query(
      `INSERT INTO datasets (project_id, file_name, s3_path, size_bytes, uploaded_by, status) 
       VALUES ($1, $2, $3, $4, $5, 'UPLOADED') RETURNING *`,
      [projectId, file.originalname, storagePath, file.size, userId]
    );

    res.status(201).json(insertRes.rows[0]);

    // Trigger Temporal Workflow (Async)
    try {
        const client = await createTemporalClient();
        await client.workflow.start(cleanDatasetWorkflow, {
            taskQueue: 'cleaning-queue',
            workflowId: `clean-${insertRes.rows[0].id}`,
            args: [insertRes.rows[0].id]
        });
        console.log(`Started workflow clean-${insertRes.rows[0].id}`);
    } catch (wfError) {
        console.error("Failed to start workflow:", wfError);
        // Don't fail the request, just log
    }

  } catch (error) {
    console.error('Upload Dataset Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteDataset = async (req: AuthRequest, res: Response) => {
  const { projectId, datasetId } = req.params;

  try {
    // Get dataset info
    const dsRes = await query('SELECT * FROM datasets WHERE id = $1 AND project_id = $2', [datasetId, projectId]);
    if (dsRes.rows.length === 0) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    const dataset = dsRes.rows[0];

    // Get project org_id
    const projRes = await query('SELECT org_id FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const projectOrgId = projRes.rows[0].org_id;

    // Access Control: Only Admin or Analyst can delete
    const { role, org_id, id: userId } = req.user!;
    let isAllowed = false;

    if (role === 'ADMIN' && org_id === projectOrgId) {
      isAllowed = true;
    } else if (role === 'ANALYST') {
      // Check if analyst is assigned to project
      const assignRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (assignRes.rows.length > 0) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ message: 'Forbidden: Only Admin and Analyst can delete datasets' });
    }

    // Delete dataset record (cascade will handle related records)
    await query('DELETE FROM datasets WHERE id = $1', [datasetId]);

    res.json({ message: 'Dataset deleted successfully', datasetId });

  } catch (error) {
    console.error('Delete Dataset Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const retriggerWorkflow = async (req: AuthRequest, res: Response) => {
  const { datasetId } = req.params;

  try {
    // Check if user is admin
    const { role, org_id } = req.user!;
    if (role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can retrigger workflows' });
    }

    // Get dataset info
    const dsRes = await query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
    if (dsRes.rows.length === 0) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    const dataset = dsRes.rows[0];

    // Check if dataset belongs to admin's org
    const projRes = await query('SELECT org_id FROM projects WHERE id = $1', [dataset.project_id]);
    if (projRes.rows.length === 0 || projRes.rows[0].org_id !== org_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Trigger workflow regardless of current status
    try {
      const client = await createTemporalClient();
      const workflowId = `clean-${dataset.id}-retrigger-${Date.now()}`;
      
      await client.workflow.start(cleanDatasetWorkflow, {
        taskQueue: 'cleaning-queue',
        workflowId: workflowId,
        args: [dataset.id]
      });

      console.log(`Retriggered workflow ${workflowId} for dataset ${dataset.id}`);
      
      res.json({
        message: 'Workflow retriggered successfully',
        workflowId,
        datasetId: dataset.id,
        currentStatus: dataset.status
      });

    } catch (wfError: unknown) {
      const errorMessage = wfError instanceof Error ? wfError.message : 'Unknown error';
      console.error("Failed to start workflow:", wfError);
      res.status(500).json({ 
        message: 'Failed to start workflow', 
        error: errorMessage
      });
    }

  } catch (error) {
    console.error('Retrigger Workflow Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
