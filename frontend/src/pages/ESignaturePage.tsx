import React, { useState, useEffect } from 'react';
import { 
  PencilSquareIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PhotoIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  UserIcon,
  HomeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { vaultApiService, type VaultItem } from '../services/vaultApi';
import { folderApiService, type Folder } from '../services/folderApi';
import { useCrypto } from '../utils/useCrypto';
import { cryptoService } from '../utils/cryptoService';
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
  const [allDocuments, setAllDocuments] = useState<VaultItem[]>([]); // All documents for filtering
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
  const { isVMKInitialized, downloadAndDecryptFile, restoreVMK } = useCrypto();
  const [showVMKPrompt, setShowVMKPrompt] = useState(false);
  const [vmkPassphrase, setVmkPassphrase] = useState('');
  const [vmkRestored, setVmkRestored] = useState(false);

  // Folder navigation state
  const [selectedTaxonomyCategory, setSelectedTaxonomyCategory] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [userCreatedFolders, setUserCreatedFolders] = useState<Folder[]>([]);
  const [allUserFolders, setAllUserFolders] = useState<Folder[]>([]);

  // Taxonomy Categories with icons - same as Vault
  interface TaxonomyCategory {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    folders: string[];
  }

  const taxonomyCategories: TaxonomyCategory[] = [
    {
      id: 'legal',
      name: 'Legal Documents',
      icon: ScaleIcon,
      color: 'text-blue-600 bg-blue-100',
      folders: ['Court Documents', 'Wills', 'Digital will']
    },
    {
      id: 'financial',
      name: 'Financial Documents',
      icon: CurrencyDollarIcon,
      color: 'text-green-600 bg-green-100',
      folders: ['Financial documents', 'Cryptocurrencies and NFTs']
    },
    {
      id: 'real-estate',
      name: 'Real Estate Documents',
      icon: HomeIcon,
      color: 'text-purple-600 bg-purple-100',
      folders: ['Real estate documents', 'Title deeds']
    },
    {
      id: 'insurance',
      name: 'Insurance Documents',
      icon: ShieldCheckIcon,
      color: 'text-cyan-600 bg-cyan-100',
      folders: ['Life Insurance documents']
    },
    {
      id: 'personal',
      name: 'Personal Documents',
      icon: UserIcon,
      color: 'text-pink-600 bg-pink-100',
      folders: ['Private sensitive documents', 'Important documents', 'Car Documents']
    },
    {
      id: 'business',
      name: 'Business Documents',
      icon: BriefcaseIcon,
      color: 'text-orange-600 bg-orange-100',
      folders: ['Business documents']
    },
    {
      id: 'educational',
      name: 'Educational Documents',
      icon: AcademicCapIcon,
      color: 'text-indigo-600 bg-indigo-100',
      folders: ['School certificates']
    },
    {
      id: 'ceremonial',
      name: 'Ceremonial Documents',
      icon: HeartIcon,
      color: 'text-red-600 bg-red-100',
      folders: ['Marriage certificates', 'Church/Mosque documents', 'End-of-life planning']
    }
  ];

  const documentCategories = taxonomyCategories.flatMap(cat => cat.folders);

  useEffect(() => {
    loadDocuments();
    loadSignedDocuments();
    loadAllFolders();
  }, []);

  // Listen for VMK state changes
  useEffect(() => {
    const handleVMKChange = () => {
      console.log('ESignaturePage: VMK state change event received');
      const serviceInitialized = cryptoService.isVMKInitialized();
      const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
      console.log('ESignaturePage: Current VMK state after change:', {
        serviceInitialized,
        localStorageInitialized,
        isVMKInitialized
      });
      
      // If VMK is now initialized, close the modal
      if (serviceInitialized && localStorageInitialized) {
        setShowVMKPrompt(false);
        setVmkRestored(true);
      }
    };
    
    window.addEventListener('vmkStateChanged', handleVMKChange);
    
    return () => {
      window.removeEventListener('vmkStateChanged', handleVMKChange);
    };
  }, [isVMKInitialized]);

  // Show VMK prompt if VMK needs to be restored
  useEffect(() => {
    const serviceInitialized = cryptoService.isVMKInitialized();
    const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
    const hasStoredSalt = localStorage.getItem('vmkSalt') !== null;
    
    // If we have a stored salt but VMK is not in memory, show prompt
    // But don't show if we just restored it
    if (hasStoredSalt && !serviceInitialized && localStorageInitialized && !vmkRestored) {
      console.log('ESignaturePage: VMK needs to be restored, showing prompt');
      setShowVMKPrompt(true);
    }
  }, [vmkRestored]);

  const handleRestoreVMK = async () => {
    if (!vmkPassphrase.trim()) {
      alert('Please enter your passphrase');
      return;
    }

    try {
      const success = await restoreVMK(vmkPassphrase);
      if (success) {
        setShowVMKPrompt(false);
        setVmkPassphrase('');
        setVmkRestored(true);
        alert('VMK restored successfully! You can now sign documents.');
      } else {
        alert('Failed to restore VMK. Please check your passphrase.');
      }
    } catch (error) {
      console.error('VMK restoration error:', error);
      alert('Error restoring VMK. Please try again.');
    }
  };

  // Load user-created folders for selected taxonomy
  useEffect(() => {
    const loadFolders = async () => {
      if (selectedTaxonomyCategory) {
        try {
          const response = await folderApiService.listFolders(selectedTaxonomyCategory);
          if (response.success && response.folders) {
            setUserCreatedFolders(response.folders);
          }
        } catch (error) {
          console.error('Error loading folders:', error);
        }
      } else {
        setUserCreatedFolders([]);
      }
    };
    loadFolders();
  }, [selectedTaxonomyCategory]);

  // Load all folders on mount
  const loadAllFolders = async () => {
    try {
      const response = await folderApiService.listFolders();
      if (response.success && response.folders) {
        setAllUserFolders(response.folders);
      }
    } catch (error) {
      console.error('Error loading all folders:', error);
    }
  };

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
        setAllDocuments(signableDocuments);
        // Apply folder filter if one is selected
        applyFolderFilter(signableDocuments);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply folder filter to documents
  const applyFolderFilter = (docs: VaultItem[]) => {
    if (selectedFolder) {
      // Filter documents by selected folder (category)
      const filtered = docs.filter(doc => 
        doc.category?.toLowerCase() === selectedFolder.toLowerCase()
      );
      setDocuments(filtered);
    } else if (selectedTaxonomyCategory === 'all') {
      // Show all documents
      setDocuments(docs);
    } else if (selectedTaxonomyCategory) {
      // Show all documents in taxonomy (no folder selected yet)
      setDocuments(docs);
    } else {
      // Show all documents
      setDocuments(docs);
    }
  };

  // Update documents when folder selection changes
  useEffect(() => {
    if (allDocuments.length > 0) {
      applyFolderFilter(allDocuments);
    }
  }, [selectedFolder, selectedTaxonomyCategory]);

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

    // Check VMK initialization before proceeding
    const serviceInitialized = cryptoService.isVMKInitialized();
    const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
    const hasStoredSalt = localStorage.getItem('vmkSalt') !== null;

    if (!isVMKInitialized || !serviceInitialized) {
      if (hasStoredSalt) {
        // VMK needs to be restored
        setShowVMKPrompt(true);
        alert('VMK needs to be restored to sign documents. Please enter your passphrase.');
        return;
      } else {
        // VMK needs to be initialized
        alert('VMK needs to be initialized to sign documents. Redirecting to crypto demo...');
        window.location.href = '/dashboard/crypto-demo?return=' + encodeURIComponent('/dashboard/e-signature');
        return;
      }
    }

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

            {/* Folder Navigation or Documents List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading documents...</p>
              </div>
            ) : selectedTaxonomyCategory === 'all' ? (
              // Show All Documents View
              <div>
                <div className="mb-4 flex items-center">
                  <button
                    onClick={() => setSelectedTaxonomyCategory(null)}
                    className="mr-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Back to categories"
                  >
                    <ChevronDownIcon className="h-5 w-5 rotate-90" />
                  </button>
                  <h2 className="text-xl font-semibold text-gray-900">All Signable Documents</h2>
                </div>

                {filteredDocuments.length === 0 ? (
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
            ) : selectedTaxonomyCategory === null ? (
              // Show Taxonomy Categories
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Document Categories</h2>
                  <button
                    onClick={() => {
                      setSelectedTaxonomyCategory('all');
                      setSelectedFolder(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span>View All Documents</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {taxonomyCategories.map((taxCategory) => {
                    const IconComponent = taxCategory.icon;
                    const userFoldersForTaxonomy = allUserFolders.filter(f => f.taxonomyId === taxCategory.id);
                    const totalFolderCount = taxCategory.folders.length + userFoldersForTaxonomy.length;
                    
                    // Count signable documents in this taxonomy
                    const taxonomyDocs = allDocuments.filter(doc => {
                      const docCategory = doc.category?.toLowerCase() || '';
                      return taxCategory.folders.some(f => f.toLowerCase() === docCategory) ||
                             userFoldersForTaxonomy.some(f => f.name.toLowerCase() === docCategory);
                    });
                    
                    return (
                      <div 
                        key={taxCategory.id} 
                        className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
                        onClick={() => setSelectedTaxonomyCategory(taxCategory.id)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-14 h-14 ${taxCategory.color} rounded-xl flex items-center justify-center`}>
                            <IconComponent className="h-8 w-8" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {taxCategory.name}
                        </h3>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            {totalFolderCount} {totalFolderCount === 1 ? 'folder' : 'folders'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {taxonomyDocs.length} {taxonomyDocs.length === 1 ? 'signable document' : 'signable documents'}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center text-sm text-gray-400">
                          <span>View folders</span>
                          <ChevronRightIcon className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : selectedFolder === null ? (
              // Show Folders within selected Taxonomy Category
              <div>
                <div className="mb-4 flex items-center">
                  <button
                    onClick={() => setSelectedTaxonomyCategory(null)}
                    className="mr-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Back to categories"
                  >
                    <ChevronDownIcon className="h-5 w-5 rotate-90" />
                  </button>
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const taxCategory = taxonomyCategories.find(c => c.id === selectedTaxonomyCategory);
                      if (!taxCategory) return null;
                      const IconComponent = taxCategory.icon;
                      return (
                        <>
                          <div className={`w-10 h-10 ${taxCategory.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <h2 className="text-xl font-semibold text-gray-900">{taxCategory.name}</h2>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const taxCategory = taxonomyCategories.find(c => c.id === selectedTaxonomyCategory);
                    if (!taxCategory) return null;
                    
                    const defaultFolders = taxCategory.folders;
                    const userFolderNames = userCreatedFolders.map(f => f.name);
                    const allFolders = [...defaultFolders, ...userFolderNames];
                    
                    return allFolders.map((folder) => {
                      const folderDocs = allDocuments.filter(doc => 
                        doc.category?.toLowerCase() === folder.toLowerCase()
                      );
                      const signableDocs = folderDocs.filter(doc => {
                        const mimeType = doc.mimeType?.toLowerCase() || '';
                        const extension = doc.fileExtension?.toLowerCase() || '';
                        return mimeType === 'application/pdf' || extension === 'pdf' ||
                               mimeType.startsWith('image/') || 
                               ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension);
                      });
                      const isUserCreated = userCreatedFolders.some(f => f.name === folder);
                      
                      return (
                        <div 
                          key={folder} 
                          className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                          onClick={() => setSelectedFolder(folder)}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <FolderIcon className="h-12 w-12 text-yellow-500" />
                          </div>
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1">
                              {folder}
                            </h3>
                            {isUserCreated && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">
                              {signableDocs.length} {signableDocs.length === 1 ? 'signable document' : 'signable documents'}
                            </p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              // Show Documents in Selected Folder
              <div>
                <div className="mb-4 flex items-center">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="mr-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Back to folders"
                  >
                    <ChevronDownIcon className="h-5 w-5 rotate-90" />
                  </button>
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const taxCategory = taxonomyCategories.find(c => c.id === selectedTaxonomyCategory);
                      if (!taxCategory) return null;
                      const IconComponent = taxCategory.icon;
                      return (
                        <>
                          <div className={`w-10 h-10 ${taxCategory.color} rounded-lg flex items-center justify-center`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{taxCategory.name}</div>
                            <div className="flex items-center space-x-2">
                              <FolderIcon className="h-6 w-6 text-yellow-500" />
                              <h2 className="text-xl font-semibold text-gray-900">{selectedFolder}</h2>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                    <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents Found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery ? 'No documents match your search in this folder.' : 'This folder does not contain any signable documents (PDFs or images).'}
                    </p>
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

      {/* VMK Restoration Modal */}
      {showVMKPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Restore Vault Master Key
            </h3>
            <p className="text-gray-600 mb-4">
              Your VMK needs to be restored to sign documents. Please enter your passphrase.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passphrase
                </label>
                <input
                  type="password"
                  value={vmkPassphrase}
                  onChange={(e) => setVmkPassphrase(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && vmkPassphrase.trim()) {
                      handleRestoreVMK();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your passphrase"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRestoreVMK}
                  disabled={!vmkPassphrase.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Restore VMK
                </button>
                <button
                  onClick={() => {
                    setShowVMKPrompt(false);
                    setVmkPassphrase('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
