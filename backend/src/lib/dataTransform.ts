import { parse } from 'csv-parse/sync';
import { getFile } from './storage';

export interface TransformationResult {
  rowsProcessed: number;
  columnsProcessed: number;
  duplicatesRemoved: number;
  categoricalColumns: string[];
  numericColumns: string[];
  dateColumns: string[];
  derivedFeatures: string[];
  statistics: DataStatistics;
}

export interface DataStatistics {
  totalRows: number;
  totalColumns: number;
  missingValues: Record<string, number>;
  columnTypes: Record<string, string>;
  numericStats: Record<string, NumericStats>;
  categoricalStats: Record<string, CategoricalStats>;
}

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
}

export interface CategoricalStats {
  uniqueValues: number;
  topValues: Array<{ value: string; count: number }>;
  missingCount: number;
}

/**
 * Load CSV file and parse into records
 */
export const loadCSVData = async (storagePath: string): Promise<any[]> => {
  try {
    const buffer = await getFile(storagePath);
    const csvContent = buffer.toString('utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    console.log(`[DataTransform] Loaded ${records.length} rows from CSV`);
    return records;
  } catch (error: any) {
    console.error('[DataTransform] Error loading CSV:', error);
    throw new Error(`Failed to load CSV data: ${error?.message || 'Unknown error'}`);
  }
};

/**
 * Remove duplicate rows
 */
export const removeDuplicates = (data: any[]): { data: any[]; duplicatesRemoved: number } => {
  const seen = new Set<string>();
  const uniqueData: any[] = [];
  let duplicatesRemoved = 0;

  for (const row of data) {
    const rowKey = JSON.stringify(row);
    if (!seen.has(rowKey)) {
      seen.add(rowKey);
      uniqueData.push(row);
    } else {
      duplicatesRemoved++;
    }
  }

  console.log(`[DataTransform] Removed ${duplicatesRemoved} duplicate rows`);
  return { data: uniqueData, duplicatesRemoved };
};

/**
 * Normalize column names (lowercase, replace spaces with underscores)
 */
export const normalizeColumns = (data: any[]): any[] => {
  if (data.length === 0) return data;

  return data.map(row => {
    const normalizedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      normalizedRow[normalizedKey] = value;
    }
    return normalizedRow;
  });
};

/**
 * Detect column types
 */
export const detectColumnTypes = (data: any[]): Record<string, string> => {
  const columnTypes: Record<string, string> = {};

  if (data.length === 0) return columnTypes;

  const firstRow = data[0];
  for (const column of Object.keys(firstRow)) {
    columnTypes[column] = inferColumnType(data, column);
  }

  return columnTypes;
};

/**
 * Infer column type from sample data
 */
const inferColumnType = (data: any[], column: string): string => {
  const samples = data.slice(0, Math.min(100, data.length));
  let numericCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const row of samples) {
    const value = row[column];
    if (value === null || value === undefined || value === '') continue;

    // Check if numeric
    if (!isNaN(Number(value)) && value !== '') {
      numericCount++;
    }
    // Check if date
    else if (isValidDate(value)) {
      dateCount++;
    }
    // Check if boolean
    else if (['true', 'false', 'yes', 'no', '1', '0'].includes(String(value).toLowerCase())) {
      booleanCount++;
    }
  }

  const validSamples = samples.filter(r => r[column] !== null && r[column] !== undefined && r[column] !== '').length;
  if (validSamples === 0) return 'unknown';

  if (numericCount / validSamples > 0.8) return 'numeric';
  if (dateCount / validSamples > 0.8) return 'date';
  if (booleanCount / validSamples > 0.8) return 'boolean';
  return 'categorical';
};

/**
 * Check if value is a valid date
 */
const isValidDate = (value: any): boolean => {
  if (!value) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Encode categorical columns (simple label encoding)
 */
export const encodeCategorical = (data: any[], categoricalColumns: string[]): any[] => {
  const encodingMaps: Record<string, Map<string, number>> = {};

  // Build encoding maps
  for (const column of categoricalColumns) {
    const uniqueValues = new Set<string>();
    for (const row of data) {
      const value = String(row[column] || '');
      uniqueValues.add(value);
    }
    encodingMaps[column] = new Map(
      Array.from(uniqueValues).map((val, idx) => [val, idx])
    );
  }

  // Apply encoding
  const encodedData = data.map(row => {
    const newRow = { ...row };
    for (const column of categoricalColumns) {
      const value = String(row[column] || '');
      newRow[`${column}_encoded`] = encodingMaps[column].get(value) || -1;
    }
    return newRow;
  });

  console.log(`[DataTransform] Encoded ${categoricalColumns.length} categorical columns`);
  return encodedData;
};

/**
 * Scale numeric columns (min-max normalization)
 */
export const scaleNumeric = (data: any[], numericColumns: string[]): any[] => {
  const scalingParams: Record<string, { min: number; max: number }> = {};

  // Calculate min/max for each numeric column
  for (const column of numericColumns) {
    let min = Infinity;
    let max = -Infinity;

    for (const row of data) {
      const value = Number(row[column]);
      if (!isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    scalingParams[column] = { min, max };
  }

  // Apply scaling
  const scaledData = data.map(row => {
    const newRow = { ...row };
    for (const column of numericColumns) {
      const value = Number(row[column]);
      if (!isNaN(value)) {
        const { min, max } = scalingParams[column];
        const range = max - min || 1;
        newRow[`${column}_scaled`] = (value - min) / range;
      }
    }
    return newRow;
  });

  console.log(`[DataTransform] Scaled ${numericColumns.length} numeric columns`);
  return scaledData;
};

/**
 * Parse date columns
 */
export const parseDates = (data: any[], dateColumns: string[]): any[] => {
  const parsedData = data.map(row => {
    const newRow = { ...row };
    for (const column of dateColumns) {
      const value = row[column];
      if (value) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            newRow[`${column}_parsed`] = date.toISOString();
            newRow[`${column}_year`] = date.getFullYear();
            newRow[`${column}_month`] = date.getMonth() + 1;
            newRow[`${column}_day`] = date.getDate();
          }
        } catch (e) {
          console.warn(`[DataTransform] Failed to parse date: ${value}`);
        }
      }
    }
    return newRow;
  });

  console.log(`[DataTransform] Parsed ${dateColumns.length} date columns`);
  return parsedData;
};

