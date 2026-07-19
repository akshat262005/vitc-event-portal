import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import {
  FileSpreadsheet,
  Search,
  SlidersHorizontal,
  Download,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

const ODLists = () => {
  const { showToast } = useAuth();
  const [ods, setOds] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Verification states dictionary: { [odId]: { verificationStatus, completedStudents, adminRemarks } }
  const [verificationForm, setVerificationForm] = useState({});

  // Search / Filters
  const [search, setSearch] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const fetchData = async () => {
    try {
      const [odsRes, clubsRes] = await Promise.all([
        api.get('/ods'),
        api.get('/clubs')
      ]);
      setOds(odsRes.data);
      setClubs(clubsRes.data);

      // Populate verification forms dictionary
      const formStates = {};
      odsRes.data.forEach(od => {
        formStates[od.id || od._id] = {
          verificationStatus: od.verificationStatus || 'pending',
          completedStudents: od.completedStudents !== undefined ? od.completedStudents : 0,
          adminRemarks: od.adminRemarks || ''
        };
      });
      setVerificationForm(formStates);
    } catch (err) {
      console.error('Failed to load OD lists data:', err);
      showToast('Error loading OD lists.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateFormState = (odId, field, value) => {
    setVerificationForm(prev => {
      const current = prev[odId] || { verificationStatus: 'pending', completedStudents: 0, adminRemarks: '' };
      const updated = { ...current, [field]: value };

      const odItem = ods.find(o => (o.id || o._id) === odId);
      const total = odItem ? (odItem.totalStudents || odItem.students?.length || 0) : 0;

      // Auto-fill completed students if status changed to fully_updated
      if (field === 'verificationStatus' && value === 'fully_updated') {
        updated.completedStudents = total;
      }

      // Auto-calculate completed count if adminRemarks is updated and contains student registration numbers (representing completed/successful students)
      if (field === 'adminRemarks') {
        const regNoRegex = /\b\d{2}[a-zA-Z]{3,4}\d{4}\b/g;
        const matched = value.match(regNoRegex);

        if (matched && matched.length > 0) {
          const lines = value.split('\n');
          const completedRegs = new Set();

          lines.forEach(line => {
            const lineMatch = line.match(/\b\d{2}[a-zA-Z]{3,4}\d{4}\b/);
            if (lineMatch) {
              const reg = lineMatch[0].toUpperCase();
              completedRegs.add(reg);
            }
          });

          const completedCount = completedRegs.size;
          if (completedCount > 0) {
            updated.completedStudents = Math.min(total, completedCount);
            if (updated.verificationStatus === 'pending') {
              updated.verificationStatus = 'partially_updated';
            }
          }
        }
      }

      return { ...prev, [odId]: updated };
    });
  };

  const handleSaveVerification = async (odId) => {
    const form = verificationForm[odId];
    if (!form) return;

    try {
      const response = await api.put(`/ods/${odId}/verify`, {
        verificationStatus: form.verificationStatus,
        completedStudents: form.completedStudents,
        adminRemarks: form.adminRemarks
      });

      showToast('OD Verification status updated successfully!', 'success');

      // Update local state list
      setOds(prev => prev.map(o => {
        if ((o.id || o._id) === odId) {
          return { ...o, ...response.data.odList };
        }
        return o;
      }));
    } catch (err) {
      console.error('Error verifying OD list:', err);
      showToast(err.response?.data?.message || 'Failed to save verification status.', 'error');
    }
  };

  const handleDownloadODExcel = async (odItem) => {
    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['Club Name', odItem.clubName],
        ['Event Name', odItem.eventName],
        ['Event Date', odItem.eventDate],
        ['Verification Status', (odItem.verificationStatus || 'pending').replace('_', ' ').toUpperCase()],
        ['Completed Students', odItem.completedStudents !== undefined ? odItem.completedStudents : 0],
        ['Remaining Students', odItem.remainingStudents !== undefined ? odItem.remainingStudents : odItem.students?.length],
        [],
        ['Registration Number', 'Student Name', 'Date', 'Time']
      ];

      odItem.students.forEach(s => {
        wsData.push([s.registrationNumber, s.studentName, s.date, s.time]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, 'OD Student List');
      xlsx.writeFile(wb, `${odItem.eventName.replace(/[^a-z0-9]/gi, '_')}_OD_List.xlsx`);
      showToast('OD List Excel exported successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      showToast('Failed to export Excel.', 'error');
    }
  };

  const toggleExpandRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'fully_updated':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-200 dark:border-emerald-900/40">
            🟢 Fully Updated
          </span>
        );
      case 'partially_updated':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full font-bold border border-orange-250 dark:border-orange-900/40">
            🟠 Partially Updated
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full font-bold border border-yellow-250 dark:border-yellow-900/40">
            🟡 Pending Verification
          </span>
        );
    }
  };

  // Filter and Search processing
  const processedOds = ods.filter(od => {
    const query = search.toLowerCase();

    // Search in Event Name, Club Name, Date, or within student records
    const matchSearch =
      od.eventName.toLowerCase().includes(query) ||
      od.clubName.toLowerCase().includes(query) ||
      od.eventDate.includes(query) ||
      od.students.some(s =>
        s.registrationNumber.toLowerCase().includes(query) ||
        s.studentName.toLowerCase().includes(query)
      );

    const matchClub = filterClub ? od.clubId === filterClub : true;
    const matchStatus = filterStatus ? (od.verificationStatus || 'pending') === filterStatus : true;
    const matchMonth = filterMonth ? od.eventDate.startsWith(filterMonth) : true;

    return matchSearch && matchClub && matchStatus && matchMonth;
  });

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-vit-blue" />
          <span>Academic On Duty (OD) Ledgers</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Access all student OD tables submitted. Verify sheet updates, view student rosters, and log remarks.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[45vh]">
          <Loader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SEARCH & FILTERS SECTION */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-vit-navy dark:text-white font-bold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-vit-blue" />
              <span>Search Records & Refine Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Query search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-vit-neutral-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student, reg no, event..."
                  className="w-full pl-9 pr-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
                />
              </div>

              {/* Club filter */}
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              >
                <option value="">All Clubs & Chapters</option>
                {clubs.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>

              {/* Verification status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              >
                <option value="">All Verification Statuses</option>
                <option value="pending">Pending Verification</option>
                <option value="fully_updated">Fully Updated</option>
                <option value="partially_updated">Partially Updated</option>
              </select>

              {/* Month filter */}
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              />
            </div>
          </div>

          {/* OD LEDGER TABLES LIST */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white">On Duty Ledger Registry</h3>
              <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                {processedOds.length} Sheets Loaded
              </span>
            </div>

            {processedOds.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No OD sheets match the filtering parameters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-6 py-4">Event Details</th>
                      <th className="px-6 py-4">Club / Chapter Name</th>
                      <th className="px-6 py-4">Verification Status</th>
                      <th className="px-6 py-4">Progress Details</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                    {processedOds.map((od) => {
                      const total = od.totalStudents || od.students?.length || 0;
                      const completed = od.completedStudents || 0;
                      const remaining = od.remainingStudents !== undefined ? od.remainingStudents : total;
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                      const form = verificationForm[od.id || od._id] || { verificationStatus: 'pending', completedStudents: 0, adminRemarks: '' };

                      return (
                        <React.Fragment key={od.id || od._id}>
                          <tr className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleExpandRow(od.id || od._id)}
                                className="flex items-center gap-1 font-bold text-vit-navy dark:text-white hover:text-vit-blue text-sm focus:outline-none text-left"
                              >
                                {expandedRow === (od.id || od._id) ? <ChevronUp className="w-4 h-4 text-vit-blue" /> : <ChevronDown className="w-4 h-4 text-vit-neutral-450" />}
                                <span>{od.eventName}</span>
                              </button>
                              <span className="text-[10px] text-vit-neutral-450 mt-1 block flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {od.eventDate}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-vit-blue dark:text-sky-400">
                              {od.clubName}
                            </td>
                            <td className="px-6 py-4">
                              {renderStatusBadge(od.verificationStatus || 'pending')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5 min-w-[140px]">
                                <div className="flex justify-between font-bold text-[10px] text-vit-neutral-500 dark:text-vit-neutral-400">
                                  <span>Comp: {completed} / Rem: {remaining}</span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="w-full bg-vit-neutral-100 dark:bg-vit-neutral-800 h-1.5 rounded-full overflow-hidden flex">
                                  <div
                                    style={{ width: `${pct}%` }}
                                    className={`h-full rounded-full transition-all duration-300 ${od.verificationStatus === 'fully_updated'
                                        ? 'bg-emerald-500'
                                        : od.verificationStatus === 'partially_updated'
                                          ? 'bg-orange-500'
                                          : 'bg-yellow-500'
                                      }`}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDownloadODExcel(od)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-900 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Export Excel</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expandable verification panel */}
                          {expandedRow === (od.id || od._id) && (
                            <tr>
                              <td colSpan="5" className="px-8 py-5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-xs">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                  {/* Left: Beneficiaries Table */}
                                  <div className="lg:col-span-2 space-y-3">
                                    <p className="flex items-center gap-1 font-bold text-[10px] uppercase text-vit-blue">
                                      <Users className="w-3.5 h-3.5" />
                                      <span>Academic OD Beneficiaries Ledger ({total})</span>
                                    </p>
                                    <div className="border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-inner bg-white dark:bg-vit-neutral-950">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="bg-vit-neutral-100/50 dark:bg-vit-neutral-900 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                                            <th className="px-4 py-2">Reg Number</th>
                                            <th className="px-4 py-2">Student Name</th>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Time</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700 text-vit-neutral-700 dark:text-vit-neutral-300">
                                          {od.students.map((student, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-vit-neutral-50 dark:hover:bg-vit-neutral-900 transition-colors">
                                              <td className="px-4 py-2 font-bold uppercase text-vit-navy dark:text-white">
                                                {student.registrationNumber}
                                              </td>
                                              <td className="px-4 py-2">
                                                {student.studentName}
                                              </td>
                                              <td className="px-4 py-2">
                                                {student.date}
                                              </td>
                                              <td className="px-4 py-2 font-medium">
                                                {student.time}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Right: Verification Form & Version History */}
                                  <div className="space-y-4">
                                    <div className="bg-white dark:bg-vit-neutral-950 p-5 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-2xl shadow-sm space-y-4">
                                      <p className="flex items-center gap-1 font-bold text-[10px] uppercase text-vit-blue">
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        <span>OD Verification Workflow</span>
                                      </p>

                                      <div className="space-y-3">
                                        {/* Status Dropdown */}
                                        <div className="space-y-1">
                                          <label className="block text-[10px] font-bold text-vit-neutral-500 uppercase">Verification Status</label>
                                          <select
                                            value={form.verificationStatus}
                                            onChange={(e) => handleUpdateFormState(od.id || od._id, 'verificationStatus', e.target.value)}
                                            className="w-full px-3 py-2 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
                                          >
                                            <option value="pending">Pending Verification</option>
                                            <option value="fully_updated">Fully Updated</option>
                                            <option value="partially_updated">Partially Updated</option>
                                          </select>
                                        </div>

                                        {/* Verification numerical fields & remarks */}
                                        {(form.verificationStatus === 'partially_updated' || form.verificationStatus === 'fully_updated') && (
                                          <>
                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-vit-neutral-500 uppercase">Completed Students (Max: {total})</label>
                                              <input
                                                type="number"
                                                min="0"
                                                max={total}
                                                value={form.completedStudents}
                                                onChange={(e) => {
                                                  const val = Math.min(total, Math.max(0, parseInt(e.target.value, 10) || 0));
                                                  handleUpdateFormState(od.id || od._id, 'completedStudents', val);
                                                }}
                                                className="w-full px-3 py-2 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
                                              />
                                            </div>

                                            <div className="flex justify-between items-center text-[10px] font-bold text-vit-neutral-500">
                                              <span>Remaining Students:</span>
                                              <span className="text-orange-500">{total - form.completedStudents} Students</span>
                                            </div>

                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-vit-neutral-500 uppercase">Remarks (Required)</label>
                                              <textarea
                                                value={form.adminRemarks}
                                                onChange={(e) => handleUpdateFormState(od.id || od._id, 'adminRemarks', e.target.value)}
                                                placeholder="Enter the remarks here."
                                                rows="4"
                                                className="w-full p-3 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 text-vit-neutral-800 dark:text-white"
                                              />
                                              {/* Live Remarks Parser Feedback */}
                                              {(() => {
                                                const regNoRegex = /\b\d{2}[a-zA-Z]{3,4}\d{4}\b/g;
                                                const matched = form.adminRemarks ? form.adminRemarks.match(regNoRegex) : null;
                                                if (matched && matched.length > 0) {
                                                  const lines = form.adminRemarks.split('\n');
                                                  const completedRegs = [];
                                                  lines.forEach(line => {
                                                    const lineMatch = line.match(/\b\d{2}[a-zA-Z]{3,4}\d{4}\b/);
                                                    if (lineMatch) {
                                                      const reg = lineMatch[0].toUpperCase();
                                                      if (!completedRegs.includes(reg)) {
                                                        completedRegs.push(reg);
                                                      }
                                                    }
                                                  });

                                                  if (completedRegs.length > 0) {
                                                    return (
                                                      <div className="mt-1.5 p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 rounded-lg text-[10px] text-blue-700 dark:text-blue-400 font-semibold space-y-0.5">
                                                        <div className="flex items-center gap-1.5 font-bold">
                                                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                                          <span>Remarks Parser Active</span>
                                                        </div>
                                                        <p className="font-normal text-vit-neutral-500 dark:text-vit-neutral-400">
                                                          Detected {completedRegs.length} completed student(s): <span className="font-bold font-mono text-emerald-600 dark:text-emerald-450">{completedRegs.join(', ')}</span>
                                                        </p>
                                                        <p className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold">
                                                          Auto-set completed to {completedRegs.length} (pending: {Math.max(0, total - completedRegs.length)})
                                                        </p>
                                                      </div>
                                                    );
                                                  }
                                                }
                                                return null;
                                              })()}
                                            </div>
                                          </>
                                        )}

                                        <button
                                          onClick={() => handleSaveVerification(od.id || od._id)}
                                          className="w-full py-2 bg-vit-blue hover:bg-vit-navy text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span>Save Verification Status</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Version History logs */}
                                    {od.versions && od.versions.length > 0 && (
                                      <div className="bg-white dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-2xl shadow-sm space-y-2">
                                        <p className="font-bold text-[10px] uppercase text-vit-neutral-500">Version Upload History</p>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                          {od.versions.map((v) => (
                                            <div key={v.version} className="flex justify-between items-center bg-vit-neutral-50 dark:bg-vit-neutral-900 p-2.5 rounded-xl border border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-[10px]">
                                              <span className="font-bold text-vit-navy dark:text-white">v{v.version} {v.version === od.currentVersion ? '(Active)' : ''}</span>
                                              <span className="text-vit-neutral-450">{new Date(v.uploadedAt).toLocaleDateString()}</span>
                                              <span className="font-bold text-vit-blue">{v.students?.length} studs</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
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

export default ODLists;
