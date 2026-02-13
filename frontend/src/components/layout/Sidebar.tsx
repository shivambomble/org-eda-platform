import { LayoutDashboard, FolderOpen, Users, Shield, CheckCircle, User } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useEffect, useState } from "react";
import NotesPanel from "../notes/NotesPanel";
import InventorySearch from "../search/InventorySearch";

interface UserProfile {
  email: string;
  role: string;
}

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
];

// Admin-only links
const adminLinks = [
  { href: "/users", label: "User Management", icon: Users },
];

const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-red-500/20 text-red-300 border border-red-500/50";
    case "ANALYST":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/50";
    case "USER":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50";
    default:
      return "bg-slate-500/20 text-slate-300 border border-slate-500/50";
  }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case "ADMIN":
      return Shield;
    case "ANALYST":
      return CheckCircle;
    case "USER":
      return User;
    default:
      return User;
  }
};

const getPermissions = (role: string) => {
  switch (role) {
    case "ADMIN":
      return [
        { label: "View Projects", icon: "✓" },
        { label: "Upload Datasets", icon: "✓" },
        { label: "Delete Datasets", icon: "✓" },
        { label: "Transform Data", icon: "✓" },
        { label: "Send Alerts", icon: "✓" },
        { label: "Manage Users", icon: "✓" },
      ];
    case "ANALYST":
      return [
        { label: "View Projects", icon: "✓" },
        { label: "Upload Datasets", icon: "✓" },
        { label: "Delete Datasets", icon: "✓" },
        { label: "Transform Data", icon: "✓" },
        { label: "Send Alerts", icon: "✓" },
        { label: "Manage Users", icon: "✗" },
      ];
    case "USER":
      return [
        { label: "View Projects", icon: "✓" },
        { label: "Upload Datasets", icon: "✗" },
        { label: "Delete Datasets", icon: "✗" },
        { label: "Transform Data", icon: "✗" },
        { label: "Send Alerts", icon: "✗" },
        { label: "Manage Users", icon: "✗" },
      ];
    default:
      return [];
  }
};

const Sidebar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const params = useParams();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  // Get projectId from URL params or localStorage
  useEffect(() => {
    if (params.id) {
      setProjectId(params.id);
      localStorage.setItem("lastProjectId", params.id);
    } else {
      // Try to get from localStorage
      const storedProjectId = localStorage.getItem("lastProjectId");
      if (storedProjectId) {
        setProjectId(storedProjectId);
      }
    }
  }, [params]);

  // Fetch projects for the user
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
          
          // Try to restore last selected project from localStorage
          const storedProjectId = localStorage.getItem("lastProjectId");
          if (storedProjectId && data.projects?.some((p: any) => p.id === storedProjectId)) {
            setProjectId(storedProjectId);
          }
          // Don't auto-select - let user choose
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };

    fetchProjects();
  }, []);

  if (!user) return null;

  const RoleIcon = getRoleIcon(user.role);
  const permissions = getPermissions(user.role);
  const roleColorClass = getRoleColor(user.role);
  const isAdmin = user.role === "ADMIN";

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col shadow-xl animate-slideInLeft">
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-2 p-4">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 hover:translate-x-1",
                  isActive && "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50"
                )
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}

          {/* Admin-only links */}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-slate-700"></div>
              {adminLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 hover:translate-x-1",
                      isActive && "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50"
                    )
                  }
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Search Section - Always Visible */}
        {projects.length > 0 && (
          <div className="px-4 py-4 border-t border-slate-700">
            <div className="mb-3">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                Select Project for Search
              </label>
              <select
                value={projectId || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setProjectId(e.target.value);
                    localStorage.setItem("lastProjectId", e.target.value);
                  } else {
                    setProjectId(null);
                    localStorage.removeItem("lastProjectId");
                  }
                }}
                className="w-full px-2 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select a Project --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            {projectId ? (
              <InventorySearch projectId={projectId} />
            ) : (
              <div className="p-3 bg-slate-700/30 border border-slate-600 rounded text-xs text-slate-400 text-center">
                <p>Select a project above to start searching</p>
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        <div className="px-4 py-4 border-t border-slate-700">
          <NotesPanel />
        </div>
      </div>

      {/* Sticky Profile Section - Always Visible at Bottom */}
      <div className="sticky bottom-0 border-t border-slate-700 bg-gradient-to-t from-slate-900 to-slate-800 p-4 z-20">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 mb-2 hover:translate-x-1"
        >
          <User className="h-5 w-5" />
          <div className="flex-1 text-left">
            <p className="text-xs text-slate-500">Profile</p>
            <p className="truncate text-xs font-bold text-slate-200">{user.email}</p>
          </div>
        </button>

        {/* Profile Details - Expands Upward */}
        {isProfileOpen && (
          <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 space-y-4 animate-slideInLeft mt-2 max-h-64 overflow-y-auto">
            {/* Role Badge */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Role</p>
              <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 w-fit font-semibold", roleColorClass)}>
                <RoleIcon className="h-4 w-4" />
                <span className="text-sm">{user.role}</span>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wider">Permissions</p>
              <div className="space-y-2">
                {permissions.map((perm, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs hover:translate-x-1 transition-transform">
                    <span className={perm.icon === "✓" ? "text-emerald-400 font-bold text-lg" : "text-red-400 font-bold text-lg"}>
                      {perm.icon}
                    </span>
                    <span className={perm.icon === "✓" ? "text-slate-300" : "text-slate-500"}>
                      {perm.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role Description */}
            <div className="bg-slate-600/30 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-300 leading-relaxed">
                {user.role === "ADMIN" && "🔐 Full access to all features and user management."}
                {user.role === "ANALYST" && "📊 Can upload, transform, and analyze datasets. Can send alerts."}
                {user.role === "USER" && "👁️ Read-only access. Can view the dashboard."}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
