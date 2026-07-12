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

    // Simple PDF generation using raw text (no PDFKit import needed for basic)
    const content = `
INVOICE - KOS CIPARAY
=====================
No: ${invoice.invoiceNumber}
Penghuni: ${invoice.tenant.fullName}
Kamar: ${invoice.room.roomNumber} - ${invoice.room.name}
Periode: ${invoice.periodMonth}/${invoice.periodYear}
Nominal: Rp ${Number(invoice.amount).toLocaleString('id-ID')}
Denda: Rp ${Number(invoice.lateFee).toLocaleString('id-ID')}
Total: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}
Jatuh Tempo: ${new Date(invoice.dueDate).toLocaleDateString('id-ID')}
Status: ${invoice.status}
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.txt"`);
    res.send(content);
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