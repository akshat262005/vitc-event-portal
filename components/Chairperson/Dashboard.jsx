'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
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
  AlertCircle,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  CalendarDays,
  X
} from 'lucide-react';

const ChairpersonDashboard = () => {
  const { user, showToast } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [ods, setOds] = useState([]);
  const [preEvents, setPreEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRemarksRow, setExpandedRemarksRow] = useState(null);
  const [selectedPreEvent, setSelectedPreEvent] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [reportsRes, odsRes, preEventsRes] = await Promise.all([
        api.get('/reports'),
        api.get('/ods'),
        api.get('/pre-events')
      ]);
      setReports(reportsRes.data);
      setOds(odsRes.data);
      setPreEvents(preEventsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteReport = async (reportId, name) => {
    if (!window.confirm(`Are you sure you want to delete the report for "${name}"? This will also delete any linked OD lists.`)) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/reports/${reportId}`);
      showToast('Event report and linked OD list deleted successfully!', 'success');
      await fetchDashboardData();
    } catch (err) {
      console.error('Error deleting report:', err);
      showToast(err.response?.data?.message || 'Error deleting event report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOD = async (odId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete the student OD list for "${eventName}"? This will allow you to upload a new list.`)) {
      return;
    }
    try {
      setLoading(true);
      await api.delete(`/ods/${odId}`);
      showToast('OD list deleted successfully!', 'success');
      await fetchDashboardData();
    } catch (err) {
      console.error('Error deleting OD list:', err);
      showToast(err.response?.data?.message || 'Error deleting OD list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRemarksRow = (id) => {
    setExpandedRemarksRow(expandedRemarksRow === id ? null : id);
  };

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

  const totalPreEvents = preEvents.length;
  const pendingPreEvents = preEvents.filter(p => p.status === 'Pending').length;
  const approvedPreEvents = preEvents.filter(p => p.status === 'Approved').length;
  const rejectedPreEvents = preEvents.filter(p => p.status === 'Rejected').length;

  // Active if there is at least one report or pre-event that doesn't have an OD
  const isODUploadUnlocked = pendingReports > 0 || preEvents.some(p => !p.hasOD);

  const handleDownloadReport = (filePath, eventName) => {
    if (!filePath) return;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      window.open(filePath, '_blank');
    } else {
      const url = `${api.defaults.baseURL.replace('/api', '')}${filePath}`;
      window.open(url, '_blank');
    }
  };

  const handleDownloadODExcel = async (eventId, eventName) => {
    try {
      // Find the OD ID linked to this event
      const odsResponse = await api.get('/ods');
      const eventOD = odsResponse.data.find(o => {
        const oEventId = o.eventId?._id ? o.eventId._id.toString() : o.eventId?.toString();
        return oEventId === eventId;
      });
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="glass-card p-6 flex flex-col justify-between hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between border-b border-vit-neutral-200 dark:border-vit-neutral-800 pb-2 mb-2 w-full">
            <span className="text-xs font-bold text-vit-neutral-500 uppercase tracking-wider">Pre-Event Operations</span>
            <CalendarDays className="w-5 h-5 text-vit-blue" />
          </div>
          <div className="grid grid-cols-4 gap-1 text-center w-full mt-1">
            <div>
              <p className="text-sm font-extrabold text-vit-navy dark:text-white">{totalPreEvents}</p>
              <span className="text-[8px] font-bold text-vit-neutral-400 uppercase tracking-wider block">Total</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-600 dark:text-amber-500">{pendingPreEvents}</p>
              <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block">Pend</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-500">{approvedPreEvents}</p>
              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block">Appr</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-red-600 dark:text-red-500">{rejectedPreEvents}</p>
              <span className="text-[8px] font-bold text-red-600 dark:text-red-500 uppercase tracking-wider block">Rej</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <Link href="/pre-events/new"
          className="flex items-center gap-2 px-5 py-3 bg-vit-navy text-white rounded-xl text-sm font-semibold hover:bg-vit-blue transition-all cursor-pointer shadow-md"
        >
          <CalendarDays className="w-4 h-4" />
          <span>Pre-Event Request</span>
        </Link>

        <Link href="/reports/new"
          className="flex items-center gap-2 px-5 py-3 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload Report</span>
        </Link>

        {isODUploadUnlocked ? (
          <Link href="/ods/new"
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
                {reports.map((report) => {
                  const linkedOD = ods.find(o => {
                    const oEventId = o.eventId?._id ? o.eventId._id.toString() : o.eventId?.toString();
                    const rId = report.id || report._id?.toString();
                    return oEventId && rId && oEventId === rId;
                  });
                  return (
                    <React.Fragment key={report.id || report._id}>
                      <tr className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
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
                          {(() => {
                            const reportAttempts = 3 - (report.reportUploadsCount || 1);
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleDownloadReport(report.reportFilePath, report.eventName)}
                                    className="inline-flex items-center justify-center p-1.5 text-vit-blue hover:bg-vit-sky/40 dark:text-sky-400 dark:hover:bg-vit-blue/20 rounded-lg transition-colors cursor-pointer"
                                    title="View Report File"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => reportAttempts > 0 ? router.push(`/reports/edit/${report.id || report._id}`) : showToast('No report edit attempts remaining.', 'warning')}
                                    disabled={reportAttempts <= 0}
                                    className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
                                      reportAttempts > 0
                                        ? 'text-amber-605 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-955/20 cursor-pointer'
                                        : 'text-vit-neutral-400 cursor-not-allowed opacity-50'
                                    }`}
                                    title={reportAttempts > 0 ? 'Edit Event Report' : 'Upload limit reached (3/3)'}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReport(report.id || report._id, report.eventName)}
                                    className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Event Report"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className={`text-[9px] font-bold ${reportAttempts > 0 ? 'text-vit-neutral-400' : 'text-red-500 font-extrabold animate-pulse'}`}>
                                  {reportAttempts > 0 ? `${reportAttempts} edit(s) left` : 'No edits left'}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {report.hasOD ? (
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              {(() => {
                                const odAttempts = 3 - (report.odUploadsCount || 0);
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5 justify-center">
                                      {linkedOD && (
                                        <>
                                          {linkedOD.verificationStatus === 'fully_updated' && (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-250 dark:border-emerald-900/40">
                                              🟢 Fully Updated
                                            </span>
                                          )}
                                          {linkedOD.verificationStatus === 'partially_updated' && (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold border border-orange-250 dark:border-orange-900/40">
                                              🟠 Partially Updated
                                            </span>
                                          )}
                                          {(linkedOD.verificationStatus === 'pending' || !linkedOD.verificationStatus) && (
                                            <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-bold border border-yellow-250 dark:border-yellow-900/40">
                                              🟡 Pending Verification
                                            </span>
                                          )}
                                          <button
                                            onClick={() => odAttempts > 0 ? router.push(`/ods/edit/${linkedOD.id || linkedOD._id}`) : showToast('No student OD resubmission attempts remaining.', 'warning')}
                                            disabled={odAttempts <= 0}
                                            className={`inline-flex items-center justify-center p-0.5 rounded-lg transition-colors ${
                                              odAttempts > 0
                                                ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-955/20 cursor-pointer'
                                                : 'text-vit-neutral-400 cursor-not-allowed opacity-50'
                                            }`}
                                            title={odAttempts > 0 ? 'Edit Student OD List' : 'Upload limit reached (3/3)'}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteOD(linkedOD.id || linkedOD._id, report.eventName)}
                                            className="inline-flex items-center justify-center p-0.5 text-red-600 hover:bg-red-50 dark:text-red-450 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                                            title="Delete Student OD List"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    <span className={`text-[9px] font-bold ${odAttempts > 0 ? 'text-vit-neutral-400' : 'text-red-500 font-extrabold animate-pulse'}`}>
                                      {odAttempts > 0 ? `${odAttempts} upload(s) left` : 'No attempts left'}
                                    </span>
                                  </>
                                );
                              })()}
                              {linkedOD && (
                                <button
                                  onClick={() => toggleRemarksRow(report.id || report._id)}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                                    linkedOD.verificationStatus === 'partially_updated'
                                      ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900/45 dark:text-orange-400 animate-pulse'
                                      : 'bg-vit-neutral-50 hover:bg-vit-neutral-100 border-vit-neutral-250 text-vit-neutral-500 dark:bg-vit-neutral-900 dark:border-vit-neutral-750 dark:text-vit-neutral-400'
                                  }`}
                                >
                                  {expandedRemarksRow === (report.id || report._id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>Verification details</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const odAttempts = 3 - (report.odUploadsCount || 0);
                              if (odAttempts <= 0) {
                                return (
                                  <span className="text-[10px] text-red-500 font-bold">
                                    Uploads Blocked (3/3 reached)
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <button
                                    onClick={() => router.push(`/ods/new?selectedEventId=${report.id || report._id}`)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-400 underline cursor-pointer"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Upload OD</span>
                                  </button>
                                  <span className="text-[9px] text-vit-neutral-400 font-bold">
                                    {odAttempts} attempt(s) left
                                  </span>
                                </div>
                              );
                            })()
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

                      {/* Collapsible Admin Remarks drawer */}
                      {expandedRemarksRow === (report.id || report._id) && linkedOD && (
                        <tr>
                          <td colSpan="7" className="px-8 py-5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-xs">
                            {(() => {
                              const total = linkedOD.totalStudents || linkedOD.students?.length || 0;
                              const completed = linkedOD.completedStudents || 0;
                              const remaining = linkedOD.remainingStudents !== undefined ? linkedOD.remainingStudents : total;
                              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                              const status = linkedOD.verificationStatus || 'pending';
                              const odAttempts = 3 - (report.odUploadsCount || 0);
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Left Column: Progress details */}
                                  <div className="md:col-span-1 bg-white dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-xl space-y-3">
                                    <h4 className="font-bold text-xs text-vit-navy dark:text-white uppercase tracking-wider">OD Verification Status</h4>
                                    
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-vit-neutral-500 font-medium">Status:</span>
                                        <span>
                                          {linkedOD.verificationStatus === 'fully_updated' && '🟢 Fully Updated'}
                                          {linkedOD.verificationStatus === 'partially_updated' && '🟠 Partially Updated'}
                                          {(linkedOD.verificationStatus === 'pending' || !linkedOD.verificationStatus) && '🟡 Pending Verification'}
                                        </span>
                                      </div>
                                      
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-vit-neutral-500 font-medium">Completed:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{completed} Students</span>
                                      </div>

                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-vit-neutral-500 font-medium">Remaining:</span>
                                        <span className="font-bold text-red-500">{remaining} Students</span>
                                      </div>

                                      <div className="pt-2">
                                        <div className="flex justify-between text-[10px] text-vit-neutral-500 font-semibold mb-1">
                                          <span>Completion Progress</span>
                                          <span>{pct}%</span>
                                        </div>
                                        <div className="w-full bg-vit-neutral-100 dark:bg-vit-neutral-800 h-2 rounded-full overflow-hidden flex">
                                          <div 
                                            style={{ width: `${pct}%` }} 
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              status === 'fully_updated' 
                                                ? 'bg-emerald-500' 
                                                : status === 'partially_updated' 
                                                  ? 'bg-orange-500' 
                                                  : 'bg-yellow-500'
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {status === 'partially_updated' && (
                                       <div className="space-y-1.5">
                                         <button
                                           onClick={() => odAttempts > 0 ? router.push(`/ods/edit/${linkedOD.id || linkedOD._id}?resubmit=1`) : null}
                                           disabled={odAttempts <= 0}
                                           className={`w-full mt-4 py-2 px-4 text-white text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md ${
                                             odAttempts > 0
                                               ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer shadow-orange-550/15'
                                               : 'bg-vit-neutral-300 dark:bg-vit-neutral-800 text-vit-neutral-500 cursor-not-allowed'
                                           }`}
                                         >
                                           <Upload className="w-3.5 h-3.5" />
                                           <span>Resubmit Corrected OD</span>
                                         </button>
                                         <div className="text-center">
                                           <span className={`text-[10px] font-bold ${odAttempts > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-red-500'}`}>
                                             {odAttempts > 0 ? `${odAttempts} upload attempt(s) remaining` : '0 upload attempts left (max reached)'}
                                           </span>
                                         </div>
                                       </div>
                                     )}
                                  </div>

                                  {/* Right Column: Admin Remarks details */}
                                  <div className="md:col-span-2 bg-white dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-xl space-y-2 flex flex-col justify-between">
                                    <div>
                                      <h4 className="font-bold text-xs text-vit-navy dark:text-white uppercase tracking-wider">Administrative Remarks & Issues Log</h4>
                                      {linkedOD.adminRemarks ? (
                                        <div className="space-y-3 pt-1">
                                          <p className="text-[11px] text-vit-neutral-500 leading-relaxed">
                                            The administrator logged the following issues when validating this student OD list on the official portal. Please upload a corrected spreadsheet addressing these remarks:
                                          </p>
                                          
                                          <div className="space-y-3">
                                            <pre className="p-3.5 bg-orange-50/40 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed text-orange-850 dark:text-orange-400">
                                              {linkedOD.adminRemarks}
                                            </pre>

                                            {/* Structured completed students list */}
                                            {(() => {
                                              const lines = linkedOD.adminRemarks.split('\n');
                                              const completedList = [];
                                              lines.forEach(line => {
                                                const match = line.match(/\b\d{2}[a-zA-Z]{3,4}\d{4}\b/);
                                                if (match) {
                                                  const reg = match[0].toUpperCase();
                                                  if (!completedList.some(c => c.regNo === reg)) {
                                                    completedList.push({
                                                      regNo: reg,
                                                      msg: line.replace(match[0], '').replace(/^\s*[-:]\s*/, '').trim()
                                                    });
                                                  }
                                                }
                                              });

                                              if (completedList.length > 0) {
                                                return (
                                                  <div className="space-y-2 bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-250/40 dark:border-emerald-900/30 rounded-xl p-3">
                                                    <h5 className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px] uppercase flex items-center gap-1.5 mb-1.5">
                                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                      <span>Successfully Verified Students ({completedList.length})</span>
                                                    </h5>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                      {completedList.map((stud, studIdx) => (
                                                        <div key={studIdx} className="flex items-start gap-2 bg-white dark:bg-vit-neutral-900 p-2.5 rounded-lg border border-vit-neutral-200 dark:border-vit-neutral-800 shadow-sm">
                                                          <span className="inline-flex items-center justify-center text-[9px] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-250 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">
                                                            {stud.regNo}
                                                          </span>
                                                          <p className="text-[10px] text-vit-neutral-500 dark:text-vit-neutral-400 leading-normal">
                                                            {stud.msg || 'Successfully updated on portal.'}
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center py-6 text-xs text-vit-neutral-500">
                                          No administrative remarks or issues logged for this verification status.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
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

      {/* Previous Pre-Event Requests Table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg text-vit-navy dark:text-white">Previous Pre-Event Requests</h3>
        </div>

        {preEvents.length === 0 ? (
          <div className="p-12 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
            No pre-event requests submitted yet. Click "Pre-Event Request" to submit your first request.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-vit-neutral-50 dark:bg-vit-neutral-850 text-vit-neutral-500 text-xs font-bold uppercase tracking-wider border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                  <th className="px-6 py-4">Event Name</th>
                  <th className="px-6 py-4">Event Date</th>
                  <th className="px-6 py-4">OD Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4 text-center">OD Upload</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700 text-sm">
                {preEvents.map((op) => {
                  const id = op.id || op._id;
                  return (
                    <tr key={id} className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-vit-navy dark:text-white truncate max-w-[200px]">
                        {op.eventName}
                      </td>
                      <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400 whitespace-nowrap">
                        {op.eventDate}
                      </td>
                      <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400 font-medium whitespace-nowrap">
                        {op.odRequiredDate}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          op.status === 'Approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                            : op.status === 'Rejected'
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200'
                              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200'
                        }`}>
                          {op.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-vit-neutral-600 dark:text-vit-neutral-400 whitespace-nowrap">
                        {new Date(op.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {op.hasOD ? (
                          (() => {
                            const linkedOD = ods.find(o => {
                              const oEventId = o.eventId?._id ? o.eventId._id.toString() : o.eventId?.toString();
                              return oEventId && oEventId === id;
                            });
                            if (linkedOD) {
                              return (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  {linkedOD.verificationStatus === 'fully_updated' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                                      🟢 Fully Verified
                                    </span>
                                  )}
                                  {linkedOD.verificationStatus === 'partially_updated' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full font-bold border border-orange-200 animate-pulse">
                                      🟠 Partially Verified
                                    </span>
                                  )}
                                  {(linkedOD.verificationStatus === 'pending' || !linkedOD.verificationStatus) && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full font-bold border border-yellow-200">
                                      🟡 Pending Verification
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/40">
                                Uploaded
                              </span>
                            );
                          })()
                        ) : op.status === 'Approved' ? (
                          <button
                            onClick={() => router.push(`/ods/new?selectedEventId=${id}&requestType=pre_event`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-vit-navy hover:bg-vit-blue text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload OD</span>
                          </button>
                        ) : (
                          <span className="text-xs text-vit-neutral-450 italic">Locked (Awaiting Approval)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedPreEvent(op)}
                          className="px-3 py-1.5 bg-vit-neutral-100 hover:bg-vit-neutral-200 dark:bg-vit-neutral-800 dark:hover:bg-vit-neutral-700 text-vit-navy dark:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRE-EVENT DETAILS MODAL */}
      {selectedPreEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-850 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            <button
              onClick={() => setSelectedPreEvent(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-800 rounded-lg text-vit-neutral-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border mb-2 ${
                selectedPreEvent.status === 'Approved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                  : selectedPreEvent.status === 'Rejected'
                    ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200'
                    : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200'
              }`}>
                {selectedPreEvent.status}
              </span>
              <h3 className="text-xl font-extrabold text-vit-navy dark:text-white">
                {selectedPreEvent.eventName}
              </h3>
              <p className="text-xs text-vit-neutral-405 dark:text-vit-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                Pre-Event Operation Request
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-b border-vit-neutral-200 dark:border-vit-neutral-850 py-5">
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Event Category</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedPreEvent.eventCategoryOthersSpecify ? `${selectedPreEvent.eventCategory} (${selectedPreEvent.eventCategoryOthersSpecify})` : selectedPreEvent.eventCategory}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Submission Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {new Date(selectedPreEvent.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Actual Event Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedPreEvent.eventDate}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">OD Required Date</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedPreEvent.odRequiredDate}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Faculty Coordinator</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedPreEvent.facultyCoordinator}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Student Coordinator</span>
                <span className="text-sm font-semibold text-vit-navy dark:text-white">
                  {selectedPreEvent.studentCoordinator} ({selectedPreEvent.studentCoordinatorContact})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Purpose of Pre-Event Operations</span>
              <p className="text-sm text-vit-neutral-600 dark:text-vit-neutral-300 whitespace-pre-wrap leading-relaxed bg-vit-neutral-50 dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-800 rounded-xl font-medium">
                {selectedPreEvent.purpose}
              </p>
            </div>

            {(() => {
              const linkedOD = ods.find(o => {
                const oEventId = o.eventId?._id ? o.eventId._id.toString() : o.eventId?.toString();
                const peId = selectedPreEvent.id || selectedPreEvent._id?.toString();
                return oEventId && peId && oEventId === peId;
              });
              if (linkedOD) {
                const total = linkedOD.totalStudents || linkedOD.students?.length || 0;
                const completed = linkedOD.completedStudents || 0;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div className="border-t border-vit-neutral-200 dark:border-vit-neutral-850 pt-5 space-y-4">
                    <h4 className="font-extrabold text-sm text-vit-navy dark:text-white uppercase tracking-wider">
                      Academic OD Status & Verification Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-vit-neutral-50 dark:bg-vit-neutral-950 p-4 border border-vit-neutral-200 dark:border-vit-neutral-800 rounded-xl">
                      {/* Progress / Status */}
                      <div className="space-y-3">
                        <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">OD Verification Status</span>
                        <div className="space-y-1">
                          <div className="text-xs font-bold">
                            {linkedOD.verificationStatus === 'fully_updated' && '🟢 Fully Verified'}
                            {linkedOD.verificationStatus === 'partially_updated' && '🟠 Partially Verified'}
                            {(linkedOD.verificationStatus === 'pending' || !linkedOD.verificationStatus) && '🟡 Pending Verification'}
                          </div>
                          <div className="text-[11px] text-vit-neutral-500">
                            {completed} / {total} Students verified
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-vit-neutral-200 dark:bg-vit-neutral-850 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                linkedOD.verificationStatus === 'fully_updated' 
                                  ? 'bg-emerald-500' 
                                  : linkedOD.verificationStatus === 'partially_updated' 
                                    ? 'bg-orange-500' 
                                    : 'bg-yellow-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Admin Remarks */}
                      <div className="md:col-span-2 space-y-2">
                        <span className="block text-[10px] text-vit-neutral-400 font-bold uppercase tracking-wider">Administrative Remarks & Issues Log</span>
                        {linkedOD.adminRemarks ? (
                          <pre className="p-3.5 bg-orange-50/40 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed text-orange-850 dark:text-orange-400 max-h-[120px] overflow-y-auto">
                            {linkedOD.adminRemarks}
                          </pre>
                        ) : (
                          <p className="text-xs text-vit-neutral-500 italic py-2">
                            No administrative remarks logged yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Resubmission button */}
                    {linkedOD.verificationStatus === 'partially_updated' && (
                      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-orange-50/20 dark:bg-orange-950/5 border border-orange-200/40 dark:border-orange-900/30 rounded-xl p-3">
                        <span className="text-xs text-vit-neutral-500">
                          The administrator verified this list with some issues. You have {3 - (selectedPreEvent.odUploadsCount || 0)} upload attempt(s) remaining.
                        </span>
                        <button
                          onClick={() => {
                            const odId = linkedOD.id || linkedOD._id;
                            setSelectedPreEvent(null);
                            router.push(`/ods/edit/${odId}?resubmit=1`);
                          }}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Resubmit Corrected OD
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex justify-end pt-2 border-t border-vit-neutral-200 dark:border-vit-neutral-800">
              <button
                onClick={() => setSelectedPreEvent(null)}
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

export default ChairpersonDashboard;
