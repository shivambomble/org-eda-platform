import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db';

interface SearchResult {
  type: 'product' | 'category' | 'supplier';
  name: string;
  count: number;
  value?: number;
  status?: string;
}

export const searchInventoryData = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { searchTerm, searchType } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!projectId || !searchTerm) {
      return res.status(400).json({ 
        message: 'projectId and searchTerm are required' 
      });
    }

    // Verify user has access to this project
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check project access based on role
    if (userRole === 'ADMIN') {
      // Admin can access any project in their org
      if (projectRes.rows[0].org_id !== req.user?.org_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === 'ANALYST' || userRole === 'USER') {
      // Analyst and User must be members of the project
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (memberRes.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get the latest EDA results for the project
    const edaRes = await query(
      `SELECT er.results 
       FROM eda_results er
       JOIN datasets d ON er.dataset_id = d.id
       WHERE d.project_id = $1
       ORDER BY er.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (edaRes.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No analysis data available for this project' 
      });
    }

    const edaResults = edaRes.rows[0].results;
    const searchResults = performSearch(
      edaResults, 
      searchTerm as string, 
      searchType as string
    );

    res.json({
      searchTerm,
      searchType: searchType || 'all',
      results: searchResults,
      totalResults: searchResults.length
    });

  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Perform search across inventory data
 */
function performSearch(
  edaResults: any, 
  searchTerm: string, 
  searchType?: string
): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  // Search in products (low stock alerts)
  if (!searchType || searchType === 'product') {
    if (edaResults.low_stock_alerts && Array.isArray(edaResults.low_stock_alerts)) {
      edaResults.low_stock_alerts.forEach((alert: any) => {
        if (
          alert.name?.toLowerCase().includes(lowerSearchTerm) ||
          alert.product_id?.toLowerCase().includes(lowerSearchTerm)
        ) {
          results.push({
            type: 'product',
            name: alert.name || alert.product_id,
            count: alert.current_qty || 0,
            status: alert.status,
            value: alert.current_qty * (alert.unit_price || 0)
          });
        }
      });
    }

    // Search in top products by value
    if (edaResults.top_products_by_value && Array.isArray(edaResults.top_products_by_value)) {
      edaResults.top_products_by_value.forEach((product: any) => {
        if (product.name?.toLowerCase().includes(lowerSearchTerm)) {
          // Check if not already added from low stock alerts
          if (!results.some(r => r.name === product.name && r.type === 'product')) {
            results.push({
              type: 'product',
              name: product.name,
              count: product.quantity || 0,
              value: product.total_value
            });
          }
        }
      });
    }
  }

  // Search in categories
  if (!searchType || searchType === 'category') {
    if (edaResults.category_distribution && typeof edaResults.category_distribution === 'object') {
      Object.entries(edaResults.category_distribution).forEach(([category, count]: [string, any]) => {
        if (category.toLowerCase().includes(lowerSearchTerm)) {
          results.push({
            type: 'category',
            name: category,
            count: count as number
          });
        }
      });
    }
  }

  // Search in suppliers
  if (!searchType || searchType === 'supplier') {
    if (edaResults.supplier_distribution && typeof edaResults.supplier_distribution === 'object') {
      Object.entries(edaResults.supplier_distribution).forEach(([supplier, count]: [string, any]) => {
        if (supplier.toLowerCase().includes(lowerSearchTerm)) {
          results.push({
            type: 'supplier',
            name: supplier,
            count: count as number
          });
        }
      });
    }
  }

  return results;
}

/**
 * Get detailed information about a specific product
 */
export const getProductDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { productName } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!projectId || !productName) {
      return res.status(400).json({ 
        message: 'projectId and productName are required' 
      });
    }

    // Verify access
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (userRole === 'ADMIN') {
      if (projectRes.rows[0].org_id !== req.user?.org_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (memberRes.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get EDA results
    const edaRes = await query(
      `SELECT er.results 
       FROM eda_results er
       JOIN datasets d ON er.dataset_id = d.id
       WHERE d.project_id = $1
       ORDER BY er.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (edaRes.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No analysis data available' 
      });
    }

    const edaResults = edaRes.rows[0].results;
    const productDetails = findProductDetails(edaResults, productName as string);

    if (!productDetails) {
      return res.status(404).json({ 
        message: `Product "${productName}" not found` 
      });
    }

    res.json(productDetails);

  } catch (error) {
    console.error('Product Details Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Find detailed information about a product
 */
function findProductDetails(edaResults: any, productName: string): any {
  const lowerProductName = productName.toLowerCase();

  // Check low stock alerts
  if (edaResults.low_stock_alerts && Array.isArray(edaResults.low_stock_alerts)) {
    const alert = edaResults.low_stock_alerts.find((a: any) =>
      a.name?.toLowerCase() === lowerProductName ||
      a.product_id?.toLowerCase() === lowerProductName
    );
    if (alert) {
      return {
        type: 'product',
        name: alert.name || alert.product_id,
        productId: alert.product_id,
        currentQuantity: alert.current_qty,
        reorderLevel: alert.reorder_level,
        status: alert.status,
        category: alert.category,
        supplier: alert.supplier,
        unitPrice: alert.unit_price,
        totalValue: (alert.current_qty || 0) * (alert.unit_price || 0)
      };
    }
  }

  // Check top products by value
  if (edaResults.top_products_by_value && Array.isArray(edaResults.top_products_by_value)) {
    const product = edaResults.top_products_by_value.find((p: any) =>
      p.name?.toLowerCase() === lowerProductName
    );
    if (product) {
      return {
        type: 'product',
        name: product.name,
        quantity: product.quantity,
        totalValue: product.total_value,
        unitPrice: product.unit_price,
        category: product.category,
        supplier: product.supplier
      };
    }
  }

  return null;
}

/**
 * Get category details with all products in that category
 */
export const getCategoryDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { categoryName } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!projectId || !categoryName) {
      return res.status(400).json({ 
        message: 'projectId and categoryName are required' 
      });
    }

    // Verify access
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (userRole === 'ADMIN') {
      if (projectRes.rows[0].org_id !== req.user?.org_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (memberRes.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get EDA results
    const edaRes = await query(
      `SELECT er.results 
       FROM eda_results er
       JOIN datasets d ON er.dataset_id = d.id
       WHERE d.project_id = $1
       ORDER BY er.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (edaRes.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No analysis data available' 
      });
    }

    const edaResults = edaRes.rows[0].results;
    const categoryCount = edaResults.category_distribution?.[categoryName as string];

    if (categoryCount === undefined) {
      return res.status(404).json({ 
        message: `Category "${categoryName}" not found` 
      });
    }

    // Get products in this category
    const productsInCategory = getProductsByCategory(edaResults, categoryName as string);

    res.json({
      type: 'category',
      name: categoryName,
      productCount: categoryCount,
      products: productsInCategory
    });

  } catch (error) {
    console.error('Category Details Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all products in a specific category
 */
function getProductsByCategory(edaResults: any, categoryName: string): any[] {
  const products: any[] = [];

  // Check low stock alerts
  if (edaResults.low_stock_alerts && Array.isArray(edaResults.low_stock_alerts)) {
    edaResults.low_stock_alerts.forEach((alert: any) => {
      if (alert.category?.toLowerCase() === categoryName.toLowerCase()) {
        products.push({
          name: alert.name || alert.product_id,
          quantity: alert.current_qty,
          status: alert.status,
          unitPrice: alert.unit_price
        });
      }
    });
  }

  // Check top products
  if (edaResults.top_products_by_value && Array.isArray(edaResults.top_products_by_value)) {
    edaResults.top_products_by_value.forEach((product: any) => {
      if (product.category?.toLowerCase() === categoryName.toLowerCase()) {
        if (!products.some(p => p.name === product.name)) {
          products.push({
            name: product.name,
            quantity: product.quantity,
            totalValue: product.total_value,
            unitPrice: product.unit_price
          });
        }
      }
    });
  }

  return products;
}

/**
 * Get supplier details with all products from that supplier
 */
export const getSupplierDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { supplierName } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!projectId || !supplierName) {
      return res.status(400).json({ 
        message: 'projectId and supplierName are required' 
      });
    }

    // Verify access
    const projectRes = await query(
      'SELECT org_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (userRole === 'ADMIN') {
      if (projectRes.rows[0].org_id !== req.user?.org_id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else {
      const memberRes = await query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (memberRes.rows.length === 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Get EDA results
    const edaRes = await query(
      `SELECT er.results 
       FROM eda_results er
       JOIN datasets d ON er.dataset_id = d.id
       WHERE d.project_id = $1
       ORDER BY er.created_at DESC
       LIMIT 1`,
      [projectId]
    );

    if (edaRes.rows.length === 0) {
      return res.status(404).json({ 
        message: 'No analysis data available' 
      });
    }

    const edaResults = edaRes.rows[0].results;
    const supplierCount = edaResults.supplier_distribution?.[supplierName as string];

    if (supplierCount === undefined) {
      return res.status(404).json({ 
        message: `Supplier "${supplierName}" not found` 
      });
    }

    // Get products from this supplier
    const productsFromSupplier = getProductsBySupplier(edaResults, supplierName as string);

    res.json({
      type: 'supplier',
      name: supplierName,
      productCount: supplierCount,
      products: productsFromSupplier
    });

  } catch (error) {
    console.error('Supplier Details Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all products from a specific supplier
 */
function getProductsBySupplier(edaResults: any, supplierName: string): any[] {
  const products: any[] = [];

  // Check low stock alerts
  if (edaResults.low_stock_alerts && Array.isArray(edaResults.low_stock_alerts)) {
    edaResults.low_stock_alerts.forEach((alert: any) => {
      if (alert.supplier?.toLowerCase() === supplierName.toLowerCase()) {
        products.push({
          name: alert.name || alert.product_id,
          quantity: alert.current_qty,
          status: alert.status,
          unitPrice: alert.unit_price
        });
      }
    });
  }

  // Check top products
  if (edaResults.top_products_by_value && Array.isArray(edaResults.top_products_by_value)) {
    edaResults.top_products_by_value.forEach((product: any) => {
      if (product.supplier?.toLowerCase() === supplierName.toLowerCase()) {
        if (!products.some(p => p.name === product.name)) {
          products.push({
            name: product.name,
            quantity: product.quantity,
            totalValue: product.total_value,
            unitPrice: product.unit_price
          });
        }
      }
    });
  }

  return products;
}
