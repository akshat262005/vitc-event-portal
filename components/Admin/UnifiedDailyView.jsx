'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Loader from '../Common/Loader';
import { autoFitColumns, applyExcelStyling, isStudentRemarkMatched } from '@/lib/excel-utils';
import { exportConsolidatedODExcel } from '@/lib/od-utils';
import {
  CalendarDays,
  FileText,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  RotateCcw
} from 'lucide-react';

const UnifiedDailyView = () => {
  const { showToast } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Date state
  const todayStr = new Date().toISOString().substring(0, 10);
  const startParam = searchParams.get('startDate') || searchParams.get('date') || todayStr;
  const endParam = searchParams.get('endDate') || searchParams.get('date') || startParam;

  const [startDate, setStartDate] = useState(startParam);
  const [endDate, setEndDate] = useState(endParam);

  const [reports, setReports] = useState([]);
  const [ods, setOds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedODRow, setExpandedODRow] = useState(null);

  const fetchDailyData = async (start, end) => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/daily-view?startDate=${start}&endDate=${end}`);
      setReports(response.data.reports || []);
      setOds(response.data.ods || []);
    } catch (error) {
      console.error('Failed to load daily view data:', error);
      showToast('Error loading date range data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = searchParams.get('startDate') || searchParams.get('date') || todayStr;
    const e = searchParams.get('endDate') || searchParams.get('date') || s;
    setStartDate(s);
    setEndDate(e);
    fetchDailyData(s, e);
  }, [searchParams]);

  const handleApplyRange = (newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    router.push(`/admin/daily-view?startDate=${newStart}&endDate=${newEnd}`);
  };

  const setPreset = (type) => {
    const now = new Date();
    if (type === 'today') {
      const d = now.toISOString().substring(0, 10);
      handleApplyRange(d, d);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const d = y.toISOString().substring(0, 10);
      handleApplyRange(d, d);
    } else if (type === 'last7') {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      handleApplyRange(past.toISOString().substring(0, 10), now.toISOString().substring(0, 10));
    } else if (type === 'last30') {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      handleApplyRange(past.toISOString().substring(0, 10), now.toISOString().substring(0, 10));
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      handleApplyRange(firstDay.toISOString().substring(0, 10), now.toISOString().substring(0, 10));
    }
  };

  const handleDownloadReport = (filePath) => {
    if (!filePath) return;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      window.open(filePath, '_blank');
    } else {
      const url = `${api.defaults.baseURL.replace('/api', '')}${filePath}`;
      window.open(url, '_blank');
    }
  };

  const handleDownloadODExcel = async (odItem) => {
    try {
      const xlsx = await import('xlsx');
      exportConsolidatedODExcel(odItem, `${odItem.eventName.replace(/[^a-z0-9]/gi, '_')}_Consolidated_OD.xlsx`, xlsx);
      showToast('Consolidated OD Excel generated successfully (3 Sheets).', 'success');
    } catch (err) {
      console.error('Excel generation failed:', err);
      showToast('Failed to generate Excel download.', 'error');
    }
  };

  const isRange = startDate !== endDate;
  const totalStudentsInODs = ods.reduce((acc, o) => acc + (o.students?.length || o.totalStudents || 0), 0);

  const handleDownloadBundle = () => {
    if (reports.length === 0 && ods.length === 0) {
      showToast('No documents available for bundle in this date range.', 'error');
      return;
    }
    const url = `${api.defaults.baseURL}/admin/daily-bundle?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, '_blank');
    showToast(`Initiating ${isRange ? 'date range' : 'daily'} bundle download...`, 'success');
  };

  const toggleExpandOD = (index) => {
    setExpandedODRow(expandedODRow === index ? null : index);
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-vit-neutral-200/60 dark:border-vit-neutral-700/60 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-vit-navy dark:text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-vit-blue" />
              <span>Unified Event Ledger & Explorer</span>
            </h2>
            <p className="text-sm text-vit-neutral-500 dark:text-vit-neutral-400 mt-1">
              Display and bundle events conducted and student On-Duty lists campus-wide across any selected date range.
            </p>
          </div>

          {/* Download Bundle Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBundle}
              disabled={reports.length === 0 && ods.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 glow-btn-primary rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>{isRange ? 'Download Unified Range Bundle (ZIP)' : 'Download Daily Bundle (ZIP)'}</span>
            </button>
          </div>
        </div>

        {/* Date Selection Bar & Quick Presets */}
        <div className="bg-vit-neutral-50 dark:bg-vit-neutral-850 p-4 rounded-2xl border border-vit-neutral-200 dark:border-vit-neutral-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-vit-neutral-500 uppercase tracking-wider">From Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleApplyRange(e.target.value, endDate)}
                className="px-3 py-2 bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              />
            </div>

            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-vit-neutral-500 uppercase tracking-wider">To Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleApplyRange(startDate, e.target.value)}
                className="px-3 py-2 bg-white dark:bg-vit-neutral-800 border border-vit-neutral-200 dark:border-vit-neutral-700 text-sm font-semibold rounded-xl focus:ring-1 focus:ring-vit-blue outline-none"
              />
            </div>

            {(startDate !== todayStr || endDate !== todayStr) && (
              <div className="self-end mb-1">
                <button
                  onClick={() => setPreset('today')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-200 dark:border-rose-900/40 cursor-pointer"
                  title="Reset back to today"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Today</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-vit-neutral-400 mr-1 uppercase">Presets:</span>
            <button
              onClick={() => setPreset('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                startDate === todayStr && endDate === todayStr
                  ? 'bg-vit-blue text-white shadow-sm'
                  : 'bg-white dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700 border border-vit-neutral-200 dark:border-vit-neutral-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPreset('yesterday')}
              className="px-3 py-1.5 bg-white dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset('last7')}
              className="px-3 py-1.5 bg-white dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPreset('month')}
              className="px-3 py-1.5 bg-white dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => setPreset('last30')}
              className="px-3 py-1.5 bg-white dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 hover:bg-vit-neutral-100 dark:hover:bg-vit-neutral-700 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Date Scope Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-vit-sky/20 dark:bg-vit-blue/10 border border-vit-sky dark:border-vit-blue/30 px-4 py-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="font-bold text-vit-blue dark:text-sky-300 uppercase tracking-wider">Date Scope:</span>
            <span className="font-semibold text-vit-neutral-800 dark:text-vit-neutral-200">
              {isRange ? `${startDate} to ${endDate}` : startDate}
            </span>
          </div>
          <div className="flex items-center gap-4 text-vit-neutral-600 dark:text-vit-neutral-350">
            <span><strong>{reports.length}</strong> Event Report{reports.length === 1 ? '' : 's'}</span>
            <span>•</span>
            <span><strong>{ods.length}</strong> OD List{ods.length === 1 ? '' : 's'}</span>
            <span>•</span>
            <span><strong>{totalStudentsInODs}</strong> Total Students on OD</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: Event Reports */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-vit-blue" />
                <span>Submitted Event Reports ({reports.length})</span>
              </h3>
            </div>

            {reports.length === 0 ? (
              <div className="glass-panel p-8 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No reports found for the selected {isRange ? 'date range' : 'date'}.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id || report._id} className="glass-card p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-vit-navy dark:text-white text-base">
                          {report.eventName}
                        </h4>
                        <p className="text-xs text-vit-blue dark:text-sky-400 font-semibold mt-1">
                          {report.clubName}
                        </p>
                      </div>
                      <span className="text-xs bg-vit-sky text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 px-2.5 py-1 rounded-full font-bold">
                        {report.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-t border-vit-neutral-100 dark:border-vit-neutral-700/60 pt-3 text-vit-neutral-600 dark:text-vit-neutral-350">
                      <p><strong>Venue:</strong> {report.venue}</p>
                      <p><strong>Time:</strong> {report.eventTime}</p>
                      <p className="col-span-2"><strong>Duration:</strong> {report.eventEndDate && report.eventEndDate !== report.eventDate ? `${report.eventDate} to ${report.eventEndDate}` : report.eventDate}</p>
                      <p className="col-span-2"><strong>Attendance:</strong> {report.numberOfParticipants} students</p>
                      {report.facultyCoordinator && <p className="col-span-2"><strong>Faculty Coordinator:</strong> {report.facultyCoordinator}</p>}
                      <p className="col-span-2"><strong>Student Coordinator:</strong> {report.studentCoordinator}</p>
                      {report.studentCoordinatorContact && <p className="col-span-2"><strong>Coordinator Contact:</strong> {report.studentCoordinatorContact}</p>}
                      {report.isCollaboration && report.collaborationClubs && report.collaborationClubs.length > 0 && (
                        <p className="col-span-2 text-vit-blue font-semibold"><strong>Collaboration:</strong> {report.collaborationClubs.join(', ')}</p>
                      )}
                      {report.isSponsored && (
                        <p className="col-span-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <strong>Sponsored:</strong> {report.sponsorName} (₹{report.sponsorAmount?.toLocaleString('en-IN') || 0})
                        </p>
                      )}
                      <p className="col-span-2"><strong>Event Outcome:</strong> {report.outcome}</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-vit-neutral-100 dark:border-vit-neutral-700/60">
                      <button
                        onClick={() => handleDownloadReport(report.reportFilePath)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-vit-neutral-50 hover:bg-vit-neutral-100 dark:bg-vit-neutral-900 border border-vit-neutral-200 dark:border-vit-neutral-700 text-xs font-semibold rounded-lg text-vit-neutral-800 dark:text-white transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Document</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: OD Student Lists */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-vit-navy dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <span>Submitted On-Duty Lists ({ods.length})</span>
              </h3>
            </div>

            {ods.length === 0 ? (
              <div className="glass-panel p-8 text-center text-vit-neutral-500 dark:text-vit-neutral-400">
                No OD lists found for the selected {isRange ? 'date range' : 'date'}.
              </div>
            ) : (
              <div className="space-y-4">
                {ods.map((od, index) => (
                  <div key={od.id || od._id} className="glass-card overflow-hidden">
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-vit-navy dark:text-white text-base">
                            {od.eventName}
                          </h4>
                          <p className="text-xs text-vit-blue dark:text-sky-400 font-semibold mt-1">
                            {od.clubName}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <span className="text-xs bg-vit-neutral-100 dark:bg-vit-neutral-800 text-vit-neutral-600 dark:text-vit-neutral-300 px-2.5 py-1 rounded-full font-bold">
                            {od.eventDate}
                          </span>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${
                            od.verificationStatus === 'fully_updated'
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : od.verificationStatus === 'partially_updated'
                              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800'
                          }`}>
                            {od.verificationStatus === 'fully_updated'
                              ? 'Fully Verified'
                              : od.verificationStatus === 'partially_updated'
                              ? 'Partially Verified'
                              : 'Pending'}
                          </span>
                          <span className="text-xs bg-vit-sky text-vit-blue dark:bg-vit-blue/20 dark:text-sky-300 px-2.5 py-1 rounded-full font-bold">
                            {od.students?.length || od.totalStudents || 0} Students
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-vit-neutral-100 dark:border-vit-neutral-700/60">
                        <button
                          onClick={() => toggleExpandOD(index)}
                          className="flex items-center gap-1 text-xs font-bold text-vit-neutral-500 hover:text-vit-blue dark:hover:text-white cursor-pointer"
                        >
                          {expandedODRow === index ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              <span>Hide Student Details</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              <span>Show Student Details</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadODExcel(od)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/25 border border-emerald-250 dark:border-emerald-900 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Download Excel</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable student list details */}
                    {expandedODRow === index && (
                      <div className="bg-vit-neutral-50 dark:bg-vit-neutral-900 border-t border-vit-neutral-200/50 dark:border-vit-neutral-700/50 overflow-x-auto max-h-64">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-vit-neutral-100/55 dark:bg-vit-neutral-850 text-vit-neutral-500 font-bold uppercase border-b border-vit-neutral-200 dark:border-vit-neutral-700">
                              <th className="px-4 py-2">Reg Number</th>
                              <th className="px-4 py-2">Student Name</th>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Time</th>
                              <th className="px-4 py-2 text-center">Remark Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-vit-neutral-200 dark:divide-vit-neutral-700">
                            {(od.students || []).map((student, sIdx) => {
                              const isMatched = isStudentRemarkMatched(student.registrationNumber, od.adminRemarks);
                              return (
                                <tr
                                  key={sIdx}
                                  className={`transition-colors border-l-4 ${
                                    isMatched
                                      ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-500'
                                      : 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-500'
                                  }`}
                                >
                                  <td className={`px-4 py-2 font-bold uppercase ${isMatched ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                                    {student.registrationNumber}
                                  </td>
                                  <td className="px-4 py-2 font-semibold">
                                    {student.studentName}
                                  </td>
                                  <td className="px-4 py-2 text-vit-neutral-500">
                                    {student.date}
                                  </td>
                                  <td className="px-4 py-2 text-vit-neutral-500">
                                    {student.time}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {isMatched ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-300 dark:border-emerald-800">
                                        Matched (Green)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-300 dark:border-rose-800">
                                        Marked Red
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default UnifiedDailyView;
