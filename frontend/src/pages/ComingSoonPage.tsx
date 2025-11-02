import React from 'react';
import { BuildingOfficeIcon, ClockIcon } from '@heroicons/react/24/outline';

const ComingSoonPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4">
        <div className="max-w-2xl w-full text-center">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-6">
                <BuildingOfficeIcon className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-8">
            Corporate Vault & White Label Features
          </p>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="flex items-start justify-center mb-6">
              <ClockIcon className="h-8 w-8 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Feature in Development
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  We're working hard to bring you powerful white-label customization features. 
                  This will include branding options, multi-tenant management, and enterprise-level 
                  customization capabilities.
                </p>
              </div>
            </div>

            {/* Feature List */}
            <div className="grid md:grid-cols-2 gap-4 mt-6 text-left">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Custom Branding</p>
                  <p className="text-sm text-gray-600">Personalize with your logo and colors</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Multi-Tenant Management</p>
                  <p className="text-sm text-gray-600">Manage multiple organizations</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Custom Domains</p>
                  <p className="text-sm text-gray-600">Use your own domain</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Enterprise Features</p>
                  <p className="text-sm text-gray-600">Advanced admin controls</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <p className="text-gray-500 text-sm">
            Stay tuned for updates! We'll notify you when this feature is available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;

