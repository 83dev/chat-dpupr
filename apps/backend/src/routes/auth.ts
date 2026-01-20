import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, exchangeCodeForToken, getUserProfile } from '../config/sso.js';
import { generateToken } from '../middleware/auth.js';
import prisma from '../config/database.js';
import type { ApiResponse, JWTPayload } from '../types/index.js';
import { authMiddleware } from '../middleware/auth.js';

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
    
    // Upsert Bidang if exists
    let bidangId: number | undefined;
    if (ssoUser.bidang) {
      const bidang = await prisma.bidang.upsert({
        where: { kode: ssoUser.bidang.kode },
        create: {
          kode: ssoUser.bidang.kode,
          nama: ssoUser.bidang.nama,
        },
        update: {
          nama: ssoUser.bidang.nama,
        },
      });
      bidangId = bidang.id;
    }
    
    // Upsert Jabatan if exists
    let jabatanId: number | undefined;
    if (ssoUser.jabatan) {
      const jabatan = await prisma.jabatan.upsert({
        where: { id: ssoUser.jabatan.id },
        create: {
          id: ssoUser.jabatan.id,
          nama: ssoUser.jabatan.nama,
        },
        update: {
          nama: ssoUser.jabatan.nama,
        },
      });
      jabatanId = jabatan.id;
    }
    
    // Check if there's an existing user with the same sso_id but different NIP
    const existingUserBySsoId = await prisma.user.findFirst({
      where: { ssoId: ssoUser.id },
    });
    
    if (existingUserBySsoId && existingUserBySsoId.nip !== ssoUser.nip) {
      // Delete the old user with wrong NIP (data conflict)
      await prisma.user.delete({
        where: { nip: existingUserBySsoId.nip },
      });
      console.log(`Deleted old user with wrong NIP: ${existingUserBySsoId.nip}`);
    }
    
    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { nip: ssoUser.nip },
      create: {
        nip: ssoUser.nip,
        ssoId: ssoUser.id,
        nama: ssoUser.nama,
        email: ssoUser.email,
        noHp: ssoUser.no_hp,
        bidangId,
        jabatanId,
        lastSeen: new Date(),
      },
      update: {
        ssoId: ssoUser.id,
        nama: ssoUser.nama,
        email: ssoUser.email,
        noHp: ssoUser.no_hp,
        bidangId,
        jabatanId,
        lastSeen: new Date(),
      },
    });
    
    // Auto-join user to their department chat room
    if (bidangId) {
      const bidangRoom = await prisma.chatRoom.findFirst({
        where: {
          type: 'BIDANG',
          bidangId: bidangId,
        },
      });
      
      if (bidangRoom) {
        await prisma.chatRoomMember.upsert({
          where: {
            roomId_userNip: {
              roomId: bidangRoom.id,
              userNip: user.nip,
            },
          },
          create: {
            roomId: bidangRoom.id,
            userNip: user.nip,
            role: 'member',
          },
          update: {
            leftAt: null, // Rejoin if previously left
          },
        });
      }
    }
    
    // Generate JWT token
    const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      nip: user.nip,
      ssoId: user.ssoId,
      nama: user.nama,
      email: user.email,
      bidangId: user.bidangId ?? undefined,
      bidangKode: ssoUser.bidang?.kode,
      jabatanId: user.jabatanId ?? undefined,
    };
    
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
    
    // Upsert Bidang
    let bidangId: number | undefined;
    if (ssoUser.bidang) {
      const bidang = await prisma.bidang.upsert({
        where: { kode: ssoUser.bidang.kode },
        create: { kode: ssoUser.bidang.kode, nama: ssoUser.bidang.nama },
        update: { nama: ssoUser.bidang.nama },
      });
      bidangId = bidang.id;
    }
    
    // Upsert Jabatan
    let jabatanId: number | undefined;
    if (ssoUser.jabatan) {
      const jabatan = await prisma.jabatan.upsert({
        where: { id: ssoUser.jabatan.id },
        create: { id: ssoUser.jabatan.id, nama: ssoUser.jabatan.nama },
        update: { nama: ssoUser.jabatan.nama },
      });
      jabatanId = jabatan.id;
    }
    
    // Upsert user
    const user = await prisma.user.upsert({
      where: { nip: ssoUser.nip },
      create: {
        nip: ssoUser.nip,
        ssoId: ssoUser.id,
        nama: ssoUser.nama,
        email: ssoUser.email,
        noHp: ssoUser.no_hp,
        bidangId,
        jabatanId,
        lastSeen: new Date(),
      },
      update: {
        nama: ssoUser.nama,
        email: ssoUser.email,
        noHp: ssoUser.no_hp,
        bidangId,
        jabatanId,
        lastSeen: new Date(),
      },
    });
    
    // Generate JWT
    const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      nip: user.nip,
      ssoId: user.ssoId,
      nama: user.nama,
      email: user.email,
      bidangId: user.bidangId ?? undefined,
      bidangKode: ssoUser.bidang?.kode,
      jabatanId: user.jabatanId ?? undefined,
    };
    
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
