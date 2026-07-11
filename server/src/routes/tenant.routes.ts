import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getTenants, getTenant, createTenant, updateTenant, deleteTenant,
  getTenantByUser, getTenantHistory, getPublicVerifyTenant
} from '../controllers/tenant.controller';
import { upload } from '../middleware/upload.middleware';

export const tenantRouter = Router();

tenantRouter.get('/public-verify/:id', getPublicVerifyTenant);
tenantRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getTenants);
tenantRouter.get('/me', authenticate, getTenantByUser);
tenantRouter.get('/history', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getTenantHistory);
tenantRouter.get('/:id', authenticate, getTenant);
tenantRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'ktpPhoto', maxCount: 1 }]), createTenant);
tenantRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'ktpPhoto', maxCount: 1 }]), updateTenant);
tenantRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteTenant);
