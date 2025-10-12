import React, { useState } from 'react';
import { KeyIcon, UploadIcon, DownloadIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { TrusteeKeyService, TrusteeKeyPair } from '../utils/trusteeKeyManager';
import { useCrypto } from '../utils/useCrypto';

interface TrusteeKeyManagerProps {
  onKeysGenerated?: (keyPairs: TrusteeKeyPair[]) => void;
  onKeysImported?: (keyPairs: TrusteeKeyPair[]) => void;
}

const TrusteeKeyManager: React.FC<TrusteeKeyManagerProps> = ({
  onKeysGenerated,
  onKeysImported
}) => {
  const { getCurrentVMK } = useCrypto();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedKeys, setGeneratedKeys] = useState<TrusteeKeyPair[]>([]);
  const [importedKeys, setImportedKeys] = useState<TrusteeKeyPair[]>([]);

  const generateKeyPair = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const keyPair = await TrusteeKeyService.generateKeyPair();
      setGeneratedKeys(prev => [...prev, keyPair]);
      setSuccess('Key pair generated successfully!');

      if (onKeysGenerated) {
        onKeysGenerated([...generatedKeys, keyPair]);
      }
    } catch (err) {
      console.error('Error generating key pair:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate key pair');
    } finally {
      setLoading(false);
    }
  };

  const importKeyPair = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const file = files[0];
      const text = await file.text();
      
      // Try to parse as JSON containing both public and private keys
      const keyData = JSON.parse(text);
      
      if (!keyData.publicKeyPem || !keyData.privateKeyPem) {
        throw new Error('Invalid key file format. Expected JSON with publicKeyPem and privateKeyPem.');
      }

      const publicKey = await TrusteeKeyService.importPublicKey(keyData.publicKeyPem);
      const privateKey = await TrusteeKeyService.importPrivateKey(keyData.privateKeyPem);

      const keyPair: TrusteeKeyPair = {
        publicKey,
        privateKey,
        publicKeyPem: keyData.publicKeyPem,
        privateKeyPem: keyData.privateKeyPem
      };

      setImportedKeys(prev => [...prev, keyPair]);
      setSuccess('Key pair imported successfully!');

      if (onKeysImported) {
        onKeysImported([...importedKeys, keyPair]);
      }
    } catch (err) {
      console.error('Error importing key pair:', err);
      setError(err instanceof Error ? err.message : 'Failed to import key pair');
    } finally {
      setLoading(false);
    }
  };

  const downloadKeyPair = (keyPair: TrusteeKeyPair, index: number) => {
    const keyData = {
      publicKeyPem: keyPair.publicKeyPem,
      privateKeyPem: keyPair.privateKeyPem,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustee-key-pair-${index + 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const storePrivateKey = async (keyPair: TrusteeKeyPair, trusteeEmail: string) => {
    try {
      const vmk = getCurrentVMK();
      if (!vmk) {
        throw new Error('Vault Master Key not initialized');
      }

      await TrusteeKeyService.storeTrusteePrivateKey(
        keyPair.privateKeyPem,
        trusteeEmail,
        vmk
      );

      setSuccess(`Private key stored securely for ${trusteeEmail}`);
    } catch (err) {
      console.error('Error storing private key:', err);
      setError(err instanceof Error ? err.message : 'Failed to store private key');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center mb-6">
        <KeyIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Trustee Key Management</h2>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Key Generation */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Key Pairs</h3>
        <button
          onClick={generateKeyPair}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <KeyIcon className="h-4 w-4 mr-2" />
          {loading ? 'Generating...' : 'Generate Key Pair'}
        </button>
      </div>

      {/* Key Import */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Import Existing Key Pairs</h3>
        <div className="flex items-center">
          <input
            type="file"
            accept=".json"
            onChange={importKeyPair}
            disabled={loading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Import JSON files containing public and private keys in PEM format.
        </p>
      </div>

      {/* Generated Keys */}
      {generatedKeys.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generated Key Pairs</h3>
          <div className="space-y-4">
            {generatedKeys.map((keyPair, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Key Pair #{index + 1}</p>
                    <p className="text-sm text-gray-500">
                      Generated: {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => downloadKeyPair(keyPair, index)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
                
                {/* Public Key Preview */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Public Key:</p>
                  <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600 break-all">
                    {keyPair.publicKeyPem.substring(0, 100)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Imported Keys */}
      {importedKeys.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Imported Key Pairs</h3>
          <div className="space-y-4">
            {importedKeys.map((keyPair, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Imported Key Pair #{index + 1}</p>
                    <p className="text-sm text-gray-500">
                      Imported: {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => downloadKeyPair(keyPair, index)}
                      className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
                
                {/* Public Key Preview */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Public Key:</p>
                  <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-600 break-all">
                    {keyPair.publicKeyPem.substring(0, 100)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How to Use Trustee Keys:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Generate key pairs for each trustee or import existing ones</li>
          <li>Share the public keys with trustees (they can be public)</li>
          <li>Keep private keys secure - they're needed to decrypt shares</li>
          <li>Use these keys when creating inheritance plans</li>
        </ol>
      </div>
    </div>
  );
};

export default TrusteeKeyManager;
