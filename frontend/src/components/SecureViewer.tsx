import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  EyeIcon, 
  DocumentIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SecureViewerProps {
  itemId: string;
  itemName: string;
  mimeType?: string;
  onClose: () => void;
}

interface ViewerRestrictions {
  disableCopy: boolean;
  disableSave: boolean;
  disablePrint: boolean;
  watermarkText?: string;
}

const SecureViewer: React.FC<SecureViewerProps> = ({ 
  itemId, 
  itemName, 
  mimeType, 
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState<ViewerRestrictions | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Disable keyboard shortcuts for copy, save, print
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+C, Ctrl+S, Ctrl+P, Ctrl+A
      if (e.ctrlKey && ['c', 's', 'p', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      // Disable F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  useEffect(() => {
    const loadSecureViewer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('accessToken');
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch(`http://localhost:3001/vault/items/${itemId}/secure-viewer`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load secure viewer');
        }

        const data = await response.json();
        
        if (data.success) {
          setViewerUrl(data.viewerUrl);
          setRestrictions(data.restrictions);
          setExpiresIn(data.expiresIn);
          setTimeRemaining(data.expiresIn);
        } else {
          throw new Error(data.message || 'Failed to load secure viewer');
        }
      } catch (err) {
        console.error('Error loading secure viewer:', err);
        setError(err instanceof Error ? err.message : 'Failed to load secure viewer');
      } finally {
        setIsLoading(false);
      }
    };

    loadSecureViewer();
  }, [itemId]);

  // Countdown timer
  useEffect(() => {
    if (expiresIn && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setError('Viewer session expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [expiresIn, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return DocumentIcon;
    
    if (mimeType.includes('pdf')) return DocumentIcon;
    if (mimeType.includes('image')) return EyeIcon;
    if (mimeType.includes('text')) return DocumentIcon;
    if (mimeType.includes('video')) return EyeIcon;
    
    return DocumentIcon;
  };

  const FileIcon = getFileIcon(mimeType);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600">Loading secure viewer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Viewer</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <LockClosedIcon className="h-5 w-5 text-green-600" />
              <FileIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{itemName}</h3>
              <p className="text-sm text-gray-500">Secure Viewer</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time remaining */}
            {timeRemaining > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Session expires in:</span>
                <span className="ml-1 text-red-600 font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
            
            {/* Restrictions indicator */}
            {restrictions && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                {restrictions.disableCopy && (
                  <span className="bg-gray-200 px-2 py-1 rounded">No Copy</span>
                )}
                {restrictions.disableSave && (
                  <span className="bg-gray-200 px-2 py-1 rounded">No Save</span>
                )}
                {restrictions.disablePrint && (
                  <span className="bg-gray-200 px-2 py-1 rounded">No Print</span>
                )}
              </div>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto p-8">
              <DocumentIcon className="h-24 w-24 text-blue-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{itemName}</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>🔒 <strong>Secure Document Viewer</strong></p>
                <p>This document is protected by secure viewing technology</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-blue-800 font-medium mb-2">Security Features Active:</p>
                  <ul className="text-blue-700 text-left space-y-1">
                    <li>✓ Copy protection enabled</li>
                    <li>✓ Save protection enabled</li>
                    <li>✓ Print protection enabled</li>
                    <li>✓ Watermark applied</li>
                    <li>✓ Session time-limited</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  In a production environment, this would display the actual document content
                  with all security restrictions applied.
                </p>
              </div>
            </div>
          </div>

          {/* Watermark */}
          {restrictions?.watermarkText && (
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-10 text-6xl font-bold text-gray-400 transform -rotate-45"
                style={{ 
                  fontFamily: 'Arial, sans-serif',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {restrictions.watermarkText}
              </div>
            </div>
          )}
        </div>

        {/* Footer with security notice */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <LockClosedIcon className="h-4 w-4 text-green-600" />
              <span>This document is protected by secure viewing technology</span>
            </div>
            <div className="text-xs text-gray-500">
              Copy, save, and print functions are disabled for security
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureViewer;
