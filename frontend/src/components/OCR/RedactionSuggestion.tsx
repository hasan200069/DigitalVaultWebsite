import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { RedactionSuggestion as RedactionSuggestionType } from '../../services/ocrApi';

interface RedactionSuggestionProps {
  suggestions: RedactionSuggestionType[];
  onRedact: (suggestionIds: string[]) => void;
  onDismiss: (suggestionIds: string[]) => void;
  className?: string;
}

const RedactionSuggestion: React.FC<RedactionSuggestionProps> = ({
  suggestions,
  onRedact,
  onDismiss,
  className = ''
}) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ssn':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'credit_card':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'bank_account':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'phone':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'email':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'address':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ssn':
        return '🆔';
      case 'credit_card':
        return '💳';
      case 'bank_account':
        return '🏦';
      case 'phone':
        return '📞';
      case 'email':
        return '📧';
      case 'address':
        return '🏠';
      default:
        return '⚠️';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ssn':
        return 'Social Security Number';
      case 'credit_card':
        return 'Credit Card Number';
      case 'bank_account':
        return 'Bank Account Number';
      case 'phone':
        return 'Phone Number';
      case 'email':
        return 'Email Address';
      case 'address':
        return 'Address';
      default:
        return 'Sensitive Data';
    }
  };

  const toggleSelection = (suggestionId: string) => {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(suggestionId)) {
      newSelection.delete(suggestionId);
    } else {
      newSelection.add(suggestionId);
    }
    setSelectedSuggestions(newSelection);
  };

  const toggleDetails = (suggestionId: string) => {
    const newDetails = new Set(showDetails);
    if (newDetails.has(suggestionId)) {
      newDetails.delete(suggestionId);
    } else {
      newDetails.add(suggestionId);
    }
    setShowDetails(newDetails);
  };

  const handleRedactSelected = () => {
    onRedact(Array.from(selectedSuggestions));
    setSelectedSuggestions(new Set());
  };

  const handleDismissSelected = () => {
    onDismiss(Array.from(selectedSuggestions));
    setSelectedSuggestions(new Set());
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
        <h3 className="text-sm font-medium text-yellow-800">
          Sensitive Data Detected ({suggestions.length})
        </h3>
      </div>

      <div className="space-y-2 mb-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`
              flex items-center gap-3 p-3 rounded-lg border
              ${selectedSuggestions.has(suggestion.id) 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-white border-gray-200'
              }
            `}
          >
            <input
              type="checkbox"
              checked={selectedSuggestions.has(suggestion.id)}
              onChange={() => toggleSelection(suggestion.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {getTypeLabel(suggestion.type)}
                </span>
                <span className="text-xs text-gray-500">
                  ({(suggestion.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
              
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {showDetails.has(suggestion.id) ? suggestion.text : '••••••••••••••••'}
                </span>
                <button
                  onClick={() => toggleDetails(suggestion.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {showDetails.has(suggestion.id) ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleRedactSelected}
          disabled={selectedSuggestions.size === 0}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Redact Selected ({selectedSuggestions.size})
        </button>
        <button
          onClick={handleDismissSelected}
          disabled={selectedSuggestions.size === 0}
          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Dismiss Selected ({selectedSuggestions.size})
        </button>
      </div>
    </div>
  );
};

export default RedactionSuggestion;

