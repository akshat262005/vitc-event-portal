import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import {
  FileText,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';

const ReportsList = () => {
  const { showToast } = useAuth();
  const [reports, setReports] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters & Search & Sort states
  const [search, setSearch] = useState('');
  const [filterClub, setFilterClub] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); // Format: YYYY-MM
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, name-asc, club-asc

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsRes, clubsRes] = await Promise.all([
          api.get('/reports'),
          api.get('/clubs')
        ]);
        setReports(reportsRes.data);
        setClubs(clubsRes.data);
      } catch (err) {
        console.error('Failed to load reports data:', err);
        showToast('Error loading reports.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownloadReport = (filePath) => {
    if (!filePath) return;
    const url = `${api.defaults.baseURL.replace('/api', '')}${filePath}`;
    window.open(url, '_blank');
  };

  const toggleExpandRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Filtered and Sorted Reports
  const processedReports = reports
    .filter((report) => {
      // 1. Search Query (Club Name, Event Name, Category, Date)
      const query = search.toLowerCase();
      const matchSearch =
        report.eventName.toLowerCase().includes(query) ||
        report.clubName.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query) ||
        report.eventDate.includes(query) ||
        (report.submittedBy?.name || '').toLowerCase().includes(query);

      // 2. Filters
      const matchClub = filterClub ? report.clubId === filterClub : true;
      const matchCategory = filterCategory ? report.category === filterCategory : true;
      const matchMonth = filterMonth ? report.eventDate.startsWith(filterMonth) : true;

      return matchSearch && matchClub && matchCategory && matchMonth;
    })
    .sort((a, b) => {
      // 3. Sorting
      if (sortBy === 'date-desc') {
        return new Date(b.eventDate) - new Date(a.eventDate);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.eventDate) - new Date(b.eventDate);
      }
      if (sortBy === 'name-asc') {
        return a.eventName.localeCompare(b.eventName);
      }
      if (sortBy === 'club-asc') {
        return a.clubName.localeCompare(b.clubName);
      }
      return 0;
    });

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-vit-blue" />
          <span>Post-Event Reports Ledger</span>
        </h2>
        <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
          Review, query, and download PDFs/DOCXs submitted for completed VIT Chennai club events.
        </p>
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
              <span>Search Ledger & Refine Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-vit-neutral-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search club, event, date..."
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

              {/* Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              >
                <option value="">All Event Categories</option>
                <option value="Competition">Competition</option>
                <option value="Game">Game</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop</option>
                <option value="Management">Management</option>
                <option value="Others">Others</option>
              </select>

              {/* Month filter */}
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              />

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              >
                <option value="date-desc">Sort by Date (Latest)</option>
                <option value="date-asc">Sort by Date (Oldest)</option>
                <option value="name-asc">Sort by Event Name (A-Z)</option>
                <option value="club-asc">Sort by Club Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* REPORTS LIST LOG */}
          <div className="glass-panel overflow-hidden">
            <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white">Reports Register</h3>
              <span className="text-xs bg-vit-sky text-vit-blue px-2.5 py-1 rounded-full font-bold">
                {processedReports.length} Matches Found
              </span>
            </div>

            {processedReports.length === 0 ? (
              <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No event reports match the filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                      <th className="px-6 py-4">Event Details</th>
                      <th className="px-6 py-4">Club / Chapter Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">OD Status</th>
                      <th className="px-6 py-4 text-center">Document</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                    {processedReports.map((report) => (
                      <React.Fragment key={report.id || report._id}>
                        <tr className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleExpandRow(report.id || report._id)}
                              className="flex items-center gap-1 font-bold text-vit-navy dark:text-white hover:text-vit-blue text-sm text-left focus:outline-none"
                            >
                              {expandedRow === (report.id || report._id) ? <ChevronUp className="w-4 h-4 text-vit-blue" /> : <ChevronDown className="w-4 h-4 text-vit-neutral-450" />}
                              <span>{report.eventName}</span>
                            </button>
                            <span className="text-[10px] text-vit-neutral-450 mt-1 block flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {report.eventEndDate && report.eventEndDate !== report.eventDate 
                                ? `${report.eventDate} to ${report.eventEndDate}` 
                                : report.eventDate} • {report.eventTime}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-vit-blue dark:text-sky-400">
                            {report.clubName}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-vit-neutral-100 dark:bg-vit-neutral-800 text-[10px] font-semibold text-vit-neutral-600 dark:text-vit-neutral-300">
                              <Layers className="w-3 h-3" />
                              {report.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold">
                            {report.hasOD ? (
                              <span className="text-emerald-600 dark:text-emerald-400">✓ OD Uploaded</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>Report Only</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleDownloadReport(report.reportFilePath)}
                              className="inline-flex items-center justify-center p-1.5 text-vit-blue hover:bg-vit-sky/40 dark:text-sky-400 rounded-lg transition-colors cursor-pointer"
                              title="View file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDownloadReport(report.reportFilePath)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-vit-neutral-550 dark:bg-vit-neutral-800 border border-vit-neutral-250 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg hover:bg-vit-neutral-200 dark:hover:bg-vit-neutral-700 transition-colors text-vit-neutral-800 dark:text-white cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expandable row content */}
                        {expandedRow === (report.id || report._id) && (
                          <tr>
                            <td colSpan="6" className="px-8 py-5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-xs">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Details column */}
                                <div className="space-y-2">
                                  <p className="text-vit-blue font-bold uppercase tracking-wider text-[10px]">Coordinators & Settings</p>
                                  <p><strong>Venue:</strong> {report.venue}</p>
                                  <p><strong>Faculty Coordinator:</strong> {report.facultyCoordinator}</p>
                                  <p><strong>Student Coordinator:</strong> {report.studentCoordinator}</p>
                                  <p><strong>Number of Participants:</strong> {report.numberOfParticipants} Students</p>
                                  <p><strong>Budget Incurred:</strong> INR {report.budgetUsed}</p>
                                </div>

                                {/* Narrative column */}
                                <div className="space-y-2 col-span-2">
                                  <p className="text-vit-blue font-bold uppercase tracking-wider text-[10px]">Narrative Outcomes</p>
                                  <p><strong>Description:</strong> {report.description}</p>
                                  <p><strong>Outcome:</strong> {report.outcome}</p>
                                  
                                  {/* Photos grid */}
                                  {report.photos && report.photos.length > 0 && (
                                    <div className="pt-2">
                                      <p className="flex items-center gap-1 font-bold text-[10px] uppercase text-vit-neutral-500 mb-2">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span>Uploaded Event Photos ({report.photos.length})</span>
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {report.photos.map((photo, pIdx) => {
                                          const photoUrl = `${api.defaults.baseURL.replace('/api', '')}${photo}`;
                                          return (
                                            <a key={pIdx} href={photoUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-vit-neutral-200 hover:scale-105 transition-transform block">
                                              <img src={photoUrl} alt="event capture" className="w-full h-full object-cover" />
                                            </a>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
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

export default ReportsList;
