import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getReports, exportPDF, exportExcel, getFinancialSummary } from '../controllers/report.controller';

export const reportRouter = Router();

reportRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getReports);
reportRouter.get('/summary', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getFinancialSummary);
reportRouter.get('/export/pdf', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), exportPDF);
reportRouter.get('/export/excel', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), exportExcel);
