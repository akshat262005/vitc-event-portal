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
  MessageSquare
} from 'lucide-react';

const ODLists = () => {
  const { showToast } = useAuth();
  const [ods, setOds] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editingRemarks, setEditingRemarks] = useState({});

  // Search / Filters / Sort states
  const [search, setSearch] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterTimeSlot, setFilterTimeSlot] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [odsRes, clubsRes] = await Promise.all([
          api.get('/ods'),
          api.get('/clubs')
        ]);
        setOds(odsRes.data);
        setClubs(clubsRes.data);

        // Populate remarks dictionary
        const dict = {};
        odsRes.data.forEach(od => {
          dict[od.id || od._id] = od.remarks || '';
        });
        setEditingRemarks(dict);
      } catch (err) {
        console.error('Failed to load OD lists data:', err);
        showToast('Error loading OD lists.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveRemarks = async (odId) => {
    try {
      const text = editingRemarks[odId] || '';
      await api.put(`/ods/${odId}/remarks`, { remarks: text });
      showToast('Remarks saved and chairperson notified successfully!', 'success');
      
      setOds(prev => prev.map(o => {
        if ((o.id || o._id) === odId) {
          return { ...o, remarks: text };
        }
        return o;
      }));
    } catch (err) {
      console.error('Error saving remarks:', err);
      showToast('Failed to save remarks.', 'error');
    }
  };

  const handleDownloadODExcel = async (odItem) => {
    try {
      const xlsx = await import('xlsx');
      const wsData = [
        ['Club Name', odItem.clubName],
        ['Event Name', odItem.eventName],
        ['Event Date', odItem.eventDate],
        ['Time Slot', odItem.timeSlot],
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

  // Filter and Search processing
  const processedOds = ods.filter(od => {
    const query = search.toLowerCase();
    
    // Search in Event Name, Club Name, Date, or within student records (Reg No / Name)
    const matchSearch =
      od.eventName.toLowerCase().includes(query) ||
      od.clubName.toLowerCase().includes(query) ||
      od.eventDate.includes(query) ||
      od.students.some(s => 
        s.registrationNumber.toLowerCase().includes(query) ||
        s.studentName.toLowerCase().includes(query)
      );

    const matchClub = filterClub ? od.clubId === filterClub : true;
    const matchTimeSlot = filterTimeSlot ? od.timeSlot === filterTimeSlot : true;
    const matchMonth = filterMonth ? od.eventDate.startsWith(filterMonth) : true;

    return matchSearch && matchClub && matchTimeSlot && matchMonth;
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
          Access all student OD tables submitted. Query by student registration number or export to Excel.
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

              {/* Time slot filter */}
              <select
                value={filterTimeSlot}
                onChange={(e) => setFilterTimeSlot(e.target.value)}
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              >
                <option value="">All On Duty Slots</option>
                <option value="FN">FN (Forenoon)</option>
                <option value="AN">AN (Afternoon)</option>
                <option value="Full Day">Full Day</option>
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
                      <th className="px-6 py-4">Time Slot</th>
                      <th className="px-6 py-4">Students Count</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                    {processedOds.map((od) => (
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
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-900/40">
                              <Clock className="w-3.5 h-3.5" />
                              {od.timeSlot}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-vit-neutral-700 dark:text-white">
                            {od.students?.length || 0} students
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

                        {/* Expandable row showing student table & admin remarks */}
                        {expandedRow === (od.id || od._id) && (
                          <tr>
                            <td colSpan="5" className="px-8 py-5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-xs">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Side: Ledger */}
                                <div className="lg:col-span-2 space-y-3">
                                  <p className="flex items-center gap-1 font-bold text-[10px] uppercase text-vit-blue">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Academic OD Beneficiaries Ledger ({od.students.length})</span>
                                  </p>
                                  <div className="border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-inner bg-white dark:bg-vit-neutral-950">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-vit-neutral-100/50 dark:bg-vit-neutral-900 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                                          <th className="px-4 py-2">Reg Number</th>
                                          <th className="px-4 py-2">Student Name</th>
                                          <th className="px-4 py-2">Date</th>
                                          <th className="px-4 py-2">Time</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                                        {od.students.map((student, sIdx) => (
                                          <tr key={sIdx} className="hover:bg-vit-neutral-50 dark:hover:bg-vit-neutral-900 transition-colors">
                                            <td className="px-4 py-2 font-bold uppercase text-vit-navy dark:text-white">
                                              {student.registrationNumber}
                                            </td>
                                            <td className="px-4 py-2 text-vit-neutral-600 dark:text-vit-neutral-350">
                                              {student.studentName}
                                            </td>
                                            <td className="px-4 py-2 text-vit-neutral-600 dark:text-vit-neutral-350">
                                              {student.date}
                                            </td>
                                            <td className="px-4 py-2 text-vit-neutral-600 dark:text-vit-neutral-350 font-medium">
                                              {student.time}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Right Side: Admin Remarks Loop */}
                                <div className="space-y-3 bg-white dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-2xl shadow-sm flex flex-col justify-between">
                                  <div className="space-y-2">
                                    <p className="flex items-center gap-1 font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>Official Portal Remarks & Errors Log</span>
                                    </p>
                                    <p className="text-[10px] text-vit-neutral-500 leading-normal">
                                      If duplicate registrations, date mismatches, or count excesses occur on the official university portal, paste them below. The club coordinator will see this feedback in real-time.
                                    </p>
                                    <textarea
                                      value={editingRemarks[od.id || od._id] || ''}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        setEditingRemarks(prev => ({
                                          ...prev,
                                          [od.id || od._id]: text
                                        }));
                                      }}
                                      placeholder="e.g.&#10;23MIA1019 - record is already exists for the selected date/time.&#10;24BAI1037 - OD count Exceeding More than 40."
                                      rows="5"
                                      className="w-full p-3 text-xs bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 font-mono text-vit-neutral-800 dark:text-white placeholder-vit-neutral-400 dark:placeholder-vit-neutral-500 leading-relaxed"
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleSaveRemarks(od.id || od._id)}
                                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm shadow-amber-550/10"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Sync Remarks with Club Portal</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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

export default ODLists;
