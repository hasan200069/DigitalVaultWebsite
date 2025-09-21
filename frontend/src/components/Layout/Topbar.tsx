import React, { useState } from 'react';
import { 
  Bars3Icon, 
  BellIcon, 
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
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

        {/* Center - Tenant Logo/Name */}
        <div className="flex-1 flex justify-center lg:justify-start">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">ACME</span>
            </div>
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-gray-900">ACME Corporation</h2>
              <p className="text-xs text-gray-500">Digital Vault</p>
            </div>
          </div>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md"
          >
            <BellIcon className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center space-x-3 p-2 text-sm rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">john.doe@acme.com</p>
              </div>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500">john.doe@acme.com</p>
                </div>
                
                <a
                  href="#"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <UserIcon className="mr-3 h-4 w-4" />
                  Profile
                </a>
                
                <a
                  href="#"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <Cog6ToothIcon className="mr-3 h-4 w-4" />
                  Settings
                </a>
                
                <div className="border-t border-gray-100">
                  <a
                    href="#"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    Sign out
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Topbar;
