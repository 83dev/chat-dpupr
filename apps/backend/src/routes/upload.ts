import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { upload, getFileUrl } from '../config/upload.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

// Apply auth middleware
router.use(authMiddleware);

// Upload single file
router.post(
  '/single',
  upload.single('file'),
  (req: Request, res: Response<ApiResponse<UploadResponse>>) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const response: UploadResponse = {
        url: getFileUrl(req.file.filename),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
      });
    }
  }
);

// Upload multiple files (max 5)
router.post(
  '/multiple',
  upload.array('files', 5),
  (req: Request, res: Response<ApiResponse<UploadResponse[]>>) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
        return;
      }

      const response: UploadResponse[] = files.map((file) => ({
        url: getFileUrl(file.filename),
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload files',
      });
    }
  }
);

export default router;
