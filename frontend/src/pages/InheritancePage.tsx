import React from 'react';
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  ShieldCheckIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const InheritancePage: React.FC = () => {
  const handleCreatePlan = () => {
    // In a real app, this would open a create inheritance plan modal
    console.log('Create inheritance plan clicked');
    alert('Create inheritance plan dialog would open here');
  };

  const handleAddBeneficiary = () => {
    // In a real app, this would open an add beneficiary modal
    console.log('Add beneficiary clicked');
    alert('Add beneficiary dialog would open here');
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Inheritance
              </h1>
              <p className="mt-1 text-base text-gray-600">
                Plan and manage digital asset inheritance for your beneficiaries.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button 
                onClick={handleCreatePlan}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <UserGroupIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Beneficiaries</p>
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
                      <DocumentTextIcon className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Inheritance Plans</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Assets Protected</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="mx-auto h-20 w-20 text-gray-300 mb-4">
                <UserGroupIcon className="h-full w-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No inheritance plans</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Create your first inheritance plan to ensure your digital assets are properly transferred to your beneficiaries.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleCreatePlan}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Inheritance Plan
                </button>
                <button 
                  onClick={handleAddBeneficiary}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Add Beneficiary
                </button>
              </div>
            </div>
          </div>

          {/* Getting Started Guide */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started with Inheritance Planning</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">1</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Add Beneficiaries</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Add family members or trusted individuals who will inherit your digital assets.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-600">2</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Create Plans</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Set up inheritance plans specifying which assets go to which beneficiaries.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-600">3</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Secure & Monitor</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Your plans are encrypted and monitored. Update them as your situation changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InheritancePage;
