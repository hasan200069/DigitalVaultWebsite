import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import { logAuditEvent } from '../audit-service/auditService';
import { AuditAction, ResourceType } from '../audit-service/types';
import {
  CreateFolderRequest,
  CreateFolderResponse,
  ListFoldersResponse,
  UpdateFolderRequest,
  UpdateFolderResponse,
  DeleteFolderResponse,
  Folder
} from './types';

// Helper mapper to convert DB snake_case rows to API camelCase
const mapFolderRow = (row: any): Folder => ({
  id: row.id,
  userId: row.user_id,
  tenantId: row.tenant_id,
  taxonomyId: row.taxonomy_key || row.taxonomy_id, // Support both old and new schema
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Create a new folder
export const createFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as CreateFolderResponse);
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
      } as CreateFolderResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;
    const { taxonomyId, name }: CreateFolderRequest = req.body;

    // Validate required fields
    if (!taxonomyId || !name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Taxonomy ID and folder name are required'
      } as CreateFolderResponse);
      return;
    }

    // Validate taxonomy ID
    const validTaxonomyIds = ['legal', 'financial', 'real-estate', 'insurance', 'personal', 'business', 'educational', 'ceremonial'];
    if (!validTaxonomyIds.includes(taxonomyId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid taxonomy ID'
      } as CreateFolderResponse);
      return;
    }

    // Check if folder with same name already exists for this user/tenant/taxonomy
    const existingFolder = await query(
      `SELECT id FROM folders 
       WHERE user_id = $1 AND tenant_id = $2 AND taxonomy_key = $3 AND name = $4`,
      [userId, tenantId, taxonomyId, name.trim()]
    );

    if (existingFolder.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this taxonomy'
      } as CreateFolderResponse);
      return;
    }

    // Create folder (using taxonomy_key to match existing schema)
    // Generate slug from name
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await query(
      `INSERT INTO folders (user_id, tenant_id, taxonomy_key, name, slug)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, tenantId, taxonomyId, name.trim(), slug]
    );

    const folder = mapFolderRow(result.rows[0]);

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.FOLDER_CREATED,
      ResourceType.FOLDER,
      folder.id,
      {
        folderName: folder.name,
        taxonomyId: folder.taxonomyId
      },
      folder.id,
      req
    );

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder
    } as CreateFolderResponse);

  } catch (error) {
    console.error('Create folder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: `Internal server error: ${errorMessage}`
    } as CreateFolderResponse);
  }
};

// List folders for a user and taxonomy
export const listFolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as ListFoldersResponse);
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
      } as ListFoldersResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;
    const taxonomyId = req.query.taxonomyId as string;

    let result;
    if (taxonomyId) {
      // Get folders for specific taxonomy (using taxonomy_key to match existing schema)
      result = await query(
        `SELECT * FROM folders 
         WHERE user_id = $1 AND tenant_id = $2 AND taxonomy_key = $3 AND is_active = true
         ORDER BY name ASC`,
        [userId, tenantId, taxonomyId]
      );
    } else {
      // Get all folders for user
      result = await query(
        `SELECT * FROM folders 
         WHERE user_id = $1 AND tenant_id = $2 AND is_active = true
         ORDER BY taxonomy_key, name ASC`,
        [userId, tenantId]
      );
    }

    const folders = result.rows.map(mapFolderRow);

    res.status(200).json({
      success: true,
      message: 'Folders retrieved successfully',
      folders
    } as ListFoldersResponse);

  } catch (error) {
    console.error('List folders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: `Internal server error: ${errorMessage}`
    } as ListFoldersResponse);
  }
};

// Update a folder
export const updateFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const folderId = req.params.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as UpdateFolderResponse);
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
      } as UpdateFolderResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;
    const { name }: UpdateFolderRequest = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        message: 'Folder name is required'
      } as UpdateFolderResponse);
      return;
    }

    // Check if folder exists and belongs to user
    const existingFolder = await query(
      `SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [folderId, userId, tenantId]
    );

    if (existingFolder.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Folder not found'
      } as UpdateFolderResponse);
      return;
    }

    const folder = existingFolder.rows[0];

    // Check if another folder with same name exists in same taxonomy
    const taxonomyKey = folder.taxonomy_key || folder.taxonomy_id;
    const duplicateCheck = await query(
      `SELECT id FROM folders 
       WHERE user_id = $1 AND tenant_id = $2 AND taxonomy_key = $3 AND name = $4 AND id != $5`,
      [userId, tenantId, taxonomyKey, name.trim(), folderId]
    );

    if (duplicateCheck.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this taxonomy'
      } as UpdateFolderResponse);
      return;
    }

    // Update folder
    const result = await query(
      `UPDATE folders 
       SET name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 AND tenant_id = $4
       RETURNING *`,
      [name.trim(), folderId, userId, tenantId]
    );

    const updatedFolder = mapFolderRow(result.rows[0]);

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.FOLDER_UPDATED,
      ResourceType.FOLDER,
      updatedFolder.id,
      {
        folderName: updatedFolder.name,
        taxonomyId: updatedFolder.taxonomyId,
        oldName: folder.name,
        taxonomyKey: taxonomyKey
      },
      updatedFolder.id,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      folder: updatedFolder
    } as UpdateFolderResponse);

  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as UpdateFolderResponse);
  }
};

// Delete a folder
export const deleteFolder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const folderId = req.params.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as DeleteFolderResponse);
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
      } as DeleteFolderResponse);
      return;
    }

    const tenantId = defaultTenant.rows[0].id;

    // Check if folder exists and belongs to user
    const existingFolder = await query(
      `SELECT * FROM folders WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [folderId, userId, tenantId]
    );

    if (existingFolder.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Folder not found'
      } as DeleteFolderResponse);
      return;
    }

    const folder = existingFolder.rows[0];

    // Delete folder
    await query(
      `DELETE FROM folders WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [folderId, userId, tenantId]
    );

    // Log audit event
    await logAuditEvent(
      tenantId,
      userId,
      AuditAction.FOLDER_DELETED,
      ResourceType.FOLDER,
      folderId,
      {
        folderName: folder.name,
        taxonomyId: folder.taxonomy_key || folder.taxonomy_id
      },
      folderId,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Folder deleted successfully'
    } as DeleteFolderResponse);

  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as DeleteFolderResponse);
  }
};

