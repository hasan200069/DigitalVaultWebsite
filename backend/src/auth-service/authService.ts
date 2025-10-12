import { Request, Response } from 'express';
import { query } from './database';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password';
import { logAuditEvent } from '../audit-service/auditService';
import { AuditAction, ResourceType } from '../audit-service/types';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  generateRandomToken, 
  hashToken,
  generateWebAuthnChallenge,
  verifyToken
} from './jwt';
import { 
  generateWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
  generateWebAuthnAuthenticationOptions,
  verifyWebAuthnAuthentication
} from './webauthn';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  WebAuthnRegisterRequest,
  WebAuthnRegisterResponse,
  WebAuthnVerifyRequest,
  WebAuthnVerifyResponse,
  JWTPayload
} from './types';

// In-memory store for WebAuthn challenges (in production, use Redis)
const challengeStore = new Map<string, { challenge: string; userId?: string; email?: string; expiresAt: Date; type: 'register' | 'verify' }>();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [key, value] of challengeStore.entries()) {
    if (value.expiresAt < now) {
      challengeStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// POST /auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName }: RegisterRequest = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'All fields are required'
      } as RegisterResponse);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format'
      } as RegisterResponse);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      } as RegisterResponse);
      return;
    }

    // For now, use the default tenant. In a real multi-tenant app, 
    // you'd determine the tenant from the request (subdomain, header, etc.)
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      } as RegisterResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Check if user already exists in this tenant
    const existingUser = await query(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      } as RegisterResponse);
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, created_at`,
      [tenantId, email.toLowerCase(), passwordHash, firstName, lastName]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    } as RegisterResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as RegisterResponse);
  }
};

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      } as LoginResponse);
      return;
    }

    // For now, use the default tenant. In a real multi-tenant app, 
    // you'd determine the tenant from the request (subdomain, header, etc.)
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      } as LoginResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Get user from database
    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, is_active, tenant_id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Log failed login attempt
      await logAuditEvent(
        'unknown', // No tenant since user not found
        'unknown', // No user ID since user not found
        AuditAction.LOGIN_FAILED,
        ResourceType.USER,
        email,
        {
          email: email,
          reason: 'user_not_found',
          ipAddress: req.ip
        },
        undefined,
        req
      );

      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse);
      return;
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      } as LoginResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await logAuditEvent(
        tenantId,
        user.id,
        AuditAction.LOGIN_FAILED,
        ResourceType.USER,
        user.id,
        {
          email: email,
          reason: 'invalid_password',
          ipAddress: req.ip
        },
        undefined,
        req
      );

      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse);
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const refreshTokenHash = hashToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, expiresAt]
    );

    // Log audit event
    await logAuditEvent(
      user.tenant_id,
      user.id,
      AuditAction.LOGIN,
      ResourceType.USER,
      user.id,
      {
        email: user.email,
        loginMethod: 'password',
        sessionId: (req as any).sessionID || 'unknown'
      },
      undefined,
      req
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 60 * 60 // 1 hour in seconds
      }
    } as LoginResponse);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as LoginResponse);
  }
};

// POST /auth/webauthn/register
export const webauthnRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, credential, deviceType }: WebAuthnRegisterRequest = req.body;

    // Validate input
    if (!email || !credential) {
      res.status(400).json({
        success: false,
        message: 'Email and credential are required'
      } as WebAuthnRegisterResponse);
      return;
    }

    // Get challenge from store (this should be set by a previous call to get registration options)
    const challengeKey = `register_${email}`;
    const storedChallenge = challengeStore.get(challengeKey);
    
    if (!storedChallenge) {
      res.status(400).json({
        success: false,
        message: 'No registration challenge found. Please start the registration process again.'
      } as WebAuthnRegisterResponse);
      return;
    }

    // Check if challenge is expired
    if (storedChallenge.expiresAt < new Date()) {
      challengeStore.delete(challengeKey);
      res.status(400).json({
        success: false,
        message: 'Registration challenge expired. Please start the registration process again.'
      } as WebAuthnRegisterResponse);
      return;
    }

    // Verify the WebAuthn registration
    const verification = await verifyWebAuthnRegistration(
      email,
      credential,
      storedChallenge.challenge,
      storedChallenge.userId
    );

    if (!verification.success) {
      res.status(400).json({
        success: false,
        message: verification.error || 'WebAuthn registration verification failed'
      } as WebAuthnRegisterResponse);
      return;
    }

    // Clean up the challenge
    challengeStore.delete(challengeKey);

    res.json({
      success: true,
      message: 'WebAuthn credential registered successfully',
      credentialId: verification.credentialId
    } as WebAuthnRegisterResponse);

  } catch (error) {
    console.error('WebAuthn registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as WebAuthnRegisterResponse);
  }
};

// POST /auth/webauthn/verify
export const webauthnVerify = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, credential }: WebAuthnVerifyRequest = req.body;

    // Validate input
    if (!email || !credential) {
      res.status(400).json({
        success: false,
        message: 'Email and credential are required'
      } as WebAuthnVerifyResponse);
      return;
    }

    // Get challenge from store
    const challengeKey = `verify_${email}`;
    const storedChallenge = challengeStore.get(challengeKey);
    
    if (!storedChallenge) {
      res.status(400).json({
        success: false,
        message: 'No authentication challenge found. Please start the authentication process again.'
      } as WebAuthnVerifyResponse);
      return;
    }

    // Check if challenge is expired
    if (storedChallenge.expiresAt < new Date()) {
      challengeStore.delete(challengeKey);
      res.status(400).json({
        success: false,
        message: 'Authentication challenge expired. Please start the authentication process again.'
      } as WebAuthnVerifyResponse);
      return;
    }

    // Verify the WebAuthn authentication
    const verification = await verifyWebAuthnAuthentication(
      email,
      credential,
      storedChallenge.challenge
    );

    if (!verification.success || !verification.userId) {
      res.status(401).json({
        success: false,
        message: verification.error || 'WebAuthn authentication failed'
      } as WebAuthnVerifyResponse);
      return;
    }

    // Get user details
    const userResult = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [verification.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      } as WebAuthnVerifyResponse);
      return;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      } as WebAuthnVerifyResponse);
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const refreshTokenHash = hashToken(refreshToken);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, expiresAt]
    );

    // Clean up the challenge
    challengeStore.delete(challengeKey);

    res.json({
      success: true,
      message: 'WebAuthn authentication successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 60 * 60 // 1 hour in seconds
      }
    } as WebAuthnVerifyResponse);

  } catch (error) {
    console.error('WebAuthn verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as WebAuthnVerifyResponse);
  }
};

// GET /auth/webauthn/register/options
export const getWebAuthnRegisterOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Check if user exists
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const userId = userResult.rows[0].id;

    // Generate registration options
    const options = await generateWebAuthnRegistrationOptions(email, userId);
    
    // Store challenge
    const challengeKey = `register_${email}`;
    challengeStore.set(challengeKey, {
      challenge: options.challenge,
      userId,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      type: 'register'
    });

    res.json({
      success: true,
      options
    });

  } catch (error) {
    console.error('Error generating WebAuthn registration options:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /auth/webauthn/verify/options
export const getWebAuthnVerifyOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Generate authentication options
    const options = await generateWebAuthnAuthenticationOptions(email);
    
    // Store challenge
    const challengeKey = `verify_${email}`;
    challengeStore.set(challengeKey, {
      challenge: options.challenge,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      type: 'verify'
    });

    res.json({
      success: true,
      options
    });

  } catch (error) {
    console.error('Error generating WebAuthn authentication options:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /auth/refresh
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Verify the refresh token
    const decoded = verifyToken(refreshToken) as JWTPayload;

    if (decoded.type !== 'refresh') {
      res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
      return;
    }

    // Check if refresh token exists in database
    const tokenHash = hashToken(refreshToken);
    const tokenResult = await query(
      'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
      return;
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if token is revoked or expired
    if (tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
      res.status(401).json({
        success: false,
        message: 'Refresh token expired or revoked'
      });
      return;
    }

    // Get user details
    const userResult = await query(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = $1',
      [tokenRecord.user_id]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id, user.email);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    // Revoke old refresh token
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
      [tokenRecord.id]
    );

    // Store new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, newRefreshTokenHash, expiresAt]
    );

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 60 * 60 // 1 hour in seconds
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // Revoke the refresh token
    const tokenHash = hashToken(refreshToken);
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Export challenge store for cleanup (in production, use Redis)
export { challengeStore };
