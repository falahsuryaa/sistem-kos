import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getFacilities, createFacility, updateFacility, deleteFacility } from '../controllers/facility.controller';

export const facilityRouter = Router();

facilityRouter.get('/', getFacilities);
facilityRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createFacility);
facilityRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateFacility);
facilityRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteFacility);
