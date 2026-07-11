import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getDashboardStats, getRevenueChart, getOccupancyChart, getRecentActivity } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getDashboardStats);
dashboardRouter.get('/revenue-chart', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getRevenueChart);
dashboardRouter.get('/occupancy-chart', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getOccupancyChart);
dashboardRouter.get('/recent-activity', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getRecentActivity);
