import React, { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, ShieldCheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useCrypto } from '../utils/useCrypto';
import { vaultApiService } from '../services/vaultApi';
import { ocrApiService } from '../services/ocrApi';
import { clientOCRService, type ClientOCRResponse } from '../services/clientOCRService';
import TagChips from './OCR/TagChips';
import RedactionSuggestion from './OCR/RedactionSuggestion';

// Helper function to generate UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to store OCR results on server
const storeOCRResultsOnServer = async (itemId: string, ocrResults: ClientOCRResponse): Promise<void> => {
  try {
    console.log('Storing OCR results on server for item:', itemId);
    
    if (!ocrResults.success || !ocrResults.ocrResult) {
      console.log('No OCR results to store');
      return;
    }

    const request = {
      itemId,
      ocrResult: {
        extractedText: ocrResults.ocrResult.extractedText,
        confidence: ocrResults.ocrResult.confidence,
        processingTime: ocrResults.ocrResult.processingTime
      },
      autoTags: ocrResults.autoTags || [],
      redactionSuggestions: ocrResults.redactionSuggestions || []
    };

    console.log('Sending OCR results to backend:', request);
    const response = await ocrApiService.storeOCRResults(request);
    console.log('OCR results stored successfully:', response);
  } catch (error) {
    console.error('Failed to store OCR results on server:', error);
    throw error;
  }
};

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface UploadProgress {
  stage: 'processing_ocr' | 'encrypting' | 'uploading' | 'complete';
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
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [autoTags, setAutoTags] = useState<any[]>([]);
  const [redactionSuggestions, setRedactionSuggestions] = useState<any[]>([]);
  const [showOCRResults, setShowOCRResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isVMKInitialized, encryptFile, restoreVMK } = useCrypto();

  // Document Categories as per vault organization
  const documentCategories = [
    'Court Documents',
    'Wills',
    'Real estate documents',
    'Title deeds',
    'Life Insurance documents',
    'Cryptocurrencies and NFTs',
    'Car Documents',
    'Private sensitive documents',
    'Business documents',
    'Digital will',
    'Important documents',
    'School certificates',
    'Financial documents',
    'End-of-life planning',
    'Marriage certificates',
    'Church/Mosque documents'
  ];

  const categories = [
    { value: '', label: 'Select a category...' },
    { value: 'documents', label: 'Documents' },
    { value: 'images', label: 'Images' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'archives', label: 'Archives' },
    { value: 'other', label: 'Other' },
    ...documentCategories.map(cat => ({ value: cat.toLowerCase().replace(/\s+/g, '-'), label: cat }))
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

    let ocrResults: ClientOCRResponse | null = null;

    try {
      // Step 1: Process OCR BEFORE encryption (if supported file type)
      console.log('Upload starting - checking file for OCR support', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        isSupported: clientOCRService.isSupported(selectedFile)
      });

      if (clientOCRService.isSupported(selectedFile)) {
        console.log('File is supported for OCR, starting processing...');
        setUploadProgress({ 
          stage: 'processing_ocr', 
          progress: 10, 
          message: 'Processing OCR...' 
        });

        console.log('Starting client-side OCR processing for:', selectedFile.name);
        ocrResults = await clientOCRService.processOCR(selectedFile);
        console.log('OCR processing completed, results:', ocrResults);
        
        if (ocrResults.success) {
          setOcrResult({
            id: generateUUID(),
            itemId: '', // Will be set after item creation
            extractedText: ocrResults.ocrResult!.extractedText,
            confidence: ocrResults.ocrResult!.confidence,
            processingTime: ocrResults.ocrResult!.processingTime,
            createdAt: new Date().toISOString()
          });
          // Add IDs to auto-generated tags and redaction suggestions for React keys
          setAutoTags((ocrResults.autoTags || []).map((tag, index) => ({
            ...tag,
            id: `auto-tag-${index}-${Date.now()}`
          })));
          setRedactionSuggestions((ocrResults.redactionSuggestions || []).map((suggestion, index) => ({
            ...suggestion,
            id: `redaction-${index}-${Date.now()}`
          })));
          setShowOCRResults(true);
          console.log('Client-side OCR completed:', {
            textLength: ocrResults.ocrResult!.extractedText.length,
            confidence: ocrResults.ocrResult!.confidence,
            autoTags: ocrResults.autoTags,
            redactionSuggestions: ocrResults.redactionSuggestions
          });
        } else {
          console.warn('Client-side OCR failed:', ocrResults.message);
          // Set flag to attempt backend OCR fallback after upload
          ocrResults.backendFallbackNeeded = true;
        }
      } else {
        console.log('File type not supported for OCR, skipping OCR processing');
      }

      // Step 2: Encrypt the file
      setUploadProgress({ stage: 'encrypting', progress: 30, message: 'Encrypting file...' });
      const encryptionResult = await encryptFile(selectedFile);

      // Step 3: Create vault item
      setUploadProgress({ stage: 'uploading', progress: 50, message: 'Creating vault item...' });
      
      // Combine user tags with auto-generated tags
      const userTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      const autoGenTags = ocrResults?.autoTags?.map(tag => tag.tag) || [];
      const allTags = [...new Set([...userTags, ...autoGenTags])]; // Remove duplicates
      
      // Prepare encryption metadata: include CEK iv and file iv so we can decrypt later
      const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...Array.from(u8)));
      const encryptionMetadata = {
        cek: {
          ct: b64(new Uint8Array(encryptionResult.encryptedCek.ciphertext)),
          iv: b64(new Uint8Array(encryptionResult.encryptedCek.iv))
        },
        fileIv: b64(new Uint8Array(encryptionResult.encryptedData.iv))
      };

      // Map category slug back to original name for document categories
      const getCategoryName = (slug: string): string => {
        if (!slug) return slug;
        const foundCategory = documentCategories.find(cat => 
          cat.toLowerCase().replace(/\s+/g, '-') === slug
        );
        return foundCategory || slug;
      };

      const itemData = {
        name: itemName,
        description: description || undefined,
        category: category ? getCategoryName(category) : undefined,
        tags: allTags.length > 0 ? allTags : undefined,
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

      // Step 4: Upload encrypted file
      setUploadProgress({ 
        stage: 'uploading', 
        progress: 70, 
        message: 'Uploading encrypted file...' 
      });

      // Convert Uint8Array -> ArrayBuffer view slice expected by upload API
      const ct = encryptionResult.encryptedData.ciphertext;
      const arrayBuffer = new Uint8Array(ct).buffer;
      await vaultApiService.uploadFile(
        createResponse.uploadUrl,
        arrayBuffer,
        selectedFile.type
      );

      // Step 5: Store OCR results on server (if OCR was successful)
      const itemId = createResponse.item?.id;
      console.log('Checking OCR results for storage:', {
        ocrResults: ocrResults,
        hasOcrResults: !!ocrResults,
        ocrSuccess: ocrResults?.success,
        hasOcrResult: !!ocrResults?.ocrResult,
        createResponse: createResponse,
        itemId: itemId,
        shouldStore: !!(ocrResults?.success && ocrResults.ocrResult && itemId)
      });

      if (ocrResults?.success && ocrResults.ocrResult && itemId) {
        console.log('Starting to store OCR results on server...');
        setUploadProgress({ 
          stage: 'uploading', 
          progress: 85, 
          message: 'Storing OCR results...' 
        });

        try {
          // Update the OCR result with the actual item ID
          const updatedOcrResult = {
            ...ocrResults.ocrResult,
            itemId: itemId
          };
          setOcrResult({
            id: generateUUID(),
            itemId: itemId,
            extractedText: updatedOcrResult.extractedText,
            confidence: updatedOcrResult.confidence,
            processingTime: updatedOcrResult.processingTime,
            createdAt: new Date().toISOString()
          });

          // Store OCR results on the server for future retrieval
          await storeOCRResultsOnServer(itemId, ocrResults);
        } catch (storeError) {
          console.warn('Failed to store OCR results on server:', storeError);
          // Don't fail the upload if storing OCR results fails
        }
      } else {
        console.log('Skipping OCR storage due to missing data:', {
          ocrResults: !!ocrResults,
          ocrSuccess: ocrResults?.success,
          ocrResult: !!ocrResults?.ocrResult,
          itemId: !!itemId,
          createResponseKeys: Object.keys(createResponse)
        });
      }

      // MISSING FALLBACK: Attempt backend OCR if client-side failed
      if (itemId && ocrResults?.backendFallbackNeeded && clientOCRService.isSupported(selectedFile)) {
        console.log('Attempting backend OCR fallback for item:', itemId);
        setUploadProgress({ 
          stage: 'uploading', 
          progress: 90, 
          message: 'Processing OCR on server (fallback)...' 
        });

        try {
          // Prepare encrypted data for secure backend OCR processing
          const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...Array.from(u8)));
          
          // Get the CEK for decryption (we need this for backend processing)
          // Note: In a real implementation, you'd need proper key management here
          const backendOCRRequest = {
            itemId: itemId,
            version: 1,
            encryptedFileData: {
              data: b64(new Uint8Array(encryptionResult.encryptedData.ciphertext)),
              iv: b64(new Uint8Array(encryptionResult.encryptedData.iv))
            },
            encryptedCek: {
              ciphertext: b64(new Uint8Array(encryptionResult.encryptedCek.ciphertext)),
              iv: b64(new Uint8Array(encryptionResult.encryptedCek.iv))
            },
            // For demo purposes - in production you need proper VMK handling
            decryptedCekKey: b64(new Uint8Array(32)) // This should be the actual CEK
          };

          console.log('Calling backend OCR with encrypted data...');
          const backendOCRResponse = await ocrApiService.processOCR(
            itemId, 
            1,
            backendOCRRequest.encryptedFileData,
            backendOCRRequest.encryptedCek,
            backendOCRRequest.decryptedCekKey
          );
          
          if (backendOCRResponse.success && backendOCRResponse.ocrResult) {
            console.log('Backend OCR fallback successful');
            
            // Update local state with backend results
            setOcrResult({
              id: generateUUID(),
              itemId: itemId,
              extractedText: backendOCRResponse.ocrResult.extractedText,
              confidence: backendOCRResponse.ocrResult.confidence,
              processingTime: backendOCRResponse.ocrResult.processingTime,
              createdAt: new Date().toISOString()
            });

            if (backendOCRResponse.autoTags) {
              setAutoTags(backendOCRResponse.autoTags.map((tag, index) => ({
                ...tag,
                id: tag.id || `backend-tag-${index}-${Date.now()}`
              })));
            }

            if (backendOCRResponse.redactionSuggestions) {
              setRedactionSuggestions(backendOCRResponse.redactionSuggestions.map((suggestion, index) => ({
                ...suggestion,
                id: suggestion.id || `backend-redaction-${index}-${Date.now()}`
              })));
            }

            setShowOCRResults(true);
            console.log('Backend OCR fallback completed successfully');
          } else {
            console.warn('Backend OCR fallback also failed:', backendOCRResponse.message);
          }
        } catch (backendError) {
          console.error('Backend OCR fallback failed:', backendError);
          // Don't fail the upload if backend OCR fails
        }
      }

      // Step 5: Complete
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

      // Close modal after a short delay (longer if OCR results are shown)
      const delay = showOCRResults ? 3000 : 1500;
      setTimeout(() => {
        onClose();
        setUploadProgress(null);
        setOcrResult(null);
        setAutoTags([]);
        setRedactionSuggestions([]);
        setShowOCRResults(false);
      }, delay);

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

          {/* OCR Results */}
          {showOCRResults && ocrResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-5 w-5 text-green-600" />
                <h3 className="text-sm font-medium text-green-800">OCR Processing Complete</h3>
              </div>
              
              {/* Auto Tags */}
              {autoTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Auto-generated Tags:</h4>
                  <TagChips tags={autoTags} showConfidence={true} />
                </div>
              )}

              {/* Redaction Suggestions */}
              {redactionSuggestions.length > 0 && (
                <RedactionSuggestion
                  suggestions={redactionSuggestions}
                  onRedact={(suggestionIds) => {
                    console.log('Redacting suggestions:', suggestionIds);
                    // In a real implementation, you'd call an API to apply redactions
                  }}
                  onDismiss={(suggestionIds) => {
                    console.log('Dismissing suggestions:', suggestionIds);
                    setRedactionSuggestions(prev => 
                      prev.filter(s => !suggestionIds.includes(s.id))
                    );
                  }}
                />
              )}

              <div className="text-xs text-green-600">
                OCR confidence: {(ocrResult.confidence * 100).toFixed(1)}% • 
                Processing time: {ocrResult.processingTime}ms
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
                Your Vault Master Key needs to be restored. Please enter your passkey to continue.
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your passkey"
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
