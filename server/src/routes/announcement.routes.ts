import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller';

export const announcementRouter = Router();

announcementRouter.get('/', getAnnouncements);
announcementRouter.get('/:id', getAnnouncement);
announcementRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createAnnouncement);
announcementRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateAnnouncement);
announcementRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteAnnouncement);
