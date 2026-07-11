import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type = 'monthly', month, year = String(new Date().getFullYear()) } = req.query;
    const y = parseInt(year as string);
    const m = month ? parseInt(month as string) : null;

    let dateFilter: Record<string, unknown> = {};
    if (type === 'monthly' && m) {
      dateFilter = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    } else if (type === 'yearly') {
      dateFilter = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
    }

    const [paidInvoices, expenses, pendingInvoices] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: Object.keys(dateFilter).length ? dateFilter : undefined },
        include: { tenant: { select: { fullName: true } }, room: { select: { roomNumber: true } } },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.expense.findMany({
        where: { date: Object.keys(dateFilter).length ? dateFilter : undefined },
        orderBy: { date: 'desc' },
      }),
      prisma.invoice.count({ where: { status: 'PENDING' } }),
    ]);

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          pendingInvoices,
          paidCount: paidInvoices.length,
        },
        invoices: paidInvoices,
        expenses,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getFinancialSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const monthlyData = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const start = new Date(year, i, 1);
        const end = new Date(year, i + 1, 0, 23, 59, 59);
        const [revenue, expense] = await Promise.all([
          prisma.invoice.aggregate({ where: { status: 'PAID', paidAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
          prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
        ]);
        const rev = Number(revenue._sum.totalAmount || 0);
        const exp = Number(expense._sum.amount || 0);
        return { month: months[i], revenue: rev, expenses: exp, profit: rev - exp };
      })
    );

    const totals = monthlyData.reduce((acc, d) => ({
      revenue: acc.revenue + d.revenue,
      expenses: acc.expenses + d.expenses,
      profit: acc.profit + d.profit,
    }), { revenue: 0, expenses: 0, profit: 0 });

    res.json({ success: true, data: { monthly: monthlyData, totals } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const exportPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year = String(new Date().getFullYear()) } = req.query;
    const y = parseInt(year as string);
    const m = month ? parseInt(month as string) : null;
    const dateFilter = m
      ? { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) }
      : { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: dateFilter },
        include: { tenant: { select: { fullName: true } }, room: { select: { roomNumber: true } } },
      }),
      prisma.expense.findMany({ where: { date: dateFilter } }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

    const content = `
KOS CIPARAY - LAPORAN KEUANGAN
Periode: ${m ? `${m}/` : ''}${y}
================================

PENDAPATAN
----------
${invoices.map(inv => `${inv.invoiceNumber} | ${inv.tenant.fullName} | Kamar ${inv.room.roomNumber} | Rp ${Number(inv.totalAmount).toLocaleString('id-ID')}`).join('\n')}

Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}

PENGELUARAN
-----------
${expenses.map(exp => `${exp.title} | ${exp.category} | Rp ${Number(exp.amount).toLocaleString('id-ID')}`).join('\n')}

Total Pengeluaran: Rp ${totalExpenses.toLocaleString('id-ID')}

================================
LABA BERSIH: Rp ${(totalRevenue - totalExpenses).toLocaleString('id-ID')}
================================
Dicetak: ${new Date().toLocaleString('id-ID')}
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-keuangan-${y}${m ? '-' + m : ''}.txt"`);
    res.send(content);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const exportExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year = String(new Date().getFullYear()) } = req.query;
    const y = parseInt(year as string);
    const m = month ? parseInt(month as string) : null;
    const dateFilter = m
      ? { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) }
      : { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: dateFilter },
        include: { tenant: { select: { fullName: true } }, room: { select: { roomNumber: true } } },
      }),
      prisma.expense.findMany({ where: { date: dateFilter } }),
    ]);

    // CSV format (Excel-compatible)
    let csv = 'Tipe,Tanggal,Deskripsi,Kategori,Nominal\n';
    invoices.forEach(inv => {
      csv += `PENDAPATAN,${new Date(inv.paidAt!).toLocaleDateString('id-ID')},${inv.invoiceNumber} - ${inv.tenant.fullName},Sewa Kamar ${inv.room.roomNumber},${Number(inv.totalAmount)}\n`;
    });
    expenses.forEach(exp => {
      csv += `PENGELUARAN,${new Date(exp.date).toLocaleDateString('id-ID')},${exp.title},${exp.category},${Number(exp.amount)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-${y}${m ? '-' + m : ''}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
