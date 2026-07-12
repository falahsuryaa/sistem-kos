import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createOrUpdateReview,
  getMyReview,
  deleteMyReview,
  getPublicReviews
} from '../controllers/review.controller';

export const reviewRouter = Router();

// Route publik untuk melihat ulasan di landing page
reviewRouter.get('/', getPublicReviews);

// Route khusus penyewa yang login
reviewRouter.post('/', authenticate, createOrUpdateReview);
reviewRouter.get('/my', authenticate, getMyReview);
reviewRouter.delete('/my', authenticate, deleteMyReview);
