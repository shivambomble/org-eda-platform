import { Router } from 'express';
import { 
  createOrganization,
  createOrgAdmin,
  createProject, 
  createUser, 
  getUsers, 
  updateUserRole, 
  deleteUser, 
  resetUserPassword,
  getProjects
} from './controller';
import { addProjectMember, removeProjectMember, getProjectMembers } from '../projects/members_controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Organization Management (super-admin only)
router.post('/orgs', authenticate, createOrganization);
router.post('/orgs/admins', authenticate, createOrgAdmin);

// Project Management
router.post('/orgs/:orgId/projects', authenticate, requireRole('ADMIN'), createProject);
router.get('/projects', authenticate, getProjects);

// Project Member Management
router.post('/projects/:projectId/members', authenticate, addProjectMember);
router.delete('/projects/:projectId/members/:userId', authenticate, requireRole('ADMIN'), removeProjectMember);
router.get('/projects/:projectId/members', authenticate, getProjectMembers);

// User Management (ADMIN only)
router.post('/users', authenticate, requireRole('ADMIN'), createUser);
router.get('/users', authenticate, requireRole('ADMIN'), getUsers);
router.put('/users/:userId/role', authenticate, requireRole('ADMIN'), updateUserRole);
router.delete('/users/:userId', authenticate, requireRole('ADMIN'), deleteUser);
router.post('/users/:userId/reset-password', authenticate, requireRole('ADMIN'), resetUserPassword);

export default router;
