// Audit service for immutable audit logging with hash chaining

import { Request, Response } from 'express';
import { query } from '../auth-service/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  AuditLog, 
  CreateAuditLogRequest, 
  CreateAuditLogResponse, 
  GetAuditLogsRequest, 
  GetAuditLogsResponse,
  AuditExportRequest,
  AuditExportResponse,
  AuditAction,
  ResourceType
} from './types';
import crypto from 'crypto';

// Generate hash for audit log entry
const generateAuditHash = (
  logData: Partial<AuditLog>, 
  previousHash?: string
): string => {
  const hashData = {
    tenantId: logData.tenantId,
    userId: logData.userId,
    vaultId: logData.vaultId,
    action: logData.action,
    resourceType: logData.resourceType,
    resourceId: logData.resourceId,
    details: logData.details,
    timestamp: logData.timestamp,
    previousHash: previousHash || null
  };
  
  const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

// Create audit log entry
export const createAuditLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as CreateAuditLogResponse);
      return;
    }

    const {
      vaultId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      sessionId
    }: CreateAuditLogRequest = req.body;

    // Validate required fields
    if (!action || !resourceType || !resourceId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: action, resourceType, resourceId'
      } as CreateAuditLogResponse);
      return;
    }

    // Get the previous hash for chain continuity
    const previousHashResult = await query(
      `SELECT current_hash FROM audit_logs 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId]
    );

    const previousHash = previousHashResult.rows[0]?.current_hash;

    const timestamp = new Date().toISOString();
    const currentHash = generateAuditHash({
      tenantId,
      userId,
      vaultId,
      action,
      resourceType,
      resourceId,
      details,
      timestamp
    }, previousHash);

    // Insert audit log
    const result = await query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, vault_id, action, resource_type, resource_id,
        details, ip_address, user_agent, session_id, timestamp,
        previous_hash, current_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tenantId, userId, vaultId, action, resourceType, resourceId,
        details ? JSON.stringify(details) : null,
        ipAddress, userAgent, sessionId, timestamp,
        previousHash, currentHash
      ]
    );

    const auditLog = result.rows[0] as AuditLog;

    res.status(201).json({
      success: true,
      message: 'Audit log created successfully',
      log: auditLog
    } as CreateAuditLogResponse);

  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as CreateAuditLogResponse);
  }
};

// Get audit logs for a specific vault or general audit logs
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    const { vaultId } = req.params;

    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as GetAuditLogsResponse);
      return;
    }

    const {
      action,
      resourceType,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0
    }: GetAuditLogsRequest = req.query as any;

    // Build query with filters
    let queryText = `
      SELECT al.*, u.email, u.first_name, u.last_name
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.tenant_id = $1
    `;
    
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    // Add vault filter if specified
    if (vaultId) {
      queryText += ` AND al.vault_id = $${paramIndex}`;
      queryParams.push(vaultId);
      paramIndex++;
    }

    // Add action filter
    if (action) {
      queryText += ` AND al.action = $${paramIndex}`;
      queryParams.push(action);
      paramIndex++;
    }

    // Add resource type filter
    if (resourceType) {
      queryText += ` AND al.resource_type = $${paramIndex}`;
      queryParams.push(resourceType);
      paramIndex++;
    }

    // Add date filters
    if (dateFrom) {
      queryText += ` AND al.timestamp >= $${paramIndex}`;
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryText += ` AND al.timestamp <= $${paramIndex}`;
      queryParams.push(dateTo);
      paramIndex++;
    }

    // Add ordering and pagination
    queryText += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit.toString()), parseInt(offset.toString()));

    const result = await query(queryText, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      WHERE al.tenant_id = $1
    `;
    const countParams: any[] = [tenantId];
    let countParamIndex = 2;

    if (vaultId) {
      countQuery += ` AND al.vault_id = $${countParamIndex}`;
      countParams.push(vaultId);
      countParamIndex++;
    }

    if (action) {
      countQuery += ` AND al.action = $${countParamIndex}`;
      countParams.push(action);
      countParamIndex++;
    }

    if (resourceType) {
      countQuery += ` AND al.resource_type = $${countParamIndex}`;
      countParams.push(resourceType);
      countParamIndex++;
    }

    if (dateFrom) {
      countQuery += ` AND al.timestamp >= $${countParamIndex}`;
      countParams.push(dateFrom);
      countParamIndex++;
    }

    if (dateTo) {
      countQuery += ` AND al.timestamp <= $${countParamIndex}`;
      countParams.push(dateTo);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const logs = result.rows.map((row: any) => ({
      ...row,
      details: row.details || null
    })) as AuditLog[];

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      logs,
      total,
      pagination: {
        limit: parseInt(limit.toString()),
        offset: parseInt(offset.toString()),
        hasMore: (parseInt(offset.toString()) + parseInt(limit.toString())) < total
      }
    } as GetAuditLogsResponse);

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as GetAuditLogsResponse);
  }
};

