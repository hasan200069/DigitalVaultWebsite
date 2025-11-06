import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ShieldCheckIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  UserIcon,
  HomeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import UploadModal from '../components/UploadModal';
import SecureReveal from '../components/SecureReveal';
import FilePreview from '../components/FilePreview';
import { vaultApiService, type VaultItem } from '../services/vaultApi';
import { folderApiService, type Folder } from '../services/folderApi';
import { useCrypto } from '../utils/useCrypto';
import { cryptoService } from '../utils/cryptoService';

const VaultPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<VaultItem | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVMKPrompt, setShowVMKPrompt] = useState(false);
  const [vmkPassphrase, setVmkPassphrase] = useState('');
  const [vmkRestored, setVmkRestored] = useState(false);
  const [selectedFolderView, setSelectedFolderView] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    categories: {} as Record<string, number>
  });

  const { isVMKInitialized, downloadAndDecryptFile, isDecrypting, restoreVMK } = useCrypto();

  // Taxonomy Categories with icons - main categories that contain folders
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

  // Get all folders from taxonomy categories
  const documentCategories = taxonomyCategories.flatMap(cat => cat.folders);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folderViewMode, setFolderViewMode] = useState<'folders' | 'flat'>('folders');
  const [selectedTaxonomyCategory, setSelectedTaxonomyCategory] = useState<string | null>(null);
  const [userCreatedFolders, setUserCreatedFolders] = useState<Folder[]>([]);
  const [allUserFolders, setAllUserFolders] = useState<Folder[]>([]); // All folders across all taxonomies
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'documents', label: 'Documents' },
    { value: 'images', label: 'Images' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'archives', label: 'Archives' },
    { value: 'other', label: 'Other' }
  ];

  // Load vault items
  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await vaultApiService.listItems({
        category: selectedCategory || undefined,
        limit: 100
      });

      if (response.success && response.items) {
        setItems(response.items);
        
        // Calculate categories locally
        const categories = response.items.reduce((acc, item) => {
          const cat = item.category || 'other';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Load authoritative totals from backend stats
        try {
          const s = await vaultApiService.getStats();
          if (s.success) {
            setStats({ totalFiles: s.totalFiles, totalSize: s.totalBytes, categories });
          } else {
            setStats({ totalFiles: response.items.length, totalSize: 0, categories });
          }
        } catch {
          setStats({ totalFiles: response.items.length, totalSize: 0, categories });
        }
      } else {
        setError(response.message || 'Failed to load items');
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setError(error instanceof Error ? error.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  // Load items on component mount and when category changes
  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  // Load all user-created folders on component mount
  useEffect(() => {
    const loadAllFolders = async () => {
      try {
        const response = await folderApiService.listFolders(); // Get all folders
        if (response.success && response.folders) {
          setAllUserFolders(response.folders);
        }
      } catch (error) {
        console.error('Error loading all folders:', error);
      }
    };
    loadAllFolders();
  }, []); // Load once on mount

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

  // Listen for VMK state changes to update the component
  useEffect(() => {
    const handleVMKChange = () => {
      console.log('VaultPage: VMK state change event received');
      // Force a re-render by updating a dummy state or just log the current state
      const serviceInitialized = cryptoService.isVMKInitialized();
      const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
      console.log('VaultPage: Current VMK state after change:', {
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
      console.log('VaultPage: VMK needs to be restored, showing prompt');
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
        alert('VMK restored successfully!');
      } else {
        alert('Failed to restore VMK. Please check your passphrase.');
      }
    } catch (error) {
      console.error('VMK restoration error:', error);
      alert('Error restoring VMK. Please try again.');
    }
  };

  const handleUploadFiles = () => {
    if (!isVMKInitialized) {
      // Redirect to crypto demo with return URL
      window.location.href = '/dashboard/crypto-demo?return=' + encodeURIComponent('/dashboard/vault');
      return;
    }
    setIsUploadModalOpen(true);
  };

  const handleDownloadFile = async (item: VaultItem) => {
    // Check authentication first
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    console.log('Download Authentication Check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0
    });
    
    console.log('Item being downloaded:', {
      id: item.id,
      name: item.name,
      currentVersion: item.currentVersion,
      isEncrypted: item.isEncrypted,
      encryptionKeyId: item.encryptionKeyId
    });
    
    if (!accessToken) {
      console.log('No access token found, redirecting to login');
      window.location.href = '/login';
      return;
    }
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp <= now;
      
      console.log('Token expiration check:', {
        exp: payload.exp,
        now: now,
        isExpired: isExpired,
        timeUntilExpiry: payload.exp - now
      });
      
      if (isExpired) {
        console.log('Token is expired, redirecting to login');
        window.location.href = '/login';
        return;
      }
    } catch (error) {
      console.log('Error parsing token, redirecting to login:', error);
      window.location.href = '/login';
      return;
    }
    
    // Double-check VMK state with more detailed logging
    const serviceInitialized = cryptoService.isVMKInitialized();
    const localStorageInitialized = localStorage.getItem('vmkInitialized') === 'true';
    const hasStoredSalt = localStorage.getItem('vmkSalt') !== null;
    
    console.log('Download VMK Check:', {
      isVMKInitialized,
      serviceInitialized,
      localStorageInitialized,
      hasStoredSalt,
      vmkRestored
    });
    
    // If service is initialized, proceed with download regardless of hook state
    if (serviceInitialized && localStorageInitialized) {
      console.log('VMK is properly initialized, proceeding with download');
      
      try {
        console.log('Starting download for item:', item.id, 'version:', item.currentVersion);
        
        // Test API call first to check authentication
        console.log('Testing API authentication...');
        
        // Double-check tokens right before API call
        const preApiAccessToken = localStorage.getItem('accessToken');
        const preApiRefreshToken = localStorage.getItem('refreshToken');
        console.log('Pre-API call token check:', {
          hasAccessToken: !!preApiAccessToken,
          hasRefreshToken: !!preApiRefreshToken,
          accessTokenLength: preApiAccessToken?.length || 0
        });
        
        // First, test if the backend is reachable
        try {
          console.log('Testing backend connectivity...');
          const healthResponse = await fetch('http://localhost:3001/health');
          console.log('Backend health check:', {
            status: healthResponse.status,
            ok: healthResponse.ok
          });
        } catch (healthError) {
          console.error('Backend health check failed:', healthError);
        }
        
        // Test with a simpler API call first - list items instead of get specific item
        try {
          console.log('Testing list items API call...');
          const listResponse = await vaultApiService.listItems({ limit: 1 });
          console.log('List items API response:', listResponse);
        } catch (listError) {
          console.error('List items API failed:', listError);
        }
        
        console.log('Attempting to get specific item:', item.id);
        const testResponse = await vaultApiService.getItem(item.id);
        console.log('API test response:', testResponse);
        
        if (!testResponse.success) {
          console.log('API call failed:', testResponse.message);
          if (testResponse.message?.includes('Session expired') || testResponse.message?.includes('401')) {
            console.log('Authentication error detected - token appears valid on frontend but backend rejects it');
            console.log('This suggests the token was invalidated on the backend or there\'s a validation mismatch');
            console.log('Redirecting to login to get a fresh token...');
            window.location.href = '/login';
            return;
          }
          setError(testResponse.message || 'API call failed');
          return;
        }
        
        console.log('API authentication successful, proceeding with download');
        const fileData = await downloadAndDecryptFile(
          item.id,
          item.currentVersion,
          {
            isEncrypted: (item as any).isEncrypted,
            encryptionKeyId: (item as any).encryptionKeyId,
            mimeType: (item as any).mimeType
          }
        );
        console.log('Downloaded file data size:', fileData.byteLength);
        
        // Create blob and download
        const blob = new Blob([fileData], { type: item.mimeType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Download completed successfully');
      } catch (error) {
        console.error('Download failed:', error);
        setError(error instanceof Error ? error.message : 'Download failed');
      }
      return;
    } else if ((!isVMKInitialized && !vmkRestored) || !serviceInitialized) {
      // Check if we have a stored salt (meaning VMK was previously initialized)
      if (hasStoredSalt) {
        console.log('Redirecting to crypto demo to restore VMK');
        // Redirect to crypto demo to restore VMK
        window.location.href = '/dashboard/crypto-demo?return=' + encodeURIComponent('/dashboard/vault');
        return;
      } else {
        console.log('Redirecting to crypto demo to initialize VMK');
        // No stored salt, need to initialize VMK
        window.location.href = '/dashboard/crypto-demo?return=' + encodeURIComponent('/dashboard/vault');
        return;
      }
    }
  };

  const handleDeleteFile = async (item: VaultItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await vaultApiService.deleteItem(item.id);
      if (response.success) {
        // Reload items to reflect the deletion
        await loadItems();
      } else {
        setError(response.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setError(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleUploadComplete = () => {
    loadItems(); // Refresh the list
  };

  // Handle creating a new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedTaxonomyCategory) {
      setError('Please enter a folder name');
      return;
    }

    setIsCreatingFolder(true);
    setError(null);

    try {
      const response = await folderApiService.createFolder({
        taxonomyId: selectedTaxonomyCategory,
        name: newFolderName.trim()
      });

      if (response.success && response.folder) {
        // Reload folders for current taxonomy
        const foldersResponse = await folderApiService.listFolders(selectedTaxonomyCategory);
        if (foldersResponse.success && foldersResponse.folders) {
          setUserCreatedFolders(foldersResponse.folders);
        }
        // Reload all folders to update counts on taxonomy cards
        const allFoldersResponse = await folderApiService.listFolders();
        if (allFoldersResponse.success && allFoldersResponse.folders) {
          setAllUserFolders(allFoldersResponse.folders);
        }
        // Reset form
        setNewFolderName('');
        setIsCreateFolderModalOpen(false);
      } else {
        setError(response.message || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter items based on search query
    // This is a simple client-side search for now
  };


  const handleViewToggle = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  const handleDownload = async (item: VaultItem) => {
    try {
      const response = await vaultApiService.getDownloadUrl(item.id, item.currentVersion);
      if (response.success && response.downloadUrl) {
        // Download the file
        const encryptedData = await vaultApiService.downloadFile(response.downloadUrl);
        // TODO: Decrypt the file using crypto service
        console.log('Downloaded encrypted file:', encryptedData);
        alert('File downloaded (decryption not implemented yet)');
      } else {
        alert('Failed to get download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  const handleDelete = async (item: VaultItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      // TODO: Implement delete functionality
      console.log('Delete item:', item.id);
      alert('Delete functionality not implemented yet');
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  // Open folder view in modal/grid
  const openFolderView = (folderName: string) => {
    setSelectedFolderView(folderName);
  };

  // Close folder view
  const closeFolderView = () => {
    setSelectedFolderView(null);
  };

  // Get all folder names (default + all user-created folders)
  const allFolderNames = [
    ...documentCategories,
    ...allUserFolders.map(f => f.name)
  ];

  // Group items by category/folder
  const itemsByFolder = allFolderNames.reduce((acc, category) => {
    acc[category] = items.filter(item => 
      item.category?.toLowerCase() === category.toLowerCase()
    );
    return acc;
  }, {} as Record<string, VaultItem[]>);

  // Get items not in any category
  const uncategorizedItems = items.filter(item => 
    !allFolderNames.some(cat => item.category?.toLowerCase() === cat.toLowerCase())
  );

  // Filter items based on search, folder selection, and category
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  ).filter(item => {
    // Filter by selected folder if any
    if (selectedFolder) {
      return item.category?.toLowerCase() === selectedFolder.toLowerCase();
    }
    return true;
  }).filter(item => {
    // Filter by category dropdown if any
    if (selectedCategory) {
      // Map category values to folder names
      const categoryMap: Record<string, string> = {
        'documents': 'Documents',
        'images': 'Images',
        'videos': 'Videos',
        'audio': 'Audio',
        'archives': 'Archives',
        'other': 'Other'
      };
      return item.category?.toLowerCase().includes(selectedCategory);
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Vault
              </h1>
              <p className="mt-1 text-base text-gray-600">
                Manage and organize your digital assets securely.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button 
                onClick={handleUploadFiles}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Files
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      placeholder="Search files and folders..."
                    />
                  </div>
                </form>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFolderViewMode(prev => prev === 'folders' ? 'flat' : 'folders')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <FolderIcon className="h-4 w-4 mr-2" />
                    {folderViewMode === 'folders' ? 'Flat' : 'Folders'}
                  </button>
                  <button 
                    onClick={handleViewToggle}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <ViewColumnsIcon className="h-4 w-4 mr-2" />
                    {viewMode === 'grid' ? 'List' : 'Grid'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Shown FIRST when in folder mode */}
        {folderViewMode === 'folders' && !isLoading && !error && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Files</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalFiles}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Encrypted Files</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {items.filter(item => item.isEncrypted).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Storage Used</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {vaultApiService.formatFileSize(stats.totalSize)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Grid/List Area */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="text-center py-16 px-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading vault items...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-6">
              <div className="mx-auto h-20 w-20 text-red-300 mb-4">
                <DocumentTextIcon className="h-full w-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading items</h3>
              <p className="text-gray-500 mb-6">{error}</p>
              {error.includes('VMK not initialized') ? (
                <button 
                  onClick={() => window.location.href = '/dashboard/crypto-demo?return=' + encodeURIComponent('/dashboard/vault')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Initialize VMK
                </button>
              ) : (
                <button 
                  onClick={loadItems}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="mx-auto h-20 w-20 text-gray-300 mb-4">
                <DocumentTextIcon className="h-full w-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {items.length === 0 ? 'No files uploaded' : 'No files found'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {items.length === 0 
                  ? 'Get started by uploading your first document to the vault. Your files will be encrypted and stored securely.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
              {items.length === 0 && (
                <button 
                  onClick={handleUploadFiles}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Upload Files
                </button>
              )}
            </div>
          ) : folderViewMode === 'folders' ? (
            <div className="p-6">
              {selectedTaxonomyCategory === null ? (
                // Show Taxonomy Categories
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Categories</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {taxonomyCategories.map((taxCategory) => {
                      // Get user-created folders for this taxonomy
                      const userFoldersForTaxonomy = allUserFolders.filter(f => f.taxonomyId === taxCategory.id);
                      const totalFolderCount = taxCategory.folders.length + userFoldersForTaxonomy.length;
                      
                      // Calculate total items and size for this category (including user-created folders)
                      const defaultFolderItems = taxCategory.folders.flatMap(folder => itemsByFolder[folder] || []);
                      const userFolderNames = userFoldersForTaxonomy.map(f => f.name);
                      const userFolderItems = userFolderNames.flatMap(folder => itemsByFolder[folder] || []);
                      const categoryItems = [...defaultFolderItems, ...userFolderItems];
                      const itemCount = categoryItems.length;
                      const totalSize = categoryItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);
                      const IconComponent = taxCategory.icon;
                      
                      return (
                        <div 
                          key={taxCategory.id} 
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer relative group"
                          onClick={() => setSelectedTaxonomyCategory(taxCategory.id)}
                        >
                          {/* Category Icon with colored background */}
                          <div className="flex items-center justify-between mb-4">
                            <div className={`w-14 h-14 ${taxCategory.color} rounded-xl flex items-center justify-center`}>
                              <IconComponent className="h-8 w-8" />
                            </div>
                            <button
                              className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle category menu
                              }}
                            >
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                          </div>
                          
                          {/* Category Name */}
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            {taxCategory.name}
                          </h3>
                          
                          {/* Category Info */}
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              {totalFolderCount} {totalFolderCount === 1 ? 'folder' : 'folders'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </p>
                            {totalSize > 0 && (
                              <p className="text-sm text-gray-500">
                                {vaultApiService.formatFileSize(totalSize)}
                              </p>
                            )}
                          </div>
                          
                          {/* Chevron indicator */}
                          <div className="mt-3 flex items-center text-sm text-gray-400">
                            <span>View folders</span>
                            <ChevronRightIcon className="h-4 w-4 ml-1" />
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Uncategorized items card */}
                    {uncategorizedItems.length > 0 && (
                      <div 
                        className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer relative group"
                        onClick={() => openFolderView('Uncategorized')}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                            <FolderIcon className="h-8 w-8 text-gray-600" />
                          </div>
                          <button
                            className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle folder menu
                            }}
                          >
                            <EllipsisVerticalIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Uncategorized
                        </h3>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">
                            {uncategorizedItems.length} {uncategorizedItems.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
                  
                  <div className="mb-4 flex items-center justify-between">
                    <div></div>
                    <button
                      onClick={() => setIsCreateFolderModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Folder
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const taxCategory = taxonomyCategories.find(c => c.id === selectedTaxonomyCategory);
                      if (!taxCategory) return null;
                      
                      // Combine default folders with user-created folders
                      const defaultFolders = taxCategory.folders;
                      const userFolderNames = userCreatedFolders.map(f => f.name);
                      const allFolders = [...defaultFolders, ...userFolderNames];
                      
                      return allFolders.map((folder) => {
                        const folderItems = itemsByFolder[folder] || [];
                        const itemCount = folderItems.length;
                        const totalSize = folderItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);
                        const isUserCreated = userCreatedFolders.some(f => f.name === folder);
                        
                        return (
                          <div 
                            key={folder} 
                            className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                            onClick={() => openFolderView(folder)}
                          >
                            {/* Folder Icon - Yellow */}
                            <div className="flex items-center justify-between mb-4">
                              <FolderIcon className="h-12 w-12 text-yellow-500" />
                              <button
                                className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle folder menu
                                }}
                              >
                                <EllipsisVerticalIcon className="h-5 w-5" />
                              </button>
                            </div>
                            
                            {/* Folder Name */}
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
                            
                            {/* Folder Info */}
                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                              </p>
                              {totalSize > 0 && (
                                <p className="text-sm text-gray-500">
                                  {vaultApiService.formatFileSize(totalSize)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setPreviewFile(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{vaultApiService.getFileIcon(item.mimeType || '')}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                          {item.category && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${vaultApiService.getCategoryColor(item.category)}`}>
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(item);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Download"
                          disabled={isDecrypting}
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(item);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <span>Size:</span>
                        <span>{vaultApiService.formatFileSize(item.fileSize || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Version:</span>
                        <span>v{item.currentVersion}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Modified:</span>
                        <span>{formatDate(item.updatedAt)}</span>
                      </div>
                      {item.isEncrypted && (
                        <div className="flex items-center justify-center pt-2">
                          <ShieldCheckIcon className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-green-600 font-medium">Encrypted</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">ID:</span>
                          <SecureReveal 
                            value={item.id} 
                            maxLength={8}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">{vaultApiService.getFileIcon(item.mimeType || '')}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.category && (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${vaultApiService.getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vaultApiService.formatFileSize(item.fileSize || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.isEncrypted ? (
                          <div className="flex items-center">
                            <ShieldCheckIcon className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm text-green-600 font-medium">Encrypted</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Unencrypted</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadFile(item);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Download"
                            disabled={isDecrypting}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(item);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Folder View Modal */}
      {selectedFolderView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {(() => {
                  // Find which taxonomy category contains this folder
                  const taxCategory = taxonomyCategories.find(cat => 
                    cat.folders.some(f => f === selectedFolderView)
                  );
                  
                  if (taxCategory && selectedFolderView !== 'Uncategorized') {
                    const IconComponent = taxCategory.icon;
                    return (
                      <>
                        <div className={`w-10 h-10 ${taxCategory.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500 mb-1">{taxCategory.name}</div>
                          <div className="flex items-center space-x-2">
                            <FolderIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                            <h2 className="text-2xl font-bold text-gray-900 truncate">{selectedFolderView}</h2>
                          </div>
                        </div>
                      </>
                    );
                  }
                  
                  return (
                    <>
                      <FolderIcon className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                      <h2 className="text-2xl font-bold text-gray-900 truncate">{selectedFolderView}</h2>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={closeFolderView}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-4 flex-shrink-0"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedFolderView === 'Uncategorized' ? (
                uncategorizedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {uncategorizedItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setPreviewFile(item);
                          closeFolderView();
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">{vaultApiService.getFileIcon(item.mimeType || '')}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{vaultApiService.formatFileSize(item.fileSize || 0)}</p>
                        <p className="text-xs text-gray-400">{formatDate(item.updatedAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">This folder is empty</p>
                  </div>
                )
              ) : (
                itemsByFolder[selectedFolderView] && itemsByFolder[selectedFolderView].length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {itemsByFolder[selectedFolderView].map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setPreviewFile(item);
                          closeFolderView();
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">{vaultApiService.getFileIcon(item.mimeType || '')}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{vaultApiService.formatFileSize(item.fileSize || 0)}</p>
                        <p className="text-xs text-gray-400">{formatDate(item.updatedAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">This folder is empty</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Folder
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedTaxonomyCategory && (
                <>Create a new folder in <strong>{taxonomyCategories.find(c => c.id === selectedTaxonomyCategory)?.name}</strong></>
              )}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isCreatingFolder) {
                      handleCreateFolder();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter folder name"
                  disabled={isCreatingFolder}
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || isCreatingFolder}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
                <button
                  onClick={() => {
                    setIsCreateFolderModalOpen(false);
                    setNewFolderName('');
                    setError(null);
                  }}
                  disabled={isCreatingFolder}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VMK Restoration Modal */}
      {showVMKPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Restore Vault Master Key
            </h3>
            <p className="text-gray-600 mb-4">
              Your VMK needs to be restored to access encrypted files. Please enter your passphrase.
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your passkey"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRestoreVMK}
                  disabled={!vmkPassphrase.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
    </div>
  );
};

export default VaultPage;
