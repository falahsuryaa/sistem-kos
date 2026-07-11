import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  getRooms, getRoom, createRoom, updateRoom, deleteRoom,
  uploadRoomPhotos, getRoomStats
} from '../controllers/room.controller';
import { upload } from '../middleware/upload.middleware';

export const roomRouter = Router();

roomRouter.get('/', getRooms);
roomRouter.get('/stats', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), getRoomStats);
roomRouter.get('/:id', getRoom);
roomRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.array('photos', 10), createRoom);
roomRouter.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.array('photos', 10), updateRoom);
roomRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), deleteRoom);
roomRouter.post('/:id/photos', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), upload.array('photos', 10), uploadRoomPhotos);
