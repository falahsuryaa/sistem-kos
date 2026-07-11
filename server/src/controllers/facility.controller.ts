import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getFacilities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const facilities = await prisma.facility.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: facilities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon, description } = req.body;
    const facility = await prisma.facility.create({ data: { name, icon, description } });
    res.status(201).json({ success: true, message: 'Fasilitas berhasil ditambahkan', data: facility });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, icon, description, isActive } = req.body;
    const facility = await prisma.facility.update({
      where: { id: req.params.id as string },
      data: {
        ...(name && { name }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json({ success: true, message: 'Fasilitas diperbarui', data: facility });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteFacility = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.facility.update({ where: { id: req.params.id as string }, data: { isActive: false } });
    res.json({ success: true, message: 'Fasilitas dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};