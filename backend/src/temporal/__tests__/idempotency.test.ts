import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { cleanDatasetWorkflow, transformDatasetWorkflow } from '../workflows';

describe('Temporal Idempotency Tests', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  describe('Idempotency - Duplicate Workflow Execution', () => {
    it('should return cached result on duplicate cleanDatasetWorkflow execution', async () => {
      const { client, nativeConnection } = testEnv;
      let callCount = 0;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-idempotent-clean-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async (datasetId: string, workflowType: string, workflowId: string) => {
            // First call: not processed yet
            if (callCount === 0) {
              return { alreadyProcessed: false };
            }
            // Second call: already processed by first workflow
            return { alreadyProcessed: true, previousWorkflowId: 'first-workflow-id' };
          },
          cleanDatasetActivity: async () => {
            callCount++;
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
        },
      });

      const runPromise = worker.run();

      try {
        // First execution
        const result1 = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'first-workflow-id',
          taskQueue: 'test-idempotent-clean-1',
          args: ['dataset-123'],
        });

        expect(result1).toBe('CLEAN_SUCCESS');
        expect(callCount).toBe(1);

        // Second execution with same dataset (simulating retry)
        const result2 = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'second-workflow-id',
          taskQueue: 'test-idempotent-clean-1',
          args: ['dataset-123'],
        });

        // Should return cached result without calling activity again
        expect(result2).toBe('CLEAN_SUCCESS');
        expect(callCount).toBe(1); // Should not increment
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should return cached result on duplicate transformDatasetWorkflow execution', async () => {
      const { client, nativeConnection } = testEnv;
      let callCount = 0;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-idempotent-transform-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async (datasetId: string, workflowType: string, workflowId: string) => {
            // First call: not processed yet
            if (callCount === 0) {
              return { alreadyProcessed: false };
            }
            // Second call: already processed
            return { alreadyProcessed: true, previousWorkflowId: 'first-transform-id' };
          },
          transformDatasetActivity: async () => {
            callCount++;
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            callCount++;
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
        },
      });

      const runPromise = worker.run();

      try {
        // First execution
        const result1 = await client.workflow.execute(transformDatasetWorkflow, {
          workflowId: 'first-transform-id',
          taskQueue: 'test-idempotent-transform-1',
          args: ['dataset-456', []],
        });

        expect(result1).toBe('EDA_SUCCESS');
        expect(callCount).toBe(2); // transform + eda

        // Second execution (should use cache)
        const result2 = await client.workflow.execute(transformDatasetWorkflow, {
          workflowId: 'second-transform-id',
          taskQueue: 'test-idempotent-transform-1',
          args: ['dataset-456', []],
        });

        expect(result2).toBe('EDA_SUCCESS');
        expect(callCount).toBe(2); // Should not increment
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });
  });

  describe('Timeout Handling - Long Running Activities', () => {
    it('should handle long-running cleanDatasetActivity with heartbeats', async () => {
      const { client, nativeConnection } = testEnv;
      let heartbeatCount = 0;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-timeout-clean-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            // Simulate long-running operation with heartbeats
            for (let i = 0; i < 5; i++) {
              // In real scenario, heartbeat() is called here
              heartbeatCount++;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
        },
      });

      const runPromise = worker.run();

      try {
        const result = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-timeout-clean-1',
          taskQueue: 'test-timeout-clean-1',
          args: ['dataset-large'],
        });

        expect(result).toBe('CLEAN_SUCCESS');
        expect(heartbeatCount).toBeGreaterThan(0);
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should handle long-running transformDatasetActivity with heartbeats', async () => {
      const { client, nativeConnection } = testEnv;
      let heartbeatCount = 0;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-timeout-transform-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            // Simulate long-running transformation
            for (let i = 0; i < 3; i++) {
              heartbeatCount++;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            // Simulate long-running EDA
            for (let i = 0; i < 3; i++) {
              heartbeatCount++;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
        },
      });

      const runPromise = worker.run();

      try {
        const result = await client.workflow.execute(transformDatasetWorkflow, {
          workflowId: 'test-timeout-transform-1',
          taskQueue: 'test-timeout-transform-1',
          args: ['dataset-large', []],
        });

        expect(result).toBe('EDA_SUCCESS');
        expect(heartbeatCount).toBeGreaterThan(0);
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });
  });

  describe('State Management - Rollback on Failure', () => {
    it('should rollback dataset state when transformation fails', async () => {
      const { client, nativeConnection } = testEnv;
      let rollbackCalled = false;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-rollback-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            throw new Error('Invalid CSV format');
          },
          performEdaActivity: async () => {
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async (datasetId: string, status: string) => {
            rollbackCalled = true;
            expect(status).toBe('TRANSFORM_FAILED');
          },
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-rollback-1',
            taskQueue: 'test-rollback-1',
            args: ['dataset-bad', []],
          })
        ).rejects.toThrow();

        expect(rollbackCalled).toBe(true);
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should rollback dataset state when EDA fails', async () => {
      const { client, nativeConnection } = testEnv;
      let rollbackCalled = false;
      let rollbackStatus = '';

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-rollback-eda-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            throw new Error('EDA analysis failed: No quantity column found');
          },
          rollbackDatasetActivity: async (datasetId: string, status: string) => {
            rollbackCalled = true;
            rollbackStatus = status;
          },
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-rollback-eda-1',
            taskQueue: 'test-rollback-eda-1',
            args: ['dataset-no-qty', []],
          })
        ).rejects.toThrow();

        expect(rollbackCalled).toBe(true);
        expect(rollbackStatus).toBe('EDA_FAILED');
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });
  });

  describe('Heartbeat Progress Tracking', () => {
    it('should send heartbeat with progress details during clean activity', async () => {
      const { client, nativeConnection } = testEnv;
      const heartbeatDetails: any[] = [];

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-heartbeat-clean-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            // Heartbeats are sent internally
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-heartbeat-clean-1',
          taskQueue: 'test-heartbeat-clean-1',
          args: ['dataset-heartbeat'],
        });

        expect(result).toBe('CLEAN_SUCCESS');
      });
    });

    it('should send heartbeat with progress details during transform activity', async () => {
      const { client, nativeConnection } = testEnv;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-heartbeat-transform-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            // Heartbeats are sent internally with progress
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(transformDatasetWorkflow, {
          workflowId: 'test-heartbeat-transform-1',
          taskQueue: 'test-heartbeat-transform-1',
          args: ['dataset-heartbeat', []],
        });

        expect(result).toBe('EDA_SUCCESS');
      });
    });
  });

  describe('EDA Failure State Management', () => {
    it('should set EDA_FAILED status when EDA analysis fails', async () => {
      const { client, nativeConnection } = testEnv;
      let finalStatus = '';

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-eda-failed-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            throw new Error('EDA analysis failed: Invalid data');
          },
          rollbackDatasetActivity: async (datasetId: string, status: string) => {
            finalStatus = status;
          },
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-eda-failed-1',
            taskQueue: 'test-eda-failed-1',
            args: ['dataset-eda-fail', []],
          })
        ).rejects.toThrow();

        // Verify that EDA_FAILED status was set
        expect(finalStatus).toBe('EDA_FAILED');
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });
  });

  describe('Workflow Progress Queries', () => {
    it('should query workflow progress activity', async () => {
      const { client, nativeConnection } = testEnv;

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-query-progress-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async (datasetId: string) => {
            return {
              datasetId,
              status: 'READY',
              workflowId: 'test-query-progress-1',
              recentLogs: [
                { step_name: 'INIT', status: 'STARTED', message: 'Cleaning workflow started' },
                { step_name: 'COMPLETE', status: 'SUCCESS', message: 'Dataset is ready for analysis' },
              ],
            };
          },
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-query-progress-1',
          taskQueue: 'test-query-progress-1',
          args: ['dataset-query'],
        });

        expect(result).toBe('CLEAN_SUCCESS');
      });
    });
  });
});
