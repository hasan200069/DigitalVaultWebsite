// AuditPage component for viewing and exporting audit logs

import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import AuditTable from '../components/AuditTable';
import { auditApiService } from '../services/auditApi';
import type { AuditLog, GetAuditLogsRequest } from '../services/auditApi';

const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [logsPerPage] = useState(50);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<GetAuditLogsRequest>({
    limit: logsPerPage,
    offset: 0
  });

  // Available options for filters
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<string[]>([]);

  // Date range states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Load available filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [actions, resourceTypes] = await Promise.all([
          auditApiService.getAvailableActions(),
          auditApiService.getAvailableResourceTypes()
        ]);
        setAvailableActions(actions);
        setAvailableResourceTypes(resourceTypes);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  // Load audit logs
  const loadAuditLogs = async (page: number = 0, customFilters?: GetAuditLogsRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const requestFilters = {
        ...filters,
        ...customFilters,
        limit: logsPerPage,
        offset: page * logsPerPage
      };

      const response = await auditApiService.getAuditLogs(requestFilters);
      
      setLogs(response.logs);
      setTotalLogs(response.total);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Load logs on component mount and when filters change
  useEffect(() => {
    loadAuditLogs(0);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof GetAuditLogsRequest, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(0);
  };

  // Handle date range changes
  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setDateFrom(value);
      setFilters(prev => ({
        ...prev,
        dateFrom: value || undefined
      }));
    } else {
      setDateTo(value);
      setFilters(prev => ({
        ...prev,
        dateTo: value || undefined
      }));
    }
    setCurrentPage(0);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      limit: logsPerPage,
      offset: 0
    });
    setDateFrom('');
    setDateTo('');
    setCurrentPage(0);
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await auditApiService.exportAuditLogs({
        format,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        filters: {
          action: filters.action,
          resourceType: filters.resourceType,
          userId: filters.userId
        }
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Handle view details
  const handleViewDetails = (log: AuditLog) => {
    // Create a detailed view of the audit log
    const details = `
Audit Log Details:
=================

ID: ${log.id}
Timestamp: ${new Date(log.timestamp).toLocaleString()}
User: ${log.first_name || ''} ${log.last_name || ''} (${log.email || ''})
Action: ${log.action}
Resource Type: ${log.resourceType}
Resource ID: ${log.resourceId}
Vault ID: ${log.vaultId || 'N/A'}
IP Address: ${log.ipAddress || 'N/A'}
User Agent: ${log.userAgent || 'N/A'}
Session ID: ${log.sessionId || 'N/A'}

Hash Chain:
Previous Hash: ${log.previousHash || 'N/A'}
Current Hash: ${log.currentHash}

Details:
${log.details ? JSON.stringify(log.details, null, 2) : 'No additional details'}
    `;

    alert(details);
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                Audit & Compliance
              </h1>
              <p className="mt-2 text-gray-600">
                Immutable audit trail with hash-chained logging for compliance and security monitoring.
              </p>
            </div>
            
            {/* Export buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleExport('csv')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                  {showFilters ? (
                    <ChevronUpIcon className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 ml-2" />
                  )}
                </button>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Clear All
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Action filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={filters.action || ''}
                    onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Actions</option>
                    {availableActions.map(action => (
                      <option key={action} value={action}>
                        {action.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resource Type filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resource Type
                  </label>
                  <select
                    value={filters.resourceType || ''}
                    onChange={(e) => handleFilterChange('resourceType', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    {availableResourceTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleDateChange('from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleDateChange('to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Audit Logs
              </h3>
              <p className="text-sm text-gray-600">
                {totalLogs.toLocaleString()} total logs found
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading audit logs
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audit table */}
        <AuditTable
          logs={logs}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadAuditLogs(currentPage - 1)}
                  disabled={currentPage === 0 || isLoading}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => loadAuditLogs(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1 || isLoading}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Showing {currentPage * logsPerPage + 1} to{' '}
                {Math.min((currentPage + 1) * logsPerPage, totalLogs)} of{' '}
                {totalLogs.toLocaleString()} results
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditPage;