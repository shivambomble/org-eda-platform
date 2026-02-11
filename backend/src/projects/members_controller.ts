import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';

export const addProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;
    const currentUser = req.user!;

    // Only admins and analysts can add members
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'ANALYST') {
      return res.status(403).json({ message: 'Only admins and analysts can add project members' });
    }

    // Verify project belongs to user's org
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (projectRes.rows[0].org_id !== currentUser.org_id) {
      return res.status(403).json({ message: 'Project does not belong to your organization' });
    }

    // Find user by email
    const userRes = await query(
      'SELECT id, role, org_id FROM users WHERE email = $1',
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const targetUser = userRes.rows[0];

    // Can add USER or ANALYST roles to projects
    if (targetUser.role !== 'USER' && targetUser.role !== 'ANALYST') {
      return res.status(400).json({ message: 'Can only add users and analysts to projects' });
    }

    if (targetUser.org_id !== currentUser.org_id) {
      return res.status(400).json({ message: 'User must be in the same organization' });
    }

    // Check if already a member
    const existingMember = await query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, targetUser.id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Add member
    await query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
      [projectId, targetUser.id]
    );

    res.status(201).json({ message: 'Member added successfully', userId: targetUser.id, email: targetUser.email });
  } catch (error) {
    console.error('Add Project Member Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeProjectMember = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, userId } = req.params;
    const adminUser = req.user!;

    // Only admins can remove members
    if (adminUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can remove project members' });
    }

    // Verify project belongs to admin's org
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (projectRes.rows[0].org_id !== adminUser.org_id) {
      return res.status(403).json({ message: 'Project does not belong to your organization' });
    }

    // Remove member
    const result = await query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Member not found in this project' });
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove Project Member Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProjectMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const user = req.user!;

    // Verify user has access to this project
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (projectRes.rows[0].org_id !== user.org_id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get members
    const membersRes = await query(
      `SELECT u.id, u.email, u.role, pm.assigned_at 
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.assigned_at DESC`,
      [projectId]
    );

    res.status(200).json(membersRes.rows);
  } catch (error) {
    console.error('Get Project Members Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
