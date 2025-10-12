import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import { logAuditEvent } from '../audit-service/auditService';
import { AuditAction, ResourceType } from '../audit-service/types';
import { 
  CreateItemRequest, 
  CreateItemResponse, 
  GetItemResponse, 
  CreateVersionRequest, 
  CreateVersionResponse,
  VaultItem,
  VaultItemVersion,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchFilters,
  SecureViewerRequest,
  SecureViewerResponse
} from './types';
import { 
  generatePresignedUploadUrl, 
  generatePresignedDownloadUrl
} from './minioClient';
import crypto from 'crypto';

// Helper mappers to convert DB snake_case rows to API camelCase
const mapItemRow = (row: any): VaultItem => ({
  id: row.id,
  userId: row.user_id,
  tenantId: row.tenant_id,
  name: row.name,
  description: row.description ?? undefined,
  category: row.category ?? undefined,
  tags: row.tags ?? undefined,
  isEncrypted: row.is_encrypted,
  encryptionKeyId: row.encryption_key_id ?? undefined,
  fileSize: row.file_size ?? undefined,
  mimeType: row.mime_type ?? undefined,
  fileExtension: row.file_extension ?? undefined,
  currentVersion: row.current_version,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapVersionRow = (row: any): VaultItemVersion => ({
  id: row.id,
  itemId: row.item_id,
  versionNumber: row.version_number,
  filePath: row.file_path,
  fileSize: row.file_size,
  mimeType: row.mime_type,
  checksum: row.checksum ?? undefined,
  isEncrypted: row.is_encrypted,
  encryptionKeyId: row.encryption_key_id ?? undefined,
  uploadedBy: row.uploaded_by,
  uploadIp: row.upload_ip ?? undefined,
  userAgent: row.user_agent ?? undefined,
  createdAt: row.created_at
});

// Helper function to generate file path
const generateFilePath = (userId: string, itemId: string, version: number, fileExtension: string): string => {
  return `${userId}/${itemId}/v${version}.${fileExtension}`;
};

// Create a new vault item
export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as CreateItemResponse);
      return;
    }

    // Get default tenant (same logic as auth service)
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      } as CreateItemResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

        const {
          name,
          description,
          category,
          tags,
          fileSize,
          mimeType,
          fileExtension,
          isEncrypted = true,
          encryptedCek
        }: CreateItemRequest = req.body;

    // Validate required fields
    if (!name || !fileSize || !mimeType) {
      res.status(400).json({
        success: false,
        message: 'Name, file size, and MIME type are required'
      } as CreateItemResponse);
      return;
    }

    // Use provided encrypted CEK payload (expected JSON with ivs). If not provided, generate placeholder string.
    const encryptionKeyId = isEncrypted ? (encryptedCek || null) : null;

    // Create vault item in database
    const result = await query(
      `INSERT INTO vault_items (
        user_id, tenant_id, name, description, category, tags, 
        is_encrypted, encryption_key_id, file_size, mime_type, 
        file_extension, current_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId, tenantId, name, description, category, tags,
        isEncrypted, encryptionKeyId, fileSize, mimeType,
        fileExtension, 1
      ]
    );

    const item = mapItemRow(result.rows[0]);

    // Generate file path for first version
    const filePath = generateFilePath(userId, item.id, 1, fileExtension || 'bin');

    // Create first version record
    await query(
      `INSERT INTO vault_item_versions (
        item_id, version_number, file_path, file_size, mime_type,
        is_encrypted, encryption_key_id, uploaded_by, upload_ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        item.id, 1, filePath, fileSize, mimeType,
        isEncrypted, encryptionKeyId, userId, req.ip, req.get('User-Agent')
      ]
    );

    // Generate presigned upload URL
    const { uploadUrl, expiresIn } = await generatePresignedUploadUrl(filePath, mimeType);

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.VAULT_ITEM_CREATED,
      ResourceType.VAULT_ITEM,
      item.id,
      {
        itemName: item.name,
        itemSize: item.fileSize,
        itemType: item.mimeType,
        isEncrypted: item.isEncrypted,
        category: item.category,
        tags: item.tags
      },
      item.id,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Vault item created successfully',
      item,
      uploadUrl,
      expiresIn
    } as CreateItemResponse);

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as CreateItemResponse);
  }
};

