import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
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

// Multer error handler middleware
const handleMulterError = (
  err: Error,
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB.',
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({
          success: false,
          error: 'Too many files. Maximum is 5 files.',
        });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({
          success: false,
          error: 'Unexpected field name in form data.',
        });
        return;
      default:
        res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
        return;
    }
  } else if (err) {
    // Handle other errors (like file type errors from fileFilter)
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to upload file',
    });
    return;
  }
  next();
};

// Upload single file
router.post(
  '/single',
  upload.single('file'),
  handleMulterError,
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
  handleMulterError,
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
