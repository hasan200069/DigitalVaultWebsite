import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const AuditPage: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedEventType, setSelectedEventType] = useState('all');

  const timeRanges = [
    { id: '1d', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
  ];

  const eventTypes = [
    { id: 'all', label: 'All Events' },
    { id: 'login', label: 'Login Events' },
    { id: 'file', label: 'File Operations' },
    { id: 'security', label: 'Security Events' },
  ];

  const handleExportLogs = () => {
    // In a real app, this would trigger a download of audit logs
    console.log('Export audit logs clicked');
    alert('Audit logs export would start here');
  };

  const handleScheduleReports = () => {
    // In a real app, this would open a schedule reports modal
    console.log('Schedule reports clicked');
    alert('Schedule reports dialog would open here');
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', { selectedTimeRange, selectedEventType });
    // In a real app, this would apply the filters and refresh the audit logs
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Audit
              </h1>
              <p className="mt-1 text-base text-gray-600">
                Monitor and track all activities and access to your digital vault.
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button 
                onClick={handleExportLogs}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export Logs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Events</p>
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
                      <UserIcon className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Login Events</p>
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
                      <ShieldCheckIcon className="w-5 h-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Security Events</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {eventTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleApplyFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
            </div>
            
            {/* Empty State */}
            <div className="text-center py-16 px-6">
              <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                <DocumentTextIcon className="h-full w-full" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No audit logs</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Audit logs will appear here as you use the digital vault. All activities are automatically tracked and logged.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleExportLogs}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export Audit Logs
                </button>
                <button 
                  onClick={handleScheduleReports}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Schedule Reports
                </button>
              </div>
            </div>
          </div>

          {/* Audit Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About Audit Logs</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">What's Tracked</h4>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Login and logout events</li>
                  <li>• File uploads and downloads</li>
                  <li>• Permission changes</li>
                  <li>• Security events and alerts</li>
                  <li>• System configuration changes</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Data Retention</h4>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Logs are retained for 2 years</li>
                  <li>• Encrypted and tamper-proof</li>
                  <li>• Available for compliance reporting</li>
                  <li>• Real-time monitoring and alerts</li>
                  <li>• Exportable in multiple formats</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
