import React from 'react';
import { ArchiveBoxIcon, CheckIcon, ShieldCheckIcon, FolderIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const PackagesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <ArchiveBoxIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Package Tiers Available</h1>
              <p className="mt-1 text-sm text-gray-600">Choose the vault package that best fits your needs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="mb-12 text-center">
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            FutureVault offered different vault packages with varying capabilities to meet the diverse needs of private clients, firms, and enterprises.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Essential Vault Package */}
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow p-8">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <FolderIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Essential Vault Package</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Offered <strong>1GB of storage space</strong></span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Provided access to <strong>six standard folders</strong> for storing and sharing essential banking and financial files
                </span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  All files and folders accessible by the organization's staff <strong>(limited to advisory team)</strong>
                </span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">More limited entity options</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                Choose Essential
              </button>
            </div>
          </div>

          {/* Premium Vault Package */}
          <div className="bg-white rounded-xl border-2 border-purple-300 shadow-lg hover:shadow-xl transition-shadow p-8 relative">
            <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            
            <div className="flex items-center mb-6">
              <div className="bg-purple-100 rounded-lg p-3 mr-4">
                <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Premium Vault Package</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Provided <strong>25GB of digital storage space</strong></span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Included a <strong>private, premium digital space</strong> accessible only to the vault owner
                </span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Enabled access to <strong>open folder taxonomy</strong> where users could create, delete, or modify folders and save documents at any level
                </span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">More entities available for organization</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Choose Premium
              </button>
            </div>
          </div>

          {/* Independent Vault */}
          <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg hover:shadow-xl transition-shadow p-8">
            <div className="flex items-center mb-6">
              <div className="bg-gray-100 rounded-lg p-3 mr-4">
                <LockClosedIcon className="h-8 w-8 text-gray-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Independent Vault</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Full autonomous control</strong></span>
              </div>
              
              <div className="flex items-start">
                <CheckIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Maximum flexibility</strong> in folder structure</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-semibold">
                Choose Independent
              </button>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Package Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Essential
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Independent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Storage Space</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">1GB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">25GB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Folder Access</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">6 Standard Folders</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Open Folder Taxonomy</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Full Customization</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Privacy</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Organization Access</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Private Premium Space</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Full Autonomy</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Entity Options</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Limited</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">More Available</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Maximum</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Control Level</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Shared</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Owner + Organization</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">Full Autonomous</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackagesPage;
