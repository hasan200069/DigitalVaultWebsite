import { createWorker } from 'tesseract.js';

export interface OCRResult {
  extractedText: string;
  confidence: number;
  processingTime: number;
}

export interface AutoTag {
  tag: string;
  category: 'financial' | 'legal' | 'medical' | 'personal' | 'other';
  confidence: number;
}

export interface RedactionSuggestion {
  type: 'ssn' | 'credit_card' | 'bank_account' | 'phone' | 'email' | 'address';
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface ClientOCRResponse {
  success: boolean;
  message: string;
  ocrResult?: OCRResult;
  autoTags?: AutoTag[];
  redactionSuggestions?: RedactionSuggestion[];
  // Flag to indicate backend fallback is needed
  backendFallbackNeeded?: boolean;
}

// Sensitive data patterns
const SENSITIVE_PATTERNS = {
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  bank_account: /\b\d{8,17}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi
};

// Auto-tagging patterns
const TAG_PATTERNS = {
  financial: [
    'bank statement', 'account balance', 'transaction', 'deposit', 'withdrawal',
    'credit card', 'loan', 'mortgage', 'investment', 'tax return', 'w2', '1099',
    'banking', 'finance', 'payment', 'receipt', 'invoice', 'billing'
  ],
  legal: [
    'contract', 'agreement', 'will', 'trust', 'power of attorney', 'deed',
    'lease', 'license', 'permit', 'court', 'legal', 'attorney', 'lawyer',
    'legal document', 'terms and conditions', 'privacy policy'
  ],
  medical: [
    'medical', 'health', 'insurance', 'prescription', 'doctor', 'hospital',
    'diagnosis', 'treatment', 'medication', 'healthcare', 'clinic',
    'medical record', 'health record', 'patient', 'physician'
  ],
  personal: [
    'birth certificate', 'passport', 'driver license', 'id card', 'social security',
    'marriage certificate', 'divorce', 'death certificate', 'family',
    'identification', 'personal document', 'certificate'
  ]
};

// Helper function to generate auto-tags
function generateAutoTags(text: string): AutoTag[] {
  const tags: AutoTag[] = [];
  const lowerText = text.toLowerCase();

  for (const [category, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        tags.push({
          tag: pattern,
          category: category as AutoTag['category'],
          confidence: 0.8 // Base confidence
        });
      }
    }
  }

  // Remove duplicates
  const uniqueTags = tags.filter((tag, index, self) => 
    index === self.findIndex(t => t.tag === tag.tag)
  );

  return uniqueTags;
}

// Helper function to detect sensitive data
function detectSensitiveData(text: string): RedactionSuggestion[] {
  const suggestions: RedactionSuggestion[] = [];

  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    let match;
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      suggestions.push({
        type: type as RedactionSuggestion['type'],
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9 // High confidence for pattern matches
      });
    }
  }

  return suggestions;
}

// Supported file types for OCR
const SUPPORTED_TYPES = [
  'image/jpeg', 
  'image/jpg',  // Some systems use jpg instead of jpeg
  'image/png', 
  'image/webp', // WebP format support
  'image/tiff', 
  'image/tif',   // Some systems use tif instead of tiff
  'application/pdf'
];

export const clientOCRService = {
  // Check if file type is supported for OCR
  isSupported(file: File): boolean {
    // Check MIME type first
    let isSupported = SUPPORTED_TYPES.includes(file.type);
    
    // If MIME type check fails, check file extension
    if (!isSupported && file.name) {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'pdf'];
      isSupported = supportedExtensions.includes(fileExtension || '');
    }
    
    console.log('ClientOCRService.isSupported check:', {
      fileName: file.name,
      fileType: file.type,
      fileExtension: file.name?.toLowerCase().split('.').pop(),
      supportedTypes: SUPPORTED_TYPES,
      isSupported: isSupported
    });
    return isSupported;
  },

  // Process OCR on a file
  async processOCR(file: File): Promise<ClientOCRResponse> {
    try {
      console.log('processOCR called with file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      if (!this.isSupported(file)) {
        console.warn('File type not supported for OCR:', file.type);
        return {
          success: false,
          message: 'File type not supported for OCR processing'
        };
      }

      console.log('Starting client-side OCR processing for:', file.name);
      console.log('Tesseract createWorker available:', typeof createWorker);
      
      const startTime = Date.now();

      // Process OCR with Tesseract Worker
      console.log('About to create Tesseract worker...');
      
      if (!createWorker || typeof createWorker !== 'function') {
        throw new Error('Tesseract.js createWorker not properly loaded');
      }

      const worker = await createWorker('eng');
      console.log('Tesseract worker created successfully');

      const result = await worker.recognize(file);
      console.log('OCR recognition completed');
      
      await worker.terminate();
      console.log('Tesseract worker terminated');

      const processingTime = Date.now() - startTime;
      const extractedText = result.data.text;
      const confidence = result.data.confidence / 100; // Convert to 0-1 scale

      console.log('OCR completed:', {
        textLength: extractedText.length,
        confidence: confidence,
        processingTime: processingTime
      });

      // Generate auto-tags
      const autoTags = generateAutoTags(extractedText);

      // Detect sensitive data
      const redactionSuggestions = detectSensitiveData(extractedText);

      console.log('Generated auto-tags:', autoTags);
      console.log('Found sensitive data:', redactionSuggestions);

      return {
        success: true,
        message: 'OCR processing completed successfully',
        ocrResult: {
          extractedText,
          confidence,
          processingTime
        },
        autoTags,
        redactionSuggestions
      };

    } catch (error) {
      console.error('Client-side OCR processing failed:', error);
      return {
        success: false,
        message: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};

