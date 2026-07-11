import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const generateTokens = (user: { id: string; email: string; role: string; name: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'] }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'] }
  );
  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Email atau password salah' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Email atau password salah' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken, lastLogin: new Date() },
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, avatar: user.avatar },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ success: false, message: 'Email, password, dan nama wajib diisi' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashedPassword, name, phone, role: 'TENANT' },
    });

    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: String(err) });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) { res.status(401).json({ success: false, message: 'Refresh token tidak ditemukan' }); return; }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id, refreshToken: token } });
    if (!user) { res.status(401).json({ success: false, message: 'Refresh token tidak valid' }); return; }

    const tokens = generateTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token expired atau tidak valid' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    }
    res.json({ success: true, message: 'Logout berhasil' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, lastLogin: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) { res.status(400).json({ success: false, message: 'Password lama tidak sesuai' }); return; }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};