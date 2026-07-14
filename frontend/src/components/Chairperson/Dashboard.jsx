import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';
import { 
  FileText, 
  FileCheck, 
  Clock, 
  PlusCircle, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileDown,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const ChairpersonDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  // Calculate metrics
  const totalEvents = reports.length;
  const pendingReports = reports.filter(r => !r.hasOD).length;
  const submittedReports = reports.filter(r => r.hasOD).length;

  // Check if OD button should be active
  // Active if there is at least one report that doesn't have an OD
  const isODUploadUnlocked = pendingReports > 0;

  const handleDownloadReport = (filePath, eventName) => {
    if (!filePath) return;
    const url = `${api.defaults.baseURL.replace('/api', '')}${filePath}`;
    window.open(url, '_blank');
  };

  const handleDownloadODExcel = async (eventId, eventName) => {
    try {
      // Find the OD ID linked to this event
      const odsResponse = await api.get('/ods');
      const eventOD = odsResponse.data.find(o => o.eventId === eventId || (o.eventId && o.eventId._id === eventId));
      if (!eventOD) return;

      // Consolidate data to downloadable layout
      const xlsx = await import('xlsx');
      const wsData = [
        ['Club Name', eventOD.clubName],
        ['Event Name', eventOD.eventName],
        ['Event Date', eventOD.eventDate],
        ['Time Slot', eventOD.timeSlot],
        [],
        ['Registration Number', 'Student Name', 'Department', 'Year']
      ];
      
      eventOD.students.forEach(s => {
        wsData.push([s.registrationNumber, s.studentName, s.department, s.year]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      xlsx.utils.book_append_sheet(wb, ws, 'OD List');
      xlsx.writeFile(wb, `${eventName.replace(/[^a-z0-9]/gi, '_')}_OD_List.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-vit-navy to-vit-blue text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-vit-accent">Chairperson Portal</p>
          <h2 className="text-3xl font-extrabold tracking-tight">Welcome, {user.name}</h2>
          <p className="text-sm text-vit-sky font-medium max-w-xl">
            Manage your club affairs, upload post-event checklists, and student On Duty (OD) tables for 
            <span className="text-white font-bold ml-1">{user.clubName}</span>.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center justify-between hover:border-vit-blue/40 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-vit-neutral-500 uppercase tracking-wider">Total Reports</span>
            <p className="text-3xl font-extrabold text-vit-navy dark:text-white">{totalEvents}</p>
          </div>
          <div className="p-3.5 bg-vit-sky/40 dark:bg-vit-blue/15 text-vit-blue rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between hover:border-amber-500/40 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-vit-neutral-500 uppercase tracking-wider">Pending OD Uploads</span>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-500">{pendingReports}</p>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/15 text-amber-600 dark:text-amber-500 rounded-2xl">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between hover:border-emerald-500/40 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-vit-neutral-500 uppercase tracking-wider">Fully Submitted (with OD)</span>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-500">{submittedReports}</p>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/15 text-emerald-600 dark:text-emerald-500 rounded-2xl">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <Link
          to="/reports/new"
          className="flex items-center gap-2 px-5 py-3 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload Report</span>
        </Link>

        {isODUploadUnlocked ? (
          <Link
            to="/ods/new"
            className="flex items-center gap-2 px-5 py-3 glow-btn-accent rounded-xl text-sm font-semibold cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload OD List</span>
          </Link>
        ) : (
          <button
            disabled
            className="flex items-center gap-2 px-5 py-3 bg-vit-neutral-200 text-vit-neutral-400 dark:bg-vit-neutral-800 dark:text-vit-neutral-600 border border-vit-neutral-300 dark:border-vit-neutral-700 rounded-xl text-sm font-semibold cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>Upload OD List (Locked)</span>
          </button>
        )}
        
        <a
          href={`${api.defaults.baseURL}/ods/template`}
          download
          className="flex items-center gap-2 px-5 py-3 border border-vit-neutral-300 dark:border-vit-neutral-700 text-vit-neutral-750 dark:text-vit-neutral-250 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-xl text-sm font-semibold transition-colors"
        >
          <FileDown className="w-4 h-4" />
          <span>Download OD Excel Template</span>
        </a>
      </div>

      {/* Previous Reports Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg text-vit-navy dark:text-white">Previous Reports Log</h3>
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
            No events submitted yet. Click "Upload Report" to submit your first event report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Report</th>
                  <th className="px-6 py-4 text-center">OD Status</th>
                  <th className="px-6 py-4 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700 text-sm">
                {reports.map((report) => (
                  <tr key={report.id || report._id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-vit-navy dark:text-white truncate max-w-[200px]">
                      {report.eventName}
                    </td>
                    <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400 whitespace-nowrap">
                      {report.eventEndDate && report.eventEndDate !== report.eventDate 
                        ? `${report.eventDate} to ${report.eventEndDate}` 
                        : report.eventDate}
                    </td>
                    <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400">
                      {report.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Submitted
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDownloadReport(report.reportFilePath, report.eventName)}
                        className="inline-flex items-center justify-center p-1.5 text-vit-blue hover:bg-vit-sky/40 dark:text-sky-400 dark:hover:bg-vit-blue/20 rounded-lg transition-colors cursor-pointer"
                        title="View Report File"
                      >
                        <FileText className="w-4.5 h-4.5" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {report.hasOD ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Uploaded
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate('/ods/new', { state: { selectedEventId: report.id || report._id } })}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 underline cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Upload OD</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleDownloadReport(report.reportFilePath, report.eventName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-vit-neutral-100 dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg hover:bg-vit-neutral-200 dark:hover:bg-vit-neutral-700 transition-colors cursor-pointer"
                        title="Download Report PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </button>
                      
                      {report.hasOD ? (
                        <button
                          onClick={() => handleDownloadODExcel(report.id || report._id, report.eventName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="Download Student OD Excel"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>OD List</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-vit-neutral-50 dark:bg-vit-neutral-900 border border-vit-neutral-200 text-xs font-semibold rounded-lg text-vit-neutral-400 cursor-not-allowed"
                          title="OD List Locked"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </button>
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
  );
};

export default ChairpersonDashboard;
