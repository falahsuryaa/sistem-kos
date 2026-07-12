import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

/**
 * Upload satu file (dari multer memoryStorage) ke Vercel Blob.
 * Jika token tidak dikonfigurasi, otomatis fallback ke local disk storage.
 * Mengembalikan URL publik atau URL lokal dari file yang sudah diupload.
 */
export const uploadFileToBlob = async (file: Express.Multer.File): Promise<string> => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // Bersihkan nama file agar tidak ada spasi bermasalah
    const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
    const filename = `${uniqueSuffix}-${cleanOriginalName}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
            const blob = await put(filename, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
            });
            return blob.url;
        } catch (err) {
            console.warn('⚠️ Vercel Blob upload failed, falling back to local storage:', err);
        }
    }

    // Local storage fallback
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    return `/uploads/${filename}`;
};

/**
 * Upload banyak file sekaligus ke Vercel Blob / Local.
 * Mengembalikan array URL publik / lokal.
 */
export const uploadFilesToBlob = async (files: Express.Multer.File[]): Promise<string[]> => {
    return Promise.all(files.map((file) => uploadFileToBlob(file)));
};