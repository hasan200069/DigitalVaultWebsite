import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable
} from '@simplewebauthn/browser';
import { getAccessToken } from '../utils/auth';

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    residentKey?: 'required' | 'preferred' | 'discouraged';
  };
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'>;
  }>;
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: Array<'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid'>;
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface WebAuthnServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class WebAuthnService {
  private static readonly API_BASE_URL = 'http://localhost:3001';

  /**
   * Check if WebAuthn is supported by the browser
   */
  static isSupported(): boolean {
    return browserSupportsWebAuthn();
  }

  /**
   * Check if platform authenticator (biometric) is available
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    return await platformAuthenticatorIsAvailable();
  }

  /**
   * Register a new WebAuthn credential
   */
  static async register(email: string): Promise<WebAuthnServiceResponse> {
    try {
      if (!this.isSupported()) {
        return {
          success: false,
          message: 'WebAuthn is not supported by this browser'
        };
      }

      // Get registration options from backend
      // Set createAccount=true to allow registration during account creation
      const response = await fetch(`${this.API_BASE_URL}/auth/webauthn/register/options?email=${encodeURIComponent(email)}&createAccount=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to get registration options'
        };
      }

      const data = await response.json();
      const options: WebAuthnRegistrationOptions = data.options;

      // Start WebAuthn registration with timeout handling
      let credential;
      try {
        credential = await Promise.race([
          startRegistration({ optionsJSON: options }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Registration timed out after 60 seconds. Please try again.')), 60000)
          )
        ]) as any;
      } catch (error: any) {
        // Handle user cancellation or timeout
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          throw new Error('Registration was cancelled or timed out. Please try again.');
        }
        if (error.message && error.message.includes('timed out')) {
          throw error;
        }
        throw new Error(error.message || 'Registration failed. Please make sure to use a supported device.');
      }

      // Send credential to backend for verification
      const verifyResponse = await fetch(`${this.API_BASE_URL}/auth/webauthn/register/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          credential,
          expectedChallenge: options.challenge
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        return {
          success: false,
          message: errorData.message || 'Registration verification failed'
        };
      }

      const result = await verifyResponse.json();
      return {
        success: result.success,
        message: result.message,
        data: result
      };

    } catch (error) {
      console.error('WebAuthn registration error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Registration failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add helpful context for common errors
        if (error.message.includes('cancelled') || error.message.includes('timeout')) {
          errorMessage += ' If you selected "Use phone" or scanned a QR code, please try selecting "Use this device" instead.';
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Authenticate using WebAuthn
   */
  static async authenticate(email: string): Promise<WebAuthnServiceResponse> {
    try {
      if (!this.isSupported()) {
        return {
          success: false,
          message: 'WebAuthn is not supported by this browser'
        };
      }

      // Get authentication options from backend
      const response = await fetch(`${this.API_BASE_URL}/auth/webauthn/verify/options?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to get authentication options'
        };
      }

      const data = await response.json();
      const options: WebAuthnAuthenticationOptions = data.options;

      // Start WebAuthn authentication with timeout handling
      let credential;
      try {
        credential = await Promise.race([
          startAuthentication({ optionsJSON: options }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Authentication timed out after 60 seconds. Please try again.')), 60000)
          )
        ]) as any;
      } catch (error: any) {
        // Handle user cancellation, timeout, or other errors
        if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
          throw new Error('Authentication was cancelled. Please try again.');
        }
        if (error.name === 'InvalidStateError') {
          throw new Error('This device has already been registered. Please use a different device or contact support.');
        }
        if (error.name === 'NotSupportedError') {
          throw new Error('This authentication method is not supported. Please use a different device.');
        }
        if (error.message && error.message.includes('timed out')) {
          throw error;
        }
        // Check for QR code/cross-platform specific errors
        if (error.message && (error.message.includes('QR') || error.message.includes('cross-platform'))) {
          throw new Error('Cross-device authentication failed. Please try using this device\'s biometric authentication instead.');
        }
        throw new Error(error.message || 'Authentication failed. Please try again.');
      }

      // Send credential to backend for verification
      const verifyResponse = await fetch(`${this.API_BASE_URL}/auth/webauthn/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          credential,
          expectedChallenge: options.challenge
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        return {
          success: false,
          message: errorData.message || 'Authentication verification failed'
        };
      }

      const result = await verifyResponse.json();
      return {
        success: result.success,
        message: result.message,
        data: result
      };

    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Authentication failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add helpful context for common errors
        if (error.message.includes('cancelled') || error.message.includes('timeout')) {
          errorMessage += ' If you selected "Use phone" or scanned a QR code, please try selecting "Use this device" instead.';
        } else if (error.message.includes('not supported')) {
          errorMessage += ' Please use the biometric authentication on this device (fingerprint, face recognition, etc.).';
        }
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Get WebAuthn status information
   */
  static async getStatus(): Promise<{
    supported: boolean;
    platformAuthenticatorAvailable: boolean;
    message: string;
  }> {
    const supported = this.isSupported();
    const platformAvailable = supported ? await this.isPlatformAuthenticatorAvailable() : false;
    
    let message = '';
    if (!supported) {
      message = 'WebAuthn is not supported by this browser';
    } else if (!platformAvailable) {
      message = 'Platform authenticator (biometric) is not available';
    } else {
      message = 'WebAuthn and biometric authentication are ready';
    }

    return {
      supported,
      platformAuthenticatorAvailable: platformAvailable,
      message
    };
  }

  /**
   * Get user's registered devices
   */
  static async getDevices(): Promise<{
    success: boolean;
    devices?: Array<{
      id: string;
      credentialId: string;
      deviceType: string;
      registeredAt: string;
      lastUsedAt: string | null;
    }>;
    message?: string;
  }> {
    try {
      const token = getAccessToken();
      if (!token) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/webauthn/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to fetch devices'
        };
      }

      const data = await response.json();
      return {
        success: true,
        devices: data.devices
      };
    } catch (error) {
      console.error('Error fetching devices:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch devices'
      };
    }
  }

  /**
   * Delete a registered device
   */
  static async deleteDevice(credentialId: string): Promise<WebAuthnServiceResponse> {
    try {
      const token = getAccessToken();
      if (!token) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      const response = await fetch(`${this.API_BASE_URL}/auth/webauthn/devices/${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Failed to delete device'
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Device removed successfully'
      };
    } catch (error) {
      console.error('Error deleting device:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete device'
      };
    }
  }

  /**
   * Register a new device for an existing user (when logged in)
   */
  static async registerDevice(email: string): Promise<WebAuthnServiceResponse> {
    // This uses the same registration flow, but should be called when user is logged in
    return await this.register(email);
  }
}

