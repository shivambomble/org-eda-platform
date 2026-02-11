import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Folder, AlertCircle, Plus, X } from "lucide-react";
import axios from "axios";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getToken } from "../../lib/auth";

const ProjectList = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const isAdmin = user?.role === "ADMIN";
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await axios.get(
                `${API_URL}/api/projects`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setProjects(response.data.projects || []);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };
  
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName.trim()) return;

        setCreateLoading(true);
        setCreateError("");
        try {
            await axios.post(
                `${API_URL}/api/orgs/${user.org_id}/projects`,
                { name: projectName },
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setProjectName("");
            setIsModalOpen(false);
            fetchProjects();
        } catch (err: any) {
            setCreateError(err.response?.data?.message || "Failed to create project");
        } finally {
            setCreateLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-400 animate-fadeIn">Loading projects...</div>;
    if (error) return (
        <div className="p-8 text-red-400 flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-5 h-5" />
            Error loading projects: {error}
        </div>
    );
  
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center pb-6 border-b border-slate-700">
            <div>
              <h1 className="text-4xl font-bold text-white">Projects</h1>
              <p className="text-slate-400 text-sm mt-1">Manage your inventory analysis projects</p>
            </div>
            {isAdmin && (
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover"
                >
                    <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
            )}
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideInLeft">
          {projects.map((project: any) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:border-blue-500/50">
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg">
                        <Folder className="w-6 h-6 text-white" />
                    </div>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">{project.name}</h3>
                    <p className="text-slate-400 text-sm mt-2">
                        📊 Project ID: {project.id.substring(0, 8)}...
                    </p>
                </div>
              </Card>
            </Link>
          ))}
          {projects.length === 0 && (
             <div className="col-span-full text-center py-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border-2 border-dashed border-slate-600">
                <Folder className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                <p className="text-slate-400 text-lg font-semibold">No projects found</p>
                <p className="text-slate-500 text-sm mt-1">Create one to get started with inventory analysis</p>
             </div>
          )}
        </div>

        {/* Create Project Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl w-full max-w-md p-8 relative border border-slate-600 animate-scaleIn">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                      <div className="w-1 h-8 bg-blue-500 rounded"></div>
                      Create New Project
                    </h2>
                    
                    <form onSubmit={handleCreateProject} className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-slate-200 mb-2">Project Name</label>
                          <Input 
                              placeholder="e.g. Q1 Inventory Audit"
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                              required
                          />
                        </div>
                        
                        {createError && (
                            <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-lg">
                              <p className="text-sm text-red-300">{createError}</p>
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-2">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={() => setIsModalOpen(false)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                isLoading={createLoading}
                                disabled={!projectName.trim()}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover"
                            >
                                Create Project
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    );
  };
  
  export default ProjectList;
