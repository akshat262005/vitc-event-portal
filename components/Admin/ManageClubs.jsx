'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { Plus, Edit, Trash2, X, Compass, CheckCircle } from 'lucide-react';

const ManageClubs = () => {
  const { showToast } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [clubName, setClubName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);

  const fetchClubs = async () => {
    try {
      const response = await api.get('/clubs');
      setClubs(response.data);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
      showToast('Error loading clubs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clubName.trim()) {
      showToast('Club name is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        // Edit Mode
        const response = await api.put(`/clubs/${editingId}`, {
          name: clubName.trim(),
          description: description.trim()
        });
        setClubs(prev => prev.map(c => ((c.id || c._id) === editingId ? response.data : c)));
        showToast('Club updated successfully!', 'success');
        setEditingId(null);
      } else {
        // Create Mode
        const response = await api.post('/clubs', {
          name: clubName.trim(),
          description: description.trim()
        });
        setClubs(prev => [...prev, response.data]);
        showToast('Club added successfully!', 'success');
      }
      // Reset form
      setClubName('');
      setDescription('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error processing request.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (club) => {
    setEditingId(club.id || club._id);
    setClubName(club.name);
    setDescription(club.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setClubName('');
    setDescription('');
  };

  const handleDeleteClick = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? All linked records might be affected.`)) {
      return;
    }

    try {
      await api.delete(`/clubs/${id}`);
      setClubs(prev => prev.filter(c => (c.id || c._id) !== id));
      showToast('Club deleted successfully!', 'success');
    } catch (err) {
      console.error('Failed to delete club:', err);
      showToast('Error deleting club.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-vit-blue" />
          <span>Clubs & Chapters Registry</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Maintain the master directory of VIT Chennai student clubs and official chapters.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Add / Edit Club Form */}
          <div className="glass-panel p-6 md:col-span-1 space-y-4">
            <h3 className="font-bold text-base text-vit-navy dark:text-white border-b pb-2 dark:border-vit-neutral-700">
              {editingId ? 'Edit Club Info' : 'Register New Club'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-2">
                  Club Name
                </label>
                <input
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="e.g. IEEE VITC Student Branch"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-vit-neutral-500 mb-2">
                  Description / Purpose
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Technical engineering chapter..."
                  rows="3"
                  className="w-full px-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none text-sm font-medium focus:ring-1 focus:ring-vit-blue focus:border-transparent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 glow-btn-primary rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {editingId ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{editingId ? 'Update Club' : 'Create Club'}</span>
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2.5 border border-vit-neutral-300 dark:border-vit-neutral-700 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-xl text-vit-neutral-700 dark:text-white transition-colors cursor-pointer"
                    title="Cancel edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT: Clubs Table */}
          <div className="glass-panel overflow-hidden md:col-span-2">
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white">Registered Clubs Directory</h3>
              <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                {clubs.length} Clubs Listed
              </span>
            </div>

            {clubs.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No clubs found. Create a club using the left form.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 text-xs font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-6 py-4">Club/Chapter Name</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                    {clubs.map((club) => (
                      <tr key={club.id || club._id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-vit-navy dark:text-white truncate max-w-[220px]">
                          {club.name}
                        </td>
                        <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-450 truncate max-w-[300px]">
                          {club.description || '—'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(club)}
                            className="inline-flex items-center justify-center p-1.5 text-vit-blue hover:bg-vit-sky/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Club"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(club.id || club._id, club.name)}
                            className="inline-flex items-center justify-center p-1.5 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete Club"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default ManageClubs;
