import React, { useState, useEffect } from 'react';
import { 
  DocumentDuplicateIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  TagIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  EyeIcon,
  TrashIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  BriefcaseIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  BuildingLibraryIcon,
  ScaleIcon,
  ChartBarIcon,
  PhoneIcon,
  TruckIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { vaultApiService, type VaultItem } from '../services/vaultApi';
import { folderApiService, type Folder } from '../services/folderApi';

interface ContractMetadata {
  id: string;
  vaultItemId: string;
  contractName: string;
  contractType: string;
  parties: string[];
  startDate: string;
  expiryDate: string;
  value?: number;
  currency?: string;
  autoRenewal: boolean;
  status: 'active' | 'expiring_soon' | 'expired' | 'terminated' | 'draft';
  signedDocumentId?: string;
  tags: string[];
  notes?: string;
  category?: string; // Folder/category for organization
}

const ContractsPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractMetadata[]>([]);
  const [allContracts, setAllContracts] = useState<ContractMetadata[]>([]); // All contracts for filtering
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showContractForm, setShowContractForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractMetadata | null>(null);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);

  // Folder navigation state
  const [selectedTaxonomyCategory, setSelectedTaxonomyCategory] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [userCreatedFolders, setUserCreatedFolders] = useState<Folder[]>([]);
  const [allUserFolders, setAllUserFolders] = useState<Folder[]>([]);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract Taxonomy Categories
  interface TaxonomyCategory {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    folders: string[];
  }

  const taxonomyCategories: TaxonomyCategory[] = [
    {
      id: 'real-estate',
      name: 'Real Estate Contracts',
      icon: HomeIcon,
      color: 'text-purple-600 bg-purple-100',
      folders: []
    },
    {
      id: 'corporate',
      name: 'Corporate Contracts',
      icon: BriefcaseIcon,
      color: 'text-orange-600 bg-orange-100',
      folders: ['Supply Contracts']
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: BanknotesIcon,
      color: 'text-green-600 bg-green-100',
      folders: []
    },
    {
      id: 'manufacturing',
      name: 'Manufacturing',
      icon: WrenchScrewdriverIcon,
      color: 'text-blue-600 bg-blue-100',
      folders: []
    },
    {
      id: 'banks',
      name: 'Banks',
      icon: BuildingLibraryIcon,
      color: 'text-indigo-600 bg-indigo-100',
      folders: []
    },
    {
      id: 'advisory',
      name: 'Advisory Contracts',
      icon: ChartBarIcon,
      color: 'text-cyan-600 bg-cyan-100',
      folders: []
    },
    {
      id: 'construction',
      name: 'Construction Contract',
      icon: BuildingOfficeIcon,
      color: 'text-yellow-600 bg-yellow-100',
      folders: []
    },
    {
      id: 'legal',
      name: 'Legal Contracts',
      icon: ScaleIcon,
      color: 'text-red-600 bg-red-100',
      folders: []
    },
    {
      id: 'financial-managers',
      name: 'Financial Managers',
      icon: CurrencyDollarIcon,
      color: 'text-emerald-600 bg-emerald-100',
      folders: []
    },
    {
      id: 'wealth-managers',
      name: 'Wealth Managers',
      icon: CurrencyDollarIcon,
      color: 'text-teal-600 bg-teal-100',
      folders: []
    },
    {
      id: 'telecommunication',
      name: 'Telecommunication',
      icon: PhoneIcon,
      color: 'text-pink-600 bg-pink-100',
      folders: []
    },
    {
      id: 'car-dealership',
      name: 'Car Dealership',
      icon: TruckIcon,
      color: 'text-gray-600 bg-gray-100',
      folders: []
    },
    {
      id: 'procurement',
      name: 'Procurement',
      icon: ShoppingCartIcon,
      color: 'text-amber-600 bg-amber-100',
      folders: []
    },
    {
      id: 'general',
      name: 'General Contracts',
      icon: DocumentTextIcon,
      color: 'text-slate-600 bg-slate-100',
      folders: []
    }
  ];

  useEffect(() => {
    loadContracts();
    loadVaultItems();
    loadAllFolders();
  }, []);

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

  const loadVaultItems = async () => {
    try {
      const response = await vaultApiService.listItems({ limit: 100 });
      if (response.success && response.items) {
        setVaultItems(response.items);
      }
    } catch (error) {
      console.error('Error loading vault items:', error);
    }
  };

  const loadContracts = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('contracts');
    if (saved) {
      try {
        const parsedContracts = JSON.parse(saved);
        setAllContracts(parsedContracts);
        applyFolderFilter(parsedContracts);
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    }
    setLoading(false);
  };

  // Apply folder filter to contracts
  const applyFolderFilter = (contractsList: ContractMetadata[]) => {
    if (selectedFolder) {
      // Filter contracts by selected folder (category)
      const filtered = contractsList.filter(contract => 
        contract.category?.toLowerCase() === selectedFolder.toLowerCase()
      );
      setContracts(filtered);
    } else if (selectedTaxonomyCategory) {
      // Show all contracts in taxonomy (no folder selected yet)
      setContracts(contractsList);
    } else {
      // Show all contracts
      setContracts(contractsList);
    }
  };

  // Update contracts when folder selection changes
  useEffect(() => {
    if (allContracts.length > 0) {
      applyFolderFilter(allContracts);
    }
  }, [selectedFolder, selectedTaxonomyCategory]);

  const saveContracts = (updatedContracts: ContractMetadata[]) => {
    setAllContracts(updatedContracts);
    applyFolderFilter(updatedContracts);
    localStorage.setItem('contracts', JSON.stringify(updatedContracts));
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
        // Reload folders
        const foldersResponse = await folderApiService.listFolders(selectedTaxonomyCategory);
        if (foldersResponse.success && foldersResponse.folders) {
          setUserCreatedFolders(foldersResponse.folders);
        }
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

  const getContractStatus = (contract: ContractMetadata): 'active' | 'expiring_soon' | 'expired' | 'terminated' | 'draft' => {
    if (contract.status === 'terminated' || contract.status === 'draft') {
      return contract.status;
    }
    
    const today = new Date();
    const expiry = new Date(contract.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return 'expired';
    } else if (daysUntilExpiry <= 30) {
      return 'expiring_soon';
    } else {
      return 'active';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'terminated':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'expiring_soon':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'expired':
        return <XCircleIcon className="h-5 w-5" />;
      case 'terminated':
        return <XCircleIcon className="h-5 w-5" />;
      case 'draft':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.contractName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.contractType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.parties.some(party => party.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const status = getContractStatus(contract);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const expiringSoon = allContracts.filter(c => {
    const status = getContractStatus(c);
    return status === 'expiring_soon';
  });

  const expiredContracts = allContracts.filter(c => {
    const status = getContractStatus(c);
    return status === 'expired';
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DocumentDuplicateIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Contract Management</h1>
                <p className="mt-1 text-sm text-gray-600">Track, manage, and organize your contracts and legal documents</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('https://contractbook.com/templates', '_blank')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <LinkIcon className="h-5 w-5" />
                <span>Contract Templates</span>
              </button>
            <button
              onClick={() => setShowContractForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Contract</span>
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {showExpiringAlert && (expiringSoon.length > 0 || expiredContracts.length > 0) && (
          <div className="mb-6 space-y-3">
            {expiringSoon.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-900">{expiringSoon.length} contract{expiringSoon.length > 1 ? 's' : ''} expiring soon</p>
                    <p className="text-sm text-yellow-700">Review contracts expiring in the next 30 days</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpiringAlert(false)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            {expiredContracts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">{expiredContracts.length} expired contract{expiredContracts.length > 1 ? 's' : ''}</p>
                    <p className="text-sm text-red-700">Action required for expired contracts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpiringAlert(false)}
                  className="text-red-600 hover:text-red-800"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Contracts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{allContracts.length}</p>
              </div>
              <DocumentDuplicateIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {allContracts.filter(c => getContractStatus(c) === 'active').length}
                </p>
              </div>
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{expiringSoon.length}</p>
              </div>
              <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{expiredContracts.length}</p>
              </div>
              <XCircleIcon className="h-10 w-10 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* Folder Navigation or Contracts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading contracts...</p>
          </div>
        ) : selectedTaxonomyCategory === null ? (
          // Show Taxonomy Categories
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Contract Categories</h2>
              <p className="text-sm text-gray-600">Select a category to view and organize your contracts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {taxonomyCategories.map((taxCategory) => {
                const IconComponent = taxCategory.icon;
                const userFoldersForTaxonomy = allUserFolders.filter(f => f.taxonomyId === taxCategory.id);
                const totalFolderCount = taxCategory.folders.length + userFoldersForTaxonomy.length;
                
                // Count contracts in this taxonomy
                const taxonomyContracts = allContracts.filter(contract => {
                  const contractCategory = contract.category?.toLowerCase() || '';
                  return taxCategory.folders.some(f => f.toLowerCase() === contractCategory) ||
                         userFoldersForTaxonomy.some(f => f.name.toLowerCase() === contractCategory);
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
                        {taxonomyContracts.length} {taxonomyContracts.length === 1 ? 'contract' : 'contracts'}
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
                
                const defaultFolders = taxCategory.folders;
                const userFolderNames = userCreatedFolders.map(f => f.name);
                const allFolders = [...defaultFolders, ...userFolderNames];
                
                if (allFolders.length === 0) {
                  return (
                    <div className="col-span-full bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                      <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Folders Yet</h3>
                      <p className="text-gray-600 mb-6">
                        Start managing your contracts by adding your first contract from your vault documents.
                      </p>
                      <button
                        onClick={() => setShowContractForm(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Contract
                      </button>
                    </div>
                  );
                }
                
                return allFolders.map((folder) => {
                  const folderContracts = allContracts.filter(contract => 
                    contract.category?.toLowerCase() === folder.toLowerCase()
                  );
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
                          {folderContracts.length} {folderContracts.length === 1 ? 'contract' : 'contracts'}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          // Show Contracts in Selected Folder
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

            {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <DocumentDuplicateIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {contracts.length === 0 ? 'No Contracts Yet' : 'No Contracts Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {contracts.length === 0 
                ? 'Start managing your contracts by adding your first contract from your vault documents.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {contracts.length === 0 && (
              <button
                onClick={() => setShowContractForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Contract
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredContracts.map((contract) => {
              const status = getContractStatus(contract);
              const daysUntilExpiry = getDaysUntilExpiry(contract.expiryDate);
              const vaultItem = vaultItems.find(item => item.id === contract.vaultItemId);
              
              return (
                <div
                  key={contract.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <DocumentDuplicateIcon className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{contract.contractName}</h3>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1">{status.replace('_', ' ').toUpperCase()}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <TagIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">Type:</span>
                      <span className="ml-2">{contract.contractType}</span>
                    </div>
                    
                    {contract.parties.length > 0 && (
                      <div className="flex items-start text-sm text-gray-600">
                        <UserGroupIcon className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium">Parties:</span>
                          <span className="ml-2">{contract.parties.join(', ')}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="font-medium">Expires:</span>
                      <span className={`ml-2 ${status === 'expired' ? 'text-red-600 font-semibold' : status === 'expiring_soon' ? 'text-yellow-600 font-semibold' : ''}`}>
                        {formatDate(contract.expiryDate)}
                        {status !== 'expired' && status !== 'terminated' && (
                          <span className="ml-2">
                            ({daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Today'})
                          </span>
                        )}
                      </span>
                    </div>

                    {contract.value && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">Value:</span>
                        <span className="ml-2">
                          {contract.currency || '$'}{contract.value.toLocaleString()}
                        </span>
                        {contract.autoRenewal && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Auto-renewal
                          </span>
                        )}
                      </div>
                    )}

                    {vaultItem && (
                      <div className="flex items-center text-sm text-gray-600">
                        <DocumentDuplicateIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">Document:</span>
                        <span className="ml-2 truncate">{vaultItem.name}</span>
                      </div>
                    )}
                  </div>

                  {contract.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {contract.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => window.location.href = '/dashboard/esignature'}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center space-x-1"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      <span>Sign</span>
                    </button>
                    <button
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="View"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
        )}
      </div>

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
    </div>
  );
};

export default ContractsPage;
