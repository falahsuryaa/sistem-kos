import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createNotification } from './notification.controller';
import { uploadFileToBlob } from '../lib/blob';

export const getTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, isActive, roomId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (roomId) where.roomId = roomId as string;
    if (search) where.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { nik: { contains: search as string } },
    ];

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          room: { select: { roomNumber: true, name: true, monthlyPrice: true } },
          user: { select: { email: true, lastLogin: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: tenants,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        room: { include: { facilities: { include: { facility: true } } } },
        user: { select: { email: true, lastLogin: true, createdAt: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
        complaints: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!tenant) { res.status(404).json({ success: false, message: 'Penghuni tidak ditemukan' }); return; }

    // Check permission
    if (req.user?.role === 'TENANT') {
      const userTenant = await prisma.tenant.findUnique({ where: { userId: req.user.id } });
      if (!userTenant || userTenant.id !== id) {
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
      }
    }

    res.json({ success: true, data: tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTenantByUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: req.user!.id },
      include: {
        room: { include: { facilities: { include: { facility: true } } } },
        user: { select: { email: true } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penghuni tidak ditemukan' }); return; }
    res.json({ success: true, data: tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, roomId, fullName, nik, phone, email, gender, birthDate, address, checkInDate, emergencyContact, emergencyPhone, notes } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const photo = files?.photo?.[0] ? await uploadFileToBlob(files.photo[0]) : undefined;
    const ktpPhoto = files?.ktpPhoto?.[0] ? await uploadFileToBlob(files.ktpPhoto[0]) : undefined;

    const existingNik = await prisma.tenant.findUnique({ where: { nik } });
    if (existingNik) { res.status(409).json({ success: false, message: 'NIK sudah terdaftar' }); return; }

    const tenant = await prisma.tenant.create({
      data: {
        userId, roomId: roomId || null,
        fullName, nik, phone, email, gender: gender as any,
        birthDate: birthDate ? new Date(birthDate) : null,
        address, photo, ktpPhoto, qrCode: '',
        checkInDate: new Date(checkInDate),
        emergencyContact, emergencyPhone, notes,
      },
      include: { room: true, user: { select: { email: true } } },
    });

    // Generate QR Code containing public verification link
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    const qrData = `${clientUrl}/verify-tenant/${tenant.id}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { qrCode },
      include: { room: true, user: { select: { email: true } } },
    });

    // Update room status to OCCUPIED
    if (roomId) {
      await prisma.room.update({ where: { id: roomId }, data: { status: 'OCCUPIED' } });
    }

    // Send notification
    await createNotification(userId, 'Selamat Datang di Kos Ciparay!', `Halo ${fullName}, akun penghuni Anda telah dibuat. Selamat datang!`, 'SUCCESS');

    res.status(201).json({ success: true, message: 'Penghuni berhasil ditambahkan', data: updatedTenant });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateTenant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, phone, email, gender, birthDate, address, checkInDate, checkOutDate, isActive, roomId, emergencyContact, emergencyPhone, notes } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const photo = files?.photo?.[0] ? await uploadFileToBlob(files.photo[0]) : undefined;
    const ktpPhoto = files?.ktpPhoto?.[0] ? await uploadFileToBlob(files.ktpPhoto[0]) : undefined;

    const existing = await prisma.tenant.findUnique({ where: { id: req.params.id as string } });
    if (!existing) { res.status(404).json({ success: false, message: 'Penghuni tidak ditemukan' }); return; }

    // Handle room change
    if (roomId && roomId !== existing.roomId) {
      if (existing.roomId) await prisma.room.update({ where: { id: existing.roomId }, data: { status: 'AVAILABLE' } });
      if (roomId) await prisma.room.update({ where: { id: roomId }, data: { status: 'OCCUPIED' } });
    }

    // Handle checkout and sync active state to User
    if (isActive !== undefined) {
      const activeState = isActive === 'true' || isActive === true;
      if (!activeState && existing.roomId) {
        await prisma.room.update({ where: { id: existing.roomId }, data: { status: 'AVAILABLE' } });
      }
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: activeState },
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id as string },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(gender && { gender: gender as any }),
        ...(birthDate && { birthDate: new Date(birthDate) }),
        ...(address !== undefined && { address }),
        ...(checkInDate && { checkInDate: new Date(checkInDate) }),
        ...(checkOutDate && { checkOutDate: new Date(checkOutDate) }),
        ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
        ...(roomId !== undefined && { roomId: roomId || null }),
        ...(photo && { photo }),
        ...(ktpPhoto && { ktpPhoto }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(emergencyPhone !== undefined && { emergencyPhone }),
        ...(notes !== undefined && { notes }),
      },
      include: { room: true },
    });

    res.json({ success: true, message: 'Penghuni berhasil diperbarui', data: tenant });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id as string } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Penghuni tidak ditemukan' }); return; }

    await prisma.tenant.update({
      where: { id: req.params.id as string },
      data: { isActive: false, checkOutDate: new Date() },
    });

    await prisma.user.update({
      where: { id: tenant.userId },
      data: { isActive: false },
    });

    if (tenant.roomId) {
      await prisma.room.update({ where: { id: tenant.roomId }, data: { status: 'AVAILABLE' } });
    }

    res.json({ success: true, message: 'Penghuni berhasil dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getTenantHistory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: false },
      orderBy: { checkOutDate: 'desc' },
      include: { room: { select: { roomNumber: true, name: true } } },
    });
    res.json({ success: true, data: tenants });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPublicVerifyTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true, name: true } },
      },
    });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penyewa tidak ditemukan' }); return; }

    res.json({
      success: true,
      data: {
        fullName: tenant.fullName,
        phone: tenant.phone,
        email: tenant.email,
        roomNumber: tenant.room?.roomNumber || '-',
        roomName: tenant.room?.name || '-',
        gender: tenant.gender,
        checkInDate: tenant.checkInDate,
        isActive: tenant.isActive,
        photo: tenant.photo,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};