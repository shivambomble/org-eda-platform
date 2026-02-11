import { Connection, Client } from '@temporalio/client';

export const createTemporalClient = async () => {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const connection = await Connection.connect({ address });
  const client = new Client({
    connection,
    // namespace: 'default', // defaults to 'default'
  });
  return client;
};

/**
 * Query workflow progress and state
 * Allows external systems to track workflow execution progress
 */
export const queryWorkflowProgress = async (client: Client, workflowId: string, datasetId: string): Promise<any> => {
  try {
    console.log(`[Client] Querying progress for workflow ${workflowId}, dataset ${datasetId}`);
    
    // Get workflow handle
    const handle = client.workflow.getHandle(workflowId);
    
    // Query the workflow for progress
    const progress = await handle.query('getProgress', [datasetId]);
    
    return progress;
  } catch (error: any) {
    console.error(`[Client] Error querying workflow progress: ${error.message}`);
    throw error;
  }
};

/**
 * Get workflow execution history
 * Returns detailed execution history for debugging and monitoring
 */
export const getWorkflowHistory = async (client: Client, workflowId: string): Promise<any> => {
  try {
    console.log(`[Client] Getting history for workflow ${workflowId}`);
    
    const handle = client.workflow.getHandle(workflowId);
    const execution = await handle.describe();
    
    return {
      workflowId: execution.workflowId,
      runId: execution.runId,
      workflowType: execution.type,
      status: execution.status,
      startTime: execution.startTime,
      closeTime: execution.closeTime,
      executionDuration: execution.closeTime ? 
        new Date(execution.closeTime).getTime() - new Date(execution.startTime).getTime() : 
        Date.now() - new Date(execution.startTime).getTime(),
    };
  } catch (error: any) {
    console.error(`[Client] Error getting workflow history: ${error.message}`);
    throw error;
  }
};
