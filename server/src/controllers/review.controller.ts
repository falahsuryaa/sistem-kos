import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Membuat ulasan baru atau memperbarui ulasan lama dari penyewa yang sedang login.
 */
export const createOrUpdateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const ratingNum = parseInt(rating);

    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ success: false, message: 'Rating harus bernilai antara 1 sampai 5' });
      return;
    }

    if (!comment || comment.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Komentar ulasan wajib diisi' });
      return;
    }

    // Cari data tenant berdasarkan userId
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.id },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Data penyewa tidak ditemukan' });
      return;
    }

    // Cari apakah sudah pernah memberi ulasan sebelumnya
    const existing = await prisma.review.findFirst({
      where: { tenantId: tenant.id },
    });

    if (existing) {
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: ratingNum,
          comment: comment.trim(),
        },
      });
      res.json({ success: true, message: 'Ulasan berhasil diperbarui', data: updated });
    } else {
      const created = await prisma.review.create({
        data: {
          tenantId: tenant.id,
          rating: ratingNum,
          comment: comment.trim(),
        },
      });
      res.json({ success: true, message: 'Ulasan berhasil dikirim', data: created });
    }
  } catch (err) {
    console.error('Review create/update error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses ulasan', error: String(err) });
  }
};

/**
 * Mengambil ulasan milik penyewa yang sedang login.
 */
export const getMyReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.id },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Data penyewa tidak ditemukan' });
      return;
    }

    const review = await prisma.review.findFirst({
      where: { tenantId: tenant.id },
    });

    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

/**
 * Menghapus ulasan milik penyewa yang sedang login.
 */
export const deleteMyReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.id },
    });

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Data penyewa tidak ditemukan' });
      return;
    }

    const review = await prisma.review.findFirst({
      where: { tenantId: tenant.id },
    });

    if (!review) {
      res.status(404).json({ success: false, message: 'Ulasan belum dibuat' });
      return;
    }

    await prisma.review.delete({
      where: { id: review.id },
    });

    res.json({ success: true, message: 'Ulasan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

/**
 * Mengambil semua ulasan aktif untuk ditampilkan secara publik (misal di Landing Page).
 */
export const getPublicReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      where: { isActive: true },
      include: {
        tenant: {
          select: {
            fullName: true,
            photo: true,
            room: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};
