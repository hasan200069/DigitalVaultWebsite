import React, { useState, useEffect } from 'react';
import { 
  BuildingOfficeIcon,
  PaintBrushIcon,
  PhotoIcon,
  KeyIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ServerIcon,
  CommandLineIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { vaultApiService } from '../services/vaultApi';

interface OrganizationStats {
  totalUsers: number;
  totalDocuments: number;
  totalStorage: number;
  activeSubscriptions: number;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: string;
  createdAt: string;
  isActive: boolean;
}

const CorporatePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'branding' | 'settings' | 'users' | 'integrations' | 'analytics'>('branding');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Branding state
  const [branding, setBranding] = useState({
    logo: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    companyName: '',
    favicon: '',
    customCSS: ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    domain: '',
    ssoEnabled: false,
    ssoProvider: '',
    autoBackup: true,
    encryptionLevel: 'aes-256',
    retentionPolicy: '90'
  });

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState('');

  // Stats state
  const [stats, setStats] = useState<OrganizationStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalStorage: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // Load branding from localStorage (would come from API in production)
      const savedBranding = localStorage.getItem('organizationBranding');
      if (savedBranding) {
        setBranding(JSON.parse(savedBranding));
      }

      // Load settings from localStorage
      const savedSettings = localStorage.getItem('organizationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Load API keys from localStorage
      const savedApiKeys = localStorage.getItem('organizationApiKeys');
      if (savedApiKeys) {
        setApiKeys(JSON.parse(savedApiKeys));
      }

      // Load stats
      await loadStats();

      // Load users (mock data for now)
      const mockUsers = [
        { id: '1', email: 'admin@example.com', role: 'Admin', status: 'active', lastLogin: '2024-01-15' },
        { id: '2', email: 'user1@example.com', role: 'User', status: 'active', lastLogin: '2024-01-14' },
        { id: '3', email: 'user2@example.com', role: 'User', status: 'active', lastLogin: '2024-01-13' },
      ];
      setUsers(mockUsers);
      setStats(prev => ({ ...prev, totalUsers: mockUsers.length }));
    } catch (error) {
      console.error('Error loading organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await vaultApiService.listItems({ limit: 1000 });
      if (response.success && response.items) {
        const totalStorage = response.items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
        setStats(prev => ({
          ...prev,
          totalDocuments: response.items.length,
          totalStorage: totalStorage
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleBrandingSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('organizationBranding', JSON.stringify(branding));
      setSaving(false);
      alert('Branding settings saved successfully!');
    }, 500);
  };

  const handleSettingsSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('organizationSettings', JSON.stringify(settings));
      setSaving(false);
      alert('Settings saved successfully!');
    }, 500);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBranding({ ...branding, logo: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBranding({ ...branding, favicon: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const generateApiKey = () => {
    if (!newApiKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newApiKeyName,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem('organizationApiKeys', JSON.stringify(updatedKeys));
    setNewApiKeyName('');
    setShowApiKeyForm(false);
    alert(`API Key generated! Copy it now: ${newKey.key}`);
  };

  const deleteApiKey = (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      const updatedKeys = apiKeys.filter(k => k.id !== keyId);
      setApiKeys(updatedKeys);
      localStorage.setItem('organizationApiKeys', JSON.stringify(updatedKeys));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Corporate Vault</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your organization's vault settings, branding, and integrations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <UserGroupIcon className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Documents</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDocuments}</p>
              </div>
              <DocumentTextIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatBytes(stats.totalStorage)}</p>
              </div>
              <ServerIcon className="h-10 w-10 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-2xl font-bold text-green-600 mt-1">Active</p>
              </div>
              <ShieldCheckIcon className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'branding', label: 'Branding', icon: PaintBrushIcon },
                { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
                { id: 'users', label: 'Users', icon: UserGroupIcon },
                { id: 'integrations', label: 'Integrations', icon: CommandLineIcon },
                { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customize Your Branding</h3>
                  <p className="text-sm text-gray-600 mb-6">Personalize your vault with your organization's branding elements.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={branding.companyName}
                      onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                      placeholder="Your Company Name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={settings.domain}
                        onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                        placeholder="vault.yourcompany.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="h-10 w-20 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <div className="flex items-center space-x-4">
                      {branding.logo && (
                        <img src={branding.logo} alt="Logo" className="h-16 w-auto object-contain" />
                      )}
                      <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Favicon</label>
                    <div className="flex items-center space-x-4">
                      {branding.favicon && (
                        <img src={branding.favicon} alt="Favicon" className="h-8 w-8 object-contain" />
                      )}
                      <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">Upload Favicon</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaviconUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom CSS</label>
                  <textarea
                    value={branding.customCSS}
                    onChange={(e) => setBranding({ ...branding, customCSS: e.target.value })}
                    placeholder="/* Add custom CSS here */"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">Add custom styles to further personalize your vault appearance.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleBrandingSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Save Branding</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Settings</h3>
                  <p className="text-sm text-gray-600 mb-6">Configure your organization's vault settings and preferences.</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Encryption Level</label>
                    <select
                      value={settings.encryptionLevel}
                      onChange={(e) => setSettings({ ...settings, encryptionLevel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="aes-256">AES-256 (Recommended)</option>
                      <option value="aes-192">AES-192</option>
                      <option value="aes-128">AES-128</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Retention Policy (days)</label>
                    <input
                      type="number"
                      value={settings.retentionPolicy}
                      onChange={(e) => setSettings({ ...settings, retentionPolicy: e.target.value })}
                      min="30"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-2 text-xs text-gray-500">Documents will be archived after this period.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Automatic Backup</p>
                      <p className="text-sm text-gray-600">Enable automatic daily backups of your vault</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Single Sign-On (SSO)</p>
                      <p className="text-sm text-gray-600">Enable SSO authentication for your organization</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.ssoEnabled}
                        onChange={(e) => setSettings({ ...settings, ssoEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.ssoEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SSO Provider</label>
                      <select
                        value={settings.ssoProvider}
                        onChange={(e) => setSettings({ ...settings, ssoProvider: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Provider</option>
                        <option value="saml">SAML 2.0</option>
                        <option value="oauth">OAuth 2.0</option>
                        <option value="okta">Okta</option>
                        <option value="azure">Azure AD</option>
                        <option value="google">Google Workspace</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSettingsSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Save Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                    <p className="text-sm text-gray-600 mt-1">Manage users and their access to the corporate vault</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <PlusIcon className="h-5 w-5" />
                    <span>Invite User</span>
                  </button>
                </div>

                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.lastLogin}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-4">
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">API Keys & Integrations</h3>
                    <p className="text-sm text-gray-600 mt-1">Manage API keys for programmatic access to your vault</p>
                  </div>
                  <button
                    onClick={() => setShowApiKeyForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Generate API Key</span>
                  </button>
                </div>

                {showApiKeyForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Generate New API Key</h4>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                        placeholder="Enter API key name..."
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={generateApiKey}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => {
                          setShowApiKeyForm(false);
                          setNewApiKeyName('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No API keys generated yet</p>
                    </div>
                  ) : (
                    apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <KeyIcon className="h-5 w-5 text-gray-600" />
                              <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                              {apiKey.isActive ? (
                                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Active</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                              )}
                            </div>
                            <p className="text-sm font-mono text-gray-600 mb-1">{apiKey.key}</p>
                            <p className="text-xs text-gray-500">Created: {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                          </div>
                          <button
                            onClick={() => deleteApiKey(apiKey.id)}
                            className="ml-4 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Security Notice</p>
                      <p className="text-sm text-yellow-800 mt-1">
                        Keep your API keys secure and never share them publicly. Rotate keys regularly for better security.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Analytics</h3>
                  <p className="text-sm text-gray-600 mb-6">Monitor your organization's vault usage and activity.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Storage Usage</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Used</span>
                        <span className="font-medium">{formatBytes(stats.totalStorage)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((stats.totalStorage / (1024 * 1024 * 1024 * 100)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Out of 100 GB allocated</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Document Activity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Documents</span>
                        <span className="font-medium">{stats.totalDocuments}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Users</span>
                        <span className="font-medium">{stats.totalUsers}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <ChartBarIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Advanced Analytics</p>
                      <p className="text-sm text-blue-800 mt-1">
                        Upgrade to Premium plan to access detailed analytics, activity logs, and usage reports.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporatePage;
