import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  FolderIcon,
  ClockIcon,
  TagIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import ItemCard from '../components/ItemCard';
import * as SearchAPI from '../services/searchApi';
import { useCrypto } from '../utils/useCrypto';

type SearchResult = SearchAPI.SearchResult;
type SearchFilters = SearchAPI.SearchFilters;
type VaultItem = SearchAPI.VaultItem;
const searchApiService = SearchAPI.searchApiService;

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Get crypto utilities for decryption
  const { downloadAndDecryptFile } = useCrypto();
  
  // Advanced filters
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at' | 'file_size'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Available options
  const [categories, setCategories] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);

  const resultsPerPage = 20;

  // Load available options on component mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cats, tags] = await Promise.all([
          searchApiService.getCategories(),
          searchApiService.getPopularTags()
        ]);
        setCategories(cats);
        setPopularTags(tags);
      } catch (error) {
        console.error('Failed to load search options:', error);
      }
    };
    loadOptions();
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, currentFilters: SearchFilters, sortBy: string, sortOrder: string, offset: number) => {
      if (!query.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchApiService.searchItems({
          query: query.trim(),
          filters: currentFilters,
          limit: resultsPerPage,
          offset,
          sortBy: sortBy as any,
          sortOrder: sortOrder as any
        });

        setSearchResults(response.results);
        setTotalResults(response.total);
        setSearchTime(response.took || null);
        setHasSearched(true);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Trigger search when query or filters change
  useEffect(() => {
    setCurrentPage(0);
    debouncedSearch(searchQuery, filters, sortBy, sortOrder, 0);
  }, [searchQuery, filters, sortBy, sortOrder, debouncedSearch]);

  const handleSearch = async (page: number = 0) => {
    const offset = page * resultsPerPage;
    setCurrentPage(page);
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchApiService.searchItems({
        query: searchQuery.trim(),
        filters,
        limit: resultsPerPage,
        offset,
        sortBy,
        sortOrder
      });

      setSearchResults(response.results);
      setTotalResults(response.total);
      setSearchTime(response.took || null);
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setError(null);
    setCurrentPage(0);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedFilters([]);
  };

  const handleDownload = async (item: VaultItem) => {
    try {
      // Download and decrypt the file using the same approach as vault page
      const fileData = await downloadAndDecryptFile(
        item.id,
        item.currentVersion,
        {
          isEncrypted: item.isEncrypted,
          encryptionKeyId: item.encryptionKeyId,
          mimeType: item.mimeType
        }
      );
      
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
      alert('Download failed. Please try again.');
    }
  };

  const handleView = (item: VaultItem) => {
    // The ItemCard component will handle opening the SecureViewer
    console.log('Viewing item:', item.name);
  };

  // Filter options for quick selection
  const filterOptions = [
    { id: 'documents', label: 'Documents', icon: DocumentTextIcon, filter: { mimeType: 'application/pdf' } },
    { id: 'images', label: 'Images', icon: FolderIcon, filter: { mimeType: 'image' } },
    { id: 'recent', label: 'Recent', icon: ClockIcon, filter: { dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] } },
    { id: 'encrypted', label: 'Encrypted', icon: TagIcon, filter: { isEncrypted: true } },
  ];

  const selectedFilters = Object.keys(filters).filter(key => filters[key as keyof SearchFilters] !== undefined);

  const toggleFilter = (filterId: string) => {
    const filterOption = filterOptions.find(f => f.id === filterId);
    if (filterOption) {
      setFilters(prev => ({
        ...prev,
        ...filterOption.filter
      }));
    }
  };

  const handleUploadFiles = () => {
    // Navigate to vault page for file upload
    window.location.href = '/dashboard/vault';
  };

  const totalPages = Math.ceil(totalResults / resultsPerPage);

  // Debounce utility function
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center">
                <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
                Search
              </h1>
              <p className="mt-1 text-base text-gray-600">
                Find and discover your digital assets quickly and efficiently.
              </p>
            </div>
            
            {hasSearched && totalResults > 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
                  {searchTime && (
                    <span className="ml-2">
                      in {searchTime}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {isLoading ? (
                    <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors duration-200"
                  placeholder="Search your vault... (try: type:pdf, tag:important, size:>1MB)"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`p-1 rounded transition-colors ${
                      showAdvancedFilters 
                        ? 'text-blue-600 bg-blue-50' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FunnelIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Advanced Filters */}
              {showAdvancedFilters && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category || ''}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          category: e.target.value || undefined 
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="created_at">Date Created</option>
                        <option value="updated_at">Date Modified</option>
                        <option value="name">Name</option>
                        <option value="file_size">File Size</option>
                      </select>
                    </div>
                    
                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order
                      </label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleClearFilters}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Quick Filters</h3>
              <div className="text-sm text-gray-500">
                {selectedFilters.length > 0 && `${selectedFilters.length} filter${selectedFilters.length !== 1 ? 's' : ''} applied`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => {
                const Icon = filter.icon;
                const isSelected = selectedFilters.includes(filter.id);
                return (
                  <button
                    key={filter.id}
                    onClick={() => toggleFilter(filter.id)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="text-center">
                  <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Searching your vault...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Error</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={() => handleSearch(currentPage)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && hasSearched && searchResults.length > 0 && (
              <>
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <ItemCard
                      key={result.item.id}
                      result={result}
                      onDownload={handleDownload}
                      onView={handleView}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {currentPage * resultsPerPage + 1} to{' '}
                        {Math.min((currentPage + 1) * resultsPerPage, totalResults)} of{' '}
                        {totalResults.toLocaleString()} results
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSearch(currentPage - 1)}
                          disabled={currentPage === 0}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handleSearch(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  pageNum === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum + 1}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => handleSearch(currentPage + 1)}
                          disabled={currentPage >= totalPages - 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No Results */}
            {!isLoading && !error && hasSearched && searchResults.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="text-center">
                  <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    No files match your search for "{searchQuery}". Try different keywords or check your filters.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleClearSearch}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Clear Search
                    </button>
                    <button
                      onClick={handleUploadFiles}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Upload Files
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Initial State */}
            {!hasSearched && !isLoading && !error && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="text-center">
                  <SparklesIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Start searching</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Enter keywords to search through your digital assets. You can search by filename, content, tags, or metadata.
                  </p>
                  
                  {/* Search Tips */}
                  <div className="max-w-2xl mx-auto">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Search Tips:</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        File type: <code className="bg-gray-100 px-1 rounded">type:pdf</code>
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        Category: <code className="bg-gray-100 px-1 rounded">cat:documents</code>
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                        Date range: <code className="bg-gray-100 px-1 rounded">date:2024-01-01..2024-12-31</code>
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                        File size: <code className="bg-gray-100 px-1 rounded">size:{'>'}1MB</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
