import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, month, year, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (month && year) {
      const start = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const end = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);
      where.date = { gte: start, lte: end };
    }
    const [expenses, total, sum] = await Promise.all([
      prisma.expense.findMany({ where, skip, take: parseInt(limit as string), orderBy: { date: 'desc' } }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    res.json({ success: true, data: expenses, meta: { total, totalAmount: Number(sum._sum.amount || 0) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id as string } });
    if (!expense) { res.status(404).json({ success: false, message: 'Data tidak ditemukan' }); return; }
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, amount, category, date, description } = req.body;
    const expense = await prisma.expense.create({
      data: { title, amount: parseFloat(amount), category: (category || 'OTHER') as any, date: new Date(date), description },
    });
    res.status(201).json({ success: true, message: 'Pengeluaran berhasil ditambahkan', data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, amount, category, date, description } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id as string },
      data: {
        ...(title && { title }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category: category as any }),
        ...(date && { date: new Date(date) }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, message: 'Pengeluaran berhasil diperbarui', data: expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getExpenseSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const summary = await prisma.expense.groupBy({
      by: ['category'],
      where: { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } },
      _sum: { amount: true },
      _count: { id: true },
    });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};