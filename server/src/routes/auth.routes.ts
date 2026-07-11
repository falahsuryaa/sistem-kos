import { Router } from 'express';
import { login, register, refreshToken, logout, getProfile, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/refresh-token', refreshToken);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/profile', authenticate, getProfile);
authRouter.put('/change-password', authenticate, changePassword);
