import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { AutoTag } from '../../services/ocrApi';

interface TagChipsProps {
  tags: AutoTag[];
  onRemoveTag?: (tagId: string) => void;
  onTagClick?: (tag: string) => void;
  showConfidence?: boolean;
  maxDisplay?: number;
  className?: string;
}

const TagChips: React.FC<TagChipsProps> = ({
  tags,
  onRemoveTag,
  onTagClick,
  showConfidence = false,
  maxDisplay = 10,
  className = ''
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'legal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'personal':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial':
        return '💰';
      case 'legal':
        return '⚖️';
      case 'medical':
        return '🏥';
      case 'personal':
        return '👤';
      default:
        return '📄';
    }
  };

  const displayedTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayedTags.map((tag) => (
        <div
          key={tag.id}
          className={`
            inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border
            ${getCategoryColor(tag.category)}
            ${onTagClick ? 'cursor-pointer hover:opacity-80' : ''}
            ${onRemoveTag ? 'pr-1' : ''}
          `}
          onClick={() => onTagClick?.(tag.tag)}
          title={showConfidence ? `Confidence: ${(tag.confidence * 100).toFixed(1)}%` : undefined}
        >
          <span className="text-xs">{getCategoryIcon(tag.category)}</span>
          <span>{tag.tag}</span>
          {showConfidence && (
            <span className="text-xs opacity-75">
              ({(tag.confidence * 100).toFixed(0)}%)
            </span>
          )}
          {onRemoveTag && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTag(tag.id);
              }}
              className="ml-1 p-0.5 hover:bg-black hover:bg-opacity-10 rounded-full"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
          +{remainingCount} more
        </div>
      )}
    </div>
  );
};

export default TagChips;

