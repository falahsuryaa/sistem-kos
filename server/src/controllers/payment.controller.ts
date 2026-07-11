import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createNotification } from './notification.controller';
import { v4 as uuidv4 } from 'uuid';

// Midtrans configuration
const getMidtransSnap = () => {
  const midtransClient = require('midtrans-client');
  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'your_server_key',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || 'your_client_key',
  });
};

export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: { include: { user: true } }, room: true },
    });

    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice tidak ditemukan' }); return; }
    if (invoice.status === 'PAID') { res.status(400).json({ success: false, message: 'Invoice sudah dibayar' }); return; }

    const orderId = `KOS-${invoice.invoiceNumber}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const amount = Math.round(Number(invoice.totalAmount));

    // Check if Midtrans keys are configured
    const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    if (!serverKey || serverKey === 'your_midtrans_server_key_here') {
      // Demo mode - return mock snap token
      const mockToken = `mock-snap-token-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId,
          amount,
          status: 'PENDING',
          snapToken: mockToken,
        },
      });
      res.json({
        success: true,
        message: 'Pembayaran dibuat (Demo Mode - konfigurasikan Midtrans untuk produksi)',
        data: {
          payment,
          snapToken: mockToken,
          snapRedirectUrl: `#demo-payment-${orderId}`,
          isDemo: true,
        },
      });
      return;
    }

    const snap = getMidtransSnap();
    const parameter = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: {
        first_name: invoice.tenant.fullName,
        email: invoice.tenant.user.email,
        phone: invoice.tenant.phone,
      },
      item_details: [{
        id: invoice.id,
        price: amount,
        quantity: 1,
        name: `Sewa Kamar ${invoice.room.roomNumber} - ${invoice.periodMonth}/${invoice.periodYear}`,
      }],
      callbacks: {
        finish: `${process.env.CLIENT_URL}/tenant/payments`,
        error: `${process.env.CLIENT_URL}/tenant/payments`,
        pending: `${process.env.CLIENT_URL}/tenant/payments`,
      },
    };

    const snapTransaction = await snap.createTransaction(parameter);

    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        orderId,
        amount,
        status: 'PENDING',
        snapToken: snapTransaction.token,
      },
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { snapToken: snapTransaction.token, snapRedirectUrl: snapTransaction.redirect_url },
    });

    res.json({
      success: true,
      message: 'Transaksi berhasil dibuat',
      data: {
        payment,
        snapToken: snapTransaction.token,
        snapRedirectUrl: snapTransaction.redirect_url,
      },
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat transaksi', error: String(err) });
  }
};

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = req.body;
    const { order_id, transaction_status, fraud_status, payment_type, transaction_id, gross_amount } = notification;

    const payment = await prisma.payment.findFirst({ where: { orderId: order_id } });
    if (!payment) { res.status(404).json({ message: 'Payment not found' }); return; }

    let paymentStatus: 'PENDING' | 'SETTLEMENT' | 'CANCEL' | 'DENY' | 'EXPIRE' | 'FAILURE' = 'PENDING';
    let invoiceStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXPIRED' | 'CANCELLED' | null = null;

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') { paymentStatus = 'SETTLEMENT'; invoiceStatus = 'PAID'; }
      else if (fraud_status === 'challenge') { paymentStatus = 'PENDING'; }
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'SETTLEMENT'; invoiceStatus = 'PAID';
    } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
      paymentStatus = transaction_status === 'cancel' ? 'CANCEL' : 'DENY';
      invoiceStatus = 'CANCELLED';
    } else if (transaction_status === 'expire') {
      paymentStatus = 'EXPIRE'; invoiceStatus = 'EXPIRED';
    } else if (transaction_status === 'pending') {
      paymentStatus = 'PENDING';
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        paymentType: payment_type,
        transactionId: transaction_id,
        transactionStatus: transaction_status,
        fraudStatus: fraud_status,
        rawResponse: notification,
        ...(paymentStatus === 'SETTLEMENT' && { paidAt: new Date() }),
      },
    });

    if (invoiceStatus) {
      const invoice = await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: invoiceStatus, ...(invoiceStatus === 'PAID' && { paidAt: new Date() }) },
        include: { tenant: true },
      });

      const notifTitle = paymentStatus === 'SETTLEMENT' ? 'Pembayaran Berhasil!' : 'Pembayaran Gagal/Expired';
      const notifMsg = paymentStatus === 'SETTLEMENT'
        ? `Pembayaran Rp ${Number(gross_amount).toLocaleString('id-ID')} berhasil diterima.`
        : `Pembayaran untuk invoice ${invoice.invoiceNumber} ${transaction_status}.`;
      const notifType = paymentStatus === 'SETTLEMENT' ? 'SUCCESS' : 'ERROR';

      await createNotification(invoice.tenant.userId, notifTitle, notifMsg, notifType);
    }

    res.json({ status: 'OK' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Internal error' });
  }
};

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where = status ? { status: status as any } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            include: {
              tenant: { select: { fullName: true, phone: true } },
              room: { select: { roomNumber: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true, data: payments,
      meta: { total, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(total / parseInt(limit as string)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { userId: req.user!.id } });
    if (!tenant) { res.status(404).json({ success: false, message: 'Data penghuni tidak ditemukan' }); return; }

    const payments = await prisma.payment.findMany({
      where: { invoice: { tenantId: tenant.id } },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: { select: { invoiceNumber: true, periodMonth: true, periodYear: true } },
      },
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id as string },
      include: { invoice: { include: { tenant: true, room: true } } },
    });
    if (!payment) { res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' }); return; }
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const checkPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findFirst({ where: { id: req.params.id as string } });
    if (!payment) { res.status(404).json({ success: false, message: 'Pembayaran tidak ditemukan' }); return; }
    res.json({ success: true, data: { status: payment.status, transactionStatus: payment.transactionStatus } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};