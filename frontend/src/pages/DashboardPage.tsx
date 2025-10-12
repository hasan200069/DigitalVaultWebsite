import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vaultApiService } from '../services/vaultApi';
import { inheritanceApiService } from '../services/inheritanceApi';
import { auditApiService } from '../services/auditApi';
import TrusteeApprovalsSection from '../components/TrusteeApprovalsSection';
import { 
  DocumentTextIcon, 
  UserGroupIcon, 
  ServerIcon, 
  ClockIcon,
  CloudArrowUpIcon,
  UserPlusIcon,
  DocumentChartBarIcon,
  UserIcon,
  KeyIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<{ totalFiles: number; encryptedFiles: number; totalBytes: number }>({ totalFiles: 0, encryptedFiles: 0, totalBytes: 0 });
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);
  const [recentActivityCount, setRecentActivityCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        console.log('Loading dashboard stats...');
        
        // Load vault stats
        const vaultRes = await vaultApiService.getStats();
        console.log('Vault stats response:', vaultRes);
        if (vaultRes.success) {
          setStats({ totalFiles: vaultRes.totalFiles, encryptedFiles: vaultRes.encryptedFiles, totalBytes: vaultRes.totalBytes });
        }

        // Load inheritance plans to count beneficiaries
        const plansRes = await inheritanceApiService.listPlans();
        console.log('Inheritance plans response:', plansRes);
        
        let totalBeneficiaries = 0;
        let totalPlans = 0;
        
        if (plansRes.success && plansRes.plans) {
          totalPlans = plansRes.plans.length;
          // Count total beneficiaries across all plans
          for (const plan of plansRes.plans) {
            const statusRes = await inheritanceApiService.getPlanStatus(plan.id);
            console.log(`Plan ${plan.id} status:`, statusRes);
            if (statusRes.success && statusRes.data) {
              totalBeneficiaries += statusRes.data.beneficiaries.length;
            }
          }
        }
        
        setBeneficiaryCount(totalBeneficiaries);
        console.log('Total beneficiaries:', totalBeneficiaries);

        // Fetch recent activities from audit logs
        setLoadingActivities(true);
        try {
          const auditRes = await auditApiService.getAuditLogs({ limit: 10 });
          console.log('Recent activities response:', auditRes);
          
          if (auditRes.success && auditRes.logs) {
            setRecentActivities(auditRes.logs);
            setRecentActivityCount(auditRes.total || auditRes.logs.length);
          } else {
            // Fallback to calculated count
            const vaultFiles = vaultRes.success ? vaultRes.totalFiles : 0;
            const activityCount = vaultFiles + totalPlans;
            setRecentActivityCount(activityCount);
          }
        } catch (error) {
          console.error('Failed to load recent activities:', error);
          // Fallback to calculated count
          const vaultFiles = vaultRes.success ? vaultRes.totalFiles : 0;
          const activityCount = vaultFiles + totalPlans;
          setRecentActivityCount(activityCount);
        } finally {
          setLoadingActivities(false);
        }
        
      } catch (e) {
        console.error('Failed to load dashboard stats', e);
      }
    })();
  }, []);

  const handleUploadFiles = () => {
    navigate('/dashboard/vault');
    // In a real app, this might open a file upload modal
    console.log('Upload files clicked');
  };

  const handleAddBeneficiary = () => {
    navigate('/dashboard/inheritance');
    // In a real app, this might open a beneficiary form modal
    console.log('Add beneficiary clicked');
  };

  const handleViewReports = () => {
    navigate('/dashboard/audit');
    // In a real app, this might open reports or show specific audit data
    console.log('View reports clicked');
  };

  // Helper function to get icon for activity type
  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return <UserIcon className="w-5 h-5" />;
      case 'VAULT_ITEM_CREATED':
        return <CloudArrowUpIcon className="w-5 h-5" />;
      case 'VAULT_ITEM_DELETED':
        return <TrashIcon className="w-5 h-5" />;
      case 'VAULT_ITEM_VIEWED':
      case 'VAULT_ITEM_DOWNLOADED':
        return <EyeIcon className="w-5 h-5" />;
      case 'VAULT_ITEM_SEARCHED':
        return <MagnifyingGlassIcon className="w-5 h-5" />;
      case 'INHERITANCE_PLAN_CREATED':
      case 'INHERITANCE_PLAN_UPDATED':
      case 'INHERITANCE_PLAN_DELETED':
      case 'INHERITANCE_TRIGGERED':
        return <UserGroupIcon className="w-5 h-5" />;
      case 'AUDIT_LOG_EXPORTED':
        return <DocumentChartBarIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  // Helper function to format activity description
  const formatActivityDescription = (log: any) => {
    const action = log.action;
    const user = `${log.first_name || ''} ${log.last_name || ''}`.trim() || log.email || 'Unknown User';
    
    switch (action) {
      case 'LOGIN':
        return `${user} logged in`;
      case 'LOGOUT':
        return `${user} logged out`;
      case 'VAULT_ITEM_CREATED':
        return `${user} uploaded a file`;
      case 'VAULT_ITEM_DELETED':
        return `${user} deleted a file`;
      case 'VAULT_ITEM_VIEWED':
        return `${user} viewed a file`;
      case 'VAULT_ITEM_DOWNLOADED':
        return `${user} downloaded a file`;
      case 'VAULT_ITEM_SEARCHED':
        return `${user} searched files`;
      case 'INHERITANCE_PLAN_CREATED':
        return `${user} created an inheritance plan`;
      case 'INHERITANCE_PLAN_UPDATED':
        return `${user} updated an inheritance plan`;
      case 'INHERITANCE_PLAN_DELETED':
        return `${user} deleted an inheritance plan`;
      case 'INHERITANCE_TRIGGERED':
        return `${user} triggered inheritance`;
      case 'AUDIT_LOG_EXPORTED':
        return `${user} exported audit logs`;
      default:
        return `${user} performed ${action.toLowerCase().replace(/_/g, ' ')}`;
    }
  };

  // Helper function to get activity color
  const getActivityColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'text-green-600 bg-green-100';
      case 'LOGOUT':
        return 'text-gray-600 bg-gray-100';
      case 'VAULT_ITEM_CREATED':
        return 'text-blue-600 bg-blue-100';
      case 'VAULT_ITEM_DELETED':
        return 'text-red-600 bg-red-100';
      case 'VAULT_ITEM_VIEWED':
      case 'VAULT_ITEM_DOWNLOADED':
        return 'text-purple-600 bg-purple-100';
      case 'VAULT_ITEM_SEARCHED':
        return 'text-indigo-600 bg-indigo-100';
      case 'INHERITANCE_PLAN_CREATED':
      case 'INHERITANCE_PLAN_UPDATED':
      case 'INHERITANCE_PLAN_DELETED':
      case 'INHERITANCE_TRIGGERED':
        return 'text-green-600 bg-green-100';
      case 'AUDIT_LOG_EXPORTED':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {`Welcome back, ${user?.firstName || user?.email || 'User'}`}
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
                      <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{beneficiaryCount}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB</p>
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
                      <p className="text-2xl font-bold text-gray-900">{recentActivityCount}</p>
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
              <button 
                onClick={handleUploadFiles}
                className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
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
              <button 
                onClick={handleAddBeneficiary}
                className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
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
              <button 
                onClick={handleViewReports}
                className="group relative bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:col-span-2 lg:col-span-1"
              >
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

          {/* Trustee Approvals Section */}
          <section>
            <TrusteeApprovalsSection />
          </section>

          {/* Recent Activity Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              {loadingActivities ? (
                <div className="p-6">
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading activities...</p>
                  </div>
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {recentActivities.slice(0, 10).map((activity, index) => (
                      <div key={activity.id || index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {formatActivityDescription(activity)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {activity.details && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {activity.resourceType}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {recentActivities.length > 10 && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => navigate('/dashboard/audit')}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View all activities →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="text-center py-12">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by uploading your first file or adding a beneficiary.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;