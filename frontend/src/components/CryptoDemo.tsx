import React, { useState } from 'react';
import { useCrypto } from '../utils/useCrypto';
import { cryptoService } from '../utils/cryptoService';

const CryptoDemo: React.FC = () => {
  const [passphrase, setPassphrase] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  const {
    isVMKInitialized,
    
    error,
    initializeVMK,
    restoreVMK,
    clearVMK,
    validatePassphrase,
    getVMKSalt,
    getEncryptionInfo
  } = useCrypto();

  // No auto-redirect - let users stay on the crypto demo page if they want to

  const handleInitializeVMK = async () => {
    if (!passphrase.trim()) {
      alert('Please enter a passphrase');
      return;
    }

    try {
      // Check if we have a stored salt (meaning VMK was previously initialized)
      const hasStoredSalt = localStorage.getItem('vmkSalt') !== null;
      
      if (hasStoredSalt) {
        // Restore VMK using stored salt
        console.log('Attempting to restore VMK with passphrase...');
        const success = await restoreVMK(passphrase);
        console.log('VMK restoration result:', success);
        
        if (success) {
          console.log('VMK restored successfully, checking state...');
          console.log('Service initialized:', cryptoService.isVMKInitialized());
          console.log('localStorage flag:', localStorage.getItem('vmkInitialized'));
          
          alert('VMK restored successfully! Redirecting...');
          // Redirect back to original page or vault after successful restoration
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('return') || '/dashboard/vault';
            console.log('Redirecting to:', returnUrl);
            // Force a full page reload to ensure VMK state is properly synchronized
            window.location.href = returnUrl;
          }, 1500);
        } else {
          console.log('VMK restoration failed');
          alert('Failed to restore VMK. Please check your passphrase.');
        }
      } else {
        // Initialize new VMK
        await initializeVMK(passphrase);
        alert('VMK initialized successfully! Redirecting...');
        // Redirect back to original page or vault after successful initialization
        setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get('return') || '/dashboard/vault';
          window.location.href = returnUrl;
        }, 1000);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleValidatePassphrase = () => {
    const result = validatePassphrase(passphrase);
    setValidationResult(result);
  };

  

  const encryptionInfo = getEncryptionInfo();
  const vmkSalt = getVMKSalt();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Encryption</h1>
      
      {/* VMK Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Vault Master Key Status</h2>
        <div className="space-y-2">
          <p>Status: <span className={isVMKInitialized ? 'text-green-600' : 'text-red-600'}>
            {isVMKInitialized ? 'Initialized' : 'Not Initialized'}
          </span></p>
          {vmkSalt && (
            <p>Salt: <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {Array.from(vmkSalt).map(b => b.toString(16).padStart(2, '0')).join('')}
            </code></p>
          )}
        </div>
      </div>

      {/* VMK Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">VMK Status</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isVMKInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              VMK Status: {isVMKInitialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>
          {localStorage.getItem('vmkSalt') && (
            <div className="text-sm text-gray-600">
              <p>VMK salt found in storage - you can restore your VMK with your passphrase.</p>
            </div>
          )}
          {isVMKInitialized && (
            <div className="text-sm text-green-600">
              <p>VMK is ready! You can now encrypt/decrypt files and access your vault.</p>
              <button
                onClick={() => window.location.href = '/dashboard/vault'}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Vault
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Passphrase Input - Hide Initialize if salt exists */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {localStorage.getItem('vmkSalt') ? 'Restore VMK' : 'Initialize VMK'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passphrase
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your passkey"
            />
          </div>
          <div className="flex space-x-4">
            {localStorage.getItem('vmkSalt') ? (
              <button
                onClick={handleInitializeVMK}
                disabled={!passphrase.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Restore VMK
              </button>
            ) : (
              <button
                onClick={handleInitializeVMK}
                disabled={!passphrase.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Initialize VMK
              </button>
            )}
            <button
              onClick={handleValidatePassphrase}
              disabled={!passphrase.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Validate Passphrase
            </button>
            <button
              onClick={clearVMK}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear VMK
            </button>
          </div>
        </div>
      </div>

      {/* Passphrase Validation Results */}
      {validationResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Passphrase Validation</h2>
          <div className="space-y-2">
            <p>Score: <span className="font-mono">{validationResult.score}/100</span></p>
            <p>Valid: <span className={validationResult.isValid ? 'text-green-600' : 'text-red-600'}>
              {validationResult.isValid ? 'Yes' : 'No'}
            </span></p>
            {validationResult.feedback.length > 0 && (
              <div>
                <p className="font-medium">Feedback:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {validationResult.feedback.map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      

      {/* Encryption Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Encryption Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Algorithm:</p>
            <p>{encryptionInfo.algorithm}</p>
          </div>
          <div>
            <p className="font-medium">Key Size:</p>
            <p>{encryptionInfo.keySize} bits</p>
          </div>
          <div>
            <p className="font-medium">Mode:</p>
            <p>{encryptionInfo.mode}</p>
          </div>
          <div>
            <p className="font-medium">Key Derivation:</p>
            <p>{encryptionInfo.keyDerivation}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default CryptoDemo;
