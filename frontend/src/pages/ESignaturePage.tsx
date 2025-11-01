import React, { useState, useEffect } from 'react';
import { 
  PencilSquareIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { vaultApiService, type VaultItem } from '../services/vaultApi';
import { useCrypto } from '../utils/useCrypto';
import SignaturePad from '../components/SignaturePad';
import { PDFDocument, rgb } from 'pdf-lib';

interface SignedDocument {
  id: string;
  originalDocumentId: string;
  originalDocumentName: string;
  signedDocumentName: string;
  signedAt: string;
  signatureData: string;
}

const ESignaturePage: React.FC = () => {
  const [documents, setDocuments] = useState<VaultItem[]>([]);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VaultItem | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(
    localStorage.getItem('savedSignature')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'sign' | 'signed'>('sign');
  const { downloadAndDecryptFile } = useCrypto();

  useEffect(() => {
    loadDocuments();
    loadSignedDocuments();
  }, []);

  const loadDocuments = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await vaultApiService.listItems({ limit: 100 });
      if (response.success && response.items) {
        // Filter for PDF documents and images
        const signableDocuments = response.items.filter(
          item => {
            const mimeType = item.mimeType?.toLowerCase() || '';
            const extension = item.fileExtension?.toLowerCase() || '';
            
            // PDFs
            if (mimeType === 'application/pdf' || extension === 'pdf') return true;
            
            // Images
            if (mimeType.startsWith('image/')) return true;
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return true;
            
            return false;
          }
        );
        setDocuments(signableDocuments);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSignedDocuments = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('signedDocuments');
    if (saved) {
      try {
        setSignedDocuments(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading signed documents:', error);
      }
    }
  };

  const saveSignedDocument = (doc: SignedDocument) => {
    const updated = [...signedDocuments, doc];
    setSignedDocuments(updated);
    localStorage.setItem('signedDocuments', JSON.stringify(updated));
  };

  const handleSelectDocument = (document: VaultItem) => {
    setSelectedDocument(document);
    setShowSignaturePad(true);
  };

  const isImageFile = (item: VaultItem): boolean => {
    const mimeType = item.mimeType?.toLowerCase() || '';
    const extension = item.fileExtension?.toLowerCase() || '';
    return mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension);
  };

  const signImage = async (imageData: ArrayBuffer, mimeType: string, signatureData: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      // Create image element from the decrypted data
      const blob = new Blob([imageData], { type: mimeType });
      const imageUrl = URL.createObjectURL(blob);
      
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Load signature image
        const signatureImg = new Image();
        signatureImg.onload = () => {
          // Calculate signature size (15% of image width or 150px, whichever is smaller)
          const signatureWidth = Math.min(img.width * 0.15, 150);
          const signatureHeight = (signatureWidth / signatureImg.width) * signatureImg.height;
          
          // Position signature at bottom-right with margin
          const margin = 20;
          const x = img.width - signatureWidth - margin;
          const y = img.height - signatureHeight - margin;
          
          // Draw signature
          ctx.drawImage(signatureImg, x, y, signatureWidth, signatureHeight);
          
          // Add signature date text
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText(`Signed: ${new Date().toLocaleDateString()}`, x, y - 10);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(imageUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create signed image'));
            }
          }, mimeType || 'image/png');
        };
        
        signatureImg.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load signature image'));
        };
        
        signatureImg.src = signatureData;
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  };

  const handleSignatureSave = async (signatureData: string) => {
    if (!selectedDocument) return;

    // Save signature to localStorage for future use
    localStorage.setItem('savedSignature', signatureData);
    setSavedSignature(signatureData);

    try {
      // Download and decrypt the original file
      const encryptedFile = await downloadAndDecryptFile(
        selectedDocument.id,
        selectedDocument.currentVersion,
        {
          isEncrypted: selectedDocument.isEncrypted,
          encryptionKeyId: selectedDocument.encryptionKeyId,
          mimeType: selectedDocument.mimeType
        }
      );

      let signedBlob: Blob;
      let signedName: string;
      const isImage = isImageFile(selectedDocument);

      if (isImage) {
        // Handle image signing
        signedBlob = await signImage(encryptedFile, selectedDocument.mimeType || 'image/png', signatureData);
        
        // Create signed version name
        const originalName = selectedDocument.name;
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const extension = originalName.split('.').pop() || 'png';
        signedName = `${nameWithoutExt}_signed_${Date.now()}.${extension}`;
      } else {
        // Handle PDF signing (existing logic)
        const pdfBytes = new Uint8Array(encryptedFile);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();

        // Convert signature image
        let signatureImage;
        if (signatureData.startsWith('data:image/png')) {
          signatureImage = await pdfDoc.embedPng(signatureData);
        } else if (signatureData.startsWith('data:image/jpeg') || signatureData.startsWith('data:image/jpg')) {
          signatureImage = await pdfDoc.embedJpg(signatureData);
        } else {
          signatureImage = await pdfDoc.embedPng(signatureData);
        }

        // Add signature to PDF
        const signatureWidth = 150;
        const signatureHeight = 60;
        const x = width - signatureWidth - 50;
        const y = 50;

        lastPage.drawImage(signatureImage, {
          x,
          y,
          width: signatureWidth,
          height: signatureHeight,
        });

        // Add signature date
        const signatureDate = new Date().toLocaleDateString();
        lastPage.drawText(`Signed: ${signatureDate}`, {
          x,
          y: y - 15,
          size: 10,
          color: rgb(0, 0, 0),
        });

        // Serialize PDF
        const signedPdfBytes = await pdfDoc.save();
        signedName = `${selectedDocument.name.replace('.pdf', '')}_signed_${Date.now()}.pdf`;
        signedBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      }

      // Save document record
      const signedDoc: SignedDocument = {
        id: `signed_${Date.now()}`,
        originalDocumentId: selectedDocument.id,
        originalDocumentName: selectedDocument.name,
        signedDocumentName: signedName,
        signedAt: new Date().toISOString(),
        signatureData: signatureData
      };

      saveSignedDocument(signedDoc);

      // Download the signed file (PDF or Image)
      const url = URL.createObjectURL(signedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = signedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Reset selection
      setSelectedDocument(null);
      setShowSignaturePad(false);
      const fileType = isImage ? 'image' : 'PDF';
      alert(`Document signed successfully! The signed ${fileType} has been downloaded.`);

    } catch (error) {
      console.error('Error signing document:', error);
      alert('Failed to sign document. Please try again.');
    }
  };

  const handleDeleteSignedDocument = (docId: string) => {
    if (window.confirm('Are you sure you want to delete this signed document record?')) {
      const updated = signedDocuments.filter(doc => doc.id !== docId);
      setSignedDocuments(updated);
      localStorage.setItem('signedDocuments', JSON.stringify(updated));
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <PencilSquareIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Signature</h1>
                <p className="mt-1 text-sm text-gray-600">Sign your PDF documents and images electronically</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadDocuments(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh documents list"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              {savedSignature && (
                <button
                  onClick={() => setShowSignaturePad(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                  <span>Edit Signature</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('sign')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sign'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sign Documents
            </button>
            <button
              onClick={() => setActiveTab('signed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'signed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Signed Documents ({signedDocuments.length})
            </button>
          </nav>
        </div>

        {/* Sign Documents Tab */}
        {activeTab === 'sign' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Signature Info */}
            {savedSignature && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Signature Ready</p>
                      <p className="text-sm text-blue-700">You have a saved signature. Select a document to sign.</p>
                    </div>
                  </div>
                  <img
                    src={savedSignature}
                    alt="Saved Signature"
                    className="h-12 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}

            {/* Documents List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? 'No documents match your search.' : 'Upload PDF documents or images to your vault to sign them.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => window.location.href = '/dashboard/vault'}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Vault
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => {
                  const isImage = isImageFile(doc);
                  return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      {isImage ? (
                        <PhotoIcon className="h-10 w-10 text-blue-500 flex-shrink-0" />
                      ) : (
                        <DocumentTextIcon className="h-10 w-10 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {isImage ? 'IMAGE' : 'PDF'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">{doc.name}</h3>
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleSelectDocument(doc)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                      <span>Sign Document</span>
                    </button>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Signed Documents Tab */}
        {activeTab === 'signed' && (
          <div>
            {signedDocuments.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Signed Documents</h3>
                <p className="text-gray-600">
                  Documents you sign will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Original
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Signed Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Signature
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {signedDocuments.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-8 w-8 text-red-600 mr-3" />
                              <span className="text-sm font-medium text-gray-900">{doc.signedDocumentName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-500">{doc.originalDocumentName}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                              <ClockIcon className="h-4 w-4 mr-2" />
                              {new Date(doc.signedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <img
                              src={doc.signatureData}
                              alt="Signature"
                              className="h-12 border border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleDeleteSignedDocument(doc.id)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureSave}
          onClose={() => {
            setShowSignaturePad(false);
            if (!savedSignature) {
              setSelectedDocument(null);
            }
          }}
          initialSignature={savedSignature || undefined}
        />
      )}
    </div>
  );
};

export default ESignaturePage;