// Get vault item by ID
export const getItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    const { id } = req.params;

    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as GetItemResponse);
      return;
    }

    // Get item with user and tenant validation
    const itemResult = await query(
      `SELECT * FROM vault_items 
       WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND is_active = true`,
      [id, userId, tenantId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Vault item not found'
      } as GetItemResponse);
      return;
    }

    const item = itemResult.rows[0] as VaultItem;

    // Get all versions for this item
    const versionsResult = await query(
      `SELECT * FROM vault_item_versions 
       WHERE item_id = $1 
       ORDER BY version_number DESC`,
      [id]
    );

    const versions = versionsResult.rows.map(mapVersionRow) as VaultItemVersion[];

    res.json({
      success: true,
      message: 'Vault item retrieved successfully',
      item,
      versions
    } as GetItemResponse);

  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as GetItemResponse);
  }
};

// Create new version of vault item
export const createVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    const { id } = req.params;

    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as CreateVersionResponse);
      return;
    }

    const {
      fileSize,
      mimeType,
      fileExtension,
      isEncrypted = true
    }: CreateVersionRequest = req.body;

    // Validate required fields
    if (!fileSize || !mimeType) {
      res.status(400).json({
        success: false,
        message: 'File size and MIME type are required'
      } as CreateVersionResponse);
      return;
    }

    // Get item and validate ownership
    const itemResult = await query(
      `SELECT * FROM vault_items 
       WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND is_active = true`,
      [id, userId, tenantId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Vault item not found'
      } as CreateVersionResponse);
      return;
    }

    const item = mapItemRow(itemResult.rows[0]);

    // Get next version number
    const versionResult = await query(
      `SELECT MAX(version_number) as max_version FROM vault_item_versions WHERE item_id = $1`,
      [id]
    );

    const nextVersion = (versionResult.rows[0].max_version || 0) + 1;

    // Generate encryption key if needed
    const encryptionKeyId = isEncrypted ? null : null;

    // Generate file path for new version
    const filePath = generateFilePath(userId, id, nextVersion, fileExtension || 'bin');

    // Create version record
    const versionResult2 = await query(
      `INSERT INTO vault_item_versions (
        item_id, version_number, file_path, file_size, mime_type,
        is_encrypted, encryption_key_id, uploaded_by, upload_ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, nextVersion, filePath, fileSize, mimeType,
        isEncrypted, encryptionKeyId, userId, req.ip, req.get('User-Agent')
      ]
    );

    const version = mapVersionRow(versionResult2.rows[0]);

    // Update item's current version and metadata
    await query(
      `UPDATE vault_items 
       SET current_version = $1, file_size = $2, mime_type = $3, 
           file_extension = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [nextVersion, fileSize, mimeType, fileExtension, id]
    );

    // Generate presigned upload URL
    const { uploadUrl, expiresIn } = await generatePresignedUploadUrl(filePath, mimeType);

    res.status(201).json({
      success: true,
      message: 'New version created successfully',
      version,
      uploadUrl,
      expiresIn
    } as CreateVersionResponse);

  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as CreateVersionResponse);
  }
};

// Get download URL for a specific version
export const getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id, version } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get default tenant
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      });
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Get version with item validation
    const versionResult = await query(
      `SELECT viv.*, vi.user_id, vi.tenant_id 
       FROM vault_item_versions viv
       JOIN vault_items vi ON viv.item_id = vi.id
       WHERE viv.item_id = $1 AND viv.version_number = $2 
       AND vi.user_id = $3 AND vi.tenant_id = $4 AND vi.is_active = true`,
      [id, version, userId, tenantId]
    );

    if (versionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Version not found'
      });
      return;
    }

    const versionData = versionResult.rows[0];

    // For development, serve file directly through backend instead of presigned URL
    // This avoids browser CORS issues with MinIO
    const downloadUrl = `${req.protocol}://${req.get('host')}/vault/items/${id}/versions/${version}/download-file`;

    res.json({
      success: true,
      message: 'Download URL generated successfully',
      downloadUrl,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Get download URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Download file directly (for development)
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id, version } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get default tenant
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      });
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Get version with item validation
    const versionResult = await query(
      `SELECT viv.*, vi.user_id, vi.tenant_id, vi.name, vi.mime_type
       FROM vault_item_versions viv
       JOIN vault_items vi ON viv.item_id = vi.id
       WHERE viv.item_id = $1 AND viv.version_number = $2 
       AND vi.user_id = $3 AND vi.tenant_id = $4 AND vi.is_active = true`,
      [id, version, userId, tenantId]
    );

    if (versionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    const versionData = versionResult.rows[0];

    // Get file from MinIO
    const { minioClient } = await import('./minioClient');
    const bucketName = process.env.MINIO_BUCKET_NAME || 'aegisvault-files';
    
    const fileStream = await minioClient.getObject(bucketName, versionData.file_path);
    
    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.VAULT_ITEM_DOWNLOADED,
      ResourceType.VAULT_ITEM,
      versionData.item_id,
      {
        fileName: versionData.name,
        fileSize: versionData.file_size,
        mimeType: versionData.mime_type,
        version: version
      },
      versionData.item_id,
      req
    );

    // Set headers for file download
    res.setHeader('Content-Type', versionData.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${versionData.name}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Pipe file stream to response
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
};

