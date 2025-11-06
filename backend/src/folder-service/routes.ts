import { Router } from 'express';
import { authenticateToken } from '../auth-service/middleware';
import {
  createFolder,
  listFolders,
  updateFolder,
  deleteFolder
} from './folderService';

const router = Router();

// Apply authentication middleware to all folder routes
router.use(authenticateToken);

// Folder routes
router.post('/', createFolder);
router.get('/', listFolders);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

export { router as folderRoutes };

