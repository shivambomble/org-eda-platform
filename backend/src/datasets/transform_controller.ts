import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { createTemporalClient } from '../temporal/client';
import { transformDatasetWorkflow } from '../temporal/workflows';

export const transformDataset = async (req: AuthRequest, res: Response) => {
    const { projectId, datasetId } = req.params;
    const { transformations } = req.body; // Optional instructions

    if (!projectId || !datasetId) {
        return res.status(400).json({ message: 'Missing projectId or datasetId' });
    }

    try {
        // 1. Check Permissions (Admin or Analyst assigned)
        const { role, org_id, id: userId } = req.user!;
        
        // Fetch Dataset to check status and project
        const dsRes = await query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
        if (dsRes.rows.length === 0) {
            return res.status(404).json({ message: 'Dataset not found' });
        }
        const dataset = dsRes.rows[0];

        // Check if Project ID matches (security check)
        if (dataset.project_id !== projectId) {
             return res.status(400).json({ message: 'Dataset does not belong to this project' });
        }

        // Validate Status
        if (dataset.status !== 'READY') {
            return res.status(400).json({ message: `Dataset cannot be transformed. Current status: ${dataset.status}` });
        }

        // Check Access
        // (Reusing logic: Admin of Org or Analyst of Project)
        const projRes = await query('SELECT org_id FROM projects WHERE id = $1', [projectId]);
        const projectOrgId = projRes.rows[0].org_id;

        let isAllowed = false;
        if (role === 'ADMIN' && org_id === projectOrgId) {
            isAllowed = true;
        } else if (role === 'ANALYST') {
             const assignRes = await query(
                'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
                [projectId, userId]
             );
             if (assignRes.rows.length > 0) isAllowed = true;
        }

        if (!isAllowed) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // 2. Trigger Workflow
        const client = await createTemporalClient();
        const workflowId = `transform-${datasetId}-${Date.now()}`;
        
        await client.workflow.start(transformDatasetWorkflow, {
            taskQueue: 'cleaning-queue', // Reuse same queue for simplicity
            workflowId: workflowId,
            args: [datasetId, transformations || []]
        });

        // 3. Respond
        res.status(202).json({
            message: 'Transformation workflow started',
            workflowId,
            datasetId
        });

    } catch (error) {
        console.error('Transform Dataset Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
