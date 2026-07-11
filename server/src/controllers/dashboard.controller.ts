import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRooms, occupiedRooms, availableRooms,
      totalTenants, newTenantsThisMonth,
      revenueThisMonth, revenueThisYear,
      pendingInvoices, overdueInvoices,
      totalExpensesMonth,
    ] = await Promise.all([
      prisma.room.count({ where: { isActive: true } }),
      prisma.room.count({ where: { status: 'OCCUPIED', isActive: true } }),
      prisma.room.count({ where: { status: 'AVAILABLE', isActive: true } }),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.tenant.count({ where: { createdAt: { gte: startOfMonth }, isActive: true } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfYear } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    const revenueLastMonth = await prisma.invoice.aggregate({
      where: { status: 'PAID', paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { totalAmount: true },
    });

    const monthlyRevenue = Number(revenueThisMonth._sum.totalAmount || 0);
    const lastMonthRevenue = Number(revenueLastMonth._sum.totalAmount || 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    res.json({
      success: true,
      data: {
        rooms: { total: totalRooms, occupied: occupiedRooms, available: availableRooms, maintenance: totalRooms - occupiedRooms - availableRooms },
        tenants: { total: totalTenants, newThisMonth: newTenantsThisMonth },
        revenue: {
          thisMonth: monthlyRevenue,
          thisYear: Number(revenueThisYear._sum.totalAmount || 0),
          lastMonth: lastMonthRevenue,
          growth: Math.round(revenueGrowth * 10) / 10,
        },
        invoices: { pending: pendingInvoices, overdue: overdueInvoices },
        expenses: { thisMonth: Number(totalExpensesMonth._sum.amount || 0) },
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getRevenueChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const revenueData = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const start = new Date(year, i, 1);
        const end = new Date(year, i + 1, 0, 23, 59, 59);
        const [revenue, expenses] = await Promise.all([
          prisma.invoice.aggregate({
            where: { status: 'PAID', paidAt: { gte: start, lte: end } },
            _sum: { totalAmount: true },
          }),
          prisma.expense.aggregate({
            where: { date: { gte: start, lte: end } },
            _sum: { amount: true },
          }),
        ]);
        return {
          month: months[i],
          revenue: Number(revenue._sum.totalAmount || 0),
          expenses: Number(expenses._sum.amount || 0),
          profit: Number(revenue._sum.totalAmount || 0) - Number(expenses._sum.amount || 0),
        };
      })
    );

    res.json({ success: true, data: revenueData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getOccupancyChart = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.room.groupBy({
      by: ['status'],
      where: { isActive: true },
      _count: { id: true },
    });

    const data = rooms.map(r => ({
      status: r.status,
      count: r._count.id,
      label: r.status === 'AVAILABLE' ? 'Tersedia' : r.status === 'OCCUPIED' ? 'Terisi' : 'Maintenance',
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRecentActivity = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [recentPayments, recentTenants, recentComplaints] = await Promise.all([
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { status: 'SETTLEMENT' },
        include: { invoice: { include: { tenant: { select: { fullName: true } } } } },
      }),
      prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { fullName: true, createdAt: true, room: { select: { roomNumber: true } } },
      }),
      prisma.complaint.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { fullName: true } } },
      }),
    ]);

    const activities = [
      ...recentPayments.map(p => ({
        type: 'PAYMENT',
        message: `${p.invoice.tenant.fullName} membayar tagihan`,
        amount: Number(p.amount),
        time: p.createdAt,
      })),
      ...recentTenants.map(t => ({
        type: 'NEW_TENANT',
        message: `Penghuni baru: ${t.fullName} (Kamar ${t.room?.roomNumber || '-'})`,
        time: t.createdAt,
      })),
      ...recentComplaints.map(c => ({
        type: 'COMPLAINT',
        message: `Keluhan dari ${c.tenant.fullName}: ${c.title}`,
        status: c.status,
        time: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
