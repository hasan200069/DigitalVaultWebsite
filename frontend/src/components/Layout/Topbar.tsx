import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationDropdown } from '../NotificationDropdown';
import { notificationApi } from '../../services/notificationApi';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Load notification stats on component mount
  const loadNotificationStats = async () => {
    try {
      const stats = await notificationApi.getStats();
      setUnreadCount(stats.stats.unread);
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotificationStats();
    }
  }, [user]);

  // Get current page name from pathname
  const getCurrentPageName = () => {
    const path = location.pathname;
    if (path.includes('/vault')) return 'Vault';
    if (path.includes('/packages')) return 'Packages';
    if (path.includes('/pricing')) return 'Pricing';
    if (path.includes('/inheritance')) return 'Inheritance';
    if (path.includes('/contracts')) return 'Contract management';
    if (path.includes('/search')) return 'Search';
    if (path.includes('/esignature')) return 'E-signature';
    if (path.includes('/audit')) return 'Audit';
    if (path.includes('/corporate')) return 'Coming Soon';
    if (path.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    await logout();
  };

  const handleSettings = () => {
    setProfileDropdownOpen(false);
    navigate('/dashboard/settings');
  };

  const navigateByQuery = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    if (q.includes('vault') || q.includes('file')) return navigate('/dashboard/vault');
    if (q.includes('inherit') || q.includes('beneficiar')) return navigate('/dashboard/inheritance');
    if (q.includes('audit') || q.includes('report') || q.includes('activity')) return navigate('/dashboard/audit');
    if (q.includes('package') || q.includes('plan') || q.includes('pricing')) return navigate('/dashboard/packages');
    if (q.includes('search')) return navigate('/dashboard/search');
    if (q.includes('sign') || q.includes('signature')) return navigate('/dashboard/esignature');
    if (q.includes('setting') || q.includes('profile')) return navigate('/dashboard/settings');
    // default: go to search page with query param if exists
    const target = q ? `/dashboard/search?q=${encodeURIComponent(q)}` : '/dashboard/search';
    return navigate(target);
  };

  return (
    <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
      <div className="flex min-h-16 items-center justify-between px-6 lg:px-8 py-3">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            onClick={onMenuClick}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Center - Breadcrumb (left), Welcome (floating, right-centric on dashboard) */}
        <div className="flex-1 hidden lg:flex items-center relative">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <span className="text-sm text-gray-500">Digital Vault</span>
              </li>
              <li>
                <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <span className="text-sm font-medium text-gray-900">{getCurrentPageName()}</span>
              </li>
            </ol>
          </nav>

          {location.pathname === '/dashboard' && (
            <div className="absolute left-1/2 -translate-x-[32%] xl:-translate-x-[36%] flex items-center justify-between gap-3 md:gap-4 w-[36rem] md:w-[44rem] lg:w-[48rem] xl:w-[52rem] max-w-[72vw]">
              <h1 className="shrink-0 text-xl sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
                {`Welcome back, ${user ? (user.firstName || user.email || 'User') : 'User'}`}
              </h1>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigateByQuery(searchQuery);
                    }
                  }}
                  className="w-48 md:w-56 lg:w-64 rounded-md border border-gray-300 bg-white px-3 py-1.5 pl-9 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search to navigate..."
                />
                <svg className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Optional search (non-dashboard), Notifications and Profile */}
        <div className="flex items-center space-x-4">
          {location.pathname !== '/dashboard' && (
            <div className="relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigateByQuery(searchQuery);
                }}
                className="w-40 lg:w-56 rounded-md border border-gray-300 bg-white px-3 py-1.5 pl-9 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search to navigate..."
              />
              <svg className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md"
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown
              isOpen={notificationDropdownOpen}
              onClose={() => setNotificationDropdownOpen(false)}
              onNotificationRead={loadNotificationStats}
            />
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-3 p-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </p>
                <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                </div>
                
                <a
                  href="#"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <UserIcon className="mr-3 h-4 w-4" />
                  Profile
                </a>
                
                <button
                  type="button"
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                  onClick={handleSettings}
                >
                  <Cog6ToothIcon className="mr-3 h-4 w-4" />
                  Settings
                </button>
                
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                    onClick={handleLogout}
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(profileDropdownOpen || notificationDropdownOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setProfileDropdownOpen(false);
            setNotificationDropdownOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Topbar;
