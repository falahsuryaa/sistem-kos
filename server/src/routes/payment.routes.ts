import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createPayment, getPayments, getPayment, handleWebhook, getMyPayments, checkPaymentStatus
} from '../controllers/payment.controller';

export const paymentRouter = Router();

// Webhook - no auth (called by Midtrans)
paymentRouter.post('/webhook', handleWebhook);

paymentRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getPayments);
paymentRouter.get('/my', authenticate, getMyPayments);
paymentRouter.get('/:id', authenticate, getPayment);
paymentRouter.get('/:id/status', authenticate, checkPaymentStatus);
paymentRouter.post('/create', authenticate, createPayment);
