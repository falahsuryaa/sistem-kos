import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  getInvoices, getInvoice, createInvoice, updateInvoice,
  generateMonthlyInvoices, getMyInvoices, generateInvoicePDF,
  uploadPaymentProof
} from '../controllers/invoice.controller';

export const invoiceRouter = Router();

invoiceRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getInvoices);
invoiceRouter.get('/my', authenticate, getMyInvoices);
invoiceRouter.get('/:id', authenticate, getInvoice);
invoiceRouter.get('/:id/pdf', authenticate, generateInvoicePDF);
invoiceRouter.post('/:id/upload-proof', authenticate, upload.single('paymentProof'), uploadPaymentProof);
invoiceRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createInvoice);
invoiceRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateInvoice);
invoiceRouter.post('/generate-monthly', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), generateMonthlyInvoices);
