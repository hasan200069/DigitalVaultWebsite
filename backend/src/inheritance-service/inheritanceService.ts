import { pool as db } from '../auth-service/database';
import { logAuditEvent } from '../audit-service/auditService';
import { AuditAction, ResourceType } from '../audit-service/types';
import type {
  InheritancePlan,
  Trustee,
  Beneficiary,
  InheritanceItem,
  CreatePlanRequest,
  ApprovePlanRequest,
  TriggerInheritanceRequest,
  PlanStatus
} from './types';

export class InheritanceService {
  /**
   * Create a new inheritance plan
   */
  async createPlan(ownerId: string, request: CreatePlanRequest): Promise<InheritancePlan> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate trustee count matches k threshold
      if (request.trustees.length < request.kThreshold) {
        throw new Error('Number of trustees must be at least equal to k threshold');
      }
      
      if (request.trustees.length > 10) {
        throw new Error('Maximum 10 trustees allowed');
      }
      
      // Create the plan
      const planResult = await client.query(
        `INSERT INTO inheritance_plans 
         (id, owner_id, name, description, k_threshold, n_total, waiting_period_days, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          crypto.randomUUID(),
          ownerId,
          request.name,
          request.description || null,
          request.kThreshold,
          request.trustees.length,
          request.waitingPeriodDays,
          'active'
        ]
      );
      
      const plan = planResult.rows[0];
      
      // Get user's tenant_id for audit logging
      const userResult = await client.query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [ownerId]
      );
      const tenantId = userResult.rows[0].tenant_id;
      
      // Create trustees with Shamir shares
      const missingTrustees: string[] = [];
      for (let i = 0; i < request.trustees.length; i++) {
        const trustee = request.trustees[i];
        
        // Look up user ID for the trustee email
        const userResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [trustee.email]
        );
        
        const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
        
        if (!userId) {
          missingTrustees.push(trustee.email);
        }

        // Find the corresponding Shamir share for this trustee
        const shamirShare = request.shamirShares?.find(share => share.trusteeEmail === trustee.email);
        const encryptedShare = shamirShare?.encryptedShare || '';
        const shareIndex = shamirShare?.index || (i + 1);
        
        await client.query(
          `INSERT INTO inheritance_trustees 
           (id, plan_id, user_id, email, name, share_index, encrypted_share, has_approved)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            plan.id,
            userId, // Set the actual user ID if found, null if not
            trustee.email,
            trustee.name,
            shareIndex, // Use Shamir share index
            encryptedShare, // Store the encrypted Shamir share
            false
          ]
        );
      }
      
      // Log warning for missing trustees
      if (missingTrustees.length > 0) {
        console.warn(`Warning: The following trustees do not have accounts in the system: ${missingTrustees.join(', ')}. They will need to register before they can approve plans.`);
      }
      
      // Create beneficiaries
      for (const beneficiary of request.beneficiaries) {
        await client.query(
          `INSERT INTO inheritance_beneficiaries 
           (id, plan_id, email, name, relationship)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            crypto.randomUUID(),
            plan.id,
            beneficiary.email,
            beneficiary.name,
            beneficiary.relationship
          ]
        );
      }
      
      // Create inheritance items
      for (const vaultItemId of request.vaultItemIds) {
        // Skip null or empty vault item IDs
        if (!vaultItemId || vaultItemId.trim() === '') {
          console.warn('Skipping empty vault item ID');
          continue;
        }
        
        // Get vault item details
        const itemResult = await client.query(
          'SELECT name, category FROM vault_items WHERE id = $1 AND user_id = $2',
          [vaultItemId, ownerId]
        );
        
        if (itemResult.rows.length === 0) {
          throw new Error(`Vault item ${vaultItemId} not found`);
        }
        
        const item = itemResult.rows[0];
        
        await client.query(
          `INSERT INTO inheritance_items 
           (id, plan_id, vault_item_id, item_name, item_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            crypto.randomUUID(),
            plan.id,
            vaultItemId,
            item.name,
            item.category
          ]
        );
      }
      
      await client.query('COMMIT');
      
      // Log audit event
      console.log('Creating audit log for inheritance plan creation:', plan.id);
      try {
        await logAuditEvent(
          tenantId,
          ownerId,
          AuditAction.INHERITANCE_PLAN_CREATED,
          ResourceType.INHERITANCE_PLAN,
          plan.id,
          {
            planName: plan.name,
            trusteeCount: request.trustees.length,
            beneficiaryCount: request.beneficiaries.length,
            itemCount: request.vaultItemIds.length,
            kThreshold: request.kThreshold
          }
        );
        console.log('Audit log created successfully for plan:', plan.id);
      } catch (auditError) {
        console.error('Failed to create audit log for plan:', plan.id, auditError);
      }
      
      return this.mapPlanFromDbDirect(plan);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get plan status with all related data
   */
  async getPlanStatus(planId: string, userId: string): Promise<PlanStatus | null> {
    const client = await db.connect();
    
    try {
      // Get plan
      const planResult = await client.query(
        'SELECT * FROM inheritance_plans WHERE id = $1 AND owner_id = $2',
        [planId, userId]
      );
      
      if (planResult.rows.length === 0) {
        return null;
      }
      
      const plan = planResult.rows[0];
      
      // Get trustees
      const trusteesResult = await client.query(
        'SELECT * FROM inheritance_trustees WHERE plan_id = $1 ORDER BY share_index',
        [planId]
      );
      
      // Get beneficiaries
      const beneficiariesResult = await client.query(
        'SELECT * FROM inheritance_beneficiaries WHERE plan_id = $1',
        [planId]
      );
      
      // Get items
      const itemsResult = await client.query(
        'SELECT * FROM inheritance_items WHERE plan_id = $1',
        [planId]
      );
      
      const approvedCount = trusteesResult.rows.filter(t => t.has_approved).length;
      
      return {
        plan: this.mapPlanFromDbDirect(plan),
        trustees: trusteesResult.rows.map(this.mapTrusteeFromDbDirect),
        beneficiaries: beneficiariesResult.rows.map(this.mapBeneficiaryFromDbDirect),
        items: itemsResult.rows.map(this.mapItemFromDbDirect),
        approvalProgress: {
          approved: approvedCount,
          total: trusteesResult.rows.length,
          canTrigger: approvedCount >= plan.k_threshold
        }
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * List all plans for a user
   */
  async listPlans(userId: string): Promise<InheritancePlan[]> {
    const client = await db.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM inheritance_plans WHERE owner_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      
      return result.rows.map(this.mapPlanFromDbDirect);
    } finally {
      client.release();
    }
  }
  
  /**
   * Approve a plan as a trustee
   */
  async approvePlan(trusteeId: string, request: ApprovePlanRequest): Promise<boolean> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get trustee details
      const trusteeResult = await client.query(
        'SELECT * FROM inheritance_trustees WHERE id = $1',
        [trusteeId]
      );
      
      if (trusteeResult.rows.length === 0) {
        throw new Error('Trustee not found');
      }
      
      const trustee = trusteeResult.rows[0];
      
      if (trustee.has_approved) {
        throw new Error('Plan already approved by this trustee');
      }
      
      // Get plan details with owner's tenant_id for audit logging
      const planResult = await client.query(
        `SELECT ip.*, u.tenant_id 
         FROM inheritance_plans ip 
         JOIN users u ON ip.owner_id = u.id 
         WHERE ip.id = $1`,
        [trustee.plan_id]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('Plan not found');
      }
      
      const plan = planResult.rows[0];
      
      // Update trustee approval
      await client.query(
        'UPDATE inheritance_trustees SET has_approved = true, approved_at = NOW() WHERE id = $1',
        [trusteeId]
      );
      
      // Check if plan can now be triggered
      const approvalCountResult = await client.query(
        'SELECT COUNT(*) as count FROM inheritance_trustees WHERE plan_id = $1 AND has_approved = true',
        [trustee.plan_id]
      );
      
      const approvalCount = parseInt(approvalCountResult.rows[0].count);
      const kThreshold = plan.k_threshold;
      
      if (approvalCount >= kThreshold) {
        // Plan is ready to be triggered
        await client.query(
          'UPDATE inheritance_plans SET status = $1 WHERE id = $2',
          ['ready', trustee.plan_id]
        );
      }
      
      await client.query('COMMIT');
      
      // Log audit event
      console.log('Creating audit log for inheritance plan approval:', plan.id);
      try {
        await logAuditEvent(
          plan.tenantId,
          trusteeId,
          AuditAction.INHERITANCE_PLAN_UPDATED,
          ResourceType.INHERITANCE_PLAN,
          plan.id,
          {
            planName: plan.name,
            action: 'approval',
            trusteeEmail: trustee.email,
            approvalStatus: 'approved'
          }
        );
        console.log('Audit log created successfully for plan approval:', plan.id);
      } catch (auditError) {
        console.error('Failed to create audit log for plan approval:', plan.id, auditError);
      }
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Trigger inheritance process
   */
  async triggerInheritance(planId: string, userId: string, request: TriggerInheritanceRequest): Promise<boolean> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get plan details with owner's tenant_id for audit logging
      const planResult = await client.query(
        `SELECT ip.*, u.tenant_id 
         FROM inheritance_plans ip 
         JOIN users u ON ip.owner_id = u.id 
         WHERE ip.id = $1 AND ip.owner_id = $2`,
        [planId, userId]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('Plan not found');
      }
      
      const plan = planResult.rows[0];
      
      if (plan.status !== 'active' && plan.status !== 'ready') {
        throw new Error('Plan cannot be triggered in current status');
      }
      
      // Check waiting period unless emergency override
      if (!request.emergencyOverride) {
        const planAge = Date.now() - new Date(plan.created_at).getTime();
        const waitingPeriodMs = plan.waiting_period_days * 24 * 60 * 60 * 1000;
        
        if (planAge < waitingPeriodMs) {
          throw new Error('Waiting period has not elapsed');
        }
      }
      
      // Check approval threshold
      const approvalCountResult = await client.query(
        'SELECT COUNT(*) as count FROM inheritance_trustees WHERE plan_id = $1 AND has_approved = true',
        [planId]
      );
      
      const approvalCount = parseInt(approvalCountResult.rows[0].count);
      
      if (approvalCount < plan.k_threshold) {
        throw new Error('Insufficient trustee approvals');
      }
      
      // Update plan status
      await client.query(
        'UPDATE inheritance_plans SET status = $1, triggered_at = NOW() WHERE id = $2',
        ['triggered', planId]
      );
      
      // TODO: Send notifications to beneficiaries
      // TODO: Start the inheritance process
      
      await client.query('COMMIT');
      
      // Get counts for audit logging
      const trusteeCountResult = await client.query(
        'SELECT COUNT(*) as count FROM inheritance_trustees WHERE plan_id = $1',
        [planId]
      );
      const beneficiaryCountResult = await client.query(
        'SELECT COUNT(*) as count FROM inheritance_beneficiaries WHERE plan_id = $1',
        [planId]
      );
      const itemCountResult = await client.query(
        'SELECT COUNT(*) as count FROM inheritance_items WHERE plan_id = $1',
        [planId]
      );
      
      // Log audit event
      await logAuditEvent(
        plan.tenantId,
        userId,
        AuditAction.INHERITANCE_TRIGGERED,
        ResourceType.INHERITANCE_PLAN,
        planId,
        {
          planName: plan.name,
          trusteeCount: parseInt(trusteeCountResult.rows[0].count),
          beneficiaryCount: parseInt(beneficiaryCountResult.rows[0].count),
          itemCount: parseInt(itemCountResult.rows[0].count)
        }
      );
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Delete an inheritance plan
   */
  async deletePlan(planId: string, userId: string): Promise<boolean> {
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Get plan details with owner's tenant_id for verification and audit logging
      const planResult = await client.query(
        `SELECT ip.*, u.tenant_id 
         FROM inheritance_plans ip 
         JOIN users u ON ip.owner_id = u.id 
         WHERE ip.id = $1 AND ip.owner_id = $2`,
        [planId, userId]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Plan not found or not authorized');
      }

      const plan = planResult.rows[0];
      if (plan.status === 'triggered' || plan.status === 'completed') {
        throw new Error('Cannot delete a triggered or completed plan');
      }

      // Delete related records first (due to foreign key constraints)
      await client.query('DELETE FROM inheritance_items WHERE plan_id = $1', [planId]);
      await client.query('DELETE FROM inheritance_trustees WHERE plan_id = $1', [planId]);
      await client.query('DELETE FROM inheritance_beneficiaries WHERE plan_id = $1', [planId]);

      // Delete the plan
      await client.query('DELETE FROM inheritance_plans WHERE id = $1', [planId]);

      await client.query('COMMIT');
      
      // Log audit event
      console.log('Creating audit log for inheritance plan deletion:', planId);
      try {
        await logAuditEvent(
          plan.tenant_id,
          userId,
          AuditAction.INHERITANCE_PLAN_DELETED,
          ResourceType.INHERITANCE_PLAN,
          planId,
          {
            planName: plan.name,
            status: plan.status
          }
        );
        console.log('Audit log created successfully for plan deletion:', planId);
      } catch (auditError) {
        console.error('Failed to create audit log for plan deletion:', planId, auditError);
      }
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get plans where user is a trustee
   */
  async getTrusteePlans(userId: string): Promise<Array<{ plan: InheritancePlan; trustee: Trustee }>> {
    const client = await db.connect();
    
    try {
      const result = await client.query(
        `SELECT 
           p.id as plan_id, p.owner_id, p.name, p.description, p.k_threshold, p.n_total, 
           p.waiting_period_days, p.status, p.created_at as plan_created_at, p.updated_at as plan_updated_at,
           p.triggered_at, p.completed_at,
           t.id as trustee_id, t.plan_id, t.user_id, t.email, t.name as trustee_name, 
           t.share_index, t.encrypted_share, t.has_approved, t.approved_at, t.created_at as trustee_created_at
         FROM inheritance_plans p
         JOIN inheritance_trustees t ON p.id = t.plan_id
         WHERE t.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
      );
      
      return result.rows.map(row => ({
        plan: this.mapPlanFromDb(row),
        trustee: this.mapTrusteeFromDb(row)
      }));
    } finally {
      client.release();
    }
  }
  
  // Helper methods to map database rows to types
  private mapPlanFromDb(row: any): InheritancePlan {
    return {
      id: row.plan_id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      kThreshold: row.k_threshold,
      nTotal: row.n_total,
      waitingPeriodDays: row.waiting_period_days,
      status: row.status,
      createdAt: row.plan_created_at,
      updatedAt: row.plan_updated_at,
      triggeredAt: row.triggered_at,
      completedAt: row.completed_at
    };
  }
  
  private mapTrusteeFromDb(row: any): Trustee {
    return {
      id: row.trustee_id,
      planId: row.plan_id,
      userId: row.user_id,
      email: row.email,
      name: row.trustee_name,
      shareIndex: row.share_index,
      encryptedShare: row.encrypted_share,
      hasApproved: row.has_approved,
      approvedAt: row.approved_at,
      createdAt: row.trustee_created_at
    };
  }
  
  private mapBeneficiaryFromDb(row: any): Beneficiary {
    return {
      id: row.id,
      planId: row.plan_id,
      email: row.email,
      name: row.name,
      relationship: row.relationship,
      createdAt: row.created_at
    };
  }

  // Direct mapping methods for queries that don't use aliases
  private mapPlanFromDbDirect(row: any): InheritancePlan {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description,
      kThreshold: row.k_threshold,
      nTotal: row.n_total,
      waitingPeriodDays: row.waiting_period_days,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      triggeredAt: row.triggered_at,
      completedAt: row.completed_at
    };
  }
  
  private mapTrusteeFromDbDirect(row: any): Trustee {
    return {
      id: row.id,
      planId: row.plan_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      shareIndex: row.share_index,
      encryptedShare: row.encrypted_share,
      hasApproved: row.has_approved,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    };
  }

  private mapBeneficiaryFromDbDirect(row: any): Beneficiary {
    return {
      id: row.id,
      planId: row.plan_id,
      email: row.email,
      name: row.name,
      relationship: row.relationship,
      createdAt: row.created_at
    };
  }

  private mapItemFromDbDirect(row: any): InheritanceItem {
    return {
      id: row.id,
      planId: row.plan_id,
      vaultItemId: row.vault_item_id,
      itemName: row.item_name,
      itemType: row.item_type,
      createdAt: row.created_at
    };
  }
  
  private mapItemFromDb(row: any): InheritanceItem {
    return {
      id: row.id,
      planId: row.plan_id,
      vaultItemId: row.vault_item_id,
      itemName: row.item_name,
      itemType: row.item_type,
      createdAt: row.created_at
    };
  }

  /**
   * Update an inheritance plan
   */
  async updatePlan(planId: string, ownerId: string, request: CreatePlanRequest): Promise<any> {
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify ownership
      const planResult = await client.query(
        'SELECT id FROM inheritance_plans WHERE id = $1 AND owner_id = $2',
        [planId, ownerId]
      );
      
      if (planResult.rows.length === 0) {
        throw new Error('Plan not found or access denied');
      }
      
      // Check if plan can be updated (not triggered or completed)
      const currentPlan = await client.query(
        'SELECT status FROM inheritance_plans WHERE id = $1',
        [planId]
      );
      
      if (currentPlan.rows[0].status !== 'active') {
        throw new Error('Cannot update plan that has been triggered or completed');
      }
      
      // Validate trustee count matches k threshold
      if (request.trustees.length < request.kThreshold) {
        throw new Error('Number of trustees must be at least equal to k threshold');
      }
      
      if (request.trustees.length > 10) {
        throw new Error('Maximum 10 trustees allowed');
      }
      
      // Update the plan
      await client.query(
        `UPDATE inheritance_plans 
         SET name = $1, description = $2, k_threshold = $3, n_total = $4, 
             waiting_period_days = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          request.name,
          request.description || null,
          request.kThreshold,
          request.trustees.length,
          request.waitingPeriodDays,
          planId
        ]
      );
      
      // Delete existing trustees, beneficiaries, and items
      await client.query('DELETE FROM inheritance_items WHERE plan_id = $1', [planId]);
      await client.query('DELETE FROM inheritance_beneficiaries WHERE plan_id = $1', [planId]);
      await client.query('DELETE FROM inheritance_trustees WHERE plan_id = $1', [planId]);
      
      // Create new trustees with Shamir shares
      const missingTrustees: string[] = [];
      for (let i = 0; i < request.trustees.length; i++) {
        const trustee = request.trustees[i];
        
        // Look up user ID for the trustee email
        const userResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [trustee.email]
        );
        
        const userId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
        
        if (!userId) {
          missingTrustees.push(trustee.email);
        }

        // Find the corresponding Shamir share for this trustee
        const shamirShare = request.shamirShares?.find(share => share.trusteeEmail === trustee.email);
        const encryptedShare = shamirShare?.encryptedShare || '';
        const shareIndex = shamirShare?.index || (i + 1);
        
        await client.query(
          `INSERT INTO inheritance_trustees 
           (id, plan_id, user_id, email, name, share_index, encrypted_share, has_approved)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            crypto.randomUUID(),
            planId,
            userId,
            trustee.email,
            trustee.name,
            shareIndex,
            encryptedShare,
            false // Reset approvals for updated plan
          ]
        );
      }
      
      // Create new beneficiaries
      for (const beneficiary of request.beneficiaries) {
        await client.query(
          `INSERT INTO inheritance_beneficiaries 
           (id, plan_id, email, name, relationship)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            crypto.randomUUID(),
            planId,
            beneficiary.email,
            beneficiary.name,
            beneficiary.relationship
          ]
        );
      }
      
      // Create new inheritance items
      for (const vaultItemId of request.vaultItemIds) {
        // Skip null or empty vault item IDs
        if (!vaultItemId || vaultItemId.trim() === '') {
          console.warn('Skipping empty vault item ID');
          continue;
        }
        
        // Get vault item details
        const itemResult = await client.query(
          'SELECT name, category FROM vault_items WHERE id = $1 AND user_id = $2',
          [vaultItemId, ownerId]
        );
        
        if (itemResult.rows.length === 0) {
          throw new Error(`Vault item ${vaultItemId} not found`);
        }
        
        const item = itemResult.rows[0];
        
        await client.query(
          `INSERT INTO inheritance_items 
           (id, plan_id, vault_item_id, item_name, item_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            crypto.randomUUID(),
            planId,
            vaultItemId,
            item.name,
            item.category
          ]
        );
      }
      
      await client.query('COMMIT');
      
      // Get user's tenant_id for audit logging
      const userResult = await client.query(
        'SELECT tenant_id FROM users WHERE id = $1',
        [ownerId]
      );
      const tenantId = userResult.rows[0].tenant_id;
      
      // Log audit event
      console.log('Creating audit log for inheritance plan update:', planId);
      try {
        await logAuditEvent(
          tenantId,
          ownerId,
          AuditAction.INHERITANCE_PLAN_UPDATED,
          ResourceType.INHERITANCE_PLAN,
          planId,
          {
            planName: request.name,
            action: 'update',
            trusteeCount: request.trustees.length,
            beneficiaryCount: request.beneficiaries.length,
            itemCount: request.vaultItemIds.length,
            kThreshold: request.kThreshold
          }
        );
        console.log('Audit log created successfully for plan update:', planId);
      } catch (auditError) {
        console.error('Failed to create audit log for plan update:', planId, auditError);
      }
      
      // Log warning for missing trustees
      if (missingTrustees.length > 0) {
        console.warn(`Warning: The following trustees do not have accounts in the system: ${missingTrustees.join(', ')}. They will need to register before they can approve plans.`);
      }
      
      // Return updated plan
      const updatedPlanResult = await client.query(
        'SELECT * FROM inheritance_plans WHERE id = $1',
        [planId]
      );
      
      return this.mapPlanFromDbDirect(updatedPlanResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get trustee shares for a plan (for beneficiaries)
   */
  async getTrusteeShares(planId: string, userId: string): Promise<any[]> {
    const client = await db.connect();
    
    try {
      // Verify user is a beneficiary of this plan
      const beneficiaryResult = await client.query(
        'SELECT id FROM inheritance_beneficiaries WHERE plan_id = $1 AND email = (SELECT email FROM users WHERE id = $2)',
        [planId, userId]
      );
      
      if (beneficiaryResult.rows.length === 0) {
        throw new Error('Access denied: User is not a beneficiary of this plan');
      }
      
      // Get trustee shares
      const sharesResult = await client.query(
        `SELECT 
           it.id as trustee_id,
           it.name as trustee_name,
           it.email as trustee_email,
           it.share_index,
           it.encrypted_share,
           it.has_approved
         FROM inheritance_trustees it
         WHERE it.plan_id = $1
         ORDER BY it.share_index`,
        [planId]
      );
      
      return sharesResult.rows.map(row => ({
        trusteeId: row.trustee_id,
        trusteeName: row.trustee_name,
        trusteeEmail: row.trustee_email,
        share: {
          index: row.share_index,
          share: '', // Not provided to beneficiaries
          encryptedShare: row.encrypted_share
        },
        isAvailable: row.has_approved // Only available if trustee has approved
      }));
    } finally {
      client.release();
    }
  }
}

export const inheritanceService = new InheritanceService();
