import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { cleanDatasetWorkflow, transformDatasetWorkflow } from '../workflows';

describe('Temporal Workflow Tests', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  describe('cleanDatasetWorkflow', () => {
    it('should successfully clean a dataset', async () => {
      const { client, nativeConnection } = testEnv;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-clean-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async (datasetId: string) => {
            expect(datasetId).toBe('test-dataset-123');
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-clean-workflow-1',
          taskQueue: 'test-clean-1',
          args: ['test-dataset-123'],
        });

        expect(result).toBe('CLEAN_SUCCESS');
      });
    });

    it('should handle dataset not found error', async () => {
      const { client, nativeConnection } = testEnv;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-clean-2',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            throw new Error('Dataset not found');
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(cleanDatasetWorkflow, {
            workflowId: 'test-clean-workflow-error-2',
            taskQueue: 'test-clean-2',
            args: ['non-existent-dataset'],
          })
        ).rejects.toThrow();
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should retry on transient errors', async () => {
      const { client, nativeConnection } = testEnv;
      let attemptCount = 0;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-clean-3',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error('Transient error');
            }
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-clean-workflow-retry-3',
          taskQueue: 'test-clean-3',
          args: ['test-dataset-retry'],
        });

        expect(result).toBe('CLEAN_SUCCESS');
        expect(attemptCount).toBe(3);
      });
    });
  });

  describe('transformDatasetWorkflow', () => {
    it('should successfully transform dataset and perform EDA', async () => {
      const { client, nativeConnection } = testEnv;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-transform-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async (datasetId: string) => {
            expect(datasetId).toBe('test-dataset-456');
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async (datasetId: string) => {
            expect(datasetId).toBe('test-dataset-456');
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        const result = await client.workflow.execute(transformDatasetWorkflow, {
          workflowId: 'test-transform-workflow-1',
          taskQueue: 'test-transform-1',
          args: ['test-dataset-456', []],
        });

        expect(result).toBe('EDA_SUCCESS');
      });
    });

    it('should handle transformation failure', async () => {
      const { client, nativeConnection } = testEnv;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-transform-2',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            throw new Error('Transformation failed');
          },
          performEdaActivity: async () => {
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-transform-workflow-error-2',
            taskQueue: 'test-transform-2',
            args: ['test-dataset-error', []],
          })
        ).rejects.toThrow();
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should handle EDA failure after successful transformation', async () => {
      const { client, nativeConnection } = testEnv;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-transform-3',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            return 'TRANSFORM_SUCCESS';
          },
          performEdaActivity: async () => {
            throw new Error('EDA analysis failed');
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-transform-workflow-eda-error-3',
            taskQueue: 'test-transform-3',
            args: ['test-dataset-eda-error', []],
          })
        ).rejects.toThrow();
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });

    it('should not retry on dataset not found error', async () => {
      const { client, nativeConnection } = testEnv;
      let attemptCount = 0;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-transform-4',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          transformDatasetActivity: async () => {
            attemptCount++;
            const { ApplicationFailure } = await import('@temporalio/common');
            throw ApplicationFailure.nonRetryable('Dataset not found');
          },
          performEdaActivity: async () => {
            return 'EDA_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      const runPromise = worker.run();

      try {
        await expect(
          client.workflow.execute(transformDatasetWorkflow, {
            workflowId: 'test-transform-workflow-not-found-4',
            taskQueue: 'test-transform-4',
            args: ['non-existent-dataset', []],
          })
        ).rejects.toThrow();

        expect(attemptCount).toBe(1);
      } finally {
        worker.shutdown();
        await runPromise;
      }
    });
  });

  describe('Workflow Retry Policy', () => {
    it('should respect maximum retry attempts', async () => {
      const { client, nativeConnection } = testEnv;
      let attemptCount = 0;
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-retry-1',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            attemptCount++;
            throw new Error('Persistent error');
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        await expect(
          client.workflow.execute(cleanDatasetWorkflow, {
            workflowId: 'test-max-retries-1',
            taskQueue: 'test-retry-1',
            args: ['test-dataset-max-retries'],
          })
        ).rejects.toThrow();

        expect(attemptCount).toBeLessThanOrEqual(5);
      });
    });

    it('should use exponential backoff for retries', async () => {
      const { client, nativeConnection } = testEnv;
      const attemptTimes: number[] = [];
      
      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-retry-2',
        workflowsPath: require.resolve('../workflows'),
        activities: {
          checkWorkflowStateActivity: async () => ({ alreadyProcessed: false }),
          cleanDatasetActivity: async () => {
            attemptTimes.push(Date.now());
            if (attemptTimes.length < 3) {
              throw new Error('Retry me');
            }
            return 'CLEAN_SUCCESS';
          },
          rollbackDatasetActivity: async () => {},
          queryWorkflowProgressActivity: async () => ({}),
        },
      });

      await worker.runUntil(async () => {
        await client.workflow.execute(cleanDatasetWorkflow, {
          workflowId: 'test-backoff-2',
          taskQueue: 'test-retry-2',
          args: ['test-dataset-backoff'],
        });

        if (attemptTimes.length >= 3) {
          const firstInterval = attemptTimes[1] - attemptTimes[0];
          const secondInterval = attemptTimes[2] - attemptTimes[1];
          expect(secondInterval).toBeGreaterThan(firstInterval);
        }
      });
    });
  });
});
