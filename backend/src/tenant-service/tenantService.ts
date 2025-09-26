import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import {
  CreateTenantRequest,
  CreateTenantResponse,
  GetTenantResponse,
  UpdateTenantRequest,
  UpdateTenantResponse,
  ListTenantsResponse
} from './types';

// POST /tenants
export const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, domain, branding }: CreateTenantRequest = req.body;

    // Validate input
    if (!name || !domain) {
      res.status(400).json({
        success: false,
        message: 'Name and domain are required'
      } as CreateTenantResponse);
      return;
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    if (!domainRegex.test(domain)) {
      res.status(400).json({
        success: false,
        message: 'Domain must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'
      } as CreateTenantResponse);
      return;
    }

    // Check if domain already exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE domain = $1',
      [domain.toLowerCase()]
    );

    if (existingTenant.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Tenant with this domain already exists'
      } as CreateTenantResponse);
      return;
    }

    // Default branding
    const defaultBranding = {
      logo: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      companyName: name,
      favicon: '',
      customCSS: '',
      ...branding
    };

    // Create tenant
    const result = await query(
      `INSERT INTO tenants (name, domain, branding)
       VALUES ($1, $2, $3)
       RETURNING id, name, domain, branding, is_active, created_at`,
      [name, domain.toLowerCase(), JSON.stringify(defaultBranding)]
    );

    const tenant = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        branding: tenant.branding,
        isActive: tenant.is_active,
        createdAt: tenant.created_at
      }
    } as CreateTenantResponse);

  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as CreateTenantResponse);
  }
};

// GET /tenants/:id
export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      } as GetTenantResponse);
      return;
    }

    // Get tenant from database
    const result = await query(
      'SELECT id, name, domain, branding, is_active, created_at, updated_at FROM tenants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      } as GetTenantResponse);
      return;
    }

    const tenant = result.rows[0];

    res.json({
      success: true,
      message: 'Tenant retrieved successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        branding: tenant.branding,
        isActive: tenant.is_active,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at
      }
    } as GetTenantResponse);

  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as GetTenantResponse);
  }
};

// PUT /tenants/:id
export const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, domain, branding, isActive }: UpdateTenantRequest = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      } as UpdateTenantResponse);
      return;
    }

    // Check if tenant exists
    const existingTenant = await query(
      'SELECT id, branding FROM tenants WHERE id = $1',
      [id]
    );

    if (existingTenant.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      } as UpdateTenantResponse);
      return;
    }

    // Check if domain is being changed and if it already exists
    if (domain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
      if (!domainRegex.test(domain)) {
        res.status(400).json({
          success: false,
          message: 'Domain must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'
        } as UpdateTenantResponse);
        return;
      }

      const domainCheck = await query(
        'SELECT id FROM tenants WHERE domain = $1 AND id != $2',
        [domain.toLowerCase(), id]
      );

      if (domainCheck.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: 'Tenant with this domain already exists'
        } as UpdateTenantResponse);
        return;
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }

    if (domain !== undefined) {
      updateFields.push(`domain = $${paramCount++}`);
      updateValues.push(domain.toLowerCase());
    }

    if (branding !== undefined) {
      const currentBranding = existingTenant.rows[0].branding;
      const mergedBranding = { ...currentBranding, ...branding };
      updateFields.push(`branding = $${paramCount++}`);
      updateValues.push(JSON.stringify(mergedBranding));
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update'
      } as UpdateTenantResponse);
      return;
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const updateQuery = `
      UPDATE tenants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, domain, branding, is_active, created_at, updated_at
    `;

    const result = await query(updateQuery, updateValues);
    const tenant = result.rows[0];

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        branding: tenant.branding,
        isActive: tenant.is_active,
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at
      }
    } as UpdateTenantResponse);

  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as UpdateTenantResponse);
  }
};

// GET /tenants
export const listTenants = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query('SELECT COUNT(*) as total FROM tenants');
    const total = parseInt(countResult.rows[0].total);

    // Get tenants with pagination
    const result = await query(
      `SELECT id, name, domain, branding, is_active, created_at, updated_at
       FROM tenants
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const tenants = result.rows.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      branding: tenant.branding,
      isActive: tenant.is_active,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at
    }));

    res.json({
      success: true,
      message: 'Tenants retrieved successfully',
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    } as ListTenantsResponse);

  } catch (error) {
    console.error('List tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as ListTenantsResponse);
  }
};

// DELETE /tenants/:id
export const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
      return;
    }

    // Check if tenant exists
    const existingTenant = await query(
      'SELECT id FROM tenants WHERE id = $1',
      [id]
    );

    if (existingTenant.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
      return;
    }

    // Delete tenant (this will cascade delete users and related data)
    await query('DELETE FROM tenants WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });

  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