// Export audit logs
export const exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    console.log('Export audit logs request:', { userId, tenantId, body: req.body });

    if (!userId || !tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      } as AuditExportResponse);
      return;
    }

    const {
      format,
      vaultId,
      dateFrom,
      dateTo,
      filters
    }: AuditExportRequest = req.body;

    if (!format || !['csv', 'pdf'].includes(format)) {
      res.status(400).json({
        success: false,
        message: 'Invalid format. Must be csv or pdf'
      } as AuditExportResponse);
      return;
    }

    // Build query for export
    let queryText = `
      SELECT al.*, u.email, u.first_name, u.last_name
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.tenant_id = $1
    `;
    
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (vaultId) {
      queryText += ` AND al.vault_id = $${paramIndex}`;
      queryParams.push(vaultId);
      paramIndex++;
    }

    if (dateFrom) {
      queryText += ` AND al.timestamp >= $${paramIndex}`;
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryText += ` AND al.timestamp <= $${paramIndex}`;
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (filters?.action) {
      queryText += ` AND al.action = $${paramIndex}`;
      queryParams.push(filters.action);
      paramIndex++;
    }

    if (filters?.resourceType) {
      queryText += ` AND al.resource_type = $${paramIndex}`;
      queryParams.push(filters.resourceType);
      paramIndex++;
    }

    if (filters?.userId) {
      queryText += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(filters.userId);
      paramIndex++;
    }

    queryText += ` ORDER BY al.timestamp DESC`;

    const result = await query(queryText, queryParams);
    const logs = result.rows.map((row: any) => ({
      ...row,
      details: row.details || null
    })) as AuditLog[];

    // Generate export file based on format
    let exportData: string;
    let filename: string;
    let contentType: string;

    if (format === 'csv') {
      exportData = generateCSV(logs);
      filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      contentType = 'text/csv';
    } else {
      // Generate PDF
      console.log('Generating PDF for', logs.length, 'logs');
      try {
        const pdfBuffer = generatePDF(logs);
        filename = `audit-logs-${new Date().toISOString().split('T')[0]}.pdf`;
        contentType = 'application/pdf';
      
      // Set headers for PDF download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      // Log the export action
      await query(
        `INSERT INTO audit_logs (
          tenant_id, user_id, action, resource_type, resource_id,
          details, timestamp, previous_hash, current_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenantId,
          userId,
          AuditAction.AUDIT_LOG_EXPORTED,
          ResourceType.AUDIT_LOG,
          'export-' + Date.now(), // Generate a unique resource_id for export
          JSON.stringify({ format: 'pdf', count: logs.length, filters }),
          new Date(),
          null, // previous_hash
          crypto.createHash('sha256').update(`${tenantId}-${userId}-${Date.now()}`).digest('hex')
        ]
      );

      return;
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({
          success: false,
          message: 'PDF generation failed'
        } as AuditExportResponse);
        return;
      }
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    res.send(exportData);

    // Log the export action
    await query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, action, resource_type, resource_id,
        details, timestamp, previous_hash, current_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        tenantId, userId, AuditAction.AUDIT_LOG_EXPORTED, ResourceType.AUDIT_LOG, 'export-' + Date.now(),
        JSON.stringify({ format, filters, recordCount: logs.length }),
        new Date().toISOString(),
        null, // Will be calculated
        null  // Will be calculated
      ]
    );

  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    } as AuditExportResponse);
  }
};

// Helper function to generate CSV
const generateCSV = (logs: AuditLog[]): string => {
  const headers = [
    'Timestamp',
    'User',
    'Action',
    'Resource Type',
    'Resource ID',
    'Vault ID',
    'IP Address',
    'User Agent',
    'Details',
    'Hash'
  ];

  const rows = logs.map(log => [
    log.timestamp,
    `${log.first_name || ''} ${log.last_name || ''} (${log.email || ''})`.trim(),
    log.action,
    log.resourceType,
    log.resourceId,
    log.vaultId || '',
    log.ipAddress || '',
    log.userAgent || '',
    log.details ? JSON.stringify(log.details) : '',
    log.currentHash
  ]);

  return [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

// Helper function to generate PDF
const generatePDF = (logs: AuditLog[]): Buffer => {
  console.log('Starting PDF generation with', logs.length, 'logs');
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation for better table fit
  
  // Add title
  doc.setFontSize(16);
  doc.text('Audit Logs Export', 14, 20);
  
  // Add generation date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Total Records: ${logs.length}`, 14, 35);
  
  // Prepare table data
  const tableData = logs.map(log => [
    new Date(log.timestamp).toLocaleString(),
    `${log.first_name || ''} ${log.last_name || ''}`.trim() || log.email || 'Unknown',
    log.action,
    log.resourceType || 'N/A',
    log.resourceId || 'N/A',
    log.vaultId || 'N/A',
    log.ipAddress || 'N/A',
    log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : 'N/A',
    log.currentHash ? log.currentHash.substring(0, 12) + '...' : 'N/A'
  ]);

  // Define table columns
  const columns = [
    'Timestamp',
    'User',
    'Action',
    'Resource Type',
    'Resource ID',
    'Vault ID',
    'IP Address',
    'Details',
    'Hash'
  ];

  // Add table to PDF
  autoTable(doc, {
    head: [columns],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 7,
      cellPadding: 1,
    },
    headStyles: {
      fillColor: [66, 139, 202], // Blue header
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245], // Light gray alternating rows
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Timestamp
      1: { cellWidth: 15 }, // User
      2: { cellWidth: 18 }, // Action
      3: { cellWidth: 15 }, // Resource Type
      4: { cellWidth: 15 }, // Resource ID
      5: { cellWidth: 15 }, // Vault ID
      6: { cellWidth: 15 }, // IP Address
      7: { cellWidth: 25 }, // Details
      8: { cellWidth: 20 }, // Hash
    },
    margin: { top: 40, left: 14, right: 14 },
  });

  // Convert to buffer
  console.log('PDF generation completed successfully');
  return Buffer.from(doc.output('arraybuffer'));
};

