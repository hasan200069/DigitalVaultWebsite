import { Router } from 'express';
import { 
  createItem, 
  getItem, 
  createVersion, 
  getDownloadUrl,
  downloadFile,
  listItems,
  deleteItem,
  getStats,
  searchItems,
  getSecureViewer
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
router.get('/items/:id/versions/:version/download-file', downloadFile);
router.get('/stats', getStats);

// Search routes
router.post('/search', searchItems);

// Secure viewer routes
router.get('/items/:id/secure-viewer', getSecureViewer);

export { router as vaultRoutes };
