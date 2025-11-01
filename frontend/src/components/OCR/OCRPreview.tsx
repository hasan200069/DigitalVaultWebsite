import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  ClipboardDocumentIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { ocrApiService, type RedactionSuggestion } from '../../services/ocrApi';
import RedactionSuggestionComponent from './RedactionSuggestion';

interface OCRPreviewProps {
  itemId: string;
  className?: string;
}

const OCRPreview: React.FC<OCRPreviewProps> = ({
  itemId,
  className = ''
}) => {
  const [ocrText, setOcrText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOCR, setShowOCR] = useState(false);
  const [redactionSuggestions, setRedactionSuggestions] = useState<RedactionSuggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOCRData();
  }, [itemId]);

  const loadOCRData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load OCR text
      const ocrResponse = await ocrApiService.getOCRText(itemId);
      if (ocrResponse.success && ocrResponse.extractedText) {
        setOcrText(ocrResponse.extractedText);
        setConfidence(ocrResponse.confidence || 0);
      }

      // Load redaction suggestions
      const suggestionsResponse = await ocrApiService.getRedactionSuggestions(itemId);
      if (suggestionsResponse.success && suggestionsResponse.suggestions) {
        setRedactionSuggestions(suggestionsResponse.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OCR data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(ocrText);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRedact = (suggestionIds: string[]) => {
    // Apply redactions to the OCR text
    let redactedText = ocrText;
    const suggestionsToRedact = redactionSuggestions.filter(s => suggestionIds.includes(s.id));
    
    // Sort by start index in descending order to avoid index shifting issues
    suggestionsToRedact.sort((a, b) => b.startIndex - a.startIndex);
    
    for (const suggestion of suggestionsToRedact) {
      const before = redactedText.substring(0, suggestion.startIndex);
      const after = redactedText.substring(suggestion.endIndex);
      const redacted = '*'.repeat(suggestion.text.length);
      redactedText = before + redacted + after;
    }
    
    setOcrText(redactedText);
    
    // Remove redacted suggestions from the list
    setRedactionSuggestions(prev => 
      prev.filter(s => !suggestionIds.includes(s.id))
    );
  };

  const handleDismiss = (suggestionIds: string[]) => {
    // Remove dismissed suggestions from the list
    setRedactionSuggestions(prev => 
      prev.filter(s => !suggestionIds.includes(s.id))
    );
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading OCR data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!ocrText) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-gray-500 text-sm">
          No OCR data available for this document.
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">OCR Text</h3>
          <span className="text-xs text-gray-500">
            ({(confidence * 100).toFixed(1)}% confidence)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOCR(!showOCR)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            {showOCR ? (
              <>
                <EyeSlashIcon className="h-4 w-4" />
                Hide OCR
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4" />
                Show OCR
              </>
            )}
          </button>
          
          {showOCR && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showOCR && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search in OCR text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Redaction Suggestions */}
      {redactionSuggestions.length > 0 && (
        <RedactionSuggestionComponent
          suggestions={redactionSuggestions}
          onRedact={handleRedact}
          onDismiss={handleDismiss}
        />
      )}

      {/* OCR Text Content */}
      {showOCR && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {searchTerm ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: highlightSearchTerm(ocrText, searchTerm) 
                }} 
              />
            ) : (
              ocrText
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRPreview;
