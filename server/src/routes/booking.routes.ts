import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getBookings, getBooking, createBooking, updateBookingStatus, deleteBooking } from '../controllers/booking.controller';

export const bookingRouter = Router();

bookingRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getBookings);
bookingRouter.get('/:id', getBooking);
bookingRouter.post('/', createBooking);
bookingRouter.put('/:id/status', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), updateBookingStatus);
bookingRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteBooking);
