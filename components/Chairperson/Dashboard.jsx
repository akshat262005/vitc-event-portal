'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { autoFitColumns } from '@/lib/excel-utils';
import { sortODStudents } from '@/lib/od-utils';
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
  const [loading, setLoading] = useState(true);
  const [expandedRemarksRow, setExpandedRemarksRow] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [reportsRes, odsRes] = await Promise.all([
        api.get('/reports'),
        api.get('/ods')
      ]);
      setReports(reportsRes.data);
      setOds(odsRes.data);
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

  const isODUploadUnlocked = pendingReports > 0;

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
        ['Registration Number', 'Student Name', 'Date', 'Time']
      ];
      
      const sortedStudents = sortODStudents(eventOD.students || []);
      sortedStudents.forEach(s => {
        wsData.push([s.registrationNumber, s.studentName, s.date || eventOD.eventDate, s.time || eventOD.timeSlot]);
      });

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet(wsData);
      ws['!cols'] = autoFitColumns(wsData, 5);
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
          <p className="text-xs font-semibold uppercase tracking-wider text-vit-accent">Club POC Portal</p>
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
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Primary Club</th>
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

                  // Check if the current club is a collaborating club (read-only collaborator)
                  const isCollaboratingClub = report.isCollaboration && 
                                              report.collaborationClubs && 
                                              report.collaborationClubs.includes(user.clubName) && 
                                              (report.clubId?.toString() !== user.clubId?.toString() && report.clubId !== user.clubId);

                  return (
                    <React.Fragment key={report.id || report._id}>
                      <tr className="hover:bg-vit-neutral-100/30 dark:hover:bg-vit-neutral-800/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-vit-navy dark:text-white truncate max-w-[200px]">
                          <div className="flex flex-col gap-1">
                            <span className="truncate">{report.eventName}</span>
                            {isCollaboratingClub && (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 px-1.5 py-0.5 rounded w-max">
                                  🤝 Collaboration Event
                                </span>
                                <span className="text-[9px] text-vit-neutral-450 font-bold">
                                  Primary Club: {report.clubName}
                                </span>
                              </div>
                            )}
                          </div>
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
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            report.isCollaboration
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400'
                          }`}>
                            {report.isCollaboration ? '🤝 Collaboration' : 'Individual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-vit-neutral-700 dark:text-vit-neutral-350 truncate max-w-[150px]">
                          {report.isCollaboration ? report.clubName : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-800/40">
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
                                  {!isCollaboratingClub ? (
                                    <>
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
                                        className="inline-flex items-center justify-center p-1.5 text-red-650 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Event Report"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-vit-neutral-400 font-bold italic">Read-Only</span>
                                  )}
                                </div>
                                {!isCollaboratingClub && (
                                  <span className={`text-[9px] font-bold ${reportAttempts > 0 ? 'text-vit-neutral-400' : 'text-red-500 font-extrabold animate-pulse'}`}>
                                    {reportAttempts > 0 ? `${reportAttempts} edit(s) left` : 'No edits left'}
                                  </span>
                                )}
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
                                        (() => {
                                          const oTotal = linkedOD.totalStudents || linkedOD.students?.length || 0;
                                          const oComp = linkedOD.completedStudents || 0;
                                          const oRem = linkedOD.remainingStudents !== undefined ? linkedOD.remainingStudents : Math.max(0, oTotal - oComp);
                                          const oStatus = (oTotal > 0 && (oComp >= oTotal || oRem === 0)) ? 'fully_updated' : (linkedOD.verificationStatus || 'pending');
                                          return (
                                            <>
                                              {oStatus === 'fully_updated' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-250 dark:border-emerald-900/40">
                                                  🟢 Fully Updated
                                                </span>
                                              )}
                                              {oStatus === 'partially_updated' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold border border-orange-250 dark:border-orange-900/40">
                                                  🟠 Partially Updated
                                                </span>
                                              )}
                                              {oStatus === 'pending' && (
                                                <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-bold border border-yellow-250 dark:border-yellow-900/40">
                                                  🟡 Pending Verification
                                                </span>
                                              )}
                                            </>
                                          );
                                        })()
                                      )}
                                      {!isCollaboratingClub && linkedOD && (
                                        <>
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
                                            className="inline-flex items-center justify-center p-0.5 text-red-655 hover:bg-red-50 dark:text-red-455 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                                            title="Delete Student OD List"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    {!isCollaboratingClub && (
                                      <span className={`text-[9px] font-bold ${odAttempts > 0 ? 'text-vit-neutral-400' : 'text-red-500 font-extrabold animate-pulse'}`}>
                                        {odAttempts > 0 ? `${odAttempts} upload(s) left` : 'No attempts left'}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                              {linkedOD && (
                                (() => {
                                  const oTot = linkedOD.totalStudents || linkedOD.students?.length || 0;
                                  const oComp = linkedOD.completedStudents || 0;
                                  const oRem = linkedOD.remainingStudents !== undefined ? linkedOD.remainingStudents : Math.max(0, oTot - oComp);
                                  const isAllDone = oTot > 0 && (oComp >= oTot || oRem === 0);
                                  const isPartial = linkedOD.verificationStatus === 'partially_updated' && !isAllDone;

                                  return (
                                    <button
                                      onClick={() => toggleRemarksRow(report.id || report._id)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                                        isPartial
                                          ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900/45 dark:text-orange-400 animate-pulse'
                                          : 'bg-vit-neutral-50 hover:bg-vit-neutral-100 border-vit-neutral-250 text-vit-neutral-500 dark:bg-vit-neutral-900 dark:border-vit-neutral-750 dark:text-vit-neutral-400'
                                      }`}
                                    >
                                      {expandedRemarksRow === (report.id || report._id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      <span>Verification details</span>
                                    </button>
                                  );
                                })()
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
                              if (isCollaboratingClub) {
                                return (
                                  <span className="text-[10px] text-vit-neutral-450 dark:text-vit-neutral-400 font-bold italic">
                                    OD Upload Handled by {report.clubName}
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
                      {expandedRemarksRow === (report.id || report._id) && (
                        <tr>
                          <td colSpan="9" className="px-8 py-5 bg-vit-neutral-50 dark:bg-vit-neutral-900 border-b border-vit-neutral-200/50 dark:border-vit-neutral-700/50 text-xs">
                            {isCollaboratingClub && (
                              <div className="mb-5 p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-150 dark:border-blue-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-blue-800 dark:text-blue-300">
                                <div>
                                  <p className="font-bold text-sm flex items-center gap-1.5 mb-1 text-blue-900 dark:text-blue-200">
                                    <span>🤝 Collaboration Event</span>
                                  </p>
                                  <p className="text-vit-neutral-500 font-semibold text-[11px]">
                                    This event is a collaboration. Your club has read-only access.
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-x-6 gap-y-1 font-semibold text-[11px] bg-white dark:bg-vit-neutral-950 p-3 rounded-xl border border-blue-100 dark:border-blue-950/30 shadow-sm">
                                  <div>
                                    <span className="block text-[9px] uppercase text-vit-neutral-450">Primary Club</span>
                                    <span className="font-extrabold text-vit-navy dark:text-white">{report.clubName}</span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase text-vit-neutral-450">Submitted By</span>
                                    <span className="font-extrabold text-vit-navy dark:text-white">
                                      {report.submittedBy?.name || 'Authorized Club POC'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] uppercase text-vit-neutral-450">Submission Date</span>
                                    <span className="font-extrabold text-vit-navy dark:text-white">
                                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {!linkedOD ? (
                              <div className="bg-white dark:bg-vit-neutral-955 p-6 border border-vit-neutral-200 dark:border-vit-neutral-750 rounded-2xl text-center space-y-2">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                                <h4 className="font-bold text-vit-navy dark:text-white">No Student OD List Submitted</h4>
                                <p className="text-vit-neutral-450 text-[11px] max-w-sm mx-auto">
                                  The student On Duty list has not been uploaded yet. {isCollaboratingClub ? `This will be managed by the primary club, ${report.clubName}.` : "You can submit the student list by clicking 'Upload OD' in the reports log."}
                                </p>
                              </div>
                            ) : (
                              (() => {
                                const total = linkedOD.totalStudents || linkedOD.students?.length || 0;
                                const completed = linkedOD.completedStudents || 0;
                                const remaining = linkedOD.remainingStudents !== undefined ? linkedOD.remainingStudents : Math.max(0, total - completed);
                                const isDone = total > 0 && (completed >= total || remaining === 0);
                                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                const status = isDone ? 'fully_updated' : (linkedOD.verificationStatus || 'pending');
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
                                          {status === 'fully_updated' && '🟢 Fully Updated'}
                                          {status === 'partially_updated' && '🟠 Partially Updated'}
                                          {status === 'pending' && '🟡 Pending Verification'}
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
                             })()
                            )}
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
  );
};

export default ChairpersonDashboard;