// Delete vault item
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get default tenant
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      });
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Get item and validate ownership
    const itemResult = await query(
      `SELECT * FROM vault_items 
       WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND is_active = true`,
      [id, userId, tenantId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Vault item not found'
      });
      return;
    }

    const item = itemResult.rows[0];

    // Soft delete the item (mark as inactive)
    await query(
      'UPDATE vault_items SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.VAULT_ITEM_DELETED,
      ResourceType.VAULT_ITEM,
      item.id,
      {
        itemName: item.name,
        itemSize: item.file_size,
        itemType: item.mime_type,
        isEncrypted: item.is_encrypted,
        category: item.category,
        tags: item.tags
      },
      item.id,
      req
    );

    res.json({
      success: true,
      message: 'Vault item deleted successfully'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// List user's vault items
export const listItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { category, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get default tenant (same logic as auth service)
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      });
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    let queryText = `
      SELECT * FROM vault_items 
      WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
    `;
    const queryParams: any[] = [userId, tenantId];

    if (category) {
      queryText += ` AND category = $3`;
      queryParams.push(category);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit as string), parseInt(offset as string));

    const result = await query(queryText, queryParams);

    const items = result.rows.map(mapItemRow);

    res.json({
      success: true,
      message: 'Vault items retrieved successfully',
      items,
      total: items.length
    });

  } catch (error) {
    console.error('List items error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get stats: total files, encrypted files, total size
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({ success: false, message: 'Default tenant not found' });
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    const totalRes = await query(
      'SELECT COUNT(*) AS total FROM vault_items WHERE user_id = $1 AND tenant_id = $2 AND is_active = true',
      [userId, tenantId]
    );

    const encRes = await query(
      'SELECT COUNT(*) AS encrypted FROM vault_items WHERE user_id = $1 AND tenant_id = $2 AND is_active = true AND is_encrypted = true',
      [userId, tenantId]
    );

    const sizeRes = await query(
      'SELECT COALESCE(SUM(viv.file_size), 0) AS total_size FROM vault_item_versions viv JOIN vault_items vi ON viv.item_id = vi.id WHERE vi.user_id = $1 AND vi.tenant_id = $2 AND vi.is_active = true',
      [userId, tenantId]
    );

    res.json({
      success: true,
      message: 'Stats retrieved successfully',
      totalFiles: parseInt(totalRes.rows[0].total, 10),
      encryptedFiles: parseInt(encRes.rows[0].encrypted, 10),
      totalBytes: parseInt(sizeRes.rows[0].total_size, 10)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Search vault items with encrypted metadata
export const searchItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const startTime = Date.now();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as SearchResponse);
      return;
    }

    // Get default tenant
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      } as SearchResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    const {
      query: searchQuery,
      filters = {},
      limit = 20,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc'
    }: SearchRequest = req.body;

    // Validate search query
    if (!searchQuery || searchQuery.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Search query is required'
      } as SearchResponse);
      return;
    }

    // Build search query with filters
    let queryText = `
      SELECT vi.*, 
             CASE 
               WHEN LOWER(vi.name) LIKE LOWER($1) THEN 10
               WHEN LOWER(vi.description) LIKE LOWER($1) THEN 5
               WHEN EXISTS (
                 SELECT 1 FROM unnest(vi.tags) AS tag 
                 WHERE LOWER(tag) LIKE LOWER($1)
               ) THEN 7
               ELSE 1
             END as relevance_score,
             CASE 
               WHEN LOWER(vi.name) LIKE LOWER($1) THEN 'name'
               WHEN LOWER(vi.description) LIKE LOWER($1) THEN 'description'
               WHEN EXISTS (
                 SELECT 1 FROM unnest(vi.tags) AS tag 
                 WHERE LOWER(tag) LIKE LOWER($1)
               ) THEN 'tags'
               ELSE 'other'
             END as matched_field
      FROM vault_items vi
      WHERE vi.user_id = $2 AND vi.tenant_id = $3 AND vi.is_active = true
        AND (
          LOWER(vi.name) LIKE LOWER($1) OR
          LOWER(vi.description) LIKE LOWER($1) OR
          EXISTS (
            SELECT 1 FROM unnest(vi.tags) AS tag 
            WHERE LOWER(tag) LIKE LOWER($1)
          )
        )
    `;

    const queryParams: any[] = [`%${searchQuery.trim()}%`, userId, tenantId];
    let paramIndex = 4;

    // Add filters
    if (filters.category) {
      queryText += ` AND vi.category = $${paramIndex}`;
      queryParams.push(filters.category);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      queryText += ` AND vi.tags && $${paramIndex}`;
      queryParams.push(filters.tags);
      paramIndex++;
    }

    if (filters.mimeType) {
      queryText += ` AND vi.mime_type = $${paramIndex}`;
      queryParams.push(filters.mimeType);
      paramIndex++;
    }

    if (filters.fileExtension) {
      queryText += ` AND vi.file_extension = $${paramIndex}`;
      queryParams.push(filters.fileExtension);
      paramIndex++;
    }

    if (filters.isEncrypted !== undefined) {
      queryText += ` AND vi.is_encrypted = $${paramIndex}`;
      queryParams.push(filters.isEncrypted);
      paramIndex++;
    }

    if (filters.dateFrom) {
      queryText += ` AND vi.created_at >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      queryText += ` AND vi.created_at <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.minSize !== undefined) {
      queryText += ` AND vi.file_size >= $${paramIndex}`;
      queryParams.push(filters.minSize);
      paramIndex++;
    }

    if (filters.maxSize !== undefined) {
      queryText += ` AND vi.file_size <= $${paramIndex}`;
      queryParams.push(filters.maxSize);
      paramIndex++;
    }

    // Add sorting
    const validSortColumns = ['name', 'created_at', 'updated_at', 'file_size'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    queryText += ` ORDER BY relevance_score DESC, vi.${sortColumn} ${order}`;
    
    // Add pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));

    const result = await query(queryText, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vault_items vi
      WHERE vi.user_id = $1 AND vi.tenant_id = $2 AND vi.is_active = true
        AND (
          LOWER(vi.name) LIKE LOWER($3) OR
          LOWER(vi.description) LIKE LOWER($3) OR
          EXISTS (
            SELECT 1 FROM unnest(vi.tags) AS tag 
            WHERE LOWER(tag) LIKE LOWER($3)
          )
        )
    `;

    const countParams: any[] = [userId, tenantId, `%${searchQuery.trim()}%`];
    let countParamIndex = 4;

    // Add same filters to count query
    if (filters.category) {
      countQuery += ` AND vi.category = $${countParamIndex}`;
      countParams.push(filters.category);
      countParamIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      countQuery += ` AND vi.tags && $${countParamIndex}`;
      countParams.push(filters.tags);
      countParamIndex++;
    }

    if (filters.mimeType) {
      countQuery += ` AND vi.mime_type = $${countParamIndex}`;
      countParams.push(filters.mimeType);
      countParamIndex++;
    }

    if (filters.fileExtension) {
      countQuery += ` AND vi.file_extension = $${countParamIndex}`;
      countParams.push(filters.fileExtension);
      countParamIndex++;
    }

    if (filters.isEncrypted !== undefined) {
      countQuery += ` AND vi.is_encrypted = $${countParamIndex}`;
      countParams.push(filters.isEncrypted);
      countParamIndex++;
    }

    if (filters.dateFrom) {
      countQuery += ` AND vi.created_at >= $${countParamIndex}`;
      countParams.push(filters.dateFrom);
      countParamIndex++;
    }

    if (filters.dateTo) {
      countQuery += ` AND vi.created_at <= $${countParamIndex}`;
      countParams.push(filters.dateTo);
      countParamIndex++;
    }

    if (filters.minSize !== undefined) {
      countQuery += ` AND vi.file_size >= $${countParamIndex}`;
      countParams.push(filters.minSize);
      countParamIndex++;
    }

    if (filters.maxSize !== undefined) {
      countQuery += ` AND vi.file_size <= $${countParamIndex}`;
      countParams.push(filters.maxSize);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Map results to search results
    const results: SearchResult[] = result.rows.map(row => ({
      item: mapItemRow(row),
      relevanceScore: Math.round((row.relevance_score / 10) * 100), // Convert to percentage
      matchedFields: [row.matched_field],
      snippet: generateSnippet(row, searchQuery)
    }));

    const took = Date.now() - startTime;

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.VAULT_ITEM_SEARCHED,
      ResourceType.SYSTEM,
      'search',
      {
        query: searchQuery,
        filters: filters,
        resultCount: total,
        searchTime: took
      },
      undefined,
      req
    );

    res.json({
      success: true,
      message: 'Search completed successfully',
      results,
      total,
      query: searchQuery,
      filters,
      took
    } as SearchResponse);

  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as SearchResponse);
  }
};

// Helper function to generate search snippet
const generateSnippet = (row: any, searchQuery: string): string => {
  const query = searchQuery.toLowerCase();
  
  // Check if query matches name
  if (row.name.toLowerCase().includes(query)) {
    const index = row.name.toLowerCase().indexOf(query);
    const start = Math.max(0, index - 20);
    const end = Math.min(row.name.length, index + query.length + 20);
    return row.name.substring(start, end);
  }
  
  // Check if query matches description
  if (row.description && row.description.toLowerCase().includes(query)) {
    const index = row.description.toLowerCase().indexOf(query);
    const start = Math.max(0, index - 30);
    const end = Math.min(row.description.length, index + query.length + 30);
    return row.description.substring(start, end);
  }
  
  // Check if query matches tags
  if (row.tags && row.tags.length > 0) {
    const matchingTag = row.tags.find((tag: string) => 
      tag.toLowerCase().includes(query)
    );
    if (matchingTag) {
      return `Tag: ${matchingTag}`;
    }
  }
  
  return row.name;
};

// Get secure viewer URL for an item
export const getSecureViewer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { version } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as SecureViewerResponse);
      return;
    }

    // Get default tenant
    const defaultTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      ['default']
    );

    if (defaultTenant.rows.length === 0) {
      res.status(500).json({
        success: false,
        message: 'Default tenant not found'
      } as SecureViewerResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Get item with validation
    const itemResult = await query(
      `SELECT * FROM vault_items 
       WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND is_active = true`,
      [id, userId, tenantId]
    );

    if (itemResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Item not found'
      } as SecureViewerResponse);
      return;
    }

    const item = itemResult.rows[0];

    // Get specific version or latest version
    let versionQuery = `SELECT * FROM vault_item_versions WHERE item_id = $1`;
    const versionParams: any[] = [id];

    if (version) {
      versionQuery += ` AND version_number = $2`;
      versionParams.push(version);
    } else {
      versionQuery += ` ORDER BY version_number DESC LIMIT 1`;
    }

    const versionResult = await query(versionQuery, versionParams);

    if (versionResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Version not found'
      } as SecureViewerResponse);
      return;
    }

    const versionData = versionResult.rows[0];

    // Generate secure viewer URL (in a real implementation, this would be a secure endpoint)
    const viewerToken = crypto.randomBytes(32).toString('hex');
    const viewerUrl = `/secure-viewer/${id}/${versionData.version_number}?token=${viewerToken}`;

    // In a real implementation, you would:
    // 1. Store the viewer token in Redis/cache with expiration
    // 2. Implement a secure viewer endpoint that validates the token
    // 3. Apply security restrictions (disable copy, save, print, watermark)

    res.json({
      success: true,
      message: 'Secure viewer URL generated successfully',
      viewerUrl,
      expiresIn: 3600, // 1 hour
      restrictions: {
        disableCopy: true,
        disableSave: true,
        disablePrint: true,
        watermarkText: `Confidential - ${item.name}`
      }
    } as SecureViewerResponse);

  } catch (error) {
    console.error('Get secure viewer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as SecureViewerResponse);
  }
};
