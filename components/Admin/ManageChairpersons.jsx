'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { Plus, Edit, Trash2, Key, Users, X, Check, Save } from 'lucide-react';

const ManageChairpersons = () => {
  const { showToast } = useAuth();
  const [chairpersons, setChairpersons] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields (Create/Edit)
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [clubId, setClubId] = useState('');
  const [designation, setDesignation] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Only used in creation

  // Password Reset Modal states
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, clubsRes] = await Promise.all([
        api.get('/chairpersons'),
        api.get('/clubs')
      ]);
      setChairpersons(usersRes.data);
      setClubs(clubsRes.data);
    } catch (err) {
      console.error('Failed to load chairpersons data:', err);
      showToast('Error loading chairpersons data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !registrationNumber || !clubId || !designation || !username) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!editingId && !password) {
      showToast('Password is required for new chairpersons.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        // Edit Mode
        const response = await api.put(`/chairpersons/${editingId}`, {
          name: name.trim(),
          email: email.trim(),
          registrationNumber: registrationNumber.trim().toUpperCase(),
          clubId,
          designation: designation.trim(),
          username: username.trim()
        });
        setChairpersons(prev => prev.map(c => ((c.id || c._id) === editingId ? response.data : c)));
        showToast('Chairperson details updated!', 'success');
        handleCancelEdit();
      } else {
        // Create Mode
        const response = await api.post('/chairpersons', {
          name: name.trim(),
          email: email.trim(),
          registrationNumber: registrationNumber.trim().toUpperCase(),
          clubId,
          designation: designation.trim(),
          username: username.trim(),
          password
        });
        setChairpersons(prev => [...prev, response.data]);
        showToast('Chairperson account created!', 'success');
        // Reset form
        handleCancelEdit();
      }
      fetchData(); // Refresh to ensure denormalized club names match
    } catch (err) {
      const msg = err.response?.data?.message || 'Error processing request.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (chair) => {
    setEditingId(chair.id || chair._id);
    setName(chair.name);
    setEmail(chair.email);
    setRegistrationNumber(chair.registrationNumber || '');
    setClubId(chair.clubId?._id || chair.clubId?.id || chair.clubId || '');
    setDesignation(chair.designation || 'Chairperson');
    setUsername(chair.username);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRegistrationNumber('');
    setClubId('');
    setDesignation('');
    setUsername('');
    setPassword('');
  };

  const handleDeleteClick = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete chairperson "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/chairpersons/${id}`);
      setChairpersons(prev => prev.filter(c => (c.id || c._id) !== id));
      showToast('Chairperson account deleted.', 'success');
    } catch (err) {
      console.error('Delete chairperson failed:', err);
      showToast('Failed to delete chairperson.', 'error');
    }
  };

  const handleOpenResetModal = (chair) => {
    setResetUserId(chair.id || chair._id);
    setResetUserName(chair.name);
    setNewPassword('');
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    setResettingPassword(true);
    try {
      await api.post(`/chairpersons/${resetUserId}/reset-password`, {
        newPassword
      });
      showToast(`Password reset successfully for ${resetUserName}!`, 'success');
      setResetUserId(null);
    } catch (err) {
      showToast('Error resetting password.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-vit-blue" />
          <span>Club Chairpersons Management</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Create credentials, update profiles, and reset passwords for campus club chairpersons.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Create / Edit Form */}
          <div className="glass-panel p-6 xl:col-span-1 space-y-4">
            <h3 className="font-bold text-base text-vit-navy dark:text-white border-b pb-2 dark:border-vit-neutral-700">
              {editingId ? 'Edit Profile details' : 'Register New Chairperson'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Akshat Kumar"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. akshat.kumar2023@vitstudent.ac.in"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. 23MIA1110"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Assigned Club
                </label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                >
                  <option value="">Select Club/Chapter</option>
                  {clubs.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Chairperson, Co-Chairperson"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. akshat_cc"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                    required={!editingId}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 glow-btn-primary rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingId ? 'Update Chairperson' : 'Register User'}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2.5 border border-vit-neutral-300 dark:border-vit-neutral-700 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-xl text-vit-neutral-700 dark:text-white transition-colors cursor-pointer"
                    title="Cancel Edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: Table Grid */}
          <div className="glass-panel overflow-hidden xl:col-span-2">
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white">Active Chairpersons List</h3>
              <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                {chairpersons.length} accounts
              </span>
            </div>

            {chairpersons.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No Chairperson accounts registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-5 py-3">Chairperson Name</th>
                      <th className="px-5 py-3">Reg No</th>
                      <th className="px-5 py-3">Club / Chapter</th>
                      <th className="px-5 py-3">Username</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                    {chairpersons.map((chair) => (
                      <tr key={chair.id || chair._id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-bold text-vit-navy dark:text-white">{chair.name}</p>
                          <p className="text-[10px] text-vit-neutral-450 mt-0.5">{chair.email}</p>
                        </td>
                        <td className="px-5 py-3 font-semibold uppercase text-vit-neutral-700 dark:text-vit-neutral-300">
                          {chair.registrationNumber}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-bold text-vit-blue dark:text-sky-400">{chair.clubName || '—'}</p>
                          <p className="text-[10px] text-vit-neutral-450 mt-0.5">{chair.designation}</p>
                        </td>
                        <td className="px-5 py-3 font-semibold text-vit-neutral-600 dark:text-vit-neutral-400">
                          {chair.username}
                        </td>
                        <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenResetModal(chair)}
                            className="inline-flex items-center justify-center p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditClick(chair)}
                            className="inline-flex items-center justify-center p-1.5 text-vit-blue hover:bg-vit-sky/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(chair.id || chair._id, chair.name)}
                            className="inline-flex items-center justify-center p-1.5 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Floating Password Reset Modal Dialog */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setResetUserId(null)}
              className="absolute top-4 right-4 text-vit-neutral-400 hover:text-vit-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-extrabold text-vit-navy dark:text-white text-lg">Reset Password</h3>
              <p className="text-xs text-vit-neutral-500">
                Set a new password for <span className="font-semibold">{resetUserName}</span>.
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-vit-neutral-550 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={resettingPassword}
                className="w-full flex items-center justify-center gap-1.5 py-3 glow-btn-accent rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {resettingPassword ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageChairpersons;
