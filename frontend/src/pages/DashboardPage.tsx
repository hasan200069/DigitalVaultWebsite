import React from 'react';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ServerIcon, 
  ClockIcon,
  CloudArrowUpIcon,
  UserPlusIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Welcome back, John
            </h1>
            <p className="mt-1 text-base text-gray-600 max-w-2xl mx-auto lg:mx-0">
              Here's an overview of your digital vault and recent activity.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Overview</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Files Card */}
              <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-500">Total Files</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiaries Card */}
              <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <UserGroupIcon className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-500">Beneficiaries</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Used Card */}
              <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <ServerIcon className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-500">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">0 MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Upload Files Action */}
              <button className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                      <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                      Upload Files
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add new documents to your secure vault with end-to-end encryption.
                    </p>
                  </div>
                </div>
              </button>

              {/* Add Beneficiary Action */}
              <button className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                      <UserPlusIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-700 transition-colors duration-200">
                      Add Beneficiary
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Set up inheritance plans and designate beneficiaries for your digital assets.
                    </p>
                  </div>
                </div>
              </button>

              {/* View Reports Action */}
              <button className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:col-span-2 lg:col-span-1">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
                      <DocumentChartBarIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors duration-200">
                      View Reports
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Access comprehensive audit logs and detailed activity reports.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* Recent Activity Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="text-center py-12">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by uploading your first file or adding a beneficiary.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;