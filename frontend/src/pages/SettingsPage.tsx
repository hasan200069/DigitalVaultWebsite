import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  ShieldCheckIcon, 
  BellIcon, 
  GlobeAltIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [isRecoveryKitLoading, setIsRecoveryKitLoading] = useState(false);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    company: 'Fortva',
    timezone: 'UTC-8',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      security: true,
      updates: true,
    },
  });

  // Update form data when user loads
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        fullName: `${user.firstName} ${user.lastName}`,
      }));
    }
  }, [user]);

  const tabs = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'preferences', label: 'Preferences', icon: GlobeAltIcon },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      },
    }));
  };

  const handleSaveChanges = () => {
    console.log('Saving changes:', formData);
    // In a real app, this would save the settings to the backend
    alert('Settings saved successfully!');
  };

  const handleEnable2FA = () => {
    console.log('Enable 2FA clicked');
    // In a real app, this would open 2FA setup flow
    alert('2FA setup dialog would open here');
  };

  const handleChangePassword = () => {
    console.log('Change password clicked');
    // In a real app, this would open change password modal
    alert('Change password dialog would open here');
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    setDeviceError('');
    try {
      const result = await WebAuthnService.getDevices();
      if (result.success && result.devices) {
        setDevices(result.devices);
      } else {
        setDeviceError(result.message || 'Failed to load devices');
      }
    } catch (error) {
      setDeviceError('Failed to load devices');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleManageDevices = () => {
    alert('Device management is not available at this time.');
  };

  const handleDownloadRecoveryKit = async () => {
    alert('Recovery kit download is not available at this time.');
  };

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              readOnly
              className="block w-full border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <ShieldCheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
            </div>
            <button 
              onClick={handleEnable2FA}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Enable 2FA
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <KeyIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Change Password</h4>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </div>
            <button 
              onClick={handleChangePassword}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Change Password
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <DevicePhoneMobileIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Trusted Devices</h4>
                <p className="text-sm text-gray-500">Manage devices that can access your account</p>
              </div>
            </div>
            <button 
              onClick={handleManageDevices}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Manage Devices
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-orange-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <ArrowDownTrayIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Recovery Kit</h4>
                <p className="text-sm text-gray-500">Download emergency access recovery kit for your vault</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadRecoveryKit}
              disabled={isRecoveryKitLoading}
              className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-lg text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isRecoveryKitLoading ? 'Downloading...' : 'Download Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(formData.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900 capitalize">{key} Notifications</h4>
                <p className="text-sm text-gray-500">
                  {key === 'email' && 'Receive notifications via email'}
                  {key === 'push' && 'Receive push notifications in browser'}
                  {key === 'security' && 'Get notified about security events'}
                  {key === 'updates' && 'Receive product updates and announcements'}
                </p>
              </div>
              <button
                onClick={() => handleNotificationChange(key, !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Application Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC-8">Pacific Time (UTC-8)</option>
              <option value="UTC-5">Eastern Time (UTC-5)</option>
              <option value="UTC+0">UTC</option>
              <option value="UTC+1">Central European Time (UTC+1)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Settings
            </h1>
            <p className="mt-1 text-base text-gray-600">
              Manage your account preferences and security settings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              {activeTab === 'account' && renderAccountSettings()}
              {activeTab === 'security' && renderSecuritySettings()}
              {activeTab === 'notifications' && renderNotificationSettings()}
              {activeTab === 'preferences' && renderPreferences()}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveChanges}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SettingsPage;
