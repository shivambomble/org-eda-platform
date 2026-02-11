import { proxyActivities, RetryPolicy, ApplicationFailure, workflowInfo } from '@temporalio/workflow';
import type * as activities from './activities';

const { 
  cleanDatasetActivity, 
  transformDatasetActivity, 
  performEdaActivity,
  checkWorkflowStateActivity,
  rollbackDatasetActivity,
  queryWorkflowProgressActivity
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes', // Increased from 1 minute to handle large datasets
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '1m',
    maximumAttempts: 3, // Reduced from 5 to 3 for faster failure detection
  } as RetryPolicy,
});

/**
 * Clean dataset workflow with idempotency support
 * - Checks if workflow already ran to prevent duplicate processing
 * - Handles large datasets with proper timeouts
 */
export async function cleanDatasetWorkflow(datasetId: string): Promise<string> {
  const info = workflowInfo();
  const workflowId = info.workflowId;
  
  console.log(`[Workflow] cleanDatasetWorkflow started - workflowId: ${workflowId}, datasetId: ${datasetId}`);

  try {
    // Check if this workflow already completed (idempotency)
    const existingState = await checkWorkflowStateActivity(datasetId, 'CLEAN', workflowId);
    if (existingState.alreadyProcessed) {
      console.log(`[Workflow] Dataset ${datasetId} already cleaned by workflow ${existingState.previousWorkflowId}. Returning cached result.`);
      return 'CLEAN_SUCCESS';
    }

    const result = await cleanDatasetActivity(datasetId);
    return result;
  } catch (error: any) {
    // If dataset not found, don't retry - it's a permanent error
    if (error.message?.includes('Dataset not found')) {
      console.error(`[Workflow] Permanent failure: Dataset ${datasetId} not found`);
      throw ApplicationFailure.nonRetryable(`Permanent failure: ${error.message}`);
    }
    
    // Log workflow failure for debugging
    console.error(`[Workflow] cleanDatasetWorkflow failed for ${datasetId}: ${error.message}`);
    throw error;
  }
}

/**
 * Transform dataset workflow with idempotency and state management
 * - Checks if workflow already ran to prevent duplicate processing
 * - Handles large datasets with proper timeouts
 * - Manages state transitions: READY -> TRANSFORMING -> TRANSFORMED -> EDA_RUNNING -> EDA_COMPLETE
 */
export async function transformDatasetWorkflow(datasetId: string, transformations: any[] = []): Promise<string> {
  const info = workflowInfo();
  const workflowId = info.workflowId;
  
  console.log(`[Workflow] transformDatasetWorkflow started - workflowId: ${workflowId}, datasetId: ${datasetId}`);

  try {
    // Check if this workflow already completed (idempotency)
    const existingState = await checkWorkflowStateActivity(datasetId, 'TRANSFORM', workflowId);
    if (existingState.alreadyProcessed) {
      console.log(`[Workflow] Dataset ${datasetId} already transformed by workflow ${existingState.previousWorkflowId}. Returning cached result.`);
      return 'EDA_SUCCESS';
    }

    // Step 1: Transform dataset
    console.log(`[Workflow] Starting transformation for dataset ${datasetId}`);
    await transformDatasetActivity(datasetId, transformations);

    // Step 2: Perform EDA analysis
    console.log(`[Workflow] Starting EDA analysis for dataset ${datasetId}`);
    const result = await performEdaActivity(datasetId);
    
    console.log(`[Workflow] transformDatasetWorkflow completed successfully for ${datasetId}`);
    return result;
  } catch (error: any) {
    const errorMessage = error.message || '';
    const causeMessage = error.cause?.message || '';
    const fullErrorMessage = `${errorMessage} ${causeMessage}`;

    // If dataset not found, don't retry - it's a permanent error
    if (fullErrorMessage.includes('Dataset not found')) {
      console.error(`[Workflow] Permanent failure: Dataset ${datasetId} not found`);
      throw ApplicationFailure.nonRetryable(`Permanent failure: ${fullErrorMessage}`);
    }

    // If transformation failed, rollback to prevent inconsistent state
    if (fullErrorMessage.includes('Transformation failed') || fullErrorMessage.includes('Invalid CSV')) {
      console.error(`[Workflow] Transformation failed, rolling back dataset ${datasetId}`);
      try {
        await rollbackDatasetActivity(datasetId, 'TRANSFORM_FAILED');
      } catch (rollbackError) {
        console.error(`[Workflow] Rollback failed: ${rollbackError}`);
      }
      throw ApplicationFailure.nonRetryable(`Transformation failed: ${fullErrorMessage}`);
    }

    // If EDA failed after successful transformation, mark as EDA_FAILED
    if (fullErrorMessage.includes('EDA')) {
      console.error(`[Workflow] EDA analysis failed for dataset ${datasetId}`);
      try {
        await rollbackDatasetActivity(datasetId, 'EDA_FAILED');
      } catch (rollbackError) {
        console.error(`[Workflow] Rollback failed: ${rollbackError}`);
      }
      throw ApplicationFailure.nonRetryable(`EDA analysis failed: ${fullErrorMessage}`);
    }

    // Log workflow failure for debugging
    console.error(`[Workflow] transformDatasetWorkflow failed for ${datasetId}: ${fullErrorMessage}`);
    throw error;
  }
}

/**
 * Query workflow progress and state
 * Allows external systems to track workflow execution progress
 * Can be called at any time to get current status
 */
export async function queryWorkflowProgress(datasetId: string): Promise<any> {
  console.log(`[Workflow] Querying progress for dataset ${datasetId}`);
  
  try {
    const progress = await queryWorkflowProgressActivity(datasetId);
    return progress;
  } catch (error: any) {
    console.error(`[Workflow] Error querying progress: ${error.message}`);
    throw error;
  }
}
