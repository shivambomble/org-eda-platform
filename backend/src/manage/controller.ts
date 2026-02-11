import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';
import bcrypt from 'bcryptjs';

/**
 * Create a new organization
 * Only super-admin (no org_id) can create organizations
 */
export const createOrganization = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Organization name is required' });
  }

  try {
    // Check if requester is super-admin (has no org_id, meaning they're not part of any org)
    if (req.user?.org_id) {
      return res.status(403).json({ message: 'Only super-admin can create organizations' });
    }

    const result = await query(
      'INSERT INTO organizations (name, created_at) VALUES ($1, NOW()) RETURNING id, name, created_at',
      [name]
    );
    
    res.status(201).json({
      message: 'Organization created successfully',
      organization: result.rows[0]
    });
  } catch (error) {
    console.error('Create Org Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create organization admin user
 * Only super-admin can create org admins
 */
export const createOrgAdmin = async (req: AuthRequest, res: Response) => {
  const { orgId, email, password } = req.body;

  try {
    // Check if requester is super-admin
    if (req.user?.org_id) {
      return res.status(403).json({ message: 'Only super-admin can create org admins' });
    }

    // Validate input
    if (!orgId || !email || !password) {
      return res.status(400).json({ 
        message: 'Organization ID, email, and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if organization exists
    const orgCheck = await query(
      'SELECT id FROM organizations WHERE id = $1',
      [orgId]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create org admin user
    const result = await query(
      `INSERT INTO users (email, password_hash, role, org_id, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       RETURNING id, email, role, org_id, created_at`,
      [email, hashedPassword, 'ADMIN', orgId]
    );

    const newAdmin = result.rows[0];

    res.status(201).json({
      message: 'Organization admin created successfully',
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
        org_id: newAdmin.org_id,
        created_at: newAdmin.created_at
      }
    });

  } catch (error) {
    console.error('Create Org Admin Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  const { orgId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  // Check if user is ADMIN and belongs to the org
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only admins can create projects' });
  }

  if (req.user?.org_id?.toString() !== orgId?.toString()) {
    return res.status(403).json({ message: 'Cannot create projects in other organizations' });
  }

  try {
    const result = await query(
      'INSERT INTO projects (name, org_id) VALUES ($1, $2) RETURNING *',
      [name, orgId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new user (ANALYST or USER)
 * Only ADMIN can create users
 */
export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, role } = req.body;

  try {
    // Check if requester is ADMIN
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can create users' });
    }

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ 
        message: 'Email, password, and role are required' 
      });
    }

    // Validate role
    if (!['ANALYST', 'USER'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be ANALYST or USER' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in same organization as admin
    const result = await query(
      `INSERT INTO users (email, password_hash, role, org_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, org_id, created_at`,
      [email, hashedPassword, role, req.user.org_id]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        org_id: newUser.org_id,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all users in the organization
 * Only ADMIN can view users
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Check if requester is ADMIN
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view users' });
    }

    const search = req.query.search as string;
    let result;

    if (search) {
      // Search by email
      result = await query(
        `SELECT id, email, role, org_id, created_at, updated_at 
         FROM users 
         WHERE org_id = $1 AND email ILIKE $2
         ORDER BY created_at DESC
         LIMIT 20`,
        [req.user.org_id, `%${search}%`]
      );
    } else {
      result = await query(
        `SELECT id, email, role, org_id, created_at, updated_at 
         FROM users 
         WHERE org_id = $1 
         ORDER BY created_at DESC`,
        [req.user.org_id]
      );
    }

    res.json({
      users: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update user role
 * Only ADMIN can update users
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    // Check if requester is ADMIN
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can update users' });
    }

    // Validate role
    if (!['ANALYST', 'USER'].includes(role)) {
      return res.status(400).json({ 
        message: 'Role must be ANALYST or USER' 
      });
    }

    // Check if user exists and belongs to same org
    const userCheck = await query(
      'SELECT id, org_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].org_id !== req.user.org_id) {
      return res.status(403).json({ message: 'Cannot update users from other organizations' });
    }

    // Update user role
    const result = await query(
      `UPDATE users 
       SET role = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, role, org_id, updated_at`,
      [role, userId]
    );

    res.json({
      message: 'User role updated successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update User Role Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete a user
 * Only ADMIN can delete users
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  try {
    // Check if requester is ADMIN
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can delete users' });
    }

    // Check if user exists and belongs to same org
    const userCheck = await query(
      'SELECT id, org_id, email FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].org_id !== req.user.org_id) {
      return res.status(403).json({ message: 'Cannot delete users from other organizations' });
    }

    // Prevent deleting the last admin
    const adminCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE org_id = $1 AND role = $2',
      [req.user.org_id, 'ADMIN']
    );

    if (adminCount.rows[0].count === 1 && userCheck.rows[0].id !== req.user.id) {
      // This is the only admin, but we're trying to delete someone else - allow it
    } else if (adminCount.rows[0].count === 1 && userCheck.rows[0].id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete the last admin in the organization' });
    }

    // Delete user
    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      message: 'User deleted successfully',
      deletedUserId: userId
    });

  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset user password
 * Only ADMIN can reset passwords
 */
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  try {
    // Check if requester is ADMIN
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can reset passwords' });
    }

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists and belongs to same org
    const userCheck = await query(
      'SELECT id, org_id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].org_id !== req.user.org_id) {
      return res.status(403).json({ message: 'Cannot reset password for users from other organizations' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, role, updated_at`,
      [hashedPassword, userId]
    );

    res.json({
      message: 'Password reset successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all projects for the current user
 * ADMIN: sees all projects in their org
 * ANALYST/USER: sees only assigned projects
 */
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const orgId = req.user?.org_id;

    let result;

    if (userRole === 'ADMIN') {
      // ADMIN sees all projects in their organization
      result = await query(
        `SELECT id, name, org_id, created_at, updated_at 
         FROM projects 
         WHERE org_id = $1 
         ORDER BY created_at DESC`,
        [orgId]
      );
    } else {
      // ANALYST and USER see only assigned projects
      result = await query(
        `SELECT DISTINCT p.id, p.name, p.org_id, p.created_at, p.updated_at
         FROM projects p
         INNER JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );
    }

    res.json({
      projects: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

