import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from 'dotenv';
import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import { tenantRouter } from './routes/tenant.routes';
import { invoiceRouter } from './routes/invoice.routes';
import { paymentRouter } from './routes/payment.routes';
import { complaintRouter } from './routes/complaint.routes';
import { announcementRouter } from './routes/announcement.routes';
import { notificationRouter } from './routes/notification.routes';
import { reportRouter } from './routes/report.routes';
import { expenseRouter } from './routes/expense.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { bookingRouter } from './routes/booking.routes';
import { facilityRouter } from './routes/facility.routes';
import { startCronJobs } from './services/cron.service';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
// CLIENT_URL bisa diisi beberapa domain sekaligus, dipisah koma, contoh:
// CLIENT_URL=https://sistem-kos.vercel.app,https://www.kosciparay.com
const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
];

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (misal dari Postman, server-to-server, curl)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 200,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti.' },
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', service: 'Kos Ciparay API', timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
  }
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/tenants', tenantRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/announcements', announcementRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/facilities', facilityRouter);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Global error handler
app.use(errorHandler);

// Start server (only in non-Vercel/development environments)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`\n🏠 Kos Ciparay API Server`);
    console.log(`🚀 Running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);

    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      startCronJobs();
      console.log('⏰ Cron jobs started');
    } catch (err) {
      console.error('❌ Database connection failed:', err);
    }
  });
}

export default app;