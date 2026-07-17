import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import { 
  FileText, 
  Search, 
  SlidersHorizontal, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Eye,
  ArrowUpDown
} from 'lucide-react';

const AdminPreEventsList = () => {
  const { showToast } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  // Selected request for details modal
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/pre-events');
      setRequests(response.data);
    } catch (err) {
      console.error('Error fetching pre-event requests:', err);
      showToast('Failed to load pre-event operations requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    setActionLoading(id);
    try {
      await api.put(`/pre-events/${id}/status`, { status });
      showToast(`Request status updated to ${status}.`, 'success');
      
      // Update locally
      setRequests(prev => prev.map(req => {
        if ((req.id || req._id) === id) {
          return { ...req, status };
        }
        return req;
      }));

      if (selectedRequest && (selectedRequest.id || selectedRequest._id) === id) {
        setSelectedRequest(prev => ({ ...prev, status }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error updating status.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      const xlsx = await import('xlsx');
      
      const wsData = [
        [
          'Club Name', 
          'Event Name', 
          'Event Category', 
          'Actual Event Date', 
          'OD Required Date', 
          'Faculty Coordinator', 
          'Student Coordinator', 
          'Student Coordinator Contact', 
          'Purpose', 
          'Status', 
          'Submission Date'
        ]
      ];

      filteredRequests.forEach(op => {
        wsData.push([
          op.clubName,
          op.eventName,
          op.eventCategoryOthersSpecify ? `${op.eventCategory} (${op.eventCategoryOthersSpecify})` : op.eventCategory,
          op.eventDate,
          op.odRequiredDate,
          op.facultyCoordinator,
          op.studentCoordinator,
          op.studentCoordinatorContact,
          op.purpose,
          op.status,
          new Date(op.createdAt).toLocaleDateString()
        ]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, 'Pre-Event Operations');
      xlsx.writeFile(wb, 'Pre_Event_Operations_Ledger.xlsx');
      showToast('Spreadsheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Failed to export to Excel.', 'error');
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pre-Event Operations Log</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 20px; color: #0f172a; }
            h3 { text-align: center; margin-bottom: 25px; font-size: 12px; font-weight: normal; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { font-weight: bold; padding: 2px 6px; rounded: 4px; font-size: 9px; text-transform: uppercase; }
            .approved { color: #15803d; }
            .pending { color: #b45309; }
            .rejected { color: #b91c1c; }
          </style>
        </head>
        <body>
          <h1>VIT Chennai - Pre-Event Operations Ledger</h1>
          <h3>Generated on ${new Date().toLocaleDateString()}</h3>
          <table>
            <thead>
              <tr>
                <th>Club Name</th>
                <th>Event Name</th>
                <th>Category</th>
                <th>Event Date</th>
                <th>OD Req Date</th>
                <th>Faculty Coord</th>
                <th>Student Coord</th>
                <th>Contact</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Submission Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRequests.map(op => `
                <tr>
                  <td>${op.clubName}</td>
                  <td style="font-weight: bold;">${op.eventName}</td>
                  <td>${op.eventCategory}${op.eventCategoryOthersSpecify ? ` (${op.eventCategoryOthersSpecify})` : ''}</td>
                  <td>${op.eventDate}</td>
                  <td>${op.odRequiredDate}</td>
                  <td>${op.facultyCoordinator}</td>
                  <td>${op.studentCoordinator}</td>
                  <td>${op.studentCoordinatorContact}</td>
                  <td>${op.purpose}</td>
                  <td class="badge ${op.status.toLowerCase()}">${op.status}</td>
                  <td>${new Date(op.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter & Sort computation
  const filteredRequests = requests
    .filter(req => {
      const matchSearch = 
        req.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.studentCoordinator.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'All' || req.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || req.eventCategory === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'name-asc') {
        return a.eventName.localeCompare(b.eventName);
      }
      if (sortBy === 'club-asc') {
        return a.clubName.localeCompare(b.clubName);
      }
      return 0;
    });

  const categories = [
    'Competition',
    'Game',
    'Hackathon',
    'Workshop',
    'Management',
    "Women's internal",
    'Women external',
    'Outreach events',
    "Women's only event",
    'Gender equity programs',
    'Others'
  ];

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-vit-blue" />
            <span>Pre-Event Operations Ledger</span>
          </h2>
          <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
            Review, verify, and approve/reject Student On-Duty requests for activities conducted before actual club events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex-shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[45vh]">
          <Loader />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SEARCH, SORT & FILTERS PANEL */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 text-vit-navy dark:text-white font-bold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-vit-blue" />
              <span>Search requests & Refine Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vit-neutral-400" />
                <input
                  type="text"
                  placeholder="Search event, club, coordinator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                />
              </div>

              {/* Filter by Status */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Filter by Category */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                >
                  <option value="All">All Categories</option>
                  {categories.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-vit-blue text-sm"
                >
                  <option value="date-desc">Newest Requests First</option>
                  <option value="date-asc">Oldest Requests First</option>
                  <option value="name-asc">Event Name (A-Z)</option>
                  <option value="club-asc">Club Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE LOG */}
          {filteredRequests.length === 0 ? (
            <div className="glass-panel p-12 text-center text-vit-neutral-500 font-semibold">
              No Pre-Event request logs found matching current search terms/filters.
            </div>
          ) : (
            <div className="glass-panel overflow-hidden border border-vit-neutral-200 dark:border-vit-neutral-700 rounded-xl shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-vit-neutral-100 dark:bg-vit-neutral-800 text-vit-neutral-500 dark:text-vit-neutral-400 text-xs font-bold uppercase tracking-wider border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-6 py-4">Club</th>
                      <th className="px-6 py-4">Event Name</th>
                      <th className="px-6 py-4">Actual Event Date</th>
                      <th className="px-6 py-4">OD Date</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700 text-sm">
                    {filteredRequests.map((op) => {
                      const id = op.id || op._id;
                      return (
                        <tr key={id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-vit-navy dark:text-white truncate max-w-[200px]">
                            {op.clubName}
                          </td>
                          <td className="px-6 py-4 font-bold text-vit-blue dark:text-sky-400">
                            {op.eventName}
                          </td>
                          <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400">
                            {op.eventDate}
                          </td>
                          <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400 font-medium">
                            {op.odRequiredDate}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              op.status === 'Approved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                                : op.status === 'Rejected'
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200'
                                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 animate-pulse'
                            }`}>
                              {op.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                              {op.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                              {op.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                              {op.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedRequest(op)}
                                className="inline-flex items-center justify-center p-1.5 text-vit-navy dark:text-white hover:bg-vit-sky/40 dark:hover:bg-vit-neutral-850/40 rounded-lg transition-colors cursor-pointer"
                                title="View Request Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleUpdateStatus(id, 'Approved')}
                                disabled={actionLoading === id || op.status === 'Approved'}
                                className="inline-flex items-center justify-center p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Approve Request"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleUpdateStatus(id, 'Rejected')}
                                disabled={actionLoading === id || op.status === 'Rejected'}
                                className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Reject Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-850 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-lg text-vit-neutral-400 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border mb-2 ${
                selectedRequest.status === 'Approved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                  : selectedRequest.status === 'Rejected'
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200'
                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200'
              }`}>
                {selectedRequest.status}
              </span>
              <h3 className="text-xl font-extrabold text-vit-navy dark:text-white">
                {selectedRequest.eventName}
              </h3>
              <p className="text-xs text-vit-neutral-405 dark:text-vit-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                {selectedRequest.clubName}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-b border-vit-neutral-200 dark:border-vit-neutral-850 py-5">
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Event Category</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedRequest.eventCategoryOthersSpecify ? `${selectedRequest.eventCategory} (${selectedRequest.eventCategoryOthersSpecify})` : selectedRequest.eventCategory}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Submission Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Actual Event Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedRequest.eventDate}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">OD Required Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedRequest.odRequiredDate}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Faculty Coordinator</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedRequest.facultyCoordinator}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Student Coordinator</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedRequest.studentCoordinator} ({selectedRequest.studentCoordinatorContact})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Purpose of Pre-Event Operations</span>
              <p className="text-sm text-vit-neutral-600 dark:text-vit-neutral-300 whitespace-pre-wrap leading-relaxed bg-vit-neutral-50 dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-800 rounded-xl font-medium">
                {selectedRequest.purpose}
              </p>
            </div>

            {/* Quick Action Button Group */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-vit-neutral-200 dark:border-vit-neutral-800">
              <button
                onClick={() => {
                  handleUpdateStatus(selectedRequest.id || selectedRequest._id, 'Approved');
                }}
                disabled={actionLoading !== null || selectedRequest.status === 'Approved'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Request</span>
              </button>
              <button
                onClick={() => {
                  handleUpdateStatus(selectedRequest.id || selectedRequest._id, 'Rejected');
                }}
                disabled={actionLoading !== null || selectedRequest.status === 'Rejected'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Request</span>
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-vit-neutral-250 dark:border-vit-neutral-700 hover:bg-vit-neutral-50 dark:hover:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPreEventsList;
