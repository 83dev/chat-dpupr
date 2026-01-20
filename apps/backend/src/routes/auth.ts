import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, exchangeCodeForToken, getUserProfile } from '../config/sso.js';
import { generateToken } from '../middleware/auth.js';
import prisma from '../config/database.js';
import type { ApiResponse, JWTPayload } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  upsertUserFromSSO,
  autoJoinBidangRoom,
  buildJWTPayload,
} from '../helpers/auth.helper.js';

const router = Router();

// Redirect to SSO login page
router.get('/login/sso', (_req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = getAuthorizationUrl(state);
  
  // Store state in cookie for CSRF protection
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });
  
  res.redirect(authUrl);
});

// SSO login for mobile (WebView)
router.get('/sso', (req: Request, res: Response) => {
  const { mobile } = req.query;
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = getAuthorizationUrl(state);
  
  // Store state and mobile flag in cookie
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });
  
  if (mobile) {
    res.cookie('mobile_login', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });
  }
  
  res.redirect(authUrl);
});

// SSO callback handler
router.get('/callback', async (req: Request, res: Response<ApiResponse<{ token: string; user: JWTPayload }>>) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    // Check for OAuth errors
    if (oauthError) {
      console.error('OAuth error:', oauthError);
      res.status(400).json({
        success: false,
        error: `OAuth error: ${oauthError}`,
      });
      return;
    }
    
    // Validate state (CSRF protection)
    const storedState = req.cookies?.oauth_state;
    if (state && storedState && state !== storedState) {
      res.status(400).json({
        success: false,
        error: 'Invalid state parameter',
      });
      return;
    }
    
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      });
      return;
    }
    
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    
    // Get user profile from SSO
    const ssoUser = await getUserProfile(tokenData.access_token);
    
    // Check if user is active
    if (!ssoUser.is_active) {
      res.status(403).json({
        success: false,
        error: 'User account is not active',
      });
      return;
    }
    
    // Use helper to upsert user (consolidated logic)
    const { user, bidangKode } = await upsertUserFromSSO(ssoUser);
    
    // Auto-join user to their department chat room
    await autoJoinBidangRoom(user.nip, user.bidangId);
    
    // Generate JWT token
    const jwtPayload = buildJWTPayload(user, bidangKode);
    const token = generateToken(jwtPayload);
    
    // Clear OAuth state cookie
    res.clearCookie('oauth_state');
    
    // Check if this is a mobile login
    const isMobileLogin = req.cookies?.mobile_login === 'true';
    res.clearCookie('mobile_login');
    
    if (isMobileLogin) {
      // For mobile: redirect to custom scheme with token
      res.redirect(`chatdpupr://auth/callback?token=${token}`);
    } else {
      // For SPA: redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    }
    
  } catch (error) {
    console.error('SSO callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
});

// API endpoint for token exchange (for SPA)
router.post('/token', async (req: Request, res: Response<ApiResponse<{ token: string; user: JWTPayload }>>) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      });
      return;
    }
    
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    
    // Get user profile from SSO
    const ssoUser = await getUserProfile(tokenData.access_token);
    
    if (!ssoUser.is_active) {
      res.status(403).json({
        success: false,
        error: 'User account is not active',
      });
      return;
    }
    
    // Use helper to upsert user (consolidated logic - now includes ssoId update)
    const { user, bidangKode } = await upsertUserFromSSO(ssoUser);
    
    // Generate JWT
    const jwtPayload = buildJWTPayload(user, bidangKode);
    const token = generateToken(jwtPayload);
    
    res.json({
      success: true,
      data: { token, user: jwtPayload },
    });
    
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response<ApiResponse>) => {
  try {
    const user = await prisma.user.findUnique({
      where: { nip: req.user!.nip },
      include: {
        bidang: true,
        jabatan: true,
      },
    });
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req: Request, res: Response<ApiResponse>) => {
  try {
    // Update last seen
    await prisma.user.update({
      where: { nip: req.user!.nip },
      data: { lastSeen: new Date() },
    });
    
    // Optionally logout from SSO (if you have the access token)
    // await logoutFromSSO(accessToken);
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

export default router;

