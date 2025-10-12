import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  ShieldCheckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { inheritanceApiService } from '../services/inheritanceApi';
import { vaultApiService } from '../services/vaultApi';
import type { InheritancePlan, PlanStatus } from '../services/inheritanceApi';
import PlanForm from '../components/PlanForm';
import PlanCard from '../components/PlanCard';
import BeneficiaryKeyAssembly from '../components/BeneficiaryKeyAssembly';

const InheritancePage: React.FC = () => {
  const [plans, setPlans] = useState<InheritancePlan[]>([]);
  const [planStatuses, setPlanStatuses] = useState<Map<string, PlanStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InheritancePlan | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'key-assembly'>('plans');
  const [selectedPlanForAssembly, setSelectedPlanForAssembly] = useState<string | null>(null);

  // Load plans on component mount
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await inheritanceApiService.listPlans();
      if (response.success && response.plans) {
        setPlans(response.plans);
        
        // Load detailed status for each plan
        const statusPromises = response.plans.map(async (plan) => {
          const statusResponse = await inheritanceApiService.getPlanStatus(plan.id);
          if (statusResponse.success && statusResponse.data) {
            return [plan.id, statusResponse.data] as [string, PlanStatus];
          }
          return null;
        });
        
        const statusResults = await Promise.all(statusPromises);
        const statusMap = new Map(statusResults.filter(Boolean) as [string, PlanStatus][]);
        setPlanStatuses(statusMap);
      } else {
        setError(response.error || 'Failed to load plans');
      }
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Failed to load inheritance plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const handleEditPlan = async (plan: InheritancePlan) => {
    try {
      // Fetch full plan details including trustees, beneficiaries, and items
      const response = await inheritanceApiService.getPlanStatus(plan.id);
      if (response.success && response.data) {
        // Create a full plan object with all details
        const fullPlan = {
          ...plan,
          trustees: response.data.trustees,
          beneficiaries: response.data.beneficiaries,
          items: response.data.items
        };
        setEditingPlan(fullPlan);
        setShowPlanForm(true);
      } else {
        console.error('Failed to fetch plan details:', response.error);
        setEditingPlan(plan);
        setShowPlanForm(true);
      }
    } catch (error) {
      console.error('Error fetching plan details:', error);
      setEditingPlan(plan);
      setShowPlanForm(true);
    }
  };

  const handlePlanFormClose = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
  };

  const handlePlanFormSubmit = async () => {
    await loadPlans(); // Reload plans after creation/update
    setShowPlanForm(false);
    setEditingPlan(null);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this inheritance plan? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await inheritanceApiService.deletePlan(planId);
      
      if (response.success) {
        await loadPlans(); // Reload the plans list
      } else {
        setError(response.error || 'Failed to delete plan');
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete plan');
    }
  };

  const handleTriggerInheritance = async (planId: string) => {
    const reason = window.prompt('Please provide a reason for triggering the inheritance process:');
    if (!reason) return;
    
    try {
      const response = await inheritanceApiService.triggerInheritance(planId, {
        planId,
        reason,
        emergencyOverride: false
      });
      
      if (response.success) {
        await loadPlans(); // Reload to show updated status
        alert('Inheritance process triggered successfully');
      } else {
        alert(`Failed to trigger inheritance: ${response.error}`);
      }
    } catch (err) {
      console.error('Error triggering inheritance:', err);
      alert('Failed to trigger inheritance process');
    }
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

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FolderIcon className="h-4 w-4 inline mr-2" />
              Inheritance Plans
            </button>
            <button
              onClick={() => setActiveTab('key-assembly')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'key-assembly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <KeyIcon className="h-4 w-4 inline mr-2" />
              Key Assembly (Shamir Testing)
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Plans Tab Content */}
          {activeTab === 'plans' && (
            <>
              {/* Error Display */}
              {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

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
                    <p className="text-sm font-medium text-gray-500">Total Beneficiaries</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Array.from(planStatuses.values()).reduce((total, status) => total + status.beneficiaries.length, 0)}
                    </p>
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
                    <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
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
                    <p className="text-2xl font-bold text-gray-900">
                      {Array.from(planStatuses.values()).reduce((total, status) => total + status.items.length, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-center py-16 px-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading inheritance plans...</p>
              </div>
            </div>
          )}

          {/* Plans List */}
          {!loading && plans.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Your Inheritance Plans</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {plans.map((plan) => {
                  const status = planStatuses.get(plan.id);
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      status={status}
                      onEdit={() => handleEditPlan(plan)}
                      onDelete={() => handleDeletePlan(plan.id)}
                      onTrigger={() => handleTriggerInheritance(plan.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && plans.length === 0 && (
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
                </div>
              </div>
            </div>
          )}

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
            </>
          )}

          {/* Key Assembly Tab Content */}
          {activeTab === 'key-assembly' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Shamir's Secret Sharing Test
                </h2>
                <p className="text-gray-600 mb-6">
                  Test the key splitting and assembly functionality. Select a plan to test key reconstruction.
                </p>
                
                {/* Plan Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Plan for Key Assembly Test
                  </label>
                  <select
                    value={selectedPlanForAssembly || ''}
                    onChange={(e) => setSelectedPlanForAssembly(e.target.value || null)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a plan...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} (ID: {plan.id.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Key Assembly Component */}
                {selectedPlanForAssembly && (
                  <BeneficiaryKeyAssembly
                    planId={selectedPlanForAssembly}
                    onVMKReconstructed={(vmk) => {
                      console.log('VMK Reconstructed:', vmk);
                      alert('VMK successfully reconstructed! Check console for details.');
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Form Modal */}
      {showPlanForm && (
        <PlanForm
          plan={editingPlan}
          onClose={handlePlanFormClose}
          onSubmit={handlePlanFormSubmit}
        />
      )}
    </div>
  );
};

export default InheritancePage;
