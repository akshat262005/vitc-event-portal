'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { autoFitColumns } from '@/lib/excel-utils';
import { Plus, Edit, Trash2, Key, Users, X, Check, Save, FileSpreadsheet, Upload, Download, UserCheck, UserX } from 'lucide-react';

const ManageChairpersons = () => {
  const { showToast } = useAuth();
  const [chairpersons, setChairpersons] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Excel Import States
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = React.useRef(null);

  // Form Fields (Create/Edit)
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [clubId, setClubId] = useState('');
  const [designation, setDesignation] = useState('Club POC');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Only used in creation

  // Password Reset Modal states
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const triggerImportSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = ''; // Reset file input

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/chairpersons/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportSummary(response.data);
      showToast('Excel import processed successfully!', 'success');
      fetchData();
    } catch (err) {
      console.error('Import failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to import chairpersons from Excel.';
      showToast(errMsg, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleToggleStatus = async (chair) => {
    const currentId = chair.id || chair._id;
    const newStatus = chair.status === 'Inactive' ? 'Active' : 'Inactive';
    
    try {
      const response = await api.put(`/chairpersons/${currentId}`, {
        ...chair,
        clubId: chair.clubId?._id || chair.clubId?.id || chair.clubId || '',
        status: newStatus
      });
      setChairpersons(prev => prev.map(c => ((c.id || c._id) === currentId ? response.data : c)));
      showToast(`POC status updated to ${newStatus}!`, 'success');
    } catch (err) {
      console.error('Toggle status failed:', err);
      showToast('Failed to toggle status.', 'error');
    }
  };

  const handleDownloadCredentials = async (importedList) => {
    if (!importedList || importedList.length === 0) {
      showToast('No credentials list available to download.', 'warning');
      return;
    }

    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['VIT Chennai Event Portal - POC Generated Credentials'],
        ['Generated Date', new Date().toLocaleDateString()],
        [],
        [
          'POC Name', 
          'Club / Chapter Name', 
          'Registration Number', 
          'Email', 
          'Username', 
          'Generated Password', 
          'Account Status'
        ]
      ];

      importedList.forEach(c => {
        wsData.push([
          c.name,
          c.clubName || '—',
          c.registrationNumber || 'N/A',
          c.email,
          c.username,
          c.password || '[Existing Password]',
          c.status || 'Active'
        ]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      ws['!cols'] = autoFitColumns(wsData, 0);
      xlsx.utils.book_append_sheet(wb, ws, 'Credentials');
      xlsx.writeFile(wb, 'POC_Credentials.xlsx');
      showToast('Credentials sheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      showToast('Failed to download credentials.', 'error');
    }
  };

  const handleExportChairpersons = async () => {
    if (chairpersons.length === 0) {
      showToast('No POC records available to download.', 'warning');
      return;
    }

    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['VIT Chennai Event Portal - Registered POCs Report'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        [
          'POC Name', 
          'Email', 
          'Registration Number', 
          'Assigned Club Name', 
          'Designation', 
          'Username', 
          'Account Status', 
          'Imported From Excel?', 
          'Last Login', 
          'Created At'
        ]
      ];

      chairpersons.forEach(c => {
        wsData.push([
          c.name,
          c.email,
          c.registrationNumber || 'N/A',
          c.clubName || '—',
          c.designation || 'Club POC',
          c.username,
          c.status || 'Active',
          c.importedFromExcel ? 'Yes' : 'No',
          c.lastLogin ? new Date(c.lastLogin).toLocaleString() : 'Never',
          c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'
        ]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      ws['!cols'] = autoFitColumns(wsData, 3);
      xlsx.utils.book_append_sheet(wb, ws, 'POCs Register');
      xlsx.writeFile(wb, 'POC_Details_Report.xlsx');
      showToast('POC details report downloaded successfully!', 'success');
      showToast('POC details report downloaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to export details:', err);
      showToast('Failed to download chairperson details.', 'error');
    }
  };

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

    if (!name || !email || !registrationNumber || !clubId || !username) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!editingId && !password) {
      showToast('Password is required for new POCs.', 'error');
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
          designation: 'Club POC',
          username: username.trim()
        });
        setChairpersons(prev => prev.map(c => ((c.id || c._id) === editingId ? response.data : c)));
        showToast('POC details updated!', 'success');
        handleCancelEdit();
      } else {
        // Create Mode
        const response = await api.post('/chairpersons', {
          name: name.trim(),
          email: email.trim(),
          registrationNumber: registrationNumber.trim().toUpperCase(),
          clubId,
          designation: 'Club POC',
          username: username.trim(),
          password
        });
        setChairpersons(prev => [...prev, response.data]);
        showToast('POC account created!', 'success');
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
    setDesignation(chair.designation || 'Club POC');
    setUsername(chair.username);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRegistrationNumber('');
    setClubId('');
    setDesignation('Club POC');
    setUsername('');
    setPassword('');
  };

  const handleDeleteClick = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete POC "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/chairpersons/${id}`);
      setChairpersons(prev => prev.filter(c => (c.id || c._id) !== id));
      showToast('POC account deleted.', 'success');
    } catch (err) {
      console.error('Delete POC failed:', err);
      showToast('Failed to delete POC.', 'error');
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
          <span>Club POCs Management</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Create credentials, update profiles, and reset passwords for campus club POCs.
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
              {editingId ? 'Edit Profile details' : 'Register New POC'}
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
                  <span>{editingId ? 'Update POC' : 'Register POC'}</span>
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
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-vit-navy dark:text-white">Active POCs List</h3>
                <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                  {chairpersons.length} accounts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <button
                  onClick={handleExportChairpersons}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-vit-neutral-550 dark:bg-vit-neutral-800 border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-vit-neutral-800 dark:text-white text-xs font-bold rounded-xl transition-all hover:bg-vit-neutral-200 dark:hover:bg-vit-neutral-700 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Details</span>
                </button>
                <button
                  onClick={triggerImportSelector}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import POCs</span>
                </button>
              </div>
            </div>

            {chairpersons.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No POC accounts registered.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-5 py-3">POC Name</th>
                      <th className="px-5 py-3">Reg No</th>
                      <th className="px-5 py-3">Club / Chapter</th>
                      <th className="px-5 py-3">Username</th>
                      <th className="px-5 py-3">Status</th>
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
                          {chair.registrationNumber || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-bold text-vit-blue dark:text-sky-400">{chair.clubName || '—'}</p>
                        </td>
                        <td className="px-5 py-3 font-semibold text-vit-neutral-600 dark:text-vit-neutral-400">
                          {chair.username}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            chair.status === 'Inactive' 
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {chair.status === 'Inactive' ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(chair)}
                            className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors cursor-pointer ${
                              chair.status === 'Inactive'
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={chair.status === 'Inactive' ? 'Activate Account' : 'Deactivate Account'}
                          >
                            {chair.status === 'Inactive' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>
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

      {/* Excel Import Summary Modal Dialog */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setImportSummary(null)}
              className="absolute top-4 right-4 text-vit-neutral-400 hover:text-vit-neutral-750"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-extrabold text-vit-navy dark:text-white text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <span>Import Summary</span>
              </h3>
              <p className="text-xs text-vit-neutral-500">
                Bulk POC import operation completed. Review summary below:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
              <div className="bg-slate-50 dark:bg-vit-neutral-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-vit-neutral-450 uppercase text-[9px] tracking-wider mb-1">Total Records</p>
                <p className="text-lg font-black text-vit-navy dark:text-white">{importSummary.summary.total}</p>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/20">
                <p className="text-emerald-600 dark:text-emerald-450 uppercase text-[9px] tracking-wider mb-1">Successfully Imported</p>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{importSummary.summary.imported}</p>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100 dark:border-blue-950/20">
                <p className="text-blue-600 dark:text-blue-450 uppercase text-[9px] tracking-wider mb-1">Updated</p>
                <p className="text-lg font-black text-blue-600 dark:text-blue-450">{importSummary.summary.updated}</p>
              </div>
              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-950/20">
                <p className="text-amber-600 dark:text-amber-450 uppercase text-[9px] tracking-wider mb-1">Skipped (Duplicates)</p>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">{importSummary.summary.skipped}</p>
              </div>
              <div className="col-span-2 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100 dark:border-red-950/20 flex justify-between items-center">
                <div>
                  <p className="text-red-600 dark:text-red-450 uppercase text-[9px] tracking-wider mb-0.5">Failed Records</p>
                  <p className="text-lg font-black text-red-600 dark:text-red-400">{importSummary.summary.failed}</p>
                </div>
                {importSummary.summary.failed > 0 && (
                  <span className="text-[10px] text-red-500 font-medium">Check email formats or invalid names.</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDownloadCredentials(importSummary.chairpersons)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Credentials Excel</span>
              </button>
              <button
                onClick={() => setImportSummary(null)}
                className="w-full py-3 border border-vit-neutral-300 dark:border-vit-neutral-700 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 text-xs font-bold rounded-xl text-vit-neutral-700 dark:text-white transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {importing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
          <Loader />
          <p className="text-sm font-bold text-white tracking-wider animate-pulse">Processing Excel Import & Generating Credentials...</p>
        </div>
      )}
    </div>
  );
};

export default ManageChairpersons;
