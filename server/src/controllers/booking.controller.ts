import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where = status ? { status: status as any } : {};
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { room: { select: { roomNumber: true, name: true, monthlyPrice: true } } },
      }),
      prisma.booking.count({ where }),
    ]);
    res.json({ success: true, data: bookings, meta: { total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id as string },
      include: { room: true },
    });
    if (!booking) { res.status(404).json({ success: false, message: 'Booking tidak ditemukan' }); return; }
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId, fullName, email, phone, nik, checkInDate, duration, notes } = req.body;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) { res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' }); return; }
    if (room.status !== 'AVAILABLE') { res.status(400).json({ success: false, message: 'Kamar tidak tersedia' }); return; }

    const booking = await prisma.booking.create({
      data: { roomId, fullName, email, phone, nik, checkInDate: new Date(checkInDate), duration: parseInt(duration) || 1, notes },
      include: { room: { select: { roomNumber: true, name: true } } },
    });
    res.status(201).json({ success: true, message: 'Booking berhasil diajukan. Admin akan menghubungi Anda.', data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    const booking = await prisma.booking.update({
      where: { id: req.params.id as string },
      data: { status: status as any, adminNotes, processedAt: new Date() },
    });
    res.json({ success: true, message: 'Status booking diperbarui', data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Booking dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};