import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, DollarSign, RefreshCw, ChevronDown } from 'lucide-react';
import axios from 'axios';
import AlertButton from '../components/alerts/AlertButton';
import { getToken } from '../lib/auth';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border-2 border-slate-300 rounded-xl shadow-2xl p-4">
                <p className="text-slate-900 font-bold text-lg mb-1">{payload[0].name}</p>
                <p className="text-slate-700 font-semibold text-base">
                    Value: <span className="text-blue-600">{payload[0].value}</span>
                </p>
                {payload[0].payload.percent && (
                    <p className="text-slate-600 text-sm">
                        {(payload[0].payload.percent * 100).toFixed(1)}%
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const Dashboard: React.FC = () => {
    const [userRole, setUserRole] = useState<string>('');
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const HASURA_URL = import.meta.env.VITE_HASURA_URL || "http://localhost:8081/v1/graphql";
    
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(
                `${API_URL}/api/projects`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            const projectsData = response.data.projects || [];
            
            const projectsWithEDA = await Promise.all(
                projectsData.map(async (proj: any) => {
                    try {
                        const edaResponse = await axios.post(
                            HASURA_URL,
                            {
                                query: `
                                    query {
                                        eda_results(where: {dataset: {project_id: {_eq: "${proj.id}"}}}, order_by: {created_at: desc}, limit: 1) {
                                            id
                                            results
                                            created_at
                                        }
                                    }
                                `
                            },
                            { headers: { Authorization: `Bearer ${getToken()}` } }
                        );
                        
                        const edaResults = edaResponse.data?.data?.eda_results?.[0];
                        return { ...proj, edaResults };
                    } catch (err) {
                        return { ...proj, edaResults: null };
                    }
                })
            );
            
            setProjects(projectsWithEDA);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchProjects();
        setRefreshing(false);
    };

    const filteredProjects = selectedProject === 'all' 
        ? projects 
        : projects.filter(p => p.id === selectedProject);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="text-center">
                <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400 text-lg">Loading inventory dashboard...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-8 max-w-md">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-300 text-center text-lg">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
            {/* Enhanced Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            📦 Inventory Dashboard
                        </h1>
                        <p className="text-slate-400 text-lg">Real-time analytics and insights • {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Project Filter */}
                        <div className="relative">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="appearance-none bg-slate-800 border border-slate-600 text-slate-200 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-500 transition-colors cursor-pointer"
                            >
                                <option value="all">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Projects Container */}
            <div className="space-y-8">
            {filteredProjects.length === 0 ? (
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-12 rounded-2xl shadow-2xl border border-slate-600 text-center">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Projects Found</h3>
                    <p className="text-slate-400 text-lg">Create a project to start analyzing inventory data</p>
                </div>
            ) : (
                filteredProjects.map((proj: any) => {
                    const edaResults = proj.edaResults?.results;
                    
                    if (!edaResults || !edaResults.summary) {
                        return (
                            <div key={proj.id} className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl shadow-2xl border border-slate-600 hover:border-blue-500/50 transition-all">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-3xl font-bold text-white">{proj.name}</h2>
                                    <span className="px-4 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-sm font-semibold border border-amber-500/30">
                                        No Data
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-700/50 p-6 rounded-xl">
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Package className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-lg mb-1">No inventory data available</p>
                                        <p className="text-slate-400">Upload a CSV file to start analyzing inventory metrics</p>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const { summary, stock_status, category_distribution, supplier_distribution, top_products_by_value, low_stock_alerts, last_updated } = edaResults;

                    const stockStatusData = [
                        { name: 'Healthy', value: stock_status.healthy, color: '#10b981', icon: '✓' },
                        { name: 'Low Stock', value: stock_status.low_stock, color: '#f59e0b', icon: '⚠' },
                        { name: 'Out of Stock', value: stock_status.out_of_stock, color: '#ef4444', icon: '✗' }
                    ];

                    const categoryData = Object.entries(category_distribution || {}).map(([name, value]) => ({
                        name,
                        value
                    }));

                    const supplierData = Object.entries(supplier_distribution || {}).map(([name, value]) => ({
                        name,
                        value
                    }));

                    return (
                        <div key={proj.id} className="space-y-6">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl shadow-2xl border border-slate-600 hover:border-blue-500/50 transition-all">
                                {/* Project Header */}
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-slate-600">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-4xl font-bold text-white">{proj.name}</h2>
                                            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-semibold border border-green-500/30">
                                                Active
                                            </span>
                                        </div>
                                        <p className="text-slate-400 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                            Project ID: <span className="font-mono text-blue-400">{proj.id.substring(0, 8)}...</span>
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <AlertButton 
                                            projectId={proj.id}
                                            datasetId=""
                                            userRole={userRole}
                                        />
                                        {last_updated && (
                                            <div className="bg-slate-700/70 backdrop-blur-sm px-5 py-3 rounded-xl border border-slate-600">
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Last Updated</p>
                                                <p className="text-sm text-slate-200 font-semibold">{new Date(last_updated).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Enhanced KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-blue-500/30 p-3 rounded-xl">
                                                    <Package className="w-7 h-7 text-blue-100" />
                                                </div>
                                                <TrendingUp className="w-5 h-5 text-blue-200 opacity-70" />
                                            </div>
                                            <p className="text-blue-100 text-sm font-medium mb-1">Total Products</p>
                                            <p className="text-5xl font-bold">{summary.total_products.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-emerald-500/30 p-3 rounded-xl">
                                                    <DollarSign className="w-7 h-7 text-emerald-100" />
                                                </div>
                                                <TrendingUp className="w-5 h-5 text-emerald-200 opacity-70" />
                                            </div>
                                            <p className="text-emerald-100 text-sm font-medium mb-1">Inventory Value</p>
                                            <p className="text-5xl font-bold">${(summary.total_inventory_value / 1000000).toFixed(2)}M</p>
                                        </div>
                                    </div>

                                    <div className="group relative overflow-hidden bg-gradient-to-br from-amber-600 to-amber-700 p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl hover:shadow-amber-500/30 transition-all hover:-translate-y-1">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-amber-500/30 p-3 rounded-xl">
                                                    <AlertTriangle className="w-7 h-7 text-amber-100" />
                                                </div>
                                                <span className="text-xs bg-amber-500/30 px-2 py-1 rounded-lg font-bold">WARNING</span>
                                            </div>
                                            <p className="text-amber-100 text-sm font-medium mb-1">Low Stock Items</p>
                                            <p className="text-5xl font-bold">{summary.low_stock_count}</p>
                                        </div>
                                    </div>

                                    <div className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl hover:shadow-red-500/30 transition-all hover:-translate-y-1">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="bg-red-500/30 p-3 rounded-xl">
                                                    <AlertTriangle className="w-7 h-7 text-red-100" />
                                                </div>
                                                <span className="text-xs bg-red-500/30 px-2 py-1 rounded-lg font-bold">CRITICAL</span>
                                            </div>
                                            <p className="text-red-100 text-sm font-medium mb-1">Out of Stock</p>
                                            <p className="text-5xl font-bold">{summary.out_of_stock_count}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                    {/* Stock Status */}
                                    <div className="bg-slate-700/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-600 hover:border-slate-500 transition-all">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-bold text-xl text-white flex items-center gap-3">
                                                <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                                                Stock Status
                                            </h3>
                                            <div className="flex gap-2">
                                                {stockStatusData.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                        <span className="text-slate-400">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={stockStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                    outerRadius={90}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {stockStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Category Distribution */}
                                    <div className="bg-slate-700/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-600 hover:border-slate-500 transition-all">
                                        <h3 className="font-bold text-xl text-white flex items-center gap-3 mb-6">
                                            <div className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                                            Products by Category
                                        </h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={categoryData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" fontSize={12} />
                                                <YAxis stroke="#94a3b8" fontSize={12} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569', 
                                                        borderRadius: '12px', 
                                                        color: '#fff',
                                                        padding: '12px'
                                                    }} 
                                                />
                                                <Bar dataKey="value" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                                                <defs>
                                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                                    </linearGradient>
                                                </defs>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Supplier Distribution */}
                                    <div className="bg-slate-700/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-600 hover:border-slate-500 transition-all">
                                        <h3 className="font-bold text-xl text-white flex items-center gap-3 mb-6">
                                            <div className="w-1.5 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                                            Supplier Distribution
                                        </h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={supplierData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={90}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                >
                                                    {supplierData.map((_entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Top Products */}
                                    <div className="bg-slate-700/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-600 hover:border-slate-500 transition-all">
                                        <h3 className="font-bold text-xl text-white flex items-center gap-3 mb-6">
                                            <div className="w-1.5 h-8 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                                            Top Products by Value
                                        </h3>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <BarChart data={top_products_by_value || []} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                                                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                                                <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" fontSize={11} />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569', 
                                                        borderRadius: '12px', 
                                                        color: '#fff',
                                                        padding: '12px'
                                                    }} 
                                                />
                                                <Bar dataKey="total_value" fill="#10b981" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Low Stock Alerts */}
                                {low_stock_alerts && low_stock_alerts.length > 0 && (
                                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl overflow-hidden backdrop-blur-sm">
                                        <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 px-6 py-4 border-b border-red-500/30">
                                            <h3 className="font-bold text-xl text-red-200 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-500/30 rounded-xl flex items-center justify-center">
                                                    <AlertTriangle className="w-6 h-6 text-red-300" />
                                                </div>
                                                Low Stock Alerts
                                                <span className="ml-auto px-3 py-1 bg-red-500/30 text-red-200 rounded-lg text-sm font-bold">
                                                    {low_stock_alerts.length} Items
                                                </span>
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-800/50 border-b border-slate-600">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Product ID</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Product Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Current Qty</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Reorder Level</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700/50">
                                                    {low_stock_alerts.map((alert: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-sm font-mono font-semibold text-blue-300">{alert.product_id}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-200 font-medium">{alert.name}</td>
                                                            <td className="px-6 py-4 text-sm">
                                                                <span className="px-3 py-1 bg-slate-700 text-slate-200 rounded-lg font-bold">
                                                                    {alert.current_qty}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-300 font-medium">{alert.reorder_level}</td>
                                                            <td className="px-6 py-4 text-sm">
                                                                <span className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 ${
                                                                    alert.status === 'CRITICAL' 
                                                                        ? 'bg-red-500/30 text-red-200 border border-red-500/50' 
                                                                        : 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                                                                }`}>
                                                                    <span className={`w-2 h-2 rounded-full ${alert.status === 'CRITICAL' ? 'bg-red-400' : 'bg-amber-400'} animate-pulse`}></span>
                                                                    {alert.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
            </div>
        </div>
    );
};

export default Dashboard;
