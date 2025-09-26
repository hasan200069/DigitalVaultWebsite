import { Router } from 'express';
import {
  createTenant,
  getTenant,
  updateTenant,
  listTenants,
  deleteTenant
} from './tenantService';
import { authenticateToken, authenticateAdmin } from '../auth-service/middleware';

const router = Router();

// Tenant routes (protected)
router.post('/', authenticateAdmin, createTenant);
router.get('/', authenticateAdmin, listTenants);
router.get('/:id', authenticateToken, getTenant);
router.put('/:id', authenticateAdmin, updateTenant);
router.delete('/:id', authenticateAdmin, deleteTenant);

export default router;
