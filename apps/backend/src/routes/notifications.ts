import { Router } from 'express';
import prisma from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerTokenSchema = z.object({
  pushToken: z.string().min(1).max(255),
});

// Register push token
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = registerTokenSchema.parse(req.body);
    const userNip = req.user!.nip;

    // Use raw query to avoid type issues with new field
    await prisma.$executeRaw`UPDATE users SET push_token = ${pushToken} WHERE nip = ${userNip}`;

    res.json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors[0].message : 'Failed to register push token',
    });
  }
});

// Unregister push token
router.delete('/unregister', authMiddleware, async (req, res) => {
  try {
    const userNip = req.user!.nip;

    // Use raw query to avoid type issues with new field
    await prisma.$executeRaw`UPDATE users SET push_token = NULL WHERE nip = ${userNip}`;

    res.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering push token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister push token',
    });
  }
});

export default router;
