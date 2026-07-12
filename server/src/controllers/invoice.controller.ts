import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createNotification } from './notification.controller';
import { uploadFileToBlob } from '../lib/blob';

const generateInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.invoice.count();
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, tenantId, month, year, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId as string;
    if (month) where.periodMonth = parseInt(month as string);
    if (year) where.periodYear = parseInt(year as string);

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { fullName: true, phone: true } },
          room: { select: { roomNumber: true, name: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true, data: invoices,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const getMyInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penghuni tidak ditemukan' }); return; }

    const invoices = await prisma.invoice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: {
        room: { select: { roomNumber: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      include: {
        tenant: { include: { room: true } },
        room: { include: { facilities: { include: { facility: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' }); return; }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, roomId, periodMonth, periodYear, amount, lateFee, dueDate, notes } = req.body;

    const existing = await prisma.invoice.findUnique({
      where: { tenantId_periodMonth_periodYear: { tenantId, periodMonth: parseInt(periodMonth), periodYear: parseInt(periodYear) } },
    });
    if (existing) { res.status(409).json({ success: false, message: 'Invoice untuk periode ini sudah ada' }); return; }

    const invoiceNumber = await generateInvoiceNumber();
    const late = parseFloat(lateFee) || 0;
    const total = parseFloat(amount) + late;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber, tenantId, roomId,
        periodMonth: parseInt(periodMonth), periodYear: parseInt(periodYear),
        amount: parseFloat(amount), lateFee: late, totalAmount: total,
        dueDate: new Date(dueDate), notes, status: 'PENDING',
      },
      include: { tenant: true, room: true },
    });

    // Send notification to tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      await createNotification(tenant.userId, 'Tagihan Baru', `Tagihan ${invoiceNumber} senilai Rp ${total.toLocaleString('id-ID')} telah dibuat.`, 'INFO');
    }

    res.status(201).json({ success: true, message: 'Invoice berhasil dibuat', data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const updateInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, lateFee, notes, dueDate } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string } });
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' }); return; }

    const late = lateFee !== undefined ? parseFloat(lateFee) : Number(invoice.lateFee);
    const totalAmount = Number(invoice.amount) + late;

    const updated = await prisma.invoice.update({
      where: { id: req.params.id as string },
      data: {
        ...(status && { status: status as any }),
        ...(lateFee !== undefined && { lateFee: late, totalAmount }),
        ...(notes !== undefined && { notes }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status === 'PAID' && { paidAt: new Date() }),
      },
    });

    res.json({ success: true, message: 'Invoice berhasil diperbarui', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const generateMonthlyInvoices = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const dueDate = new Date(year, now.getMonth(), 10); // Due on 10th

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, roomId: { not: null } },
      include: { room: true },
    });

    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      if (!tenant.roomId || !tenant.room) continue;

      const existing = await prisma.invoice.findUnique({
        where: { tenantId_periodMonth_periodYear: { tenantId: tenant.id, periodMonth: month, periodYear: year } },
      });
      if (existing) { skipped++; continue; }

      const invoiceNumber = await generateInvoiceNumber();
      const amount = Number(tenant.room.monthlyPrice);

      await prisma.invoice.create({
        data: {
          invoiceNumber,
          tenantId: tenant.id,
          roomId: tenant.roomId,
          periodMonth: month,
          periodYear: year,
          amount,
          lateFee: 0,
          totalAmount: amount,
          dueDate,
          status: 'PENDING',
        },
      });

      await createNotification(tenant.userId, 'Tagihan Baru', `Tagihan bulan ${month}/${year} senilai Rp ${amount.toLocaleString('id-ID')} telah diterbitkan.`, 'INFO');
      created++;
    }

    res.json({ success: true, message: `${created} invoice berhasil dibuat, ${skipped} dilewati (sudah ada)`, data: { created, skipped } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const generateInvoicePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id as string },
      include: {
        tenant: { include: { room: true } },
        room: true,
      },
    });
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' }); return; }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nota Pembayaran - ${invoice.invoiceNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .receipt { max-width: 600px; margin: 30px auto; background: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; position: relative; }
    .logo { font-size: 24px; font-weight: 800; color: #059669; margin: 0 0 4px 0; letter-spacing: -0.5px; }
    .title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin: 0; }
    .badge { display: inline-block; padding: 6px 16px; background: #d1fae5; color: #065f46; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
    .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 16px; font-size: 14px; line-height: 1.6; margin-bottom: 28px; padding: 12px 0; }
    .col-left { text-align: left; }
    .col-right { text-align: right; }
    .label { color: #64748b; font-weight: 500; margin-bottom: 4px; }
    .value { font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .table-container { margin-bottom: 28px; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table th { text-align: left; padding: 12px 0; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; }
    .table td { padding: 16px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .total-section { border-top: 2px solid #e2e8f0; padding-top: 16px; }
    .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 650; color: #475569; margin-bottom: 8px; }
    .total-row.grand { font-size: 20px; font-weight: 800; color: #059669; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 4px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 36px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 24px; }
    .print-btn { display: block; width: 100%; text-align: center; background: #059669; color: #fff; padding: 14px; border: none; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 28px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.1); }
    .print-btn:hover { background: #047857; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; margin: 0 auto; padding: 10px; max-width: 100%; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1 class="logo">KOS CIKAWUNG</h1>
      <p class="title">Nota Bukti Pembayaran Resmi</p>
      <div class="badge">Lunas / Paid</div>
    </div>

    <div class="grid">
      <div class="col-left">
        <div class="label">No. Transaksi</div>
        <div class="value">${invoice.invoiceNumber}</div>
        <div class="label" style="margin-top: 12px;">Penyewa</div>
        <div class="value">${invoice.tenant.fullName}</div>
      </div>
      <div class="col-right">
        <div class="label">Tanggal Cetak</div>
        <div class="value">${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="label" style="margin-top: 12px;">Kamar</div>
        <div class="value">Kamar ${invoice.room.roomNumber} - ${invoice.room.name}</div>
      </div>
    </div>

    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Deskripsi Tagihan</th>
            <th style="text-align: right;">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Biaya Sewa Kamar (Periode Bulan ${invoice.periodMonth}/${invoice.periodYear})</td>
            <td style="text-align: right; font-weight: 600;">Rp ${Number(invoice.amount).toLocaleString('id-ID')}</td>
          </tr>
          ${Number(invoice.lateFee) > 0 ? `
          <tr>
            <td>Denda Keterlambatan</td>
            <td style="text-align: right; font-weight: 600; color: #ef4444;">Rp ${Number(invoice.lateFee).toLocaleString('id-ID')}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div class="total-section">
      <div class="total-row">
        <span>Subtotal</span>
        <span>Rp ${Number(invoice.amount).toLocaleString('id-ID')}</span>
      </div>
      ${Number(invoice.lateFee) > 0 ? `
      <div class="total-row">
        <span>Denda</span>
        <span>Rp ${Number(invoice.lateFee).toLocaleString('id-ID')}</span>
      </div>
      ` : ''}
      <div class="total-row grand">
        <span>Total Pembayaran</span>
        <span>Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}</span>
      </div>
    </div>

    <div class="footer">
      <p>Terima kasih atas pembayaran Anda.<br>Bukti pembayaran ini diterbitkan secara sah dan elektronik oleh manajemen Kos Cikawung.</p>
    </div>

    <button class="print-btn" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const uploadPaymentProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'File bukti pembayaran wajib diunggah' });
      return;
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' });
      return;
    }

    // Check if tenant is uploading their own invoice
    if (req.user!.role === 'TENANT' && invoice.tenant.userId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Akses ditolak' });
      return;
    }

    // Upload to Vercel Blob
    const paymentProofUrl = await uploadFileToBlob(file);

    // Update invoice with the proof url
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        paymentProof: paymentProofUrl,
      },
    });

    res.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah, menunggu konfirmasi admin',
      data: updated,
    });
  } catch (err) {
    console.error('Upload proof error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengunggah bukti pembayaran', error: String(err) });
  }
};