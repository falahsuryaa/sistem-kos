import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, floor, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { isActive: true };
    if (status) where.status = status;
    if (floor) where.floor = parseInt(floor as string);
    if (search) where.OR = [
      { roomNumber: { contains: search as string, mode: 'insensitive' } },
      { name: { contains: search as string, mode: 'insensitive' } },
    ];

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { roomNumber: 'asc' },
        include: {
          facilities: { include: { facility: true } },
          tenants: { where: { isActive: true }, select: { id: true, fullName: true } },
        },
      }),
      prisma.room.count({ where }),
    ]);

    res.json({
      success: true,
      data: rooms,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id as string },
      include: {
        facilities: { include: { facility: true } },
        tenants: { where: { isActive: true }, include: { user: { select: { email: true } } } },
      },
    });
    if (!room) { res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' }); return; }
    res.json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, name, floor, size, capacity, monthlyPrice, yearlyPrice, description, facilityIds, status } = req.body;
    const files = req.files as Express.Multer.File[];
    const photos = files?.map(f => `/uploads/${f.filename}`) || [];

    const existing = await prisma.room.findUnique({ where: { roomNumber } });
    if (existing) { res.status(409).json({ success: false, message: 'Nomor kamar sudah ada' }); return; }

    const room = await prisma.room.create({
      data: {
        roomNumber, name,
        floor: parseInt(floor) || 1,
        size: size ? parseFloat(size) : null,
        capacity: parseInt(capacity) || 1,
        monthlyPrice: parseFloat(monthlyPrice),
        yearlyPrice: yearlyPrice ? parseFloat(yearlyPrice) : null,
        description,
        photos,
        status: (status || 'AVAILABLE') as any,
      },
    });

    if (facilityIds) {
      const ids = Array.isArray(facilityIds) ? facilityIds : [facilityIds];
      await prisma.roomFacility.createMany({
        data: ids.map((fId: string) => ({ roomId: room.id, facilityId: fId })),
      });
    }

    const roomWithFacilities = await prisma.room.findUnique({
      where: { id: room.id },
      include: { facilities: { include: { facility: true } } },
    });

    res.status(201).json({ success: true, message: 'Kamar berhasil ditambahkan', data: roomWithFacilities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateRoom = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomNumber, name, floor, size, capacity, monthlyPrice, yearlyPrice, description, facilityIds, status, isActive } = req.body;
    const files = req.files as Express.Multer.File[];
    const newPhotos = files?.map(f => `/uploads/${f.filename}`) || [];

    const existing = await prisma.room.findUnique({ where: { id: req.params.id as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' }); return; }

    const photos = newPhotos.length > 0 ? [...existing.photos, ...newPhotos] : existing.photos;

    const room = await prisma.room.update({
      where: { id: req.params.id as string },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(name && { name }),
        ...(floor && { floor: parseInt(floor) }),
        ...(size && { size: parseFloat(size) }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(monthlyPrice && { monthlyPrice: parseFloat(monthlyPrice) }),
        ...(yearlyPrice && { yearlyPrice: parseFloat(yearlyPrice) }),
        ...(description !== undefined && { description }),
        ...(status && { status: status as any }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
        photos,
      },
    });

    if (facilityIds !== undefined) {
      await prisma.roomFacility.deleteMany({ where: { roomId: room.id } });
      const ids = Array.isArray(facilityIds) ? facilityIds : facilityIds ? [facilityIds] : [];
      if (ids.length > 0) {
        await prisma.roomFacility.createMany({
          data: ids.map((fId: string) => ({ roomId: room.id, facilityId: fId })),
        });
      }
    }

    const updated = await prisma.room.findUnique({
      where: { id: room.id },
      include: { facilities: { include: { facility: true } } },
    });

    res.json({ success: true, message: 'Kamar berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id as string } });
    if (!room) { res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' }); return; }

    const hasActiveTenants = await prisma.tenant.findFirst({ where: { roomId: req.params.id as string, isActive: true } });
    if (hasActiveTenants) {
      res.status(400).json({ success: false, message: 'Kamar masih memiliki penghuni aktif' });
      return;
    }

    await prisma.room.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    res.json({ success: true, message: 'Kamar berhasil dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const uploadRoomPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const newPhotos = files?.map(f => `/uploads/${f.filename}`) || [];

    const room = await prisma.room.findUnique({ where: { id: req.params.id as string } });
    if (!room) { res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' }); return; }

    const updated = await prisma.room.update({
      where: { id: req.params.id as string },
      data: { photos: [...room.photos, ...newPhotos] },
    });

    res.json({ success: true, message: 'Foto berhasil diupload', data: updated.photos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRoomStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await prisma.room.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { id: true },
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};