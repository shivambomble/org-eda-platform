import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'ANALYST'
  });

  const [resetData, setResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const token = localStorage.getItem('token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch users (${response.status})`);
      }
      const data = await response.json();
      setUsers(data.users);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Failed to create user (${response.status})`);
      }

      setSuccess('User created successfully!');
      setFormData({ email: '', password: '', role: 'ANALYST' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Failed to delete user (${response.status})`);
      }
      setSuccess('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/users/${selectedUserId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetData.newPassword })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Failed to reset password (${response.status})`);
      }
      setSuccess('Password reset successfully!');
      setResetData({ newPassword: '', confirmPassword: '' });
      setShowResetForm(false);
      setSelectedUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 animate-fadeIn">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 animate-slideInLeft">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-lg shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">User Management</h1>
              <p className="text-slate-400 text-sm mt-1">Create, manage, and delete users</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-lg btn-hover"
          >
            <Plus className="h-5 w-5" />
            Create User
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-r from-red-600/20 to-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 animate-slideInRight">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Error</p>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 animate-slideInRight">
            <p className="text-emerald-300 font-semibold">{success}</p>
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-8 shadow-2xl animate-scaleIn">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded"></div>
              Create New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Email Address</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="ANALYST">Analyst</option>
                  <option value="USER">User</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 btn-hover"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Reset Password Form */}
        {showResetForm && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-8 shadow-2xl animate-scaleIn">
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <div className="w-1 h-8 bg-amber-500 rounded"></div>
              Reset Password
            </h2>
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">New Password</label>
                <Input
                  type="password"
                  value={resetData.newPassword}
                  onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={resetData.confirmPassword}
                  onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 btn-hover"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowResetForm(false);
                    setSelectedUserId('');
                    setResetData({ newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 rounded-xl overflow-hidden shadow-2xl animate-slideInLeft">
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-4 border-b border-slate-600">
            <h3 className="font-bold text-lg text-white">Users List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No users found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-600/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-200">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                          user.role === 'ANALYST'
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                            : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowResetForm(true);
                            }}
                            className="p-2 text-amber-400 hover:bg-amber-600/30 rounded-lg transition-all hover-scale"
                            title="Reset Password"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-400 hover:bg-red-600/30 rounded-lg transition-all hover-scale"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
