import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createNotification } from './notification.controller';
import { uploadFilesToBlob } from '../lib/blob';

export const getComplaints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { fullName: true, room: { select: { roomNumber: true } } } } },
      }),
      prisma.complaint.count({ where }),
    ]);

    res.json({
      success: true, data: complaints,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penghuni tidak ditemukan' }); return; }
    const complaints = await prisma.complaint.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id as string },
      include: { tenant: { select: { fullName: true, phone: true, room: { select: { roomNumber: true } } } } },
    });
    if (!complaint) { res.status(404).json({ success: false, message: 'Keluhan tidak ditemukan' }); return; }
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category } = req.body;
    const files = req.files as Express.Multer.File[];
    const photos = files && files.length > 0 ? await uploadFilesToBlob(files) : [];

    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penghuni tidak ditemukan' }); return; }

    const complaint = await prisma.complaint.create({
      data: { tenantId: tenant.id, title, description, category: (category || 'OTHER') as any, photos },
    });
    res.status(201).json({ success: true, message: 'Keluhan berhasil diajukan', data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    const complaint = await prisma.complaint.findUnique({ where: { id: req.params.id as string } });
    if (!complaint) { res.status(404).json({ success: false, message: 'Keluhan tidak ditemukan' }); return; }

    const updated = await prisma.complaint.update({
      where: { id: req.params.id as string },
      data: {
        ...(status && { status: status as any }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      include: { tenant: true },
    });

    if (updated.tenant) {
      let title = 'Pembaruan Keluhan';
      let message = `Status keluhan Anda "${updated.title}" telah diperbarui menjadi ${status}.`;

      if (status === 'IN_PROGRESS') {
        title = 'Keluhan Diproses';
        message = `Keluhan Anda "${updated.title}" telah diterima dan akan segera melakukan perbaikan. ${adminNotes ? 'Catatan: ' + adminNotes : ''}`;
      } else if (status === 'RESOLVED') {
        title = 'Keluhan Selesai';
        message = `Keluhan Anda "${updated.title}" telah selesai diperbaiki. ${adminNotes ? 'Catatan: ' + adminNotes : ''}`;
      } else if (status === 'CLOSED') {
        title = 'Keluhan Ditutup';
        message = `Keluhan Anda "${updated.title}" telah ditutup.`;
      }

      await createNotification(updated.tenant.userId, title, message, 'INFO');
    }

    res.json({ success: true, message: 'Keluhan berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.complaint.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Keluhan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};