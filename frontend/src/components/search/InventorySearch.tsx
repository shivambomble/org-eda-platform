import { useState } from 'react';
import { Search, X, Package, Tag, Truck } from 'lucide-react';
import { Button } from '../ui/Button';
import { getToken } from '../../lib/auth';
import axios from 'axios';

interface SearchResult {
  type: 'product' | 'category' | 'supplier';
  name: string;
  count: number;
  value?: number;
  status?: string;
}

interface InventorySearchProps {
  projectId: string;
  compact?: boolean;
}

const InventorySearch = ({ projectId, compact = true }: InventorySearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'product' | 'category' | 'supplier'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setSelectedResult(null);
    setDetails(null);
    setShowResults(true);

    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${projectId}/search`,
        {
          params: {
            searchTerm: searchTerm.trim(),
            searchType: searchType === 'all' ? undefined : searchType
          },
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      setResults(response.data.results);
      if (response.data.results.length === 0) {
        setError('No results found');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    setSelectedResult(result);
    setDetailsLoading(true);
    setDetails(null);

    try {
      let endpoint = '';
      let params: any = {};

      if (result.type === 'product') {
        endpoint = `${API_URL}/api/projects/${projectId}/product-details`;
        params.productName = result.name;
      } else if (result.type === 'category') {
        endpoint = `${API_URL}/api/projects/${projectId}/category-details`;
        params.categoryName = result.name;
      } else if (result.type === 'supplier') {
        endpoint = `${API_URL}/api/projects/${projectId}/supplier-details`;
        params.supplierName = result.name;
      }

      const response = await axios.get(endpoint, {
        params,
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      setDetails(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'category':
        return <Tag className="w-4 h-4" />;
      case 'supplier':
        return <Truck className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/50';
      case 'category':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50';
      case 'supplier':
        return 'bg-amber-600/20 text-amber-300 border-amber-500/50';
      default:
        return 'bg-slate-600/20 text-slate-300 border-slate-500/50';
    }
  };

  // Compact version for sidebar
  if (compact) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Inventory
        </h3>

        <form onSubmit={handleSearch} className="space-y-2">
          <div className="flex gap-1">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400 z-10" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover px-2"
            >
              {loading ? '...' : 'Go'}
            </Button>
          </div>

          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="w-full px-2 py-1 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="product">Products</option>
            <option value="category">Categories</option>
            <option value="supplier">Suppliers</option>
          </select>
        </form>

        {error && showResults && (
          <div className="p-2 bg-red-600/20 border border-red-500/50 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        {showResults && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Results ({results.length})</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className={`w-full text-left p-2 rounded border text-xs transition-all hover:bg-slate-600/50 ${
                    selectedResult?.name === result.name && selectedResult?.type === result.type
                      ? 'bg-slate-600/50 border-blue-500'
                      : 'bg-slate-700/30 border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded border ${getTypeColor(result.type)}`}>
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{result.name}</p>
                      <p className="text-xs text-slate-400">
                        {result.type === 'product' ? 'Qty' : 'Count'}: {result.count}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedResult && (
          <div className="bg-slate-700/50 rounded border border-slate-600 p-2 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-200">Details</p>
              <button
                onClick={() => {
                  setSelectedResult(null);
                  setDetails(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : details ? (
              <div className="space-y-1 text-xs">
                {selectedResult.type === 'product' && (
                  <>
                    <div><span className="text-slate-400">ID:</span> <span className="text-slate-200">{details.productId || 'N/A'}</span></div>
                    <div><span className="text-slate-400">Qty:</span> <span className="text-slate-200">{details.currentQuantity || details.quantity || 0}</span></div>
                    <div><span className="text-slate-400">Price:</span> <span className="text-slate-200">${details.unitPrice?.toFixed(2) || '0.00'}</span></div>
                    <div><span className="text-slate-400">Value:</span> <span className="text-slate-200">${details.totalValue?.toFixed(2) || '0.00'}</span></div>
                    {details.category && <div><span className="text-slate-400">Category:</span> <span className="text-slate-200">{details.category}</span></div>}
                    {details.supplier && <div><span className="text-slate-400">Supplier:</span> <span className="text-slate-200">{details.supplier}</span></div>}
                  </>
                )}

                {selectedResult.type === 'category' && (
                  <>
                    <div><span className="text-slate-400">Products:</span> <span className="text-slate-200">{details.productCount}</span></div>
                    {details.products && details.products.length > 0 && (
                      <div className="mt-1">
                        <p className="text-slate-400 mb-1">Items:</p>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {details.products.slice(0, 3).map((product: any, idx: number) => (
                            <p key={idx} className="text-slate-300 truncate">• {product.name}</p>
                          ))}
                          {details.products.length > 3 && <p className="text-slate-400">+{details.products.length - 3} more</p>}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedResult.type === 'supplier' && (
                  <>
                    <div><span className="text-slate-400">Products:</span> <span className="text-slate-200">{details.productCount}</span></div>
                    {details.products && details.products.length > 0 && (
                      <div className="mt-1">
                        <p className="text-slate-400 mb-1">Items:</p>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {details.products.slice(0, 3).map((product: any, idx: number) => (
                            <p key={idx} className="text-slate-300 truncate">• {product.name}</p>
                          ))}
                          {details.products.length > 3 && <p className="text-slate-400">+{details.products.length - 3} more</p>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  // Full version (not used in sidebar, kept for future use)
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 p-6 shadow-2xl">
      <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
        <div className="w-1 h-6 bg-blue-500 rounded"></div>
        <Search className="w-5 h-5" />
        Inventory Search
      </h2>

      <form onSubmit={handleSearch} className="space-y-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products, categories, suppliers..."
              className="w-full pl-10 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover"
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="flex gap-2">
          <label className="text-sm font-semibold text-slate-300">Filter by:</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="product">Products</option>
            <option value="category">Categories</option>
            <option value="supplier">Suppliers</option>
          </select>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-lg mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Results ({results.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result, idx) => (
              <button
                key={idx}
                onClick={() => handleResultClick(result)}
                className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-slate-600/50 ${
                  selectedResult?.name === result.name && selectedResult?.type === result.type
                    ? 'bg-slate-600/50 border-blue-500'
                    : 'bg-slate-700/30 border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${getTypeColor(result.type)}`}>
                    {getTypeIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{result.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {result.type === 'product' ? 'Qty' : 'Count'}: {result.count}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedResult && (
        <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200">Details</h3>
            <button
              onClick={() => {
                setSelectedResult(null);
                setDetails(null);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : details ? (
            <div className="space-y-3 text-sm">
              {selectedResult.type === 'product' && (
                <>
                  <div><span className="text-slate-400">ID:</span> <span className="text-slate-200">{details.productId || 'N/A'}</span></div>
                  <div><span className="text-slate-400">Qty:</span> <span className="text-slate-200">{details.currentQuantity || details.quantity || 0}</span></div>
                  <div><span className="text-slate-400">Price:</span> <span className="text-slate-200">${details.unitPrice?.toFixed(2) || '0.00'}</span></div>
                  <div><span className="text-slate-400">Value:</span> <span className="text-slate-200">${details.totalValue?.toFixed(2) || '0.00'}</span></div>
                  {details.category && <div><span className="text-slate-400">Category:</span> <span className="text-slate-200">{details.category}</span></div>}
                  {details.supplier && <div><span className="text-slate-400">Supplier:</span> <span className="text-slate-200">{details.supplier}</span></div>}
                </>
              )}

              {selectedResult.type === 'category' && (
                <>
                  <div><span className="text-slate-400">Products:</span> <span className="text-slate-200">{details.productCount}</span></div>
                  {details.products && details.products.length > 0 && (
                    <div>
                      <p className="text-slate-400 mb-2">Items:</p>
                      <div className="space-y-1">
                        {details.products.map((product: any, idx: number) => (
                          <p key={idx} className="text-slate-300">• {product.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedResult.type === 'supplier' && (
                <>
                  <div><span className="text-slate-400">Products:</span> <span className="text-slate-200">{details.productCount}</span></div>
                  {details.products && details.products.length > 0 && (
                    <div>
                      <p className="text-slate-400 mb-2">Items:</p>
                      <div className="space-y-1">
                        {details.products.map((product: any, idx: number) => (
                          <p key={idx} className="text-slate-300">• {product.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default InventorySearch;
