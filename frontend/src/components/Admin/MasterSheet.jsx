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
  RefreshCw,
  Info
} from 'lucide-react';

const MasterSheet = () => {
  const { showToast } = useAuth();
  const [ods, setOds] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [odsRes, clubsRes] = await Promise.all([
        api.get('/ods'),
        api.get('/clubs')
      ]);
      setOds(odsRes.data);
      setClubs(clubsRes.data);
    } catch (err) {
      console.error('Failed to load Master Sheet data:', err);
      showToast('Error loading database records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setFilterClub('');
    setFilterStatus('');
  };

  // Flatten the OD lists into individual student records with contextual remarks
  const allStudents = [];
  ods.forEach(od => {
    const studentsList = od.students || [];
    studentsList.forEach(student => {
      // Parse specific remark matching this student's registration number
      let specificRemark = '';
      if (od.adminRemarks) {
        const lines = od.adminRemarks.split('\n');
        const reg = student.registrationNumber.toUpperCase();
        const lineMatch = lines.find(line => line.toUpperCase().includes(reg));
        if (lineMatch) {
          specificRemark = lineMatch.trim();
        }
      }

      allStudents.push({
        id: `${od.id || od._id}-${student.registrationNumber}`,
        registrationNumber: student.registrationNumber.toUpperCase(),
        studentName: student.studentName,
        date: student.date || od.eventDate, // Student's OD Date
        time: student.time,
        eventName: od.eventName,
        clubName: od.clubName,
        clubId: od.clubId,
        verificationStatus: od.verificationStatus || 'pending',
        specificRemark: specificRemark,
        generalRemarks: od.adminRemarks || ''
      });
    });
  });

  // Filter processing
  const filteredRecords = allStudents.filter(record => {
    // Search query matches Registration Number, Student Name, or Event Name
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      record.registrationNumber.toLowerCase().includes(query) ||
      record.studentName.toLowerCase().includes(query) ||
      record.eventName.toLowerCase().includes(query);

    const matchDate = filterDate ? record.date === filterDate : true;
    const matchClub = filterClub ? record.clubId === filterClub : true;
    const matchStatus = filterStatus ? record.verificationStatus === filterStatus : true;

    return matchSearch && matchDate && matchClub && matchStatus;
  });

  // Download filtered list as Excel sheet
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
      showToast('No records found to export.', 'warning');
      return;
    }

    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['On Duty Registry Ledger Sheet'],
        ['Generated Date', new Date().toLocaleDateString()],
        ['Filter Date', filterDate || 'All Dates'],
        ['Filter Club', filterClub ? clubs.find(c => (c.id || c._id) === filterClub)?.name : 'All Clubs'],
        ['Filter Status', filterStatus ? filterStatus.toUpperCase() : 'All Statuses'],
        [],
        ['Registration Number', 'Student Name', 'Event Name', 'Club/Chapter Name', 'OD Date', 'Time Slot', 'Verification Status', 'Specific Remarks']
      ];

      filteredRecords.forEach(r => {
        let remarksText = r.specificRemark;
        if (!remarksText) {
          if (r.verificationStatus === 'fully_updated') remarksText = 'Verified Successfully';
          else if (r.verificationStatus === 'pending') remarksText = 'Pending Verification';
          else remarksText = 'No issues logged';
        }
        wsData.push([
          r.registrationNumber,
          r.studentName,
          r.eventName,
          r.clubName,
          r.date,
          r.time,
          r.verificationStatus.replace('_', ' ').toUpperCase(),
          remarksText
        ]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, 'OD Registry');
      
      const fileName = filterDate 
        ? `OD_Registry_${filterDate}.xlsx` 
        : 'OD_Registry_All.xlsx';

      xlsx.writeFile(wb, fileName);
      showToast('Registry exported successfully!', 'success');
    } catch (err) {
      console.error('Failed to generate Excel:', err);
      showToast('Failed to export Excel.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-vit-blue" />
            <span>Academic OD Registry</span>
          </h2>
          <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
            Unified student database for academic On Duty approvals. Search across all clubs, dates, and verification remarks.
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={filteredRecords.length === 0}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Registry Excel</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[45vh]">
          <Loader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SEARCH & FILTERS SECTION */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-vit-navy dark:text-white font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4 text-vit-blue" />
                <span>Filter Beneficiary Log</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-vit-blue dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Registration/Name Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-vit-neutral-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search Reg Number / Student Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-vit-blue text-vit-neutral-800 dark:text-white font-semibold"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-vit-neutral-400 pointer-events-none">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-vit-blue text-vit-neutral-500 dark:text-white font-semibold"
                />
              </div>

              {/* Club Select */}
              <div>
                <select
                  value={filterClub}
                  onChange={(e) => setFilterClub(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-vit-blue text-vit-neutral-500 dark:text-white font-semibold"
                >
                  <option value="">All Clubs / Chapters</option>
                  {clubs.map(c => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verification Status */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-vit-blue text-vit-neutral-500 dark:text-white font-semibold"
                >
                  <option value="">All Verification Statuses</option>
                  <option value="pending">🟡 Pending Verification</option>
                  <option value="partially_updated">🟠 Partially Updated</option>
                  <option value="fully_updated">🟢 Fully Updated</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE LOG */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 border-b border-vit-neutral-200/50 dark:border-vit-neutral-750 flex items-center justify-between bg-vit-neutral-50/50 dark:bg-vit-neutral-950/25">
              <span className="text-xs text-vit-neutral-500 font-bold uppercase tracking-wider">Beneficiary OD Registry Ledger</span>
              <span className="text-[10px] bg-vit-sky text-vit-blue dark:bg-sky-950/45 dark:text-sky-300 px-2.5 py-1 rounded-full font-bold">
                {filteredRecords.length} Student Records Found
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-16 text-center text-vit-neutral-500 dark:text-vit-neutral-400 space-y-2">
                <Info className="w-10 h-10 text-vit-neutral-400 mx-auto" />
                <p className="font-bold text-base">No Matching Student ODs Found</p>
                <p className="text-xs max-w-md mx-auto">Try refining your search queries or selecting a different date/club filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-vit-neutral-100/50 dark:bg-vit-neutral-900 text-vit-neutral-500 font-bold uppercase tracking-wider text-[10px] border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-6 py-3">Student Details</th>
                      <th className="px-6 py-3">Event & Club</th>
                      <th className="px-6 py-3">OD Date & Time</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3">Official Portal Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-750 text-xs">
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-vit-neutral-100/20 dark:hover:bg-vit-neutral-800/20 transition-colors">
                        <td className="px-6 py-4 space-y-0.5">
                          <p className="font-bold font-mono text-vit-navy dark:text-white uppercase tracking-wide">
                            {record.registrationNumber}
                          </p>
                          <p className="text-[10px] text-vit-neutral-500 dark:text-vit-neutral-400 font-semibold">
                            {record.studentName}
                          </p>
                        </td>
                        <td className="px-6 py-4 space-y-0.5 max-w-[200px]">
                          <p className="font-bold text-vit-navy dark:text-vit-neutral-200 truncate" title={record.eventName}>
                            {record.eventName}
                          </p>
                          <p className="text-[10px] text-vit-neutral-500 truncate" title={record.clubName}>
                            {record.clubName}
                          </p>
                        </td>
                        <td className="px-6 py-4 space-y-0.5">
                          <p className="font-semibold text-vit-neutral-850 dark:text-vit-neutral-350">
                            {record.date}
                          </p>
                          <p className="text-[10px] text-vit-neutral-400 font-medium">
                            {record.time}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record.verificationStatus === 'fully_updated' && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-900/40">
                              🟢 Fully Updated
                            </span>
                          )}
                          {record.verificationStatus === 'partially_updated' && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-450 px-2 py-0.5 rounded-full font-bold border border-orange-200 dark:border-orange-900/40">
                              🟠 Partially Updated
                            </span>
                          )}
                          {record.verificationStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-450 px-2 py-0.5 rounded-full font-bold border border-yellow-200 dark:border-yellow-900/40">
                              🟡 Pending Verification
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {record.specificRemark ? (
                            <span className="inline-block p-2 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-900/50 rounded-lg text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold font-mono leading-relaxed max-w-sm whitespace-pre-wrap">
                              {record.specificRemark}
                            </span>
                          ) : (
                            <>
                              {record.verificationStatus === 'fully_updated' && (
                                <span className="inline-block p-1.5 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium rounded">
                                  Verified successfully
                                </span>
                              )}
                              {record.verificationStatus === 'pending' && (
                                <span className="inline-block p-1.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 text-vit-neutral-450 text-[10px] font-medium rounded border border-vit-neutral-200 dark:border-vit-neutral-750">
                                  Awaiting admin review
                                </span>
                              )}
                              {record.verificationStatus === 'partially_updated' && (
                                <span className="inline-block p-1.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 text-vit-neutral-400 text-[10px] font-medium rounded border border-vit-neutral-200 dark:border-vit-neutral-750">
                                  Not in remarks (Verification assumed completed)
                                </span>
                              )}
                            </>
                          )}
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

export default MasterSheet;
