import { cleanDatasetActivity, transformDatasetActivity, performEdaActivity } from '../activities';
import { query } from '../../db';
import { transformDataset, loadCSVData } from '../../lib/dataTransform';

// Mock dependencies
jest.mock('../../db');
jest.mock('../../lib/dataTransform');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransformDataset = transformDataset as jest.MockedFunction<typeof transformDataset>;
const mockLoadCSVData = loadCSVData as jest.MockedFunction<typeof loadCSVData>;

describe('Temporal Activities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanDatasetActivity', () => {
    it('should successfully clean a dataset', async () => {
      const mockDataset = {
        id: 'dataset-123',
        s3_path: '/path/to/dataset.csv',
        status: 'UPLOADED',
      };

      const mockTransformResult = {
        duplicatesRemoved: 5,
        columnsProcessed: 10,
        rowsProcessed: 100,
        categoricalColumns: ['category', 'supplier'],
        numericColumns: ['quantity', 'price'],
        dateColumns: ['created_at'],
        derivedFeatures: [],
        statistics: {},
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockDataset], rowCount: 1 } as any) // SELECT dataset
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log INIT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log REMOVE_DUPLICATES
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log NORMALIZE_COLUMNS
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log VALIDATE_SCHEMA
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log DETECT_TYPES
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE status to READY
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // INSERT log COMPLETE

      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      const result = await cleanDatasetActivity('dataset-123');

      expect(result).toBe('CLEAN_SUCCESS');
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM datasets WHERE id = $1', ['dataset-123']);
      expect(mockQuery).toHaveBeenCalledWith("UPDATE datasets SET status = 'READY', updated_at = NOW() WHERE id = $1", ['dataset-123']);
      expect(mockTransformDataset).toHaveBeenCalledWith('/path/to/dataset.csv');
    });

    it('should throw error when dataset not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(cleanDatasetActivity('non-existent')).rejects.toThrow(
        'Dataset non-existent not found - it may have been deleted'
      );
    });

    it('should handle transformation errors', async () => {
      const mockDataset = {
        id: 'dataset-123',
        s3_path: '/path/to/dataset.csv',
        status: 'UPLOADED',
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockDataset], rowCount: 1 } as any) // SELECT dataset
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log INIT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log ERROR
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // UPDATE status to FAILED

      mockTransformDataset.mockRejectedValue(new Error('Invalid CSV format'));

      await expect(cleanDatasetActivity('dataset-123')).rejects.toThrow('Invalid CSV format');
      
      expect(mockQuery).toHaveBeenCalledWith("UPDATE datasets SET status = 'FAILED', updated_at = NOW() WHERE id = $1", ['dataset-123']);
    });
  });

  describe('transformDatasetActivity', () => {
    it('should successfully transform a dataset', async () => {
      const mockDataset = {
        id: 'dataset-456',
        s3_path: '/path/to/dataset.csv',
        status: 'READY',
      };

      const mockTransformResult = {
        duplicatesRemoved: 3,
        columnsProcessed: 8,
        rowsProcessed: 150,
        categoricalColumns: ['category'],
        numericColumns: ['quantity', 'price'],
        dateColumns: [],
        derivedFeatures: ['total_value'],
        statistics: {},
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockDataset], rowCount: 1 } as any) // SELECT dataset
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log TRANSFORM_INIT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE status to TRANSFORMING
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log ENCODE_CATEGORICAL
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log SCALE_NUMERIC
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log PARSE_DATES
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log CREATE_FEATURES
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE status to TRANSFORMED
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // INSERT log TRANSFORM_COMPLETE

      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      const result = await transformDatasetActivity('dataset-456', []);

      expect(result).toBe('TRANSFORM_SUCCESS');
      expect(mockQuery).toHaveBeenCalledWith("UPDATE datasets SET status = 'TRANSFORMING', updated_at = NOW() WHERE id = $1", ['dataset-456']);
      expect(mockTransformDataset).toHaveBeenCalledWith('/path/to/dataset.csv');
    });

    it('should store transformation metadata', async () => {
      const mockDataset = {
        id: 'dataset-456',
        s3_path: '/path/to/dataset.csv',
        status: 'READY',
      };

      const mockTransformResult = {
        duplicatesRemoved: 3,
        categoricalColumns: ['category'],
        numericColumns: ['quantity'],
        dateColumns: [],
        derivedFeatures: ['total_value'],
        columnsProcessed: 5,
        rowsProcessed: 100,
        statistics: {},
      };

      mockQuery.mockResolvedValue({ rows: [mockDataset], rowCount: 1 } as any);
      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      await transformDatasetActivity('dataset-456', []);

      // Find the UPDATE call that sets status to TRANSFORMED
      const updateCalls = (mockQuery as jest.Mock).mock.calls.filter(
        call => call[0].includes('UPDATE datasets SET status')
      );
      
      const transformedCall = updateCalls.find(call => call[0].includes('TRANSFORMED'));
      
      expect(transformedCall).toBeDefined();
      expect(transformedCall[0]).toContain('TRANSFORMED');
    });
  });

  describe('performEdaActivity', () => {
    it('should successfully perform EDA analysis', async () => {
      const mockDataset = {
        id: 'dataset-789',
        s3_path: '/path/to/inventory.csv',
        status: 'TRANSFORMED',
      };

      const mockRawData = [
        { product_id: 'P001', name: 'Widget A', quantity: 100, unit_price: 10, reorder_level: 50, category: 'Electronics', supplier: 'TechCorp' },
        { product_id: 'P002', name: 'Widget B', quantity: 30, unit_price: 15, reorder_level: 50, category: 'Hardware', supplier: 'BuildMart' },
        { product_id: 'P003', name: 'Widget C', quantity: 0, unit_price: 20, reorder_level: 25, category: 'Electronics', supplier: 'TechCorp' },
      ];

      const mockTransformResult = {
        duplicatesRemoved: 0,
        categoricalColumns: ['category', 'supplier'],
        numericColumns: ['quantity', 'unit_price'],
        dateColumns: [],
        derivedFeatures: [],
        columnsProcessed: 7,
        rowsProcessed: 3,
        statistics: {
          totalRows: 3,
          totalColumns: 7,
          missingValues: {},
          columnTypes: {},
          numericStats: {},
          categoricalStats: {},
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockDataset], rowCount: 1 } as any) // SELECT dataset
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT log EDA_INIT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT eda_results
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any); // INSERT log EDA_COMPLETE

      mockLoadCSVData.mockResolvedValue(mockRawData);
      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      const result = await performEdaActivity('dataset-789');

      expect(result).toBe('EDA_SUCCESS');
      expect(mockLoadCSVData).toHaveBeenCalledWith('/path/to/inventory.csv');
      expect(mockTransformDataset).toHaveBeenCalledWith('/path/to/inventory.csv');
      
      const insertCall = (mockQuery as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO eda_results')
      );
      expect(insertCall).toBeDefined();
    });

    it('should calculate correct stock status', async () => {
      const mockDataset = {
        id: 'dataset-stock',
        s3_path: '/path/to/inventory.csv',
      };

      const mockRawData = [
        { quantity: 100, reorder_level: 50 }, // Healthy
        { quantity: 30, reorder_level: 50 },  // Low stock
        { quantity: 0, reorder_level: 25 },   // Out of stock
        { quantity: 75, reorder_level: 50 },  // Healthy
      ];

      const mockTransformResult = {
        duplicatesRemoved: 0,
        categoricalColumns: [],
        numericColumns: ['quantity'],
        dateColumns: [],
        derivedFeatures: [],
        columnsProcessed: 2,
        rowsProcessed: 4,
        statistics: {
          totalRows: 4,
          totalColumns: 2,
          missingValues: {},
          columnTypes: {},
          numericStats: {},
          categoricalStats: {},
        },
      };

      mockQuery.mockResolvedValue({ rows: [mockDataset], rowCount: 1 } as any);
      mockLoadCSVData.mockResolvedValue(mockRawData);
      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      await performEdaActivity('dataset-stock');

      const insertCall = (mockQuery as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO eda_results')
      );
      
      const edaResults = JSON.parse(insertCall[1][1]);
      expect(edaResults.stock_status.healthy).toBe(2);
      expect(edaResults.stock_status.low_stock).toBe(1);
      expect(edaResults.stock_status.out_of_stock).toBe(1);
    });

    it('should calculate correct inventory value', async () => {
      const mockDataset = {
        id: 'dataset-value',
        s3_path: '/path/to/inventory.csv',
      };

      const mockRawData = [
        { quantity: 100, unit_price: 10 }, // 1000
        { quantity: 50, unit_price: 20 },  // 1000
        { quantity: 25, unit_price: 40 },  // 1000
      ];

      const mockTransformResult = {
        duplicatesRemoved: 0,
        categoricalColumns: [],
        numericColumns: ['quantity', 'unit_price'],
        dateColumns: [],
        derivedFeatures: [],
        columnsProcessed: 2,
        rowsProcessed: 3,
        statistics: {
          totalRows: 3,
          totalColumns: 2,
          missingValues: {},
          columnTypes: {},
          numericStats: {},
          categoricalStats: {},
        },
      };

      mockQuery.mockResolvedValue({ rows: [mockDataset], rowCount: 1 } as any);
      mockLoadCSVData.mockResolvedValue(mockRawData);
      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      await performEdaActivity('dataset-value');

      const insertCall = (mockQuery as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO eda_results')
      );
      
      const edaResults = JSON.parse(insertCall[1][1]);
      expect(edaResults.summary.total_inventory_value).toBe(3000);
    });

    it('should generate low stock alerts', async () => {
      const mockDataset = {
        id: 'dataset-alerts',
        s3_path: '/path/to/inventory.csv',
      };

      const mockRawData = [
        { product_name: 'Widget A', quantity: 10, reorder_level: 50, unit_price: 15 },
        { product_name: 'Widget B', quantity: 0, reorder_level: 25, unit_price: 20 },
        { product_name: 'Widget C', quantity: 100, reorder_level: 50, unit_price: 10 },
      ];

      const mockTransformResult = {
        duplicatesRemoved: 0,
        categoricalColumns: [],
        numericColumns: ['quantity', 'unit_price'],
        dateColumns: [],
        derivedFeatures: [],
        columnsProcessed: 4,
        rowsProcessed: 3,
        statistics: {
          totalRows: 3,
          totalColumns: 4,
          missingValues: {},
          columnTypes: {},
          numericStats: {},
          categoricalStats: {},
        },
      };

      mockQuery.mockResolvedValue({ rows: [mockDataset], rowCount: 1 } as any);
      mockLoadCSVData.mockResolvedValue(mockRawData);
      mockTransformDataset.mockResolvedValue(mockTransformResult as any);

      await performEdaActivity('dataset-alerts');

      const insertCall = (mockQuery as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO eda_results')
      );
      
      const edaResults = JSON.parse(insertCall[1][1]);
      expect(edaResults.low_stock_alerts).toHaveLength(2);
      expect(edaResults.low_stock_alerts[0].name).toBe('Widget A');
      expect(edaResults.low_stock_alerts[0].status).toBe('LOW_STOCK');
      expect(edaResults.low_stock_alerts[1].name).toBe('Widget B');
      expect(edaResults.low_stock_alerts[1].status).toBe('OUT_OF_STOCK');
    });
  });
});
