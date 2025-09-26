import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts
} from '@simplewebauthn/server';
import { WebAuthnCredential } from './database';
import { query } from './database';

// WebAuthn configuration
const RP_NAME = 'Digital Vault';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

// Generate registration options for WebAuthn
export const generateWebAuthnRegistrationOptions = async (
  email: string,
  userId?: string
): Promise<any> => {
  try {
    // Get existing credentials for the user if userId is provided
    let excludeCredentials: any[] = [];
    if (userId) {
      const result = await query(
        'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
        [userId]
      );
      excludeCredentials = result.rows.map((row: any) => ({
        id: row.credential_id,
        type: 'public-key' as const,
        transports: ['internal', 'hybrid'] as ('internal' | 'hybrid')[]
      }));
    }

    const options: GenerateRegistrationOptionsOpts = {
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userId || email,
      userName: email,
      userDisplayName: email,
      attestationType: 'indirect',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred'
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
      excludeCredentials,
      timeout: 60000, // 60 seconds
    };

    const registrationOptions = await generateRegistrationOptions(options);
    return registrationOptions;
  } catch (error) {
    console.error('Error generating WebAuthn registration options:', error);
    throw new Error('Failed to generate registration options');
  }
};

// Verify WebAuthn registration response
export const verifyWebAuthnRegistration = async (
  email: string,
  credential: any,
  expectedChallenge: string,
  userId?: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> => {
  try {
    const verificationOptions: VerifyRegistrationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    };

    const verification = await verifyRegistrationResponse(verificationOptions);
    
    if (verification.verified && verification.registrationInfo) {
      // Store the credential in the database
      const credentialId = Buffer.from(verification.registrationInfo.credentialID).toString('base64url');
      const publicKey = Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64');
      
      // If userId is not provided, we need to find the user by email
      let actualUserId = userId;
      if (!actualUserId) {
        const userResult = await query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );
        if (userResult.rows.length === 0) {
          return { success: false, error: 'User not found' };
        }
        actualUserId = userResult.rows[0].id;
      }

      // Store the credential
      await query(
        `INSERT INTO webauthn_credentials 
         (user_id, credential_id, public_key, counter, device_type, backed_up, transports)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          actualUserId,
          credentialId,
          publicKey,
          verification.registrationInfo.counter,
          'platform', // Default device type
          false,
          ['internal'] // Default transports
        ]
      );

      return { success: true, credentialId };
    }

    return { success: false, error: 'Verification failed' };
  } catch (error) {
    console.error('Error verifying WebAuthn registration:', error);
    return { success: false, error: 'Verification failed' };
  }
};

// Generate authentication options for WebAuthn
export const generateWebAuthnAuthenticationOptions = async (
  email: string
): Promise<any> => {
  try {
    // Get user's credentials
    const result = await query(
      `SELECT wc.credential_id 
       FROM webauthn_credentials wc
       JOIN users u ON wc.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    const allowCredentials = result.rows.map((row: any) => ({
      id: row.credential_id,
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as ('internal' | 'hybrid')[]
    }));

    const options: GenerateAuthenticationOptionsOpts = {
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000, // 60 seconds
    };

    const authenticationOptions = await generateAuthenticationOptions(options);
    return authenticationOptions;
  } catch (error) {
    console.error('Error generating WebAuthn authentication options:', error);
    throw new Error('Failed to generate authentication options');
  }
};

// Verify WebAuthn authentication response
export const verifyWebAuthnAuthentication = async (
  email: string,
  credential: any,
  expectedChallenge: string
): Promise<{ success: boolean; userId?: string; error?: string }> => {
  try {
    // Get the credential from database
    const credentialId = credential.id;
    const result = await query(
      `SELECT wc.*, u.id as user_id
       FROM webauthn_credentials wc
       JOIN users u ON wc.user_id = u.id
       WHERE wc.credential_id = $1 AND u.email = $2`,
      [credentialId, email]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Credential not found' };
    }

    const storedCredential = result.rows[0];
    const userId = storedCredential.user_id;

    const verificationOptions: VerifyAuthenticationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(storedCredential.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(storedCredential.public_key, 'base64'),
        counter: storedCredential.counter,
      },
    };

    const verification = await verifyAuthenticationResponse(verificationOptions);
    
    if (verification.verified) {
      // Update the counter and last used timestamp
      await query(
        'UPDATE webauthn_credentials SET counter = $1, last_used_at = NOW() WHERE credential_id = $2',
        [verification.authenticationInfo.newCounter, credentialId]
      );

      return { success: true, userId };
    }

    return { success: false, error: 'Authentication failed' };
  } catch (error) {
    console.error('Error verifying WebAuthn authentication:', error);
    return { success: false, error: 'Authentication failed' };
  }
};
