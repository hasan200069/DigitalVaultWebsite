// AuditTable component for displaying audit logs

import React from 'react';
import {
  EyeIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import type { AuditLog } from '../services/auditApi';

interface AuditTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
  onViewDetails?: (log: AuditLog) => void;
}

const AuditTable: React.FC<AuditTableProps> = ({ 
  logs, 
  isLoading = false, 
  onViewDetails 
}) => {
  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <UserIcon className="h-4 w-4" />;
    }
    if (action.includes('VAULT_ITEM')) {
      return <DocumentTextIcon className="h-4 w-4" />;
    }
    if (action.includes('INHERITANCE')) {
      return <ShieldCheckIcon className="h-4 w-4" />;
    }
    if (action.includes('SECURITY') || action.includes('ENCRYPTION')) {
      return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
    if (action.includes('EXPORT') || action.includes('BACKUP')) {
      return <ArrowPathIcon className="h-4 w-4" />;
    }
    return <InformationCircleIcon className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN') && !action.includes('FAILED')) {
      return 'text-green-600 bg-green-100';
    }
    if (action.includes('FAILED') || action.includes('ERROR')) {
      return 'text-red-600 bg-red-100';
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'text-orange-600 bg-orange-100';
    }
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'text-blue-600 bg-blue-100';
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'text-yellow-600 bg-yellow-100';
    }
    if (action.includes('VIEW') || action.includes('READ')) {
      return 'text-purple-600 bg-purple-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatUser = (log: AuditLog) => {
    const name = `${log.first_name || ''} ${log.last_name || ''}`.trim();
    return name ? `${name} (${log.email})` : log.email || 'Unknown User';
  };

  const truncateHash = (hash: string) => {
    return hash ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : 'N/A';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs Found</h3>
          <p className="text-gray-600">
            No audit logs match your current filters. Try adjusting your search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hash
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">
                      {formatUser(log)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      <span className="ml-1">{log.action.replace(/_/g, ' ')}</span>
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{log.resourceType}</div>
                    <div className="text-gray-500">{log.resourceId}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.ipAddress || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-mono">
                    {truncateHash(log.currentHash)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onViewDetails?.(log)}
                    className="text-blue-600 hover:text-blue-900 flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTable;
