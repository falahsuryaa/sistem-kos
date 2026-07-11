import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getExpenses, getExpense, createExpense, updateExpense, deleteExpense, getExpenseSummary } from '../controllers/expense.controller';

export const expenseRouter = Router();

expenseRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getExpenses);
expenseRouter.get('/summary', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getExpenseSummary);
expenseRouter.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getExpense);
expenseRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), createExpense);
expenseRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateExpense);
expenseRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteExpense);
