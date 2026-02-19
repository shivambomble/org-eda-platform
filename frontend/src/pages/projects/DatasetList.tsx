import axios from "axios";
import { FileText, Activity, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { getToken } from "../../lib/auth";

const DatasetList = ({ datasets, projectId, refresh, canDelete }: any) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  
  const handleTransform = async (datasetId: string) => {
    try {
        await axios.post(
            `${API_URL}/api/projects/${projectId}/datasets/${datasetId}/transform`,
            { transformations: [] }, // Default for now
            {
                headers: { Authorization: `Bearer ${getToken()}` }
            }
        );
        refresh(); // Refresh list to show status change
    } catch (err) {
        console.error("Transform failed", err);
        alert("Failed to start transformation");
    }
  };

  const handleDelete = async (datasetId: string) => {
    if (!confirm("Are you sure you want to delete this dataset? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await axios.delete(
        `${API_URL}/api/projects/${projectId}/datasets/${datasetId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      console.log('Delete response:', response.data);
      // Force refresh after delete
      setTimeout(() => refresh(), 500);
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete dataset");
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 overflow-hidden shadow-2xl animate-slideInLeft">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 border-b border-slate-600">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Datasets
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700/50 border-b border-slate-600">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">File Name</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Size</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {datasets.map((ds: any) => (
              <tr key={ds.id} className="hover:bg-slate-600/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  {ds.file_name}
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{(ds.size_bytes / 1024).toFixed(2)} KB</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                    ds.status === 'READY' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' : ''
                  }${ds.status === 'TRANSFORMED' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50' : ''}
                  ${ds.status === 'FAILED' ? 'bg-red-600/30 text-red-300 border border-red-500/50' : ''}
                  ${ds.status === 'UPLOADED' || ds.status === 'PROCESSING' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50' : ''}
                `}>
                    {ds.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {ds.status === 'READY' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 px-3 bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/50"
                        onClick={() => handleTransform(ds.id)}
                      >
                        <Activity className="w-3 h-3 mr-1" /> Transform
                      </Button>
                    )}
                    {canDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/30 transition-all hover-scale"
                        onClick={() => handleDelete(ds.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {datasets.length === 0 && (
              <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No datasets uploaded yet. Upload one to get started.
                  </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatasetList;
