import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  Squares2X2Icon,
  ArchiveBoxIcon,
  BuildingOfficeIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon },
  { name: 'Vault', href: '/dashboard/vault', icon: HomeIcon },
  { name: 'Packages', href: '/dashboard/packages', icon: ArchiveBoxIcon },
  { name: 'Pricing', href: '/dashboard/pricing', icon: CurrencyDollarIcon },
  { name: 'Inheritance', href: '/dashboard/inheritance', icon: DocumentTextIcon },
  { name: 'Contract management', href: '/dashboard/contracts', icon: DocumentDuplicateIcon },
  { name: 'Search', href: '/dashboard/search', icon: MagnifyingGlassIcon },
  { name: 'E-signature', href: '/dashboard/esignature', icon: PencilSquareIcon },
  { name: 'Audit', href: '/dashboard/audit', icon: ClipboardDocumentListIcon },
  { name: 'Corporate Vault', href: '/dashboard/corporate', icon: BuildingOfficeIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:shadow-lg
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-4">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Sidebar Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fortva Vault</h2>
                <p className="text-sm text-gray-500">Digital Vault</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }: { isActive: boolean }) =>
                  `group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
                onClick={() => {
                  // Close mobile sidebar when navigating
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    window.location.pathname === item.href
                      ? 'text-blue-700'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 text-center">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
