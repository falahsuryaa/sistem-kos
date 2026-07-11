import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createNotification = async (userId: string, title: string, message: string, type: string = 'INFO', data?: Record<string, unknown>): Promise<void> => {
  try {
    await prisma.notification.create({ data: { userId, title, message, type, data } });
  } catch (err) {
    console.error('Notification error:', err);
  }
};

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', unreadOnly } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: { total, unreadCount, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    res.json({ success: true, message: 'Notifikasi dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
