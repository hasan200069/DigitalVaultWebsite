import { Router } from 'express';
import { 
  createItem, 
  getItem, 
  createVersion, 
  getDownloadUrl, 
  listItems,
  deleteItem,
  getStats
} from './vaultService';
import { authenticateToken } from '../auth-service/middleware';

const router = Router();

// Apply authentication middleware to all vault routes
router.use(authenticateToken);

// Vault item routes
router.post('/items', createItem);
router.get('/items', listItems);
router.get('/items/:id', getItem);
router.delete('/items/:id', deleteItem);
router.post('/items/:id/versions', createVersion);
router.get('/items/:id/versions/:version/download', getDownloadUrl);
router.get('/stats', getStats);

export { router as vaultRoutes };
