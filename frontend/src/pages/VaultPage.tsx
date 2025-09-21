import React, { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  FolderIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';

const VaultPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleUploadFiles = () => {
    // In a real app, this would open a file upload dialog
    console.log('Upload files clicked');
    alert('File upload dialog would open here');
  };

  const handleCreateFolder = () => {
    // In a real app, this would open a create folder dialog
    console.log('Create folder clicked');
    alert('Create folder dialog would open here');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // In a real app, this would trigger a search
  };

  const handleFilter = () => {
    console.log('Filter clicked');
    // In a real app, this would open filter options
  };

  const handleViewToggle = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    console.log('View mode changed to:', viewMode === 'grid' ? 'list' : 'grid');
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
                <button 
                  onClick={handleFilter}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filter
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

        {/* File Grid/List Area */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Empty State */}
          <div className="text-center py-16 px-6">
            <div className="mx-auto h-20 w-20 text-gray-300 mb-4">
              <DocumentTextIcon className="h-full w-full" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No files uploaded</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Get started by uploading your first document to the vault. Your files will be encrypted and stored securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={handleUploadFiles}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                Upload Files
              </button>
              <button 
                onClick={handleCreateFolder}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <FolderIcon className="h-5 w-5 mr-2" />
                Create Folder
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Files</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FolderIcon className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Folders</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Storage Used</p>
                  <p className="text-2xl font-bold text-gray-900">0 MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultPage;
