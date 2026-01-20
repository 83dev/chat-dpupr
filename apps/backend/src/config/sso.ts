import axios from 'axios';
import type { SSOUserProfile } from '../types/index.js';

// SSO DPUPR Configuration
export const ssoConfig = {
  issuerUrl: process.env.SSO_ISSUER_URL || 'https://sso.dpupr.com',
  clientId: process.env.SSO_CLIENT_ID || '',
  clientSecret: process.env.SSO_CLIENT_SECRET || '',
  redirectUri: process.env.SSO_REDIRECT_URI || 'http://localhost:3001/auth/callback',
  scopes: process.env.SSO_SCOPES || 'read-profile',
  
  // OAuth endpoints
  get authorizationEndpoint() {
    return `${this.issuerUrl}/oauth/authorize`;
  },
  get tokenEndpoint() {
    return `${this.issuerUrl}/oauth/token`;
  },
  get userInfoEndpoint() {
    return `${this.issuerUrl}/api/user`;
  },
  get logoutEndpoint() {
    return `${this.issuerUrl}/api/logout`;
  },
};

// Build authorization URL
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: ssoConfig.clientId,
    redirect_uri: ssoConfig.redirectUri,
    response_type: 'code',
    scope: ssoConfig.scopes,
  });
  
  if (state) {
    params.append('state', state);
  }
  
  return `${ssoConfig.authorizationEndpoint}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}> {
  try {
    const response = await axios.post(ssoConfig.tokenEndpoint, {
      grant_type: 'authorization_code',
      client_id: ssoConfig.clientId,
      client_secret: ssoConfig.clientSecret,
      redirect_uri: ssoConfig.redirectUri,
      code,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      if (status === 401) {
        throw new Error('SSO: Invalid or expired authorization code');
      } else if (status === 400) {
        throw new Error(`SSO: Bad request - ${message}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('SSO: Unable to connect to SSO server');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('SSO: Connection timeout');
      }
      
      throw new Error(`SSO token exchange failed: ${message}`);
    }
    throw error;
  }
}

// Get user profile from SSO
export async function getUserProfile(accessToken: string): Promise<SSOUserProfile> {
  try {
    const response = await axios.get(ssoConfig.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      if (status === 401) {
        throw new Error('SSO: Invalid or expired access token');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('SSO: Unable to connect to SSO server');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('SSO: Connection timeout');
      }
      
      throw new Error(`SSO: Failed to get user profile - ${error.message}`);
    }
    throw error;
  }
}

// Logout from SSO
export async function logoutFromSSO(accessToken: string): Promise<void> {
  try {
    await axios.post(ssoConfig.logoutEndpoint, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
  } catch (error) {
    // Log but don't throw - logout should be best effort
    console.warn('SSO logout warning:', error);
  }
}

// Validate SSO configuration
export function validateSSOConfig(): boolean {
  const required = ['clientId', 'clientSecret', 'redirectUri'];
  const missing = required.filter(key => !ssoConfig[key as keyof typeof ssoConfig]);
  
  if (missing.length > 0) {
    console.error('❌ Missing SSO configuration:', missing.join(', '));
    return false;
  }
  
  return true;
}

export default ssoConfig;
