'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { Plus, Edit, Trash2, Key, Users, X, Check, Save, ShieldAlert, UserCheck, UserX } from 'lucide-react';

const ManageAdmins = () => {
  const { user, showToast } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields (Create/Edit)
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Only used in creation

  // Password Reset Modal states
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleToggleStatus = async (adminAccount) => {
    const currentId = adminAccount.id || adminAccount._id;
    
    if (currentId === user?.id) {
      showToast('You cannot deactivate your own admin account!', 'warning');
      return;
    }

    const newStatus = adminAccount.status === 'Inactive' ? 'Active' : 'Inactive';
    
    try {
      const response = await api.put(`/admins/${currentId}`, {
        status: newStatus
      });
      setAdmins(prev => prev.map(a => ((a.id || a._id) === currentId ? { ...a, status: newStatus } : a)));
      showToast(`Admin status updated to ${newStatus}!`, 'success');
    } catch (err) {
      console.error('Toggle status failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to toggle status.';
      showToast(errMsg, 'error');
    }
  };

  const handleEdit = (adminAccount) => {
    setEditingId(adminAccount.id || adminAccount._id);
    setName(adminAccount.name);
    setEmail(adminAccount.email);
    setUsername(adminAccount.username);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
  };

  const handleDelete = async (adminId) => {
    if (adminId === user?.id) {
      showToast('You cannot delete your own admin account!', 'warning');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this admin account? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/admins/${adminId}`);
      setAdmins(prev => prev.filter(a => (a.id || a._id) !== adminId));
      showToast('Admin account deleted successfully!', 'success');
    } catch (err) {
      console.error('Delete failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to delete admin account.';
      showToast(errMsg, 'error');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update Admin Profile
        const response = await api.put(`/admins/${editingId}`, {
          name,
          email,
          username
        });
        setAdmins(prev => prev.map(a => ((a.id || a._id) === editingId ? { ...a, name, email, username } : a)));
        showToast('Admin account updated successfully!', 'success');
        handleCancelEdit();
      } else {
        // Create Admin
        const response = await api.post('/admins', {
          name,
          email,
          username,
          password
        });
        setAdmins(prev => [...prev, response.data]);
        showToast('Admin account created successfully!', 'success');
        handleCancelEdit();
      }
    } catch (err) {
      console.error('Submit failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to save admin account.';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
      return;
    }

    setResettingPassword(true);
    try {
      await api.post(`/admins/${resetUserId}/reset-password`, {
        password: newPassword
      });
      showToast(`Password reset successfully for ${resetUserName}!`, 'success');
      setResetUserId(null);
      setResetUserName('');
      setNewPassword('');
    } catch (err) {
      console.error('Password reset failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to reset password.';
      showToast(errMsg, 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await api.get('/admins');
      setAdmins(response.data);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      showToast('Failed to load admin accounts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-vit-blue" />
            <span>Manage System Admins</span>
          </h2>
          <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
            Create, update, deactivate, and reset passwords for system administrator accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Panel (Create / Edit) */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-bold text-vit-navy dark:text-white flex items-center gap-2 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 pb-3">
            <Plus className="w-4 h-4 text-vit-blue" />
            <span>{editingId ? 'Edit Admin Details' : 'Register New Admin'}</span>
          </h3>

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold">
            {/* Admin Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                Admin Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Akshat Sharma"
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin.sharma@vit.ac.in"
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="e.g. akshat_admin"
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                required
              />
            </div>

            {/* Password (Only during creation) */}
            {!editingId && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                  required
                  minLength={6}
                />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-vit-blue hover:bg-vit-blue-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{editingId ? 'Save Changes' : 'Register Admin'}</span>
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-vit-neutral-200 dark:bg-vit-neutral-800 text-vit-neutral-700 dark:text-white border border-vit-neutral-350 dark:border-vit-neutral-700 rounded-xl hover:bg-vit-neutral-300 dark:hover:bg-vit-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Table Panel */}
        <div className="lg:col-span-2 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 pb-3">
            <h3 className="text-sm font-bold text-vit-navy dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-vit-blue" />
              <span>Registered Administrator Accounts</span>
            </h3>
            <span className="bg-vit-blue/10 text-vit-blue dark:text-vit-accent px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
              {admins.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
              No administrator accounts registered.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                    <th className="px-5 py-3">Admin Name</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                  {admins.map((adminAccount) => {
                    const isSelf = (adminAccount.id || adminAccount._id) === user?.id;
                    return (
                      <tr key={adminAccount.id || adminAccount._id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-vit-navy dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{adminAccount.name}</span>
                            {isSelf && (
                              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-vit-neutral-600 dark:text-vit-neutral-350">
                          @{adminAccount.username}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-vit-neutral-600 dark:text-vit-neutral-350 truncate max-w-[150px]">
                          {adminAccount.email}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => handleToggleStatus(adminAccount)}
                            disabled={isSelf}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer select-none transition-colors border ${
                              adminAccount.status === 'Inactive'
                                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-650 dark:text-red-400 hover:bg-red-100'
                                : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={isSelf ? "You cannot toggle your own status" : `Click to make ${adminAccount.status === 'Inactive' ? 'Active' : 'Inactive'}`}
                          >
                            {adminAccount.status === 'Inactive' ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Inactive</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Active</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEdit(adminAccount)}
                              className="p-1.5 text-vit-neutral-500 hover:text-vit-blue dark:text-vit-neutral-400 dark:hover:text-white rounded-lg hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 transition-colors cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setResetUserId(adminAccount.id || adminAccount._id);
                                setResetUserName(adminAccount.name);
                                setNewPassword('');
                              }}
                              className="p-1.5 text-vit-neutral-500 hover:text-amber-600 dark:text-vit-neutral-400 dark:hover:text-amber-400 rounded-lg hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(adminAccount.id || adminAccount._id)}
                              disabled={isSelf}
                              className="p-1.5 text-vit-neutral-500 hover:text-red-650 dark:text-vit-neutral-400 dark:hover:text-red-400 rounded-lg hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title={isSelf ? "You cannot delete your own account" : "Delete Account"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResetUserId(null)} />
          <div className="relative glass-panel w-full max-w-md p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 pb-3">
              <h3 className="text-sm font-bold text-vit-navy dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>Reset Administrator Password</span>
              </h3>
              <button
                onClick={() => setResetUserId(null)}
                className="p-1 text-vit-neutral-400 hover:text-vit-neutral-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-xs font-semibold">
              <p className="text-[11px] text-vit-neutral-500 dark:text-vit-neutral-400">
                Enter a new password for <span className="font-extrabold text-vit-navy dark:text-white">{resetUserName}</span>. This will override their current credentials immediately.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-vit-neutral-500 dark:text-vit-neutral-400 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResetUserId(null)}
                  className="px-4 py-2.5 bg-vit-neutral-200 dark:bg-vit-neutral-800 text-vit-neutral-700 dark:text-white border border-vit-neutral-350 dark:border-vit-neutral-700 rounded-xl hover:bg-vit-neutral-300 dark:hover:bg-vit-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;
