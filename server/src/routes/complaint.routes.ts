import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getComplaints, getComplaint, createComplaint, updateComplaint, deleteComplaint, getMyComplaints
} from '../controllers/complaint.controller';
import { upload } from '../middleware/upload.middleware';

export const complaintRouter = Router();

complaintRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getComplaints);
complaintRouter.get('/my', authenticate, getMyComplaints);
complaintRouter.get('/:id', authenticate, getComplaint);
complaintRouter.post('/', authenticate, upload.array('photos', 5), createComplaint);
complaintRouter.put('/:id', authenticate, updateComplaint);
complaintRouter.delete('/:id', authenticate, deleteComplaint);
