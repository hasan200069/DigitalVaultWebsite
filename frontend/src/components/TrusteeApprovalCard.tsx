import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { inheritanceApiService } from '../services/inheritanceApi';
import type { InheritancePlan, Trustee } from '../services/inheritanceApi';

interface TrusteeApprovalCardProps {
  plan: InheritancePlan;
  trustee: Trustee;
  onApprovalChange: () => void;
}

const TrusteeApprovalCard: React.FC<TrusteeApprovalCardProps> = ({ 
  plan, 
  trustee, 
  onApprovalChange 
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      const response = await inheritanceApiService.approvePlan(plan.id, {
        trusteeId: trustee.id
      });

      if (response.success) {
        onApprovalChange();
      } else {
        setError(response.error || 'Failed to approve plan');
      }
    } catch (err) {
      setError('An error occurred while approving the plan');
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusColor = () => {
    if (trustee.hasApproved) return 'text-green-600 bg-green-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getStatusIcon = () => {
    if (trustee.hasApproved) {
      return <CheckCircleIcon className="h-5 w-5" />;
    }
    return <ClockIcon className="h-5 w-5" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {plan.name}
            </h3>
            {plan.description && (
              <p className="text-sm text-gray-600 mb-2">
                {plan.description}
              </p>
            )}
          </div>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-1">
              {trustee.hasApproved ? 'Approved' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Plan Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <UserGroupIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{plan.kThreshold} of {plan.nTotal} trustees</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>{plan.waitingPeriodDays} days waiting period</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Button */}
        {!trustee.hasApproved && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Approve Plan
                </>
              )}
            </button>
          </div>
        )}

        {/* Already Approved Message */}
        {trustee.hasApproved && (
          <div className="pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium">
                ✓ You have approved this plan
              </p>
              {trustee.approvedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Approved on {new Date(trustee.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Created Date */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Created {new Date(plan.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrusteeApprovalCard;
