import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import { logAuditEvent } from '../audit-service/auditService';
import { AuditAction, ResourceType } from '../audit-service/types';
import { 
  ProcessOCRRequest, 
  ProcessOCRResponse,
  GetOCRTextRequest,
  GetOCRTextResponse,
  GetAutoTagsRequest,
  GetAutoTagsResponse,
  GetRedactionSuggestionsRequest,
  GetRedactionSuggestionsResponse,
  ApplyRedactionRequest,
  ApplyRedactionResponse,
  StoreOCRResultsRequest,
  StoreOCRResultsResponse,
  OCRResult,
  AutoTag,
  RedactionSuggestion
} from './types';
import { downloadFileFromMinIO } from '../vault-service/minioClient';
import crypto from 'crypto';
import Tesseract from 'tesseract.js';

// Encryption utilities for secure OCR processing
const ALGORITHM = 'aes-256-gcm';

interface EncryptionResult {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
}

interface DecryptionResult {
  decrypted: Buffer;
}

/**
 * Decrypt data using AES-256-GCM
 */
const decryptData = (
  encryptedData: Buffer, 
  key: Buffer, 
  iv: Buffer, 
  tag: Buffer
): Buffer => {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ]);
  
  return decrypted;
};

/**
 * Encrypt data using AES-256-GCM
 */
const encryptData = (data: Buffer, key: Buffer): EncryptionResult => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return { encrypted, iv, tag };
};

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
    'credit card', 'loan', 'mortgage', 'investment', 'tax return', 'w2', '1099'
  ],
  legal: [
    'contract', 'agreement', 'will', 'trust', 'power of attorney', 'deed',
    'lease', 'license', 'permit', 'court', 'legal', 'attorney', 'lawyer'
  ],
  medical: [
    'medical', 'health', 'insurance', 'prescription', 'doctor', 'hospital',
    'diagnosis', 'treatment', 'medication', 'healthcare', 'clinic'
  ],
  personal: [
    'birth certificate', 'passport', 'driver license', 'id card', 'social security',
    'marriage certificate', 'divorce', 'death certificate', 'family'
  ]
};

