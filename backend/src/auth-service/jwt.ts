import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload } from './types';

// Export JWTPayload for use in other modules
export { JWTPayload };

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Generate access token
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

// Generate refresh token
export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate random token for refresh token storage
export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Generate WebAuthn challenge
export const generateWebAuthnChallenge = (): string => {
  return crypto.randomBytes(32).toString('base64url');
};

// Verify WebAuthn challenge
export const verifyWebAuthnChallenge = (challenge: string, storedChallenge: string): boolean => {
  return challenge === storedChallenge;
};
