import { notificationService } from './notificationService';
import { NotificationType } from './types';
import { query } from '../auth-service/database';

export class NotificationHelper {
  /**
   * Send notification to inheritance plan owner
   */
  static async notifyPlanOwner(
    tenantId: string,
    planId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('Notifying plan owner:', { tenantId, planId, type, title });
      
      // Get plan owner
      const result = await query(
        `SELECT owner_id FROM inheritance_plans WHERE id = $1`,
        [planId]
      );

      if (result.rows.length === 0) {
        console.error('Plan not found:', planId);
        return;
      }

      const ownerId = result.rows[0].owner_id;
      
      await notificationService.createNotification(tenantId, {
        user_id: ownerId,
        type,
        title,
        message,
        data: { planId, ...data }
      });

      console.log('Plan owner notified successfully:', ownerId);
    } catch (error) {
      console.error('Failed to notify plan owner:', error);
    }
  }

  /**
   * Send notification to all trustees of a plan
   */
  static async notifyTrustees(
    tenantId: string,
    planId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('Notifying trustees:', { tenantId, planId, type, title });
      
      // Get all trustees (both registered users and email-only)
      const result = await query(
        `SELECT user_id, email, name FROM inheritance_trustees WHERE plan_id = $1`,
        [planId]
      );

      const notifications = [];
      for (const trustee of result.rows) {
        if (trustee.user_id) {
          // Registered user - send notification
          try {
            await notificationService.createNotification(tenantId, {
              user_id: trustee.user_id,
              type,
              title,
              message,
              data: { planId, trusteeEmail: trustee.email, ...data }
            });
            notifications.push(trustee.email);
          } catch (error) {
            console.error(`Failed to notify trustee ${trustee.email}:`, error);
          }
        } else {
          // Email-only trustee - could send email notification here
          console.log(`Trustee ${trustee.email} is not a registered user - email notification would be sent`);
        }
      }

      console.log(`Notified ${notifications.length} trustees:`, notifications);
    } catch (error) {
      console.error('Failed to notify trustees:', error);
    }
  }

  /**
   * Send notification to all beneficiaries of a plan
   */
  static async notifyBeneficiaries(
    tenantId: string,
    planId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('Notifying beneficiaries:', { tenantId, planId, type, title });
      
      // Get all beneficiaries
      const result = await query(
        `SELECT email, name FROM inheritance_beneficiaries WHERE plan_id = $1`,
        [planId]
      );

      // Check which beneficiaries are registered users
      const beneficiaryEmails = result.rows.map(row => row.email);
      if (beneficiaryEmails.length === 0) {
        console.log('No beneficiaries found for plan:', planId);
        return;
      }

      // Get registered users for these emails
      const userResult = await query(
        `SELECT id, email FROM users WHERE tenant_id = $1 AND email = ANY($2)`,
        [tenantId, beneficiaryEmails]
      );

      const notifications = [];
      for (const user of userResult.rows) {
        try {
          await notificationService.createNotification(tenantId, {
            user_id: user.id,
            type,
            title,
            message,
            data: { planId, beneficiaryEmail: user.email, ...data }
          });
          notifications.push(user.email);
        } catch (error) {
          console.error(`Failed to notify beneficiary ${user.email}:`, error);
        }
      }

      console.log(`Notified ${notifications.length} registered beneficiaries:`, notifications);
      
      // Log email-only beneficiaries
      const registeredEmails = userResult.rows.map(row => row.email);
      const emailOnlyBeneficiaries = beneficiaryEmails.filter(email => !registeredEmails.includes(email));
      if (emailOnlyBeneficiaries.length > 0) {
        console.log(`Email-only beneficiaries (would send email):`, emailOnlyBeneficiaries);
      }
    } catch (error) {
      console.error('Failed to notify beneficiaries:', error);
    }
  }

  /**
   * Send notification to a specific user by email
   */
  static async notifyUserByEmail(
    tenantId: string,
    email: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('Notifying user by email:', { tenantId, email, type, title });
      
      // Get user by email
      const result = await query(
        `SELECT id FROM users WHERE tenant_id = $1 AND email = $2`,
        [tenantId, email]
      );

      if (result.rows.length === 0) {
        console.log(`User with email ${email} not found - would send email notification`);
        return;
      }

      const userId = result.rows[0].id;
      
      await notificationService.createNotification(tenantId, {
        user_id: userId,
        type,
        title,
        message,
        data
      });

      console.log('User notified successfully:', email);
    } catch (error) {
      console.error('Failed to notify user by email:', error);
    }
  }

  /**
   * Send inheritance plan created notifications
   */
  static async notifyInheritancePlanCreated(
    tenantId: string,
    planId: string,
    planName: string,
    trusteeCount: number,
    beneficiaryCount: number
  ): Promise<void> {
    const title = 'Inheritance Plan Created';
    const message = `Your inheritance plan "${planName}" has been created with ${trusteeCount} trustees and ${beneficiaryCount} beneficiaries.`;
    
    await this.notifyPlanOwner(tenantId, planId, NotificationType.INHERITANCE_PLAN_CREATED, title, message, {
      planName,
      trusteeCount,
      beneficiaryCount
    });
  }

  /**
   * Send inheritance plan updated notifications
   */
  static async notifyInheritancePlanUpdated(
    tenantId: string,
    planId: string,
    planName: string,
    action: string
  ): Promise<void> {
    const title = 'Inheritance Plan Updated';
    const message = `Your inheritance plan "${planName}" has been ${action}.`;
    
    await this.notifyPlanOwner(tenantId, planId, NotificationType.INHERITANCE_PLAN_UPDATED, title, message, {
      planName,
      action
    });
  }

  /**
   * Send trustee approval required notifications
   */
  static async notifyTrusteeApprovalRequired(
    tenantId: string,
    planId: string,
    planName: string,
    trusteeEmail: string
  ): Promise<void> {
    const title = 'Trustee Approval Required';
    const message = `You have been designated as a trustee for the inheritance plan "${planName}". Please review and approve your participation.`;
    
    await this.notifyUserByEmail(tenantId, trusteeEmail, NotificationType.TRUSTEE_APPROVAL_REQUIRED, title, message, {
      planId,
      planName
    });
  }

  /**
   * Send inheritance plan triggered notifications
   */
  static async notifyInheritancePlanTriggered(
    tenantId: string,
    planId: string,
    planName: string
  ): Promise<void> {
    const title = 'Inheritance Plan Triggered';
    const message = `The inheritance plan "${planName}" has been triggered. The waiting period has begun.`;
    
    // Notify plan owner
    await this.notifyPlanOwner(tenantId, planId, NotificationType.INHERITANCE_PLAN_TRIGGERED, title, message, {
      planName
    });

    // Notify trustees
    await this.notifyTrustees(tenantId, planId, NotificationType.INHERITANCE_PLAN_TRIGGERED, 
      'Inheritance Plan Triggered - Action Required', 
      `The inheritance plan "${planName}" has been triggered. Please prepare for the inheritance process.`, {
      planName
    });

    // Notify beneficiaries
    await this.notifyBeneficiaries(tenantId, planId, NotificationType.BENEFICIARY_NOTIFICATION,
      'Inheritance Plan Activated',
      `You have been designated as a beneficiary in the inheritance plan "${planName}". You will be notified when the inheritance process begins.`, {
      planName
    });
  }

  /**
   * Send inheritance plan deleted notifications
   */
  static async notifyInheritancePlanDeleted(
    tenantId: string,
    planId: string,
    planName: string
  ): Promise<void> {
    const title = 'Inheritance Plan Deleted';
    const message = `Your inheritance plan "${planName}" has been deleted.`;
    
    await this.notifyPlanOwner(tenantId, planId, NotificationType.INHERITANCE_PLAN_DELETED, title, message, {
      planName
    });
  }
}