// Process OCR for a document
export const processOCR = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as ProcessOCRResponse);
      return;
    }

    const { itemId, version = 1, encryptedFileData, encryptedCek }: ProcessOCRRequest = req.body;

    if (!itemId) {
      res.status(400).json({
        success: false,
        message: 'Item ID is required'
      } as ProcessOCRResponse);
      return;
    }

    // Check if item exists and user has access
    const itemResult = await query(
      'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      } as ProcessOCRResponse);
      return;
    }

    const item = itemResult.rows[0];

    // Check if OCR already exists
    const existingOCR = await query(
      'SELECT * FROM ocr_results WHERE item_id = $1',
      [itemId]
    );

    if (existingOCR.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'OCR already processed for this item'
      } as ProcessOCRResponse);
      return;
    }

    // Security: Handle encrypted blob processing as per documentation requirements
    let fileBuffer: Buffer;
    
    if (encryptedFileData && encryptedCek) {
      // SECURE PATH: Process encrypted blob with client-provided decryption keys
      console.log('OCR: Processing encrypted blob with client-provided decryption keys');
      
      try {
        // Decode base64 encrypted data
        const encryptedFileBuffer = Buffer.from(encryptedFileData.data, 'base64');
        const fileIV = Buffer.from(encryptedFileData.iv, 'base64');
        
        // Decode base64 encrypted CEK
        const encryptedCekBuffer = Buffer.from(encryptedCek.ciphertext, 'base64');
        const cekIV = Buffer.from(encryptedCek.iv, 'base64');
        
        // Note: In a real implementation, you'd need the VMK to decrypt the CEK
        // For now, we'll assume the client provides the decrypted CEK key
        // This is a security gap that needs to be addressed with proper key management
        
        // For demonstration, we'll assume CEK is provided directly
        // In production, this should be properly decrypted using VMK
        if (req.body.decryptedCekKey) {
          const cekKey = Buffer.from(req.body.decryptedCekKey, 'base64');
          
          // Decrypt CEK first (this would normally use VMK)
          // For now, assuming direct CEK usage for OCR processing
          
          // Decrypt file data
          // Note: This is simplified - in production you need proper GCM tag handling
          const decipher = crypto.createDecipheriv('aes-256-gcm', cekKey, fileIV);
          
          // Extract tag from encrypted data (last 16 bytes for GCM)
          const tagLength = 16;
          const actualEncryptedData = encryptedFileBuffer.slice(0, -tagLength);
          const tag = encryptedFileBuffer.slice(-tagLength);
          
          decipher.setAuthTag(tag);
          
          fileBuffer = Buffer.concat([
            decipher.update(actualEncryptedData),
            decipher.final()
          ]);
          
          console.log('OCR: Successfully decrypted encrypted blob for OCR processing');
        } else {
          throw new Error('Decrypted CEK key required for secure OCR processing');
        }
      } catch (error) {
        console.error('OCR: Failed to decrypt encrypted blob:', error);
        res.status(400).json({
          success: false,
          message: 'Failed to decrypt encrypted file data'
        } as ProcessOCRResponse);
        return;
      }
    } else {
      // FALLBACK PATH: Legacy unencrypted file processing (should be phased out for security)
      console.log('OCR: WARNING - Processing unencrypted file (legacy mode)');
      
      const versionResult = await query(
        'SELECT file_path FROM vault_item_versions WHERE item_id = $1 ORDER BY version_number DESC LIMIT 1',
        [itemId]
      );

      if (versionResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'File version not found'
        } as ProcessOCRResponse);
        return;
      }

      const filePath = versionResult.rows[0].file_path;
      
      try {
        fileBuffer = await downloadFileFromMinIO(filePath);
      } catch (error) {
        console.error('OCR: Failed to download file:', error);
        res.status(404).json({
          success: false,
          message: 'File not found in storage'
        } as ProcessOCRResponse);
        return;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        res.status(404).json({
          success: false,
          message: 'File not found in storage or empty file'
        } as ProcessOCRResponse);
        return;
      }
    }

    // Process OCR with Tesseract
    const startTime = Date.now();
    let text: string;
    let confidence: number;
    
    try {
      console.log('OCR: Starting Tesseract recognition...');
      const result = await Tesseract.recognize(
        fileBuffer,
        'eng',
        {
          logger: m => console.log('OCR Progress:', m)
        }
      );
      text = result.data.text;
      confidence = result.data.confidence;
      console.log('OCR: Recognition completed, text length:', text.length, 'confidence:', confidence);
    } catch (ocrError) {
      console.error('OCR: Tesseract recognition failed:', ocrError);
      throw new Error(`OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`);
    }
    
    const processingTime = Date.now() - startTime;

    // Generate auto-tags
    const autoTags = generateAutoTags(text);

    // Detect sensitive data
    const redactionSuggestions = detectSensitiveData(text);

    // Store OCR result
    const ocrId = crypto.randomUUID();
    await query(
      `INSERT INTO ocr_results (id, item_id, extracted_text, confidence, processing_time, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [ocrId, itemId, text, confidence, processingTime]
    );

    // Store auto-tags
    for (const tag of autoTags) {
      const tagId = crypto.randomUUID();
      await query(
        `INSERT INTO auto_tags (id, item_id, tag, category, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [tagId, itemId, tag.tag, tag.category, tag.confidence]
      );
    }

    // Store redaction suggestions
    for (const suggestion of redactionSuggestions) {
      const suggestionId = crypto.randomUUID();
      await query(
        `INSERT INTO redaction_suggestions (id, item_id, type, text, start_index, end_index, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [suggestionId, itemId, suggestion.type, suggestion.text, suggestion.startIndex, suggestion.endIndex, suggestion.confidence]
      );
    }

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.OCR_PROCESSED,
      ResourceType.VAULT_ITEM,
      itemId,
      { confidence, processingTime, tagsCount: autoTags.length, suggestionsCount: redactionSuggestions.length },
      itemId
    );

    // Security: Return encrypted OCR results as per documentation requirements
    let encryptedOCRResult = undefined;
    if (encryptedFileData && encryptedCek && req.body.encryptionKey) {
      try {
        // Encrypt the OCR text before sending back to client
        const textBuffer = Buffer.from(text, 'utf8');
        const encryptionKey = Buffer.from(req.body.encryptionKey, 'base64');
        const encryptionResult = encryptData(textBuffer, encryptionKey);
        
        encryptedOCRResult = {
          encryptedText: encryptionResult.encrypted.toString('base64'),
          iv: encryptionResult.iv.toString('base64')
        };
        
        console.log('OCR: Returning encrypted OCR results to client');
      } catch (error) {
        console.error('OCR: Failed to encrypt OCR results:', error);
        // Fallback to unencrypted results for backward compatibility
      }
    }

    res.json({
      success: true,
      message: 'OCR processing completed successfully',
      ocrResult: {
        id: ocrId,
        itemId,
        extractedText: text, // Keep for backward compatibility, but prefer encryptedOCRResult
        confidence,
        processingTime,
        createdAt: new Date().toISOString()
      },
      encryptedOCRResult, // Security: Encrypted OCR text as per documentation
      autoTags: autoTags.map(tag => ({
        id: crypto.randomUUID(),
        itemId,
        tag: tag.tag,
        category: tag.category,
        confidence: tag.confidence,
        createdAt: new Date().toISOString()
      })),
      redactionSuggestions: redactionSuggestions.map(suggestion => ({
        id: crypto.randomUUID(),
        itemId,
        type: suggestion.type,
        text: suggestion.text,
        startIndex: suggestion.startIndex,
        endIndex: suggestion.endIndex,
        confidence: suggestion.confidence,
        createdAt: new Date().toISOString()
      }))
    } as ProcessOCRResponse);

  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR processing failed'
    } as ProcessOCRResponse);
  }
};

// Get OCR text for an item
export const getOCRText = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { itemId } = req.params;

    // Check if user has access to the item
    const itemResult = await query(
      'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      } as GetOCRTextResponse);
      return;
    }

    // Get OCR result
    const ocrResult = await query(
      'SELECT * FROM ocr_results WHERE item_id = $1',
      [itemId]
    );

    if (ocrResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'OCR not processed for this item'
      } as GetOCRTextResponse);
      return;
    }

    const ocr = ocrResult.rows[0];

    res.json({
      success: true,
      message: 'OCR text retrieved successfully',
      extractedText: ocr.extracted_text,
      confidence: ocr.confidence
    } as GetOCRTextResponse);

  } catch (error) {
    console.error('Get OCR text error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve OCR text'
    } as GetOCRTextResponse);
  }
};

// Get auto-tags for an item
export const getAutoTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { itemId } = req.params;

    // Check if user has access to the item
    const itemResult = await query(
      'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      } as GetAutoTagsResponse);
      return;
    }

    // Get auto-tags
    const tagsResult = await query(
      'SELECT * FROM auto_tags WHERE item_id = $1 ORDER BY confidence DESC',
      [itemId]
    );

    const tags = tagsResult.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      tag: row.tag,
      category: row.category,
      confidence: row.confidence,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      message: 'Auto-tags retrieved successfully',
      tags
    } as GetAutoTagsResponse);

  } catch (error) {
    console.error('Get auto-tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve auto-tags'
    } as GetAutoTagsResponse);
  }
};

// Get redaction suggestions for an item
export const getRedactionSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { itemId } = req.params;

    // Check if user has access to the item
    const itemResult = await query(
      'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      } as GetRedactionSuggestionsResponse);
      return;
    }

    // Get redaction suggestions
    const suggestionsResult = await query(
      'SELECT * FROM redaction_suggestions WHERE item_id = $1 ORDER BY confidence DESC',
      [itemId]
    );

    const suggestions = suggestionsResult.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      type: row.type,
      text: row.text,
      startIndex: row.start_index,
      endIndex: row.end_index,
      confidence: row.confidence,
      createdAt: row.created_at
    }));

    res.json({
      success: true,
      message: 'Redaction suggestions retrieved successfully',
      suggestions
    } as GetRedactionSuggestionsResponse);

  } catch (error) {
    console.error('Get redaction suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve redaction suggestions'
    } as GetRedactionSuggestionsResponse);
  }
};

// Helper function to generate auto-tags
function generateAutoTags(text: string): Array<{ tag: string; category: string; confidence: number }> {
  const tags: Array<{ tag: string; category: string; confidence: number }> = [];
  const lowerText = text.toLowerCase();

  for (const [category, patterns] of Object.entries(TAG_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern)) {
        tags.push({
          tag: pattern,
          category,
          confidence: 0.8 // Base confidence
        });
      }
    }
  }

  return tags;
}

// Helper function to detect sensitive data
function detectSensitiveData(text: string): Array<{
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}> {
  const suggestions: Array<{
    type: string;
    text: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }> = [];

  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      suggestions.push({
        type,
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9 // High confidence for pattern matches
      });
    }
  }

  return suggestions;
}

// Store client-side OCR results in the database
export const storeOCRResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    
    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as StoreOCRResultsResponse);
      return;
    }

    const { itemId, ocrResult, autoTags, redactionSuggestions }: StoreOCRResultsRequest = req.body;

    if (!itemId || !ocrResult) {
      res.status(400).json({
        success: false,
        message: 'Item ID and OCR result are required'
      } as StoreOCRResultsResponse);
      return;
    }

    // Check if item exists and user has access
    const itemResult = await query(
      'SELECT * FROM vault_items WHERE id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found or access denied'
      } as StoreOCRResultsResponse);
      return;
    }

    // Check if OCR already exists for this item
    const existingOCR = await query(
      'SELECT * FROM ocr_results WHERE item_id = $1',
      [itemId]
    );

    // If OCR already exists, update it; otherwise, create new
    const ocrId = existingOCR.rows.length > 0 ? existingOCR.rows[0].id : crypto.randomUUID();
    
    if (existingOCR.rows.length > 0) {
      // Update existing OCR result
      await query(
        `UPDATE ocr_results 
         SET extracted_text = $1, confidence = $2, processing_time = $3, created_at = NOW()
         WHERE id = $4`,
        [ocrResult.extractedText, ocrResult.confidence, ocrResult.processingTime, ocrId]
      );
    } else {
      // Insert new OCR result
      await query(
        `INSERT INTO ocr_results (id, item_id, extracted_text, confidence, processing_time, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [ocrId, itemId, ocrResult.extractedText, ocrResult.confidence, ocrResult.processingTime]
      );
    }

    // Clear existing auto-tags and insert new ones
    await query('DELETE FROM auto_tags WHERE item_id = $1', [itemId]);
    
    if (autoTags && autoTags.length > 0) {
      for (const tag of autoTags) {
        const tagId = crypto.randomUUID();
        await query(
          `INSERT INTO auto_tags (id, item_id, tag, category, confidence, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [tagId, itemId, tag.tag, tag.category, tag.confidence]
        );
      }
    }

    // Clear existing redaction suggestions and insert new ones
    await query('DELETE FROM redaction_suggestions WHERE item_id = $1', [itemId]);
    
    if (redactionSuggestions && redactionSuggestions.length > 0) {
      for (const suggestion of redactionSuggestions) {
        const suggestionId = crypto.randomUUID();
        await query(
          `INSERT INTO redaction_suggestions (id, item_id, type, text, start_index, end_index, confidence, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [suggestionId, itemId, suggestion.type, suggestion.text, suggestion.startIndex, suggestion.endIndex, suggestion.confidence]
        );
      }
    }

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.OCR_PROCESSED,
      ResourceType.VAULT_ITEM,
      itemId,
      { 
        processingMethod: 'client-side',
        textLength: ocrResult.extractedText.length,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime
      },
      itemId  // vaultId parameter
    );

    res.json({
      success: true,
      message: 'OCR results stored successfully'
    } as StoreOCRResultsResponse);

  } catch (error) {
    console.error('Store OCR results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to store OCR results'
    } as StoreOCRResultsResponse);
  }
};
