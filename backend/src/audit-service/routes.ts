// Audit service routes

import { Router } from 'express';
import { createAuditLog, getAuditLogs, exportAuditLogs } from './auditService';
import { authenticateToken } from '../auth-service/middleware';

const router = Router();

// Apply authentication middleware to all audit routes
router.use(authenticateToken);

// Audit log routes
router.post('/', createAuditLog);
router.get('/logs', getAuditLogs);
router.get('/logs/:vaultId', getAuditLogs);
router.post('/export', exportAuditLogs);

export { router as auditRoutes };