// Utility function to log audit events (for use throughout the application)
export const logAuditEvent = async (
  tenantId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>,
  vaultId?: string,
  req?: Request
): Promise<void> => {
  try {
    console.log('logAuditEvent called:', { tenantId, userId, action, resourceType, resourceId });
    // Get the previous hash for chain continuity
    const previousHashResult = await query(
      `SELECT current_hash FROM audit_logs 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [tenantId]
    );

    const previousHash = previousHashResult.rows[0]?.current_hash;
    const timestamp = new Date().toISOString();
    const currentHash = generateAuditHash({
      tenantId,
      userId,
      vaultId,
      action,
      resourceType,
      resourceId,
      details,
      timestamp
    }, previousHash);

    // Insert audit log
    const result = await query(
      `INSERT INTO audit_logs (
        tenant_id, user_id, vault_id, action, resource_type, resource_id,
        details, ip_address, user_agent, session_id, timestamp,
        previous_hash, current_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tenantId, userId, vaultId, action, resourceType, resourceId,
        details ? JSON.stringify(details) : null,
        req?.ip, req?.get('User-Agent'), (req as any)?.sessionID,
        timestamp, previousHash, currentHash
      ]
    );
    
    console.log('Audit log created successfully:', result.rows[0]?.id);

  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
};
