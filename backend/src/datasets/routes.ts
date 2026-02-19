import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { uploadDataset, retriggerWorkflow, deleteDataset, restoreDataset } from './controller';
import { transformDataset } from './transform_controller';
import { searchInventoryData, getProductDetails, getCategoryDetails, getSupplierDetails } from './search_controller';

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = Router();

// Endpoint: POST /projects/:projectId/datasets
router.post('/projects/:projectId/datasets', authenticate, upload.single('file'), uploadDataset);

// Endpoint: DELETE /projects/:projectId/datasets/:datasetId (Soft delete)
router.delete('/projects/:projectId/datasets/:datasetId', authenticate, deleteDataset);

// Endpoint: POST /projects/:projectId/datasets/:datasetId/restore (Restore soft-deleted dataset)
router.post('/projects/:projectId/datasets/:datasetId/restore', authenticate, restoreDataset);

// Endpoint: POST /projects/:projectId/datasets/:datasetId/transform
router.post('/projects/:projectId/datasets/:datasetId/transform', authenticate, transformDataset);

// Endpoint: POST /datasets/:datasetId/retrigger (Admin only)
router.post('/datasets/:datasetId/retrigger', authenticate, retriggerWorkflow);

// Search endpoints
router.get('/projects/:projectId/search', authenticate, searchInventoryData);
router.get('/projects/:projectId/product-details', authenticate, getProductDetails);
router.get('/projects/:projectId/category-details', authenticate, getCategoryDetails);
router.get('/projects/:projectId/supplier-details', authenticate, getSupplierDetails);

export default router;