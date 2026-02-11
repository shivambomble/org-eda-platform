import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createInventoryAlert, getInventoryAlerts, updateAlertStatus } from './controller';

const router = Router();

// Create new inventory alert (Admin/Analyst only)
router.post('/inventory-alerts', authenticate, createInventoryAlert);

// Get inventory alerts (Admin/Analyst only)
router.get('/inventory-alerts', authenticate, getInventoryAlerts);

// Update alert status (Admin/Analyst only)
router.patch('/inventory-alerts/:alertId/status', authenticate, updateAlertStatus);

export default router;