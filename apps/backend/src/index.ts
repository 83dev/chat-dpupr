import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { prisma } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { validateSSOConfig } from './config/sso.js';
import { initializeSocket } from './socket/index.js';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files - serve uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// Startup
async function bootstrap(): Promise<void> {
  try {
    console.log('🚀 Starting DPUPR Chat Backend...\n');
    
    // Validate SSO config
    if (!validateSSOConfig()) {
      console.warn('⚠️ SSO configuration incomplete - some features may not work');
    }
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Connect to Redis
    await connectRedis();
    
    // Initialize Socket.io
    initializeSocket(httpServer);
    
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`\n🎉 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready for connections`);
      console.log(`\nEndpoints:`);
      console.log(`  - Health: GET /health`);
      console.log(`  - SSO Login: GET /auth/login/sso`);
      console.log(`  - SSO Callback: GET /auth/callback`);
      console.log(`  - API: /api/chat/*`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('\n👋 Shutting down gracefully...');
  
  httpServer.close();
  await disconnectRedis();
  await prisma.$disconnect();
  
  console.log('✅ Server shut down');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
bootstrap();