/**
 * Create derived features
 */
export const createDerivedFeatures = (data: any[], numericColumns: string[]): { data: any[]; features: string[] } => {
  const derivedFeatures: string[] = [];

  const dataWithFeatures = data.map(row => {
    const newRow = { ...row };

    // Feature 1: Sum of all numeric columns
    if (numericColumns.length > 0) {
      let sum = 0;
      for (const column of numericColumns) {
        const value = Number(row[column]);
        if (!isNaN(value)) sum += value;
      }
      newRow['numeric_sum'] = sum;
      if (!derivedFeatures.includes('numeric_sum')) derivedFeatures.push('numeric_sum');
    }

    // Feature 2: Average of numeric columns
    if (numericColumns.length > 0) {
      let sum = 0;
      let count = 0;
      for (const column of numericColumns) {
        const value = Number(row[column]);
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      }
      newRow['numeric_avg'] = count > 0 ? sum / count : 0;
      if (!derivedFeatures.includes('numeric_avg')) derivedFeatures.push('numeric_avg');
    }

    return newRow;
  });

  console.log(`[DataTransform] Created ${derivedFeatures.length} derived features`);
  return { data: dataWithFeatures, features: derivedFeatures };
};

/**
 * Calculate statistics for the dataset
 */
export const calculateStatistics = (data: any[], columnTypes: Record<string, string>): DataStatistics => {
  const statistics: DataStatistics = {
    totalRows: data.length,
    totalColumns: Object.keys(columnTypes).length,
    missingValues: {},
    columnTypes,
    numericStats: {},
    categoricalStats: {},
  };

  if (data.length === 0) return statistics;

  const firstRow = data[0];
  for (const column of Object.keys(firstRow)) {
    // Count missing values
    let missingCount = 0;
    for (const row of data) {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        missingCount++;
      }
    }
    statistics.missingValues[column] = missingCount;

    // Calculate column-specific statistics
    const columnType = columnTypes[column];
    if (columnType === 'numeric') {
      statistics.numericStats[column] = calculateNumericStats(data, column);
    } else if (columnType === 'categorical') {
      statistics.categoricalStats[column] = calculateCategoricalStats(data, column);
    }
  }

  return statistics;
};

/**
 * Calculate numeric statistics
 */
const calculateNumericStats = (data: any[], column: string): NumericStats => {
  const values = data
    .map(row => Number(row[column]))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0 };
  }

  const min = values[0];
  const max = values[values.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = values[Math.floor(values.length / 2)];
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];

  return { min, max, mean, median, stdDev, q1, q3 };
};

/**
 * Calculate categorical statistics
 */
const calculateCategoricalStats = (data: any[], column: string): CategoricalStats => {
  const valueCounts = new Map<string, number>();
  let missingCount = 0;

  for (const row of data) {
    const value = String(row[column] || '');
    if (value === '') {
      missingCount++;
    } else {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }
  }

  const topValues = Array.from(valueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  return {
    uniqueValues: valueCounts.size,
    topValues,
    missingCount,
  };
};

/**
 * Full transformation pipeline
 */
export const transformDataset = async (storagePath: string): Promise<TransformationResult> => {
  console.log(`[DataTransform] Starting transformation for: ${storagePath}`);

  // Step 1: Load data
  let data = await loadCSVData(storagePath);
  console.log(`[DataTransform] Loaded ${data.length} rows`);

  // Step 2: Remove duplicates
  const { data: deduplicatedData, duplicatesRemoved } = removeDuplicates(data);
  data = deduplicatedData;

  // Step 3: Normalize columns
  data = normalizeColumns(data);

  // Step 4: Detect column types
  const columnTypes = detectColumnTypes(data);
  const categoricalColumns = Object.entries(columnTypes)
    .filter(([_, type]) => type === 'categorical')
    .map(([col, _]) => col);
  const numericColumns = Object.entries(columnTypes)
    .filter(([_, type]) => type === 'numeric')
    .map(([col, _]) => col);
  const dateColumns = Object.entries(columnTypes)
    .filter(([_, type]) => type === 'date')
    .map(([col, _]) => col);

  // Step 5: Encode categorical columns
  data = encodeCategorical(data, categoricalColumns);

  // Step 6: Scale numeric columns
  data = scaleNumeric(data, numericColumns);

  // Step 7: Parse dates
  data = parseDates(data, dateColumns);

  // Step 8: Create derived features
  const { data: dataWithFeatures, features: derivedFeatures } = createDerivedFeatures(data, numericColumns);
  data = dataWithFeatures;

  // Step 9: Calculate statistics
  const statistics = calculateStatistics(data, columnTypes);

  const result: TransformationResult = {
    rowsProcessed: data.length,
    columnsProcessed: Object.keys(columnTypes).length,
    duplicatesRemoved,
    categoricalColumns,
    numericColumns,
    dateColumns,
    derivedFeatures,
    statistics,
  };

  console.log(`[DataTransform] Transformation complete:`, result);
  return result;
};
