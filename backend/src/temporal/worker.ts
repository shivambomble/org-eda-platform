import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';

async function run() {
  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'cleaning-queue',
    // Increase max concurrent activities to handle parallel processing
    maxConcurrentActivityExecutions: parseInt(process.env.MAX_CONCURRENT_ACTIVITIES || '10'),
    // Increase max concurrent workflows
    maxConcurrentWorkflowTaskExecutions: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '5'),
  });
  
  console.log(`Temporal worker started`);
  console.log(`  Task Queue: ${process.env.TEMPORAL_TASK_QUEUE || 'cleaning-queue'}`);
  console.log(`  Max Concurrent Activities: ${process.env.MAX_CONCURRENT_ACTIVITIES || '10'}`);
  console.log(`  Max Concurrent Workflows: ${process.env.MAX_CONCURRENT_WORKFLOWS || '5'}`);
  console.log(`  Temporal Server: ${process.env.TEMPORAL_ADDRESS || 'localhost:7233'}`);
  
  await worker.run();
}

run().catch((err) => {
  console.error('Worker error:', err);
  process.exit(1);
});
