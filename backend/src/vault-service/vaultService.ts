import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import { 
  CreateItemRequest, 
  CreateItemResponse, 
  GetItemResponse, 
  CreateVersionRequest, 
  CreateVersionResponse,
  VaultItem,
  VaultItemVersion
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

    // Generate presigned download URL
    const downloadUrl = await generatePresignedDownloadUrl(versionData.file_path);

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

    // Soft delete the item (mark as inactive)
    await query(
      'UPDATE vault_items SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
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
