import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { inheritanceApiService } from '../services/inheritanceApi';
import TrusteeApprovalCard from './TrusteeApprovalCard';
import type { InheritancePlan, Trustee } from '../services/inheritanceApi';

const TrusteeApprovalsSection: React.FC = () => {
  const [trusteePlans, setTrusteePlans] = useState<Array<{ plan: InheritancePlan; trustee: Trustee }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrusteePlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await inheritanceApiService.getTrusteePlans();
      
      if (response.success && response.plans) {
        setTrusteePlans(response.plans);
      } else {
        setError(response.error || 'Failed to load trustee plans');
      }
    } catch (err) {
      setError('An error occurred while loading trustee plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrusteePlans();
  }, []);

  const pendingPlans = trusteePlans.filter(({ trustee }) => !trustee.hasApproved);
  const approvedPlans = trusteePlans.filter(({ trustee }) => trustee.hasApproved);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Trustee Approvals</h2>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading trustee approvals...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Trustee Approvals</h2>
          </div>
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadTrusteePlans}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (trusteePlans.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Trustee Approvals</h2>
          </div>
          <div className="text-center py-8">
            <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">No trustee responsibilities</h3>
            <p className="text-sm text-gray-500 mb-6">
              You are not currently designated as a trustee for any inheritance plans.
            </p>
            
            {/* Document Categories Preview */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-3 text-left">Document Organization by Category:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                <div>
                  <p className="text-xs font-semibold text-gray-800 mb-2">Real estate:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Mortgage</li>
                    <li>• Contract management</li>
                    <li>• Legal Documents</li>
                    <li>• Accounting</li>
                    <li>• Family</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 mb-2">Insurance:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Taxes</li>
                    <li>• Budget (dropdown)</li>
                    <li>• Savings and cheques</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 mb-2">Automobile:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Company Documents</li>
                    <li>• Utilities</li>
                    <li>• Religious</li>
                    <li>• Education</li>
                    <li>• Digital Will</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center">
        <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
        <h2 className="text-lg font-semibold text-gray-900">Trustee Approvals</h2>
        {pendingPlans.length > 0 && (
          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            {pendingPlans.length} pending
          </span>
        )}
      </div>

      {/* Pending Approvals */}
      {pendingPlans.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Pending Your Approval ({pendingPlans.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {pendingPlans.map(({ plan, trustee }) => (
              <TrusteeApprovalCard
                key={`${plan.id}-${trustee.id}`}
                plan={plan}
                trustee={trustee}
                onApprovalChange={loadTrusteePlans}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved Plans */}
      {approvedPlans.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Approved Plans ({approvedPlans.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {approvedPlans.map(({ plan, trustee }) => (
              <TrusteeApprovalCard
                key={`${plan.id}-${trustee.id}`}
                plan={plan}
                trustee={trustee}
                onApprovalChange={loadTrusteePlans}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrusteeApprovalsSection;
