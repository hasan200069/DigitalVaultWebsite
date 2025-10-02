import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useCrypto } from '../utils/useCrypto';
import { vaultApiService } from '../services/vaultApi';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'complete';
  progress: number;
  message: string;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassphrasePrompt, setShowPassphrasePrompt] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isVMKInitialized, encryptFile, restoreVMK } = useCrypto();

  const categories = [
    { value: 'documents', label: 'Documents' },
    { value: 'images', label: 'Images' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'archives', label: 'Archives' },
    { value: 'other', label: 'Other' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!itemName) {
        setItemName(file.name);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      if (!itemName) {
        setItemName(file.name);
      }
    }
  };

  const handleRestoreVMK = async () => {
    if (!passphrase.trim()) {
      setError('Please enter your passphrase');
      return;
    }

    try {
      const success = await restoreVMK(passphrase);
      if (success) {
        setShowPassphrasePrompt(false);
        setPassphrase('');
        setError(null);
        // Continue with upload
        handleUpload();
      } else {
        setError('Invalid passphrase. Please try again.');
      }
    } catch (err) {
      setError('Failed to restore VMK. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!itemName.trim()) {
      setError('Please enter a name for the item');
      return;
    }

    if (!isVMKInitialized) {
      // Check if we have a stored salt (meaning VMK was previously initialized)
      const hasStoredSalt = localStorage.getItem('vmkSalt') !== null;
      if (hasStoredSalt) {
        setShowPassphrasePrompt(true);
        return;
      } else {
        setError('Vault Master Key not initialized. Please go to Crypto Demo to initialize your VMK first.');
        return;
      }
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress({ stage: 'encrypting', progress: 0, message: 'Encrypting file...' });

    try {
      // Step 1: Encrypt the file
      const encryptionResult = await encryptFile(selectedFile);

      // Step 2: Create vault item
      setUploadProgress({ stage: 'uploading', progress: 0, message: 'Creating vault item...' });
      
      // Prepare encryption metadata: include CEK iv and file iv so we can decrypt later
      const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...Array.from(u8)));
      const encryptionMetadata = {
        cek: {
          ct: b64(new Uint8Array(encryptionResult.encryptedCek.ciphertext)),
          iv: b64(new Uint8Array(encryptionResult.encryptedCek.iv))
        },
        fileIv: b64(new Uint8Array(encryptionResult.encryptedData.iv))
      };

      const itemData = {
        name: itemName,
        description: description || undefined,
        category: category || undefined,
        tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        fileSize: encryptionResult.encryptedData.ciphertext.byteLength,
        mimeType: selectedFile.type,
        fileExtension: selectedFile.name.split('.').pop(),
        isEncrypted: true,
        encryptedCek: JSON.stringify(encryptionMetadata)
      };

      const createResponse = await vaultApiService.createItem(itemData);
      
      if (!createResponse.success || !createResponse.uploadUrl) {
        throw new Error(createResponse.message || 'Failed to create vault item');
      }

      // Step 3: Upload encrypted file
      setUploadProgress({ 
        stage: 'uploading', 
        progress: 50, 
        message: 'Uploading encrypted file...' 
      });

      await vaultApiService.uploadFile(
        createResponse.uploadUrl,
        encryptionResult.encryptedData.ciphertext,
        selectedFile.type
      );

      // Step 4: Complete
      setUploadProgress({ 
        stage: 'complete', 
        progress: 100, 
        message: 'Upload complete!' 
      });

      // Reset form
      setSelectedFile(null);
      setItemName('');
      setDescription('');
      setCategory('');
      setTags('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent
      onUploadComplete();

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
        setUploadProgress(null);
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      setError(null);
      setUploadProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload to Vault</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <DocumentIcon className="h-12 w-12 text-blue-500 mx-auto" />
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {vaultApiService.formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="text-sm text-gray-600">
                    Drag and drop a file here, or click to select
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Browse files
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Item Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter item name"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description (optional)"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter tags separated by commas (optional)"
              disabled={isUploading}
            />
          </div>

          {/* Encryption Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                File will be encrypted with AES-256-GCM before upload
              </span>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {uploadProgress.message}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(uploadProgress.progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* VMK Restoration Prompt */}
          {showPassphrasePrompt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">VMK Restoration Required</h3>
              <p className="text-sm text-blue-600 mb-3">
                Your Vault Master Key needs to be restored. Please enter your passphrase to continue.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your passphrase"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleRestoreVMK}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Restore VMK
                  </button>
                  <button
                    onClick={() => {
                      setShowPassphrasePrompt(false);
                      setPassphrase('');
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !itemName.trim() || isUploading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
