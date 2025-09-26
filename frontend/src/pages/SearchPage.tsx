import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon,
  FolderIcon,
  ClockIcon,
  TagIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const SearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const filterOptions = [
    { id: 'documents', label: 'Documents', icon: DocumentTextIcon },
    { id: 'folders', label: 'Folders', icon: FolderIcon },
    { id: 'recent', label: 'Recent', icon: ClockIcon },
    { id: 'tagged', label: 'Tagged', icon: TagIcon },
  ];

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedFilters([]);
    console.log('All filters cleared');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    console.log('Search cleared');
  };

  const handleUploadFiles = () => {
    // In a real app, this would navigate to vault or open upload modal
    console.log('Upload files clicked');
    alert('File upload dialog would open here');
  };

  const handleRemoveRecentSearch = (searchTerm: string) => {
    console.log('Removing recent search:', searchTerm);
    // In a real app, this would remove from recent searches
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Search
            </h1>
            <p className="mt-1 text-base text-gray-600">
              Find and discover your digital assets quickly and efficiently.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg transition-colors duration-200"
                  placeholder="Search your vault..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Filters</h3>
              <button 
                onClick={handleClearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Clear all
              </button>
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

          {/* Search Results Area */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {searchQuery ? (
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                    <MagnifyingGlassIcon className="h-full w-full" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-4">
                    No files match your search for "{searchQuery}". Try different keywords or check your filters.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={handleClearSearch}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Clear Search
                    </button>
                    <button 
                      onClick={handleUploadFiles}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Upload Files
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                    <MagnifyingGlassIcon className="h-full w-full" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Start searching</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Enter keywords to search through your digital assets. You can search by filename, content, tags, or metadata.
                  </p>
                  
                  {/* Search Tips */}
                  <div className="max-w-2xl mx-auto">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Search Tips:</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Use quotes for exact phrases: "contract agreement"
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        Search by file type: type:pdf
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                        Filter by date: created:2024
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                        Search tags: tag:important
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Searches */}
          {!searchQuery && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Searches</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">contract documents</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveRecentSearch('contract documents')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-700">financial records</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveRecentSearch('financial records')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
