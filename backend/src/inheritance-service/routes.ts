import { Router } from 'express';
import { inheritanceService } from './inheritanceService';
import { authenticateToken } from '../auth-service/middleware';
import type { CreatePlanRequest, ApprovePlanRequest, TriggerInheritanceRequest } from './types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /plans - Create a new inheritance plan
 */
router.post('/plans', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const request: CreatePlanRequest = req.body;
    
    // Validate request
    if (!request.name || !request.kThreshold || !request.trustees || !request.beneficiaries) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    if (request.kThreshold < 2) {
      return res.status(400).json({
        success: false,
        error: 'k threshold must be at least 2'
      });
    }
    
    if (request.trustees.length < request.kThreshold) {
      return res.status(400).json({
        success: false,
        error: 'Number of trustees must be at least equal to k threshold'
      });
    }
    
    if (request.waitingPeriodDays < 1) {
      return res.status(400).json({
        success: false,
        error: 'Waiting period must be at least 1 day'
      });
    }
    
    const plan = await inheritanceService.createPlan(userId, request);
    
    res.status(201).json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error creating inheritance plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create plan'
    });
  }
});

/**
 * GET /plans - List user's inheritance plans
 */
router.get('/plans', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const plans = await inheritanceService.listPlans(userId);
    
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error listing inheritance plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list plans'
    });
  }
});

/**
 * GET /plans/:id - Get plan status
 */
router.get('/plans/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    
    const planStatus = await inheritanceService.getPlanStatus(planId, userId);
    
    if (!planStatus) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    res.json({
      success: true,
      ...planStatus
    });
  } catch (error) {
    console.error('Error getting plan status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get plan status'
    });
  }
});

/**
 * POST /plans/:id/approve - Approve a plan as a trustee
 */
router.post('/plans/:id/approve', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    const request: ApprovePlanRequest = req.body;
    
    // Use trusteeId from request body
    const trusteeId = request.trusteeId;
    
    if (!trusteeId) {
      return res.status(400).json({
        success: false,
        error: 'Trustee ID is required'
      });
    }
    
    // Verify the trustee belongs to the authenticated user and the plan
    const client = await (await import('../auth-service/database')).pool.connect();
    try {
      const trusteeResult = await client.query(
        'SELECT id FROM inheritance_trustees WHERE id = $1 AND plan_id = $2 AND user_id = $3',
        [trusteeId, planId, userId]
      );
      
      if (trusteeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Trustee not found for this plan'
        });
      }
      
      const success = await inheritanceService.approvePlan(trusteeId, request);
      
      res.json({
        success,
        message: success ? 'Plan approved successfully' : 'Failed to approve plan'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error approving plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve plan'
    });
  }
});

/**
 * POST /plans/:id/trigger - Trigger inheritance process
 */
router.post('/plans/:id/trigger', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    const request: TriggerInheritanceRequest = req.body;
    
    if (!request.reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required'
      });
    }
    
    const success = await inheritanceService.triggerInheritance(planId, userId, request);
    
    res.json({
      success,
      message: success ? 'Inheritance process triggered successfully' : 'Failed to trigger inheritance'
    });
  } catch (error) {
    console.error('Error triggering inheritance:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger inheritance'
    });
  }
});

/**
 * GET /trustee-plans - Get plans where user is a trustee
 */
router.get('/trustee-plans', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const trusteePlans = await inheritanceService.getTrusteePlans(userId);
    
    res.json({
      success: true,
      plans: trusteePlans
    });
  } catch (error) {
    console.error('Error getting trustee plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trustee plans'
    });
  }
});

/**
 * DELETE /plans/:id - Delete an inheritance plan
 */
router.delete('/plans/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    
    const success = await inheritanceService.deletePlan(planId, userId);
    
    res.json({
      success,
      message: success ? 'Plan deleted successfully' : 'Failed to delete plan'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete plan'
    });
  }
});

/**
 * GET /plans/:id/trustee-shares - Get trustee shares for a plan (for beneficiaries)
 */
router.get('/plans/:id/trustee-shares', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    
    const shares = await inheritanceService.getTrusteeShares(planId, userId);
    res.json({ success: true, shares });
  } catch (error) {
    console.error('Error fetching trustee shares:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trustee shares'
    });
  }
});

/**
 * PUT /plans/:id - Update an inheritance plan
 */
router.put('/plans/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const planId = req.params.id;
    const request = req.body;
    
    const result = await inheritanceService.updatePlan(planId, userId, request);
    
    res.json({
      success: true,
      plan: result,
      message: 'Plan updated successfully'
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update plan'
    });
  }
});

export default router;
