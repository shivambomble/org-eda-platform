import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';
import { sendInventoryAlert } from '../lib/email';

export const createInventoryAlert = async (req: AuthRequest, res: Response) => {
  const { 
    projectId, 
    datasetId, 
    alertType, 
    priority, 
    title, 
    message, 
    inventoryManagerEmail 
  } = req.body;

  try {
    // Check permissions - only admin and analyst can create alerts
    const { role, org_id, id: userId } = req.user!;
    
    if (role === 'USER') {
      return res.status(403).json({ message: 'Only admins and analysts can create inventory alerts' });
    }

    // Get user email from database
    const userRes = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userRes.rows.length > 0 ? userRes.rows[0].email : 'unknown@example.com';

    // Validate required fields
    if (!projectId || !title || !message || !inventoryManagerEmail) {
      return res.status(400).json({ 
        message: 'Missing required fields: projectId, title, message, inventoryManagerEmail' 
      });
    }

    // Validate project access
    const projectRes = await query('SELECT org_id FROM projects WHERE id = $1', [projectId]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const projectOrgId = projectRes.rows[0].org_id;

    // Check access permissions
    let hasAccess = false;
    if (role === 'ADMIN' && org_id === projectOrgId) {
      hasAccess = true;
    } else if (role === 'ANALYST') {
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      hasAccess = memberRes.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this project' });
    }

    // Validate dataset if provided
    if (datasetId) {
      const datasetRes = await query(
        'SELECT 1 FROM datasets WHERE id = $1 AND project_id = $2',
        [datasetId, projectId]
      );
      if (datasetRes.rows.length === 0) {
        return res.status(404).json({ message: 'Dataset not found in this project' });
      }
    }

    // Create the alert
    const alertRes = await query(
      `INSERT INTO inventory_alerts 
       (project_id, dataset_id, created_by, alert_type, priority, title, message, inventory_manager_email) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        projectId,
        datasetId || null,
        userId,
        alertType || 'CUSTOM',
        priority || 'MEDIUM',
        title,
        message,
        inventoryManagerEmail
      ]
    );

    const alert = alertRes.rows[0];

    // Send email notification
    try {
      await sendInventoryAlert({
        alertId: alert.id,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        alertType: alert.alert_type,
        createdBy: userEmail,
        projectId: projectId,
        inventoryManagerEmail: inventoryManagerEmail
      });
      
      console.log(`Inventory alert email sent to ${inventoryManagerEmail}`);
    } catch (emailError) {
      console.error('Failed to send alert email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Inventory alert created successfully',
      alert: {
        id: alert.id,
        title: alert.title,
        priority: alert.priority,
        status: alert.status,
        createdAt: alert.created_at
      }
    });

  } catch (error) {
    console.error('Create Inventory Alert Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInventoryAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { role, org_id, id: userId } = req.user!;
    const { projectId, status } = req.query;

    let whereClause = '';
    let params: any[] = [];

    // Build where clause based on role
    if (role === 'ADMIN') {
      whereClause = 'WHERE p.org_id = $1';
      params.push(org_id);
    } else if (role === 'ANALYST') {
      whereClause = `WHERE p.org_id = $1 AND EXISTS (
        SELECT 1 FROM project_members pm 
        WHERE pm.project_id = a.project_id AND pm.user_id = $2
      )`;
      params.push(org_id, userId);
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add project filter if specified
    if (projectId) {
      whereClause += ` AND a.project_id = $${params.length + 1}`;
      params.push(projectId);
    }

    // Add status filter if specified
    if (status) {
      whereClause += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    const alertsRes = await query(
      `SELECT 
        a.*,
        p.name as project_name,
        u.email as created_by_email,
        d.file_name as dataset_name
       FROM inventory_alerts a
       JOIN projects p ON a.project_id = p.id
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN datasets d ON a.dataset_id = d.id
       ${whereClause}
       ORDER BY a.created_at DESC`,
      params
    );

    res.json({
      alerts: alertsRes.rows
    });

  } catch (error) {
    console.error('Get Inventory Alerts Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateAlertStatus = async (req: AuthRequest, res: Response) => {
  const { alertId } = req.params;
  const { status, notes } = req.body;

  try {
    const { role, org_id, id: userId } = req.user!;

    // Validate status
    const validStatuses = ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check if alert exists and user has access
    const alertRes = await query(
      `SELECT a.*, p.org_id as project_org_id 
       FROM inventory_alerts a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = $1`,
      [alertId]
    );

    if (alertRes.rows.length === 0) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    const alert = alertRes.rows[0];

    // Check permissions
    let hasAccess = false;
    if (role === 'ADMIN' && org_id === alert.project_org_id) {
      hasAccess = true;
    } else if (role === 'ANALYST') {
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [alert.project_id, userId]
      );
      hasAccess = memberRes.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update the alert
    let updateFields = ['status = $2', 'updated_at = NOW()'];
    let updateParams = [alertId, status];

    if (status === 'ACKNOWLEDGED') {
      updateFields.push('acknowledged_at = NOW()', `acknowledged_by = $${updateParams.length + 1}`);
      updateParams.push(userId);
    } else if (status === 'RESOLVED') {
      updateFields.push('resolved_at = NOW()', `resolved_by = $${updateParams.length + 1}`);
      updateParams.push(userId);
    }

    const updateRes = await query(
      `UPDATE inventory_alerts 
       SET ${updateFields.join(', ')}
       WHERE id = $1 
       RETURNING *`,
      updateParams
    );

    res.json({
      message: 'Alert status updated successfully',
      alert: updateRes.rows[0]
    });

  } catch (error) {
    console.error('Update Alert Status Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};