import React from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import type { InheritancePlan, PlanStatus } from '../services/inheritanceApi';

interface PlanCardProps {
  plan: InheritancePlan;
  status?: PlanStatus;
  onEdit: () => void;
  onDelete: () => void;
  onTrigger: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ 
  plan, 
  status, 
  onEdit, 
  onDelete, 
  onTrigger 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'triggered':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ClockIcon className="h-4 w-4" />;
      case 'ready':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'triggered':
        return <PlayIcon className="h-4 w-4" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Check if waiting period has elapsed
  const waitingPeriodEnd = new Date(plan.createdAt);
  waitingPeriodEnd.setDate(waitingPeriodEnd.getDate() + plan.waitingPeriodDays);
  const waitingPeriodElapsed = new Date() >= waitingPeriodEnd;
  
  const canTrigger = status?.approvalProgress.canTrigger && 
                    (plan.status === 'active' || plan.status === 'ready') && 
                    waitingPeriodElapsed;
  const canEdit = plan.status === 'active';
  const canDelete = plan.status === 'active' || plan.status === 'cancelled';

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
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                {getStatusIcon(plan.status)}
                <span className="ml-1 capitalize">{plan.status}</span>
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                title="Edit plan"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Delete plan"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Plan Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Trustees</p>
              <p className="text-sm font-medium text-gray-900">
                {plan.kThreshold} of {plan.nTotal}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Waiting Period</p>
              <p className="text-sm font-medium text-gray-900">
                {plan.waitingPeriodDays} days
              </p>
            </div>
          </div>
        </div>

        {/* Status Information */}
        {status && (
          <div className="space-y-3 mb-4">
            {/* Approval Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Trustee Approvals</span>
                <span className="text-sm text-gray-500">
                  {status.approvalProgress.approved} / {status.approvalProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(status.approvalProgress.approved / status.approvalProgress.total) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Beneficiaries</p>
                  <p className="text-sm font-medium text-gray-900">
                    {status.beneficiaries.length}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Assets</p>
                  <p className="text-sm font-medium text-gray-900">
                    {status.items.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trustee List */}
        {status && status.trustees.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Trustees</h4>
            <div className="space-y-1">
              {status.trustees.slice(0, 3).map((trustee) => (
                <div key={trustee.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{trustee.name}</span>
                  <div className="flex items-center space-x-1">
                    {trustee.hasApproved ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={`text-xs ${trustee.hasApproved ? 'text-green-600' : 'text-gray-500'}`}>
                      {trustee.hasApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
              {status.trustees.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{status.trustees.length - 3} more trustees
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-200">
          {canTrigger ? (
            <button
              onClick={onTrigger}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Trigger Inheritance
            </button>
          ) : plan.status === 'triggered' ? (
            <div className="text-center">
              <p className="text-sm text-yellow-600 font-medium">
                Inheritance process in progress
              </p>
            </div>
          ) : plan.status === 'completed' ? (
            <div className="text-center">
              <p className="text-sm text-green-600 font-medium">
                Inheritance completed
              </p>
            </div>
          ) : !waitingPeriodElapsed ? (
            <div className="text-center">
              <p className="text-sm text-blue-600 font-medium">
                Waiting period active
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Can trigger after {waitingPeriodEnd.toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Waiting for trustee approvals
              </p>
            </div>
          )}
        </div>

        {/* Created Date */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Created {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'Unknown date'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanCard;
