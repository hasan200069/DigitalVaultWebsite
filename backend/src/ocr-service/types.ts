// OCR Service Types

export interface OCRResult {
  id: string;
  itemId: string;
  extractedText: string;
  confidence: number;
  processingTime: number;
  createdAt: string;
}

export interface AutoTag {
  id: string;
  itemId: string;
  tag: string;
  category: 'financial' | 'legal' | 'medical' | 'personal' | 'other';
  confidence: number;
  createdAt: string;
}

export interface RedactionSuggestion {
  id: string;
  itemId: string;
  type: 'ssn' | 'credit_card' | 'bank_account' | 'phone' | 'email' | 'address';
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  createdAt: string;
}

export interface ProcessOCRRequest {
  itemId: string;
  version?: number;
  // Security: Add encrypted blob and decryption parameters
  encryptedFileData?: {
    data: string; // base64 encoded encrypted file
    iv: string; // base64 encoded IV
  };
  encryptedCek?: {
    ciphertext: string; // base64 encoded encrypted CEK
    iv: string; // base64 encoded IV
  };
}

export interface ProcessOCRResponse {
  success: boolean;
  message: string;
  ocrResult?: OCRResult;
  autoTags?: AutoTag[];
  redactionSuggestions?: RedactionSuggestion[];
  // Security: Return encrypted results
  encryptedOCRResult?: {
    encryptedText: string; // base64 encoded encrypted OCR text
    iv: string; // base64 encoded IV
  };
}

export interface GetOCRTextRequest {
  itemId: string;
  version?: number;
}

export interface GetOCRTextResponse {
  success: boolean;
  message: string;
  extractedText?: string;
  confidence?: number;
}

export interface GetAutoTagsRequest {
  itemId: string;
}

export interface GetAutoTagsResponse {
  success: boolean;
  message: string;
  tags?: AutoTag[];
}

export interface GetRedactionSuggestionsRequest {
  itemId: string;
}

export interface GetRedactionSuggestionsResponse {
  success: boolean;
  message: string;
  suggestions?: RedactionSuggestion[];
}

export interface ApplyRedactionRequest {
  itemId: string;
  redactionIds: string[];
}

export interface ApplyRedactionResponse {
  success: boolean;
  message: string;
  redactedText?: string;
}

export interface StoreOCRResultsRequest {
  itemId: string;
  ocrResult: {
    extractedText: string;
    confidence: number;
    processingTime: number;
  };
  autoTags: Array<{
    tag: string;
    category: 'financial' | 'legal' | 'medical' | 'personal' | 'other';
    confidence: number;
  }>;
  redactionSuggestions: Array<{
    type: 'ssn' | 'credit_card' | 'bank_account' | 'phone' | 'email' | 'address';
    text: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
}

export interface StoreOCRResultsResponse {
  success: boolean;
  message: string;
}

