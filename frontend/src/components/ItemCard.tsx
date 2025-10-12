import React, { useState } from 'react';
import { 
  DocumentTextIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  TagIcon,
  ShieldCheckIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import SecureViewer from './SecureViewer';

interface VaultItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  isEncrypted: boolean;
  fileSize?: number;
  mimeType?: string;
  fileExtension?: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  item: VaultItem;
  relevanceScore?: number;
  matchedFields?: string[];
  snippet?: string;
}

interface ItemCardProps {
  result: SearchResult;
  onDownload?: (item: VaultItem) => void;
  onView?: (item: VaultItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ result, onDownload, onView }) => {
  const [showSecureViewer, setShowSecureViewer] = useState(false);
  const { item, relevanceScore, matchedFields, snippet } = result;

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return DocumentIcon;
    
    if (mimeType.includes('pdf')) return DocumentTextIcon;
    if (mimeType.includes('image/')) return PhotoIcon;
    if (mimeType.includes('video/')) return VideoCameraIcon;
    if (mimeType.includes('audio/')) return MusicalNoteIcon;
    if (mimeType.includes('application/zip') || mimeType.includes('application/x-rar')) return ArchiveBoxIcon;
    
    return DocumentIcon;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelevanceColor = (score?: number): string => {
    if (!score) return 'bg-gray-100 text-gray-600';
    
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  };

  const FileIcon = getFileIcon(item.mimeType);

  const handleView = () => {
    setShowSecureViewer(true);
    if (onView) onView(item);
  };

  const handleDownload = () => {
    if (onDownload) onDownload(item);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  
                  {item.isEncrypted && (
                    <ShieldCheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                  
                  {relevanceScore && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRelevanceColor(relevanceScore)}`}>
                      {Math.round(relevanceScore)}% match
                    </span>
                  )}
                </div>
                
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}
                
                {snippet && (
                  <div className="bg-gray-50 rounded-md p-2 mb-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Match:</span> {snippet}
                    </p>
                    {matchedFields && (
                      <p className="text-xs text-gray-500 mt-1">
                        Found in: {matchedFields.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleView}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View securely"
              >
                <EyeIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {formatDate(item.createdAt)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <DocumentIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {formatFileSize(item.fileSize)}
              </span>
            </div>
            
            {item.category && (
              <div className="flex items-center space-x-2">
                <TagIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {item.category}
                </span>
              </div>
            )}
            
            {item.mimeType && (
              <div className="flex items-center space-x-2">
                <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 text-xs">
                  {item.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Version info */}
          {item.currentVersion > 1 && (
            <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
              <ClockIcon className="w-4 h-4" />
              <span>Version {item.currentVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Secure Viewer Modal */}
      {showSecureViewer && (
        <SecureViewer
          itemId={item.id}
          itemName={item.name}
          mimeType={item.mimeType}
          onClose={() => setShowSecureViewer(false)}
        />
      )}
    </>
  );
};

export default ItemCard;
