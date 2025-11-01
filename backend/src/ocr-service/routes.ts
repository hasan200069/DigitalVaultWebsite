import { Router } from 'express';
import { authenticateToken } from '../auth-service/middleware';
import {
  processOCR,
  getOCRText,
  getAutoTags,
  getRedactionSuggestions,
  storeOCRResults
} from './ocrService';

const router = Router();

// Apply authentication middleware to all OCR routes
router.use(authenticateToken);

// OCR processing routes
router.post('/process', processOCR);
router.post('/store', storeOCRResults);
router.get('/:itemId/text', getOCRText);
router.get('/:itemId/tags', getAutoTags);
router.get('/:itemId/redaction-suggestions', getRedactionSuggestions);

export { router as ocrRoutes };

