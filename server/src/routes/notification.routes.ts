import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notification.controller';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, getNotifications);
notificationRouter.put('/:id/read', authenticate, markAsRead);
notificationRouter.put('/mark-all-read', authenticate, markAllAsRead);
notificationRouter.delete('/:id', authenticate, deleteNotification);
