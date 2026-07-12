import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; name: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; role: string; name: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, isActive: true },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User tidak ditemukan atau tidak aktif' });
      return;
    }

    if (user.role === 'TENANT') {
      const tenant = await prisma.tenant.findUnique({ where: { userId: user.id } });
      if (tenant && !tenant.isActive) {
        res.status(401).json({ success: false, message: 'Akun penyewa Anda tidak aktif' });
        return;
      }
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token tidak valid atau sudah expired' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Anda tidak memiliki akses ke resource ini' });
      return;
    }
    next();
  };
};
