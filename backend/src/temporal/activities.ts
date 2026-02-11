import { query } from '../db';
import { transformDataset, loadCSVData } from '../lib/dataTransform';
import { heartbeat, Context } from '@temporalio/activity';

/**
 * Safely call heartbeat if in activity context
 * Prevents false timeouts by signaling activity is still running
 * In tests, this might not be available
 */
const safeHeartbeat = (details?: any) => {
  try {
    if (Context.current()) {
      heartbeat(details);
    }
  } catch (error: any) {
    // Not in activity context, skip heartbeat
    // Re-throw if it's a cancellation error
    if (error.name === 'CancelledFailure') {
      throw error;
    }
  }
};

/**
 * Heartbeat with progress details
 * Allows workflow to track activity progress and detect stalls
 */
const heartbeatWithProgress = (step: string, progress: number, total: number) => {
  safeHeartbeat({
    step,
    progress,
    total,
    percentage: Math.round((progress / total) * 100),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Check if a workflow already processed this dataset
 * Implements idempotency by tracking workflow executions
 */
export const checkWorkflowStateActivity = async (
  datasetId: string,
  workflowType: 'CLEAN' | 'TRANSFORM',
  currentWorkflowId: string
): Promise<{ alreadyProcessed: boolean; previousWorkflowId?: string }> => {
  console.log(`[Activity] Checking workflow state for dataset ${datasetId}, type: ${workflowType}`);

  try {
    // Check if dataset has already been processed by this workflow type
    const res = await query(
      `SELECT workflow_id, status FROM datasets WHERE id = $1`,
      [datasetId]
    );

    if (res.rows.length === 0) {
      return { alreadyProcessed: false };
    }

    const dataset = res.rows[0];
    const expectedStatus = workflowType === 'CLEAN' ? 'READY' : 'EDA_COMPLETE';

    // If dataset is already in the expected final state, it was already processed
    if (dataset.status === expectedStatus && dataset.workflow_id && dataset.workflow_id !== currentWorkflowId) {
      console.log(`[Activity] Dataset ${datasetId} already processed by workflow ${dataset.workflow_id}`);
      return { alreadyProcessed: true, previousWorkflowId: dataset.workflow_id };
    }

    return { alreadyProcessed: false };
  } catch (error: any) {
    console.error(`[Activity] Error checking workflow state: ${error.message}`);
    // If we can't check state, proceed with processing (fail-open)
    return { alreadyProcessed: false };
  }
};

/**
 * Rollback dataset to a failed state
 * Used when transformation or EDA fails to prevent inconsistent state
 */
export const rollbackDatasetActivity = async (datasetId: string, failureStatus: string): Promise<void> => {
  console.log(`[Activity] Rolling back dataset ${datasetId} to status: ${failureStatus}`);

  try {
    await query(
      `UPDATE datasets SET status = $2, updated_at = NOW() WHERE id = $1`,
      [datasetId, failureStatus]
    );

    await logStep(datasetId, 'ROLLBACK', 'SUCCESS', `Dataset rolled back to ${failureStatus}`);
  } catch (error: any) {
    console.error(`[Activity] Rollback failed for dataset ${datasetId}: ${error.message}`);
    throw error;
  }
};

/**
 * Query workflow progress and state
 * Enables external systems to track workflow execution progress
 */
export const queryWorkflowProgressActivity = async (datasetId: string): Promise<any> => {
  console.log(`[Activity] Querying workflow progress for dataset ${datasetId}`);

  try {
    const res = await query(
      `SELECT id, status, workflow_id, created_at, updated_at FROM datasets WHERE id = $1`,
      [datasetId]
    );

    if (res.rows.length === 0) {
      return { status: 'NOT_FOUND', datasetId };
    }

    const dataset = res.rows[0];

    // Get cleaning logs for progress details
    const logsRes = await query(
      `SELECT step_name, status, message, created_at FROM cleaning_logs WHERE dataset_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [datasetId]
    );

    // Get EDA results if available
    const edaRes = await query(
      `SELECT results FROM eda_results WHERE dataset_id = $1 LIMIT 1`,
      [datasetId]
    );

    return {
      datasetId,
      status: dataset.status,
      workflowId: dataset.workflow_id,
      createdAt: dataset.created_at,
      updatedAt: dataset.updated_at,
      recentLogs: logsRes.rows,
      edaResults: edaRes.rows.length > 0 ? edaRes.rows[0].results : null,
    };
  } catch (error: any) {
    console.error(`[Activity] Error querying workflow progress: ${error.message}`);
    throw error;
  }
};

export const cleanDatasetActivity = async (datasetId: string): Promise<string> => {
  console.log(`[Activity] Starting cleaning for dataset: ${datasetId}`);

  // Fetch Dataset Info
  const res = await query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
  if (res.rows.length === 0) {
    const errorMsg = `Dataset ${datasetId} not found - it may have been deleted`;
    console.error(`[Activity Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  const dataset = res.rows[0];

  // 1. Log Step: Started
  await logStep(datasetId, 'INIT', 'STARTED', 'Cleaning workflow started');
  safeHeartbeat({ step: 'INIT', status: 'started' });

  try {
    // Update workflow_id for idempotency tracking
    await query(
      `UPDATE datasets SET workflow_id = $2, status = 'CLEANING' WHERE id = $1`,
      [datasetId, process.env.TEMPORAL_WORKFLOW_ID || 'unknown']
    );
    safeHeartbeat({ step: 'INIT', status: 'workflow_id_set' });

    // 2. Perform real data transformation with heartbeat
    console.log(`[Activity] Transforming dataset ${datasetId}...`);
    const transformResult = await transformDataset(dataset.s3_path);
    heartbeatWithProgress('TRANSFORM', 1, 5);
    
    await logStep(datasetId, 'REMOVE_DUPLICATES', 'SUCCESS', `Removed ${transformResult.duplicatesRemoved} duplicate rows`);
    heartbeatWithProgress('REMOVE_DUPLICATES', 2, 5);
    
    await logStep(datasetId, 'NORMALIZE_COLUMNS', 'SUCCESS', `Standardized ${transformResult.columnsProcessed} column names`);
    heartbeatWithProgress('NORMALIZE_COLUMNS', 3, 5);
    
    await logStep(datasetId, 'VALIDATE_SCHEMA', 'SUCCESS', `Validated schema with ${transformResult.rowsProcessed} rows`);
    heartbeatWithProgress('VALIDATE_SCHEMA', 4, 5);
    
    await logStep(datasetId, 'DETECT_TYPES', 'SUCCESS', `Detected ${transformResult.categoricalColumns.length} categorical, ${transformResult.numericColumns.length} numeric, ${transformResult.dateColumns.length} date columns`);
    heartbeatWithProgress('DETECT_TYPES', 5, 5);

    // 3. Update Status
    await query("UPDATE datasets SET status = 'READY', updated_at = NOW() WHERE id = $1", [datasetId]);
    await logStep(datasetId, 'COMPLETE', 'SUCCESS', 'Dataset is ready for analysis');
    safeHeartbeat({ step: 'COMPLETE', status: 'success' });

    return 'CLEAN_SUCCESS';
  } catch (error: any) {
     await logStep(datasetId, 'ERROR', 'FAILED', error.message);
     await query("UPDATE datasets SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [datasetId]);
     safeHeartbeat({ step: 'ERROR', status: 'failed', error: error.message });
     throw error;
  }
};

export const transformDatasetActivity = async (datasetId: string, _transformations: any[] = []): Promise<string> => {
  console.log(`[Activity] Starting transformation for dataset: ${datasetId}`);

  // Fetch Dataset
  const res = await query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
  if (res.rows.length === 0) {
    const errorMsg = `Dataset ${datasetId} not found - it may have been deleted`;
    console.error(`[Activity Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const dataset = res.rows[0];

  await logStep(datasetId, 'TRANSFORM_INIT', 'STARTED', 'Transformation workflow started');
  await query("UPDATE datasets SET status = 'TRANSFORMING', updated_at = NOW() WHERE id = $1", [datasetId]);
  safeHeartbeat({ step: 'TRANSFORM_INIT', status: 'started' });

  try {
     // Perform real transformation with heartbeat
     console.log(`[Activity] Transforming dataset ${datasetId}...`);
     const transformResult = await transformDataset(dataset.s3_path);
     heartbeatWithProgress('TRANSFORM', 1, 4);
     
     await logStep(datasetId, 'ENCODE_CATEGORICAL', 'SUCCESS', `Encoded ${transformResult.categoricalColumns.length} categorical columns`);
     heartbeatWithProgress('ENCODE_CATEGORICAL', 2, 4);
     
     await logStep(datasetId, 'SCALE_NUMERIC', 'SUCCESS', `Scaled ${transformResult.numericColumns.length} numeric columns`);
     heartbeatWithProgress('SCALE_NUMERIC', 3, 4);
     
     await logStep(datasetId, 'PARSE_DATES', 'SUCCESS', `Parsed ${transformResult.dateColumns.length} date columns`);
     heartbeatWithProgress('PARSE_DATES', 4, 4);
     
     await logStep(datasetId, 'CREATE_FEATURES', 'SUCCESS', `Created ${transformResult.derivedFeatures.length} derived features`);
     safeHeartbeat({ step: 'CREATE_FEATURES', status: 'complete' });

     // Store transformation metadata
     await query(
       `UPDATE datasets SET status = 'TRANSFORMED', 
        metadata = $2, updated_at = NOW() WHERE id = $1`,
       [datasetId, JSON.stringify({
         duplicatesRemoved: transformResult.duplicatesRemoved,
         categoricalColumns: transformResult.categoricalColumns,
         numericColumns: transformResult.numericColumns,
         dateColumns: transformResult.dateColumns,
         derivedFeatures: transformResult.derivedFeatures,
       })]
     );

     await logStep(datasetId, 'TRANSFORM_COMPLETE', 'SUCCESS', 'Dataset transformation complete');
     safeHeartbeat({ step: 'TRANSFORM_COMPLETE', status: 'success' });

     return 'TRANSFORM_SUCCESS';
  } catch (error: any) {
     await logStep(datasetId, 'TRANSFORM_ERROR', 'FAILED', error.message);
     await query("UPDATE datasets SET status = 'FAILED', updated_at = NOW() WHERE id = $1", [datasetId]);
     safeHeartbeat({ step: 'TRANSFORM_ERROR', status: 'failed', error: error.message });
     throw error;
  }
};

export const performEdaActivity = async (datasetId: string): Promise<string> => {
  console.log(`[Activity] Starting EDA for dataset: ${datasetId}`);

  // Fetch Dataset
  const res = await query('SELECT * FROM datasets WHERE id = $1', [datasetId]);
  if (res.rows.length === 0) {
    throw new Error(`Dataset ${datasetId} not found`);
  }

  const dataset = res.rows[0];

  await logStep(datasetId, 'EDA_INIT', 'STARTED', 'EDA workflow started');
  safeHeartbeat({ step: 'EDA_INIT', status: 'started' });
  
  try {
      // Update status to indicate EDA is running
      await query("UPDATE datasets SET status = 'EDA_RUNNING', updated_at = NOW() WHERE id = $1", [datasetId]);
      heartbeatWithProgress('EDA_RUNNING', 1, 5);

      // Load raw CSV data for actual analysis
      console.log(`[Activity] Loading CSV data for dataset ${datasetId}...`);
      const rawData = await loadCSVData(dataset.s3_path);
      heartbeatWithProgress('LOAD_DATA', 2, 5);
      
      // Perform real transformation to get statistics
      console.log(`[Activity] Analyzing dataset ${datasetId}...`);
      const transformResult = await transformDataset(dataset.s3_path);
      heartbeatWithProgress('ANALYZE', 3, 5);
      
      const stats = transformResult.statistics;

      // Generate REAL inventory analysis from actual data
      const edaResults = await generateRealInventoryAnalysis(rawData, stats, transformResult);
      heartbeatWithProgress('GENERATE_ANALYSIS', 4, 5);

      await query(
          'INSERT INTO eda_results (dataset_id, results, created_at) VALUES ($1, $2, NOW())',
          [datasetId, JSON.stringify(edaResults)]
      );
      heartbeatWithProgress('STORE_RESULTS', 5, 5);

      // Mark as complete - this is the final success state
      await query("UPDATE datasets SET status = 'EDA_COMPLETE', updated_at = NOW() WHERE id = $1", [datasetId]);

     await logStep(datasetId, 'EDA_COMPLETE', 'SUCCESS', 'Real data analysis complete');
     safeHeartbeat({ step: 'EDA_COMPLETE', status: 'success' });
     return 'EDA_SUCCESS';
  } catch (error: any) {
     // Log the error step
     await logStep(datasetId, 'EDA_ERROR', 'FAILED', error.message);
     
     // Set status to EDA_FAILED to indicate failure in EDA phase
     // This prevents the dataset from being marked as FAILED (which is ambiguous)
     // and allows the workflow to properly handle the rollback
     await query("UPDATE datasets SET status = 'EDA_FAILED', updated_at = NOW() WHERE id = $1", [datasetId]);
     
     safeHeartbeat({ step: 'EDA_ERROR', status: 'failed', error: error.message });
     throw error;
  }
};

/**
 * Generate REAL inventory analysis from actual CSV data
 * This calculates actual metrics, not estimates or mock values
 */
const generateRealInventoryAnalysis = async (rawData: any[], stats: any, transformResult: any): Promise<any> => {
  console.log('[EDA] Starting real inventory analysis from actual data');

  if (rawData.length === 0) {
    throw new Error('No data to analyze');
  }

  // Find inventory-related columns by analyzing column names
  const columnNames = Object.keys(rawData[0] || {}).map(c => c.toLowerCase());
  
  const quantityCol = findColumn(columnNames, ['qty', 'quantity', 'stock', 'stock_qty', 'on_hand', 'quantity_on_hand']);
  const priceCol = findColumn(columnNames, ['price', 'unit_price', 'cost', 'value', 'amount', 'unit_cost']);
  const reorderCol = findColumn(columnNames, ['reorder', 'reorder_level', 'min_stock', 'minimum', 'min_qty']);
  const categoryCol = findColumn(columnNames, ['category', 'type', 'class', 'product_type', 'product_category']);
  const supplierCol = findColumn(columnNames, ['supplier', 'vendor', 'manufacturer', 'source', 'supplier_name']);
  const productCol = findColumn(columnNames, ['product', 'product_name', 'name', 'item', 'item_name', 'product_id']);

  console.log('[EDA] Detected columns:', { quantityCol, priceCol, reorderCol, categoryCol, supplierCol, productCol });

  // Calculate actual metrics from data
  const totalProducts = rawData.length;
  
  // Stock status analysis - REAL calculation
  const stockAnalysis = analyzeStockStatus(rawData, quantityCol, reorderCol);
  
  // Category distribution - REAL calculation
  const categoryDistribution = analyzeCategoryDistribution(rawData, categoryCol);
  
  // Supplier distribution - REAL calculation
  const supplierDistribution = analyzeSupplierDistribution(rawData, supplierCol);
  
  // Inventory value - REAL calculation
  const inventoryValue = calculateInventoryValue(rawData, quantityCol, priceCol);
  
  // Low stock alerts - REAL calculation from actual data
  const lowStockAlerts = generateRealLowStockAlerts(rawData, quantityCol, reorderCol, priceCol, productCol);
  
  // Top products by value - REAL calculation
  const topProductsByValue = generateRealTopProducts(rawData, quantityCol, priceCol, productCol);

  const missingValuesTotal = Object.values(stats.missingValues).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);

  return {
    summary: {
      total_products: totalProducts,
      total_inventory_value: inventoryValue,
      low_stock_count: stockAnalysis.lowStockCount,
      out_of_stock_count: stockAnalysis.outOfStockCount,
      total_rows: stats.totalRows,
      total_columns: stats.totalColumns,
      numeric_columns: transformResult.numericColumns.length,
      categorical_columns: transformResult.categoricalColumns.length,
      date_columns: transformResult.dateColumns.length,
      duplicates_removed: transformResult.duplicatesRemoved,
      missing_values_total: missingValuesTotal,
    },
    stock_status: {
      healthy: stockAnalysis.healthyCount,
      low_stock: stockAnalysis.lowStockCount,
      out_of_stock: stockAnalysis.outOfStockCount,
    },
    category_distribution: categoryDistribution,
    supplier_distribution: supplierDistribution,
    top_products_by_value: topProductsByValue,
    low_stock_alerts: lowStockAlerts,
    column_types: stats.columnTypes,
    missing_values: stats.missingValues,
    numeric_statistics: stats.numericStats,
    categorical_statistics: stats.categoricalStats,
    derived_features: transformResult.derivedFeatures,
    data_quality: {
      completeness: ((stats.totalRows - missingValuesTotal) / (stats.totalRows * stats.totalColumns)) * 100,
      duplicates_removed: transformResult.duplicatesRemoved,
      rows_processed: transformResult.rowsProcessed,
    },
    last_updated: new Date().toISOString()
  };
};

/**
 * Find column by checking multiple possible names
 */
const findColumn = (columnNames: string[], possibleNames: string[]): string | undefined => {
  for (const possible of possibleNames) {
    const found = columnNames.find(col => col.includes(possible));
    if (found) return found;
  }
  return undefined;
};

/**
 * Analyze ACTUAL stock status from data
 * Counts products that are: healthy, low stock, or out of stock
 */
const analyzeStockStatus = (data: any[], quantityCol: string | undefined, reorderCol: string | undefined): any => {
  let healthyCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  if (!quantityCol) {
    console.log('[EDA] No quantity column found, cannot analyze stock status');
    return { healthyCount: 0, lowStockCount: 0, outOfStockCount: 0 };
  }

  for (const row of data) {
    const qty = parseFloat(String(row[quantityCol] || 0));

    if (isNaN(qty)) continue;

    if (qty === 0) {
      outOfStockCount++;
    } else if (reorderCol) {
      const reorderLevel = parseFloat(String(row[reorderCol] || 0));
      if (!isNaN(reorderLevel) && reorderLevel > 0 && qty < reorderLevel) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    } else {
      healthyCount++;
    }
  }

  console.log('[EDA] Stock Status:', { healthyCount, lowStockCount, outOfStockCount });
  return { healthyCount, lowStockCount, outOfStockCount };
};

/**
 * Analyze ACTUAL category distribution from data
 */
const analyzeCategoryDistribution = (data: any[], categoryCol: string | undefined): Record<string, number> => {
  const distribution: Record<string, number> = {};

  if (!categoryCol) {
    distribution['Uncategorized'] = data.length;
    return distribution;
  }

  for (const row of data) {
    const category = String(row[categoryCol] || 'Uncategorized').trim();
    if (category) {
      distribution[category] = (distribution[category] || 0) + 1;
    }
  }

  console.log('[EDA] Category Distribution:', distribution);
  return distribution;
};

/**
 * Analyze ACTUAL supplier distribution from data
 */
const analyzeSupplierDistribution = (data: any[], supplierCol: string | undefined): Record<string, number> => {
  const distribution: Record<string, number> = {};

  if (!supplierCol) {
    distribution['Unknown Supplier'] = data.length;
    return distribution;
  }

  for (const row of data) {
    const supplier = String(row[supplierCol] || 'Unknown Supplier').trim();
    if (supplier) {
      distribution[supplier] = (distribution[supplier] || 0) + 1;
    }
  }

  console.log('[EDA] Supplier Distribution:', distribution);
  return distribution;
};

/**
 * Calculate ACTUAL inventory value from data
 * Formula: SUM(quantity * price)
 */
const calculateInventoryValue = (data: any[], quantityCol: string | undefined, priceCol: string | undefined): number => {
  if (!quantityCol || !priceCol) {
    console.log('[EDA] Cannot calculate inventory value - missing quantity or price column');
    return 0;
  }

  let totalValue = 0;
  for (const row of data) {
    const qty = parseFloat(String(row[quantityCol] || 0));
    const price = parseFloat(String(row[priceCol] || 0));
    
    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      totalValue += qty * price;
    }
  }

  console.log('[EDA] Total Inventory Value:', totalValue);
  return Math.round(totalValue);
};

/**
 * Generate REAL low stock alerts from actual data
 * Only includes products that are actually low stock or out of stock
 */
const generateRealLowStockAlerts = (
  data: any[], 
  quantityCol: string | undefined, 
  reorderCol: string | undefined,
  priceCol: string | undefined,
  productCol: string | undefined
): any[] => {
  const alerts: any[] = [];

  if (!quantityCol) return alerts;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const qty = parseFloat(String(row[quantityCol] || 0));
    const reorderLevel = parseFloat(String(row[reorderCol || ''] || 0));
    const price = parseFloat(String(row[priceCol || ''] || 0));
    const productName = String(row[productCol || ''] || `Product ${i + 1}`).trim();

    if (isNaN(qty)) continue;

    // Only include products that are actually low stock or out of stock
    if (qty === 0 || (reorderLevel > 0 && qty < reorderLevel)) {
      alerts.push({
        product_id: `PROD-${String(i + 1).padStart(5, '0')}`,
        name: productName,
        current_qty: Math.round(qty),
        reorder_level: Math.round(reorderLevel),
        status: qty === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        unit_price: !isNaN(price) ? Math.round(price * 100) / 100 : 0,
        total_value: !isNaN(price) ? Math.round(qty * price) : 0
      });
    }
  }

  console.log(`[EDA] Generated ${alerts.length} low stock alerts from actual data`);
  return alerts.slice(0, 20); // Return top 20 alerts
};

/**
 * Generate REAL top products by value from actual data
 */
const generateRealTopProducts = (
  data: any[], 
  quantityCol: string | undefined, 
  priceCol: string | undefined,
  productCol: string | undefined
): any[] => {
  const products = [];

  if (!quantityCol || !priceCol) {
    console.log('[EDA] Cannot calculate top products - missing quantity or price column');
    return [];
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const qty = parseFloat(String(row[quantityCol] || 0));
    const price = parseFloat(String(row[priceCol] || 0));
    const productName = String(row[productCol || ''] || `Product ${i + 1}`).trim();

    if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
      products.push({
        name: productName,
        quantity: Math.round(qty),
        unit_price: Math.round(price * 100) / 100,
        total_value: Math.round(qty * price)
      });
    }
  }

  // Sort by total value and return top 10
  const topProducts = products
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 10);

  console.log(`[EDA] Top 10 products by value:`, topProducts);
  return topProducts;
};

const logStep = async (datasetId: string, step: string, status: string, message: string) => {
  await query(
    'INSERT INTO cleaning_logs (dataset_id, step_name, status, message) VALUES ($1, $2, $3, $4)',
    [datasetId, step, status, message]
  );
  console.log(`[Log] ${step}: ${status} - ${message}`);
};
