import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { JWTPayload, ApiResponse } from '../types/index.js';

// Validate JWT_SECRET is properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key') {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set or using default value!');
  console.error('   Please set a secure JWT_SECRET in your .env file.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-secret-key-not-for-production';

// Verify JWT token and attach user to request
export function authMiddleware(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as JWTPayload;
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// Generate JWT token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, options);
}

// Verify token without middleware (for Socket.io)
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Optional auth - doesn't fail if no token
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as JWTPayload;
      req.user = decoded;
    }
  } catch {
    // Ignore errors - auth is optional
  }
  
  next();
}

export default authMiddleware;
