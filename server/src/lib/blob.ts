import { put } from '@vercel/blob';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary if credentials exist
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload satu file (dari multer memoryStorage) ke Vercel Blob.
 * Jika token tidak dikonfigurasi, otomatis fallback ke Cloudinary.
 * Jika Cloudinary tidak dikonfigurasi, otomatis fallback ke local disk storage.
 * Mengembalikan URL publik atau URL lokal dari file yang sudah diupload.
 */
export const uploadFileToBlob = async (file: Express.Multer.File): Promise<string> => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // Bersihkan nama file agar tidak ada spasi bermasalah
    const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
    const filename = `${uniqueSuffix}-${cleanOriginalName}`;

    // 1. Try Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
            const blob = await put(filename, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
            });
            return blob.url;
        } catch (err) {
            console.warn('⚠️ Vercel Blob upload failed, falling back:', err);
        }
    }

    // 2. Try Cloudinary Fallback (highly useful for serverless platforms like Vercel)
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
        try {
            const uploadResult = await new Promise<any>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'sistem-kos',
                        public_id: filename.split('.')[0],
                        resource_type: 'auto',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(file.buffer);
            });
            return uploadResult.secure_url;
        } catch (err) {
            console.warn('⚠️ Cloudinary upload failed, falling back to local:', err);
        }
    }

    // 3. Local storage fallback
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