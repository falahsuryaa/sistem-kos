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
      : { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: dateFilter },
        include: { tenant: { select: { fullName: true } }, room: { select: { roomNumber: true } } },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: { date: dateFilter },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const monthsStr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodeLabel = m ? `${monthsStr[m - 1]} ${y}` : `Tahun ${y}`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Keuangan - ${periodeLabel}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 20px auto; background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 26px; font-weight: 800; color: #059669; margin: 0 0 4px 0; letter-spacing: -0.5px; }
    .title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin: 0; }
    .periode { font-size: 16px; font-weight: 600; color: #334155; margin-top: 6px; }
    
    .summary-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-card { padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; text-align: center; }
    .summary-card.profit { background: #f0fdf4; border-color: #bbf7d0; }
    .summary-card.expense { background: #fef2f2; border-color: #fecaca; }
    .summary-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
    .summary-value { font-size: 18px; font-weight: 800; color: #1e293b; }
    .summary-card.profit .summary-value { color: #16a34a; }
    .summary-card.expense .summary-value { color: #dc2626; }

    h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; }
    h2 span { font-size: 14px; color: #64748b; font-weight: 500; }

    .table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    .table th { text-align: left; padding: 10px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .table tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .font-mono { font-family: monospace; font-size: 12px; }
    
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
    .print-btn { display: block; width: 100%; text-align: center; background: #059669; color: #fff; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 20px; }
    .print-btn:hover { background: #047857; }

    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; border: none; margin: 0; padding: 0; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">KOS CIPARAY</h1>
      <p class="title">Laporan Keuangan Bulanan/Tahunan</p>
      <div class="periode">Periode: ${periodeLabel}</div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Total Pendapatan</div>
        <div class="summary-value">Rp ${totalRevenue.toLocaleString('id-ID')}</div>
      </div>
      <div class="summary-card expense">
        <div class="summary-label">Total Pengeluaran</div>
        <div class="summary-value">Rp ${totalExpenses.toLocaleString('id-ID')}</div>
      </div>
      <div class="summary-card profit">
        <div class="summary-label">Laba Bersih</div>
        <div class="summary-value">Rp ${netProfit.toLocaleString('id-ID')}</div>
      </div>
    </div>

    <h2>
      <span>Daftar Pendapatan (Sewa Kamar)</span>
      <span>Total: Rp ${totalRevenue.toLocaleString('id-ID')}</span>
    </h2>
    <table class="table">
      <thead>
        <tr>
          <th>Tanggal Bayar</th>
          <th>No. Invoice</th>
          <th>Nama Penghuni</th>
          <th>Nomor Kamar</th>
          <th class="text-right">Nominal</th>
        </tr>
      </thead>
      <tbody>
        ${invoices.length > 0 ? invoices.map(inv => `
          <tr>
            <td>${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
            <td class="font-mono">${inv.invoiceNumber}</td>
            <td style="font-weight: 600;">${inv.tenant.fullName}</td>
            <td>Kamar ${inv.room.roomNumber}</td>
            <td class="text-right" style="font-weight: 600; color: #16a34a;">Rp ${Number(inv.totalAmount).toLocaleString('id-ID')}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">Tidak ada data pendapatan</td>
          </tr>
        `}
      </tbody>
    </table>

    <h2>
      <span>Daftar Pengeluaran Operasional</span>
      <span>Total: Rp ${totalExpenses.toLocaleString('id-ID')}</span>
    </h2>
    <table class="table">
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Keperluan / Deskripsi</th>
          <th>Kategori</th>
          <th class="text-right">Nominal</th>
        </tr>
      </thead>
      <tbody>
        ${expenses.length > 0 ? expenses.map(exp => `
          <tr>
            <td>${new Date(exp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            <td style="font-weight: 600;">${exp.title}</td>
            <td>${exp.category}</td>
            <td class="text-right" style="font-weight: 600; color: #dc2626;">Rp ${Number(exp.amount).toLocaleString('id-ID')}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px;">Tidak ada data pengeluaran</td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="footer">
      <p>Laporan ini digenerate secara otomatis oleh sistem manajemen Kos Ciparay.<br>Dicetak pada tanggal ${new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>

    <button class="print-btn" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 550);
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
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
