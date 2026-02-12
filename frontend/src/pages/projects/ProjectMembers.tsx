import { useState, useEffect } from "react";
import axios from "axios";
import { getToken } from "../../lib/auth";
import { Button } from "../../components/ui/Button";
import { X, Mail, Users } from "lucide-react";

interface ProjectMembersProps {
  projectId: string;
}

interface Member {
  id: string;
  email: string;
  role: string;
  assigned_at: string;
}

interface User {
  id: string;
  email: string;
  role: string;
}

const ProjectMembers = ({ projectId }: ProjectMembersProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserRole(user.role);
    }
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects/${projectId}/members`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      setMembers(response.data);
    } catch (err: any) {
      console.error("Failed to fetch members", err);
    }
  };

  const fetchAvailableUsers = async (searchEmail: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/users?search=${searchEmail}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      // Filter out users already in the project
      const memberIds = new Set(members.map(m => m.id));
      const filtered = response.data.filter((user: User) => !memberIds.has(user.id));
      setAvailableUsers(filtered);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.trim()) {
      fetchAvailableUsers(value);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setAvailableUsers([]);
    }
  };

  const handleSelectUser = (user: User) => {
    setEmail(user.email);
    setShowDropdown(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await axios.post(
        `${API_URL}/api/projects/${projectId}/members`,
        { email: email.trim() },
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      setEmail("");
      setAvailableUsers([]);
      fetchMembers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the project?")) return;

    try {
      await axios.delete(
        `${API_URL}/api/projects/${projectId}/members/${userId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      fetchMembers();
    } catch (err: any) {
      console.error("Removal error:", err);
      const message = err.response?.data?.message || err.message || "Failed to remove member";
      alert(message);
    }
  };

  const canManageMembers = userRole === "ADMIN" || userRole === "ANALYST";

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-600 p-6 shadow-2xl animate-slideInRight">
      <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
        <div className="w-1 h-6 bg-emerald-500 rounded"></div>
        <Users className="w-5 h-5" />
        Project Members
      </h2>

      {/* Add Member Form - Only for Admin/Analyst */}
      {canManageMembers && (
        <form onSubmit={handleAddMember} className="mb-6 space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            Add member to the project
          </label>
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={() => email.trim() && setShowDropdown(true)}
                placeholder="Search user by email..."
                className="w-full pl-10 pr-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading}
                autoComplete="off"
              />
              
              {/* Dropdown for available users */}
              {showDropdown && availableUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-slate-200">{user.email}</p>
                      <p className="text-xs text-slate-400">{user.role}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={loading || !email.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold btn-hover"
            >
              {loading ? 'Adding...' : 'Add'}
            </Button>
          </div>
          {error && (
            <div className="p-2 bg-red-600/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </form>
      )}

      {/* Members List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Current Members ({members.length})
        </h3>
        {members.length === 0 ? (
          <div className="py-6 text-center bg-slate-700/30 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400">
              {canManageMembers ? "No members assigned yet" : "You are viewing this project"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors border border-slate-600"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {member.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {member.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-600/50 text-slate-300 rounded">
                        {member.role}
                      </span>
                      <p className="text-xs text-slate-500">
                        Added {new Date(member.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                {canManageMembers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/30 transition-all hover-scale flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectMembers;
