// OCR API service for frontend
import { getAccessToken } from '../utils/auth';

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
}

export interface ProcessOCRResponse {
  success: boolean;
  message: string;
  ocrResult?: OCRResult;
  autoTags?: AutoTag[];
  redactionSuggestions?: RedactionSuggestion[];
}

export interface GetOCRTextResponse {
  success: boolean;
  message: string;
  extractedText?: string;
  confidence?: number;
}

export interface GetAutoTagsResponse {
  success: boolean;
  message: string;
  tags?: AutoTag[];
}

export interface GetRedactionSuggestionsResponse {
  success: boolean;
  message: string;
  suggestions?: RedactionSuggestion[];
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

class OCRApiService {
  private baseUrl = 'http://localhost:3001/ocr';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'OCR API request failed');
    }

    return response.json();
  }

  // Process OCR for a document
  async processOCR(
    itemId: string, 
    version?: number,
    encryptedFileData?: { data: string; iv: string },
    encryptedCek?: { ciphertext: string; iv: string },
    decryptedCekKey?: string
  ): Promise<ProcessOCRResponse> {
    const requestBody: any = { itemId, version };
    
    // Add encrypted blob data if provided (for secure backend processing)
    if (encryptedFileData && encryptedCek) {
      requestBody.encryptedFileData = encryptedFileData;
      requestBody.encryptedCek = encryptedCek;
      if (decryptedCekKey) {
        requestBody.decryptedCekKey = decryptedCekKey;
      }
    }
    
    return this.makeRequest<ProcessOCRResponse>('/process', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // Get OCR text for an item
  async getOCRText(itemId: string): Promise<GetOCRTextResponse> {
    return this.makeRequest<GetOCRTextResponse>(`/${itemId}/text`);
  }

  // Get auto-tags for an item
  async getAutoTags(itemId: string): Promise<GetAutoTagsResponse> {
    return this.makeRequest<GetAutoTagsResponse>(`/${itemId}/tags`);
  }

  // Get redaction suggestions for an item
  async getRedactionSuggestions(itemId: string): Promise<GetRedactionSuggestionsResponse> {
    return this.makeRequest<GetRedactionSuggestionsResponse>(`/${itemId}/redaction-suggestions`);
  }

  // Store client-side OCR results
  async storeOCRResults(request: StoreOCRResultsRequest): Promise<StoreOCRResultsResponse> {
    return this.makeRequest<StoreOCRResultsResponse>('/store', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const ocrApiService = new OCRApiService();

