import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { createNotification } from '../controllers/notification.controller';

const generateInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.invoice.count();
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

// Auto generate monthly invoices on 1st of every month at 08:00
const generateMonthlyInvoices = async () => {
  console.log('⏰ [CRON] Running monthly invoice generation...');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const dueDate = new Date(year, now.getMonth(), 10);

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, roomId: { not: null } },
    include: { room: true },
  });

  let created = 0;
  for (const tenant of tenants) {
    if (!tenant.roomId || !tenant.room) continue;
    const existing = await prisma.invoice.findUnique({
      where: { tenantId_periodMonth_periodYear: { tenantId: tenant.id, periodMonth: month, periodYear: year } },
    });
    if (existing) continue;

    const invoiceNumber = await generateInvoiceNumber();
    const amount = Number(tenant.room.monthlyPrice);
    await prisma.invoice.create({
      data: { invoiceNumber, tenantId: tenant.id, roomId: tenant.roomId, periodMonth: month, periodYear: year, amount, lateFee: 0, totalAmount: amount, dueDate, status: 'PENDING' },
    });
    await createNotification(tenant.userId, '📋 Tagihan Baru', `Tagihan sewa bulan ${month}/${year} sebesar Rp ${amount.toLocaleString('id-ID')} telah diterbitkan.`, 'INFO');
    created++;
  }
  console.log(`✅ [CRON] ${created} invoice dibuat untuk ${month}/${year}`);
};

// Mark overdue invoices - runs daily at 00:01
const markOverdueInvoices = async () => {
  console.log('⏰ [CRON] Checking overdue invoices...');
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: { status: 'PENDING', dueDate: { lt: now } },
    data: { status: 'OVERDUE', lateFee: 50000 },
  });
  console.log(`✅ [CRON] ${result.count} invoices marked as overdue`);
};

// Send payment reminders - runs daily at 09:00
const sendPaymentReminders = async () => {
  console.log('⏰ [CRON] Sending payment reminders...');
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pendingInvoices = await prisma.invoice.findMany({
    where: { status: 'PENDING', dueDate: { gte: now, lte: in7Days } },
    include: { tenant: true },
  });

  for (const invoice of pendingInvoices) {
    const daysLeft = Math.ceil((invoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let message = '';
    if (daysLeft <= 1) message = `⚠️ Tagihan ${invoice.invoiceNumber} jatuh tempo BESOK! Segera bayar Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}.`;
    else if (daysLeft <= 3) message = `⚠️ Tagihan ${invoice.invoiceNumber} jatuh tempo dalam ${daysLeft} hari. Total: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}.`;
    else if (daysLeft <= 7) message = `📋 Pengingat: Tagihan ${invoice.invoiceNumber} jatuh tempo dalam ${daysLeft} hari. Total: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}.`;

    if (message) {
      await createNotification(invoice.tenant.userId, 'Pengingat Pembayaran', message, daysLeft <= 1 ? 'WARNING' : 'INFO');
    }
  }
  console.log(`✅ [CRON] Sent ${pendingInvoices.length} payment reminders`);
};

export const startCronJobs = () => {
  // Generate invoices: 1st of each month at 08:00
  cron.schedule('0 8 1 * *', generateMonthlyInvoices, { timezone: 'Asia/Jakarta' });

  // Check overdue: daily at 00:01
  cron.schedule('1 0 * * *', markOverdueInvoices, { timezone: 'Asia/Jakarta' });

  // Payment reminders: daily at 09:00
  cron.schedule('0 9 * * *', sendPaymentReminders, { timezone: 'Asia/Jakarta' });

  console.log('⏰ Cron jobs scheduled:');
  console.log('  - Monthly invoice generation: 1st of month at 08:00');
  console.log('  - Overdue check: daily at 00:01');
  console.log('  - Payment reminders: daily at 09:00');
};
