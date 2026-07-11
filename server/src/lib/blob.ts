import { put } from '@vercel/blob';

/**
 * Upload satu file (dari multer memoryStorage) ke Vercel Blob.
 * Mengembalikan URL publik dari file yang sudah diupload.
 */
export const uploadFileToBlob = async (file: Express.Multer.File): Promise<string> => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.originalname}`;

    const blob = await put(filename, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
    });

    return blob.url;
};

/**
 * Upload banyak file sekaligus ke Vercel Blob.
 * Mengembalikan array URL publik.
 */
export const uploadFilesToBlob = async (files: Express.Multer.File[]): Promise<string[]> => {
    return Promise.all(files.map((file) => uploadFileToBlob(file)));
};