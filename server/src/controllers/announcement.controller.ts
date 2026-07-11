import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, page = '1', limit = '20' } = req.query;
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });
    const total = await prisma.announcement.count({ where });
    res.json({ success: true, data: announcements, meta: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!announcement) { res.status(404).json({ success: false, message: 'Pengumuman tidak ditemukan' }); return; }
    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, category, isPinned, expiresAt } = req.body;
    const announcement = await prisma.announcement.create({
      data: { title, content, category: category || 'GENERAL', isPinned: isPinned || false, expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    res.status(201).json({ success: true, message: 'Pengumuman berhasil dibuat', data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, category, isPinned, isActive, expiresAt } = req.body;
    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });
    res.json({ success: true, message: 'Pengumuman berhasil diperbarui', data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Pengumuman berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
