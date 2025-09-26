import { Router } from 'express';
import {
  register,
  login,
  webauthnRegister,
  webauthnVerify,
  getWebAuthnRegisterOptions,
  getWebAuthnVerifyOptions,
  refreshToken,
  logout
} from './authService';

const router = Router();

// Authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// WebAuthn routes
router.get('/webauthn/register/options', getWebAuthnRegisterOptions);
router.post('/webauthn/register', webauthnRegister);
router.get('/webauthn/verify/options', getWebAuthnVerifyOptions);
router.post('/webauthn/verify', webauthnVerify);

export default router;
